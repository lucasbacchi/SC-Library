// Imports for Firebase version 9
import { initializeApp } from "firebase/app";
import { getPerformance } from "firebase/performance";
import { getAnalytics, logEvent } from "firebase/analytics";
import { doc, getDoc, getFirestore, onSnapshot, updateDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, onAuthStateChanged, signOut } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";


import { currentPage, db, directory, loadedSources, app, setApp, setCurrentPage, setCurrentPanel,
    setDb, setPerformance, setStorage, setAnalytics, analytics, setAuth, auth, setCurrentQuery,
    currentQuery, historyStack, setHistoryStack } from "./globals";
import { findURLValue } from "./common";


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
            setupIndex();
            setHistoryStack(window.history.state);
            goToPage(fullExtension.substring(1), true);
            historyStack.first(fullExtension.substring(1));
        }, function (error) {
            console.error(error);
        });
});


// Runs on the first load of all pages to handle nav links

export let closeLargeAccount;
function setupIndex() {
    // Set up on click for log out button
    $("div#log-out").on("click", () => {
        signOutUser();
    });

    convertDataTagsToLinks();

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
            if (!($.contains($("#large-account-container")[0], event.target) || event.target == $("#large-account-container")[0])) {
                if (largeAccountOpen) {
                    closeLargeAccount();
                }
            }

        });
    }


    $(window).on("scroll", function () {
        if ($(document).scrollTop() > 0) {
            $("header").css("box-shadow", "0px -7px 16px 5px var(--teal)");
        } else {
            $("header").css("box-shadow", "");
        }
    });
}


