var xhttp = new XMLHttpRequest();

var url = window.location.href;
var path = window.location.pathname;
var query = window.location.search;
var hash = window.location.hash;

console.log(path);
console.log(hash);

// Get the content of the page
xhttp.open("GET", "/content" + path + query + hash, true);
xhttp.send();

$(document).ready(function() {
    // Set the content of the page
    document.getElementById("content").innerHTML = xhttp.responseText;
    // Remove Placeholder Height
    document.getElementById("content").style.height = "";

    // Set Title Correctly
    // Load Additional Resources
    if (path.includes("search")) {
        $('head').append('<link rel="stylesheet" href="/css/search.css" type="text/css">');
        $('head').append('<script src="/js/search.js">');
        $('head').append('<title>Search Results | South Church Library Catalog</title>');
    }

});


console.log("ajax.js has Loaded!");