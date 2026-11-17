import { Outlet } from "react-router";

export default function AccountPage() {
    return (
        <div className="main-column">
            <div className="menu-column">
                <div className="account-info">
                    <div className="account-image-container image-overlay-container no-select">
                        <img id="account-page-image" src="../img/default-user.jpg" alt="" />
                        <div id="account-image-overlay" tabIndex={0} className="image-overlay">
                            <span>Change Photo</span>
                        </div>
                        <input type="file" id="file-input" style={{ display: "none" }} accept="image/*" />
                    </div>
                    <p id="account-page-name"></p>
                    <p id="account-page-email"></p>
                </div>
                <div className="menu-list no-select">
                    <li>
                        <a id="overview-panel-link" href="/account?overview">
                            Overview
                        </a>
                    </li>
                    <li>
                        <a id="checkouts-panel-link" href="/account?checkouts">
                            Checkouts
                        </a>
                    </li>
                    <li>
                        <a id="notifications-panel-link" href="/account?notifications">
                            Notifications
                        </a>
                    </li>
                    <li>
                        <a id="security-panel-link" href="/account?security">
                            Security
                        </a>
                    </li>
                </div>
            </div>
            <div id="settings-column">
                <Outlet />
            </div>
        </div>
    );
}
