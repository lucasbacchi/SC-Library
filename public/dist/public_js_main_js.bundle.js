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
        _globals__WEBPACK_IMPORTED_MODULE_7__.db.collection("books").where("order", ">=", 0).orderBy("order", "desc").limit(1).get().then((querySnapshot) => {
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
                _globals__WEBPACK_IMPORTED_MODULE_7__.db.collection("books").doc(rand).get().then((doc) => {
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
                        $('div#books')[0].appendChild((0,_common__WEBPACK_IMPORTED_MODULE_9__.buildBookBox)(book, "main"));
                    }
                });
            });
        });
    }
}


console.log("main.js Loaded!");


/***/ })

}]);
//# sourceMappingURL=public_js_main_js.bundle.js.map