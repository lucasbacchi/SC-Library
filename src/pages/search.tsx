// TODO: Work in progress — Browse/search page is not finished yet.
// This is still the early test version. It does not load or display books correctly yet.
// I'm still converting the logic from src/js/search.js (browse, pagination, filters, result page).
// — Fekadu

import { useEffect, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { firestore } from "../firebase";

/** The fields of a book this page shows. Each Firestore "books" document holds a list of these. */
interface BookSummary {
    barcodeNumber: number;
    title: string;
    subtitle?: string;
    authors?: { firstName: string; lastName: string }[];
    thumbnailImageLink?: string;
    coverImageLink?: string;
    medium?: string;
    isDeleted?: boolean;
    isHidden?: boolean;
}

const MAX_BOOKS_SHOWN = 20;

function bookImage(book: BookSummary): string {
    if (book.medium == "av") return "/img/av-image.png";
    if (book.thumbnailImageLink?.startsWith("http")) return book.thumbnailImageLink;
    if (book.coverImageLink?.startsWith("http")) return book.coverImageLink;
    return "/img/default-book.png";
}

function authorNames(book: BookSummary): string {
    const names = (book.authors ?? [])
        .filter((a) => a.firstName || a.lastName)
        .map((a) => a.lastName + ", " + a.firstName);
    return names.length > 0 ? names.join("; ") : "Unknown author";
}

export default function Search() {
    const [books, setBooks] = useState<BookSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const q = query(collection(firestore, "books"), limit(3));
        getDocs(q)
            .then((snapshot) => {
                // Each document holds an array of books, so flatten them into one list.
                const allBooks = snapshot.docs.flatMap((d) => (d.data().books ?? []) as BookSummary[]);
                // Skip books that were deleted or hidden by an admin.
                const visible = allBooks.filter((b) => !b.isDeleted && !b.isHidden);
                setBooks(visible.slice(0, MAX_BOOKS_SHOWN));
            })
            .catch((err) => {
                console.error("Error loading books:", err);
                setError("There was an error loading the books. Please try again later.");
            })
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <main style={{ padding: "2rem" }}>Loading...</main>;
    if (error) return <main style={{ padding: "2rem" }}>{error}</main>;

    return (
        <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1rem" }}>
            <h1>Browse</h1>
            {books.length == 0 ? (
                <p>No books found.</p>
            ) : (
                <ul style={{ listStyle: "none", padding: 0 }}>
                    {books.map((book) => (
                        <li
                            key={book.barcodeNumber}
                            style={{ display: "flex", gap: "1rem", padding: "1rem 0", borderBottom: "1px solid #ddd" }}
                        >
                            <img
                                src={bookImage(book)}
                                alt={"Cover of " + book.title}
                                style={{ width: "80px", height: "auto", objectFit: "contain" }}
                            />
                            <div>
                                <a href={"/result?id=" + book.barcodeNumber}>
                                    <strong>{book.title}</strong>
                                </a>
                                {book.subtitle && <div>{book.subtitle}</div>}
                                <div>{authorNames(book)}</div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </main>
    );
}
