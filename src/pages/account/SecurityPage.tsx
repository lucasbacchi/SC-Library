export default function SecurityPage() {
    return (
        <>
            <div className="setting-section">
                <h6 className="setting-title">Change your password</h6>
                <p className="setting-description">Enter your current password as well as a new password</p>
                <p>Current Password</p>
                <input type="password" id="current-password" className="account-input" />
                <p>New Password</p>
                <input type="password" id="new-password" className="account-input" />
                <p>Confirm New Password</p>
                <input type="password" id="confirm-new-password" className="account-input" />
                <button id="change-password">Change Password</button>
            </div>
            <div className="setting-section">
                <h6 className="setting-title">Delete Your Account</h6>
                <p className="setting-description">Enter your current password to delete your account:</p>
                <input type="password" id="delete-password" className="account-input" />
                <button id="delete-account-button">Delete Your Account Forever!</button>
            </div>
        </>
    );
}
