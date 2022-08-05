import firebase from "firebase/compat/app";
import { goToPage } from "./ajax";
import { search, buildBookBox, findURLValue, getBookFromBarcode, verifyISBN } from "./common";
import { bookDatabase, db } from "./globals";

export function setupAdminMain() {
    $("#edit-entry-input").on("keydown", (event) => {
        if (event.key === "Enter") {
            adminSearch();
        }
    });

    $("#add-entry-isbn").on("keydown", (event) => {
        if (event.key === "Enter") {
            addEntry();
        }
    });

    $("#add-entry-without-isbn").on("click", () => {
        addEntryWithoutISBN();
    });

    $("#add-entry-with-specific-barcode-number-button").on("click", () => {
        addEntryWithSpecificBarcodeNumber();
    });

    $("#circulation-report-link").on("click", () => {
        goToPage('admin/report?type=circulation');
    });

    $("#purchases-report-link").on("click", () => {
        goToPage('admin/report?type=purchases');
    });

    $("#removed-report-link").on("click", () => {
        goToPage('admin/report?type=removed');
    });

    $("#inventory-link").on("click", () => {
        goToPage('admin/inventory');
    });

    $("#view-missing-barcodes").on("click", () => {
        viewMissingBarcodes();
    });

    $("#view-all-books").on("click", () => {
        goToPage('admin/view?type=books');
    });

    $("#view-all-users").on("click", () => {
        goToPage('admin/view?type=users');
    });

    $("#barcode-link").on("click", () => {
        goToPage('admin/barcode');
    });

    $("#import-link").on("click", () => {
        uploadDatabase();
    });

    $("#import-input").on("change", (event) => {
        setUploadDatabase(event);
    });

    $("#export-link").on("click", () => {
        downloadDatabase();
    });

    $("#add-entry-button").on("click", () => {
        addEntry();
    });

    $("#edit-entry-search").on("click", () => {
        adminSearch();
    });

    recentlyCheckedOut();
    addStats();
}

export function setupEditUser() {
    console.error("TODO: Write this function");
}


function addEntry() {
    var isbn = $("#add-entry-isbn").val();
    var check = verifyISBN(isbn);
    if (!check) {
        alert("The number you entered is not a valid ISBN Number.");
        return;
    }
    createEntry().then((newBarcode) => {
        // TO DO: As a nice to have, we could convert between them and add a check digit here to improve reliability
        goToPage("admin/editEntry?new=true&isbn=" + isbn + "&id=" + newBarcode);
    });
}

function addEntryWithoutISBN() {
    createEntry().then((newBarcode) => {
        goToPage("admin/editEntry?new=true&id=" + newBarcode);
    });
}

function addEntryWithSpecificBarcodeNumber() {
    var isbn = $("#add-entry-isbn").val();
    var check = verifyISBN(isbn);
    if (!check && isbn != "") {
        alert("The number you entered is not a valid ISBN Number.");
        return;
    }
    var specificBarcode = $("#add-entry-with-specific-barcode-number").val();
    getBookFromBarcode(specificBarcode).then((book) => {
        if (book.isDeleted || (book.title == "" && book.lastUpdated == null)) {
            const a = document.createElement("a");
            if (isbn == "") {
                a.href = "/admin/editEntry?new=true&id=" + specificBarcode;
            } else {
                a.href = "/admin/editEntry?new=true&isbn=" + isbn + "&id=" + specificBarcode;
            }
            a.innerHTML = "Click here to overwrite the barcode above.";
            $("#add-entry")[0].appendChild(a);
        } else {
            alert("You may not create a new book with this barcode. Please edit the book with that barcode normally.");
            return;
        }
    }).catch((barcodeNumber) => {
        alert("Could not find a valid book at: " + barcodeNumber);
    });
}



function adminSearch() {
    var searchQuery = $("#edit-entry-input").val();

    if (searchQuery) {
        $("#edit-entry-search-results").show();
        $("#edit-entry-search-results").empty();
        search(searchQuery, undefined, undefined, true).then((results) => {
            if (results.length == 0) {
                $("#edit-entry-search-results").html("Your search returned no results. Please try again.");
            } else {
                adminBookBoxes(results);
            }
        });
    } else {
        alert("Please enter a search query");
    }
}



