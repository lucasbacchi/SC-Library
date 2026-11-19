import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import HeaderSearch from "./HeaderSearch";
import AccountMenu from "./AccountMenu";

export default function Navbar() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const navRef = useRef<HTMLElement>(null);
    const location = useLocation();

    // Close the mobile menu on route change
    useEffect(() => {
        setIsMenuOpen(false);
    }, [location.pathname, location.search]);

    // Close mobile menu on Escape key
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape" && isMenuOpen) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isMenuOpen]);

    // Close mobile menu when clicking outside of it
    useEffect(() => {
        if (!isMenuOpen) return;
        function handleClickOutside(e: MouseEvent) {
            const target = e.target as HTMLElement;
            if (navRef.current && !navRef.current.contains(target) && !target.closest("#hamburger-button")) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, [isMenuOpen]);

    return (
        <header>
            <Link to="/" className="no-select">
                <h1>South Church Library</h1>
            </Link>

            <button
                id="hamburger-button"
                className="no-select material-symbols-outlined"
                type="button"
                aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMenuOpen}
                onClick={() => setIsMenuOpen((prev) => !prev)}
            >
                menu
            </button>

            <nav ref={navRef} className={isMenuOpen ? "nav-open no-select" : "no-select"} aria-label="Main Navigation">
                <button
                    id="close-button"
                    className="material-symbols-outlined"
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setIsMenuOpen(false)}
                >
                    close
                </button>
                <li className="navlink">
                    <Link to="/" onClick={() => setIsMenuOpen(false)}>
                        Home
                    </Link>
                </li>
                <li className="navlink">
                    <Link to="/about" onClick={() => setIsMenuOpen(false)}>
                        About
                    </Link>
                </li>
                <li className="navlink">
                    <Link to="/search" onClick={() => setIsMenuOpen(false)}>
                        Browse
                    </Link>
                </li>
                <li className="navlink">
                    <Link to="/help" onClick={() => setIsMenuOpen(false)}>
                        Help
                    </Link>
                </li>
            </nav>

            <HeaderSearch />
            <AccountMenu />
        </header>
    );
}
