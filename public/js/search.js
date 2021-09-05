// Make content Responsive
// Doesn't have to be setup because the window element doesn't change.
$(window).resize(function () {
    if ($(window).width() > 786) {
        $('#sort-container').width('fit-content');
        $('.sort-section').show();
        $('.sort-section').css('opacity', '1');
        $('#close-button').hide();
        // $('#sort-sidebar').css('overflow-y', 'visible'); Was causing problems, if needed, reimplement
        $('#sort-sidebar').css('max-height', '');

    }
    if ($(window).width() <= 786 && $('#close-button').css('display') == 'none') {
        $('#sort-container').width('0');
        $('.sort-section').hide();
        $('.sort-section').css('opacity', '0');

    }
});

// Set Initial window layout.
if ($(window).width() > 786) {
    $('.sort-section').show();

}
if ($(window).width() <= 786) {
    $('.sort-section').hide();

}

function setupSearch(searchResultsArray, pageQuery) {
    // Create Sort Dropdown Event Listener
    $('#sort-main-title').click(function() {
        if (window.innerWidth < 787) {
            if ($('.sort-section').css('display') == 'none') {
                $('.sort-section').show(0).delay(10);
                $('#sort-sidebar').css('max-height', '500px');
                $('#sort-sidebar').css('overflow-y', 'scroll');
                $('.sort-section').css('opacity', '1');
            } else {
                $('.sort-section').delay(1000).hide(0);
                $('#sort-sidebar').css('overflow-y', 'hidden');
                $('#sort-sidebar').css('max-height', '58px');
                $('.sort-section').css('opacity', '0');
            }
        }
    });

    $('#author-show-more').click(function() {
        alert("Add Functionality");
    });

    $('#subject-show-more').click(function() {
        alert("Add Functionality");
    });

    $("#search-page-input").keydown(function(event) {
        if (event.keyCode === 13) {
            searchPageSearch();
        }
    });

    var queryFromURL = findURLValue(pageQuery, "query", true);

    $("#search-page-input").val(queryFromURL);

    if (searchResultsArray == null) {
        // If you are entering the page without a search completed
        if (queryFromURL == "") {
            browse();
            return;
        }
        search(queryFromURL).then((resultsArray) => {
            createSearchResultsPage(resultsArray);
        });
    } else {
        createSearchResultsPage(searchResultsArray);
    }
}

function searchPageSearch() {
    var searchQuery = $('#search-page-input').val();
    setURLValue("query", searchQuery);

    search(searchQuery).then((searchResultsArray) => {
        createSearchResultsPage(searchResultsArray);
    });
}

function browse() {
    changePageTitle("Browse", false);
    var browseResultsArray = [];
    if (bookDatabase && bookDatabase.length > 0 && timeLastSearched != null) {
        // At this point, we can assume that the book database has been loaded from a search, so just use that for browsing.
        var docs = bookDatabase.length - 1;
        if (bookDatabase[bookDatabase.length - 1].books.length < 25 && docs != 0) {
            docs--;
        }
        var rand = Math.floor(Math.random() * docs);
        if (!bookDatabase[rand]) {
            console.error("books " + rand + " does not exist in the local book database");
            return;
        }
        var values = [], count = 0;
        for (var i = 0; i < 20; i++) {
            var random = Math.floor(Math.random() * bookDatabase[rand].books.length);
            if (values.indexOf(random) > -1 || bookDatabase[rand].books[random].isDeleted || bookDatabase[rand].books[random].isHidden) {
                i--;
            } else {
                values.push(random);
                browseResultsArray.push(bookDatabase[rand].books[random]);
            }
            count++;
            if (count > 10000) {
                if (i > 0) {
                    console.error("no books available");
                    const p = document.createElement('p');
                    p.appendChild(document.createTextNode("Sorry, we were not able to process your query at this time. Please try again later."));
                    $('div#results-container')[0].appendChild(p);

                }
                createSearchResultsPage(browseResultsArray);
                return;
            }
        }
        createSearchResultsPage(browseResultsArray);
    } else {
        // No search has been performed on the page yet, so get it from the database.
        db.collection("books").where("order", ">=", 0).orderBy("order", "desc").limit(1).get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                if (!doc.exists) {
                    console.error("books document does not exist");
                    return;
                }
                var docs = doc.data().order;
                if (doc.data().books.length < 25 && docs != 0) {
                    docs--;
                }
                var rand = Math.floor(Math.random() * docs);
                rand = "0" + rand;
                if (rand.length == 2) rand = "0" + rand;
                db.collection("books").doc(rand).get().then((doc) => {
                    if (!doc.exists) {
                        console.error("books " + rand + " does not exist");
                        return;
                    }
                    var values = [], count = 0;
                    for (var i = 0; i < 20; i++) {
                        var random = Math.floor(Math.random() * doc.data().books.length);
                        if (values.indexOf(random) > -1 || doc.data().books[random].isDeleted || doc.data().books[random].isHidden) {
                            i--;
                        } else {
                            values.push(random);
                            browseResultsArray.push(doc.data().books[random]);
                        }
                        count++;
                        if (count > 10000) {
                            if (i > 0) {
                                console.error("no books available");
                                const p = document.createElement('p');
                                p.appendChild(document.createTextNode("Sorry, we were not able to process your query at this time. Please try again later."));
                                $('div#results-container')[0].appendChild(p);
    
                            }
                            createSearchResultsPage(browseResultsArray);
                            return;
                        }
                    }
                    createSearchResultsPage(browseResultsArray);
                });
            });
        });
    }
}