function adminBookBoxes(objects) {
    for (let i = 0; i < objects.length; i++) {
        $("div#edit-entry-search-results")[0].appendChild(buildBookBox(objects[i], "edit-entry"));
    }
}



function createEntry() {
    return new Promise(function (resolve, reject) {
        // Run a Transaction to ensure that the correct barcode is used. (Atomic Transation)
        var lastBookDocQuery = db.collection("books").where("order", ">=", 0).orderBy("order", "desc").limit(1);
        lastBookDocQuery.get().then((querySnapshot) => {
            var topDoc;
            querySnapshot.forEach((doc) => {
                if (!doc.exists) {
                    throw "The books document doesn't exist";
                }
                topDoc = doc;
            });

            db.runTransaction((transaction) => {
                return transaction.get(db.collection("books").doc(topDoc.id)).then((doc2) => {
                    if (!doc2.exists) {
                        throw "Document does not exist!";
                    }

                    var order = doc2.data().order;
                    var numBooksInDoc = doc2.data().books.length;

                    try {
                        var next = order + 1;
                        if (next < 10) {
                            next = "00" + (next);
                        } else if (next < 100) {
                            next = "0" + (next);
                        }
                        db.collection("books").doc(next).get().then((doc) => {
                            if (doc.exists) {
                                console.error("A new book doc was created, it shouldn't have been, so abort!");
                                alert("A database error has occurred.");
                                throw "Something went wrong.";
                            }
                        }).catch((err) => {
                            console.log(err, "Hopefully the line before doesn't say that something went wrong.... If it didn't, the next document doesn't exist, which is a good thing.");
                        });
                    } catch {
                        console.log("Something about the try catch failed....");
                    }

                    if (numBooksInDoc == 100) {
                        // A new book doc has to be created...
                        var newNumber = order + 1;
                        if (newNumber < 10) {
                            newNumber = "00" + newNumber;
                        } else if (newNumber < 100) {
                            newNumber = "0" + newNumber;
                        }
                        let barcode = "11711" + newNumber + "00";
                        transaction.set(db.collection("books").doc(newNumber), {
                            books: [{
                                barcodeNumber: barcode,
                                title: "",
                                subtitle: "",
                                authors: [{ first: "", last: "" }],
                                illustrators: [],
                                medium: "",
                                coverImageLink: "",
                                thumbnailImageLink: null,
                                subjects: [],
                                description: "",
                                audience: [false, false, false, false],
                                isbn10: "",
                                isbn13: "",
                                publishers: [],
                                publishDate: null,
                                numberOfPages: 0,
                                ddc: "",
                                purchaseDate: null,
                                purchasePrice: "",
                                vendor: "",
                                keywords: [],
                                canBeCheckedOut: true,
                                isDeleted: false,
                                isHidden: true,
                                lastUpdated: null
                            }],
                            order: order + 1
                        });
                        return barcode;
                    } else {
                        if (order < 10) {
                            order = "00" + order;
                        } else if (order < 100) {
                            order = "0" + order;
                        }

                        let barcode;
                        if (numBooksInDoc < 10) {
                            barcode = "11711" + order + "0" + numBooksInDoc;
                        } else {
                            barcode = "11711" + order + numBooksInDoc;
                        }
                        transaction.update(db.collection("books").doc(order), {
                            books: firebase.firestore.FieldValue.arrayUnion({
                                barcodeNumber: barcode,
                                title: "",
                                subtitle: "",
                                authors: [{ first: "", last: "" }],
                                illustrators: [],
                                medium: "",
                                coverImageLink: "",
                                subjects: [],
                                description: "",
                                audience: [false, false, false, false],
                                isbn10: "",
                                isbn13: "",
                                publishers: [],
                                publishDate: null,
                                numberOfPages: 0,
                                ddc: "",
                                purchaseDate: null,
                                purchasePrice: "",
                                vendor: "",
                                keywords: [],
                                canBeCheckedOut: true,
                                isDeleted: false,
                                isHidden: true,
                                lastUpdated: null
                            })
                        });
                        return barcode;
                    }
                });
            }).then((newBarcode) => {
                // After both writes complete, send the user to the edit page and take it from there.
                console.log("New Entry Created with barcode: ", newBarcode);
                // editEntry(newBarcode);
                resolve(newBarcode);
            });
        }).catch((err) => {
            console.error(err);
            reject(err);
        });
    });
}

