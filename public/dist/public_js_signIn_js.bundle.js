"use strict";
(self["webpackChunksc_library"] = self["webpackChunksc_library"] || []).push([["public_js_signIn_js"],{

/***/ "./public/js/signIn.js":
/*!*****************************!*\
  !*** ./public/js/signIn.js ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "setupSignIn": () => (/* binding */ setupSignIn)
/* harmony export */ });
/* harmony import */ var firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! firebase/compat/app */ "./node_modules/firebase/compat/app/dist/index.esm.js");
/* harmony import */ var _ajax__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./ajax */ "./public/js/ajax.js");
/* harmony import */ var _common__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./common */ "./public/js/common.js");
/* harmony import */ var _globals__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./globals */ "./public/js/globals.js");
/* provided dependency */ var $ = __webpack_require__(/*! jquery */ "./node_modules/jquery/dist/jquery-exposed.js");





function setupSignIn(pageQueryInput) {
    $("#submit, .login > input").keydown(function(event) {
        if (event.keyCode === 13) {
            signInSubmit(pageQueryInput);
        }
    });
    $("#password-reset").on("click", () => {
        sendPasswordReset();
    });
}

function authRedirect(pageQuery) {
    // Find the redirect path in the query
    var redirect = (0,_common__WEBPACK_IMPORTED_MODULE_2__.findURLValue)(pageQuery, "redirect");

    // If they are being redirected with an email (to the account page)
    if (pageQuery.includes("email")) {
        var newEmail = (0,_common__WEBPACK_IMPORTED_MODULE_2__.findURLValue)(pageQuery, "email");

        var emailError = false;
        var user = firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__["default"].auth().currentUser;
        // Attempt to update the account
        user.updateEmail(newEmail).catch((error) => {
            emailError = true;
            alert("There was an error updating your email. Please try again later.");
            console.error(error);
        }).then(function() {
            if (!emailError) {
                alert("Your email was saved successfully.");
            }
            (0,_ajax__WEBPACK_IMPORTED_MODULE_1__.goToPage)(redirect + "?email=" + newEmail);
        });
    } else {
        // If they do not have an email in the query
        // TO DO: Add additional redirects as needed
        (0,_ajax__WEBPACK_IMPORTED_MODULE_1__.goToPage)(redirect);
    }
}

function signInSubmit(pageQuery = "") {
    if (_globals__WEBPACK_IMPORTED_MODULE_3__.currentPage == '/login') {
        var reAuth;
        if (pageQuery.length > 1) {
            reAuth = true;
        } else {
            reAuth = false;
        }
        signIn(reAuth).then(function(reAuth) {
            if (reAuth) {
                authRedirect(pageQuery);
            } else {
                (0,_ajax__WEBPACK_IMPORTED_MODULE_1__.goToPage)("");
            }
        }).catch(() => {});
    } else if (_globals__WEBPACK_IMPORTED_MODULE_3__.currentPage == '/signup') {
        handleSignUp().then(function() {
            authRedirect(pageQuery);
        }).catch(() => {
            console.warn("Signup failed (likely because the user failed validation)");
        });
    }
}




function signIn(reAuth = false) {
    return new Promise(function(resolve, reject) {
        var user = firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__["default"].auth().currentUser;
        if (user && !reAuth) {
            alert("Another user is currently signed in. Please sign out first.");
        } else {
            var email = document.getElementById('email').value;
            var password = document.getElementById('password').value;
            if (email.length < 4) {
                alert('Please enter an email address.');
                reject();
            }
            if (password.length < 4) {
                alert('Please enter a password.');
                reject();
            }
            if (!reAuth) {
                // Sign in with email and pass.
                firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__["default"].auth().signInWithEmailAndPassword(email, password).then(function() {
                    resolve(reAuth);
                }).catch(function(error) {
                    // Handle Errors here.
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    if (errorCode === 'auth/wrong-password') {
                        alert('Wrong password.');
                    } else {
                        alert(errorMessage);
                    }
                    console.error(error);
                    $('#email').val('');
                    $('#password').val('');
                    reject();
                });
            } else {
                // Reauthenticate
                const credential = firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__["default"].auth.EmailAuthProvider.credential(email, password);
                user.reauthenticateWithCredential(credential).then(function() {
                    // User re-authenticated.
                    resolve();
                }).catch(function(error) {
                    // An error happened.
                    var errorCode = error.code;
                    var errorMessage = error.message;
                    if (errorCode === 'auth/wrong-password') {
                        alert('Wrong password.');
                    } else {
                        alert(errorMessage);
                    }
                    console.error(error);
                    $('#email').val('');
                    $('#password').val('');
                });
            }
        }
    });
}


/**
 * Handles the sign up button press.
 */
