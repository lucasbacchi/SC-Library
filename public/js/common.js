import { logEvent } from "firebase/analytics";
import { sendEmailVerification } from "firebase/auth";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { isAdminCheck } from "./ajax";
import { timeLastSearched, setTimeLastSearched, db, setBookDatabase, bookDatabase, setSearchCache, auth, historyManager, analytics, Book } from "./globals";

/************
BEGIN SEARCH
*************/

/**
 * Searches the book database for books based on a query
 * @param {String} searchQuery The Query to search
 * @param {Number} start The start place in the results list
 * @param {Number} end The end place in the results list
 * @param {Boolean} viewHidden Determines if the function returns hidden books
 * @returns {Promise<Array>} An array of results
 */
export function search(searchQuery, viewHidden = false) {
    return new Promise((resolve, reject) => {
        updateBookDatabase().then(() => {
            resolve(performSearch(searchQuery, viewHidden));
        }).catch((error) => {
            console.error("Search function failed to update the book database", error);
            reject();
        });
    });
}

export function updateBookDatabase(forced = false) {
    return new Promise((resolve, reject) => {
        if (timeLastSearched == null || timeLastSearched.getTime() + 1000 * 60 * 15 < Date.now() || forced) {
            // It hasn't searched since the page loaded, or it's been 15 mins since last page load
            setTimeLastSearched(new Date());
            getDocs(query(collection(db, "books"), where("order", ">=", 0), orderBy("order", "asc"))).then((querySnapshot) => {
                setBookDatabase([]);
                querySnapshot.forEach((doc) => {
                    if (!doc.exists()) {
                        console.error("books document does not exist");
                        reject();
                        return;
                    }
                    let documentObject = {
                        books: [],
                        order: doc.data().order
                    };
                    doc.data().books.forEach((book) => {
                        documentObject.books.push(Book.createFromObject(book));
                    });
                    bookDatabase.push(documentObject);
                });
                resolve();
            }).catch((error) => {
                reject(error);
            });
        } else {
            resolve();
        }
    });
}


const AUTHOR_WEIGHT = 5;
const ILLUSTRATOR_WEIGHT = 1;
const KEYWORDS_WEIGHT = 10;
const PUBLISHER_WEIGHT = 1;
const SUBJECT_WEIGHT = 5;
const SUBTITLE_WEIGHT = 3;
const TITLE_WEIGHT = 15;
const BARCODE_WEIGHT = 50;
const ISBN_WEIGHT = 50;

