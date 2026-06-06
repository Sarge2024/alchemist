import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const snapshot = await getDocs(collection(db, 'users'));
  console.log(`Total users: ${snapshot.size}`);
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.role === 'chef') {
      console.log(`CHEF FOUND: ${doc.id}`, data);
    } else {
      console.log(`User: ${doc.id} | Role: ${data.role} | Name: ${data.displayName}`);
    }
  });
}
run();
