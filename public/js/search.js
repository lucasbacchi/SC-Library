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

    if (searchResultsArray == null) {
        var queryFromURL = findURLValue(pageQuery, "query");
        if (queryFromURL == "") {
            browse();
            return;
        }
        var searchResultsPromise = search(queryFromURL);
        searchResultsPromise.then((resultsArray) => {
            createSearchResultsPage(resultsArray);
        });
    } else {
        createSearchResultsPage(searchResultsArray);
    }
}

function browse() {
    return true;
}

function createSearchResultsPage(searchResultsArray) {
    if (searchResultsArray.length == 0) {
        const p = document.createElement('p');
        p.appendChild(document.createTextNode("That search returned no results. Please try again."));
        console.log(p);
        $('div#results-container')[0].appendChild(p);
    }
    for (var i = 0; i < searchResultsArray.length; i++) {
        $('div#results-container')[0].appendChild(buildBookBox(searchResultsArray[i].data(), "search", i + 1));
    }
}

console.log("search.js Loaded!");
