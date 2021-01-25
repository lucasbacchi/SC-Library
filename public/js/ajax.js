var url = window.location.href;
var path = window.location.pathname;
var query = window.location.search;
var hash = window.location.hash;


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
var loadedSources = [];

var xhttp = new XMLHttpRequest();

// Go to the correct page when the page loads
$(document).ready(function () {
    goToPage(path.substr(1, path.length), true);
});





var currentPage;
function goToPage(pageName, goingBack = false) {
    $("#content").removeClass("fade");
    if ($(window).width() <= 570) {
        closeNavMenu();
    }

    var pageHash = "";
    var pageQuery = "";
    var pageExtension = "";

    // This removes the hash if one was passed in and stores it to a separate variable.
    if (pageName.indexOf("#") != -1) {
        pageHash = pageName.substr(pageName.indexOf("#"), pageName.length);
        pageName = pageName.substr(0, pageName.indexOf("#"));
    }

    // This removes the query if one was passed in and stores it to a separate variable.
    if (pageName.indexOf("?") != -1) {
        pageQuery = pageName.substr(pageName.indexOf("?"), pageName.length);
        pageName = pageName.substr(0, pageName.indexOf("?"));
    }

    // This removes the file extension if one was passed in and stores it to a separate variable.
    if (pageName.indexOf(".") != -1) {
        pageExtension = pageName.substr(pageName.indexOf("."), pageName.length);
        pageName = pageName.substr(0, pageName.indexOf("."));
    }

    pageName = "/" + pageName;
    if (directory.includes(pageName)){
        xhttp.open("GET", "/content" + pageName + ".html" + query + hash, true); // This may require a rework for handling hash/query
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
                pageUrl = "../";
            }

            if (!goingBack) {
                window.history.pushState({}, "", pageUrl + pageQuery + pageHash);
            }

            document.getElementById("content").innerHTML = xhttp.responseText;
            // Remove Placeholder Height
            document.getElementById("content").style.height = "100%";

            // Set Title Correctly
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

            // Add Titles baseed on page Name
            if (titleList[pageName] != undefined) {
                document.title = titleList[pageName] + " | South Church Library Catalog";
            } else if (pageUrl == "./") {
                document.title = "Home | South Church Library Catalog";
            } else {
                document.title = "South Church Library Catalog";
            }

            // Define what sources are required on each page
            // (excluding favicon.ico, ajax.js, main.js, and main.css)
            // These will always be loaded no matter what page.
            var sourcesRequired = {
                "/admin/addEntry": [],
                "/admin/editEntry": [],
                "/admin/main": [],
                "/admin/report": [],
                "/404": [],
                "/about": [],
                "/account": ["account.js", "account.css"],
                "/advancedSearch": ["search.js", "search.css"],
                "/autogenindex": [],
                "/help": [],
                "/login": ["signIn.js"],
                "/main": [],
                "/search": ["search.js", "search.css"],
                "/signup": ["signIn.js"],
                "/sitemap": []
            }

            // Get an array of currently loaded Additional Resources like JS and CSS
            // Iterate through the currently loaded css files
            $('head > link.appended').each(function (index) {
                // Get the href attribute of the link tag
                var href = $(this)[0].attributes.href.value;
                // If the source isn't in the list of loaded scoures, add it.
                if (!loadedSources.includes(href.substr(href.lastIndexOf('/') + 1, href.length))) {
                    loadedSources.push(href.substr(href.lastIndexOf('/') + 1, href.length));
                }
            });
            // Iterate though the currently loaded js files
            $('body > script.appended').each(function (index) {
                // Get the src attribute of the script tag.
                var src = $(this)[0].attributes.src.value;
                // If the source isn't in the list of loaded scoures, add it.
                if (!loadedSources.includes(src.substr(src.lastIndexOf('/') + 1, src.length))) {
                    loadedSources.push(src.substr(src.lastIndexOf('/') + 1, src.length));
                }
            });

            // Check if this page has every thing it needs. If not, load additional resources
            // Get the list of sources needed for the current page
            var sourcesForPage = sourcesRequired[pageName];
            // Correct the empty path if required, set it to main.
            if (pageName == "/" || pageName == "/index.html" || pageName == "/index") {
                sourcesForPage = sourcesRequired["/main"];
            }
            // Itterate through each of the scources needed
            for (var i = 0; i < sourcesForPage.length; i++) {
                // If the source hasn't already been loaded.
                if (!loadedSources.includes(sourcesForPage[i])) {
                    // If the source is a js file:
                    if (sourcesForPage[i].substr(sourcesForPage[i].indexOf("."), sourcesForPage[i].length) == ".js") {
                        $('body').append('<script src="/js/' + sourcesForPage[i] + '" class="appended">');
                    }  
                    // If the source is a css file
                    else if (sourcesForPage[i].substr(sourcesForPage[i].indexOf("."), sourcesForPage[i].length) == ".css") {
                        $('head').append('<link rel="stylesheet" href="/css/' + sourcesForPage[i] + '" type="text/css" class="appended">');
                    } else {
                        console.log("SOURCE NEEDED COULD NOT BE FOUND!!");
                    }
                }
            }

            // Page Content has now Loaded

            // Scroll to a specific part of the page if needed
            // If no hash, scroll to the top of the page.
            if (pageHash) {
                document.querySelector(pageHash).scrollIntoView();
            } else {
                if (currentPage != pageName) {
                    $(document).scrollTop(0); // Could change later if we don't like this behavior
                }
            }



            // Fire Additional Scripts based on Page
            if (pageName == "/login" || pageName == "/signup") {
                setupSignIn();
            }

            if (pageName == "/search") {
                setupSearch();
            }

            if (pageName == "/account") {
                accountPageSetup();
            }
            
            // Give the CSS time to apply - FIX THIS METHODOLOGY
            setTimeout(function() {
                $("#cover").hide();
                $("body").addClass("fade");
                $("body").css('overflow', '');
            }, 200);
            
                        
            currentPage = pageName;
        }
    }
}

// Catch History Events such as forward and back and then go to those pages
window.onpopstate = function (event) {
    goToPage(document.location.pathname.substr(1, document.location.pathname.length), true);
};


console.log("ajax.js has Loaded!");