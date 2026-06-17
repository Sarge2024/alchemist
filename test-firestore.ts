import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json', 'utf8'));

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
