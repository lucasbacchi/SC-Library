// TODO: Probably can reference the original directory and can get rid of this at a later date. Leaving this for now/backup.
var settingsDirectory = [
    "/overview",
    "/notifications",
    "/checkouts",
    "/security"
];

$(window).on("resize", function() {
    alignMenuColumn();
});


// Set up a mutation observer to resize the menu column whenver content changes.
const observer = new MutationObserver(function (mutationList, mutationObserver) {
    mutationList.forEach(function (mutation) {
        if (mutation.type != "attributes" || (!$('.menu-column')[0].contains(mutation.target) && mutation.target != $('.menu-column')[0])) {
            alignMenuColumn();
        }
    });
});
const observerOptions = {
    childList: true,
    attributes: true,

    // Omit (or set to false) to observe only changes to the parent node
    subtree: true
}

var heightCheck = 500;
// Use the height of the main column to stretch the height of the menu column.
function alignMenuColumn() {
    // Get the padding above and below the column.
    var paddingStr = $('.menu-column').css('padding-top');
    var padding = parseInt(paddingStr.substr(0, paddingStr.indexOf("px")));
    paddingStr = $('.menu-column').css('padding-bottom');
    padding += parseInt(paddingStr.substr(0, paddingStr.indexOf("px")));

    var mainColumnHeight = $('.main-column').height();
    var menuColumnFullHeight = $('.menu-column').height() + padding;
    
    // Set the height of the column. If it is smaller than the content, then it can use default heights.
    if (mainColumnHeight <= menuColumnFullHeight) {
        $('.menu-column').css("height", "");
    }
    menuColumnFullHeight = $('.menu-column').height() + padding;
    mainColumnHeight = $('.main-column').height();
    
    if (mainColumnHeight > menuColumnFullHeight) {
        $('.menu-column').height(mainColumnHeight - padding);
    }

    
    var interval = setInterval(() => {
        if ($('.menu-column').height() > heightCheck) {
            heightCheck += 10;
            alignMenuColumn();
        } else {
            clearInterval(interval);
        }
    }, 50);
}




