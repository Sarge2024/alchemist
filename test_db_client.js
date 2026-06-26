import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Load client config from .env or construct from vite env
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "sagacitas-financeiro.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "sagacitas-financeiro",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "sagacitas-financeiro.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:123456:web:123456"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const snapshot = await getDocs(collection(db, 'recipes'));
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.title && data.title.toLowerCase().includes('apfel')) {
      console.log('Found:', data.title);
      console.log('Portions:', data.portions);
      console.log('Ingredients:', JSON.stringify(data.ingredients, null, 2));
    }
  }
  process.exit(0);
}
run().catch(console.error);