function performSearch(searchQuery, viewHidden = false) {
    return new Promise((resolve, reject) => {
        let searchQueryArray = searchQuery.replace(/-/g, " ").replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase().split(" ");

        let scoresArray = [];

        isAdminCheck().then((isAdmin) => {
            bookDatabase.forEach((document) => {
                // Iterate through each of the 10-ish docs
                for (let i = 0; i < document.books.length; i++) {
                    // Iterate through each of the 100 books in each doc
                    let book = document.books[i];
                    if (book.isDeleted || (book.isHidden && viewHidden == false) || (book.isHidden && (!viewHidden || !isAdmin))/* || !book.lastUpdated*/) {
                        continue;
                    }
                    if (searchQuery == "") {
                        scoresArray.push({ book: book, score: Math.random() * 99 + 1 }); // puts the books in a random order so that it's not the same every time
                        continue;
                    }
                    let score = 0;
                    // Authors
                    for (let j = 0; j < book.authors.length; j++) {
                        let arr1 = book.authors[j].firstName.replace(/-/g, " ").split(" ");
                        let arr2 = book.authors[j].lastName.replace(/-/g, " ").split(" ");
                        let arr1Ratio = countInArray(arr1, searchQueryArray) / arr1.length;
                        score += arr1Ratio * AUTHOR_WEIGHT;
                        let arr2Ratio = countInArray(arr2, searchQueryArray) / arr2.length;
                        score += arr2Ratio * AUTHOR_WEIGHT;
                    }
                    // Barcode Number
                    let barcodeRatio = countInArray([book.barcodeNumber.toString()], searchQueryArray, true);
                    score += barcodeRatio * BARCODE_WEIGHT;
                    // DDC?
                    // Number of Pages?
                    // Publish Date?
                    // Description? (as opposed to just keywords)
                    // Illustrators
                    for (let j = 0; j < book.illustrators.length; j++) {
                        let arr1 = book.illustrators[j].firstName.replace(/-/g, " ").split(" ");
                        let arr2 = book.illustrators[j].lastName.replace(/-/g, " ").split(" ");
                        let arr1Ratio = countInArray(arr1, searchQueryArray) / arr1.length;
                        score += arr1Ratio * ILLUSTRATOR_WEIGHT;
                        let arr2Ratio = countInArray(arr2, searchQueryArray) / arr2.length;
                        score += arr2Ratio * ILLUSTRATOR_WEIGHT;
                    }
                    // ISBN 10 and ISBN 13
                    let ISBNRatio = countInArray([book.isbn10.toString(), book.isbn13.toString()], searchQueryArray, true);
                    score += ISBNRatio * ISBN_WEIGHT;
                    // Keywords
                    if (book.keywords.length != 0) {
                        let keywordsRatio = countInArray(book.keywords, searchQueryArray) / (book.keywords.length * 0.1);
                        score += keywordsRatio * KEYWORDS_WEIGHT;
                    }
                    // Publishers
                    for (let j = 0; j < book.publishers.length; j++) {
                        let arr = book.publishers[j].replace(/-/g, " ").split(" ");
                        score += countInArray(arr, searchQueryArray) * PUBLISHER_WEIGHT;
                    }
                    // Subjects
                    for (let k = 0; k < book.subjects.length; k++) {
                        let arr = book.subjects[k].replace(/-/g, " ").split(" ");
                        score += countInArray(arr, searchQueryArray) * SUBJECT_WEIGHT;
                    }
                    // Subtitle
                    score += countInArray(book.subtitle.replace(/-/g, " ").split(" "), searchQueryArray) * SUBTITLE_WEIGHT;
                    // Title
                    score += countInArray(book.title.replace(/-/g, " ").split(" "), searchQueryArray) * TITLE_WEIGHT;
                    scoresArray.push({ book: book, score: score });
                }
            });

            // Sort the array by score
            scoresArray.sort((a, b) => {
                // Custom Sort
                return b.score - a.score;
            });

            let returnArray = [];
            // console.log("Scores for \"%s\": %o", searchQuery, scoresArray);
            scoresArray.forEach((item) => {
                if (item.score < 1) { return; }
                if (isNaN(item.score)) {
                    console.error("A score for one of the books is NaN. Look into that.");
                    return;
                }
                returnArray.push(item.book);
            });

            logEvent(analytics, "search", {
                search_term: searchQuery,
                viewHidden: viewHidden
            });

            setSearchCache(returnArray);
            resolve(returnArray);
        }).catch((error) => {
            reject("Error in isAdminCheck or search", error);
        });
    });
}

function countInArray(arr, searchQueryArray, strict = false) {
    let count = 0;
    for (let i = 0; i < arr.length; i++) {
        if (strict) {
            if (searchQueryArray.includes(arr[i])) {
                count++;
            }
        } else {
            for (let j = 0; j < searchQueryArray.length; j++) {
                count += searchCompare(arr[i], searchQueryArray[j]);
            }
        }
    }
    return count;
}

function searchCompare(a, b) {
    a = a.toString();
    b = b.toString();
    let max = Math.max(a.length, b.length);
    if (max == 0) {
        return 0;
    }
    let similarity = (max - distance(a.toLowerCase(), b.toLowerCase())) / max;
    // This threshold seems pretty good, it prevents things from showing up if they share one or two letters.
    if (similarity < 0.7) {
        return 0;
    } else {
        // console.log(b + " was very similar to... " + a);
        return similarity;
    }
}

