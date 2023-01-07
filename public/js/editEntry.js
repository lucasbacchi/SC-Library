import { goToPage } from "./ajax";
import { findURLValue, switchISBNformats, verifyISBN } from "./common";
import { app, Audience, Book, db, Person, setTimeLastSearched } from "./globals";
import { arrayUnion, collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, where } from "firebase/firestore";
import { deleteObject, getDownloadURL, getStorage, list, ref, uploadBytes } from "firebase/storage";


var newEntry = null;
var barcodeNumber;
var isbn;
var imageChanged;

/**
 * @description This function sets up the edit entry page, and starts the process of getting the data from the database or Open Library.
 * @param {String} pageQuery The query string from the URL
 */
export function setupEditEntry(pageQuery) {
    file = null;
    newEntry = (findURLValue(pageQuery, "new") == "true");
    barcodeNumber = parseInt(findURLValue(pageQuery, "id", true));
    isbn = findURLValue(pageQuery, "isbn", true);
    imageChanged = false;

    if (newEntry == false && (barcodeNumber < 1171100000 || barcodeNumber > 1171199999)) {
        alert("The barcode that you are trying to edit is not valid.");
        goToPage("admin/main");
        return;
    }

    if (!newEntry) {
        // If this is not a new entry, just get the content that exists in the database
        populateEditEntryFromDatabase(barcodeNumber);
    } else {
        // If this is a new entry (and they are creating it for the first time) go get info from open library
        if (isbn.length == 10 || isbn.length == 13) {
            gatherExternalInformation(isbn).then((returnValue) => {
                // If this is a brand new entry...
                // returnValue will be in the form of noISBN = false, bookObject, authorObject, worksObject
                loadDataOnToEditEntryPage(returnValue[0], returnValue[1], returnValue[2], returnValue[3]);
            }).catch((error) => {
                // The ISBN Number is valid, but there is not a listing in Open Library
                alert("The ISBN number that you entered (" + isbn + ") appears to be a valid number, but we did not find a listing for it in Open Library. You will need to create an entry manually.");
                console.warn("Could not find an entry in Open Library for this isbn", error);
            });
        } else {
            loadDataOnToEditEntryPage(true);
        }
    }

    // Create Event Listeners to handle book cover image changes
    // All are required to handle leaving the element and coming back again
    $("#book-cover-image").on("mouseover", () => {
        showAccountImageOverlay();
    });
    $("#book-cover-image-overlay").on("mouseleave", () => {
        $("#book-cover-image-overlay").css("opacity", "0");
        $("#book-cover-image-overlay").delay(300).hide(0);
    });
    $("#book-cover-image-overlay").on("mouseover", () => {
        $("#book-cover-image-overlay").clearQueue().stop();
        showAccountImageOverlay();
    });

    function showAccountImageOverlay() {
        $("#book-cover-image-overlay").show();
        setTimeout(() => {
            $("#book-cover-image-overlay").css("opacity", "1");
        }, 5);
    }

    // If a user clicks the button to change the book cover image, click the input button
    $("#book-cover-image-overlay").on("click", () => {
        if ($("#file-input")) {
            $("#file-input").trigger("click");
        }
    });

    // If the user attempts to leave, let them know if they have unsaved changes
    $(window).on("beforeunload", function (event) {
        if (changesDetected && !confirm("You have unsaved changes. Are you sure you want to leave this page?")) {
            event.preventDefault();
            return "If you leave the page now, your changes will not be saved. If this is a new entry, you will be left with a blank entry";
        } else {
            $(window).off("beforeunload");
        }
    });

    $("#book-medium")[0].addEventListener("input", (event) => {
        if (event.target.value == "av") {
            let goAway = $(".no-av");
            for (let i = 0; i < goAway.length; i++)
                goAway[i].style.display = "none";
        } else {
            let goAway = $(".no-av");
            for (let i = 0; i < goAway.length; i++)
                goAway[i].style.display = "";
        }
    });

    $("#book-unnumbered")[0].addEventListener("input", (event) => {
        if (event.target.checked == true) {
            $("#book-pages").val("");
            $("#book-pages")[0].disabled = true;
        } else {
            $("#book-pages").val("");
            $("#book-pages")[0].disabled = false;
        }
    });

    $("#book-no-isbn")[0].addEventListener("input", (event) => {
        if (event.target.checked == true) {
            $("#book-isbn-10").val("");
            $("#book-isbn-10")[0].disabled = true;
            $("#book-isbn-13").val("");
            $("#book-isbn-13")[0].disabled = true;
        } else {
            $("#book-isbn-10").val("");
            $("#book-isbn-10")[0].disabled = false;
            $("#book-isbn-13").val("");
            $("#book-isbn-13")[0].disabled = false;
        }
    });

    $("#file-input").on("change", (event) => {
        loadFile(event);
    });

    $("#edit-entry-save").on("click", () => {
        editEntry();
    });

    $("#delete-entry").on("click", () => {
        deleteEntry();
    });

    $("#edit-entry-cancel").on("click", () => {
        cancelEditEntry();
    });

    $("#edit-entry-delete").on("click", () => {
        toggleDeletePopup();
    });

    $("#delete-cancel").on("click", () => {
        toggleDeletePopup();
    });

    $("#add-subject").on("click", () => {
        addSubject();
    });

    watchForChanges();
}

var changesDetected = false;
/**
 * @description Watches for changes to the input fields and sets changesDetected to true if any changes are detected
 */
function watchForChanges() {
    changesDetected = false;
    $("input, textarea").on("input", () => {
        changesDetected = true;
    });
    $("select").on("change", () => {
        changesDetected = true;
    });
    $("#book-cover-image-overlay").on("click", () => {
        changesDetected = true;
    });
}

/**
 * @description Reads from the database and fills in the edit entry page with the data from the entry with the given barcode number.
 * @param {Number} barcodeNumber The barcode number of the entry to load
 */
