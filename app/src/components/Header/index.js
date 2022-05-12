import WalletAddress from "../WalletAddress";
import "./Header.css";

const Header = ({walletAddress}) => {

    const renderHeader = () => {
        return (
            <header>
                
                <div className="header-titles">
                    <h1 className="header-text">Neon Genesis</h1>
                    <h1 className="header-text">Evangelion Pixels</h1>
                    <p className="header-sub-text">A pixel art collection in homage to the seminal anime</p>
                </div>
                
                <WalletAddress walletAddress={walletAddress}/>
            </header>
            
        )
    };

    return renderHeader();

};

export default Header;