import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { goToPage, updateUserAccountInfo } from "./ajax";
import { buildBookBox, createOnClick, encodeHTML, getUser, openModal, sendEmailVerificationToUser, setupWindowBeforeUnload, updateUserEmail } from "./common";
import { auth, currentPanel, db, directory, setCurrentPanel, storage } from "./globals";


/**
 * @description Sets up the account page. This includes loading the user's information from the database and setting up the event listeners for the page.
 * @param {String} pageQuery The query string of the page from goToPage()
 */
export function setupAccountPage(pageQuery) {
    let user = auth.currentUser;
    if (!user) {
        $("#settings-column").html("No user is signed in. To sign in, please click <a id='no-user-sign-in-link' href='/login'>here</a>.");
        return;
    }

    // Load user data onto the page from the database (only the outer frame)
    updateAccountPageInfo();

    // Sends the user to the correct panel based on the query string
    if (pageQuery.substring(1) != "" && directory.includes("account/" + pageQuery.substring(1))) {
        goToSettingsPanel(pageQuery.substring(1));
    } else {
        goToSettingsPanel("overview");
    }

    // If a user clicks the button to change their pfp, click the input button
    createOnClick($("#account-image-overlay"), () => {
        if ($("#file-input")) {
            $("#file-input").trigger("click");
        }
    });

    // When there is a change to the input, upload the file
    $("#file-input").on("change", () => {
        processAccountImage();
    });
}

/**
 * @description Updates the account page (outer frame) with the user's information from the database
 */
function updateAccountPageInfo() {
    getUser().then((userObject) => {
        $("#account-page-name").text(userObject.firstName + " " + userObject.lastName);

        let email = userObject.email;
        email = email.substring(0, email.indexOf("@")) + "\u200B" + email.substring(email.indexOf("@"), email.length);
        $("#account-page-email").text(email);

        if (userObject.pfpLink != null) {
            $("#account-page-image").attr("src", userObject.pfpLink);
        } else {
            $("#account-page-image").attr("src", "/img/default-user.jpg");
        }
    }).catch((error) => {
        openModal("error", "There was an error getting your account information from the database. Please try again later.");
        console.log(error);
    });
}

/**
 * @description Sets up the account overview panel including filling the fields with the user's information and creating event listeners.
 */
function setupAccountOverview() {
    getUser().then((user) => {
        fillAccountOverviewFields(user.firstName, user.lastName, user.email, user.cardNumber);

        // If the user attempts to leave, let them know if they have unsaved changes.
        setupWindowBeforeUnload(checkForChangedFields, user);
    }).catch((error) => {
        console.error(error);
        openModal("error", "There was an error getting your account information from the database. Please try again later.");
    });

    createOnClick($(".save-button"), updateAccount);
    createOnClick($("#send-email-verification"), sendEmailVerificationToUser);
}

/**
 * @description Fills the account overview fields with the user's information.
 * @param {String} firstName the user's first name
 * @param {String} lastName the user's last name
 * @param {String} email the user's email address
 * @param {Number} cardNumber the user's card number
 */
function fillAccountOverviewFields(firstName, lastName, email, cardNumber) {
    if (firstName && firstName != "") {
        $("#setting-first-name").val(firstName);
    }
    if (lastName && lastName != "") {
        $("#setting-last-name").val(lastName);
    }
    if (email && email != "") {
        $("#setting-email").val(email);
    }
    if (!auth.currentUser.emailVerified) {
        $("#email-verified").show();
    }
    cardNumber = cardNumber.toString();
    cardNumber = cardNumber.substring(0, 1) + " " + cardNumber.substring(1, 5) + " " + cardNumber.substring(5);
    if (cardNumber && cardNumber != "") {
        $("#setting-card-number").val(cardNumber);
    }
}

/**
 * @description Sets up the account checkouts page
 */
function setupAccountCheckouts() {
    let checkouts = getCheckouts();
    createCheckouts(checkouts, "checkouts");
}

/**
 * @description Sets up the account notifications page
 */
