import type { Analytics } from "firebase/analytics";
import type { FirebaseApp } from "firebase/app";
import type { Auth } from "firebase/auth";
import type { Firestore, Timestamp } from "firebase/firestore";
import type { FirebasePerformance } from "firebase/performance";
import type { FirebaseStorage } from "firebase/storage";

/**
 * @global
 * @type {FirebaseApp}
 * @description The global variable app which stores the Firebase App instance.
 */
export let app: FirebaseApp;

/**
 * @global
 * @param {FirebaseApp} newApp The app instance to set
 * @description Sets the global variable app to the new FirebaseApp instance.
 */
export function setApp(newApp: FirebaseApp) {
    app = newApp;
}

/**
 * @global
 * @type {Firestore}
 * @description The global variable db which stores the Firebase Firestore instance.
 */
export let db: Firestore;

/**
 * @global
 * @param {Firestore} newDb The Firestore instance to set
 * @description Sets the global variable db to the new Firestore instance.
 */
export function setDb(newDb: Firestore) {
    db = newDb;
}

/**
 * @global
 * @type {Analytics}
 * @description The global variable analytics which stores the Firebase Analytics instance.
 */
export let analytics: Analytics;

/**
 * @global
 * @param {Analytics} newAnalytics The Analytics instance to set
 * @description Sets the global variable analytics to the new Analytics instance.
 */
export function setAnalytics(newAnalytics: Analytics) {
    analytics = newAnalytics;
}

/**
 * @global
 * @type {Auth}
 * @description The global variable auth which stores the Firebase Authentication instance.
 */
export let auth: Auth;

/**
 * @global
 * @param {Auth} newAuth The Auth instance to set
 * @description Sets the global variable auth to the new Auth instance.
 */
export function setAuth(newAuth: Auth) {
    auth = newAuth;
}

/**
 * @global
 * @type {FirebasePerformance}
 * @description The global variable performance which stores the Firebase Performance instance.
 */
export let performance: FirebasePerformance;

/**
 * @global
 * @param {FirebasePerformance} newPerformance The Performance instance to set
 * @description Sets the global variable performance to the new Firebase Performance instance.
 */
export function setPerformance(newPerformance: FirebasePerformance) {
    performance = newPerformance;
}

/**
 * @global
 * @type {FirebaseStorage}
 * @description The global variable storage which stores the Firebase Storage instance.
 */
export let storage: FirebaseStorage;

/**
 * @global
 * @param {FirebaseStorage} newStorage The FirebaseStorage instance to set
 * @description Sets the global variable storage to the new Firebase Storage instance.
 */
export function setStorage(newStorage: FirebaseStorage) {
    storage = newStorage;
}

export type BookDocument = {
    books: Book[];
    order: number;
};
/**
 * @global
 * @type {Book[][]} Specifically, an array of Book Documents each of which is an array of Book objects. The nested arrays have a maximum size of 100.
 * @description A global variable which stores the books in the database for the purposes of caching and searching.
 */
export let bookDatabase: BookDocument[] | null = null;

/**
 * @global
 * @param {Book[][]} newBookDatabase The book database to set
 * @description Sets the global variable bookDatabase to the new copy of the database.
 */
