import $ from "jquery";
import { changePageTitle, goToPage, isAdminCheck } from "./ajax";
import {
    addBarcodeSpacing,
    buildBookBox,
    createOnClick,
    findURLValue,
    getBookFromBarcode as jsGetBookFromBarcode,
    openModal as jsOpenModal,
    removeURLValue,
    search,
    sendEmail as jsSendEmail,
    setURLValue as jsSetURLValue,
    softBack,
    updateBookDatabase,
    windowScroll
} from "./common";
import {
    analytics,
    auth,
    Book,
    bookDatabase,
    db,
    HistoryManager,
    historyManager,
    searchCache,
    setSearchCache as jsSetSearchCache,
    timeLastSearched
} from "./globals";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { logEvent } from "firebase/analytics";

/* ---------- Typed bridges to the JS files ----------
 * common.js and globals.js are still JavaScript. Their JSDoc comments are stricter (or looser)
 * than what the code actually does, e.g. openModal's title is really optional. These wrappers
 * give search.ts accurate types without changing the shared files.
 * Remove them once common.js and globals.js are converted to TypeScript.
 */
const openModal = jsOpenModal as unknown as (
    type: string,
    message: string,
    title?: string,
    buttonText?: string
) => () => void;
const getBookFromBarcode = jsGetBookFromBarcode as unknown as (barcodeNumber: number) => Promise<Book>;
const sendEmail = jsSendEmail as unknown as (
    to: string[],
    subject: string,
    text?: string,
    html?: string
) => Promise<void>;
const setURLValue = jsSetURLValue as unknown as (key: string, value: string | number) => void;
const setSearchCache = jsSetSearchCache as unknown as (cache: Book[] | null) => void;

/** What is stored in IndexedDB for a history entry. */
type HistoryState = { searchPageData?: SearchPageData; [key: string]: unknown };

function getHistoryState(key: unknown): Promise<HistoryState | undefined> {
    return HistoryManager.getFromIDB(key as string) as unknown as Promise<HistoryState | undefined>;
}

/** Each entry of the local book database is one Firestore "books" document holding many books. */
type BookDatabaseDoc = { books: Book[] };

/* ---------- Types ---------- */

type FilterType = "author" | "medium" | "audience" | "subject" | "type";

/** One checkbox in the filter sidebar (e.g. "Paperback", 12 books). */
interface Filter {
    value: string;
    count: number;
    checked: boolean;
    displayed: boolean;
}

type Filters = Record<FilterType, Filter[]>;

/** A person on a book (author or illustrator). */
interface Person {
    firstName: string;
    lastName: string;
}

/** What gets saved in history so the back button can restore the page. */
interface SearchPageData {
    resultsArray: Book[];
    books: Book[];
    filters: Filters | null;
    page: number;
    isBrowse: boolean;
    browseResultsArray: Book[];
    docsUsed: number[];
}

/* ---------- Page state ---------- */

let isBrowse = false;
let browseResultsArray: Book[] = [];
let filters: Filters | null = null;
let docsUsed: number[] = [];
const FILTER_TYPES: FilterType[] = ["author", "medium", "audience", "subject", "type"];
const RESULTS_PER_PAGE = 20;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function emptyFilters(): Filters {
    return { author: [], medium: [], audience: [], subject: [], type: [] };
}

/**
 * @description Sets up the search page event listeners then starts the process of displaying books.
 * @param pageQuery The page query from the URL.
 */
export function setupSearch(pageQuery: string): void {
    const queryFromURL: string = findURLValue(pageQuery, "query", true);
    isBrowse = queryFromURL == "";

    const pageValue: string = findURLValue(pageQuery, "page", true);
    const page = pageValue == "" ? 1 : parseInt(pageValue);

    // Set the search bar value to the query from the URL.
    $("#search-page-search-input").val(queryFromURL);

    docsUsed = [];
    browseResultsArray = [];
    filters = null;
    setSearchCache(null);

    goToSearchPage(page);

    // Set the tab index of the sort dropdown.
    function sortTabResize(): void {
        if (window.innerWidth > 786) {
            $("#sort-main-title").attr("tabindex", "");
        } else {
            $("#sort-main-title").attr("tabindex", "0");
            $("#sort-sidebar").removeClass("sort-open");
        }
    }

    // Change the tab index of the sort dropdown when the window is resized.
    $(window).on("resize", () => {
        sortTabResize();
    });
    sortTabResize();

    // Sort dropdown
    createOnClick($("#sort-main-title"), () => {
        if (window.innerWidth <= 786) {
            $("#sort-sidebar").toggleClass("sort-open");
        } else {
            $("#sort-sidebar").removeClass("sort-open");
        }
    });

    // Search page search bar
    $("#search-page-search-input").on("keydown", (event) => {
        if (event.key === "Enter") {
            searchPageSearch();
        }
    });
    createOnClick($("#search-page-search-button"), searchPageSearch);

    // Apply filters
    createOnClick($("#apply-filters-button"), () => {
        if (isBrowse) {
            browse(page).then(() => {
                applySearchFilters();
            });
        } else {
            applySearchFilters();
        }
    });
}

