"use strict";
(self["webpackChunksc_library"] = self["webpackChunksc_library"] || []).push([["public_js_main_js"],{

/***/ "./public/js/main.js":
/*!***************************!*\
  !*** ./public/js/main.js ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "setupMain": () => (/* binding */ setupMain)
/* harmony export */ });
/* harmony import */ var firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! firebase/compat/app */ "./node_modules/firebase/compat/app/dist/index.esm.js");
/* harmony import */ var firebase_compat_analytics__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! firebase/compat/analytics */ "./node_modules/firebase/compat/analytics/dist/index.esm.js");
/* harmony import */ var firebase_compat_app_check__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! firebase/compat/app-check */ "./node_modules/firebase/compat/app-check/dist/index.esm.js");
/* harmony import */ var firebase_compat_auth__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! firebase/compat/auth */ "./node_modules/firebase/compat/auth/dist/index.esm.js");
/* harmony import */ var firebase_compat_firestore__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! firebase/compat/firestore */ "./node_modules/firebase/compat/firestore/dist/index.esm.js");
/* harmony import */ var firebase_compat_storage__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! firebase/compat/storage */ "./node_modules/firebase/compat/storage/dist/index.esm.js");
/* harmony import */ var firebase_compat_performance__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! firebase/compat/performance */ "./node_modules/firebase/compat/performance/dist/index.esm.js");
/* harmony import */ var _globals__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./globals */ "./public/js/globals.js");
/* harmony import */ var _ajax__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./ajax */ "./public/js/ajax.js");
/* harmony import */ var _common__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./common */ "./public/js/common.js");
/* harmony import */ var firebase_firestore__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! firebase/firestore */ "./node_modules/firebase/firestore/dist/index.esm.js");
/* provided dependency */ var $ = __webpack_require__(/*! jquery */ "./node_modules/jquery/dist/jquery-exposed.js");
// I'm not sure if we need to reimport everything on each file
// eslint-disable-next-line

















function setupMain() {
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


function homePageSearch() {
    var searchQuery = $('#search-input').val();

    (0,_common__WEBPACK_IMPORTED_MODULE_9__.search)(searchQuery).then((searchResultsArray) => {
        (0,_ajax__WEBPACK_IMPORTED_MODULE_8__.goToPage)('search?query=' + searchQuery, false, searchResultsArray);
    });
}


function homeBookBoxes() {
    if (_globals__WEBPACK_IMPORTED_MODULE_7__.bookDatabase) {
        // Don't wait for the database and save ourselves a read request
        var values = [];
        let count = 0;
        for (let i = 0; i < 9; i++) {
            var rand1 = Math.floor(Math.random() * _globals__WEBPACK_IMPORTED_MODULE_7__.bookDatabase.length);
            var rand2 = Math.floor(Math.random() * _globals__WEBPACK_IMPORTED_MODULE_7__.bookDatabase[rand1].books.length);
            var bookNumber = rand2 + rand1 * 100;
            // TODO: Prevent duplicate books (with different barcode numbers)
            if (values.indexOf(rand2) > -1 || _globals__WEBPACK_IMPORTED_MODULE_7__.bookDatabase[rand1].books[rand2].isDeleted || _globals__WEBPACK_IMPORTED_MODULE_7__.bookDatabase[rand1].books[rand2].isHidden) {
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
            var book = _globals__WEBPACK_IMPORTED_MODULE_7__.bookDatabase[Math.floor(values[i] / 100)].books[values[i] % 100];
            $('div#books')[0].appendChild((0,_common__WEBPACK_IMPORTED_MODULE_9__.buildBookBox)(book, "main"));
        }
    } else {
        // Got get the largest doc to figure out how many total books there are.
        (0,firebase_firestore__WEBPACK_IMPORTED_MODULE_10__.getDocs)((0,firebase_firestore__WEBPACK_IMPORTED_MODULE_10__.query)((0,firebase_firestore__WEBPACK_IMPORTED_MODULE_10__.collection)(_globals__WEBPACK_IMPORTED_MODULE_7__.db, "books"), (0,firebase_firestore__WEBPACK_IMPORTED_MODULE_10__.where)("order", ">=", 0), (0,firebase_firestore__WEBPACK_IMPORTED_MODULE_10__.orderBy)("order", "desc"), (0,firebase_firestore__WEBPACK_IMPORTED_MODULE_10__.limit)(1))).then((querySnapshot) => {
            querySnapshot.forEach((docSnap) => {
                if (!docSnap.exists()) {
                    console.error("books document does not exist");
                    return;
                }
                var docs = docSnap.data().order;
                if (docSnap.data().books.length < 25 && docSnap.data().order != 0) {
                    docs--;
                }
                var rand = Math.floor(Math.random() * docs);
                rand = "0" + rand;
                if (rand.length == 2) rand = "0" + rand;
                (0,firebase_firestore__WEBPACK_IMPORTED_MODULE_10__.getDoc)((0,firebase_firestore__WEBPACK_IMPORTED_MODULE_10__.doc)(_globals__WEBPACK_IMPORTED_MODULE_7__.db, "books/" + rand)).then((docSnap) => {
                    if (!docSnap.exists()) {
                        console.error("books " + rand + " does not exist");
                        return;
                    }
                    var values = [];
                    let count = 0;
                    for (let i = 0; i < 9; i++) {
                        var random = Math.floor(Math.random() * docSnap.data().books.length);
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
                        var book = docSnap.data().books[values[i]];
                        $('div#books')[0].appendChild((0,_common__WEBPACK_IMPORTED_MODULE_9__.buildBookBox)(book, "main"));
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


console.log("main.js Loaded!");


/***/ })

}]);
//# sourceMappingURL=public_js_main_js.bundle.js.map