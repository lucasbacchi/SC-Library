var url = window.location.href;
var path = window.location.pathname;
var query = window.location.search;
var hash = window.location.hash;

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

goToPage(path.substr(1, path.length), true);

var currentPage;
function goToPage(pageName, goingBack = false) {
    $("#content").removeClass("fade");

    pageName = "/" + pageName;
    if (directory.includes(pageName)){
        xhttp.open("GET", "/content" + pageName + ".html" + query + hash, true);
    } else if (directory.includes(pageName.substr(0, pageName.indexOf(".")))) {
        xhttp.open("GET", "/content" + pageName + query + hash, true);
    } else if (pageName == "/" || pageName == "/index.html" || pageName == "/index") {
        xhttp.open("GET", "/content/main.html" + query + hash, true);
    } else {
        xhttp.open("GET", "/content/404.html", true);
    }
    xhttp.send();

    // Set the content of the page
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            if (currentPage != pageName) {
                $('#content').addClass("fade");
            }

            var pageUrl = pageName;
            if (pageUrl == "/index.html" || pageUrl == "/index" || pageUrl == "/main" || pageUrl == "/main.html") {
                pageUrl = "./";
            }
            if (!goingBack) {
                window.history.pushState({}, "", pageUrl);
            } else {
                
            }

            document.getElementById("content").innerHTML = xhttp.responseText;
            // Remove Placeholder Height
            document.getElementById("content").style.height = "";

            // Set Title Correctly
            // Load Additional Resources??
            var titleList = {
                "/admin/addEntry": "Add an Entry",
                "/admin/editEntry": "Edit an Entry",
                "/admin/main": "Admin Console",
                "/admin/report": "Run a Report",
                "/404": "404 | File Not Found",
                "/about": "About Us",
                "/account": "Your Account",
                "/advancedSearch": "Advanced Search",
                "/autogenindex": "LEAVE",
                "/help": "Help",
                "/login": "Login",
                "/main": "Home",
                "/search": "Search Results",
                "/signup": "Signup",
                "/sitemap": "Sitemap"
            }

            if (titleList[pageName] != undefined) {
                document.title = titleList[pageName] + " | South Church Library Catalog";
            } else if (pageUrl == "./") {
                document.title = "Home | South Church Library Catalog";
            } else {
                document.title = "South Church Library Catalog";
            }
                        
            currentPage = pageName;
        }
    }
}

window.onpopstate = function (event) {
    goToPage(document.location.pathname.substr(1, document.location.pathname.length), true);
    console.log(event);
};


console.log("ajax.js has Loaded!");