var firstName;
var lastName;
// Load correct info for account
function accountPageSetup(pageQuery) {
    var user = firebase.auth().currentUser;
    if (user) {
        
        var email = user.email;
        email = email.substr(0, email.indexOf("@")) + "\u200B" + email.substr(email.indexOf("@"), email.length);
        $('#account-page-email').text(email);
        // Get the stored first and last name from the database
        db.collection("users").doc(user.uid).get().then((doc) => {
            if (!doc.exists) {
                console.error("The user document could not be found.");
                return;
            }
            firstName = doc.data().firstName;
            lastName = doc.data().lastName;
            accountOverviewSetup(doc.data().firstName, doc.data().lastName);
            $('#account-page-name').text(firstName + " " + lastName);
        });
        if (user.photoURL != null) {
            $('#account-page-image').attr('src', user.photoURL);
        }
    } else {
        $("#settings-column").html("No User is Signed in. If you are looking to sign in, please click <a onclick='javascript:goToPage(\"login\")'>here</a>");
    }

    if (query.substring(1, query.length) != "" && directory.includes('/account/' + query.substring(1, query.length))) {
        goToSettingsPanel(query.substring(1, query.length), true);
    } else {
        goToSettingsPanel('overview', true);
        accountOverviewSetup("", "", pageQuery.substr(pageQuery.indexOf("=")+1, pageQuery.length));
    }

    // Create an "Event Listener" for mutations to the settings column
    observer.observe($('.main-column')[0], observerOptions);

    // Create Event Listeners to handle PFP changes
    // All are required to handle leaving the element and coming back again
    $("#account-page-image").mouseover(function() {
        showAccountImageOverlay();
    });
    $("#account-image-overlay").mouseleave(function() {
        $("#account-image-overlay").css("opacity", "0");
        $("#account-image-overlay").delay(300).hide(0);
    });
    $("#account-image-overlay").mouseover(function() {
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
    $("#account-image-overlay").click(function(event) {
        if ($("#file-input")) {
            $("#file-input").click();
        }
    });

    // When there is a change to the input, upload the file
    $("#file-input").on("change", function() {
        if (!$("#file-input")[0].files) {
            return;
        }
        const file = $("#file-input")[0].files[0];
        var userSpecificRef = firebase.storage().ref().child("users");
        var meta;
        if (file.type == "image/jpg") {
            userSpecificRef = userSpecificRef.child(user.uid + "/pfp.jpg");
            meta = {contentType: 'image/jpeg'};
        } else if (file.type == "image/png") {
            userSpecificRef = userSpecificRef.child(user.uid + "/pfp.png");
            meta = {contentType: 'image/png'};
        } else {
            alert("That file type is not supported. Please upload a JPG or PNG file.");
            return;
        }
        userSpecificRef.put(file, meta).then((snapshot) => {
            console.log('Uploaded the file!');
            userSpecificRef.getDownloadURL().then((url) => {
                user.updateProfile({
                    photoURL: url
                  }).then(function() {
                    if (user.photoURL != null) {
                        $('#account-page-image').attr('src', user.photoURL);
                        $('#large-account-image').attr('src', user.photoURL);
                        $('#small-account-image').attr('src', user.photoURL);
                    }
                  }).catch(function(error) {
                    console.error(error);
                  });
            });
        });
    })
}

function accountOverviewSetup(firstName, lastName, email) {
    var user = firebase.auth().currentUser;
    if (firstName && firstName != "") {
        $("#setting-first-name").val(firstName);
    }
    if (lastName && lastName != "") {
        $("#setting-last-name").val(lastName);
    }
    if (email && email != "") {
        $('#setting-email').val(email);
    }
    if (!user.emailVerified) {
        $('#email-verified').show();
    }
}


// Runs when the user clicks the Save button on hte account page
function updateAccount() {
    var user = firebase.auth().currentUser;
    if (!checkForChangedFields()) {
        alert("There are no changes to save.");
    } else {
        var nameError = false;
        // If the names were changed, update them.
        if (($('#setting-first-name').val() != firstName && $('#setting-first-name').val() != undefined) || ($('#setting-last-name').val() != lastName && $('#setting-last-name').val() != undefined)) {
            db.collection("users").doc(user.uid).update({
                firstName: $('#setting-first-name').val(),
                lastName: $('#setting-last-name').val()
            }).catch((error) => {
                nameError = true;
                alert("An error has occured. Please try again later.");
                console.log(error);
            }).then(function(error) {
                if (!nameError) {
                    // Assuming there was no problem with the update, set the new values.
                    firstName = $('#setting-first-name').val();
                    lastName = $('#setting-last-name').val();
                    alert("Your name was saved successfully.");
                }
            });
        }
        var emailError = false;
        // If the email was changed update it.
        if ($('#setting-email').val() != user.email && $('#setting-email').val() != undefined) {
            user.updateEmail($('#setting-email').val()).catch((error) => {
                emailError = true;
                // If the user needs to reauthenticate:
                if (error.code == "auth/requires-recent-login") {
                    alert("You must sign in again to complete this opperation.");
                    // Send them to the login page with a query
                    goToPage("login?redirect=account&email=" + $('#setting-email').val())
                } else {
                    alert("An error has occured. Please try again later.");
                    console.log(error);
                }
            }).then(function(error) {
                if (!emailError) {
                    email = user.email;
                    if (!user.emailVerified) {
                        $('#email-verified').show();
                    }
                    updateEmail(email);
                    alert("Your email was saved successfully.");
                }
            });
        }
    }
}




var currentPanel;
{
    const xhttp = new XMLHttpRequest();
    function goToSettingsPanel(newPanel, firstTime = false, goingBack = false) {
        var user = firebase.auth().currentUser;
        // TODO: Test if this is needed. I think once I made goToPage into a promise, it probably fixed this.
        if (!user && firstTime == false) {
            alert("There is no user currently signed in.");
            return;
        }
        if (firstTime == false && checkForChangedFields()) {
            alert("You have unsaved changes. Please save any changes and try again.");
            return;
        }

        $("#settings-column").removeClass("fade");

        newPanel = "/" + newPanel;
        if (newPanel == currentPanel) {
            console.log("The user attempted to view the same account panel twice and it was prevented.");
            return;
        }

        if (settingsDirectory.includes(newPanel)){
            xhttp.open("GET", "/content/account" + newPanel + ".html" + query + hash, true);
        } else if (directory.includes("/account" + newPanel)) {
            xhttp.open("GET", "/content/account" + newPanel + query + hash, true);
        } else if (settingsDirectory.includes(newPanel.substr(0, newPanel.indexOf(".")))) {
            xhttp.open("GET", "/content/account" + newPanel + query + hash, true);
        } else {
            xhttp.open("GET", "/content/404.html", true);
        }
        xhttp.send();

        // Set the content of the page
        xhttp.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                if (currentPanel != newPanel) {
                    $('#settings-column').addClass("fade");
                }

                document.getElementById("settings-column").innerHTML = xhttp.responseText;
                // Remove Placeholder Height
                document.getElementById("settings-column").style.height = "";

                if (newPanel == "/overview") {
                    accountOverviewSetup(firstName, lastName, user.email);
                }

                alignMenuColumn();

                if (goingBack == false) {
                    window.history.pushState({}, "", "/account?" + newPanel.substring(1));
                }

                currentPanel = newPanel;
            }
        }
    }
}