var input;
var input1;
var input2;
var canvas;
var ctx;
export function setupBarcodePage() {
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    $("#merge-one-barcode").on("click", () => {
        mergeBarcodes();
    });

    $("#merge-multiple-barcodes").on("click", () => {
        mergeBarcodes(true);
    });
}

function mergeBarcodes(multiple = false) {
    var numberOfBarcodes;
    var currentBarcode;
    if (!multiple) {
        numberOfBarcodes = 1;
        input = document.getElementById("barcode-single-input").value;
        input = "11711" + input;
        currentBarcode = parseInt(input);
        if (input.length != 10 || input.indexOf("11711") == -1) {
            alert("That barcode is not valid");
            return;
        }
    }
    if (multiple) {
        input1 = document.getElementById("barcode-multiple-input-start").value;
        input1 = "11711" + input1;
        input2 = document.getElementById("barcode-multiple-input-end").value;
        input2 = "11711" + input2;
        if (input1.length != 10 || input1.indexOf("11711") == -1) {
            alert("The starting barcode is not valid");
            return;
        }
        if (input2.length != 10 || input2.indexOf("11711") == -1) {
            alert("The ending barcode is not valid");
            return;
        }
        if (parseInt(input1) >= parseInt(input2)) {
            alert("The ending barcode must be larger than the starting barcode");
            return;
        }
        numberOfBarcodes = parseInt(input2) - parseInt(input1) + 1;
        currentBarcode = parseInt(input1);
    }
    for (let i = 0; i < numberOfBarcodes; i++) {
        if (i != 0) {
            currentBarcode++;
        }
        var imageObjArray = [];
        var imageObjLoadedArray = [];
        var delay = i * 1500 + (Math.floor(i / 5) * 2000);
        setTimeout((currentBarcode, imageObjArray, imageObjLoadedArray, i, numberOfBarcodes) => {
            if (i == numberOfBarcodes - 1) {
                setTimeout(() => {
                    alert("Download Complete");
                }, 2000);
            }
            let currentBarcodeString = currentBarcode.toString();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = "bold 60px Poppins";
            ctx.textAlign = "center";
            // var textWidth = ctx.measureText("South Church Library");
            ctx.fillText("South Church Library", (canvas.width / 2), 60);
            var barcodeStyled = currentBarcodeString.substring(0, 1) + "  " + currentBarcodeString.substring(1, 5) + "  " + currentBarcodeString.substring(5, currentBarcodeString.length);
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
                var temp = currentBarcodeString.substring(i - 1, i);
                imageObjArray[i].src = "/img/barcode-parts/" + temp + ".png";
            }
        }, delay, currentBarcode, imageObjArray, imageObjLoadedArray, i, numberOfBarcodes);
    }
}

function loadBarcodeImage(num, imageObjArray, imageObjLoadedArray, currentBarcodeString) {
    imageObjArray[num].onload = function () {
        // console.log("Image #" + num + " has loaded");
        ctx.globalAlpha = 1;
        var position = 110 * 0.6 * num + 160;
        if (num != 0) {
            position += 10;
        }
        ctx.drawImage(imageObjArray[num], position, 95, imageObjArray[num].width * 0.6, imageObjArray[num].height * 0.6);
        imageObjLoadedArray[num] = true;
        var allLoaded = true;
        for (let i = 0; i < 12; i++) {
            if (imageObjLoadedArray[i]) {
                continue;
            } else {
                allLoaded = false;
            }
        }
        if (allLoaded) {
            canvas.toBlob((blob) => {
                var url = window.URL.createObjectURL(blob);
                var a = document.getElementById("link");
                a.href = url;
                a.download = currentBarcodeString + ".png";
                a.trigger("click");
                window.URL.revokeObjectURL(url);
            });
        }
    };

}

