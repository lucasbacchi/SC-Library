import { initializeApp } from "firebase/app";
import { getPerformance, trace } from "firebase/performance";
import { getAnalytics, logEvent } from "firebase/analytics";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, onAuthStateChanged, signOut, updateProfile, type User } from "firebase/auth";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { onCLS, onLCP, onTTFB } from "web-vitals";

import {
    currentPage,
    db,
    directory,
    app,
    setApp,
    setCurrentPage,
    setCurrentPanel,
    setDb,
    setPerformance,
    setStorage,
    setAnalytics,
    analytics,
    setAuth,
    auth,
    setCurrentQuery,
    currentQuery,
    setCurrentHash,
    currentHash,
    performance,
    setBookDatabase,
    iDB,
    setIDB,
    setTimeLastSearched,
    Book,
    type BookDocument
} from "./globals";
import { getUser, openModal } from "./common";

// Shouldn't be needed anymore
// This is the first thing to run. It initializes everything and goes to the correct page when the page loads
// onReady(() => {
//     initApp()
//         .then(() => {
//             setupIndex();
//             setupIndexedDB();
//             setHistoryManager(window.history.state);
//             const page = window.location.pathname.substring(1) + window.location.search + window.location.hash;
//             goToPage(page, true).catch((error) => {
//                 if (error != "restoreHistory") {
//                     console.error("Problem with initial page load:", error);
//                 }
//             });
//             historyManager.first(page);
//         })
//         .catch((error) => {
//             console.error(error);
//         });
// });

// Shouldn't be needed anymore
/**
 * @description This funciton runs whenever a click event is triggered on the page.
 * @param {Event} event The click event that was intercepted.
 */
// function interceptLinkClick(event: any) {
//     let target = event.target;

//     // If the target is not a link tag, then find the closest link tag
//     if (target.tagName != "A") {
//         target = target.closest("a");
//     }
//     // If the target was not a link, and it couldn't find a link, return
//     if (!target) {
//         return;
//     }

//     // If the link has no href, then return
//     let href = target.getAttribute("href");
//     if (!href) {
//         return;
//     }

//     // If the link is not to the same host, then return - Allow External Links
//     const temp = document.createElement("a");
//     temp.href = href;
//     if (temp.host != window.location.host) {
//         return;
//     }

//     // Tell the browser not to respond to the link click
//     event.preventDefault();

//     // If href is just a hashtag, then don't do anything
//     if (href == "#") {
//         return;
//     }

//     // Add a leading slah if there isn't one
//     if (href.charAt(0) != "/") {
//         href = "/" + href;
//     }

//     // Handle link clicks with the control key to open in a new tab
//     if (event.ctrlKey) {
//         window.open(window.location.origin + href, "_blank");
//     } else {
//         goToPage(href);
//     }
// }

// Shouldn't be needed anymore
/**
 * @description This sets up all the event listeners for the page frame.
 */
// function setupIndex() {
//     // Listen for link click events at the document level
//     if (document.addEventListener) {
//         document.addEventListener("click", interceptLinkClick);
//     } else {
//         (document as any).attachEvent("onclick", interceptLinkClick);
//     }

//     // Listen to see when the Material Symbols have loaded (It's a huge file)
//     const fontChecker = setInterval(() => {
//         (document.querySelector(".material-symbols-outlined") as HTMLElement).style.setProperty("opacity", String("0"));
//         (document.querySelector(".material-symbols-outlined") as HTMLElement).style.setProperty("width", String("40px"));
//         const status = document.fonts.check("12px Material Symbols Outlined");
//         if (status) {
//             (document.querySelector(".material-symbols-outlined") as HTMLElement).style.setProperty("opacity", String(""));
//             (document.querySelector(".material-symbols-outlined") as HTMLElement).style.setProperty("width", String(""));
//             clearInterval(fontChecker);
//         }
//     }, 100);

//     // Setup an event listener for the search bar
//     document.getElementById("header-search-input")?.addEventListener("keyup", (event) => {
//         if (event.key == "Enter") {
//             headerSearch();
//             document.getElementById("header-search-input")?.dispatchEvent(new Event("blur"));
//         }
//     });

//     // Setup on click for header search button
//     createOnClick((document.getElementById("header-search-button")! as any), headerSearch);

//     // Setup an on click for the menu button
//     createOnClick((document.getElementById("hamburger-button")! as any), openNavMenu);

//     // Setup an on click for the close button
//     createOnClick((document.getElementById("close-button")! as any), closeNavMenu);

//     // Setup an on click for the logout button
//     createOnClick((document.getElementById("log-out")! as any), signOutUser);

//     // Manage Nav Links when screen gets small
//     window?.addEventListener("resize", () => {
//         closeNavMenu();
//         resizeContentDiv();
//     });

//     // Manage Account Panel and animation
//     createOnClick((document.getElementById("small-account-container")! as any), () => {
//         if ((document.getElementById("large-account-container") as HTMLElement).style.getPropertyValue("opacity") == "0") {
//             openLargeAccount();
//         } else {
//             closeLargeAccount();
//         }
//     });

