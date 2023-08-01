/**
 * @global
 * @type {FirebaseApp}
 * @description The global variable app which stores the Firebase App instance.
 */
export let app = null;

/**
 * @global
 * @param {FirebaseApp} newApp The app instance to set
 * @description Sets the global variable app to the new FirebaseApp instance.
 */
export function setApp(newApp) {
    app = newApp;
}


/**
 * @global
 * @type {Firestore}
 * @description The global variable db which stores the Firebase Firestore instance.
 */
export let db = null;

/**
 * @global
 * @param {Firestore} newDb The Firestore instance to set
 * @description Sets the global variable db to the new Firestore instance.
 */
export function setDb(newDb) {
    db = newDb;
}


/**
 * @global
 * @type {Analytics}
 * @description The global variable analytics which stores the Firebase Analytics instance.
 */
export let analytics = null;

/**
 * @global
 * @param {Analytics} newAnalytics The Analytics instance to set
 * @description Sets the global variable analytics to the new Analytics instance.
 */
export function setAnalytics(newAnalytics) {
    analytics = newAnalytics;
}


/**
 * @global
 * @type {Auth}
 * @description The global variable auth which stores the Firebase Authentication instance.
 */
export let auth = null;

/**
 * @global
 * @param {Auth} newAuth The Auth instance to set
 * @description Sets the global variable auth to the new Auth instance.
 */
export function setAuth(newAuth) {
    auth = newAuth;
}


/**
 * @global
 * @type {Performance}
 * @description The global variable performance which stores the Firebase Performance instance.
 */
export let performance = null;

/**
 * @global
 * @param {Performance} newPerformance The Performance instance to set
 * @description Sets the global variable performance to the new Firebase Performance instance.
 */
export function setPerformance(newPerformance) {
    performance = newPerformance;
}


/**
 * @global
 * @type {FirebaseStorage}
 * @description The global variable storage which stores the Firebase Storage instance.
 */
export let storage = null;

/**
 * @global
 * @param {FirebaseStorage} newStorage The FirebaseStorage instance to set
 * @description Sets the global variable storage to the new Firebase Storage instance.
 */
export function setStorage(newStorage) {
    storage = newStorage;
}


/**
 * @global
 * @type {Book[][]} Specifically, an array of Book Documents each of which is an array of Book objects. The nested arrays have a maximum size of 100.
 * @description A global variable which stores the books in the database for the purposes of caching and searching.
 */
export let bookDatabase = null;

/**
 * @global
 * @param {Book[][]} newBookDatabase The book database to set
 * @description Sets the global variable bookDatabase to the new copy of the database.
 */
export function setBookDatabase(newBookDatabase) {
    bookDatabase = newBookDatabase;
    if (iDB) {
        iDB.transaction("globals", "readwrite").objectStore("globals").put(bookDatabase, "bookDatabase");
    } else {
        console.warn("IndexedDB wasn't updated.");
    }
}


/**
 * @global
 * @type {Book[]}
 * @description A global variable which stores the books in order of the best match to the most recent search. This is used to display the search results.
 */
export let searchCache = null;

/**
 * @global
 * @param {Book[]} newSearchCache The search cache to set
 * @description Sets the global variable searchCache to the new array of results.
 */
export function setSearchCache(newSearchCache) {
    searchCache = newSearchCache;
}


/**
 * @global
 * @type {Date}
 * @description The global variable timeLastSearched which stores the last time a search was performed. This is used to determine whether or not to update the search cache.
 */
export let timeLastSearched = null;

/**
 * @global
 * @param {Date} newTimeLastSearched The time to set
 * @description Sets the global variable timeLastSearched to the new time.
 */
export function setTimeLastSearched(newTimeLastSearched) {
    timeLastSearched = newTimeLastSearched;
    if (iDB) {
        iDB.transaction("globals", "readwrite").objectStore("globals").put(timeLastSearched, "timeLastSearched");
    } else {
        console.warn("IndexedDB wasn't updated.");
    }
}


/**
 * @global
 * @type {String}
 * @description The global variable currentPage which stores the name of the current page.
 */
export let currentPage = null;

/**
 * @global
 * @param {String} newCurrentPage The page to set
 * @description Sets the global variable currentPage to the new page name.
 */
export function setCurrentPage(newCurrentPage) {
    currentPage = newCurrentPage;
}


/**
 * @global
 * @type {String}
 * @description The global variable currentQuery which stores the current query string from the URL.
 */
export let currentQuery = null;

/**
 * @global
 * @param {String} newCurrentQuery The query to set
 * @description Sets the global variable currentQuery to the new query value.
 */
export function setCurrentQuery(newCurrentQuery) {
    currentQuery = newCurrentQuery;
}


/**
 * @global
 * @type {String}
 * @description The global variable currentHash which stores the current hash string from the URL.
 */
export let currentHash = null;

/**
 * @global
 * @param {String} newCurrentHash The hash to set
 * @description Sets the global variable currentHash to the new hash value.
 */
export function setCurrentHash(newCurrentHash) {
    currentHash = newCurrentHash;
}


/**
 * @global
 * @type {String}
 * @description The global variable currentPanel which stores the current panel string from the URL. This stores the current subpage of the current page.
 */
