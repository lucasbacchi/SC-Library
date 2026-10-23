import {
    arrayUnion,
    collection,
    doc,
    getDoc,
    getCountFromServer,
    getDocs,
    orderBy,
    query,
    setDoc,
    updateDoc,
    where,
    writeBatch
} from "firebase/firestore";
import {
    search,
    buildBookBox,
    findURLValue,
    verifyISBN,
    openModal,
    updateBookDatabase,
    formatDate,
    windowScroll,
    ignoreScroll,
    setIgnoreScroll,
    Throttle,
    createOnClick
} from "./common";
import {
    Book,
    bookDatabase,
    db,
    setBookDatabase,
    setCurrentHash,
    setTimeLastSearched,
    User,
    type BookDocument
} from "./globals";

/**
 * @description Sets up the main page for the admin including all the event listeners.
 */
export function setupAdminMain() {
    // Create an event listener for the search bar
    document.getElementById("edit-entry-input")?.addEventListener("keyup", (event) => {
        if (event.key === "Enter") {
            adminSearch();
            document.getElementById("edit-entry-input")?.dispatchEvent(new Event("blur"));
        }
    });

    // Create an event listener for the add entry input
    document.getElementById("add-entry-isbn")?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            addEntry();
            document.getElementById("add-entry-isbn")?.dispatchEvent(new Event("blur"));
        }
    });

    // Create other event listeners for all the buttons/links
    createOnClick(document.getElementById("add-entry-button")! as HTMLButtonElement, addEntry);
    createOnClick(document.getElementById("add-entry-without-isbn")! as HTMLButtonElement, addEntryWithoutISBN);
    createOnClick(document.getElementById("edit-entry-search")! as HTMLButtonElement, adminSearch);
    createOnClick(document.getElementById("view-missing-barcodes")! as HTMLButtonElement, viewMissingBarcodes);
    createOnClick(document.getElementById("import-link")! as HTMLButtonElement, () =>
        document.getElementById("import-input")?.dispatchEvent(new Event("click"))
    );
    createOnClick(document.getElementById("export-link")! as HTMLButtonElement, downloadDatabase);

    // Create an event listener for the import input
    document.getElementById("import-input")?.addEventListener("change", (event) => {
        processImport(event as unknown as InputEvent);
    });

    // Run the functions to fill in dynamic data
    recentlyCheckedOut();
    addStats();
}

/**
 * @description Sets up the page for editing a user.
 */
export function setupEditUser() {
    console.error("TODO: Write this function");
}

/**
 * @description Called when the user adds an entry using an ISBN number.
 */
function addEntry() {
    const isbn = (document.getElementById("add-entry-isbn") as HTMLInputElement).value;
    const check = verifyISBN(isbn);
    if (!check) {
        openModal("issue", "The number you entered is not a valid ISBN Number.");
        return;
    }
    // goToPage("admin/editEntry?new=true&isbn=" + isbn);
}

/**
 * @description Called when the user adds an entry without an ISBN number.
 */
function addEntryWithoutISBN() {
    // goToPage("admin/editEntry?new=true");
}

/**
 * @description Called when the user searches for a book to edit on the admin dashboard.
 */
function adminSearch() {
    const searchQuery = (document.getElementById("edit-entry-input") as HTMLInputElement).value;

    if (searchQuery) {
        (document.getElementById("edit-entry-search-results") as HTMLElement).style.display = "";
        (document.getElementById("edit-entry-search-results") as HTMLElement).innerHTML = "";
        search(searchQuery, true).then((results) => {
            if (results.length == 0) {
                (document.getElementById("edit-entry-search-results") as HTMLInputElement).innerHTML =
                    "Your search returned no results. Please try again.";
            } else {
                adminBookBoxes(results);
            }
        });
    } else {
        openModal("issue", "Please enter a search query");
    }
}

/**
 * @description A helper function for adminSearch(). Calls buildBookBox() for each book in the array.
 * @param {Array<Book>} objects The books to display in the edit entry search results.
 */
function adminBookBoxes(objects: Book[]) {
    let maxResults = 10;
    if (objects.length < maxResults) {
        maxResults = objects.length;
    }
    for (let i = 0; i < maxResults; i++) {
        (document.querySelector("div#edit-entry-search-results")! as HTMLElement).appendChild(
            buildBookBox(objects[i], "edit-entry")
        );
    }
}

let input;
let input1;
let input2;
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D | null;
/**
 * @description Sets up the page for creating barcodes.
 */
