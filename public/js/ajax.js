// Importing version 9 compat libraries
import firebase from "firebase/compat/app";
import "firebase/compat/analytics";
import "firebase/compat/app-check";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
import "firebase/compat/performance";

// Imports for version 9 (TODO: Add more)
import { initializeApp } from "firebase/app";



import { currentPage, db, directory, loadedSources, setApp, setCurrentPage, setCurrentPanel, setDb } from "./globals";
import { setupMain } from "./main";
import { setupEditEntry, unSavedChangesEditEntry } from "./editEntry"; // TODO: Figure out if this is a bad idea (don't load extra files? Will webpack deal with it for us?)
import { findURLValue } from "./common";
import { setupSignIn } from "./signIn";
import { setupResults, setupSearch } from "./search";
import { setupAdminMain, setupBarcodePage, setupEditUser, setupInventory, setupView } from "./admin";
import { setupReport } from "./report";
import { accountPageSetup } from "./account";
import { sitemapSetup } from "./sitemap";


// @ts-ignore
// eslint-disable-next-line no-unused-vars
var url = window.location.href;
var path = window.location.pathname;
var query = window.location.search;
var hash = window.location.hash;
var fullExtension = path + query + hash;


// Go to the correct page when the page loads
$(() => {
    initApp()
        .then(() => {
            const appCheck = firebase.appCheck();
            // Pass your reCAPTCHA v3 site key (public key) to activate(). Make sure this
            // key is the counterpart to the secret key you set in the Firebase console.
            appCheck.activate("6LcpTm0bAAAAALfsopsnY-5aX2BC7nAukEDHtKDu");
            setupIndex();
            goToPage(fullExtension.substr(1), true);
        }, function (error) {
            console.error(error);
        });
});


// Runs on the first load of all pages to handle nav links

export let closeLargeAccount;
function setupIndex() {
    // Set up on click for log out button
    $("div#log-out").on("click", () => {
        signOut();
    });
    // Iterate through all the links and set an onclick
    document.querySelectorAll("a").forEach(element => {
        // The html tags each have a custom data tag telling where the link should go
        if (element.dataset.linkTarget) {
            $(element).on("click", () => {
                goToPage(element.dataset.linkTarget);
            });
        }
    });

    // Manage Menu Button event listener
    $("#hamburger-button").on("click", () => {
        openNavMenu();

    });


    // Manage Menu Close Button event listener
    $("#close-button").on("click", () => {
        closeNavMenu();
    });


    // Manage Nav Links when screen gets small
    $(window).on("resize", () => {
        let width = window.innerWidth;
        if (width > 570) {
            $("nav").css("transition", "");
            $("nav").width("fit-content");
            $("nav > li > a").show();
            $("nav > li > a").css("opacity", "1");
            $("#close-button").hide();
        }
        if (width <= 570 && $("#close-button").css("display") == "none") {
            $("nav").width("");
            $("nav").css("transition", "0.5s");
            $("nav > li > a").hide();
            $("nav > li > a").css("opacity", "0");

        }
    });



    // Manage Account Panel and animation
    {
        let largeAccountOpen = false;
        $("#small-account-container").on("click", () => {
            if ($("#large-account-container").css("display") == "none") {
                setTimeout(function () {
                    largeAccountOpen = true;
                }, 20);
                $("#large-account-container").show(0).delay(10);
                $("#large-account-container").css("right", "0%");
            } else {
                closeLargeAccount();
            }

        });


        closeLargeAccount = () => {
            largeAccountOpen = false;
            $("#large-account-container").delay(400).hide(0);
            $("#large-account-container").css("right", "-500%");
        };


        $(window).on("click", (event) => {
            // Added to fix dupe input bug
            event.stopPropagation();
            // @ts-ignore
            if (!($.contains($("#large-account-container")[0], event.target) || event.target == $("#large-account-container")[0])) {
                if (largeAccountOpen) {
                    closeLargeAccount();
                }
            }

        });
    }


    $(window).on("scroll", function () {
        // @ts-ignore
        if ($(document).scrollTop() > 0) {
            $("header").css("box-shadow", "0px -7px 16px 5px var(--teal)");
        } else {
            $("header").css("box-shadow", "");
        }
    });
}

