// Studio Cris Fergabi — js/firebase-init.js
// Inicializa o Firebase (Firestore + Authentication) usando o SDK modular via CDN.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBdhMgjBSvXDWs2w_nHCPZFfWtk0hFL72s",
  authDomain: "salao-agatha.firebaseapp.com",
  projectId: "salao-agatha",
  storageBucket: "salao-agatha.firebasestorage.app",
  messagingSenderId: "558510147184",
  appId: "1:558510147184:web:192dddb17f77a61aa896b5",
  measurementId: "G-LC9VG5J519"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
