import { logEvent } from "firebase/analytics";
import {
    browserLocalPersistence,
    browserSessionPersistence,
    createUserWithEmailAndPassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword
} from "firebase/auth";
import { updateUserAccountInfo } from "./ajax";
import { createOnClick, findURLValue, openModal, sendEmailVerificationToUser, updateUserEmail } from "./common";
import { analytics, auth, currentPage } from "./globals";
import type { FirebaseError } from "firebase/app";

/**
 * @description Sets up the sign in page.
 * @param {String} pageQuery The query string of the page.
 */
export function setupSignIn(pageQuery: string) {
    createOnClick(document.getElementById("submit")! as Element, () => signInSubmit(pageQuery));
    createOnClick(document.getElementById("password-reset")! as Element, sendPasswordReset);

    if (findURLValue(pageQuery, "redirect", true) != "") {
        createReAuthPage(pageQuery);
    }

    // If the user presses enter while in the input fields, submit the form
    document.querySelector(".login > input")?.addEventListener("keydown", (event) => {
        if ((event as KeyboardEvent).key === "Enter") {
            signInSubmit(pageQuery);
        }
    });
}

/**
 * @description Redesigns the sign in page to allow the user to reauthenticate only using their password.
 * @param {String} pageQuery The query string of the page.
 */
function createReAuthPage(pageQuery: string) {
    (document.getElementById("content") as HTMLElement).innerHTML = "";
    const div1 = document.createElement("div");
    div1.id = "form";
    const div2 = document.createElement("div");
    div2.classList.add("login");
    const h3 = document.createElement("h3");
    h3.innerHTML = "Please enter your password.";
    div2.appendChild(h3);
    const lbl = document.createElement("label");
    lbl.innerHTML = "Password:";
    lbl.setAttribute("for", "password");
    div2.appendChild(lbl);
    const input = document.createElement("input");
    input.type = "password";
    input.id = "password";
    div2.appendChild(input);
    div2.appendChild(document.createElement("br"));
    div2.appendChild(document.createElement("br"));
    const btn = document.createElement("button");
    btn.id = "submit";
    btn.innerHTML = "Submit";
    div2.appendChild(btn);
    createOnClick(btn, () => signInSubmit(pageQuery));
    div2.appendChild(document.createElement("br"));
    div2.appendChild(document.createElement("br"));
    div1.appendChild(div2);
    document.getElementById("content")!.appendChild(div1);
}

/**
 * @description Handles the process of redirecting the user after they have signed in again. For now, this is only used for changing the user's email.
 * @param {String} pageQuery The query string of the page.
 */
function authRedirect(pageQuery: string) {
    // Find the redirect path in the query
    const redirect = findURLValue(pageQuery, "redirect");

    // If they are being redirected with an email (to the account page)
    if (pageQuery.includes("email")) {
        const newEmail = findURLValue(pageQuery, "email");
        updateUserEmail(newEmail)
            .then(() => {
                openModal("success", "Your email was saved successfully.");
                // goToPage(redirect);
            })
            .catch((error: unknown) => {
                openModal("error", "There was an error updating your email. Please try again later.");
                console.error(error);
            });
    } else {
        // If they do not have an email in the query
        // TO DO: Add additional redirects as needed
        // goToPage(redirect);
    }
}

/**
 * @description Starts the process of submitting the form either for sign in or sign up. Runs when the user clicks the submit button.
 * @param {String} pageQuery The query string of the page. If the length of this string is greater than 1, it will assume this is a reauthentication.
 */
