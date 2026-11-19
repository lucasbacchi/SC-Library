import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../firebase";
import type { BookCardData } from "../components/BookCard";
import type { Route } from "./+types/HomePage";
import ClientLoader from "~/components/ClientLoader";
import BookCard from "../components/BookCard";

export function meta({}: Route.MetaArgs) {
    return [
        { title: "South Church Library" },
        { name: "description", content: "Welcome to the South Church Library Catalog!" }
    ];
}

interface FirestoreBookData {
    barcodeNumber: number;
    title: string;
    authors?: { firstName: string; lastName: string }[];
    iconImageLink?: string;
    thumbnailImageLink?: string;
    coverImageLink?: string;
    medium?: string;
    isDeleted?: boolean;
    isHidden?: boolean;
}

export default function HomePage() {
    const [books, setBooks] = useState<BookCardData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;
        getDocs(collection(firestore, "books"))
            .then((snapshot) => {
                if (!isMounted) return;
                const allBooks = snapshot.docs.flatMap((d) => (d.data().books ?? []) as FirestoreBookData[]);
                // Filter out deleted and hidden books
                const validBooks = allBooks.filter((b) => !b.isDeleted && !b.isHidden && b.barcodeNumber);
                // Shuffle and pick 9 books
                const shuffled = [...validBooks].sort(() => 0.5 - Math.random());
                setBooks(shuffled.slice(0, 9));
            })
            .catch((err) => {
                if (!isMounted) return;
                console.error("Error fetching recommended books:", err);
                setError("Unable to load recommended books at this time.");
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div id="index-content-container">
            <div id="content">
                <p className="welcome-text">
                    Welcome to the South Church library! Feel free to stop by and take a look at our selection of books,
                    or you can check them out and take them home for a while.
                </p>
                <p className="welcome-text">Here are some books our algorithm has picked out especially for you:</p>

                <ClientLoader loading={loading} text="Loading book recommendations..." minHeight="300px">
                    {error ? (
                        <p className="welcome-text text-gray-500 py-8">{error}</p>
                    ) : books.length === 0 ? (
                        <p className="welcome-text text-gray-500 py-8">No books currently available.</p>
                    ) : (
                        <div id="books" className="min-h-140.5">
                            {books.map((book) => (
                                <BookCard key={book.barcodeNumber} book={book} />
                            ))}
                        </div>
                    )}
                </ClientLoader>
            </div>
        </div>
    );
}