export function setBookDatabase(newBookDatabase: BookDocument[] | null) {
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
export let searchCache: Book[] | null = null;

/**
 * @global
 * @param {Book[]} newSearchCache The search cache to set
 * @description Sets the global variable searchCache to the new array of results.
 */
export function setSearchCache(newSearchCache: Book[] | null) {
    searchCache = newSearchCache;
}

/**
 * @global
 * @type {Date}
 * @description The global variable timeLastSearched which stores the last time a search was performed. This is used to determine whether or not to update the search cache.
 */
export let timeLastSearched: Date | null = null;

/**
 * @global
 * @param {Date} newTimeLastSearched The time to set
 * @description Sets the global variable timeLastSearched to the new time.
 */
export function setTimeLastSearched(newTimeLastSearched: Date | null) {
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
export let currentPage: string | null = null;

/**
 * @global
 * @param {String} newCurrentPage The page to set
 * @description Sets the global variable currentPage to the new page name.
 */
export function setCurrentPage(newCurrentPage: string) {
    currentPage = newCurrentPage;
}

/**
 * @global
 * @type {String}
 * @description The global variable currentQuery which stores the current query string from the URL.
 */
export let currentQuery: string | null = null;

/**
 * @global
 * @param {String} newCurrentQuery The query to set
 * @description Sets the global variable currentQuery to the new query value.
 */
export function setCurrentQuery(newCurrentQuery: string) {
    currentQuery = newCurrentQuery;
}

/**
 * @global
 * @type {String}
 * @description The global variable currentHash which stores the current hash string from the URL.
 */
export let currentHash: string | null = null;

/**
 * @global
 * @param {String} newCurrentHash The hash to set
 * @description Sets the global variable currentHash to the new hash value.
 */
export function setCurrentHash(newCurrentHash: string) {
    currentHash = newCurrentHash;
}

/**
 * @global
 * @type {String}
 * @description The global variable currentPanel which stores the current panel string from the URL. This stores the current subpage of the current page.
 */
export let currentPanel: string | null = null;

/**
 * @global
 * @param {String} newcurrentPanel The panel to set
 * @description Sets the global variable currentPanel to the new panel name.
 */
export function setCurrentPanel(newCurrentPanel: string) {
    currentPanel = newCurrentPanel;
}

// Shouldn't need this anymore
/**
 * @global
 * @type {HistoryManager}
 * @description The global variable historyManager which stores the history manager and the stack of history events.
 */
// export let historyManager: HistoryManager | null = null;

/**
 * @global
 * @param {Object} state the history state stored in the browser history (if there is one).
 * @description Sets the global variable historyManager to the new manager.
 */
// export function setHistoryManager(state: HistoryManager) {
//     if (state == undefined) {
//         // There was no history found in the browser, so create a blank manager.
//         // This happens on the first page load as well as any time the URL is edited manually.
//         historyManager = new HistoryManager([], -1);
//     } else {
//         // There was history found in the browser, so create a manager with the history. This will happen if the user reloads the page.
//         historyManager = new HistoryManager(state.stack, state.index);
//     }
// }

/**
 * @global
 * @type {IDBDatabase}
 * @description The global variable iDB which stores the current state of the indexedDB.
 */
export let iDB: IDBDatabase | null = null;

/**
 * @global
 * @param {IDBDatabase} newIDB the new indexedDB to set
 * @description Sets the global variable iDB to the new indexedDB.
 */
export function setIDB(newIDB: IDBDatabase) {
    iDB = newIDB;
}

/**
 * @global
 * @type {String[]}
 * @description A global variable which stores the list of valid pages on the site. Used to determine whether or not to redirect to the 404 page.
 */
export const directory = [
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
    "help",
    "login",
    "main",
    "result",
    "search",
    "signup",
    "sitemap"
];

// Shouldn't need this anymore
/**
 * @global
 * @class
 * @classdesc A class which manages the history and stores a stack of pages which can be navigated through using the browswer history.
 */
// export class HistoryManager {
//     [key: string]: unknown;
//     stack: HistoryPage[] = [];
//     currentIndex = -1;

//     /**
//      * @param {HistoryPage[]} stack A list of objects which contain the page extensions in the order that they have been visitied since the first page load, and optionally custom data.
//      * @param {Number} currentIndex The index of the current page in the stack. Useful for stepping back and forth through the stack.
//      */
//     constructor(...args: unknown[]);
//     constructor(stack: HistoryPage[], currentIndex: number) {
//         const convertedStack: HistoryPage[] = [];
//         stack.forEach((page: HistoryPage) => {
//             convertedStack.push(new HistoryPage(page.name, page.customData, page.stateData));
//         });
//         this.stack = convertedStack;
//         this.currentIndex = currentIndex;
//     }

//     /**
//      * @param {String} name The name of the page to add to the stack.
//      * @param {Object} customData Any custom data to add to the page. This is optional.
//      * @param {Object} stateData Any state data to save. This is optional.
//      * @description Adds the information to a HistoryPage, adds it to the stack and sets it as the current page using the currentIndex.
//      */
//     push(name: string, customData = null, stateData = null, first = false) {
//         // If we are somewhere in the past, remove all pages after the current page
//         if (this.currentIndex < this.stack.length - 1) {
//             this.remove(this.currentIndex + 1, this.stack.length - this.currentIndex - 1);
//         }
//         if (name.charAt(0) != "/") {
//             name = "/" + name;
//         }
//         let stateDataKey = undefined; // Tells HistoryPage not to generate a key
//         // Save the state data
//         if (stateData != null) {
//             stateDataKey = null; // Will be set by HistoryPage
//         }
//         // Add the page to the stack
//         this.stack.push(new HistoryPage(name, customData, stateDataKey));
//         this.currentIndex++;
//         // If this is not the first time we are running this, add to the browser history
//         if (!first) {
//             window.history.pushState({ stack: this.stack, index: this.currentIndex }, "", name);
//         }
//         if (stateData != null) {
//             // Save the state data
//             stateDataKey = this.stack[this.currentIndex].stateData;
//             if (!iDB) {
//                 console.error("iDB is not initialized");
//                 return;
//             }
//             iDB.transaction("historyStates", "readwrite").objectStore("historyStates").put(stateData, stateDataKey);
//         }
//     }

//     /**
//      * @param {String} name The name of the page to add to the stack.
//      * @param {Object} customData Any custom data to add to the page. This is optional.
//      * @param {Object} stateData Any state data to save. This is optional.
//      * @description Updates the current page in the history stack and then updates the browser history.
//      */
//     update(name: string | null, customData: object | null = null, stateData: Record<string, unknown> | null = null) {
//         if (name == undefined) {
//             name = this.stack[this.currentIndex].name;
//         } else if (name.charAt(0) != "/") {
//             name = "/" + name;
//         }
//         // Get the state data key
//         let stateDataKey = this.stack[this.currentIndex].stateData;
//         if (!stateDataKey && stateData) {
//             // If there is no state data key, but there is state data, generate a new key
//             this.stack[this.currentIndex] = new HistoryPage(name, customData, stateData);
//             stateDataKey = this.stack[this.currentIndex].stateData;
//         }
//         // Update the current page in the stack
//         this.stack[this.currentIndex].update(name, customData);
//         // Update the history
//         setTimeout(() => {
//             window.history.replaceState({ stack: this.stack, index: this.currentIndex }, "", name);
//         }, 10);
//         // Save the state data
//         if (stateData) {
//             if (!iDB) {
//                 console.error("iDB is not initialized");
//                 return;
//             }
//             iDB.transaction("historyStates", "readwrite").objectStore("historyStates").put(stateData, stateDataKey);
//         }
//     }

//     /**
//      * @description Removes the top page from the stack and sets the previous page as the current page using the currentIndex.
//      * @returns {HistoryPage} The current page in the stack.
//      */
//     pop() {
//         this.currentIndex--;
//         return this.stack.pop();
//     }

//     /**
//      * @description Gets the page at the specified index relative to the current page.
//      * @param {Number} relativeIndex The index of the page relative to the current page. Defaults to 0.
//      * @returns {HistoryPage} The page at the specified index.
//      */
//     get(relativeIndex = 0) {
//         return this.stack[this.currentIndex + relativeIndex];
//     }

//     /**
//      * @param {HistoryPage} item The item to insert into the stack.
//      * @param {Number} index The index to insert the item at.
//      * @description Inserts an item into the stack at the specified index.
//      */
//     insert(item: HistoryPage, index: number) {
//         this.stack.splice(index, 0, item);
//     }

//     /**
//      * @param {Number} index The index of the item to remove.
//      * @param {Number} count The number fo entries you want to remove. Defaults to 1.
//      * @description Removes a number items from the stack at the specified index.
//      */
//     remove(index: number, count = 1) {
//         this.stack.splice(index, count);
//         if (this.currentIndex >= index) {
//             this.currentIndex -= count;
//         }
//     }

//     /**
//      * @param {String} name The item to add to the stack.
//      * @param {Object} customData Any custom data to add to the page. This is optional.
//      * @param {Object} stateData Any state data to save. This is optional.
//      * @description Used to add the first item to the stack.
//      */
//     first(name: string, customData = null, stateData = null) {
//         if (name.charAt(0) != "/") {
//             name = "/" + name;
//         }
//         if (this.stack.length == 0 && this.currentIndex == -1) {
//             // This will only run if there was no history found.
//             this.push(name, customData, stateData, true);
//             window.history.replaceState(
//                 {
//                     stack: this.stack,
//                     index: this.currentIndex
//                 },
//                 "",
//                 name
//             );
//             if (history.scrollRestoration) {
//                 history.scrollRestoration = "manual";
//             }
//         }
//     }

//     /**
//      * @description Used to get a state data object from IndexedDB.
//      * @param {String} stateDataKey
//      * @returns {Promise<String>} A promise which resolves with the state data in the form of a string
//      */
//     static getFromIDB(stateDataKey: string): Promise<string> {
//         return new Promise<string>((resolve, reject) => {
//             if (!stateDataKey) {
//                 throw new Error("stateDataKey is undefined");
//             }
//             if (!iDB) {
//                 throw new Error("iDB is not initialized");
//             }
//             const request = iDB.transaction("historyStates").objectStore("historyStates").get(stateDataKey);
//             request.onsuccess = () => {
//                 // Convert JSON Objects to Book Objects
//                 if (request.result.searchPageData) {
//                     const searchPageData = request.result.searchPageData;
//                     searchPageData.books = searchPageData.books.map((book: Book) => Book.createFromObject(book));
//                     searchPageData.browseResultsArray = searchPageData.browseResultsArray.map((book: Book) =>
//                         Book.createFromObject(book)
//                     );
//                     searchPageData.resultsArray = searchPageData.resultsArray.map((book: Book) =>
//                         Book.createFromObject(book)
//                     );
//                     request.result.searchPageData = searchPageData;
//                 }
//                 if (request.result.homeBookBoxes) {
//                     let homeBookBoxes = request.result.homeBookBoxes;
//                     homeBookBoxes = homeBookBoxes.map((book: Book) => Book.createFromObject(book));
//                     request.result.homeBookBoxes = homeBookBoxes;
//                 }

//                 resolve(request.result);
//             };
//             request.onerror = () => {
//                 reject(request.error);
//             };
//         });
//     }
// }

// Shouldn't need this anymore
/**
 * @global
 * @class
 * @classdesc A class which represents an entry in the history which can be navigated through using the browswer.
 */
// export class HistoryPage {
//     [key: string]: unknown;
//     name = "";
//     customData: object | null = null;
//     stateData: string | null = null;
//     /**
//      *
//      * @param {String} name A string containing the path of the page.
//      * @param {Object} customData An object containing any custom data that should be stored with the page.
//      * @param {String} stateData A string containing the state data key. This is optional.
//      */
//     constructor(...args: unknown[]);
//     constructor(name: string, customData: object | null, stateData: string | null) {
//         this.name = name;
//         this.customData = customData;
//         if (stateData && !isNaN(Date.parse(stateData))) {
//             this.stateData = stateData;
//         } else if (stateData) {
//             this.stateData = new Date().toISOString();
//         } else {
//             this.stateData = null;
//         }
//     }

//     /**
//      * @description Updates and existing History Page, but keeps the state Data key the same.
//      * @param {String} name A string containing the path of the page.
//      * @param {Object} customData An object containing any custom data that should be stored with the page.
//      */
//     update(name: string, customData = null) {
//         this.name = name;
//         if (customData != null) {
//             this.customData = customData;
//         }
//     }
// }

/**
 * @global
 * @class
 * @classdesc A class which represents a Book.
 */
export class Book {
    barcodeNumber: number | null;
    title: string | null;
    subtitle: string | null;
    authors: Person[];
    illustrators: Person[];
    medium: string | null;
    coverImageLink: string | null;
    thumbnailImageLink: string | null;
    iconImageLink: string | null;
    subjects: string[] | null;
    description: string | null;
    audience: Audience | null;
    isbn10: string | null;
    isbn13: string | null;
    publishers: string[] | null;
    publishDate: Date | null;
    numberOfPages: number | null;
    ddc: string | null;
    purchaseDate: Date | null;
    purchasePrice: number | null;
    vendor: string | null;
    keywords: string[] | null;
    canBeCheckedOut: boolean | null;
    isDeleted: boolean | null;
    isHidden: boolean | null;
    lastUpdated: Date | null;

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
    constructor(
        barcodeNumber: number | null = null,
        title: string | null = null,
        subtitle: string | null = null,
        authors: Person[] | null = null,
        illustrators: Person[] | null = null,
        medium: string | null = null,
        coverImageLink: string | null = null,
        thumbnailImageLink: string | null = null,
        iconImageLink: string | null = null,
        subjects: string[] | null = null,
        description: string | null = null,
        audience: Audience | null = null,
        isbn10: string | null = null,
        isbn13: string | null = null,
        publishers: string[] | null = null,
        publishDate: Date | null = null,
        numberOfPages: number | null = null,
        ddc: string | null = null,
        purchaseDate: Date | null = null,
        purchasePrice: number | null = null,
        vendor: string | null = null,
        keywords: string[] | null = null,
        canBeCheckedOut: boolean | null = null,
        isDeleted: boolean | null = null,
        isHidden: boolean | null = null,
        lastUpdated: Date | null = null
    ) {
        this.barcodeNumber = barcodeNumber;
        this.title = title;
        this.subtitle = subtitle;
        this.authors = [];
        for (let i = 0; i < (authors ?? []).length; i++) {
            if (authors?.[i]) {
                this.authors.push(new Person(authors[i].firstName, authors[i].lastName));
            }
        }
        this.illustrators = [];
        for (let i = 0; i < (illustrators ?? []).length; i++) {
            if (illustrators?.[i]) {
                this.illustrators.push(new Person(illustrators[i].firstName, illustrators[i].lastName));
            }
        }
        this.medium = medium;
        this.coverImageLink = coverImageLink;
        this.thumbnailImageLink = thumbnailImageLink;
        this.iconImageLink = iconImageLink;
        this.subjects = subjects;
        this.description = description;
        this.audience = audience ? new Audience(audience.children, audience.youth, audience.adult) : null;
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
    static createFromObject(jsonObject: unknown): Book {
        if (jsonObject instanceof Book) {
            console.warn("tried to pass a Book object into Book.createFromObject");
            return jsonObject;
        }
        if (typeof jsonObject !== "object" || jsonObject === null || Array.isArray(jsonObject)) {
            throw new TypeError("Invalid Book data: expected an object");
        }

        // Typescript types are compile-time only; data read from a database must be
        // checked before it is used as application data.
        const data = jsonObject as Record<string, unknown>;
        const isRecord = (value: unknown): value is Record<string, unknown> =>
            typeof value === "object" && value !== null && !Array.isArray(value);
        const nullable = <T>(key: string, isValid: (value: unknown) => value is T): T | null => {
            const value = data[key];
            if (value == null) return null;
            if (!isValid(value)) throw new TypeError(`Invalid Book data: ${key}`);
            return value;
        };
        const isString = (value: unknown): value is string => typeof value === "string";
        const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
        const isBoolean = (value: unknown): value is boolean => typeof value === "boolean";
        const stringArray = (key: string): string[] | null =>
            nullable(key, (value): value is string[] => Array.isArray(value) && value.every(isString));
        const people = (key: string): Person[] => {
            const value = data[key];
            if (value == null) return [];
            if (!Array.isArray(value)) throw new TypeError(`Invalid Book data: ${key}`);
            return value.map((person, index) => {
                if (!isRecord(person)) throw new TypeError(`Invalid Book data: ${key}[${index}]`);
                const firstName = person.firstName;
                const lastName = person.lastName;
                if (firstName != null && !isString(firstName)) {
                    throw new TypeError(`Invalid Book data: ${key}[${index}].firstName`);
                }
                if (lastName != null && !isString(lastName)) {
                    throw new TypeError(`Invalid Book data: ${key}[${index}].lastName`);
                }
                return new Person(isString(firstName) ? firstName : null, isString(lastName) ? lastName : null);
            });
        };
        const parseDate = (value: unknown, key: string): Date | null => {
            if (value == null) return null;
            let date: Date;
            if (value instanceof Date) {
                date = new Date(value.getTime());
            } else if (isRecord(value) && typeof value.toDate === "function") {
                const converted = value.toDate();
                if (!(converted instanceof Date)) throw new TypeError(`Invalid Book data: ${key}`);
                date = new Date(converted.getTime());
            } else if (isRecord(value) && isNumber(value.seconds)) {
                date = new Date(value.seconds * 1000);
            } else if (typeof value === "string" || typeof value === "number") {
                date = new Date(value);
            } else {
                throw new TypeError(`Invalid Book data: ${key}`);
            }
            if (Number.isNaN(date.getTime())) throw new TypeError(`Invalid Book data: ${key}`);
            return date;
        };
        let audience: Audience | null = null;
        if (data.audience != null) {
            if (!isRecord(data.audience)) throw new TypeError("Invalid Book data: audience");
            for (const key of ["children", "youth", "adult"]) {
                if (data.audience[key] != null && !isBoolean(data.audience[key])) {
                    throw new TypeError(`Invalid Book data: audience.${key}`);
                }
            }
            audience = new Audience(
                isBoolean(data.audience.children) ? data.audience.children : null,
                isBoolean(data.audience.youth) ? data.audience.youth : null,
                isBoolean(data.audience.adult) ? data.audience.adult : null
            );
        }
        return new Book(
            nullable("barcodeNumber", isNumber),
            nullable("title", isString),
            nullable("subtitle", isString),
            people("authors"),
            people("illustrators"),
            nullable("medium", isString),
            nullable("coverImageLink", isString),
            nullable("thumbnailImageLink", isString),
            nullable("iconImageLink", isString),
            stringArray("subjects"),
            nullable("description", isString),
            audience,
            nullable("isbn10", isString),
            nullable("isbn13", isString),
            stringArray("publishers"),
            parseDate(data.publishDate, "publishDate"),
            nullable("numberOfPages", isNumber),
            nullable("ddc", isString),
            parseDate(data.purchaseDate, "purchaseDate"),
            nullable("purchasePrice", isNumber),
            nullable("vendor", isString),
            stringArray("keywords"),
            nullable("canBeCheckedOut", isBoolean),
            nullable("isDeleted", isBoolean),
            nullable("isHidden", isBoolean),
            parseDate(data.lastUpdated, "lastUpdated")
        );
    }

    /**
     * @returns {Object} a vanilla JSON object representing a Book
     */
    toObject() {
        const authors = [];
        for (let i = 0; i < this.authors.length; i++) {
            authors.push(this.authors[i].toObject());
        }
        const illustrators = [];
        for (let i = 0; i < this.illustrators.length; i++) {
            illustrators.push(this.illustrators[i].toObject());
        }
        const audience = this.audience?.toObject() ?? null;
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
        const time = new Date();
        const timeString = time.valueOf();
        if (!this.barcodeNumber) {
            console.warn("cannot generate image links for a book without a barcode number");
            return;
        }
        const imageLinks = [];
        imageLinks.push(
            "https://storage.googleapis.com/south-church-library/books/" +
                this.barcodeNumber +
                "/cover.jpg?lastUpdated=" +
                timeString
        );
        imageLinks.push(
            "https://storage.googleapis.com/south-church-library/books/" +
                this.barcodeNumber +
                "/cover-400px.jpg?lastUpdated=" +
                timeString
        );
        imageLinks.push(
            "https://storage.googleapis.com/south-church-library/books/" +
                this.barcodeNumber +
                "/cover-250px.jpg?lastUpdated=" +
                timeString
        );
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
    static isSameBook(book1: Book, book2: Book) {
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
        if (
            book1.title == book2.title &&
            book1.subtitle == book2.subtitle &&
            (!book1.authors[0] || !book2.authors[0] || Person.isSamePerson(book1.authors[0], book2.authors[0]))
        ) {
            return true;
        }
        return false;
    }

    /**
     * @param {Book} book1
     * @param {Book} book2
     * @returns true iff the books are exactly the same in every aspect
     */
    static equals(book1: Book, book2: Book) {
        if ((book1 && !book2) || (!book1 && book2)) {
            return false;
        }
        if (!book1 && !book2) {
            return true;
        }
        const peopleEqual = (people1: Person[], people2: Person[]) =>
            people1.length === people2.length &&
            people1.every(
                (person, index) =>
                    person.firstName === people2[index].firstName && person.lastName === people2[index].lastName
            );
        const stringsEqual = (values1: string[] | null, values2: string[] | null) =>
            values1 === values2 ||
            (values1 !== null &&
                values2 !== null &&
                values1.length === values2.length &&
                values1.every((value, index) => value === values2[index]));
        const datesEqual = (date1: Date | null, date2: Date | null) =>
            date1 === date2 || (date1 !== null && date2 !== null && date1.getTime() === date2.getTime());

        return (
            book1.barcodeNumber === book2.barcodeNumber &&
            book1.title === book2.title &&
            book1.subtitle === book2.subtitle &&
            peopleEqual(book1.authors, book2.authors) &&
            peopleEqual(book1.illustrators, book2.illustrators) &&
            book1.medium === book2.medium &&
            book1.coverImageLink === book2.coverImageLink &&
            book1.thumbnailImageLink === book2.thumbnailImageLink &&
            book1.iconImageLink === book2.iconImageLink &&
            stringsEqual(book1.subjects, book2.subjects) &&
            book1.description === book2.description &&
            ((book1.audience === null && book2.audience === null) ||
                (book1.audience !== null &&
                    book2.audience !== null &&
                    book1.audience.children === book2.audience.children &&
                    book1.audience.youth === book2.audience.youth &&
                    book1.audience.adult === book2.audience.adult)) &&
            book1.isbn10 === book2.isbn10 &&
            book1.isbn13 === book2.isbn13 &&
            stringsEqual(book1.publishers, book2.publishers) &&
            datesEqual(book1.publishDate, book2.publishDate) &&
            book1.numberOfPages === book2.numberOfPages &&
            book1.ddc === book2.ddc &&
            datesEqual(book1.purchaseDate, book2.purchaseDate) &&
            book1.purchasePrice === book2.purchasePrice &&
            book1.vendor === book2.vendor &&
            stringsEqual(book1.keywords, book2.keywords) &&
            book1.canBeCheckedOut === book2.canBeCheckedOut &&
            book1.isDeleted === book2.isDeleted &&
            book1.isHidden === book2.isHidden &&
            datesEqual(book1.lastUpdated, book2.lastUpdated)
        );
    }
}

/**
 * @global
 * @class
 * @classdesc A person, such as an author or illustrator
 */
export class Person {
    firstName: string | null;
    lastName: string | null;

    /**
     * @param firstName The person's first name.
     * @param lastName The person's last name.
     */
    constructor(firstName: string | null = null, lastName: string | null = null) {
        this.firstName = firstName;
        this.lastName = lastName;
    }

    /**
     * @description Determines if two people are the same person. This is determined by comparing first and last names.
     * @param person1 The first person to compare.
     * @param person2 The second person to compare.
     * @returns true iff the two people are the same person.
     */
    static isSamePerson(person1: Person | null | undefined, person2: Person | null | undefined): boolean {
        if (!person1 || !person2) {
            return false;
        }
        return person1.firstName === person2.firstName && person1.lastName === person2.lastName;
    }

    /**
     * @returns a vanilla JSON object representing a Person.
     */
    toObject(): { firstName: string | null; lastName: string | null } {
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
    children: boolean | null;
    youth: boolean | null;
    adult: boolean | null;
    /**
     *
     * @param {Boolean} children
     * @param {Boolean} youth
     * @param {Boolean} adult
     */
    constructor(children: boolean | null = null, youth: boolean | null = null, adult: boolean | null = null) {
        this.children = children;
        this.youth = youth;
        this.adult = adult;
    }

    toString(): string {
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
    isNone(): boolean {
        return !(this.children || this.youth || this.adult);
    }

    /**
     * @returns {Object} a vanilla JSON object representing an Audience
     */
    toObject(): { children: boolean | null; youth: boolean | null; adult: boolean | null } {
        return {
            children: this.children,
            youth: this.youth,
            adult: this.adult
        };
    }

    /**
     * @returns {Array} an array of strings representing the audience
     */
    toArray(): string[] {
        const arr: string[] = [];
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
    cardNumber: number | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    address: string | null;
    pfpLink: string | null;
    pfpIconLink: string | null;
    dateCreated: Date | null;
    lastCheckoutTime: Date | null;
    lastSignInTime: Date | null;
    uid: string | null;
    canCheckOutBooks: boolean | null;
    isDeleted: boolean | null;
    isHidden: boolean | null;
    lastUpdated: Date | null;
    notificationsOn: boolean | null;
    emailVerified: boolean | null;
    isDisabled: boolean | null;
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
    constructor(
        cardNumber: number | null = null,
        firstName: string | null = null,
        lastName: string | null = null,
        email: string | null = null,
        phone: string | null = null,
        address: string | null = null,
        pfpLink: string | null = null,
        pfpIconLink: string | null = null,
        dateCreated: Date | null = null,
        lastCheckoutTime: Date | null = null,
        lastSignInTime: Date | null = null,
        uid: string | null = null,
        canCheckOutBooks: boolean | null = null,
        isDeleted: boolean | null = null,
        isHidden: boolean | null = null,
        lastUpdated: Date | null = null,
        notificationsOn: boolean | null = null,
        emailVerified: boolean | null = null,
        isDisabled: boolean | null = null
    ) {
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
    static createFromObject(jsonObject: Partial<User>): User {
        if (jsonObject instanceof User) {
            console.warn("tried to pass a User object into User.createFromObject");
            return jsonObject;
        }
        const toDate = (value: Timestamp | Date | null | undefined): Date | null | undefined => {
            if (value == null || value instanceof Date) return value;
            if (typeof value.toDate === "function") return value.toDate();

            // Handle Firestore Timestamp objects and their serialized form.
            const seconds = value.seconds;
            const nanoseconds = value.nanoseconds;

            return new Date(seconds * 1000 + nanoseconds / 1e6);
        };

        jsonObject.dateCreated = toDate(jsonObject.dateCreated);
        jsonObject.lastCheckoutTime = toDate(jsonObject.lastCheckoutTime);
        jsonObject.lastSignInTime = toDate(jsonObject.lastSignInTime);
        jsonObject.lastUpdated = toDate(jsonObject.lastUpdated);
        return new User(
            jsonObject.cardNumber,
            jsonObject.firstName,
            jsonObject.lastName,
            jsonObject.email,
            jsonObject.phone,
            jsonObject.address,
            jsonObject.pfpLink,
            jsonObject.pfpIconLink,
            jsonObject.dateCreated,
            jsonObject.lastCheckoutTime,
            jsonObject.lastSignInTime,
            jsonObject.uid,
            jsonObject.canCheckOutBooks,
            jsonObject.isDeleted,
            jsonObject.isHidden,
            jsonObject.lastUpdated,
            jsonObject.notificationsOn,
            jsonObject.emailVerified,
            jsonObject.isDisabled
        );
    }

    /**
     * @returns {Object} a vanilla JSON object representing a User
     */
    toObject(): Omit<User, "toObject"> {
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

/**
 * @global
 * @class
 * @classdesc An object representing a checkout event and its status.
 */
export class Checkout {
    book: number | null;
    user: number | null;
    checkoutTime: Date | null;
    dueDate: Date | null;
    checkinTime: Date | null;
    resolved: boolean;
    /**
     * @param {Number} book the book's barcode number
     * @param {Number} user the user's card number
     * @param {Date} checkoutTime
     * @param {Date} dueDate
     * @param {Date} checkinTime
     * @param {Boolean} resolved
     */
    constructor(
        book: number | null = null,
        user: number | null = null,
        checkoutTime: Date | null = null,
        dueDate: Date | null = null,
        checkinTime: Date | null = null,
        resolved: boolean = false
    ) {
        this.book = book;
        this.user = user;
        this.checkoutTime = checkoutTime;
        this.dueDate = dueDate;
        this.checkinTime = checkinTime;
        this.resolved = resolved;
    }

    /**
     * @param {Object} jsonObject a json object imported from firebase
     * @returns a new Checkout object with all of that data in it
     */
    static createFromObject(jsonObject: Partial<Checkout>): Checkout {
        if (jsonObject instanceof Checkout) {
            console.warn("tried to pass a Checkout object into Checkout.createFromObject");
            return jsonObject;
        }
        return new Checkout(
            jsonObject.book ?? null,
            jsonObject.user ?? null,
            jsonObject.checkoutTime ?? null,
            jsonObject.dueDate ?? null,
            jsonObject.checkinTime ?? null,
            jsonObject.resolved ?? false
        );
    }

    /**
     * @returns {Object} a vanilla JSON object representing a Checkout
     */
    toObject(): Omit<Checkout, "toObject"> {
        return {
            book: this.book,
            user: this.user,
            checkoutTime: this.checkoutTime,
            dueDate: this.dueDate,
            checkinTime: this.checkinTime,
            resolved: this.resolved
        };
    }
}