export function setupBarcodePage() {
    canvas = document.getElementById("canvas")! as HTMLCanvasElement;
    ctx = canvas.getContext("2d");

    // Create event listeners for the inputs
    document.getElementById("barcode-single-input")?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            createBarcode();
            document.getElementById("barcode-single-input")?.dispatchEvent(new Event("blur"));
        }
    });

    document.getElementById("barcode-multiple-input-start")?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            createBarcode(true);
            document.getElementById("barcode-multiple-input-start")?.dispatchEvent(new Event("blur"));
        }
    });

    document.getElementById("barcode-multiple-input-end")?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            createBarcode(true);
            document.getElementById("barcode-multiple-input-end")?.dispatchEvent(new Event("blur"));
        }
    });

    // Create event listeners for the buttons
    createOnClick(document.getElementById("merge-one-barcode")! as HTMLButtonElement, () => createBarcode());
    createOnClick(document.getElementById("merge-multiple-barcodes")! as HTMLButtonElement, () => createBarcode(true));
}

/**
 * @description Reads the values off of the page in order to create barcodes using a canvas.
 * @param {Boolean} multiple A boolean that represents whether or not the user is creating multiple barcodes.
 */
function createBarcode(multiple = false) {
    let numberOfBarcodes: number;
    let currentBarcode: number;
    if (!multiple) {
        numberOfBarcodes = 1;
        input = (document.getElementById("barcode-single-input")! as HTMLInputElement).value;
        input = "11711" + input;
        currentBarcode = parseInt(input);
        if (!/11711[0-9]{5}/.test(input)) {
            openModal("issue", "That barcode is not valid");
            return;
        }
    } else {
        input1 = (document.getElementById("barcode-multiple-input-start")! as HTMLInputElement).value;
        input1 = "11711" + input1;
        input2 = (document.getElementById("barcode-multiple-input-end")! as HTMLInputElement).value;
        input2 = "11711" + input2;
        if (!/11711[0-9]{5}/.test(input1)) {
            openModal("issue", "The starting barcode is not valid");
            return;
        }
        if (!/11711[0-9]{5}/.test(input2)) {
            openModal("issue", "The ending barcode is not valid");
            return;
        }
        if (parseInt(input1) >= parseInt(input2)) {
            openModal("issue", "The ending barcode must be larger than the starting barcode");
            return;
        }
        numberOfBarcodes = parseInt(input2) - parseInt(input1) + 1;
        currentBarcode = parseInt(input1);
    }
    // Loop through each barcode
    for (let i = 0; i < numberOfBarcodes; i++) {
        if (i != 0) {
            currentBarcode++;
        }
        const imageObjArray: HTMLImageElement[] = [];
        const imageObjLoadedArray: boolean[] = [];
        const delay = i * 1500 + Math.floor(i / 5) * 2000;
        setTimeout(
            (currentBarcode, imageObjArray, imageObjLoadedArray, i, numberOfBarcodes) => {
                if (!ctx) {
                    console.error("Canvas context is not defined.");
                    return;
                }
                if (i == numberOfBarcodes - 1) {
                    setTimeout(() => {
                        openModal("success", "Download Complete");
                    }, 2000);
                }
                const currentBarcodeString = currentBarcode.toString();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.font = "bold 60px Poppins";
                ctx.textAlign = "center";
                // let textWidth = ctx.measureText("South Church Library");
                ctx.fillText("South Church Library", canvas.width / 2, 60);
                const barcodeStyled =
                    currentBarcodeString.substring(0, 1) +
                    "  " +
                    currentBarcodeString.substring(1, 5) +
                    "  " +
                    currentBarcodeString.substring(5, currentBarcodeString.length);
                ctx.font = "bold 78px Poppins";
                // textWidth = ctx.measureText(barcodeStyled);
                ctx.fillText(barcodeStyled, canvas.width / 2, 350);
                ctx.font = "45px Poppins";
                // textWidth = ctx.measureText("Andover, MA");
                ctx.translate(70, canvas.height / 2 - 5);
                ctx.rotate(270 * (Math.PI / 180));
                ctx.fillText("Andover, MA", 0, 0);
                ctx.rotate(-270 * (Math.PI / 180));
                ctx.translate(-70, -(canvas.height / 2) + 5);
                ctx.font = "45px Poppins";
                ctx.translate(1055, canvas.height / 2 - 5);
                ctx.rotate(90 * (Math.PI / 180));
                ctx.fillText("Andover, MA", 0, 0);
                ctx.rotate(-90 * (Math.PI / 180));
                ctx.translate(-1055, -(canvas.height / 2) + 5);

                for (let i = 0; i < 12; i++) {
                    imageObjLoadedArray[i] = false;
                }
                for (let i = 0; i < 12; i++) {
                    imageObjArray.push(new Image());
                    loadBarcodeImage(i, imageObjArray, imageObjLoadedArray, currentBarcodeString);
                }
                imageObjArray[0].src = "/img/barcode-parts/A.png";
                imageObjArray[11].src = "/img/barcode-parts/B.png";
                for (let i = 1; i < 11; i++) {
                    const temp = currentBarcodeString.substring(i - 1, i);
                    imageObjArray[i].src = "/img/barcode-parts/" + temp + ".png";
                }
            },
            delay,
            currentBarcode,
            imageObjArray,
            imageObjLoadedArray,
            i,
            numberOfBarcodes
        );
    }
}

