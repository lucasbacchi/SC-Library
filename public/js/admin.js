import { arrayUnion, collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, where, writeBatch } from "firebase/firestore";
import { goToPage } from "./ajax";
import { search, buildBookBox, findURLValue, verifyISBN, openModal, updateBookDatabase, formatDate,
    windowScroll, ignoreScroll, setIgnoreScroll, Throttle, createOnClick, buildCheckoutBox, softBack, getBookFromBarcode, sendEmail, getUserFromBarcode, getUser } from "./common";
import { Book, bookDatabase, Checkout, CheckoutGroup, db, historyManager, setBookDatabase, setCurrentHash, setTimeLastSearched, User } from "./globals";

/**
 * @description Sets up the main page for the admin including all the event listeners.
 */
export function setupAdminMain() {
    // Create an event listener for the search bar
    $("#edit-entry-input").on("keyup", (event) => {
        if (event.key === "Enter") {
            adminSearch();
            $("#edit-entry-input").trigger("blur");
        }
    });

    // Create an event listener for the add entry input
    $("#add-entry-isbn").on("keydown", (event) => {
        if (event.key === "Enter") {
            addEntry();
            $("#add-entry-isbn").trigger("blur");
        }
    });

    // Create other event listeners for all the buttons/links
    createOnClick($("#add-entry-button"), addEntry);
    createOnClick($("#add-entry-without-isbn"), addEntryWithoutISBN);
    createOnClick($("#edit-entry-search"), adminSearch);
    createOnClick($("#view-missing-barcodes"), viewMissingBarcodes);
    createOnClick($("#import-link"), () => $("#import-input").trigger("click"));
    createOnClick($("#export-link"), () => $(".hidden").toggle());
    createOnClick($("#export-books"), downloadDatabase);

    // Create an event listener for the import input
    $("#import-input").on("change", (event) => {
        processImport(event);
    });

    // Run the functions to fill in dynamic data
    recentlyCheckedOut();
    addStats();
}

/**
 * @description Sets up the page for editing a user.
 */
export function setupEditUser() {
    console.error("TODO: Write this function");
}

/**
 * @description Sets up the page for editing a checkout.
 */
export function setupEditCheckout(pageQuery) {
    let timestamp = new Date(parseInt(findURLValue(pageQuery, "timestamp")));
    if (!timestamp) {
        openModal("issue", "No timestamp was specified in the URL.");
        softBack("admin/main");
        return;
    }

    let group = (findURLValue(pageQuery, "group") == "true");
    if (!group) {
        let barcodeNumber = findURLValue(pageQuery, "barcodeNumber");
        if (!barcodeNumber) {
            openModal("issue", "No barcode was specified in the URL.");
            softBack("admin/main");
            return;
        }

        getCheckoutInfo(timestamp, false, barcodeNumber).then((checkout) => {
            if (!checkout) {
                openModal("issue", "The checkout you are looking for does not exist.");
                softBack("admin/main");
                return;
            }
            loadSingleCheckout(checkout);

            // Individual Actions
            createOnClick($("#edit-checkout-renew"), checkoutAction, [checkout], "renew");
            createOnClick($("#edit-checkout-send-email"), checkoutAction, [checkout], "send-email");
            createOnClick($("#edit-checkout-check-in"), checkoutAction, [checkout], "check-in");
            createOnClick($("#edit-checkout-delete"), checkoutAction, [checkout], "delete");

            // Disable buttons if the checkout is complete
            if (checkout.complete) {
                $("#edit-checkout-renew").prop("disabled", true);
                $("#edit-checkout-send-email").prop("disabled", true);
                $("#edit-checkout-check-in").prop("disabled", true);
            }
        });
        $(".checkout-groups-only").hide();
    } else {
        getCheckoutInfo(timestamp).then((checkoutGroup) => {
            if (!checkoutGroup || !checkoutGroup.checkouts) {
                openModal("issue", "The checkout group you are looking for does not exist.");
                softBack("admin/main");
                return;
            }
            loadCheckoutGroup(checkoutGroup);

            // Group Actions
            createOnClick($("#edit-checkout-group-renew"), checkoutAction, checkoutGroup.checkouts, "renew");
            createOnClick($("#edit-checkout-group-send-email"), checkoutAction, checkoutGroup.checkouts, "send-email");
            createOnClick($("#edit-checkout-group-check-in"), checkoutAction, checkoutGroup.checkouts, "check-in");
            createOnClick($("#edit-checkout-group-delete"), checkoutAction, checkoutGroup.checkouts, "delete");

            // Disable buttons if the checkout group is complete
            if (checkoutGroup.complete) {
                $("#edit-checkout-group-renew").prop("disabled", true);
                $("#edit-checkout-group-send-email").prop("disabled", true);
                $("#edit-checkout-group-check-in").prop("disabled", true);
            }
        });
        $(".individual-checkouts-only").hide();
    }

    // Save and Cancel Buttons
    createOnClick($("#edit-checkout-save"), saveCheckout);
    createOnClick($("#edit-checkout-cancel"), cancelAdminForm);
}

/**
 * @description Used to get a checkout or a checkoutGroup from the database.
 * @param {Date} timestamp The timestamp of the checkout that we use to identify it.
 * @param {Boolean} group Whether or not to return a checkout group or a single checkout. Defaults to true.
 * @param {String} barcodeNumber The barcode number of the book in the checkout to determine which checkout to load. Only used if group is false.
 * @param {Boolean} getDocRef Whether or not to return the document reference instead of the checkout object. Defaults to false.
 * @returns {Promise<CheckoutGroup|Checkout|DocumentReference|Array<DocumentReference>} A Promise containing the checkout, checkout group, document reference, or array of document references.
 */
function getCheckoutInfo(timestamp, group = true, barcodeNumber = null, getDocRef = false) {
    if (!timestamp) {
        openModal("issue", "No timestamp was specified for the checkout lookup.");
        return;
    }
    if (!group && !barcodeNumber) {
        openModal("issue", "No barcode was specified for the checkout lookup.");
        return;
    }
    // Account for the fact that the timestamp is only accurate to the second (but firebase keeps track of nanoseconds)
    let start = new Date(timestamp.valueOf() - 1000);
    let end = new Date(timestamp.valueOf() + 1000);
    return getDocs(query(collection(db, "checkouts"), where("timestamp", ">=", start), where("timestamp", "<=", end))).then((querySnapshot) => {
        let answer = null;
        let checkouts = [];
        let refs = [];
        querySnapshot.forEach((docSnap) => {
            if (!docSnap.exists()) {
                console.error("checkout document does not exist");
                return;
            }

            let checkout = Checkout.createFromObject(docSnap.data());
            // If we just need a single doc ref, return it
            if (getDocRef && !group) {
                if (checkout.barcodeNumber == barcodeNumber) {
                    answer = docSnap.ref;
                }
            }
            refs.push(docSnap.ref);
            checkouts.push(checkout);
        });

        // If we just need an array of doc refs, return it
        if (getDocRef && group) {
            answer = refs;
        }
        if (answer) {
            return answer;
        }

        let checkoutGroup = new CheckoutGroup(checkouts);

        if (group) {
            return checkoutGroup;
        } else {
            let checkout;
            checkouts.forEach((temp) => {
                if (temp.barcodeNumber == barcodeNumber) {
                    checkout = temp;
                }
            });
            return checkout;
        }
    });
}

