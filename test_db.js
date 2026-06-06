import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

const serviceAccount = JSON.parse(readFileSync('./service-account.json', 'utf-8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('role', '==', 'chef').get();
  console.log(`Chefs in DB: ${snapshot.size}`);
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}

run();