/**
 * @description Loads the 12 individual images into the canvas. Once all are loaded, it renders the canvas to a png and downloads it.
 * @param {Number} num the number of the image 0-11 which is being loaded. 0 is the first bar, 11 is the last bar.
 * @param {Array<Image>} imageObjArray The array contianing the image objects.
 * @param {Array<Boolean>} imageObjLoadedArray An array containing a boolean that represents whether the image has loaded or not.
 * @param {String} currentBarcodeString The current barcode string.
 */
function loadBarcodeImage(
    num: number,
    imageObjArray: HTMLImageElement[],
    imageObjLoadedArray: boolean[],
    currentBarcodeString: string
) {
    imageObjArray[num].onload = () => {
        if (!ctx) {
            console.error("Canvas context is not defined.");
            return;
        }
        ctx.globalAlpha = 1;
        let position = 110 * 0.6 * num + 160;
        if (num != 0) {
            position += 10;
        }
        ctx.drawImage(
            imageObjArray[num],
            position,
            95,
            imageObjArray[num].width * 0.6,
            imageObjArray[num].height * 0.6
        );
        imageObjLoadedArray[num] = true;
        let allLoaded = true;
        for (let i = 0; i < 12; i++) {
            if (imageObjLoadedArray[i]) {
                continue;
            } else {
                allLoaded = false;
            }
        }
        if (allLoaded) {
            canvas.toBlob((blob) => {
                if (!blob) {
                    console.error("Failed to create blob from canvas.");
                    return;
                }
                const url = window.URL.createObjectURL(blob);
                const a = document.getElementById("link")! as HTMLAnchorElement;
                a.href = url;
                a.download = currentBarcodeString + ".png";
                a.click();
                window.URL.revokeObjectURL(url);
            });
        }
    };
}

/**
 * @description Displays the list of recently checked out books on the admin dashboard.
 */
function recentlyCheckedOut() {
    /* TODO: Implement Checkout System
    let d = new Date(2021, 1, 1);
    // I don't know if we're storing checkouts in the users doc yet...
    getDocs(query(collection(db, "users"), where("lastCheckoutTime", ">", d), orderBy("lastCheckoutTime"), limit(5))).then((querySnapshot) => {
        let bookTimes = [];
        querySnapshot.forEach((docSnapshot) => {
            let co = docSnapshot.data().checkouts;
            for (let i = 0; i < co.length; i++) {
                bookTimes.push({ book: co[i].bookRef, barcode: co[i].barcodeNumber, time: co[i].timeOut });
                if (bookTimes.length == 6) {
                    bookTimes.sort((a, b) => a.time - b.time);
                    bookTimes.pop();
                }
            }
        });
        for (let i = 0; i < bookTimes.length; i++) {
            let currentBook = bookTimes[i];
            getDoc(currentBook.book).then((docSnap) => {
                if (!docSnap.exists()) {
                    // TODO: When (or if) a book is deleted from the database, you can't try to get it. This may or may not be a problem after testing.
                    console.error("doc does not exist");
                    return;
                }
                for (let j = 0; j < docSnap.data().books.length; j++) {
                    if (docSnap.data().books[j].barcodeNumber == currentBook.barcode) {
                        (document.getElementById("checked-out-books-container")! as any).appendChild(buildBookBox(docSnap.data().books[j], "admin"));
                    }
                }
            });
        }
    });*/
}

/**
 * @description Updates the stats on the admin dashboard.
 */
