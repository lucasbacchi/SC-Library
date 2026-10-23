import {
    addBarcodeSpacing,
    createOnClick,
    encodeHTML,
    findURLValue,
    getBookFromBarcode,
    openModal,
    setupWindowBeforeUnload,
    switchISBNformats,
    verifyISBN
} from "./common";
import { app, Audience, Book, db, Person, setTimeLastSearched } from "./globals";
import {
    arrayUnion,
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    QueryDocumentSnapshot,
    runTransaction,
    where
} from "firebase/firestore";
import { deleteObject, getStorage, list, ref, uploadBytes } from "firebase/storage";

interface OpenLibraryData {
    [key: string]: unknown;
}

let newEntry: boolean;
let barcodeNumber: number;
let isbn: string;
let imageChanged: boolean;
let changesDetected = false;

/**
 * @description This function sets up the edit entry page, and starts the process of getting the data from the database or Open Library.
 * @param {String} pageQuery The query string from the URL
 */
export function setupEditEntry(pageQuery: string) {
    file = null;
    newEntry = findURLValue(pageQuery, "new") == "true";
    barcodeNumber = parseInt(findURLValue(pageQuery, "id", true));
    isbn = encodeHTML(findURLValue(pageQuery, "isbn", true));
    imageChanged = false;

    if (newEntry == false && (barcodeNumber < 1171100000 || barcodeNumber > 1171199999)) {
        openModal("error", "The barcode that you are trying to edit is not valid.");
        // goToPage("admin/main");
        return;
    }

    if (!newEntry) {
        // If this is not a new entry, just get the content that exists in the database
        populateEditEntryFromDatabase(barcodeNumber);
    } else {
        // If this is a new entry (and they are creating it for the first time) go get info from open library
        if (isbn.length == 10 || isbn.length == 13) {
            gatherExternalInformation(isbn)
                .then((returnValue) => {
                    // If this is a brand new entry...
                    // returnValue will be in the form of noISBN = false, bookObject, authorObject, worksObject
                    loadDataOnToEditEntryPage(returnValue[0], returnValue[1], returnValue[2], returnValue[3]);
                })
                .catch((error) => {
                    // The ISBN Number is valid, but there is not a listing in Open Library
                    openModal(
                        "info",
                        "The ISBN number that you entered (" +
                            isbn +
                            ") appears to be a valid number, but we did not find a listing for it in Open Library. You will need to create an entry manually."
                    );
                    console.warn("Could not find an entry in Open Library for this isbn", error);
                });
        } else {
            // TODO: Move the one barcode update to here, and don't bother calling this function if it's a new entry
            loadDataOnToEditEntryPage(true);
        }
    }

    // If a user clicks the button to change the book cover image, click the input button
    createOnClick(document.getElementById("book-cover-image-overlay")! as HTMLDivElement, () => {
        if (document.getElementById("file-input")! as HTMLInputElement) {
            document.getElementById("file-input")?.dispatchEvent(new Event("click"));
        }
    });

    // If the user attempts to leave, let them know if they have unsaved changes
    setupWindowBeforeUnload(checkForChanges);

    (document.getElementById("book-medium")! as HTMLSelectElement).addEventListener("input", (event: InputEvent) => {
        if (event.target && event.target instanceof HTMLSelectElement && event.target.value == "av") {
            const goAway = document.querySelectorAll<HTMLElement>(".no-av");
            for (let i = 0; i < goAway.length; i++) goAway[i].style.display = "none";
        } else {
            const goAway = document.querySelectorAll<HTMLElement>(".no-av");
            for (let i = 0; i < goAway.length; i++) goAway[i].style.display = "";
        }
    });

    (document.getElementById("book-unnumbered")! as HTMLInputElement).addEventListener("input", (event: InputEvent) => {
        if (event.target && event.target instanceof HTMLInputElement && event.target.checked == true) {
            (document.getElementById("book-pages") as HTMLInputElement).value = "";
            (document.getElementById("book-pages")! as HTMLInputElement).disabled = true;
        } else {
            (document.getElementById("book-pages") as HTMLInputElement).value = "";
            (document.getElementById("book-pages")! as HTMLInputElement).disabled = false;
        }
    });

    (document.getElementById("book-no-isbn")! as HTMLInputElement).addEventListener("input", (event: InputEvent) => {
        if (event.target && event.target instanceof HTMLInputElement && event.target.checked == true) {
            (document.getElementById("book-isbn-10") as HTMLInputElement).value = "";
            (document.getElementById("book-isbn-10")! as HTMLInputElement).disabled = true;
            (document.getElementById("book-isbn-13") as HTMLInputElement).value = "";
            (document.getElementById("book-isbn-13")! as HTMLInputElement).disabled = true;
        } else {
            (document.getElementById("book-isbn-10") as HTMLInputElement).value = "";
            (document.getElementById("book-isbn-10")! as HTMLInputElement).disabled = false;
            (document.getElementById("book-isbn-13") as HTMLInputElement).value = "";
            (document.getElementById("book-isbn-13")! as HTMLInputElement).disabled = false;
        }
    });

    document.getElementById("file-input")?.addEventListener("change", (event) => {
        loadFile(event);
    });

    // Create Event Listeners for the buttons
    createOnClick(document.getElementById("edit-entry-save")! as HTMLButtonElement, editEntry);
    createOnClick(document.getElementById("edit-entry-cancel")! as HTMLButtonElement, cancelEditEntry);
    createOnClick(document.getElementById("add-subject")! as HTMLButtonElement, addSubject);
    createOnClick(document.getElementById("delete-entry")! as HTMLButtonElement, deleteEntry);
    createOnClick(document.getElementById("edit-entry-delete")! as HTMLButtonElement, () => {
        openModal(
            "warning",
            "Are you sure you want to delete this entry? This action cannot be undone.",
            "Delete Forever",
            "Delete this Entry",
            deleteEntry,
            "Cancel"
        );
    });

    // Watch for changes to the input fields
    changesDetected = false;
    document.querySelector("input, textarea")?.addEventListener("input", () => {
        changesDetected = true;
    });
    document.querySelector("select")?.addEventListener("change", () => {
        changesDetected = true;
    });
    createOnClick(document.getElementById("book-cover-image-overlay")! as HTMLImageElement, () => {
        changesDetected = true;
    });
    createOnClick(document.getElementById("book-cover-image")! as HTMLImageElement, () => {
        changesDetected = true;
    });
}

/**
 * @description Checks for changes to the input fields returns true if any changes are detected
 * @returns {Boolean} True if any changes are detected, false otherwise
 */
// TODO: Update this to actaully check for changes against the database
function checkForChanges() {
    return changesDetected;
}

/**
 * @description Reads from the database and fills in the edit entry page with the data from the entry with the given barcode number.
 * @param {Number} barcodeNumber The barcode number of the entry to load
 */