/**
 * Calculates the Damerau-Levenshtein distance between two strings.
 * @author Isaac Sukin
 * @link Source: https://gist.github.com/IceCreamYou/8396172
 */
function distance(source, target) {
    if (!source) { return target ? target.length : 0; }
    else if (!target) { return source.length; }

    let m = source.length, n = target.length, INF = m + n, score = new Array(m + 2), sd = {};
    for (let i = 0; i < m + 2; i++) { score[i] = new Array(n + 2); }
    score[0][0] = INF;
    for (let i = 0; i <= m; i++) {
        score[i + 1][1] = i;
        score[i + 1][0] = INF;
        sd[source[i]] = 0;
    }
    for (let j = 0; j <= n; j++) {
        score[1][j + 1] = j;
        score[0][j + 1] = INF;
        sd[target[j]] = 0;
    }

    for (let i = 1; i <= m; i++) {
        let DB = 0;
        for (let j = 1; j <= n; j++) {
            let i1 = sd[target[j - 1]],
                j1 = DB;
            if (source[i - 1] === target[j - 1]) {
                score[i + 1][j + 1] = score[i][j];
                DB = j;
            } else {
                score[i + 1][j + 1] = Math.min(score[i][j], Math.min(score[i + 1][j], score[i][j + 1])) + 1;
            }
            score[i + 1][j + 1] = Math.min(score[i + 1][j + 1], score[i1] ? score[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1) : Infinity);
        }
        sd[source[i - 1]] = i;
    }
    return score[m + 1][n + 1];
}

/**********
END SEARCH
BEGIN URL VALUE
***********/

/**
 * 
 * @param {String} string The String of text to search through
 * @param {String} key The name of the value that you are searching for
 * @param {Boolean} mightReturnEmpty Could the key be missing?
 * @returns {String} The value from string that matches key
 */
export function findURLValue(string, key, mightReturnEmpty = false) {
    let value;
    let keyNameIsNotComplete = (string.indexOf("?" + key + "=") < 0 && string.indexOf("&" + key + "=") < 0);
    if (string.indexOf(key) < 0 || keyNameIsNotComplete || key == "") {
        if (!mightReturnEmpty) {
            console.warn("The key (\"" + key + "\") could not be found in the URL.");
        }
        return "";
    }

    let position = string.indexOf(key);
    if (string.substring(position).indexOf("&") > -1) {
        value = string.substring(string.indexOf("=", position) + 1, string.indexOf("&", position));
    } else {
        value = string.substring(string.indexOf("=", position) + 1);
    }

    return decodeURI(value);
}

/**
 * @description Sets the value of a parameter in the URL. If the parameter already exists, it will be replaced.
 * @param {String} param The parameter to set
 * @param {String} value The value to set the parameter to
 * @param {Boolean} append A boolean representing if the existing queries should be kept
 */
export function setURLValue(param, value, append = true) {
    // Get everything after the host
    let string = window.location.href.slice(window.location.href.indexOf(window.location.pathname) + 1);
    let answer = "";
    // does param already exist?
    if (append && string.indexOf("?") != -1) {
        let paramAlreadyExists = (string.indexOf("?" + param + "=") >= 0 || string.indexOf("&" + param + "=") > 0);
        if (paramAlreadyExists) {
            // Edit it and return it.
            if (string.indexOf("?" + param + "=") >= 0) {
                answer = string.substring(0, string.indexOf("=") + 1);
                answer = answer + value;
                if (answer.indexOf("&") >= 0) {
                    answer += string.substring(answer.indexOf("&"), string.length);
                }
            } else if (string.indexOf("&" + param + "=") > 0) {
                answer = string.substring(0, string.indexOf("=", string.indexOf("&" + param + "=") + 1));
                answer = answer + value;
                if (string.indexOf("&", string.indexOf(param + "=")) >= 0) {
                    answer += string.substring(string.indexOf("&"), string.length);
                }
            }
        } else {
            answer = string + "&" + param + "=" + value;
        }
    } else {
        answer = string + "?" + param + "=" + value;
    }

    historyManager.push(encodeURI(answer));
}

const entityMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

export function encodeHTML(string) {
    return String(string).replace(/[&<>"'`=/]/g, function (s) {
        return entityMap[s];
    });
}

/**********
END URL VALUE
BEGIN BUILD BOOK BOX
***********/

/**
 * 
 * @param {Object<book>} obj The Book object that is going to be created
 * @param {String} page The page this book box will be displayed on
 * @param {Number} num The number of days that the book is due in
 * @returns An HTMLDivElement with the book information
 */
export function buildBookBox(obj, page, num = 0) {
    const a = document.createElement("a");
    const div = document.createElement("div");
    a.appendChild(div);
    switch (page) {
        case "view":
        case "search":
            div.classList.add("result-listing");
            break;
        case "account":
            div.classList.add("book-layout");
        // eslint-disable-next-line no-fallthrough
        default:
            div.classList.add("book");
    }
    const div1 = document.createElement("div");
    const div2 = document.createElement("div");
    div.appendChild(div1);
    div.appendChild(div2);
    const img = document.createElement("img");
    img.classList.add("bookimage");
    if (page == "edit-entry") {
        img.classList.add("edit-entry-book-image");
    }
    if (obj.iconImageLink) {
        img.src = obj.iconImageLink;
    } else if (obj.thumbnailImageLink) {
        img.src = obj.thumbnailImageLink;
    } else if (obj.coverImageLink) {
        img.src = obj.coverImageLink;
    } else {
        if (obj.medium == "av") {
            img.src = "../img/av-image.png";
        } else {
            img.src = "../img/default-book.png";
        }
    }
    img.onload = () => {
        div.style.opacity = 1;
    };
    img.onerror = () => {
        img.src = "../img/default-book.png";
        img.onerror = null;
    };
    div1.appendChild(img);
    const b = document.createElement("b");
    const title = document.createElement("p");
    title.classList.add("title");
    title.appendChild(document.createTextNode(obj.title));
    const author = document.createElement("p");
    author.classList.add("author");
    let authorString = "";
    for (let i = 0; i < obj.authors.length; i++) {
        if (i == 1) { authorString += " & "; }
        authorString += obj.authors[i].lastName + ", " + obj.authors[i].firstName;
    }
    if (authorString == ", ") { authorString = ""; }
    author.appendChild(document.createTextNode(authorString));
    b.appendChild(title);
    div2.appendChild(b);
    div2.appendChild(author);
    div2.classList.add("basic-info");
    if (page == "edit-entry" || page == "view") {
        a.href = "/admin/editEntry?new=false&id=" + obj.barcodeNumber;
        if (obj.isDeleted) {
            div.classList.add("deleted");
        }
        const barcode = document.createElement("p");
        barcode.classList.add("barcode");
        barcode.innerHTML = "Barcode: " + obj.barcodeNumber;
        div2.appendChild(barcode);
    } else {
        a.href = "result?id=" + obj.barcodeNumber;
    }
    if (page == "account") {
        let frontstr = "", boldstr = "" + num, backstr = "";
        if (num < 0) {
            boldstr = "Overdue";
        }
        else if (num == 0) {
            frontstr = "Due ";
            boldstr = "today";
        }
        else if (num > 0) {
            frontstr = "Due in ";
            backstr = " day";
        }
        if (num > 1) {
            backstr += "s";
        }
        const due = document.createElement("p");
        due.classList.add("due-date");
        due.appendChild(document.createTextNode(frontstr));
        const bold = document.createElement("b");
        bold.appendChild(document.createTextNode(boldstr));
        due.appendChild(bold);
        due.appendChild(document.createTextNode(backstr));
        div2.appendChild(due);
    }
    if ((page == "search" && num > 0) || page == "view") {
        div.id = "result-number-" + num;
        const number = document.createElement("div");
        number.classList.add("result-number");
        if (page == "search") {
            number.appendChild(document.createTextNode(num + "."));
        } else if (page == "view") {
            number.appendChild(document.createTextNode(obj.barcodeNumber % 1171100000 + "."));
        }
        div.appendChild(number);
        const medium = document.createElement("p");
        medium.classList.add("medium");
        let mediumString = "";
        switch (obj.medium) {
            case "paperback":
                mediumString = "Paperback";
                break;
            case "hardcover":
                mediumString = "Hardcover";
                break;
            case "av":
                mediumString = "Audio/Visual";
        }
        medium.appendChild(document.createTextNode(mediumString));
        div2.appendChild(medium);
        const audience = document.createElement("p");
        audience.classList.add("audience");
        let audienceString = obj.audience.toString();
        if (audienceString == "None") {
            audienceString = "";
        }
        audience.appendChild(document.createTextNode(audienceString));
        div2.appendChild(audience);
        const div3 = document.createElement("div");
        div3.classList.add("advanced-info");
        div.appendChild(div3);
        const subjects = document.createElement("p");
        subjects.classList.add("subjects");
        subjects.appendChild(document.createTextNode("Subjects: " + listSubjects(obj.subjects)));
        div3.appendChild(subjects);
        const description = document.createElement("p");
        description.classList.add("description");
        description.appendChild(document.createTextNode(shortenDescription(obj.description)));
        div3.appendChild(description);
    }
    isAdminCheck().then((isAdmin) => {
        if (isAdmin) {
            const a = document.createElement("a");
            const img = document.createElement("img");
            a.appendChild(img);
            img.classList.add("icon");
            if (page == "edit-entry") {
                img.src = "../img/paper.png";
                a.href = "/result?id=" + obj.barcodeNumber;
            } else {
                img.src = "../img/pencil.png";
                a.href = "/admin/editEntry?new=false&id=" + obj.barcodeNumber;
            }
            div.appendChild(a);
        }
    });
    return a;
}

