import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { doc, getDoc, type Timestamp } from "firebase/firestore";
import { auth, firestore } from "../firebase";
import "../css/search.css";
import defaultBookImage from "../img/default-book.png";
import avImage from "../img/av-image.png";

/* ---------- Types ---------- */

interface Person {
    firstName: string;
    lastName: string;
}

/** The fields of a book this page shows. */
interface Book {
    barcodeNumber: number;
    title: string;
    subtitle?: string;
    authors?: Person[];
    illustrators?: Person[];
    subjects?: string[];
    description?: string;
    publishers?: string[];
    publishDate?: Timestamp | null;
    numberOfPages?: number;
    isbn10?: string;
    isbn13?: string;
    ddc?: string;
    medium?: string;
    audience?: { children?: boolean; youth?: boolean; adult?: boolean };
    thumbnailImageLink?: string;
    coverImageLink?: string;
    canBeCheckedOut?: boolean;
    isDeleted?: boolean;
    isHidden?: boolean;
}

/** A small message box, used for Borrow and Copy Link. */
interface Message {
    title: string;
    text: string;
    /** Adds a second button, e.g. "Borrow", that runs this action. */
    confirm?: { label: string; action: () => void };
}

/** What the backend says about whether a book can be borrowed. */
interface Availability {
    available: boolean;
    reason?: "reference" | "checked-out";
    dueDate?: string | null;
    loanDays?: number;
}

/* ---------- Constants ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MEDIUM_NAMES: Record<string, string> = { paperback: "Paperback", hardcover: "Hardcover", av: "AV" };
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";
const DEFAULT_LOAN_DAYS = 21;

function formatDate(date: Date): string {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/* ---------- Loading ---------- */

/**
 * Loads one book straight from its Firestore document.
 * The barcode says where it is stored: 1171100323 is book 23 in document "003".
 */
async function loadBook(barcodeNumber: number): Promise<Book | null> {
    const documentId = String(Math.floor(barcodeNumber / 100) % 1000).padStart(3, "0");
    const bookIndex = barcodeNumber % 100;
    const snapshot = await getDoc(doc(firestore, "books", documentId));
    if (!snapshot.exists()) return null;
    const book = (snapshot.data().books as Book[] | undefined)?.[bookIndex];
    // Make sure we found the right book before showing it.
    if (!book || book.barcodeNumber != barcodeNumber) return null;
    return book;
}

/* ---------- Formatting (same output as the old fillResultPage) ---------- */

/** 1171100323 -> "1 1711 00323" */
function spacedBarcode(barcodeNumber: number): string {
    const s = String(barcodeNumber);
    return s.slice(0, 1) + " " + s.slice(1, 5) + " " + s.slice(5);
}

function namedPeople(people: Person[] | undefined): Person[] {
    return (people ?? []).filter((p) => p.firstName || p.lastName);
}

function personName(person: Person): string {
    return person.lastName + ", " + person.firstName;
}

/** e.g. "612.6" then "BOR"; children's books start with J, youth with Y, reference books with REF. */
function callNumberLines(book: Book): string[] {
    const lines: string[] = [];
    let prefix = "";
    if (book.audience?.children) prefix = "J";
    else if (book.audience?.youth) prefix = "Y";
    else if (book.canBeCheckedOut === false) lines.push("REF");
    lines.push(prefix + (book.ddc ?? ""));

    const firstAuthor = namedPeople(book.authors)[0];
    const sortName = firstAuthor ? firstAuthor.lastName : book.title;
    lines.push((sortName ?? "").toUpperCase().substring(0, 3));
    return lines;
}

function audienceText(book: Book): string {
    const list: string[] = [];
    if (book.audience?.children) list.push("Children");
    if (book.audience?.youth) list.push("Youth");
    if (book.audience?.adult) list.push("Adult");
    return list.length > 0 ? list.join(", ") : "None";
}

/**
 * Full date when the day is known, "Mar, 1999" when only the month is known (stored as the 1st),
 * and just the year when stored as January 1st.
 */
function publishDateText(timestamp: Timestamp | null | undefined): string {
    if (!timestamp) return "None";
    const d = timestamp.toDate();
    if (d.getMonth() == 0 && d.getDate() == 1) return String(d.getFullYear());
    if (d.getDate() == 1) return MONTHS[d.getMonth()] + ", " + d.getFullYear();
    return d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear();
}