//     // Watch for clicks outside of the account panel
//     window?.addEventListener("click", (event) => {
//         // If the click is not contained in the account panel or is the account panel itself
//         // and isn't the small account container (Which will toggle itself), close it
//         if (
//             !(
//                 contains((document.getElementById("large-account-container")! as any), event.target) ||
//                 event.target == (document.getElementById("large-account-container")! as any)
//             ) &&
//             !(
//                 contains((document.getElementById("small-account-container")! as any), event.target) ||
//                 event.target == (document.getElementById("small-account-container")! as any)
//             )
//         ) {
//             closeLargeAccount();
//         }
//     });

//     // Watch for clicks outside of the account panel
//     window?.addEventListener("touchstart", (event) => {
//         // If the click is not contained in the account panel or is the account panel itself
//         // and isn't the small account container (Which will toggle itself), close it
//         if (
//             !(
//                 contains((document.getElementById("large-account-container")! as any), event.target) ||
//                 event.target == (document.getElementById("large-account-container")! as any)
//             ) &&
//             !(
//                 contains((document.getElementById("small-account-container")! as any), event.target) ||
//                 event.target == (document.getElementById("small-account-container")! as any)
//             )
//         ) {
//             closeLargeAccount();
//         }
//     });

//     // Watch for clicks outside of the mobile nav menu
//     window?.addEventListener("click", (event) => {
//         if ((document.getElementById("close-button")! as any) == event.target) {
//             closeNavMenu();
//             return;
//         }
//         if (
//             contains((document.querySelector("nav")! as any), event.target) ||
//             event.target == (document.querySelector("nav")! as any) ||
//             event.target == (document.getElementById("hamburger-button")! as any)
//         ) {
//             return;
//         }
//         closeNavMenu();
//     });

//     // Watch the scroll status of the page and change the nav bar drop shadow accordingly
//     window?.addEventListener("scroll", () => {
//         const banners = (document.getElementById("banner-container > div:visible")! as any).length > 0 ? true : false;

//         if ((document.documentElement.scrollTop || document.body.scrollTop) > 0) {
//             if (!banners) {
//                 (document.querySelector("header") as HTMLElement).style.setProperty("box-shadow", String("0px 0px 16px 0px var(--teal)"));
//             } else {
//                 (document.getElementById("banner-container") as HTMLElement).style.setProperty("box-shadow", String("0px 0px 16px 0px #eee"));
//             }
//         } else {
//             (document.querySelector("header") as HTMLElement).style.setProperty("box-shadow", String(""));
//             (document.getElementById("banner-container") as HTMLElement).style.setProperty("box-shadow", String(""));
//         }

//         closeLargeAccount();
//         closeNavMenu();
//         updateScrollPosition();
//     });

//     // Remove the preload class after the initial animations.
//     setTimeout(() => {
//         document.querySelector(".preload")?.classList.remove("preload");
//     }, 500);

//     // Setup a ResizeObserver to watch for changes in the content div
//     const contentDivObserver = new ResizeObserver(resizeContentDiv);
//     contentDivObserver.observe((document.getElementById("content")! as any));

//     function resizeContentDiv() {
//         // If we know the content is still loading, don't do anything
//         if (document.getElementById("content")?.classList.contains("loading")) {
//             return;
//         }

//         const contentHeight =
//             (document.getElementById("content")?.getBoundingClientRect().height ?? 0) +
//             (document.getElementById("index-content-container")?.getBoundingClientRect().height ?? 0) -
//             (document.getElementById("index-content-container")?.getBoundingClientRect().height ?? 0); // Add the padding of the content container
//         let otherHeights = 0;
//         Array.from(document.querySelector("body")?.children ?? []).forEach((element) => {
//                 if (element.id != "index-content-container" && element.id != "cover") {
//                     otherHeights += element?.getBoundingClientRect().height;
//                 }
//             });
//         const minHeight = window.innerHeight - otherHeights;

//         (document.getElementById("index-content-container") as HTMLElement).style.setProperty("height", String(Math.max(contentHeight, minHeight)));
//     }
// }

/**
 * @description This function sets up the IndexedDB database.
 */
