"use strict";
(self["webpackChunksc_library"] = self["webpackChunksc_library"] || []).push([["public_js_sitemap_js"],{

/***/ "./public/js/sitemap.js":
/*!******************************!*\
  !*** ./public/js/sitemap.js ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "setupSitemap": () => (/* binding */ setupSitemap)
/* harmony export */ });
/* harmony import */ var firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! firebase/compat/app */ "./node_modules/firebase/compat/app/dist/index.esm.js");
/* harmony import */ var _ajax__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ajax */ "./public/js/ajax.js");
/* harmony import */ var _globals__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./globals */ "./public/js/globals.js");
/* provided dependency */ var $ = __webpack_require__(/*! jquery */ "./node_modules/jquery/dist/jquery-exposed.js");




function setupSitemap() {
    var folder = "", blacklist = ['404', 'autogenindex', 'account', 'result'];
    if (firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__["default"].auth().currentUser) blacklist.push('login', 'signup');
    for (let i = 0; i < _globals__WEBPACK_IMPORTED_MODULE_2__.directory.length; i++) {
        var page = _globals__WEBPACK_IMPORTED_MODULE_2__.directory[i].substring(1);
        if (blacklist.indexOf(page) != -1) continue;
        var slash = page.indexOf('/');
        if (slash != -1) {
            var newFolder = page.substring(0, slash);
            page = page.substring(slash + 1);
            if (newFolder == "admin") continue;
            if (folder != newFolder && newFolder != "") {
                $('#sitemap').append("<li>" + formatPageString(newFolder) + "</li>");
                $('#sitemap').append("<ul id='" + newFolder + "'></ul>");
            }
            folder = newFolder;
            var char;
            if (folder == "account") char = "?"; else if (folder == "") char = ""; else char = "/";
            $('#' + folder).append("<li><a data-link-target='" + folder + char + page + "'>" + formatPageString(page) + "</a></li>");
        } else {
            folder = "";
            char = "";
            $('#sitemap').append("<li><a data-link-target='" + folder + char + page + "'>" + formatPageString(page) + "</a></li>");
        }
    }
    (0,_ajax__WEBPACK_IMPORTED_MODULE_1__.isAdminCheck)().then((isAdmin) => {
        if (isAdmin) {
            buildAdminSitemap();
        }

        (0,_ajax__WEBPACK_IMPORTED_MODULE_1__.convertDataTagsToLinks)();
    }).catch((error) => {
        console.error(error);
    });
}

function buildAdminSitemap() {
    $('#sitemap').append("<li>Admin</li>");
    $('#sitemap').append("<ul id='admin'></ul>");
    for (let i = 0; i < _globals__WEBPACK_IMPORTED_MODULE_2__.directory.length; i++) {
        var page = _globals__WEBPACK_IMPORTED_MODULE_2__.directory[i].substring(1);
        var slash = page.indexOf('/');
        if (slash != -1) {
            var newFolder = page.substring(0, slash);
            page = page.substring(slash + 1);
            if (newFolder != "admin") continue;
            $('#admin').append("<li><a data-link-target='admin/" + page + "'>" + formatPageString(page) + "</a></li>");
        }
    }
}

function formatPageString(page) {
    page = page.charAt(0).toUpperCase() + page.substring(1);
    for (let i = 1; i < page.length; i++) {
        if (/[A-Z]/.test(page.charAt(i))) {
            page = page.substring(0, i) + " " + page.substring(i);
            i++;
        }
    }
    return page;
}


/***/ })

}]);
//# sourceMappingURL=public_js_sitemap_js.bundle.js.map