function availabilityText(book: Book, availability: Availability | null): string {
    if (book.canBeCheckedOut === false || availability?.reason == "reference") return "Reference only (in library)";
    if (availability?.reason == "checked-out") {
        return availability.dueDate
            ? "Checked out, due back " + formatDate(new Date(availability.dueDate))
            : "Checked out";
    }
    if (availability?.available) return "Available";
    return "Ask at the library";
}

/** Shows a list of lines with line breaks between them. */
function Lines({ items }: { items: string[] }) {
    return (
        <>
            {items.map((item, i) => (
                <span key={i}>
                    {i > 0 && <br />}
                    {item}
                </span>
            ))}
        </>
    );
}

/* ---------- Page ---------- */

export default function Result() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const barcodeNumber = parseInt(searchParams.get("id") ?? "");
    const validBarcode = Number.isInteger(barcodeNumber) && barcodeNumber > 0;

    const [book, setBook] = useState<Book | null>(null);
    const [status, setStatus] = useState<"loading" | "ready" | "not-found" | "error">("loading");
    const [popupOpen, setPopupOpen] = useState(false);
    const [message, setMessage] = useState<Message | null>(null);
    const [availability, setAvailability] = useState<Availability | null>(null);
    const [borrowing, setBorrowing] = useState(false);

    useEffect(() => {
        if (!validBarcode) return;
        setStatus("loading");
        loadBook(barcodeNumber)
            .then((found) => {
                if (!found || found.isDeleted || found.isHidden) {
                    setStatus("not-found");
                    return;
                }
                setBook(found);
                setStatus("ready");
                document.title = found.title + " | South Church Library";
                // Ask the backend whether it can be borrowed right now.
                fetch(`${API_URL}/books/${barcodeNumber}/availability`)
                    .then((r) => (r.ok ? (r.json() as Promise<Availability>) : null))
                    .then((a) => setAvailability(a))
                    .catch(() => setAvailability(null)); // backend offline: Borrow still works and reports errors
            })
            .catch((err) => {
                console.error("Error loading book:", err);
                setStatus("error");
            });
    }, [barcodeNumber, validBarcode]);

    // Close the image popup or message box with the Escape key.
    useEffect(() => {
        if (!popupOpen && !message) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") {
                setPopupOpen(false);
                setMessage(null);
            }
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [popupOpen, message]);

    function goBack() {
        if (window.history.length > 1) navigate(-1);
        else navigate("/search");
    }

    async function borrow() {
        if (!book || borrowing) return;
        if (book.canBeCheckedOut === false || availability?.reason == "reference") {
            setMessage({
                title: "Reference Book",
                text: "This book is a reference book and cannot be checked out. Please visit the library in person to use this book."
            });
            return;
        }
        if (availability?.reason == "checked-out") {
            const due = availability.dueDate
                ? " It is due back on " + formatDate(new Date(availability.dueDate)) + "."
                : "";
            setMessage({ title: "Checked Out", text: "This book is already checked out." + due });
            return;
        }

        // Wait for Firebase to finish restoring the login from the last visit.
        await auth.authStateReady();
        if (!auth.currentUser) {
            // Send them to the login page, then back to this book afterward.
            const here = location.pathname + location.search;
            setMessage({
                title: "Log In to Borrow",
                text: "Please log in with your library account to borrow books.",
                confirm: { label: "Log In", action: () => navigate("/login?redirect=" + encodeURIComponent(here)) }
            });
            return;
        }

        const loanDays = availability?.loanDays ?? DEFAULT_LOAN_DAYS;
        const due = new Date();
        due.setDate(due.getDate() + loanDays);
        setMessage({
            title: "Borrow This Book?",
            text: `Borrow "${book.title}"? It will be due back on ${formatDate(due)}.`,
            confirm: { label: "Borrow", action: () => void confirmBorrow() }
        });
    }

    async function confirmBorrow() {
        if (!book || !auth.currentUser) return;
        setMessage(null);
        setBorrowing(true);
        try {
            const token = await auth.currentUser.getIdToken();
            const response = await fetch(`${API_URL}/books/${book.barcodeNumber}/checkout`, {
                method: "POST",
                headers: { Authorization: "Bearer " + token }
            });
            const body = (await response.json().catch(() => ({}))) as { error?: string; dueDate?: string };
            if (!response.ok || !body.dueDate) {
                setMessage({
                    title: "Could Not Borrow",
                    text: body.error ?? "Something went wrong. Please try again later."
                });
                return;
            }
            setAvailability({ available: false, reason: "checked-out", dueDate: body.dueDate });
            setMessage({
                title: "Checked Out!",
                text: `You borrowed "${book.title}". It is due back on ${formatDate(new Date(body.dueDate))}.`
            });
        } catch (err) {
            console.error("Checkout failed:", err);
            setMessage({
                title: "Could Not Borrow",
                text: "The library server could not be reached. Please try again later."
            });
        } finally {
            setBorrowing(false);
        }
    }

    function copyLink() {
        navigator.clipboard
            .writeText(window.location.href)
            .then(() => setMessage({ title: "Link Copied", text: "The link has been copied to your clipboard." }))
            .catch(() =>
                setMessage({
                    title: "Copy Link",
                    text: "The link could not be copied. Please copy it from the address bar."
                })
            );
    }

    /** Lets keyboard users press Enter on the clickable divs, like the old page. */
    function onEnter(action: () => void) {
        return (e: ReactKeyboardEvent) => {
            if (e.key === "Enter") action();
        };
    }

    if (!validBarcode) {
        return (
            <main id="content" style={{ padding: "2rem" }}>
                <p>A valid barcode was not provided.</p>
                <a href="/search">Go to Browse</a>
            </main>
        );
    }
    if (status == "loading")
        return (
            <main id="content" style={{ padding: "2rem" }}>
                Loading...
            </main>
        );
    if (status != "ready" || !book) {
        return (
            <main id="content" style={{ padding: "2rem" }}>
                <p>
                    {status == "error"
                        ? "There was an error getting this book. Please try again later."
                        : "No information could be found for that book."}
                </p>
                <a href="/search">Go to Browse</a>
            </main>
        );
    }

    // Image: AV items use the AV picture; otherwise the thumbnail, then the cover, then a default.
    const isAv = book.medium == "av";
    const imageUrl = isAv
        ? avImage
        : book.thumbnailImageLink?.startsWith("http")
          ? book.thumbnailImageLink
          : book.coverImageLink?.startsWith("http")
            ? book.coverImageLink
            : defaultBookImage;
    const canEnlarge = !isAv && !!book.coverImageLink?.startsWith("http");

    const authors = namedPeople(book.authors);
    const illustrators = namedPeople(book.illustrators);
    const subjects = book.subjects ?? [];
    const publishers = book.publishers ?? [];
    const isbnLines = [
        book.isbn10 ? "ISBN 10: " + book.isbn10 : "",
        book.isbn13 ? "ISBN 13: " + book.isbn13 : ""
    ].filter(Boolean);

    return (
        <main id="content">
            <div id="result-page-container" style={{ opacity: 1 }}>
                <div id="result-page-header">
                    <div
                        id="result-page-back-button"
                        tabIndex={0}
                        role="button"
                        onClick={goBack}
                        onKeyDown={onEnter(goBack)}
                    >
                        <span className="material-symbols-outlined">arrow_back</span> Back
                    </div>
                    <div
                        id="checkout-button"
                        className={
                            book.canBeCheckedOut === false || availability?.available === false || borrowing
                                ? "disabled"
                                : undefined
                        }
                        tabIndex={0}
                        role="button"
                        aria-disabled={borrowing}
                        onClick={() => void borrow()}
                        onKeyDown={onEnter(() => void borrow())}
                    >
                        {borrowing ? "Borrowing..." : availability?.reason == "checked-out" ? "Checked Out" : "Borrow"}
                    </div>
                </div>

                <div id="result-page-image-container">
                    <img
                        className="result-page-image"
                        src={imageUrl}
                        alt={"Cover of " + book.title}
                        tabIndex={canEnlarge ? 0 : undefined}
                        style={{ cursor: canEnlarge ? "pointer" : "default" }}
                        onClick={canEnlarge ? () => setPopupOpen(true) : undefined}
                        onKeyDown={canEnlarge ? onEnter(() => setPopupOpen(true)) : undefined}
                        onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = defaultBookImage;
                        }}
                    />
                </div>

                <div id="result-page-info-bar">
                    <h6>Barcode Number</h6>
                    <p id="result-page-barcode-number">{spacedBarcode(book.barcodeNumber)}</p>
                    <h6>ISBN Number</h6>
                    <p id="result-page-isbn-number">{isbnLines.length > 0 ? <Lines items={isbnLines} /> : "None"}</p>
                    <h6>Call Number</h6>
                    <p id="result-page-call-number">
                        <Lines items={callNumberLines(book)} />
                    </p>
                    <h6>Availability</h6>
                    <p id="result-page-availability">{availabilityText(book, availability)}</p>
                    <h6>Publication Info</h6>
                    <p id="result-page-publisher">{publishers.length > 0 ? publishers.join(", ") : "None"}</p>
                    <p id="result-page-publish-date">{publishDateText(book.publishDate)}</p>
                    <h6>Actions</h6>
                    <div id="result-page-actions-container">
                        <div
                            id="result-page-link"
                            tabIndex={0}
                            role="button"
                            onClick={copyLink}
                            onKeyDown={onEnter(copyLink)}
                        >
                            <span className="material-symbols-outlined">link</span> Copy Link
                        </div>
                        <div
                            id="result-page-print"
                            tabIndex={0}
                            role="button"
                            onClick={() => window.print()}
                            onKeyDown={onEnter(() => window.print())}
                        >
                            <span className="material-symbols-outlined">print</span> Print
                        </div>
                    </div>
                </div>

                <div id="result-page-details">
                    <p id="result-page-title">{book.title}</p>
                    {book.subtitle && <p id="result-page-subtitle">{book.subtitle}</p>}

                    <h6 id="result-page-author-header">{authors.length > 1 ? "Authors" : "Author"}</h6>
                    <p id="result-page-author">
                        {authors.length > 0 ? <Lines items={authors.map(personName)} /> : "None"}
                    </p>

                    {illustrators.length > 0 && (
                        <>
                            <h6 id="result-page-illustrator-header">
                                {illustrators.length > 1 ? "Illustrators" : "Illustrator"}
                            </h6>
                            <p id="result-page-illustrator">
                                <Lines items={illustrators.map(personName)} />
                            </p>
                        </>
                    )}

                    {book.description && (
                        <>
                            <h6 id="result-page-description-header">Description</h6>
                            <p id="result-page-description">{book.description}</p>
                        </>
                    )}

                    {subjects.length > 0 && (
                        <>
                            <h6 id="result-page-subjects-header">{subjects.length == 1 ? "Subject" : "Subjects"}</h6>
                            <p id="result-page-subjects">
                                <Lines items={subjects} />
                            </p>
                        </>
                    )}

                    <h6>Audience</h6>
                    <p id="result-page-audience">{audienceText(book)}</p>

                    <h6 id="result-page-physical-description-header">Physical Description</h6>
                    <p id="result-page-medium">{MEDIUM_NAMES[book.medium ?? ""] ?? ""}</p>
                    <p>
                        {book.numberOfPages && book.numberOfPages > 0 ? (
                            <>
                                <span id="result-page-pages">{book.numberOfPages}</span> pages
                            </>
                        ) : (
                            <span id="result-page-pages">Unnumbered</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Large cover image, like the old popup. Click anywhere or press Escape to close. */}
            {popupOpen && book.coverImageLink && (
                <div
                    className="modal-container"
                    role="dialog"
                    aria-label={"Cover of " + book.title}
                    tabIndex={0}
                    onClick={() => setPopupOpen(false)}
                    style={{ display: "block", opacity: 1, backgroundColor: "#000000c0" }}
                >
                    <img
                        id="result-page-popup-image"
                        className="modal-show"
                        src={book.coverImageLink}
                        alt={"Cover of " + book.title}
                    />
                </div>
            )}

            {/* Message box for Borrow and Copy Link. */}
            {message && (
                <div
                    role="alertdialog"
                    aria-labelledby="result-message-title"
                    onClick={() => setMessage(null)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        backgroundColor: "#000000c0",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 1000
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: "white",
                            padding: "1.5rem",
                            borderRadius: "8px",
                            maxWidth: "420px",
                            margin: "0 16px"
                        }}
                    >
                        <h3 id="result-message-title" style={{ marginTop: 0 }}>
                            {message.title}
                        </h3>
                        <p>{message.text}</p>
                        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                            <button type="button" onClick={() => setMessage(null)} autoFocus={!message.confirm}>
                                {message.confirm ? "Cancel" : "OK"}
                            </button>
                            {message.confirm && (
                                <button type="button" onClick={message.confirm.action} autoFocus>
                                    {message.confirm.label}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