function setupIndexedDB() {
    // Setup IndexedDB
    const openRequest = window.indexedDB.open("SCLibrary", 1);

    // Runs if the database doesn't exist or the version number is newer
    openRequest.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        db.createObjectStore("historyStates");
        db.createObjectStore("globals");
        // const bookObjectStore = db.createObjectStore("books", {keyPath: "id"});
        // bookObjectStore.createIndex("id", "id", {unique: true});
    };

    openRequest.onerror = (event) => {
        console.error("Error opening indexedDB");
        console.log(event);
    };

    openRequest.onsuccess = () => {
        if (!iDB) {
            console.error("iDB is not defined.");
            return;
        }
        // Load in any caches
        const expectedCachedVars = ["bookDatabase", "timeLastSearched"];
        setIDB(openRequest.result);
        const transaction = iDB.transaction("globals", "readonly");
        const globalsObjectStore = transaction.objectStore("globals");

        expectedCachedVars.forEach((key) => {
            const request = globalsObjectStore.get(key);
            request.onsuccess = () => {
                if (request.result == undefined) {
                    console.warn("Cached variable not found: " + key);
                    return;
                }
                if (key == "bookDatabase") {
                    const tempBookDatabase: BookDocument[] = [];
                    request.result.forEach((bookDoc: BookDocument) => {
                        const books: Book[] = [];
                        bookDoc.books.forEach((book: Book) => {
                            books.push(Book.createFromObject(book));
                        });
                        const order = bookDoc.order;
                        tempBookDatabase.push({ books: books, order: order });
                    });
                    setBookDatabase(tempBookDatabase);
                } else if (key == "timeLastSearched") {
                    setTimeLastSearched(request.result);
                } else {
                    console.warn("Unexpected cached variable: " + key);
                }
            };
        });

        // Flush old history states from more than 2 weeks ago
        const historyTransaction = iDB.transaction("historyStates", "readwrite");
        const historyStatesObjectStore = historyTransaction.objectStore("historyStates");
        const range = IDBKeyRange.upperBound(Date.now() - 604800000 * 2); // 604800000ms = 1 week
        const request = historyStatesObjectStore.openCursor(range);
        request.onsuccess = (event: Event) => {
            const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
            if (!cursor) return;
            cursor.delete();
            cursor.continue();
        };
    };
}

/**
 * @description This function searches for the query in the header search bar.
 */
function headerSearch() {
    const query = (document.getElementById("header-search-input") as HTMLInputElement).value;
    if (query == "") {
        return;
    }
    // goToPage("search?query=" + query);
}

/**
 * @description Opens the large account panel
 */
function openLargeAccount() {
    document.getElementById("large-account-container")?.classList.add("large-account-show");
    document.getElementById("large-account-container")?.classList.remove("large-account-hide");
}

/**
 * @description Closes the large account panel
 */
function closeLargeAccount() {
    document.getElementById("large-account-container")?.classList.add("large-account-hide");
    document.getElementById("large-account-container")?.classList.remove("large-account-show");
}

/**
 * @description Closes the mobile nav menu.
 */
function closeNavMenu() {
    document.querySelector("nav")?.classList.remove("nav-open");
}

/**
 * @description Opens the mobile nav menu.
 */
function openNavMenu() {
    document.querySelector("nav")?.classList.add("nav-open");
}

let isAdmin: boolean | null = null;
/**
 * @description This function checks if the user is an admin. It returns a promise that resolves to true if the user is an admin and false if they are not.
 * @param {Boolean} recheck If true, the function will recheck if the user is an admin using the database. If false, the function will return the cached value.
 * @returns {Promise<Boolean>} A promise that resolves to true if the user is an admin and false if they are not.
 */
export function isAdminCheck(recheck = false) {
    return new Promise<boolean>((resolve) => {
        if (isAdmin == null || recheck) {
            if (!db) {
                console.error("The database is not initialized.");
                resolve(false);
                return;
            }
            getDoc(doc(db, "admin", "private_vars"))
                .then(() => {
                    isAdmin = true;
                    resolve(true);
                })
                .catch(() => {
                    isAdmin = false;
                    resolve(false);
                });
        } else {
            resolve(isAdmin);
        }
    });
}

// Shouldn't be needed anymore
/**
 * Called every time the user wants to go to a new page. The function checks if the page change is valid.
 * If the page change is valid, the function will go to the new page by calling getPage().
 * @param {String} pageName The name of the page to go to.
 * @param {Boolean} goingBack Whether the user is going forward or backward in the history. This prevents new history entries, but a .catch must be added to the goToPage() call if true.
 * @param {Boolean} bypassUnload Whether to bypass the unload event.
 * @returns {Promise<void>} A promise representing the loading progress of the page.
 */
// export function goToPage(pageName: string, goingBack = false, bypassUnload = false) {
//     return new Promise<void>((resolve, reject) => {
//         let pageHash = "";
//         let pageQuery = "";

//         // This removes the hash if one was passed in and stores it to a separate variable.
//         if (pageName.includes("#")) {
//             pageHash = pageName.substring(pageName.indexOf("#"), pageName.length);
//             pageName = pageName.substring(0, pageName.indexOf("#"));
//         }

//         // This removes the query if one was passed in and stores it to a separate variable.
//         if (pageName.includes("?")) {
//             pageQuery = pageName.substring(pageName.indexOf("?"), pageName.length);
//             pageName = pageName.substring(0, pageName.indexOf("?"));
//         }

//         // This removes the file extension if one was passed in.
//         if (pageName.includes(".")) {
//             pageName = pageName.substring(0, pageName.indexOf("."));
//         }

//         // This removes an ending slash if one was mistakenly included
//         if (pageName.length > 1 && pageName.substring(pageName.length - 1) == "/") {
//             pageName = pageName.substring(0, pageName.length - 1);
//             console.warn("The page name '" + pageName + "' had an ending slash. This was removed automatically.");
//         }

//         // This removes a leading slash if one was mistakenly included
//         if (pageName.substring(0, 1) == "/") {
//             pageName = pageName.substring(1, pageName.length);
//         }

//         if (pageName == "" || pageName == "index.html" || pageName == "index") {
//             pageName = "main";
//         }

//         if (pageName == "admin") {
//             pageName = "admin/main";
//         }