function listSubjects(subj) {
    let str = "";
    for (let i = 0; i < subj.length; i++) {
        str += subj[i] + "; ";
    }
    return str.substring(0, str.length - 2);
}

function shortenDescription(desc) {
    const MIN_LEN = 300;
    let cutoff = desc.slice(MIN_LEN).search(/\.\s/g);
    //desc.replace("\n", "<br>");
    if (desc.length <= cutoff || cutoff == -1) {
        return desc;
    } else {
        return desc.substring(0, cutoff + MIN_LEN) + ". ...";
    }
}

/**********
END BUILD BOOK BOX
BEGIN GET BOOK FROM BARCODE
***********/

/**
 * 
 * @param {number} barcodeNumber 1171100000 through 1171199999
 * @returns {Promise<Book>|Promise<number>} On success, a Book object containing the book's information. On failure, the barcode number.
 */
export function getBookFromBarcode(barcodeNumber) {
    return new Promise((resolve, reject) => {
        if (barcodeNumber < 1171100000 || barcodeNumber > 1171199999) {
            reject(barcodeNumber);
        }

        updateBookDatabase().then(() => {
            let documentNumber = Math.floor(barcodeNumber / 100) % 1000;
            let bookNumber = barcodeNumber % 100;
            if (bookDatabase[documentNumber] && bookDatabase[documentNumber].books[bookNumber]) {
                resolve(bookDatabase[documentNumber].books[bookNumber]);
            } else {
                reject(barcodeNumber);
            }
        }).catch((error) => {
            console.error(error);
            reject("An error occurred when searching for barcode " + barcodeNumber);
        });
    });
}

/**********
END GET BOOK FROM BARCODE
BEGIN ADD BARCODE SPACING
***********/

/**
 * @description Adds spaces to a barcode to make it easier to read.
 * @param {String|Number} barcode The (unspaced) barcode
 * @returns {String} The barcode with spaces added
 */
