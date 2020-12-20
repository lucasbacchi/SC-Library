var url = window.location.href;
var path = window.location.pathname;
var query = window.location.search;
var hash = window.location.hash;

console.log(window.history.state);
var stateObject = {};
history.replaceState(stateObject, '', path.substr(0, path.indexOf(".")) + query + hash);
console.log(window.history.state);

console.log(path);
console.log(hash);

// Search Content folder
var directory = [
    "/admin/addEntry",
    "/admin/editEntry",
    "/admin/main",
    "/admin/report",
    "/404",
    "/about",
    "/account",
    "/advancedSearch",
    "/autogenindex",
    "/help",
    "/login",
    "/main",
    "/search",
    "/signup",
    "/sitemap"
];

var xhttp = new XMLHttpRequest();

// Get the content of the page
if (directory.includes(path)){
    xhttp.open("GET", "/content" + path + ".html" + query + hash, true);
} else if (path == "/" || path == "/index.html") {
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

window.onbeforeunload = function() {
    history.replaceState(stateObject, '', path + query + hash);
    console.log("The path on unload is " + path);
};


console.log("ajax.js has Loaded!");