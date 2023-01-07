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
    "autogenindex",
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
 * @classdesc A class which represents a stack of pages which can be navigated through using the browswer history.
 */
export class HistoryStack {
    stack = [];
    currentIndex = -1;

    /**
     * @param {HistoryPage[]} stack A list of objects which contain the page extensions in the order that they have been visitied since the first page load, and optionally custom data.
     * @param {Number} currentIndex The index of the current page in the stack. Useful for stepping back and forth through the stack.
     */
    constructor(stack, currentIndex) {
        this.stack = stack;
        this.currentIndex = currentIndex;
    }

    /**
     * @param {HistoryPage} item 
     * @description Adds a new page to the stack and sets it as the current page using the currentIndex.
     */
    push(item) {
        if (this.currentIndex < this.stack.length - 1) {
            this.remove(this.currentIndex + 1, this.stack.length - this.currentIndex - 1);
        }
        this.stack.push(item);
        this.currentIndex++;
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
     * @param {HistoryPage} item The item to add to the stack.
     * @description Used to add the first item to the stack.
     */
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

/**
 * @global
 * @type {HistoryStack}
 * @description The global variable historyStack which stores the stack of history events.
 */
export let historyStack = null;

/**
 * @global
 * @param {HistoryStack} newHistoryStack the history stack to set
 * @description Sets the global variable historyStack to the new stack.
 */
export function setHistoryStack(newHistoryStack) {
    if (newHistoryStack == undefined) {
        historyStack = new HistoryStack([], -1);
    } else {
        historyStack = new HistoryStack(newHistoryStack.stack, newHistoryStack.index);
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
    /**
     * 
     * @param {String} name A string containing the path of the page.
     * @param {Object} customData An object containing any custom data that should be stored with the page.
     */
    constructor(name, customData) {
        this.name = name;
        this.customData = customData;
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
            jsonObject.publishDate = new Date(jsonObject.publishDate.seconds * 1000);
        }
        if (jsonObject.purchaseDate) {
            jsonObject.purchaseDate = new Date(jsonObject.purchaseDate.seconds * 1000);
        }
        if (jsonObject.lastUpdated) {
            jsonObject.lastUpdated = new Date(jsonObject.lastUpdated.seconds * 1000);
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
     */
    constructor(cardNumber = null, firstName = null, lastName = null, email = null, phone = null,
        address = null, pfpLink = null, pfpIconLink = null, dateCreated = null, lastCheckoutTime = null,
        lastSignInTime = null, uid = null, canCheckOutBooks = null, isDeleted = null, isHidden = null,
        lastUpdated = null, notificationsOn = null) {
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
        return new User(jsonObject.cardNumber, jsonObject.firstName, jsonObject.lastName, jsonObject.email,
            jsonObject.phone, jsonObject.address, jsonObject.pfpLink, jsonObject.pfpIconLink,
            jsonObject.dateCreated, jsonObject.lastCheckoutTime, jsonObject.lastSignInTime, jsonObject.uid,
            jsonObject.canCheckOutBooks, jsonObject.isDeleted, jsonObject.isHidden, jsonObject.lastUpdated,
            jsonObject.notificationsOn);
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
            notificationsOn: this.notificationsOn
        };
    }
}

/**
 * @global
 * @class
 * @classdesc An object representing a checkout event and its status.
 */
export class Checkout {
    /**
     * @param {Number} book the book's barcode number
     * @param {Number} user the user's card number
     * @param {Date} checkoutTime 
     * @param {Date} dueDate 
     * @param {Date} checkinTime
     * @param {Boolean} resolved
     */
    constructor(book = null, user = null, checkoutTime = null, dueDate = null, checkinTime = null, resolved = false) {
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
    static createFromObject(jsonObject) {
        if (jsonObject instanceof Checkout) {
            console.warn("tried to pass a Checkout object into Checkout.createFromObject");
            return jsonObject;
        }
        return new Checkout(jsonObject.book, jsonObject.user, jsonObject.checkoutTime, jsonObject.dueDate,
            jsonObject.checkinTime, jsonObject.resolved);
    }

    /**
     * @returns {Object} a vanilla JSON object representing a Checkout
     */
    toObject() {
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