/**
 * @description Handles new searches from the search page.
 */
function searchPageSearch(): void {
    const searchQuery = String($("#search-page-search-input").val() ?? "");
    setURLValue("query", searchQuery);

    search(searchQuery).then((searchResultsArray: Book[]) => {
        setSearchCache(searchResultsArray);
        goToSearchPage();
    });
}

/**
 * @description Creates the list of randomly selected books for browse.
 * @param page The current results page.
 */
function browse(page = 1): Promise<Book[]> {
    return new Promise((resolve) => {
        changePageTitle("Browse", false);
        // Set the needed length for the browse results array.
        const length = page * RESULTS_PER_PAGE;
        const filteredLength = filterSearchResults(browseResultsArray).length;
        if (filteredLength >= length) {
            // Already long enough, just return it.
            resolve(browseResultsArray);
        }
        // Not long enough for the next two pages, so keep adding books.
        if (filteredLength <= length + 40) {
            browseNext()
                .then(() => {
                    browse(page)
                        .then((resultsArray) => resolve(resultsArray))
                        .catch((resultsArray) => resolve(resultsArray));
                })
                .catch(() => {
                    // No more books to add, so return the whole array.
                    resolve(browseResultsArray);
                });
        }
    });
}

/**
 * @description Gets the next set of books for browsing. Serves as the callback for browse() in a recursive loop.
 */
function browseNext(): Promise<Book[]> {
    return new Promise((resolve, reject) => {
        if (bookDatabase && bookDatabase.length > 0 && timeLastSearched != null) {
            // The book database was already loaded by a search, so browse from that.
            const localDatabase = bookDatabase as unknown as BookDatabaseDoc[];
            const docs = localDatabase.length;
            if (docsUsed.length == docs) {
                reject();
                return;
            }
            let rand = Math.floor(Math.random() * docs);
            while (docsUsed.includes(rand)) rand = Math.floor(Math.random() * docs);
            docsUsed.push(rand);
            if (!localDatabase[rand]) {
                console.error("books " + rand + " does not exist in the local book database");
                reject();
                return;
            }
            const books = localDatabase[rand].books;
            const values: number[] = [];
            const invalidBookIndices: number[] = [];
            while (values.length < books.length - invalidBookIndices.length) {
                const random = Math.floor(Math.random() * books.length);
                if (values.includes(random)) continue;
                if (books[random].isDeleted || books[random].isHidden) {
                    if (!invalidBookIndices.includes(random)) {
                        invalidBookIndices.push(random);
                    }
                } else {
                    values.push(random);
                    browseResultsArray.push(books[random]);
                }
            }
            resolve(browseResultsArray);
        } else {
            // No search has been performed yet, so get books from Firestore.
            getDocs(query(collection(db, "books"), where("order", ">=", 0), orderBy("order", "desc"), limit(1))).then(
                (querySnapshot) => {
                    querySnapshot.forEach((docSnap) => {
                        if (!docSnap.exists()) {
                            console.error("books document does not exist");
                            reject();
                            return;
                        }
                        const docs: number = docSnap.data().order + 1;
                        if (docsUsed.length == docs) {
                            reject();
                            return;
                        }
                        let rand = Math.floor(Math.random() * docs);
                        while (docsUsed.includes(rand)) rand = Math.floor(Math.random() * docs);
                        docsUsed.push(rand);
                        // Firestore document ids are zero-padded (e.g. "005", "012").
                        let docId = "0" + rand;
                        if (docId.length == 2) docId = "0" + docId;
                        getDoc(doc(db, "books", docId)).then((bookDocSnap) => {
                            if (!bookDocSnap.exists()) {
                                console.error("books " + docId + " does not exist");
                                reject();
                                return;
                            }
                            const data = bookDocSnap.data();
                            const values: number[] = [];
                            const invalidBookIndices: number[] = [];
                            while (values.length < data.books.length - invalidBookIndices.length) {
                                const random = Math.floor(Math.random() * data.books.length);
                                if (values.includes(random)) continue;
                                if (data.books[random].isDeleted || data.books[random].isHidden) {
                                    if (!invalidBookIndices.includes(random)) {
                                        invalidBookIndices.push(random);
                                    }
                                } else {
                                    values.push(random);
                                    browseResultsArray.push(Book.createFromObject(data.books[random]));
                                }
                            }
                            resolve(browseResultsArray);
                        });
                    });
                }
            );
        }
    });
}