/**
 * @description Loads in the data for a single checkout on to the page.
 * @param {Checkout} checkout The checkout object that we are loading.
 */
function loadSingleCheckout(checkout) {
    // Fill out info at the top of the page
    $("#timestamp").html(formatDate(checkout.timestamp));
    $("#cardNumber").html(checkout.cardNumber);
    $("#grouping").html("No <a href=\"/admin/editCheckout?timestamp=" + checkout.timestamp.valueOf() + "&group=true\">(Click here to view the group)</a>");
    $("#complete").html((checkout.complete ? "True" : "False"));

    getBookFromBarcode(checkout.barcodeNumber).then((book) => {
        // Fill in the book image
        if (book.thumbnailImageLink) {
            $("#book-cover-image").attr("src", book.thumbnailImageLink);
        } else {
            $("#book-cover-image").attr("src", book.coverImageLink);
        }

        // Fill in the book info in the editable inputs
        $("#barcode-number-input").val(book.barcodeNumber);
        let month = checkout.dueDate.getMonth() + 1;
        let day = checkout.dueDate.getDate();
        let year = checkout.dueDate.getFullYear();
        $("#checkout-due-date-month").val(month.toString());
        $("#checkout-due-date-day").val(day.toString());
        $("#checkout-due-date-year").val(year.toString());
        $("#checkout-user-returned").val((checkout.userReturned ? "true" : "false"));
        let flags = checkout.flags;
        if (flags.includes("lost")) {
            $("#checkout-flags-lost").prop("checked", true);
        }
        if (flags.includes("damaged")) {
            $("#checkout-flags-damaged").prop("checked", true);
        }
        if (flags.includes("other")) {
            $("#checkout-flags-other").prop("checked", true);
        }


        // Fill in the checkout info at the bottom of the page
        $("#librarianCheckedIn").html((checkout.librarianCheckedIn ? "True" : "False"));
        $("#librarianCheckedInBy").html((checkout.librarianCheckedInBy ? checkout.librarianCheckedInBy : "N/A"));
        $("#librarianCheckedInDate").html((checkout.librarianCheckedInDate ? formatDate(checkout.librarianCheckedInDate) : "N/A"));
        $("#renewals").html(checkout.renewals);
        $("#userReturned").html((checkout.userReturned ? "True" : "False"));
        $("#userReturnedDate").html((checkout.userReturnedDate ? formatDate(checkout.userReturnedDate) : "N/A"));
        $("#reminderEmailSentDate").html((checkout.reminderEmailSentDate ? formatDate(checkout.reminderEmailSentDate) : "N/A"));
        $("#overdueEmailSentDate").html((checkout.overdueEmailSentDate ? formatDate(checkout.overdueEmailSentDate) : "N/A"));
        $("#overdueEmailSentCount").html(checkout.overdueEmailSentCount);
        let lastUpdated = checkout.lastUpdated;
        $("#last-updated").html("This entry was last updated on " + lastUpdated.toLocaleDateString('en-US') + " at " + lastUpdated.toLocaleTimeString('en-US'));
    });
}

/**
 * @description Loads in the data for checkoutGroup on to the page.
 * @param {CheckoutGroup} checkoutGroup The checkoutGroup object that we are loading.
 */
function loadCheckoutGroup(checkoutGroup) {
    // Empty the checkout objects container
    $("#checkout-objects-container").empty();

    // Fill in the checkout objects container
    checkoutGroup.checkouts.forEach((checkout) => {
        $("#checkout-objects-container").append(buildCheckoutBox(checkout, false));
    });

    $("#timestamp").html(formatDate(checkoutGroup.timestamp));
    $("#cardNumber").html(checkoutGroup.cardNumber);
    $("#complete").html((checkoutGroup.complete ? "True" : "False"));
    $("#grouping").html("Yes (" + checkoutGroup.checkouts.length + ")");
}

/**
 * @description Called when the user clicks the cancel button on the edit checkout page.
 */
function cancelAdminForm() {
    $(window).off("beforeunload");
    softBack("admin/main");
}

/**
 * @description Called when the user clicks the save button on the edit checkout page. Only used for individual checkouts.
 */
function saveCheckout() {
    // Get info from the URL
    let timestampFromURL = new Date(parseInt(findURLValue(window.location.search, "timestamp")));
    if (!timestampFromURL) {
        openModal("issue", "No timestamp was specified in the URL.");
        return;
    }
    let barcodeNumberFromURL = findURLValue(window.location.search, "barcodeNumber");
    if (!barcodeNumberFromURL) {
        openModal("issue", "No barcode was specified in the URL.");
        return;
    }

    // Collect the potentially changed data from the page
    let barcodeNumber = $("#barcode-number-input").val();
    let dueDate = new Date($("#checkout-due-date-year").val(), $("#checkout-due-date-month").val() - 1, $("#checkout-due-date-day").val());
    dueDate.setHours(23, 59, 59); // Set the time to 11:59:59 PM
    let userReturned = ($("#checkout-user-returned").val() == "true");
    let flags = [];
    if ($("#checkout-flags-lost").prop("checked")) {
        flags.push("lost");
    }
    if ($("#checkout-flags-damaged").prop("checked")) {
        flags.push("damaged");
    }
    if ($("#checkout-flags-other").prop("checked")) {
        flags.push("other");
    }
    let notes = $("#checkout-notes").val();

    // Get the current state of the checkout in the database
    getCheckoutInfo(timestampFromURL, false, barcodeNumberFromURL).then((checkout) => {
        if (!checkout) {
            openModal("issue", "The checkout you are looking for could not be found in the database. Aborting!");
            cancelAdminForm();
            return;
        }

        // Create a copy of the checkout before setting the changes.
        let newCheckout = Checkout.createFromObject(checkout.toObject());
        newCheckout.barcodeNumber = barcodeNumber;
        newCheckout.dueDate = dueDate;
        newCheckout.userReturned = userReturned;
        newCheckout.flags = flags;
        newCheckout.notes = notes;
        newCheckout.lastUpdated = new Date();

        if (!validateCheckoutChanges(checkout, newCheckout)) {
            return;
        }

        let promises = [];

        // Handle barcode number changes with warning.
        if (barcodeNumber != checkout.barcodeNumber) {
            promises.push(new Promise((resolve, reject) => {
                openModal("warning", "You are changing the barcode number of this checkout. This will cause the checkout to be moved to a different book. Are you sure you want to do this?",
                "Are you sure?", "Yes", () => {
                    // The user clicked "yes"
                    checkout.barcodeNumber = barcodeNumber;
                    resolve();
                }, "Cancel", () => {
                    // The user clicked "no"
                    reject();
                });
            }));
        }

        // Handle due date changes with warning.
        if (dueDate.valueOf() != checkout.dueDate.valueOf()) {
            promises.push(new Promise((resolve, reject) => {
                openModal("warning", "You are changing the due date of this checkout.", "Are you sure?", "Yes", () => {
                    // The user clicked "yes"
                    checkout.dueDate = dueDate;
                    resolve();
                }, "Cancel", () => {
                    // The user clicked "no"
                    reject();
                });
            }));
        }

        Promise.all(promises).then(() => {
            // Update the checkout in the database
            getCheckoutInfo(timestampFromURL, false, barcodeNumberFromURL, true).then((checkoutRef) => {
                updateDoc(checkoutRef, newCheckout.toObject()).then(() => {
                    openModal("success", "The checkout was successfully updated.");
                    cancelAdminForm();
                }).catch((error) => {
                    openModal("issue", "There was an issue updating the checkout. Error: " + error);
                });
            });
        }).catch(() => {
            // The user clicked cancel
            return;
        });
    });
}

