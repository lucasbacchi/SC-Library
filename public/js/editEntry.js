import { goToPage } from "./ajax";
import { findURLValue, switchISBNformats, verifyISBN } from "./common";
import { db, storage } from "./globals";
import { collection, doc, getDoc, runTransaction } from "firebase/firestore";
import { deleteObject, getDownloadURL, list, ref, uploadBytes } from "firebase/storage";


var newEntry = null;
var barcodeNumber;
var isbn;
var imageChanged;

export function setupEditEntry(pageQuery) {
    file = null;
    newEntry = (findURLValue(pageQuery, "new") == "true");
    barcodeNumber = parseInt(findURLValue(pageQuery, "id", true));
    isbn = findURLValue(pageQuery, "isbn", true);
    imageChanged = false;

    if (barcodeNumber == "" && newEntry == false) {
        alert("The barcode that you are trying to edit is not valid.");
        goToPage("admin/main");
        return;
    }

    if (!newEntry) {
        // If this is not a new entry, just get the content that exists in the database
        populateEditEntryFromDatabase(barcodeNumber);
    } else {
        // If this is a new entry (and they are creating it for the first time) go get info from open library
        if (isbn.length >= 10) {
            gatherExternalInformation(isbn).then((returnValue) => {
                // If this is a brand new entry...
                // returnValue will be in the form of noISBN = false, bookObject, authorObject, worksObject
                loadDataOnToEditEntryPage(returnValue[0], returnValue[1], returnValue[2], returnValue[3]);
            }).catch((error) => {
                // The ISBN Number is valid, but there is not a listing in Open Library
                alert("The ISBN number that you entered (" + isbn + ") is a valid number, but we did not find a listing for it in the external database. You will need to create an entry manually.");
                console.warn("Could not find an entry in open library for this isbn", error);
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
        editEntry(true);
    });

    $("#edit-entry-cancel").on("click", () => {
        cancelEditEntry();
    });

    $("#edit-entry-delete").on("click", () => {
        deleteEntry();
    });

    $("#delete-cancel").on("click", () => {
        deleteEntry();
    });

    $("#add-subject").on("click", () => {
        addSubject();
    });

    watchForChanges();
}

var changesDetected = false;
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

function populateEditEntryFromDatabase(barcodeNumber) {
    if (isNaN(barcodeNumber)) {
        alert("We could not find an entry in the database with the barcode number that you entered.");
        console.error("barcodeNumber is not a number", barcodeNumber);
        return;
    }

    var document = Math.floor(barcodeNumber / 100) % 100;
    if (document >= 100) {
        document = "" + document;
    } else if (document >= 10) {
        document = "0" + document;
    } else {
        document = "00" + document;
    }
    getDoc(doc(db, "books/" + document)).then((docSnap) => {
        var data = docSnap.data().books[barcodeNumber % 100];

        if (!data) {
            alert("We could not find any data for a book with barcode number " + barcodeNumber);
            goToPage("admin/main");
            return;
        }

        $('#barcode').html(barcodeNumber);
        $("#book-title").val(data.title);
        $("#book-subtitle").val(data.subtitle);

        for (let i = 0; i < data.authors.length; i++) {
            $("#book-author-" + (i + 1) + "-last").val(data.authors[i].last);
            $("#book-author-" + (i + 1) + "-first").val(data.authors[i].first);
        }

        for (let i = 0; i < data.illustrators.length; i++) {
            $("#book-illustrator-" + (i + 1) + "-last").val(data.illustrators[i].last);
            $("#book-illustrator-" + (i + 1) + "-first").val(data.illustrators[i].first);
        }

        $("#book-medium").val(data.medium);

        $("#book-cover-image").attr('src', data.coverImageLink);

        for (let i = 0; i < data.subjects.length; i++) {
            addSubject();
            $("#book-subject-" + (i + 1)).val(data.subjects[i]);
        }

        $("#book-description").val(data.description);

        $("#book-audience-children").prop("checked", data.audience[0]);
        $("#book-audience-youth").prop("checked", data.audience[1]);
        $("#book-audience-adult").prop("checked", data.audience[2]);
        $("#book-audience-none").prop("checked", data.audience[3]);

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
            $("#book-publish-month").val(data.publishDate.toDate().getMonth() + 1);
            $("#book-publish-day").val(data.publishDate.toDate().getDate());
            $("#book-publish-year").val(data.publishDate.toDate().getFullYear());
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
            $("#book-purchase-month").val(data.purchaseDate.toDate().getMonth() + 1);
            $("#book-purchase-day").val(data.purchaseDate.toDate().getDate());
            $("#book-purchase-year").val(data.purchaseDate.toDate().getFullYear());
        }

        $("#book-purchase-price").val(data.purchasePrice);
        $("#book-vendor").val(data.vendor);

        if (data.lastUpdated != null) {
            var lastUpdated = data.lastUpdated.toDate();
            $("#last-updated").html("This entry was last updated on " + lastUpdated.toLocaleDateString('en-US') + " at " + lastUpdated.toLocaleTimeString('en-US'));
        }
    }).catch((error) => {
        alert("There was an error retreiving this book information from the database");
        console.error(error);
    });
}

function gatherExternalInformation(isbn) {
    return (new Promise(function(resolve) {
        if (isbn == "") {
            // In this case, the entry was created without an isbn
            resolve(true);
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


function lookupBook(isbn) {
    return new Promise(function (resolve, reject) {
        let xhttp = new XMLHttpRequest();

        xhttp.open("GET", "https://openlibrary.org/isbn/" + isbn + ".json");
        xhttp.send();
        xhttp.onreadystatechange = function () {
            if (this.status == 404 || this.status == 403 || this.status == 400) {
                reject();
            }
            if (this.readyState == 4 && this.status == 200) {
                resolve(JSON.parse(xhttp.responseText));
            }
        };
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
                xhttp.onreadystatechange = function () {
                    if (this.status == 404 || this.status == 403 || this.status == 400) {
                        reject();
                    }
                    if (this.readyState == 4 && this.status == 200) {
                        var authorObject = [];
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

function lookupWorks(bookObject, authorObject) {
    return new Promise(function (resolve, reject) {
        var total = 0;
        for (let i = 0; i < bookObject.works.length; i++) {
            let xhttp = new XMLHttpRequest();
            var worksLink = bookObject.works[i].key;

            xhttp.open("GET", "https://openlibrary.org" + worksLink + ".json");
            xhttp.send();
            total++;
            xhttp.onreadystatechange = function () {
                if (this.status == 404 || this.status == 403 || this.status == 400) {
                    reject();
                }
                if (this.readyState == 4 && this.status == 200) {
                    var worksObject = [];
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
function loadDataOnToEditEntryPage(noISBN, bookObject, authorObject, worksObject) {
    $('#barcode').html(barcodeNumber);
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
            var fullName = authorObject[i].name;
            var lastName = fullName.substring(fullName.lastIndexOf(' ') + 1, fullName.length);
            var firstName = fullName.substring(0, fullName.lastIndexOf(' '));
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
    $("#last-updated").hide();
}

function addSubject() {
    var numberofSubjects = $(".subject-field").length;
    $("#book-subject-" + numberofSubjects).after("<input id=\"book-subject-" + (numberofSubjects + 1) + "\" placeholder=\"\" class=\"normal-form-input subject-field\">");
}

// Run when the user clicks the "Save" button
function editEntry(isDeletedValue = false) {
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

    // Validate inputs (unless it's gonna be deleted, in which case don't bother lol)
    if (isDeletedValue) {
        storeData(true);
        window.clearTimeout(loadingTimer);
        return;
    }

    // Before validating the entry, auto convert between ISBN numbers if both are not already inputted.
    var isbn10Value = $("#book-isbn-10").val();
    var isbn13Value = $("#book-isbn-13").val();
    var noISBN = $("#book-no-isbn")[0].checked;
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

        // If it's an audio visual item, skip the cover images
        if ($("#book-medium")[0].value == "av") {
            storeData(false, null, null, null);
            return;
        }

        // If the image hasn't been changed, and the entry isn't new, skip the cover image upload
        if (!newEntry && !imageChanged) {
            console.log("Image hasn't been changed, so we're skipping the upload.");
            storeData();
            return;
        }

        // If it's not an audio visual item, process the cover images
        processImages().then((images) => {
            let coverImageLink = images[0];
            let thumbnailImageLink = images[1];
            let iconImageLink = images[2];
            storeData(false, iconImageLink, thumbnailImageLink, coverImageLink);
        }).catch((error) => {
            alert("There was an error uploading the images for this book. Your changes have not been saved.");
            alert(error);
            console.error(error);
            window.clearTimeout(loadingTimer);
            $("#edit-entry-save")[0].disabled = false;
            $("#loading-overlay").hide();
            return;
        });
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

var loadingTimer;
function validateEntry() {
    return new Promise((resolve) => {
        // Gets the values of all the input elements
        var titleValue = $("#book-title").val();
        var author1LastValue = $("#book-author-1-last").val();
        var author1FirstValue = $("#book-author-1-first").val();
        var mediumValue = $("#book-medium")[0].value;
        var coverLink = $("#book-cover-image").attr('src');
        var subjectValues = [];
        $("[id^=book-subject-]").each((index, input) => {
            if (input.value != "") subjectValues.push(input.value);
        });
        var descriptionValue = $("#book-description").val();
        var childrenValue = $("#book-audience-children")[0].checked;
        var youthValue = $("#book-audience-youth")[0].checked;
        var adultValue = $("#book-audience-adult")[0].checked;
        var noneValue = $("#book-audience-none")[0].checked;
        var isbn10Value = $("#book-isbn-10").val();
        var isbn13Value = $("#book-isbn-13").val();
        var noISBN = $("#book-no-isbn")[0].checked;
        var publisher1Value = $("#book-publisher-1").val();
        var publishMonthValue = $("#book-publish-month").val();
        var publishDayValue = $("#book-publish-day").val();
        var publishYearValue = $("#book-publish-year").val();
        var numPagesValue = parseInt($("#book-pages").val());
        var unNumbered = $("#book-unnumbered")[0].checked;
        var ddcValue = $("#book-dewey").val();
        var purchaseMonthValue = $("#book-purchase-month").val();
        var purchaseDayValue = $("#book-purchase-day").val();
        var purchaseYearValue = $("#book-purchase-year").val();
        var purchasePriceValue = $("#book-purchase-price").val();

        // Validate inputs
        if (titleValue == "") {
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
        if (author1LastValue == "" && author1FirstValue == "" && mediumValue != "av") {
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
        if (mediumValue == "") {
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
        if (coverLink == "../img/favicon.ico" && mediumValue != "av") {
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
        if (subjectValues.length == 0 == "" && mediumValue != "av") {
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
        if (descriptionValue == "" && mediumValue != "av") {
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
        if ((!childrenValue && !youthValue && !adultValue && !noneValue) || (noneValue && (childrenValue || youthValue || adultValue))) {
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
        if (!noISBN && (!verifyISBN(isbn10Value) || isbn10Value.length != 10)) {
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
        if (!noISBN && (!verifyISBN(isbn13Value) || isbn13Value.length != 13)) {
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
        if (publisher1Value == "" && mediumValue != "av") {
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
        if (!isValidDate(publishMonthValue, publishDayValue, publishYearValue) && mediumValue != "av") {
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
        // TODO: Remove the meduim check from this conditional? We had a NAN value put in the database on an AV item. Shouldn't it just be -1 for unnumbered?
        if (!unNumbered && (numPagesValue == "" || isNaN(parseInt(numPagesValue) || parseInt(numPagesValue) < 1)) && mediumValue != "av") {
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
        if (ddcValue == "" || (ddcValue != "FIC" && isNaN(parseFloat(ddcValue)))) {
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
        if ((purchaseMonthValue != "" || purchaseDayValue != "" || purchaseYearValue != "") && !isValidDate(purchaseMonthValue, purchaseDayValue, purchaseYearValue)) {
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
        if (purchasePriceValue != "" && (isNaN(parseFloat(purchasePriceValue)) || parseFloat(purchasePriceValue) < 0)) {
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

function isValidDate(m, d, y) {
    var year = parseInt(y);
    if (isNaN(year)) return false;
    if (year < 100) return false;
    var month = parseInt(m) - 1;
    if (isNaN(month) && m != "") return false;
    var day = parseInt(d);
    if (isNaN(day) && d != "") return false;
    if (m == "" && d != "") return false;
    if ((month > 11 || month < 0) && m != "") return false;
    if ((day > 31 || day < 1) && d != "") return false;
    if (day == 31 & (month == 3 || month == 5 || month == 8 || month == 10)) return false;
    if (month == 1 && day > 29) return false;
    if ((year % 4 != 0 || (year % 100 == 0 && year % 400 != 0)) && month == 1 && day == 29) return false;
    var date = new Date(year, month, day);
    if (date.getTime() > Date.now()) return false;
    var founded = new Date(1711, 9, 17);
    if (date.getTime() < founded.getTime()) return false;
    return true;
}

function storeData(isDeletedValue = false, iconImageLink, thumbnailImageLink, coverImageLink) {
    return new Promise(function(resolve, reject) {
        // Gets the values of all the input elements
        var barcodeValue = parseInt($("#barcode").html());
        var titleValue = $("#book-title").val();
        var subtitleValue = $("#book-subtitle").val();
        var author1LastValue = $("#book-author-1-last").val();
        var author1FirstValue = $("#book-author-1-first").val();
        var author2LastValue = $("#book-author-2-last").val();
        var author2FirstValue = $("#book-author-2-first").val();
        var illustrator1LastValue = $("#book-illustrator-1-last").val();
        var illustrator1FirstValue = $("#book-illustrator-1-first").val();
        var illustrator2LastValue = $("#book-illustrator-2-last").val();
        var illustrator2FirstValue = $("#book-illustrator-2-first").val();
        var mediumValue = $("#book-medium")[0].value;
        var subjectValues = [];
        $("[id^=book-subject-]").each((index, input) => {
            if (input.value != "") subjectValues.push(input.value);
        });
        var descriptionValue = $("#book-description").val();
        var childrenValue = $("#book-audience-children")[0].checked;
        var youthValue = $("#book-audience-youth")[0].checked;
        var adultValue = $("#book-audience-adult")[0].checked;
        var noneValue = $("#book-audience-none")[0].checked;
        var isbn10Value = $("#book-isbn-10").val();
        var isbn13Value = $("#book-isbn-13").val();
        var noISBN = $("#book-no-isbn")[0].checked;
        var publisher1Value = $("#book-publisher-1").val();
        var publisher2Value = $("#book-publisher-2").val();
        var publishMonthValue = $("#book-publish-month").val();
        var publishDayValue = $("#book-publish-day").val();
        var publishYearValue = $("#book-publish-year").val();
        var numPagesValue = parseInt($("#book-pages").val());
        var unNumbered = $("#book-unnumbered")[0].checked;
        var ddcValue = $("#book-dewey").val();
        var canBeCheckedOutValue = !!$("#book-can-be-checked-out")[0].value;
        var isHiddenValue = !!$("#book-is-hidden")[0].value;
        var purchaseMonthValue = $("#book-purchase-month").val();
        var purchaseDayValue = $("#book-purchase-day").val();
        var purchaseYearValue = $("#book-purchase-year").val();
        var purchasePriceValue = $("#book-purchase-price").val();
        var vendorValue = $("#book-vendor").val();

        // Defines the paths of the the database collection
        var booksPath = collection(db, "books");

        // Create a list of keywords from the description
        var keywordsValue = descriptionValue.replace(/-/g , " ").split(" ");

        keywordsValue = cleanUpSearchTerm(keywordsValue);

        var bookNumber = barcodeValue - 1171100000;
        var bookDocument = Math.floor(bookNumber / 100);
        if (bookDocument >= 100) {
            bookDocument = "" + bookDocument;
        } else if (bookDocument >= 10) {
            bookDocument = "0" + bookDocument;
        } else {
            bookDocument = "00" + bookDocument;
        }
        bookNumber = bookNumber % 100;

        var authorsValue = [{last: author1LastValue, first: author1FirstValue}];
        if (author2FirstValue != "" || author2LastValue != "") {
            authorsValue.push({last: author2LastValue, first: author2FirstValue});
        }

        var illustratorsValue = [];
        if (illustrator1FirstValue != "" || illustrator1LastValue != "") {
            illustratorsValue.push({last: illustrator1LastValue, first: illustrator1FirstValue});
        }
        if (illustrator2FirstValue != "" || illustrator2LastValue != "") {
            illustratorsValue.push({last: illustrator2LastValue, first: illustrator2FirstValue});
        }

        var publishersValue = [];
        if (publisher1Value != "") {
            publishersValue.push(publisher1Value);
        }
        if (publisher2Value != "") {
            publishersValue.push(publisher2Value);
        }

        if (noISBN) {
            isbn10Value = "";
            isbn13Value = "";
        }

        if (unNumbered) {
            numPagesValue = -1;
        }

        var publishDateValue = null;
        if (publishMonthValue != "" && publishDayValue != "") {
            publishDateValue = new Date(publishYearValue, publishMonthValue-1, publishDayValue);
        } else if (publishMonthValue != "") {
            publishDateValue = new Date(publishYearValue, publishMonthValue-1);
        } else if (publishYearValue != "") {
            publishDateValue = new Date(publishYearValue);
        }
        if (publishDateValue) {
            publishDateValue = convertToUTC(publishDateValue);
        }

        var purchaseDateValue = null;
        if (purchaseMonthValue != "" && purchaseDayValue != "") {
            purchaseDateValue = new Date(purchaseYearValue, purchaseMonthValue-1, purchaseDayValue);
        } else if (purchaseMonthValue != "") {
            purchaseDateValue = new Date(purchaseYearValue, purchaseMonthValue-1);
        } else if (purchaseYearValue != "") {
            purchaseDateValue = new Date(purchaseYearValue);
        }
        if (purchaseDateValue) {
            purchaseDateValue = convertToUTC(purchaseDateValue);
        }

        var lastUpdatedValue = new Date();

        // Updates the book with the information
        return runTransaction(db, (transaction) => {
            let path = doc(booksPath, bookDocument);
            return transaction.get(path).then((docSnap) => {
                if (!docSnap.exists()) {
                    console.error("There was a large problem because the books doc doesn't exist anymore...");
                }

                // Get the existing list of books
                let existingBooks = docSnap.data().books;

                // If a new link was not passed in, keep the old one. However, we are allowing null values for AV.
                // Need strict inequality so that undefined and null are not treated as equal
                if (!iconImageLink && iconImageLink !== null) {
                    iconImageLink = docSnap.data().books[bookNumber].iconImageLink;
                }
                if (!thumbnailImageLink && thumbnailImageLink !== null) {
                    thumbnailImageLink = docSnap.data().books[bookNumber].thumbnailImageLink;
                }
                if (!coverImageLink && coverImageLink !== null) {
                    coverImageLink = docSnap.data().books[bookNumber].coverImageLink;
                }

                // If any of the images still have invalid values, set them to null
                if (iconImageLink == undefined) {
                    iconImageLink = null;
                }
                if (thumbnailImageLink == undefined) {
                    thumbnailImageLink = null;
                }
                if (coverImageLink == undefined) {
                    coverImageLink = null;
                }

                // Update the array with the new book information.
                existingBooks[bookNumber] = {
                    barcodeNumber: barcodeValue,
                    title: titleValue,
                    subtitle: subtitleValue,
                    authors: authorsValue,
                    illustrators: illustratorsValue,
                    medium: mediumValue,
                    coverImageLink: coverImageLink,
                    thumbnailImageLink: thumbnailImageLink,
                    iconImageLink: iconImageLink,
                    subjects: subjectValues,
                    description: descriptionValue,
                    audience: [childrenValue, youthValue, adultValue, noneValue],
                    isbn10: isbn10Value,
                    isbn13: isbn13Value,
                    publishers: publishersValue,
                    publishDate: publishDateValue,
                    numberOfPages: numPagesValue,
                    ddc: ddcValue,
                    purchaseDate: purchaseDateValue,
                    purchasePrice: purchasePriceValue,
                    vendor: vendorValue,
                    keywords: keywordsValue,
                    canBeCheckedOut: canBeCheckedOutValue,
                    isDeleted: isDeletedValue,
                    isHidden: isHiddenValue,
                    lastUpdated: lastUpdatedValue
                };

                transaction.update(doc(booksPath, bookDocument), {
                    books: existingBooks
                });
            });
        }).then(() => {
            console.log("Transaction completed successfully");
            resolve();
        }).catch((error) => {
            console.error("Error updating book with transaction: ", error);
            reject(error);
        });
    }).then(() => {
        $("#loading-overlay").hide();
        alert("Edits were made successfully");
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

function processImages() {
    return new Promise((resolve, reject) => {
        // Gets the current image (uploaded or from open library) and stores it to the file variable
        getImage().then((fileReturn) => {
            // Clear out the old images in Firebase Storage
            deleteOldImages().then(() => {
                let promises = [];
                promises[0] = uploadImageToStorage("original", fileReturn);
                promises[1] = uploadImageToStorage("thumbnail", fileReturn);
                promises[2] = uploadImageToStorage("icon", fileReturn);

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
    });
}

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
            var xhr = new XMLHttpRequest();
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

function deleteOldImages() {
    // Delete firebase storage images for the book that is being edited
    return new Promise((resolve, reject) => {
        list(ref(storage, "books/" + $("#barcode").html()), {maxResults: 10}).then((result) => {
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

function uploadImageToStorage(type = "original", file) {
    return new Promise((resolve, reject) => {
        // AV images are stored as null
        if ($("#book-medium")[0].value == "av") {
            console.warn("No need to upload an image for an AV item...");
            resolve(null);
            return;
        }

        let barcodeValue = parseInt($("#barcode").html());
        if (isNaN(barcodeValue) || barcodeValue.toString().substring(0, 5) != "11711") {
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

                let bookSpecificRef = ref(storage, "books");
                if (type == "original") {
                    bookSpecificRef = ref(bookSpecificRef, barcodeValue + "/cover.jpg");
                } else if (type == "thumbnail") {
                    bookSpecificRef = ref(bookSpecificRef, barcodeValue + "/cover-400px.jpg");
                } else if (type == "icon") {
                    bookSpecificRef = ref(bookSpecificRef, barcodeValue + "/cover-250px.jpg");
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
 * When a user uploads a file, this function is called.
 * It sets the value of file to the file that was uploaded.
 * It displays the newly updated image using a blob URL.
 * @param {Event} event - The onchange event for the file input.
 */
function loadFile(event) {
    if (event.target.files[0]) {
        file = event.target.files[0];
        var output = document.getElementById('book-cover-image');
        output.src = URL.createObjectURL(file);
        /* This is bad because then the canvas elements can't use the link
        output.onload = function() {
            URL.revokeObjectURL(output.src); // free memory
        };*/
        imageChanged = true;
    }
}

// Run when the user clicks the "Cancel" button
function cancelEditEntry() {
    $(window).off("beforeunload");

    window.history.back();
}

// Run when the user clicks the "Delete" button
function deleteEntry() {
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


function cleanUpSearchTerm(searchArray) {
    // List of words to remove from the keywords list
    // eslint-disable-next-line max-len
    var meaninglessWords = ["the", "is", "it", "an", "to", "on", "a", "in", "than", "and", "as", "they'll", "also", "for", "more", "here", "with", "without", "within", "most", "about", "almost", "any", "at", "be", "but", "by", "can", "come", "could", "do", "else", "if", "few", "get", "go", "he", "she", "they", "them", "him", "her", "his", "hers", "theirs", "there", "i", "", "into", "it", "its", "itself", "let", "lots", "me", "much", "must", "my", "oh", "yes", "no", "none", "nor", "not", "now", "of", "ok", "or", "our", "out", "own", "per", "put", "say", "see", "set", "so", "some", "soon", "still", "stay", "such", "sure", "tell", "then", "that", "these", "thing", "this", "those", "too", "try", "us", "use", "we", "what", "where", "when", "why", "how", "who", "whom", "you", "your"];
    // Itterate through each word
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

function convertToUTC(date) {
    // TODO: Actually account for time shifts with Daylight Savings
    // console.log("The date that was just saved was: " + new Date(date.valueOf() + 1000 * 60 * 60 * 5));
    return new Date(date.valueOf() + 1000 * 60 * 60 * 5);
}
