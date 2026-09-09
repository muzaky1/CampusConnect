import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyA8ATcn02Io6TH-dxAkeefLj8FrHwkZYC4",
  authDomain: "campusconnect-111.firebaseapp.com",
  projectId: "campusconnect-111",
  storageBucket: "campusconnect-111.firebasestorage.app",
  messagingSenderId: "1051360088844",
  appId: "1:1051360088844:web:d51fe4e59cdf9adaa16f29",
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);

export default app;