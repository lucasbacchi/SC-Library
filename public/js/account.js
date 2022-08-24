import { EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword, updateProfile } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { goToPage, updateEmailinUI } from "./ajax";
import { buildBookBox, sendEmailVerificationToUser } from "./common";
import { auth, currentPanel, db, directory, setCurrentPanel, storage } from "./globals";


$(window).on("resize", function () {
    alignMenuColumn();
});

// Set up a mutation observer to resize the menu column whenver content changes.
const observer = new MutationObserver(function (mutationList) {
    mutationList.forEach(function (mutation) {
        if (mutation.type != "attributes" || (!$(".menu-column")[0].contains(mutation.target) && mutation.target != $(".menu-column")[0])) {
            alignMenuColumn();
        }
    });
});
const observerOptions = {
    childList: true,
    attributes: true,

    // Omit (or set to false) to observe only changes to the parent node
    subtree: true
};

var heightCheck = 500;
// Use the height of the main column to stretch the height of the menu column.
function alignMenuColumn() {
    if ($(".main-column").length == 0) {
        return;
    }

    // Get the padding above and below the column.
    var paddingStr = $(".menu-column").css("padding-top");
    var padding = parseInt(paddingStr.substring(0, paddingStr.indexOf("px")));
    paddingStr = $(".menu-column").css("padding-bottom");
    padding += parseInt(paddingStr.substring(0, paddingStr.indexOf("px")));

    var mainColumnHeight = $(".main-column").height();
    var menuColumnFullHeight = $(".menu-column").height() + padding;

    // Set the height of the column. If it is smaller than the content, then it can use default heights.
    if (mainColumnHeight <= menuColumnFullHeight) {
        $(".menu-column").css("height", "");
    }
    menuColumnFullHeight = $(".menu-column").height() + padding;
    mainColumnHeight = $(".main-column").height();

    if (mainColumnHeight > menuColumnFullHeight) {
        $(".menu-column").height(mainColumnHeight - padding);
    }

    var interval = setInterval(() => {
        if ($(".menu-column").height() > heightCheck) {
            heightCheck += 10;
            alignMenuColumn();
        } else {
            clearInterval(interval);
        }
    }, 50);
}

