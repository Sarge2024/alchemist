import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
async function run() {
  const snapshot = await db.collection('recipes').get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.title && data.title.toLowerCase().includes('apfel')) {
      console.log('Found:', data.title);
      console.log('Ingredients:', JSON.stringify(data.ingredients, null, 2));
    }
  }
}
run();
