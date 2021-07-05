/* Implement the whole thing in a transaction to ensure that nothing breaks along the way.
db.runTransaction((transaction) => {
    // This code may run multiple times if there are confilcts
    var bookPath = db.collection("books").doc(barcodeNumber);
    // Get the variable stored in the cloud_vars area
    return transaction.get(bookPath).then((doc) => {
        if (!doc.exists) {
            throw "Document does not exist!";
        }
    });
}).then((content) => {
    // Will run after transaction success.
}).catch((error) => {
    // Will run after transaction failure.
});
*/

function setupEditEntry(pageQuery) {
    var newEntry = (findURLValue(pageQuery, "new") == "true");
    var barcodeNumber = parseInt(findURLValue(pageQuery, "id", true));
    var isbn = findURLValue(pageQuery, "isbn", true);
    
    if (barcodeNumber == "" && newEntry == false) {
        alert("The barcode that you are trying to edit is not valid.");
        goToPage("admin/main");
        return;
    }

    if (!newEntry) {
        // If this is not a new entry, just get the content that exists in the database
        if (!isNaN(barcodeNumber)) {
            var docRef = firebase.firestore().collection("books").doc("" + barcodeNumber);
            docRef.get().then((doc) => {
                $('#barcode').html(barcodeNumber);
                $("#book-title").val(doc.data().title);
                $("#book-subtitle").val(doc.data().subtitle);

                for (var i = 0; i < doc.data().authors; i++) {
                    $("#book-author-" + i + "last").val(doc.data().authors[i].last);
                    $("#book-author-" + i + "first").val(doc.data().authors[i].first);
                }

                for (var i = 0; i < doc.data().illustrators; i++) {
                    $("#book-illustrator-" + i + "last").val(doc.data().illustrators[i].last);
                    $("#book-illustrator-" + i + "first").val(doc.data().illustrators[i].first);
                }

                $("#book-medium").val(doc.data().medium);

                $("#book-cover-image").attr('src', coverImageLink);

                for (var i = 0; i < doc.data().subjects; i++) {
                    addSubject();
                    $("#book-subject-" + (i + 1)).val(doc.data().subjects[i]);
                }

                $("#book-description").val(doc.data().description);

                $("#book-audience-children").prop("checked", doc.data().audience[0]);
                $("#book-audience-youth").prop("checked", doc.data().audience[1]);
                $("#book-audience-adult").prop("checked", doc.data().audience[2]);
                $("#book-audience-none").prop("checked", doc.data().audience[3]);
                
                $("#book-isbn-10").val(doc.data().isbn_10);
                $("#book-isbn-13").val(doc.data().isbn_13);

                $("#book-publisher-1").val(doc.data().publishers[0]);
                $("#book-publisher-2").val(doc.data().publishers[1]);
                
                $("#book-publish-month").val(doc.data().publish_date.getMonth);
                $("#book-publish-day").val(doc.data().publish_date.getDay);
                $("#book-publish-year").val(doc.data().publish_date.getFullYear);

                if (doc.data().number_of_pages != -1) {
                    $("#book-pages").val(doc.data().number_of_pages);
                    $("#book-unnumbered").prop("checked", false);
                } else {
                    $("#book-unnumbered").prop("checked", true);
                }

                $("#book-dewey").val(doc.data().dewey);

                $("#book-purchase-month").val(doc.data().purchase_date.getMonth);
                $("#book-purchase-day").val(doc.data().purchase_date.getDay);
                $("#book-purchase-year").val(doc.data().purchase_date.getFullYear);

                $("#book-purchase-price").val(doc.data().purchase_price);
                $("#book-vendor").val(doc.data().vendor);

                // TO DO: Fix...
                $("#updated-time").val("This entry was last updated at: " + doc.data().last_updated.toString());
            });

            /* This should all be obsolete now
            var coverImageLink;
            firebase.storage().ref().child("books").child("" + barcodeNumber).listAll().then((result) => {
                result.items.forEach((itemRef) => {
                    // If we store more that just one image per book, this will probably break.
                    coverImageLink = itemRef.getDownloadURL();
                    $("#book-cover-image").attr('src', coverImageLink);
                });
            }).catch((error) => {
                console.error(error);
            });*/
        }
        
    } else {
        // If this is a new entry (and they are creating it for the first time) go get info from open library
        $("button#edit-entry-save").attr("onclick", "javascript:createEntry();");
        if (isbn.length >= 10) {
            gatherExternalInformation(isbn).then((noISBN = false) => {
                // If this is a brand new entry...
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
                    for (var i = 0; i < authorObject.length; i++) {
                        var fullName = authorObject[i].name;
                        var lastName = fullName.substring(fullName.lastIndexOf(' ') + 1, fullName.length);
                        var firstName  = fullName.substring(0, fullName.lastIndexOf(' '));
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
                // TODO: Make the above statement true. The commented out lines below probably need to be moved to the save button.
                // Also at the save button, the image link should be stored in the database
                try {
                    $('#book-cover-image').attr('src', "http://covers.openlibrary.org/b/id/" + bookObject.covers[0] + "-L.jpg");
                    // uploadCoverImageFromExternal("http://covers.openlibrary.org/b/id/" + bookObject.covers[0] + "-L.jpg");
                } catch {
                    try {
                        $('#book-cover-image').attr('src', "http://covers.openlibrary.org/b/id/" + worksObject[0].covers[0] + "-L.jpg");
                        //uploadCoverImageFromExternal("http://covers.openlibrary.org/b/id/" + worksObject[0].covers[0] + "-L.jpg");
                    } catch {
                        console.warn("A cover could not be found for either the book or the work");
                        console.log(bookObject);
                        console.log(worksObject);
                    }
                }

                // Subject
                try {
                    for (var i = 0; i < bookObject.subjects.length; i++) {
                        addSubject();
                        $('#book-subject-' + (i + 1)).val(bookObject.subjects[i]);
                    }
                } catch {
                    console.log("The books object did not have any subjects. Falling back to the works object")
                    try {
                        for (var i = 0; i < worksObject[0].subjects.length; i++) {
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
                    for (var i = 0; i < bookObject.publishers.length; i++) {
                        if (i > 1) {
                            console.warn("A publisher was cut off because there was only two input boxes.");
                            return;
                        }
                        $('#book-publisher-' + (i + 1)).val(bookObject.publishers[i]);
                    }
                } catch {
                    console.log("The books object did not have any publishers. Falling back to the works object")
                    try {
                        for (var i = 0; i < worksObject[0].publishers.length; i++) {
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
                    var publish_date = bookObject.publish_date;
                    if (publish_date.length == 4) {
                        // We can assume that this is only a year.
                        $("#book-publish-year").val(publish_date);
                    } else {
                        var month = publish_date.substring(0, publish_date.indexOf(" "));
                        var day = publish_date.substring(publish_date.indexOf(" ") + 1, publish_date.indexOf(","));
                        var year = publish_date.substring(publish_date.indexOf(",") + 2, publish_date.length);
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
                    var publish_date = worksObject[0].publish_date;
                    try {
                        if (publish_date.length == 4) {
                            // We can assume that this is only a year.
                            $("#book-publish-year").val(publish_date);
                        } else {
                            var month = publish_date.substring(0, publish_date.indexOf(" "));
                            var day = publish_date.substring(publish_date.indexOf(" ") + 1, publish_date.indexOf(","));
                            var year = publish_date.substring(publish_date.indexOf(",") + 2, publish_date.length);
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
                    var ddcAnswer = "";
                    for (var i = 0; i < bookObject.dewey_decimal_class.length; i++) {
                        if (i > 0) {
                            ddcAnswer += ", ";
                        }
                        ddcAnswer += bookObject.dewey_decimal_class[i];
                    }
                    $("#book-dewey").val(ddcAnswer);
                } catch {
                    try {
                        var ddcAnswer;
                        for (var i = 0; i < bookObject.dewey_decimal_class.length; i++) {
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
            }).catch((error) => {
                // The ISBN Number is valid, but there is not a listing in Open Library
                alert("The ISBN number that you entered (" + isbn + ") is a valid number, but we did not find a listing for it in the external database. You will need to create an entry manually.");
                
                // Used to delete the entry and make them start over... that's just a bad idea...
                /*goToPage('admin/main');
                // This can happen async so the user is not interupted.
                db.runTransaction((transaction) => {
                    var cloudVarsPath = db.collection("config").doc("cloud_vars");
                    var booksPath = db.collection("books");
                    // Get the variable stored in the cloud_vars area
                    return transaction.get(cloudVarsPath).then((doc) => {
                        if (!doc.exists) {
                            throw "Document does not exist!";
                        }
                        transaction.update(cloudVarsPath, {
                            missed_barcodes: firebase.firestore.FieldValue.arrayUnion(barcodeNumber)
                        });

                        transaction.delete(booksPath.doc(barcodeNumber.toString()))
                    });
                }).then((barcodeNumber) => {
                    // After both writes complete, send the user to the edit page and take it from there.
                    console.log("New Entry Created with barcode: ", barcodeNumber);
                    resolve(barcodeNumber);
                }).catch((err) => {
                    console.error(err);
                    reject(err);
                });*/
            });
        }
    }

    


    // Create Event Listeners to handle book cover image changes
    // All are required to handle leaving the element and coming back again
    $("#book-cover-image").mouseover(function() {
        showAccountImageOverlay();
    });
    $("#book-cover-image-overlay").mouseleave(function() {
        $("#book-cover-image-overlay").css("opacity", "0");
        $("#book-cover-image-overlay").delay(300).hide(0);
    });
    $("#book-cover-image-overlay").mouseover(function() {
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
    $("#book-cover-image-overlay").click(function(event) {
        if ($("#file-input")) {
            $("#file-input").click();
        }
    });

    // When there is a change to the input, upload the file
    $("#file-input").on("change", function() {
        if (!$("#file-input")[0].files) {
            return;
        }
        const file = $("#file-input")[0].files[0];
        var bookSpecificRef = firebase.storage().ref().child("books");
        var meta;
        if (file.type == "image/jpg") {
            bookSpecificRef = bookSpecificRef.child(barcodeNumber + "/cover.jpg");
            meta = {contentType: 'image/jpeg'};
        } else if (file.type == "image/png") {
            bookSpecificRef = bookSpecificRef.child(barcodeValue + "/cover.png");
            meta = {contentType: 'image/png'};
        } else {
            alert("That file type is not supported. Please upload a JPG or PNG file.");
            return;
        }
        bookSpecificRef.put(file, meta).then((snapshot) => {
            console.log('Uploaded the file!');
            bookSpecificRef.getDownloadURL().then((url) => {
                $('#book-cover-image').attr('src', url);
            }).catch(function(error) {
            console.error(error);
            });
        });
    });


    // If the user attempts to leave, let them know if they have unsaved changes
    // TO DO: Remove when the user leaves the page.
    $(window).on("beforeunload", function (event) {
        event.preventDefault();
        return "If you leave the page now, your changes will not be saved. If this is a new entry, you will be left with a blank entry";
    });
}


function uploadCoverImageFromExternal(link) {
    var ref = firebase.storage().ref();
    ref = ref.child(barcodeNumber  + "/cover.jpg");

    ref.put(link, {contentType: 'image/jpeg'}).then((snapshot) => {
        console.log("Image has been uploaded from the external source.");
    });
}

$("#book-medium")[0].addEventListener("input", (event) => {
    if (event.target.value == "dvd") {
        var goAway = $(".no-dvd");
        for (var i = 0; i < goAway.length; i++)
            goAway[i].style.display = "none";
    } else {
        var goAway = $(".no-dvd");
        for (var i = 0; i < goAway.length; i++)
            goAway[i].style.display = "";
    }
});

$("#book-unnumbered")[0].addEventListener("input", (event) => {
    if (event.target.checked == true) {
        $("#book-pages").val("");
        $("#book-pages")[0].style.backgroundColor = "#eee";
        $("#book-pages")[0].readOnly = true;
    } else {
        $("#book-pages").val("");
        $("#book-pages")[0].style.backgroundColor = "white";
        $("#book-pages")[0].readOnly = false;
    }
});

function validateEntry() {
    // Gets the values of all the input elements
    var titleValue = $("#book-title").val();
    var author1LastValue = $("#book-author-1-last").val();
    var author1FirstValue = $("#book-author-1-first").val();
    var mediumValue = $("#book-medium")[0].value;
    var coverLink = $("#book-cover-image").attr('src');
    var subjectValues = [];
    var maxSubject = false;
    for (var i = 1; !maxSubject; i++) {
        if ($("#book-subject-" + i)[0]) {
            subjectValues.push($("#book-subject-" + i).val());
        } else {
            maxSubject = true;
        }
    }
    var descriptionValue = $("#book-description").val();
    var childrenValue = $("#book-audience-children")[0].checked;
    var youthValue = $("#book-audience-youth")[0].checked;
    var adultValue = $("#book-audience-adult")[0].checked;
    var noneValue = $("#book-audience-none")[0].checked;
    var isbn10Value = $("#book-isbn-10").val();
    var isbn13Value = $("#book-isbn-13").val();
    var publisher1Value = $("#book-publisher-1").val();
    var publishMonthValue = $("#book-publish-month").val();
    var publishDayValue = $("#book-publish-day").val();
    var publishYearValue = $("#book-publish-year").val();
    var numPagesValue = $("#book-pages").val();
    var unNumbered = $("#book-unnumbered")[0].checked;
    var ddcValue = $("#book-dewey").val();
    var purchaseMonthValue = $("#book-purchase-month").val();
    var purchaseDayValue = $("#book-purchase-day").val();
    var purchaseYearValue = $("#book-purchase-year").val();
    var purchasePriceValue = $("#book-purchase-price").val();
    
    // Validate inputs
    if (titleValue == "") {
        alert("Title is required!");
        var rect = $("#book-title")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-title")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-title")[0].focus();}, 600);
        $("#book-title")[0].onkeydown = function(e) {
            $("#book-title")[0].style.borderColor = "";
        }
        return false;
    }
    if (author1LastValue == "" && author1FirstValue == "") {
        alert("At least one author is required! If author is unknown, enter \"unknown\" into last name.");
        var rect = $("#book-author-1-last")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-author-1-last")[0].style.borderColor = "red";
        $("#book-author-1-first")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-author-1-last")[0].focus();}, 600);
        $("#book-author-1-last")[0].onkeydown = function(e) {
            $("#book-author-1-last")[0].style.borderColor = "";
            $("#book-author-1-first")[0].style.borderColor = "";
        }
        $("#book-author-1-first")[0].onkeydown = function(e) {
            $("#book-author-1-last")[0].style.borderColor = "";
            $("#book-author-1-first")[0].style.borderColor = "";
        }
        return false;
    }
    if (mediumValue == "") {
        alert("Medium is required!");
        var rect = $("#book-medium")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-medium")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-medium")[0].focus();}, 600);
        $("#book-medium")[0].onclick = function(e) {
            $("#book-medium")[0].style.borderColor = "";
        }
        return false;
    }
    if (coverLink == "../img/favicon.ico") {
        alert("Cover image is required!");
        var rect = $("#book-cover-image")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-cover-image")[0].style.boxShadow = "0px 0px 16px 0px #ff00008a";
        setTimeout(function() {$("#book-cover-image")[0].focus();}, 600);
        $("#book-cover-image")[0].onkeydown = function(e) {
            $("#book-cover-image")[0].style.boxShadow = "0px 0px 16px 0px #aaaaaa4a";
        }
        return false;
    }
    if (subjectValues[0] == "") {
        alert("Please enter at least one subject!");
        var rect = $("#book-subject-1")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-subject-1")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-subject-1")[0].focus();}, 600);
        $("#book-subject-1")[0].onkeydown = function(e) {
            $("#book-subject-1")[0].style.borderColor = "";
        }
        return false;
    }
    if (descriptionValue == "") {
        alert("Description is required!");
        var rect = $("#book-description")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-description")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-description")[0].focus();}, 600);
        $("#book-description")[0].onkeydown = function(e) {
            $("#book-description")[0].style.borderColor = "";
        }
        return false;
    }
    if ((!childrenValue && !youthValue && !adultValue && !noneValue) || (noneValue && (childrenValue || youthValue || adultValue))) {
        alert("Invalid audience input! If there is no audience listed, please select \"None\" (and no other checkboxes).");
        var rect = $("#book-audience-children")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-audience-children")[0].style.outline = "2px solid red";
        $("#book-audience-youth")[0].style.outline = "2px solid red";
        $("#book-audience-adult")[0].style.outline = "2px solid red";
        $("#book-audience-none")[0].style.outline = "2px solid red";
        setTimeout(function() {$("#book-audience-children")[0].focus();}, 600);
        $("#book-audience-children")[0].onkeydown = function(e) {
            $("#book-audience-children")[0].style.outline = "";
            $("#book-audience-youth")[0].style.outline = "";
            $("#book-audience-adult")[0].style.outline = "";
            $("#book-audience-none")[0].style.outline = "";
        }
        return false;
    }
    if (mediumValue != "dvd" && isbn10Value == "" && isbn13Value == "") {
        alert("Please enter at least one ISBN number!");
        var rect = $("#book-isbn-10")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-isbn-10")[0].style.borderColor = "red";
        $("#book-isbn-13")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-isbn-10")[0].focus();}, 600);
        $("#book-isbn-10")[0].onkeydown = function(e) {
            $("#book-isbn-10")[0].style.borderColor = "";
            $("#book-isbn-13")[0].style.borderColor = "";
        }
        $("#book-isbn-13")[0].onkeydown = function(e) {
            $("#book-isbn-10")[0].style.borderColor = "";
            $("#book-isbn-13")[0].style.borderColor = "";
        }
        return false;
    }
    if (!verifyISBN(isbn10Value) && isbn10Value != "") {
        alert("The ISBN number you entered was not valid! Please double check it.");
        var rect = $("#book-isbn-10")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-isbn-10")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-isbn-10")[0].focus();}, 600);
        $("#book-isbn-10")[0].onkeydown = function(e) {
            $("#book-isbn-10")[0].style.borderColor = "";
        }
        return false;
    }
    if (!verifyISBN(isbn13Value) && isbn13Value != "") {
        alert("The ISBN number you entered was not valid! Please double check it.");
        var rect = $("#book-isbn-13")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-isbn-13")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-isbn-13")[0].focus();}, 600);
        $("#book-isbn-13")[0].onkeydown = function(e) {
            $("#book-isbn-13")[0].style.borderColor = "";
        }
        return false;
    }
    if (publisher1Value == "") {
        alert("Please enter at least one publisher! If the publisher is unknown, enter \"unknown\".");
        var rect = $("#book-publisher-1")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-publisher-1")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-publisher-1")[0].focus();}, 600);
        $("#book-publisher-1")[0].onkeydown = function(e) {
            $("#book-publisher-1")[0].style.borderColor = "";
        }
        return false;
    }
    if (!isValidDate(publishMonthValue, publishDayValue, publishYearValue)) {
        alert("The publishing date is invalid! Please enter a valid date between October 17, 1711 and today.");
        var rect = $("#book-publish-month")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-publish-month")[0].style.borderColor = "red";
        $("#book-publish-day")[0].style.borderColor = "red";
        $("#book-publish-year")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-publish-month")[0].focus();}, 600);
        $("#book-publish-month")[0].onkeydown = function(e) {
            $("#book-publish-month")[0].style.borderColor = "";
            $("#book-publish-day")[0].style.borderColor = "";
            $("#book-publish-year")[0].style.borderColor = "";
        }
        $("#book-publish-day")[0].onkeydown = function(e) {
            $("#book-publish-month")[0].style.borderColor = "";
            $("#book-publish-day")[0].style.borderColor = "";
            $("#book-publish-year")[0].style.borderColor = "";
        }
        $("#book-publish-year")[0].onkeydown = function(e) {
            $("#book-publish-month")[0].style.borderColor = "";
            $("#book-publish-day")[0].style.borderColor = "";
            $("#book-publish-year")[0].style.borderColor = "";
        }
        return false;
    }
    if (unNumbered == false && (numPagesValue == "" || isNaN(parseInt(numPagesValue) || parseInt(numPagesValue) < 1))) {
        alert("Please enter a valid number of pages!");
        var rect = $("#book-pages")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-pages")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-pages")[0].focus();}, 600);
        $("#book-pages")[0].onkeydown = function(e) {
            $("#book-pages")[0].style.borderColor = "";
        }
        return false;
    }
    if (ddcValue == "" || (ddcValue != "FIC" && isNaN(parseFloat(ddcValue)))) {
        alert("Please enter a valid Dewey Decimal Classification!");
        var rect = $("#book-dewey")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-dewey")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-dewey")[0].focus();}, 600);
        $("#book-dewey")[0].onkeydown = function(e) {
            $("#book-dewey")[0].style.borderColor = "";
        }
        return false;
    }
    if ((purchaseMonthValue != "" || purchaseDayValue != "" || purchaseYearValue != "") && !isValidDate(purchaseMonthValue, purchaseDayValue, purchaseYearValue)) {
        alert("The purchasing date is invalid! Please enter a valid date between October 17, 1711 and today.");
        var rect = $("#book-purchase-month")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-purchase-month")[0].style.borderColor = "red";
        $("#book-purchase-day")[0].style.borderColor = "red";
        $("#book-purchase-year")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-purchase-month")[0].focus();}, 600);
        $("#book-purchase-month")[0].onkeydown = function(e) {
            $("#book-purchase-month")[0].style.borderColor = "";
            $("#book-purchase-day")[0].style.borderColor = "";
            $("#book-purchase-year")[0].style.borderColor = "";
        }
        $("#book-purchase-day")[0].onkeydown = function(e) {
            $("#book-purchase-month")[0].style.borderColor = "";
            $("#book-purchase-day")[0].style.borderColor = "";
            $("#book-purchase-year")[0].style.borderColor = "";
        }
        $("#book-purchase-year")[0].onkeydown = function(e) {
            $("#book-purchase-month")[0].style.borderColor = "";
            $("#book-purchase-day")[0].style.borderColor = "";
            $("#book-purchase-year")[0].style.borderColor = "";
        }
        return false;
    }
    if (purchasePriceValue != "" && (isNaN(parseFloat(purchasePriceValue)) || parseFloat(purchasePriceValue) < 0)) {
        alert("Please enter a valid purchase price!");
        var rect = $("#book-purchase-price")[0].getBoundingClientRect();
        window.scrollBy(0, rect.top - 180);
        $("#book-purchase-price")[0].style.borderColor = "red";
        setTimeout(function() {$("#book-purchase-price")[0].focus();}, 600);
        $("#book-purchase-price")[0].onkeydown = function(e) {
            $("#book-purchase-price")[0].style.borderColor = "";
        }
        return false;
    }
    return true;
}