//         // Prevent users from going to the same page (just don't reload the content if you do)
//         if (!currentQuery) {
//             setCurrentQuery("");
//         }
//         if (!currentHash) {
//             setCurrentHash("");
//         }
//         const currentQueryValue = findURLValue(currentQuery, "query", true);
//         const pageQueryValue = findURLValue(pageQuery, "query", true);
//         if (
//             currentPage &&
//             !goingBack &&
//             ((pageName == currentPage && pageName != "search") ||
//                 (pageName == "search" && currentQueryValue == pageQueryValue && pageQueryValue != "")) &&
//             pageName + pageQuery + pageHash == currentPage + currentQuery + currentHash
//         ) {
//             reject("The user attempted to view the current page.");
//             return;
//         }

//         // Prevent the user from visiting the auth pages if they are already logged in
//         if (pageName.includes("login") || pageName.includes("signup")) {
//             if (auth.currentUser != null && findURLValue(pageQuery, "redirect", true) == "") {
//                 openModal("error", "You can't visit the login or signup pages while you're logged in.");
//                 reject("User is already logged in.");
//                 goToPage("");
//                 return;
//             }
//         }

//         // At this point, the user is going somewhere, but we don't know if they are allowed to go to admin pages yet
//         // If there is any reason for the user to not leave a page, then it will reject.
//         if (!bypassUnload) {
//             const cancelEvent = !window.dispatchEvent(new Event("beforeunload", { cancelable: true }));

//             if (cancelEvent) {
//                 reject("Cancelled by BeforeUnload Event");
//                 document.getElementById("content")?.classList.remove("page-hidden");
//                 return;
//             }
//         }

//         // Handle Scrolling
//         // Scroll to a specific part of the page if needed
//         if (pageHash && document.querySelector(encodeHTML(pageHash))) {
//             pageHash = "#" + encodeURIComponent(pageHash.substring(1));
//             setTimeout(() => {
//                 windowScroll(document.querySelector(pageHash)?.getBoundingClientRect().top! - 90);
//             }, 350);
//         } else if (goingBack && historyManager && historyManager.get(0)?.customData?.scrollRestoration) {
//             // If there isn't a hash to scroll to, see if there's a scroll point in the history to go to.
//             let count = 0;
//             let maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;
//             const scrollRestoration = historyManager.get(0).customData.scrollRestoration;
//             setIgnoreScroll(true);
//             const loop = setInterval(() => {
//                 count++;
//                 if (count > 100) {
//                     clearInterval(loop);
//                     setIgnoreScroll(false);
//                     return;
//                 }
//                 maxScrollTop = document.documentElement.scrollHeight - window.innerHeight;
//                 // If the scroll point is greater than the max scroll point, then we need to wait for the page to load.
//                 if (scrollRestoration > maxScrollTop) {
//                     return;
//                 }
//                 setTimeout(() => {
//                     windowScroll(scrollRestoration);
//                     setTimeout(() => {
//                         setIgnoreScroll(false);
//                     }, 600);
//                 }, 20 / count);
//                 clearInterval(loop);
//             }, 50);
//         } else {
//             // If there isn't a hash or scroll point, scroll to the top of the page.
//             setTimeout(() => {
//                 windowScroll(0);
//             }, 50);
//         }

//         let delayTimer;
//         let adminCheck;
//         // Temporarily hide the content while the page is loading
//         // Don't hide the content if the user is going between two account pages.
//         if (
//             currentPage &&
//             currentPage != pageName &&
//             !(currentPage.includes("account") && pageName.includes("account"))
//         ) {
//             document.getElementById("content")?.classList.add("page-hidden");
//             document.getElementById("content")?.classList.remove("fade");
//             delayTimer = new Promise<any>((resolve) => {
//                 setTimeout(() => {
//                     resolve(undefined);
//                 }, 300);
//             });
//         }

//         // Prevent the user from visiting admin pages if they are not an admin
//         if (pageName.includes("admin")) {
//             adminCheck = isAdminCheck(true);
//         }

//         Promise.all([delayTimer, adminCheck])
//             .then((values) => {
//                 const isAdmin = values[1];
//                 if (pageName.includes("admin") && !isAdmin) {
//                     reject("User is not an admin.");
//                     goToPage("");
//                     return;
//                 }
//                 return getPage(pageName, goingBack, pageHash, pageQuery).then(() => {
//                     return pageSetup(pageName, goingBack, pageHash, pageQuery).then(() => {
//                         if (pageName != "account") {
//                             setCurrentPanel(null);
//                         }
//                         setCurrentPage(pageName);
//                         setCurrentQuery(pageQuery);
//                         setCurrentHash(pageHash);
//                         resolve(undefined);
//                     });
//                 });
//             })
//             .catch((error) => {
//                 reject(error);
//             });
//     }).catch((error) => {
//         if (error == "Cancelled by BeforeUnload Event") {
//             console.log("goToPage function cancelled by BeforeUnload Event");
//         } else if (error == "User is already logged in.") {
//             console.log("goToPage function cancelled because the user is already logged in.");
//         } else if (error == "User is not an admin.") {
//             console.log("goToPage function cancelled because the user is not an admin.");
//         } else if (error == "The user attempted to view the current page.") {
//             console.log("goToPage function cancelled because the user attempted to view the current page.");
//         } else {
//             console.error("goToPage function failed: " + error);
//         }

