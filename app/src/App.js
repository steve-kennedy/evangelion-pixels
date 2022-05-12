import React, { useEffect, useState } from 'react';
import CandyMachine from './components/CandyMachine';
import AuthorInfo from './components/AuthorInfo';
import Header from './components/Header';
import './App.css';




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
    <button className="cta-button wallet-connect wallet-info" onClick={connectWallet}>
      Connect Phantom Wallet
    </button>
  );

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
          <Header walletAddress={window.solana} />
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
