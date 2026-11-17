export default function SearchPage() {
    return (
        <>
            <div className="search-container" id="search-page-search-container">
                <input
                    id="search-page-search-input"
                    className="search-input"
                    placeholder="Search by title, author, subject, keyword..."
                />
                <button className="material-symbols-outlined search-button" id="search-page-search-button">
                    search
                </button>
            </div>

            <div id="search-page-content">
                <div id="sort-sidebar">
                    <h3 id="sort-main-title" tabIndex={0}>
                        Filter Search Results
                    </h3>
                    <button id="apply-filters-button">Apply Filters</button>
                    <div className="sort-section">
                        <h6 className="sort-title">Author</h6>
                        <ul className="sort-list" id="sort-author-list"></ul>
                    </div>
                    <div className="sort-section">
                        <h6 className="sort-title">Medium</h6>
                        <ul className="sort-list" id="sort-medium-list"></ul>
                    </div>
                    <div className="sort-section">
                        <h6 className="sort-title">Audience</h6>
                        <ul className="sort-list" id="sort-audience-list"></ul>
                    </div>
                    <div className="sort-section">
                        <h6 className="sort-title">Subject</h6>
                        <ul className="sort-list" id="sort-subject-list"></ul>
                    </div>
                    <div className="sort-section">
                        <h6 className="sort-title">Type</h6>
                        <ul className="sort-list" id="sort-type-list"></ul>
                    </div>
                </div>

                <div id="results-container">
                    <div id="search-results-container"></div>
                    <div id="paginator"></div>
                </div>
            </div>
        </>
    );
}
