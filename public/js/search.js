// Make content Responsive
import { changePageTitle, goToPage } from './ajax';
import { buildBookBox, findURLValue, getBookFromBarcode, search, setURLValue } from './common';
import { analytics, auth, bookDatabase, db, searchCache, setSearchCache, timeLastSearched } from './globals';
import { arrayUnion, collection, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, where } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';

// Doesn't have to be setup because the window element doesn't change.
$(window).on("resize", () => {
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

export function setupSearch(searchResultsArray, pageQuery) {
    // Create Sort Dropdown Event Listener
    $('#sort-main-title').on("click", () => {
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

    $('#author-show-more').on("click", () => {
        alert("Add Functionality");
    });

    $('#subject-show-more').on("click", () => {
        alert("Add Functionality");
    });

    $("#search-page-input").on("keydown", (event) => {
        if (event.key === "Enter") {
            searchPageSearch();
        }
    });

    $("#search-page-search-button").on("click", () => {
        searchPageSearch();
    });

    var queryFromURL = findURLValue(pageQuery, "query", true);

    $("#apply-filters-button").on("click", () => {
        applySearchFilters(queryFromURL);
    });

    $("#search-page-input").val(queryFromURL);

    if (searchResultsArray == null) {
        // If you are entering the page without a search completed
        if (queryFromURL == "") {
            browse();
        } else {
            search(queryFromURL).then((resultsArray) => {
                createSearchResultsPage(resultsArray);
            });
        }
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

function browse(browseResultsArray = [], docsUsed = [], page = 1) {
    return new Promise((resolve, reject) => {
        changePageTitle("Browse", false);
        if (bookDatabase && bookDatabase.length > 0 && timeLastSearched != null) {
            // At this point, we can assume that the book database has been loaded from a search, so just use that for browsing.
            var docs = bookDatabase.length;
            if (docsUsed.length == docs) {
                resolve(true); // lets createSearchResultsPage know that the end is nigh
                return;
            }
            var rand = Math.floor(Math.random() * docs);
            while (docsUsed.includes(rand)) rand = Math.floor(Math.random() * docs);
            docsUsed.push(rand);
            if (!bookDatabase[rand]) {
                console.error("books " + rand + " does not exist in the local book database");
                reject();
                return;
            }
            var values = [], invalidBookIndices = [];
            while (values.length < bookDatabase[rand].books.length - invalidBookIndices.length) {
                var random = Math.floor(Math.random() * bookDatabase[rand].books.length);
                if (values.indexOf(random) > -1) continue;
                if (bookDatabase[rand].books[random].isDeleted || bookDatabase[rand].books[random].isHidden) {
                    if (!invalidBookIndices.includes(random)) {
                        invalidBookIndices.push(random);
                    }
                } else {
                    values.push(random);
                    browseResultsArray.push(bookDatabase[rand].books[random]);
                }
            }
            setSearchCache(browseResultsArray);
            createSearchResultsPage(browseResultsArray, page, undefined, undefined, true, docsUsed);
        } else {
            // No search has been performed on the page yet, so get it from the database.
            getDocs(query(collection(db, "books"), where("order", ">=", 0), orderBy("order", "desc"), limit(1))).then((querySnapshot) => {
                querySnapshot.forEach((docSnap) => {
                    if (!docSnap.exists()) {
                        console.error("books document does not exist");
                        reject();
                        return;
                    }
                    var docs = docSnap.data().order + 1;
                    if (docsUsed.length == docs) {
                        resolve(true); // lets createSearchResultsPage know that the end is nigh
                        return;
                    }
                    var rand = Math.floor(Math.random() * docs);
                    while (docsUsed.includes(rand)) rand = Math.floor(Math.random() * docs);
                    docsUsed.push(rand);
                    rand = "0" + rand;
                    if (rand.length == 2) rand = "0" + rand;
                    getDoc(doc(db, "books", rand)).then((docSnap) => {
                        if (!docSnap.exists()) {
                            console.error("books " + rand + " does not exist");
                            reject();
                            return;
                        }
                        var values = [], invalidBookIndices = [], data = docSnap.data();
                        while (values.length < data.books.length - invalidBookIndices.length) {
                            var random = Math.floor(Math.random() * data.books.length);
                            if (values.includes(random)) continue;
                            if (data.books[random].isDeleted || data.books[random].isHidden) {
                                if (!invalidBookIndices.includes(random)) {
                                    invalidBookIndices.push(random);
                                }
                            } else {
                                values.push(random);
                                browseResultsArray.push(data.books[random]);
                            }
                        }
                        setSearchCache(browseResultsArray);
                        createSearchResultsPage(browseResultsArray, page, undefined, undefined, true, docsUsed);
                    });
                });
            });
        }
    });
}

function createSearchResultsPage(searchResultsArray, page = 1, filters = [], items = [[]], isBrowse = false, docsUsed = null) {
    $(document).scrollTop(0);
    if (isBrowse && (page + 2) * 20 > searchResultsArray.length) {
        browse(searchResultsArray, docsUsed, page).then((allDocsUsed) => {
            if (allDocsUsed) {
                fillSearchResultsPage(searchResultsArray, page, filters, items, false);
            } else {
                return;
            }
        });
    } else {
        fillSearchResultsPage(searchResultsArray, page, filters, items, isBrowse, docsUsed);
    }
}

function fillSearchResultsPage(searchResultsArray, page = 1, filters = [], items = [[]], isBrowse = false, docsUsed = null) {
    $('div#search-results-container').empty();
    if (searchResultsArray.length == 0 || (page - 1) * 20 >= searchResultsArray.length) {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode("That search returned no results. Please try again."));
        $('div#search-results-container')?.[0].appendChild(p);
    }
    for (let i = (page - 1) * 20; i < Math.min(page * 20, searchResultsArray.length); i++) {
        $('div#search-results-container')?.[0]?.appendChild(buildBookBox(searchResultsArray[i], "search", i + 1));
    }
    createFilterList(searchResultsArray, filters, items);

    $("#paginator").empty();
    if (searchResultsArray.length < 21) {
        // there is only one page, so don't bother displaying the paginator
        $("#paginator").hide();
        return;
    }
    if (page > 1) {
        const prev = document.createElement('a');
        prev.innerHTML = "< Previous Page";
        prev.onclick = function() {
            createSearchResultsPage(searchResultsArray, page - 1, undefined, undefined, isBrowse, docsUsed);
        };
        $("#paginator")[0].appendChild(prev);
    }
    for (let p = page - 2; p <= page + 2; p++) {
        if (p < 1 || (p - 1) * 20 >= searchResultsArray.length && !isBrowse) continue;
        if (p == page) {
            const span = document.createElement('span');
            span.innerHTML = "<b>" + p + "</b>";
            $("#paginator")[0].appendChild(span);
            continue;
        }
        const a = document.createElement('a');
        a.innerHTML = p;
        a.onclick = function() {
            createSearchResultsPage(searchResultsArray, p, undefined, undefined, isBrowse, docsUsed);
        };
        $("#paginator")[0].appendChild(a);
    }
    if (page * 20 < searchResultsArray.length) {
        const next = document.createElement('a');
        next.innerHTML = "Next Page >";
        next.onclick = function() {
            createSearchResultsPage(searchResultsArray, page + 1, undefined, undefined, isBrowse, docsUsed);
        };
        $("#paginator")[0].appendChild(next);
    }
}

var searchResultsAuthorsArray = [];
var searchResultsSubjectsArray = [];
function createFilterList(searchResultsArray, filters = [], items = [[]]) {
    // TODO: This function should also order each of the lists by occurances.
    searchResultsAuthorsArray = [];
    searchResultsSubjectsArray = [];
    $("#sort-author-list").empty();
    $("#sort-subject-list").empty();

    // Authors
    for (let i = 0; i < searchResultsArray.length; i++) {
        for (let j = 0; j < 2; j++) {
            if (searchResultsArray[i].authors[j]) {
                let authorString = searchResultsArray[i].authors[j]?.last + ", " + searchResultsArray[i].authors[j]?.first;
                if (!searchResultsAuthorsArray.includes(authorString) && authorString != "undefined, undefined") {
                    searchResultsAuthorsArray.push(authorString);
                }
            }
        }
    }
    let authorIndex = filters.indexOf("Author"), checkedCount = 0, offset = 0;
    if (authorIndex != -1) {
        for (let i = 0; i < items[authorIndex].length; i++) {
            let authorString = items[authorIndex][i];
            const li = document.createElement("li");
            li.classList.add("sort-item");
            li.innerHTML = "<input type=\"checkbox\"><span>" + authorString + "</span";
            li.children[0].checked = true;
            $("#sort-author-list")[0].appendChild(li);
            checkedCount++;
        }
    }
    let maxAuthors = Math.max(6, checkedCount);
    for (let i = checkedCount; i < searchResultsAuthorsArray.length; i++) {
        let authorString = searchResultsAuthorsArray[i - checkedCount + offset], alreadyExists = false;
        for (let j = 0; j < checkedCount; j++) {
            if ($("#sort-author-list")[0].children[j].children[1].innerHTML == authorString) {
                i--;
                offset++;
                alreadyExists = true;
            }
        }
        if (alreadyExists) continue;
        const li = document.createElement("li");
        li.classList.add("sort-item");
        li.innerHTML = "<input type=\"checkbox\"><span>" + authorString + "</span";
        if (i < maxAuthors) {
            $("#sort-author-list")[0]?.appendChild(li);
        } else if (i == maxAuthors) {
            const span = document.createElement("span");
            span.id = "author-show-more";
            span.innerHTML = "Show More...";
            $("#sort-author-list")[0].appendChild(span);
            $("#author-show-more").on("click", () => {
                $("#author-show-more").css("display", "none");
                for (let j = maxAuthors; j < searchResultsAuthorsArray.length; j++) {
                    let authorString = searchResultsAuthorsArray[j - checkedCount + offset], alreadyExists = false;
                    for (let k = 0; k < checkedCount; k++) {
                        if ($("#sort-author-list")[0].children[k].children[j].innerHTML == authorString) {
                            i--;
                            offset++;
                            alreadyExists = true;
                        }
                    }
                    if (alreadyExists) continue;
                    const li = document.createElement("li");
                    li.classList.add("sort-item");
                    li.innerHTML = "<input type=\"checkbox\"><span>" + authorString + "</span>";
                    $("#sort-author-list")[0].appendChild(li);
                }
            });
        }
    }

    // Subjects
    for (let i = 0; i < searchResultsArray.length; i++) {
        for (let j = 0; j < searchResultsArray[i].subjects.length; j++) {
            if (!searchResultsSubjectsArray.includes(searchResultsArray[i].subjects[j]) && searchResultsArray[i].subjects[j]) {
                searchResultsSubjectsArray.push(searchResultsArray[i].subjects[j]);
            }
        }
    }
    let subjectIndex = filters.indexOf("Subject");
    checkedCount = 0, offset = 0;
    if (subjectIndex != -1) {
        for (let i = 0; i < items[subjectIndex].length; i++) {
            let subject = items[subjectIndex][i];
            const li = document.createElement("li");
            li.classList.add("sort-item");
            li.innerHTML = "<input type=\"checkbox\"><span>" + subject + "</span";
            li.children[0].checked = true;
            $("#sort-subject-list")[0].appendChild(li);
            checkedCount++;
        }
    }
    let maxSubjects = Math.max(6, checkedCount);
    for (let i = checkedCount; i < searchResultsSubjectsArray.length; i++) {
        let subject = searchResultsSubjectsArray[i - checkedCount + offset], alreadyExists = false;
        for (let j = 0; j < checkedCount; j++) {
            if ($("#sort-subject-list")[0].children[j].children[1].innerHTML == subject) {
                i--;
                offset++;
                alreadyExists = true;
            }
        }
        if (alreadyExists) continue;
        const li = document.createElement("li");
        li.classList.add("sort-item");
        li.innerHTML = "<input type=\"checkbox\"><span>" + subject + "</span>";
        if (i < maxSubjects) {
            $("#sort-subject-list")[0].appendChild(li);
        } else if (i == maxSubjects) {
            const span = document.createElement("span");
            span.id = "subject-show-more";
            span.innerHTML = "Show More...";
            $("#sort-subject-list")[0].appendChild(span);
            $("#subject-show-more").on("click", () => {
                $("#subject-show-more").css("display", "none");
                for (let j = maxSubjects; j < searchResultsSubjectsArray.length; j++) {
                    let subject = searchResultsSubjectsArray[j - checkedCount + offset], alreadyExists = false;
                    for (let k = 0; k < checkedCount; k++) {
                        if ($("#sort-subject-list")[0].children[k].children[1].innerHTML == subject) {
                            j--;
                            offset++;
                            alreadyExists = true;
                        }
                    }
                    if (alreadyExists) continue;
                    const li = document.createElement("li");
                    li.classList.add("sort-item");
                    li.innerHTML = "<input type=\"checkbox\"><span>" + subject + "</span>";
                    $("#sort-subject-list")[0].appendChild(li);
                }
            });
        }
    }
}

export function setupResultPage(pageQuery) {
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

        if (bookObject.medium == "av") {
            $("#result-page-image").attr("src", "../img/av-image.jpg");
        } else {
            $("#result-page-image").attr("src", bookObject.coverImageLink);
        }

        $("#result-page-barcode-number").html(barcodeNumber);
        if (!bookObject.canBeCheckedOut) {
            $("#checkout-button").hide();
            $("#result-page-image").after("Unfortuantely, this book cannot be checked out.");
        } else {
            $("#checkout-button").show();
            $("#checkout-button").on("click", () => {
                checkout(barcodeNumber);
            });
        }
        $("#result-page-isbn-number").html("ISBN 10: " + bookObject.isbn10 + "<br>ISBN 13: " + bookObject.isbn13);
        if (bookObject.isbn10 == "" && bookObject.isbn13 == "") {
            $("#result-page-isbn-number").html("None");
        }
        var callNumberAnswer = "";
        if (bookObject.audience[0] == true) {
            callNumberAnswer += "J";
        } else if (bookObject.audience[1] == true) {
            callNumberAnswer += "Y";
        } else if (bookObject.canBeCheckedOut == false) {
            callNumberAnswer += "REF<br>";
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
        for (let i = 0; i < 4; i++) {
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
        if (publishersAnswer == "") publishersAnswer = "None";
        $("#result-page-publisher").html(publishersAnswer);
        if (bookObject.publishDate) {
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
        } else {
            $("#result-page-publish-date").html("None");
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
            if (bookObject.authors[0].first == "" && bookObject.authors[0].last == "") {
                $("#result-page-author").html("None");
            } else {
                $("#result-page-author").html(bookObject.authors[0].last + ", " + bookObject.authors[0].first);
            }
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
        for (let i = 0; i < bookObject.subjects.length; i++) {
            subjectsAnswer += bookObject.subjects[i];
            if (i != bookObject.subjects.length - 1) {
                subjectsAnswer += "<br>";
            }
        }
        $("#result-page-subjects").html(subjectsAnswer);
        $("#result-page-description").html(bookObject.description);

        logEvent(analytics, "select_content", {
            content_type: "book_result",
            item_id: barcodeNumber
        });
    }).catch((barcodeNumber) => {
        alert("Error: No information could be found for that book. Could not find book with barcode number: " + barcodeNumber);
        goToPage("");
        return;
    });

    // Create Event Listeners

    $("#checkout-button").on("click", () => {
        checkout();
    });

    $("#checkout-next-button").on("click", () => {
        scanCheckout();
    });

    $("#checkout-cancel-button").on("click", () => {
        cancelCheckout();
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
    $("#checkout-name").html(auth.currentUser.email);
    $("#checkout-next-button").show();
}

function cancelCheckout() {
    $("#checkout-popup").hide();
}

function scanCheckout() {
    $("#checkout-next-button").hide();
    $("#checkout-inner-popup-box").html("<p>Please scan the barcode on the book now.</p>");
    $("#checkout-book-barcode").on("blur", () => { $('#checkout-book-barcode').trigger("focus"); });
    $("#checkout-book-barcode").trigger("focus");
    var barcodeNumber = $("#result-page-barcode-number").html();
    $("#checkout-book-barcode").off("keydown");
    $("#checkout-book-barcode").on("keydown", (event) => {
        if (event.key === "Enter") {
            $("#checkout-book-barcode").off("blur");
            if ($("#checkout-book-barcode").val() == barcodeNumber) {
                $("#checkout-inner-popup-box").html("<p>Please scan the barcode on the checkout table now.</p>");
                $("#checkout-book-barcode").on("blur", () => { $('#checkout-book-barcode').trigger("focus"); });
                $("#checkout-security-barcode").trigger("focus");
                $("#checkout-security-barcode").off("keydown");
                $("#checkout-security-barcode").on("keydown", (event) => {
                    if (event.key === "Enter") {
                        $("#checkout-security-barcode").off("blur");
                        // TODO: Change to something else
                        if ($("#checkout-security-barcode").val() != "") {
                            // At this point, they must have scanned both, so we check it out to them.
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
                            getDocs(query(collection(db, "users"), where("lastCheckoutTime", ">", d),
                                where("checkouts", "array-contains", barcodeNumber),
                                orderBy("lastCheckoutTime"), limit(5))).then((querySnapshot) => {
                                    querySnapshot.forEach((docSnap) => {
                                        docSnap.data().checkouts.forEach((checkoutObject) => {
                                            if (checkoutObject.returnTime != null) {
                                                alert("The book is already checked out to someone else. It must be returned first. Please put the book in the return area.");
                                                return;
                                            }
                                        });
                                    });
                                });
                            runTransaction(db, (transaction) => {
                                return transaction.get(doc("books", bookDocument)).then((docSnap) => {
                                    if (!docSnap.exists()) {
                                        alert("There was a problem with checking out that book.");
                                        return;
                                    }

                                    var bookObject = docSnap.data().books[bookNumber];
                                    if (bookObject.canBeCheckedOut == false) {
                                        alert("We're sorry, but this is a reference book, and it may not be checked out.");
                                        return;
                                    }
                                    var currentTime = Date.now();
                                    // TODO: Rethink how this is all stored. Sub collection? Root collection?
                                    transaction.update(doc(db, "users", auth.currentUser.uid), {
                                        checkouts: arrayUnion({
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

function applySearchFilters(queryFromURL) {
    var filters = [], items = [], results = [];
    for (let i = 0; i < $(".sort-section").length; i++) {
        filters.push($(".sort-section")[i].children[0].innerHTML);
        items.push([]);
        for (let j = 0; j < $(".sort-section")[i].children[1].children.length; j++) {
            if ($(".sort-section")[i].children[1].children[j].tagName == "LI" &&
                $(".sort-section")[i].children[1].children[j].children[0].checked) {
                items[items.length - 1].push($(".sort-section")[i].children[1].children[j].children[1].innerHTML);
            }
        }
        if (items[items.length - 1].length == 0) {
            filters.pop();
            items.pop();
        }
    }
    if (queryFromURL == "") {
        search("").then(() => {
            searchWithFilters(filters, items, results);
        });
    } else {
        searchWithFilters(filters, items, results);
    }
}

function searchWithFilters(filters, items, results) {
    for (let i = 0; i < searchCache.length; i++) {
        let passesAllFilters = true;
        for (let j = 0; j < filters.length && passesAllFilters; j++) {
            var passesFilter = false;
            for (let k = 0; k < items[j].length; k++) {
                if (filters[j] == "Author") {
                    if (passesFilter ||
                        items[j][k] == searchCache[i].authors[0].last + ", " + searchCache[i].authors[0].first
                        || (searchCache[i].authors[1] &&
                            items[j][k] == searchCache[i].authors[1].last + ", " + searchCache[i].authors[1].first)) {
                        passesFilter = true;
                    }
                } else if (filters[j] == "Medium") {
                    if (passesFilter || items[j][k].toUpperCase() == searchCache[i].medium.toUpperCase()) {
                        passesFilter = true;
                    }
                } else if (filters[j] == "Audience") {
                    if (passesFilter ||
                        items[j][k] == "Children" && searchCache[i].audience[0] ||
                        items[j][k] == "Youth" && searchCache[i].audience[1] ||
                        items[j][k] == "Adult" && searchCache[i].audience[2]) {
                        passesFilter = true;
                    }
                } else if (filters[j] == "Subject") {
                    if (passesFilter || searchCache[i].subjects.includes(items[j][k])) {
                        passesFilter = true;
                    }
                } else if (filters[j] == "Type") {
                    if (passesFilter ||
                        items[j][k] == "Non-fiction" && searchCache[i].ddc == "FIC" ||
                        items[j][k] == "Fiction" && searchCache[i].ddc != "FIC") {
                        passesFilter = true;
                    }
                }
            }
            if (!passesFilter)
                passesAllFilters = false;
        }
        if (passesAllFilters) {
            results.push(searchCache[i]);
        }
    }

    createSearchResultsPage(results, 1, filters, items);
}

console.log("search.js Loaded!");
