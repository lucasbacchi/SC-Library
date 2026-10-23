import { isAdminCheck } from "./ajax";
import {
    addBarcodeSpacing,
    buildBookBox,
    createOnClick,
    findURLValue,
    getBookFromBarcode,
    openModal,
    removeURLValue,
    search,
    sendEmail,
    setURLValue,
    updateBookDatabase,
    windowScroll
} from "./common";
import {
    analytics,
    auth,
    Book,
    bookDatabase,
    db,
    Person,
    searchCache,
    setSearchCache,
    timeLastSearched
} from "./globals";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { logEvent } from "firebase/analytics";

let isBrowse: boolean;
let browseResultsArray: Book[];
interface SearchFilter {
    value: string;
    count: number;
    checked: boolean;
    displayed: boolean;
}
let filters: Record<string, SearchFilter[]> = {};
let docsUsed: number[];
const FILTER_TYPES = ["author", "medium", "audience", "subject", "type"];

/**
 * @description Sets up the search page event listeners then starts the process of displaying books.
 * @param {String} pageQuery The page query from the URL.
 */
export function setupSearch(pageQuery: string) {
    const queryFromURL = findURLValue(pageQuery, "query", true);
    if (queryFromURL == "") {
        isBrowse = true;
    } else {
        isBrowse = false;
    }

    let page: string | number = findURLValue(pageQuery, "page", true);
    if (page == "") {
        page = 1;
    } else {
        page = parseInt(page);
    }

    // Set the search bar value to the query from the URL.
    (document.getElementById("search-page-search-input") as HTMLInputElement).value = queryFromURL;

    docsUsed = [];
    browseResultsArray = [];
    filters = {};
    setSearchCache(null);

    goToSearchPage(page);

    // Set the tab index of the sort dropdown.
    function sortTabResize() {
        if (window.innerWidth > 786) {
            document.getElementById("sort-main-title")?.setAttribute("tabindex", String(""));
        } else {
            document.getElementById("sort-main-title")?.setAttribute("tabindex", String("0"));
            document.getElementById("sort-sidebar")?.classList.remove("sort-open");
        }
    }

    // Create an event listener to change the tab index of the sort dropdown when the window is resized.
    window?.addEventListener("resize", () => {
        sortTabResize();
    });
    sortTabResize();

    // Create Sort Dropdown Event Listener
    createOnClick(document.getElementById("sort-main-title")! as HTMLInputElement, () => {
        if (window.innerWidth <= 786) {
            document.getElementById("sort-sidebar")?.classList.toggle("sort-open");
        } else {
            document.getElementById("sort-sidebar")?.classList.remove("sort-open");
        }
    });

    // Setup Search Page Search Bar Event Listeners
    document.getElementById("search-page-search-input")?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            searchPageSearch();
        }
    });
    createOnClick(document.getElementById("search-page-search-button")! as HTMLButtonElement, searchPageSearch);

    // Apply Filters Event Listener
    createOnClick(document.getElementById("apply-filters-button")! as HTMLButtonElement, () => {
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
function searchPageSearch() {
    const searchQuery = (document.getElementById("search-page-search-input") as HTMLInputElement).value;
    setURLValue("query", searchQuery);

    search(searchQuery).then((searchResultsArray) => {
        setSearchCache(searchResultsArray);
        goToSearchPage();
    });
}

/**
 * @description Creates the list randomly selected books for browse.
 * @param {Number} page The current results page.
 */
function browse(page = 1) {
    return new Promise<Book[]>((resolve) => {
        // changePageTitle("Browse", false);
        // Set the needed length for the browse results array.
        const length = page * 20;
        // If the browse results array is already long enough, just return it.
        const filteredLength = filterSearchResults(browseResultsArray).length;
        if (filteredLength >= length) {
            // If the browse results array is already long enough, just return it.
            resolve(browseResultsArray);
        }
        // If the browse results array is not long enough for the next two pages, start adding more books to it.
        if (filteredLength <= length + 40) {
            // If the browse results array is not long enough, add more books to it.
            browseNext()
                .then(() => {
                    browse(page)
                        .then((resultsArray) => {
                            resolve(resultsArray);
                        })
                        .catch((resultsArray) => {
                            resolve(resultsArray);
                        });
                })
                .catch(() => {
                    // If there are no more books to add, just return the whole array.
                    resolve(browseResultsArray);
                });
        }
    });
}

/**
 * @description Gets the next set of books for browsing. Serves as the callback for the browse function in a recursive loop.
 * @returns {Promise<Array<Book>>} A promise that resolves with the next set of books for browsing.
 */
function browseNext() {
    return new Promise<Book[]>((resolve, reject) => {
        if (bookDatabase && bookDatabase.length > 0 && timeLastSearched != null) {
            // At this point, we can assume that the book database has been loaded from a search, so just use that for browsing.
            const docs = bookDatabase.length;
            if (docsUsed.length == docs) {
                reject();
                return;
            }
            let rand: number = Math.floor(Math.random() * docs);
            while (docsUsed.includes(rand)) rand = Math.floor(Math.random() * docs);
            docsUsed.push(rand);
            if (!bookDatabase[rand]) {
                console.error("books " + rand + " does not exist in the local book database");
                reject();
                return;
            }
            const values = [],
                invalidBookIndices = [] as number[];
            while (values.length < bookDatabase[rand].books.length - invalidBookIndices.length) {
                const random = Math.floor(Math.random() * bookDatabase[rand].books.length);
                if (values.indexOf(random) > -1) continue;
                if (bookDatabase[rand].books[random].isDeleted || bookDatabase[rand].books[random].isHidden) {
                    if (!invalidBookIndices.includes(random)) {
                        invalidBookIndices.push(random);
                    }
                } else {
                    values.push(random);
                    browseResultsArray.push(bookDatabase[rand].books[random]);
                }
            }
            resolve(browseResultsArray);
        } else {
            // No search has been performed on the page yet, so get it from the database.
            getDocs(query(collection(db, "books"), where("order", ">=", 0), orderBy("order", "desc"), limit(1))).then(
                (querySnapshot) => {
                    querySnapshot.forEach((docSnap) => {
                        if (!docSnap.exists()) {
                            console.error("books document does not exist");
                            reject();
                            return;
                        }
                        const docs = docSnap.data().order + 1;
                        if (docsUsed.length == docs) {
                            reject();
                            return;
                        }
                        let rand: number | string = Math.floor(Math.random() * docs);
                        while (docsUsed.includes(rand)) rand = Math.floor(Math.random() * docs);
                        docsUsed.push(rand);
                        rand = "0" + rand;
                        if (rand.length == 2) rand = "0" + rand;
                        getDoc(doc(db, "books", rand)).then((docSnap) => {
                            if (!docSnap.exists()) {
                                console.error("books " + rand + " does not exist");
                                reject();
                                return;
                            }
                            const values: number[] = [],
                                invalidBookIndices = [] as number[],
                                data = docSnap.data();
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
 * @param {Number} page The page number to navigate to.
 * @param {Boolean} bypassHistory Whether or not to bypass the history.
 */
function goToSearchPage(page = 1, bypassHistory = false) {
    document.getElementById("content")?.classList.add("loading");

    // If we have the books in the history, use those.
    // if (!bypassHistory && historyManager.get()?.stateData) {
    //     const stateDataKey = historyManager.get()?.stateData;
    //     HistoryManager.getFromIDB(stateDataKey)
    //         .then((stateData) => {
    //             const searchPageData = stateData?.searchPageData;
    //             // Check to ensure that the page number is the same as the one in the history.
    //             if (searchPageData && searchPageData.page == page) {
    //                 console.log("Using books from history", searchPageData);
    //                 searchPageData.resultsArray.forEach((book: Book, index: number) => {
    //                     if (!(book instanceof Book)) {
    //                         searchPageData.resultsArray[index] = Book.createFromObject(book);
    //                     }
    //                 });
    //                 // Set the global variables to the ones from the history.
    //                 isBrowse = searchPageData.isBrowse;
    //                 browseResultsArray = searchPageData.browseResultsArray;
    //                 filters = searchPageData.filters;
    //                 docsUsed = searchPageData.docsUsed;
    //                 createSearchResultsPage(searchPageData.resultsArray, page);
    //             } else {
    //                 // If the page number is not the same, abort and get the books from the database.
    //                 getNewBooksForSearch(page);
    //             }
    //         })
    //         .catch((error) => {
    //             console.error("Could not get books from history. IDB error:", error);
    //         });
    //     return;
    // }

    // If we couldn't use the history, get the books from the database.
    getNewBooksForSearch(page);
}

/**
 * @description Gets new books for the search page, then calls createSearchResultsPage.
 * @param {Number} page the page number.
 */
function getNewBooksForSearch(page: number) {
    // If we don't have the books in the history, get them from the database.
    let loadingModal: () => void | undefined;
    const timer = setTimeout(() => {
        loadingModal = openModal("info", "", "Loading...", "");
    }, 400);
    let searchPromise;
    if (isBrowse) {
        searchPromise = browse(page);
    } else {
        if (!searchCache || searchCache.length == 0) {
            searchPromise = search(findURLValue(window.location.href, "query"));
        } else {
            searchPromise = Promise.resolve(searchCache);
        }
    }

    searchPromise
        .then((resultsArray) => {
            // Filter the results array.
            resultsArray = filterSearchResults(resultsArray);
            createSearchResultsPage(resultsArray, page);

            if (page > 1) {
                setURLValue("page", page.toString());
            } else {
                removeURLValue("page", true);
            }
        })
        .catch((error) => {
            openModal("error", "There was an error getting the books. Please try again later.", "Error Getting Books");
            console.error(error);
            // softBack();
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
 * @param {Array<Book>} resultsArray The array of books to list on the search results page.
 * @param {Number} page The page number of the results page.
 */
function createSearchResultsPage(resultsArray: Book[], page = 1) {
    // Clear the search results container.
    (document.querySelector("div#search-results-container") as HTMLElement).innerHTML = "";
    // If the search results array is empty, display a message saying so.
    if (resultsArray.length == 0 || resultsArray.length <= (page - 1) * 20) {
        const p = document.createElement("p");
        p.appendChild(document.createTextNode("That search returned no results. Please try again."));
        document.querySelector("div#search-results-container")?.appendChild(p);
    }

    // Add the books to the search results container and log the list of books on the current page (for the history).
    const searchPageData: {
        resultsArray: Book[] | null;
        books: Book[] | null;
        docsUsed: number[] | null;
        filters: Record<string, SearchFilter[]> | null;
        page: number | null;
        isBrowse: boolean | null;
        browseResultsArray: Book[] | null;
    } = {
        resultsArray: null,
        books: null,
        docsUsed: null,
        filters: null,
        page: null,
        isBrowse: null,
        browseResultsArray: null
    };
    searchPageData.resultsArray = resultsArray;
    searchPageData.books = [];
    for (let i = (page - 1) * 20; i < Math.min(page * 20, resultsArray.length); i++) {
        document
            .querySelector("div#search-results-container")
            ?.appendChild(buildBookBox(resultsArray[i], "search", i + 1));
        searchPageData.books.push(resultsArray[i]);
    }

    // Create the filters and paginator.
    createFilterList(resultsArray);
    searchPageData.filters = filters;

    createPaginator(resultsArray, page);
    searchPageData.page = page;

    searchPageData.isBrowse = isBrowse;
    searchPageData.browseResultsArray = browseResultsArray;
    searchPageData.docsUsed = docsUsed;

    // const stateData = historyManager.get().stateData;
    // let lookupPromise;
    // if (stateData) {
    //     lookupPromise = HistoryManager.getFromIDB(stateData).catch((error) => {
    //         console.error("There was an issue getting the books from the history. IDB Error:", error);
    //     });
    // } else {
    //     lookupPromise = Promise.resolve({});
    // }

    // lookupPromise.then((stateData) => {
    //     stateData.searchPageData = searchPageData;
    //     historyManager.update(null, undefined, stateData);
    // });

    document.getElementById("apply-filters-button")?.removeAttribute("disabled");
    document.getElementById("content")?.classList.remove("loading");
}

/**
 * @description Creates the paginator for the search results page.
 * @param {Array<Book>} resultsArray The array of books that are going to appear on the page (to determine length).
 * @param {Number} page The current page number.
 */
function createPaginator(resultsArray: Book[], page: number) {
    (document.getElementById("paginator") as HTMLElement).innerHTML = "";
    (document.getElementById("paginator") as HTMLElement).style.setProperty("display", String("flex"));
    if (resultsArray.length < 21) {
        // there is only one page, so don't bother displaying the paginator
        (document.getElementById("paginator") as HTMLElement).style.display = "none";
        return;
    }

    // Create the previous button
    if (page > 1) {
        const prev = document.createElement("a");
        prev.classList.add("arrow");
        prev.innerHTML = "<span class='material-symbols-outlined'>navigate_before</span>";
        prev.onclick = () => {
            windowScroll(0, 1500);
            goToSearchPage(page - 1);
        };
        (document.getElementById("paginator")! as HTMLElement).appendChild(prev);
    }

    // Create the page number buttons
    for (let p = page - 2; p <= page + 2; p++) {
        if (p < 1 || (p - 1) * 20 >= resultsArray.length) continue;
        if (p == page) {
            const span = document.createElement("span");
            span.innerHTML = "<b>" + p + "</b>";
            (document.getElementById("paginator")! as HTMLElement).appendChild(span);
            continue;
        }
        const a = document.createElement("a");
        a.innerHTML = String(p);
        a.onclick = () => {
            windowScroll(0, 1500);
            goToSearchPage(p);
        };
        (document.getElementById("paginator")! as HTMLElement).appendChild(a);
    }

    // Create the next button
    if (page * 20 < resultsArray.length) {
        const next = document.createElement("a");
        next.classList.add("arrow");
        next.innerHTML = "<span class='material-symbols-outlined'>navigate_next</span>";
        next.onclick = () => {
            windowScroll(0, 1500);
            goToSearchPage(page + 1);
        };
        (document.getElementById("paginator")! as HTMLElement).appendChild(next);
    }
}

/**
 * @description Creates the list of filters and the filters object from the resultsArray. Then it calls buildFilterList to create the HTML elements.
 * @param {Array<Book>} resultsArray The array of books to list on the search results page.
 */
function createFilterList(resultsArray: Book[]) {
    // If the filters object is empty, we need to create the data type.
    if (!filters || Object.keys(filters).length === 0) {
        filters = {};
        FILTER_TYPES.forEach((filterType) => {
            if (!filters) {
                return;
            }
            filters[filterType] = [];
        });
    }

    // First, we need to remove any filters that are not checked and clear the count for the ones that are.
    FILTER_TYPES.forEach((filterType) => {
        if (!filters) {
            return;
        }
        for (let i = 0; i < filters[filterType].length; i++) {
            const filter = filters[filterType][i];
            if (filter.checked == false) {
                // If the filter is not checked, we need to remove it from the list.
                filters[filterType].splice(i, 1);
                i--;
            } else {
                // If the filter is checked, we need to save it, but reset the count (since we'll count again).
                filter.count = 0;
                // Reset the display value.
                filter.displayed = false;
            }
        }
    });

    // Now we need to use the new list to recount and re-sort the filters.
    FILTER_TYPES.forEach((filterType) => {
        if (!filters) {
            return;
        }
        if (!filters[filterType]) {
            filters[filterType] = [];
        }
        resultsArray.forEach((book: Book) => {
            // Attempt to find the filter in the filters array.
            let filterItems;
            switch (filterType) {
                case "author":
                    filterItems = book.authors;
                    break;
                case "medium":
                    filterItems = [book.medium];
                    break;
                case "audience":
                    if (!book.audience) {
                        console.error("Book " + book.title + " does not have an audience property. Skipping.");
                        break;
                    }
                    filterItems = book.audience.toArray();
                    break;
                case "subject":
                    filterItems = book.subjects;
                    break;
                case "type":
                    filterItems = [book.ddc];
                    break;
            }

            if (!filterItems) {
                return;
            }
            filterItems.forEach((filterItem: string | Person | null) => {
                if (!filters) {
                    return;
                }
                if (filterItem == null) {
                    return;
                }
                if (filterType == "author") {
                    const author = filterItem as Person;
                    filterItem = author.lastName + ", " + author.firstName;
                } else if (filterType == "type") {
                    if (filterItem == "FIC") {
                        filterItem = "Fiction";
                    } else {
                        filterItem = "Non-Fiction";
                    }
                }
                const existingFilter = filters[filterType].find((filter: SearchFilter) => filter.value == filterItem);
                if (!existingFilter) {
                    // If it doesn't exist, add it and set the count to 1.
                    filters[filterType].push({
                        value: filterItem as string,
                        count: 1,
                        checked: false,
                        displayed: false
                    });
                } else {
                    // If it does exist, increment the count.
                    existingFilter.count++;
                }
            });
        });
        filters[filterType].sort((a: SearchFilter, b: SearchFilter) => b.count - a.count);
    });

    buildFilterList();
}

/**
 * @description Creates the HTML elements for the filters.
 */
function buildFilterList() {
    FILTER_TYPES.forEach((filterType) => {
        (document.getElementById("#sort-" + filterType + "-list") as HTMLElement).innerHTML = "";
        if (!filters || !filters[filterType]) {
            return;
        }
        filters[filterType].forEach((filter: SearchFilter, index: number) => {
            // Only display the first couple filters per section.
            if (index >= 6) {
                return;
            }
            let value = filter.value;
            switch (filterType) {
                case "author":
                    break;
                case "medium":
                    switch (filter.value) {
                        case "paperback":
                            value = "Paperback";
                            break;
                        case "hardcover":
                            value = "Hardcover";
                            break;
                        case "av":
                            value = "Audio/Visual";
                            break;
                    }
                    break;
                case "audience":
                    break;
                case "subject":
                    break;
                case "type":
                    break;
            }
            const li = document.createElement("li");
            li.classList.add("sort-item");
            let id = filterType + "-" + value + "-checkbox";
            id = id.replace(/\s+/g, "-").toLowerCase();
            id = id.replace(/[,./]/g, "");
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
            (document.getElementById("#sort-" + filterType + "-list")! as HTMLElement).appendChild(li);
            filter.displayed = true;
            if (filter.checked) {
                (document.getElementById(id)! as HTMLInputElement).checked = true;
            }
        });
    });
}

/**
 * @description Called by the "Apply Filters" button. Goes through the list of filters on the page and updates the filters variable based on the items that are checked.
 */
function applySearchFilters() {
    (document.getElementById("apply-filters-button")! as HTMLButtonElement).disabled = true;
    FILTER_TYPES.forEach((filterType) => {
        // Clear all checks before looking for new ones.
        filters[filterType].forEach((filter: SearchFilter) => {
            filter.checked = false;
        });

        // Check the filters that are checked.
        document.querySelectorAll("#sort-" + filterType + "-list > li > input:checked").forEach((e) => {
            const value = e?.getAttribute("name");
            const selectedFilter = filters[filterType].find((filter: SearchFilter) => filter.value === value);
            if (selectedFilter) {
                selectedFilter.checked = true;
            }
        });
    });

    // If there is an author or subject filter, it's more efficient to just search for those books.
    if (
        filters["author"].find((filter: SearchFilter) => filter.checked == true) ||
        filters["subject"].find((filter: SearchFilter) => filter.checked == true)
    ) {
        updateBookDatabase().then(() => {
            goToSearchPage(1, true);
        });
    } else {
        goToSearchPage(1, true);
    }
}

/**
 * @description Iterates through the search cache and filters out the items that don't match the filters.
 * @param {Array<Book>} resultsArray The array of books to filter.
 * @returns {Array<Book>} The filtered array of books.
 */
function filterSearchResults(resultsArray: Book[]) {
    if (!filters || Object.keys(filters).length === 0) {
        return resultsArray;
    }
    const results = [];
    // Itterate through each item in the book list
    for (let i = 0; i < resultsArray.length; i++) {
        const currentBook = resultsArray[i];
        let passesAllFilters = true;
        // Itterate through each filter type
        FILTER_TYPES.forEach((filterType) => {
            // For each type, itterate through each filter
            let passesFilter = false;
            for (let j = 0; j < filters[filterType].length && passesAllFilters; j++) {
                if (!filters[filterType][j].checked) {
                    continue; // Skip this filter if it's not checked.
                }
                if (filterType == "author") {
                    const authorFilter = filters.author[j].value;
                    currentBook.authors.forEach((author: Person) => {
                        if (author.lastName + ", " + author.firstName == authorFilter) {
                            passesFilter = true;
                        }
                    });
                } else if (filterType == "medium") {
                    const medium = filters.medium[j].value;
                    if (!currentBook.medium) {
                        console.error("Book " + currentBook.title + " does not have a medium property. Skipping.");
                        continue;
                    }
                    if (medium.toUpperCase() == currentBook.medium.toUpperCase()) {
                        passesFilter = true;
                    }
                } else if (filterType == "audience") {
                    const audience = filters.audience[j].value;
                    if (!currentBook.audience) {
                        console.error("Book " + currentBook.title + " does not have an audience property. Skipping.");
                        continue;
                    }
                    currentBook.audience.toArray().forEach((audienceItem: string) => {
                        if (audience.toUpperCase() == audienceItem.toUpperCase()) {
                            passesFilter = true;
                        }
                    });
                } else if (filterType == "subject") {
                    const subject = filters.subject[j].value;
                    if (!currentBook.subjects) {
                        console.error("Book " + currentBook.title + " does not have a subjects property. Skipping.");
                        continue;
                    }
                    currentBook.subjects.forEach((subjectItem: string) => {
                        if (subject.toUpperCase() == subjectItem.toUpperCase()) {
                            passesFilter = true;
                        }
                    });
                } else if (filterType == "type") {
                    const type = filters.type[j].value;
                    let bookType;
                    if (currentBook.ddc == "FIC") {
                        bookType = "Fiction";
                    } else {
                        bookType = "Non-Fiction";
                    }
                    if (type.toUpperCase() == bookType.toUpperCase()) {
                        passesFilter = true;
                    }
                }
                if (!passesFilter) {
                    passesAllFilters = false;
                }
            }
        });
        // If it passes all filters, add it to the results
        if (passesAllFilters) {
            results.push(currentBook);
        }
    }
    return results;
}

/**
 * @description Sets up the individiual result page and starts the process of getting the book's information.
 * @param {String} pageQuery The query string from the URL.
 */
export function setupResultPage(pageQuery: string) {
    const barcodeNumber = parseInt(findURLValue(pageQuery, "id")).toString();
    if (!barcodeNumber) {
        openModal("error", "A valid barcode was not provided.");
        // goToPage("");
        return;
    }

    fillResultPage(barcodeNumber);

    // Create Event Listeners
    // createOnClick(document.getElementById("result-page-back-button")! as HTMLButtonElement, () => softBack());
    createOnClick(document.querySelector(".result-page-image")! as HTMLImageElement, () =>
        displayResultPageImagePopup(barcodeNumber)
    );

    createOnClick(document.getElementById("result-page-email")! as HTMLButtonElement, () => {
        const loadingModal = openModal("info", "Sending email... Please wait...", "Sending Email", "");
        resultPageEmail(barcodeNumber)
            .then(() => {
                openModal(
                    "success",
                    "An email containing this book's information has been sent to the email address on file. Please check your inbox.",
                    "Email Sent!"
                );
            })
            .catch((error) => {
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

    createOnClick(document.getElementById("result-page-link")! as HTMLButtonElement, () => {
        navigator.clipboard.writeText(window.location.href).then(() => {
            const closeModal = openModal("success", "The link has been copied to your clipboard.", "Link Copied", "");
            window.setTimeout(() => {
                closeModal();
            }, 1200);
        });
    });

    createOnClick(document.getElementById("result-page-print")! as HTMLButtonElement, window.print);

    if (auth.currentUser) {
        (document.getElementById("result-page-email") as HTMLElement).style.setProperty("display", String("block"));
    }

    isAdminCheck().then((isAdmin) => {
        if (isAdmin) {
            (document.getElementById("result-page-edit") as HTMLElement).style.setProperty("display", String("block"));
            // createOnClick(
            //     document.getElementById("result-page-edit")! as HTMLButtonElement,
            //     goToPage,
            //     "admin/editEntry?new=false&id=" + barcodeNumber
            // );
        }
    });
}

/**
 * @description Creates and displays a popup containing a higher resolution version of the book image.
 * @param {String} barcodeNumber The barcode number of the book to create the popup for.
 */
function displayResultPageImagePopup(barcodeNumber: string) {
    // Construct Container
    const imgContainer = document.createElement("div");
    imgContainer.classList.add("modal-container");
    imgContainer.style.backgroundColor = "#000000c0";
    imgContainer.tabIndex = 0;
    // Construct Image
    const img = document.createElement("img");
    img.id = "result-page-popup-image";
    imgContainer.appendChild(img);
    // Get the link from the database and display it.
    getBookFromBarcode(barcodeNumber).then((bookObject) => {
        if (!bookObject || !(bookObject instanceof Book)) {
            console.error("Book object is not valid for barcode " + barcodeNumber, bookObject);
            return;
        }
        if (!bookObject.coverImageLink) {
            return;
        }
        img.src = bookObject.coverImageLink;
        img.onload = () => {
            imgContainer.style.display = "block";
            imgContainer.style.opacity = "1";
            img.classList.add("modal-show");
        };
        (document.getElementById("content")! as HTMLElement).appendChild(imgContainer);
        // Create Event Listener to Close Popup
        createOnClick(imgContainer, () => {
            imgContainer.style.opacity = "0";
            img.classList.remove("modal-show");
            img.classList.add("modal-hide");
            setTimeout(() => {
                document.querySelector(".modal-container")?.remove();
            }, 500);
        });
        // Keep focus set on the image so that the user can close it with the enter key.
        document.querySelector(".result-page-image")?.dispatchEvent(new Event("blur"));
        setInterval(() => {
            document.querySelector(".modal-container")?.dispatchEvent(new Event("focus"));
        }, 100);
    });
}

/**
 * @description Fills the result page with the book's information.
 * @param {String} barcodeNumber The barcode number of the book to get the information for.
 */
function fillResultPage(barcodeNumber: string) {
    getBookFromBarcode(barcodeNumber)
        .then((bookObject) => {
            if (!bookObject || !(bookObject instanceof Book) || bookObject.isDeleted || bookObject.isHidden) {
                openModal("error", "No information could be found for that book.");
                // softBack();
                return;
            }
            // changePageTitle(bookObject.title);

            if (bookObject.medium == "av") {
                document.querySelector(".result-page-image")?.setAttribute("src", String("/img/av-image.png"));
                document.querySelector(".result-page-image")?.removeAttribute("tabindex");
                (document.querySelector(".result-page-image") as HTMLElement).style.setProperty(
                    "cursor",
                    String("default")
                );
            } else {
                document.querySelector(".result-page-image")?.setAttribute("tabindex", String("0"));
                (document.querySelector(".result-page-image") as HTMLElement).style.setProperty(
                    "cursor",
                    String("pointer")
                );
                // Currently not checking for icons because they are too low quality. Could change that if needed.
                if (bookObject.thumbnailImageLink && bookObject.thumbnailImageLink?.indexOf("http") != -1) {
                    document
                        .querySelector(".result-page-image")
                        ?.setAttribute("src", String(bookObject.thumbnailImageLink));
                } else if (bookObject.coverImageLink && bookObject.coverImageLink?.indexOf("http") != -1) {
                    console.warn("No thumbnail image found for " + bookObject.barcodeNumber + ".", bookObject);
                    document
                        .querySelector(".result-page-image")
                        ?.setAttribute("src", String(bookObject.coverImageLink));
                } else {
                    console.error("No images found for " + bookObject.barcodeNumber + ".", bookObject);
                    document.querySelector(".result-page-image")?.setAttribute("src", String("/img/default-book.png"));
                    document.querySelector(".result-page-image")?.removeAttribute("tabindex");
                    (document.querySelector(".result-page-image") as HTMLElement).style.setProperty(
                        "cursor",
                        String("default")
                    );
                }
            }

            (document.getElementById("result-page-barcode-number") as HTMLInputElement).innerHTML =
                addBarcodeSpacing(barcodeNumber);
            if (!bookObject.canBeCheckedOut) {
                document.getElementById("checkout-button")?.classList.add("disabled");
                createOnClick(document.getElementById("checkout-button")! as HTMLButtonElement, () => {
                    openModal(
                        "info",
                        "This book is a reference book and cannot be checked out. Please visit the library in person to use this book.",
                        "Reference Book"
                    );
                });
            } else {
                (document.getElementById("checkout-button") as HTMLElement).style.display = "";
                createOnClick(document.getElementById("checkout-button")! as HTMLButtonElement, () =>
                    checkout(barcodeNumber)
                );
            }
            (document.getElementById("result-page-isbn-number") as HTMLInputElement).innerHTML =
                "ISBN 10: " + bookObject.isbn10 + "<br>ISBN 13: " + bookObject.isbn13;
            if (bookObject.isbn10 == "" && bookObject.isbn13 == "") {
                (document.getElementById("result-page-isbn-number") as HTMLInputElement).innerHTML = "None";
            }
            let callNumberAnswer = "";
            if (!bookObject.audience) {
                console.error("Book " + bookObject.title + " does not have an audience property. Skipping.");
            } else {
                if (bookObject.audience.children == true) {
                    callNumberAnswer += "J";
                } else if (bookObject.audience.youth == true) {
                    callNumberAnswer += "Y";
                } else if (bookObject.canBeCheckedOut == false) {
                    callNumberAnswer += "REF<br>";
                }
                callNumberAnswer += bookObject.ddc;
            }
            // TODO: Make sure that items with no author are not stored as empty person objects so this works.
            if (bookObject.authors.length != 0 && bookObject.authors[0].lastName && bookObject.authors[0].firstName) {
                callNumberAnswer += "<br>" + bookObject.authors[0].lastName.toUpperCase().substring(0, 3);
            } else if (bookObject.title) {
                callNumberAnswer += "<br>" + bookObject.title.toUpperCase().substring(0, 3);
            }
            (document.getElementById("result-page-call-number") as HTMLInputElement).innerHTML = callNumberAnswer;
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
            (document.getElementById("result-page-medium") as HTMLInputElement).innerHTML = mediumAnswer;
            let audienceAnswer = "";
            if (!bookObject.audience) {
                console.error("Book " + bookObject.title + " does not have an audience property. Skipping.");
            } else {
                if (bookObject.audience.children == true) {
                    audienceAnswer += "Children, ";
                }
                if (bookObject.audience.youth == true) {
                    audienceAnswer += "Youth, ";
                }
                if (bookObject.audience.adult == true) {
                    audienceAnswer += "Adult, ";
                }
                if (bookObject.audience.isNone() == true) {
                    audienceAnswer = "None, ";
                }
                audienceAnswer = audienceAnswer.substring(0, audienceAnswer.lastIndexOf(","));
                (document.getElementById("result-page-audience") as HTMLInputElement).innerHTML = audienceAnswer;
            }
            let publishersAnswer = "";
            if (!bookObject.publishers || bookObject.publishers.length == 0) {
                console.error("Book " + bookObject.title + " does not have a publishers property. Skipping.");
            } else {
                bookObject.publishers.forEach((item: string) => {
                    publishersAnswer += item + ", ";
                });
                publishersAnswer = publishersAnswer.substring(0, publishersAnswer.lastIndexOf(","));
                if (publishersAnswer == "") publishersAnswer = "None";
                (document.getElementById("result-page-publisher") as HTMLInputElement).innerHTML = publishersAnswer;
            }
            if (bookObject.publishDate) {
                const d = bookObject.publishDate;
                if (d.getMonth() != 0 && d.getDate() != 1) {
                    (document.getElementById("result-page-publish-date") as HTMLInputElement).innerHTML =
                        d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear();
                } else if (d.getMonth() != 0) {
                    let month;
                    switch (d.getMonth()) {
                        case 0:
                            month = "Jan";
                            break;
                        case 1:
                            month = "Feb";
                            break;
                        case 2:
                            month = "Mar";
                            break;
                        case 3:
                            month = "Apr";
                            break;
                        case 4:
                            month = "May";
                            break;
                        case 5:
                            month = "Jun";
                            break;
                        case 6:
                            month = "Jul";
                            break;
                        case 7:
                            month = "Aug";
                            break;
                        case 8:
                            month = "Sep";
                            break;
                        case 9:
                            month = "Oct";
                            break;
                        case 10:
                            month = "Nov";
                            break;
                        case 11:
                            month = "Dec";
                            break;

                        default:
                            console.error("The month could not be detected");
                            month = "";
                            break;
                    }
                    (document.getElementById("result-page-publish-date") as HTMLInputElement).innerHTML =
                        month + ", " + d.getFullYear();
                } else {
                    (document.getElementById("result-page-publish-date") as HTMLInputElement).innerHTML = d
                        .getFullYear()
                        .toString();
                }
            } else {
                (document.getElementById("result-page-publish-date") as HTMLInputElement).innerHTML = "None";
            }
            if (bookObject.numberOfPages && bookObject.numberOfPages > 0) {
                (document.getElementById("result-page-pages") as HTMLInputElement).innerHTML =
                    bookObject.numberOfPages.toString();
            } else {
                (document.getElementById("result-page-pages") as HTMLInputElement).innerHTML = "Unnumbered";
            }
            if (!bookObject.title) {
                console.error("Book " + bookObject.barcodeNumber + " does not have a title property. Skipping.");
            } else {
                (document.getElementById("result-page-title") as HTMLInputElement).innerHTML =
                    bookObject.title.toString();
            }
            if (!bookObject.subtitle) {
                console.error("Book " + bookObject.barcodeNumber + " does not have a subtitle property. Skipping.");
            } else {
                (document.getElementById("result-page-subtitle") as HTMLInputElement).innerHTML =
                    bookObject.subtitle.toString();
            }
            if (bookObject.subtitle == null || bookObject.subtitle.length < 1) {
                (document.getElementById("result-page-subtitle-header") as HTMLElement).style.display = "none";
                (document.getElementById("result-page-subtitle") as HTMLElement).style.display = "none";
            }
            if (bookObject.authors.length > 1) {
                (document.getElementById("result-page-author-header") as HTMLInputElement).innerHTML = "Authors";
                let authorAnswer = "";
                bookObject.authors.forEach((item: Person) => {
                    authorAnswer += item.lastName + ", " + item.firstName + "<br>";
                });
                (document.getElementById("result-page-author") as HTMLInputElement).innerHTML = authorAnswer;
            } else {
                if (
                    bookObject.authors.length == 0 ||
                    (bookObject.authors[0].firstName == "" && bookObject.authors[0].lastName == "")
                ) {
                    (document.getElementById("result-page-author") as HTMLInputElement).innerHTML = "None";
                } else {
                    (document.getElementById("result-page-author") as HTMLInputElement).innerHTML =
                        bookObject.authors[0].lastName + ", " + bookObject.authors[0].firstName;
                }
            }
            if (bookObject.illustrators.length > 0) {
                let illustratorAnswer = "";
                bookObject.illustrators.forEach((item: Person) => {
                    illustratorAnswer += item.lastName + ", " + item.firstName + "<br>";
                });
                (document.getElementById("result-page-illustrator") as HTMLInputElement).innerHTML = illustratorAnswer;
                if (bookObject.illustrators.length > 1) {
                    (document.getElementById("result-page-illustrator-header") as HTMLInputElement).innerHTML =
                        "Illustrators";
                }
            } else {
                (document.getElementById("result-page-illustrator-header") as HTMLElement).style.display = "none";
                (document.getElementById("result-page-illustrator") as HTMLElement).style.display = "none";
            }
            if (bookObject.subjects) {
                if (bookObject.subjects.length == 0) {
                    (document.getElementById("result-page-subjects") as HTMLElement).style.display = "none";
                    (document.getElementById("result-page-subjects-header") as HTMLElement).style.display = "none";
                } else if (bookObject.subjects.length == 1) {
                    (document.getElementById("result-page-subjects-header") as HTMLInputElement).innerHTML = "Subject";
                }
                let subjectsAnswer = "";
                for (let i = 0; i < bookObject.subjects.length; i++) {
                    subjectsAnswer += bookObject.subjects[i];
                    if (i != bookObject.subjects.length - 1) {
                        subjectsAnswer += "<br>";
                    }
                }
                (document.getElementById("result-page-subjects") as HTMLInputElement).innerHTML = subjectsAnswer;
            }
            (document.getElementById("result-page-description") as HTMLInputElement).innerHTML =
                bookObject.description ?? "No Description Available";

            // Fade in the result container
            (document.getElementById("result-page-container") as HTMLElement).style.setProperty("opacity", String("1"));

            logEvent(analytics, "select_content", {
                content_type: "book_result",
                item_id: barcodeNumber
            });
        })
        .catch((error) => {
            // softBack();
            openModal("error", "No information could be found for that book.\n" + error);
        });
}

/**
 * @description Sends an email to the user with the book's information.
 * @param {String} barcodeNumber The barcode number of the book to get the information for.
 * @returns {Promise<void>} A promise that resolves when the email has been sent.
 */
function resultPageEmail(barcodeNumber: string) {
    return new Promise<string | undefined>((resolve, reject) => {
        getBookFromBarcode(barcodeNumber)
            .then((book) => {
                if (!book || !(book instanceof Book) || book.isDeleted || book.isHidden) {
                    reject("No book found for the given barcode.");
                    return;
                }
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
                    message += "<b>Author(s):</b> ";
                    for (let i = 0; i < book.authors.length; i++) {
                        message += book.authors[i].lastName + ", " + book.authors[i].firstName;
                        if (i != book.authors.length - 1) {
                            message += "; ";
                        }
                    }
                    message += "\n";
                }
                if (book.illustrators.length > 0) {
                    message += "<b>Illustrator(s):</b> ";
                    for (let i = 0; i < book.illustrators.length; i++) {
                        message += book.illustrators[i].lastName + ", " + book.illustrators[i].firstName;
                        if (i != book.illustrators.length - 1) {
                            message += "; ";
                        }
                    }
                    message += "\n\n";
                }
                if (book.subjects && book.subjects.length > 0) {
                    message += "<b>Subject(s):</b> ";
                    for (let i = 0; i < book.subjects.length; i++) {
                        message += book.subjects[i];
                        if (i != book.subjects.length - 1) {
                            message += "; ";
                        }
                    }
                    message += "\n";
                }
                if (book.description) {
                    message += "<b>Description:</b> " + book.description + "\n\n";
                }
                if (book.publishers && book.publishers.length > 0) {
                    message += "<b>Publisher(s):</b> ";
                    for (let i = 0; i < book.publishers.length; i++) {
                        message += book.publishers[i];
                        if (i != book.publishers.length - 1) {
                            message += "; ";
                        }
                    }
                    message += "\n";
                }
                if (book.publishDate) {
                    const d = book.publishDate;
                    const date = d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear();
                    message += "<b>Publish Date:</b> " + date + "\n";
                }
                if (book.isbn10) {
                    message += "<b>ISBN-10:</b> " + book.isbn10 + "\n";
                }
                if (book.isbn13) {
                    message += "<b>ISBN-13:</b> " + book.isbn13 + "\n";
                }
                if (book.audience) {
                    message += "<b>Audience:</b> " + book.audience.toString() + "\n";
                }
                message += "<b>Medium:</b> " + book.medium + "\n";
                message += "<b>Number of Pages:</b> " + book.numberOfPages + "\n";
                message += "<b>Dewey Decimal Classification:</b> " + book.ddc + "\n\n";
                message +=
                    "Thank you for using the South Church Library Catalog!\n\nSincerely,\nYour South Church Library Team</p>";
                if (!auth.currentUser || !auth.currentUser.email) {
                    reject("No user is currently logged in.");
                    return;
                }
                const to = [auth.currentUser.email];
                const subject = "Book Information for " + book.title;
                sendEmail(to, subject, undefined, message)
                    .then(() => {
                        resolve(undefined);
                    })
                    .catch((error) => {
                        reject(error);
                    });
            })
            .catch((error) => {
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
 * @description Checks out a book. This function starts the process when the user clicks the checkout button on the result page.
 * @param {Number} barcodeNumber The barcode number of the book to be checked out.
 */
function checkout(barcodeNumber: number | string) {
    if (typeof barcodeNumber === "string") {
        barcodeNumber = parseInt(barcodeNumber);
    }
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

console.log("search.js has Loaded!");
