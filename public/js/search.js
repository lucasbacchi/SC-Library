// Make content Responsive
import { changePageTitle, goToPage } from './ajax';
import { addBarcodeSpacing, buildBookBox, findURLValue, getBookFromBarcode, openModal, search, setURLValue, updateBookDatabase } from './common';
import { analytics, auth, Book, bookDatabase, db, historyManager, searchCache, setSearchCache, timeLastSearched } from './globals';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
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

/**
 * @description Sets up the search page event listeners then starts the process of displaying books.
 * @param {String} pageQuery The page query from the URL.
 */
export function setupSearch(pageQuery) {
    // Set Initial window layout.
    if ($(window).width() > 786) {
        $('.sort-section').show();
    }
    if ($(window).width() <= 786) {
        $('.sort-section').hide();
    }

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

    $("#search-page-search-input").on("keydown", (event) => {
        if (event.key === "Enter") {
            searchPageSearch();
        }
    });

    $("#search-page-search-button").on("click", () => {
        searchPageSearch();
    });

    let queryFromURL = findURLValue(pageQuery, "query", true);

    $("#apply-filters-button").on("click", () => {
        queryFromURL = findURLValue(window.location.search, "query", true);
        applySearchFilters(queryFromURL);
    });

    $("#search-page-input").val(queryFromURL);

    // If you are entering the page without a search completed
    if (queryFromURL == "") {
        browse();
    } else {
        search(queryFromURL).then((resultsArray) => {
            createSearchResultsPage(resultsArray);
        });
    }
}

/**
 * @description Handles new searches from the search page.
 */
function searchPageSearch() {
    let searchQuery = $('#search-page-search-input').val();
    setURLValue("query", searchQuery);

    search(searchQuery).then((searchResultsArray) => {
        createSearchResultsPage(searchResultsArray);
    });
}

/**
 * @description Creates the browse page of randomly selected books.
 * @param {Book[]} browseResultsArray The array of books to list on the browse page.
 * @param {Number[]} docsUsed An array of the indices of the book documents from the database that have already been used.
 * @param {Number} page The current results page.
 */