function recentlyCheckedOut() {
    var d = new Date(2021, 1, 1);
    db.collection("users").where("lastCheckoutTime", ">", d).orderBy("lastCheckoutTime").limit(5).get().then((querySnapshot) => {
        var bookTimes = [];
        querySnapshot.forEach((doc) => {
            var co = doc.data().checkouts;
            for (let i = 0; i < co.length; i++) {
                bookTimes.push({ book: co[i].bookRef, barcode: co[i].barcodeNumber, time: co[i].timeOut });
                if (bookTimes.length == 6) {
                    bookTimes.sort((a, b) => a.time - b.time);
                    bookTimes.pop();
                }
            }
        });
        for (let i = 0; i < bookTimes.length; i++) {
            var currentBook = bookTimes[i];
            currentBook.book.get().then((doc) => {
                if (!doc.exists) {
                    // TODO: When (or if) a book is deleted from the database, you can't try to get it. This may or may not be a problem after testing.
                    console.error("doc does not exist");
                    return;
                }
                for (let j = 0; j < doc.data().books.length; j++) {
                    if (doc.data().books[j].barcodeNumber == currentBook.barcode) {
                        $("#checked-out-books-container")[0].appendChild(buildBookBox(doc.data().books[j], "admin"));
                    }
                }
            });
        }
    });
}

function addStats() {
    let count = 0;
    search("", 0, 0).then(() => {
        bookDatabase.forEach((document) => {
            // Iterate through each of the 10-ish docs
            for (let i = 0; i < document.books.length; i++) {
                // Iterate through each of the 100 books in each doc
                var book = document.books[i];
                if (book.isDeleted || book.barcodeNumber == 1171100000 || !book.lastUpdated) {
                    continue;
                }
                count++;
            }
        });
        $("#number-of-books").html(count);
    });
}

function viewMissingBarcodes() {
    var missingArray = [];
    bookDatabase.forEach((document) => {
        // Iterate through each of the 10-ish docs
        for (let i = 0; i < document.books.length; i++) {
            // Iterate through each of the 100 books in each doc
            var book = document.books[i];
            if (book.barcodeNumber == 1171100000 || (book.lastUpdated && !book.isDeleted)) {
                continue;
            }
            missingArray.push(book);
        }
    });
    var message = "The following Barcodes have been created, but they have never been updated:\n";
    missingArray.forEach((book) => {
        message += book.barcodeNumber + "\n";
    });
    alert(message);
}

function downloadDatabase() {
    search("", 0, 0, true).then(() => {
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bookDatabase));
        const a = document.createElement("a");
        a.style.display = "none";
        a.id = "download-database-link";
        a.download = "database.json";
        a.href = dataStr;
        a.innerHTML = "Click Here to download the database";
        $("#content")[0].appendChild(a);
        window.setTimeout(() => {
            $("#download-database-link")[0].trigger("click");
        }, 500);
    });
}

function uploadDatabase() {
    $("#import-input").trigger("click");
}

function importFile(event) {
    return new Promise(function (resolve) {
        resolve(event.target.files[0]);
    });
}

function setUploadDatabase() {
    importFile.then((file) => {
        var dataToUpload = JSON.parse(JSON.stringify(file));
        console.log(dataToUpload);
        alert("The database wasn't uploaded, because this function didn't get finished.");
    });
}




export function setupView(pageQuery) {
    var type = findURLValue(pageQuery, "type");
    if (type == "books") {
        search("", 0, 0, true).then(() => {
            bookDatabase.forEach((doc) => {
                doc.books.forEach((book) => {
                    $("div#view-container")[0].appendChild(buildBookBox(book, "view"));
                });
            });
        });
    } else if (type == "users") {
        getAllUsers().then(() => {
            userDatabase.forEach((user) => {
                $("div#view-container")[0].appendChild(buildUserBox(user, "view"));
            });
        });
    } else {
        console.warn("There was no valid type to view.");
        goToPage("admin/main");
    }
}


