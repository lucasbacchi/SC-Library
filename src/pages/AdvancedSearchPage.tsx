export default function AdvancedSearchPage() {
    return (
        <div id="form">
            <form action="search.html" method="GET">
                <label htmlFor="title">Title:</label>
                <input type="text" id="title" name="title" />
                <br />
                <br />
                <label htmlFor="author">Author:</label>
                <input type="text" id="author" name="author" />
                <br />
                <br />
                <label htmlFor="subject">Subject:</label>
                <input type="text" id="subject" name="subject" />
                <br />
                <br />
                <label htmlFor="keyword">Keyword:</label>
                <input type="text" id="keyword" name="keyword" />
                <br />
                <br />
                <input type="submit" value="Submit" />
            </form>
        </div>
    );
}
