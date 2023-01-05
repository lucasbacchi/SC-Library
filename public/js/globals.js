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
     * @param {string} medium - a string containing either "paperback", "hardcover", or "av"
     * @param {string} coverImageLink 
     * @param {string} thumbnailImageLink 
     * @param {string} iconImageLink 
     * @param {string[]} subjects 
     * @param {string} description 
     * @param {Audience} audience 
     * @param {string} isbn10 
     * @param {string} isbn13 
     * @param {string[]} publishers 
     * @param {Date} publishDate 
     * @param {number} numberOfPages 
     * @param {string} ddc - dewey decimal classification
     * @param {Date} purchaseDate 
     * @param {number} purchasePrice 
     * @param {string} vendor 
     * @param {string[]} keywords - array of important words from the description, used for searching
     * @param {boolean} canBeCheckedOut 
     * @param {boolean} isDeleted 
     * @param {boolean} isHidden 
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
        if (coverImageLink == null && barcodeNumber) {
            this.coverImageLink = "https://storage.googleapis.com/south-church-library/books/" + barcodeNumber + "/cover.jpg";
        } else {
            this.coverImageLink = coverImageLink;
        }
        if (thumbnailImageLink == null && barcodeNumber) {
            this.thumbnailImageLink = "https://storage.googleapis.com/south-church-library/books/" + barcodeNumber + "/cover-400px.jpg";
        } else {
            this.thumbnailImageLink = thumbnailImageLink;
        }
        if (iconImageLink == null && barcodeNumber) {
            this.iconImageLink = "https://storage.googleapis.com/south-church-library/books/" + barcodeNumber + "/cover-250px.jpg";
        } else {
            this.iconImageLink = iconImageLink;
        }
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
     * @param {object} jsonObject - a json object imported from firebase
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
     * 
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

export class Person {
    /**
     * 
     * @param {string} firstName 
     * @param {string} lastName 
     */
    constructor(firstName = null, lastName = null) {
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
     * @param {string} uid - the string that the auth object uses to represent a user
     */
    constructor(cardNumber = null, firstName = null, lastName = null, emailAddress = null, phoneNumber = null,
        address = null, pfpLink = null, pfpIconLink = null, dateCreated = null, lastCheckoutTime = null,
        lastSignInTime = null, uid = null) {
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
     * @param {object} jsonObject - a json object imported from firebase
     * @returns a new User object with all of that data in it
     */
    static createFromObject(jsonObject) {
        if (jsonObject instanceof User) {
            console.warn("tried to pass a User object into User.createFromObject");
            return jsonObject;
        }
        return new User(jsonObject.cardNumber, jsonObject.firstName, jsonObject.lastName, jsonObject.emailAddress,
            jsonObject.phoneNumber, jsonObject.address, jsonObject.pfpLink, jsonObject.pfpIconLink,
            jsonObject.dateCreated, jsonObject.lastCheckoutTime, jsonObject.lastSignInTime, jsonObject.uid);
    }
}

export class Checkout {
    /**
     * 
     * @param {number} book - the book's barcode number
     * @param {number} user - the user's card number
     * @param {Date} checkoutTime 
     * @param {Date} dueDate 
     */
    constructor(book = null, user = null, checkoutTime = null, dueDate = null) {
        this.book = book;
        this.user = user;
        this.checkoutTime = checkoutTime;
        this.dueDate = dueDate;
        this.checkinTime = null;
        this.resolved = false;
    }

    /**
     * 
     * @param {object} jsonObject - a json object imported from firebase
     * @returns a new Checkout object with all of that data in it
     */
    static createFromObject(jsonObject) {
        if (jsonObject instanceof Checkout) {
            console.warn("tried to pass a Checkout object into Checkout.createFromObject");
            return jsonObject;
        }
        return new Checkout(jsonObject.book, jsonObject.user, jsonObject.checkoutTime, jsonObject.dueDate);
    }
}
