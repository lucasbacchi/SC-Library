
$(document).ready(function(){
    if ($(document).width() <= 500) {
        $('#hamburger-button').click(function() {
            $('nav').width('60%');
            $('nav > li > a').show();
            $('nav > li > a').css('opacity', '1');
            $('#close-button').css('display', 'block');
            $('#close-button').css('opacity', '1');

        });

        $('#close-button').click(function() {
            $('nav').width('0');
            $('#close-button').delay(400).hide(0);
            $('nav > li > a').css('opacity', '0');
            $('#close-button').css('opacity', '0');
            $('nav > li > a').delay(400).hide(0);
        })
    }
});


$(window).resize(function () {
    /*console.log($(window).width());*/
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

    }
});

function setResize() {
    /*console.log($(window).width());*/
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

    }
}

var largeAccountOpen = false;
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
    $('#large-account-container').delay(1000).hide(0);
    $('#large-account-container').css('right', '-500%');
}


$(window).click(function(event) {
    if (!($.contains($('#large-account-container')[0], /*$(*/event.target/*).parents()*/) || event.target == $('#large-account-container')[0])) {
        if (largeAccountOpen) {
            closeLargeAccount();
        }
    }

});





/* AUTHENTICATION START */
function signOut() {
    if (firebase.auth().currentUser) {
        firebase.auth().signOut();
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
    // Listening for auth state changes.]
    console.log("Firebase Authentication is Initalizing.");
    return new Promise(function(resolve, reject) {
        try {
            firebase.auth().onAuthStateChanged(function(user) {
                console.log("User Authentication state has changed.")
                if (user) {
                    // User is signed in.
                    var displayName = user.displayName;
                    $('#account-name').text(displayName);
                    var email = user.email;
                    $('#account-email').text(email);
                    var emailVerified = user.emailVerified;
                    var photoURL = user.photoURL;
                    if (photoURL != null) {
                        $('#small-account-image, #small-account-image').attr('src', photoURL);
                    }
                    var isAnonymous = user.isAnonymous;
                    var uid = user.uid;
                    var providerData = user.providerData;
                    if (!emailVerified) {
                        // User's email is not verified
                    }
                    $('#large-account-image').show();
                    $('#account-email').show();
                    $('#account-settings').show();
                    $('#log-out').html('<a>Log Out</a>').css('width', '50%').attr('onclick', 'javascript:signOut();');
                } else {
                    // User is signed out.
                    $('#large-account-image').hide();
                    $('#account-email').hide();
                    $('#account-name').html('No user signed in');
                    $('#account-settings').hide();
                    $('#log-out').html('<a href="../../../login.html">Log In</a>').css('width', '100%').attr('onclick', '');
                }
                resolve();
            })
        } catch(err) {
            reject(err);
        }
    });
}

window.onload = function() {
    initApp()
    .then(function() {
        var currentUser = firebase.auth().currentUser;
        if (currentUser != null) {
            // User is signed in.
            console.log("Page Loaded with a User Signed In.");
            if (!currentUser.emailVerified) {
                // User's email is not verified
            }
        } else {
            // User is signed out.
            console.log("Page Loaded without a user signed in.")
        }
    }, function(error) {
        console.log(error);
    })
    
};





setResize();


console.log("main.js Loaded!");
