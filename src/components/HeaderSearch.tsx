import { useRef, type KeyboardEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface HeaderSearchProps {
    className?: string;
}

/**
 * Header search bar located inside the top navigation header.
 */
export default function HeaderSearch({ className = "" }: HeaderSearchProps) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const currentQuery = searchParams.get("query") ?? "";
    const inputRef = useRef<HTMLInputElement>(null);

    function runSearch() {
        const query = inputRef.current?.value.trim() ?? "";
        navigate(query ? `/search?query=${encodeURIComponent(query)}` : "/search");
    }

    function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Enter") {
            e.preventDefault();
            runSearch();
        }
    }

    return (
        <div
            id="header-search-container"
            className={`search-container ${className}`.trim()}
            role="search"
            aria-label="Header catalog search"
        >
            <input
                key={currentQuery}
                ref={inputRef}
                id="header-search-input"
                className="search-input"
                type="search"
                placeholder="Search by title, author, subject, keyword..."
                aria-label="Search books"
                defaultValue={currentQuery}
                onKeyDown={handleKeyDown}
            />
            <button
                id="header-search-button"
                className="material-symbols-outlined search-button"
                type="button"
                aria-label="Search"
                onClick={runSearch}
            >
                search
            </button>
        </div>
    );
}
