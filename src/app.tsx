import type { ReactNode } from "react";

import defaultUserImage from "./img/default-user.jpg";
import "./css/main.css";
import "./css/print.css";

type AppProps = {
    children: ReactNode;
};

export default function App({ children }: AppProps) {
    return (
        <>
            <header>
                <a href="/" className="no-select">
                    <h1>South Church Library</h1>
                </a>
                <span id="hamburger-button" className="no-select material-symbols-outlined">
                    menu
                </span>
                <nav className="no-select">
                    <span id="close-button" className="material-symbols-outlined">
                        close
                    </span>
                    <li className="navlink">
                        <a href="/main">Home</a>
                    </li>
                    <li className="navlink">
                        <a href="/about">About</a>
                    </li>
                    <li className="navlink">
                        <a href="/search">Browse</a>
                    </li>
                    <li className="navlink">
                        <a href="/help">Help</a>
                    </li>
                </nav>
                <div id="header-search-container" className="search-container">
                    <input
                        id="header-search-input"
                        className="search-input"
                        placeholder="Search by title, author, subject, keyword..."
                    />
                    <button className="material-symbols-outlined search-button" id="header-search-button" type="button">
                        search
                    </button>
                </div>
                <div id="account-container">
                    <div id="nav-login-signup" className="no-select">
                        <div id="nav-login">
                            <a href="/login">Log In</a>
                        </div>
                        <div id="nav-signup">
                            <a href="/signup">Sign Up</a>
                        </div>
                    </div>
                    <div id="small-account-container" className="no-select" tabIndex={0}>
                        <img id="small-account-image" src={defaultUserImage} alt="" />
                        <span className="material-symbols-outlined" id="account-arrow">
                            arrow_drop_down
                        </span>
                    </div>
                    <div id="large-account-container" className="preload large-account-hide">
                        <img id="large-account-image" src={defaultUserImage} className="no-select" alt="" />
                        <div id="account-information-container">
                            <p id="account-name"></p>
                            <p id="account-email"></p>
                            <a id="admin-link" href="/admin/main"></a>
                        </div>
                        <div id="account-bottom-container">
                            <a id="log-out" tabIndex={0}>
                                Log Out
                            </a>
                            <a href="/account?overview">View Account</a>
                        </div>
                    </div>
                </div>
            </header>
            <div id="banner-container"></div>

            {children}

            <footer>
                <div className="footer-div">
                    <h2 className="footer-title no-select">Contact Us</h2>
                    <ul className="footer-list">
                        <li>
                            <a href="https://goo.gl/maps/tr2RhuvuRkpu9jGu8" target="_blank" rel="noreferrer">
                                41 Central St, Andover, MA 01810
                            </a>
                        </li>
                        <li>
                            <a href="mailto:library@southchurch.com" target="_blank" rel="noreferrer">
                                library@southchurch.com
                            </a>
                        </li>
                        <li>
                            <a href="tel:978-475-0321">978-475-0321</a>
                        </li>
                    </ul>
                </div>
                <div className="footer-div">
                    <h2 className="footer-title no-select">South Church</h2>
                    <ul className="footer-list">
                        <li>
                            <a href="https://southchurch.com/" target="_blank" rel="noreferrer">
                                Website
                            </a>
                        </li>
                        <li>
                            <a href="https://southchurch.com/worship" target="_blank" rel="noreferrer">
                                Worship
                            </a>
                        </li>
                        <li>
                            <a href="https://southchurch.com/welcome" target="_blank" rel="noreferrer">
                                Welcome
                            </a>
                        </li>
                    </ul>
                </div>
                <div className="footer-div">
                    <h2 className="footer-title no-select">Help</h2>
                    <ul className="footer-list">
                        <li>
                            <a href="/help">Help Page</a>
                        </li>
                        <li>
                            <a href="/help#FAQ">FAQs</a>
                        </li>
                        <li>
                            <a href="/sitemap">Sitemap</a>
                        </li>
                    </ul>
                </div>
                <div className="footer-bottom">&#169; 2026 South Church in Andover</div>
            </footer>
        </>
    );
}
