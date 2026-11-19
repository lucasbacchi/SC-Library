import { Link } from "react-router";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer>
            <div className="footer-div">
                <h2 className="footer-title no-select">Contact Us</h2>
                <ul className="footer-list">
                    <li>
                        <a href="https://goo.gl/maps/tr2RhuvuRkpu9jGu8" target="_blank" rel="noreferrer">
                            41 Central St, Andover, MA 01810
                        </a>
                    </li>
                    <li>
                        <a href="mailto:library@southchurch.com" target="_blank" rel="noreferrer">
                            library@southchurch.com
                        </a>
                    </li>
                    <li>
                        <a href="tel:978-475-0321">978-475-0321</a>
                    </li>
                </ul>
            </div>
            <div className="footer-div">
                <h2 className="footer-title no-select">South Church</h2>
                <ul className="footer-list">
                    <li>
                        <a href="https://southchurch.com/" target="_blank" rel="noreferrer">
                            Website
                        </a>
                    </li>
                    <li>
                        <a href="https://southchurch.com/worship" target="_blank" rel="noreferrer">
                            Worship
                        </a>
                    </li>
                    <li>
                        <a href="https://southchurch.com/welcome" target="_blank" rel="noreferrer">
                            Welcome
                        </a>
                    </li>
                </ul>
            </div>
            <div className="footer-div">
                <h2 className="footer-title no-select">Help</h2>
                <ul className="footer-list">
                    <li>
                        <Link to="/help">Help Page</Link>
                    </li>
                    <li>
                        <Link to="/help#FAQ">FAQs</Link>
                    </li>
                    <li>
                        <Link to="/sitemap">Sitemap</Link>
                    </li>
                </ul>
            </div>
            <div className="footer-bottom">&#169; {currentYear} South Church in Andover</div>
        </footer>
    );
}