/**
 * @description Validates the changes that the user made to the checkout.
 * @param {Checkout} oldCheckout The old (current) verion of the checkout.
 * @param {Checkout} newCheckout The new (changed) version of the checkout with the data from the page.
 * @returns {Boolean} Whether or not the changes are valid.
 */
function validateCheckoutChanges(oldCheckout, newCheckout) {
    // Validate new barcode number
    if (!(newCheckout.barcodeNumber > 1171100000 && newCheckout.barcodeNumber < 1171199999)) {
        openModal("issue", "The barcode number you entered is not valid. Please try again.");
        return false;
    }
    // Validate new due date
    if (newCheckout.dueDate < new Date(2020, 0, 1) || newCheckout.dueDate > new Date().setFullYear(new Date().getFullYear() + 1)
        && newCheckout.dueDate.valueOf() != oldCheckout.dueDate.valueOf()) {
        openModal("issue", "The due date you entered is not valid. Please try again.");
        return false;
    }
    return true;
}


/**
 * @description A generalized function that handles performing actions on a list of checkouts (and tracking their sucesses and failures).
 * @param {Array<Checkout>} checkouts The list of checkouts to perform the action on.
 * @param {String} action The action to perform on the checkouts. Current options are "renew", "send-email", "check-in", and "delete".
 */
function checkoutAction(checkouts, action) {
    if (!checkouts || !(checkouts instanceof Array) || checkouts.length == 0) {
        openModal("issue", "No checkouts were specified.");
        return;
    }
    // Create a write batch to perform the updates
    let batch = writeBatch(db);

    // Create a loading modal
    let loadingModal = openModal("info", "Please wait...", "Loading...");

    // Perform the action on each checkout
    let promises = [];
    for (let i = 0; i < checkouts.length; i++) {
        switch (action) {
            case "renew":
                promises.push(renew(checkouts[i].timestamp, checkouts[i].barcodeNumber, batch));
                break;
            case "send-email":
                promises.push(sendCheckoutEmail(checkouts[i].timestamp, checkouts[i].barcodeNumber, batch));
                break;
            case "check-in":
                promises.push(checkIn(checkouts[i].timestamp, checkouts[i].barcodeNumber, batch));
                break;
            case "delete":
                promises.push(deleteCheckout(checkouts[i].timestamp, checkouts[i].barcodeNumber, batch));
                break;
            default:
                openModal("issue", "The action you specified is not valid.");
        }
    }

    Promise.all(promises).then(() => {
        // This will occur if all the underlying promises resolve
        batch.commit().then(() => {
            loadingModal();
            openModal("success", "Your actions were all completed successfully.");

            // Refresh the content on the page
            let timestamp = new Date(parseInt(findURLValue(window.location.search, "timestamp")));
            if (!timestamp) {
                openModal("issue", "No timestamp was specified in the URL.");
                return;
            }
            let group = (findURLValue(window.location.search, "group") == "true");
            if (!group) {
                let barcodeNumber = findURLValue(window.location.search, "barcodeNumber");
                if (!barcodeNumber) {
                    openModal("issue", "No barcode was specified in the URL.");
                    return;
                }

                getCheckoutInfo(timestamp, false, barcodeNumber).then((checkout) => {
                    if (!checkout) {
                        softBack("admin/main");
                        return;
                    }

                    loadSingleCheckout(checkout);
                });
            } else {
                getCheckoutInfo(timestamp).then((checkoutGroup) => {
                    if (!checkoutGroup || !checkoutGroup.checkouts) {
                        softBack("admin/main");
                        return;
                    }

                    loadCheckoutGroup(checkoutGroup);
                });
            }
        }).catch((error) => {
            loadingModal();
            openModal("issue", "There was an issue performing your actions. From the look of it, this is a database issue. Error: " + error);
        });
    }).catch((issue) => {
        loadingModal();
        if (issue == "Action cancelled by user") {
            return;
        }
        openModal("issue", "There was an issue performing your actions. The first issue we ran into was...\n\n" + issue);
    });
}

/**
 * @description Checks to see if an individual checkout can be renewed. If it can, it adds the update to the provided batched write.
 * @param {Date} timestamp The timestamp of the checkout to identify it.
 * @param {String} barcodeNumber The barcode number of the book in the checkout to determine which checkout to update.
 * @param {WriteBatch} batch A Firestore WriteBatch object to add the update to.
 * @returns {Promise} A promise that resolves when the update has been added to the batch (or the reason why it couldn't be added).
 */
function renew(timestamp, barcodeNumber, batch) {
    return getCheckoutInfo(timestamp, false, barcodeNumber).then((checkout) => {
        if (!checkout) {
            return Promise.reject("The checkout you are looking for does not exist.");
        }
        if (checkout.complete) {
            return Promise.reject("This checkout has already been completed. It cannot be renewed.");
        }
        if (checkout.userReturned) {
            return Promise.reject("This checkout has already been returned by the user. It cannot be renewed.");
        }
        if (checkout.renewals >= 2) {
            return Promise.reject("This checkout has already been renewed twice. It cannot be renewed again.");
        }

        let newCheckout = Checkout.createFromObject(checkout.toObject());
        newCheckout.renewals++;
        newCheckout.dueDate = new Date(newCheckout.dueDate.valueOf() + 1209600000); // Add 2 weeks
        newCheckout.lastUpdated = new Date();

        return getCheckoutInfo(timestamp, false, barcodeNumber, true).then((checkoutRef) => {
            batch.update(checkoutRef, newCheckout.toObject());
            return Promise.resolve();
        });
    });
}

/**
 * @description Sends an email to the user associated with an individual checkout. If the book is overdue, it will be an overdue email. Otherwise, it will be a reminder email.
 * @param {Date} timestamp The timestamp of the checkout to identify it.
 * @param {String} barcodeNumber The barcode number of the book in the checkout to determine which book.
 * @param {WriteBatch} batch The Firestore WriteBatch object to add the update to.
 * @returns {Promise} A promise that resolves when the email has been sent (or the reason why it couldn't be sent).
 */