function isValidDate(m, d, y) {
    var year = parseInt(y);
    if (isNaN(year)) return false;
    var month = parseInt(m);
    if (isNaN(month) && m != "") return false;
    var day = parseInt(d);
    if (isNaN(day) && d != "") return false;
    if (m == "" && d != "") return false;
    if (month > 11 || month < 0) return false;
    if (day > 31 || day < 1) return false;
    if (day == 31 & (month == 4 || month == 6 || month == 9 || month == 11)) return false;
    if (month == 2 && day > 29) return false;
    if ((year % 4 != 0 || (year % 100 == 0 && year % 400 != 0)) && month == 2 && day == 29) return false;
    var date = new Date(year, month - 1, day);
    if (date.getTime() > Date.now()) return false;
    var founded = new Date(1711, 9, 17);
    if (date.getTime() < founded.getTime()) return false;
    return true;
}


function createEntry() {
    if (!validateEntry()) {
        return;
    }
    return new Promise(function (resolve, reject) {
        // Run a Transaction to ensure that the correct barcode is used. (Atomic Transation)
        db.runTransaction((transaction) => {
            var cloudVarsPath = db.collection("config").doc("cloud_vars");
            // Get the variable stored in the cloud_vars area
            return transaction.collection("books").orderBy("order", "desc").limit(1).get().then((doc) => {
                if (!doc.exists) {
                    throw "Document does not exist!";
                }

                var order = doc.data().order;

                if (doc.data().books.length == 100) {
                    // A new book doc has to be created...
                    var newNumber = order + 1;
                    if (order < 10) {
                        newNumber = "00" + order;
                    } else if (order < 100) {
                        newNumber = "0" + order;
                    }
                    transaction.collection("books").doc(newNumber).set({
                        books: [{}],
                        order: order + 1
                    }).then(() => {
                        return "1711" + newNumber + "00";
                    });
                } else {
                    if (order < 10) {
                        order = "00" + order;
                    } else if (order < 100) {
                        order = "0" + order;
                    }
                    transaction.collection("books").doc(order).update({
                        books: firebase.firestore.FieldValue.arrayUnion({})
                    }).then(() => {
                        return doc.data.books.length + 1;
                    });
                }
            });
        }).then((newBarcode) => {
            // After both writes complete, send the user to the edit page and take it from there.
            console.log("New Entry Created with barcode: ", newBarcode);
            editEntry(newBarcode)
            resolve(newBarcode);
        }).catch((err) => {
            console.error(err);
            reject(err);
        });
    });
    
}


