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
        // TO DO: As a nice to have, we could convert between them and add a check digit here to improve reliability
        goToPage('admin/editEntry?new=true&isbn=' + isbn);
    }

    function addEntryWithoutISBN() {
        goToPage('admin/editEntry?new=true');
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
                        reject();
                    });
                }).catch((error) => {
                    alert("There was an issue loading that info from the external database. Please ensure you input the isbn number correctly.");
                    console.error(error);
                    reject();
                });
            }).catch((error) => {
                alert("There was an issue loading that info from the external database. Please ensure you input the isbn number correctly.");
                console.error(error);
                reject();
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
    return new Promise(function (resolve, reject) {
        var total = 0;
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
    $("#edit-entry-search-results").show();

    if (searchQuery) {
        $("#edit-entry-search-results").empty();
        search(searchQuery).then((results) => {
            adminBookBoxes(results);
        });
    } else {
        alert("Please enter a search query");
    }
}

var input;
var canvas;
var ctx;
var imageObjArray = [];
var imageObjLoadedArray = [];
function setupBarcodePage() {
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
}

function mergeBarcodes() {
    for (var i = 0; i < 12; i++) {
        imageObjLoadedArray[i] = false;
    }
    input = document.getElementById("input").value;
    for (var i = 0; i < 12; i++) {
        imageObjArray.push(new Image());
        loadBarcodeImage(i);
    }
    imageObjArray[0].src = '/img/barcode-parts/A.png';
    imageObjArray[11].src = '/img/barcode-parts/B.png';
    for (var i = 1; i < 11; i++) {
        var temp = input.substring(i-1, i);
        imageObjArray[i].src = '/img/barcode-parts/' + temp + '.png';
    }
}

function loadBarcodeImage(num) {
    imageObjArray[num].onload = function() {
        console.log("Image #" + num + " has loaded");
        ctx.globalAlpha = 1;
        var position = 110 * num;
        if (num != 0) {
            position += 10;
        }
        ctx.drawImage(imageObjArray[num], position, 0);
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
                a.download = input + ".png";
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
    
    var digits = [];
    for (i = 0; i < length; i++) {
        digits[i] = parseInt(number.substring(0 + i, 1 + i));
    }

    var total = 0;
    for (i = 0; i < digits.length; i++) {
        if (i % 2 == 0) {
            total += digits[i];
        } else {
            total += digits[i] * 3;
        }
    }
    return 10 - (total % 10);
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
    number = parseInt(number);
    return number;
}

function verifyISBN(number) {
    if (number.toString().substring(0, 3) != "978") {
        number = switchISBNformats(number);
    }
    number = number.toString();
    
    var digits = [];
    for (i = 0; i < number.length; i++) {
        digits[i] = parseInt(number.substring(0 + i, 1 + i));
    }

    var total = 0;
    for (i = 0; i < digits.length - 1; i++) {
        if (i % 2 == 0) {
            total += digits[i];
        } else {
            total += digits[i] * 3;
        }
    }
    
    if (10 - (total % 10) == digits[digits.length - 1]) {
        return true;
    } else {
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
