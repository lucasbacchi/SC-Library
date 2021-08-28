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


function setupMain() {
    homeBookBoxes();
    $("#search-input").keydown(function(event) {
        if (event.keyCode === 13) {
            homePageSearch();
        }
    });
}


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
                    var date = new Date();
                    db.collection("users").doc(user.uid).update({
                        lastSignIn: date
                    }).catch((error) => {
                        console.warn("The last sign in time could not be updated, likely not a problem if the user just signed up.");
                        if (error) console.warn(error);
                    });
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
        db.collection("users").doc(user.uid).onSnapshot((doc) => {
            if (!doc.exists) {
                console.error("The user document could not be found. Ignore if the user just signed up.");
                return;
            }
            $('#account-name').text(doc.data().firstName + " " + doc.data().lastName);
            $('#account-page-name').text(doc.data().firstName + " " + doc.data().lastName);
        }, (error) => {
            console.log("The User Document is no longer listening for updates:");
            console.error(error);
        });

        var email = user.email;
        updateEmail(email);
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

function updateEmail(email) {
    email = email.substr(0, email.indexOf("@")) + "\u200B" + email.substr(email.indexOf("@"), email.length)
    $('#account-email').text(email);
    $('#account-page-email').text(email);
}



function homePageSearch() {
    var searchQuery = $('#search-input').val();

    search(searchQuery).then((searchResultsArray) => {
        goToPage('search?query=' + searchQuery, false, searchResultsArray);
    });
}

var bookDatabase;
var searchCache;
var timeLastSearched;


function search(searchQuery, start = 0, end = 20, viewHidden = false) {
    return new Promise(function(resolve, reject) {
        if (timeLastSearched == null || timeLastSearched.getTime() + 1000 * 60 * 5 < Date.now()) {
            // It hasn't searched since the page loaded, or it's been 5 mins since last page load;
            timeLastSearched = new Date();
            console.log("It's been 5 mins since last search (or it's the first one since page load).");
            db.collection("books").where("order", ">=", 0).orderBy("order", "asc").get().then((querySnapshot) => {
                bookDatabase = [];
                querySnapshot.forEach((doc) => {
                    if (!doc.exists) {
                        console.error("books document does not exist");
                        return;
                    }
                    bookDatabase.push(doc.data());
                });
                if (end == 0) {
                    resolve();
                }
                performSearch(searchQuery, start, end, viewHidden).then((output) => {
                    resolve(output);
                });
            });
        } else {
            // The bookDatabase cache is recent enough, just use that
            if (end == 0) {
                resolve();
            }
            performSearch(searchQuery, start, end, viewHidden).then((output) => {
                resolve(output);
            });
        }
    });
}


const AUTHOR_WEIGHT = 5;
const ILLUSTRATOR_WEIGHT = 1;
const KEYWORDS_WEIGHT = 10;
const PUBLISHER_WEIGHT = 1;
const SUBJECT_WEIGHT = 5;
const SUBTITLE_WEIGHT = 3;
const TITLE_WEIGHT = 8;
const BARCODE_WEIGHT = 50;
const ISBN_WEIGHT = 50;

