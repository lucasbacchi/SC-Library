// Imports for Firebase version 9
import { initializeApp } from "firebase/app";
import { getPerformance, trace } from "firebase/performance";
import { getAnalytics, logEvent } from "firebase/analytics";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { onCLS, onFID, onLCP, onTTFB } from 'web-vitals';


import {
    currentPage, db, directory, app, setApp, setCurrentPage, setCurrentPanel,
    setDb, setPerformance, setStorage, setAnalytics, analytics, setAuth, auth, setCurrentQuery,
    currentQuery, historyManager, setHistoryManager, setCurrentHash, currentHash, performance, User
} from "./globals";
import { findURLValue, openModal } from "./common";


// eslint-disable-next-line no-unused-vars
var url = window.location.href;
var path = window.location.pathname;
var query = window.location.search;
var hash = window.location.hash;
var fullExtension = path + query + hash;


// This is the first thing to run. It initializes everything and goes to the correct page when the page loads
$(() => {
    initApp().then(() => {
        setupIndex();
        setHistoryManager(window.history.state);
        goToPage(fullExtension.substring(1), true);
        historyManager.first(fullExtension.substring(1));
    }).catch((error) => {
        console.error(error);
    });
});


/**
 * @description This funciton runs whenever a click event is triggered on the page.
 * @param {Event} event The click event that was intercepted.
 */
function interceptLinkClick(event) {
    let target = event.target;

    // If the target is not a link tag, then find the closest link tag
    if (target.tagName != "A") {
        target = target.closest("a");
    }
    // If the target was not a link, and it couldn't find a link, return
    if (!target) {
        return;
    }

    // If the link has no href, then return
    let href = target.getAttribute("href");
    if (!href) {
        return;
    }

    // If the link is not to the same host, then return - Allow External Links
    const temp = document.createElement("a");
    temp.href = href;
    if (temp.host != window.location.host) {
        return;
    }

    // Tell the browser not to respond to the link click
    event.preventDefault();
    goToPage(target.getAttribute("href"));
}


/**
 * @description This sets up all the event listeners for the page frame.
 */
function setupIndex() {
    // Listen for link click events at the document level
    if (document.addEventListener) {
        document.addEventListener('click', interceptLinkClick);
    } else if (document.attachEvent) {
        document.attachEvent('onclick', interceptLinkClick);
    }

    // Listen to see when the Material Symbols have loaded (It's a huge file)
    let fontChecker = setInterval(() => {
        $(".material-symbols-outlined").css("opacity", "0");
        $(".material-symbols-outlined").css("width", "40px");
        let status = document.fonts.check("12px Material Symbols Outlined");
        if (status) {
            $(".material-symbols-outlined").css("opacity", "");
            $(".material-symbols-outlined").css("width", "");
            clearInterval(fontChecker);
        }
    }, 100);

    // Set up on click for header search button
    $("#header-search-button").on("click", () => {
        headerSearch();
    });

    // Set up listener for Enter key on header search bar
    $("#header-search-input").on("keydown", (event) => {
        if (event.key === "Enter") {
            headerSearch();
        }
    });

    // Set up on click for log out button
    $("div#log-out").on("click", () => {
        signOutUser();
    });

    // Manage Menu Button event listener
    $("#hamburger-button").on("click", () => {
        openNavMenu();
    });

    // Manage Menu Close Button event listener
    $("#close-button").on("click", () => {
        closeNavMenu();
    });

    // Keyboard Acessibility
    $("div#log-out").on("keydown", (event) => {
        if (event.key != "Enter") {
            return;
        }
        signOutUser();
    });
    $("#hamburger-button").on("keydown", (event) => {
        if (event.key != "Enter") {
            return;
        }
        openNavMenu();
    });
    $("#close-button").on("keydown", (event) => {
        if (event.key != "Enter") {
            return;
        }
        closeNavMenu();
    });

    // Manage Nav Links when screen gets small
    $(window).on("resize", () => {
        let width = window.innerWidth;
        if (width > 570) {
            $("nav").css("transition", "");
            $("nav").width("fit-content");
        }
        if (width <= 570) {
            $("nav").width("0");
            $("nav").css("transition", "0.5s");
        }
    });

    // Manage Account Panel and animation
    $("#small-account-container").on("click", () => {
        if ($("#large-account-container").css("display") == "none") {
            $("#large-account-container").css("right", "-500%"); // Set the right to -500% so it can animate in
            $("#large-account-container").show(0).delay(10);
            $("#large-account-container").css("right", "16px");
        } else {
            closeLargeAccount();
        }

    });
    // Keyboard Acessibility
    $("#small-account-container").on("keydown", (event) => {
        if (event.key != "Enter") {
            return;
        }
        if ($("#large-account-container").css("display") == "none") {
            $("#large-account-container").css("right", "-500%"); // Set the right to -500% so it can animate in
            $("#large-account-container").show(0).delay(10);
            $("#large-account-container").css("right", "16px");
        } else {
            closeLargeAccount();
        }

    });

    // Watch for clicks outside of the account panel
    $(window).on("click", (event) => {
        // If the click is not contained in the account panel or is the event panel itself
        // and isn't the small account container (Which will toggle itself), close it
        if ((!($.contains($("#large-account-container")[0], event.target) ||
            event.target == $("#large-account-container")[0])) && (!($.contains($("#small-account-container")[0], event.target) || event.target == $("#small-account-container")[0]))) {
            closeLargeAccount();
        }
    });

    // Watch the scroll status of the page and change the nav bar drop shadow accordingly
    $(window).on("scroll", () => {
        if ($(document).scrollTop() > 0) {
            $("header").css("box-shadow", "0px -7px 16px 5px var(--teal)");
        } else {
            $("header").css("box-shadow", "");
        }
    });

    // Setup a ResizeObserver to watch for changes in content div
    let contentDiv = document.getElementById("content");
    let contentDivObserver = new ResizeObserver(() => {
        let contentHeight = contentDiv.offsetHeight;
        let minHeight = window.innerHeight - $("#header-spacer").height() - $("#footer-spacer").height() - 21;
        if (contentHeight < minHeight) {
            contentHeight = minHeight;
        }
        $("#index-content-container").css("height", contentHeight);
    });
    contentDivObserver.observe(contentDiv);
}