export function addBarcodeSpacing(barcode) {
    barcode = barcode.toString();
    if (barcode.length != 10) {
        console.warn("The barcode is not 10 digits long");
        return;
    }
    let str = "";
    for (let i = 0; i < barcode.length; i++) {
        str += barcode.charAt(i);
        if (i == 0 || i == 4) {
            str += " ";
        }
    }
    return str;
}

/**********
END ADD BARCODE SPACING
BEGIN ISBN UTILS
***********/

/**
 * 
 * @param {Number} number The ISBN number (without a check digit)
 * @returns A String containing the ISBN check digit
 */
export function calculateISBNCheckDigit(number) {
    number = number.toString();
    let length = number.length;
    if (length == 13 || length == 10) {
        console.warn("The ISBN number already has a check digit");
        return;
    }

    let digits = [];
    let total = 0;
    if (length == 12) {
        for (let i = 0; i < length; i++) {
            digits[i] = parseInt(number.substring(i, i + 1));
        }

        for (let i = 0; i < digits.length; i++) {
            if (i % 2 == 0) {
                total += digits[i];
            } else {
                total += digits[i] * 3;
            }
        }
        return (10 - (total % 10)).toString();
    } else if (length == 9) {
        for (let i = 0; i < length; i++) {
            digits[i] = parseInt(number.substring(i, i + 1));
        }

        for (let i = 0; i < digits.length; i++) {
            total += digits[i] * (10 - i);
        }

        let answer = (11 - (total % 11)) % 11;
        if (answer == 10) {
            answer = "X";
        }
        return answer.toString();
    }
}

export function switchISBNformats(number) {
    number = number.toString();
    if (number.substring(0, 3) == "978") {
        number = number.substring(3, number.length - 1);
    } else {
        number = "978" + number;
        number = number.substring(0, number.length - 1);
    }
    number = number + calculateISBNCheckDigit(number);
    // number = parseInt(number);
    return number;
}

export function verifyISBN(number) {
    if (number.toString().length == 10) {
        number = number.toString();

        let digits = [];
        for (let i = 0; i < number.length; i++) {
            if (number.substring(i, i + 1) == "X") {
                digits[i] = 10;
            } else {
                digits[i] = parseInt(number.substring(i, i + 1));
            }
        }

        let total = 0;
        for (let i = 0; i < digits.length; i++) {
            total += digits[i] * (10 - i);
        }

        if (total % 11 == 0) {
            return true;
        } else {
            return false;
        }
    } else if (number.toString().length == 13) {
        number = number.toString();

        let digits = [];
        for (let i = 0; i < number.length; i++) {
            digits[i] = parseInt(number.substring(i, i + 1));
        }

        let total = 0;
        for (let i = 0; i < digits.length - 1; i++) {
            if (i % 2 == 0) {
                total += digits[i];
            } else {
                total += digits[i] * 3;
            }
        }

        if ((10 - (total % 10)) % 10 == digits[digits.length - 1]) {
            return true;
        } else {
            return false;
        }
    } else {
        console.warn("That is not a valid ISBN number");
        return false;
    }
}


/**********
END ISBN UTILS
BEGIN AUTH
***********/


/**
 * Sends an email verification to the user.
 */
export function sendEmailVerificationToUser() {
    let user = auth.currentUser;
    sendEmailVerification(user).then(() => {
        openModal("success", "Email Verification Sent! Please check your email!");
    });
}



/**********
END AUTH
BEGIN MODALS
***********/

