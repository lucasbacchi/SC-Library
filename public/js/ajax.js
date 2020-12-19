var xhttp = new XMLHttpRequest();

var url = window.location.href;
var path = window.location.pathname;
var query = window.location.search;
var hash = window.location.hash;

console.log(path);
console.log(hash);

// Search Content folder
var directory = [
    "/admin/addEntry.html",
    "/admin/editEntry.html",
    "/admin/main.html",
    "/admin/report.html",
    "/404.html",
    "/about.html",
    "/account.html",
    "/advancedSearch.html",
    "/autogenindex.html",
    "/help.html",
    "/login.html",
    "/main.html",
    "/search.html",
    "/signup.html",
    "/sitemap.html"
];

// Get the content of the page
if (directory.includes(path)){
    xhttp.open("GET", "/content" + path + query + hash, true);
} else if (path == "/") {
    xhttp.open("GET", "/content/main.html" + query + hash, true);
} else {
    xhttp.open("GET", "/content/404.html", true);
}
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