export let currentPanel = null;

/**
 * @global
 * @param {String} newcurrentPanel The panel to set
 * @description Sets the global variable currentPanel to the new panel name.
 */
export function setCurrentPanel(newCurrentPanel) {
    currentPanel = newCurrentPanel;
}

/**
 * @global
 * @type {HistoryManager}
 * @description The global variable historyManager which stores the history manager and the stack of history events.
 */
export let historyManager = null;

/**
 * @global
 * @param {Object} state the history state stored in the browser history (if there is one).
 * @description Sets the global variable historyManager to the new manager.
 */
export function setHistoryManager(state) {
    if (state == undefined) {
        // There was no history found in the browser, so create a blank manager.
        // This happens on the first page load as well as any time the URL is edited manually.
        historyManager = new HistoryManager([], -1);
    } else {
        // There was history found in the browser, so create a manager with the history. This will happen if the user reloads the page.
        historyManager = new HistoryManager(state.stack, state.index);
    }
}

/**
 * @global
 * @type {IDBDatabase}
 * @description The global variable iDB which stores the current state of the indexedDB.
 */
export let iDB = null;

/**
 * @global
 * @param {IDBDatabase} newIDB the new indexedDB to set
 * @description Sets the global variable iDB to the new indexedDB.
 */
export function setIDB(newIDB) {
    iDB = newIDB;
}


/**
 * @global
 * @type {String[]}
 * @description A global variable which stores the list of valid pages on the site. Used to determine whether or not to redirect to the 404 page.
 */
export let directory = [
    "account/overview",
    "account/notifications",
    "account/checkouts",
    "account/security",
    "admin/barcode",
    "admin/editEntry",
    "admin/editUser",
    "admin/help",
    "admin/inventory",
    "admin/main",
    "admin/report",
    "admin/view",
    "404",
    "about",
    "account",
    "advancedSearch",
    "checkout",
    "help",
    "login",
    "main",
    "result",
    "search",
    "signup",
    "sitemap"
];


/**
 * @global
 * @class
 * @classdesc A class which manages the history and stores a stack of pages which can be navigated through using the browswer history.
 */
export class HistoryManager {
    stack = [];
    currentIndex = -1;

    /**
     * @param {HistoryPage[]} stack A list of objects which contain the page extensions in the order that they have been visitied since the first page load, and optionally custom data.
     * @param {Number} currentIndex The index of the current page in the stack. Useful for stepping back and forth through the stack.
     */
    constructor(stack, currentIndex) {
        let convertedStack = [];
        stack.forEach((page) => {
            convertedStack.push(new HistoryPage(page.name, page.customData, page.stateData));
        });
        this.stack = convertedStack;
        this.currentIndex = currentIndex;
    }

    /**
     * @param {String} name The name of the page to add to the stack. 
     * @param {Object} customData Any custom data to add to the page. This is optional.
     * @param {Object} stateData Any state data to save. This is optional.
     * @description Adds the information to a HistoryPage, adds it to the stack and sets it as the current page using the currentIndex.
     */
    push(name, customData = null, stateData = null, first = false) {
        // If we are somewhere in the past, remove all pages after the current page
        if (this.currentIndex < this.stack.length - 1) {
            this.remove(this.currentIndex + 1, this.stack.length - this.currentIndex - 1);
        }
        if (name.charAt(0) != "/") {
            name = "/" + name;
        }
        let stateDataKey = undefined; // Tells HistoryPage not to generate a key
        // Save the state data
        if (stateData != null) {
            stateDataKey = null; // Will be set by HistoryPage
        }
        // Add the page to the stack
        this.stack.push(new HistoryPage(name, customData, stateDataKey));
        this.currentIndex++;
        // If this is not the first time we are running this, add to the browser history
        if (!first) {
            window.history.pushState({stack: this.stack, index: this.currentIndex}, null, name);
        }
        if (stateData != null) {
            // Save the state data
            stateDataKey = this.stack[this.currentIndex].stateData;
            iDB.transaction("historyStates", "readwrite").objectStore("historyStates").put(stateData, stateDataKey);
        }
    }

    /**
     * @param {String} name The name of the page to add to the stack.
     * @param {Object} customData Any custom data to add to the page. This is optional.
     * @param {Object} stateData Any state data to save. This is optional.
     * @description Updates the current page in the history stack and then updates the browser history.
     */
    update(name, customData = null, stateData = null) {
        if (name == undefined) {
            name = this.stack[this.currentIndex].name;
        } else if (name.charAt(0) != "/") {
            name = "/" + name;
        }
        // Get the state data key
        let stateDataKey = this.stack[this.currentIndex].stateData;
        if (!stateDataKey && stateData) {
            // If there is no state data key, but there is state data, generate a new key
            this.stack[this.currentIndex] = new HistoryPage(name, customData, stateData);
            stateDataKey = this.stack[this.currentIndex].stateData;
        }
        // Update the current page in the stack
        this.stack[this.currentIndex].update(name, customData);
        // Update the history
        setTimeout(() => {
            window.history.replaceState({stack: this.stack, index: this.currentIndex}, null, name);
        }, 10);
        // Save the state data
        if (stateData) {
            iDB.transaction("historyStates", "readwrite").objectStore("historyStates").put(stateData, stateDataKey);
        }
    }