function populateEditEntryFromDatabase(barcodeNumber: number) {
    if (isNaN(barcodeNumber)) {
        openModal("error", "We could not find an entry in the database with the barcode number that you entered.");
        console.error("barcodeNumber is not a number", barcodeNumber);
        return;
    }

    getBookFromBarcode(barcodeNumber, true)
        .then((data) => {
            if (!data || !(data instanceof Book)) {
                openModal("error", "We could not find any data for a book with barcode number " + barcodeNumber);
                // goToPage("admin/main");
                return;
            }

            (document.getElementById("barcode") as HTMLInputElement).innerHTML = addBarcodeSpacing(
                barcodeNumber.toString()
            );
            (document.getElementById("book-title") as HTMLInputElement).value = data.title ?? "No title available";
            (document.getElementById("book-subtitle") as HTMLInputElement).value =
                data.subtitle ?? "No subtitle available";

            for (let i = 0; i < data.authors.length; i++) {
                (document.getElementById("#book-author-" + (i + 1) + "-last") as HTMLInputElement).value =
                    data.authors[i].lastName ?? "";
                (document.getElementById("#book-author-" + (i + 1) + "-first") as HTMLInputElement).value =
                    data.authors[i].firstName ?? "";
            }

            for (let i = 0; i < data.illustrators.length; i++) {
                (document.getElementById("#book-illustrator-" + (i + 1) + "-last") as HTMLInputElement).value =
                    data.illustrators[i].lastName ?? "";
                (document.getElementById("#book-illustrator-" + (i + 1) + "-first") as HTMLInputElement).value =
                    data.illustrators[i].firstName ?? "";
            }

            (document.getElementById("book-medium") as HTMLInputElement).value = data.medium ?? "";

            document.getElementById("book-cover-image")?.setAttribute("src", String(data.coverImageLink));

            if (data.subjects) {
                for (let i = 0; i < data.subjects.length; i++) {
                    addSubject();
                    (document.querySelector("#book-subject-" + (i + 1)) as HTMLInputElement).value = data.subjects[i];
                }
            }

            (document.getElementById("book-description") as HTMLInputElement).value = data.description ?? "";

            (document.getElementById("book-audience-children")! as HTMLInputElement)["checked"] = Boolean(
                data.audience?.children
            );
            (document.getElementById("book-audience-youth")! as HTMLInputElement)["checked"] = Boolean(
                data.audience?.youth
            );
            (document.getElementById("book-audience-adult")! as HTMLInputElement)["checked"] = Boolean(
                data.audience?.adult
            );
            (document.getElementById("book-audience-none")! as HTMLInputElement)["checked"] = Boolean(
                data.audience ? data.audience.isNone() : true
            );

            (document.getElementById("book-isbn-10") as HTMLInputElement).value = data.isbn10 ?? "";
            (document.getElementById("book-isbn-13") as HTMLInputElement).value = data.isbn13 ?? "";

            if (data.isbn10 == "" && data.isbn13 == "") {
                (document.getElementById("book-no-isbn")! as HTMLInputElement)["checked"] = true;
                (document.getElementById("book-isbn-10")! as HTMLInputElement).disabled = true;
                (document.getElementById("book-isbn-13")! as HTMLInputElement).disabled = true;
            }

            (document.getElementById("book-publisher-1") as HTMLInputElement).value = data.publishers?.[0] ?? "";
            (document.getElementById("book-publisher-2") as HTMLInputElement).value = data.publishers?.[1] ?? "";

            if (data.publishDate != null) {
                (document.getElementById("book-publish-month") as HTMLInputElement).value = (
                    data.publishDate.getMonth() + 1
                ).toString();
                (document.getElementById("book-publish-day") as HTMLInputElement).value = data.publishDate
                    .getDate()
                    .toString();
                (document.getElementById("book-publish-year") as HTMLInputElement).value = data.publishDate
                    .getFullYear()
                    .toString();
            }

            if (data.numberOfPages != null && data.numberOfPages != -1) {
                (document.getElementById("book-pages") as HTMLInputElement).value = data.numberOfPages.toString();
                (document.getElementById("book-unnumbered")! as HTMLInputElement)["checked"] = false;
            } else if (data.numberOfPages == -1) {
                (document.getElementById("book-pages")! as HTMLInputElement).disabled = true;
                (document.getElementById("book-unnumbered")! as HTMLInputElement)["checked"] = true;
            }

            (document.getElementById("book-dewey") as HTMLInputElement).value = data.ddc ?? "";

            let temp = data.canBeCheckedOut ? "y" : "";
            (document.getElementById("book-can-be-checked-out") as HTMLInputElement).value = temp;
            temp = data.isHidden ? "y" : "";
            (document.getElementById("book-is-hidden") as HTMLInputElement).value = temp;

            if (data.purchaseDate != null) {
                (document.getElementById("book-purchase-month") as HTMLInputElement).value = (
                    data.purchaseDate.getMonth() + 1
                ).toString();
                (document.getElementById("book-purchase-day") as HTMLInputElement).value = data.purchaseDate
                    .getDate()
                    .toString();
                (document.getElementById("book-purchase-year") as HTMLInputElement).value = data.purchaseDate
                    .getFullYear()
                    .toString();
            }

            (document.getElementById("book-purchase-price") as HTMLInputElement).value =
                data.purchasePrice != null ? data.purchasePrice.toString() : "";
            (document.getElementById("book-vendor") as HTMLInputElement).value = data.vendor ?? "";

            if (data.lastUpdated != null) {
                const lastUpdated = data.lastUpdated;
                (document.getElementById("last-updated") as HTMLInputElement).innerHTML =
                    "This entry was last updated on " +
                    lastUpdated.toLocaleDateString("en-US") +
                    " at " +
                    lastUpdated.toLocaleTimeString("en-US");
            }
        })
        .catch((error) => {
            openModal("error", "There was an error retreiving this book information from the database");
            console.error(error);
        });
}

/**
 * @description Gets the book information from Open Library
 * @param {String} isbn The ISBN number to search for.
 * @returns {Promise<Array<Boolean, Object, Object, Object>>} An array containing any information found in Open Library.
 *          Ideally, noISBN, the book object, the author object, and the works object.
 */
// TODO: Make this fuction less... janky...
function gatherExternalInformation(
    isbn: string
): Promise<[boolean, OpenLibraryData?, OpenLibraryData[]?, OpenLibraryData[]?]> {
    return new Promise((resolve) => {
        if (isbn == "") {
            // In this case, the entry was created without an isbn
            resolve([true]);
            return;
        }
        lookupBook(isbn)
            .then((bookObject) => {
                lookupAuthor(bookObject)
                    .then((value) => {
                        const bookObject = value[0];
                        const authorObject = value[1];
                        lookupWorks(bookObject, authorObject)
                            .then((value) => {
                                const bookObject = value[0];
                                const authorObject = value[1];
                                const worksObject = value[2];
                                resolve([false, bookObject, authorObject, worksObject]);
                            })
                            .catch((error) => {
                                openModal(
                                    "error",
                                    "There was an issue loading the works object info from the external database. Please ensure you input the ISBN number correctly."
                                );
                                console.error(error);
                                resolve([true]);
                                return;
                            });
                    })
                    .catch((error) => {
                        openModal(
                            "error",
                            "There was an issue loading the author object from the external database. Please ensure you input the ISBN number correctly."
                        );
                        console.error(error);
                        resolve([true]);
                        return;
                    });
            })
            .catch((error) => {
                openModal(
                    "error",
                    "There was an issue loading the book object info from the external database. Please ensure you input the ISBN number correctly."
                );
                console.error(error);
                resolve([true]);
                return;
            });
    });
}

/**
 * @description Looks up the book object from Open Library.
 * @param {String} isbn The ISBN number to search for.
 * @returns {Promise<Object>} The book object from Open Library. It is not an instance of the Book class.
 */
function lookupBook(isbn: string): Promise<OpenLibraryData> {
    return new Promise((resolve, reject) => {
        const xhttp = new XMLHttpRequest();

        xhttp.open("GET", "https://openlibrary.org/isbn/" + isbn + ".json");
        xhttp.onreadystatechange = () => {
            if (xhttp.status == 404 || xhttp.status == 403 || xhttp.status == 400) {
                reject("Invalid Response");
            }
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                resolve(JSON.parse(xhttp.responseText));
            }
        };
        xhttp.timeout = 5000;
        xhttp.ontimeout = (event) => {
            reject("Request Timed Out");
            console.error(event);
        };
        xhttp.send();
    });
}

/**
 * @description Looks up the Author object from Open Library.
 * @param {Object} bookObject The book object to be used to find the author object. It is also passed through.
 * @returns {Promise<Array<Object, Object>>} An array containing the book object and the author object.
 */
function lookupAuthor(bookObject: OpenLibraryData): Promise<[OpenLibraryData, OpenLibraryData[]]> {
    console.log(bookObject);
    return new Promise((resolve, reject) => {
        let total = 0;
        if (Array.isArray(bookObject.authors) && bookObject.authors.length != 0) {
            for (let i = 0; i < bookObject.authors.length; i++) {
                const xhttp = new XMLHttpRequest();
                const authorLink = bookObject.authors[i].key;

                xhttp.open("GET", "https://openlibrary.org" + authorLink + ".json");

                xhttp.timeout = 5000;
                xhttp.ontimeout = (event) => {
                    reject("Request Timed Out");
                    console.error(event);
                };
                xhttp.send();

                total++;
                xhttp.onreadystatechange = () => {
                    if (xhttp.status == 404 || xhttp.status == 403 || xhttp.status == 400) {
                        reject("Invalid Response");
                    }
                    if (xhttp.readyState == 4 && xhttp.status == 200) {
                        const authorObject: OpenLibraryData[] = [];
                        authorObject[i] = JSON.parse(xhttp.responseText);
                        // Only resolve if all of the xhttp requests have been completed
                        if (i == total - 1) {
                            resolve([bookObject, authorObject]);
                        }
                    }
                };
            }
        } else {
            resolve([bookObject, []]);
        }
    });
}

/**
 * @description Looks up the works object from Open Library.
 * @param {Object} bookObject The book object to be used to find the works object. It is also passed through.
 * @param {Object} authorObject The author object is also passed through.
 * @returns {Promise<Array<Object, Object, Object>>} Returns a promise with an array containing the book object, the author object, and the works object.
 */