function editEntry(barcodeValue = null, isDeletedValue = false) {
    // Gets the values of all the input elements
    if (barcodeValue == null) {
        barcodeValue = $("#barcode").val();
    }
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
    var coverLink = $("#book-cover-image").attr('src');
    var subjectValues = [];
    var maxSubject = false;
    for (var i = 1; !maxSubject; i++) {
        if ($("#book-subject-" + i)[0]) {
            subjectValues.push($("#book-subject-" + i).val());
        } else {
            maxSubject = true;
        }
    }
    var descriptionValue = $("#book-description").val();
    var childrenValue = $("#book-audience-children")[0].checked;
    var youthValue = $("#book-audience-youth")[0].checked;
    var adultValue = $("#book-audience-adult")[0].checked;
    var noneValue = $("#book-audience-none")[0].checked;
    var isbn10Value = $("#book-isbn-10").val();
    var isbn13Value = $("#book-isbn-13").val();
    var publisher1Value = $("#book-publisher-1").val();
    var publisher2Value = $("#book-publisher-2").val();
    var publishMonthValue = $("#book-publish-month").val();
    var publishDayValue = $("#book-publish-day").val();
    var publishYearValue = $("#book-publish-year").val();
    var numPagesValue = $("#book-pages").val();
    var unNumbered = $("#book-unnumbered")[0].checked;
    var ddcValue = $("#book-dewey").val();
    var canBeCheckedOutValue = !!$("#book-can-be-checked-out")[0].value;
    var isHiddenValue = !!$("#book-is-hidden")[0].value;
    var purchaseMonthValue = $("#book-purchase-month").val();
    var purchaseDayValue = $("#book-purchase-day").val();
    var purchaseYearValue = $("#book-purchase-year").val();
    var purchasePriceValue = $("#book-purchase-price").val();
    var vendorValue = $("#book-vendor").val();

    // Validate inputs (unless it's gonna be deleted, in which case don't bother lol)
    if (!isDeletedValue && !validateEntry()) {
        return;
    }

    // Defines the paths of the the two database collections
    var indexBooksPath = db.collection("index_books");
    var booksPath = db.collection("books");

    var batch = db.batch();

    // Create a list of keywords from the description
    var keywordsValue = descriptionValue.split(" ");

    keywordsValue = cleanUpSearchTerm(keywordsValue);

    var bookNumber = barcodeValue - 171100000;
    var bookDocument = Math.floor((bookNumber - 1) / 100) + 1;
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

    var illustratorsValue = [{last: illustrator1LastValue, first: illustrator1FirstValue}];
    if (illustrator2FirstValue != "" || illustrator2LastValue != "") {
        illustratorsValue.push({last: illustrator2LastValue, first: illustrator2FirstValue});
    }

    var publishersValue = [publisher1Value];
    if (publisher2Value != "") {
        publishersValue.push(publisher2Value);
    }

    if (unNumbered) {
        numPagesValue = -1;
    }

    var publishDateValue;
    if (publishMonthValue != "" && publishDayValue != "") {
        publishDateValue = new Date(publishYearValue, publishMonthValue-1, publishDayValue);
    } else if (publishMonthValue != "") {
        publishDateValue = new Date(publishYearValue, publishMonthValue-1);
    } else {
        publishDateValue = new Date(publishYearValue);
    }

    var purchaseDateValue;
    if (purchaseMonthValue != "" && purchaseDayValue != "") {
        purchaseDateValue = new Date(purchaseYearValue, purchaseMonthValue-1, purchaseDayValue);
    } else if (purchaseMonthValue != "") {
        purchaseDateValue = new Date(purchaseYearValue, purchaseMonthValue-1);
    } else {
        purchaseDateValue = new Date(purchaseYearValue);
    }

    var lastUpdatedValue = new Date();

    // Updates the book with the information
    batch.update(booksPath.doc(bookDocument), {
        "books.[bookNumber]": {
            barcodeNumber: barcodeValue,
            title: titleValue,
            subtitle: subtitleValue,
            authors: authorsValue,
            illustrators: illustratorsValue,
            medium: mediumValue,
            coverImageLink: coverLink,
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
        }
    });

    // Update the books index with the information.
    batch.update(indexBooksPath.doc(barcodeValue), {
        barcodeNumber: barcodeValue,
        title: titleValue,
        subtitle: subtitleValue,
        authors: authorsValue,
        illustrators: illustratorsValue,
        medium: mediumValue,
        coverImageLink: coverLink,
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
    });

    batch.commit().then(() => {
        alert("Edits were made successfully");
        goToPage('admin/main');
    }).catch((error) => {
        alert(error);
    });

    $(window).off("beforeunload");
}

function cancelEditEntry() {
    $(window).off("beforeunload");

    window.history.back();
}

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

// Returns true if there are unsaved changes on the Edit Entry page
function unSavedChangesEditEntry() {
    // TODO: Fix

    return false;
}
