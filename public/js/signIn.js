import { logEvent } from "firebase/analytics";
import { createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail, signInWithEmailAndPassword, updateEmail } from "firebase/auth";
import { doc, runTransaction, updateDoc } from "firebase/firestore";
import { goToPage, updateEmailinUI, updateUserAccountInfo } from "./ajax";
import { findURLValue, sendEmailVerificationToUser } from "./common";
import { analytics, auth, currentPage, db } from "./globals";

export function setupSignIn(pageQueryInput) {
    $("#submit, .login > input").on("keydown", (event) => {
        if (event.key === "Enter") {
            signInSubmit(pageQueryInput);
        }
    });

    $("#submit").on("click", () => {
        signInSubmit(pageQueryInput);
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

    if (findURLValue(pageQueryInput, "redirect") != "") {
        $("#content").empty();
        var form = document.createElement('div');
        form.id = 'form';
        var p = document.createElement('h3');
        p.innerHTML = "Please enter your password.";
        $(form).append(p);
        var lbl = document.createElement('label');
        lbl.innerHTML = 'Password:';
        lbl.setAttribute('for', 'password');
        $(form).append(lbl);
        var input = document.createElement('input');
        input.type = 'password';
        input.id = 'password';
        $(form).append(input);
        var btn = document.createElement('button');
        btn.id = 'submit';
        btn.innerHTML = 'Submit';
        $(form).append(btn);
        btn.addEventListener('click', () => {
            signInSubmit(pageQueryInput);
        });
        $(form).append(document.createElement('br'));
        $(form).append(document.createElement('br'));
        $("#content").append(form);
    }
}

function authRedirect(pageQuery) {
    // Find the redirect path in the query
    var redirect = findURLValue(pageQuery, "redirect");

    // If they are being redirected with an email (to the account page)
    if (pageQuery.includes("email")) {
        var newEmail = findURLValue(pageQuery, "email");

        var user = auth.currentUser;
        // Attempt to update the account
        updateEmail(user, newEmail).then(function() {
            updateDoc(doc(db, "users", user.uid), {
                email: newEmail
            }).then(() => {
                let email = user.email;
                if (!user.emailVerified) {
                    $("#email-verified").show();
                }
                updateEmailinUI(email);
                alert("Your email was saved successfully.");
                goToPage(redirect + "?email=" + newEmail);
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

function signInSubmit(pageQuery = "") {
    if (currentPage == 'login') {
        var reAuth;
        if (pageQuery.length > 1) {
            reAuth = true;
        } else {
            reAuth = false;
        }
        signIn(reAuth).then(function() {
            if (reAuth) {
                authRedirect(pageQuery);
            } else {
                goToPage("");
            }
        }).catch(() => {});
    } else if (currentPage == 'signup') {
        handleSignUp().then(function() {
            authRedirect(pageQuery);
        }).catch(() => {
            console.warn("Signup failed (likely because the user failed validation)");
        });
    }
}

function signIn(reAuth = false) {
    return new Promise(function(resolve, reject) {
        var user = auth.currentUser;
        if (user && !reAuth) {
            alert("Another user is currently signed in. Please sign out first.");
        } else {
            var email = user.email;
            if (!reAuth) email = document.getElementById('email').value;
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
                signInWithEmailAndPassword(auth, email, password).then(() => {
                    user = auth.currentUser;
                    logEvent(analytics, "login", {
                        method: "email",
                        userId: user.uid
                    });
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
                const credential = EmailAuthProvider.credential(email, password);
                reauthenticateWithCredential(user, credential).then(function() {
                    // User re-authenticated.
                    resolve(reAuth);
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
        var confirmPassword = document.getElementById('confirm-password').value;
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
        var signUpError = false;
        // Create user with email and pass, then logs them in.
        createUserWithEmailAndPassword(auth, email, password).catch(function(error) {
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
                var user = auth.currentUser;
                // Run a Transaction to ensure that the correct barcode is used. (Atomic Transaction)
                runTransaction(db, (transaction) => {
                    var cloudVarsPath = doc(db, "config/writable_vars");
                    // Get the variable stored in the writable_vars area
                    return transaction.get(cloudVarsPath).then((docSnap) => {
                        if (!docSnap.exists()) {
                            throw "Document does not exist!";
                        }
                        // Save the max value and incriment it by one.
                        var newCardNumber = docSnap.data().maxCardNumber + 1;
                        var dateCreated = new Date();
                        // Set the document to exist in the users path
                        transaction.set(doc(db, "users", user.uid), {
                            firstName: firstName,
                            lastName: lastName,
                            address: address + ", " + town + ", " + state + " " + zip,
                            phone: phone,
                            email: email,
                            cardNumber: newCardNumber,
                            pfpLink: null,
                            pfpIconLink: null,
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
                    updateUserAccountInfo();
                    sendEmailVerificationToUser();
                    logEvent(analytics, "sign_up", {
                        method: "email",
                        userId: user.uid,
                        firstName: firstName,
                        lastName: lastName,
                        email: email,
                        phone: phone,
                        address: address + ", " + town + ", " + state + " " + zip,
                        cardNumber: newCardNumber
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

function sendPasswordReset() {
    var email = document.getElementById('email').value;
    if (!email.includes('@') || email.lastIndexOf('.') < email.indexOf('@')){
        alert("Please enter a valid email into the Email box above. Then try again.");
        return;
    }
    sendPasswordResetEmail(auth, email).then(function() {
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
