function setupAdminMain() {
    $("#edit-entry-input").keydown(function(event) {
        if (event.keyCode === 13) {
            adminSearch();
        }
    });

    $("#add-entry-isbn").keydown(function(event) {
        if (event.keyCode === 13) {
            addEntry();
        }
    });

    recentlyCheckedOut();
    addStats();
}

var bookObject;
var authorObject;
var worksObject;
{

    let booksPath = db.collection("books");
    let usersPath = db.collection("users");


    function addEntry() {
        var isbn = $("#add-entry-isbn").val();
        var check = verifyISBN(isbn);
        if (!check) {
            alert("The number you entered is not a valid ISBN Number.");
            return;
        }
        createEntry().then((newBarcode) => {
            // TO DO: As a nice to have, we could convert between them and add a check digit here to improve reliability
            goToPage('admin/editEntry?new=true&isbn=' + isbn + "&id=" + newBarcode);
        });
    }

    function addEntryWithoutISBN() {
        createEntry().then((newBarcode) => {
            goToPage('admin/editEntry?new=true&id=' + newBarcode);
        });
    }

    function addEntryWithSpecificBarcodeNumber() {
        var isbn = $("#add-entry-isbn").val();
        var check = verifyISBN(isbn);
        if (isbn == "") {
            alert("You must enter an ISBN number above.");
            return;
        }
        if (!check) {
            alert("The number you entered is not a valid ISBN Number.");
            return;
        }
        var specificBarcode = $("#add-entry-with-specific-barcode-number").val();
        getBookFromBarcode(specificBarcode).then((book) => {
            if (book.isDeleted || (book.title == "" && book.lastUpdated == null)) {
                const a = document.createElement("a");
                a.href = "/admin/editEntry?new=true&isbn=" + isbn + "&id=" + specificBarcode;
                a.innerHTML = "Click here to overwrite the barcode above."
                $("#add-entry")[0].appendChild(a);
            } else {
                alert("You may not create a new book with this barcode. Please edit the book with that barcode normally.");
                return;
            }
        });
    }
    
    function gatherExternalInformation(isbn) {
        return new Promise(function (resolve, reject) {
            if (isbn == "") {
                // In this case, the entry was created without an isbn
                resolve(true);
            }
            lookupBook(isbn)
            .then((bookObjectReturn) => {
                bookObject = bookObjectReturn;
                lookupAuthor(bookObject)
                .then((authorObjectReturn) => {
                    authorObject = authorObjectReturn;
                    lookupWorks(bookObject)
                    .then((worksObjectReturn) => {
                        worksObject = worksObjectReturn;
                        resolve();
                    }).catch((error) => {
                        alert("There was an issue loading that info from the external database. Please ensure you input the isbn number correctly.");
                        console.error(error);
                        resolve(true);
                        return;
                    });
                }).catch((error) => {
                    alert("There was an issue loading that info from the external database. Please ensure you input the isbn number correctly.");
                    console.error(error);
                    resolve(true);
                    return;
                });
            }).catch((error) => {
                alert("There was an issue loading that info from the external database. Please ensure you input the isbn number correctly.");
                console.error(error);
                resolve(true);
                return;
            });
        });
    }
}

function lookupBook(isbn) {
    return new Promise(function(resolve, reject) {
        let xhttp = new XMLHttpRequest();

        xhttp.open("GET", "https://openlibrary.org/isbn/" + isbn + ".json");
        xhttp.send();
        xhttp.onreadystatechange = function() {
            if (this.status == 404 || this.status == 403 || this.status == 400) {
                reject();
            }
            if (this.readyState == 4 && this.status == 200) {
                resolve(JSON.parse(xhttp.responseText));
            }
        }
    });
}

function lookupAuthor(bookObject) {
    console.log(bookObject);
    return new Promise(function (resolve, reject) {
        var total = 0;
        if (bookObject.authors) {
            for (let i = 0; i < bookObject.authors.length; i++) {
                let xhttp = new XMLHttpRequest();
                var authorLink = bookObject.authors[i].key;

                xhttp.open("GET", "https://openlibrary.org" + authorLink + ".json");
                xhttp.send();
                total++;
                xhttp.onreadystatechange = function() {
                    if (this.status == 404 || this.status == 403 || this.status == 400) {
                        reject();
                    }
                    if (this.readyState == 4 && this.status == 200) {
                        var authorObject = [];
                        authorObject[i] = JSON.parse(xhttp.responseText);
                        if (i == total - 1) {
                            resolve(authorObject);
                        }
                    }
                }
            }
        } else {
            resolve(true);
        }
    });
}

