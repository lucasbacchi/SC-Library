import { type ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "./firebase";

import defaultUserImage from "./img/default-user.jpg";
import "./css/main.css";
import "./css/print.css";

type AppProps = {
    children: ReactNode;
};

/**
 * Header account area. Logged out: "Log In | Sign Up". Logged in: the account picture,
 * which opens a small menu with the email and Log Out.
 */
function AccountMenu() {
    const [user, setUser] = useState<User | null>(null);
    const [open, setOpen] = useState(false);
    const [opened, setOpened] = useState(false); // "preload" stops the menu animating on first page load
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(
        () =>
            onAuthStateChanged(auth, (u) => {
                setUser(u);
                setOpen(false);
            }),
        []
    );

    // Close the menu when clicking anywhere else.
    useEffect(() => {
        if (!open) return;
        function onClick(e: MouseEvent) {
            if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
        }
        document.addEventListener("click", onClick);
        return () => document.removeEventListener("click", onClick);
    }, [open]);

    function toggle() {
        setOpen((o) => !o);
        setOpened(true);
    }

    // After logging in, come back to this page (same on the server and in the browser, so no flicker).
    const location = useLocation();
    const loginHref =
        location.pathname == "/login"
            ? location.pathname + location.search
            : "/login?redirect=" + encodeURIComponent(location.pathname + location.search);

    return (
        <div id="account-container" ref={containerRef}>
            <div id="nav-login-signup" className="no-select" style={user ? { display: "none" } : undefined}>
                <div id="nav-login">
                    <a href={loginHref}>Log In</a>
                </div>
                <div id="nav-signup">
                    <a href="/signup">Sign Up</a>
                </div>
            </div>
            <div
                id="small-account-container"
                className="no-select"
                tabIndex={0}
                role="button"
                aria-label="Account menu"
                aria-expanded={open}
                style={{ display: user ? "flex" : "none" }}
                onClick={toggle}
                onKeyDown={(e) => {
                    if (e.key === "Enter") toggle();
                }}
            >
                <img id="small-account-image" src={defaultUserImage} alt="" />
                <span className="material-symbols-outlined" id="account-arrow">
                    arrow_drop_down
                </span>
            </div>
            <div
                id="large-account-container"
                className={(opened ? "" : "preload ") + (open ? "large-account-show" : "large-account-hide")}
            >
                <img id="large-account-image" src={defaultUserImage} className="no-select" alt="" />
                <div id="account-information-container">
                    <p id="account-name">{user?.displayName ?? ""}</p>
                    <p id="account-email">{user?.email ?? ""}</p>
                </div>
                <div id="account-bottom-container">
                    <a
                        id="log-out"
                        tabIndex={0}
                        role="button"
                        onClick={() => void signOut(auth)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") void signOut(auth);
                        }}
                    >
                        Log Out
                    </a>
                    <a href="/account?overview">View Account</a>
                </div>
            </div>
        </div>
    );
}

/** Header search bar: Enter or the search button goes to /search?query=... */
function HeaderSearch() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const currentQuery = searchParams.get("query") ?? "";
    const inputRef = useRef<HTMLInputElement>(null);

    function runSearch() {
        const query = inputRef.current?.value.trim() ?? "";
        navigate(query ? `/search?query=${encodeURIComponent(query)}` : "/search");
    }

    return (
        <div id="header-search-container" className="search-container">
            <input
                // key resets the box when the address changes, e.g. after Back
                key={currentQuery}
                ref={inputRef}
                id="header-search-input"
                className="search-input"
                placeholder="Search by title, author, subject, keyword..."
                aria-label="Search books"
                defaultValue={currentQuery}
                onKeyDown={(e) => {
                    if (e.key === "Enter") runSearch();
                }}
            />
            <button
                className="material-symbols-outlined search-button"
                id="header-search-button"
                type="button"
                aria-label="Search"
                onClick={runSearch}
            >
                search
            </button>
        </div>
    );
}

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
                <HeaderSearch />
                <AccountMenu />
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