/**
 * @description Opens a modal that covers the screen and displays info to the user.
 * @param {String} type The type of modal to open. Can be "info", "warning", "issue", "error", or "success".
 * @param {String} message The message to display to the user.
 * @param {String} title The title of the modal. Will default to "Info", "Warning", "There was a Problem", "Error", or "Success" depending on the type.
 * @param {String} mainButtonText The text to display on the main button. Defaults to "OK".
 * @param {Function} mainCallback The function to call when the main button is clicked. Defaults to null.
 * @param {String} secondaryButtonText The text to display on the secondary button. Defaults to null.
 * @param {Function} secondaryCallback The function to call when the secondary button is clicked. Defaults to null.
 * @returns {Function} A function that closes the modal.
*/
export function openModal(type, message, title, mainButtonText = "OK", mainCallback = null, secondaryButtonText = null, secondaryCallback = null) {
    // Create HTML elements
    let modalContainer = document.createElement("div");
    modalContainer.classList.add("modal-container");
    let modal = document.createElement("div");
    modal.classList.add("modal");
    modalContainer.appendChild(modal);
    let modalIcon = document.createElement("span");
    modalIcon.classList.add("material-symbols-outlined");
    modal.appendChild(modalIcon);
    let modalTitle = document.createElement("h3");
    modal.appendChild(modalTitle);
    let modalMessage = document.createElement("p");
    modal.appendChild(modalMessage);
    let modalButtonContainer = document.createElement("div");
    modalButtonContainer.classList.add("modal-button-container");
    modal.appendChild(modalButtonContainer);
    let modalButtonMain = document.createElement("button");
    let modalButtonSecondary = document.createElement("button");
    modalButtonContainer.appendChild(modalButtonSecondary);
    modalButtonContainer.appendChild(modalButtonMain);

    // Set attributes
    switch (type) {
        case "success":
            modalIcon.innerHTML = "check";
            modalIcon.classList.add("success");
            modalTitle.innerHTML = "Success";
            break;
        case "error":
            modalIcon.innerHTML = "error";
            modalIcon.classList.add("error");
            modalTitle.innerHTML = "Error";
            break;
        case "warning":
            modalIcon.innerHTML = "warning";
            modalIcon.classList.add("warning");
            modalButtonMain.classList.add("warning");
            modalTitle.innerHTML = "Warning";
            break;
        case "issue":
            modalIcon.innerHTML = "help";
            modalIcon.classList.add("issue");
            modalTitle.innerHTML = "There was a Problem";
            break;
        case "info":
            modalIcon.innerHTML = "info";
            modalIcon.classList.add("info");
            modalTitle.innerHTML = "Info";
            break;
        default:
            console.warn("Invalid modal type: " + type);
            return;
    }
    if (title) {
        modalTitle.innerHTML = title;
    }
    modalMessage.innerHTML = message;
    modalButtonMain.innerHTML = mainButtonText;
    if (mainButtonText == "") {
        modalButtonMain.style.display = "none";
    }
    if (secondaryButtonText) {
        modalButtonSecondary.innerHTML = secondaryButtonText;
        modalButtonContainer.style.justifyContent = "space-between";
    } else {
        modalButtonSecondary.style.display = "none";
    }

    // Button Event Listeners
    modalButtonMain.onclick = () => {
        modal.classList.remove("modal-show");
        modal.classList.add("modal-hide");
        modalContainer.style.opacity = "0";
        setTimeout(() => {
            modalContainer.remove();
        }, 500);
        if (mainCallback) {
            mainCallback();
        }
    };
    modalButtonSecondary.onclick = () => {
        modal.classList.remove("modal-show");
        modal.classList.add("modal-hide");
        modalContainer.style.opacity = "0";
        setTimeout(() => {
            modalContainer.remove();
        }, 500);
        if (secondaryCallback) {
            secondaryCallback();
        }
    };

    document.body.appendChild(modalContainer);

    modal.classList.add("modal-show");
    modalContainer.style.display = "block";
    setTimeout(() => {
        modalContainer.style.opacity = "1";
    }, 50);

    // Returns a function that closes the modal
    return () => {
        modal.classList.remove("modal-show");
        modal.classList.add("modal-hide");
        modalContainer.style.opacity = "0";
        setTimeout(() => {
            modalContainer.remove();
        }, 500);
    };
}



/**********
END MODALS
***********/
