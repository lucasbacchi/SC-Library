import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";

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
