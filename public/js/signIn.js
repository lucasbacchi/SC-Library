import { logEvent } from "firebase/analytics";
import { browserLocalPersistence, browserSessionPersistence, createUserWithEmailAndPassword, EmailAuthProvider,
         reauthenticateWithCredential, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, updateEmail } from "firebase/auth";
import { doc, runTransaction, updateDoc } from "firebase/firestore";
import { goToPage, updateEmailinUI, updateUserAccountInfo } from "./ajax";
import { findURLValue, sendEmailVerificationToUser } from "./common";
import { analytics, auth, currentPage, db, User } from "./globals";

/**
 * @description Sets up the sign in page.
 * @param {String} pageQuery The query string of the page.
 */
export function setupSignIn(pageQuery) {
    $("#submit").on("click", () => {
        signInSubmit(pageQuery);
    });

    $("#password-reset").on("click", () => {
        sendPasswordReset();
    });

    $("#log-in-switch-link").on("click", () => {
        goToPage('login');
    });

    $("#sign-up-switch-link").on("click", () => {
        goToPage('signup');
    });

    if (findURLValue(pageQuery, "redirect", true) != "") {
        createReAuthPage(pageQuery);
    }

    $("#submit, .login > input").on("keydown", (event) => {
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
    btn.addEventListener('click', () => {
        signInSubmit(pageQuery);
    });
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
                alert("Your email was saved successfully.");
                goToPage(redirect); // Removed passing back the email, because that doesn't seem to be needed anymore
            }).catch((error) => {
                alert("There was an error updating your email. Please try again later.");
                console.error(error);
            });
        }).catch((error) => {
            alert("There was an error updating your email. Please try again later.");
            console.error(error);
        });
    } else {
        // If they do not have an email in the query
        // TO DO: Add additional redirects as needed
        goToPage(redirect);
    }
}

/**
 * @description Starts the process of submitting the form either for sign in or sign up. Runs when the user clicks the submit button.
 * @param {String} pageQuery The query string of the page. If the length of this string is greater than 1, it will assume this is a reauthentication.
 */
function signInSubmit(pageQuery = "") {
    let reAuth;
    if (pageQuery.length > 1) {
        reAuth = true;
    } else {
        reAuth = false;
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
            if (reAuth) {
                authRedirect(pageQuery);
            } else {
                goToPage("");
            }
        }).catch((error) => {
            console.error(error);
        });
    });
}

/**
 * @description Signs in a user with email and password.
 * @param {Boolean} reAuth Whether or not this is a reauthentication.
 */
function signIn(reAuth = false) {
    return new Promise(function (resolve, reject) {
        let user = auth.currentUser;
        if (user && !reAuth) {
            alert("Another user is currently signed in. Please sign out first.");
        } else {
            let email;
            if (reAuth) email = user.email;
            else email = document.getElementById('email').value;
            let password = document.getElementById('password').value;
            if (email.length < 4) {
                alert('Please enter an email address.');
                reject();
            }
            if (password.length < 4) {
                alert('Please enter a password.');
                reject();
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
                const credential = EmailAuthProvider.credential(email, password);
                reauthenticateWithCredential(user, credential).then(function () {
                    // User re-authenticated.
                    resolve(reAuth);
                }).catch(function (error) {
                    // An error happened.
                    let errorCode = error.code;
                    let errorMessage = error.message;
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
 * @description Handles the sign up process. This includes validating the user's input, creating the user,
 *              adding the user to the database, updating the max barcodeNumber, and logging the event.
 * @returns {Promise} A promise that resolves when the user is signed up.
 */
function handleSignUp() {
    return new Promise(function (resolve, reject) {
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
            alert('Please enter an email address.');
            reject();
            return;
        }
        if (password.length < 4) {
            alert('Please enter a longer password.');
            reject();
            return;
        }
        if (password != confirmPassword) {
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
        let signUpError = false;
        // Create user with email and pass, then logs them in.
        createUserWithEmailAndPassword(auth, email, password).catch(function (error) {
            // Handle Errors here.
            signUpError = true;
            let errorCode = error.code;
            let errorMessage = error.message;
            if (errorCode == 'auth/weak-password') {
                alert('The password is too weak.');
            } else if (errorCode == 'auth/email-already-in-use') {
                alert("This email is already in use. If you already have an account, please try signing in instead.");
            } else {
                alert(errorMessage);
            }
            console.error(error);
            reject();
        }).then(function () {
            if (!signUpError) {
                let user = auth.currentUser;
                let userObject;
                // Run a Transaction to ensure that the correct barcode is used. (Atomic Transaction)
                runTransaction(db, (transaction) => {
                    let cloudVarsPath = doc(db, "config/writable_vars");
                    // Get the variable stored in the writable_vars area
                    return transaction.get(cloudVarsPath).then((docSnap) => {
                        if (!docSnap.exists()) {
                            throw "Document does not exist!";
                        }
                        // Save the max value and incriment it by one.
                        let newCardNumber = docSnap.data().maxCardNumber + 1;
                        // Create a new user object
                        userObject = new User(newCardNumber, firstName, lastName, email, phone,
                            address + ", " + town + ", " + state + " " + zip, null, null, new Date(), null,
                            new Date(), user.uid, false, false, false, new Date(), true);
                        // Set the document to exist in the users path
                        transaction.set(doc(db, "users", user.uid), userObject.toObject());
                        // Update the cloud variable to contain the next card number value
                        transaction.update(cloudVarsPath, {
                            maxCardNumber: newCardNumber
                        });
                        return newCardNumber;
                    });
                }).then((newCardNumber) => {
                    // After both writes complete, send the user to the edit page and take it from there.
                    console.log("New User Created with card number: ", newCardNumber);
                    updateUserAccountInfo();
                    sendEmailVerificationToUser();
                    logEvent(analytics, "sign_up", {
                        method: "email",
                        userObject: userObject
                    });
                    resolve();
                }).catch((err) => {
                    console.error(err);
                    reject(err);
                });
            }
        });
    });
}

/**
 * @description Sends a password reset email to the user.
 */
function sendPasswordReset() {
    let email = document.getElementById('email').value;
    if (!email.includes('@') || email.lastIndexOf('.') < email.indexOf('@')) {
        alert("Please enter a valid email into the Email box above. Then try again.");
        return;
    }
    sendPasswordResetEmail(auth, email).then(function () {
        alert('Password Reset Email Sent!');
    }).catch(function (error) {
        // Handle Errors here.
        let errorCode = error.code;
        let errorMessage = error.message;
        if (errorCode == 'auth/invalid-email') {
            alert(errorMessage);
        } else if (errorCode == 'auth/user-not-found') {
            alert(errorMessage);
        } else {
            alert("Your password reset email could not be sent. Please contact the librarian for help.");
        }
        console.error(error);
    });
}

console.log("signIn.js Loaded!");
