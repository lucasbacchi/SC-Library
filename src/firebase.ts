import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

// Lets TypeScript know about Firebase's debug-token setting on the browser window.
declare global {
    var FIREBASE_APPCHECK_DEBUG_TOKEN: boolean | string | undefined;
}

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

// App Check proves requests come from the real site. Firestore rejects requests without it.
// It needs the browser (reCAPTCHA), so skip it during server-side rendering.
if (typeof window !== "undefined") {
    // In development only, use a debug token so App Check works on localhost.
    // import.meta.env.DEV is false in production builds, so this never ships to the live site.
    if (import.meta.env.DEV) {
        self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }

    initializeAppCheck(firebaseApp, {
        provider: new ReCaptchaV3Provider("6LcpTm0bAAAAALfsopsnY-5aX2BC7nAukEDHtKDu"),
        isTokenAutoRefreshEnabled: true
    });
}
