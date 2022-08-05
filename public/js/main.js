// I'm not sure if we need to reimport everything on each file
// eslint-disable-next-line
import firebase from "firebase/compat/app";
import "firebase/compat/analytics";
import "firebase/compat/app-check";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";
import "firebase/compat/performance";


import { bookDatabase, db } from "./globals";
import { goToPage } from "./ajax";
import { buildBookBox, search } from "./common";




export function setupMain() {
    homeBookBoxes();
    $("#search-input").on("keydown", (event) => {
        if (event.key === "Enter") {
            homePageSearch();
        }
    });
}


function homePageSearch() {
    var searchQuery = $('#search-input').val();

    search(searchQuery).then((searchResultsArray) => {
        goToPage('search?query=' + searchQuery, false, searchResultsArray);
    });
}


function homeBookBoxes() {
    if (bookDatabase) {
        // Don't wait for the database and save ourselves a read request
        var values = [];
        let count = 0;
        for (let i = 0; i < 9; i++) {
            var rand1 = Math.floor(Math.random() * bookDatabase.length);
            var rand2 = Math.floor(Math.random() * bookDatabase[rand1].books.length);
            var bookNumber = rand2 + rand1 * 100;
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
            var book = bookDatabase[Math.floor(values[i] / 100)].books[values[i] % 100];
            $('div#books')[0].appendChild(buildBookBox(book, "main"));
        }
    } else {
        db.collection("books").where("order", ">=", 0).orderBy("order", "desc").limit(1).get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                if (!doc.exists) {
                    console.error("books document does not exist");
                    return;
                }
                var docs = doc.data().order;
                if (doc.data().books.length < 25 && doc.data().order != 0) {
                    docs--;
                }
                var rand = Math.floor(Math.random() * docs);
                rand = "0" + rand;
                if (rand.length == 2) rand = "0" + rand;
                db.collection("books").doc(rand).get().then((doc) => {
                    if (!doc.exists) {
                        console.error("books " + rand + " does not exist");
                        return;
                    }
                    var values = [];
                    let count = 0;
                    for (let i = 0; i < 9; i++) {
                        var random = Math.floor(Math.random() * doc.data().books.length);
                        // TODO: Prevent duplicate books (with different barcode numbers)
                        if (values.indexOf(random) > -1 || doc.data().books[random].isDeleted || doc.data().books[random].isHidden) {
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
                        var book = doc.data().books[values[i]];
                        $('div#books')[0].appendChild(buildBookBox(book, "main"));
                    }
                });
            });
        });
    }
}


console.log("main.js Loaded!");
