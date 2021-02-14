function setupSignIn(pageQuery) {
    $("#submit, .login > input").keydown(function(event) {
        if (event.keyCode === 13) {
            signInSubmit(pageQuery);
        }
    });
    $("button#submit").attr("onclick", "javascript:signInSubmit(\"" + pageQuery + "\");")
}

function authRedirect(pageQuery) {
    /* This is probably the proper way to do it
     * Since these are hardcoded, I'm not going to bother
    for (var i = 0; i < pageQuery.split("&").length-1; i++) {
        var key = pageQuery.indexOf("?")
    }*/

    // Find the redirect path in the query
    var redirect = pageQuery.substring(pageQuery.indexOf("=") + 1, pageQuery.indexOf("&"));

    // If they are being redirected with an email (to the account page)
    if (pageQuery.indexOf("email") != -1) {
        var newEmail = pageQuery.substring(pageQuery.indexOf("=", pageQuery.indexOf("&")) + 1);

        var emailError = false;
        var user = firebase.auth().currentUser;
        // Attempt to udpate the account
        user.updateEmail(newEmail).catch((error) => {
            emailError = true;
            alert("There was an error updating your email. Please try again later.");
            console.log(error);
        }).then(function(error) {
            if (!emailError) {
                alert("Your email was saved successfully.");
            }
            goToPage(redirect + "?email=" + newEmail);
        });
    } else {
        // If they do not have an email in the query
        // TO DO: Add additional redirects as needed
        goToPage(redirect);
    }
}

function signInSubmit(pageQuery) {
    if (currentPage == '/login') {
        var reAuth;
        if (pageQuery.length > 1) {
            reAuth = true;
        } else {
            reAuth = false;
        }
        signIn(reAuth).then(function() {
            authRedirect(pageQuery);
        });
    } else if (currentPage == '/signup') {
        handleSignUp().then(function() {
            authRedirect(pageQuery);
        });
    }
}

function signIn(reAuth = false) {
    return new Promise(function(resolve, reject) {
        var user = firebase.auth().currentUser
        if (user && !reAuth) {
            alert("Another user is currently signed in. Please sign out first.");
        } else {
            var email = document.getElementById('email').value;
            var password = document.getElementById('password').value;
            if (email.length < 4) {
                alert('Please enter an email address.');
                reject();
            }
            if (password.length < 4) {
                alert('Please enter a password.');
                reject();
            }
            var signInError = false;
            if (!reAuth) {
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
                    resolve();
                });
            } else {
                // Reauthenticate
                const credential = firebase.auth.EmailAuthProvider.credential(email, password);
                user.reauthenticateWithCredential(credential).then(function() {
                    // User re-authenticated.
                    resolve();
                }).catch(function(error) {
                    // An error happened.
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
                });
            }
        }
    });
}


/**
 * Handles the sign up button press.
 */
function handleSignUp() {
    return new Promise(function (resolve, reject) {
        var firstName = document.getElementById('firstName').value;
        var lastName = document.getElementById('lastName').value;
        var email = document.getElementById('email').value;
        var password = document.getElementById('password').value;
        if (email.length < 4) {
            alert('Please enter an email address.');
            reject();
        }
        if (password.length < 4) {
            alert('Please enter a longer password.');
            reject();
        }
        if (firstName.length < 1) {
            alert('Please enter a first name.');
            reject();
        }
        if (lastName.length < 1) {
            alert('Please enter a last name.');
            reject();
        }
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
            reject();
        }).then(function() {
            if (!signUpError) {
                var user = firebase.auth().currentUser;
                var usersPath = db.collection("users");
                var pfpRef = firebase.storage().ref().child("/public/default-user.jpg");
                var pfpLink = pfpRef.getDownloadURL();
                user.photoURL = pfpLink;
                usersPath.doc(user.uid).set({
                    firstName: firstName,
                    lastName: lastName
                }).then(function() {
                    sendEmailVerification();
                    resolve();
                });
            }
        });
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