import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = require('./sagacitas-financeiro-firebase-adminsdk-327c1-2dd675f32a.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const snapshot = await db.collection('library').get();
  console.log(`Found ${snapshot.size} items in Firestore 'library' collection`);
  snapshot.forEach(doc => {
    console.log(doc.id, doc.data().title);
  });
}

run();
