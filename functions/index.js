// eslint-disable-next-line
const functions = require("firebase-functions");
// eslint-disable-next-line
const admin = require("firebase-admin");
// eslint-disable-next-line
const { getFirestore } = require("firebase-admin/firestore");

const app = admin.initializeApp();
const db = getFirestore(app);

// eslint-disable-next-line
exports.beforeCreate = functions.auth.user().beforeCreate((user, context) => {
    // Run a Transaction to ensure that the correct barcode is used. (Atomic Transaction)
    return db.runTransaction((transaction) => {
        const cloudVarsPath = db.doc("config/writable_vars");
        // Get the variable stored in the writable_vars area
        return transaction.get(cloudVarsPath).then((docSnap) => {
            if (!docSnap.exists) {
                throw new functions.auth.HttpsError("not-found", "Document does not exist!");
            }
            // Save the max value and incriment it by one.
            const newCardNumber = docSnap.data().maxCardNumber + 1;
            // Create a new user object
            const userObject = new User(newCardNumber, null, null, user.email, null,
                null, null, null, new Date(), null,
                new Date(), user.uid, false, false, false, new Date(), true, false, false);
            // Set the document to exist in the users path
            transaction.set(db.doc("users/" + user.uid), userObject.toObject());
            // Update the cloud variable to contain the next card number value
            transaction.update(cloudVarsPath, {
                maxCardNumber: newCardNumber
            });
            return newCardNumber;
        }).catch((error) => {
            throw new functions.auth.HttpsError("internal", error.message);
        });
    }).catch((error) => {
        throw new functions.auth.HttpsError("internal", error.message);
    });
});


/**
 * @global
 * @class
 * @classdesc A user of the library
 */
class User {
    /**
     * @param {Number} cardNumber 
     * @param {String} firstName 
     * @param {String} lastName 
     * @param {String} email 
     * @param {String} phone 
     * @param {String} address 
     * @param {String} pfpLink 
     * @param {String} pfpIconLink 
     * @param {Date} dateCreated 
     * @param {Date} lastCheckoutTime 
     * @param {Date} lastSignInTime 
     * @param {String} uid the string that the auth object uses to represent a user
     * @param {Boolean} canCheckOutBooks indicates if the user is authorized to check out books
     * @param {Boolean} isDeleted
     * @param {Boolean} isHidden
     * @param {Date} lastUpdated
     * @param {Boolean} notificationsOn
     * @param {Boolean} emailVerified
     * @param {Boolean} isDisabled
     */
    constructor(cardNumber = null, firstName = null, lastName = null, email = null, phone = null,
        address = null, pfpLink = null, pfpIconLink = null, dateCreated = null, lastCheckoutTime = null,
        lastSignInTime = null, uid = null, canCheckOutBooks = null, isDeleted = null, isHidden = null,
        lastUpdated = null, notificationsOn = null, emailVerified = null, isDisabled = null) {
        this.cardNumber = cardNumber;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.phone = phone;
        this.address = address;
        this.pfpLink = pfpLink;
        this.pfpIconLink = pfpIconLink;
        this.dateCreated = dateCreated;
        this.lastCheckoutTime = lastCheckoutTime;
        this.lastSignInTime = lastSignInTime;
        this.uid = uid;
        this.canCheckOutBooks = canCheckOutBooks;
        this.isDeleted = isDeleted;
        this.isHidden = isHidden;
        this.lastUpdated = lastUpdated;
        this.notificationsOn = notificationsOn;
        this.emailVerified = emailVerified;
        this.isDisabled = isDisabled;
    }

    /**
     * @param {Object} jsonObject a json object imported from firebase
     * @returns a new User object with all of that data in it
     */
    static createFromObject(jsonObject) {
        if (jsonObject instanceof User) {
            console.warn("tried to pass a User object into User.createFromObject");
            return jsonObject;
        }
        if (jsonObject.dateCreated) {
            if (jsonObject.dateCreated.seconds)
                jsonObject.dateCreated = new Date(jsonObject.dateCreated.seconds * 1000);
            else
                jsonObject.dateCreated = new Date(jsonObject.dateCreated);
        }
        if (jsonObject.lastCheckoutTime) {
            if (jsonObject.lastCheckoutTime.seconds)
                jsonObject.lastCheckoutTime = new Date(jsonObject.lastCheckoutTime.seconds * 1000);
            else
                jsonObject.lastCheckoutTime = new Date(jsonObject.lastCheckoutTime);
        }
        if (jsonObject.lastSignInTime) {
            if (jsonObject.lastSignInTime.seconds)
                jsonObject.lastSignInTime = new Date(jsonObject.lastSignInTime.seconds * 1000);
            else
                jsonObject.lastSignInTime = new Date(jsonObject.lastSignInTime);
        }
        if (jsonObject.lastUpdated) {
            if (jsonObject.lastUpdated.seconds)
                jsonObject.lastUpdated = new Date(jsonObject.lastUpdated.seconds * 1000);
            else
                jsonObject.lastUpdated = new Date(jsonObject.lastUpdated);
        }
        return new User(jsonObject.cardNumber, jsonObject.firstName, jsonObject.lastName, jsonObject.email,
            jsonObject.phone, jsonObject.address, jsonObject.pfpLink, jsonObject.pfpIconLink,
            jsonObject.dateCreated, jsonObject.lastCheckoutTime, jsonObject.lastSignInTime, jsonObject.uid,
            jsonObject.canCheckOutBooks, jsonObject.isDeleted, jsonObject.isHidden, jsonObject.lastUpdated,
            jsonObject.notificationsOn, jsonObject.emailVerified, jsonObject.isDisabled);
    }

    /**
     * @returns {Object} a vanilla JSON object representing a User
     */
    toObject() {
        return {
            cardNumber: this.cardNumber,
            firstName: this.firstName,
            lastName: this.lastName,
            email: this.email,
            phone: this.phone,
            address: this.address,
            pfpLink: this.pfpLink,
            pfpIconLink: this.pfpIconLink,
            dateCreated: this.dateCreated,
            lastCheckoutTime: this.lastCheckoutTime,
            lastSignInTime: this.lastSignInTime,
            uid: this.uid,
            canCheckOutBooks: this.canCheckOutBooks,
            isDeleted: this.isDeleted,
            isHidden: this.isHidden,
            lastUpdated: this.lastUpdated,
            notificationsOn: this.notificationsOn,
            emailVerified: this.emailVerified,
            isDisabled: this.isDisabled
        };
    }
}