function browse(browseResultsArray = [], docsUsed = [], page = 1) {
    return new Promise((resolve, reject) => {
        changePageTitle("Browse", false);
        if (bookDatabase && bookDatabase.length > 0 && timeLastSearched != null) {
            // At this point, we can assume that the book database has been loaded from a search, so just use that for browsing.
            let docs = bookDatabase.length;
            if (docsUsed.length == docs) {
                resolve(true); // lets createSearchResultsPage know that the end is nigh
                return;
            }
            let rand = Math.floor(Math.random() * docs);
            while (docsUsed.includes(rand)) rand = Math.floor(Math.random() * docs);
            docsUsed.push(rand);
            if (!bookDatabase[rand]) {
                console.error("books " + rand + " does not exist in the local book database");
                reject();
                return;
            }
            let values = [], invalidBookIndices = [];
            while (values.length < bookDatabase[rand].books.length - invalidBookIndices.length) {
                let random = Math.floor(Math.random() * bookDatabase[rand].books.length);
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
                    let docs = docSnap.data().order + 1;
                    if (docsUsed.length == docs) {
                        resolve(true); // lets createSearchResultsPage know that the end is nigh
                        return;
                    }
                    let rand = Math.floor(Math.random() * docs);
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
                        let values = [], invalidBookIndices = [], data = docSnap.data();
                        while (values.length < data.books.length - invalidBookIndices.length) {
                            let random = Math.floor(Math.random() * data.books.length);
                            if (values.includes(random)) continue;
                            if (data.books[random].isDeleted || data.books[random].isHidden) {
                                if (!invalidBookIndices.includes(random)) {
                                    invalidBookIndices.push(random);
                                }
                            } else {
                                values.push(random);
                                browseResultsArray.push(Book.createFromObject(data.books[random]));
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

/**
 * @description Creates a search results page. Most information is passed into fillSearchResultsPage().
 * @param {Book[]} searchResultsArray The array of books to list on the search results page.
 * @param {Number} page The page number of the results page.
 * @param {String[]} filters The catagories you can filter by.
 * @param {String[][]} items The selected items in each filter catagory.
 * @param {Boolean} isBrowse A boolean representing if the user is browsing or searching.
 * @param {Number[]} docsUsed An array of the indices of the book documents from the database that have already been used.
 */
function createSearchResultsPage(searchResultsArray, page = 1, filters = [], items = [[]], isBrowse = false, docsUsed = null) {
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
    setTimeout(() => {
        $(document).scrollTop(0);
    }, 100);
}

/**
 * @description This function does the actual work of creating the search results page and evaluating filters.
 * @param {Book[]} searchResultsArray The array of books to list on the search results page.
 * @param {Number} page The page number of the results page.
 * @param {String[]} filters The catagories you can filter by.
 * @param {String[][]} items The selected items in each filter catagory.
 * @param {Boolean} isBrowse A boolean representing if the user is browsing or searching.
 * @param {Number[]} docsUsed An array of the indices of the book documents from the database that have already been used.
 */
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
    $("#paginator").show();
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
/**
 * @description Creates the HTML elements for the filter lists on the side of the search results page.
 * @param {Book[]} searchResultsArray The array of books to list on the search results page.
 * @param {String[]} filters The catagories you can filter by.
 * @param {String[][]} items The selected items in each filter catagory.
 */
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
                let authorString = searchResultsArray[i].authors[j]?.lastName + ", " + searchResultsArray[i].authors[j]?.firstName;
                if (!searchResultsAuthorsArray.includes(authorString) && authorString != "undefined, undefined" && authorString != ", ") {
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
            li.innerHTML = "<input type=\"checkbox\" id=\"author-" + i +"-checkbox\"><label for=\"author-" + i +"-checkbox\">" + authorString + "</label>";
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
        li.innerHTML = "<input type=\"checkbox\" id=\"author-" + i +"-checkbox\"><label for=\"author-" + i +"-checkbox\">" + authorString + "</label>";
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
                    li.innerHTML = "<input type=\"checkbox\" id=\"author-" + i +"-checkbox\"><label for=\"author-" + i +"-checkbox\">" + authorString + "</label>";
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
            li.innerHTML = "<input type=\"checkbox\" id=\"subject-" + i +"-checkbox\"><label for=\"subject-" + i +"-checkbox\">" + subject + "</label>";
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
        li.innerHTML = "<input type=\"checkbox\" id=\"subject-" + i +"-checkbox\"><label for=\"subject-" + i +"-checkbox\">" + subject + "</label>";
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
                    li.innerHTML = "<input type=\"checkbox\" id=\"subject-" + i +"-checkbox\"><label for=\"subject-" + i +"-checkbox\">" + subject + "</label>";
                    $("#sort-subject-list")[0].appendChild(li);
                }
            });
        }
    }
}

/**
 * @description Sets up the individiual result page and starts the process of getting the book's information.
 * @param {String} pageQuery The query string from the URL.
 */
export function setupResultPage(pageQuery) {
    let barcodeNumber = parseInt(findURLValue(pageQuery, "id"));
    if (!barcodeNumber) {
        openModal("error", "A valid barcode was not provided.");
        goToPage("");
        return;
    }

    getBookFromBarcode(barcodeNumber).then((bookObject) => {
        if (!bookObject || bookObject.isDeleted || bookObject.isHidden) {
            openModal("error", "No information could be found for that book.");
            goToPage("");
            return;
        }
        changePageTitle(bookObject.title);

        if (bookObject.medium == "av") {
            $("#result-page-image").attr("src", "/img/av-image.png");
        } else {
            // Currently not checking for icons because they are too low quality. Could change that if needed.
            if (bookObject.thumbnailImageLink.indexOf("http") != -1) {
                $("#result-page-image").attr("src", bookObject.thumbnailImageLink);
            } else if (bookObject.coverImageLink.indexOf("http") != -1) {
                console.warn("No thumbnail image found for " + bookObject.barcodeNumber + ".", bookObject);
                $("#result-page-image").attr("src", bookObject.coverImageLink);
            } else {
                console.error("No images found for " + bookObject.barcodeNumber + ".", bookObject);
                $("#result-page-image").attr("src", "/img/favicon.ico");
            }
        }

        $("#result-page-barcode-number").html(addBarcodeSpacing(barcodeNumber));
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
        let callNumberAnswer = "";
        if (bookObject.audience.children == true) {
            callNumberAnswer += "J";
        } else if (bookObject.audience.youth == true) {
            callNumberAnswer += "Y";
        } else if (bookObject.canBeCheckedOut == false) {
            callNumberAnswer += "REF<br>";
        }
        callNumberAnswer += bookObject.ddc;
        if (bookObject.authors.length != 0) {
            callNumberAnswer += "<br>" + bookObject.authors[0].lastName.toUpperCase().substring(0, 3);
        } else {
            callNumberAnswer += "<br>" + bookObject.title.toUpperCase().substring(0, 3);
        }
        $("#result-page-call-number").html(callNumberAnswer);
        let mediumAnswer = "";
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
        let audienceAnswer = "";
        if (bookObject.audience.children == true) {
            audienceAnswer += "Children, ";
        }
        if (bookObject.audience.youth == true) {
            audienceAnswer += "Youth, ";
        }
        if (bookObject.audience.adult == true) {
            audienceAnswer += "Adult, ";
        }
        if (bookObject.audience.isNone() == true) {
            audienceAnswer = "None, ";
        }
        audienceAnswer = audienceAnswer.substring(0, audienceAnswer.lastIndexOf(","));
        $("#result-page-audience").html(audienceAnswer);
        let publishersAnswer = "";
        bookObject.publishers.forEach((item) => {
            publishersAnswer += (item + ", ");
        });
        publishersAnswer = publishersAnswer.substring(0, publishersAnswer.lastIndexOf(","));
        if (publishersAnswer == "") publishersAnswer = "None";
        $("#result-page-publisher").html(publishersAnswer);
        if (bookObject.publishDate) {
            let d = bookObject.publishDate;
            if (d.getMonth() != 0 && d.getDate() != 1) {
                $("#result-page-publish-date").html(d.getMonth() + 1 + "/" + d.getDate() + "/" + d.getFullYear());
            } else if (d.getMonth() != 0) {
                let month;
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
            let authorAnswer = "";
            bookObject.authors.forEach((item) => {
                authorAnswer += item.lastName + ", " + item.firstName + "<br>";
            });
            $("#result-page-author").html(authorAnswer);
        } else {
            if (bookObject.authors.length == 0 || (bookObject.authors[0].firstName == "" && bookObject.authors[0].lastName == "")) {
                $("#result-page-author").html("None");
            } else {
                $("#result-page-author").html(bookObject.authors[0].lastName + ", " + bookObject.authors[0].firstName);
            }
        }
        if (bookObject.illustrators.length > 0) {
            let illustratorAnswer = "";
            bookObject.illustrators.forEach((item) => {
                illustratorAnswer += item.lastName + ", " + item.firstName + "<br>";
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
        let subjectsAnswer = "";
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
    }).catch((error) => {
        // If we can go back without refreshing the page, do so, otherwise, send us home.
        if (historyManager.currentIndex > 0) {
            window.history.back();
        } else {
            goToPage("");
        }
        openModal("error", "No information could be found for that book.\n" + error);
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

/**
 * @description Checks out a book. This function starts the process when the user clicks the checkout button on the result page.
 * @param {Number} barcodeNumber The barcode number of the book to be checked out.
 */
function checkout(barcodeNumber) {
    if (isNaN(barcodeNumber) || barcodeNumber.toString().indexOf("11711") < 0) {
        openModal("error", "There was an error checking out this book.");
        console.log("The barcode number could not be identified.");
        return;
    }
    $("#checkout-inner-popup-box").html("<p>You are checking out this book as: <b><span id='checkout-name'></span></b>.<br>If this is not you, please click cancel and log out.</p>");
    $("#checkout-popup").show();
    $("#checkout-name").html(auth.currentUser.email);
    $("#checkout-next-button").show();
}

/**
 * @description Cancels the checkout process.
 */
function cancelCheckout() {
    $("#checkout-popup").hide();
}

/**
 * @description After the user has verfied their account, this starts the process of scanning the barcode on the book.
 *              Then it uploads the checkout event to the database.
 */
function scanCheckout() {
    // TODO: Delete after implementing
    openModal("info", "This feature is not yet implemented.");
    return;
    /*
    $("#checkout-next-button").hide();
    $("#checkout-inner-popup-box").html("<p>Please scan the barcode on the book now.</p>");
    $("#checkout-book-barcode").on("blur", () => { $('#checkout-book-barcode').trigger("focus"); });
    $("#checkout-book-barcode").trigger("focus");
    let barcodeNumber = $("#result-page-barcode-number").html();
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
                            let bookNumber = barcodeNumber - 1171100000;
                            let bookDocument = Math.floor(bookNumber / 100).toString().padStart(3, "0");
                            bookNumber = bookNumber % 100;

                            let d = new Date(2020);
                            getDocs(query(collection(db, "users"), where("lastCheckoutTime", ">", d),
                                where("checkouts", "array-contains", barcodeNumber),
                                orderBy("lastCheckoutTime"), limit(5))).then((querySnapshot) => {
                                    querySnapshot.forEach((docSnap) => {
                                        docSnap.data().checkouts.forEach((checkoutObject) => {
                                            if (checkoutObject.returnTime != null) {
                                                openModal("error", "The book is already checked out to someone else. It must be returned first. Please put the book in the return area.");
                                                return;
                                            }
                                        });
                                    });
                                });
                            runTransaction(db, (transaction) => {
                                return transaction.get(doc(db, "books", bookDocument)).then((docSnap) => {
                                    if (!docSnap.exists()) {
                                        openModal("error", "There was a problem with checking out that book.");
                                        return;
                                    }

                                    let bookObject = docSnap.data().books[bookNumber];
                                    if (bookObject.canBeCheckedOut == false) {
                                        openModal("error", "We're sorry, but this is a reference book, and it may not be checked out.");
                                        return;
                                    }
                                    let currentTime = Date.now();
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
                                openModal("success", "This book has been checked out to you successfully.");
                                goToPage("");
                            });
                        }
                    }
                });
            } else {
                openModal("error", "This is not the right book. Please view the correct book's page before checking it out.");
                cancelCheckout();
            }
        }
    });
    */
}

/**
 * @description Goes through the list of filters on the page and creates arrays of the filters and the items that are checked.
 * @param {String} queryFromURL The query from the URL. This handles the case for Browse.
 */
function applySearchFilters(queryFromURL) {
    let filters = [], items = [];
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
        updateBookDatabase().then(() => {
            searchWithFilters(filters, items);
        });
    } else {
        searchWithFilters(filters, items);
    }
}

/**
 * @description Iterates through the search cache and filters out the items that don't match the filters.
 * @param {String[]} filters 
 * @param {String[][]} items 
 */
function searchWithFilters(filters, items) {
    let results = [];
    for (let i = 0; i < searchCache.length; i++) {
        let passesAllFilters = true;
        for (let j = 0; j < filters.length && passesAllFilters; j++) {
            let passesFilter = false;
            for (let k = 0; k < items[j].length; k++) {
                if (filters[j] == "Author") {
                    if (passesFilter ||
                        items[j][k] == searchCache[i].authors[0].lastName + ", " + searchCache[i].authors[0].firstName
                        || (searchCache[i].authors[1] &&
                            items[j][k] == searchCache[i].authors[1].lastName + ", " + searchCache[i].authors[1].firstName)) {
                        passesFilter = true;
                    }
                } else if (filters[j] == "Medium") {
                    if (passesFilter || items[j][k].toUpperCase() == searchCache[i].medium.toUpperCase()) {
                        passesFilter = true;
                    }
                } else if (filters[j] == "Audience") {
                    if (passesFilter ||
                        items[j][k] == "Children" && searchCache[i].audience.children ||
                        items[j][k] == "Youth" && searchCache[i].audience.youth ||
                        items[j][k] == "Adult" && searchCache[i].audience.adult) {
                        passesFilter = true;
                    }
                } else if (filters[j] == "Subject") {
                    if (passesFilter || searchCache[i].subjects.includes(items[j][k])) {
                        passesFilter = true;
                    }
                } else if (filters[j] == "Type") {
                    if (passesFilter ||
                        items[j][k] == "Non-fiction" && searchCache[i].ddc != "FIC" ||
                        items[j][k] == "Fiction" && searchCache[i].ddc == "FIC") {
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

console.log("search.js has Loaded!");