    /**
     * @description Removes the top page from the stack and sets the previous page as the current page using the currentIndex.
     * @returns {HistoryPage} The current page in the stack.
     */
    pop() {
        this.currentIndex--;
        return this.stack.pop();
    }

    /**
     * @description Gets the page at the specified index relative to the current page.
     * @param {Number} relativeIndex The index of the page relative to the current page. Defaults to 0.
     * @returns {HistoryPage} The page at the specified index.
     */
    get(relativeIndex = 0) {
        return this.stack[this.currentIndex + relativeIndex];
    }

    /**
     * @param {HistoryPage} item The item to insert into the stack.
     * @param {Number} index The index to insert the item at.
     * @description Inserts an item into the stack at the specified index.
     */
    insert(item, index) {
        this.stack.splice(index, 0, item);
    }

    /**
     * @param {Number} index The index of the item to remove.
     * @param {Number} count The number fo entries you want to remove. Defaults to 1.
     * @description Removes a number items from the stack at the specified index.
     */
    remove(index, count = 1) {
        this.stack.splice(index, count);
        if (this.currentIndex >= index) {
            this.currentIndex -= count;
        }
    }

    /**
     * @param {String} name The item to add to the stack.
     * @param {Object} customData Any custom data to add to the page. This is optional.
     * @param {Object} stateData Any state data to save. This is optional.
     * @description Used to add the first item to the stack.
     */
    first(name, customData = null, stateData = null) {
        if (name.charAt(0) != "/") {
            name = "/" + name;
        }
        if (this.stack.length == 0 && this.currentIndex == -1) {
            // This will only run if there was no history found.
            this.push(name, customData, stateData, true);
            window.history.replaceState({
                stack: this.stack,
                index: this.currentIndex
            }, null, name);
            if (history.scrollRestoration) {
                history.scrollRestoration = "manual";
            }
        }
    }

    /**
     * @description Used to get a state data object from IndexedDB.
     * @param {String} stateDataKey 
     * @returns {Promise<String>} A promise which resolves with the state data in the form of a string
     */
    static getFromIDB(stateDataKey) {
        return new Promise((resolve, reject) => {
            let request = iDB.transaction("historyStates").objectStore("historyStates").get(stateDataKey);
            request.onsuccess = () => {
                // Convert JSON Objects to Book Objects
                if (request.result.searchPageData) {
                    let searchPageData = request.result.searchPageData;
                    searchPageData.books = searchPageData.books.map(book => Book.createFromObject(book));
                    searchPageData.browseResultsArray = searchPageData.browseResultsArray.map(book => Book.createFromObject(book));
                    searchPageData.resultsArray = searchPageData.resultsArray.map(book => Book.createFromObject(book));
                    request.result.searchPageData = searchPageData;
                }
                if (request.result.homeBookBoxes) {
                    let homeBookBoxes = request.result.homeBookBoxes;
                    homeBookBoxes = homeBookBoxes.map(book => Book.createFromObject(book));
                    request.result.homeBookBoxes = homeBookBoxes;
                }

                resolve(request.result);
            };
            request.onerror = () => {
                reject(request.error);
            };
        });
    }
}

/**
 * @global
 * @class
 * @classdesc A class which represents an entry in the history which can be navigated through using the browswer.
 */
export class HistoryPage {
    name = "";
    customData = null;
    stateData = null;
    /**
     * 
     * @param {String} name A string containing the path of the page.
     * @param {Object} customData An object containing any custom data that should be stored with the page.
     * @param {String} stateData A string containing the state data key. This is optional.
     */
    constructor(name, customData, stateData) {
        this.name = name;
        this.customData = customData;
        if (!isNaN(Date.parse(stateData))) {
            this.stateData = stateData;
        } else if (stateData) {
            this.stateData = new Date().toISOString();
        } else {
            this.stateData = null;
        }
    }

    /**
     * @description Updates and existing History Page, but keeps the state Data key the same.
     * @param {String} name A string containing the path of the page.
     * @param {Object} customData An object containing any custom data that should be stored with the page.
     */
    update(name, customData = null) {
        this.name = name;
        if (customData != null) {
            this.customData = customData;
        }
    }
}

/**
 * @global
 * @class
 * @classdesc A class which represents a Book.
 */
