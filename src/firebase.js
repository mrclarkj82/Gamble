import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Paste your Firebase web app config here from:
// Firebase Console > Project settings > General > Your apps > Web app.
// These values identify the client app. Do not paste service-account keys here.
const firebaseConfig = {
  apiKey: "AIzaSyDmQmZHkN7DB9hV0Qj-02hk5Rez5zUAqGE",
  authDomain: "gamble-714a3.firebaseapp.com",
  projectId: "gamble-714a3",
  storageBucket: "gamble-714a3.firebasestorage.app",
  messagingSenderId: "330730321975",
  appId: "1:330730321975:web:32f96492ac78b95bc927b2",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});
