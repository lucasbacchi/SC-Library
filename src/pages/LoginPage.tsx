export default function LoginPage() {
    return (
        <>
            <h1 className="sign-in-title">Log In</h1>

            <div id="form">
                <div className="login">
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" name="email" />
                    <br />
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" name="password" />
                    <br />
                    <div>
                        <input type="checkbox" id="remember-me" name="remember-me" />
                        <label htmlFor="remember-me">Remember me</label>
                    </div>
                    <p style={{ fontSize: "12px" }}>
                        *Do not click this checkbox if you are on a public computer.
                        <br />
                        Only select this option if you are on a personal computer.
                    </p>
                    <br />
                    <button id="submit">Log In</button>
                </div>

                <a id="password-reset" style={{ textAlign: "left", display: "inline-block", marginBottom: "16px" }}>
                    Forgot your password?
                </a>
                <p className="sign-in-switch">Don't have an account?</p>
                <a className="sign-in-switch" id="sign-up-switch-link" href="/signup" style={{ marginBottom: "30px" }}>
                    Click here to sign up!
                </a>
            </div>
        </>
    );
}
