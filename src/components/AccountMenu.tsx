import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../firebase";
import defaultUserImage from "../img/default-user.jpg";

/**
 * Header account area.
 * - Logged out: "Log In | Sign Up" links.
 * - Logged in: Avatar picture with drop-down showing name, email, "View Account", and "Log Out".
 */
export default function AccountMenu() {
    const [user, setUser] = useState<User | null>(null);
    const [open, setOpen] = useState(false);
    const [opened, setOpened] = useState(false);
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

    const location = useLocation();
    const loginHref =
        location.pathname === "/login"
            ? location.pathname + location.search
            : "/login?redirect=" + encodeURIComponent(location.pathname + location.search);

    return (
        <div id="account-container" ref={containerRef}>
            <div id="nav-login-signup" className="no-select" style={user ? { display: "none" } : undefined}>
                <div id="nav-login">
                    <Link to={loginHref}>Log In</Link>
                </div>
                <div id="nav-signup">
                    <Link to="/signup">Sign Up</Link>
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
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggle();
                    }
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
                            if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                void signOut(auth);
                            }
                        }}
                    >
                        Log Out
                    </a>
                    <Link to="/account?overview" onClick={() => setOpen(false)}>
                        View Account
                    </Link>
                </div>
            </div>
        </div>
    );
}
