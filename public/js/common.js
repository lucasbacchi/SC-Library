import { logEvent } from "firebase/analytics";
import { sendEmailVerification } from "firebase/auth";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { goToPage, isAdminCheck } from "./ajax";
import { timeLastSearched, setTimeLastSearched, db, setBookDatabase, bookDatabase, setSearchCache, auth, historyStack, analytics, Book} from "./globals";

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
    return new Promise(function (resolve, reject) {
        if (timeLastSearched == null || timeLastSearched.getTime() + 1000 * 60 * 5 < Date.now()) {
            // It hasn't searched since the page loaded, or it's been 5 mins since last page load;
            setTimeLastSearched(new Date());
            console.log("It's been 5 mins since last search (or it's the first one since page load).");
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
                performSearch(searchQuery, viewHidden).then((output) => {
                    resolve(output);
                });
            }).catch((error) => {
                console.error("Search function failed to query the database", error);
                reject();
            });
        } else {
            // The bookDatabase cache is recent enough, just use that
            performSearch(searchQuery, viewHidden).then((output) => {
                resolve(output);
            });
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
    return new Promise(function (resolve, reject) {
        var searchQueryArray = searchQuery.replace(/-/g, " ").replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "").toLowerCase().split(" ");

        var scoresArray = [];

        isAdminCheck().then((isAdmin) => {
            // TODO: Make it so that words that aren't exactly equal count. Like Theatre and Theatres (probably write a comparison function).
            bookDatabase.forEach((document) => {
                // Iterate through each of the 10-ish docs
                for (let i = 0; i < document.books.length; i++) {
                    // Iterate through each of the 100 books in each doc
                    let book = document.books[i];
                    if (book.isDeleted || (book.isHidden && viewHidden == false) || (book.isHidden && (!viewHidden || !isAdmin))/* || !book.lastUpdated*/) {
                        continue;
                    }
                    if (searchQuery == "") {
                        scoresArray.push({book: book, score: Math.random() * 99 + 1}); // puts the books in a random order so that it's not the same every time
                        continue;
                    }
                    var score = 0;
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
                    var barcodeRatio = countInArray([book.barcodeNumber.toString()], searchQueryArray, true);
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
                    var ISBNRatio = countInArray([book.isbn10.toString(), book.isbn13.toString()], searchQueryArray, true);
                    score += ISBNRatio * ISBN_WEIGHT;
                    // Keywords
                    if (book.keywords.length != 0) {
                        var keywordsRatio = countInArray(book.keywords, searchQueryArray) / (book.keywords.length * 0.1);
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

            var returnArray = [];
            console.log("Scores for \"%s\": %o", searchQuery, scoresArray);
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
    var count = 0;
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
    var max = Math.max(a.length, b.length);
    if (max == 0) {
        return 0;
    }
    var similarity = (max - distance(a.toLowerCase(), b.toLowerCase())) / max;
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
 * author: Isaac Sukin
 * source: https://gist.github.com/IceCreamYou/8396172
 */
function distance(source, target) {
    if (!source) { return target ? target.length : 0; }
    else if (!target) { return source.length; }

    var m = source.length, n = target.length, INF = m + n, score = new Array(m + 2), sd = {};
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
        var DB = 0;
        for (let j = 1; j <= n; j++) {
            var i1 = sd[target[j - 1]],
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
    var value;
    var keyNameIsNotComplete = (string.indexOf("?" + key + "=") < 0 && string.indexOf("&" + key + "=") < 0);
    if (string.indexOf(key) < 0 || keyNameIsNotComplete || key == "") {
        if (!mightReturnEmpty) {
            console.warn("The key (\"" + key + "\") could not be found in the URL.");
        }
        return "";
    }

    var position = string.indexOf(key);
    if (string.substring(position).indexOf("&") > -1) {
        value = string.substring(string.indexOf("=", position) + 1, string.indexOf("&", position));
    } else {
        value = string.substring(string.indexOf("=", position) + 1);
    }

    return decodeURI(value);
}


export function setURLValue(param, value, append = true) {
    var string = window.location.href;
    // may also be able to use currentQuery for above
    var answer = "";
    // does param already exist?
    if (append && string.indexOf("?") != -1) {
        var paramAlreadyExists = (string.indexOf("?" + param + "=") >= 0 || string.indexOf("&" + param + "=") > 0);
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
        answer = "?" + param + "=" + value;
    }

    historyStack.push(encodeURI(answer));
    window.history.pushState({stack: historyStack.stack, index: historyStack.currentIndex}, "", encodeURI(answer));
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
    const div = document.createElement("div");
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
    if (obj.medium == "av") {
        img.src = "../img/av-image.jpg";
    } else {
        if (obj.iconImageLink) {
            img.src = obj.iconImageLink;
        } else if (obj.thumbnailImageLink) {
            img.src = obj.thumbnailImageLink;
        } else {
            img.src = obj.coverImageLink;
        }
    }
    img.onload = () => {
        div.style.opacity = 1;
    };
    div1.appendChild(img);
    const b = document.createElement("b");
    const title = document.createElement("p");
    title.classList.add("title");
    title.appendChild(document.createTextNode(obj.title));
    const author = document.createElement("p");
    author.classList.add("author");
    var authorString = "";
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
        div.addEventListener("click", () => {
            goToPage("admin/editEntry?new=false&id=" + obj.barcodeNumber);
        });
        if (obj.isDeleted) {
            div.classList.add("deleted");
        }
        const barcode = document.createElement("p");
        barcode.classList.add("barcode");
        barcode.innerHTML = "Barcode: " + obj.barcodeNumber;
        div2.appendChild(barcode);
    } else {
        div.addEventListener("click", () => {
            goToPage("result?id=" + obj.barcodeNumber);
        });
    }
    if (page == "account") {
        var frontstr = "", boldstr = "" + num, backstr = "";
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
        medium.appendChild(document.createTextNode(obj.medium));
        div2.appendChild(medium);
        const audience = document.createElement("p");
        audience.classList.add("audience");
        audience.appendChild(document.createTextNode(obj.audience.toString()));
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
            const img = document.createElement("img");
            img.classList.add("icon");
            if (page == "edit-entry") {
                img.src = "../img/paper.png";
                img.addEventListener("click", (event) => {
                    event.stopPropagation();
                    goToPage("result?id=" + obj.barcodeNumber);
                });
            } else {
                img.src = "../img/pencil.png";
                img.addEventListener("click", (event) => {
                    event.stopPropagation();
                    goToPage("admin/editEntry?new=false&id=" + obj.barcodeNumber);
                });
            }
            div.appendChild(img);
        }
    });
    return div;
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
    return new Promise(function (resolve, reject) {
        if (barcodeNumber < 1171100000 || barcodeNumber > 1171199999) {
            reject(barcodeNumber);
        }

        if (!bookDatabase) {
            search("").then(() => {
                returnBook();
            });
        } else {
            returnBook();
        }

        function returnBook() {
            let documentNumber = Math.floor(barcodeNumber / 100) % 1000;
            let bookNumber = barcodeNumber % 100;
            if (bookDatabase[documentNumber].books[bookNumber]) {
                resolve(bookDatabase[documentNumber].books[bookNumber]);
            } else {
                reject(barcodeNumber);
            }
        }
    });
}

/**********
END GET BOOK FROM BARCODE
BEGIN ISBN UTILS
***********/

/**
 * 
 * @param {Number} number The ISBN number (without a check digit)
 * @returns A String containing the ISBN check digit
 */
export function calculateISBNCheckDigit(number) {
    number = number.toString();
    var length = number.length;
    if (length == 13 || length == 10) {
        console.warn("The ISBN number already has a check digit");
        return;
    }

    if (length == 12) {
        var digits = [];
        for (let i = 0; i < length; i++) {
            digits[i] = parseInt(number.substring(i, i + 1));
        }

        var total = 0;
        for (let i = 0; i < digits.length; i++) {
            if (i % 2 == 0) {
                total += digits[i];
            } else {
                total += digits[i] * 3;
            }
        }
        return (10 - (total % 10)).toString();
    } else if (length == 9) {
        digits = [];
        total = 0;
        for (let i = 0; i < length; i++) {
            digits[i] = parseInt(number.substring(i, i + 1));
        }


        for (let i = 0; i < digits.length; i++) {
            total += digits[i] * (10 - i);
        }

        var answer = (11 - (total % 11)) % 11;
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
    var user = auth.currentUser;
    sendEmailVerification(user).then(() => {
        alert("Email Verification Sent! Please check your email!");
    });
}



/**********
END AUTH
***********/
