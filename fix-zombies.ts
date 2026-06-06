import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  await updateDoc(doc(db, 'users', 'a1d3bd3b-8055-4d29-b4b1-de858f0891aa'), { role: 'member' });
  await updateDoc(doc(db, 'users', 'c7531690-8b1f-4ef2-9383-0e91d3de78f2'), { role: 'member' });
  console.log('Zombies demoted to member!');
}
run();
