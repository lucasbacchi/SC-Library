// Importing version 9 compat libraries
import firebase from "firebase/compat/app";
import "firebase/compat/analytics";
import "firebase/compat/app-check";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
import "firebase/compat/performance";



import { initApp, closeLargeAccount, setupMain } from "./main";


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
    "/admin/barcode",
    "/admin/editEntry",
    "/admin/editUser",
    "/admin/inventory",
    "/admin/main",
    "/admin/report",
    "/admin/view",
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
        const appCheck = firebase.appCheck();
        // Pass your reCAPTCHA v3 site key (public key) to activate(). Make sure this
        // key is the counterpart to the secret key you set in the Firebase console.
        appCheck.activate('6LcpTm0bAAAAALfsopsnY-5aX2BC7nAukEDHtKDu');
        goToPage(fullExtension.substr(1), true);
    }, function(error) {
        console.error(error);
    });
});





var currentPage;
var currentPanel;

var currentHash;
var currentQuery = "";
var currentExtension;

export let goToPage;
{
    let isAdmin;
    function isAdminCheck(recheck = false) {
        return new Promise(function (resolve, reject) {
            if (isAdmin == null || recheck) {
                firebase.firestore().collection("admin").doc("private_vars").get().then((doc) => {
                    isAdmin = true;
                    resolve(true);
                }).catch((error) => {
                    isAdmin = false;
                    resolve(false);
                });
            } else {
                if (isAdmin) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }
        });
    }
    
    goToPage = (pageName, goingBack = false, searchResultsArray = null) => {
        return new Promise (function (resolve, reject) {
            // If there is any reason for the user to not leave a page, then it will reject.
            // Currently, this handles unsaved changes on the edit entry page.
            // TODO: Add more
            if (currentPage == "/admin/editEntry" && unSavedChangesEditEntry()) {
                // It's fine to call it regardless because it will only call if the first argument is true.
                reject("The User attempted to leave the page without saving.");
                return;
            }

            $("#content").removeClass("fade");
            if ($(window).width() <= 570) {
                closeNavMenu();
            }
            closeLargeAccount();

            var pageHash = "";
            var pageQuery = "";
            var pageExtension = "";

            // This removes the hash if one was passed in and stores it to a separate variable.
            if (pageName.includes("#")) {
                pageHash = pageName.substr(pageName.indexOf("#"), pageName.length);
                pageName = pageName.substr(0, pageName.indexOf("#"));
            }

            // This removes the query if one was passed in and stores it to a separate variable.
            if (pageName.includes("?")) {
                pageQuery = pageName.substr(pageName.indexOf("?"), pageName.length);
                pageName = pageName.substr(0, pageName.indexOf("?"));
            }

            // This removes the file extension if one was passed in and stores it to a separate variable.
            if (pageName.includes(".")) {
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

            if (pageName == "admin") {
                goToPage("admin/main");
                pageName = "admin/main";
                return;
            }

            pageName = "/" + pageName;

            // Prevent users from going to the same page (just don't reload the content if you do)
            if (currentPage && ((pageName == currentPage && pageName != "/search") || (pageName == "/search" && findURLValue(currentQuery, "query", true) == findURLValue(pageQuery, "query", true) && findURLValue(pageQuery, "query", true) != ""))) {
                // TODO: Remove when I know it's not going to break everything

                console.log("The user attempted to view the current page, and it was blocked.");
                return;
            }

            // Prevent users from viewing admin pages without having admin privilages
            if (!pageName.includes("admin")) {
                // Prevent users from going to the sign in/up page if they are signed in
                if (!pageName.includes("login") && !pageName.includes("signup")) {
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
                isAdminCheck(true).then((isAdmin) => {
                    getPage(pageName);
                }).catch((error) => {
                    goToPage("");
                    return;
                })
            }

            
            
            isAdminCheck(currentPage == "/login" ? true : false).catch((error) => {
                console.error(error);
            }).then((result) => {
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

                        // The account pages handle their own states because they are panels
                        if (!goingBack && !pageName.includes("account")) {
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
                            "/admin/barcode": "Generate Barcodes",
                            "/admin/view": "View Database",
                            "/admin/editUser": "Edit a User",
                            "/admin/inventory": "Conduct Inventory",
                            "/404": "404 | File Not Found",
                            "/about": "About Us",
                            "/account": "Your Account",
                            "/advancedSearch": "Advanced Search",
                            "/autogenindex": "LEAVE",
                            "/help": "Help",
                            "/login": "Login",
                            "/main": "Home",
                            "/result": "Search Result", // This will get changed on the page to be specific to the title.
                            "/search": "Search Results",
                            "/signup": "Signup",
                            "/sitemap": "Sitemap"
                        }

                        // Add Titles baseed on page Name
                        if (titleList[pageName] != undefined) {
                            changePageTitle(titleList[pageName], false);
                        } else if (pageUrl == "./") {
                            changePageTitle("Home", false);
                        } else {
                            document.title = "South Church Library Catalog";
                        }

                        // Define what sources are required on each page
                        // (excluding favicon.ico, ajax.js, main.js, and main.css)
                        // These will always be loaded no matter what page.
                        var sourcesRequired = {
                            "/admin/editEntry": ["form.css", "editEntry.js", "admin.js", "admin.css"],
                            "/admin/main": ["admin.js", "admin.css", "editEntry.js"],
                            "/admin/report": ["admin.js", "admin.css", "report.js"],
                            "/admin/barcode": ["admin.js", "admin.css"],
                            "/admin/view": ["admin.js", "admin.css", "search.css"],
                            "/admin/editUser": ["admin.js", "admin.css"],
                            "/admin/inventory": ["admin.js", "admin.css"],
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
                            "/sitemap": ["sitemap.js"]
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
                        try {
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
                                        console.error("SOURCE NEEDED COULD NOT BE FOUND!!");
                                    }
                                }
                            }
                        } catch {
                            console.warn("This page name does not exist in the source list.");
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
                            setupSearch(searchResultsArray, pageQuery);
                        }

                        if (pageName == "/result") {
                            setupResults(pageQuery);
                        }

                        if (pageName == "/account") {
                            accountPageSetup(pageQuery, goingBack);
                        } else {
                            currentPanel = null;
                        }

                        if (pageName == "/admin/main") {
                            setupAdminMain();
                        }

                        if (pageName == "/admin/editEntry") {
                            setupEditEntry(pageQuery);
                        }

                        if (pageName == "/admin/editUser") {
                            setupEditUser(pageQuery);
                        }

                        if (pageName == "/admin/view") {
                            setupView(pageQuery);
                        }

                        if (pageName == "/admin/report") {
                            setupReport(pageQuery);
                        }

                        if (pageName == "/admin/inventory") {
                            setupInventory(pageQuery);
                        }

                        if (pageName == "/admin/barcode") {
                            setupBarcodePage();
                        }

                        if (pageName == "/sitemap") {
                            sitemapSetup();
                        }
                        
                        /* TRYING THIS IN A .THEN We'll see how that goes...
                        // Give the CSS time to apply - FIX THIS METHODOLOGY
                        setTimeout(function() {
                            $("#cover").hide();
                            $("body").addClass("fade");
                            $("body").css('overflow', '');
                        }, 200);*/
                        
                                    
                        currentPage = pageName;
                        currentHash = pageHash;
                        currentQuery = pageQuery;
                        currentExtension = pageExtension;
                        // Ideally this doesn't resolve until everything is redrawn... Not sure if that's how it's going to work
                        resolve();
                    }
                }
            }
        }).then(() => {
            $("#cover").hide();
            $("body").addClass("fade");
            $("body").css('overflow', '');
        }).catch((error) => {
            console.error("goToPage function failed: " + error);
        });
        
    }
}

// Catch History Events such as forward and back and then go to those pages
window.onpopstate = function (event) {
    handleHistoryPages();
};

function handleHistoryPages() {
    let path = document.location.pathname.substring(1);
    let search = document.location.search;
    let hash = document.location.hash;
    goToPage(path + search + hash, true);
}

function changePageTitle (newTitle, append = true) {
    if (newTitle == "") {
        document.title = "South Church Library Catalog";
    } else {
        if (append) {
            var currentTitle = document.title;
            document.title = newTitle + " | " + currentTitle;
        } else {
            document.title = newTitle + " | South Church Library Catalog";
        }
    }
}


console.log("ajax.js has Loaded!");
