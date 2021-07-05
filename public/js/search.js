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

    var searchResultsPromise;

    if (searchResultsArray == null) {
        var queryFromURL = findURLValue(pageQuery, "query");
        if (queryFromURL == "") {
            browse();
            return;
        }
        searchResultsPromise = search(queryFromURL);
        searchResultsPromise.then((resultsArray) => {
            searchResultsArray = resultsArray;
        });
    }
    Promise.all([searchResultsPromise]).then(() => {
        for (var i = 0; i < searchResultsArray.length; i++) {
            searchResultsArray[i] = searchResultsArray[i].data();
        }
        createSearchResultsPage(searchResultsArray);
    });
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
            var docs = doc.data().order;/*
            if (doc.data().books.length < 25) {
                docs--;
            }*/
            var rand = Math.floor(Math.random() * docs);
            rand = "0" + rand;
            if (rand.length == 2) rand = "0" + rand;
            db.collection("books").doc(rand).get().then((doc) => {
                if (!doc.exists) {
                    console.error("books " + rand + " does not exist");
                    return;
                }
                var values = [];
                for (var i = 0; i < 20; i++) {
                    var random = Math.floor(Math.random() * doc.data().books.length);
                    if (/*values.indexOf(random) > -1 || */doc.data().books[random].isDeleted || doc.data().books[random].isHidden) {
                        i--;
                    } else {
                        values.push(random);
                        browseResultsArray.push(doc.data().books[random]);
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

console.log("search.js Loaded!");