export function convertDataTagsToLinks() {
    // Iterate through all the links and set an onclick
    document.querySelectorAll("a, div, button").forEach(element => {
        // The html tags each have a custom data tag telling where the link should go
        if (element.dataset.linkTarget) {
            $(element).on("click", () => {
                goToPage(element.dataset.linkTarget);
            });
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
            getDoc(doc(db, "admin", "private_vars")).then(() => {
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

export function goToPage(pageName, goingBack = false, searchResultsArray = null, bypassUnload = false) {
    return /** @type {Promise<void>} */(new Promise(function (resolve, reject) {
        var pageHash = "";
        var pageQuery = "";
        // Never Used: var pageExtension = "";

        // This removes the hash if one was passed in and stores it to a separate variable.
        if (pageName.includes("#")) {
            pageHash = pageName.substring(pageName.indexOf("#"), pageName.length);
            pageName = pageName.substring(0, pageName.indexOf("#"));
        }

        // This removes the query if one was passed in and stores it to a separate variable.
        if (pageName.includes("?")) {
            pageQuery = pageName.substring(pageName.indexOf("?"), pageName.length);
            pageName = pageName.substring(0, pageName.indexOf("?"));
        }

        // This removes the file extension if one was passed in.
        if (pageName.includes(".")) {
            // Never Used: pageExtension = pageName.substring(pageName.indexOf("."), pageName.length);
            pageName = pageName.substring(0, pageName.indexOf("."));
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
            setCurrentQuery("");
        }
        let currentQueryValue = findURLValue(currentQuery, "query", true);
        let pageQueryValue = findURLValue(pageQuery, "query", true);
        if (currentPage && ((pageName == currentPage && pageName != "/search")
            || (pageName == "/search" && currentQueryValue == pageQueryValue && pageQueryValue != ""))
            && (pageName + pageQuery == currentPage + currentQuery)) {
            // TODO: Remove when I know it's not going to break everything

            console.log("The user attempted to view the current page, and it was blocked.");
            return;
        }

        // If there is any reason for the user to not leave a page, then it will reject.
        if (!bypassUnload) {
            let cancelEvent = !window.dispatchEvent(new Event("beforeunload", { cancelable: true }));

            if (cancelEvent) {
                return reject("Cancelled by BeforeUnload Event");
            }
        }


        $("#content").removeClass("fade");
        if (window.innerWidth <= 570) {
            closeNavMenu();
        }
        closeLargeAccount();


        // If the user is going to a different pannel on the account page, handle it and return.
        if (currentPage == "/account" && pageName == "/account") {
            import('./account').then(({ goToSettingsPanel }) => {
                goToSettingsPanel(pageQuery.substring(1), goingBack);
                setCurrentQuery(pageQuery);
                if (goingBack == false) {
                    // Update the URL and History for all but the first page load
                    historyStack.push("account?" + pageQuery.substring(1));
                    window.history.pushState({stack: historyStack.stack, index: historyStack.currentIndex}, "", "account?" + pageQuery.substring(1));
                }
                resolve();
            }).catch((error) => {
                reject(console.error("Problem importing", error));
            });
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
                if (auth.currentUser != null) {
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
        if (error == "Cancelled by BeforeUnload Event") {
            console.log("goToPage function cancelled by BeforeUnload Event");
            // Trigger catch in the history function
            if (goingBack) {
                return Promise.reject();
            }
        } else {
            console.error("goToPage function failed: " + error);
        }
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
                    pageUrl = "/";
                }

                if (!goingBack) {
                    historyStack.push(pageUrl.substring(1) + pageQuery + pageHash);
                    window.history.pushState({stack: historyStack.stack, index: historyStack.currentIndex}, "", pageUrl + pageQuery + pageHash);
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
                } else if (pageUrl == "/") {
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
                $.each($('head > link.appended'), (index, value) => {
                    // Get the href attribute of the link tag
                    var href = value.attributes.href.value;
                    // If the source isn't in the list of loaded scoures, add it.
                    if (!loadedSources.includes(href.substring(href.lastIndexOf('/') + 1, href.length))) {
                        loadedSources.push(href.substring(href.lastIndexOf('/') + 1, href.length));
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
                            // If the source is a css file
                            if (sourcesForPage[i].substring(sourcesForPage[i].indexOf("."), sourcesForPage[i].length) == ".css") {
                                $('head').append('<link rel="stylesheet" href="/css/' + sourcesForPage[i] + '" type="text/css" class="appended">');
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
            import('./main').then(({ setupMain }) => {
                setupMain();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        if (pageName == "/login" || pageName == "/signup") {
            import('./signIn').then(({ setupSignIn }) => {
                setupSignIn(pageQuery);
            }).catch((error) => {
                console.error("Problem importing", error);
            });

        }

        if (pageName == "/search") {
            import('./search').then(({ setupSearch }) => {
                setupSearch(searchResultsArray, pageQuery);
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        if (pageName == "/result") {
            import('./search').then(({ setupResultPage }) => {
                setupResultPage(pageQuery);
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        if (pageName == "/account") {
            import('./account').then(({ setupAccountPage }) => {
                setupAccountPage(pageQuery, goingBack);
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        } else {
            setCurrentPanel(null);
        }

        if (pageName == "/admin/main") {
            import('./admin').then(({ setupAdminMain }) => {
                setupAdminMain();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        if (pageName == "/admin/editEntry") {
            import('./editEntry').then(({ setupEditEntry }) => {
                setupEditEntry(pageQuery);
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        if (pageName == "/admin/editUser") {
            import('./admin').then(({ setupEditUser }) => {
                setupEditUser();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        if (pageName == "/admin/view") {
            import('./admin').then(({ setupView }) => {
                setupView(pageQuery);
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        if (pageName == "/admin/report") {
            import('./report').then(({ setupReport }) => {
                setupReport(pageQuery);
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        if (pageName == "/admin/inventory") {
            import('./admin').then(({ setupInventory }) => {
                setupInventory();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        if (pageName == "/admin/barcode") {
            import('./admin').then(({ setupBarcodePage }) => {
                setupBarcodePage();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        if (pageName == "/sitemap") {
            import('./sitemap').then(({ setupSitemap }) => {
                setupSitemap();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        /* TRYING THIS IN A .THEN We'll see how that goes...
        // Give the CSS time to apply - FIX THIS METHODOLOGY
        setTimeout(function() {
            $("#cover").hide();
            $("body").addClass("fade");
            $("body").css('overflow', '');
        }, 200);*/


        setCurrentPage(pageName);
        setCurrentQuery(pageQuery);
        // Ideally this doesn't resolve until everything is redrawn... Not sure if that's how it's going to work
        resolve();
    });
}

// Catch History Events such as forward and back and then go to those pages
window.onpopstate = () => {
    if (historyStack.currentIndex == window.history.state.index) {
        // If the current index is the same as the state index, then we haven't moved
        // forward or back in the history. This could be a beforeunload event.
        return;
    }

    let path = document.location.pathname.substring(1);
    let search = document.location.search;
    let hash = document.location.hash;

    goToPage(path + search + hash, true).then(() => {
        if (historyStack.currentIndex - 1 == window.history.state.index) {
            historyStack.currentIndex--;
        } else if (historyStack.currentIndex + 1 == window.history.state.index) {
            historyStack.currentIndex++;
        }

        // Give the past knowlege of the future
        window.history.replaceState({stack:historyStack.stack, index:historyStack.currentIndex}, "");
    }).catch(() => {
        restoreHistory();
    });
};

// In the event that a navigation action was cancelled, we need to reset the history state
function restoreHistory() {
    if (historyStack.currentIndex != window.history.state.index) {
        if (historyStack.currentIndex > window.history.state.index) {
            // We're going backwards
            window.history.forward();
        } else {
            // We're going forwards
            window.history.back();
        }
    }
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
 *  - onAuthStateChanged: This listener is called when the user is signed in or
 *    out, and that is where we update the UI.
 */
function initApp() {
    // Initialize Firebase
    setApp(initializeApp(firebaseConfig));

    // Start firebase services and globalize them.
    // TODO: Start using analytics and performance properly
    setAnalytics(getAnalytics(app));
    logEvent(analytics, 'app_open');

    setPerformance(getPerformance(app));

    setDb(getFirestore(app));

    setStorage(getStorage(app));

    setAuth(getAuth(app));

    // Start App Check
    // eslint-disable-next-line
    const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider("6LcpTm0bAAAAALfsopsnY-5aX2BC7nAukEDHtKDu"),
        isTokenAutoRefreshEnabled: true
    });

    // Listening for auth state changes.
    return /** @type {Promise<void>} */(new Promise(function (resolve, reject) {
        try {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    // User is signed in.
                    console.log("User is now Signed In.");
                    var date = new Date();
                    updateDoc(doc(db, "users/" + user.uid), {
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
    var user = auth.currentUser;
    if (user) {
        // User is signed in.
        onSnapshot(doc(db, "users/" + user.uid), (doc) => {
            if (!doc.exists()) {
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
        updateEmailinUI(email);
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
        $("#log-out").html("<a>Log Out</a>").css("width", "50%").on("click", () => {
            signOutUser();
        });
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

export function updateEmailinUI(email) {
    email = email.substring(0, email.indexOf("@")) + "\u200B" + email.substring(email.indexOf("@"), email.length);
    $("#account-email").text(email);
    $("#account-page-email").text(email);
}

function signOutUser() {
    if (auth.currentUser) {
        signOut(auth).then(() => {
            // could change 'replace' to 'href' if we wanted to keep the page in the history
            window.location.replace("/");
        }).catch((error) => {
            alert("Unable to sign you out, please refresh the page and try again.");
            console.error(error);
        });
    } else {
        alert("Unable to sign you out. No user is currently signed in.");
    }
}


console.log("ajax.js has Loaded!");