//         // Trigger catch in the history function
//         if (goingBack) {
//             return Promise.reject("restoreHistory");
//         }
//     });
// }

// Shouldn't be needed anymore
/**
 * @description This function loads the page content and handles titles and history.
 * @param {String} pageName The name of the page to load.
 * @param {Boolean} goingBack A boolean that determines if the user is going back in the history.
 * @param {String} pageHash The hash of the page to load.
 * @param {String} pageQuery The query of the page to load.
 * @returns {Promise<void>} A promise that represents the loading prgress of the page.
 */
// function getPage(pageName: string, goingBack: boolean, pageHash = "", pageQuery = "") {
//     return new Promise<void>((resolve, reject) => {
//         // Prepare the page for loading
//         document.getElementById("content")?.classList.add("loading");
//         if (window.innerWidth <= 570) {
//             closeNavMenu();
//         }

//         if (
//             (document.getElementById("large-account-container") as HTMLElement).style.getPropertyValue("opacity") !=
//             "none"
//         ) {
//             closeLargeAccount();
//         }

//         // If the user is going to a different panel on the account page, handle it with the other function and return.
//         if (currentPage == "account" && pageName == "account") {
//             import("./account")
//                 .then(({ goToSettingsPanel }) => {
//                     goToSettingsPanel(pageQuery.substring(1), goingBack).catch((error) => {
//                         reject(error);
//                     });
//                     setCurrentQuery(pageQuery);
//                     setCurrentHash(pageHash);
//                     if (goingBack == false) {
//                         // Update the URL and History for all but the first page load
//                         historyManager.push("account?" + pageQuery.substring(1));
//                     }
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     reject(console.error("Problem importing", error));
//                 });
//             return;
//         }

//         // Start getting the page
//         const xhttp = new XMLHttpRequest();
//         if (directory.includes(pageName)) {
//             xhttp.open("GET", "/content/" + pageName + ".html", true); // removed sending the hash/query (I don't see why we'd need the server to know it...)
//         } else {
//             xhttp.open("GET", "/content/404.html", true);
//         }
//         xhttp.send();

//         xhttp.timeout = 5000;
//         xhttp.ontimeout = (event) => {
//             reject("Page load timed out.");
//             console.error(event);
//             softBack();
//         };
//         xhttp.onerror = (event) => {
//             reject("Page load failed.");
//             console.error(event);
//             softBack();
//         };

//         // Set the content of the page
//         xhttp.onreadystatechange = () => {
//             if (xhttp.readyState == 4 && xhttp.status == 200) {
//                 let pageUrl = "/" + pageName;
//                 if (pageUrl == "/index.html" || pageUrl == "/index" || pageUrl == "/main" || pageUrl == "/main.html") {
//                     pageUrl = "/";
//                 }

//                 if (!goingBack) {
//                     historyManager.push(pageUrl.substring(1) + pageQuery + pageHash);
//                 }

//                 document.getElementById("content")?.classList.remove("loading");
//                 (document.getElementById("content") as HTMLInputElement).innerHTML = xhttp.responseText;

//                 // Set Title Correctly
//                 const titleList = {
//                     "admin/editEntry": "Edit an Entry",
//                     "admin/main": "Admin Dashboard",
//                     "admin/report": "Run a Report",
//                     "admin/barcode": "Generate Barcodes",
//                     "admin/view": "View Database",
//                     "admin/editUser": "Edit a User",
//                     "admin/inventory": "Conduct Inventory",
//                     "admin/help": "Admin Help",
//                     404: "404 | Page Not Found",
//                     about: "About Us",
//                     account: "Your Account",
//                     advancedSearch: "Advanced Search",
//                     help: "Help",
//                     login: "Login",
//                     main: "Home",
//                     result: "Search Result", // This will get changed on the page to be specific to the title.
//                     search: "Search Results",
//                     signup: "Signup",
//                     sitemap: "Sitemap"
//                 };

//                 // Add Titles baseed on page Name
//                 if ((titleList as any)[pageName] != undefined) {
//                     changePageTitle((titleList as any)[pageName], false);
//                 } else if (pageUrl == "/") {
//                     changePageTitle("Home", false);
//                 } else {
//                     document.title = "South Church Library Catalog";
//                 }

//                 resolve(undefined);
//             } else if (xhttp.readyState == 4 && xhttp.status == 404) {
//                 reject("404: Page not found: " + pageName);
//                 getPage("404", goingBack).then(() => {
//                     resolve(undefined);
//                 });
//             }
//         };
//     }).then(() => {
//         // Change Index Page Frame if needed
//         if (pageName != "result") {
//             (document.getElementById("header-search-input") as HTMLInputElement).value = findURLValue(
//                 pageQuery,
//                 "query",
//                 true
//             );
//         }