function lookupWorks(bookObject) {
    return new Promise(function (resolve, reject) {
        var total = 0;
        for (let i = 0; i < bookObject.works.length; i++) {
            let xhttp = new XMLHttpRequest();
            var worksLink = bookObject.works[i].key;

            xhttp.open("GET", "https://openlibrary.org" + worksLink + ".json");
            xhttp.send();
            total++;
            xhttp.onreadystatechange = function() {
                if (this.status == 404 || this.status == 403 || this.status == 400) {
                    reject();
                }
                if (this.readyState == 4 && this.status == 200) {
                    var worksObject = [];
                    worksObject[i] = JSON.parse(xhttp.responseText);
                    if (i == total - 1) {
                        resolve(worksObject);
                    }
                }
            }
        }
    });
}



function addSubject() {
    var numberofSubjects = $(".subject-field").length;
    $("#book-subject-" + numberofSubjects).after("<input id=\"book-subject-" + (numberofSubjects + 1) + "\" placeholder=\"\" class=\"normal-form-input subject-field\">")
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
                                throw "Something went wrong."
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
                        if (order < 10) {
                            newNumber = "00" + newNumber;
                        } else if (order < 100) {
                            newNumber = "0" + newNumber;
                        }
                        var barcode = "11711" + newNumber + "00";
                        transaction.set(db.collection("books").doc(newNumber), {
                            books: [{
                                barcodeNumber: barcode,
                                title: "",
                                subtitle: "",
                                authors: [{first: "", last: ""}],
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
                            }],
                            order: order + 1
                        });
                        return barcode;
                    } else {
                        debugger;
                        if (order < 10) {
                            order = "00" + order;
                        } else if (order < 100) {
                            order = "0" + order;
                        }
                        
                        var barcode;
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
                                authors: [{first: "", last: ""}],
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
function setupBarcodePage() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
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
    for (var i = 0; i < numberOfBarcodes; i++) {
        if (i != 0) {
            currentBarcode++;
        }
        var imageObjArray = [];
        var imageObjLoadedArray = [];
        var delay = i * 1500 + (Math.floor(i/5) * 2000);
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
            var textWidth = ctx.measureText("South Church Library");
            ctx.fillText("South Church Library", (canvas.width/2), 60);
            var barcodeStyled = currentBarcodeString.substring(0,1) + "  " + currentBarcodeString.substring (1, 5) + "  " + currentBarcodeString.substring(5, currentBarcodeString.length);
            ctx.font = "bold 78px Poppins";
            textWidth = ctx.measureText(barcodeStyled);
            ctx.fillText(barcodeStyled, (canvas.width/2), 350);
            ctx.font = "45px Poppins";
            textWidth = ctx.measureText("Andover, MA");
            ctx.translate(70, (canvas.height/2)-5);
            ctx.rotate(270 * (Math.PI / 180));
            ctx.fillText("Andover, MA", 0, 0);
            ctx.rotate(-270 * (Math.PI / 180));
            ctx.translate(-70, -(canvas.height/2)+5);
            ctx.font = "45px Poppins";
            ctx.translate(1055, (canvas.height/2)-5);
            ctx.rotate(90 * (Math.PI / 180));
            ctx.fillText("Andover, MA", 0, 0);
            ctx.rotate(-90 * (Math.PI / 180));
            ctx.translate(-1055, -(canvas.height/2)+5);

            for (var i = 0; i < 12; i++) {
                imageObjLoadedArray[i] = false;
            }
            for (var i = 0; i < 12; i++) {
                imageObjArray.push(new Image());
                loadBarcodeImage(i, imageObjArray, imageObjLoadedArray, currentBarcodeString);
            }
            imageObjArray[0].src = '/img/barcode-parts/A.png';
            imageObjArray[11].src = '/img/barcode-parts/B.png';
            for (var i = 1; i < 11; i++) {
                var temp = currentBarcodeString.substring(i-1, i);
                imageObjArray[i].src = '/img/barcode-parts/' + temp + '.png';
            }
        }, delay, currentBarcode, imageObjArray, imageObjLoadedArray, i, numberOfBarcodes);
    }
}

function loadBarcodeImage(num, imageObjArray, imageObjLoadedArray, currentBarcodeString) {
    imageObjArray[num].onload = function() {
        // console.log("Image #" + num + " has loaded");
        ctx.globalAlpha = 1;
        var position = 110 * 0.6 * num + 160;
        if (num != 0) {
            position += 10;
        }
        ctx.drawImage(imageObjArray[num], position, 95, imageObjArray[num].width * 0.6, imageObjArray[num].height * 0.6);
        imageObjLoadedArray[num] = true;
        var allLoaded = true;
        for (var i = 0; i < 12; i++) {
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
                a.click();
                window.URL.revokeObjectURL(url);
            });
        }
    }
    
}