function populateEditEntryFromDatabase(barcodeNumber) {
    if (isNaN(barcodeNumber)) {
        alert("We could not find an entry in the database with the barcode number that you entered.");
        console.error("barcodeNumber is not a number", barcodeNumber);
        return;
    }

    let document = Math.floor(barcodeNumber / 100) % 100;
    if (document >= 100) {
        document = "" + document;
    } else if (document >= 10) {
        document = "0" + document;
    } else {
        document = "00" + document;
    }
    getDoc(doc(db, "books/" + document)).then((docSnap) => {
        let data = Book.createFromObject(docSnap.data().books[barcodeNumber % 100]);

        if (!data) {
            alert("We could not find any data for a book with barcode number " + barcodeNumber);
            goToPage("admin/main");
            return;
        }

        $('#barcode').html(barcodeNumber);
        $("#book-title").val(data.title);
        $("#book-subtitle").val(data.subtitle);

        for (let i = 0; i < data.authors.length; i++) {
            $("#book-author-" + (i + 1) + "-last").val(data.authors[i].lastName);
            $("#book-author-" + (i + 1) + "-first").val(data.authors[i].firstName);
        }

        for (let i = 0; i < data.illustrators.length; i++) {
            $("#book-illustrator-" + (i + 1) + "-last").val(data.illustrators[i].lastName);
            $("#book-illustrator-" + (i + 1) + "-first").val(data.illustrators[i].firstName);
        }

        $("#book-medium").val(data.medium);

        $("#book-cover-image").attr('src', data.coverImageLink);

        for (let i = 0; i < data.subjects.length; i++) {
            addSubject();
            $("#book-subject-" + (i + 1)).val(data.subjects[i]);
        }

        $("#book-description").val(data.description);

        $("#book-audience-children").prop("checked", data.audience.children);
        $("#book-audience-youth").prop("checked", data.audience.youth);
        $("#book-audience-adult").prop("checked", data.audience.adult);
        $("#book-audience-none").prop("checked", data.audience.isNone());

        $("#book-isbn-10").val(data.isbn10);
        $("#book-isbn-13").val(data.isbn13);

        if (data.isbn10 == "" && data.isbn13 == "") {
            $("#book-no-isbn").prop("checked", true);
            $("#book-isbn-10")[0].disabled = true;
            $("#book-isbn-13")[0].disabled = true;
        }

        $("#book-publisher-1").val(data.publishers[0]);
        $("#book-publisher-2").val(data.publishers[1]);

        if (data.publishDate != null) {
            $("#book-publish-month").val(data.publishDate.getMonth() + 1);
            $("#book-publish-day").val(data.publishDate.getDate());
            $("#book-publish-year").val(data.publishDate.getFullYear());
        }

        if (data.numberOfPages != -1) {
            $("#book-pages").val(data.numberOfPages);
            $("#book-unnumbered").prop("checked", false);
        } else if (data.numberOfPages == -1) {
            $("#book-pages")[0].disabled = true;
            $("#book-unnumbered").prop("checked", true);
        }

        $("#book-dewey").val(data.ddc);

        let temp = (data.canBeCheckedOut) ? "y":"";
        $("#book-can-be-checked-out").val(temp);
        temp = (data.isHidden) ? "y":"";
        $("#book-is-hidden").val(temp);

        if (data.purchaseDate != null) {
            $("#book-purchase-month").val(data.purchaseDate.getMonth() + 1);
            $("#book-purchase-day").val(data.purchaseDate.getDate());
            $("#book-purchase-year").val(data.purchaseDate.getFullYear());
        }

        $("#book-purchase-price").val(data.purchasePrice);
        $("#book-vendor").val(data.vendor);

        if (data.lastUpdated != null) {
            let lastUpdated = data.lastUpdated;
            $("#last-updated").html("This entry was last updated on " + lastUpdated.toLocaleDateString('en-US') + " at " + lastUpdated.toLocaleTimeString('en-US'));
        }
    }).catch((error) => {
        alert("There was an error retreiving this book information from the database");
        console.error(error);
    });
}

/**
 * @description Gets the book information from Open Library
 * @param {String} isbn The ISBN number to search for.
 * @returns {Promise<Array<Boolean, Object, Object, Object>>} An array containing any information found in Open Library.
 *          Ideally, noISBN, the book object, the author object, and the works object.
 */
function gatherExternalInformation(isbn) {
    return (new Promise(function(resolve) {
        if (isbn == "") {
            // In this case, the entry was created without an isbn
            resolve(true);
            return;
        }
        lookupBook(isbn).then((bookObject) => {
            lookupAuthor(bookObject).then((value) => {
                let bookObject = value[0];
                let authorObject = value[1];
                lookupWorks(bookObject, authorObject).then((value) => {
                    let bookObject = value[0];
                    let authorObject = value[1];
                    let worksObject = value[2];
                    resolve([false, bookObject, authorObject, worksObject]);
                }).catch((error) => {
                    alert("There was an issue loading the works object info from the external database. Please ensure you input the isbn number correctly.");
                    console.error(error);
                    resolve([true]);
                    return;
                });
            }).catch((error) => {
                alert("There was an issue loading the author object from the external database. Please ensure you input the isbn number correctly.");
                console.error(error);
                resolve([true]);
                return;
            });
        }).catch((error) => {
            alert("There was an issue loading the book object info from the external database. Please ensure you input the isbn number correctly.");
            console.error(error);
            resolve([true]);
            return;
        });
    }));
}

/**
 * @description Looks up the book object from Open Library.
 * @param {String} isbn The ISBN number to search for.
 * @returns {Promise<Object>} The book object from Open Library. It is not an instance of the Book class.
 */
