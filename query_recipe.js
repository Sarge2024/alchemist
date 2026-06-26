import admin from 'firebase-admin';

// Init using the same way server.ts does, assuming default app
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert('./sagacitas-financeiro-firebase-adminsdk.json'),
  });
}

const db = admin.firestore();

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

run().catch(console.error);