function createSearchResultsPage(searchResultsArray) {
    $('div#results-container').empty();
    if (searchResultsArray.length == 0) {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode("That search returned no results. Please try again."));
        $('div#results-container')[0].appendChild(p);
    }
    for (var i = 0; i < searchResultsArray.length; i++) {
        $('div#results-container')[0].appendChild(buildBookBox(searchResultsArray[i], "search", i + 1));
    }
    createFilterList(searchResultsArray);
}

var searchResultsAuthorsArray = [];
var searchResultsSubjectsArray = [];
function createFilterList(searchResultsArray) {
    // TODO: This function should also order each of the lists by occurances.
    searchResultsAuthorsArray = [];
    searchResultsSubjectsArray = [];
    $("#sort-author-list").empty();
    $("#sort-subject-list").empty();
    
    // Authors
    for (var i = 0; i < searchResultsArray.length; i++) {
        if (!searchResultsAuthorsArray.includes(searchResultsArray[i].authors[0]) && searchResultsArray[i].authors[0]) {
            searchResultsAuthorsArray.push(searchResultsArray[i].authors[0]);
        }
        if (!searchResultsAuthorsArray.includes(searchResultsArray[i].authors[1]) && searchResultsArray[i].authors[1]) {
            searchResultsAuthorsArray.push(searchResultsArray[i].authors[1]);
        }
    }
    for (var i = 0; i < searchResultsAuthorsArray.length; i++) {
        let authorArray = searchResultsAuthorsArray[i];
        const li = document.createElement("li");
        li.classList.add("sort-item");
        li.innerHTML = "<input type=\"checkbox\">" + authorArray.last + ", " + authorArray.first;
        if (i < 6) {
            $("#sort-author-list")[0].appendChild(li);
        } else if (i == 6) {
            const span = document.createElement("span");
            span.id = "author-show-more";
            span.innerHTML = "Show More..."
            $("#sort-author-list")[0].appendChild(span);
            $("#author-show-more").on("click", () => {
                $("#author-show-more").css("display", "none");
                for (var j = 6; j < searchResultsAuthorsArray.length; j++) {
                    let authorArray = searchResultsAuthorsArray[j];
                    const li = document.createElement("li");
                    li.classList.add("sort-item");
                    li.innerHTML = "<input type=\"checkbox\">" + authorArray.last + ", " + authorArray.first;
                    $("#sort-author-list")[0].appendChild(li);
                }
            });
        }
    }

    // Subjects
    for (var i = 0; i < searchResultsArray.length; i++) {
        for (var j = 0; j < searchResultsArray[i].subjects.length; j++) {
            if (!searchResultsSubjectsArray.includes(searchResultsArray[i].subjects[j]) && searchResultsArray[i].subjects[j]) {
                searchResultsSubjectsArray.push(searchResultsArray[i].subjects[j]);
            }
        }
    }
    for (var i = 0; i < searchResultsSubjectsArray.length; i++) {
        let subject = searchResultsSubjectsArray[i];
        const li = document.createElement("li");
        li.classList.add("sort-item");
        li.innerHTML = "<input type=\"checkbox\">" + subject;
        if (i < 6) {
            $("#sort-subject-list")[0].appendChild(li);
        } else if (i == 6) {
            const span = document.createElement("span");
            span.id = "subject-show-more";
            span.innerHTML = "Show More..."
            $("#sort-subject-list")[0].appendChild(span);
            $("#subject-show-more").on("click", () => {
                $("#subject-show-more").css("display", "none");
                for (var j = 6; j < searchResultsSubjectsArray.length; j++) {
                    let subject = searchResultsSubjectsArray[j];
                    const li = document.createElement("li");
                    li.classList.add("sort-item");
                    li.innerHTML = "<input type=\"checkbox\">" + subject;
                    $("#sort-subject-list")[0].appendChild(li);
                }
            });
        }
    }
}