export class Book {
    /**
     * @param {Number} barcodeNumber 
     * @param {String} title 
     * @param {String} subtitle 
     * @param {Person[]} authors 
     * @param {Person[]} illustrators 
     * @param {String} medium a string containing either "paperback", "hardcover", or "av"
     * @param {String} coverImageLink 
     * @param {String} thumbnailImageLink 
     * @param {String} iconImageLink 
     * @param {String[]} subjects 
     * @param {String} description 
     * @param {Audience} audience 
     * @param {String} isbn10 
     * @param {String} isbn13 
     * @param {String[]} publishers 
     * @param {Date} publishDate 
     * @param {Number} numberOfPages 
     * @param {String} ddc dewey decimal classification
     * @param {Date} purchaseDate 
     * @param {Number} purchasePrice 
     * @param {String} vendor 
     * @param {String[]} keywords array of important words from the description, used for searching
     * @param {Boolean} canBeCheckedOut 
     * @param {Boolean} isDeleted 
     * @param {Boolean} isHidden 
     * @param {Date} lastUpdated 
     */
    constructor(barcodeNumber = null, title = null, subtitle = null, authors = null, illustrators = null,
        medium = null, coverImageLink = null, thumbnailImageLink = null, iconImageLink = null,
        subjects = null, description = null, audience = null, isbn10 = null, isbn13 = null,
        publishers = null, publishDate = null, numberOfPages = null, ddc = null, purchaseDate = null,
        purchasePrice = null, vendor = null, keywords = null, canBeCheckedOut = null, isDeleted = null,
        isHidden = null, lastUpdated = null) {
        this.barcodeNumber = barcodeNumber;
        this.title = title;
        this.subtitle = subtitle;
        this.authors = [];
        for (let i = 0; i < authors.length; i++) {
            if (authors[i]) {
                this.authors.push(new Person(authors[i].firstName, authors[i].lastName));
            }
        }
        this.illustrators = [];
        for (let i = 0; i < illustrators.length; i++) {
            if (illustrators[i]) {
                this.illustrators.push(new Person(illustrators[i].firstName, illustrators[i].lastName));
            }
        }
        this.medium = medium;
        this.coverImageLink = coverImageLink;
        this.thumbnailImageLink = thumbnailImageLink;
        this.iconImageLink = iconImageLink;
        this.subjects = subjects;
        this.description = description;
        this.audience = new Audience(audience.children, audience.youth, audience.adult);
        this.isbn10 = isbn10;
        this.isbn13 = isbn13;
        this.publishers = publishers;
        this.publishDate = publishDate;
        this.numberOfPages = numberOfPages;
        this.ddc = ddc;
        this.purchaseDate = purchaseDate;
        this.purchasePrice = purchasePrice;
        this.vendor = vendor;
        this.keywords = keywords;
        this.canBeCheckedOut = canBeCheckedOut;
        this.isDeleted = isDeleted;
        this.isHidden = isHidden;
        this.lastUpdated = lastUpdated;
    }

    /**
     * @param {Object} jsonObject a json object imported from firebase
     * @returns a new Book object with all of that data in it
     */
    static createFromObject(jsonObject) {
        if (jsonObject instanceof Book) {
            console.warn("tried to pass a Book object into Book.createFromObject");
            return jsonObject;
        }
        let authors = [];
        let illustrators = [];
        for (let i = 0; i < jsonObject.authors.length; i++) {
            if (jsonObject.authors[i]) {
                authors.push(new Person(jsonObject.authors[i].firstName, jsonObject.authors[i].lastName));
            }
        }
        for (let i = 0; i < jsonObject.illustrators.length; i++) {
            if (jsonObject.illustrators[i]) {
                illustrators.push(new Person(jsonObject.illustrators[i].firstName, jsonObject.illustrators[i].lastName));
            }
        }
        if (jsonObject.publishDate) {
            if (jsonObject.publishDate.seconds)
                jsonObject.publishDate = new Date(jsonObject.publishDate.seconds * 1000);
            else
                jsonObject.publishDate = new Date(jsonObject.publishDate);
        }
        if (jsonObject.purchaseDate) {
            if (jsonObject.purchaseDate.seconds)
                jsonObject.purchaseDate = new Date(jsonObject.purchaseDate.seconds * 1000);
            else
                jsonObject.purchaseDate = new Date(jsonObject.purchaseDate);
        }
        if (jsonObject.lastUpdated) {
            if (jsonObject.lastUpdated.seconds)
                jsonObject.lastUpdated = new Date(jsonObject.lastUpdated.seconds * 1000);
            else
                jsonObject.lastUpdated = new Date(jsonObject.lastUpdated);
        }
        return new Book(jsonObject.barcodeNumber, jsonObject.title, jsonObject.subtitle, authors, illustrators,
            jsonObject.medium, jsonObject.coverImageLink, jsonObject.thumbnailImageLink,
            jsonObject.iconImageLink, jsonObject.subjects, jsonObject.description,
            new Audience(jsonObject.audience.children, jsonObject.audience.youth, jsonObject.audience.adult),
            jsonObject.isbn10, jsonObject.isbn13, jsonObject.publishers, jsonObject.publishDate,
            jsonObject.numberOfPages, jsonObject.ddc, jsonObject.purchaseDate, jsonObject.purchasePrice,
            jsonObject.vendor, jsonObject.keywords, jsonObject.canBeCheckedOut, jsonObject.isDeleted,
            jsonObject.isHidden, jsonObject.lastUpdated);
    }

