var db = firebase.firestore();

// Manage Menu Button event listener
$('#hamburger-button').click(function() {
    openNavMenu();

});

function openNavMenu() {
    $('nav').css("transition", "0.5s");
    $('nav').width('60%');
    $('nav > li > a').show();
    $('nav > li > a').css('opacity', '1');
    $('#close-button').css('display', 'block');
    $('#close-button').css('opacity', '1');
}

// Manage Menu Close Button event listener
$('#close-button').click(function() {
    closeNavMenu();
});

function closeNavMenu() {
    $('nav').css("transition", "0.5s");
    $('nav').width('0');
    $('#close-button').delay(400).hide(0);
    $('nav > li > a').css('opacity', '0');
    $('#close-button').css('opacity', '0');
    $('nav > li > a').delay(400).hide(0);
}

// Manage Nav Links when screen gets small
$(window).resize(function () {
    /*console.log($(window).width());*/
    if ($(window).width() > 570) {
        $('nav').css("transition", "");
        $('nav').width('fit-content');
        $('nav > li > a').show();
        $('nav > li > a').css('opacity', '1');
        $('#close-button').hide();
    }
    if ($(window).width() <= 570 && $('#close-button').css('display') == 'none') {
        $('nav').width('');
        $('nav').css("transition", "0.5s");
        $('nav > li > a').hide();
        $('nav > li > a').css('opacity', '0');

    }
});

/* WHAT WAS THIS CODE FOR???
if ($(window).width() > 500) {
    $('nav').width('fit-content');
    $('nav > li > a').show();
    $('nav > li > a').css('opacity', '1');
    $('#close-button').hide();

}
if ($(window).width() <= 500 && $('#close-button').css('display') == 'none') {
    $('nav').width('0');
    $('nav > li > a').hide();
    $('nav > li > a').css('opacity', '0');

}*/


// Manage Account Panel and animation
{
    let largeAccountOpen = false;
    $('#small-account-container').click(function() {
        if($('#large-account-container').css('display') == 'none') {
            setTimeout(function() {largeAccountOpen = true;}, 20);
            $('#large-account-container').show(0).delay(10);
            $('#large-account-container').css('right', '0%');
        } else {
            closeLargeAccount();
        }

    });


    function closeLargeAccount() {
        largeAccountOpen = false;
        $('#large-account-container').delay(400).hide(0);
        $('#large-account-container').css('right', '-500%');
    }


    $(window).click(function(event) {
        // Added to fix dupe input bug
        event.stopPropagation();
        // might need to remove...
        if (!($.contains($('#large-account-container')[0], event.target) || event.target == $('#large-account-container')[0])) {
            if (largeAccountOpen) {
                closeLargeAccount();
            }
        }

    });
}

$(window).on("scroll", function() {
    if ($(document).scrollTop() > 0) {
        $("header").css("box-shadow", "0px -7px 16px 5px var(--teal)");
    } else {
        $("header").css("box-shadow", "");
    }
});





/* AUTHENTICATION START */


function signOut() {
    if (firebase.auth().currentUser) {
        firebase.auth().signOut();
        /* could change 'replace' to 'href' if we wanted to keep the page in the history */
        window.location.replace('/');
    } else {
        alert("No user is currently signed in.");
    }
}

/**
 * initApp handles setting up UI event listeners and registering Firebase auth listeners:
 *  - firebase.auth().onAuthStateChanged: This listener is called when the user is signed in or
 *    out, and that is where we update the UI.
 */
function initApp() {
    // Listening for auth state changes.
    return new Promise(function(resolve, reject) {
        try {
            firebase.auth().onAuthStateChanged(function(user) {
                if (user) {
                    // User is signed in.
                    console.log('User is now Signed In.');
                } else {
                    // User is signed out.
                    console.log('User is now Signed Out.');
                }
                updateUserAccountInfo();
                resolve();
            })
        } catch(err) {
            reject(err);
        }
    });
}



function updateUserAccountInfo() {
    var user = firebase.auth().currentUser;
    if (user) {
        // User is signed in.
        db.collection("users").doc(user.uid).get().then((doc) => {
            if (!doc.exists) {
                console.error("The user document could not be found.");
                return;
            }
            $('#account-name').text(doc.data().firstName + " " + doc.data().lastName);
        });

        var email = user.email;
        email = email.substr(0, email.indexOf("@")) + "\u200B" + email.substr(email.indexOf("@"), email.length)
        $('#account-email').text(email);
        var emailVerified = user.emailVerified;
        var photoURL = user.photoURL;
        if (photoURL != null) {
            $('#small-account-image').attr('src', photoURL);
            $('#large-account-image').attr('src', photoURL);
        }
        var isAnonymous = user.isAnonymous;
        var uid = user.uid; // Not to be used for authentication (User.getToken();)
        var providerData = user.providerData; // Should not have any with email signup
        if (!emailVerified) {
            // User's email is not verified
        }

        // Change Account Container Appearence
        $('#nav-login-signup').hide();
        $('#small-account-container').show();
        $('#large-account-image').show();
        $('#large-account-image').show();
        $('#account-email').show();
        $('#account-settings').show();
        $('#log-out').html('<a>Log Out</a>').css('width', '50%').attr('onclick', 'javascript:signOut();');
    } else {
        // User is signed out.

        // Change Account Container Appearence
        $('#nav-login-signup').show();
        $('#small-account-container').hide();
        $('#large-account-image').hide();
        $('#account-email').hide();
        $('#account-name').html('No user signed in');
        $('#account-settings').hide();
        $('#log-out').html('<a href="login.html">Log In</a>').css('width', '100%').attr('onclick', '');
    }

}


console.log("main.js Loaded!");
