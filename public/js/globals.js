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
            window.history.replaceState({stack: this.stack, index: this.currentIndex}, "");
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
    constructor(barcodeNumber, title, subtitle, authors, illustrators, medium, coverImageLink, thumbnailImageLink,
                subjects, description, audience, isbn10, isbn13, publishers, publishDate, numberOfPages, ddc,
                purchaseDate, purchasePrice, vendor, keywords, canBeCheckedOut, isDeleted, isHidden, lastUpdated) {
        this.barcodeNumber = barcodeNumber;
        this.title = title;
        this.subtitle = subtitle;
        this.authors = authors;
        this.illustrators = illustrators;
        this.medium = medium;
        this.coverImageLink = coverImageLink;
        this.thumbnailImageLink = thumbnailImageLink;
        this.subjects = subjects;
        this.description = description;
        this.audience = audience;
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
}