    /**
     * @returns {Object} a vanilla JSON object representing a Book
     */
    toObject() {
        let authors = [];
        for (let i = 0; i < this.authors.length; i++) {
            authors.push(this.authors[i].toObject());
        }
        let illustrators = [];
        for (let i = 0; i < this.illustrators.length; i++) {
            illustrators.push(this.illustrators[i].toObject());
        }
        let audience = this.audience.toObject();
        return {
            barcodeNumber: this.barcodeNumber,
            title: this.title,
            subtitle: this.subtitle,
            authors: authors,
            illustrators: illustrators,
            medium: this.medium,
            coverImageLink: this.coverImageLink,
            thumbnailImageLink: this.thumbnailImageLink,
            iconImageLink: this.iconImageLink,
            subjects: this.subjects,
            description: this.description,
            audience: audience,
            isbn10: this.isbn10,
            isbn13: this.isbn13,
            publishers: this.publishers,
            publishDate: this.publishDate,
            numberOfPages: this.numberOfPages,
            ddc: this.ddc,
            purchaseDate: this.purchaseDate,
            purchasePrice: this.purchasePrice,
            vendor: this.vendor,
            keywords: this.keywords,
            canBeCheckedOut: this.canBeCheckedOut,
            isDeleted: this.isDeleted,
            isHidden: this.isHidden,
            lastUpdated: this.lastUpdated
        };
    }

    /**
     * @description Creates image links for the current book and updates the book object with them. The links will include a last updated timestamp.
     * @returns {Array<String>} an array of image links for this book. The first link is the cover image, the second is the thumbnail image, and the third is the icon image.
     */
    generateImageLinks() {
        let time = new Date();
        let timeString = time.getFullYear().toString() + "-" + (time.getMonth()+1).toString().padStart(2, "0") + "-" + time.getDate().toString().padStart(2, "0") + "_"
            + time.getHours().toString().padStart(2, "0") + ":" + time.getMinutes().toString().padStart(2, "0") + ":" + time.getSeconds().toString().padStart(2, "0");
        if (!this.barcodeNumber) {
            console.warn("cannot generate image links for a book without a barcode number");
            return;
        }
        let imageLinks = [];
        imageLinks.push("https://storage.googleapis.com/south-church-library/books/" + this.barcodeNumber + "/cover.jpg?lastUpdated=" + timeString);
        imageLinks.push("https://storage.googleapis.com/south-church-library/books/" + this.barcodeNumber + "/cover-400px.jpg?lastUpdated=" + timeString);
        imageLinks.push("https://storage.googleapis.com/south-church-library/books/" + this.barcodeNumber + "/cover-250px.jpg?lastUpdated=" + timeString);
        this.coverImageLink = imageLinks[0];
        this.thumbnailImageLink = imageLinks[1];
        this.iconImageLink = imageLinks[2];
        return imageLinks;
    }

    /**
     * @description Checks if the current book is the same as another book. Retruns true if the title, subtitle, and author all match or if either of their ISBN numbers match.
     * @param {*} book1 the first book to compare
     * @param {*} book2 the second book to compare
     * @returns {Boolean} true if the books are the same book, even if they have different barcode numbers.
     */
    static isSameBook(book1, book2) {
        if (!book1 || !book2) {
            return false;
        }
        if (book1.barcodeNumber == book2.barcodeNumber) {
            return true;
        }
        if (book1.isbn10 && book2.isbn10 && book1.isbn10 == book2.isbn10) {
            return true;
        }
        if (book1.isbn13 && book2.isbn13 && book1.isbn13 == book2.isbn13) {
            return true;
        }
        if (book1.title == book2.title && book1.subtitle == book2.subtitle && (!book1.authors[0] || !book2.authors[0] || Person.isSamePerson(book1.authors[0], book2.authors[0]))) {
            return true;
        }
        return false;
    }

    /**
     * @param {Book} book1 
     * @param {Book} book2 
     * @returns true iff the books are exactly the same in every aspect
     */
    static equals(book1, book2) {
        if (book1 && !book2 || !book1 && book2) {
            return false;
        }
        if (!book1 && !book2) {
            return true;
        }
        for (let key in book1) {
            if ((book1[key] && !book2[key]) || (!book1[key] && book2[key])) {
                return false;
            }
            if (!book1[key] && !book2[key]) {
                continue;
            }
            if (key == "authors" || key == "illustrators") {
                if (book1[key].length != book2[key].length) {
                    return false;
                }
                for (let i = 0; i < book1[key].length; i++) {
                    if (book1[key][i].firstName != book2[key][i].firstName ||
                        book1[key][i].lastName != book2[key][i].lastName) {
                        return false;
                    }
                }
            } else if (key == "audience") {
                if (book1[key].children != book2[key].children || book1[key].youth != book2[key].youth ||
                    book1[key].adult != book2[key].adult) {
                    return false;
                }
            } else if (key == "subjects" || key == "publishers" || key == "keywords") {
                if (book1[key].length != book2[key].length) {
                    return false;
                }
                for (let i = 0; i < book1[key].length; i++) {
                    if (book1[key][i] != book2[key][i]) {
                        return false;
                    }
                }
            } else if (key == "publishDate" || key == "purchaseDate" || key == "lastUpdated") {
                if (book1[key].seconds != book2[key].seconds) {
                    return false;
                }
            } else {
                if (book1[key] != book2[key]) {
                    return false;
                }
            }
        }
        return true;
    }
}


/**
 * @global
 * @class
 * @classdesc A class which represents a Checkout.
 */
