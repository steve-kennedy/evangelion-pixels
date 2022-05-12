import React, { useEffect, useState } from 'react';
import CandyMachine from './components/CandyMachine';
import AuthorInfo from './components/AuthorInfo';
import './App.css';

const network = "devnet";

const App = () => {

  // States
  const [walletAddress, setWalletAddress] = useState(null);

  const checkIfWalletIsConnected = async () => {
    try {
      const { solana } = window;

      if (solana && solana.isPhantom) {
        console.log("Phantom wallet found");
        const response = await solana.connect({ onlyIfTrusted: true });
        console.log("Connected with Public Key:", response.publicKey.toString());
        setWalletAddress(response.publicKey.toString());
      } else {
        alert("Solana object not found! Get a Phantom Wallet");
        // TODO Better error handling
      }
    } catch (error) {
      console.error(error);
      // TODO Better error handling
    }
  }

  const connectWallet = async () => {
    const { solana } = window;

    if (solana) {
      const response = await solana.connect();
      console.log("Connected with Public Key:", response.publicKey.toString());
      setWalletAddress(response.publicKey.toString());
    }
  };

  const renderNotConnectedContainer = () => (
    <button className="cta-button wallet-connect" onClick={connectWallet}>
      Connect Phantom Wallet
    </button>
  );

  const renderConnectedInfo = () => {
    return (
        <button className="wallet-info wallet-address">
            {walletAddress.slice(0,5) + '...' + walletAddress.slice(-5)}
        </button>
    )
};

const renderNotConnectedInfo = () => {
    return (
        <button className="wallet-info wallet-address">
            Not Connected
        </button>
    )
};

const renderWrongNetworkInfo = () => {
    return (
        <button className="wallet-info wallet-address">
            Wrong Network!
            Choose devnet and reconnect
        </button>
    )
};

  useEffect(() => {
    const onLoad = async () => {
      await checkIfWalletIsConnected();
    };
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return (
    <div className="App">
      <div className="container">
        <div className="header-container">
          <header>
            <div className="header-titles">
              <h1 className="header-text">Evangelion Pixels</h1>
              <p className="header-sub-text">A pixel art collection in homage to the seminal anime</p>
            </div>
            <div className="wallet-info-container">
              {/* Wallet connected to testnet, display wallet address and disconnect button */}
              { (walletAddress && (network === 'devnet') 
                  && renderConnectedInfo()) }
              {/* Wallet not connected, display not connected and connect button */}
              { (!walletAddress)
                  && renderNotConnectedInfo() }
              {/* Wallet connected to wrong network, display wrong network info and refresh button */}
              { (walletAddress && (network !== 'devnet') 
                  && renderWrongNetworkInfo() )}
            </div>
          </header>
          { !walletAddress && renderNotConnectedContainer() }
        </div>
          { walletAddress && <CandyMachine walletAddress={window.solana} /> }
        <div className="footer-container">
          <AuthorInfo />
        </div>
      </div>
    </div>
  );
};

export default App;
