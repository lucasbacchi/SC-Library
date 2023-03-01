import { Book, bookDatabase, db } from "./globals";
import { goToPage } from "./ajax";
import { buildBookBox, search } from "./common";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";


/**
 * @description Sets up the main page event listeners.
 */
export function setupMain() {
    homeBookBoxes();
    $("#search-input").on("keydown", (event) => {
        if (event.key === "Enter") {
            homePageSearch();
        }
    });

    $("#home-page-search").on("click", () => {
        homePageSearch();
    });
}

/**
 * @description Runs when the user searches from the home page. Searches for a book and goes to the search page.
 */
function homePageSearch() {
    let searchQuery = $('#search-input').val();

    search(searchQuery).then((searchResultsArray) => {
        goToPage('search?query=' + searchQuery, false, searchResultsArray);
    });
}

/**
 * @description Generates the book boxes on the home page by randomly selecting books from the database.
 */
function homeBookBoxes() {
    if (bookDatabase) {
        // Don't wait for the database and save ourselves a read request
        let values = [];
        let count = 0;
        for (let i = 0; i < 9; i++) {
            let rand1 = Math.floor(Math.random() * bookDatabase.length);
            let rand2 = Math.floor(Math.random() * bookDatabase[rand1].books.length);
            let bookNumber = rand1 * 100 + rand2;
            // TODO: Prevent duplicate books (with different barcode numbers)
            if (values.indexOf(rand2) > -1 || bookDatabase[rand1].books[rand2].isDeleted || bookDatabase[rand1].books[rand2].isHidden) {
                i--;
            } else {
                values.push(bookNumber);
            }
            count++;
            if (count > 10000) {
                console.error("The book randomizer is very broken. Giving up for now.");
                return;
            }
        }
        for (let i = 0; i < 9; i++) {
            let book = bookDatabase[Math.floor(values[i] / 100)].books[values[i] % 100];
            $('div#books')[0].appendChild(buildBookBox(book, "main"));
        }
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
                rand = "0" + rand;
                if (rand.length == 2) rand = "0" + rand;
                getDoc(doc(db, "books", rand)).then((docSnap) => {
                    if (!docSnap.exists()) {
                        console.error("books " + rand + " does not exist");
                        return;
                    }
                    let values = [];
                    let count = 0;
                    for (let i = 0; i < 9; i++) {
                        let random = Math.floor(Math.random() * docSnap.data().books.length);
                        // TODO: Prevent duplicate books (with different barcode numbers)
                        if (values.indexOf(random) > -1 || docSnap.data().books[random].isDeleted || docSnap.data().books[random].isHidden) {
                            i--;
                        } else {
                            values.push(random);
                        }
                        count++;
                        if (count > 10000) {
                            console.error("The book randomizer is very broken. Giving up for now.");
                            return;
                        }
                    }
                    for (let i = 0; i < 9; i++) {
                        let book = Book.createFromObject(docSnap.data().books[values[i]]);
                        $('div#books')[0].appendChild(buildBookBox(book, "main"));
                    }
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