/**
 * @description This function searches for the query in the header search bar.
 */
function headerSearch() {
    let query = $("#header-search-input").val();
    if (query == "") {
        return;
    }
    goToPage("search?query=" + query);
}


/**
 * @description Closes the large account panel
 */
function closeLargeAccount() {
    $("#large-account-container").delay(400).hide(0);
    $("#large-account-container").css("right", "-500%");
}

/**
 * @description Closes the mobile nav menu.
 */
function closeNavMenu() {
    $("nav").css("transition", "0.5s");
    $("nav").width("0");
}

/**
 * @description Opens the mobile nav menu.
 */
function openNavMenu() {
    $("nav").css("transition", "0.5s");
    $("nav").width("60%");
}

let isAdmin;
/**
 * @description This function checks if the user is an admin. It returns a promise that resolves to true if the user is an admin and false if they are not.
 * @param {Boolean} recheck If true, the function will recheck if the user is an admin using the database. If false, the function will return the cached value.
 * @returns {Promise<Boolean>} A promise that resolves to true if the user is an admin and false if they are not.
 */
export function isAdminCheck(recheck = false) {
    return new Promise((resolve) => {
        if (isAdmin == null || recheck) {
            getDoc(doc(db, "admin", "private_vars")).then(() => {
                isAdmin = true;
                resolve(true);
            }).catch(() => {
                isAdmin = false;
                resolve(false);
            });
        } else {
            resolve(isAdmin);
        }
    });
}

/**
 * Called every time the user wants to go to a new page. The function checks if the page change is valid.
 * If the page change is valid, the function will go to the new page by calling getPage().
 * @param {String} pageName The name of the page to go to.
 * @param {Boolean} goingBack Whether the user is going forward or backward in the history. (Prevents new history entries)
 * @param {Boolean} bypassUnload Whether to bypass the unload event.
 * @returns {Promise<void>} A promise representing the loading progress of the page.
 */