function addStats() {
    let count = 0;
    updateBookDatabase().then(() => {
        if (!bookDatabase) {
            console.error("bookDatabase is not defined.");
            return;
        }
        // Number of Books
        bookDatabase.forEach((document: BookDocument) => {
            // Iterate through each of the 10-ish docs
            for (let i = 0; i < document.books.length; i++) {
                // Iterate through each of the 100 books in each doc
                const book = document.books[i];
                if (book.isDeleted || book.barcodeNumber == 1171100000 || !book.lastUpdated) {
                    continue;
                }
                count++;
            }
        });
        (document.getElementById("number-of-books") as HTMLElement).innerHTML = String(count);
        // TODO: Number of Checked Out Books
        (document.getElementById("number-of-checked-out-books") as HTMLInputElement).innerHTML = "0";
    });
    // TODO: Number of Users
    if (!db) {
        console.error("db is not defined.");
        return;
    }
    getCountFromServer(query(collection(db, "users"), where("isDeleted", "==", false))).then((snapshot) => {
        (document.getElementById("number-of-users") as HTMLElement).innerHTML = String(snapshot.data().count);
    });
    // TODO: Logins in the Past Month
}

/**
 * @description Called when the user clicks the "View Missing Barcodes" link.
 */
// TODO: Remove this function after the system is fully updated to prevent holes.
function viewMissingBarcodes() {
    if (!bookDatabase) {
        console.error("bookDatabase is not defined.");
        return;
    }

    const missingArray: Book[] = [];
    bookDatabase.forEach((document: BookDocument) => {
        // Iterate through each of the 10-ish docs
        for (let i = 0; i < document.books.length; i++) {
            // Iterate through each of the 100 books in each doc
            const book = document.books[i];
            if (
                book.barcodeNumber == 1171100000 ||
                book.lastUpdated /* && !book.isDeleted (We decided not to write over deleted books)*/
            ) {
                continue;
            }
            missingArray.push(book);
        }
    });
    let message = "The following Barcodes have been created, but they have never been updated:\n";
    missingArray.forEach((book: Book) => {
        message += book.barcodeNumber + "\n";
    });
    openModal("info", message);
}

/**
 * @description Called when the user clicks the "Export" link. Downloads the database as a JSON file.
 */
function downloadDatabase() {
    updateBookDatabase(true).then(() => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bookDatabase));
        const a = document.createElement("a");
        a.style.display = "none";
        a.id = "download-database-link";
        const dateString = new Date().toLocaleDateString("en-CA"); // it's canadian because they use yyyy-mm-dd format
        a.download = "database " + dateString + ".json";
        a.href = dataStr;
        a.innerHTML = "Click Here to download the database";
        (document.getElementById("content")! as HTMLDivElement).appendChild(a);
        window.setTimeout(() => {
            (document.getElementById("download-database-link")! as HTMLAnchorElement).click();
        }, 500);
    });
}

/**
 * @description Uploads a file from the user's computer.
 * @param {InputEvent} event The onchange event that is generated when the user selects a file.
 * @returns {Promise<File>} A promise that resolves to the file that the user selected.
 */
function importFile(event: InputEvent) {
    return new Promise<File>((resolve, reject) => {
        if (!event.target || !(event.target instanceof HTMLInputElement) || !event.target.files) {
            reject();
            return;
        }
        if (event.target.files[0]) resolve(event.target.files[0]);
        else reject();
    });
}

/**
 * @description Called when the user selects a file to upload. Processes the data and uploads it to the database.
 * @param {InputEvent} event the onchange event that is generated when the user selects a file.
 */
