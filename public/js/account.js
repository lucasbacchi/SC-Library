import { EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { goToPage, updateEmailinUI, updateUserAccountInfo } from "./ajax";
import { buildBookBox, sendEmailVerificationToUser } from "./common";
import { auth, currentPanel, db, directory, setCurrentPanel, storage, User } from "./globals";


/**
 * @param {String} pageQuery The query string of the page from goToPage() 
 * @description Sets up the account page. This includes loading the user's information from the database and setting up the event listeners for the page.
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

    // Create Event Listeners to handle changes to the user's profile picture
    // All are required to handle leaving the element and coming back again
    $("#account-page-image").on("mouseover", () => {
        showAccountImageOverlay();
    });
    $("#account-image-overlay").on("mouseleave", () => {
        $("#account-image-overlay").css("opacity", "0");
    });
    $("#account-image-overlay").on("mouseover", () => {
        $("#account-image-overlay").clearQueue().stop();
        showAccountImageOverlay();
    });

    // Keyboard accessibility
    $("#account-page-image").on("focus", () => {
        showAccountImageOverlay();
    });
    $("#account-image-overlay").on("blur", () => {
        $("#account-image-overlay").css("opacity", "0");
    });
    $("#account-image-overlay").on("focus", () => {
        $("#account-image-overlay").clearQueue().stop();
        showAccountImageOverlay();
    });

    function showAccountImageOverlay() {
        $("#account-image-overlay").show();
        setTimeout(() => {
            $("#account-image-overlay").css("opacity", "1");
        }, 5);
    }

    // If a user clicks the button to change their pfp, click the input button
    $("#account-image-overlay").on("click", () => {
        if ($("#file-input")) {
            $("#file-input").trigger("click");
        }
    });

    // Keyboard accessibility
    $("#account-image-overlay").on("keydown", (event) => {
        if (event.key != "Enter") {
            return;
        }
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
    getAccountInfoFromDatabase().then((userObject) => {
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
        alert("There was an error getting your account information from the database. Please try again later.");
        console.log(error);
    });
}

var userObject;
/**
 * @description Gets the user's account information from the database
 * @returns {Promise<User>} The user object from the database
 */
function getAccountInfoFromDatabase() {
    return new Promise(function (resolve, reject) {
        let user = auth.currentUser;

        // If the user object has already been loaded, return it, then load the data for the next time.
        if (userObject) {
            resolve(userObject);
        }
        // Get the stored data from the database
        getDoc(doc(db, "users", user.uid)).then((docSnap) => {
            if (!docSnap.exists()) {
                console.error("The user document could not be found.");
                reject();
                return;
            }
            userObject = User.createFromObject(docSnap.data());

            resolve(userObject);
        }).catch((error) => {
            console.log("Failed to get the database file for this user", error);
            reject();
        });
    });
}

/**
 * @description Sets up the account overview panel including filling the fields with the user's information and creating event listeners.
 */
function setupAccountOverview() {
    getAccountInfoFromDatabase().then((user) => {
        fillAccountOverviewFields(user.firstName, user.lastName, user.email, user.cardNumber);
    }).catch((error) => {
        console.error(error);
        alert("There was an error getting your account information from the database. Please try again later.");
    });

    $(".save-button").on("click", () => {
        updateAccount();
    });

    $("#email-verified-link").on("click", () => {
        sendEmailVerificationToUser();
    });

    // Keyboard accessibility
    $("#email-verified-link").on("keydown", (event) => {
        if (event.key != "Enter") {
            return;
        }
        sendEmailVerificationToUser();
    });

    // If the user attempts to leave, let them know if they have unsaved changes
    $(window).on("beforeunload", (event) => {
        if (checkForChangedFields() && !confirm("You have unsaved changes. Are you sure you want to leave this page?")) {
            event.preventDefault();
            return "You have unsaved changes! Please save changes before leaving!";
        } else {
            $(window).off("beforeunload");
        }
    });
}

/**
 * @param {String} firstName the user's first name
 * @param {String} lastName the user's last name
 * @param {String} email the user's email address
 * @param {Number} cardNumber the user's card number
 * @description Fills the account overview fields with the user's information.
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
    $(".save-button").on("click", () => {
        updateAccount();
    });
}

/**
 * @description Sets up the account security page
 */
function setupAccountSecurity() {
    $("#change-password").on("click", () => {
        changePassword();
    });

    $("#delete-account-button").on("click", () => {
        deleteAccount();
    });
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
 * @param {Array<Book>} books the array of books to create HTML elements for
 * @param {String} str Used to determine which page the elements are being created for
 * @description Creates the HTML elements for a checkout listing.
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
    if (!checkForChangedFields()) {
        alert("There are no changes to save.");
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
            alert("Your name was saved successfully.");
        }).catch((error) => {
            alert("An error has occured. Please try again later.");
            console.error(error);
        });
    }

    // If the email was changed update it.
    if ($("#setting-email").val() != userObject.email && $("#setting-email").val() != undefined) {
        let newEmail = $("#setting-email").val().toString();
        updateEmail(user, newEmail).then(() => {
            updateDoc(doc(db, "users", user.uid), {
                email: newEmail,
                lastUpdated: new Date()
            }).then(() => {
                let email = user.email;
                if (!user.emailVerified) {
                    $("#email-verified").show(); // The new email will likely not be verified
                }
                // Assuming there was no problem with the update, set the new values on the index page and the account page.
                updateEmailinUI(email);
                updateAccountPageInfo();
                alert("Your email was saved successfully.");
            }).catch((error) => {
                alert("There was an error updating your email. Please try again later.");
                console.error(error);
            });
        }).catch((error) => {
            // If the user needs to reauthenticate:
            if (error.code == "auth/requires-recent-login") {
                alert("Please re-enter your password to complete this operation.");
                goToPage("login?redirect=account&email=" + newEmail, null, null, true);
            } else if (error.code == "auth/email-already-in-use") {
                alert("This email is already associated with another account. Please sign into that account, or try a different email.");
            } else {
                alert("An error has occured when trying to update your email. Please try again later.");
                console.error(error);
            }
        });
    }

    // Prevent the cached data from being used again.
    userObject = null;
}