function sendCheckoutEmail(timestamp, barcodeNumber, batch) {
    return getCheckoutInfo(timestamp, false, barcodeNumber).then((checkout) => {
        if (!checkout) {
            return Promise.reject("The checkout you are looking for does not exist.");
        }
        if (checkout.complete) {
            return Promise.reject("This checkout has already been completed. An email cannot be sent.");
        }
        if (checkout.userReturned) {
            return Promise.reject("This checkout has already been returned by the user. An email cannot be sent.");
        }
        if (checkout.reminderEmailSentDate && checkout.dueDate.valueOf() > new Date().valueOf()) {
            return Promise.reject("This checkout has already had a reminder email sent.");
        }
        if (checkout.overdueEmailSentDate && checkout.overdueEmailSentDate.valueOf() > new Date().valueOf() - 604800000) {
            return Promise.reject("This checkout has already had an overdue email sent within the past week.");
        }

        // At this point we're going to send some kind of email, so we need to get the user's info and the book info.
        let promises = [];
        promises.push(getUserFromBarcode(checkout.cardNumber));
        promises.push(getBookFromBarcode(checkout.barcodeNumber));
        return Promise.all(promises).then((results) => {
            let user = results[0];
            let book = results[1];
            if (!user) {
                return Promise.reject("The user you are looking for does not exist.");
            }
            if (!user.email) {
                return Promise.reject("The user you are looking for does not have an email address on file.");
            }

            let to = user.email;
            let subject = "South Church Library - ";
            let text;
            let newCheckout = Checkout.createFromObject(checkout.toObject());
            let emailPromise;

            if (checkout.dueDate.valueOf() > new Date().valueOf()) {
                // Send reminder email
                newCheckout.reminderEmailSentDate = new Date();
                newCheckout.lastUpdated = new Date();

                subject += "Checkout Reminder";
                text = "Hello!\n\nThis is a reminder that you have a book titled \"" + book.title
                + "\" checked out from the South Church Library that is due on " + formatDate(checkout.dueDate, true) + ".\n\nSincerely,\nYour South Church Library Team";
                emailPromise = sendEmail(to, subject, text);
            } else {
                // Send overdue email
                newCheckout.overdueEmailSentDate = new Date();
                newCheckout.overdueEmailSentCount++;
                newCheckout.lastUpdated = new Date();

                subject += "Overdue Notice";
                text = "Hello,\n\nThis is an overdue notice for a book titled \"" + book.title
                + "\" that you checked out from the South Church Library. The book was due on " + formatDate(checkout.dueDate, true)
                + ". Kindly return the book at your earliest convenience.\n\nSincerely,\nYour South Church Library Team";
                emailPromise = sendEmail(to, subject, text);
            }

            return emailPromise.then(() => {
                return getCheckoutInfo(timestamp, false, barcodeNumber, true).then((checkoutRef) => {
                    batch.update(checkoutRef, newCheckout.toObject());
                    return Promise.resolve();
                }).catch((error) => {
                    return Promise.reject("The email was sent, but there was an issue updating the checkout to reflect this. Error: " + error);
                });
            }).catch((error) => {
                return Promise.reject("There was an issue sending the email. Error: " + error);
            });
        });
    }).catch((error) => {
        return Promise.reject(error);
    });
}

/**
 * @description Checks in an individual checkout. If the user never indicated that they returned the book, it will ask the librarian to verify that they are holding the book.
 * @param {Date} timestamp The timestamp of the checkout to identify it.
 * @param {String} barcodeNumber The barcode number of the book in the checkout to determine which book.
 * @param {WriteBatch} batch The Firestore WriteBatch object to add the update to.
 * @returns {Promise} A promise that resolves when the checkout has been checked in (or the reason why it couldn't be checked in).
 */
function checkIn(timestamp, barcodeNumber, batch) {
    return getCheckoutInfo(timestamp, false, barcodeNumber).then((checkout) => {
        if (!checkout) {
            return Promise.reject("The checkout you are looking for does not exist.");
        }
        if (checkout.complete) {
            return Promise.reject("This checkout has already been completed. It cannot be checked in again.");
        }
        if (checkout.librarianCheckedIn) {
            return Promise.reject("This checkout has already been checked in by a librarian. It cannot be checked in again.");
        }
        let verifyPromise = Promise.resolve();
        if (!checkout.userReturned) {
            verifyPromise = new Promise((resolve, reject) => {
                openModal("warning", "The user never indicated that they returned this book. Please verify that you are holding a book with barcode number \""
                + checkout.barcodeNumber + "\" in your hands.",
                "Are you sure?", "Yes", () => {
                    // The user clicked "yes"
                    resolve();
                }, "Cancel", () => {
                    // The user clicked "no"
                    reject();
                });
            });
        }

        let now = new Date();
        return verifyPromise.then(() => {
            // The user clicked "yes"
            // Get the current user's card number so we can track who checked in the book.
            return getUser().then((user) => {
                let newCheckout = Checkout.createFromObject(checkout.toObject());
                newCheckout.userReturned = true;
                newCheckout.userReturnedDate = now;
                newCheckout.librarianCheckedIn = true;
                newCheckout.librarianCheckedInBy = user.cardNumber;
                newCheckout.librarianCheckedInDate = now;
                newCheckout.complete = true;
                newCheckout.lastUpdated = now;

                return getCheckoutInfo(timestamp, false, barcodeNumber, true).then((checkoutRef) => {
                    batch.update(checkoutRef, newCheckout.toObject());
                    return Promise.resolve();
                });
            });
        }).catch(() => {
            // The user clicked cancel
            return Promise.reject("Action cancelled by user");
        });
    });
}

/**
 * @description Deletes an individual checkout. It will ask the user to verify that they want to delete the checkout.
 * @param {Date} timestamp The timestamp of the checkout to identify it.
 * @param {String} barcodeNumber The barcode number of the book in the checkout to determine which book.
 * @param {WriteBatch} batch The Firestore WriteBatch object to add the update to.
 * @returns {Promise} A promise that resolves when the checkout has been deleted (or the reason why it couldn't be deleted).
 */
function deleteCheckout(timestamp, barcodeNumber, batch) {
    return getCheckoutInfo(timestamp, false, barcodeNumber).then((checkout) => {
        if (!checkout) {
            return Promise.reject("The checkout you are looking for does not exist.");
        }
        let verifyPromise = new Promise((resolve, reject) => {
            openModal("warning", "Are you sure you want to delete this checkout? This action cannot be undone.",
            "Are you sure?", "Yes", () => {
                // The user clicked "yes"
                resolve();
            }, "Cancel", () => {
                // The user clicked "no"
                reject();
            });
        });

        return verifyPromise.then(() => {
            // The user clicked "yes"
            return getCheckoutInfo(timestamp, false, barcodeNumber, true).then((checkoutRef) => {
                batch.delete(checkoutRef);
                return Promise.resolve();
            });
        }).catch(() => {
            // The user clicked cancel
            return Promise.reject("Action cancelled by user");
        });
    });
}