export class Checkout {
    /**
     * @param {String} barcodeNumber The barcode number of the book being checked out
     * @param {Boolean} complete The status of the checkout. Defaults to false.
     * @param {Date} timestamp The timestamp of the checkout, also can be used as an ID to group checkouts together
     * @param {String} cardNumber The card number of the user checking out the book
     * @param {Date} dueDate The date the book is due back
     * @param {Array<String>} flags An array of flags about a checkout (such as "LOST" or "DAMAGED").
     * @param {Date} lastUpdated The last time this checkout object was updated.
     * @param {Date} overdueEmailSentDate The date of the last overdue email
     * @param {Number} overdueEmailSentCount The number of overdue emails sent about this checkout.
     * @param {Date} reminderEmailSentDate The date of the last reminder email
     * @param {Boolean} userReturned A boolean representing if the user has claimed to return the book
     * @param {Date} userReturnedDate The date the user claimed to return the book
     * @param {Boolean} librarianCheckedIn A boolean representing if the librarian has checked in the book
     * @param {Date} librarianCheckedInDate The date the librarian checked in the book
     * @param {String} librarianCheckedInBy The card number of the librarian who checked in the book
     * @param {String} librarianCheckedInNotes Any notes the librarian made about the checkout
     * @param {Number} renewals The number of times the book has been renewed
     */
    constructor(barcodeNumber = null, complete = false, timestamp = null, cardNumber = null, dueDate = null,
        flags = [], lastUpdated = null, overdueEmailSentDate = null, overdueEmailSentCount = 0, reminderEmailSentDate = null,
        userReturned = false, userReturnedDate = null, librarianCheckedIn = false, librarianCheckedInDate = null,
        librarianCheckedInBy = null, librarianCheckedInNotes = null, renewals = 0) {
        this.barcodeNumber = barcodeNumber;
        this.complete = complete;
        this.timestamp = timestamp;
        this.cardNumber = cardNumber;
        this.dueDate = dueDate;
        this.flags = flags;
        this.lastUpdated = lastUpdated;
        this.overdueEmailSentDate = overdueEmailSentDate;
        this.overdueEmailSentCount = overdueEmailSentCount;
        this.reminderEmailSentDate = reminderEmailSentDate;
        this.userReturned = userReturned;
        this.userReturnedDate = userReturnedDate;
        this.librarianCheckedIn = librarianCheckedIn;
        this.librarianCheckedInDate = librarianCheckedInDate;
        this.librarianCheckedInBy = librarianCheckedInBy;
        this.librarianCheckedInNotes = librarianCheckedInNotes;
        this.renewals = renewals;
    }

    /**
     * @param {Object} jsonObject a json object imported from firebase
     * @returns a new Checkout object with all of that data in it
     */
    static createFromObject(jsonObject) {
        if (jsonObject instanceof Checkout) {
            console.warn("tried to pass a Checkout object into Checkout.createFromObject");
            return jsonObject;
        }
        if (jsonObject.timestamp) {
            if (jsonObject.timestamp.seconds)
                jsonObject.timestamp = new Date(jsonObject.timestamp.seconds * 1000);
            else
                jsonObject.timestamp = new Date(jsonObject.timestamp);
        }
        if (jsonObject.dueDate) {
            if (jsonObject.dueDate.seconds)
                jsonObject.dueDate = new Date(jsonObject.dueDate.seconds * 1000);
            else
                jsonObject.dueDate = new Date(jsonObject.dueDate);
        }
        if (jsonObject.lastUpdated) {
            if (jsonObject.lastUpdated.seconds)
                jsonObject.lastUpdated = new Date(jsonObject.lastUpdated.seconds * 1000);
            else
                jsonObject.lastUpdated = new Date(jsonObject.lastUpdated);
        }
        if (jsonObject.overdueEmailSentDate) {
            if (jsonObject.overdueEmailSentDate.seconds)
                jsonObject.overdueEmailSentDate = new Date(jsonObject.overdueEmailSentDate.seconds * 1000);
            else
                jsonObject.overdueEmailSentDate = new Date(jsonObject.overdueEmailSentDate);
        }
        if (jsonObject.reminderEmailSentDate) {
            if (jsonObject.reminderEmailSentDate.seconds)
                jsonObject.reminderEmailSentDate = new Date(jsonObject.reminderEmailSentDate.seconds * 1000);
            else
                jsonObject.reminderEmailSentDate = new Date(jsonObject.reminderEmailSentDate);
        }
        if (jsonObject.userReturnedDate) {
            if (jsonObject.userReturnedDate.seconds)
                jsonObject.userReturnedDate = new Date(jsonObject.userReturnedDate.seconds * 1000);
            else
                jsonObject.userReturnedDate = new Date(jsonObject.userReturnedDate);
        }
        if (jsonObject.librarianCheckedInDate) {
            if (jsonObject.librarianCheckedInDate.seconds)
                jsonObject.librarianCheckedInDate = new Date(jsonObject.librarianCheckedInDate.seconds * 1000);
            else
                jsonObject.librarianCheckedInDate = new Date(jsonObject.librarianCheckedInDate);
        }
        return new Checkout(jsonObject.barcodeNumber, jsonObject.complete, jsonObject.timestamp, jsonObject.cardNumber,
            jsonObject.dueDate, jsonObject.flags, jsonObject.lastUpdated, jsonObject.overdueEmailSentDate,
            jsonObject.overdueEmailSentCount, jsonObject.reminderEmailSentDate, jsonObject.userReturned,
            jsonObject.userReturnedDate, jsonObject.librarianCheckedIn, jsonObject.librarianCheckedInDate,
            jsonObject.librarianCheckedInBy, jsonObject.librarianCheckedInNotes, jsonObject.renewals);
    }