/**
 * @description Handles the paginator buttons for navigating between pages.
 * @param page The page number to navigate to.
 * @param bypassHistory Whether or not to bypass the history.
 */
function goToSearchPage(page = 1, bypassHistory = false): void {
    $("#content").addClass("loading");

    // If we have the books in the history, use those.
    if (!bypassHistory && historyManager.get()?.stateData) {
        const stateDataKey = historyManager.get()?.stateData;
        getHistoryState(stateDataKey)
            .then((stateData) => {
                const searchPageData = stateData?.searchPageData;
                // Make sure the page number matches the one in the history.
                if (searchPageData && searchPageData.page == page) {
                    console.log("Using books from history", searchPageData);
                    searchPageData.resultsArray.forEach((book, index) => {
                        if (!(book instanceof Book)) {
                            searchPageData.resultsArray[index] = Book.createFromObject(book);
                        }
                    });
                    // Restore the page state from the history.
                    isBrowse = searchPageData.isBrowse;
                    browseResultsArray = searchPageData.browseResultsArray;
                    filters = searchPageData.filters;
                    docsUsed = searchPageData.docsUsed;
                    createSearchResultsPage(searchPageData.resultsArray, page);
                } else {
                    // Page number differs, so get the books from the database.
                    getNewBooksForSearch(page);
                }
            })
            .catch((error: unknown) => {
                console.error("Could not get books from history. IDB error:", error);
            });
        return;
    }

    // If we couldn't use the history, get the books from the database.
    getNewBooksForSearch(page);
}

/**
 * @description Gets new books for the search page, then calls createSearchResultsPage.
 * @param page The page number.
 */
function getNewBooksForSearch(page: number): void {
    let loadingModal: (() => void) | undefined;
    const timer = setTimeout(() => {
        loadingModal = openModal("info", "", "Loading...", "");
    }, 400);

    let searchPromise: Promise<Book[]>;
    if (isBrowse) {
        searchPromise = browse(page);
    } else if (!searchCache || searchCache.length == 0) {
        searchPromise = search(findURLValue(window.location.href, "query"));
    } else {
        searchPromise = Promise.resolve(searchCache);
    }

    searchPromise
        .then((resultsArray) => {
            createSearchResultsPage(filterSearchResults(resultsArray), page);

            if (page > 1) {
                setURLValue("page", page);
            } else {
                removeURLValue("page", true);
            }
        })
        .catch((error: unknown) => {
            openModal("error", "There was an error getting the books. Please try again later.", "Error Getting Books");
            console.error(error);
            softBack();
        })
        .finally(() => {
            clearTimeout(timer);
            if (loadingModal) {
                loadingModal();
            }
        });
}

/**
 * @description Creates a search results page. Adds the book objects, pagination, and filters to the page.
 * @param resultsArray The array of books to list on the search results page.
 * @param page The page number of the results page.
 */
