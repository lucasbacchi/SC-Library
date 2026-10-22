export default function Help() {
    return (
        <main
            style={{
                maxWidth: "800px", margin: "0 auto", padding: "2rem 1rem", textAlign: "center", display: "flex",
                flexDirection: "column", gap: "1rem",
            }}
        >
            <p>
                Feeling lost? Worry not! You&apos;re in the right place. Here are some frequently asked
                questions that might be exactly what you&apos;re looking for:
            </p>

            <div>
                <p><strong>Q: How do I search for a book?</strong></p>
                <p>
                    A: Type any information about the book (for example, its title or author) into the
                    search bar on the home page. Hopefully, you&apos;ll find the book you&apos;re looking
                    for! If you need to get more specific, you can use the filters on the search page to
                    help narrow your search query.
                </p>
            </div>

            <div>
                <p><strong>Q: How do I sign in?</strong></p>
                <p>
                    A: Click &quot;Log In&quot; above. Enter your email address and password in the boxes
                    provided. Click the submit button and then you&apos;ll be all set! Don&apos;t have an
                    account? No worries! Click &quot;Sign Up&quot; above, enter your information, and
                    after we verify your identity, you&apos;ll be able to checkout books!
                </p>
            </div>

            <div>
                <p><strong>Q: What if I&apos;m not a South Church member?</strong></p>
                <p>
                    A: Unfortunately, only South Church members can check out books at the moment. Feel
                    free to visit the library in person (you might even be convinced to become a member
                    after all!)
                </p>
            </div>

            <div>
                <p><strong>Q: How do I check out a book?</strong></p>
                <p>
                    A: Great question! We love that you&apos;re so enthusiastic to start using the
                    library! Right now, you can only check out books in person using the paper checkout
                    cards. We&apos;re working on a way to allow you to check out books using the online
                    system, but that feature is still in development. Stay tuned!
                </p>
            </div>

            <p>
                Do you have other questions that we haven&apos;t answered? Feel free to contact us at{" "}
                <a href="mailto:library@southchurch.com">library@southchurch.com</a>.
            </p>
        </main>
    );
}