    /**
     * @returns {Object} a vanilla JSON object representing a Checkout
     */
    toObject() {
        return {
            barcodeNumber: this.barcodeNumber,
            complete: this.complete,
            timestamp: this.timestamp,
            cardNumber: this.cardNumber,
            dueDate: this.dueDate,
            flags: this.flags,
            lastUpdated: this.lastUpdated,
            overdueEmailSentDate: this.overdueEmailSentDate,
            overdueEmailSentCount: this.overdueEmailSentCount,
            reminderEmailSentDate: this.reminderEmailSentDate,
            userReturned: this.userReturned,
            userReturnedDate: this.userReturnedDate,
            librarianCheckedIn: this.librarianCheckedIn,
            librarianCheckedInDate: this.librarianCheckedInDate,
            librarianCheckedInBy: this.librarianCheckedInBy,
            librarianCheckedInNotes: this.librarianCheckedInNotes,
            renewals: this.renewals
        };
    }

    /**
     * @description Checks if the current checkout is part of the same transaction as another checkout.
     * @param {Checkout} checkout1 the first checkout to compare
     * @param {Checkout} checkout2 the second checkout to compare
     * @returns {Boolean} true if the checkouts are the same checkout, false otherwise
     */
    static isSameCheckout(checkout1, checkout2) {
        if (checkout1.cardNumber == checkout2.cardNumber && checkout1.timestamp.valueOf() == checkout2.timestamp.valueOf()) {
            return true;
        }
        return false;
    }
}


/**
 * @global
 * @class
 * @classdesc A class which represents a group of checkouts.
 */
export class CheckoutGroup {
    /**
     * @param {Array<Checkout>} checkouts An array of checkout objects to handle as a group.
     * @returns {<void>}
     */
    constructor(checkouts = []) {
        // Ensure that the checkouts are all from the same event.
        for (let i = 0; i < checkouts.length - 1; i++) {
            if (!Checkout.isSameCheckout(checkouts[i], checkouts[i + 1])) {
                console.warn("Tried to create a CheckoutGroup with a list of checkouts from different events.");
                return;
            }
        }
        this.checkouts = checkouts;
        // Determine if the checkout group is complete
        let completeStatus = true;
        for (let i = 0; i < checkouts.length; i++) {
            if (!checkouts[i].complete) {
                completeStatus = false;
                break;
            }
        }
        this.complete = completeStatus;

        this.timestamp = checkouts[0].timestamp;
        this.cardNumber = checkouts[0].cardNumber;
        // Lists all flags in the underlying checkouts
        let flagsList = [];
        for (let i = 0; i < checkouts.length; i++) {
            flagsList = Array.from(new Set(flagsList.concat(checkouts[i].flags)));
        }
        this.flags = flagsList;
        let earliestDueDate = checkouts[0].dueDate;
        for (let i = 1; i < checkouts.length; i++) {
            if (checkouts[i].dueDate < earliestDueDate) {
                earliestDueDate = checkouts[i].dueDate;
            }
        }
        this.dueDate = earliestDueDate;
    }
}


/**
 * @global
 * @class
 * @classdesc A person, such as an author or illustrator
 */
export class Person {
    /**
     * @param {String} firstName 
     * @param {String} lastName 
     */
    constructor(firstName = null, lastName = null) {
        this.firstName = firstName;
        this.lastName = lastName;
    }

    /**
     * @description Determines if two people are the same person. This is determined by comparing first and last names.
     * @param {Person} person1 the first person to compare
     * @param {Person} person2 the second person to compare
     * @returns {Boolean} true iff the two people are the same person.
     */
    static isSamePerson(person1, person2) {
        if (!person1 || !person2) {
            return false;
        }
        if (person1.firstName == person2.firstName && person1.lastName == person2.lastName) {
            return true;
        }
        return false;
    }

    /**
     * @returns a vanilla JSON object representing a Person
     */
    toObject() {
        return {
            firstName: this.firstName,
            lastName: this.lastName
        };
    }
}

/**
 * @global
 * @class
 * @classdesc The audience for a book
 */
export class Audience {
    /**
     * 
     * @param {Boolean} children 
     * @param {Boolean} youth 
     * @param {Boolean} adult 
     */
    constructor(children = null, youth = null, adult = null) {
        this.children = children;
        this.youth = youth;
        this.adult = adult;
    }

    toString() {
        let str = "";
        if (this.children) {
            str += "Children";
        }
        if (this.youth) {
            if (str != "") str += ", ";
            str += "Youth";
        }
        if (this.adult) {
            if (str != "") str += ", ";
            str += "Adult";
        }
        if (str == "") str = "None";
        return str;
    }

    /**
     * 
     * @returns {Boolean} A boolean representing whether or not the audience is specified.
     */
    isNone() {
        return !(this.children || this.youth || this.adult);
    }