function createSearchResultsPage(resultsArray: Book[], page = 1): void {
    const container = $("div#search-results-container");
    container.empty();

    // If there are no results for this page, say so.
    if (resultsArray.length == 0 || resultsArray.length <= (page - 1) * RESULTS_PER_PAGE) {
        const p = document.createElement("p");
        p.appendChild(document.createTextNode("That search returned no results. Please try again."));
        container[0]?.appendChild(p);
    }

    // Add this page's books to the container and record them for the history.
    const books: Book[] = [];
    const start = (page - 1) * RESULTS_PER_PAGE;
    const end = Math.min(page * RESULTS_PER_PAGE, resultsArray.length);
    for (let i = start; i < end; i++) {
        container[0]?.appendChild(buildBookBox(resultsArray[i], "search", i + 1));
        books.push(resultsArray[i]);
    }

    // Create the filters and paginator.
    createFilterList(resultsArray);
    createPaginator(resultsArray, page);

    const searchPageData: SearchPageData = {
        resultsArray,
        books,
        filters,
        page,
        isBrowse,
        browseResultsArray,
        docsUsed
    };

    const stateDataKey = historyManager.get().stateData;
    let lookupPromise: Promise<HistoryState | undefined>;
    if (stateDataKey) {
        lookupPromise = getHistoryState(stateDataKey).catch((error: unknown) => {
            console.error("There was an issue getting the books from the history. IDB Error:", error);
            return undefined;
        });
    } else {
        lookupPromise = Promise.resolve({});
    }

    lookupPromise.then((stateData) => {
        const data = stateData ?? {};
        data.searchPageData = searchPageData;
        // The original code passes null here; update()'s JSDoc just doesn't allow it.
        historyManager.update(null as unknown as string, undefined, data);
    });

    $("#apply-filters-button").removeAttr("disabled");
    $("#content").removeClass("loading");
}

/**
 * @description Creates the paginator for the search results page.
 * @param resultsArray The books that will appear on the page (used for length).
 * @param page The current page number.
 */
function createPaginator(resultsArray: Book[], page: number): void {
    const paginator = $("#paginator");
    paginator.empty();
    paginator.css("display", "flex");
    if (resultsArray.length <= RESULTS_PER_PAGE) {
        // Only one page, so hide the paginator.
        paginator.hide();
        return;
    }

    const goTo = (target: number) => {
        windowScroll(0, 1500);
        goToSearchPage(target);
    };

    // Previous button
    if (page > 1) {
        const prev = document.createElement("a");
        prev.classList.add("arrow");
        prev.innerHTML = "<span class='material-symbols-outlined'>navigate_before</span>";
        prev.onclick = () => goTo(page - 1);
        paginator[0].appendChild(prev);
    }

    // Page number buttons
    for (let p = page - 2; p <= page + 2; p++) {
        if (p < 1 || (p - 1) * RESULTS_PER_PAGE >= resultsArray.length) continue;
        if (p == page) {
            const span = document.createElement("span");
            span.innerHTML = "<b>" + p + "</b>";
            paginator[0].appendChild(span);
            continue;
        }
        const a = document.createElement("a");
        a.textContent = String(p);
        a.onclick = () => goTo(p);
        paginator[0].appendChild(a);
    }

    // Next button
    if (page * RESULTS_PER_PAGE < resultsArray.length) {
        const next = document.createElement("a");
        next.classList.add("arrow");
        next.innerHTML = "<span class='material-symbols-outlined'>navigate_next</span>";
        next.onclick = () => goTo(page + 1);
        paginator[0].appendChild(next);
    }
}

/**
 * @description Gets the values a book has for one filter type, as the text shown in the sidebar.
 */
function getFilterValues(book: Book, filterType: FilterType): string[] {
    switch (filterType) {
        case "author":
            return book.authors.map((author: Person) => author.lastName + ", " + author.firstName);
        case "medium":
            return [book.medium];
        case "audience":
            return book.audience.toArray();
        case "subject":
            return book.subjects;
        case "type":
            return [book.ddc == "FIC" ? "Fiction" : "Non-Fiction"];
    }
}

/**
 * @description Creates the filters object from resultsArray, then calls buildFilterList to create the HTML.
 * @param resultsArray The books listed on the search results page.
 */
function createFilterList(resultsArray: Book[]): void {
    if (!filters) {
        filters = emptyFilters();
    }
    const currentFilters = filters;

    // Remove unchecked filters and reset the count on checked ones (they get recounted below).
    FILTER_TYPES.forEach((filterType) => {
        currentFilters[filterType] = currentFilters[filterType].filter((filter) => filter.checked);
        currentFilters[filterType].forEach((filter) => {
            filter.count = 0;
            filter.displayed = false;
        });
    });

    // Recount and re-sort the filters.
    FILTER_TYPES.forEach((filterType) => {
        resultsArray.forEach((book) => {
            getFilterValues(book, filterType).forEach((filterItem) => {
                const existing = currentFilters[filterType].find((filter) => filter.value == filterItem);
                if (existing) {
                    existing.count++;
                } else {
                    currentFilters[filterType].push({ value: filterItem, count: 1, checked: false, displayed: false });
                }
            });
        });
        currentFilters[filterType].sort((a, b) => b.count - a.count);
    });

    buildFilterList();
}