function processImport(event: InputEvent) {
    const bookDatabasePromise = updateBookDatabase(true);
    importFile(event)
        .then((file) => {
            if (file.type != "application/json") {
                openModal("error", "File type not recognized. Please upload a JSON file.");
                return;
            }
            const fileConversionPromise = file.text();
            Promise.all([fileConversionPromise, bookDatabasePromise])
                .then((text) => {
                    if (!bookDatabase) {
                        console.error("bookDatabase is not defined.");
                        return;
                    }
                    const dataToUpload = JSON.parse(text[0]);
                    const newDatabase: Book[][] = [];
                    let modified = 0;

                    // Convert the data to an array of arrays of books and count the number of books that will be modified
                    for (let i = 0; i < dataToUpload.length; i++) {
                        const newDoc = [];
                        for (let j = 0; j < dataToUpload[i].books.length; j++) {
                            const newBook = Book.createFromObject(dataToUpload[i].books[j]);
                            newDoc.push(newBook);
                            if (bookDatabase[i].books[j] && !Book.equals(newBook, bookDatabase[i].books[j])) {
                                modified++;
                            }
                        }
                        newDatabase.push(newDoc);
                    }
                    const ndlen = newDatabase.length,
                        bdlen = bookDatabase.length;
                    const diff =
                        100 * (ndlen - bdlen) + (newDatabase[ndlen - 1].length - bookDatabase[bdlen - 1].books.length);
                    // Open a modal to confirm the import
                    openModal(
                        "warning",
                        "This will overwrite the entire books database.<br>" +
                            '<span id="import-added">0</span> books added<br>' +
                            '<span id="import-deleted">0</span> books deleted<br>' +
                            '<span id="import-modified">0</span> books modified',
                        "Are you sure?",
                        "Yes, Import",
                        () => {
                            // The user confirmed the import
                            const loadingModal = openModal(
                                "info",
                                "Please wait. This may take a while. Do not close this window or navigate to a new page.",
                                "Importing Database...",
                                ""
                            );
                            // If an error occurs somewhere in this process, tell the user after 10 seconds
                            const loadingTimer = window.setTimeout(() => {
                                loadingModal();
                                openModal(
                                    "issue",
                                    "We did not complete the import process in 30 seconds. An error has likely occurred. Your changes may not have been saved."
                                );
                            }, 30000);

                            importDatabase(newDatabase)
                                .then(() => {
                                    setBookDatabase(null);
                                    setTimeLastSearched(null);
                                    openModal("success", "Database updated successfully!");
                                })
                                .catch((error) => {
                                    console.error(error);
                                    openModal("error", "There was an error and your data was not updated.");
                                })
                                .finally(() => {
                                    window.clearTimeout(loadingTimer);
                                    loadingModal();
                                });
                        },
                        "No, Cancel",
                        () => {
                            // The user cancelled the import
                            (document.getElementById("import-input") as HTMLInputElement).value = "";
                        }
                    );
                    fillImportModal(diff, modified);
                })
                .catch((error) => {
                    console.error(error);
                    openModal("error", "Something went wrong. Please check the file you are trying to import.");
                });
        })
        .catch(() => {
            console.log("The user did not upload a valid file.");
        });
}

/**
 * @description Fills in the import modal with the number of books that will be added/deleted and modified.
 * @param {Number} diff The difference in the number of books between the current database and the one being imported.
 * @param {Number} modified The number of books that will be modified.
 */
function fillImportModal(diff = 0, modified = 0) {
    if (diff > 0) {
        (document.getElementById("import-added") as HTMLElement).innerHTML = String(diff);
        (document.getElementById("import-deleted") as HTMLElement).innerHTML = "0";
    } else {
        (document.getElementById("import-deleted") as HTMLElement).innerHTML = String(0 - diff);
        (document.getElementById("import-added") as HTMLElement).innerHTML = "0";
    }
    (document.getElementById("import-modified") as HTMLElement).innerHTML = String(modified);
}

/**
 * @description Imports the processed database from a file into the firestore database.
 * @param {Array<Array<Book>>} database An array of arrays of books to import. Does not include the order field (that will be handled by this function).
 * @returns {Promise<void>} A promise that resolves when the database is imported.
 */
function importDatabase(database: Book[][]): Promise<void> {
    return new Promise<void>((resolve) => {
        if (!db) {
            console.error("db is not defined.");
            return;
        }
        // Get a new write batch
        const batch = writeBatch(db);
        getDocs(query(collection(db, "books"), where("order", ">=", 0), orderBy("order", "asc"))).then(
            (querySnapshot) => {
                if (!db) {
                    console.error("db is not defined.");
                    return;
                }
                // Set each doc for deletion (in case the new database is smaller)
                querySnapshot.forEach((docSnap) => {
                    if (!docSnap.exists()) {
                        throw "The books document doesn't exist";
                    }
                    batch.delete(docSnap.ref);
                });

                // Add all the new docs
                for (let i = 0; i < database.length; i++) {
                    // Create a new doc and add all the books to be imported into it
                    const newDoc = [];
                    for (let j = 0; j < database[i].length; j++) {
                        const newBook = database[i][j].toObject();
                        // If we need to programatically edit the formatting of the database, do it here
                        newDoc.push(newBook);
                    }
                    // Set the new doc for addition
                    batch.set(doc(db, "books", i.toString().padStart(3, "0")), {
                        books: newDoc,
                        order: i
                    });
                }

                // Commit all the staged writes
                batch.commit().then(() => {
                    resolve(undefined);
                });
            }
        );
    });
}

