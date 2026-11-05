import "../css/search.css";
import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import { useSearchParams } from "react-router";
import { collection, getDocs } from "firebase/firestore";
import { firestore } from "../firebase";
import defaultBookImage from "../img/default-book.png";
import avImage from "../img/av-image.png";

/* ---Types----*/

interface Person {
    firstName: string;
    lastName: string;
}

/** The fields of a book this page uses. Each Firestore "books" document holds a list of these. */
interface BookSummary {
    barcodeNumber: number;
    title: string;
    subtitle?: string;
    authors?: Person[];
    subjects?: string[];
    description?: string;
    isbn10?: string;
    isbn13?: string;
    iconImageLink?: string;
    thumbnailImageLink?: string;
    coverImageLink?: string;
    medium?: string;
    audience?: { children?: boolean; youth?: boolean; adult?: boolean };
    ddc?: string;
    isDeleted?: boolean;
    isHidden?: boolean;
}

type FilterType = "author" | "medium" | "audience" | "subject" | "type";

interface FilterOption {
    value: string;
    count: number;
}

/** Checked filters, e.g. { medium: ["paperback"], audience: ["Adult"] }. */
type SelectedFilters = Record<FilterType, string[]>;

/* ---------- Constants ---------- */

const RESULTS_PER_PAGE = 20;
const FILTERS_SHOWN_PER_SECTION = 6;
const MOBILE_WIDTH = 786;
const FILTER_TYPES: FilterType[] = ["author", "medium", "audience", "subject", "type"];
const FILTER_TITLES: Record<FilterType, string> = {
    author: "Author",
    medium: "Medium",
    audience: "Audience",
    subject: "Subject",
    type: "Type"
};
const MEDIUM_NAMES: Record<string, string> = {
    paperback: "Paperback",
    hardcover: "Hardcover",
    av: "Audio/Visual"
};

function emptyFilters(): SelectedFilters {
    return { author: [], medium: [], audience: [], subject: [], type: [] };
}

/* ---------- Book helpers (same output as the old buildBookBox) ---------- */

function bookImage(book: BookSummary): string {
    if (book.iconImageLink) return book.iconImageLink;
    if (book.thumbnailImageLink) return book.thumbnailImageLink;
    if (book.coverImageLink) return book.coverImageLink;
    return book.medium == "av" ? avImage : defaultBookImage;
}

function personName(person: Person): string {
    return person.lastName + ", " + person.firstName;
}

/** Authors joined with " & ", e.g. "Keppel, Nancy Peeler & Stokes, Jeanette". */
function authorString(book: BookSummary): string {
    return (book.authors ?? [])
        .filter((a) => a.firstName || a.lastName)
        .map(personName)
        .join(" & ");
}

function audienceList(book: BookSummary): string[] {
    const list: string[] = [];
    if (book.audience?.children) list.push("Children");
    if (book.audience?.youth) list.push("Youth");
    if (book.audience?.adult) list.push("Adult");
    return list;
}

function bookType(book: BookSummary): string {
    return book.ddc == "FIC" ? "Fiction" : "Non-Fiction";
}

/** Same rule as the old shortenDescription: cut at the first sentence end after 300 characters. */
function shortenDescription(desc: string): string {
    const MIN_LEN = 300;
    const cutoff = desc.slice(MIN_LEN).search(/\.\s/);
    if (cutoff == -1) return desc;
    return desc.substring(0, cutoff + MIN_LEN) + ". ...";
}

/** The values a book has for one filter type. */
function filterValues(book: BookSummary, type: FilterType): string[] {
    switch (type) {
        case "author":
            return (book.authors ?? []).filter((a) => a.firstName || a.lastName).map(personName);
        case "medium":
            return book.medium ? [book.medium] : [];
        case "audience":
            return audienceList(book);
        case "subject":
            return book.subjects ?? [];
        case "type":
            return [bookType(book)];
    }
}

function filterLabel(type: FilterType, value: string): string {
    return type == "medium" ? (MEDIUM_NAMES[value] ?? value) : value;
}

/* ---------- Search helpers ---------- */

/**
 * How well a book matches the search, or 0 if it doesn't.
 * Every word must appear somewhere; title matches rank highest, then authors, then subjects.
 */
