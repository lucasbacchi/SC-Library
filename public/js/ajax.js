var url = window.location.href;
var path = window.location.pathname;
var query = window.location.search;
var hash = window.location.hash;
var fullExtension = path + query + hash;


// Search Content folder
var directory = [
    "/account/overview",
    "/account/notifications",
    "/account/checkouts",
    "/account/security",
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
    "/result",
    "/search",
    "/signup",
    "/sitemap"
];
var loadedSources = [];

// Go to the correct page when the page loads
$(document).ready(function () {
    initApp()
    .then(function() {
        goToPage(fullExtension.substr(1, fullExtension.length), true);
    }, function(error) {
        console.log(error);
    });
});





var currentPage;
{
    var isAdmin;
    function isAdminCheck() {
        return new Promise(function (resolve, reject) {
            if (isAdmin == null) {
                firebase.firestore().collection("config").doc("private_vars").get().then((doc) => {
                    isAdmin = true;
                    resolve(true);
                }).catch((error) => {
                    isAdmin = false;
                    reject(false);
                });
            } else {
                if (isAdmin) {
                    resolve(true);
                } else {
                    reject(false);
                }
            }
        });
    }
    
    function goToPage(pageName, goingBack = false, searchResultsArray = null) {
        return new Promise (function (resolve, reject) {
            $("#content").removeClass("fade");
            if ($(window).width() <= 570) {
                closeNavMenu();
            }
            closeLargeAccount();

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

            // This removes an ending slash if one was mistakenly included
            if (pageName.substring(pageName.length - 1) == "/") {
                pageName = pageName.substring(0, pageName.length - 1);
            }

            if (pageName == "" || pageName == "index.html" || pageName == "index") {
                pageName = "main";
            }

            pageName = "/" + pageName;

            // Prevent users from going to the same page (just don't reload the content if you do)
            if (pageName == currentPage) {
                console.log("The user attempted to view the current page, and it was blocked.");
                return;
            }

            // Prevent users from viewing admin pages without having admin privilages
            if (pageName.indexOf("admin") == -1) {
                // Prevent users from going to the sign in/up page if they are signed in
                if (pageName.indexOf("login") == -1 && pageName.indexOf("signup") == -1) {
                    getPage(pageName);
                } else {
                    // TO DO: Might have broken reauth.
                    if (firebase.auth().currentUser != null) {
                        goToPage("");
                        return;
                    } else {
                        getPage(pageName);
                    }
                }
            } else {
                isAdminCheck().then((isAdmin) => {
                    getPage(pageName);
                }).catch((error) => {
                    goToPage("");
                    return;
                })
            }

            

            isAdminCheck().catch((error) => {}).then((result) => {
                if (result && !$("#admin-link").length) {                
                    $("#account-information-container").append("<a id=\"admin-link\" onclick=\"javascript:goToPage(\'admin/main\');\">Admin Dashboard</a>");
                }
            });

            function getPage(pageName) {
                const xhttp = new XMLHttpRequest();
                if (directory.includes(pageName)) {
                    xhttp.open("GET", "/content" + pageName + ".html", true); // removed sending the hash/query (I don't see why we'd need the server to know it...)
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
                            "result": "Result", // This will get changed on the page to be specific to the title.
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
                            "/admin/editEntry": ["form.css", "editEntry.js", "admin.js", "admin.css"],
                            "/admin/main": ["admin.js", "admin.css"],
                            "/admin/report": ["admin.js", "admin.css"],
                            "/404": [],
                            "/about": [],
                            "/account": ["account.js", "account.css"],
                            "/advancedSearch": ["search.js", "search.css"],
                            "/autogenindex": [],
                            "/help": [],
                            "/login": ["signIn.js"],
                            "/main": [],
                            "/result": ["search.js", "search.css"],
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
                        if (pageName == "/main") {
                            setupMain();
                        }

                        if (pageName == "/login" || pageName == "/signup") {
                            setupSignIn(pageQuery);
                        }

                        if (pageName == "/search") {
                            if (searchResultsArray == null) {
                                setupSearch(null, pageQuery);
                            } else {
                                setupSearch(searchResultsArray);
                            }
                        }

                        if (pageName == "/account") {
                            accountPageSetup(pageQuery);
                        }

                        if (pageName == "/admin/main") {
                            setupAdminMain();
                        }

                        if (pageName == "/admin/editEntry") {
                            setupEditEntry(pageQuery);
                        }
                        
                        /* TRYING THIS IN A .THEN We'll see how that goes...
                        // Give the CSS time to apply - FIX THIS METHODOLOGY
                        setTimeout(function() {
                            $("#cover").hide();
                            $("body").addClass("fade");
                            $("body").css('overflow', '');
                        }, 200);*/
                        
                                    
                        currentPage = pageName;
                        // Ideally this doesn't resolve until everything is redrawn... Not sure if that's how it's going to work
                        resolve();
                    }
                }
            }
        }).then(function() {
            $("#cover").hide();
            $("body").addClass("fade");
            $("body").css('overflow', '');
        }).catch(function(error) {
            console.error("goToPage function failed: " + error);
        });
        
    }
}

// Catch History Events such as forward and back and then go to those pages
window.onpopstate = function (event) {
    goToPage(document.location.pathname.substr(1, document.location.pathname.length), true);
};


console.log("ajax.js has Loaded!");