/**
 * @description Called when the user adds an entry using an ISBN number.
 */
function addEntry() {
    let isbn = $("#add-entry-isbn").val();
    let check = verifyISBN(isbn);
    if (!check) {
        openModal("issue", "The number you entered is not a valid ISBN Number.");
        return;
    }
    goToPage("admin/editEntry?new=true&isbn=" + isbn);
}

/**
 * @description Called when the user adds an entry without an ISBN number.
 */
function addEntryWithoutISBN() {
    goToPage("admin/editEntry?new=true");
}

/**
 * @description Called when the user searches for a book to edit on the admin dashboard.
 */
function adminSearch() {
    let searchQuery = $("#edit-entry-input").val();

    if (searchQuery) {
        $("#edit-entry-search-results").show();
        $("#edit-entry-search-results").empty();
        search(searchQuery, true).then((results) => {
            if (results.length == 0) {
                $("#edit-entry-search-results").html("Your search returned no results. Please try again.");
            } else {
                adminBookBoxes(results);
            }
        });
    } else {
        openModal("issue", "Please enter a search query");
    }
}

/**
 * @description A helper function for adminSearch(). Calls buildBookBox() for each book in the array.
 * @param {Books[]} objects The books to display in the edit entry search results.
 */
function adminBookBoxes(objects) {
    let maxResults = 10;
    if (objects.length < maxResults) {
        maxResults = objects.length;
    }
    for (let i = 0; i < maxResults; i++) {
        $("div#edit-entry-search-results")[0].appendChild(buildBookBox(objects[i], "edit-entry"));
    }
}


var input;
var input1;
var input2;
var canvas;
var ctx;
/**
 * @description Sets up the page for creating barcodes.
 */
export function setupBarcodePage() {
    canvas = document.getElementById("canvas");
    ctx = canvas.getContext("2d");

    // Create event listeners for the inputs
    $("#barcode-single-input").on("keydown", (event) => {
        if (event.key === "Enter") {
            createBarcode();
            $("#barcode-single-input").trigger("blur");
        }
    });

    $("#barcode-multiple-input-start").on("keydown", (event) => {
        if (event.key === "Enter") {
            createBarcode(true);
            $("#barcode-multiple-input-start").trigger("blur");
        }
    });

    $("#barcode-multiple-input-end").on("keydown", (event) => {
        if (event.key === "Enter") {
            createBarcode(true);
            $("#barcode-multiple-input-end").trigger("blur");
        }
    });

    // Create event listeners for the buttons
    createOnClick($("#merge-one-barcode"), createBarcode);
    createOnClick($("#merge-multiple-barcodes"), createBarcode, true);
}

/**
 * @description Reads the values off of the page in order to create barcodes using a canvas.
 * @param {Boolean} multiple A boolean that represents whether or not the user is creating multiple barcodes.
 */
function createBarcode(multiple = false) {
    let numberOfBarcodes;
    let currentBarcode;
    if (!multiple) {
        numberOfBarcodes = 1;
        input = document.getElementById("barcode-single-input").value;
        input = "11711" + input;
        currentBarcode = parseInt(input);
        if (!/11711[0-9]{5}/.test(input)) {
            openModal("issue", "That barcode is not valid");
            return;
        }
    }
    if (multiple) {
        input1 = document.getElementById("barcode-multiple-input-start").value;
        input1 = "11711" + input1;
        input2 = document.getElementById("barcode-multiple-input-end").value;
        input2 = "11711" + input2;
        if (!/11711[0-9]{5}/.test(input1)) {
            openModal("issue", "The starting barcode is not valid");
            return;
        }
        if (!/11711[0-9]{5}/.test(input2)) {
            openModal("issue", "The ending barcode is not valid");
            return;
        }
        if (parseInt(input1) >= parseInt(input2)) {
            openModal("issue", "The ending barcode must be larger than the starting barcode");
            return;
        }
        numberOfBarcodes = parseInt(input2) - parseInt(input1) + 1;
        currentBarcode = parseInt(input1);
    }
    // Loop through each barcode
    for (let i = 0; i < numberOfBarcodes; i++) {
        if (i != 0) {
            currentBarcode++;
        }
        let imageObjArray = [];
        let imageObjLoadedArray = [];
        let delay = i * 1500 + (Math.floor(i / 5) * 2000);
        setTimeout((currentBarcode, imageObjArray, imageObjLoadedArray, i, numberOfBarcodes) => {
            if (i == numberOfBarcodes - 1) {
                setTimeout(() => {
                    openModal("success", "Download Complete");
                }, 2000);
            }
            let currentBarcodeString = currentBarcode.toString();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.font = "bold 60px Poppins";
            ctx.textAlign = "center";
            // let textWidth = ctx.measureText("South Church Library");
            ctx.fillText("South Church Library", (canvas.width / 2), 60);
            let barcodeStyled = currentBarcodeString.substring(0, 1) + "  " + currentBarcodeString.substring(1, 5) + "  " + currentBarcodeString.substring(5, currentBarcodeString.length);
            ctx.font = "bold 78px Poppins";
            // textWidth = ctx.measureText(barcodeStyled);
            ctx.fillText(barcodeStyled, (canvas.width / 2), 350);
            ctx.font = "45px Poppins";
            // textWidth = ctx.measureText("Andover, MA");
            ctx.translate(70, (canvas.height / 2) - 5);
            ctx.rotate(270 * (Math.PI / 180));
            ctx.fillText("Andover, MA", 0, 0);
            ctx.rotate(-270 * (Math.PI / 180));
            ctx.translate(-70, -(canvas.height / 2) + 5);
            ctx.font = "45px Poppins";
            ctx.translate(1055, (canvas.height / 2) - 5);
            ctx.rotate(90 * (Math.PI / 180));
            ctx.fillText("Andover, MA", 0, 0);
            ctx.rotate(-90 * (Math.PI / 180));
            ctx.translate(-1055, -(canvas.height / 2) + 5);

            for (let i = 0; i < 12; i++) {
                imageObjLoadedArray[i] = false;
            }
            for (let i = 0; i < 12; i++) {
                imageObjArray.push(new Image());
                loadBarcodeImage(i, imageObjArray, imageObjLoadedArray, currentBarcodeString);
            }
            imageObjArray[0].src = "/img/barcode-parts/A.png";
            imageObjArray[11].src = "/img/barcode-parts/B.png";
            for (let i = 1; i < 11; i++) {
                let temp = currentBarcodeString.substring(i - 1, i);
                imageObjArray[i].src = "/img/barcode-parts/" + temp + ".png";
            }
        }, delay, currentBarcode, imageObjArray, imageObjLoadedArray, i, numberOfBarcodes);
    }
}