function handleSignUp() {
    return new Promise(function (resolve, reject) {
        var firstName = document.getElementById('firstName').value;
        var lastName = document.getElementById('lastName').value;
        var email = document.getElementById('email').value;
        var phone = document.getElementById('phone').value;
        var address = document.getElementById('address').value;
        var town = document.getElementById('town').value;
        var state = document.getElementById('state').value;
        var zip = document.getElementById('zip').value;
        var password = document.getElementById('password').value;
        var confrimPassword = document.getElementById('confirm-password').value;
        if (email.length < 4) {
            alert('Please enter an email address.');
            reject();
            return;
        }
        if (password.length < 4) {
            alert('Please enter a longer password.');
            reject();
            return;
        }
        if (password != confrimPassword) {
            alert('Your passwords do not match.');
            reject();
            return;
        }
        if (phone < 10) {
            alert('Please enter a valid phone number');
            reject();
            return;
        }
        if (address < 6) {
            alert('Please enter a valid address');
            reject();
            return;
        }
        if (town < 3) {
            alert('Please enter a valid address');
            reject();
            return;
        }
        if (state.length != 2) {
            alert('Please enter the state as two letters (ex. MA)');
            reject();
            return;
        }
        if (zip.length != 5) {
            alert('Please enter a valid zip code');
            reject();
            return;
        }
        if (firstName.length < 1) {
            alert('Please enter a first name.');
            reject();
            return;
        }
        if (lastName.length < 1) {
            alert('Please enter a last name.');
            reject();
            return;
        }
        var signUpError = false;
        // Create user with email and pass, then logs them in.
        firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__["default"].auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
            // Handle Errors here.
            signUpError = true;
            var errorCode = error.code;
            var errorMessage = error.message;
            if (errorCode == 'auth/weak-password') {
                alert('The password is too weak.');
            } else {
                alert(errorMessage);
            }
            console.error(error);
            reject();
        }).then(function() {
            if (!signUpError) {
                var user = firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__["default"].auth().currentUser;
                var usersPath = _globals__WEBPACK_IMPORTED_MODULE_3__.db.collection("users");
                var pfpRef = firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__["default"].storage().ref().child("/public/default-user.jpg");
                pfpRef.getDownloadURL().then((pfpLink) => {
                    user.photoURL = pfpLink;
                    // Run a Transaction to ensure that the correct barcode is used. (Atomic Transation)
                    _globals__WEBPACK_IMPORTED_MODULE_3__.db.runTransaction((transaction) => {
                        var cloudVarsPath = _globals__WEBPACK_IMPORTED_MODULE_3__.db.collection("config").doc("writable_vars");
                        // Get the variable stored in the writable_vars area
                        return transaction.get(cloudVarsPath).then((doc) => {
                            if (!doc.exists) {
                                throw "Document does not exist!";
                            }
                            // Save the max value and incriment it by one.
                            var newCardNumber = doc.data().maxCardNumber + 1;
                            var dateCreated = new Date();
                            // Set the document to exist in the users path
                            transaction.set(usersPath.doc(user.uid), {
                                firstName: firstName,
                                lastName: lastName,
                                address: address + ", " + town + ", " + state + " " + zip,
                                phone: phone,
                                email: email,
                                cardNumber: newCardNumber,
                                pfpLink: pfpLink,
                                checkouts: [],
                                notificationsOn: true,
                                dateCreated: dateCreated,
                                lastSignIn: dateCreated,
                                lastCheckoutTime: null
                            });
                            // Update the cloud var to contain the next card number value
                            transaction.update(cloudVarsPath, {
                                maxCardNumber: newCardNumber
                            });
                            return newCardNumber;
                        });
                    }).then((newCardNumber) => {
                        // After both writes complete, send the user to the edit page and take it from there.
                        console.log("New User Created with card number: ", newCardNumber);
                        (0,_ajax__WEBPACK_IMPORTED_MODULE_1__.updateUserAccountInfo)();
                        sendEmailVerification();
                        resolve();
                    }).catch((err) => {
                        console.error(err);
                        reject(err);
                    });
                });
                
            }
        });
    });
}

/**
 * Sends an email verification to the user.
 */
function sendEmailVerification() {
    firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__["default"].auth().currentUser.sendEmailVerification().then(function() {
        alert('Email Verification Sent! Please check your email!');
    });
}

function sendPasswordReset() {
    var email = document.getElementById('email').value;
    if (!email.includes('@') || email.lastIndexOf('.') < email.indexOf('@')){
        alert("Please enter a valid email into the Email box above. Then try again.");
        return;
    }
    firebase_compat_app__WEBPACK_IMPORTED_MODULE_0__["default"].auth().sendPasswordResetEmail(email).then(function() {
        alert('Password Reset Email Sent!');
    }).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode == 'auth/invalid-email') {
            alert(errorMessage);
        } else if (errorCode == 'auth/user-not-found') {
            alert(errorMessage);
        }
        console.error(error);
    });
}

console.log("signIn.js Loaded!");


/***/ })

}]);
//# sourceMappingURL=public_js_signIn_js.bundle.js.map