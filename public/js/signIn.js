import { logEvent } from "firebase/analytics";
import {
    browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword, EmailAuthProvider,
    reauthenticateWithCredential, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, updateEmail
} from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { goToPage, updateEmailinUI, updateUserAccountInfo } from "./ajax";
import { createOnClick, findURLValue, openModal, sendEmailVerificationToUser } from "./common";
import { analytics, auth, currentPage, db } from "./globals";

/**
 * @description Sets up the sign in page.
 * @param {String} pageQuery The query string of the page.
 */
export function setupSignIn(pageQuery) {
    createOnClick($("#submit"), signInSubmit, pageQuery);
    createOnClick($("#password-reset"), sendPasswordReset);

    if (findURLValue(pageQuery, "redirect", true) != "" && auth.currentUser) {
        createReAuthPage(pageQuery);
    }

    // If the user presses enter while in the input fields, submit the form
    $(".login > input").on("keydown", (event) => {
        if (event.key === "Enter") {
            signInSubmit(pageQuery);
        }
    });

}

/**
 * @description Redesigns the sign in page to allow the user to reauthenticate only using their password.
 * @param {String} pageQuery The query string of the page.
 */
function createReAuthPage(pageQuery) {
    $("#content").empty();
    let div1 = document.createElement('div');
    div1.id = 'form';
    let div2 = document.createElement('div');
    div2.classList.add("login");
    let h3 = document.createElement('h3');
    h3.innerHTML = "Please enter your password.";
    $(div2).append(h3);
    let lbl = document.createElement('label');
    lbl.innerHTML = 'Password:';
    lbl.setAttribute('for', 'password');
    $(div2).append(lbl);
    let input = document.createElement('input');
    input.type = 'password';
    input.id = 'password';
    $(div2).append(input);
    $(div2).append(document.createElement('br'));
    $(div2).append(document.createElement('br'));
    let btn = document.createElement('button');
    btn.id = 'submit';
    btn.innerHTML = 'Submit';
    $(div2).append(btn);
    createOnClick($(btn), signInSubmit, pageQuery);
    $(div2).append(document.createElement('br'));
    $(div2).append(document.createElement('br'));
    $(div1).append(div2);
    $("#content").append(div1);
}

/**
 * @description Handles the process of redirecting the user after they have signed in again. For now, this is only used for changing the user's email.
 * @param {String} pageQuery The query string of the page.
 */
function authRedirect(pageQuery) {
    // Find the redirect path in the query
    let redirect = findURLValue(pageQuery, "redirect");

    // If they are being redirected with an email (to the account page)
    if (pageQuery.includes("email")) {
        let newEmail = findURLValue(pageQuery, "email");

        let user = auth.currentUser;
        // Attempt to update the account
        updateEmail(user, newEmail).then(function () {
            updateDoc(doc(db, "users", user.uid), {
                email: newEmail
            }).then(() => {
                let email = user.email;
                if (!user.emailVerified) {
                    $("#email-verified").show();
                }
                updateEmailinUI(email);
                openModal("success", "Your email was saved successfully.");
                goToPage(redirect); // Removed passing back the email, because that doesn't seem to be needed anymore
            }).catch((error) => {
                openModal("error", "There was an error updating your email. Please try again later.");
                console.error(error);
            });
        }).catch((error) => {
            openModal("error", "There was an error updating your email. Please try again later.");
            console.error(error);
        });
    } else {
        // If they have no other details, we can just redirect them
        // If there are other cases we need to handle, we can add them here
        goToPage(redirect);
    }
}

/**
 * @description Starts the process of submitting the form either for sign in or sign up. Runs when the user clicks the submit button.
 * @param {String} pageQuery The query string of the page. If the length of this string is greater than 1, it will assume this is a reauthentication.
 */
function signInSubmit(pageQuery = "") {
    let reAuth = false;
    if (findURLValue(pageQuery, "redirect", true) != "" && auth.currentUser) {
        reAuth = true;
    }
    let persistancePromise;
    if (!reAuth) {
        // Sets the persistance state in Firebase
        let persistance = $("#remember-me").prop("checked");
        if (persistance) {
            persistancePromise = setPersistence(auth, browserLocalPersistence);
        } else {
            persistancePromise = setPersistence(auth, browserSessionPersistence);
        }
    } else {
        // If this is a reauthentication, we don't need to change the persistance state
        persistancePromise = Promise.resolve();
    }
    persistancePromise.then(() => {
        let authPromise;
        if (currentPage == 'login') {
            authPromise = signIn(reAuth);
        } else if (currentPage == 'signup') {
            authPromise = handleSignUp();
        }
        authPromise.then(() => {
            if (findURLValue(pageQuery, "redirect", true) != "") {
                authRedirect(pageQuery);
            } else {
                goToPage("");
            }
        }).catch((error) => {
            console.warn("error in auth functions", error);
        });
    });
}

/**
 * @description Signs in a user with email and password.
 * @param {Boolean} reAuth Whether or not this is a reauthentication.
 */