function setupResults(pageQuery) {
    var barcodeNumber = parseInt(findURLValue(pageQuery, "id"));
    if (!barcodeNumber) {
        alert("Error: A valid barcode was not provided.");
        goToPage("");
        return;
    }
    
    getBookFromBarcode(barcodeNumber).then((bookObject) => {
        if (!bookObject || bookObject.isDeleted || bookObject.isHidden) {
            alert("Error: No information could be found for that book.");
            goToPage("");
            return;
        }
        changePageTitle(bookObject.title);

        $("#result-page-image").attr("src", bookObject.coverImageLink);
    
        $("#result-page-barcode-number").html(barcodeNumber);
        if (!bookObject.canBeCheckedOut) {
            $("#checkout-button").hide();
            $("#result-page-image").after("Unfortuantely, this book cannot be checked out.");
        } else {
            $("#checkout-button").show();
            $("#checkout-button").attr("onclick", "javascript:checkout(" + barcodeNumber + ");");
        }
        $("#result-page-isbn-number").html("ISBN 10: " + bookObject.isbn10 + "<br>ISBN 13: " + bookObject.isbn13);
        if (bookObject.isbn10 == "" && bookObject.isbn13 == "") {
            $("#result-page-isbn-number").html("None");
        }
        var callNumberAnswer = "";
        if (bookObject.audience[0] == true) {
            callNumberAnswer += "J"
        } else if (bookObject.audience[1] == true) {
            callNumberAnswer += "Y";
        } else if (bookObject.canBeCheckedOut == false) {
            callNumberAnswer += "REF<br>"
        }
        callNumberAnswer += bookObject.ddc;
        callNumberAnswer += "<br>" + bookObject.authors[0].last.toUpperCase().substring(0, 3);
        $("#result-page-call-number").html(callNumberAnswer);
        var mediumAnswer = "";
        if (bookObject.medium == "paperback") {
            mediumAnswer = "Paperback";
        } else if (bookObject.medium == "hardcover") {
            mediumAnswer = "Hardcover";
        } else if (bookObject.medium == "av") {
            mediumAnswer = "AV";
        } else {
            console.warn("There is a case that is not covered for: " + bookObject.medium);
        }
        $("#result-page-medium").html(mediumAnswer);
        var audienceAnswer = "";
        for (i = 0; i < 4; i++) {
            var temp = bookObject.audience[i];
            if (temp) {
                if (i == 0) {
                    audienceAnswer += "Children, ";
                } else if (i == 1) {
                    audienceAnswer += "Youth, ";
                } else if (i == 2) {
                    audienceAnswer += "Adult, ";
                } else if (i == 3) {
                    audienceAnswer += "None, ";
                }
            }
        }
        audienceAnswer = audienceAnswer.substring(0, audienceAnswer.lastIndexOf(","));
        $("#result-page-audience").html(audienceAnswer);
        var publishersAnswer = "";
        bookObject.publishers.forEach((item) => {
            publishersAnswer += (item + ", ");
        });
        publishersAnswer = publishersAnswer.substring(0, publishersAnswer.lastIndexOf(","));
        $("#result-page-publisher").html(publishersAnswer);
        var d = bookObject.publishDate.toDate();
        if (d.getMonth() != 0 && d.getDate() != 1) {
            $("#result-page-publish-date").html(d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear());
        } else if (d.getMonth() != 0) {
            var month;
            switch (d.getMonth()) {
                case 0:
                    month = "Jan";
                    break;
                case 1:
                    month = "Feb";
                    break;
                case 2:
                    month = "Mar";
                    break;
                case 3:
                    month = "Apr";
                    break;
                case 4:
                    month = "May";
                    break;
                case 5:
                    month = "Jun";
                    break;
                case 6:
                    month = "Jul";
                    break;
                case 7:
                    month = "Aug";
                    break;
                case 8:
                    month = "Sep";
                    break;
                case 9:
                    month = "Oct";
                    break;
                case 10:
                    month = "Nov";
                    break;
                case 11:
                    month = "Dec";
                    break;
            
                default:
                    console.error("The month could not be detected");
                    month = "";
                    break;
            }
            $("#result-page-publish-date").html(month + ", " + d.getFullYear());
        } else {
            $("#result-page-publish-date").html(d.getFullYear());
        }
        if (bookObject.numberOfPages > 0) {
            $("#result-page-pages").html(bookObject.numberOfPages);
        } else {
            $("#result-page-pages").html("Unnumbered");
        }
    
    
        $("#result-page-title").html(bookObject.title);
        $("#result-page-subtitle").html(bookObject.subtitle);
        if (bookObject.subtitle == null || bookObject.subtitle.length < 1) {
            $("#result-page-subtitle-header").hide();
            $("#result-page-subtitle").hide();
        }
        if (bookObject.authors.length > 1) {
            $("#result-page-author-header").html("Authors");
            var authorAnswer = "";
            bookObject.authors.forEach((item) => {
                authorAnswer += item.last + ", " + item.first + "<br>";
            });
            $("#result-page-author").html(authorAnswer);
        } else {
            $("#result-page-author").html(bookObject.authors[0].last + ", " + bookObject.authors[0].first);
        }
        if (bookObject.illustrators.length > 0) {
            var illustratorAnswer = "";
            bookObject.illustrators.forEach((item) => {
                illustratorAnswer += item.last + ", " + item.first + "<br>";
            });
            $("#result-page-illustrator").html(illustratorAnswer);
            if (bookObject.illustrators.length > 1) {
                $("#result-page-illustrator-header").html("Illustrators");
            }
        } else {
            $("#result-page-illustrator-header").hide();
            $("#result-page-illustrator").hide();
        }
        if (bookObject.subjects.length == 0) {
            $("#result-page-subjects").hide();
            $("#result-page-subjects-header").hide();
        } else if (bookObject.subjects.length == 1) {
            $("#result-page-subjects-header").html("Subject");
        }
        var subjectsAnswer = "";
        for (var i = 0; i < bookObject.subjects.length; i++) {
            subjectsAnswer += bookObject.subjects[i];
            if (i != bookObject.subjects.length - 1) {
                subjectsAnswer += "<br>";
            }
        }
        $("#result-page-subjects").html(subjectsAnswer);
        $("#result-page-description").html(bookObject.description);
    }).catch((barcodeNumber) => {
        alert("Error: No information could be found for that book.");
        alert(barcodeNumber + " is not a valid barcode number.");
        goToPage("");
        return;
    });
}