function lookupBook(isbn) {
    return new Promise(function (resolve, reject) {
        let xhttp = new XMLHttpRequest();

        xhttp.open("GET", "https://openlibrary.org/isbn/" + isbn + ".json");
        xhttp.onreadystatechange = function () {
            if (this.status == 404 || this.status == 403 || this.status == 400) {
                reject("Invalid Response");
            }
            if (this.readyState == 4 && this.status == 200) {
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
function lookupAuthor(bookObject) {
    console.log(bookObject);
    return new Promise(function (resolve, reject) {
        let total = 0;
        if (bookObject.authors) {
            for (let i = 0; i < bookObject.authors.length; i++) {
                let xhttp = new XMLHttpRequest();
                let authorLink = bookObject.authors[i].key;

                xhttp.open("GET", "https://openlibrary.org" + authorLink + ".json");

                xhttp.timeout = 5000;
                xhttp.ontimeout = (event) => {
                    reject("Request Timed Out");
                    console.error(event);
                };
                xhttp.send();

                total++;
                xhttp.onreadystatechange = function () {
                    if (this.status == 404 || this.status == 403 || this.status == 400) {
                        reject("Invalid Response");
                    }
                    if (this.readyState == 4 && this.status == 200) {
                        let authorObject = [];
                        authorObject[i] = JSON.parse(xhttp.responseText);
                        // Only resolve if all of the xhttp requests have been completed
                        if (i == total - 1) {
                            resolve([bookObject, authorObject]);
                        }
                    }
                };
            }
        } else {
            resolve(true);
        }
    });
}

/**
 * @description Looks up the works object from Open Library.
 * @param {Object} bookObject The book object to be used to find the works object. It is also passed through.
 * @param {Object} authorObject The author object is also passed through.
 * @returns {Promise<Array<Object, Object, Object>>} Returns a promise with an array containing the book object, the author object, and the works object.
 */
function lookupWorks(bookObject, authorObject) {
    return new Promise(function (resolve, reject) {
        let total = 0;
        for (let i = 0; i < bookObject.works.length; i++) {
            let xhttp = new XMLHttpRequest();
            let worksLink = bookObject.works[i].key;

            xhttp.open("GET", "https://openlibrary.org" + worksLink + ".json");

            xhttp.timeout = 5000;
            xhttp.ontimeout = (event) => {
                reject("Request Timed Out");
                console.error(event);
            };

            xhttp.send();
            total++;
            xhttp.onreadystatechange = function () {
                if (this.status == 404 || this.status == 403 || this.status == 400) {
                    reject("Invalid Response");
                }
                if (this.readyState == 4 && this.status == 200) {
                    let worksObject = [];
                    worksObject[i] = JSON.parse(xhttp.responseText);
                    if (i == total - 1) {
                        resolve([bookObject, authorObject, worksObject]);
                    }
                }
            };
        }
    });
}

// Run in the event of a new entry being created. It takes the information from Open Library.
/**
 * @description Runs in the event of a new entry being created. It takes the information from Open Library and loads it onto the page.
 * @param {Boolean} noISBN A boolean representing whether or not the book had an ISBN number when we searched for it.
 * @param {Object} bookObject The book object from Open Library.
 * @param {Object} authorObject The author object from Open Library.
 * @param {Object} worksObject The works object from Open Library.
 */
function loadDataOnToEditEntryPage(noISBN, bookObject, authorObject, worksObject) {
    $('#barcode').html("Not Assigned");
    if (noISBN) {
        return;
    }

    // Title
    try {
        $('#book-title').val(bookObject.title);
    } catch {
        console.error("The book doesn't have a title????? Something is wrong.");
        console.log(bookObject);
    }

    // Subtitle
    try {
        $('#book-subtitle').val(bookObject.subtitle);
    } catch {
        console.log("No subtitle found");
        console.log(bookObject);
    }

    // Author
    try {
        for (let i = 0; i < authorObject.length; i++) {
            let fullName = authorObject[i].name;
            let lastName = fullName.substring(fullName.lastIndexOf(' ') + 1, fullName.length);
            let firstName = fullName.substring(0, fullName.lastIndexOf(' '));
            $('#book-author-' + (i + 1) + '-last').val(lastName);
            $('#book-author-' + (i + 1) + '-first').val(firstName);
        }
    } catch {
        console.error("The book doesn't have an author?");
        console.log(bookObject);
        console.log(authorObject);
    }

    // Medium - Only looks at the first work (if there are multiple)
    try {
        if (bookObject.physical_format == "paperback") {
            $("book-medium").val("Paperback");
        } else if (bookObject.physical_format == "hardcover") {
            $("book-medium").val("Hardcover");
        }
    } catch {
        console.log("The book object did not have a medium. Falling back to the works object.");
        try {
            if (worksObject[0].physical_format == "paperback") {
                $("book-medium").val("Paperback");
            } else if (worksObject[0].physical_format == "hardcover") {
                $("book-medium").val("Hardcover");
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
        $('#book-cover-image').attr('src', "https://covers.openlibrary.org/b/id/" + bookObject.covers[0] + "-L.jpg");
        imageChanged = true;
    } catch {
        try {
            $('#book-cover-image').attr('src', "https://covers.openlibrary.org/b/id/" + worksObject[0].covers[0] + "-L.jpg");
            imageChanged = true;
        } catch {
            console.warn("A cover could not be found for either the book or the work");
            console.log(bookObject);
            console.log(worksObject);
        }
    }

    // Subject
    try {
        for (let i = 0; i < bookObject.subjects.length; i++) {
            addSubject();
            $('#book-subject-' + (i + 1)).val(bookObject.subjects[i]);
        }
    } catch {
        console.log("The books object did not have any subjects. Falling back to the works object");
        try {
            for (let i = 0; i < worksObject[0].subjects.length; i++) {
                addSubject();
                $('#book-subject-' + (i + 1)).val(worksObject[0].subjects[i]);
            }
        } catch {
            console.warn("Neither source had subjects for this book.");
            console.log(bookObject);
            console.log(worksObject);
        }
    }

    // Description - Only gets the description from the first work (if there are multiple)
    try {
        $("book-description").val(worksObject[0].description.value);
    } catch {
        console.log("The works object did not have a description. Falling back to the book object.");
        try {
            $("book-description").val(bookObject.description.value);
        } catch {
            console.warn("Neither source had a description for this book.");
            console.log(bookObject);
            console.log(worksObject);
        }
    }

    // Audience???? I have yet to see this in an open library object, so I'm not including it

    // ISBN 10 Number
    if (isbn.length == 10) {
        $("#book-isbn-10").val(isbn);
    } else {
        $("#book-isbn-10").val(switchISBNformats(isbn));
    }

    // ISBN 13 Number
    if (isbn.length == 13) {
        $("#book-isbn-13").val(isbn);
    } else {
        $("#book-isbn-13").val(switchISBNformats(isbn));
    }

    // Publisher
    try {
        for (let i = 0; i < bookObject.publishers.length; i++) {
            if (i > 1) {
                console.warn("A publisher was cut off because there was only two input boxes.");
                return;
            }
            $('#book-publisher-' + (i + 1)).val(bookObject.publishers[i]);
        }
    } catch {
        console.log("The books object did not have any publishers. Falling back to the works object");
        try {
            for (let i = 0; i < worksObject[0].publishers.length; i++) {
                if (i > 1) {
                    console.warn("A publisher was cut off because there was only two input boxes.");
                    return;
                }
                $('#book-publisher-' + (i + 1)).val(worksObject[0].publishers[i]);
            }
        } catch {
            console.warn("Neither source had publishers for this book.");
            console.log(bookObject);
            console.log(worksObject);
        }
    }

    // Publish Date:
    try {
        let publish_date = bookObject.publish_date;
        if (publish_date.length == 4) {
            // We can assume that this is only a year.
            $("#book-publish-year").val(publish_date);
        } else {
            let month = publish_date.substring(0, publish_date.indexOf(" "));
            let day = publish_date.substring(publish_date.indexOf(" ") + 1, publish_date.indexOf(","));
            let year = publish_date.substring(publish_date.indexOf(",") + 2, publish_date.length);
            switch (month) {
                case "Jan":
                case "January":
                    month = 1;
                    break;
                case "Feb":
                case "February":
                    month = 2;
                    break;
                case "Mar":
                case "March":
                    month = 3;
                    break;
                case "Apr":
                case "April":
                    month = 4;
                    break;
                case "May":
                    month = 5;
                    break;
                case "Jun":
                case "June":
                    month = 6;
                    break;
                case "Jul":
                case "July":
                    month = 7;
                    break;
                case "Aug":
                case "August":
                    month = 8;
                    break;
                case "Sep":
                case "September":
                    month = 9;
                    break;
                case "Oct":
                case "October":
                    month = 10;
                    break;
                case "Nov":
                case "November":
                    month = 11;
                    break;
                case "Dec":
                case "December":
                    month = 12;
                    break;

                default:
                    console.error("The month could not be detected");
                    month = -1;
                    break;
            }
            $("#book-publish-year").val(year);
            $("#book-publish-month").val(month);
            $("#book-publish-day").val(day);
        }
    } catch {
        let publish_date = worksObject[0].publish_date;
        try {
            if (publish_date.length == 4) {
                // We can assume that this is only a year.
                $("#book-publish-year").val(publish_date);
            } else {
                let month = publish_date.substring(0, publish_date.indexOf(" "));
                let day = publish_date.substring(publish_date.indexOf(" ") + 1, publish_date.indexOf(","));
                let year = publish_date.substring(publish_date.indexOf(",") + 2, publish_date.length);
                switch (month) {
                    case "Jan":
                        month = 1;
                        break;
                    case "Feb":
                        month = 2;
                        break;
                    case "Mar":
                        month = 3;
                        break;
                    case "Apr":
                        month = 4;
                        break;
                    case "May":
                        month = 5;
                        break;
                    case "Jun":
                        month = 6;
                        break;
                    case "Jul":
                        month = 7;
                        break;
                    case "Aug":
                        month = 8;
                        break;
                    case "Sep":
                        month = 9;
                        break;
                    case "Oct":
                        month = 10;
                        break;
                    case "Nov":
                        month = 11;
                        break;
                    case "Dec":
                        month = 12;
                        break;

                    default:
                        console.error("The month could not be detected");
                        month = -1;
                        break;
                }
                $("#book-publish-year").val(year);
                $("#book-publish-month").val(month);
                $("#book-publish-day").val(day);
            }
        } catch {
            console.warn("Neither source had publish dates for this book.");
            console.log(bookObject);
            console.log(worksObject);
        }
    }

    // Number of Pages
    try {
        $("#book-pages").val(bookObject.number_of_pages);
    } catch {
        try {
            $("#book-pages").val(worksObject[0].number_of_pages);
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
        for (let i = 0; i < bookObject.dewey_decimal_class.length; i++) {
            if (i > 0) {
                ddcAnswer += ", ";
            }
            ddcAnswer += bookObject.dewey_decimal_class[i];
        }
        $("#book-dewey").val(ddcAnswer);
    } catch {
        try {
            let ddcAnswer;
            for (let i = 0; i < bookObject.dewey_decimal_class.length; i++) {
                if (i > 0) {
                    ddcAnswer += " ";
                }
                ddcAnswer += bookObject.dewey_decimal_class[i];
            }
            $("#book-dewey").val(ddcAnswer);
        } catch {
            console.warn("Neither source had a DDC for this book.");
            console.log(bookObject);
            console.log(worksObject);
        }
    }
    // It's new, so we can hide this
    $("#last-updated").hide();
}

/**
 * @description Adds a new subject input field to the page.
 */
function addSubject() {
    let numberofSubjects = $(".subject-field").length;
    $("#book-subject-" + numberofSubjects).after("<input id=\"book-subject-" + (numberofSubjects + 1) + "\" placeholder=\"\" class=\"normal-form-input subject-field\">");
}

var loadingTimer;
/**
 * @description Run when the user clicks the "Save" button. Saves the changes made to the entry. It will also validate the entry before saving.
 */
function editEntry() {
    // Prevent the user from clicking the "Save" button again
    $("#edit-entry-save")[0].disabled = true;
    // Start the loading overlay
    $("#loading-overlay").show();
    // If an error occurs somewhere in this process, tell the user after 10 seconds
    loadingTimer = window.setTimeout(() => {
        $("#edit-entry-save")[0].disabled = false;
        alert("We did not complete the upload process in 10 seconds. An error has likely occurred. Your changes may not have been saved.");
        $("#loading-overlay").hide();
    }, 10000);

    // Before validating the entry, auto convert between ISBN numbers if both are not already inputted.
    let isbn10Value = $("#book-isbn-10").val();
    let isbn13Value = $("#book-isbn-13").val();
    let noISBN = $("#book-no-isbn")[0].checked;
    if (!noISBN && isbn10Value.length == 10 && isbn13Value == "") {
        $("#book-isbn-13").val(switchISBNformats(isbn10Value));
    } else if (!noISBN && isbn13Value.length == 13 && isbn10Value == "") {
        $("#book-isbn-10").val(switchISBNformats(isbn13Value));
    }

    validateEntry().then((valid) => {
        // If the entry is invalid, stop the timer and put the page back to normal
        if (valid == false || valid == null) {
            window.clearTimeout(loadingTimer);
            $("#edit-entry-save")[0].disabled = false;
            $("#loading-overlay").hide();
            return;
        }

        // If the image hasn't been changed, and the entry isn't new, skip the cover image upload
        if (!newEntry && !imageChanged) {
            console.log("Image hasn't been changed, so we're skipping the upload.");
            storeData(false, true);
            return;
        }

        storeData();
    }).catch((error) => {
        alert("There was an error validating the entry. Your changes have not been saved.");
        alert(error);
        console.error(error);
        window.clearTimeout(loadingTimer);
        $("#edit-entry-save")[0].disabled = false;
        $("#loading-overlay").hide();
        return;
    });
}

/**
 * @description Gets the values of all the input elements and returns them as a Book object.
 * @returns {Book} The book object that was created from the input elements.
 */
function getBookDataFromPage() {
    let barcode = parseInt($("#barcode").html());
    if (isNaN(barcode)) {
        barcode = null;
    }

    let authors = [];
    if ($("#book-author-1-last").val() || $("#book-author-1-first").val()) {
        authors.push(new Person($("#book-author-1-first").val(), $("#book-author-1-last").val()));
    }
    if ($("#book-author-2-last").val() || $("#book-author-2-first").val()) {
        authors.push(new Person($("#book-author-2-first").val(), $("#book-author-2-last").val()));
    }

    let illustrators = [];
    if ($("#book-illustrator-1-last").val() || $("#book-illustrator-1-first").val()) {
        illustrators.push(new Person($("#book-illustrator-1-first").val(), $("#book-illustrator-1-last").val()));
    }
    if ($("#book-illustrator-2-last").val() || $("#book-illustrator-2-first").val()) {
        illustrators.push(new Person($("#book-illustrator-2-first").val(), $("#book-illustrator-2-last").val()));
    }

    let subjects = [];
    $("[id^=book-subject-]").each((index, input) => {
        if (input.value != "") subjects.push(input.value);
    });

    let publishers = [];
    if ($("#book-publisher-1").val()) {
        publishers.push($("#book-publisher-1").val());
    }
    if ($("#book-publisher-2").val()) {
        publishers.push($("#book-publisher-2").val());
    }

    // Create a list of keywords from the description
    let keywords = $("#book-description").val().replace(/-/g , " ").split(" ");
    keywords = cleanUpSearchTerm(keywords);

    let unNumbered = $("#book-unnumbered")[0].checked;
    let numberOfPages = parseInt($("#book-pages").val());
    if (unNumbered) {
        numberOfPages = -1;
    }

    let publishDate = null;
    let publishYearValue = $("#book-publish-year").val();
    let publishMonthValue = $("#book-publish-month").val();
    let publishDayValue = $("#book-publish-day").val();
    if (!isValidDate(publishYearValue, publishMonthValue, publishDayValue)) {
        console.warn("Invalid publish date: " + publishYearValue + "-" + publishMonthValue + "-" + publishDayValue);
    } else if (publishMonthValue != "" && publishDayValue != "") {
        publishDate = new Date(publishYearValue, publishMonthValue-1, publishDayValue);
    } else if (publishMonthValue != "") {
        publishDate = new Date(publishYearValue, publishMonthValue-1);
    } else if (publishYearValue != "") {
        publishDate = new Date(publishYearValue);
    }
    if (publishDate) {
        publishDate = convertToUTC(publishDate);
    }

    let purchaseDate = null;
    let purchaseYearValue = $("#book-purchase-year").val();
    let purchaseMonthValue = $("#book-purchase-month").val();
    let purchaseDayValue = $("#book-purchase-day").val();
    if (!isValidDate(purchaseYearValue, purchaseMonthValue, purchaseDayValue)) {
        console.warn("Invalid purchase date: " + purchaseYearValue + "-" + purchaseMonthValue + "-" + purchaseDayValue);
    } else if (purchaseMonthValue != "" && purchaseDayValue != "") {
        purchaseDate = new Date(purchaseYearValue, purchaseMonthValue-1, purchaseDayValue);
    } else if (purchaseMonthValue != "") {
        purchaseDate = new Date(purchaseYearValue, purchaseMonthValue-1);
    } else if (purchaseYearValue != "") {
        purchaseDate = new Date(purchaseYearValue);
    }
    if (purchaseDate) {
        purchaseDate = convertToUTC(purchaseDate);
    }

    /*  This WON'T have the image links, because that is auto-generated by the Book class
        It also WON'T have a value for isDeleted, since that's not on the page
        these will be added when the data is stored in the database
        lastUpdated will be created when this function is called*/
    let bookDataFromPage = new Book(barcode, $("#book-title").val(), $("#book-subtitle").val(), authors,
        illustrators, $("#book-medium")[0].value, null, null, null, subjects,
        $("#book-description").val(), new Audience($("#book-audience-children")[0].checked,
        $("#book-audience-youth")[0].checked, $("#book-audience-adult")[0].checked), $("#book-isbn-10").val(),
        $("#book-isbn-13").val(), publishers, publishDate, numberOfPages, $("#book-dewey").val(), purchaseDate,
        $("#book-purchase-price").val(), $("#book-vendor").val(), keywords, !!$("#book-can-be-checked-out")[0].value,
        null, !!$("#book-is-hidden")[0].value, new Date());
    return bookDataFromPage;
}

/**
 * @description Validates the entry on the page. Calls getBookDataFromPage() to get the data from the page.
 * @returns {Promise<Boolean>} Resolves when the entry is validated. Resolves true if the entry is valid, false otherwise.
 */
function validateEntry() {
    return new Promise((resolve) => {
        let pageData = getBookDataFromPage();

        let noneValue = $("#book-audience-none")[0].checked;
        let noISBN = $("#book-no-isbn")[0].checked;
        let unNumbered = $("#book-unnumbered")[0].checked;

        // Validate inputs
        if (pageData.title == "") {
            alert("Title is required!");
            let rect = $("#book-title")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-title")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-title")[0].focus();}, 600);
            $("#book-title")[0].onkeydown = function() {
                $("#book-title")[0].style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.authors[0].lastName == "" && pageData.authors[0].firstName == "" && pageData.medium != "av") {
            alert("At least one author is required! If author is unknown, enter \"unknown\" into last name.");
            let rect = $("#book-author-1-last")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-author-1-last")[0].style.borderColor = "red";
            $("#book-author-1-first")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-author-1-last")[0].focus();}, 600);
            $("#book-author-1-last")[0].onkeydown = function() {
                $("#book-author-1-last")[0].style.borderColor = "";
                $("#book-author-1-first")[0].style.borderColor = "";
            };
            $("#book-author-1-first")[0].onkeydown = function() {
                $("#book-author-1-last")[0].style.borderColor = "";
                $("#book-author-1-first")[0].style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.medium == "") {
            alert("Medium is required!");
            let rect = $("#book-medium")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-medium")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-medium")[0].focus();}, 600);
            $("#book-medium")[0].onclick = function() {
                $("#book-medium")[0].style.borderColor = "";
            };
            resolve(false);
            return;
        }
        // The pageData.coverImageLink will now be null during this check, so we'll read it off the page manually
        if ($("#book-cover-image").attr('src') == "../img/favicon.ico" && pageData.medium != "av") {
            alert("Cover image is required!");
            let rect = $("#book-cover-image")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-cover-image")[0].style.boxShadow = "0px 0px 16px 0px #ff00008a";
            setTimeout(function() {$("#book-cover-image")[0].focus();}, 600);
            $("#book-cover-image")[0].onkeydown = function() {
                $("#book-cover-image")[0].style.boxShadow = "0px 0px 16px 0px #aaaaaa4a";
            };
            resolve(false);
            return;
        }
        if (pageData.subjects.length == 0 && pageData.medium != "av") {
            alert("Please enter at least one subject!");
            let rect = $("#book-subject-1")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-subject-1")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-subject-1")[0].focus();}, 600);
            $("#book-subject-1")[0].onkeydown = function() {
                $("#book-subject-1")[0].style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.description == "" && pageData.medium != "av") {
            alert("Description is required!");
            let rect = $("#book-description")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-description")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-description")[0].focus();}, 600);
            $("#book-description")[0].onkeydown = function() {
                $("#book-description")[0].style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if ((!pageData.audience.children && !pageData.audience.youth && !pageData.audience.adult && !noneValue) ||
            (noneValue && (pageData.audience.children || pageData.audience.youth || pageData.audience.adult))) {
            alert("Invalid audience input! If there is no audience listed, please select \"None\" (and no other checkboxes).");
            let rect = $("#book-audience-children")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-audience-children")[0].style.outline = "2px solid red";
            $("#book-audience-youth")[0].style.outline = "2px solid red";
            $("#book-audience-adult")[0].style.outline = "2px solid red";
            $("#book-audience-none")[0].style.outline = "2px solid red";
            setTimeout(function() {$("#book-audience-children")[0].focus();}, 600);
            $("#book-audience-children")[0].onkeydown = function() {
                $("#book-audience-children")[0].style.outline = "";
                $("#book-audience-youth")[0].style.outline = "";
                $("#book-audience-adult")[0].style.outline = "";
                $("#book-audience-none")[0].style.outline = "";
            };
            resolve(false);
            return;
        }
        if (!noISBN && (!verifyISBN(pageData.isbn10) || pageData.isbn10.length != 10)) {
            alert("The ISBN number you entered was not valid! Please double check it.");
            let rect = $("#book-isbn-10")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-isbn-10")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-isbn-10")[0].focus();}, 600);
            $("#book-isbn-10")[0].onkeydown = function() {
                $("#book-isbn-10")[0].style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (!noISBN && (!verifyISBN(pageData.isbn13) || pageData.isbn13.length != 13)) {
            alert("The ISBN number you entered was not valid! Please double check it.");
            let rect = $("#book-isbn-13")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-isbn-13")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-isbn-13")[0].focus();}, 600);
            $("#book-isbn-13")[0].onkeydown = function() {
                $("#book-isbn-13")[0].style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.publishers[0] == "" && pageData.medium != "av") {
            alert("Please enter at least one publisher! If the publisher is unknown, enter \"unknown\".");
            let rect = $("#book-publisher-1")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-publisher-1")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-publisher-1")[0].focus();}, 600);
            $("#book-publisher-1")[0].onkeydown = function() {
                $("#book-publisher-1")[0].style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.publishDate && pageData.publishDate instanceof Date && pageData.medium != "av") {
            alert("The publishing date is invalid! Please enter a valid date between October 17, 1711 and today.");
            let rect = $("#book-publish-month")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-publish-month")[0].style.borderColor = "red";
            $("#book-publish-day")[0].style.borderColor = "red";
            $("#book-publish-year")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-publish-month")[0].focus();}, 600);
            $("#book-publish-month")[0].onkeydown = function() {
                $("#book-publish-month")[0].style.borderColor = "";
                $("#book-publish-day")[0].style.borderColor = "";
                $("#book-publish-year")[0].style.borderColor = "";
            };
            $("#book-publish-day")[0].onkeydown = function() {
                $("#book-publish-month")[0].style.borderColor = "";
                $("#book-publish-day")[0].style.borderColor = "";
                $("#book-publish-year")[0].style.borderColor = "";
            };
            $("#book-publish-year")[0].onkeydown = function() {
                $("#book-publish-month")[0].style.borderColor = "";
                $("#book-publish-day")[0].style.borderColor = "";
                $("#book-publish-year")[0].style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (!unNumbered && (isNaN(pageData.numPages) || pageData.numPages < 1)) {
            alert("Please enter a valid number of pages!");
            let rect = $("#book-pages")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-pages")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-pages")[0].focus();}, 600);
            $("#book-pages")[0].onkeydown = function() {
                $("#book-pages")[0].style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.ddc == "" || (pageData.ddc != "FIC" && isNaN(parseFloat(pageData.ddc)))) {
            alert("Please enter a valid Dewey Decimal Classification!");
            let rect = $("#book-dewey")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-dewey")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-dewey")[0].focus();}, 600);
            $("#book-dewey")[0].onkeydown = function() {
                $("#book-dewey")[0].style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.purchaseDate && pageData.purchaseDate instanceof Date) {
            alert("The purchasing date is invalid! Please enter a valid date between October 17, 1711 and today.");
            let rect = $("#book-purchase-month")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-purchase-month")[0].style.borderColor = "red";
            $("#book-purchase-day")[0].style.borderColor = "red";
            $("#book-purchase-year")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-purchase-month")[0].focus();}, 600);
            $("#book-purchase-month")[0].onkeydown = function() {
                $("#book-purchase-month")[0].style.borderColor = "";
                $("#book-purchase-day")[0].style.borderColor = "";
                $("#book-purchase-year")[0].style.borderColor = "";
            };
            $("#book-purchase-day")[0].onkeydown = function() {
                $("#book-purchase-month")[0].style.borderColor = "";
                $("#book-purchase-day")[0].style.borderColor = "";
                $("#book-purchase-year")[0].style.borderColor = "";
            };
            $("#book-purchase-year")[0].onkeydown = function() {
                $("#book-purchase-month")[0].style.borderColor = "";
                $("#book-purchase-day")[0].style.borderColor = "";
                $("#book-purchase-year")[0].style.borderColor = "";
            };
            resolve(false);
            return;
        }
        if (pageData.purchasePrice != "" && (isNaN(parseFloat(pageData.purchasePrice)) || parseFloat(pageData.purchasePrice) < 0)) {
            alert("Please enter a valid purchase price!");
            let rect = $("#book-purchase-price")[0].getBoundingClientRect();
            window.scrollBy(0, rect.top - 180);
            $("#book-purchase-price")[0].style.borderColor = "red";
            setTimeout(function() {$("#book-purchase-price")[0].focus();}, 600);
            $("#book-purchase-price")[0].onkeydown = function() {
                $("#book-purchase-price")[0].style.borderColor = "";
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
function isValidDate(y, m, d) {
    let year = parseInt(y);
    if (isNaN(year)) return false;
    if (year < 100) return false;
    let month = parseInt(m) - 1;
    if (isNaN(month) && m != "") return false;
    let day = parseInt(d);
    if (isNaN(day) && d != "") return false;
    if (m == "" && d != "") return false;
    if ((month > 11 || month < 0) && m != "") return false;
    if ((day > 31 || day < 1) && d != "") return false;
    if (day == 31 & (month == 3 || month == 5 || month == 8 || month == 10)) return false;
    if (month == 1 && day > 29) return false;
    if ((year % 4 != 0 || (year % 100 == 0 && year % 400 != 0)) && month == 1 && day == 29) return false;
    let date = new Date(year, month, day);
    if (date.getTime() > Date.now()) return false;
    let founded = new Date(1711, 9, 17);
    if (date.getTime() < founded.getTime()) return false;
    return true;
}

/**
 * @description This function goes through the process of actually storing the data in the database.
 * @param {Boolean} isDeletedValue Represents if the book is about to be deleted or not.
 * @param {Boolean} skipImages Represents if the image upload process should be skipped or not.
 * @returns {Promise<void>} A Promise that resolves when the data is stored.
 */
function storeData(isDeletedValue = false, skipImages = false) {
    return new Promise(function(resolve, reject) {
        // Gets the values of all the input elements
        let pageData = getBookDataFromPage();

        // Defines the paths of the the database collection
        let booksPath = collection(db, "books");

        // If this is not a new entry, so update the existing entry using the known barcode number
        if (!newEntry) {
            let bookNumber = pageData.barcodeValue - 1171100000;
            let bookDocument = Math.floor(bookNumber / 100);
            if (bookDocument >= 100) {
                bookDocument = "" + bookDocument;
            } else if (bookDocument >= 10) {
                bookDocument = "0" + bookDocument;
            } else {
                bookDocument = "00" + bookDocument;
            }
            bookNumber = bookNumber % 100;

            // If the book is being deleted, set the deleted value to true
            if (isDeletedValue) {
                pageData.isDeleted = true;
            } else {
                pageData.isDeleted = false;
            }

            // Updates the book with the information
            return runTransaction(db, (transaction) => {
                let path = doc(booksPath, bookDocument);
                return transaction.get(path).then((docSnap) => {
                    if (!docSnap.exists()) {
                        console.error("There was a large problem because the books doc doesn't exist anymore...");
                        reject();
                        return;
                    }

                    // Get the existing list of books
                    let existingBooks = docSnap.data().books;

                    // Update the array with the new book information.
                    existingBooks[bookNumber] = pageData;

                    // If we are skipping the images, then just update the book and return
                    if (skipImages) {
                        transaction.update(doc(booksPath, bookDocument), {
                            books: existingBooks
                        });
                        resolve();
                        return;
                    }

                    // Otherwise, process the images and then update the book
                    processImages(pageData.barcodeNumber).then(() => {
                        transaction.update(doc(booksPath, bookDocument), {
                            books: existingBooks
                        });
                    }).catch((error) => {
                        reject(error);
                    });
                });
            }).then(() => {
                console.log("Transaction completed successfully");
                resolve();
            }).catch((error) => {
                console.error("Error updating book with transaction: ", error);
                reject(error);
            });
        } else {
            // Create a new entry from scratch and get a new barcode number
            // Run a Transaction to ensure that the correct barcode is used.
            // First, get the highest barcode number by loading the largest book document.
            getDocs(query(collection(db, "books"), where("order", ">=", 0), orderBy("order", "desc"), limit(1))).then((querySnapshot) => {
                let topDoc;
                querySnapshot.forEach((docSnap) => {
                    if (!docSnap.exists()) {
                        throw "The books document doesn't exist";
                    }
                    topDoc = docSnap;
                });

                // Now that we have the highest document, we can get that document and create a new book within it.
                runTransaction(db, (transaction) => {
                    return transaction.get(doc(db, "books", topDoc.id)).then((docSnap) => {
                        if (!docSnap.exists()) {
                            throw "Document does not exist!";
                        }

                        let order = docSnap.data().order;
                        let numBooksInDoc = docSnap.data().books.length;

                        // Let's make sure that there isn't another doc that has been created after this one already.
                        try {
                            let next = order + 1;
                            if (next < 10) {
                                next = "00" + (next);
                            } else if (next < 100) {
                                next = "0" + (next);
                            }
                            getDoc(doc(db, "books", next)).then((docSnap) => {
                                if (docSnap.exists()) {
                                    console.error("A new book doc was created, it shouldn't have been, so abort!");
                                    alert("A database error has occurred. Please stop adding books and contact the developers of the site.");
                                    throw "Something went wrong.";
                                }
                            }).catch((err) => {
                                console.log(err, "Hopefully the line before doesn't say that something went wrong.... If it didn't, the next document doesn't exist, which is a good thing.");
                            });
                        } catch {
                            console.warn("Something about the try catch failed....");
                        }

                        if (numBooksInDoc == 100) {
                            // A new book doc has to be created...
                            let newNumber = order + 1;
                            if (newNumber < 10) {
                                newNumber = "00" + newNumber;
                            } else if (newNumber < 100) {
                                newNumber = "0" + newNumber;
                            }
                            let barcode = "11711" + newNumber + "00";

                            $("#barcode").html(barcode);
                            getBookDataFromPage();

                            processImages(barcode).then((/*results*/) => {
                                /* this shouldn't be needed since the images now the image links are created by the Book Class
                                pageData.iconImageLink = results.iconImageLink;
                                pageData.thumbnailImageLink = results.thumbnailImageLink;
                                pageData.coverImageLink = results.coverImageLink;*/

                                transaction.set(doc(db, "books", newNumber), {
                                    books: [pageData],
                                    order: order + 1
                                });
                                return barcode;
                            }).catch((err) => {
                                console.error("Error processing images: ", err);
                                reject();
                            });
                        } else {
                            // We don't need to add a new book doc, so just add the book to the existing one.
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

                            $("#barcode").html(barcode);
                            getBookDataFromPage();

                            processImages(barcode).then((/*results*/) => {
                                /* this shouldn't be needed since the images now the image links are created by the Book Class
                                pageData.iconImageLink = results.iconImageLink;
                                pageData.thumbnailImageLink = results.thumbnailImageLink;
                                pageData.coverImageLink = results.coverImageLink;*/

                                transaction.update(doc(db, "books", order), {
                                    books: arrayUnion(pageData)
                                });
                                return barcode;
                            }).catch((err) => {
                                console.error("Error processing images: ", err);
                                reject();
                            });
                        }
                    });
                }).then((newBarcode) => {
                    // After both writes complete, send the user to the edit page and take it from there.
                    console.log("New Entry Created with barcode: " + newBarcode);
                    alert("New book created successfully. Please take note of your new barcode number: " + newBarcode);
                    resolve(newBarcode);
                });
            }).catch((err) => {
                console.error(err);
                reject(err);
            });
        }
    }).then(() => {
        $("#loading-overlay").hide();
        alert("Edits were made successfully");
        setTimeLastSearched(null);
        clearTimeout(loadingTimer);
        $(window).off("beforeunload");
        goToPage('admin/main');
    }).catch((error) => {
        alert("An error has occurred, but we couldn't identify the problem. Your changes have not been saved.");
        console.error(error);
        $("#loading-overlay").hide();
        clearTimeout(loadingTimer);
        $(window).off("beforeunload");
    });
}

/**
 * @description First, this function will get the image from an external source if needed.
 *              Then it will delete all of the old images from Firebase Storage.
 *              Finally, it will upload the new images to Firebase Storage and return the links. 
 * @param {Number} barcodeNumber The barcode number of the book that we are saving images for.
 * @returns {Promise<String[]>} An promise representing the 3 image links
 */
function processImages(barcodeNumber) {
    return new Promise((resolve, reject) => {
        // Gets the current image (uploaded or from open library) and stores it to the file variable
        getImage().then((fileReturn) => {
            // Clear out old images in Firebase Storage (if there are any)
            deleteOldImages(barcodeNumber).then(() => {
                let promises = [];
                promises[0] = uploadImageToStorage(barcodeNumber, "original", fileReturn);
                promises[1] = uploadImageToStorage(barcodeNumber, "thumbnail", fileReturn);
                promises[2] = uploadImageToStorage(barcodeNumber, "icon", fileReturn);

                Promise.all(promises).then((values) => {
                    if (!Array.isArray(values) || !values[0] || !values[1] || !values[2]) {
                        reject("Not all images were uploaded successfully");
                        return;
                    }
                    resolve(values);
                }).catch((error) => {
                    reject(error);
                });
            }).catch((error) => {
                reject(error);
            });
        }).catch((error) => {
            reject(error);
        });
    }).catch((error) => {
        alert("There was an error uploading the images for this book. Your changes have not been saved.");
        alert(error);
        console.error(error);
        window.clearTimeout(loadingTimer);
        $("#edit-entry-save")[0].disabled = false;
        $("#loading-overlay").hide();
        return;
    });
}

/**
 * @description This function will get the image from an external source if a new file wasn't uploaded by the user.
 * @returns {Promise<File>} A promise representing the image file
 */
function getImage() {
    return new Promise(function (resolve, reject) {
        if ($("#book-medium")[0].value == "av") {
            console.warn("No need to get an image for an AV item...");
            resolve(null);
            return;
        }
        // If we already have a new file that has been uploaded (either from this function, or from the user uploading a file),
        // we don't have to go get it again if we already have it
        if (file) {
            resolve(file);
        } else {
            let xhr = new XMLHttpRequest();
            xhr.open('GET', $("#book-cover-image").attr("src"), true);
            xhr.responseType = 'blob';
            xhr.onload = function() {
                if (this.status == 200) {
                    if (this.responseURL.substring(0, 5) != "https") {
                        alert("This image was not able to be saved securely. Please download it from the interent, re-upload it on the edit entry page, and try again.");
                        reject("Insecure Image URL");
                    }
                    file = this.response;
                    resolve(file);
                }

                if (this.readyState == 4 && this.status != 200) {
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
function deleteOldImages(barcodeNumber) {
    // Delete firebase storage images for the book that is being edited
    return new Promise((resolve, reject) => {
        let publicStorage = getStorage(app, "gs://south-church-library");
        list(ref(publicStorage, "books/" + barcodeNumber), {maxResults: 10}).then((result) => {
            let promises = [];
            result.items.forEach((image, index) => {
                promises[index] = deleteObject(image);
            });

            Promise.all(promises).then(() => {
                resolve();
            }).catch((error) => {
                console.error(error);
                reject(error);
            });
        }).catch((error) => {
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
 * @returns {Promise<String>} A promise representing the link to the image
 */
function uploadImageToStorage(barcodeNumber, type = "original", file) {
    return new Promise((resolve, reject) => {
        // AV images are stored as null
        if ($("#book-medium")[0].value == "av") {
            console.warn("No need to upload an image for an AV item...");
            resolve(null);
            return;
        }

        if (isNaN(barcodeNumber) || barcodeNumber.toString().substring(0, 5) != "11711" || barcodeNumber.toString().length != 10) {
            alert("There was a problem saving that image.");
            reject(false);
            return;
        }

        let maxHeight;
        if (type == "original") {
            maxHeight = 800;
        } else if (type == "thumbnail") {
            maxHeight = 400;
        } else if (type == "icon") {
            maxHeight = 250;
        }


        const canvas = document.createElement("canvas");
        canvas.id = type + "-canvas";
        $(".book-cover-image-container")[0].appendChild(canvas);

        let height = $("#book-cover-image").height();
        let width = $("#book-cover-image").width();
        let ratio = height / width;

        if (maxHeight && height > maxHeight) {
            height = maxHeight;
        }

        $("#" + type + "-canvas")[0].height = maxHeight;
        $("#" + type + "-canvas")[0].width = Math.round(maxHeight / ratio);

        let ctx = $("#" + type + "-canvas")[0].getContext('2d');
        let image = new Image();
        image.setAttribute("crossorigin", "anonymous");
        image.onload = () => {
            ctx.drawImage(image, 0, 0, maxHeight / ratio, maxHeight);
            $("#" + type + "-canvas")[0].toBlob((blob) => {
                let file = new File([blob], "book" + type, {type: "image/jpeg"});

                let publicStorage = getStorage(app, "gs://south-church-library");
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

                uploadBytes(bookSpecificRef, file, {contentType: 'image/jpeg'}).then(() => {
                    console.log('Uploaded the file!');
                    getDownloadURL(bookSpecificRef).then((url) => {
                        $("#" + type + "-canvas")[0].remove();
                        resolve(url);
                    }).catch(function(error) {
                        alert("ERROR: There was a problem storing the book cover image. Your book information has not been saved.");
                        console.error(error);
                        reject();
                    });
                });
            }, "image/jpeg");
        };
        image.src = URL.createObjectURL(file);
    }).catch((error) => {
        console.error(error);
    });
}

var file;

/**
 * @description When a user uploads a file, this function is called. It sets the value of file to the file that was uploaded.
 *              It displays the newly updated image using a blob URL.
 * @param {Event} event - The onchange event for the file input.
 */
function loadFile(event) {
    if (event.target.files[0]) {
        file = event.target.files[0];
        let output = document.getElementById('book-cover-image');
        output.src = URL.createObjectURL(file);
        /* This is bad because then the canvas elements can't use the link
        output.onload = function() {
            URL.revokeObjectURL(output.src); // free memory
        };*/
        imageChanged = true;
    }
}

/**
 * @description This function will run when the user clicks the "Cancel" button.
 */
function cancelEditEntry() {
    $(window).off("beforeunload");

    window.history.back();
}

/**
 * @description This function will run when the user clicks the "Delete" button on the edit page, or
 *              the "Cancel" button on the popup window. It toggles the popup.
 */
function toggleDeletePopup() {
    if (newEntry) {
        alert("You can't delete a book that hasn't been saved yet. If you'd like to disregard this book, click the \"Cancel\" button.");
        return;
    }
    $("#delete-alert").css("transition", "0.5s");
    $("#delete-alert-overlay").css("transition", "0.5s");
    if ($("#delete-alert").css("opacity") == "0") {
        $("#delete-alert").show();
        $("#delete-alert-overlay").show();
        $("#delete-alert").css("opacity", "100%");
        $("#delete-alert-overlay").css("opacity", "50%");
    } else {
        $("#delete-alert").css("opacity", "0");
        $("#delete-alert-overlay").css("opacity", "0");
        $("#delete-alert").delay(500).hide(0);
        $("#delete-alert-overlay").delay(500).hide(0);
    }
}

/**
 * @description This function will run when the user clicks the "Delete" button on the popup window.
 */
function deleteEntry() {
    // Prevent the user from clicking the "Delete" button again
    $("#delete-entry")[0].disabled = true;
    // Start the loading overlay
    $("#loading-overlay").show();
    // If an error occurs somewhere in this process, tell the user after 10 seconds
    loadingTimer = window.setTimeout(() => {
        $("#edit-entry-save")[0].disabled = false;
        alert("We did not complete the upload process in 10 seconds. An error has likely occurred. Your changes may not have been saved.");
        $("#loading-overlay").hide();
    }, 10000);
    storeData(true, true);
}

/**
 * @description This function will clean up the keywords list by removing common words.
 * @param {String[]} searchArray An array of keywords to be cleaned up
 * @returns {String[]} The cleaned up array of keywords
 */
function cleanUpSearchTerm(searchArray) {
    // List of words to remove from the keywords list
    // eslint-disable-next-line max-len
    let meaninglessWords = ["the", "is", "it", "an", "to", "on", "a", "in", "than", "and", "as", "they'll", "also", "for", "more", "here", "with", "without", "within", "most", "about", "almost", "any", "at", "be", "but", "by", "can", "come", "could", "do", "else", "if", "few", "get", "go", "he", "she", "they", "them", "him", "her", "his", "hers", "theirs", "there", "i", "", "into", "it", "its", "itself", "let", "lots", "me", "much", "must", "my", "oh", "yes", "no", "none", "nor", "not", "now", "of", "ok", "or", "our", "out", "own", "per", "put", "say", "see", "set", "so", "some", "soon", "still", "stay", "such", "sure", "tell", "then", "that", "these", "thing", "this", "those", "too", "try", "us", "use", "we", "what", "where", "when", "why", "how", "who", "whom", "you", "your"];
    // Iterate through each word
    for (let i = 0; i < searchArray.length; i++) {
        // Remove all punctuation and make it lowercase
        searchArray[i] = searchArray[i].replace(/-/g , " ");
        searchArray[i] = searchArray[i].replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,"");
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
function convertToUTC(date) {
    // TODO: Actually account for time shifts with Daylight Savings
    // console.log("The date that was just saved was: " + new Date(date.valueOf() + 1000 * 60 * 60 * 5));
    return new Date(date.valueOf() + 1000 * 60 * 60 * 5);
}
