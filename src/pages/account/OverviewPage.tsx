export default function OverviewPage() {
    return (
        <>
            <div className="setting-section">
                <h6 className="setting-title">First Name</h6>
                <p className="setting-description"></p>
                <input id="setting-first-name" placeholder="Enter your First Name" className="account-input" />
            </div>
            <div className="setting-section">
                <h6 className="setting-title">Last Name</h6>
                <p className="setting-description"></p>
                <input id="setting-last-name" placeholder="Enter your Last Name" className="account-input" />
            </div>
            <div className="setting-section">
                <h6 className="setting-title">Your Email Address</h6>
                <p className="setting-description">This is your primary email address.</p>
                <input id="setting-email" placeholder="Enter your Email Address" className="account-input" />
                <p id="email-verified" style={{ display: "none" }} className="setting-description">
                    Your email address has NOT been verified! Click{" "}
                    <a id="email-verified-link" tabIndex={0}>
                        here
                    </a>{" "}
                    to verify it!
                </p>
            </div>
            <div className="setting-section">
                <h6 className="setting-title">Your Library Card Number</h6>
                <p className="setting-description">
                    Behind the scenes, this is your library card number, but is not editable. Login with your email
                    address.
                </p>
                <input id="setting-card-number" placeholder="2 1711 0000" className="account-input" disabled={true} />
            </div>
            <div className="setting-section">
                <button className="save-button">Save Changes</button>
            </div>
        </>
    );
}
