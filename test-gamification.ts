import { adminDb } from './src/infra/firebase/admin';
import { GamificationService } from './src/infra/services/GamificationService';

async function run() {
  const usersSnapshot = await adminDb.collection('users').get();
  console.log('Total users:', usersSnapshot.size);
  usersSnapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ${data.displayName || data.name || 'Unknown'} (ID: ${doc.id})`);
  });
}

run().catch(console.error);