function setupAccountNotifications() {
    createOnClick($(".save-button"), updateAccount);
}

/**
 * @description Sets up the account security page
 */
function setupAccountSecurity() {
    createOnClick($("#change-password"), changePassword);
    createOnClick($("#delete-account-button"), deleteAccount);
}

/**
 * @description Gets the user's checked out books from the database
 * @returns {Array<Book>} The user's checked out history.
 */
function getCheckouts() {
    // TODO: Get the user's checked out books from the database
    return [];
}

/**
 * @description Creates the HTML elements for a checkout listing.
 * @param {Array<Book>} books the array of books to create HTML elements for
 * @param {String} str Used to determine which page the elements are being created for
 */
function createCheckouts(books, str) {
    if (books.length == 0) {
        if (str == "checkouts") {
            const p = document.createElement("p");
            p.appendChild(document.createTextNode("You have no books checked out."));
            $("#checkouts")[0].appendChild(p);
        }
    }
    for (let i = 0; i < books.length; i++) {
        if (str == "checkouts")
            $("#checkouts")[0].appendChild(buildBookBox(books[i], "account", books[i].due));
    }
}

/**
 * @description Updates the user's account information in the database if it has changed. Runs when the user clicks the Save button on the account page.
 */
function updateAccount() {
    let user = auth.currentUser;
    getUser().then((userObject) => {
        if (!checkForChangedFields(userObject)) {
            openModal("info", "There are no changes to save.");
            return;
        }

        // If the names were changed, update them.
        if (($("#setting-first-name").val() != userObject.firstName && $("#setting-first-name").val() != undefined) ||
            ($("#setting-last-name").val() != userObject.lastName && $("#setting-last-name").val() != undefined)) {
            updateDoc(doc(db, "users", user.uid), {
                firstName: $("#setting-first-name").val(),
                lastName: $("#setting-last-name").val(),
                lastUpdated: new Date()
            }).then(() => {
                // Assuming there was no problem with the update, set the new values on the index page and the account page.
                updateUserAccountInfo();
                updateAccountPageInfo();
                openModal("success", "Your name was saved successfully.");
            }).catch((error) => {
                openModal("error", "An error has occured. Please try again later.");
                console.error(error);
            });
        }

        // If the email was changed update it.
        if ($("#setting-email").val() != userObject.email && $("#setting-email").val() != undefined) {
            let newEmail = $("#setting-email").val().toString();
            updateUserEmail(newEmail).then(() => {
                if (!user.emailVerified) {
                    $("#email-verified").show(); // The new email will likely not be verified
                }
                updateAccountPageInfo();
                openModal("success", "Your email was saved successfully.");
            }).catch((error) => {
                // If the user needs to reauthenticate:
                if (error.code && error.code == "auth/requires-recent-login") {
                    let closeModal = openModal("info", "For your security, you will be redirected to the login page to re-enter your password", "Redirecting...", "OK", () => {
                        closeModal();
                        goToPage("login?redirect=account&email=" + newEmail, null, true);
                    }, "Cancel", () => {
                        closeModal();
                        // Reset the email field to the old email
                        fillAccountOverviewFields(userObject.firstName, userObject.lastName, userObject.email, userObject.cardNumber);
                    });
                } else {
                    openModal("error", "An error has occured when trying to update your email. Please try again later.");
                    console.error(error);
                }
            });
        }
    });
}

/**
 * @description Deletes/Disables (?) the user's account from the auth system, marks them as deleted in the database, removes their images from storage, and signs them out.
 */
function deleteAccount() {
    // TODO: Write this function
    openModal("info", "Not implemented. If you'd like to delete your account, contact the librarian.");
}




const xhttp = new XMLHttpRequest();
/**
 * @description Changes the account panel to the one specified by newPanel
 * @param {String} newPanel the path to the panel to load.
 * @returns {Promise<void>}
 */