function signInSubmit(pageQuery = "") {
    let reAuth = false;
    if (pageQuery.length > 1) {
        reAuth = true;
    }
    let persistancePromise;
    if (!reAuth) {
        // Sets the persistance state in Firebase
        const persistance = (document.getElementById("remember-me")! as HTMLInputElement).checked;
        if (persistance) {
            persistancePromise = setPersistence(auth, browserLocalPersistence);
        } else {
            persistancePromise = setPersistence(auth, browserSessionPersistence);
        }
    } else {
        // If this is a reauthentication, we don't need to change the persistance state
        persistancePromise = Promise.resolve(undefined);
    }
    persistancePromise.then(() => {
        let authPromise: Promise<boolean | string>;
        if (currentPage == "login") {
            authPromise = signIn(reAuth);
        } else if (currentPage == "signup") {
            authPromise = handleSignUp();
        } else {
            console.error("The current page is not a sign in or sign up page.");
            return;
        }
        authPromise
            .then(() => {
                if (reAuth) {
                    authRedirect(pageQuery);
                } else {
                    // goToPage("");
                }
            })
            .catch((error: unknown) => {
                console.warn("error in auth functions", error);
            });
    });
}

/**
 * @description Signs in a user with email and password.
 * @param {Boolean} reAuth Whether or not this is a reauthentication.
 */
function signIn(reAuth = false) {
    return new Promise<boolean>((resolve, reject) => {
        let user = auth.currentUser;
        if (user && !reAuth) {
            openModal("error", "Another user is currently signed in. Please sign out first.");
            reject("user-already-signed-in");
            return;
        }

        let email;
        if (reAuth && user) email = user.email;
        else email = (document.getElementById("email")! as HTMLInputElement).value;
        const password = (document.getElementById("password")! as HTMLInputElement).value;
        if (email && email.length < 4) {
            openModal("issue", "Please enter an email address.");
            reject("no-email-address");
            return;
        }
        if (password.length < 4) {
            openModal("issue", "Please enter a password.");
            reject("no-password");
            return;
        }

        let signInFunction;
        if (!email) {
            openModal("error", "No email address was found for the current user.");
            reject("no-email-address");
            return;
        }
        const credential = EmailAuthProvider.credential(email, password);
        if (reAuth) {
            if (!user) {
                openModal("error", "No user is currently signed in.");
                reject("no-user-signed-in");
                return;
            }
            signInFunction = reauthenticateWithCredential(user, credential);
        } else {
            signInFunction = signInWithEmailAndPassword(auth, email, password);
        }

        signInFunction
            .then(() => {
                user = auth.currentUser;
                if (!user) {
                    openModal("error", "No user is currently signed in.");
                    reject("no-user-signed-in");
                    return;
                }
                logEvent(analytics, "login", {
                    method: "email",
                    userId: user.uid
                });
                resolve(reAuth);
            })
            .catch((error: FirebaseError) => {
                // Handle Errors here.
                const errorCode = error.code;
                const errorMessage = error.message;
                if (errorCode === "auth/wrong-password") {
                    openModal("issue", "Wrong password.");
                } else {
                    openModal("error", errorMessage);
                    console.error(error);
                    (document.getElementById("email") as HTMLInputElement).value = "";
                }
                (document.getElementById("password") as HTMLInputElement).value = "";
                reject(errorCode);
            });
    });
}

/**
 * @description Handles the sign up process. This includes validating the user's input, creating the user,
 *              adding the user to the database, allocating a card number, and logging the event.
 * @returns {Promise} A promise that resolves when the user is signed up.
 */
