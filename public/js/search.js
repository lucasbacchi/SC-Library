// Make content Responsive
// Doesn't have to be setup because the window element doesn't change.
$(window).resize(function () {
    if ($(window).width() > 500) {
        $('#sort-container').width('fit-content');
        $('.sort-section').show();
        $('.sort-section').css('opacity', '1');
        $('#close-button').hide();
        $('#sort-sidebar').css('overflow-y', 'visible');
        $('#sort-sidebar').css('max-height', '');

    }
    if ($(window).width() <= 500 && $('#close-button').css('display') == 'none') {
        $('#sort-container').width('0');
        $('.sort-section').hide();
        $('.sort-section').css('opacity', '0');

    }
});

// Set Initial window layout.
if ($(window).width() > 500) {
    $('.sort-section').show();

}
if ($(window).width() <= 500) {
    $('.sort-section').hide();

}

function setupSearch(searchResultsArray, pageQuery) {
    // Create Sort Dropdown Event Listener
    $('#sort-main-title').click(function() {
        if (window.innerWidth < 501) {
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

    var queryFromURL = findURLValue(pageQuery, "query");

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

function browse() {
    var browseResultsArray = [];
    db.collection("books").where("order", ">=", 0).orderBy("order", "desc").limit(1).get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            console.log(doc);
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

function createSearchResultsPage(searchResultsArray) {
    if (searchResultsArray.length == 0) {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode("That search returned no results. Please try again."));
        $('div#results-container')[0].appendChild(p);
    }
    for (var i = 0; i < searchResultsArray.length; i++) {
        $('div#results-container')[0].appendChild(buildBookBox(searchResultsArray[i], "search", i + 1));
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
        if (!bookObject) {
            alert("Error: No information could be found for that book.");
            goToPage("");
        }
    
        $("#result-page-barcode-number").html(barcodeNumber);
        $("#result-page-isbn-number").html("ISBN 10: " + bookObject.isbn10 + "<br>ISBN 13: " + bookObject.isbn13);
        $("#result-page-call-number").html(bookObject.ddc);
        $("#result-page-medium").html(bookObject.medium);
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
        $("#result-page-publish-date").html(d.getMonth() + "/" + d.getDate() + "/" + d.getFullYear());
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
                authorAnswer += item.last + ", " + item.first;
            });
            $("#result-page-author").html(authorAnswer);
        } else {
            $("#result-page-author").html(bookObject.authors[0].last + ", " + bookObject.authors[0].first);
        }
        if (bookObject.illustrators.length > 0) {
            var illustratorAnswer = "";
            bookObject.illustrators.forEach((item) => {
                illustratorAnswer += item.last + ", " + item.first;
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
    });
}

console.log("search.js Loaded!");
