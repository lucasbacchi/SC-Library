export default function HelpPage() {
    return (
        <div id="FAQ">
            <p style={{ margin: "0 10px" }}>
                Feeling lost? Worry not! You're in the right place. Here are some frequently asked questions that might
                be exactly what you're looking for:
            </p>
            <br />
            <p className="question">Q: How do I search for a book?</p>
            <p className="answer">
                A: Type any information about the book (for example, its title or author) into the search bar on the
                home page. Hopefully, you'll find the book you're looking for! If you need to get more specific, you can
                use the filters on the search page to help narrow your search query.
            </p>
            <br />
            <p className="question">Q: How do I sign in?</p>
            <p className="answer">
                A: Click "Log In" above. Enter your email address and password in the boxes provided. Click the submit
                button and then you'll be all set! Don't have an account? No worries! Click "Sign Up" above, enter your
                information, and after we verify your identity, you'll be able to checkout books!
            </p>
            <br />
            <p className="question">Q: What if I'm not a South Church member?</p>
            <p className="answer">
                A: Unfortunately, only South Church members can check out books at the moment. Feel free to visit the
                library in person (you might even be convinced to become a member after all!)
            </p>
            <br />
            <p className="question">Q: How do I check out a book?</p>
            <p className="answer">
                A: Great question! We love that you're so enthusatic to start using the library! Right now, you can only
                check out books in person using the paper checkout cards. We're working on a way to allow you to check
                out books using the online system, but that feature is still in development. Stay tuned!
            </p>
            <br />
            <br />
            <p>
                Do you have other questions that we haven't answered? Feel free to contact us at{" "}
                <a target="_blank" rel="noreferrer" href="mailto:library@southchurch.com">
                    library@southchurch.com
                </a>
                .
            </p>
        </div>
    );
}