function performSearch(searchQuery, start, end, viewHidden = false) {
    var searchQueryArray = searchQuery.replace(/-/g , " ").replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase().split(" ");

    var bookIndexNumber = 0;

    var scoresArray = [];

    return isAdminCheck().then((isAdmin) => {
        // TODO: Make it so that words that aren't exactly equal count. Like Theatre and Theatres (probably write a comparison function).
        bookDatabase.forEach((document) => {
            // Iterate through each of the 10-ish docs
            for (var i = 0; i < document.books.length; i++) {
                // Iterate through each of the 100 books in each doc
                var book = document.books[i];
                if (book.isDeleted || (book.isHidden && viewHidden == false) || (book.isHidden && (!viewHidden || !isAdmin))/* || !book.lastUpdated*/) {
                    continue;
                }
                var score = 0;
                // Authors
                for (var j = 0; j < book.authors.length; j++) {
                    var arr1 = book.authors[j].first.replace(/-/g , " ").split(" ");
                    var arr2 = book.authors[j].last.replace(/-/g , " ").split(" ");
                    var arr1Ratio = countInArray(arr1, searchQueryArray) / arr1.length;
                    score += arr1Ratio * AUTHOR_WEIGHT;
                    var arr2Ratio = countInArray(arr2, searchQueryArray) / arr2.length;
                    score += arr2Ratio * AUTHOR_WEIGHT;
                }
                // Barcode Number
                var barcodeRatio = countInArray([book.barcodeNumber.toString()], searchQueryArray, true);
                score += barcodeRatio * BARCODE_WEIGHT;
                // DDC?
                // Number of Pages?
                // Publish Date?
                // Description? (as opposed to just keywords)
                // Illustrators
                for (var j = 0; j < book.illustrators.length; j++) {
                    var arr1 = book.illustrators[j].first.replace(/-/g , " ").split(" ");
                    var arr2 = book.illustrators[j].last.replace(/-/g , " ").split(" ");
                    var arr1Ratio = countInArray(arr1, searchQueryArray) / arr1.length;
                    score += arr1Ratio * ILLUSTRATOR_WEIGHT;
                    var arr2Ratio = countInArray(arr2, searchQueryArray) / arr2.length;
                    score += arr2Ratio * ILLUSTRATOR_WEIGHT;
                }
                // ISBN 10 and ISBN 13
                var ISBNRatio = countInArray([book.isbn10.toString(), book.isbn13.toString()], searchQueryArray, true);
                score += ISBNRatio * ISBN_WEIGHT;
                // Keywords
                if (book.keywords.length != 0) {
                    var keywordsRatio = countInArray(book.keywords, searchQueryArray) / (book.keywords.length * 0.1);
                    score += keywordsRatio * KEYWORDS_WEIGHT;
                }
                // Publishers
                for (var j = 0; j < book.publishers.length; j++) {
                    var arr = book.publishers[j].replace(/-/g , " ").split(" ");
                    score += countInArray(arr, searchQueryArray) * PUBLISHER_WEIGHT;
                }
                // Subjects
                for (var k = 0; k < book.subjects.length; k++) {
                    var arr = book.subjects[k].replace(/-/g , " ").split(" ");
                    score += countInArray(arr, searchQueryArray) * SUBJECT_WEIGHT;
                }
                // Subtitle
                score += countInArray(book.subtitle.replace(/-/g , " ").split(" "), searchQueryArray) * SUBTITLE_WEIGHT;
                // Title
                score += countInArray(book.title.replace(/-/g , " ").split(" "), searchQueryArray) * TITLE_WEIGHT;
                scoresArray.push({book:book, score: score});
            }
        });
        scoresArray.sort((a, b) => {
            // Custom Sort
            return b.score - a.score;
        });
        var returnCount = 0;
        var returnArray = [];
        console.log("Scores for \"" + searchQuery + "\": ", scoresArray);
        scoresArray.forEach((item) => {
            if (item.score < 1) return;
            if (isNaN(item.score)) {
                console.error("A score for one of the books is NaN. Look into that.");
                return;
            }
            returnCount++;
            if (returnCount <= end && returnCount > start) {
                returnArray.push(item.book);
            }
        });
        searchCache = returnArray;
        return returnArray;
    });
}

function countInArray(arr, searchQueryArray, strict = false) {
    var count = 0;
    for (var i = 0; i < arr.length; i++) {
        if (strict) {
            if (searchQueryArray.includes(arr[i])) {
                count++;
            }
        } else {
            for (var j = 0; j < searchQueryArray.length; j++) {
                count += searchCompare(arr[i], searchQueryArray[j]);
            }
        }
    }
    return count;
}

function searchCompare(a, b) {
    a = a.toString();
    b = b.toString();
    var max = Math.max(a.length, b.length);
    if (max == 0) {
        return 0;
    }
    var similarity = (max - distance(a.toLowerCase(), b.toLowerCase())) / max;
    // This threshold seems pretty good, it prevents things from showing up if they share one or two letters.
    if (similarity < 0.7) {
        return 0;
    } else {
        // console.log(b + " was very similar to... " + a);
        return similarity;
    }
}