function buildUserBox(obj, page, num = 0) {
    const div = document.createElement("div");
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
    img.classList.add("bookimage");
    img.src = obj.pfpLink;
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
        div.addEventListener("click", () => {
            goToPage("admin/editUser?id=" + obj.cardNumber);
        });
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
        const lastSignIn = document.createElement("p");
        lastSignIn.classList.add("subjects");
        lastSignIn.appendChild(document.createTextNode("Last Sign In: " + formatDate(obj.lastSignIn)));
        div3.appendChild(lastSignIn);
        const lastCheckoutTime = document.createElement("p");
        lastCheckoutTime.classList.add("subjects");
        lastCheckoutTime.appendChild(document.createTextNode("Last Checkout Time: " + formatDate(obj.lastCheckoutTime)));
        div3.appendChild(lastCheckoutTime);
        const checkouts = document.createElement("p");
        checkouts.classList.add("description");
        checkouts.appendChild(document.createTextNode(obj.checkouts));
        div3.appendChild(checkouts);
    }
    return div;
}

function formatDate(date) {
    if (!date) {
        return "N/A";
    }
    return date.toDate().toLocaleString("en-US");
}

var userDatabase = [];
function getAllUsers() {
    return /** @type {Promise<void>} */(new Promise(function (resolve) {
        db.collection("users").where("cardNumber", ">=", 0).orderBy("cardNumber", "asc").get().then((querySnapshot) => {
            userDatabase = [];
            querySnapshot.forEach((doc) => {
                if (!doc.exists) {
                    console.error("user document does not exist");
                    return;
                }
                userDatabase.push(doc.data());
            });
            resolve();
        });
    }));
}


var inventoryCheck = false;
function restartInventory() {
    if (!inventoryCheck) {
        alert("Are you sure you want to restart? This will delete your current progress. If you do, you must click the restart button again to confirm.");
        inventoryCheck = true;
        window.setTimeout(() => {
            inventoryCheck = false;
        }, 5000);
        return;
    }
    db.collection("admin").doc("inventory").set({
        books: []
    });
    alert("The Inventory Progress has been reset.");
    window.location.reload();
}

export function setupInventory() {
    loadInventory().then(() => {
        cachedInventory.forEach((barcode) => {
            var current = $("#recent-scans").html();
            $("#recent-scans").html(current + "<br>" + barcode);
        });
    });

    $("#restart-inventory").on("click", () => {
        restartInventory();
    });

    $("#inventory-cancel-button").on("click", () => {
        cancelInventory();
    });

    $("#inventory-next-button").on("click", () => {
        continueScanning();
    });

    $("#continue-scanning-button").on("click", () => {
        continueScanning();
    });
}

var cachedInventory = [];
function loadInventory() {
    return /** @type {Promise<void>} */(new Promise(function (resolve) {
        db.collection("admin").doc("inventory").get().then((doc) => {
            if (!doc.exists) {
                console.error("inventory document does not exist");
                return;
            }
            cachedInventory = doc.data().books;
            resolve();
        });
    }));
}

function cancelInventory() {
    $("#inventory-book-barcode").off("blur");
    $("#inventory-popup").hide();
}

function continueScanning() {
    search("", 0, 0, true);
    $("#inventory-popup").show();
    $("#inventory-next-button").hide();
    $("#inventory-inner-popup-box").html("<p>Please scan the barcode on the book now.</p>");
    $("#inventory-book-barcode").blur(() => {
        $("#inventory-book-barcode").focus();
    });
    $("#inventory-book-barcode").focus();
    $("#inventory-book-barcode").off("keydown");
    $("#inventory-book-barcode").on("keydown", (event) => {
        if (event.key === "Enter") {
            $("#inventory-book-barcode").off("blur");
            if ($("#inventory-book-barcode").val()) {
                // Some checks should be done to ensure the barcode is valid, the book hasn't been scanned, etc.
                db.collection("admin").doc("inventory").update({
                    books: firebase.firestore.FieldValue.arrayUnion($("#inventory-book-barcode").val())
                });
            }
        }
    });
}