/**
 * @description Creates the HTML elements for the filters.
 */
function buildFilterList(): void {
    if (!filters) return;
    const currentFilters = filters;

    FILTER_TYPES.forEach((filterType) => {
        const list = $("#sort-" + filterType + "-list");
        list.empty();
        currentFilters[filterType].forEach((filter, index) => {
            // Only display the first few filters per section.
            if (index >= 6) {
                return;
            }
            let value = filter.value;
            if (filterType == "medium") {
                if (filter.value == "paperback") value = "Paperback";
                else if (filter.value == "hardcover") value = "Hardcover";
                else if (filter.value == "av") value = "Audio/Visual";
            }
            const li = document.createElement("li");
            li.classList.add("sort-item");
            const id = (filterType + "-" + value + "-checkbox")
                .replace(/\s+/g, "-")
                .toLowerCase()
                .replace(/[,./]/g, "");
            li.innerHTML =
                '<input type="checkbox" id="' +
                id +
                '" name="' +
                filter.value +
                '">' +
                '<label for="' +
                id +
                '">' +
                value +
                "</label>" +
                '<span class="sort-frequency">' +
                filter.count +
                "</span>";
            list[0].appendChild(li);
            filter.displayed = true;
            if (filter.checked) {
                const checkbox = document.getElementById(id) as HTMLInputElement | null;
                if (checkbox) checkbox.checked = true;
            }
        });
    });
}

/**
 * @description Called by the "Apply Filters" button. Updates the filters based on which boxes are checked.
 */
function applySearchFilters(): void {
    if (!filters) return;
    const currentFilters = filters;

    $("#apply-filters-button").prop("disabled", true);
    FILTER_TYPES.forEach((filterType) => {
        // Clear all checks before looking for new ones.
        currentFilters[filterType].forEach((filter) => {
            filter.checked = false;
        });

        // Mark the filters that are checked on the page.
        $("#sort-" + filterType + "-list > li > input:checked").each((_i, e) => {
            const value = $(e).attr("name");
            const match = currentFilters[filterType].find((filter) => filter.value == value);
            if (match) match.checked = true;
        });
    });

    // With an author or subject filter, it's more efficient to search for those books.
    if (
        currentFilters.author.some((filter) => filter.checked) ||
        currentFilters.subject.some((filter) => filter.checked)
    ) {
        updateBookDatabase().then(() => {
            goToSearchPage(1, true);
        });
    } else {
        goToSearchPage(1, true);
    }
}

/**
 * @description Removes books that don't match the checked filters.
 * @param resultsArray The array of books to filter.
 * @returns The filtered array of books.
 */
function filterSearchResults(resultsArray: Book[]): Book[] {
    if (!filters) {
        return resultsArray;
    }
    const currentFilters = filters;
    const results: Book[] = [];

    for (const currentBook of resultsArray) {
        let passesAllFilters = true;
        FILTER_TYPES.forEach((filterType) => {
            let passesFilter = false;
            const bookValues = getFilterValues(currentBook, filterType).map((v) => v.toUpperCase());
            for (let j = 0; j < currentFilters[filterType].length && passesAllFilters; j++) {
                const filter = currentFilters[filterType][j];
                if (!filter.checked) {
                    continue;
                }
                if (bookValues.includes(filter.value.toUpperCase())) {
                    passesFilter = true;
                }
                if (!passesFilter) {
                    passesAllFilters = false;
                }
            }
        });
        if (passesAllFilters) {
            results.push(currentBook);
        }
    }
    return results;
}

/**
 * @description Sets up the individual result page and starts getting the book's information.
 * @param pageQuery The query string from the URL.
 */
