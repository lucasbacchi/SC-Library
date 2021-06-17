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
        var queryFromURL = pageQuery.substring(pageQuery.indexOf("=") + 1, pageQuery.length);
        var searchResultsPromise = search(queryFromURL);
        searchResultsPromise.then((resultsArray) => {
            createSearchResultsPage(resultsArray);
        });
    } else {
        createSearchResultsPage(searchResultsArray);
    }
}


function createSearchResultsPage(searchResultsArray) {
    searchResultsArray.forEach((doc, index) => {
        var container = document.createElement("div");
        container.id = "result-number-" + index;
        container.className = "result-listing";
        $("#results-container")[0].appendChild(container);

        var resultNumber = document.createElement("div");
        resultNumber.className = "result-number";
        resultNumber.innerHTML = index + 1 + ".";
        $("#result-number-" + index)[0].appendChild(resultNumber);

        var resultImage = document.createElement("img");
        resultImage.className = "result-image";
        if (doc.data().photoURL) {
            resultImage.src = doc.data().photoURL;
        } else {
            resultImage.src = "img/favicon.ico";
        }
        $("#result-number-" + index)[0].appendChild(resultImage);

        var resultTitle = document.createElement("h4");
        resultTitle.className = "result-title";
        resultTitle.id = "result-title-number-" + index;
        $("#result-number-" + index)[0].appendChild(resultTitle);

        var resultTitleLink = document.createElement("a");
        resultTitleLink.setAttribute("onclick", "javascript:goToPage('result?id=" + doc.data().barcode + "');");
        resultTitleLink.innerHTML = doc.data().title;
        $("#result-title-number-" + index)[0].appendChild(resultTitleLink);

        var resultInfo = document.createElement("div");
        resultInfo.className = "result-info";
        resultInfo.id = "result-info-number-" + index;
        $("#result-number-" + index)[0].appendChild(resultInfo);

        var resultText = document.createElement("p");
        resultText.className = "result-text";
        resultText.innerHTML = doc.data().short_description;
        $("#result-info-number-" + index)[0].appendChild(resultText);
    });
}


console.log("search.js Loaded!");