function lookupWorks(
    bookObject: OpenLibraryData,
    authorObject: OpenLibraryData[]
): Promise<[OpenLibraryData, OpenLibraryData[], OpenLibraryData[]]> {
    return new Promise((resolve, reject) => {
        let total = 0;
        const works = Array.isArray(bookObject.works)
            ? bookObject.works.filter(
                  (work): work is { key: string } =>
                      typeof work === "object" && work !== null && "key" in work && typeof work.key === "string"
              )
            : [];
        for (let i = 0; i < works.length; i++) {
            const xhttp = new XMLHttpRequest();
            const worksLink = works[i].key;

            xhttp.open("GET", "https://openlibrary.org" + worksLink + ".json");

            xhttp.timeout = 5000;
            xhttp.ontimeout = (event) => {
                reject("Request Timed Out");
                console.error(event);
            };

            xhttp.send();
            total++;
            xhttp.onreadystatechange = () => {
                if (xhttp.status == 404 || xhttp.status == 403 || xhttp.status == 400) {
                    reject("Invalid Response");
                }
                if (xhttp.readyState == 4 && xhttp.status == 200) {
                    const worksObject: OpenLibraryData[] = [];
                    worksObject[i] = JSON.parse(xhttp.responseText);
                    if (i == total - 1) {
                        resolve([bookObject, authorObject, worksObject]);
                    }
                }
            };
        }
    });
}

/**
 * @description Runs in the event of a new entry being created. It takes the information from Open Library and loads it onto the page.
 * @param {Boolean} noISBN A boolean representing whether or not the book had an ISBN number when we searched for it.
 * @param {Object} bookObject The book object from Open Library.
 * @param {Object} authorObject The author object from Open Library.
 * @param {Object} worksObject The works object from Open Library.
 */
function loadDataOnToEditEntryPage(
    noISBN: boolean,
    bookObject: OpenLibraryData = {},
    authorObject: OpenLibraryData[] = [],
    worksObject: OpenLibraryData[] = []
) {
    (document.getElementById("barcode") as HTMLInputElement).innerHTML = "Not Assigned";
    if (noISBN) {
        return;
    }

    // Title
    try {
        (document.getElementById("book-title") as HTMLInputElement).value = String(bookObject.title ?? "");
    } catch {
        console.error("The book doesn't have a title????? Something is wrong.");
        console.log(bookObject);
    }

    // Subtitle
    try {
        (document.getElementById("book-subtitle") as HTMLInputElement).value = String(bookObject.subtitle ?? "");
    } catch {
        console.log("No subtitle found");
        console.log(bookObject);
    }

    // Author
    try {
        for (let i = 0; i < authorObject.length; i++) {
            const fullName = authorObject[i].name as string;
            const lastName = fullName.substring(fullName.lastIndexOf(" ") + 1, fullName.length);
            const firstName = fullName.substring(0, fullName.lastIndexOf(" "));
            (document.getElementById("#book-author-" + (i + 1) + "-last") as HTMLInputElement).value = lastName;
            (document.getElementById("#book-author-" + (i + 1) + "-first") as HTMLInputElement).value = firstName;
        }
    } catch {
        console.error("The book doesn't have an author?");
        console.log(bookObject);
        console.log(authorObject);
    }

    // Medium - Only looks at the first work (if there are multiple)
    try {
        if (bookObject.physical_format == "paperback") {
            (document.querySelector("book-medium") as HTMLInputElement).value = "Paperback";
        } else if (bookObject.physical_format == "hardcover") {
            (document.querySelector("book-medium") as HTMLInputElement).value = "Hardcover";
        }
    } catch {
        console.log("The book object did not have a medium. Falling back to the works object.");
        try {
            if (worksObject[0].physical_format == "paperback") {
                (document.querySelector("book-medium") as HTMLInputElement).value = "Paperback";
            } else if (worksObject[0].physical_format == "hardcover") {
                (document.querySelector("book-medium") as HTMLInputElement).value = "Hardcover";
            }
        } catch {
            console.warn("Neither source had a medium for this book.");
            console.log(bookObject);
            console.log(worksObject);
        }
    }

    // Cover
    // THIS DOES NOT STORE IT IN STORAGE - That happens when they click save
    try {
        document
            .getElementById("book-cover-image")
            ?.setAttribute(
                "src",
                String("https://covers.openlibrary.org/b/id/" + (bookObject.covers as string[])[0] + "-L.jpg")
            );
        imageChanged = true;
    } catch {
        try {
            document
                .getElementById("book-cover-image")
                ?.setAttribute(
                    "src",
                    String("https://covers.openlibrary.org/b/id/" + (worksObject[0].covers as string[])[0] + "-L.jpg")
                );
            imageChanged = true;
        } catch {
            console.warn("A cover could not be found for either the book or the work");
            console.log(bookObject);
            console.log(worksObject);
        }
    }

    // Subject
    try {
        for (let i = 0; i < (bookObject.subjects as string[]).length; i++) {
            addSubject();
            (document.querySelector("#book-subject-" + (i + 1)) as HTMLInputElement).value = (bookObject.subjects as string[])[i];
        }
    } catch {
        console.log("The books object did not have any subjects. Falling back to the works object");
        try {
            for (let i = 0; i < (worksObject[0].subjects as string[]).length; i++) {
                addSubject();
                (document.querySelector("#book-subject-" + (i + 1)) as HTMLInputElement).value = (
                    worksObject[0].subjects as string[]
                )[i];
            }
        } catch {
            console.warn("Neither source had subjects for this book.");
            console.log(bookObject);
            console.log(worksObject);
        }
    }

    // Description - Only gets the description from the first work (if there are multiple)
    try {
        (document.querySelector("book-description") as HTMLInputElement).value = (
            worksObject[0].description as { value: string }
        ).value;
    } catch {
        console.log("The works object did not have a description. Falling back to the book object.");
        try {
            (document.querySelector("book-description") as HTMLInputElement).value = (bookObject.description as { value: string }).value;
        } catch {
            console.warn("Neither source had a description for this book.");
            console.log(bookObject);
            console.log(worksObject);
        }
    }

    // Audience???? I have yet to see this in an open library object, so I'm not including it

    // ISBN 10 Number
    if (isbn.length == 10) {
        (document.getElementById("book-isbn-10") as HTMLInputElement).value = isbn;
    } else {
        (document.getElementById("book-isbn-10") as HTMLInputElement).value = switchISBNformats(isbn);
    }

    // ISBN 13 Number
    if (isbn.length == 13) {
        (document.getElementById("book-isbn-13") as HTMLInputElement).value = isbn;
    } else {
        (document.getElementById("book-isbn-13") as HTMLInputElement).value = switchISBNformats(isbn);
    }

    // Publisher
    try {
        for (let i = 0; i < (bookObject.publishers as string[]).length; i++) {
            if (i > 1) {
                console.warn("A publisher was cut off because there was only two input boxes.");
                return;
            }
            (document.querySelector("#book-publisher-" + (i + 1)) as HTMLInputElement).value = (bookObject.publishers as string[])[i];
        }
    } catch {
        console.log("The books object did not have any publishers. Falling back to the works object");
        try {
            for (let i = 0; i < (worksObject[0].publishers as string[]).length; i++) {
                if (i > 1) {
                    console.warn("A publisher was cut off because there was only two input boxes.");
                    return;
                }
                (document.querySelector("#book-publisher-" + (i + 1)) as HTMLInputElement).value =
                    (worksObject[0].publishers as string[])[i];
            }
        } catch {
            console.warn("Neither source had publishers for this book.");
            console.log(bookObject);
            console.log(worksObject);
        }
    }

    // Publish Date:
    try {
        (document.getElementById("book-publish-year") as HTMLInputElement).value = "";
        const publish_date = bookObject.publish_date as string;
        if (publish_date.length == 4) {
            // We can assume that this is only a year.
            (document.getElementById("book-publish-year") as HTMLInputElement).value = publish_date;
        } else {
            let month = publish_date.substring(0, publish_date.indexOf(" "));
            const day = publish_date.substring(publish_date.indexOf(" ") + 1, publish_date.indexOf(","));
            const year = publish_date.substring(publish_date.indexOf(",") + 2, publish_date.length);
            switch (month) {
                case "Jan":
                case "January":
                    month = "1";
                    break;
                case "Feb":
                case "February":
                    month = "2";
                    break;
                case "Mar":
                case "March":
                    month = "3";
                    break;
                case "Apr":
                case "April":
                    month = "4";
                    break;
                case "May":
                    month = "5";
                    break;
                case "Jun":
                case "June":
                    month = "6";
                    break;
                case "Jul":
                case "July":
                    month = "7";
                    break;
                case "Aug":
                case "August":
                    month = "8";
                    break;
                case "Sep":
                case "September":
                    month = "9";
                    break;
                case "Oct":
                case "October":
                    month = "10";
                    break;
                case "Nov":
                case "November":
                    month = "11";
                    break;
                case "Dec":
                case "December":
                    month = "12";
                    break;

                default:
                    console.error("The month could not be detected");
                    month = "-1";
                    break;
            }
            (document.getElementById("book-publish-year") as HTMLInputElement).value = year;
            (document.getElementById("book-publish-month") as HTMLInputElement).value = month;
            (document.getElementById("book-publish-day") as HTMLInputElement).value = day;
        }
    } catch {
        const publish_date = worksObject[0].publish_date as string;
        try {
            if (publish_date.length == 4) {
                // We can assume that this is only a year.
                (document.getElementById("book-publish-year") as HTMLInputElement).value = publish_date;
            } else {
                let month = publish_date.substring(0, publish_date.indexOf(" "));
                const day = publish_date.substring(publish_date.indexOf(" ") + 1, publish_date.indexOf(","));
                const year = publish_date.substring(publish_date.indexOf(",") + 2, publish_date.length);
                switch (month) {
                    case "Jan":
                        month = "1";
                        break;
                    case "Feb":
                        month = "2";
                        break;
                    case "Mar":
                        month = "3";
                        break;
                    case "Apr":
                        month = "4";
                        break;
                    case "May":
                        month = "5";
                        break;
                    case "Jun":
                        month = "6";
                        break;
                    case "Jul":
                        month = "7";
                        break;
                    case "Aug":
                        month = "8";
                        break;
                    case "Sep":
                        month = "9";
                        break;
                    case "Oct":
                        month = "10";
                        break;
                    case "Nov":
                        month = "11";
                        break;
                    case "Dec":
                        month = "12";
                        break;

                    default:
                        console.error("The month could not be detected");
                        month = "-1";
                        break;
                }
                (document.getElementById("book-publish-year") as HTMLInputElement).value = year;
                (document.getElementById("book-publish-month") as HTMLInputElement).value = month;
                (document.getElementById("book-publish-day") as HTMLInputElement).value = day;
            }
        } catch {
            console.warn("Neither source had publish dates for this book.");
            console.log(bookObject);
            console.log(worksObject);
        }
    }

    // Number of Pages
    try {
        (document.getElementById("book-pages") as HTMLInputElement).value = bookObject.number_of_pages as string;
    } catch {
        try {
            (document.getElementById("book-pages") as HTMLInputElement).value = worksObject[0].number_of_pages as string;
        } catch {
            console.warn("Neither source had a number of pages for this book.");
            console.log(bookObject);
            console.log(worksObject);
        }
    }

    // Dewey Decimal Class
    // I don't see why there would be two, but in case there are, they will get put in the same input
    try {
        let ddcAnswer = "";
        const ddcArray = bookObject.dewey_decimal_class as string[];
        for (let i = 0; i < ddcArray.length; i++) {
            if (i > 0) {
                ddcAnswer += ", ";
            }
            ddcAnswer += ddcArray[i];
        }
        (document.getElementById("book-dewey") as HTMLInputElement).value = ddcAnswer;
    } catch {
        try {
            let ddcAnswer = "";
            const ddcArray = worksObject[0].dewey_decimal_class as string[];
            for (let i = 0; i < ddcArray.length; i++) {
                if (i > 0) {
                    ddcAnswer += " ";
                }
                ddcAnswer += ddcArray[i];
            }
            (document.getElementById("book-dewey") as HTMLInputElement).value = ddcAnswer;
        } catch {
            console.warn("Neither source had a DDC for this book.");
            console.log(bookObject);
            console.log(worksObject);
        }
    }
    // It's new, so we can hide this
    (document.getElementById("last-updated") as HTMLElement).style.display = "none";
}