function checkout(barcodeNumber) {
    if (isNaN(barcodeNumber) || barcodeNumber.toString().indexOf("11711") < 0) {
        alert("There was an error checking out this book.");
        console.log("The barcode number could not be identified.");
        return;
    }
    $("#checkout-inner-popup-box").html("<p>You are checking out this book as: <b><span id='checkout-name'></span></b>.<br>If this is not you, please click cancel and log out.</p>");
    $("#checkout-popup").show();
    var user = firebase.auth().currentUser;
    $("#checkout-name").html(user.email);
    $("#checkout-next-button").show();
}

function cancelCheckout() {
    $("#checkout-popup").hide();
}

function scanCheckout() {
    var user = firebase.auth().currentUser;
    $("#checkout-next-button").hide();
    $("#checkout-inner-popup-box").html("<p>Please scan the barcode on the book now.</p>");
    $("#checkout-book-barcode").blur(() => {$('#checkout-book-barcode').focus()});
    $("#checkout-book-barcode").focus();
    var barcodeNumber = $("#result-page-barcode-number").html();
    $("#checkout-book-barcode").off("keydown");
    $("#checkout-book-barcode").keydown(function(event) {
        if (event.keyCode === 13) {
            $("#checkout-book-barcode").off("blur");
            if ($("#checkout-book-barcode").val() == barcodeNumber) {
                $("#checkout-inner-popup-box").html("<p>Please scan the barcode on the checkout table now.</p>");
                $("#checkout-security-barcode").blur(() => {$('#checkout-security-barcode').focus()});
                $("#checkout-security-barcode").focus();
                $("#checkout-security-barcode").off("keydown");
                $("#checkout-security-barcode").keydown(function(event) {
                    if (event.keyCode === 13) {
                        $("#checkout-security-barcode").off("blur");
                        // TODO: Change to something else
                        if ($("#checkout-security-barcode").val() != "") {
                            // At this point, they must have scanned both, so we check it out to them.
                            var bookPath = db.collection("books");
                            var bookNumber = barcodeNumber - 1171100000;
                            var bookDocument = Math.floor(bookNumber / 100);
                            if (bookDocument >= 100) {
                                bookDocument = "" + bookDocument;
                            } else if (bookDocument >= 10) {
                                bookDocument = "0" + bookDocument;
                            } else {
                                bookDocument = "00" + bookDocument;
                            }
                            bookNumber = bookNumber % 100;

                            var d = new Date(2020);
                            db.collection("users").where("lastCheckoutTime", ">", d).where("checkouts", "array-contains", barcodeNumber).orderBy("lastCheckoutTime").limit(5).get().then((querySnapshot) => {
                                querySnapshot.forEach((doc) => {
                                    doc.data().checkouts.forEach((checkoutObject) => {
                                        if (checkoutObject.returnTime != null) {
                                            alert("The book is already checked out to someone else. It must be returned first. Please put the book in the return area.");
                                            return;
                                        }
                                    });
                                });
                            });
                            db.runTransaction((transaction) => {
                                return transaction.get(bookPath.doc(bookDocument)).then((doc) => {
                                    if (!doc.exists) {
                                        alert("There was a problem with checking out that book.");
                                        return;
                                    }

                                    var bookObject = doc.data().books[bookNumber];
                                    if (bookObject.canBeCheckedOut == false) {
                                        alert("We're sorry, but this is a reference book, and it may not be checked out.");
                                        return;
                                    }
                                    var currentTime = Date.now();
                                    // TODO: Rethink how this is all stored. Sub collection? Root collection?
                                    transaction.update(db.collection("users").doc(user.id), {
                                        checkouts: firebase.firestore.FieldValue.arrayUnion({
                                            barcodeNumber: barcodeNumber,
                                            outTime: currentTime,
                                            inTime: null,
                                            title: bookObject.title
                                        })
                                    });
                                });
                            }).then(() => {
                                alert("This book has been checked out to you successfully.");
                                goToPage("");
                            });
                        }
                    }
                });
            } else {
                alert("This is not the right book. Please view the correct book's page before checking it out.");
                cancelCheckout();
            }
        }
    });
}

