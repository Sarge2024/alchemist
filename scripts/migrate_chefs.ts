import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serviceAccountPath = path.resolve(process.cwd(), 'sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function migrate() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.where('role', '==', 'chef').get();
  
  if (snapshot.empty) {
    console.log('No users found with role "chef".');
    return;
  }

  const batch = db.batch();
  let count = 0;
  snapshot.docs.forEach(doc => {
    console.log(`Migrating user ${doc.id} (${doc.data().displayName})`);
    batch.update(doc.ref, {
      role: 'collaborator',
      isChef: true
    });
    count++;
  });

  await batch.commit();
  console.log(`Migration complete. Updated ${count} users.`);
}

migrate().catch(console.error);