    /**
     * @returns {Object} a vanilla JSON object representing an Audience
     */
    toObject() {
        return {
            children: this.children,
            youth: this.youth,
            adult: this.adult
        };
    }

    /**
     * @returns {Array} an array of strings representing the audience
     */
    toArray() {
        let arr = [];
        if (this.children) {
            arr.push("Children");
        }
        if (this.youth) {
            arr.push("Youth");
        }
        if (this.adult) {
            arr.push("Adult");
        }
        return arr;
    }
}

/**
 * @global
 * @class
 * @classdesc A user of the library
 */
export class User {
    /**
     * @param {Number} cardNumber 
     * @param {String} firstName 
     * @param {String} lastName 
     * @param {String} email 
     * @param {String} phone 
     * @param {String} address 
     * @param {String} pfpLink 
     * @param {String} pfpIconLink 
     * @param {Date} dateCreated 
     * @param {Date} lastCheckoutTime 
     * @param {Date} lastSignInTime 
     * @param {String} uid the string that the auth object uses to represent a user
     * @param {Boolean} canCheckOutBooks indicates if the user is authorized to check out books
     * @param {Boolean} isDeleted
     * @param {Boolean} isHidden
     * @param {Date} lastUpdated
     * @param {Boolean} notificationsOn
     * @param {Boolean} emailVerified
     * @param {Boolean} isDisabled
     */
    constructor(cardNumber = null, firstName = null, lastName = null, email = null, phone = null,
        address = null, pfpLink = null, pfpIconLink = null, dateCreated = null, lastCheckoutTime = null,
        lastSignInTime = null, uid = null, canCheckOutBooks = null, isDeleted = null, isHidden = null,
        lastUpdated = null, notificationsOn = null, emailVerified = null, isDisabled = null) {
        this.cardNumber = cardNumber;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.pfpLink = pfpLink;
        this.pfpIconLink = pfpIconLink;
        this.dateCreated = dateCreated;
        this.lastCheckoutTime = lastCheckoutTime;
        this.lastSignInTime = lastSignInTime;
        this.uid = uid;
        this.canCheckOutBooks = canCheckOutBooks;
        this.isDeleted = isDeleted;
        this.isHidden = isHidden;
        this.lastUpdated = lastUpdated;
        this.notificationsOn = notificationsOn;
        this.emailVerified = emailVerified;
        this.isDisabled = isDisabled;
    }

    /**
     * @param {Object} jsonObject a json object imported from firebase
     * @returns a new User object with all of that data in it
     */
    static createFromObject(jsonObject) {
        if (jsonObject instanceof User) {
            console.warn("tried to pass a User object into User.createFromObject");
            return jsonObject;
        }
        if (jsonObject.dateCreated) {
            if (jsonObject.dateCreated.seconds)
                jsonObject.dateCreated = new Date(jsonObject.dateCreated.seconds * 1000);
            else
                jsonObject.dateCreated = new Date(jsonObject.dateCreated);
        }
        if (jsonObject.lastCheckoutTime) {
            if (jsonObject.lastCheckoutTime.seconds)
                jsonObject.lastCheckoutTime = new Date(jsonObject.lastCheckoutTime.seconds * 1000);
            else
                jsonObject.lastCheckoutTime = new Date(jsonObject.lastCheckoutTime);
        }
        if (jsonObject.lastSignInTime) {
            if (jsonObject.lastSignInTime.seconds)
                jsonObject.lastSignInTime = new Date(jsonObject.lastSignInTime.seconds * 1000);
            else
                jsonObject.lastSignInTime = new Date(jsonObject.lastSignInTime);
        }
        if (jsonObject.lastUpdated) {
            if (jsonObject.lastUpdated.seconds)
                jsonObject.lastUpdated = new Date(jsonObject.lastUpdated.seconds * 1000);
            else
                jsonObject.lastUpdated = new Date(jsonObject.lastUpdated);
        }
        return new User(jsonObject.cardNumber, jsonObject.firstName, jsonObject.lastName, jsonObject.email,
            jsonObject.phone, jsonObject.address, jsonObject.pfpLink, jsonObject.pfpIconLink,
            jsonObject.dateCreated, jsonObject.lastCheckoutTime, jsonObject.lastSignInTime, jsonObject.uid,
            jsonObject.canCheckOutBooks, jsonObject.isDeleted, jsonObject.isHidden, jsonObject.lastUpdated,
            jsonObject.notificationsOn, jsonObject.emailVerified, jsonObject.isDisabled);
    }

    /**
     * @returns {Object} a vanilla JSON object representing a User
     */
    toObject() {
        return {
            cardNumber: this.cardNumber,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            phone: this.phone,
            address: this.address,
            pfpLink: this.pfpLink,
            pfpIconLink: this.pfpIconLink,
            dateCreated: this.dateCreated,
            lastCheckoutTime: this.lastCheckoutTime,
            lastSignInTime: this.lastSignInTime,
            uid: this.uid,
            canCheckOutBooks: this.canCheckOutBooks,
            isDeleted: this.isDeleted,
            isHidden: this.isHidden,
            lastUpdated: this.lastUpdated,
            notificationsOn: this.notificationsOn,
            emailVerified: this.emailVerified,
            isDisabled: this.isDisabled
        };
    }
}
