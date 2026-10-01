import type { Route } from "./+types/HomePage";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "South Church Library" },
        { name: "description", content: "Welcome to the South Church Library Catalog!" }
    ];
}

export default function HomePage() {
    return (
        // <div id="index-content-container">
        <div id="content">
            <div className="search-container" id="home-page-search-container">
                <input
                    id="home-page-search-input"
                    className="search-input"
                    placeholder="Search by title, author, subject, keyword..."
                />
                <button className="material-symbols-outlined search-button" id="home-page-search-button">
                    search
                </button>
            </div>

            <p className="welcome-text">
                Welcome to the South Church library! Feel free to stop by and take a look at our selection of books, or
                you can check them out and take them home for a while.
            </p>
            <p className="welcome-text">Here are some books our algorithm has picked out especially for you:</p>
            <div id="books" style={{ minHeight: "562px" }}></div>
        </div>
        // </div>
    );
}
