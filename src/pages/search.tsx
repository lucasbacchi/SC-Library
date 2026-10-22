// TODO: Work in progress — Browse/search page is not finished yet.
// This is still the early test version. It does not load or display books correctly yet.
// I'm still converting the logic from src/js/search.js (browse, pagination, filters, result page).
// — Fekadu



import { useEffect, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { firestore } from "../firebase";

export default function Search() {
    const [docs, setDocs] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(firestore, "books"), limit(3));
        getDocs(q)
            .then((snapshot) => {
                const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                console.log("Books from Firestore:", data);
                setDocs(data);
            })
            .catch((err) => console.error("Error loading books:", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <main style={{ padding: "2rem" }}>Loading...</main>;

    return (
        <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1rem" }}>
            <p>Loaded {docs.length} documents. Check the browser console.</p>
        </main>
    );
}