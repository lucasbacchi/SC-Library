export let app = null;

export function setApp(newApp) {
    app = newApp;
}


export let db = null;

export function setDb(newDb) {
    db = newDb;
}


export let analytics = null;

export function setAnalytics(newAnalytics) {
    analytics = newAnalytics;
}


export let auth = null;

export function setAuth(newAuth) {
    auth = newAuth;
}


export let performance = null;

export function setPerformance(newPerformance) {
    performance = newPerformance;
}


export let storage = null;

export function setStorage(newStorage) {
    storage = newStorage;
}


export let bookDatabase = null;

export function setBookDatabase(newBookDatabase) {
    bookDatabase = newBookDatabase;
}


export let searchCache = null;

export function setSearchCache(newSearchCache) {
    searchCache = newSearchCache;
}


export let timeLastSearched = null;

export function setTimeLastSearched(newTimeLastSearched) {
    timeLastSearched = newTimeLastSearched;
}


export let currentPage = null;

export function setCurrentPage(newCurrentPage) {
    currentPage = newCurrentPage;
}


export let currentQuery = null;

export function setCurrentQuery(newCurrentQuery) {
    currentQuery = newCurrentQuery;
}


export let currentHash = null;

export function setCurrentHash(newCurrentHash) {
    currentHash = newCurrentHash;
}


export let currentPanel = null;

export function setCurrentPanel(newCurrentPanel) {
    currentPanel = newCurrentPanel;
}


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
    "autogenindex",
    "help",
    "login",
    "main",
    "result",
    "search",
    "signup",
    "sitemap"
];



export class HistoryStack {
    stack = [];
    currentIndex = -1;
    constructor(stack, currentIndex) {
        this.stack = stack;
        this.currentIndex = currentIndex;
    }

    push(item) {
        if (this.currentIndex < this.stack.length - 1) {
            this.remove(this.currentIndex + 1, this.stack.length - this.currentIndex - 1);
        }
        this.stack.push(item);
        this.currentIndex++;
    }

    pop() {
        this.currentIndex--;
        return this.stack.pop();
    }

    insert(item, index) {
        this.stack.splice(index, 0, item);
    }

    remove(index, count = 1) {
        this.stack.splice(index, count);
        if (this.currentIndex >= index) {
            this.currentIndex -= count;
        }
    }

    first(item) {
        if (this.stack.length == 0 && this.currentIndex == -1) {
            this.push(item);
            window.history.replaceState({
                stack: this.stack,
                index: this.currentIndex
            }, "");
        }
    }
}

export let historyStack = null;

export function setHistoryStack(newHistoryStack) {
    if (newHistoryStack == undefined) {
        historyStack = new HistoryStack([], -1);
    } else {
        historyStack = new HistoryStack(newHistoryStack.stack, newHistoryStack.index);
    }
}