/**
 * @description Adds a new subject input field to the page.
 */
function addSubject() {
    const numberofSubjects = (document.querySelectorAll(".subject-field") as NodeListOf<HTMLInputElement>).length;
    (document.querySelector("#book-subject-" + numberofSubjects) as Element).insertAdjacentHTML(
        "afterend",
        '<input id="book-subject-' +
            (numberofSubjects + 1) +
            '" placeholder="" class="normal-form-input subject-field">'
    );
}

let loadingTimer: number | undefined;
let loadingModal: () => void = () => {};
/**
 * @description Run when the user clicks the "Save" button. Saves the changes made to the entry. It will also validate the entry before saving.
 */
function editEntry() {
    // Prevent the user from clicking the "Save" button again
    (document.getElementById("edit-entry-save")! as HTMLButtonElement).disabled = true;
    // Start the loading modal
    loadingModal = openModal("info", "Saving your changes...", "Loading...", "");
    // If an error occurs somewhere in this process, tell the user after 10 seconds
    loadingTimer = window.setTimeout(() => {
        (document.getElementById("edit-entry-save")! as HTMLButtonElement).disabled = false;
        loadingModal();
        openModal(
            "issue",
            "We did not complete the upload process in 10 seconds. An error has likely occurred. Your changes may not have been saved."
        );
    }, 10000);

    // Before validating the entry, auto convert between ISBN numbers if both are not already inputted.
    const isbn10Value = (document.getElementById("book-isbn-10") as HTMLInputElement).value;
    const isbn13Value = (document.getElementById("book-isbn-13") as HTMLInputElement).value;
    const noISBN = (document.getElementById("book-no-isbn")! as HTMLInputElement).checked;
    if (!noISBN && isbn10Value.length == 10 && isbn13Value == "") {
        (document.getElementById("book-isbn-13") as HTMLInputElement).value = switchISBNformats(isbn10Value);
    } else if (!noISBN && isbn13Value.length == 13 && isbn10Value == "") {
        (document.getElementById("book-isbn-10") as HTMLInputElement).value = switchISBNformats(isbn13Value);
    }

    validateEntry()
        .then((valid) => {
            // If the entry is invalid, stop the timer and put the page back to normal
            if (valid == false || valid == null) {
                window.clearTimeout(loadingTimer);
                (document.getElementById("edit-entry-save")! as HTMLButtonElement).disabled = false;
                loadingModal();
                return;
            }

            // If the image hasn't been changed, and the entry isn't new, skip the cover image upload
            if (!newEntry && !imageChanged) {
                console.log("Image hasn't been changed, so we're skipping the upload.");
                storeData(false, true);
                return;
            }

            storeData();
        })
        .catch((error) => {
            openModal("error", "There was an error validating the entry. Your changes have not been saved.\n" + error);
            console.error(error);
            window.clearTimeout(loadingTimer);
            (document.getElementById("edit-entry-save")! as HTMLButtonElement).disabled = false;
            loadingModal();
            return;
        });
}

/**
 * @description Gets the values of all the input elements and returns them as a Book object.
 * @returns {Book} The book object that was created from the input elements.
 */
