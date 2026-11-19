/** Shared pieces for the Log In and Sign Up pages. */

export interface Message {
    title: string;
    text: string;
}

/**
 * After logging in or signing up, only send people to pages on this website.
 * If a link tries to send them to another website, send them to the home page instead.
 */
export function safeRedirect(value: string | null): string {
    if (value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) return value;
    return "/";
}

/** The same quick email check the old site used before sending a password reset. */
export function looksLikeEmail(email: string): boolean {
    return email.includes("@") && email.lastIndexOf(".") > email.indexOf("@");
}

/** A simple message box with an OK button. Click outside or press OK to close. */
export function MessageBox({ message, onClose }: { message: Message | null; onClose: () => void }) {
    if (!message) return null;
    return (
        <div
            role="alertdialog"
            aria-labelledby="auth-message-title"
            onClick={onClose}
            style={{
                position: "fixed",
                inset: 0,
                backgroundColor: "#000000c0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    background: "white",
                    padding: "1.5rem",
                    borderRadius: "8px",
                    maxWidth: "420px",
                    margin: "0 16px"
                }}
            >
                <h3 id="auth-message-title" style={{ marginTop: 0 }}>
                    {message.title}
                </h3>
                <p>{message.text}</p>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button type="button" onClick={onClose} autoFocus>
                        OK
                    </button>
                </div>
            </div>
        </div>
    );
}
