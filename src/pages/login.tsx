import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
    browserLocalPersistence,
    browserSessionPersistence,
    onAuthStateChanged,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signOut,
    type User
} from "firebase/auth";
import { auth } from "../firebase";
import { looksLikeEmail, MessageBox, safeRedirect, type Message } from "../authUtils";

/** Turns Firebase's error codes into plain messages. */
function loginErrorMessage(code: string): string {
    switch (code) {
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
        case "auth/invalid-login-credentials":
            return "The email or password is incorrect. Please try again.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/user-disabled":
            return "This account has been disabled. Please contact the librarian for help.";
        case "auth/too-many-requests":
            return "Too many attempts. Please wait a few minutes and try again, or reset your password.";
        case "auth/network-request-failed":
            return "Could not connect. Please check your internet connection and try again.";
        default:
            return "Something went wrong while logging in. Please try again.";
    }
}

export default function Login() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const redirect = safeRedirect(searchParams.get("redirect"));

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        document.title = "Log In | South Church Library";
        return onAuthStateChanged(auth, setCurrentUser);
    }, []);

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (submitting) return;
        if (!email.trim() || !password) {
            setMessage({ title: "Log In", text: "Please enter your email and password." });
            return;
        }
        setSubmitting(true);
        try {
            // Remember me: stay logged in after closing the browser. Otherwise, only for this browser session.
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            await signInWithEmailAndPassword(auth, email.trim(), password);
            navigate(redirect, { replace: true });
        } catch (error) {
            const code = (error as { code?: string }).code ?? "";
            console.warn("Login failed:", code || error);
            setMessage({ title: "Could Not Log In", text: loginErrorMessage(code) });
            setPassword("");
        } finally {
            setSubmitting(false);
        }
    }

    async function handlePasswordReset() {
        if (!looksLikeEmail(email.trim())) {
            setMessage({
                title: "Reset Password",
                text: "Please enter a valid email into the Email box above. Then try again."
            });
            return;
        }
        try {
            await sendPasswordResetEmail(auth, email.trim());
        } catch (error) {
            const code = (error as { code?: string }).code ?? "";
            if (code == "auth/invalid-email") {
                setMessage({ title: "Reset Password", text: "Please enter a valid email address." });
                return;
            }
            // For any other result, show the same message below, so this page never reveals
            // whether an email address has an account.
            console.warn("Password reset:", code || error);
        }
        setMessage({
            title: "Check Your Email",
            text: "If an account exists for that email, a password reset link has been sent."
        });
    }

    async function handleLogOut() {
        await signOut(auth);
        setMessage({ title: "Logged Out", text: "You have been logged out." });
    }

    // Keep the redirect when switching to Sign Up, so new members also come back to the same page.
    const signUpHref = redirect == "/" ? "/signup" : "/signup?redirect=" + encodeURIComponent(redirect);

    return (
        <main id="content">
            <h1 className="sign-in-title">Log In</h1>

            {currentUser ? (
                <div id="form">
                    <p>
                        You are logged in as <b>{currentUser.email}</b>.
                    </p>
                    <button type="button" onClick={() => navigate(redirect)}>
                        Continue
                    </button>{" "}
                    <button type="button" onClick={() => void handleLogOut()}>
                        Log Out
                    </button>
                </div>
            ) : (
                <div id="form">
                    {/* The form lets Enter submit; the div.login inside matches the existing CSS. */}
                    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
                        <div className="login">
                            <label htmlFor="email">Email:</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <br />
                            <label htmlFor="password">Password:</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <br />
                            <div>
                                <input
                                    type="checkbox"
                                    id="remember-me"
                                    name="remember-me"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <label htmlFor="remember-me">Remember me</label>
                            </div>
                            <p style={{ fontSize: "12px" }}>
                                *Do not click this checkbox if you are on a public computer.
                                <br />
                                Only select this option if you are on a personal computer.
                            </p>
                            <br />
                            <button id="submit" type="submit" disabled={submitting}>
                                {submitting ? "Logging In..." : "Log In"}
                            </button>
                        </div>
                    </form>

                    <a
                        id="password-reset"
                        role="button"
                        tabIndex={0}
                        onClick={() => void handlePasswordReset()}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") void handlePasswordReset();
                        }}
                        style={{ textAlign: "left", display: "inline-block", marginBottom: "16px", cursor: "pointer" }}
                    >
                        Forgot your password?
                    </a>
                    <p className="sign-in-switch">Don't have an account?</p>
                    <a
                        className="sign-in-switch"
                        id="sign-up-switch-link"
                        href={signUpHref}
                        style={{ marginBottom: "30px" }}
                    >
                        Click here to sign up!
                    </a>
                </div>
            )}

            <MessageBox message={message} onClose={() => setMessage(null)} />
        </main>
    );
}