//         // Start fading the page in
//         if (currentPage != pageName) {
//             window.setTimeout(() => {
//                 document.getElementById("content")?.classList.remove("page-hidden");
//                 document.getElementById("content")?.classList.add("fade");
//             }, 100);
//         }
//         (document.getElementById("cover") as HTMLElement).style.display = "none";
//         document.querySelector("body")?.classList.add("fade");
//         (document.querySelector("body") as HTMLElement).style.setProperty("overflow", String(""));
//     });
// }

// Shouldn't be needed anymore
/**
 * @description This function fires additional scripts based on the page that was loaded.
 * @param {String} pageName The name of the page.
 * @param {Boolean} goingBack A boolean that represents if the user is going back in the history.
 * @param {String} pageHash The hash of the page.
 * @param {String} pageQuery The query of the page.
 * @returns {Promise<void>} A promise that represents the setup progress of the page.
 */
// function pageSetup(pageName: any, goingBack: any, pageHash: any, pageQuery: any) {
//     return new Promise<any>((resolve) => {
//         // No function for help, about, advancedSearch, or 404 so just resolve
//         if (pageName == "help" || pageName == "about" || pageName == "advancedsearch" || pageName == "404") {
//             resolve(undefined);
//         } else if (pageName == "main") {
//             import("./main")
//                 .then(({ setupMain }) => {
//                     setupMain();
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else if (pageName == "login" || pageName == "signup") {
//             import("./signIn")
//                 .then(({ setupSignIn }) => {
//                     setupSignIn(pageQuery);
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else if (pageName == "search") {
//             import("../css/search.css");
//             import("./search")
//                 .then(({ setupSearch }) => {
//                     setupSearch(pageQuery);
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else if (pageName == "result") {
//             import("../css/search.css");
//             import("./search")
//                 .then(({ setupResultPage }) => {
//                     setupResultPage(pageQuery);
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         }

//         // Need a special case for the account page because we have to travel to subpages without calling setup multiple times.
//         else if (pageName == "account" && currentPage != "account") {
//             import("../css/account.css");
//             import("./account")
//                 .then(({ setupAccountPage }) => {
//                     setupAccountPage(pageQuery, goingBack);
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else if (pageName == "account" && currentPage == "account") {
//             resolve(undefined);
//         } else if (pageName == "admin/main") {
//             import("../css/admin.css");
//             import("./admin")
//                 .then(({ setupAdminMain }) => {
//                     setupAdminMain();
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else if (pageName == "admin/editEntry") {
//             import("../css/form.css");
//             import("../css/admin.css");
//             import("./editEntry")
//                 .then(({ setupEditEntry }) => {
//                     setupEditEntry(pageQuery);
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else if (pageName == "admin/editUser") {
//             import("../css/form.css");
//             import("../css/admin.css");
//             import("./admin")
//                 .then(({ setupEditUser }) => {
//                     setupEditUser();
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else if (pageName == "admin/view") {
//             import("../css/admin.css");
//             import("../css/search.css");
//             import("./admin")
//                 .then(({ setupView }) => {
//                     setupView(pageQuery);
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else if (pageName == "admin/report") {
//             import("../css/admin.css");
//             import("./report")
//                 .then(({ setupReport }) => {
//                     setupReport(pageQuery);
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else if (pageName == "admin/inventory") {
//             import("../css/admin.css");
//             import("./admin")
//                 .then(({ setupInventory }) => {
//                     setupInventory();
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else if (pageName == "admin/barcode") {
//             import("../css/admin.css");
//             import("./admin")
//                 .then(({ setupBarcodePage }) => {
//                     setupBarcodePage();
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else if (pageName == "admin/help") {
//             import("../css/admin.css");
//             import("./admin")
//                 .then(({ setupAdminHelp }) => {
//                     setupAdminHelp();
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else if (pageName == "sitemap") {
//             import("./sitemap")
//                 .then(({ setupSitemap }) => {
//                     setupSitemap();
//                     resolve(undefined);
//                 })
//                 .catch((error) => {
//                     console.error("Problem importing", error);
//                 });
//         } else {
//             console.error("No setup function for page: " + pageName);
//             resolve(undefined);
//         }
//     });
// }

// Shouldn't be neeeded anymore
// Catch History Events such as forward and back and then go to those pages
// window.onpopstate = () => {
//     if (historyManager.currentIndex == window.history.state.index) {
//         // If the current index is the same as the state index, then we haven't moved
//         // forward or back in the history. This could be a beforeunload event.
//         return;
//     }

//     historyManager.currentIndex = window.history.state.index;

//     const path = document.location.pathname.substring(1);
//     const search = document.location.search;
//     const hash = document.location.hash;

//     goToPage(path + search + hash, true)
//         .then(() => {
//             // Give the past knowlege of the future
//             window.history.replaceState({ stack: historyManager.stack, index: historyManager.currentIndex }, "");
//         })
//         .catch(() => {
//             restoreHistory();
//         });
// };

// Shouldn't be needed anymore
/**
 * @description In the event that a navigation action was cancelled, we need to reset the history state
 */
// function restoreHistory() {
//     // Figure out which direction we need to go to get back to the original page
//     if (historyManager.currentIndex != window.history.state.index) {
//         if (historyManager.currentIndex > window.history.state.index) {
//             // We're going backwards
//             window.history.forward();
//         } else {
//             // We're going forwards
//             window.history.back();
//         }
//     }
// }

// Shouldn't be needed anymore
/**
 * @description Changes the title of the page, or appends to the beginning of the current title.
 * @param {String} newTitle The new title of the page. If empty, the title will be reset to the default.
 * @param {Boolean} append Defaults to true. If true, the new title will be appended to the beginning of the current title.
 */
// export function changePageTitle(newTitle: any, append = true) {
//     if (newTitle == "") {
//         document.title = "South Church Library Catalog";
//     } else {
//         if (append) {
//             const currentTitle = document.title;
//             document.title = newTitle + " | " + currentTitle;
//         } else {
//             document.title = newTitle + " | South Church Library Catalog";
//         }
//     }
// }

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
    logEvent(analytics, "app_open");

    setPerformance(getPerformance(app));
    // TODO: Low Priority: Try to get FID to work nativly rather than using a custom trace
    onCLS(sendToFirebase);
    onLCP(sendToFirebase);
    onTTFB(sendToFirebase);

    setDb(getFirestore(app));

    setStorage(getStorage(app));

    setAuth(getAuth(app));

    // Start App Check
    // WARNING: DO NOT USE THIS IN PRODUCTION
    // self.FIREBASE_APPCHECK_DEBUG_TOKEN = "INSERT_TOKEN_HERE";
    // eslint-disable-next-line
    const appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider("6LcpTm0bAAAAALfsopsnY-5aX2BC7nAukEDHtKDu"),
        isTokenAutoRefreshEnabled: true
    });

    // Listening for auth state changes.
    return new Promise<void>((resolve, reject) => {
        try {
            if (!auth) {
                reject("Auth is not initialized.");
                return;
            }
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    // User is signed in.
                    console.log("User is signed in.");

                    // If remember me was not checked, start a timer to detect inactivity
                    if (
                        (
                            auth as unknown as {
                                persistenceManager?: { persistence?: { type?: string } };
                            }
                        ).persistenceManager?.persistence?.type == "SESSION"
                    ) {
                        startLogoutTimer();
                        // Sets event listeners for the logout timer
                        window?.addEventListener("mousemove", resetLogoutTimer);
                        window?.addEventListener("keypress", resetLogoutTimer);
                        window?.addEventListener("click", resetLogoutTimer);
                        window?.addEventListener("scroll", resetLogoutTimer);
                        window?.addEventListener("touchmove", resetLogoutTimer); // This is for mobile
                    }

                    // If user has just signed in, don't bother updating info a second time
                    // TODO: maybe add something to do with time since last page load?
                    const millisecondsSinceSignup =
                        new Date().getTime() - new Date(user.metadata.creationTime ?? "").getTime();
                    if (millisecondsSinceSignup < 30000) {
                        resolve(undefined);
                        return;
                    }

                    const date = new Date();
                    const emailVerified = user.emailVerified;
                    updateDoc(doc(db, "users", user.uid), {
                        lastSignInTime: date,
                        emailVerified: emailVerified
                    }).catch((error) => {
                        console.warn(
                            "The last sign in time could not be updated, likely not a problem if the user just signed up."
                        );
                        if (error) console.warn(error);
                    });

                    // Check if the user is an admin and add the Admin Dashboard link if they are
                    isAdminCheck(true).then((result) => {
                        if (result && (document.getElementById("admin-link") as HTMLInputElement).innerHTML == "") {
                            (document.getElementById("admin-link") as HTMLInputElement).innerHTML = "Admin Dashboard";
                        }
                    });
                } else {
                    // User is signed out.
                    console.log("User is signed out.");
                    stopLogoutTimer();
                }
                updateUserAccountInfo()
                    .then(() => {
                        resolve(undefined);
                    })
                    .catch(() => {
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

let worker: Worker;
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
    worker.onmessage = (event: MessageEvent) => {
        if (event.data.command == "logout") {
            if (!auth) {
                console.error("Auth is not initialized.");
                return;
            }
            signOut(auth).then(() => {
                window.location.href = "/";
            });
        } else if (event.data.command == "show") {
            // Stop the active event listerners so the user can interact with the modal
            window?.removeEventListener("mousemove", resetLogoutTimer);
            window?.removeEventListener("keypress", resetLogoutTimer);
            window?.removeEventListener("click", resetLogoutTimer);
            window?.removeEventListener("scroll", resetLogoutTimer);
            window?.removeEventListener("touchmove", resetLogoutTimer);
            const timeRemaining = event.data.timeRemaining;
            openModal(
                "issue",
                'To protect your account, you will be logged out soon unless you interact with the page.<br><br><span id="logout-time-remaining">5:00</span> ',
                "Are you still there?",
                "Stay Logged In",
                () => {
                    worker.postMessage("reset");
                    // Sets event listeners for the logout timer
                    window?.addEventListener("mousemove", resetLogoutTimer);
                    window?.addEventListener("keypress", resetLogoutTimer);
                    window?.addEventListener("click", resetLogoutTimer);
                    window?.addEventListener("scroll", resetLogoutTimer);
                    window?.addEventListener("touchmove", resetLogoutTimer); // This is for mobile
                },
                "Log Out",
                () => {
                    signOut(auth).then(() => {
                        window.location.href = "/";
                    });
                }
            );
            (document.getElementById("logout-time-remaining") as HTMLElement).style.setProperty(
                "font-weight",
                String("bold")
            );
            (document.getElementById("logout-time-remaining") as HTMLElement).style.setProperty(
                "font-size",
                String("24px")
            );
            (document.getElementById("logout-time-remaining") as HTMLElement).style.setProperty(
                "text-align",
                String("center")
            );
            (document.getElementById("logout-time-remaining")?.parentElement as HTMLElement)?.style.setProperty(
                "display",
                "grid"
            );
            (document.getElementById("logout-time-remaining") as HTMLInputElement).innerHTML =
                Math.floor(timeRemaining / 60) + ":" + (timeRemaining % 60 < 10 ? "0" : "") + (timeRemaining % 60);
        } else if (event.data.command == "update") {
            const timeRemaining = event.data.timeRemaining;
            (document.getElementById("logout-time-remaining") as HTMLInputElement).innerHTML =
                Math.floor(timeRemaining / 60) + ":" + (timeRemaining % 60 < 10 ? "0" : "") + (timeRemaining % 60);
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
function sendToFirebase({ name, delta, entries }: { name: string; delta: number; entries: unknown[] }) {
    const metricNameMap: Record<string, string> = {
        CLS: "Cumulative Layout Shift",
        LCP: "Largest Contentful Paint",
        FID: "First Input Delay",
        TTFB: "Time To First Byte"
    };

    const startTime = Date.now();
    let value = Math.round(name === "CLS" ? delta * 1000 : delta);
    if (value == 0) {
        value = 1;
    }

    entries.forEach(() => {
        trace(performance, metricNameMap[name]).record(startTime, value);
    });
}

/**
 * @description Updates the UI with the user's account information from the database.
 * @returns {Promise<void>} A promise that resolves when the user account info has been updated.
 */
export function updateUserAccountInfo() {
    return new Promise<void>((resolve, reject) => {
        const user = auth.currentUser;
        if (user) {
            // User is signed in.
            // Get the information about the current user from the database.
            getUser()
                .then((userObject) => {
                    // Update the UI with the information from the doc
                    (document.getElementById("account-name") as HTMLInputElement).textContent =
                        userObject.firstName + " " + userObject.lastName;
                    if (!userObject.email) {
                        console.error("User object does not have an email property. This should never happen.");
                        return;
                    }
                    updateEmailinUI(userObject.email);
                    if (userObject.pfpIconLink) {
                        document
                            .getElementById("small-account-image")
                            ?.setAttribute("src", String(userObject.pfpIconLink));
                        document
                            .getElementById("large-account-image")
                            ?.setAttribute("src", String(userObject.pfpIconLink));
                    } else if (userObject.pfpLink) {
                        document.getElementById("small-account-image")?.setAttribute("src", String(userObject.pfpLink));
                        document.getElementById("large-account-image")?.setAttribute("src", String(userObject.pfpLink));
                    } else {
                        document
                            .getElementById("small-account-image")
                            ?.setAttribute("src", String("/img/default-user.jpg"));
                        document
                            .getElementById("large-account-image")
                            ?.setAttribute("src", String("/img/default-user.jpg"));
                    }

                    // Update Firebase Auth with any out of date data
                    updateProfile(user, {
                        displayName: userObject.firstName + " " + userObject.lastName,
                        photoURL: userObject.pfpLink
                    });

                    // Change Account Container Appearence
                    (document.getElementById("nav-login-signup") as HTMLElement).style.display = "none";
                    (document.getElementById("small-account-container") as HTMLElement).style.display = "";

                    resolve(undefined);
                })
                .catch((error) => {
                    console.error("Could not get the user information from the database: ", error);
                    reject(error);
                });
        } else {
            // User is signed out.
            // Change Account Container Appearence
            (document.getElementById("nav-login-signup") as HTMLElement).style.display = "";
            (document.getElementById("small-account-container") as HTMLElement).style.display = "none";

            resolve(undefined);
        }
    });
}

/**
 * @description Updates the email in the UI to be displayed with a zero width space in the middle of the email address.
 * @param {String} email A string containing the email address to be displayed.
 */
export function updateEmailinUI(email: string) {
    email = email.substring(0, email.indexOf("@")) + "\u200B" + email.substring(email.indexOf("@"), email.length);
    (document.getElementById("account-email") as HTMLInputElement).textContent = email;
    (document.getElementById("account-page-email") as HTMLInputElement).textContent = email;
}

/**
 * @description Signs the user out of the application. Then reloads the page.
 */
function signOutUser() {
    if (auth.currentUser) {
        signOut(auth)
            .then(() => {
                // could change 'replace' to 'href' if we wanted to keep the page in the history
                window.location.replace("/");
            })
            .catch((error) => {
                openModal("error", "Unable to sign you out, please refresh the page and try again.");
                console.error(error);
            });
    } else {
        openModal("error", "Unable to sign you out. No user is currently signed in.");
    }
}

console.log("ajax.js has Loaded!");