export function setupResultPage(pageQuery: string): void {
    const barcodeNumber = parseInt(findURLValue(pageQuery, "id"));
    if (!barcodeNumber) {
        openModal("error", "A valid barcode was not provided.");
        goToPage("");
        return;
    }

    fillResultPage(barcodeNumber);

    // Event listeners
    createOnClick($("#result-page-back-button"), softBack);
    createOnClick($(".result-page-image"), displayResultPageImagePopup, barcodeNumber);

    createOnClick($("#result-page-email"), () => {
        const loadingModal = openModal("info", "Sending email... Please wait...", "Sending Email", "");
        resultPageEmail(barcodeNumber)
            .then(() => {
                openModal(
                    "success",
                    "An email containing this book's information has been sent to the email address on file. Please check your inbox.",
                    "Email Sent!"
                );
            })
            .catch((error: unknown) => {
                console.error(error);
                openModal(
                    "error",
                    "An error occured while sending the email. Please try again later.\n\nIf the problem persists, contact us at library@southchurch.com for assistance.",
                    "Error Sending Email"
                );
            })
            .finally(() => {
                loadingModal();
            });
    });

    createOnClick($("#result-page-link"), () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            const closeModal = openModal("success", "The link has been copied to your clipboard.", "Link Copied", "");
            window.setTimeout(() => {
                closeModal();
            }, 1200);
        });
    });

    createOnClick($("#result-page-print"), window.print);

    if (auth.currentUser) {
        $("#result-page-email").css("display", "block");
    }

    isAdminCheck().then((isAdmin: boolean) => {
        if (isAdmin) {
            $("#result-page-edit").css("display", "block");
            createOnClick($("#result-page-edit"), goToPage, "admin/editEntry?new=false&id=" + barcodeNumber);
        }
    });
}

/**
 * @description Creates and displays a popup with a higher resolution version of the book image.
 * @param barcodeNumber The barcode number of the book.
 */
function displayResultPageImagePopup(barcodeNumber: number): void {
    // Container
    const imgContainer = document.createElement("div");
    imgContainer.classList.add("modal-container");
    imgContainer.style.backgroundColor = "#000000c0";
    imgContainer.tabIndex = 0;
    // Image
    const img = document.createElement("img");
    img.id = "result-page-popup-image";
    imgContainer.appendChild(img);
    // Get the link from the database and display it.
    getBookFromBarcode(barcodeNumber).then((bookObject: Book) => {
        if (!bookObject.coverImageLink) {
            return;
        }
        img.src = bookObject.coverImageLink;
        img.onload = () => {
            imgContainer.style.display = "block";
            imgContainer.style.opacity = "1";
            img.classList.add("modal-show");
        };
        $("#content")[0].appendChild(imgContainer);

        // Keep focus on the popup so the user can close it with the Enter key.
        $(".result-page-image").trigger("blur");
        const focusInterval = setInterval(() => {
            $(".modal-container").trigger("focus");
        }, 100);

        // Close the popup on click.
        createOnClick($(imgContainer), () => {
            clearInterval(focusInterval);
            imgContainer.style.opacity = "0";
            img.classList.remove("modal-show");
            img.classList.add("modal-hide");
            setTimeout(() => {
                $(".modal-container").remove();
            }, 500);
        });
    });
}

/**
 * @description Formats a publish date the same way the old page did.
 */
function formatPublishDate(d: Date): string {
    if (d.getMonth() != 0 && d.getDate() != 1) {
        return d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear();
    } else if (d.getMonth() != 0) {
        return MONTHS[d.getMonth()] + ", " + d.getFullYear();
    }
    return String(d.getFullYear());
}

/**
 * @description Formats a list of people as "Last, First" lines.
 */
function formatPeople(people: Person[], separator: string): string {
    return people.map((person) => person.lastName + ", " + person.firstName).join(separator);
}

/**
 * @description Fills the result page with the book's information.
 * @param barcodeNumber The barcode number of the book.
 */