function signIn(reAuth = false) {
    return new Promise((resolve, reject) => {
        let user = auth.currentUser;
        if (user && !reAuth) {
            openModal("error", "Another user is currently signed in. Please sign out first.");
        } else {
            let email;
            if (reAuth) email = user.email;
            else email = document.getElementById('email').value;
            let password = document.getElementById('password').value;
            if (email.length < 4) {
                openModal("issue", 'Please enter an email address.');
                reject("no-email-address");
            }
            if (password.length < 4) {
                openModal("issue", 'Please enter a password.');
                reject("no-password");
            }
            if (!reAuth) {
                // Sign in with email and password
                signInWithEmailAndPassword(auth, email, password).then(() => {
                    user = auth.currentUser;
                    logEvent(analytics, "login", {
                        method: "email",
                        userId: user.uid
                    });
                    resolve(reAuth);
                }).catch(function (error) {
                    // Handle Errors here.
                    let errorCode = error.code;
                    let errorMessage = error.message;
                    if (errorCode === 'auth/wrong-password') {
                        openModal("issue", 'Wrong password.');
                    } else {
                        openModal("error", errorMessage);
                        console.error(error);
                        $('#email').val('');
                    }
                    $('#password').val('');
                    reject(errorCode);
                });
            } else {
                // Reauthenticate
                const credential = EmailAuthProvider.credential(email, password);
                reauthenticateWithCredential(user, credential).then(() => {
                    // User re-authenticated.
                    resolve(reAuth);
                }).catch((error) => {
                    // An error happened.
                    let errorCode = error.code;
                    let errorMessage = error.message;
                    if (errorCode === 'auth/wrong-password') {
                        openModal("issue", 'Wrong password.');
                    } else {
                        openModal("error", errorMessage);
                        console.error(error);
                        $('#email').val('');
                    }
                    $('#password').val('');
                });
            }
        }
    });
}

/**
 * @description Handles the sign up process. This includes validating the user's input, creating the user,
 *              adding the user to the database, updating the max barcodeNumber, and logging the event.
 * @returns {Promise} A promise that resolves when the user is signed up.
 */
function handleSignUp() {
    return new Promise((resolve, reject) => {
        let firstName = document.getElementById('firstName').value;
        let lastName = document.getElementById('lastName').value;
        let email = document.getElementById('email').value;
        let phone = document.getElementById('phone').value;
        let address = document.getElementById('address').value;
        let town = document.getElementById('town').value;
        let state = document.getElementById('state').value;
        let zip = document.getElementById('zip').value;
        let password = document.getElementById('password').value;
        let confirmPassword = document.getElementById('confirm-password').value;
        if (email.length < 4) {
            openModal("issue", 'Please enter an email address.');
            reject("no-email-address");
            return;
        }
        if (password.length < 4) {
            openModal("issue", 'Please enter a longer password.');
            reject("no-password");
            return;
        }
        if (password != confirmPassword) {
            openModal("issue", 'Your passwords do not match.');
            reject("password-confirm-fail");
            return;
        }
        if (!/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(phone)) {
            openModal("issue", 'Please enter a valid phone number');
            reject("invalid-phone-number");
            return;
        }
        if (address.length < 6) {
            openModal("issue", 'Please enter a valid address');
            reject("invalid-address");
            return;
        }
        if (town.length < 3) {
            openModal("issue", 'Please enter a valid address');
            reject("invalid-town");
            return;
        }
        if (state.length != 2) {
            openModal("issue", 'Please enter the state as two letters (ex. MA)');
            reject("invalid-state");
            return;
        }
        if (zip.length != 5) {
            openModal("issue", 'Please enter a valid zip code');
            reject("invalid-zip-code");
            return;
        }
        if (firstName.length < 1) {
            openModal("issue", 'Please enter a first name.');
            reject("invalid-first-name");
            return;
        }
        if (lastName.length < 1) {
            openModal("issue", 'Please enter a last name.');
            reject("invalid-last-name");
            return;
        }

        // Creates user with email and password, then logs them in.
        createUserWithEmailAndPassword(auth, email, password).catch((error) => {
            // Handle Errors here.
            let errorCode = error.code;
            let errorMessage = error.message;
            if (errorCode == 'auth/weak-password') {
                openModal("issue", 'The password is too weak. Please try another password.');
            } else if (errorCode == 'auth/email-already-in-use') {
                openModal("issue", "This email is already in use. If you already have an account, please try signing in instead.");
            } else {
                openModal("error", errorMessage);
                console.error(error);
            }
            reject();
        }).then(() => {
            // Database updates are now handled by the beforeCreate function in the cloud functions.
            // However, we must update information from the page that the cloud function didn't have.
            updateDoc(doc(db, "users", auth.currentUser.uid), {
                firstName: firstName,
                lastName: lastName,
                phone: phone,
                address: address + ", " + town + ", " + state + " " + zip,
                lastSignInTime: new Date(),
                lastUpdated: new Date()
            }).then(() => {
                // After both writes complete, send the user to the edit page and take it from there.
                updateUserAccountInfo();
                sendEmailVerificationToUser();
                logEvent(analytics, "sign_up", {
                    method: "email",
                    firstName: firstName,
                    lastName: lastName,
                    userId: auth.currentUser.uid,
                    email: email,
                    phone: phone,
                    address: address + ", " + town + ", " + state + " " + zip
                });
                resolve();
            }).catch((error) => {
                openModal("error", "There was an error creating your account. Please try again.");
                console.error(error);
                reject("auth-error");
            });
        });
    });
}

/**
 * @description Sends a password reset email to the user.
 */
function sendPasswordReset() {
    let email = document.getElementById('email').value;
    if (!email.includes('@') || email.lastIndexOf('.') < email.indexOf('@')) {
        openModal("issue", "Please enter a valid email into the Email box above. Then try again.");
        return;
    }
    sendPasswordResetEmail(auth, email).then(() => {
        openModal("success", "Password Reset Email Sent!");
    }).catch((error) => {
        // Handle Errors here.
        let errorCode = error.code;
        let errorMessage = error.message;
        if (errorCode == 'auth/invalid-email') {
            openModal("error", errorMessage);
        } else if (errorCode == 'auth/user-not-found') {
            openModal("error", errorMessage);
        } else {
            openModal("error", "Your password reset email could not be sent. Please contact the librarian for help.\n" + errorMessage);
            console.error(error);
        }
    });
}

console.log("signIn.js has Loaded!");
