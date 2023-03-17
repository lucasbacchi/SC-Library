import { Book, bookDatabase, db, historyManager } from "./globals";
import { goToPage } from "./ajax";
import { buildBookBox, updateBookDatabase } from "./common";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";


/**
 * @description Sets up the main page event listeners.
 */
export function setupMain() {
    homeBookBoxes();
    $("#home-page-search-input").on("keydown", (event) => {
        if (event.key === "Enter") {
            homePageSearch();
        }
    });

    $("#home-page-search-button").on("click", () => {
        homePageSearch();
    });
}

/**
 * @description Runs when the user searches from the home page. Adds the query to the URL and goes to the search page.
 */
function homePageSearch() {
    let searchQuery = $('#home-page-search-input').val();
    goToPage('search?query=' + searchQuery);
}

/**
 * @description Generates the book boxes on the home page by randomly selecting books from the database.
 */
function homeBookBoxes() {
    // If we have the books in the history, use those.
    if (window.history.state.stack[window.history.state.index]?.customData?.homeBookBoxes) {
        let bookList = window.history.state.stack[window.history.state.index]?.customData?.homeBookBoxes;
        console.log("Using books from history", bookList);
        updateBookDatabase().then(() => {
            for (let i = 0; i < 9; i++) {
                $('div#books')[0].appendChild(buildBookBox(bookList[i], "main"));
            }
        });
        return;
    }

    let bookList;
    if (bookDatabase) {
        // Don't wait for the database and save ourselves a read request
        bookList = [];
        let count = 0;
        for (let i = 0; i < 9; i++) {
            let rand1 = Math.floor(Math.random() * bookDatabase.length);
            let rand2 = Math.floor(Math.random() * bookDatabase[rand1].books.length);
            let book = bookDatabase[rand1].books[rand2];
            let dontShowBook = false;
            if (bookDatabase[rand1].books[rand2].isDeleted || bookDatabase[rand1].books[rand2].isHidden) {
                dontShowBook = true;
            }
            // Prevent duplicate books (with different barcode numbers)
            for (let j = 0; j < bookList.length; j++) {
                if (Book.isSameBook(book, bookList[j])) {
                    dontShowBook = true;
                }
            }
            if (dontShowBook) {
                i--;
                continue;
            }
            bookList.push(book);
            $('div#books')[0].appendChild(buildBookBox(book, "main"));
            count++;
            if (count > 10000) {
                console.error("The book randomizer is very broken. Giving up for now.");
                return;
            }
        }
        // Store the books in the history
        historyManager.update(undefined, {homeBookBoxes: bookList});
    } else {
        // Get the largest doc to figure out how many total books there are.
        getDocs(query(collection(db, "books"), where("order", ">=", 0), orderBy("order", "desc"), limit(1))).then((querySnapshot) => {
            querySnapshot.forEach((docSnap) => {
                if (!docSnap.exists()) {
                    console.error("books document does not exist");
                    return;
                }
                let docs = docSnap.data().order;
                if (docSnap.data().books.length < 25 && docSnap.data().order != 0) {
                    docs--;
                }
                let rand = Math.floor(Math.random() * docs);
                getDoc(doc(db, "books", rand.padStart(3, "0"))).then((docSnap) => {
                    if (!docSnap.exists()) {
                        console.error("books " + rand + " does not exist");
                        return;
                    }
                    bookList = [];
                    let count = 0;
                    for (let i = 0; i < 9; i++) {
                        let random = Math.floor(Math.random() * docSnap.data().books.length);
                        let book = Book.createFromObject(docSnap.data().books[random]);
                        let dontShowBook = false;
                        if (bookList.indexOf(random) > -1 || docSnap.data().books[random].isDeleted || docSnap.data().books[random].isHidden) {
                            dontShowBook = true;
                        }
                        // Prevent duplicate books (with different barcode numbers)
                        for (let j = 0; j < bookList.length; j++) {
                            if (Book.isSameBook(book, bookList[j])) {
                                dontShowBook = true;
                            }
                        }
                        if (dontShowBook) {
                            i--;
                            continue;
                        }
                        bookList.push(book);
                        $('div#books')[0].appendChild(buildBookBox(book, "main"));
                        count++;
                        if (count > 10000) {
                            console.error("The book randomizer is very broken. Giving up for now.");
                            return;
                        }
                    }
                    // Store the books in the history
                    historyManager.update(undefined, {homeBookBoxes: bookList});
                }).catch((error) => {
                    console.error("There was an issue getting the random book doc", error);
                });
            });
        }).catch((error) => {
            console.error("There was an error getting the last book doc", error);
        });
    }
}


console.log("main.js has Loaded!");
