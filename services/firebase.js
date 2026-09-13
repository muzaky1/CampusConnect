import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyA8ATcn02Io6TH-dxAkeefLj8FrHwkZYC4",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "campusconnect-111.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "campusconnect-111",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "campusconnect-111.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1051360088844",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:1051360088844:web:d51fe4e59cdf9adaa16f29",
};

// Guarded: reuses the existing app on Fast Refresh instead of throwing
// "Firebase App named '[DEFAULT]' already exists".
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Auth already initialized (Fast Refresh / HMR) — reuse it.
  auth = getAuth(app);
}

export { auth };

export const db = getFirestore(app);

export const storage = getStorage(app);

export default app;