function searchScore(book: BookSummary, words: string[]): number {
    const title = [book.title, book.subtitle].filter(Boolean).join(" ").toLowerCase();
    const authors = authorString(book).toLowerCase();
    const subjects = (book.subjects ?? []).join(" ").toLowerCase();
    const other = [book.isbn10, book.isbn13, String(book.barcodeNumber), book.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    let score = 0;
    for (const word of words) {
        if (title.includes(word)) score += 3;
        else if (authors.includes(word)) score += 2;
        else if (subjects.includes(word)) score += 1;
        else if (other.includes(word)) score += 0.5;
        else return 0; // a word that appears nowhere means no match
    }
    return score;
}

/** Fisher–Yates shuffle, so Browse shows books in a random order like the old site. */
function shuffled<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

/** A book passes when, for every filter type with checked boxes, it has at least one checked value. */
function passesFilters(book: BookSummary, filters: SelectedFilters): boolean {
    return FILTER_TYPES.every((type) => {
        const selected = filters[type];
        if (selected.length == 0) return true;
        const values = filterValues(book, type).map((v) => v.toUpperCase());
        return selected.some((s) => values.includes(s.toUpperCase()));
    });
}

/** Counts each filter value across the results, most common first. Checked values always stay listed. */
function buildFilterOptions(books: BookSummary[], selected: SelectedFilters): Record<FilterType, FilterOption[]> {
    const options = {} as Record<FilterType, FilterOption[]>;
    for (const type of FILTER_TYPES) {
        const counts = new Map<string, number>();
        for (const book of books) {
            for (const value of filterValues(book, type)) {
                counts.set(value, (counts.get(value) ?? 0) + 1);
            }
        }
        const sorted = [...counts.entries()]
            .map(([value, count]) => ({ value, count }))
            .sort((a, b) => b.count - a.count);
        const shown = sorted.slice(0, FILTERS_SHOWN_PER_SECTION);
        for (const value of selected[type]) {
            if (!shown.some((o) => o.value == value)) {
                shown.push({ value, count: counts.get(value) ?? 0 });
            }
        }
        options[type] = shown;
    }
    return options;
}

function checkboxId(type: FilterType, value: string): string {
    return (type + "-" + filterLabel(type, value) + "-checkbox")
        .replace(/\s+/g, "-")
        .toLowerCase()
        .replace(/[,./&]/g, "");
}

/* ---------- Page ---------- */

export default function Search() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = (searchParams.get("query") ?? "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1") || 1);

    const [allBooks, setAllBooks] = useState<BookSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sortOpen, setSortOpen] = useState(false);

    // Boxes ticked in the sidebar, and the filters actually in use (set by "Apply Filters").
    const [checked, setChecked] = useState<SelectedFilters>(emptyFilters);
    const [applied, setApplied] = useState<SelectedFilters>(emptyFilters);

    // Load every book once, in a random order for Browse.
    useEffect(() => {
        getDocs(collection(firestore, "books"))
            .then((snapshot) => {
                // Each document holds an array of books, so flatten them into one list.
                const books = snapshot.docs.flatMap((d) => (d.data().books ?? []) as BookSummary[]);
                // Skip books that were deleted or hidden by an admin.
                setAllBooks(shuffled(books.filter((b) => !b.isDeleted && !b.isHidden)));
            })
            .catch((err) => {
                console.error("Error loading books:", err);
                setError("There was an error getting the books. Please try again later.");
            })
            .finally(() => setLoading(false));
    }, []);

    // A new search starts with no filters.
    useEffect(() => {
        setChecked(emptyFilters());
        setApplied(emptyFilters());
    }, [query]);

    // Books matching the search (best matches first), or every book when browsing.
    const searchResults = useMemo(() => {
        const words = query.toLowerCase().split(/\s+/).filter(Boolean);
        if (words.length == 0) return allBooks;
        return allBooks
            .map((book) => ({ book, score: searchScore(book, words) }))
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .map((r) => r.book);
    }, [allBooks, query]);

    const results = useMemo(
        () => searchResults.filter((book) => passesFilters(book, applied)),
        [searchResults, applied]
    );

    const filterOptions = useMemo(() => buildFilterOptions(results, checked), [results, checked]);

    const totalPages = Math.max(1, Math.ceil(results.length / RESULTS_PER_PAGE));
    const currentPage = Math.min(page, totalPages);
    const firstIndex = (currentPage - 1) * RESULTS_PER_PAGE;
    const pageResults = results.slice(firstIndex, firstIndex + RESULTS_PER_PAGE);

    function goToPage(newPage: number) {
        const params: Record<string, string> = {};
        if (query) params.query = query;
        if (newPage > 1) params.page = String(newPage);
        setSearchParams(params);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function toggleFilter(type: FilterType, value: string) {
        setChecked((prev) => {
            const current = prev[type];
            const next = current.includes(value) ? current.filter((v) => v != value) : [...current, value];
            return { ...prev, [type]: next };
        });
    }

    function applyFilters() {
        setApplied(checked);
        if (currentPage > 1) goToPage(1);
    }

    function toggleSortSidebar() {
        // On small screens the filter list folds open and closed, like the old site.
        if (window.innerWidth <= MOBILE_WIDTH) setSortOpen((open) => !open);
    }

    function showImage(event: SyntheticEvent<HTMLImageElement>) {
        const listing = event.currentTarget.closest<HTMLElement>(".result-listing");
        if (listing) listing.style.opacity = "1";
    }

    function imageFailed(event: SyntheticEvent<HTMLImageElement>) {
        const img = event.currentTarget;
        img.onerror = null;
        img.src = defaultBookImage;
    }

    function renderResults() {
        if (loading) return <p>Loading...</p>;
        if (error) return <p>{error}</p>;
        if (pageResults.length == 0) return <p>That search returned no results. Please try again.</p>;

        return pageResults.map((book, i) => {
            const num = firstIndex + i + 1;
            const authors = authorString(book);
            const audience = audienceList(book).join(", ");
            const subjects = (book.subjects ?? []).join("; ");
            return (
                <a key={book.barcodeNumber} href={"/result?id=" + book.barcodeNumber}>
                    <div className="result-listing" id={"result-number-" + num}>
                        <div className="result-number">{num}.</div>
                        <div>
                            <img
                                className="bookimage"
                                src={bookImage(book)}
                                alt={"Cover of " + book.title}
                                onLoad={showImage}
                                onError={imageFailed}
                            />
                        </div>
                        <div className="basic-info">
                            <b>
                                <p className="title">{book.title}</p>
                            </b>
                            <p className="author">{authors}</p>
                            <p className="medium">{MEDIUM_NAMES[book.medium ?? ""] ?? ""}</p>
                            <p className="audience">{audience}</p>
                        </div>
                        <div className="advanced-info">
                            <p className="subjects">Subjects: {subjects}</p>
                            <p className="description">{shortenDescription(book.description ?? "")}</p>
                        </div>
                    </div>
                </a>
            );
        });
    }

    function renderPaginator() {
        if (results.length <= RESULTS_PER_PAGE) return null;
        const pages: number[] = [];
        for (let p = currentPage - 2; p <= currentPage + 2; p++) {
            if (p >= 1 && p <= totalPages) pages.push(p);
        }
        return (
            <div id="paginator" style={{ display: "flex" }}>
                {currentPage > 1 && (
                    <a
                        className="arrow"
                        role="button"
                        tabIndex={0}
                        aria-label="Previous page"
                        onClick={() => goToPage(currentPage - 1)}
                    >
                        <span className="material-symbols-outlined">navigate_before</span>
                    </a>
                )}
                {pages.map((p) =>
                    p == currentPage ? (
                        <span key={p}>
                            <b>{p}</b>
                        </span>
                    ) : (
                        <a key={p} role="button" tabIndex={0} onClick={() => goToPage(p)}>
                            {p}
                        </a>
                    )
                )}
                {currentPage < totalPages && (
                    <a
                        className="arrow"
                        role="button"
                        tabIndex={0}
                        aria-label="Next page"
                        onClick={() => goToPage(currentPage + 1)}
                    >
                        <span className="material-symbols-outlined">navigate_next</span>
                    </a>
                )}
            </div>
        );
    }

    return (
        <main id="content">
            <div id="search-page-content">
                <div id="sort-sidebar" className={sortOpen ? "sort-open" : undefined}>
                    <h3
                        id="sort-main-title"
                        tabIndex={0}
                        onClick={toggleSortSidebar}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") toggleSortSidebar();
                        }}
                    >
                        Filter Search Results
                    </h3>
                    <button id="apply-filters-button" type="button" onClick={applyFilters} disabled={loading}>
                        Apply Filters
                    </button>
                    {FILTER_TYPES.map((type) => (
                        <div className="sort-section" key={type}>
                            <h6 className="sort-title">{FILTER_TITLES[type]}</h6>
                            <ul className="sort-list" id={"sort-" + type + "-list"}>
                                {filterOptions[type].map((option) => {
                                    const id = checkboxId(type, option.value);
                                    return (
                                        <li className="sort-item" key={option.value}>
                                            <input
                                                type="checkbox"
                                                id={id}
                                                name={option.value}
                                                checked={checked[type].includes(option.value)}
                                                onChange={() => toggleFilter(type, option.value)}
                                            />
                                            <label htmlFor={id}>{filterLabel(type, option.value)}</label>
                                            <span className="sort-frequency">{option.count}</span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </div>

                <div id="results-container">
                    <div id="search-results-container">{renderResults()}</div>
                    {renderPaginator()}
                </div>
            </div>
        </main>
    );
}