function applySearchFilters() {
    var filters = [], items = [], results = [];
    for (var i = 0; i < $(".sort-section").length; i++) {
        filters.push($(".sort-section")[i].children[0].innerHTML);
        items.push([]);
        for (var j = 0; j < $(".sort-section")[i].children[1].children.length; j++) {
            if ($(".sort-section")[i].children[1].children[j].tagName == "LI") {
                items[items.length - 1].push($(".sort-section")[i].children[1].children[j].children[0].checked);
            }
        }
        if (items[items.length - 1].every( (val, q, arr) => val === arr[0] )) {
            filters.pop();
            items.pop();
        }
    }
    for (var i = 0, passesFilters = true; i < searchCache.length && passesFilters; i++) {
        for (var j = 0; j < filters.length; j++) {
            var passesFilter = false;
            for (var k = 0; k < items[j].length; k++) {
                if (filters[j] == "Audience") {
                    if (items[j][k] && searchCache[i].audience[k]) {
                        passesFilter = true;
                    }
                } else if (filters[j] == "Medium") {
                    if (searchCache[i].medium == items[j][k]) {
                        // Justin, finish this
                    }
                }
            }
            if (!passesFilter)
                passesFilters = false;
        }
        if (passesFilters) {
            results.push(searchCache[i]);
        }
    }
    createSearchResultsPage(results);
}

console.log("search.js Loaded!");
