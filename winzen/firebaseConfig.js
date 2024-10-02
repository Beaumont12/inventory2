import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, child } from "firebase/database"; // Import database module for Firebase Realtime Database

const firebaseConfig = {
    apiKey: "AIzaSyB8xVDaDEehGAqTAKtmqdD97pkBSIQJHyI",
    authDomain: "wenzinpossystem.firebaseapp.com",
    databaseURL: "https://wenzinpossystem-default-rtdb.firebaseio.com",
    projectId: "wenzinpossystem",
    storageBucket: "wenzinpossystem.appspot.com",
    messagingSenderId: "910317765447",
    appId: "1:910317765447:web:16a7a67c68b7216d0d4262"
  };

const app = initializeApp(firebaseConfig);

const db = getDatabase(app);

export { app, db, ref, get, child };