/**
 * @description Deletes/Disables (?) the user's account from the auth system, marks them as deleted in the database, removes their images from storage, and signs them out.
 */
function deleteAccount() {
    // TODO: Write this function
    alert("Not implemented. If you'd like to delete your account, contact the librarian.");
}




const xhttp = new XMLHttpRequest();
/**
 * @param {String} newPanel the path to the panel to load.
 * @returns {Promise<void>}
 * @description Changes the account panel to the one specified by newPanel
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
        xhttp.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
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
function checkForChangedFields() {
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
        alert("The new passwords do not match!");
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
                alert("Your password was succesfully changed");
                goToPage("");
            }).catch((error) => {
                console.error(error);
            });
        }).catch((error) => {
            // An error happened.
            let errorCode = error.code;
            let errorMessage = error.message;
            if (errorCode === "auth/wrong-password") {
                alert("The current password that you entered was incorrect.");
            } else {
                alert(errorMessage);
            }
            console.error(error);
            $("#current-password").val("");
            $("#new-password").val("");
            $("#confirm-new-password").val("");
        });
    } else {
        alert("You must enter a longer password");
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
            /* This is bad because then the canvas elements can't use the link
            output.onload = function() {
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
                alert("Not all images were uploaded successfully");
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
                alert(error);
                console.error(error);
            });

            Promise.all([authPromise, databasePromise]).then(() => {
                console.log("Auth and Database updated successfully.");
            }).catch((error) => {
                alert("There was an issue saving your profile image. You may need to reupload it. " + error);
                console.error(error);
            });
        }).catch((error) => {
            alert(error);
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
                    }).catch(function(error) {
                        alert("ERROR: There was a problem storing your new pfp image. Your image has not been saved.");
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
