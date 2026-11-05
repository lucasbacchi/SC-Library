import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
    browserLocalPersistence,
    browserSessionPersistence,
    createUserWithEmailAndPassword,
    deleteUser,
    onAuthStateChanged,
    sendEmailVerification,
    setPersistence,
    type User
} from "firebase/auth";
import { auth } from "../firebase";
import { MessageBox, safeRedirect, type Message } from "../authUtils";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
/** Firebase rejects passwords shorter than 6 characters. */
const MIN_PASSWORD_LENGTH = 6;

interface SignUpForm {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address: string;
    town: string;
    state: string;
    zip: string;
    password: string;
    confirmPassword: string;
}

const EMPTY_FORM: SignUpForm = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    town: "",
    state: "",
    zip: "",
    password: "",
    confirmPassword: ""
};

/** The same checks as the old sign-up page, in the order the fields appear. Returns a problem, or null. */
function validate(form: SignUpForm): string | null {
    if (form.firstName.trim().length < 1) return "Please enter a first name.";
    if (form.lastName.trim().length < 1) return "Please enter a last name.";
    if (form.email.trim().length < 4 || !form.email.includes("@")) return "Please enter an email address.";
    if (!/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(form.phone.trim())) {
        return "Please enter a valid phone number.";
    }
    if (form.address.trim().length < 6) return "Please enter a valid address.";
    if (form.town.trim().length < 3) return "Please enter a valid town.";
    if (!/^[A-Za-z]{2}$/.test(form.state.trim())) return "Please enter the state as two letters (ex. MA).";
    if (!/^\d{5}$/.test(form.zip.trim())) return "Please enter a valid 5-digit zip code.";
    if (form.password.length < MIN_PASSWORD_LENGTH) {
        return `Please enter a password with at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (form.password != form.confirmPassword) return "Your passwords do not match.";
    return null;
}

function signUpErrorMessage(code: string): string {
    switch (code) {
        case "auth/email-already-in-use":
            return (
                "This email is already in use. If you already have an account, please try logging in instead. " +
                "If you don't remember your password, you can reset it from the login page, or contact the librarian for help."
            );
        case "auth/weak-password":
            return "The password is too weak. Please try another password.";
        case "auth/invalid-email":
            return "Please enter a valid email address.";
        case "auth/network-request-failed":
            return "Could not connect. Please check your internet connection and try again.";
        default:
            return "There was an error creating your account. Please try again.";
    }
}

export default function SignUp() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const redirect = safeRedirect(searchParams.get("redirect"));

    const [form, setForm] = useState<SignUpForm>(EMPTY_FORM);
    const [rememberMe, setRememberMe] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    useEffect(() => {
        document.title = "Sign Up | South Church Library";
        return onAuthStateChanged(auth, setCurrentUser);
    }, []);

    function update(field: keyof SignUpForm) {
        return (e: { target: { value: string } }) => setForm((f) => ({ ...f, [field]: e.target.value }));
    }

    async function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (submitting) return;
        const problem = validate(form);
        if (problem) {
            setMessage({ title: "Sign Up", text: problem });
            return;
        }

        setSubmitting(true);
        let createdUser: User | null = null;
        try {
            await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
            const credential = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password);
            createdUser = credential.user;

            // Save the profile and get a card number from the backend.
            const state = form.state.trim().toUpperCase();
            const response = await fetch(`${API_URL}/users/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + (await createdUser.getIdToken())
                },
                body: JSON.stringify({
                    firstName: form.firstName.trim(),
                    lastName: form.lastName.trim(),
                    phone: form.phone.trim(),
                    address: `${form.address.trim()}, ${form.town.trim()}, ${state} ${form.zip.trim()}`
                })
            });
            if (!response.ok) {
                const body = (await response.json().catch(() => ({}))) as { error?: string };
                throw Object.assign(new Error(body.error ?? "register failed"), { serverMessage: body.error });
            }

            // Not required to borrow, but the old site sent it too.
            sendEmailVerification(createdUser).catch((err) => console.warn("Verification email not sent:", err));

            navigate(redirect, { replace: true });
        } catch (error) {
            const code = (error as { code?: string }).code ?? "";
            const serverMessage = (error as { serverMessage?: string }).serverMessage;

            // If the login account was created but the profile couldn't be saved, remove the half-made
            // account so the person can simply try again with the same email.
            if (createdUser) {
                await deleteUser(createdUser).catch((err) => console.error("Could not undo the new account:", err));
            }

            console.error("Sign up failed:", code || error);
            setMessage({
                title: "Could Not Sign Up",
                text: serverMessage
                    ? serverMessage + " Please fix it and try again."
                    : createdUser
                      ? "Your account could not be set up. The library server may be offline. Please try again later."
                      : signUpErrorMessage(code)
            });
            setForm((f) => ({ ...f, password: "", confirmPassword: "" }));
        } finally {
            setSubmitting(false);
        }
    }

    const logInHref = redirect == "/" ? "/login" : "/login?redirect=" + encodeURIComponent(redirect);

    const fields: { id: keyof SignUpForm; htmlId: string; label: string; type: string; autoComplete: string }[] = [
        { id: "firstName", htmlId: "firstName", label: "First Name:", type: "text", autoComplete: "given-name" },
        { id: "lastName", htmlId: "lastName", label: "Last Name:", type: "text", autoComplete: "family-name" },
        { id: "email", htmlId: "email", label: "Email:", type: "email", autoComplete: "email" },
        { id: "phone", htmlId: "phone", label: "Phone Number:", type: "tel", autoComplete: "tel" },
        { id: "address", htmlId: "address", label: "Address:", type: "text", autoComplete: "address-line1" },
        { id: "town", htmlId: "town", label: "Town:", type: "text", autoComplete: "address-level2" },
        { id: "state", htmlId: "state", label: "State:", type: "text", autoComplete: "address-level1" },
        { id: "zip", htmlId: "zip", label: "Zip Code:", type: "text", autoComplete: "postal-code" },
        { id: "password", htmlId: "password", label: "Password:", type: "password", autoComplete: "new-password" },
        {
            id: "confirmPassword",
            htmlId: "confirm-password",
            label: "Confirm Password:",
            type: "password",
            autoComplete: "new-password"
        }
    ];

    return (
        <main id="content">
            <h1 className="sign-in-title">Sign up for an Account</h1>

            {currentUser ? (
                <div id="form">
                    <p>
                        You are already logged in as <b>{currentUser.email}</b>.
                    </p>
                    <button type="button" onClick={() => navigate(redirect)}>
                        Continue
                    </button>
                </div>
            ) : (
                <div id="form">
                    <form onSubmit={(e) => void handleSubmit(e)} noValidate>
                        <div className="login">
                            {fields.map((f) => (
                                <Fragment key={f.id}>
                                    <label htmlFor={f.htmlId}>{f.label}</label>
                                    <input
                                        type={f.type}
                                        id={f.htmlId}
                                        name={f.htmlId}
                                        autoComplete={f.autoComplete}
                                        maxLength={f.id == "state" ? 2 : f.id == "zip" ? 5 : undefined}
                                        value={form[f.id]}
                                        onChange={update(f.id)}
                                    />
                                    <br />
                                </Fragment>
                            ))}
                            <div>
                                <input
                                    type="checkbox"
                                    id="remember-me"
                                    name="remember-me"
                                    style={{ float: "left", marginTop: "6px" }}
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
                                {submitting ? "Signing Up..." : "Sign Up"}
                            </button>
                        </div>
                    </form>

                    <p className="sign-in-switch">Already have an Account?</p>
                    <a
                        className="sign-in-switch"
                        id="log-in-switch-link"
                        href={logInHref}
                        style={{ marginBottom: "20px" }}
                    >
                        Click here to Log In!
                    </a>
                </div>
            )}

            <MessageBox message={message} onClose={() => setMessage(null)} />
        </main>
    );
}
