import React from "react";
import "./WalletAddress.css";

const WalletAddress = ({ walletAddress }) => {
    const network = "devnet";
    const address = walletAddress.publicKey;
    //TODO get network from solana

    const renderConnectedInfo = () => {
        return (
            <button className="wallet-info wallet-address">
                {address.toString().slice(0,5) + '...' + address.toString().slice(-5)}
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

    return (
        <div className="wallet-info-container">
            {/* Wallet connected to testnet, display wallet address and disconnect button */}
            { (address && (network === 'devnet') 
                && renderConnectedInfo()) }

            {/* Wallet not connected, display not connected and connect button */}
            { (!address)
                && renderNotConnectedInfo() }

            {/* Wallet connected to wrong network, display wrong network info and refresh button */}
            { (address && (network !== 'devnet') 
                && renderWrongNetworkInfo() )}

        </div>
    );

};

export default WalletAddress;