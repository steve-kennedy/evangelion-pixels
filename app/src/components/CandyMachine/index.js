import React, { useState, useEffect } from 'react';
import LoadingIndicator from '../../components/LoadingIndicator';
import axios from 'axios';
import { Connection, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { Program, Provider, web3 } from '@project-serum/anchor';
import { programs } from '@metaplex/js';
import { MintLayout, TOKEN_PROGRAM_ID, Token } from '@solana/spl-token';
import { sendTransactions } from './connection';
import './CandyMachine.css';

import {
  candyMachineProgram,
  TOKEN_METADATA_PROGRAM_ID,
  SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
  getAtaForMint,
  getNetworkExpire,
  getNetworkToken,
  CIVIC
} from './helpers';

require("dotenv").config();

const {
  metadata: { Metadata, MetadataProgram },
} = programs;
const { SystemProgram } = web3;
const opts = {
  preflightCommitment: 'processed',
};
const rpcHost = process.env.REACT_APP_SOLANA_RPC_HOST;

const MAX_NAME_LENGTH = 32;
const MAX_URI_LENGTH = 200;
const MAX_SYMBOL_LENGTH = 10;
const MAX_CREATOR_LEN = 32 + 1 + 1;
const MAX_CREATOR_LIMIT = 5;
const MAX_DATA_SIZE = 4 + MAX_NAME_LENGTH + 4 + MAX_SYMBOL_LENGTH + 4 + MAX_URI_LENGTH + 2 + 1 + 4 + MAX_CREATOR_LIMIT * MAX_CREATOR_LEN;
const MAX_METADATA_LEN = 1 + 32 + 32 + MAX_DATA_SIZE + 1 + 1 + 9 + 172;
const CREATOR_ARRAY_START = 1 + 32 + 32 + 4 + MAX_NAME_LENGTH + 4 + MAX_URI_LENGTH + 4 + MAX_SYMBOL_LENGTH + 2 + 1 + 4;

const CandyMachine = ({ walletAddress }) => {
  // States
  const [candyMachine, setCandyMachine] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mintSuccess, setMintSuccess] = useState(null);

  const [mints, setMints] = useState([]);
  const [isLoadingMints, setIsLoadingMints] = useState(false);

  const getCandyMachineCreator = async (candyMachine) => {
    const candyMachineID = new PublicKey(candyMachine);
    return await web3.PublicKey.findProgramAddress(
        [Buffer.from('candy_machine'), candyMachineID.toBuffer()],
        candyMachineProgram,
    );
  };

  const getMetadata = async (mint) => {
    return (
      await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };

  const getMasterEdition = async (mint) => {
    return (
      await PublicKey.findProgramAddress(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
          Buffer.from('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
    )[0];
  };
  
  const createAssociatedTokenAccountInstruction = (
    associatedTokenAddress,
    payer,
    walletAddress,
    splTokenMintAddress
  ) => {
    const keys = [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedTokenAddress, isSigner: false, isWritable: true },
      { pubkey: walletAddress, isSigner: false, isWritable: false },
      { pubkey: splTokenMintAddress, isSigner: false, isWritable: false },
      {
        pubkey: web3.SystemProgram.programId,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: web3.SYSVAR_RENT_PUBKEY,
        isSigner: false,
        isWritable: false,
      },
    ];
    return new web3.TransactionInstruction({
      keys,
      programId: SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
      data: Buffer.from([]),
    });
  };

  const mintToken = async () => {
    setIsLoading(true);
    const mint = web3.Keypair.generate();

    const userTokenAccountAddress = (
      await getAtaForMint(mint.publicKey, walletAddress.publicKey)
    )[0];
  
    const userPayingAccountAddress = candyMachine.state.tokenMint
      ? (await getAtaForMint(candyMachine.state.tokenMint, walletAddress.publicKey))[0]
      : walletAddress.publicKey;
  
    const candyMachineAddress = candyMachine.id;
    const remainingAccounts = [];
    const signers = [mint];
    const cleanupInstructions = [];
    const instructions = [
      web3.SystemProgram.createAccount({
        fromPubkey: walletAddress.publicKey,
        newAccountPubkey: mint.publicKey,
        space: MintLayout.span,
        lamports:
          await candyMachine.program.provider.connection.getMinimumBalanceForRentExemption(
            MintLayout.span,
          ),
        programId: TOKEN_PROGRAM_ID,
      }),
      Token.createInitMintInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        0,
        walletAddress.publicKey,
        walletAddress.publicKey,
      ),
      createAssociatedTokenAccountInstruction(
        userTokenAccountAddress,
        walletAddress.publicKey,
        walletAddress.publicKey,
        mint.publicKey,
      ),
      Token.createMintToInstruction(
        TOKEN_PROGRAM_ID,
        mint.publicKey,
        userTokenAccountAddress,
        walletAddress.publicKey,
        [],
        1,
      ),
    ];
  
    if (candyMachine.state.gatekeeper) {
      remainingAccounts.push({
        pubkey: (
          await getNetworkToken(
            walletAddress.publicKey,
            candyMachine.state.gatekeeper.gatekeeperNetwork,
          )
        )[0],
        isWritable: true,
        isSigner: false,
      });
      if (candyMachine.state.gatekeeper.expireOnUse) {
        remainingAccounts.push({
          pubkey: CIVIC,
          isWritable: false,
          isSigner: false,
        });
        remainingAccounts.push({
          pubkey: (
            await getNetworkExpire(
              candyMachine.state.gatekeeper.gatekeeperNetwork,
            )
          )[0],
          isWritable: false,
          isSigner: false,
        });
      }
    }
    if (candyMachine.state.whitelistMintSettings) {
      const mint = new web3.PublicKey(
        candyMachine.state.whitelistMintSettings.mint,
      );
  
      const whitelistToken = (await getAtaForMint(mint, walletAddress.publicKey))[0];
      remainingAccounts.push({
        pubkey: whitelistToken,
        isWritable: true,
        isSigner: false,
      });
  
      if (candyMachine.state.whitelistMintSettings.mode.burnEveryTime) {
        const whitelistBurnAuthority = web3.Keypair.generate();
  
        remainingAccounts.push({
          pubkey: mint,
          isWritable: true,
          isSigner: false,
        });
        remainingAccounts.push({
          pubkey: whitelistBurnAuthority.publicKey,
          isWritable: false,
          isSigner: true,
        });
        signers.push(whitelistBurnAuthority);
        const exists =
          await candyMachine.program.provider.connection.getAccountInfo(
            whitelistToken,
          );
        if (exists) {
          instructions.push(
            Token.createApproveInstruction(
              TOKEN_PROGRAM_ID,
              whitelistToken,
              whitelistBurnAuthority.publicKey,
              walletAddress.publicKey,
              [],
              1,
            ),
          );
          cleanupInstructions.push(
            Token.createRevokeInstruction(
              TOKEN_PROGRAM_ID,
              whitelistToken,
              walletAddress.publicKey,
              [],
            ),
          );
        }
      }
    }
  
    if (candyMachine.state.tokenMint) {
      const transferAuthority = web3.Keypair.generate();
  
      signers.push(transferAuthority);
      remainingAccounts.push({
        pubkey: userPayingAccountAddress,
        isWritable: true,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: transferAuthority.publicKey,
        isWritable: false,
        isSigner: true,
      });
  
      instructions.push(
        Token.createApproveInstruction(
          TOKEN_PROGRAM_ID,
          userPayingAccountAddress,
          transferAuthority.publicKey,
          walletAddress.publicKey,
          [],
          candyMachine.state.price.toNumber(),
        ),
      );
      cleanupInstructions.push(
        Token.createRevokeInstruction(
          TOKEN_PROGRAM_ID,
          userPayingAccountAddress,
          walletAddress.publicKey,
          [],
        ),
      );
    }
    const metadataAddress = await getMetadata(mint.publicKey);
    const masterEdition = await getMasterEdition(mint.publicKey);
  
    const [candyMachineCreator, creatorBump] = await getCandyMachineCreator(
      candyMachineAddress,
    );
  
    instructions.push(
      await candyMachine.program.instruction.mintNft(creatorBump, {
        accounts: {
          candyMachine: candyMachineAddress,
          candyMachineCreator,
          payer: walletAddress.publicKey,
          wallet: candyMachine.state.treasury,
          mint: mint.publicKey,
          metadata: metadataAddress,
          masterEdition,
          mintAuthority: walletAddress.publicKey,
          updateAuthority: walletAddress.publicKey,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: web3.SYSVAR_RENT_PUBKEY,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          recentBlockhashes: web3.SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
          instructionSysvarAccount: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        remainingAccounts:
          remainingAccounts.length > 0 ? remainingAccounts : undefined,
      }),
    );
  
    try {
      return (
        await sendTransactions(
          candyMachine.program.provider.connection,
          candyMachine.program.provider.wallet,
          [instructions, cleanupInstructions],
          [signers, []],
        )
      ).txs.map(t => t.txid);
    } catch (e) {
      setIsLoading(false);
      setMintSuccess(false);
      console.log(e);
    }
    setIsLoading(false);
    setMintSuccess(false);
    return [];
  };

  const getProvider = () => {
    const connection = new Connection(rpcHost);
    const provider = new Provider(connection, window.solana, opts.preflightCommitment);
    return provider;
  }

  const getCandyMachineState = async () => {
    // create program and fetch metadata from candy machine
    const provider = getProvider();
    const idl = await Program.fetchIdl(candyMachineProgram, provider);
    const program = new Program(idl, candyMachineProgram, provider);
    const candyMachine = await program.account.candyMachine.fetch(
      process.env.REACT_APP_CANDY_MACHINE_ID
    );
    // parse the metadata and log it
    const itemsAvailable = candyMachine.data.itemsAvailable.toNumber();
    const itemsRedeemed = candyMachine.itemsRedeemed.toNumber();
    const itemsRemaining = itemsAvailable - itemsRedeemed;
    const goLiveData = candyMachine.data.goLiveDate.toNumber();
    const presale =
      candyMachine.data.whitelistMintSettings &&
      candyMachine.data.whitelistMintSettings.presale &&
      (!candyMachine.data.goLiveDate ||
        candyMachine.data.goLiveDate.toNumber() > new Date().getTime() / 1000);
    const goLiveDate = new Date(goLiveData * 1000);
    const goLiveDateTimeString = `${new Date(goLiveData * 1000).toGMTString()}`

    setCandyMachine({
      id: process.env.REACT_APP_CANDY_MACHINE_ID, program,
      state: {
        itemsAvailable, itemsRedeemed, itemsRemaining, goLiveData,goLiveDateTimeString,
        isSoldOut: itemsRemaining === 0,
        isActive: 
          (presale || 
            candyMachine.data.goLiveDate.toNumber() < new Date().getTime() / 1000) &&
          (candyMachine.endSettings
            ? candyMachine.endSettings.endSettingType.Date
              ? candyMachine.endSettings.number.toNumber() > new Date().getTime() / 1000
              : itemsRedeemed < candyMachine.endSettings.number.toNumber()
            : true),
        isPresale: presale,
        goLiveDate: candyMachine.data.goLiveDate,
        treasury: candyMachine.wallet,
        tokenMint: candyMachine.tokenMint,
        gatekeeper: candyMachine.data.gatekeeper,
        endSettings: candyMachine.data.endSettings,
        whitelistMintSettings: candyMachine.data.hiddenSettings,
        price: candyMachine.data.price,
      },
    });

    console.log({
      itemsAvailable, itemsRedeemed, itemsRemaining, goLiveData, goLiveDateTimeString, goLiveDate, presale
    });

    const candyMachineAddress = new PublicKey(process.env.REACT_APP_CANDY_MACHINE_ID);
    const candyMachineCreator = await getCandyMachineCreator(candyMachineAddress);

    setIsLoadingMints(true);

    console.log("Getting mint data...")
    const mintAddress = await getMintAddress(candyMachineCreator[0]);
    const connection = new Connection(rpcHost);
    if (mintAddress.length !== 0) {
      for (const mint of mintAddress) {
        console.log("Minted NFT has mint adress:", mint);
        const pubKey = new PublicKey(mint);
        const tokenPubKey = await Metadata.getPDA(pubKey);
        const tokenMeta = await Metadata.load(connection, tokenPubKey);
        const response = await fetch(tokenMeta.data.data.uri);
        const parse = await response.json();

        if (!mints.find((mint) => mint === parse.image)) {
          setMints((prevState) => [...prevState, parse.image]);
        }
      }
    }

    setIsLoadingMints(false);
  };

  useEffect(() => {
    getCandyMachineState();
  }, []);

  // ------------ Mint data --------------
  const getMintAddress = async (firstCreatorAddress) => {
    const connection = new Connection(rpcHost);
    const metadataAccounts = await connection.getProgramAccounts(
      TOKEN_METADATA_PROGRAM_ID,
      {
        dataSlice: { offset: 33, length: 32 },
        filters: [
          { dataSize: MAX_METADATA_LEN },
          {
            memcmp: {
              offset: CREATOR_ARRAY_START,
              bytes: firstCreatorAddress.toBase58(),
            },
          },
        ],
      },
    );

    return metadataAccounts.map((metadataAccountInfo) => (
      bs58.encode(metadataAccountInfo.account.data)
    ));
  };

  // ------------ Renders -------------


  const renderMintButton = () => {
    return (
      <button className="cta-button mint-button" onClick={mintToken}>
        Mint NFT
      </button>
    );
  };

  const renderMintedItems = () => (
      <div className="nft-grid">
        {mints.map((mint) => (
          <div className="nft-item" key={mint}>
            <img src={mint} alt={`Minted NFT ${mint}`} />
          </div>
        ))}
      </div>
  );

  const renderLoading = () => {
    return (
      <LoadingIndicator />
    );
  };

  const renderSuccess = () => {
    return (
      <p className='success-text'>Mint successful! Check your Phantom Wallet</p>
    );
  };

  const renderFailure = () => {
    return (
      <p className='failure-text'>Mint unsuccessful! Please try again later</p>
    );
  };

  return (

    candyMachine && (
      <div className="machine-container">
        <div className="count-container">
          <p className="mint-text">
            {`${candyMachine.state.itemsAvailable - candyMachine.state.itemsRedeemed}`}
          </p>
          <p>
            remaining
          </p>
          <p className="padding"></p>
          {
            (candyMachine.state.itemsAvailable === candyMachine.state.itemsRedeemed)? (
              <p className="mint-text">SOLD OUT</p>
            ) : (
              <p className="mint-text">LIVE</p>
            )
          }
        </div>

        { /* Show mint button if no mint yet underway or attempted */}
        { !isLoading && (mintSuccess === null) && renderMintButton() }
        { /* Show loading indictor once mint button pressed and hide on success/failure */}
        { isLoading && mintSuccess === null && renderLoading() }
        { /* Handle success */}
        { mintSuccess && renderSuccess() }
        { /* Handle failure */}
        { !mintSuccess && (mintSuccess !== null) && renderFailure() }

        <div className="nft-container">
          <p className="sub-header-text">Minted Items</p>
          { /* Render minted NFTs */}
          { mints.length > 0 && renderMintedItems() }
          { mints.length === 0 && isLoadingMints && <p>LOADING MINTS...</p> }
        </div>
      </div>
    )

  );
};

export default CandyMachine;
