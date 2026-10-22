import { getAppCheck } from "firebase-admin/app-check";
import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

const firebaseApp =
    getApps().length > 0
        ? getApps()[0]
        : initializeApp({
              storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? "south-church-library.appspot.com"
          });

export { firebaseApp };
export const firebaseAuth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const appCheck = getAppCheck(firebaseApp);