/**
 * @description The setup function for the view page. It will load all books or all users depending on the type parameter in the URL.
 * @param {String} pageQuery The query string from the URL.
 */
export function setupView(pageQuery: string) {
    const type = findURLValue(pageQuery, "type");
    if (type == "books") {
        updateBookDatabase(true).then(() => {
            if (!bookDatabase) {
                console.error("bookDatabase is not defined.");
                return;
            }
            bookDatabase.forEach((doc: BookDocument, docIndex: number) => {
                doc.books.forEach((book: Book, bookIndex: number) => {
                    (document.querySelector("div#view-container")! as HTMLDivElement).appendChild(
                        buildBookBox(book, "view", docIndex * 100 + bookIndex)
                    );
                });
            });
        });
    } else if (type == "users") {
        getAllUsers().then((userDatabase) => {
            userDatabase.forEach((user: User, index: number) => {
                const userBox = buildUserBox(user, "view", index);
                if (!userBox) {
                    console.error("Failed to build user box for user: ", user);
                    return;
                }
                (document.querySelector("div#view-container")! as HTMLDivElement).appendChild(userBox);
            });
        });
    } else {
        console.warn("There was no type specified in the URL.");
        openModal("issue", "There was no type specified in the URL. Redirecting to the admin dashboard.");
        // goToPage("admin/main");
    }
}

/**
 * @description Builds a box that contains the information for a user so it can be displayed on the page.
 * @param {User} obj The user object to build the box for.
 * @param {String} page A string that represents the page that this is being built for.
 * @param {Number} num The result number if this is created for a search result.
 * @returns {HTMLDivElement} A div element that contains the user information.
 */
function buildUserBox(obj: User, page: string, num = 0) {
    const a = document.createElement("a");
    const div = document.createElement("div");
    a.appendChild(div);
    switch (page) {
        case "view":
            div.classList.add("result-listing");
            break;
        default:
            div.classList.add("user");
    }
    const div1 = document.createElement("div");
    const div2 = document.createElement("div");
    div.appendChild(div1);
    div.appendChild(div2);
    const img = document.createElement("img");
    img.classList.add("userimage");
    if (obj.pfpIconLink) {
        img.src = obj.pfpIconLink;
    } else if (obj.pfpLink) {
        img.src = obj.pfpLink;
    } else {
        img.src = "/img/default-user.jpg";
    }
    img.onload = () => {
        div.style.opacity = "1";
    };
    div1.appendChild(img);
    const b = document.createElement("b");
    const name = document.createElement("p");
    name.classList.add("title");
    name.appendChild(document.createTextNode(obj.firstName + " " + obj.lastName));
    const email = document.createElement("p");
    email.classList.add("author");
    email.appendChild(document.createTextNode(obj.email ?? "No Email"));
    b.appendChild(name);
    div2.appendChild(b);
    div2.appendChild(email);
    div2.classList.add("basic-info");
    if (page == "edit-entry" || page == "view") {
        a.href = "/admin/editUser?id=" + obj.cardNumber;
        const barcode = document.createElement("p");
        barcode.classList.add("barcode");
        barcode.innerHTML = "Card Number: " + obj.cardNumber;
        div2.appendChild(barcode);
    }
    if ((page == "search" && num > 0) || page == "view") {
        div.id = "result-number-" + num;
        const number = document.createElement("div");
        number.classList.add("result-number");
        number.appendChild(document.createTextNode(((obj.cardNumber ?? 0) % 2171100000) + "."));
        div.appendChild(number);
        const phone = document.createElement("p");
        phone.classList.add("medium");
        phone.appendChild(document.createTextNode(obj.phone ?? "No Phone Number"));
        div2.appendChild(phone);
        const div3 = document.createElement("div");
        div3.classList.add("advanced-info");
        div.appendChild(div3);
        const address = document.createElement("p");
        address.classList.add("subjects");
        address.appendChild(document.createTextNode("Address: " + obj.address));
        div3.appendChild(address);
        const dateCreated = document.createElement("p");
        dateCreated.classList.add("subjects");
        if (!obj.dateCreated) {
            console.error("User does not have a dateCreated property.");
            return;
        }
        dateCreated.appendChild(document.createTextNode("Date Created: " + formatDate(obj.dateCreated)));
        div3.appendChild(dateCreated);
        const lastSignInTime = document.createElement("p");
        lastSignInTime.classList.add("subjects");
        if (!obj.lastSignInTime) {
            console.error("User does not have a lastSignInTime property.");
            return;
        }
        lastSignInTime.appendChild(document.createTextNode("Last Sign In: " + formatDate(obj.lastSignInTime)));
        div3.appendChild(lastSignInTime);
        const lastCheckoutTime = document.createElement("p");
        lastCheckoutTime.classList.add("subjects");
        if (!obj.lastCheckoutTime) {
            console.error("User does not have a lastCheckoutTime property.");
            return;
        }
        lastCheckoutTime.appendChild(
            document.createTextNode("Last Checkout Time: " + formatDate(obj.lastCheckoutTime))
        );
        div3.appendChild(lastCheckoutTime);
        const checkouts = document.createElement("p");
        checkouts.classList.add("description");
        // TODO: Implement this.
        checkouts.appendChild(document.createTextNode("Last Checked Out Book: Not Implemented Yet"));
        div3.appendChild(checkouts);
    }
    return a;
}

