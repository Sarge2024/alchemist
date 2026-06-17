import { MemberService } from './src/infra/services/MemberService';
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' assert { type: 'json' };

const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function run() {
  const members = await MemberService.getAllMembers();
  const chefs = members.filter(m => m.isChef === true);
  console.log(`Found ${chefs.length} chefs out of ${members.length} total members.`);
  chefs.forEach(c => console.log(c.uid, c.displayName, c.role));
}
run();