/**
 * Calculates the Damerau-Levenshtein distance between two strings.
 * author: Isaac Sukin
 * source: https://gist.github.com/IceCreamYou/8396172
 */
function distance(source, target) {
    if (!source) return target ? target.length : 0;
    else if (!target) return source.length;

    var m = source.length, n = target.length, INF = m+n, score = new Array(m+2), sd = {};
    for (var i = 0; i < m+2; i++) score[i] = new Array(n+2);
    score[0][0] = INF;
    for (var i = 0; i <= m; i++) {
        score[i+1][1] = i;
        score[i+1][0] = INF;
        sd[source[i]] = 0;
    }
    for (var j = 0; j <= n; j++) {
        score[1][j+1] = j;
        score[0][j+1] = INF;
        sd[target[j]] = 0;
    }

    for (var i = 1; i <= m; i++) {
        var DB = 0;
        for (var j = 1; j <= n; j++) {
            var i1 = sd[target[j-1]],
                j1 = DB;
            if (source[i-1] === target[j-1]) {
                score[i+1][j+1] = score[i][j];
                DB = j;
            }
            else {
                score[i+1][j+1] = Math.min(score[i][j], Math.min(score[i+1][j], score[i][j+1])) + 1;
            }
            score[i+1][j+1] = Math.min(score[i+1][j+1], score[i1] ? score[i1][j1] + (i-i1-1) + 1 + (j-j1-1) : Infinity);
        }
        sd[source[i-1]] = i;
    }
    return score[m+1][n+1];
}

function cleanUpSearchTerm(searchArray) {
    // List of words to remove from the keywords list
    var meaninglessWords = ["the", "is", "it", "an", "to", "on", "a", "in", "than", "and", "as", "they'll", "also", "for", "more", "here", "with", "without", "within", "most", "about", "almost", "any", "at", "be", "but", "by", "can", "come", "could", "do", "else", "if", "few", "get", "go", "he", "she", "they", "them", "him", "her", "his", "hers", "theirs", "there", "i", "", "into", "it", "its", "itself", "let", "lots", "me", "much", "must", "my", "oh", "yes", "no", "none", "nor", "not", "now", "of", "ok", "or", "our", "out", "own", "per", "put", "say", "see", "set", "so", "some", "soon", "still", "stay", "such", "sure", "tell", "then", "that", "these", "thing", "this", "those", "too", "try", "us", "use", "we", "what", "where", "when", "why", "how", "who", "whom", "you", "your"];
    // Itterate through each word
    for (var i = 0; i < searchArray.length; i++) {
        // Remove all punctuation and make it lowercase
        searchArray[i] = searchArray[i].replace(/-/g , " ");
        searchArray[i] = searchArray[i].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        searchArray[i] = searchArray[i].toLowerCase();
        // Remove it from the list if it's meaningless
        if (meaninglessWords.includes(searchArray[i])) {
            searchArray.splice(i, 1);
            i--;
        }
    }
    return searchArray;
}


function findURLValue(string, key, mightReturnEmpty = false) {
    var value;
    var keyNameIsNotComplete = (string.indexOf("?" + key + "=") < 0 && string.indexOf("&" + key + "=") < 0);
    if (string.indexOf(key) < 0 || keyNameIsNotComplete || key == "") {
        if (!mightReturnEmpty) {
            console.warn("The key (\"" + key + "\") could not be found in the URL.");
        }
        return "";
    }

    var position = string.indexOf(key);
    if (string.substring(position).indexOf("&") > -1) {
        value = string.substring(string.indexOf("=", position) + 1, string.indexOf("&", position));
    } else {
        value = string.substring(string.indexOf("=", position) + 1);
    }

    return decodeURI(value);
}