export function goToPage(pageName, goingBack = false, bypassUnload = false) {
    return new Promise((resolve, reject) => {
        let pageHash = "";
        let pageQuery = "";

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
            pageName = pageName.substring(0, pageName.indexOf("."));
        }

        // This removes an ending slash if one was mistakenly included
        if (pageName.length > 1 && pageName.substring(pageName.length - 1) == "/") {
            pageName = pageName.substring(0, pageName.length - 1);
            console.warn("The page name '" + pageName + "' had an ending slash. This was removed automatically.");
        }

        // This removes a leading slash if one was mistakenly included
        if (pageName.substring(0, 1) == "/") {
            pageName = pageName.substring(1, pageName.length);
        }

        if (pageName == "" || pageName == "index.html" || pageName == "index") {
            pageName = "main";
        }

        if (pageName == "admin") {
            pageName = "admin/main";
        }

        // Prevent users from going to the same page (just don't reload the content if you do)
        if (!currentQuery) {
            setCurrentQuery("");
        }
        if (!currentHash) {
            setCurrentHash("");
        }
        let currentQueryValue = findURLValue(currentQuery, "query", true);
        let pageQueryValue = findURLValue(pageQuery, "query", true);
        if (currentPage && ((pageName == currentPage && pageName != "search")
            || (pageName == "search" && currentQueryValue == pageQueryValue && pageQueryValue != ""))
            && (pageName + pageQuery + pageHash == currentPage + currentQuery + currentHash)) {
            reject("The user attempted to view the current page.");
            return;
        }

        // Prevent the user from visiting the auth pages if they are already logged in
        if (pageName.includes("login") || pageName.includes("signup")) {
            if (auth.currentUser != null && findURLValue(pageQuery, "redirect", true) == "") {
                openModal("error", "You can't visit the login or signup pages while you're logged in.");
                reject("User is already logged in.");
                goToPage("");
                return;
            }
        }

        // At this point, the user is going somewhere, but we don't know if they are allowed to go to admin pages yet
        // If there is any reason for the user to not leave a page, then it will reject.
        if (!bypassUnload) {
            let cancelEvent = !window.dispatchEvent(new Event("beforeunload", { cancelable: true }));

            if (cancelEvent) {
                reject("Cancelled by BeforeUnload Event");
                $("#content").removeClass("page-hidden");
                return;
            }
        }

        let delayTimer;
        let adminCheck;
        // Temporarily hide the content while the page is loading
        // Don't hide the content if the user is going between two account pages.
        if (currentPage && currentPage != pageName && !(currentPage.includes("account") && pageName.includes("account"))) {
            $("#content").addClass("page-hidden");
            $("#content").removeClass("fade");
            if (!goingBack) {
                $("html").css("scroll-behavior", "auto");
                $("html, body").animate({ scrollTop: 0 }, 600);
                setTimeout(() => {
                    $("html").css("scroll-behavior", "smooth");
                }, 600);
            }
            delayTimer = new Promise((resolve) => {
                setTimeout(() => {
                    resolve();
                }, 300);
            });
        }

        // Prevent the user from visiting admin pages if they are not an admin
        if (pageName.includes("admin")) {
            adminCheck = isAdminCheck(true);
        }

        Promise.all([delayTimer, adminCheck]).then((values) => {
            let isAdmin = values[1];
            if (pageName.includes("admin") && !isAdmin) {
                reject("User is not an admin.");
                goToPage("");
                return;
            }
            getPage(pageName, goingBack, pageHash, pageQuery).then(() => {
                pageSetup(pageName, goingBack, pageHash, pageQuery).then(() => {
                    resolve();
                });
            });
        });
    }).then(() => {
        // Will Run after goToPage resolves
        $("#cover").hide();
        $("body").addClass("fade");
        $("body").css("overflow", "");
    }).catch((error) => {
        if (error == "Cancelled by BeforeUnload Event") {
            console.log("goToPage function cancelled by BeforeUnload Event");
        } else if (error == "User is already logged in.") {
            console.log("goToPage function cancelled because the user is already logged in.");
        } else if (error == "User is not an admin.") {
            console.log("goToPage function cancelled because the user is not an admin.");
        } else if (error == "The user attempted to view the current page.") {
            console.log("goToPage function cancelled because the user attempted to view the current page.");
        } else {
            console.error("goToPage function failed: " + error);
        }

        // Trigger catch in the history function
        if (goingBack) {
            return Promise.reject();
        }
    });
}

/**
 * @description This function loads the page content and handles titles and history.
 * @param {String} pageName The name of the page to load.
 * @param {Boolean} goingBack A boolean that determines if the user is going back in the history.
 * @param {String} pageHash The hash of the page to load.
 * @param {String} pageQuery The query of the page to load.
 * @returns {Promise<void>} A promise that represents the loading prgress of the page.
 */
