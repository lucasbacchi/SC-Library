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


export let currentPanel = null;

export function setCurrentPanel(newCurrentPanel) {
    currentPanel = newCurrentPanel;
}


export let directory = [
    "/account/overview",
    "/account/notifications",
    "/account/checkouts",
    "/account/security",
    "/admin/barcode",
    "/admin/editEntry",
    "/admin/editUser",
    "/admin/inventory",
    "/admin/main",
    "/admin/report",
    "/admin/view",
    "/404",
    "/about",
    "/account",
    "/advancedSearch",
    "/autogenindex",
    "/help",
    "/login",
    "/main",
    "/result",
    "/search",
    "/signup",
    "/sitemap"
];



export let loadedSources = [];

export function setLoadedSources(newLoadedSources) {
    loadedSources = newLoadedSources;
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