var firstName;
var lastName;
var cardNumber;
// Load correct info for account
export function setupAccountPage(pageQuery) {
    var user = auth.currentUser;
    if (user) {
        var email = user.email;
        email = email.substring(0, email.indexOf("@")) + "\u200B" + email.substring(email.indexOf("@"), email.length);
        $("#account-page-email").text(email);
        // Get the stored first and last name from the database
        getDoc(doc(db, "users", user.uid)).then((docSnap) => {
            if (!docSnap.exists()) {
                console.error("The user document could not be found.");
                return;
            }
            firstName = docSnap.data().firstName;
            lastName = docSnap.data().lastName;
            cardNumber = docSnap.data().cardNumber.toString();
            cardNumber = cardNumber.substring(0, 1) + " " + cardNumber.substring(1, 5) + " " + cardNumber.substring(5);
            fillAccountOverviewFields(firstName, lastName, user.email, cardNumber);
            $("#account-page-name").text(firstName + " " + lastName);
        }).catch((error) => {
            console.log("Failed to get the database file for this user", error);
        });
        if (user.photoURL != null) {
            $("#account-page-image").attr("src", user.photoURL);
        } else {
            $("#account-page-image").attr("src", "/img/default-user.jpg");
        }
    } else {
        $("#settings-column").html("No user is signed in. To sign in, please click <a id='no-user-sign-in-link'>here</a>.");
        $("#no-user-sign-in-link").on("click", () => {
            goToPage("login");
        });
    }

    if (pageQuery.substring(1) != "" && directory.includes("account/" + pageQuery.substring(1))) {
        goToSettingsPanel(pageQuery.substring(1), true);
    } else {
        goToSettingsPanel("overview", true);
    }

    // Create an "Event Listener" for mutations to the settings column
    observer.observe($(".main-column")[0], observerOptions);

    // Create Event Listeners to handle PFP changes
    // All are required to handle leaving the element and coming back again
    $("#account-page-image").on("mouseover", () => {
        showAccountImageOverlay();
    });
    $("#account-image-overlay").on("mouseleave", () => {
        $("#account-image-overlay").css("opacity", "0");
        $("#account-image-overlay").delay(300).hide(0);
    });
    $("#account-image-overlay").on("mouseover", () => {
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

    // When there is a change to the input, upload the file
    $("#file-input").on("change", () => {
        processAccountImage();
    });

    $("#overview-panel-link").on("click", () => {
        goToPage('account?overview');
    });

    $("#checkouts-panel-link").on("click", () => {
        goToPage('account?checkouts');
    });

    $("#notifications-panel-link").on("click", () => {
        goToPage('account?notifications');
    });

    $("#security-panel-link").on("click", () => {
        goToPage('account?security');
    });
}

function setupAccountOverview(firstName, lastName, email, cardNumber) {
    fillAccountOverviewFields(firstName, lastName, email, cardNumber);

    $(".save-button").on("click", () => {
        updateAccount();
    });

    $("#email-verified-link").on("click", () => {
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

function fillAccountOverviewFields(firstName, lastName, email, cardNumber) {
    var user = auth.currentUser;
    if (firstName && firstName != "") {
        $("#setting-first-name").val(firstName);
    }
    if (lastName && lastName != "") {
        $("#setting-last-name").val(lastName);
    }
    if (email && email != "") {
        $("#setting-email").val(email);
    }
    if (!user.emailVerified) {
        $("#email-verified").show();
    }
    if (cardNumber && cardNumber != "") {
        $("#setting-card-number").val(cardNumber);
    }
}

function setupAccountCheckouts() {
    var checkouts = getCheckouts();
    createCheckouts(checkouts, "checkouts");
}

function setupAccountNotifications() {
    $(".save-button").on("click", () => {
        updateAccount();
    });
}

function setupAccountSecurity() {
    $("#change-password").on("click", () => {
        changePassword();
    });

    $("#delete-account-button").on("click", () => {
        deleteAccount();
    });
}

// The following two comments are there because they are in the wrong format and were causing errors
function getCheckouts() {
    return [/*{photoURL: "img/favicon.ico", title: "The Bible", author: "Jesus, I guess", due: 4}*/];
}

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

// Runs when the user clicks the Save button on the account page
function updateAccount() {
    var user = auth.currentUser;
    if (!checkForChangedFields()) {
        alert("There are no changes to save.");
    } else {
        // If the names were changed, update them.
        if (($("#setting-first-name").val() != firstName && $("#setting-first-name").val() != undefined) || ($("#setting-last-name").val() != lastName && $("#setting-last-name").val() != undefined)) {
            updateDoc(doc(db, "users", user.uid), {
                firstName: $("#setting-first-name").val(),
                lastName: $("#setting-last-name").val()
            }).then(() => {
                // Assuming there was no problem with the update, set the new values.
                firstName = $("#setting-first-name").val();
                lastName = $("#setting-last-name").val();
                alert("Your name was saved successfully.");
            }).catch((error) => {
                alert("An error has occured. Please try again later.");
                console.error(error);
            });
        }
        // If the email was changed update it.
        if ($("#setting-email").val() != user.email && $("#setting-email").val() != undefined) {
            updateEmail(user, $("#setting-email").val().toString()).then(() => {
                let email = user.email;
                if (!user.emailVerified) {
                    $("#email-verified").show();
                }
                updateEmailinUI(email);
                alert("Your email was saved successfully.");
            }).catch((error) => {
                // If the user needs to reauthenticate:
                if (error.code == "auth/requires-recent-login") {
                    alert("You must sign in again to complete this opperation.");
                    // Send them to the login page with a query
                    goToPage("login?redirect=account&email=" + $("#setting-email").val().toString());
                } else {
                    alert("An error has occured. Please try again later.");
                    console.error(error);
                }
            });
        }
    }
}

function deleteAccount() {
    // TODO: Write this function
    alert("Not implemented. If you'd like to delete your account, contact the librarian.");
}




const xhttp = new XMLHttpRequest();
export function goToSettingsPanel(newPanel) {
    return new Promise((resolve, reject) => {
        var user = auth.currentUser;

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
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                if (currentPanel != newPanel) {
                    $("#settings-column").addClass("fade");
                }

                document.getElementById("settings-column").innerHTML = xhttp.responseText;
                // Remove Placeholder Height
                document.getElementById("settings-column").style.height = "";

                if (newPanel == "overview") {
                    setupAccountOverview(firstName, lastName, user.email, cardNumber);
                } if (newPanel == "checkouts") {
                    setupAccountCheckouts();
                } if (newPanel == "notifications") {
                    setupAccountNotifications();
                } if (newPanel == "security") {
                    setupAccountSecurity();
                }

                alignMenuColumn();

                setCurrentPanel(newPanel);
                resolve();
            }
        };
    });
}

// Returns true if the user has unsaved changes, otherwise, returns false
function checkForChangedFields() {
    var answer = false;
    var user = auth.currentUser;

    if ($("#setting-first-name").val() != firstName && $("#setting-first-name").val() != undefined)
        answer = true;
    if ($("#setting-last-name").val() != lastName && $("#setting-last-name").val() != undefined)
        answer = true;
    if ($("#setting-email").val() != user.email && $("#setting-email").val() != undefined)
        answer = true;
    return answer;
}

function changePassword() {
    let currentPassword = $("#current-password").val().toString();
    let newPassword = $("#new-password").val().toString();
    if (newPassword != $("#confirm-new-password").val()) {
        alert("The new passwords do not match!");
        $("#current-password").val("");
        $("#new-password").val("");
        $("#confirm-new-password").val("");
    } else if (newPassword.length >= 4) {
        var user = auth.currentUser;
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
            var errorCode = error.code;
            var errorMessage = error.message;
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

function processAccountImage() {
    let user = auth.currentUser;
    new Promise((resolve, reject) => {
        let fileInput = $("#file-input")[0];
        const file = fileInput.files[0];
        if (file) {
            var output = document.getElementById('account-page-image');
            output.src = URL.createObjectURL(file);
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

            // Update UI with new PFP
            $("#account-page-image").attr("src", values[0]);
            $("#large-account-image").attr("src", values[1]);
            $("#small-account-image").attr("src", values[1]);

            // Update Auth object
            updateProfile(user, {
                photoURL: values[0]
            }).catch((error) => {
                console.error(error);
            });

            // Update Database
            updateDoc(doc(db, "users", user.uid), {
                pfpLink: values[0],
                pfpIconLink: values [1]
            }).then(() => {
                console.log("New PFP updated in database");
            }).catch((error) => {
                alert(error);
                console.error(error);
            });
        }).catch((error) => {
            alert(error);
            console.error(error);
        });
    });
}

function uploadAccountImage(type = "original", file) {
    return new Promise((resolve, reject) => {
        let user = auth.currentUser;
        let maxHeight;
        if (type == "original") {
            maxHeight = 400;
        } else if (type == "icon") {
            maxHeight = 200;
        } else {
            reject();
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
                let file = new File([blob], "pfp" + type, {type: "image/jpeg"});

                let userSpecificRef = ref(storage, "users");
                if (type == "original") {
                    userSpecificRef = ref(userSpecificRef, user.uid + "/pfp.jpg");
                } else if (type == "icon") {
                    userSpecificRef = ref(userSpecificRef, user.uid + "/pfp-200px.jpg");
                } else {
                    reject(false);
                    return;
                }

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