/**
 * @description Loads the 12 individual images into the canvas. Once all are loaded, it renders the canvas to a png and downloads it.
 * @param {Number} num the number of the image 0-11 which is being loaded. 0 is the first bar, 11 is the last bar.
 * @param {Image[]} imageObjArray The array contianing the image objects.
 * @param {Boolean[]} imageObjLoadedArray An array containing a boolean that represents whether the image has loaded or not.
 * @param {String} currentBarcodeString The current barcode string.
 */
function loadBarcodeImage(num, imageObjArray, imageObjLoadedArray, currentBarcodeString) {
    imageObjArray[num].onload = function () {
        // console.log("Image #" + num + " has loaded");
        ctx.globalAlpha = 1;
        let position = 110 * 0.6 * num + 160;
        if (num != 0) {
            position += 10;
        }
        ctx.drawImage(imageObjArray[num], position, 95, imageObjArray[num].width * 0.6, imageObjArray[num].height * 0.6);
        imageObjLoadedArray[num] = true;
        let allLoaded = true;
        for (let i = 0; i < 12; i++) {
            if (imageObjLoadedArray[i]) {
                continue;
            } else {
                allLoaded = false;
            }
        }
        if (allLoaded) {
            canvas.toBlob((blob) => {
                let url = window.URL.createObjectURL(blob);
                let a = document.getElementById("link");
                a.href = url;
                a.download = currentBarcodeString + ".png";
                a.click();
                window.URL.revokeObjectURL(url);
            });
        }
    };

}

/**
 * @description Displays the list of recently checked out books on the admin dashboard.
 */
function recentlyCheckedOut() {
    getDocs(query(collection(db, "checkouts"), /*where("timestamp", ">", d), */orderBy("timestamp", "desc"), limit(10))).then((querySnapshot) => {
        let checkoutList = [];
        querySnapshot.forEach((docSnap) => {
            if (!docSnap.exists()) {
                console.error("checkout document does not exist");
                return;
            }
            checkoutList.push(Checkout.createFromObject(docSnap.data()));
        });
        let checkoutsCombined = [];
        // Combine the checkouts if they have the same timestamp
        for (let i = 0; i < checkoutList.length; i++) {
            let current = checkoutList[i];
            let currentPairing = [current];
            for (let j = i + 1; j < checkoutList.length; j++) {
                if (Checkout.isSameCheckout(checkoutList[j], current)) {
                    currentPairing.push(checkoutList[j]);
                    i++;
                }
            }
            checkoutsCombined.push(new CheckoutGroup(currentPairing));
            if (checkoutsCombined.length >= 5) {
                break;
            }
        }
        // Create the HTML elements
        checkoutsCombined.forEach((checkoutGroup) => {
            $("#checked-out-books-container").append(buildCheckoutBox(checkoutGroup, true));
        });
    });
}

/**
 * @description Updates the stats on the admin dashboard.
 */
function addStats() {
    let count = 0;
    updateBookDatabase().then(() => {
        // Number of Books
        bookDatabase.forEach((document) => {
            // Iterate through each of the 10-ish docs
            for (let i = 0; i < document.books.length; i++) {
                // Iterate through each of the 100 books in each doc
                let book = document.books[i];
                if (book.isDeleted || book.barcodeNumber == 1171100000 || !book.lastUpdated) {
                    continue;
                }
                count++;
            }
        });
        $("#number-of-books").html(count);
        // TODO: Might want to also list overdue books, or books that are awaiting reshelving (separately).
        getDocs(query(collection(db, "checkouts"), where("complete", "==", false))).then((querySnapshot) => {
            let checkouts = [];
            querySnapshot.forEach((docSnap) => {
                if (!docSnap.exists()) {
                    console.error("checkout document does not exist");
                    return;
                }
                checkouts.push(Checkout.createFromObject(docSnap.data()));
            });
            let count = 0;
            checkouts.forEach((checkout) => {
                if (checkout.userReturned) {
                    count++;
                }
            });
            if (count == 0) {
                $("#number-of-checked-out-books").html(checkouts.length);
            } else {
                $("#number-of-checked-out-books").html(checkouts.length + " (" + count + " awaiting reshelving)");
            }
        });
    });
    // TODO: Number of Users (in a less terrible way)
    getDoc(doc(db, "/config/writable_vars")).then((docSnap) => {
        let num = docSnap.data().maxCardNumber - 2171100000;
        $("#number-of-users").html(num);
    });
    // TODO: Logins in the Past Month
}

/**
 * @description Called when the user clicks the "View Missing Barcodes" link.
 */
// TODO: Remove this function after the system is fully updated to prevent holes.
function viewMissingBarcodes() {
    let missingArray = [];
    bookDatabase.forEach((document) => {
        // Iterate through each of the 10-ish docs
        for (let i = 0; i < document.books.length; i++) {
            // Iterate through each of the 100 books in each doc
            let book = document.books[i];
            if (book.barcodeNumber == 1171100000 || (book.lastUpdated/* && !book.isDeleted (We decided not to write over deleted books)*/)) {
                continue;
            }
            missingArray.push(book);
        }
    });
    let message = "The following Barcodes have been created, but they have never been updated:\n";
    missingArray.forEach((book) => {
        message += book.barcodeNumber + "\n";
    });
    openModal("info", message);
}

/**
 * @description Called when the user clicks the "Export" link. Downloads the database as a JSON file.
 */
function downloadDatabase() {
    updateBookDatabase().then(() => {
        let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bookDatabase));
        const a = document.createElement("a");
        a.style.display = "none";
        a.id = "download-database-link";
        let dateString = new Date().toLocaleDateString("en-CA"); // it's canadian because they use yyyy-mm-dd format
        a.download = "database " + dateString + ".json";
        a.href = dataStr;
        a.innerHTML = "Click Here to download the database";
        $("#content")[0].appendChild(a);
        window.setTimeout(() => {
            $("#download-database-link")[0].click();
        }, 500);
    });
}

/**
 * @description Uploads a file from the user's computer.
 * @param {InputEvent} event The onchange event that is generated when the user selects a file.
 * @returns {Promise<File>} A promise that resolves to the file that the user selected.
 */
function importFile(event) {
    return new Promise((resolve, reject) => {
        if (event.target.files[0])
            resolve(event.target.files[0]);
        else
            reject();
    });
}

/**
 * @description Called when the user selects a file to upload. Processes the data and uploads it to the database.
 * @param {InputEvent} event the onchange event that is generated when the user selects a file.
 */
