export default function SignupPage() {
    return (
        <>
            <h1 className="sign-in-title">Sign up for an Account</h1>

            <div id="form">
                <div className="login">
                    <label htmlFor="firstName">First Name:</label>
                    <input type="text" id="firstName" name="firstName" />
                    <br />
                    <label htmlFor="lastName">Last Name:</label>
                    <input type="text" id="lastName" name="lastName" />
                    <br />
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" name="email" />
                    <br />
                    <label htmlFor="phone">Phone Number:</label>
                    <input type="tel" id="phone" name="phone" />
                    <br />
                    <label htmlFor="address">Address:</label>
                    <input type="text" id="address" name="address" />
                    <br />
                    <label htmlFor="town">Town:</label>
                    <input type="text" id="town" name="town" />
                    <br />
                    <label htmlFor="state">State:</label>
                    <input type="text" id="state" name="state" />
                    <br />
                    <label htmlFor="zip">Zip Code:</label>
                    <input type="text" id="zip" name="zip" />
                    <br />
                    <label htmlFor="password">Password:</label>
                    <input type="password" id="password" name="password" />
                    <br />
                    <label htmlFor="confirm-password">Confim Password:</label>
                    <input type="password" id="confirm-password" name="confirm-password" />
                    <br />
                    <div>
                        <input type="checkbox" id="remember-me" name="remember-me" className="float-left mt-1.5" />
                        <label htmlFor="remember-me">Remember me</label>
                    </div>
                    <p className="text-[12px]">
                        *Do not click this checkbox if you are on a public computer.
                        <br />
                        Only select this option if you are on a personal computer.
                    </p>
                    <br />
                    <button id="submit">Sign Up</button>
                </div>

                <p className="sign-in-switch">Already have an Account?</p>
                <a className="sign-in-switch mb-5" id="log-in-switch-link" href="/login">
                    Click here to Log In!
                </a>
            </div>
        </>
    );
}
