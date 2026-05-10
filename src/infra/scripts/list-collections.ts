import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const serviceAccountPath = path.resolve(process.cwd(), 'sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function listCollections() {
  const collections = await db.listCollections();
  console.log('Collections in database:');
  for (const collection of collections) {
    const snapshot = await collection.limit(1).get();
    console.log(`- ${collection.id} (Documents: ${snapshot.size > 0 ? 'at least 1' : '0'})`);
  }
}

listCollections()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
