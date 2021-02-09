var settingsDirectory = [
    "/overview",
    "/notifications",
    "/checkouts",
    "/delete"
];

$(window).on("resize", function() {
    alignMenuColumn();
});


// Set up a mutation observer to resize the menu column whenver content changes.
{
    const observer = new MutationObserver(function (mutationList, mutationObserver) {
        mutationList.forEach(function (mutation) {
            if (mutation.type != "attributes" || mutation.target != $('.menu-column')[0]) {
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
    observer.observe($('.main-column')[0], observerOptions);
}


// Use the height of the main column to stretch the height of the menu column.
function alignMenuColumn() {
    // Get the padding above and below the column.
    var paddingStr = $('.menu-column').css('padding-top');
    var padding = parseInt(paddingStr.substr(0, paddingStr.indexOf("px")));
    paddingStr = $('.menu-column').css('padding-bottom');
    padding += parseInt(paddingStr.substr(0, paddingStr.indexOf("px")));
    
    // Set the height of the column. If it is smaller than the content, then it can use default heights.
    if ($('.main-column').height() - padding > $('.menu-column').height()) {
        $('.menu-column').height($('.main-column').height() - padding);
    } else {
        $('.menu-column').css("height", "");
    }
}

alignMenuColumn();




// Load correct info for account
function accountPageSetup() {
    var user = firebase.auth().currentUser;
    if (user) {
        
        $('#account-page-name').text(user.displayName);
        $('#account-page-email').text(user.email);
        // TO DO: Update to include first name and last name when it is stored in the auth object properly
        db.collection("users").doc(user.uid).get().then((doc) => {
            if (!doc.exists) {
                console.error("The user document could not be found.");
                return;
            }
            $("#setting-first-name").val(doc.data().firstName);
            $("#setting-last-name").val(doc.data().lastName);
        });
        $('#setting-email').val(user.email);
        if (user.photoURL != null) {
            $('#account-page-image').attr('src', user.photoURL);
        }
        if (user.emailVerified) {
            $('#email-verified').show();
        }
    } else {
        $("#settings-column").html("No User is Signed in. If you are looking to sign in, please click <a onclick='javascript:goToPage(\"login\")'>here</a>");
    }

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



function updateAccount() {
    alert("To Do: add functionality...");
}




var currentPanel;
function goToSettingsPanel(newPanel, firstTime = false) {
    var user = firebase.auth().currentUser;
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
    if (settingsDirectory.includes(newPanel)){
        xhttp.open("GET", "/content/account" + newPanel + ".html" + query + hash, true);
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

            currentPanel = newPanel;
        }
    }
}

// Returns true if the user has unsaved changes, otherwise, returns false
function checkForChangedFields() {
    var answer = false;
    var user = firebase.auth().currentUser;
    // TO DO: Check to see if the user has unsaved changes on the page. (Cross Check with database? hold existing values?)

    // TO DO: Update to include first name and last name when it is stored in the auth object properly
    /*if ($('#setting-first-name').val() != user.displayName && $('#setting-first-name').val() != undefined)
        answer = true;*/
    if ($('#setting-email').val() != user.email && $('#setting-email').val() != undefined)
        answer = true;
    return answer;
}

// If the user attempts to leave, let them know if they have unsaved changes
$(window).on("beforeunload", function (event) {
    if (checkForChangedFields()) {
        event.preventDefault();
        alert("You have unsaved changes! Please save changes before leaving!");
    }
});

console.log("account.js has Loaded!");