function getPage(pageName, goingBack, pageHash, pageQuery) {
    return new Promise((resolve, reject) => {
        // Prepare the page for loading
        if (window.innerWidth <= 570) {
            closeNavMenu();
        }
        closeLargeAccount();


        // If the user is going to a different panel on the account page, handle it with the other function and return.
        if (currentPage == "account" && pageName == "account") {
            import('./account').then(({ goToSettingsPanel }) => {
                goToSettingsPanel(pageQuery.substring(1), goingBack).catch((error) => {
                    reject(error);
                });
                setCurrentQuery(pageQuery);
                setCurrentHash(pageHash);
                if (goingBack == false) {
                    // Update the URL and History for all but the first page load
                    historyManager.push("account?" + pageQuery.substring(1));
                }
                resolve();
            }).catch((error) => {
                reject(console.error("Problem importing", error));
            });
            return;
        }

        // Start getting the page
        const xhttp = new XMLHttpRequest();
        if (directory.includes(pageName)) {
            xhttp.open("GET", "/content/" + pageName + ".html", true); // removed sending the hash/query (I don't see why we'd need the server to know it...)
        } else {
            xhttp.open("GET", "/content/404.html", true);
        }
        xhttp.send();

        xhttp.timeout = 5000;
        xhttp.ontimeout = (event) => {
            reject();
            console.error(event);
        };

        // Set the content of the page
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                let pageUrl = "/" + pageName;
                if (pageUrl == "/index.html" || pageUrl == "/index" || pageUrl == "/main" || pageUrl == "/main.html") {
                    pageUrl = "/";
                }

                if (!goingBack) {
                    historyManager.push(pageUrl.substring(1) + pageQuery + pageHash);
                }

                $("#content").html(xhttp.responseText);

                // Set Title Correctly
                let titleList = {
                    "admin/editEntry": "Edit an Entry",
                    "admin/main": "Admin Console",
                    "admin/report": "Run a Report",
                    "admin/barcode": "Generate Barcodes",
                    "admin/view": "View Database",
                    "admin/editUser": "Edit a User",
                    "admin/inventory": "Conduct Inventory",
                    "admin/help": "Admin Help",
                    "404": "404 | Page Not Found",
                    "about": "About Us",
                    "account": "Your Account",
                    "advancedSearch": "Advanced Search",
                    "help": "Help",
                    "login": "Login",
                    "main": "Home",
                    "result": "Search Result", // This will get changed on the page to be specific to the title.
                    "search": "Search Results",
                    "signup": "Signup",
                    "sitemap": "Sitemap"
                };

                // Add Titles baseed on page Name
                if (titleList[pageName] != undefined) {
                    changePageTitle(titleList[pageName], false);
                } else if (pageUrl == "/") {
                    changePageTitle("Home", false);
                } else {
                    document.title = "South Church Library Catalog";
                }

                resolve();
            }
        };
    });
}

/**
 * @description This function fires additional scripts based on the page that was loaded.
 * @param {String} pageName The name of the page.
 * @param {Boolean} goingBack A boolean that represents if the user is going back in the history.
 * @param {String} pageHash The hash of the page.
 * @param {String} pageQuery The query of the page.
 * @returns {Promise<void>} A promise that represents the setup progress of the page.
 */