function fillResultPage(barcodeNumber: number): void {
    getBookFromBarcode(barcodeNumber)
        .then((bookObject: Book | null | undefined) => {
            if (!bookObject || bookObject.isDeleted || bookObject.isHidden) {
                openModal("error", "No information could be found for that book.");
                softBack();
                return;
            }
            changePageTitle(bookObject.title);

            // Image
            const image = $(".result-page-image");
            if (bookObject.medium == "av") {
                image.attr("src", "/img/av-image.png");
                image.removeAttr("tabindex");
                image.css("cursor", "default");
            } else {
                image.attr("tabindex", "0");
                image.css("cursor", "pointer");
                // Icons are skipped because they are too low quality.
                if (bookObject.thumbnailImageLink && bookObject.thumbnailImageLink.indexOf("http") != -1) {
                    image.attr("src", bookObject.thumbnailImageLink);
                } else if (bookObject.coverImageLink && bookObject.coverImageLink.indexOf("http") != -1) {
                    console.warn("No thumbnail image found for " + bookObject.barcodeNumber + ".", bookObject);
                    image.attr("src", bookObject.coverImageLink);
                } else {
                    console.error("No images found for " + bookObject.barcodeNumber + ".", bookObject);
                    image.attr("src", "/img/default-book.png");
                    image.removeAttr("tabindex");
                    image.css("cursor", "default");
                }
            }

            $("#result-page-barcode-number").html(String(addBarcodeSpacing(barcodeNumber)));

            // Checkout button
            if (!bookObject.canBeCheckedOut) {
                $("#checkout-button").addClass("disabled");
                createOnClick($("#checkout-button"), () => {
                    openModal(
                        "info",
                        "This book is a reference book and cannot be checked out. Please visit the library in person to use this book.",
                        "Reference Book"
                    );
                });
            } else {
                $("#checkout-button").show();
                createOnClick($("#checkout-button"), checkout, barcodeNumber);
            }

            // ISBN
            if (bookObject.isbn10 == "" && bookObject.isbn13 == "") {
                $("#result-page-isbn-number").html("None");
            } else {
                $("#result-page-isbn-number").html(
                    "ISBN 10: " + bookObject.isbn10 + "<br>ISBN 13: " + bookObject.isbn13
                );
            }

            // Call number
            let callNumberAnswer = "";
            if (bookObject.audience.children == true) {
                callNumberAnswer += "J";
            } else if (bookObject.audience.youth == true) {
                callNumberAnswer += "Y";
            } else if (bookObject.canBeCheckedOut == false) {
                callNumberAnswer += "REF<br>";
            }
            callNumberAnswer += bookObject.ddc;
            // TODO: Make sure that items with no author are not stored as empty person objects so this works.
            if (bookObject.authors.length != 0) {
                callNumberAnswer += "<br>" + bookObject.authors[0].lastName.toUpperCase().substring(0, 3);
            } else {
                callNumberAnswer += "<br>" + bookObject.title.toUpperCase().substring(0, 3);
            }
            $("#result-page-call-number").html(callNumberAnswer);

            // Medium
            let mediumAnswer = "";
            if (bookObject.medium == "paperback") {
                mediumAnswer = "Paperback";
            } else if (bookObject.medium == "hardcover") {
                mediumAnswer = "Hardcover";
            } else if (bookObject.medium == "av") {
                mediumAnswer = "AV";
            } else {
                console.warn("There is a case that is not covered for: " + bookObject.medium);
            }
            $("#result-page-medium").html(mediumAnswer);

            // Audience
            const audienceParts: string[] = [];
            if (bookObject.audience.children == true) audienceParts.push("Children");
            if (bookObject.audience.youth == true) audienceParts.push("Youth");
            if (bookObject.audience.adult == true) audienceParts.push("Adult");
            const audienceAnswer = bookObject.audience.isNone() == true ? "None" : audienceParts.join(", ");
            $("#result-page-audience").html(audienceAnswer);

            // Publishers
            const publishersAnswer = bookObject.publishers.join(", ");
            $("#result-page-publisher").html(publishersAnswer == "" ? "None" : publishersAnswer);

            // Publish date
            $("#result-page-publish-date").html(
                bookObject.publishDate ? formatPublishDate(bookObject.publishDate) : "None"
            );

            // Pages
            $("#result-page-pages").html(
                bookObject.numberOfPages > 0 ? String(bookObject.numberOfPages) : "Unnumbered"
            );

            // Title and subtitle
            $("#result-page-title").html(bookObject.title);
            $("#result-page-subtitle").html(bookObject.subtitle ?? "");
            if (bookObject.subtitle == null || bookObject.subtitle.length < 1) {
                $("#result-page-subtitle-header").hide();
                $("#result-page-subtitle").hide();
            }

            // Authors
            if (bookObject.authors.length > 1) {
                $("#result-page-author-header").html("Authors");
                $("#result-page-author").html(formatPeople(bookObject.authors, "<br>") + "<br>");
            } else if (
                bookObject.authors.length == 0 ||
                (bookObject.authors[0].firstName == "" && bookObject.authors[0].lastName == "")
            ) {
                $("#result-page-author").html("None");
            } else {
                $("#result-page-author").html(formatPeople(bookObject.authors, ""));
            }

            // Illustrators
            if (bookObject.illustrators.length > 0) {
                $("#result-page-illustrator").html(formatPeople(bookObject.illustrators, "<br>") + "<br>");
                if (bookObject.illustrators.length > 1) {
                    $("#result-page-illustrator-header").html("Illustrators");
                }
            } else {
                $("#result-page-illustrator-header").hide();
                $("#result-page-illustrator").hide();
            }

            // Subjects
            if (bookObject.subjects.length == 0) {
                $("#result-page-subjects").hide();
                $("#result-page-subjects-header").hide();
            } else if (bookObject.subjects.length == 1) {
                $("#result-page-subjects-header").html("Subject");
            }
            $("#result-page-subjects").html(bookObject.subjects.join("<br>"));
            $("#result-page-description").html(bookObject.description);

            // Fade in the result container
            $("#result-page-container").css("opacity", "1");

            logEvent(analytics, "select_content", {
                content_type: "book_result",
                item_id: String(barcodeNumber)
            });
        })
        .catch((error: unknown) => {
            softBack();
            openModal("error", "No information could be found for that book.\n" + error);
        });
}