function setURLValue(param, value, append = true) {
    var string = window.location.href;
    // may also be able to use currentQuery for above
    var answer = "";
    // does param already exist?
    if (append && string.indexOf("?") != -1) {
        var paramAlreadyExists = (string.indexOf("?" + param + "=") >= 0 || string.indexOf("&" + param + "=") > 0);
        if (paramAlreadyExists) {
            // Edit it and return it.
            if (string.indexOf("?" + param + "=") >= 0) {
                answer = string.substring(0, string.indexOf("=") + 1);
                answer = answer + value;
                if (answer.indexOf("&") >= 0) {
                    answer += string.substring(answer.indexOf("&"), string.length);
                }
            } else if (string.indexOf("&" + param + "=") > 0) {
                answer = string.substring(0, string.indexOf("=", string.indexOf("&" + param + "=") + 1));
                answer = answer + value;
                if (string.indexOf("&", string.indexOf(param + "=")) >= 0) {
                    answer += string.substring(string.indexOf("&"), string.length);
                }
            }
        } else {
            answer = string + "&" + param + "=" + value;
        }
    } else {
        answer = "?" + param + "=" + value;
    }

    window.history.pushState({}, "", encodeURI(answer));
}

function homeBookBoxes() {
    if (bookDatabase) {
        // Don't wait for the database and save ourselves a read request
        var values = [];
        let count = 0;
        for (var i = 0; i < 9; i++) {
            var rand1 = Math.floor(Math.random() * bookDatabase.length);
            var rand2 = Math.floor(Math.random() * bookDatabase[rand1].books.length);
            var bookNumber = rand2 + rand1 * 100;
            // TODO: Prevent duplicate books (with different barcode numbers)
            if (values.indexOf(rand2) > -1 || bookDatabase[rand1].books[rand2].isDeleted || bookDatabase[rand1].books[rand2].isHidden) {
                i--;
            } else {
                values.push(bookNumber);
            }
            count++;
            if (count > 10000) {
                console.error("The book randomizer is very broken. Giving up for now.");
                return;
            }
        }
        for (var i = 0; i < 9; i++) {
            var book = bookDatabase[Math.floor(values[i] / 100)].books[values[i] % 100];
            $('div#books')[0].appendChild(buildBookBox(book, "main"));
        }
    } else {
        db.collection("books").where("order", ">=", 0).orderBy("order", "desc").limit(1).get().then((querySnapshot) => {
            querySnapshot.forEach((doc) => {
                if (!doc.exists) {
                    console.error("books document does not exist");
                    return;
                }
                var docs = doc.data().order;
                if (doc.data().books.length < 25 && doc.data().order != 0) {
                    docs--;
                }
                var rand = Math.floor(Math.random() * docs);
                rand = "0" + rand;
                if (rand.length == 2) rand = "0" + rand;
                db.collection("books").doc(rand).get().then((doc) => {
                    if (!doc.exists) {
                        console.error("books " + rand + " does not exist");
                        return;
                    }
                    var values = [];
                    let count = 0;
                    for (var i = 0; i < 9; i++) {
                        var random = Math.floor(Math.random() * doc.data().books.length);
                        // TODO: Prevent duplicate books (with different barcode numbers)
                        if (values.indexOf(random) > -1 || doc.data().books[random].isDeleted || doc.data().books[random].isHidden) {
                            i--;
                        } else {
                            values.push(random);
                        }
                        count++;
                        if (count > 10000) {
                            console.error("The book randomizer is very broken. Giving up for now.");
                            return;
                        }
                    }
                    for (var i = 0; i < 9; i++) {
                        var book = doc.data().books[values[i]];
                        $('div#books')[0].appendChild(buildBookBox(book, "main"));
                    }
                });
            });
        });
    }
}

function adminBookBoxes(objects) {
    for (var i = 0; i < objects.length; i++) {
        $('div#edit-entry-search-results')[0].appendChild(buildBookBox(objects[i], "edit-entry"));
    }
}

