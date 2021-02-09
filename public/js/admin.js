{

    let booksPath = db.collection("books");
    let indexBooksPath = db.collection("index_books");
    let usersPath = db.collection("users");


    function addEntry() {
        // Run a Transaction to ensure that the correct barcode is used. (Atomic Transation)
        db.runTransaction((transaction) => {
            var cloudVarsPath = db.collection("config").doc("cloud_vars");
            // Get the variable stored in the cloud_vars area
            return transaction.get(cloudVarsPath).then((doc) => {
                if (!doc.exists) {
                    throw "Document does not exist!";
                }
                // Save the max value and incriment it by one.
                var newBarcode = doc.data().maxBarcode + 1;
                // Set the document to exist in the BOOKS path
                transaction.set(booksPath.doc(newBarcode.toString()), {
                    barcode: newBarcode
                });
                // Set the document to exist in the INDEX_BOOKS path
                transaction.set(indexBooksPath.doc(newBarcode.toString()), {
                    barcode: newBarcode
                })
                // Update the cloud var to contain the next barcode value
                transaction.update(cloudVarsPath, {
                    maxBarcode: newBarcode
                })
                return newBarcode;
            });
        }).then((newBarcode) => {
            // After both writes complete, send the user to the edit page and take it from there.
            console.log("New Entry Created with barcode: ", newBarcode);
            goToPage('admin/editEntry').then(function () {
                $('#barcode').html("Barcode: " + newBarcode);
            });
        }).catch((err) => {
            console.error(err);
        });

    }

}