function getBookDataFromPage() {
    let barcode: number | null = parseInt(findURLValue(window.location.search, "id"));
    if (isNaN(barcode)) {
        barcode = null;
    }

    const authors = [];
    if (
        (document.getElementById("book-author-1-last") as HTMLInputElement).value ||
        (document.getElementById("book-author-1-first") as HTMLInputElement).value
    ) {
        authors.push(
            new Person(
                (document.getElementById("book-author-1-first") as HTMLInputElement).value,
                (document.getElementById("book-author-1-last") as HTMLInputElement).value
            )
        );
    }
    if (
        (document.getElementById("book-author-2-last") as HTMLInputElement).value ||
        (document.getElementById("book-author-2-first") as HTMLInputElement).value
    ) {
        authors.push(
            new Person(
                (document.getElementById("book-author-2-first") as HTMLInputElement).value,
                (document.getElementById("book-author-2-last") as HTMLInputElement).value
            )
        );
    }

    const illustrators = [];
    if (
        (document.getElementById("book-illustrator-1-last") as HTMLInputElement).value ||
        (document.getElementById("book-illustrator-1-first") as HTMLInputElement).value
    ) {
        illustrators.push(
            new Person(
                (document.getElementById("book-illustrator-1-first") as HTMLInputElement).value,
                (document.getElementById("book-illustrator-1-last") as HTMLInputElement).value
            )
        );
    }
    if (
        (document.getElementById("book-illustrator-2-last") as HTMLInputElement).value ||
        (document.getElementById("book-illustrator-2-first") as HTMLInputElement).value
    ) {
        illustrators.push(
            new Person(
                (document.getElementById("book-illustrator-2-first") as HTMLInputElement).value,
                (document.getElementById("book-illustrator-2-last") as HTMLInputElement).value
            )
        );
    }

    const subjects: string[] = [];
    document.querySelectorAll("[id^=book-subject-]").forEach((input) => {
        if ((input as HTMLInputElement).value != "") subjects.push((input as HTMLInputElement).value);
    });

    const publishers = [];
    if ((document.getElementById("book-publisher-1") as HTMLInputElement).value) {
        publishers.push((document.getElementById("book-publisher-1") as HTMLInputElement).value);
    }
    if ((document.getElementById("book-publisher-2") as HTMLInputElement).value) {
        publishers.push((document.getElementById("book-publisher-2") as HTMLInputElement).value);
    }

    // Create a list of keywords from the description
    let keywords = (document.getElementById("book-description") as HTMLInputElement).value
        .replace(/-/g, " ")
        .split(" ");
    keywords = cleanUpSearchTerm(keywords);

    const unNumbered = (document.getElementById("book-unnumbered")! as HTMLInputElement).checked;
    let numberOfPages = parseInt((document.getElementById("book-pages") as HTMLInputElement).value);
    if (unNumbered) {
        numberOfPages = -1;
    }

    let publishDate = null;
    const publishYearValue = (document.getElementById("book-publish-year") as HTMLInputElement).value;
    const publishMonthValue = (document.getElementById("book-publish-month") as HTMLInputElement).value;
    const publishDayValue = (document.getElementById("book-publish-day") as HTMLInputElement).value;
    if (!isValidDate(publishYearValue, publishMonthValue, publishDayValue)) {
        if (publishYearValue != "")
            console.warn("Invalid publish date: " + publishYearValue + "-" + publishMonthValue + "-" + publishDayValue);
    } else if (publishMonthValue != "" && publishDayValue != "") {
        publishDate = new Date(Number(publishYearValue), Number(publishMonthValue) - 1, Number(publishDayValue));
    } else if (publishMonthValue != "") {
        publishDate = new Date(Number(publishYearValue), Number(publishMonthValue) - 1);
    } else if (publishYearValue != "") {
        publishDate = new Date(Number(publishYearValue));
    }
    if (publishDate) {
        publishDate = convertToUTC(publishDate);
    }

    let purchaseDate = null;
    const purchaseYearValue = (document.getElementById("book-purchase-year") as HTMLInputElement).value;
    const purchaseMonthValue = (document.getElementById("book-purchase-month") as HTMLInputElement).value;
    const purchaseDayValue = (document.getElementById("book-purchase-day") as HTMLInputElement).value;
    if (!isValidDate(purchaseYearValue, purchaseMonthValue, purchaseDayValue)) {
        if (purchaseYearValue != "")
            console.warn(
                "Invalid purchase date: " + purchaseYearValue + "-" + purchaseMonthValue + "-" + purchaseDayValue
            );
    } else if (purchaseMonthValue != "" && purchaseDayValue != "") {
        purchaseDate = new Date(Number(purchaseYearValue), Number(purchaseMonthValue) - 1, Number(purchaseDayValue));
    } else if (purchaseMonthValue != "") {
        purchaseDate = new Date(Number(purchaseYearValue), Number(purchaseMonthValue) - 1);
    } else if (purchaseYearValue != "") {
        purchaseDate = new Date(Number(purchaseYearValue));
    }
    if (purchaseDate) {
        purchaseDate = convertToUTC(purchaseDate);
    }

    const purchasePriceRaw = (document.getElementById("book-purchase-price") as HTMLInputElement).value;
    const purchasePrice = purchasePriceRaw === "" ? null : parseFloat(purchasePriceRaw);

    /*  This WON'T have the image links, because that is generated by the Book class when requested
        It also WON'T have a value for isDeleted, since that's not on the page
        these will be added when the data is stored in the database
        lastUpdated will be created when this function is called*/
    const bookDataFromPage = new Book(
        barcode,
        (document.getElementById("book-title") as HTMLInputElement).value,
        (document.getElementById("book-subtitle") as HTMLInputElement).value,
        authors,
        illustrators,
        (document.getElementById("book-medium")! as HTMLSelectElement).value,
        null,
        null,
        null,
        subjects,
        (document.getElementById("book-description") as HTMLInputElement).value,
        new Audience(
            (document.getElementById("book-audience-children")! as HTMLInputElement).checked,
            (document.getElementById("book-audience-youth")! as HTMLInputElement).checked,
            (document.getElementById("book-audience-adult")! as HTMLInputElement).checked
        ),
        (document.getElementById("book-isbn-10") as HTMLInputElement).value,
        (document.getElementById("book-isbn-13") as HTMLInputElement).value,
        publishers,
        publishDate,
        numberOfPages,
        (document.getElementById("book-dewey") as HTMLInputElement).value,
        purchaseDate,
        Number.isNaN(purchasePrice) ? null : purchasePrice,
        (document.getElementById("book-vendor") as HTMLInputElement).value,
        keywords,
        !!(document.getElementById("book-can-be-checked-out")! as HTMLInputElement).value,
        null,
        !!(document.getElementById("book-is-hidden")! as HTMLInputElement).value,
        new Date()
    );
    return bookDataFromPage;
}

/**
 * @description Validates the entry on the page. Calls getBookDataFromPage() to get the data from the page.
 * @returns {Promise<Boolean>} Resolves when the entry is validated. Resolves true if the entry is valid, false otherwise.
 */