function processImport(event) {
    importFile(event).then((file) => {
        if (file.type != "application/json") {
            openModal("error", "File type not recognized. Please upload a JSON file.");
            return;
        }
        file.text().then((text) => {
            try {
                let dataToUpload = JSON.parse(text);
                let newDatabase = [], modified = 0;
                for (let i = 0; i < dataToUpload.length; i++) {
                    let newDoc = [];
                    for (let j = 0; j < dataToUpload[i].books.length; j++) {
                        let newBook = Book.createFromObject(dataToUpload[i].books[j]);
                        newDoc.push(newBook);
                        if (bookDatabase[i].books[j] && !Book.equals(newBook, bookDatabase[i].books[j])) {
                            modified++;
                        }
                    }
                    newDatabase.push(newDoc);
                }
                let ndlen = newDatabase.length, bdlen = bookDatabase.length;
                let diff = 100 * (ndlen - bdlen) + (newDatabase[ndlen - 1].length - bookDatabase[bdlen - 1].books.length);
                // Open a modal to confirm the import
                openModal("warning",
                    "This will overwrite the entire books database.<br>" +
                    "<span id=\"import-added\">0</span> books added<br>" +
                    "<span id=\"import-deleted\">0</span> books deleted<br>" +
                    "<span id=\"import-modified\">0</span> books modified",
                    "Are you sure?", "Yes, Import", () => {
                    importDatabase(newDatabase).then(() => {
                        setBookDatabase(null);
                        setTimeLastSearched(null);
                        openModal("success", "Database updated successfully!");
                    }).catch((error) => {
                        console.error(error);
                        openModal("error", "There was an error and your data was not updated.");
                    }).finally(() => {
                        window.clearTimeout(loadingTimer);
                        loadingModal();
                    });
                }, "No, Cancel", () => {
                    $("#import-input").val("");
                });
                fillImportModal(diff, modified);
            } catch (error) {
                console.error(error);
                openModal("error", "Something went wrong. Please check the file you are trying to import.");
            }
        });
    }).catch(() => {
        console.log("The user did not upload a valid file.");
    });
}

function fillImportModal(diff = 0, modified = 0) {
    if (diff > 0) {
        $("#import-added").html(diff);
        $("#import-deleted").html(0);
    } else {
        $("#import-deleted").html(0 - diff);
        $("#import-added").html(0);
    }
    $("#import-modified").html(modified);
}

var loadingTimer;
var loadingModal;
function importDatabase(database) {
    loadingModal = openModal("info", "Please wait. This may take a while. Do not close this window or navigate to a new page.", "Importing Database...", "");
    // If an error occurs somewhere in this process, tell the user after 10 seconds
    loadingTimer = window.setTimeout(() => {
        loadingModal();
        openModal("issue", "We did not complete the import process in 30 seconds. An error has likely occurred. Your changes may not have been saved.");
    }, 30000);
    return new Promise((resolve) => {
        // Get a new write batch
        let batch = writeBatch(db);
        getDocs(query(collection(db, "books"), where("order", ">=", 0), orderBy("order", "asc"))).then((querySnapshot) => {
            querySnapshot.forEach((docSnap) => {
                if (!docSnap.exists()) {
                    throw "The books document doesn't exist";
                }
                // Set each doc for deletion
                batch.delete(docSnap.ref);
            });
            for (let i = 0; i < database.length; i++) {
                // Create a new doc and add all the books to be imported into it
                let newDoc = [];
                for (let j = 0; j < database[i].length; j++) {
                    let newBook = database[i][j].toObject();
                    // temporarily renaming things to old scheme
                    // for (let k = 0; k < 2; k++) {
                    //     if (newBook.authors[k]) {
                    //         newBook.authors[k] = {
                    //             first: newBook.authors[k].firstName,
                    //             last: newBook.authors[k].lastName
                    //         };
                    //     }
                    //     if (newBook.illustrators[k]) {
                    //         newBook.illustrators[k] = {
                    //             first: newBook.illustrators[k].firstName,
                    //             last: newBook.illustrators[k].lastName
                    //         };
                    //     }
                    // }
                    // newBook.audience = [newBook.audience.children, newBook.audience.youth, newBook.audience.adult,
                    //     !(newBook.audience.children || newBook.audience.youth || newBook.audience.adult)];
                    newDoc.push(newBook);
                }
                // Set the new doc for addition
                batch.set(doc(db, "books", i.toString().padStart(3, "0")), {
                    books: newDoc,
                    order: i
                });
            }
            // Commit all the staged writes
            batch.commit().then(() => {
                resolve();
            });
        });
    });
}

/**
 * @description The setup function for the view page. It will load all books or all users depending on the type parameter in the URL.
 * @param {String} pageQuery The query string from the URL.
 */
export function setupView(pageQuery) {
    let type = findURLValue(pageQuery, "type");
    if (type == "books") {
        updateBookDatabase().then(() => {
            bookDatabase.forEach((doc, docIndex) => {
                doc.books.forEach((book, bookIndex) => {
                    $("div#view-container")[0].appendChild(buildBookBox(book, "view", docIndex*100 + bookIndex));
                });
            });
        });
    } else if (type == "users") {
        getAllUsers().then(() => {
            userDatabase.forEach((user, index) => {
                $("div#view-container")[0].appendChild(buildUserBox(user, "view", index));
            });
        });
    } else {
        console.warn("There was no type specified in the URL.");
        openModal("issue", "There was no type specified in the URL. Redirecting to the admin dashboard.");
        goToPage("admin/main");
    }
}

/**
 * @description Builds a box that contains the information for a user so it can be displayed on the page.
 * @param {User} obj The user object to build the box for.
 * @param {String} page A string that represents the page that this is being built for.
 * @param {Number} num The result number if this is created for a search result.
 * @returns {HTMLDivElement} A div element that contains the user information.
 */
function buildUserBox(obj, page, num = 0) {
    const a = document.createElement("a");
    const div = document.createElement("div");
    a.appendChild(div);
    switch (page) {
        case "view":
            div.classList.add("result-listing");
            break;
        default:
            div.classList.add("user");
    }
    const div1 = document.createElement("div");
    const div2 = document.createElement("div");
    div.appendChild(div1);
    div.appendChild(div2);
    const img = document.createElement("img");
    img.classList.add("userimage");
    if (obj.pfpIconLink) {
        img.src = obj.pfpIconLink;
    } else if (obj.pfpLink) {
        img.src = obj.pfpLink;
    } else {
        img.src = "/img/default-user.jpg";
    }
    img.onload = () => {
        div.style.opacity = 1;
    };
    div1.appendChild(img);
    const b = document.createElement("b");
    const name = document.createElement("p");
    name.classList.add("title");
    name.appendChild(document.createTextNode(obj.firstName + " " + obj.lastName));
    const email = document.createElement("p");
    email.classList.add("author");
    email.appendChild(document.createTextNode(obj.email));
    b.appendChild(name);
    div2.appendChild(b);
    div2.appendChild(email);
    div2.classList.add("basic-info");
    if (page == "edit-entry" || page == "view") {
        a.href = "/admin/editUser?id=" + obj.cardNumber;
        const barcode = document.createElement("p");
        barcode.classList.add("barcode");
        barcode.innerHTML = "Card Number: " + obj.cardNumber;
        div2.appendChild(barcode);
    }
    if ((page == "search" && num > 0) || page == "view") {
        div.id = "result-number-" + num;
        const number = document.createElement("div");
        number.classList.add("result-number");
        number.appendChild(document.createTextNode(obj.cardNumber % 2171100000 + "."));
        div.appendChild(number);
        const phone = document.createElement("p");
        phone.classList.add("medium");
        phone.appendChild(document.createTextNode(obj.phone));
        div2.appendChild(phone);
        const div3 = document.createElement("div");
        div3.classList.add("advanced-info");
        div.appendChild(div3);
        const address = document.createElement("p");
        address.classList.add("subjects");
        address.appendChild(document.createTextNode("Address: " + obj.address));
        div3.appendChild(address);
        const dateCreated = document.createElement("p");
        dateCreated.classList.add("subjects");
        dateCreated.appendChild(document.createTextNode("Date Created: " + formatDate(obj.dateCreated)));
        div3.appendChild(dateCreated);
        const lastSignInTime = document.createElement("p");
        lastSignInTime.classList.add("subjects");
        lastSignInTime.appendChild(document.createTextNode("Last Sign In: " + formatDate(obj.lastSignInTime)));
        div3.appendChild(lastSignInTime);
        const lastCheckoutTime = document.createElement("p");
        lastCheckoutTime.classList.add("subjects");
        lastCheckoutTime.appendChild(document.createTextNode("Last Checkout Time: " + formatDate(obj.lastCheckoutTime)));
        div3.appendChild(lastCheckoutTime);
        const checkouts = document.createElement("p");
        checkouts.classList.add("description");
        // TODO: Implement this.
        checkouts.appendChild(document.createTextNode("Last Checked Out Book: Not Implemented Yet"));
        div3.appendChild(checkouts);
    }
    return a;
}

