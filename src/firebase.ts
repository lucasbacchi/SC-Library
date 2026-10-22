import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getPerformance } from "firebase/performance";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAsQp9MoNHpx_082eyH4gi-K-M1v1YGzKU",
    authDomain: "south-church-library.firebaseapp.com",
    databaseURL: "https://south-church-library.firebaseio.com",
    projectId: "south-church-library",
    storageBucket: "south-church-library.appspot.com",
    messagingSenderId: "695036619849",
    appId: "1:695036619849:web:5e99fa7a4f64cec2daa398",
    measurementId: "G-MRXNED32DZ"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const analytics = getAnalytics(firebaseApp);
export const performance = getPerformance(firebaseApp);
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY;
const appCheckDebugToken = import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN;

if (!appCheckSiteKey) {
    throw new Error("VITE_FIREBASE_APPCHECK_SITE_KEY must be configured.");
}

if (appCheckDebugToken) {
    const debugValue = appCheckDebugToken === "true" ? true : appCheckDebugToken;
    (
        globalThis as typeof globalThis & { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string }
    ).FIREBASE_APPCHECK_DEBUG_TOKEN = debugValue;
    console.info(
        "Firebase App Check debug mode is enabled. Firebase will print the debug token here when App Check initializes."
    );
}

export const appCheck = initializeAppCheck(firebaseApp, {
    provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
    isTokenAutoRefreshEnabled: true
});