/**
 * @description Gets all the users from the database, converts them to User objects, and returns them.
 * @returns {Promise<Array<User>>} A promise that resolves to an array of User objects.
 */
function getAllUsers() {
    return new Promise<User[]>((resolve) => {
        if (!db) {
            console.error("db is not defined.");
            return;
        }
        getDocs(query(collection(db, "users"), where("cardNumber", ">=", 0), orderBy("cardNumber", "asc"))).then(
            (querySnapshot) => {
                const userDatabase: User[] = [];
                querySnapshot.forEach((docSnap) => {
                    if (!docSnap.exists()) {
                        console.error("user document does not exist");
                        return;
                    }
                    userDatabase.push(User.createFromObject(docSnap.data()));
                });
                resolve(userDatabase);
            }
        );
    });
}

/**
 * @description Restarts the inventory progress.
 */
function restartInventory() {
    openModal(
        "warning",
        "This will delete your current progress.",
        "Are you sure you want to restart?",
        "Confirm",
        () => {
            if (!db) {
                console.error("db is not defined.");
                return;
            }
            setDoc(doc(db, "admin", "inventory"), {
                books: []
            })
                .then(() => {
                    openModal(
                        "success",
                        "The Inventory Progress has been reset.\nThe page will now refresh.",
                        undefined,
                        undefined,
                        () => {
                            window.location.reload();
                        }
                    );
                })
                .catch((error) => {
                    openModal("error", "Error resetting inventory: " + error);
                });
        },
        "Cancel"
    );
}

/**
 * @description Sets up the inventory page including the event listeners.
 */
export function setupInventory() {
    loadInventory()
        .then(() => {
            cachedInventory.forEach((book: Book) => {
                const current = (document.getElementById("recent-scans") as HTMLInputElement).innerHTML;
                (document.getElementById("recent-scans") as HTMLInputElement).innerHTML =
                    current + "<br>" + book.barcodeNumber;
            });
        })
        .catch((error) => {
            openModal("error", "Error loading inventory: " + error);
        });

    // Set up the event listeners
    createOnClick(document.getElementById("restart-inventory")! as HTMLButtonElement, restartInventory);
    createOnClick(document.getElementById("inventory-cancel-button")! as HTMLButtonElement, cancelInventory);
    createOnClick(document.getElementById("inventory-next-button")! as HTMLButtonElement, continueScanning);
    createOnClick(document.getElementById("continue-scanning-button")! as HTMLButtonElement, continueScanning);
}

let cachedInventory: Book[] = [];
/**
 * @description Loads the inventory from the database.
 * @returns {Promise<void>} A promise that resolves when the inventory is loaded from the database.
 */
function loadInventory() {
    return new Promise<void>((resolve, reject) => {
        if (!db) {
            console.error("db is not defined.");
            reject("db is not defined.");
            return;
        }
        getDoc(doc(db, "admin", "inventory"))
            .then((docSnap) => {
                if (!docSnap.exists()) {
                    console.error("inventory document does not exist");
                    return;
                }
                cachedInventory = [];
                docSnap.data().books.forEach((book: Book) => {
                    cachedInventory.push(Book.createFromObject(book));
                });
                resolve(undefined);
            })
            .catch((error) => {
                reject(error);
            });
    });
}

