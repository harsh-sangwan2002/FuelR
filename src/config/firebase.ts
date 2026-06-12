import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import { getReactNativePersistence } from '@firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace all placeholder values with your Firebase project credentials.
// Firebase Console → Project Settings → Your Apps → SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyC4IzhaNVqZm-Bx1W3oVkUjT457ssUU9wY",
  authDomain: "fuelr-11783.firebaseapp.com",
  projectId: "fuelr-11783",
  storageBucket: "fuelr-11783.firebasestorage.app",
  messagingSenderId: "665536737284",
  appId: "1:665536737284:web:d9d0f78723d5ec74148551",
  measurementId: "G-Q7VEKVY5PJ"
};

const app = initializeApp(firebaseConfig);

// initializeAuth with AsyncStorage persistence keeps users logged in across app restarts.
// NOTE: We intentionally avoid email-link (magic-link) auth because Firebase Dynamic Links
//       has been deprecated. Only email/password and OAuth flows are used here.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
