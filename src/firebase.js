

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyDv5SmlAtsqp1FiqEHA6_HdOqSJMKZHnQ8",
  authDomain: "interviewprep-3079b.firebaseapp.com",
  projectId: "interviewprep-3079b",
  storageBucket: "interviewprep-3079b.firebasestorage.app",
  messagingSenderId: "140597763051",
  appId: "1:140597763051:web:9fa92d19214478b65b17ae",
  measurementId: "G-67B1CYDF8D"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services you need
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;