import { arrayUnion, collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { goToPage } from "./ajax";
import { search, buildBookBox, findURLValue, verifyISBN, openModal, updateBookDatabase, formatDate,
    windowScroll, ignoreScroll, setIgnoreScroll, Throttle, createOnClick, buildCheckoutGroupBox } from "./common";
import { Book, bookDatabase, Checkout, CheckoutGroup, db, historyManager, setBookDatabase, setCurrentHash, setTimeLastSearched, User } from "./globals";

/**
 * @description Sets up the main page for the admin including all the event listeners.
 */
export function setupAdminMain() {
    // Create an event listener for the search bar
    $("#edit-entry-input").on("keyup", (event) => {
        if (event.key === "Enter") {
            adminSearch();
            $("#edit-entry-input").trigger("blur");
        }
    });

    // Create an event listener for the add entry input
    $("#add-entry-isbn").on("keydown", (event) => {
        if (event.key === "Enter") {
            addEntry();
            $("#add-entry-isbn").trigger("blur");
        }
    });

    // Create other event listeners for all the buttons/links
    createOnClick($("#add-entry-button"), addEntry);
    createOnClick($("#add-entry-without-isbn"), addEntryWithoutISBN);
    createOnClick($("#edit-entry-search"), adminSearch);
    createOnClick($("#view-missing-barcodes"), viewMissingBarcodes);
    createOnClick($("#import-link"), () => $("#import-input").trigger("click"));
    createOnClick($("#export-link"), downloadDatabase);

    // Create an event listener for the import input
    $("#import-input").on("change", (event) => {
        processImport(event);
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
    let isbn = $("#add-entry-isbn").val();
    let check = verifyISBN(isbn);
    if (!check) {
        openModal("issue", "The number you entered is not a valid ISBN Number.");
        return;
    }
    goToPage("admin/editEntry?new=true&isbn=" + isbn);
}

/**
 * @description Called when the user adds an entry without an ISBN number.
 */
function addEntryWithoutISBN() {
    goToPage("admin/editEntry?new=true");
}

/**
 * @description Called when the user searches for a book to edit on the admin dashboard.
 */
function adminSearch() {
    let searchQuery = $("#edit-entry-input").val();

    if (searchQuery) {
        $("#edit-entry-search-results").show();
        $("#edit-entry-search-results").empty();
        search(searchQuery, true).then((results) => {
            if (results.length == 0) {
                $("#edit-entry-search-results").html("Your search returned no results. Please try again.");
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
 * @param {Books[]} objects The books to display in the edit entry search results.
 */
function adminBookBoxes(objects) {
    let maxResults = 10;
    if (objects.length < maxResults) {
        maxResults = objects.length;
    }
    for (let i = 0; i < maxResults; i++) {
        $("div#edit-entry-search-results")[0].appendChild(buildBookBox(objects[i], "edit-entry"));
    }
}


var input;
var input1;
var input2;
var canvas;
var ctx;
/**
 * @description Sets up the page for creating barcodes.
 */
export function setupBarcodePage() {
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    // Create event listeners for the inputs
    $("#barcode-single-input").on("keydown", (event) => {
        if (event.key === "Enter") {
            createBarcode();
            $("#barcode-single-input").trigger("blur");
        }
    });

    $("#barcode-multiple-input-start").on("keydown", (event) => {
        if (event.key === "Enter") {
            createBarcode(true);
            $("#barcode-multiple-input-start").trigger("blur");
        }
    });

    $("#barcode-multiple-input-end").on("keydown", (event) => {
        if (event.key === "Enter") {
            createBarcode(true);
            $("#barcode-multiple-input-end").trigger("blur");
        }
    });

    // Create event listeners for the buttons
    createOnClick($("#merge-one-barcode"), createBarcode);
    createOnClick($("#merge-multiple-barcodes"), createBarcode, true);
}

/**
 * @description Reads the values off of the page in order to create barcodes using a canvas.
 * @param {Boolean} multiple A boolean that represents whether or not the user is creating multiple barcodes.
 */
function createBarcode(multiple = false) {
    let numberOfBarcodes;
    let currentBarcode;
    if (!multiple) {
        numberOfBarcodes = 1;
        input = document.getElementById("barcode-single-input").value;
        input = "11711" + input;
        currentBarcode = parseInt(input);
        if (!/11711[0-9]{5}/.test(input)) {
            openModal("issue", "That barcode is not valid");
            return;
        }
    }
    if (multiple) {
        input1 = document.getElementById("barcode-multiple-input-start").value;
        input1 = "11711" + input1;
        input2 = document.getElementById("barcode-multiple-input-end").value;
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
        let imageObjArray = [];
        let imageObjLoadedArray = [];
        let delay = i * 1500 + (Math.floor(i / 5) * 2000);
        setTimeout((currentBarcode, imageObjArray, imageObjLoadedArray, i, numberOfBarcodes) => {
            if (i == numberOfBarcodes - 1) {
                setTimeout(() => {
                    openModal("success", "Download Complete");
                }, 2000);
            }
            let currentBarcodeString = currentBarcode.toString();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = "bold 60px Poppins";
            ctx.textAlign = "center";
            // let textWidth = ctx.measureText("South Church Library");
            ctx.fillText("South Church Library", (canvas.width / 2), 60);
            let barcodeStyled = currentBarcodeString.substring(0, 1) + "  " + currentBarcodeString.substring(1, 5) + "  " + currentBarcodeString.substring(5, currentBarcodeString.length);
            ctx.font = "bold 78px Poppins";
            // textWidth = ctx.measureText(barcodeStyled);
            ctx.fillText(barcodeStyled, (canvas.width / 2), 350);
            ctx.font = "45px Poppins";
            // textWidth = ctx.measureText("Andover, MA");
            ctx.translate(70, (canvas.height / 2) - 5);
            ctx.rotate(270 * (Math.PI / 180));
            ctx.fillText("Andover, MA", 0, 0);
            ctx.rotate(-270 * (Math.PI / 180));
            ctx.translate(-70, -(canvas.height / 2) + 5);
            ctx.font = "45px Poppins";
            ctx.translate(1055, (canvas.height / 2) - 5);
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
                let temp = currentBarcodeString.substring(i - 1, i);
                imageObjArray[i].src = "/img/barcode-parts/" + temp + ".png";
            }
        }, delay, currentBarcode, imageObjArray, imageObjLoadedArray, i, numberOfBarcodes);
    }
}

/**
 * @description Loads the 12 individual images into the canvas. Once all are loaded, it renders the canvas to a png and downloads it.
 * @param {Number} num the number of the image 0-11 which is being loaded. 0 is the first bar, 11 is the last bar.
 * @param {Image[]} imageObjArray The array contianing the image objects.
 * @param {Boolean[]} imageObjLoadedArray An array containing a boolean that represents whether the image has loaded or not.
 * @param {String} currentBarcodeString The current barcode string.
 */
function loadBarcodeImage(num, imageObjArray, imageObjLoadedArray, currentBarcodeString) {
    imageObjArray[num].onload = function () {
        // console.log("Image #" + num + " has loaded");
        ctx.globalAlpha = 1;
        let position = 110 * 0.6 * num + 160;
        if (num != 0) {
            position += 10;
        }
        ctx.drawImage(imageObjArray[num], position, 95, imageObjArray[num].width * 0.6, imageObjArray[num].height * 0.6);
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
                let url = window.URL.createObjectURL(blob);
                let a = document.getElementById("link");
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
    getDocs(query(collection(db, "checkouts"), /*where("timestamp", ">", d), */orderBy("timestamp", "desc"), limit(10))).then((querySnapshot) => {
        let checkoutList = [];
        querySnapshot.forEach((docSnap) => {
            if (!docSnap.exists()) {
                console.error("checkout document does not exist");
                return;
            }
            checkoutList.push(Checkout.createFromObject(docSnap.data()));
        });
        let checkoutsCombined = [];
        // Combine the checkouts if they have the same timestamp
        for (let i = 0; i < checkoutList.length; i++) {
            let current = checkoutList[i];
            let currentPairing = [current];
            for (let j = i + 1; j < checkoutList.length; j++) {
                if (Checkout.isSameCheckout(checkoutList[j], current)) {
                    currentPairing.push(checkoutList[j]);
                    i++;
                }
            }
            checkoutsCombined.push(new CheckoutGroup(currentPairing));
            if (checkoutsCombined.length >= 5) {
                break;
            }
        }
        // Create the HTML elements
        checkoutsCombined.forEach((checkoutGroup) => {
            $("#checked-out-books-container").append(buildCheckoutGroupBox(checkoutGroup));
        });
    });
}

/**
 * @description Updates the stats on the admin dashboard.
 */
function addStats() {
    let count = 0;
    updateBookDatabase().then(() => {
        // Number of Books
        bookDatabase.forEach((document) => {
            // Iterate through each of the 10-ish docs
            for (let i = 0; i < document.books.length; i++) {
                // Iterate through each of the 100 books in each doc
                let book = document.books[i];
                if (book.isDeleted || book.barcodeNumber == 1171100000 || !book.lastUpdated) {
                    continue;
                }
                count++;
            }
        });
        $("#number-of-books").html(count);
        // TODO: Might want to also list overdue books, or books that are awaiting reshelving (separately).
        getDocs(query(collection(db, "checkouts"), where("complete", "==", false))).then((querySnapshot) => {
            let checkouts = [];
            querySnapshot.forEach((docSnap) => {
                if (!docSnap.exists()) {
                    console.error("checkout document does not exist");
                    return;
                }
                checkouts.push(Checkout.createFromObject(docSnap.data()));
            });
            let count = 0;
            checkouts.forEach((checkout) => {
                if (checkout.userReturned) {
                    count++;
                }
            });
            if (count == 0) {
                $("#number-of-checked-out-books").html(checkouts.length);
            } else {
                $("#number-of-checked-out-books").html(checkouts.length + " (" + count + " awaiting reshelving)");
            }
        });
    });
    // TODO: Number of Users (in a less terrible way)
    getDoc(doc(db, "/config/writable_vars")).then((docSnap) => {
        let num = docSnap.data().maxCardNumber - 2171100000;
        $("#number-of-users").html(num);
    });
    // TODO: Logins in the Past Month
}

/**
 * @description Called when the user clicks the "View Missing Barcodes" link.
 */
// TODO: Remove this function after the system is fully updated to prevent wholes.
function viewMissingBarcodes() {
    let missingArray = [];
    bookDatabase.forEach((document) => {
        // Iterate through each of the 10-ish docs
        for (let i = 0; i < document.books.length; i++) {
            // Iterate through each of the 100 books in each doc
            let book = document.books[i];
            if (book.barcodeNumber == 1171100000 || (book.lastUpdated/* && !book.isDeleted (We decided not to write over deleted books)*/)) {
                continue;
            }
            missingArray.push(book);
        }
    });
    let message = "The following Barcodes have been created, but they have never been updated:\n";
    missingArray.forEach((book) => {
        message += book.barcodeNumber + "\n";
    });
    openModal("info", message);
}

/**
 * @description Called when the user clicks the "Export" link. Downloads the database as a JSON file.
 */
function downloadDatabase() {
    updateBookDatabase().then(() => {
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bookDatabase));
        const a = document.createElement("a");
        a.style.display = "none";
        a.id = "download-database-link";
        let dateString = new Date().toLocaleDateString("en-CA"); // it's canadian because they use yyyy-mm-dd format
        a.download = "database " + dateString + ".json";
        a.href = dataStr;
        a.innerHTML = "Click Here to download the database";
        $("#content")[0].appendChild(a);
        window.setTimeout(() => {
            $("#download-database-link")[0].click();
        }, 500);
    });
}

/**
 * @description Uploads a file from the user's computer.
 * @param {InputEvent} event The onchange event that is generated when the user selects a file.
 * @returns {Promise<File>} A promise that resolves to the file that the user selected.
 */
function importFile(event) {
    return new Promise((resolve, reject) => {
        if (event.target.files[0])
            resolve(event.target.files[0]);
        else
            reject();
    });
}

/**
 * @description Called when the user selects a file to upload. Processes the data and uploads it to the database.
 * @param {InputEvent} event the onchange event that is generated when the user selects a file.
 */
function processImport(event) {
    importFile(event).then((file) => {
        if (file.type != "application/json") {
            openModal("error", "File type not recognized. Please upload a JSON file.");
            return;
        }
        file.text().then((text) => {
            try {
                let dataToUpload = JSON.parse(text);
                let newDatabase = [], modified = 0;
                for (let i = 0; i < dataToUpload.length; i++) {
                    let newDoc = [];
                    for (let j = 0; j < dataToUpload[i].books.length; j++) {
                        let newBook = Book.createFromObject(dataToUpload[i].books[j]);
                        newDoc.push(newBook);
                        if (bookDatabase[i].books[j] && !Book.equals(newBook, bookDatabase[i].books[j])) {
                            modified++;
                        }
                    }
                    newDatabase.push(newDoc);
                }
                let ndlen = newDatabase.length, bdlen = bookDatabase.length;
                let diff = 100 * (ndlen - bdlen) + (newDatabase[ndlen - 1].length - bookDatabase[bdlen - 1].books.length);
                // Open a modal to confirm the import
                openModal("warning",
                    "This will overwrite the entire books database.<br>" +
                    "<span id=\"import-added\">0</span> books added<br>" +
                    "<span id=\"import-deleted\">0</span> books deleted<br>" +
                    "<span id=\"import-modified\">0</span> books modified",
                    "Are you sure?", "Yes, Import", () => {
                    importDatabase(newDatabase).then(() => {
                        setBookDatabase(null);
                        setTimeLastSearched(null);
                        openModal("success", "Database updated successfully!");
                    }).catch((error) => {
                        console.error(error);
                        openModal("error", "There was an error and your data was not updated.");
                    }).finally(() => {
                        window.clearTimeout(loadingTimer);
                        loadingModal();
                    });
                }, "No, Cancel", () => {
                    $("#import-input").val("");
                });
                fillImportModal(diff, modified);
            } catch (error) {
                console.error(error);
                openModal("error", "Something went wrong. Please check the file you are trying to import.");
            }
        });
    }).catch(() => {
        console.log("The user did not upload a valid file.");
    });
}

function fillImportModal(diff = 0, modified = 0) {
    if (diff > 0) {
        $("#import-added").html(diff);
        $("#import-deleted").html(0);
    } else {
        $("#import-deleted").html(0 - diff);
        $("#import-added").html(0);
    }
    $("#import-modified").html(modified);
}

var loadingTimer;
var loadingModal;
function importDatabase(database) {
    loadingModal = openModal("info", "Please wait. This may take a while. Do not close this window or navigate to a new page.", "Importing Database...", "");
    // If an error occurs somewhere in this process, tell the user after 10 seconds
    loadingTimer = window.setTimeout(() => {
        loadingModal();
        openModal("issue", "We did not complete the import process in 30 seconds. An error has likely occurred. Your changes may not have been saved.");
    }, 30000);
    return new Promise((resolve) => {
        // Get a new write batch
        let batch = writeBatch(db);
        getDocs(query(collection(db, "books"), where("order", ">=", 0), orderBy("order", "asc"))).then((querySnapshot) => {
            querySnapshot.forEach((docSnap) => {
                if (!docSnap.exists()) {
                    throw "The books document doesn't exist";
                }
                // Set each doc for deletion
                batch.delete(docSnap.ref);
            });
            for (let i = 0; i < database.length; i++) {
                // Create a new doc and add all the books to be imported into it
                let newDoc = [];
                for (let j = 0; j < database[i].length; j++) {
                    let newBook = database[i][j].toObject();
                    // temporarily renaming things to old scheme
                    // for (let k = 0; k < 2; k++) {
                    //     if (newBook.authors[k]) {
                    //         newBook.authors[k] = {
                    //             first: newBook.authors[k].firstName,
                    //             last: newBook.authors[k].lastName
                    //         };
                    //     }
                    //     if (newBook.illustrators[k]) {
                    //         newBook.illustrators[k] = {
                    //             first: newBook.illustrators[k].firstName,
                    //             last: newBook.illustrators[k].lastName
                    //         };
                    //     }
                    // }
                    // newBook.audience = [newBook.audience.children, newBook.audience.youth, newBook.audience.adult,
                    //     !(newBook.audience.children || newBook.audience.youth || newBook.audience.adult)];
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
                resolve();
            });
        });
    });
}

/**
 * @description The setup function for the view page. It will load all books or all users depending on the type parameter in the URL.
 * @param {String} pageQuery The query string from the URL.
 */
export function setupView(pageQuery) {
    let type = findURLValue(pageQuery, "type");
    if (type == "books") {
        updateBookDatabase().then(() => {
            bookDatabase.forEach((doc, docIndex) => {
                doc.books.forEach((book, bookIndex) => {
                    $("div#view-container")[0].appendChild(buildBookBox(book, "view", docIndex*100 + bookIndex));
                });
            });
        });
    } else if (type == "users") {
        getAllUsers().then(() => {
            userDatabase.forEach((user, index) => {
                $("div#view-container")[0].appendChild(buildUserBox(user, "view", index));
            });
        });
    } else {
        console.warn("There was no type specified in the URL.");
        openModal("issue", "There was no type specified in the URL. Redirecting to the admin dashboard.");
        goToPage("admin/main");
    }
}

/**
 * @description Builds a box that contains the information for a user so it can be displayed on the page.
 * @param {User} obj The user object to build the box for.
 * @param {String} page A string that represents the page that this is being built for.
 * @param {Number} num The result number if this is created for a search result.
 * @returns {HTMLDivElement} A div element that contains the user information.
 */
function buildUserBox(obj, page, num = 0) {
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
        div.style.opacity = 1;
    };
    div1.appendChild(img);
    const b = document.createElement("b");
    const name = document.createElement("p");
    name.classList.add("title");
    name.appendChild(document.createTextNode(obj.firstName + " " + obj.lastName));
    const email = document.createElement("p");
    email.classList.add("author");
    email.appendChild(document.createTextNode(obj.email));
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
        number.appendChild(document.createTextNode(obj.cardNumber % 2171100000 + "."));
        div.appendChild(number);
        const phone = document.createElement("p");
        phone.classList.add("medium");
        phone.appendChild(document.createTextNode(obj.phone));
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
        dateCreated.appendChild(document.createTextNode("Date Created: " + formatDate(obj.dateCreated)));
        div3.appendChild(dateCreated);
        const lastSignInTime = document.createElement("p");
        lastSignInTime.classList.add("subjects");
        lastSignInTime.appendChild(document.createTextNode("Last Sign In: " + formatDate(obj.lastSignInTime)));
        div3.appendChild(lastSignInTime);
        const lastCheckoutTime = document.createElement("p");
        lastCheckoutTime.classList.add("subjects");
        lastCheckoutTime.appendChild(document.createTextNode("Last Checkout Time: " + formatDate(obj.lastCheckoutTime)));
        div3.appendChild(lastCheckoutTime);
        const checkouts = document.createElement("p");
        checkouts.classList.add("description");
        // TODO: Implement this.
        checkouts.appendChild(document.createTextNode("Last Checked Out Book: Not Implemented Yet"));
        div3.appendChild(checkouts);
    }
    return a;
}

var userDatabase = [];
/**
 * @description Gets all the users from the database and stores them in the userDatabase array.
 * @returns {Promise<void>} A promise that resolves when the userDatabase is loaded.
 */
function getAllUsers() {
    return new Promise((resolve) => {
        getDocs(query(collection(db, "users"), where("cardNumber", ">=", 0), orderBy("cardNumber", "asc"))).then((querySnapshot) => {
            userDatabase = [];
            querySnapshot.forEach((docSnap) => {
                if (!docSnap.exists()) {
                    console.error("user document does not exist");
                    return;
                }
                userDatabase.push(User.createFromObject(docSnap.data()));
            });
            resolve();
        });
    });
}


/**
 * @description Restarts the inventory progress.
 */
function restartInventory() {
    openModal("warning", "This will delete your current progress.", "Are you sure you want to restart?", "Confirm", () => {
        setDoc(doc(db, "admin", "inventory"), {
            books: []
        }).then(() => {
            openModal("success", "The Inventory Progress has been reset.\nThe page will now refresh.", undefined, undefined, () => {window.location.reload();});
        }).catch((error) => {
            openModal("error", "Error resetting inventory: " + error);
        });
    }, "Cancel");
}

/**
 * @description Sets up the inventory page including the event listeners.
 */
export function setupInventory() {
    loadInventory().then(() => {
        cachedInventory.forEach((barcode) => {
            let current = $("#recent-scans").html();
            $("#recent-scans").html(current + "<br>" + barcode);
        });
    }).catch((error) => {
        openModal("error", "Error loading inventory: " + error);
    });

    // Set up the event listeners
    createOnClick($("#restart-inventory"), restartInventory);
    createOnClick($("#inventory-cancel-button"), cancelInventory);
    createOnClick($("#inventory-next-button"), continueScanning);
    createOnClick($("#continue-scanning-button"), continueScanning);
}

var cachedInventory = [];
/**
 * @description Loads the inventory from the database.
 * @returns {Promise<void>} A promise that resolves when the inventory is loaded from the database.
 */
function loadInventory() {
    return new Promise((resolve, reject) => {
        getDoc(doc(db, "admin", "inventory")).then((docSnap) => {
            if (!docSnap.exists()) {
                console.error("inventory document does not exist");
                return;
            }
            cachedInventory = [];
            docSnap.data().books.forEach((book) => {
                cachedInventory.push(Book.createFromObject(book));
            });
            resolve();
        }).catch((error) => {
            reject(error);
        });
    });
}

/**
 * @description Cancels the inventory process and hides the popup.
 */
function cancelInventory() {
    $("#inventory-book-barcode").off("blur");
    $("#inventory-popup").hide();
}

/**
 * @description Continues the inventory process from where it left off.
 */
function continueScanning() {
    updateBookDatabase();
    $("#inventory-popup").show();
    $("#inventory-next-button").hide();
    $("#inventory-inner-popup-box").html("<p>Please scan the barcode on the book now.</p>");
    $("#inventory-book-barcode").on("blur", () => {
        $("#inventory-book-barcode").trigger("focus");
    });
    $("#inventory-book-barcode").trigger("focus");
    $("#inventory-book-barcode").off("keydown");
    $("#inventory-book-barcode").on("keydown", (event) => {
        if (event.key === "Enter") {
            $("#inventory-book-barcode").off("blur");
            if ($("#inventory-book-barcode").val()) {
                // Some checks should be done to ensure the barcode is valid, the book hasn't been scanned, etc.
                updateDoc(doc(db, "admin", "inventory"), {
                    books: arrayUnion($("#inventory-book-barcode").val())
                });
            }
        }
    });
}

/**
 * @description Sets up the admin help page.
 */
export function setupAdminHelp() {
    $("#tableOfContents li a").each((index, a) => {
        $(a).attr("href", "/admin/help#section" + (index + 1));
    });
    $("#sections > li").each((index, li) => {
        $(li).attr("id", "section" + (index + 1));
    });
    $(".back-to-top").each((index, li) => {
        $(li).children().attr("href", "/admin/help");
        $(li).children().on("click", () => {
            windowScroll(0);
        });
    });

    let adminHelpScrollingFn;
    if (!adminHelpScrollingFn){
        adminHelpScrollingFn = new Throttle(adminHelpScrolling, 100).get();
    }
    document.addEventListener("scroll", adminHelpScrollingFn);

    $(window).on("beforeunload", () => {
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
    $("#tableOfContents, #sections > li").each((index, li) => {
        // Check if the section is above the top of the screen.
        // Used to be 90 to account for the header, but I added more to make it more natural.
        if ($(li).offset().top - $(document).scrollTop() - 165 < 0) {
            currentSection = index;
        }
    });
    // Change the URL to the current section.
    let url = "/admin/help";
    let newHash;
    if (currentSection == 0) {
        newHash = "#top";
    } else {
        newHash = "#section" + currentSection;
    }
    let currentUrl = window.location.pathname + window.location.hash;
    if ((currentUrl != url + newHash) && !ignoreScroll) {
        console.log("Changing URL to " + url + newHash);
        historyManager.update(url + newHash);
        setCurrentHash(newHash);
    }
}

console.log("admin.js has loaded!");
