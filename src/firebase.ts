import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyA6sZ8C4m6I_BddWBJgtXWZVQHRIBQkRgM",
  authDomain: "mindcare-cd076.firebaseapp.com",
  projectId: "mindcare-cd076",
  storageBucket: "mindcare-cd076.firebasestorage.app",
  messagingSenderId: "1071010511598",
  appId: "1:1071010511598:web:1f2c7589fc593157ca91ff",
  measurementId: "G-1SBM73YF9W"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;