function handleSignUp() {
    return new Promise<string>((resolve, reject) => {
        const firstName = (document.getElementById("firstName")! as HTMLInputElement).value;
        const lastName = (document.getElementById("lastName")! as HTMLInputElement).value;
        const email = (document.getElementById("email")! as HTMLInputElement).value;
        const phone = (document.getElementById("phone")! as HTMLInputElement).value;
        const address = (document.getElementById("address")! as HTMLInputElement).value;
        const town = (document.getElementById("town")! as HTMLInputElement).value;
        const state = (document.getElementById("state")! as HTMLInputElement).value;
        const zip = (document.getElementById("zip")! as HTMLInputElement).value;
        const password = (document.getElementById("password")! as HTMLInputElement).value;
        const confirmPassword = (document.getElementById("confirm-password")! as HTMLInputElement).value;
        if (email.length < 4) {
            openModal("issue", "Please enter an email address.");
            reject("no-email-address");
            return;
        }
        if (password.length < 4) {
            openModal("issue", "Please enter a longer password.");
            reject("no-password");
            return;
        }
        if (password != confirmPassword) {
            openModal("issue", "Your passwords do not match.");
            reject("password-confirm-fail");
            return;
        }
        if (!/^(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/.test(phone)) {
            openModal("issue", "Please enter a valid phone number");
            reject("invalid-phone-number");
            return;
        }
        if (address.length < 6) {
            openModal("issue", "Please enter a valid address");
            reject("invalid-address");
            return;
        }
        if (town.length < 3) {
            openModal("issue", "Please enter a valid address");
            reject("invalid-town");
            return;
        }
        if (state.length != 2) {
            openModal("issue", "Please enter the state as two letters (ex. MA)");
            reject("invalid-state");
            return;
        }
        if (zip.length != 5) {
            openModal("issue", "Please enter a valid zip code");
            reject("invalid-zip-code");
            return;
        }
        if (firstName.length < 1) {
            openModal("issue", "Please enter a first name.");
            reject("invalid-first-name");
            return;
        }
        if (lastName.length < 1) {
            openModal("issue", "Please enter a last name.");
            reject("invalid-last-name");
            return;
        }

        // For now, a new user will only persist for the session.
        // TODO: Add a "Remember Me" checkbox that will set the persistence to local for signup.
        setPersistence(auth, browserSessionPersistence).then(() => {
            // Creates user with email and password, then logs them in.
            createUserWithEmailAndPassword(auth, email, password)
                .then(async () => {
                    const user = auth.currentUser;
                    if (!user) {
                        throw new Error("The account was created but no authenticated user was available.");
                    }

                    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";
                    const response = await fetch(`${apiUrl}/users/register`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${await user.getIdToken()}`
                        },
                        body: JSON.stringify({
                            firstName,
                            lastName,
                            phone,
                            address: address + ", " + town + ", " + state + " " + zip
                        })
                    });
                    if (!response.ok) {
                        const errorBody = await response.json().catch(() => ({}));
                        throw new Error(errorBody.error || "The account profile could not be created.");
                    }

                    // After both writes complete, send the user to the edit page and take it from there.
                    updateUserAccountInfo();
                    sendEmailVerificationToUser();
                    logEvent(analytics, "sign_up", {
                        method: "email",
                        firstName: firstName,
                        lastName: lastName,
                        userId: user.uid,
                        email: email,
                        phone: phone,
                        address: address + ", " + town + ", " + state + " " + zip
                    });
                    resolve("");
                })
                .catch((error: FirebaseError) => {
                    if (error.code == "auth/weak-password") {
                        openModal("issue", "The password is too weak. Please try another password.");
                    } else if (error.code == "auth/email-already-in-use") {
                        openModal(
                            "issue",
                            "This email is already in use. If you already have an account, please try signing in instead. " +
                                "If you don't remember your password, you can reset it from the login page, or contact the librarian for help."
                        );
                    } else {
                        openModal(
                            "error",
                            error.message || "There was an error creating your account. Please try again."
                        );
                    }
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
    const email = (document.getElementById("email")! as HTMLInputElement).value;
    if (!email.includes("@") || email.lastIndexOf(".") < email.indexOf("@")) {
        openModal("issue", "Please enter a valid email into the Email box above. Then try again.");
        return;
    }
    sendPasswordResetEmail(auth, email)
        .then(() => {
            openModal("success", "Password Reset Email Sent!");
        })
        .catch((error: FirebaseError) => {
            // Handle Errors here.
            const errorCode = error.code;
            const errorMessage = error.message;
            if (errorCode == "auth/invalid-email") {
                openModal("error", errorMessage);
            } else if (errorCode == "auth/user-not-found") {
                openModal("error", errorMessage);
            } else {
                openModal(
                    "error",
                    "Your password reset email could not be sent. Please contact the librarian for help.\n" +
                        errorMessage
                );
                console.error(error);
            }
        });
}

console.log("signIn.js has Loaded!");
