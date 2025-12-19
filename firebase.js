// firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage"; 

const firebaseConfig = {
  apiKey: "AIzaSyBrcumeiH_akleThkq3qj_7uCv7E4ScqSc",
  authDomain: "totnghiep-4e113.firebaseapp.com",
  databaseURL: "https://totnghiep-4e113-default-rtdb.firebaseio.com",
  projectId: "totnghiep-4e113",
  storageBucket: "totnghiep-4e113.firebasestorage.app",
  messagingSenderId: "513257594496",
  appId: "1:513257594496:web:d443b680ef8d91b645d065",
  measurementId: "G-LVKD0QCG3T",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth =
  getApps().length === 0
    ? initializeAuth(app, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      })
    : getAuth(app);

const db = getFirestore(app);
const rtdb = getDatabase(app);

export { app, auth, db, rtdb };
