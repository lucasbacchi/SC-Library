function setupSignIn() {
    $("#submit, .login > input").keydown(function(event) {
        if (event.keyCode === 13) {
            if (currentPage == '/login'){
                signIn();
            } else if (currentPage == '/signup') {
                handleSignUp();
            }
        }
    });
}

function signIn() {
    if (firebase.auth().currentUser) {
        alert("Another user is currently signed in. Please sign out first.");
    } else {
        var email = document.getElementById('email').value;
        var password = document.getElementById('password').value;
        if (email.length < 4) {
            alert('Please enter an email address.');
            return;
        }
        if (password.length < 4) {
            alert('Please enter a password.');
            return;
        }
        var signInError = false;
        // Sign in with email and pass.
        firebase.auth().signInWithEmailAndPassword(email, password).catch(function(error) {
            // Handle Errors here.
            signInError = true;
            var errorCode = error.code;
            var errorMessage = error.message;
            if (errorCode === 'auth/wrong-password') {
                alert('Wrong password.');
            } else {
                alert(errorMessage);
            }
            console.log(error);
            $('#email').val('');
            $('#password').val('');
        }).then(function() {
            // TO DO: Track user's last page and send them back to that page
            if (!signInError) {
                goToPage("");
            }
        });        
    }
}


/**
 * Handles the sign up button press.
 */
function handleSignUp() {
    // var name = document.getElementById('name').value;
    var email = document.getElementById('email').value;
    var password = document.getElementById('password').value;
    if (email.length < 4) {
        alert('Please enter an email address.');
        return;
    }
    if (password.length < 4) {
        alert('Please enter a longer password.');
        return;
    }
    /*if (name.length < 1) {
        alert('Please enter a name.');
        return;
    }*/
    var signUpError = false;
    // Create user with email and pass, then logs them in.
    firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
        // Handle Errors here.
        signUpError = true;
        var errorCode = error.code;
        var errorMessage = error.message;
        if (errorCode == 'auth/weak-password') {
            alert('The password is too weak.');
        } else {
            alert(errorMessage);
        }
        console.log(error);
    }).then(function() {
        // TO DO: set it up so that the user is redirected to their page
        if (!signUpError) {
            goToPage("");
            sendEmailVerification();
        }
    });
}

/**
 * Sends an email verification to the user.
 */
function sendEmailVerification() {
    firebase.auth().currentUser.sendEmailVerification().then(function() {
        alert('Email Verification Sent! Please check your email!');
    });
}

function sendPasswordReset() {
    var email = document.getElementById('email').value;
    if (email.indexOf('@') == -1 || email.lastIndexOf('.') < email.indexOf('@')){
        alert("Please enter a valid email into the Email box above. Then try again.");
        return;
    }
    firebase.auth().sendPasswordResetEmail(email).then(function() {
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
        console.log(error);
    });
}

console.log("signIn.js Loaded!");