let barcodeBlurHandler: (() => void) | null = null;
let barcodeKeydownHandler: ((event: KeyboardEvent) => void) | null = null;

/**
 * @description Cancels the inventory process and hides the popup.
 */
function cancelInventory() {
    if (barcodeBlurHandler) {
        document.getElementById("inventory-book-barcode")?.removeEventListener("blur", barcodeBlurHandler);
        barcodeBlurHandler = null;
    }
    (document.getElementById("inventory-popup") as HTMLElement).style.display = "none";
}

/**
 * @description Continues the inventory process from where it left off.
 */
function continueScanning() {
    updateBookDatabase();
    (document.getElementById("inventory-popup") as HTMLElement).style.display = "";
    (document.getElementById("inventory-next-button") as HTMLElement).style.display = "none";
    (document.getElementById("inventory-inner-popup-box") as HTMLInputElement).innerHTML =
        "<p>Please scan the barcode on the book now.</p>";
    
    if (barcodeBlurHandler) {
        document.getElementById("inventory-book-barcode")?.removeEventListener("blur", barcodeBlurHandler);
    }
    barcodeBlurHandler = () => {
        document.getElementById("inventory-book-barcode")?.dispatchEvent(new Event("focus"));
    };
    document.getElementById("inventory-book-barcode")?.addEventListener("blur", barcodeBlurHandler);
    document.getElementById("inventory-book-barcode")?.dispatchEvent(new Event("focus"));

    const barcodeInput = document.getElementById("inventory-book-barcode") as HTMLInputElement;
    if (barcodeKeydownHandler) {
        barcodeInput?.removeEventListener("keydown", barcodeKeydownHandler);
    }
    barcodeKeydownHandler = (event: KeyboardEvent) => {
        if (event.key === "Enter") {
            if (barcodeBlurHandler) {
                barcodeInput?.removeEventListener("blur", barcodeBlurHandler);
                barcodeBlurHandler = null;
            }
            if (barcodeInput?.value) {
                // Some checks should be done to ensure the barcode is valid, the book hasn't been scanned, etc.
                if (!db) {
                    console.error("db is not defined.");
                    return;
                }
                updateDoc(doc(db, "admin", "inventory"), {
                    books: arrayUnion(barcodeInput.value)
                });
            }
        }
    };
    barcodeInput?.addEventListener("keydown", barcodeKeydownHandler);
}

/**
 * @description Sets up the admin help page.
 */
export function setupAdminHelp() {
    document.querySelectorAll("#tableOfContents li a").forEach((a, index) => {
        a.setAttribute("href", "/admin/help#section" + (index + 1));
    });
    document.querySelectorAll("#sections > li").forEach((li, index) => {
        li.setAttribute("id", "section" + (index + 1));
    });
    document.querySelectorAll(".back-to-top").forEach((li) => {
        const link = li.firstElementChild;
        link?.setAttribute("href", "/admin/help");
        link?.addEventListener("click", () => windowScroll(0));
    });

    let adminHelpScrollingFn;
    if (!adminHelpScrollingFn) {
        adminHelpScrollingFn = new Throttle(adminHelpScrolling, 100).get();
    }
    document.addEventListener("scroll", adminHelpScrollingFn);

    window?.addEventListener("beforeunload", () => {
        setIgnoreScroll(true);
        document.removeEventListener("scroll", adminHelpScrollingFn);
        setTimeout(() => {
            setIgnoreScroll(false);
        }, 500);
    });
}

function adminHelpScrolling() {
    if (ignoreScroll) {
        return;
    }
    let currentSection = 0;
    document.querySelectorAll("#tableOfContents, #sections > li").forEach((li, index) => {
        // Check if the section is above the top of the screen.
        // Used to be 90 to account for the header, but I added more to make it more natural.
        if (
            li?.getBoundingClientRect().top - (document.documentElement.scrollTop || document.body.scrollTop) - 165 <
            0
        ) {
            currentSection = index;
        }
    });
    // Change the URL to the current section.
    const url = "/admin/help";
    let newHash;
    if (currentSection == 0) {
        newHash = "#top";
    } else {
        newHash = "#section" + currentSection;
    }
    const currentUrl = window.location.pathname + window.location.hash;
    if (currentUrl != url + newHash && !ignoreScroll) {
        console.log("Changing URL to " + url + newHash);
        setCurrentHash(newHash);
    }
}

console.log("admin.js has loaded!");