function pageSetup(pageName, goingBack, pageHash, pageQuery) {
    return new Promise((resolve) => {
        // No function for help, autogenindex, about, advancedsearch, or 404 so just resolve
        if (pageName == "help" || pageName == "about" || pageName == "advancedsearch" || pageName == "404") {
            resolve();
        }

        else if (pageName == "main") {
            import('./main').then(({ setupMain }) => {
                setupMain();
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        else if (pageName == "login" || pageName == "signup") {
            import('./signIn').then(({ setupSignIn }) => {
                setupSignIn(pageQuery);
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });

        }

        else if (pageName == "search") {
            import('../css/search.css');
            import('./search').then(({ setupSearch }) => {
                setupSearch(pageQuery);
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        else if (pageName == "result") {
            import('../css/search.css');
            import('./search').then(({ setupResultPage }) => {
                setupResultPage(pageQuery);
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        // Need a special case for the account page because we have to travel to subpages without calling setup multiple times.
        else if (pageName == "account" && currentPage != "account") {
            import('../css/account.css');
            import('./account').then(({ setupAccountPage }) => {
                setupAccountPage(pageQuery, goingBack);
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        } else if (pageName == "account" && currentPage == "account") {
            resolve();
        }

        else if (pageName == "admin/main") {
            import('../css/admin.css');
            import('./admin').then(({ setupAdminMain }) => {
                setupAdminMain();
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        else if (pageName == "admin/editEntry") {
            import('../css/form.css');
            import('../css/admin.css');
            import('./editEntry').then(({ setupEditEntry }) => {
                setupEditEntry(pageQuery);
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        else if (pageName == "admin/editUser") {
            import('../css/form.css');
            import('../css/admin.css');
            import('./admin').then(({ setupEditUser }) => {
                setupEditUser();
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        else if (pageName == "admin/view") {
            import('../css/admin.css');
            import('../css/search.css');
            import('./admin').then(({ setupView }) => {
                setupView(pageQuery);
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        else if (pageName == "admin/report") {
            import('../css/admin.css');
            import('./report').then(({ setupReport }) => {
                setupReport(pageQuery);
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        else if (pageName == "admin/inventory") {
            import('../css/admin.css');
            import('./admin').then(({ setupInventory }) => {
                setupInventory();
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        else if (pageName == "admin/barcode") {
            import('../css/admin.css');
            import('./admin').then(({ setupBarcodePage }) => {
                setupBarcodePage();
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        else if (pageName == "admin/help") {
            import('../css/admin.css');
            import('./admin').then(({ setupAdminHelp }) => {
                setupAdminHelp();
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        else if (pageName == "sitemap") {
            import('./sitemap').then(({ setupSitemap }) => {
                setupSitemap();
                resolve();
            }).catch((error) => {
                console.error("Problem importing", error);
            });
        }

        else {
            console.error("No setup function for page: " + pageName);
            resolve();
        }
    }).then(() => {
        // Page Content has now Loaded and setup is done

        // Change Index Page Frame if needed
        if (pageName != "result") {
            $("#header-search-input").val(findURLValue(pageQuery, "query", true));
        }

        // Start fading the page in
        if (currentPage != pageName) {
            window.setTimeout(() => {
                $("#content").removeClass("page-hidden");
                $("#content").addClass("fade");
            }, 100);
        }

        // Scroll to a specific part of the page if needed
        if (pageHash && $(pageHash).length > 0) {
            pageHash = "#" + encodeURIComponent(pageHash.substring(1));
            setTimeout(() => {
                $(document).scrollTop($(pageHash).offset().top - 90);
            }, 350);
        }

        if (pageName != "account") {
            setCurrentPanel(null);
        }
        setCurrentPage(pageName);
        setCurrentQuery(pageQuery);
        setCurrentHash(pageHash);
    });
}

// Catch History Events such as forward and back and then go to those pages
window.onpopstate = () => {
    if (historyManager.currentIndex == window.history.state.index) {
        // If the current index is the same as the state index, then we haven't moved
        // forward or back in the history. This could be a beforeunload event.
        return;
    }

    let path = document.location.pathname.substring(1);
    let search = document.location.search;
    let hash = document.location.hash;

    goToPage(path + search + hash, true).then(() => {
        if (historyManager.currentIndex - 1 == window.history.state.index) {
            historyManager.currentIndex--;
        } else if (historyManager.currentIndex + 1 == window.history.state.index) {
            historyManager.currentIndex++;
        }

        // Give the past knowlege of the future
        window.history.replaceState({ stack: historyManager.stack, index: historyManager.currentIndex }, null);
    }).catch(() => {
        restoreHistory();
    });
};

/**
 * @description In the event that a navigation action was cancelled, we need to reset the history state
 */
function restoreHistory() {
    // Figure out which direction we need to go to get back to the original page
    if (historyManager.currentIndex != window.history.state.index) {
        if (historyManager.currentIndex > window.history.state.index) {
            // We're going backwards
            window.history.forward();
        } else {
            // We're going forwards
            window.history.back();
        }
    }
}

/**
 * @description Changes the title of the page, or appends to the beginning of the current title.
 * @param {String} newTitle The new title of the page. If empty, the title will be reset to the default.
 * @param {Boolean} append Defaults to true. If true, the new title will be appended to the beginning of the current title. 
 */
export function changePageTitle(newTitle, append = true) {
    if (newTitle == "") {
        document.title = "South Church Library Catalog";
    } else {
        if (append) {
            let currentTitle = document.title;
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
    // TODO: Low Priority: Try to get FID to work nativly rather than using a custom trace
    onCLS(sendToFirebase);
    onFID(sendToFirebase);
    onLCP(sendToFirebase);
    onTTFB(sendToFirebase);

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
    return new Promise((resolve, reject) => {
        try {
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    // User is signed in.
                    console.log("User is signed in.");

                    // If remember me was not checked, start a timer to detect inactivity
                    if (user.auth.persistenceManager.persistence.type == "SESSION") {
                        startLogoutTimer();
                        // Sets event listeners for the logout timer
                        $(window).on("mousemove", resetLogoutTimer);
                        $(window).on("keypress", resetLogoutTimer);
                        $(window).on("click", resetLogoutTimer);
                        $(window).on("scroll", resetLogoutTimer);
                        $(window).on("touchmove", resetLogoutTimer); // This is for mobile
                    }

                    // If user has just signed in, don't bother updating info a second time
                    // TODO: maybe add something to do with time since last page load?
                    let millisecondsSinceSignup = new Date().getTime() - new Date(user.metadata.creationTime).getTime();
                    if (millisecondsSinceSignup < 30000) {
                        resolve();
                        return;
                    }

                    let date = new Date();
                    updateDoc(doc(db, "users", user.uid), {
                        lastSignInTime: date
                    }).catch((error) => {
                        console.warn("The last sign in time could not be updated, likely not a problem if the user just signed up.");
                        if (error) console.warn(error);
                    });

                    // Check if the user is an admin and add the Admin Dashboard link if they are
                    isAdminCheck(true).then((result) => {
                        if (result && $("#admin-link").html() == "") {
                            $("#admin-link").html("Admin Dashboard");
                        }
                    });
                } else {
                    // User is signed out.
                    console.log("User is signed out.");
                    stopLogoutTimer();
                }
                updateUserAccountInfo().then(() => {
                    resolve();
                }).catch(() => {
                    openModal("error", "Please contact an administrator for support.", "Error Logging In");
                    signOut(auth).then(() => {
                        window.location.href = "/";
                    });
                });
            });
        } catch (err) {
            reject(err);
        }
    });
}

let worker;
/**
 * @description Starts a timer to log the user out after inactivity (if "Remember me" was not checked).
 */
function startLogoutTimer() {
    // If the user is not active for 5 minutes, log them out
    if (!window.Worker) {
        console.warn("Web Workers are not supported in this browser. The logout timer will not work.");
        return;
    }
    // Prevent multiple workers from being created
    if (worker) {
        return;
    }

    // Create the worker
    worker = new Worker(new URL("./logoutTimer.js", import.meta.url));
    // Start the worker
    worker.postMessage("start");
    // Listen for messages from the workers
    worker.onmessage = (event) => {
        if (event.data.command == "logout") {
            signOut(auth).then(() => {
                window.location.href = "/";
            });
        } else if (event.data.command == "show") {
            // Stop the active event listerners so the user can interact with the modal
            $(window).off("mousemove", resetLogoutTimer);
            $(window).off("keypress", resetLogoutTimer);
            $(window).off("click", resetLogoutTimer);
            $(window).off("scroll", resetLogoutTimer);
            $(window).off("touchmove", resetLogoutTimer);
            let timeRemaining = event.data.timeRemaining;
            openModal("issue", "To protect your account, you will be logged out soon unless you interact with the page.<br><br><span id=\"logout-time-remaining\">5:00</span> ",
                "Are you still there?", "Stay Logged In", () => {
                    worker.postMessage("reset");
                    // Sets event listeners for the logout timer
                    $(window).on("mousemove", resetLogoutTimer);
                    $(window).on("keypress", resetLogoutTimer);
                    $(window).on("click", resetLogoutTimer);
                    $(window).on("scroll", resetLogoutTimer);
                    $(window).on("touchmove", resetLogoutTimer); // This is for mobile
                }, "Log Out", () => {
                    signOut(auth).then(() => {
                        window.location.href = "/";
                    });
                });
            $("#logout-time-remaining").css("font-weight", "bold");
            $("#logout-time-remaining").css("font-size", "24px");
            $("#logout-time-remaining").css("text-align", "center");
            $("#logout-time-remaining").parent().css("display", "grid");
            $("#logout-time-remaining").html(Math.floor(timeRemaining / 60) + ":" + (timeRemaining % 60 < 10 ? "0" : "") + timeRemaining % 60);
        } else if (event.data.command == "update") {
            let timeRemaining = event.data.timeRemaining;
            $("#logout-time-remaining").html(Math.floor(timeRemaining / 60) + ":" + (timeRemaining % 60 < 10 ? "0" : "") + timeRemaining % 60);
        }
    };
}

/**
 * @description Stops the logout timer.
 */
function stopLogoutTimer() {
    if (!worker) {
        return;
    }
    worker.postMessage("stop");
}

/**
 * @description Resets the logout timer. This is called every time the user interacts with the page.
 */
function resetLogoutTimer() {
    if (!auth.currentUser) {
        return;
    }
    worker.postMessage("reset");
}

/**
 * Send Core Web Vitals to Firebase
 * @param {Metric}
 * @return {void}
 * @author Kazunari Hara
 * @link Source: https://gist.github.com/herablog/f04f473b9d9a8f63848f63ce0aec3eff
 */
function sendToFirebase({ name, delta, entries }) {
    const metricNameMap = {
        CLS: 'Cumulative Layout Shift',
        LCP: 'Largest Contentful Paint',
        FID: 'First Input Delay',
        TTFB: 'Time To First Byte',
    };

    const startTime = Date.now();
    let value = Math.round(name === 'CLS' ? delta * 1000 : delta);
    if (value == 0) {
        value = 1;
    }

    entries.forEach(() => {
        trace(performance, metricNameMap[name]).record(
            startTime,
            value
        );
    });
}

/**
 * @description Updates the UI with the user's account information from the database.
 * @returns {Promise<void>} A promise that resolves when the user account info has been updated.
 */
export function updateUserAccountInfo() {
    return new Promise((resolve, reject) => {
        let user = auth.currentUser;
        if (user) {
            // User is signed in.
            // Get the information about the current user from the database.
            getDoc(doc(db, "users", user.uid)).then((docSnap) => {
                if (!docSnap.exists()) {
                    throw "The user document could not be found. Ignore if the user just signed up.";
                }

                let userObject = User.createFromObject(docSnap.data());

                // Update the UI with the information from the doc
                $("#account-name").text(userObject.firstName + " " + userObject.lastName);
                updateEmailinUI(userObject.email);
                if (userObject.pfpIconLink) {
                    $("#small-account-image").attr("src", userObject.pfpIconLink);
                    $("#large-account-image").attr("src", userObject.pfpIconLink);
                } else if (userObject.pfpLink) {
                    $("#small-account-image").attr("src", userObject.pfpLink);
                    $("#large-account-image").attr("src", userObject.pfpLink);
                } else {
                    $("#small-account-image").attr("src", "/img/default-user.jpg");
                    $("#large-account-image").attr("src", "/img/default-user.jpg");
                }

                // Update Firebase Auth with any out of date data
                updateProfile(user, {
                    displayName: userObject.firstName + " " + userObject.lastName,
                    photoURL: userObject.pfpLink
                });

                // Change Account Container Appearence
                $("#nav-login-signup").hide();
                $("#small-account-container").show();
                $("#large-account-image").show();
                $("#large-account-image").show();
                $("#account-email").show();
                $("#account-settings").show();
                $("#log-out").html("Log Out").css("width", "50%").on("click", () => {
                    signOutUser();
                }).on("keydown", (event) => {
                    // Keyboard accessibility
                    if (event.key != "Enter") {
                        return;
                    }
                    signOutUser();
                });
                resolve();
            }).catch((error) => {
                console.error("Could not get the user information from the database: ", error);
                reject(error);
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
            $("#log-out").html("<a href=\"/login.html\">Log In</a>").css("width", "100%").attr("onclick", "").off("click").off("keydown");
            resolve();
        }
    });
}

/**
 * @description Updates the email in the UI to be displayed with a zero width space in the middle of the email address.
 * @param {String} email A string containing the email address to be displayed.
 */
export function updateEmailinUI(email) {
    email = email.substring(0, email.indexOf("@")) + "\u200B" + email.substring(email.indexOf("@"), email.length);
    $("#account-email").text(email);
    $("#account-page-email").text(email);
}

/**
 * @description Signs the user out of the application. Then reloads the page.
 */
function signOutUser() {
    if (auth.currentUser) {
        signOut(auth).then(() => {
            // could change 'replace' to 'href' if we wanted to keep the page in the history
            window.location.replace("/");
        }).catch((error) => {
            openModal("error", "Unable to sign you out, please refresh the page and try again.");
            console.error(error);
        });
    } else {
        openModal("error", "Unable to sign you out. No user is currently signed in.");
    }
}


console.log("ajax.js has Loaded!");