function closeNavMenu() {
    $("nav").css("transition", "0.5s");
    $("nav").width("0");
    $("#close-button").delay(400).hide(0);
    $("nav > li > a").css("opacity", "0");
    $("#close-button").css("opacity", "0");
    $("nav > li > a").delay(400).hide(0);
}

function openNavMenu() {
    $("nav").css("transition", "0.5s");
    $("nav").width("60%");
    $("nav > li > a").show();
    $("nav > li > a").css("opacity", "1");
    $("#close-button").css("display", "block");
    $("#close-button").css("opacity", "1");
}



let isAdmin;
export function isAdminCheck(recheck = false) {
    return new Promise(function (resolve) {
        if (isAdmin == null || recheck) {
            firebase.firestore().collection("admin").doc("private_vars").get().then(() => {
                isAdmin = true;
                resolve(true);
            }).catch(() => {
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
var currentQuery;
export function goToPage(pageName, goingBack = false, searchResultsArray = null) {
    return /** @type {Promise<void>} */(new Promise(function (resolve, reject) {
        // If there is any reason for the user to not leave a page, then it will reject.
        // Currently, this handles unsaved changes on the edit entry page.
        // TODO: Add more
        if (currentPage == "/admin/editEntry" && unSavedChangesEditEntry()) {
            // It's fine to call it regardless because it will only call if the first argument is true.
            reject("The User attempted to leave the page without saving.");
            return;
        }

        $("#content").removeClass("fade");
        if (window.innerWidth <= 570) {
            closeNavMenu();
        }
        closeLargeAccount();

        var pageHash = "";
        var pageQuery = "";
        // Never Used: var pageExtension = "";

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

        // This removes the file extension if one was passed in.
        if (pageName.includes(".")) {
            // Never Used: pageExtension = pageName.substr(pageName.indexOf("."), pageName.length);
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
        if (!currentQuery) {
            currentQuery = "";
        }
        let currentQueryValue = findURLValue(currentQuery, "query", true);
        let pageQueryValue = findURLValue(pageQuery, "query", true);
        if (currentPage && ((pageName == currentPage && pageName != "/search") || (pageName == "/search" && currentQueryValue == pageQueryValue && pageQueryValue != ""))) {
            // TODO: Remove when I know it's not going to break everything

            console.log("The user attempted to view the current page, and it was blocked.");
            return;
        }

        // Prevent users from viewing admin pages without having admin privilages
        if (!pageName.includes("admin")) {
            // Prevent users from going to the sign in/up page if they are signed in
            if (!pageName.includes("login") && !pageName.includes("signup")) {
                // Normal exit for all non admin and non auth pages
                getPage(pageName, goingBack, searchResultsArray, pageHash, pageQuery).then(() => {
                    pageSetup(pageName, goingBack, searchResultsArray, pageHash, pageQuery).then(() => {
                        resolve();
                    });
                });
            } else {
                // TODO: Might have broken reauth.
                if (firebase.auth().currentUser != null) {
                    goToPage("");
                    return;
                } else {
                    // Normal exit for login and signup
                    getPage(pageName, goingBack, searchResultsArray, pageHash, pageQuery).then(() => {
                        pageSetup(pageName, goingBack, searchResultsArray, pageHash, pageQuery).then(() => {
                            resolve();
                        });
                    });
                }
            }
        } else {
            isAdminCheck(true).then((isAdmin) => {
                if (isAdmin) {
                    // Normal exit for all admin pages
                    getPage(pageName, goingBack, searchResultsArray, pageHash, pageQuery).then(() => {
                        pageSetup(pageName, goingBack, searchResultsArray, pageHash, pageQuery).then(() => {
                            resolve();
                        });
                    });
                } else {
                    goToPage("");
                }
            }).catch((error) => {
                console.error("error in admin check", error);
                return;
            });
        }



        isAdminCheck(currentPage == "/login" ? true : false).catch((error) => {
            console.error(error);
        }).then((result) => {
            if (result && $("#admin-link").html() == "") {
                $("#admin-link").html("Admin Dashboard");
            }
        });
    })).then(() => {
        // Will Run after goToPage resolves
        $("#cover").hide();
        $("body").addClass("fade");
        $("body").css("overflow", "");
    }).catch((error) => {
        console.error("goToPage function failed: " + error);
    });
}

function getPage(pageName, goingBack, searchResultsArray, pageHash, pageQuery) {
    return new Promise((resolve) => {
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
                    $("#content").addClass("fade");
                }


                var pageUrl = pageName;
                if (pageUrl == "/index.html" || pageUrl == "/index" || pageUrl == "/main" || pageUrl == "/main.html") {
                    pageUrl = "../";
                }

                // The account pages handle their own states because they are panels
                if (!goingBack && !pageName.includes("account")) {
                    window.history.pushState({}, "", pageUrl + pageQuery + pageHash);
                }

                $("#content").html(xhttp.responseText);
                // Remove Placeholder Height
                $("#content").css("height", "100%");

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
                };

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
                };

                // Get an array of currently loaded Additional Resources like JS and CSS
                // Iterate through the currently loaded css files
                $('head > link.appended').each(() => {
                    // Get the href attribute of the link tag
                    var href = $(this)[0].attributes.href.value;
                    // If the source isn't in the list of loaded scoures, add it.
                    if (!loadedSources.includes(href.substr(href.lastIndexOf('/') + 1, href.length))) {
                        loadedSources.push(href.substr(href.lastIndexOf('/') + 1, href.length));
                    }
                });
                // Iterate though the currently loaded js files
                $('body > script.appended').each(() => {
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
                    for (let i = 0; i < sourcesForPage.length; i++) {
                        // If the source hasn't already been loaded.
                        if (!loadedSources.includes(sourcesForPage[i])) {
                            // If the source is a js file:
                            if (sourcesForPage[i].substr(sourcesForPage[i].indexOf("."), sourcesForPage[i].length) == ".js") {
                                // $('body').append('<script src="/js/' + sourcesForPage[i] + '" class="appended">');
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
                resolve();
            }
        };
    });
}

function pageSetup(pageName, goingBack, searchResultsArray, pageHash, pageQuery) {
    return new Promise((resolve) => {
        // Scroll to a specific part of the page if needed
        // If no hash, scroll to the top of the page.
        if (pageHash) {
            document.querySelector(pageHash)?.scrollIntoView();
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
            setCurrentPanel(null);
        }

        if (pageName == "/admin/main") {
            setupAdminMain();
        }

        if (pageName == "/admin/editEntry") {
            setupEditEntry(pageQuery);
        }

        if (pageName == "/admin/editUser") {
            setupEditUser();
        }

        if (pageName == "/admin/view") {
            setupView(pageQuery);
        }

        if (pageName == "/admin/report") {
            setupReport(pageQuery);
        }

        if (pageName == "/admin/inventory") {
            setupInventory();
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


        setCurrentPage(pageName);
        currentQuery = pageQuery;
        // Ideally this doesn't resolve until everything is redrawn... Not sure if that's how it's going to work
        resolve();
    });
}

// Catch History Events such as forward and back and then go to those pages
window.onpopstate = function () {
    handleHistoryPages();
};

function handleHistoryPages() {
    let path = document.location.pathname.substring(1);
    let search = document.location.search;
    let hash = document.location.hash;
    goToPage(path + search + hash, true);
}

export function changePageTitle(newTitle, append = true) {
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


const firebaseConfig = {
    apiKey: "AIzaSyAsQp9MoNHpx_082eyH4gi-K-M1v1YGzKU",
    authDomain: "south-church-library.firebaseapp.com",
    databaseURL: "https://south-church-library.firebaseio.com",
    projectId: "south-church-library",
    storageBucket: "south-church-library.appspot.com",
    messagingSenderId: "695036619849",
    appId: "1:695036619849:web:5e99fa7a4f64cec2daa398",
    measurementId: "G-MRXNED32DZ"
};

/**
 * initApp handles setting up UI event listeners and registering Firebase auth listeners:
 *  - firebase.auth().onAuthStateChanged: This listener is called when the user is signed in or
 *    out, and that is where we update the UI.
 */
function initApp() {
    // Initialize Firebase
    setApp(initializeApp(firebaseConfig));
    firebase.initializeApp(firebaseConfig);
    /* Remove this comment when compat version is gone (then actually setup analytics...)
    const analytics = getAnalytics(app);*/
    setDb(firebase.firestore());
    // Listening for auth state changes.
    return /** @type {Promise<void>} */(new Promise(function (resolve, reject) {
        try {
            firebase.auth().onAuthStateChanged(function (user) {
                if (user) {
                    // User is signed in.
                    console.log("User is now Signed In.");
                    var date = new Date();
                    db.collection("users").doc(user.uid).update({
                        lastSignIn: date
                    }).catch((error) => {
                        console.warn("The last sign in time could not be updated, likely not a problem if the user just signed up.");
                        if (error) console.warn(error);
                    });
                } else {
                    // User is signed out.
                    console.log("User is now Signed Out.");
                }
                updateUserAccountInfo();
                resolve();
            });
        } catch (err) {
            reject(err);
        }
    }));
}

export function updateUserAccountInfo() {
    var user = firebase.auth().currentUser;
    if (user) {
        // User is signed in.
        db.collection("users").doc(user.uid).onSnapshot((doc) => {
            if (!doc.exists) {
                console.error("The user document could not be found. Ignore if the user just signed up.");
                return;
            }
            $("#account-name").text(doc.data().firstName + " " + doc.data().lastName);
            $("#account-page-name").text(doc.data().firstName + " " + doc.data().lastName);
        }, (error) => {
            console.log("The User Document is no longer listening for updates:");
            console.error(error);
        });

        var email = user.email;
        updateEmail(email);
        var emailVerified = user.emailVerified;
        var photoURL = user.photoURL;
        if (photoURL != null) {
            $("#small-account-image").attr("src", photoURL);
            $("#large-account-image").attr("src", photoURL);
        }
        if (!emailVerified) {
            // User's email is not verified
        }

        // Change Account Container Appearence
        $("#nav-login-signup").hide();
        $("#small-account-container").show();
        $("#large-account-image").show();
        $("#large-account-image").show();
        $("#account-email").show();
        $("#account-settings").show();
        $("#log-out").html("<a>Log Out</a>").css("width", "50%").attr("onclick", "javascript:signOut();");
    } else {
        // User is signed out.

        // Change Account Container Appearence
        $("#nav-login-signup").show();
        $("#small-account-container").hide();
        $("#large-account-image").hide();
        $("#account-email").hide();
        $("#account-name").html("No user signed in");
        $("#account-settings").hide();
        $("#log-out").html("<a href=\"login.html\">Log In</a>").css("width", "100%").attr("onclick", "");
    }

}

export function updateEmail(email) {
    email = email.substr(0, email.indexOf("@")) + "\u200B" + email.substr(email.indexOf("@"), email.length);
    $("#account-email").text(email);
    $("#account-page-email").text(email);
}

function signOut() {
    if (firebase.auth().currentUser) {
        firebase.auth().signOut();
        /* could change 'replace' to 'href' if we wanted to keep the page in the history */
        window.location.replace("/");
    } else {
        alert("No user is currently signed in.");
    }
}


console.log("ajax.js has Loaded!");