export class Book {
    /**
     * 
     * @param {number} barcodeNumber 
     * @param {string} title 
     * @param {string} subtitle 
     * @param {Person[]} authors 
     * @param {Person[]} illustrators 
     * @param {string} medium a string containing either "paperback", "hardcover", or "av"
     * @param {string} coverImageLink 
     * @param {string} thumbnailImageLink 
     * @param {string[]} subjects 
     * @param {string} description 
     * @param {Audience} audience 
     * @param {string} isbn10 
     * @param {string} isbn13 
     * @param {string[]} publishers 
     * @param {Date} publishDate 
     * @param {number} numberOfPages 
     * @param {string} ddc dewey decimal classification
     * @param {Date} purchaseDate 
     * @param {number} purchasePrice 
     * @param {string} vendor 
     * @param {string[]} keywords array of important words from the description, used for searching
     * @param {boolean} canBeCheckedOut 
     * @param {boolean} isDeleted 
     * @param {boolean} isHidden 
     * @param {Date} lastUpdated 
     */
    constructor(barcodeNumber, title, subtitle, authors, illustrators, medium, coverImageLink, thumbnailImageLink,
        subjects, description, audience, isbn10, isbn13, publishers, publishDate, numberOfPages, ddc,
        purchaseDate, purchasePrice, vendor, keywords, canBeCheckedOut, isDeleted, isHidden, lastUpdated) {
        this.barcodeNumber = barcodeNumber;
        this.title = title;
        this.subtitle = subtitle;
        this.authors = [];
        this.illustrators = [];
        for (let i = 0; i < 2; i++) {
            if (authors[i]) {
                this.authors.push(new Person(authors[i].firstName, authors[i].lastName));
            }
            if (illustrators[i]) {
                this.illustrators.push(new Person(illustrators[i].firstName, illustrators[i].lastName));
            }
        }
        this.medium = medium;
        this.coverImageLink = coverImageLink;
        this.thumbnailImageLink = thumbnailImageLink;
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
     * 
     * @param {object} jsonObject a json object imported from firebase
     * @returns a new Book object with all of that data in it
     */
    static createFromObject(jsonObject) {
        let authors = [];
        let illustrators = [];
        for (let i = 0; i < 2; i++) {
            if (jsonObject.authors[i]) {
                authors.push(new Person(jsonObject.authors[i].firstName, jsonObject.authors[i].lastName));
            }
            if (jsonObject.illustrators[i]) {
                illustrators.push(new Person(jsonObject.illustrators[i].firstName, jsonObject.illustrators[i].lastName));
            }
        }
        return new Book(jsonObject.barcodeNumber, jsonObject.title, jsonObject.subtitle, authors, illustrators,
            jsonObject.medium, jsonObject.coverImageLink, jsonObject.thumbnailImageLink, jsonObject.subjects,
            jsonObject.description,
            new Audience(jsonObject.audience.children, jsonObject.audience.youth, jsonObject.audience.adult),
            jsonObject.isbn10, jsonObject.isbn13, jsonObject.publishers, jsonObject.publishDate,
            jsonObject.numberOfPages, jsonObject.ddc, jsonObject.purchaseDate, jsonObject.purchasePrice,
            jsonObject.vendor, jsonObject.keywords, jsonObject.canBeCheckedOut, jsonObject.isDeleted,
            jsonObject.isHidden, jsonObject.lastUpdated);
    }
}

export class Person {
    /**
     * 
     * @param {string} firstName 
     * @param {string} lastName 
     */
    constructor(firstName, lastName) {
        this.firstName = firstName;
        this.lastName = lastName;
    }
}

export class Audience {
    /**
     * 
     * @param {boolean} children 
     * @param {boolean} youth 
     * @param {boolean} adult 
     */
    constructor(children, youth, adult) {
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
     * @returns {boolean} 
     */
    isNone() {
        return !(this.children || this.youth || this.adult);
    }
}

export class User {
    /**
     * 
     * @param {number} cardNumber 
     * @param {string} firstName 
     * @param {string} lastName 
     * @param {string} emailAddress 
     * @param {string} phoneNumber 
     * @param {string} address 
     * @param {string} pfpLink 
     * @param {string} pfpIconLink 
     * @param {Date} dateCreated 
     * @param {Date} lastCheckoutTime 
     * @param {Date} lastSignInTime 
     * @param {string} uid the string that the auth object uses to represent a user
     */
    constructor(cardNumber, firstName, lastName, emailAddress, phoneNumber, address, pfpLink, pfpIconLink,
        dateCreated, lastCheckoutTime, lastSignInTime, uid) {
        this.cardNumber = cardNumber;
        this.firstName = firstName;
        this.lastName = lastName;
        this.emailAddress = emailAddress;
        this.phoneNumber = phoneNumber;
        this.address = address;
        this.pfpLink = pfpLink;
        this.pfpIconLink = pfpIconLink;
        this.dateCreated = dateCreated;
        this.lastCheckoutTime = lastCheckoutTime;
        this.lastSignInTime = lastSignInTime;
        this.uid = uid;
    }

    /**
     * 
     * @param {object} jsonObject a json object imported from firebase
     * @returns a new User object with all of that data in it
     */
    static createFromObject(jsonObject) {
        return new Book(jsonObject.cardNumber, jsonObject.firstName, jsonObject.lastName, jsonObject.emailAddress,
            jsonObject.phoneNumber, jsonObject.address, jsonObject.pfpLink, jsonObject.pfpIconLink,
            jsonObject.dateCreated, jsonObject.lastCheckoutTime, jsonObject.lastSignInTime, jsonObject.uid);
    }
}

export class Checkout {
    /**
     * 
     * @param {number} book the book's barcode number
     * @param {number} user the user's barcode number
     * @param {Date} checkoutTime 
     * @param {Date} dueDate 
     */
    constructor(book, user, checkoutTime, dueDate) {
        this.book = book;
        this.user = user;
        this.checkoutTime = checkoutTime;
        this.dueDate = dueDate;
        this.checkinTime = null;
        this.resolved = false;
    }

    /**
     * 
     * @param {object} jsonObject a json object imported from firebase
     * @returns a new Checkout object with all of that data in it
     */
    static createFromObject(jsonObject) {
        return new Checkout(jsonObject.book, jsonObject.user, jsonObject.checkoutTime, jsonObject.dueDate);
    }
}