var userDatabase = [];
/**
 * @description Gets all the users from the database and stores them in the userDatabase array.
 * @returns {Promise<void>} A promise that resolves when the userDatabase is loaded.
 */
function getAllUsers() {
    return new Promise((resolve) => {
        getDocs(query(collection(db, "users"), where("cardNumber", ">=", 0), orderBy("cardNumber", "asc"))).then((querySnapshot) => {
            userDatabase = [];
            querySnapshot.forEach((docSnap) => {
                if (!docSnap.exists()) {
                    console.error("user document does not exist");
                    return;
                }
                userDatabase.push(User.createFromObject(docSnap.data()));
            });
            resolve();
        });
    });
}


/**
 * @description Restarts the inventory progress.
 */
function restartInventory() {
    openModal("warning", "This will delete your current progress.", "Are you sure you want to restart?", "Confirm", () => {
        setDoc(doc(db, "admin", "inventory"), {
            books: []
        }).then(() => {
            openModal("success", "The Inventory Progress has been reset.\nThe page will now refresh.", undefined, undefined, () => {window.location.reload();});
        }).catch((error) => {
            openModal("error", "Error resetting inventory: " + error);
        });
    }, "Cancel");
}

/**
 * @description Sets up the inventory page including the event listeners.
 */
export function setupInventory() {
    loadInventory().then(() => {
        cachedInventory.forEach((barcode) => {
            let current = $("#recent-scans").html();
            $("#recent-scans").html(current + "<br>" + barcode);
        });
    }).catch((error) => {
        openModal("error", "Error loading inventory: " + error);
    });

    // Set up the event listeners
    createOnClick($("#restart-inventory"), restartInventory);
    createOnClick($("#inventory-cancel-button"), cancelInventory);
    createOnClick($("#inventory-next-button"), continueScanning);
    createOnClick($("#continue-scanning-button"), continueScanning);
}

var cachedInventory = [];
/**
 * @description Loads the inventory from the database.
 * @returns {Promise<void>} A promise that resolves when the inventory is loaded from the database.
 */
function loadInventory() {
    return new Promise((resolve, reject) => {
        getDoc(doc(db, "admin", "inventory")).then((docSnap) => {
            if (!docSnap.exists()) {
                console.error("inventory document does not exist");
                return;
            }
            cachedInventory = [];
            docSnap.data().books.forEach((book) => {
                cachedInventory.push(Book.createFromObject(book));
            });
            resolve();
        }).catch((error) => {
            reject(error);
        });
    });
}

/**
 * @description Cancels the inventory process and hides the popup.
 */
function cancelInventory() {
    $("#inventory-book-barcode").off("blur");
    $("#inventory-popup").hide();
}

/**
 * @description Continues the inventory process from where it left off.
 */
function continueScanning() {
    updateBookDatabase();
    $("#inventory-popup").show();
    $("#inventory-next-button").hide();
    $("#inventory-inner-popup-box").html("<p>Please scan the barcode on the book now.</p>");
    $("#inventory-book-barcode").on("blur", () => {
        $("#inventory-book-barcode").trigger("focus");
    });
    $("#inventory-book-barcode").trigger("focus");
    $("#inventory-book-barcode").off("keydown");
    $("#inventory-book-barcode").on("keydown", (event) => {
        if (event.key === "Enter") {
            $("#inventory-book-barcode").off("blur");
            if ($("#inventory-book-barcode").val()) {
                // Some checks should be done to ensure the barcode is valid, the book hasn't been scanned, etc.
                updateDoc(doc(db, "admin", "inventory"), {
                    books: arrayUnion($("#inventory-book-barcode").val())
                });
            }
        }
    });
}

/**
 * @description Sets up the admin help page.
 */
export function setupAdminHelp() {
    $("#tableOfContents li a").each((index, a) => {
        $(a).attr("href", "/admin/help#section" + (index + 1));
    });
    $("#sections > li").each((index, li) => {
        $(li).attr("id", "section" + (index + 1));
    });
    $(".back-to-top").each((index, li) => {
        $(li).children().attr("href", "/admin/help");
        $(li).children().on("click", () => {
            windowScroll(0);
        });
    });

    let adminHelpScrollingFn;
    if (!adminHelpScrollingFn){
        adminHelpScrollingFn = new Throttle(adminHelpScrolling, 100).get();
    }
    document.addEventListener("scroll", adminHelpScrollingFn);

    $(window).on("beforeunload", () => {
        setIgnoreScroll(true);
        document.removeEventListener("scroll", adminHelpScrollingFn);
        setTimeout(() => {
            setIgnoreScroll(false);
        }, 500);
    });
}

function adminHelpScrolling() {
    if (ignoreScroll) {
        return;
    }
    let currentSection = 0;
    $("#tableOfContents, #sections > li").each((index, li) => {
        // Check if the section is above the top of the screen.
        // Used to be 90 to account for the header, but I added more to make it more natural.
        if ($(li).offset().top - $(document).scrollTop() - 165 < 0) {
            currentSection = index;
        }
    });
    // Change the URL to the current section.
    let url = "/admin/help";
    let newHash;
    if (currentSection == 0) {
        newHash = "#top";
    } else {
        newHash = "#section" + currentSection;
    }
    let currentUrl = window.location.pathname + window.location.hash;
    if ((currentUrl != url + newHash) && !ignoreScroll) {
        console.log("Changing URL to " + url + newHash);
        historyManager.update(url + newHash);
        setCurrentHash(newHash);
    }
}

console.log("admin.js has loaded!");
