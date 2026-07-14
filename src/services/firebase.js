import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDZt6n1QSGLq_PyLDYQlayFwMK0Qv7gpmE",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sujata-inventory.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sujata-inventory",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sujata-inventory.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "527916478889",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:527916478889:web:7043c7d45087ee452bd4b8",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-BC3JXRWDVH"
};

export const appId = import.meta.env.VITE_APP_ID || 'sujata-mastani-inventory';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