function buildBookBox(obj, page, num = 0) {
    const div = document.createElement('div');
    switch (page) {
        case "search":
            div.classList.add("result-listing");
            break;
        case "account":
            div.classList.add("book-layout");
        default:
            div.classList.add("book");
    }
    const div1 = document.createElement('div');
    const div2 = document.createElement('div');
    div.appendChild(div1);
    div.appendChild(div2);
    const img = document.createElement('img');
    img.classList.add('bookimage');
    img.src = obj.coverImageLink;
    div1.appendChild(img);
    const b = document.createElement('b');
    const title = document.createElement('p');
    title.classList.add('title');
    title.appendChild(document.createTextNode(obj.title));
    const author = document.createElement('p');
    author.classList.add('author');
    var authorString = "";
    for (var i = 0; i < obj.authors.length; i++) {
        if (i == 1) authorString += " & ";
        authorString += obj.authors[i].last + ", " + obj.authors[i].first;
    }
    author.appendChild(document.createTextNode(authorString));
    b.appendChild(title);
    div2.appendChild(b);
    div2.appendChild(author);
    div2.classList.add("basic-info");
    if (page == "edit-entry") {
        let string = "javascript:goToPage('admin/editEntry?new=false&id=" + obj.barcodeNumber + "');";
        div.setAttribute("onclick", string);
        const barcode = document.createElement("p");
        barcode.classList.add("barcode")
        barcode.innerHTML = "Barcode: " + obj.barcodeNumber;
        div2.appendChild(barcode);
    } else {
        div.setAttribute("onclick","javascript:goToPage('result?id=" + obj.barcodeNumber + "');");
    }
    if (page == "account") {
        var frontstr = "", boldstr = "" + num, backstr = "";
        if (num < 0) {
            boldstr = "Overdue";
        }
        else if (num == 0) {
            frontstr = "Due ";
            boldstr = "today";
        }
        else if (num > 0) {
            frontstr = "Due in ";
            backstr = " day";
        }
        if (num > 1) {
            backstr += "s";
        }
        const due = document.createElement('p');
        due.classList.add("due-date");
        due.appendChild(document.createTextNode(frontstr));
        const bold = document.createElement('b');
        bold.appendChild(document.createTextNode(boldstr));
        due.appendChild(bold);
        due.appendChild(document.createTextNode(backstr));
        div2.appendChild(due);
    }
    if (page == "search" && num > 0) {
        div.id = "result-number-" + num;
        const number = document.createElement('div');
        number.classList.add("result-number");
        number.appendChild(document.createTextNode(num + "."));
        div.appendChild(number);
        const medium = document.createElement('p');
        medium.classList.add('medium');
        medium.appendChild(document.createTextNode(obj.medium));
        div2.appendChild(medium);
        const audience = document.createElement('p');
        audience.classList.add('audience');
        audience.appendChild(document.createTextNode(buildAudienceString(obj.audience)));
        div2.appendChild(audience);
        const div3 = document.createElement('div');
        div3.classList.add("advanced-info");
        div.appendChild(div3);
        const subjects = document.createElement('p');
        subjects.classList.add('subjects');
        subjects.appendChild(document.createTextNode("Subjects: " + listSubjects(obj.subjects)));
        div3.appendChild(subjects);
        const description = document.createElement('p');
        description.classList.add('description');
        description.appendChild(document.createTextNode(shortenDescription(obj.description)));
        div3.appendChild(description);
    }
    return div;
}

function buildAudienceString(audience) {
    var str = "", values = ["Children", "Youth", "Adult"];
    for (var i = 0; i < 3; i++) {
        if (audience[i]) {
            if (str != "") {
                str += ", ";
            }
            str += values[i];
        }
    }
    return str;
}

function getBookFromBarcode(barcodeNumber) {
    return new Promise(function (resolve, reject) {
        if (!bookDatabase) {
            search("", 0, 0).then(() => {
                var documentNumber = Math.floor(barcodeNumber / 100) % 1000;
                var bookNumber = barcodeNumber % 100;
                resolve(bookDatabase[documentNumber].books[bookNumber]);
            })
        } else {
            var documentNumber = Math.floor(barcodeNumber / 100) % 1000;
            var bookNumber = barcodeNumber % 100;
            resolve (bookDatabase[documentNumber].books[bookNumber]);
        }
    });
}

function checkout() {
    alert("TODO: Add functionality");
}

function listSubjects(subj) {
    var str = "";
    for (var i = 0; i < subj.length; i++) {
        str += subj[i] + "; ";
    }
    return str.substring(0, str.length - 2);
}

function shortenDescription(desc) {
    var cutoff = desc.indexOf(". ", 300);
    desc.replace(/\n/g , "<br>");
    if (desc.length <= cutoff || cutoff == -1) return desc;
    else return desc.substring(0, cutoff) + ". ...";
}

console.log("main.js Loaded!");