// Returns true if the user has unsaved changes, otherwise, returns false
function checkForChangedFields() {
    var answer = false;
    var user = firebase.auth().currentUser;
    
    if ($('#setting-first-name').val() != firstName && $('#setting-first-name').val() != undefined)
        answer = true;
    if ($('#setting-last-name').val() != lastName && $('#setting-last-name').val() != undefined)
        answer = true;
    if ($('#setting-email').val() != user.email && $('#setting-email').val() != undefined)
        answer = true;
    return answer;
}


/**
 * Sends an email verification to the user.
 */
function sendEmailVerification() {
    var user = firebase.auth().currentUser;
    user.sendEmailVerification().then(function() {
        alert('Email Verification Sent! Please check your email!');
    });
    var count = 0;
    // After a user sends a verification email, check ever 2 seconds to see if it went through.
    // Cancel it if it goes too long.
    var interval = setInterval(() => {
        if (firebase.auth().currentUser.emailVerified) {
            $('#email-verified').hide();
            clearInterval(interval);
        }
        count++;
        if (count > 500) {
            clearInterval(interval);
        }
    }, 2000);
}




function changePassword() {
    var currentPassword = $("#current-password").val();
    var newPassword = $("#new-password").val();
    if (newPassword != $("#confirm-new-password").val()){
        alert("The new passwords do not match!");
        $("#current-password").val('');
        $("#new-password").val('');
        $("#confirm-new-password").val('');
    } else if (newPassword.length >= 4) {
        var user = firebase.auth().currentUser;
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        user.reauthenticateWithCredential(credential).then(function() {
            // User re-authenticated.
            user.updatePassword(newPassword).then(() => {
                // Update successful
                alert("Your password was succesfully changed");
                goToPage('');
            }).catch((error) => {
                console.log(error);
            });
        }).catch(function(error) {
            // An error happened.
            var errorCode = error.code;
            var errorMessage = error.message;
            if (errorCode === 'auth/wrong-password') {
                alert('The current password that you entered was incorrect.');
            } else {
                alert(errorMessage);
            }
            console.log(error);
            $("#current-password").val('');
            $("#new-password").val('');
            $("#confirm-new-password").val('');
        });
    } else {
        alert("You must enter a longer password");
        $("#current-password").val('');
        $("#new-password").val('');
        $("#confirm-new-password").val('');
    }
}


// If the user attempts to leave, let them know if they have unsaved changes
$(window).on("beforeunload", function (event) {
    if (checkForChangedFields()) {
        event.preventDefault();
        return "You have unsaved changes! Please save changes before leaving!";
    }
});

// Catch History Events such as forward and back and then go to those pages
window.onpopstate = function (event) {
    goToSettingsPanel(document.location.search.substr(document.location.search.indexOf("?") + 1, document.location.search.length), false, true);
};

console.log("account.js has Loaded!");