function calculateISBNCheckDigit(number) {
    number = number.toString();
    var length = number.length;
    if (length == 13 || length == 10) {
        console.warn("The ISBN number already has a check digit");
        return;
    }

    if (length == 12) {
        var digits = [];
        for (i = 0; i < length; i++) {
            digits[i] = parseInt(number.substring(i, i + 1));
        }

        var total = 0;
        for (i = 0; i < digits.length; i++) {
            if (i % 2 == 0) {
                total += digits[i];
            } else {
                total += digits[i] * 3;
            }
        }
        return (10 - (total % 10)).toString();
    } else if (length == 9) {
        var digits = [];
        var total = 0;
        for (i = 0; i < length; i++) {
            digits[i] = parseInt(number.substring(i, i + 1));
        }

        
        for (i = 0; i < digits.length; i++) {
            total += digits[i] * (10 - i);
        }
        
        var answer = (11 - (total % 11)) % 11;
        if (answer == 10) {
            answer = "X";
        }
        return answer.toString();
    }
}

function switchISBNformats(number) {
    number = number.toString();
    if (number.substr(0, 3) == "978") {
        number = number.substring(3, number.length - 1);
    } else {
        number = "978" + number;
        number = number.substring(0, number.length - 1)
    }
    number = number + calculateISBNCheckDigit(number);
    // number = parseInt(number);
    return number;
}

function verifyISBN(number) {
    if (number.toString().length == 10) {
        number = number.toString();
        
        var digits = [];
        for (i = 0; i < number.length; i++) {
            if (number.substring(i, i + 1) == "X") {
                digits[i] = 10;
            } else {
                digits[i] = parseInt(number.substring(i, i + 1));
            }
        }

        var total = 0;
        for (i = 0; i < digits.length; i++) {
            total += digits[i] * (10 - i);
        }
        
        if (total % 11 == 0) {
            return true;
        } else {
            return false;
        }
    } else if (number.toString().length == 13) {
        number = number.toString();
        
        var digits = [];
        for (i = 0; i < number.length; i++) {
            digits[i] = parseInt(number.substring(i, i + 1));
        }

        var total = 0;
        for (i = 0; i < digits.length - 1; i++) {
            if (i % 2 == 0) {
                total += digits[i];
            } else {
                total += digits[i] * 3;
            }
        }
        
        if ((10 - (total % 10)) % 10 == digits[digits.length - 1]) {
            return true;
        } else {
            return false;
        }
    } else {
        console.warn("That is not a valid ISBN number");
        return false;
    }
}

function recentlyCheckedOut() {
    var d = new Date(2021, 1, 1);
    db.collection("users").where("lastCheckoutTime", ">", d).orderBy("lastCheckoutTime").limit(5).get().then((querySnapshot) => {
        var bookTimes = [];
        querySnapshot.forEach((doc) => {
            var co = doc.data().checkouts;
            for (var i = 0; i < co.length; i++) {
                bookTimes.push({book: co[i].bookRef, barcode: co[i].barcodeNumber, time: co[i].timeOut});
                if (bookTimes.length == 6) {
                    bookTimes.sort((a, b) => a.time - b.time);
                    bookTimes.pop();
                }
            }
        });
        for (var i = 0; i < bookTimes.length; i++) {
            var currentBook = bookTimes[i];
            currentBook.book.get().then((doc) => {
                if (!doc.exists) {
                    // TODO: When (or if) a book is deleted from the database, you can't try to get it. This may or may not be a problem after testing.
                    console.error("doc does not exist");
                    return;
                }
                for (var j = 0; j < doc.data().books.length; j++) {
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
            for (var i = 0; i < document.books.length; i++) {
                // Iterate through each of the 100 books in each doc
                var book = document.books[i];
                if (book.isDeleted) {
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
        for (var i = 0; i < document.books.length; i++) {
            // Iterate through each of the 100 books in each doc
            var book = document.books[i];
            if (book.lastUpdated) {
                continue;
            }
            missingArray.push(book)
        }
    });
    var message = "The following Barcodes have been created, but they have never been updated:\n";
    missingArray.forEach((book) => {
        message += book.barcodeNumber + "\n";
    });
    alert(message);
}

function downloadDatabase() {
    search("", 0, 0, true).then(() =>{
        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bookDatabase));
        const a = document.createElement("a");
        a.style.display = "none";
        a.id = "download-database-link";
        a.download = "database.json";
        a.href = dataStr;
        $("#content")[0].appendChild(a);
        $("#download-database-link").click();
    });
}

function uploadDatabase() {
    $("#import-input").click();
}

function importFile(event) {
    return new Promise(function (resolve, reject) {
        resolve(event.target.files[0]);
    });
}

function setUploadDatabase() {
    importFile.then((file) => {
        var dataToUpload = JSON.parse(JSON.stringify(file));
        console.log(dataToUpload);
        alert("The database wasn't uploaded, because this function didn't get finished.");
    })
}