export function goToSettingsPanel(newPanel) {
    return new Promise((resolve, reject) => {
        $("#settings-column").removeClass("fade");

        if (newPanel == currentPanel) {
            reject("The user attempted to view the same account panel twice.");
            return;
        }

        if (directory.includes("account/" + newPanel)) {
            xhttp.open("GET", "/content/account/" + newPanel + ".html", true);
        } else {
            xhttp.open("GET", "/content/404.html", true);
        }
        xhttp.send();

        // Set the content of the page
        xhttp.onreadystatechange = () => {
            if (xhttp.readyState == 4 && xhttp.status == 200) {
                if (currentPanel != newPanel) {
                    $("#settings-column").addClass("fade");
                }

                document.getElementById("settings-column").innerHTML = xhttp.responseText;
                // Remove Placeholder Height
                document.getElementById("settings-column").style.height = "";

                // Fire additional scripts based on the panel that has just loaded.
                if (newPanel == "overview") {
                    setupAccountOverview();
                } else if (newPanel == "checkouts") {
                    setupAccountCheckouts();
                } else if (newPanel == "notifications") {
                    setupAccountNotifications();
                } else if (newPanel == "security") {
                    setupAccountSecurity();
                }

                setCurrentPanel(newPanel);
                resolve();
            }
        };

        xhttp.timeout = 5000;
        xhttp.ontimeout = (event) => {
            reject();
            console.error(event);
        };
    });
}

/**
 * @description Returns true if the user has unsaved changes on the overview panel, otherwise, returns false
 * @returns {Boolean} A boolean value indicating whether or not the user has unsaved changes.
 */
function checkForChangedFields(userObject) {
    let answer = false;
    if ($("#setting-first-name").val() != userObject.firstName && $("#setting-first-name").val() != undefined)
        answer = true;
    if ($("#setting-last-name").val() != userObject.lastName && $("#setting-last-name").val() != undefined)
        answer = true;
    if ($("#setting-email").val() != userObject.email && $("#setting-email").val() != undefined)
        answer = true;
    return answer;
}

/**
 * @description Changes the user's password.
 */
function changePassword() {
    let currentPassword = $("#current-password").val().toString();
    let newPassword = $("#new-password").val().toString();
    if (newPassword != $("#confirm-new-password").val()) {
        openModal("issue", "The new passwords do not match!");
        $("#current-password").val("");
        $("#new-password").val("");
        $("#confirm-new-password").val("");
    } else if (newPassword.length >= 4) {
        let user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        reauthenticateWithCredential(user, credential).then(() => {
            // User re-authenticated.
            updatePassword(user, newPassword).then(() => {
                // Update successful
                goToPage("");
                openModal("success", "Your password was succesfully changed");
            }).catch((error) => {
                console.error(error);
            });
        }).catch((error) => {
            // An error happened.
            let errorCode = error.code;
            let errorMessage = error.message;
            if (errorCode === "auth/wrong-password") {
                openModal("issue", "The current password that you entered was incorrect.");
            } else {
                openModal("error", encodeHTML(errorMessage));
            }
            console.error(error);
            $("#current-password").val("");
            $("#new-password").val("");
            $("#confirm-new-password").val("");
        });
    } else {
        openModal("error", "You must enter a longer password");
        $("#current-password").val("");
        $("#new-password").val("");
        $("#confirm-new-password").val("");
    }
}

/**
 * @description Runs when a new file is selected in the account image upload input. The file is used to create
 *              both image sizes, they are uploaded to storage, and then they are updated in the database.
 */
