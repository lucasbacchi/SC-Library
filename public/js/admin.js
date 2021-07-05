function setupAdminMain() {
    $("#edit-entry-barcode").keydown(function(event) {
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
    let indexBooksPath = db.collection("index_books");
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

    if (searchQuery) {
        $("#edit-entry-search-results").empty();
        search(searchQuery).then((results) => {
            adminBookBoxes(results);
        });
    } else {
        alert("Please enter a search query");
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
    var books = [{photoURL: "../img/favicon.ico", title: "The Martian", author: "Andy Weir"},
                 {photoURL: "../img/favicon.ico", title: "A Tale of Two Cities", author: "Charles Dickens"},
                 {photoURL: "../img/favicon.ico", title: "Aurora", author: "Kim Stanley Robinson"},
                 {photoURL: "../img/favicon.ico", title: "Macbeth", author: "William Shakespeare"},
                 {photoURL: "../img/favicon.ico", title: "Artemis Fowl", author: "Eoin Colfer"}];
    for (var i = 0; i < books.length; i++) {
        $("#checked-out-books-container")[0].appendChild(buildBookBox(books[i], "admin"));
    }
}