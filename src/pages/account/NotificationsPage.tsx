export default function NotificationsPage() {
    return (
        <>
            <div className="setting-section">
                <h6 className="setting-title">Notifications</h6>
                <p className="setting-description"></p>
                {/* TODO: Make notifications work properly. For now, I'm hiding them. */}
                {/*
                <p className="unread notification"><span className="unread">🔔</span>Your book, <b>The Bible</b>, is due in 4 days!</p>
                <p className="notification">Your email address has NOT been verified! Click <a onClick={() => {}}>here</a> to verify it!</p>
                */}
            </div>
            <div className="setting-section">
                <h6 className="setting-title">Notification Settings</h6>
                <p className="setting-description">Give me notifications for:</p>
                <ul>
                    <input type="checkbox" name="Checkouts" defaultChecked />
                    Checkouts
                </ul>
            </div>
            <div className="setting-section">
                <button className="save-button">Save Changes</button>
            </div>
        </>
    );
}