function processAccountImage() {
    let user = auth.currentUser;
    new Promise((resolve, reject) => {
        let fileInput = $("#file-input")[0];
        const file = fileInput.files[0];
        if (file) {
            let output = document.getElementById('account-page-image');
            output.src = encodeURI(URL.createObjectURL(file));
            // TODO: Figure out how to free memory after the image is uploaded, without breaking the canvas elements
            /* This is bad because then the canvas elements can't use the link
            output.onload = () => {
                URL.revokeObjectURL(output.src); // free memory
            };*/
            output.onload = () => {
                resolve(file);
            };
        } else {
            reject();
            return;
        }
    }).then((file) => {
        let promises = [];
        promises[0] = uploadAccountImage("original", file);
        promises[1] = uploadAccountImage("icon", file);

        Promise.all(promises).then((values) => {
            if (!Array.isArray(values) || !values[0] || !values[1]) {
                openModal("error", "Not all images were uploaded successfully");
                return;
            }

            // Update UI with new Profile Picture
            $("#account-page-image").attr("src", values[0]);
            $("#large-account-image").attr("src", values[1]);
            $("#small-account-image").attr("src", values[1]);

            // Update Auth object
            let authPromise = updateProfile(user, {
                photoURL: values[0]
            }).catch((error) => {
                console.error(error);
            });

            // Update Database
            let databasePromise = updateDoc(doc(db, "users", user.uid), {
                pfpLink: values[0],
                pfpIconLink: values[1]
            }).then(() => {
                console.log("New PFP updated in database");
            }).catch((error) => {
                openModal("error", error);
                console.error(error);
            });

            Promise.all([authPromise, databasePromise]).then(() => {
                console.log("Auth and Database updated successfully.");
            }).catch((error) => {
                openModal("issue", "There was an issue saving your profile image. You may need to reupload it. " + error);
                console.error(error);
            });
        }).catch((error) => {
            openModal("error", error);
            console.error(error);
        });
    });
}

/**
 * @description Handles the resizing of the images (using a canvas) and uploading them to storage.
 * @param {String} type The size of the image to be uploaded. "original" or "icon"
 * @param {File} file The uploaded file to be converted into an image
 * @returns {Promise<String>} A promise that resolves with the download URL of the uploaded image.
 */
function uploadAccountImage(type = "original", file) {
    return new Promise((resolve, reject) => {
        let user = auth.currentUser;
        let maxHeight;
        if (type == "original") {
            maxHeight = 400;
        } else if (type == "icon") {
            maxHeight = 200;
        } else {
            reject("Invalid type");
            return;
        }


        const canvas = document.createElement("canvas");
        canvas.id = type + "-canvas";
        $(".account-image-container")[0].appendChild(canvas);

        let height = $("#account-page-image")[0].naturalHeight;
        let width = $("#account-page-image")[0].naturalWidth;
        let ratio = height / width;
        let square = Math.min(height, width);

        if (square > maxHeight) {
            square = maxHeight;
        }

        $("#" + type + "-canvas")[0].height = square;
        $("#" + type + "-canvas")[0].width = square;

        let ctx = $("#" + type + "-canvas")[0].getContext('2d');
        let image = new Image();
        image.setAttribute("crossorigin", "anonymous");
        image.onload = () => {
            // This will just crop off of the bottom or right of the image in order to make it a square.
            // As a nice to have, we could center it or somehow give the user the option to size it somehow.
            if (height > width) {
                ctx.drawImage(image, 0, 0, square, square * ratio);
            } else {
                ctx.drawImage(image, 0, 0, square / ratio, square);
            }
            $("#" + type + "-canvas")[0].toBlob((blob) => {
                let file = new File([blob], "pfp " + type, {type: "image/jpeg"});

                let userSpecificRef = ref(storage, "users");
                if (type == "original") {
                    userSpecificRef = ref(userSpecificRef, user.uid + "/pfp.jpg");
                } else if (type == "icon") {
                    userSpecificRef = ref(userSpecificRef, user.uid + "/pfp-200px.jpg");
                } else {
                    reject("Invalid type");
                    return;
                }

                // Upload the file to storage and get the download URL
                uploadBytes(userSpecificRef, file, {contentType: 'image/jpeg'}).then(() => {
                    console.log('Uploaded the file!');
                    getDownloadURL(userSpecificRef).then((url) => {
                        $("#" + type + "-canvas")[0].remove();
                        resolve(url);
                    }).catch((error) => {
                        openModal("error", "There was a problem storing your new pfp image. Your image has not been saved.");
                        console.error(error);
                    });
                });
            }, "image/jpeg");
        };
        image.src = URL.createObjectURL(file);
    }).catch((error) => {
        console.error(error);
    });
}


console.log("account.js has Loaded!");
