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
        $('#setting-first-name').val(user.displayName);
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

goToSettingsPanel('overview', true);

console.log("account.js has Loaded!");