function validateEntry(): Promise<boolean> {
    return new Promise((resolve) => {
        const pageData = getBookDataFromPage();

        const noneValue = (document.getElementById("book-audience-none")! as HTMLInputElement).checked;
        const noISBN = (document.getElementById("book-no-isbn")! as HTMLInputElement).checked;
        const unNumbered = (document.getElementById("book-unnumbered")! as HTMLInputElement).checked;

        // Validate inputs
        if (pageData.title == "") {
            openModal("issue", "Title is required!");
            const target = document.getElementById("book-title") as HTMLInputElement;
            const rect = target.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            target.style.borderColor = "red";
            setTimeout(() => {
                target.focus();
            }, 800);
            target.onkeydown = () => {
                target.style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.medium != "av" && pageData.authors[0].lastName == "" && pageData.authors[0].firstName == "") {
            openModal(
                "issue",
                'At least one author is required! If author is unknown, enter "unknown" into last name.'
            );
            const authorLast = document.getElementById("book-author-1-last") as HTMLInputElement;
            const authorFirst = document.getElementById("book-author-1-first") as HTMLInputElement;
            const rect = authorLast.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            authorLast.style.borderColor = "red";
            authorFirst.style.borderColor = "red";
            setTimeout(() => {
                authorLast.focus();
            }, 800);
            authorLast.onkeydown = () => {
                authorLast.style.borderColor = "";
                authorFirst.style.borderColor = "";
            };
            authorFirst.onkeydown = () => {
                authorLast.style.borderColor = "";
                authorFirst.style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.medium == "") {
            openModal("issue", "Medium is required!");
            const target = document.getElementById("book-medium") as HTMLSelectElement;
            const rect = target.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            target.style.borderColor = "red";
            setTimeout(() => {
                target.focus();
            }, 800);
            target.onclick = () => {
                target.style.borderColor = "";
            };
            resolve(false);
            return;
        }
        // The pageData.coverImageLink will now be null during this check, so we'll read it off the page manually
        if (
            document.getElementById("book-cover-image")?.getAttribute("src") == "../img/favicon.ico" &&
            pageData.medium != "av"
        ) {
            openModal("issue", "Cover image is required!");
            const target = document.getElementById("book-cover-image") as HTMLImageElement;
            const rect = target.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            target.style.boxShadow = "0px 0px 16px 0px #ff00008a";
            setTimeout(() => {
                target.focus();
            }, 800);
            target.onkeydown = () => {
                target.style.boxShadow = "0px 0px 16px 0px #aaaaaa4a";
            };
            resolve(false);
            return;
        }
        if ((!pageData.subjects || pageData.subjects.length == 0) && pageData.medium != "av") {
            openModal("issue", "Please enter at least one subject!");
            const target = document.getElementById("book-subject-1") as HTMLInputElement;
            const rect = target.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            target.style.borderColor = "red";
            setTimeout(() => {
                target.focus();
            }, 800);
            target.onkeydown = () => {
                target.style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.description == "" && pageData.medium != "av") {
            openModal("issue", "Description is required!");
            const target = document.getElementById("book-description") as HTMLInputElement;
            const rect = target.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            target.style.borderColor = "red";
            setTimeout(() => {
                target.focus();
            }, 800);
            target.onkeydown = () => {
                target.style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (
            !pageData.audience ||
            (!pageData.audience.children && !pageData.audience.youth && !pageData.audience.adult && !noneValue) ||
            (noneValue && (pageData.audience.children || pageData.audience.youth || pageData.audience.adult))
        ) {
            openModal(
                "issue",
                'Invalid audience input! If there is no audience listed, please select "None" (and no other checkboxes).'
            );
            const audChildren = document.getElementById("book-audience-children") as HTMLInputElement;
            const audYouth = document.getElementById("book-audience-youth") as HTMLInputElement;
            const audAdult = document.getElementById("book-audience-adult") as HTMLInputElement;
            const audNone = document.getElementById("book-audience-none") as HTMLInputElement;
            const rect = audChildren.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            audChildren.style.outline = "2px solid red";
            audYouth.style.outline = "2px solid red";
            audAdult.style.outline = "2px solid red";
            audNone.style.outline = "2px solid red";
            setTimeout(() => {
                audChildren.focus();
            }, 800);
            audChildren.onkeydown = () => {
                audChildren.style.outline = "";
                audYouth.style.outline = "";
                audAdult.style.outline = "";
                audNone.style.outline = "";
            };
            resolve(false);
            return;
        }
        if (!noISBN && (!pageData.isbn10 || !verifyISBN(pageData.isbn10) || pageData.isbn10.length != 10)) {
            openModal("issue", "The ISBN number you entered was not valid! Please double check it.");
            const target = document.getElementById("book-isbn-10") as HTMLInputElement;
            const rect = target.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            target.style.borderColor = "red";
            setTimeout(() => {
                target.focus();
            }, 800);
            target.onkeydown = () => {
                target.style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (!noISBN && (!pageData.isbn13 || !verifyISBN(pageData.isbn13) || pageData.isbn13.length != 13)) {
            openModal("issue", "The ISBN number you entered was not valid! Please double check it.");
            const target = document.getElementById("book-isbn-13") as HTMLInputElement;
            const rect = target.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            target.style.borderColor = "red";
            setTimeout(() => {
                target.focus();
            }, 800);
            target.onkeydown = () => {
                target.style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.isbn13 && pageData.isbn10 && pageData.isbn13.length == 13 && pageData.isbn10.length == 10) {
            if (pageData.isbn13.substring(3, 12) != pageData.isbn10.substring(0, 9)) {
                openModal("issue", "The ISBN numbers you entered do not match! Please double check them.");
                const isbn10Target = document.getElementById("book-isbn-10") as HTMLInputElement;
                const isbn13Target = document.getElementById("book-isbn-13") as HTMLInputElement;
                const rect = isbn10Target.getBoundingClientRect();
                window.scrollBy(0, rect.top - 180);
                isbn10Target.style.borderColor = "red";
                isbn13Target.style.borderColor = "red";
                setTimeout(() => {
                    isbn10Target.focus();
                }, 800);
                isbn10Target.onkeydown = () => {
                    isbn10Target.style.borderColor = "";
                    isbn13Target.style.borderColor = "";
                };
                isbn13Target.onkeydown = () => {
                    isbn10Target.style.borderColor = "";
                    isbn13Target.style.borderColor = "";
                };
                resolve(false);
                return;
            }
        }
        if ((!pageData.publishers || pageData.publishers[0] == "") && pageData.medium != "av") {
            openModal("issue", 'Please enter at least one publisher! If the publisher is unknown, enter "unknown".');
            const target = document.getElementById("book-publisher-1") as HTMLInputElement;
            const rect = target.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            target.style.borderColor = "red";
            setTimeout(() => {
                target.focus();
            }, 800);
            target.onkeydown = () => {
                target.style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (!(pageData.publishDate && pageData.publishDate instanceof Date) && pageData.medium != "av") {
            openModal(
                "issue",
                "The publishing date is invalid! Please enter a valid date between October 17, 1711 and today."
            );
            const pubMonth = document.getElementById("book-publish-month") as HTMLInputElement;
            const pubDay = document.getElementById("book-publish-day") as HTMLInputElement;
            const pubYear = document.getElementById("book-publish-year") as HTMLInputElement;
            const rect = pubMonth.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            pubMonth.style.borderColor = "red";
            pubDay.style.borderColor = "red";
            pubYear.style.borderColor = "red";
            setTimeout(() => {
                pubMonth.focus();
            }, 800);
            pubMonth.onkeydown = () => {
                pubMonth.style.borderColor = "";
                pubDay.style.borderColor = "";
                pubYear.style.borderColor = "";
            };
            pubDay.onkeydown = () => {
                pubMonth.style.borderColor = "";
                pubDay.style.borderColor = "";
                pubYear.style.borderColor = "";
            };
            pubYear.onkeydown = () => {
                pubMonth.style.borderColor = "";
                pubDay.style.borderColor = "";
                pubYear.style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (
            !unNumbered &&
            (pageData.numberOfPages == null || isNaN(pageData.numberOfPages) || pageData.numberOfPages < 1)
        ) {
            openModal("issue", "Please enter a valid number of pages!");
            const target = document.getElementById("book-pages") as HTMLInputElement;
            const rect = target.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            target.style.borderColor = "red";
            setTimeout(() => {
                target.focus();
            }, 800);
            target.onkeydown = () => {
                target.style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (!pageData.ddc || pageData.ddc == "" || (pageData.ddc != "FIC" && isNaN(parseFloat(pageData.ddc)))) {
            openModal("issue", "Please enter a valid Dewey Decimal Classification!");
            const target = document.getElementById("book-dewey") as HTMLInputElement;
            const rect = target.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            target.style.borderColor = "red";
            setTimeout(() => {
                target.focus();
            }, 800);
            target.onkeydown = () => {
                target.style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.purchaseDate && !(pageData.purchaseDate instanceof Date)) {
            openModal(
                "issue",
                "The purchasing date is invalid! Please enter a valid date between October 17, 1711 and today."
            );
            const purMonth = document.getElementById("book-purchase-month") as HTMLInputElement;
            const purDay = document.getElementById("book-purchase-day") as HTMLInputElement;
            const purYear = document.getElementById("book-purchase-year") as HTMLInputElement;
            const rect = purMonth.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            purMonth.style.borderColor = "red";
            purDay.style.borderColor = "red";
            purYear.style.borderColor = "red";
            setTimeout(() => {
                purMonth.focus();
            }, 800);
            purMonth.onkeydown = () => {
                purMonth.style.borderColor = "";
                purDay.style.borderColor = "";
                purYear.style.borderColor = "";
            };
            purDay.onkeydown = () => {
                purMonth.style.borderColor = "";
                purDay.style.borderColor = "";
                purYear.style.borderColor = "";
            };
            purYear.onkeydown = () => {
                purMonth.style.borderColor = "";
                purDay.style.borderColor = "";
                purYear.style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.purchasePrice != null && (isNaN(pageData.purchasePrice) || pageData.purchasePrice < 0)) {
            openModal("issue", "Please enter a valid purchase price!");
            const target = document.getElementById("book-purchase-price") as HTMLInputElement;
            const rect = target.getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            target.style.borderColor = "red";
            setTimeout(() => {
                target.focus();
            }, 800);
            target.onkeydown = () => {
                target.style.borderColor = "";
            };
            resolve(false);
            return;
        }

        // If we made it all the way through the list, then we must have a valid entry.
        resolve(true);
    });
}

/**
 * @description Checks if a date is valid.
 * @param {String} y The year.
 * @param {String} m The month.
 * @param {String} d The day.
 * @returns {Boolean} True if the date is valid, false otherwise.
 */
function isValidDate(y: string | number, m: string | number, d: string | number): boolean {
    const year = parseInt(y.toString());
    if (isNaN(year)) return false;
    if (year < 100) return false;
    const month = parseInt(m.toString()) - 1;
    if (isNaN(month) && m != "") return false;
    const day = parseInt(d.toString());
    if (isNaN(day) && d != "") return false;
    if (m == "" && d != "") return false;
    if ((month > 11 || month < 0) && m != "") return false;
    if ((day > 31 || day < 1) && d != "") return false;
    if (day == 31 && (month == 3 || month == 5 || month == 8 || month == 10)) return false;
    if (month == 1 && day > 29) return false;
    if ((year % 4 != 0 || (year % 100 == 0 && year % 400 != 0)) && month == 1 && day == 29) return false;
    let date;
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) date = new Date(year, month, day);
    else if (!isNaN(year) && !isNaN(month)) date = new Date(year, month);
    else date = new Date(year);
    if (date.getTime() > Date.now()) return false;
    const founded = new Date(1711, 9, 17);
    if (date.getTime() < founded.getTime()) return false;
    return true;
}

/**
 * @description This function goes through the process of actually storing the data in the database.
 * @param {Boolean} isDeletedValue Represents if the book is about to be deleted or not.
 * @param {Boolean} skipImages Represents if the image upload process should be skipped or not.
 * @returns {Promise<void>} A Promise that resolves when the data is stored.
 */
function storeData(isDeletedValue = false, skipImages = false): Promise<void> {
    return new Promise((resolve, reject) => {
        // Gets the values of all the input elements
        let pageData = getBookDataFromPage();
        if (pageData.medium == "av") {
            skipImages = true;
        }

        // Defines the paths of the the database collection
        const booksPath = collection(db, "books");

        // If this is not a new entry, so update the existing entry using the known barcode number
        if (!newEntry) {
            let bookNumber = (pageData.barcodeNumber ?? barcodeNumber) - 1171100000;
            const bookDocument = Math.floor(bookNumber / 100)
                .toString()
                .padStart(3, "0");
            bookNumber = bookNumber % 100;

            // If the book is being deleted, set the deleted value to true
            if (isDeletedValue) {
                pageData.isDeleted = true;
            } else {
                pageData.isDeleted = false;
            }

            // Updates the book with the information
            runTransaction(db, (transaction) => {
                const path = doc(booksPath, bookDocument);
                return transaction.get(path).then((docSnap) => {
                    if (!docSnap.exists()) {
                        throw "There was a large problem because the books doc doesn't exist anymore...";
                    }

                    // Get the existing list of books
                    const existingBooks = docSnap.data().books;
                    const currentBook = Book.createFromObject(existingBooks[bookNumber]);

                    let imageUploadPromise;
                    if (currentBook.coverImageLink || !skipImages) {
                        pageData.generateImageLinks();
                    }
                    if (!skipImages) {
                        imageUploadPromise = processImages(pageData.barcodeNumber ?? barcodeNumber);
                    } else {
                        imageUploadPromise = Promise.resolve(undefined);
                    }

                    // Update the array with the new book information.
                    existingBooks[bookNumber] = pageData.toObject();

                    // Update the book
                    return imageUploadPromise.then(() => {
                        transaction.update(path, {
                            books: existingBooks
                        });
                        resolve(undefined);
                    });
                });
            })
                .then(() => {
                    console.log("Transaction completed successfully");
                })
                .catch((error) => {
                    console.error("Error updating book with transaction: ", error);
                    reject(error);
                });
        } else {
            // Create a new entry from scratch and get a new barcode number
            // Run a Transaction to ensure that the correct barcode is used.
            // First, get the highest barcode number by loading the largest book document.
            return getDocs(
                query(collection(db, "books"), where("order", ">=", 0), orderBy("order", "desc"), limit(1))
            ).then((querySnapshot) => {
                let topDoc: QueryDocumentSnapshot | undefined;
                querySnapshot.forEach((docSnap) => {
                    if (!docSnap.exists()) {
                        throw "The books document doesn't exist";
                    }
                    topDoc = docSnap;
                });

                if (!topDoc) {
                    throw "The books document doesn't exist";
                }

                // Now that we have the highest document, we can get that document and create a new book within it.
                return runTransaction(db, (transaction) => {
                    return transaction.get(doc(db, "books", topDoc!.id)).then((docSnap) => {
                        if (!docSnap.exists()) {
                            throw "Document does not exist!";
                        }

                        let order = docSnap.data().order;
                        const numBooksInDoc = docSnap.data().books.length;

                        // Let's make sure that there isn't another doc that has been created after this one already.
                        try {
                            const next = (order + 1).toString().padStart(3, "0");
                            getDoc(doc(db, "books", next))
                                .then((docSnap) => {
                                    if (docSnap.exists()) {
                                        console.error("A new book doc was created, it shouldn't have been, so abort!");
                                        openModal(
                                            "error",
                                            "Please stop adding books and contact the developers of the site.",
                                            "Database Error"
                                        );
                                        throw "Something went wrong.";
                                    }
                                })
                                .catch((err) => {
                                    console.log(
                                        err,
                                        "Hopefully the line before doesn't say that something went wrong.... If it didn't, the next document doesn't exist, which is a good thing."
                                    );
                                });
                        } catch {
                            console.warn("Something about the try catch failed....");
                        }

                        if (numBooksInDoc == 100) {
                            // A new book doc has to be created...
                            const newNumber = (order + 1).toString().padStart(3, "0");
                            const barcode = "11711" + newNumber + "00";

                            (document.getElementById("barcode") as HTMLInputElement).innerHTML =
                                addBarcodeSpacing(barcode);
                            pageData = getBookDataFromPage();
                            pageData.barcodeNumber = parseInt(barcode);

                            if (skipImages) {
                                transaction.set(doc(db, "books", newNumber), {
                                    books: [pageData.toObject()],
                                    order: order + 1
                                });
                                return barcode;
                            }

                            pageData.generateImageLinks();
                            return processImages(parseInt(barcode))
                                .then(() => {
                                    transaction.set(doc(db, "books", newNumber), {
                                        books: [pageData.toObject()],
                                        order: order + 1
                                    });
                                    return barcode;
                                })
                                .catch((err) => {
                                    console.error("Error processing images: ", err);
                                    reject(err);
                                });
                        } else {
                            // We don't need to add a new book doc, so just add the book to the existing one.
                            order = order.toString().padStart(3, "0");

                            let barcode;
                            if (numBooksInDoc < 10) {
                                barcode = "11711" + order + "0" + numBooksInDoc;
                            } else {
                                barcode = "11711" + order + numBooksInDoc;
                            }

                            (document.getElementById("barcode") as HTMLInputElement).innerHTML =
                                addBarcodeSpacing(barcode);
                            pageData = getBookDataFromPage();
                            pageData.barcodeNumber = parseInt(barcode);

                            if (skipImages) {
                                transaction.update(doc(db, "books", order), {
                                    books: arrayUnion(pageData.toObject())
                                });
                                return barcode;
                            }

                            pageData.generateImageLinks();
                            return processImages(parseInt(barcode))
                                .then(() => {
                                    transaction.update(doc(db, "books", order), {
                                        books: arrayUnion(pageData.toObject())
                                    });
                                    return barcode;
                                })
                                .catch((err) => {
                                    console.error("Error processing images: ", err);
                                    reject(err);
                                });
                        }
                    });
                }).then((newBarcode) => {
                    // After both writes complete, send the user to the edit page and take it from there.
                    if (newBarcode) {
                        console.log("New Entry Created with barcode: " + newBarcode);
                        openModal(
                            "success",
                            "Please take note of your new barcode number: " + newBarcode,
                            "New Book Created!"
                        );
                        resolve(newBarcode);
                    } else {
                        reject("No barcode was returned from the transaction.");
                    }
                });
            });
        }
    })
        .then(() => {
            (window as unknown as { removeEventListener: (type: string) => void }).removeEventListener("beforeunload");
            if (!newEntry) {
                openModal("success", "Edits were made successfully!");
            }
            setTimeLastSearched(null);
            // softBack("admin/main");
        })
        .catch(() => {
            openModal(
                "error",
                "An error has occurred, but we couldn't identify the problem. Your changes have not been saved."
            );
        })
        .finally(() => {
            loadingModal();
            clearTimeout(loadingTimer);
            (document.getElementById("edit-entry-save")! as HTMLButtonElement).disabled = false;
        });
}

/**
 * @description First, this function will get the image from an external source if needed.
 *              Then it will delete all of the old images from Firebase Storage.
 *              Finally, it will upload the new images to Firebase Storage and return the links.
 * @param {Number} barcodeNumber The barcode number of the book that we are saving images for.
 * @returns {Promise<Array<String>>} An promise representing the 3 image links
 */
function processImages(barcodeNumber: number): Promise<void> {
    return new Promise((resolve, reject) => {
        // Gets the current image (uploaded or from open library) and stores it to the file variable
        getImage()
            .then((fileReturn) => {
                // Clear out old images in Firebase Storage (if there are any)
                deleteOldImages(barcodeNumber)
                    .then(() => {
                        const promises = [];
                        promises[0] = uploadImageToStorage(barcodeNumber, "original", fileReturn!);
                        promises[1] = uploadImageToStorage(barcodeNumber, "thumbnail", fileReturn!);
                        promises[2] = uploadImageToStorage(barcodeNumber, "icon", fileReturn!);

                        Promise.all(promises)
                            .then(() => {
                                resolve(undefined);
                            })
                            .catch((error) => {
                                reject(error);
                            });
                    })
                    .catch((error) => {
                        reject(error);
                    });
            })
            .catch((error) => {
                openModal(
                    "error",
                    "There was an error uploading the images for this book. Your changes have not been saved.\n" + error
                );
                console.error(error);
                window.clearTimeout(loadingTimer);
                (document.getElementById("edit-entry-save")! as HTMLButtonElement).disabled = false;
                loadingModal();
                reject(error);
            });
    });
}

/**
 * @description This function will get the image from an external source if a new file wasn't uploaded by the user.
 * @returns {Promise<File>} A promise representing the image file
 */
function getImage(): Promise<File | null> {
    return new Promise((resolve, reject) => {
        if ((document.getElementById("book-medium")! as HTMLSelectElement).value == "av") {
            console.warn("No need to get an image for an AV item...");
            resolve(null);
            return;
        }
        // If we already have a new file that has been uploaded (either from this function, or from the user uploading a file),
        // we don't have to go get it again if we already have it
        if (file) {
            resolve(file);
        } else {
            const xhr = new XMLHttpRequest();
            xhr.open("GET", document.getElementById("book-cover-image")?.getAttribute("src") ?? "", true);
            xhr.responseType = "blob";
            xhr.onload = () => {
                if (xhr.status == 200) {
                    if (xhr.responseURL.substring(0, 5) != "https") {
                        openModal(
                            "error",
                            "This image was not able to be saved securely. Please download it from the internet, re-upload it on the edit entry page, and try again."
                        );
                        reject("Insecure Image URL");
                    }
                    file = xhr.response;
                    resolve(file);
                }

                if (xhr.readyState == 4 && xhr.status != 200) {
                    reject("Image Not Found. Please upload another image.");
                }
            };
            xhr.send();
        }
    });
}

/**
 * @description This function will delete the old images from Firebase Storage.
 * @param {Number} barcodeNumber The barcode number of the book that we are deleting images for.
 * @returns {Promise<void>} A promise representing the progress of the deletion of the images
 */
function deleteOldImages(barcodeNumber: number): Promise<void> {
    // Delete firebase storage images for the book that is being edited
    return new Promise((resolve, reject) => {
        const publicStorage = getStorage(app, "gs://south-church-library");
        list(ref(publicStorage, "books/" + barcodeNumber), { maxResults: 10 })
            .then((result) => {
                const promises: Promise<void>[] = [];
                result.items.forEach((image, index) => {
                    promises[index] = deleteObject(image);
                });

                Promise.all(promises)
                    .then(() => {
                        resolve(undefined);
                    })
                    .catch((error) => {
                        console.error(error);
                        reject(error);
                    });
            })
            .catch((error) => {
                console.error(error);
                reject(error);
            });
    });
}

/**
 * @description This function will handle the process of creating the 3 separate image sizes using the canvas element.
 * @param {Number} barcodeNumber The barcode number of the book that we are creating images for.
 * @param {String} type The type of image that we are creating (original, thumbnail, or icon)
 * @param {File} file The image file that we are creating the image sizes from
 * @returns {Promise<String|null>} A promise representing the link to the image
 */
function uploadImageToStorage(barcodeNumber: number, type = "original", file: File) {
    return new Promise<string | null>((resolve, reject) => {
        // AV images are stored as null
        if ((document.getElementById("book-medium")! as HTMLSelectElement).value == "av") {
            console.warn("No need to upload an image for an AV item...");
            resolve(null);
            return;
        }

        if (
            isNaN(barcodeNumber) ||
            barcodeNumber.toString().substring(0, 5) != "11711" ||
            barcodeNumber.toString().length != 10
        ) {
            reject("Invalid barcode number");
            return;
        }

        let maxHeight = 0;
        if (type == "original") {
            maxHeight = 1000;
        } else if (type == "thumbnail") {
            maxHeight = 400;
        } else if (type == "icon") {
            maxHeight = 250;
        } else {
            reject("Invalid image type");
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.id = type + "-canvas";
        (document.querySelector(".book-cover-image-container")! as HTMLDivElement).appendChild(canvas);

        const height = document.getElementById("book-cover-image")?.getBoundingClientRect().height;
        const width = document.getElementById("book-cover-image")?.getBoundingClientRect().width;
        const ratio = (height ?? 0) / (width ?? 1);

        // if (maxHeight && height > maxHeight) {
        //     height = maxHeight;
        // }

        (document.getElementById("#" + type + "-canvas")! as HTMLCanvasElement).height = maxHeight;
        (document.getElementById("#" + type + "-canvas")! as HTMLCanvasElement).width = Math.round(maxHeight / ratio);

        const ctx = (document.getElementById("#" + type + "-canvas")! as HTMLCanvasElement).getContext("2d");
        const image = new Image();
        image.setAttribute("crossorigin", "anonymous");
        image.onload = () => {
            if (!ctx) {
                reject("Canvas context is null");
                return;
            }
            ctx.drawImage(image, 0, 0, maxHeight / ratio, maxHeight);
            (document.getElementById("#" + type + "-canvas")! as HTMLCanvasElement).toBlob((blob) => {
                if (!blob) {
                    reject("Failed to create a blob from the canvas");
                    return;
                }
                if (!app) {
                    reject("Firebase app is not initialized");
                    return;
                }
                const file = new File([blob], "book" + type, { type: "image/jpeg" });

                const publicStorage = getStorage(app, "gs://south-church-library");
                let bookSpecificRef = ref(publicStorage, "books");
                if (type == "original") {
                    bookSpecificRef = ref(bookSpecificRef, barcodeNumber + "/cover.jpg");
                } else if (type == "thumbnail") {
                    bookSpecificRef = ref(bookSpecificRef, barcodeNumber + "/cover-400px.jpg");
                } else if (type == "icon") {
                    bookSpecificRef = ref(bookSpecificRef, barcodeNumber + "/cover-250px.jpg");
                } else {
                    reject(false);
                    return;
                }

                uploadBytes(bookSpecificRef, file, { contentType: "image/jpeg" }).then(() => {
                    console.log("Uploaded the file!");
                    (document.getElementById("#" + type + "-canvas")! as HTMLCanvasElement).remove();
                    resolve("success");
                });
            }, "image/jpeg");
        };
        image.src = URL.createObjectURL(file);
    }).catch((error) => {
        console.error(error);
    });
}

let file: File | null;

/**
 * @description When a user uploads a file, this function is called. It sets the value of file to the file that was uploaded.
 *              It displays the newly updated image using a blob URL.
 * @param {Event} event - The onchange event for the file input.
 */
function loadFile(event: Event) {
    const input = event.target as HTMLInputElement | null;
    const files = input?.files;
    if (!input || !files || files.length === 0) {
        console.error("No file was selected.");
        return;
    }
    const selectedFile = files[0];
    if (selectedFile) {
        file = selectedFile;
        const output = document.getElementById("book-cover-image")! as HTMLImageElement;
        output.src = URL.createObjectURL(file);
        // TODO: Figure out how to free memory after the image is uploaded, without breaking the canvas elements
        /* This is bad because then the canvas elements can't use the link
        output.onload = () => {
            URL.revokeObjectURL(output.src); // free memory
        };*/
        imageChanged = true;
    }
}

/**
 * @description This function will run when the user clicks the "Cancel" button.
 */
function cancelEditEntry() {
    (window as unknown as { removeEventListener: (type: string) => void }).removeEventListener("beforeunload");
    // softBack("admin/main");
}

/**
 * @description This function will run when the user clicks the "Delete" button on the modal.
 */
function deleteEntry() {
    if (newEntry) {
        openModal(
            "issue",
            "You can't delete a book that hasn't been saved yet. If you'd like to disregard this book, click the \"Cancel\" button."
        );
        return;
    }
    // Prevent the user from clicking the "Delete" button again
    // Start the loading modal
    loadingModal = openModal("info", "Deletion in progress...", "Loading...", "");
    // If an error occurs somewhere in this process, tell the user after 10 seconds
    loadingTimer = window.setTimeout(() => {
        (document.getElementById("edit-entry-save")! as HTMLButtonElement).disabled = false;
        loadingModal();
        openModal(
            "issue",
            "We did not complete the upload process in 10 seconds. An error has likely occurred. Your changes may not have been saved."
        );
    }, 10000);
    storeData(true, true);
}

/**
 * @description This function will clean up the keywords list by removing common words.
 * @param {Array<String>} searchArray An array of keywords to be cleaned up
 * @returns {Array<String>} The cleaned up array of keywords
 */
function cleanUpSearchTerm(searchArray: string[]) {
    // List of words to remove from the keywords list

    const meaninglessWords = [
        "the",
        "is",
        "it",
        "an",
        "to",
        "on",
        "a",
        "in",
        "than",
        "and",
        "as",
        "they'll",
        "also",
        "for",
        "more",
        "here",
        "with",
        "without",
        "within",
        "most",
        "about",
        "almost",
        "any",
        "at",
        "be",
        "but",
        "by",
        "can",
        "come",
        "could",
        "do",
        "else",
        "if",
        "few",
        "get",
        "go",
        "he",
        "she",
        "they",
        "them",
        "him",
        "her",
        "his",
        "hers",
        "theirs",
        "there",
        "i",
        "",
        "into",
        "it",
        "its",
        "itself",
        "let",
        "lots",
        "me",
        "much",
        "must",
        "my",
        "oh",
        "yes",
        "no",
        "none",
        "nor",
        "not",
        "now",
        "of",
        "ok",
        "or",
        "our",
        "out",
        "own",
        "per",
        "put",
        "say",
        "see",
        "set",
        "so",
        "some",
        "soon",
        "still",
        "stay",
        "such",
        "sure",
        "tell",
        "then",
        "that",
        "these",
        "thing",
        "this",
        "those",
        "too",
        "try",
        "us",
        "use",
        "we",
        "what",
        "where",
        "when",
        "why",
        "how",
        "who",
        "whom",
        "you",
        "your"
    ];
    // Iterate through each word
    for (let i = 0; i < searchArray.length; i++) {
        // Remove all punctuation and make it lowercase
        searchArray[i] = searchArray[i].replace(/-/g, " ");
        searchArray[i] = searchArray[i].replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        searchArray[i] = searchArray[i].toLowerCase();
        // Remove it from the list if it's meaningless
        if (meaninglessWords.includes(searchArray[i])) {
            searchArray.splice(i, 1);
            i--;
        }
    }
    return searchArray;
}

/**
 * @description Converts a date to UTC time by adding 5 hours to it.
 * @param {Date} date The date to convert to UTC
 * @returns {Date} A new date object with the converted date
 */
function convertToUTC(date: Date) {
    // TODO: Actually account for time shifts with Daylight Savings
    // console.log("The date that was just saved was: " + new Date(date.valueOf() + 1000 * 60 * 60 * 5));
    return new Date(date.valueOf() + 1000 * 60 * 60 * 5);
}
