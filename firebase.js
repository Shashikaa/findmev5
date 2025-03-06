import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth"; // If using authentication
import { getFirestore } from "firebase/firestore"; // If using Firestore
import { getStorage } from "firebase/storage"; // Add Firebase Storage


// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyCVxM6dZWNDvfSOim5aaFK7h2aVaLSbAs0",
  authDomain: "poss-37a94.firebaseapp.com",
  databaseURL: "https://poss-37a94-default-rtdb.firebaseio.com",
  projectId: "poss-37a94",
  storageBucket: "poss-37a94.firebasestorage.app",
  messagingSenderId: "574429497440",
  appId: "1:574429497440:web:fd695d25409f8d16965b05",
  measurementId: "G-KC9QVBB48T"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const analytics = getAnalytics(app);
export const auth = getAuth(app); // Export authentication instance
export const db = getFirestore(app); // Export Firestore instance
export const storage = getStorage(app); // Export Firebase Storage instance
