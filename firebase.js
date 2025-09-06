import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; 
import { getDatabase } from "firebase/database"; // 👈 Thêm dòng này

const firebaseConfig = {
  apiKey: "AIzaSyBrcumeiH_akleThkq3qj_7uCv7E4ScqSc",
  authDomain: "totnghiep-4e113.firebaseapp.com",
  projectId: "totnghiep-4e113",
  storageBucket: "totnghiep-4e113.appspot.com",
  messagingSenderId: "513257594496",
  appId: "1:513257594496:web:d443b680ef8d91b645d065",
  measurementId: "G-LVKD0QCG3T",

  // 👇 Phải thêm databaseURL để Realtime DB hoạt động
  databaseURL: "https://totnghiep-4e113-default-rtdb.firebaseio.com",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);
const db = getFirestore(app);      // Firestore
const rtdb = getDatabase(app);     // Realtime Database 👈 thêm

export { auth, db, rtdb };
