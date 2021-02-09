function editEntry() {
    // Gets the values of all the input elements
    var barcodeValue = $("#barcode").html().substr(9, $("#barcode").html().length);
    var titleValue = $("#book-title").val();
    var authorValue = $("#book-author").val();
    var subjectValue = $("#book-subject").val();
    var descriptionValue = $("#book-description").val();
    var isbnValue = $("#book-isbn").val();

    // Defines the paths of the the two database collections
    var indexBooksPath = db.collection("index_books");
    var booksPath = db.collection("books");

    var batch = db.batch();

    // Can change how this is done later if we like...
    // Get tge first (about) 100 characters for the brief description
    var shortDescriptionValue;
    if (descriptionValue.length < 100) {
        shortDescriptionValue = descriptionValue;
    } else {
        shortDescriptionValue = descriptionValue.substr(0, descriptionValue.indexOf(" ", 100)) + "...";
    }
    // Create a list of keywords from the description
    var keywordsValue = descriptionValue.split(" ");
    // List of words to remove from the keywords list
    var meaninglessWords = ["the", "is", "it"];
    // Itterate through each word
    for (var i = 0; i < keywordsValue.length; i++) {
        // Remove all punctuation and make it lowercase
        keywordsValue[i] = keywordsValue[i].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
        keywordsValue[i] = keywordsValue[i].toLowerCase();
        console.log("This should have no punctuation: " + keywordsValue[i]);
        // Remove it from the list if it's meaningless
        if (meaninglessWords.includes(keywordsValue[i])) {
            keywordsValue.splice(i, 1);
            i--;
        }
    }

    // Updates the book with the information
    batch.update(booksPath.doc(barcodeValue), {
        title: titleValue,
        author: authorValue,
        subject: subjectValue,
        description: descriptionValue,
        isbn: isbnValue
    });

    // Update the books index with the information.
    batch.update(indexBooksPath.doc(barcodeValue), {
        title: titleValue,
        author: authorValue,
        subject: subjectValue,
        short_description: shortDescriptionValue,
        isbn: isbnValue,
        keywords: keywordsValue
    });

    batch.commit().then(() => {
        alert("Edits were made successfully");
        goToPage('admin/main');
    }).catch((error) => {
        alert(error);
    });
}