/**
 * @description Sends an email to the user with the book's information.
 * @param barcodeNumber The barcode number of the book.
 * @returns A promise that resolves when the email has been sent.
 */
function resultPageEmail(barcodeNumber: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const email = auth.currentUser?.email;
        if (!email) {
            reject(new Error("You must be logged in to email book information."));
            return;
        }

        getBookFromBarcode(barcodeNumber)
            .then((book: Book) => {
                let message =
                    "<p style='white-space:pre-wrap'>Hello,\n\nHere is the information you requested about the book with barcode " +
                    book.barcodeNumber +
                    ":</p>";
                message +=
                    "<img src='" +
                    book.coverImageLink +
                    "' alt='Cover Image' style='width: 100%; max-width: 300px; height: auto;'>";
                message += "<br><p style='white-space:pre-wrap'><b>Title:</b> " + book.title + "\n";
                if (book.subtitle) {
                    message += "<b>Subtitle:</b> " + book.subtitle + "\n";
                }
                if (book.authors.length > 0) {
                    message += "<b>Author(s):</b> " + formatPeople(book.authors, "; ") + "\n";
                }
                if (book.illustrators.length > 0) {
                    message += "<b>Illustrator(s):</b> " + formatPeople(book.illustrators, "; ") + "\n\n";
                }
                if (book.subjects.length > 0) {
                    message += "<b>Subject(s):</b> " + book.subjects.join("; ") + "\n";
                }
                if (book.description) {
                    message += "<b>Description:</b> " + book.description + "\n\n";
                }
                if (book.publishers.length > 0) {
                    message += "<b>Publisher(s):</b> " + book.publishers.join("; ") + "\n";
                }
                if (book.publishDate) {
                    const d: Date = book.publishDate;
                    message +=
                        "<b>Publish Date:</b> " + (d.getMonth() + 1) + "/" + d.getDate() + "/" + d.getFullYear() + "\n";
                }
                if (book.isbn10) {
                    message += "<b>ISBN-10:</b> " + book.isbn10 + "\n";
                }
                if (book.isbn13) {
                    message += "<b>ISBN-13:</b> " + book.isbn13 + "\n";
                }
                message += "<b>Audience:</b> " + book.audience.toString() + "\n";
                message += "<b>Medium:</b> " + book.medium + "\n";
                message += "<b>Number of Pages:</b> " + book.numberOfPages + "\n";
                message += "<b>Dewey Decimal Classification:</b> " + book.ddc + "\n\n";
                message +=
                    "Thank you for using the South Church Library Catalog!\n\nSincerely,\nYour South Church Library Team</p>";

                const subject = "Book Information for " + book.title;
                sendEmail([email], subject, undefined, message)
                    .then(() => resolve())
                    .catch((error: unknown) => reject(error));
            })
            .catch((error: unknown) => {
                openModal(
                    "error",
                    "There was an error sending an email. Please contact us at library@southchurch.com for assistance.\n" +
                        error
                );
                reject(error);
            });
    });
}

/**
 * @description Starts a checkout when the user clicks the checkout button on the result page.
 * @param barcodeNumber The barcode number of the book to be checked out.
 */
function checkout(barcodeNumber: number): void {
    if (isNaN(barcodeNumber) || barcodeNumber.toString().indexOf("11711") < 0) {
        openModal("error", "There was an error checking out this book.");
        console.log("The barcode number could not be identified.");
        return;
    }
    openModal(
        "info",
        "Checking out books is not yet supported online. Please visit the library in person to check out a book."
    );
}

console.log("search.ts has Loaded!");
