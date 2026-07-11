const admin = require('firebase-admin');
const serviceAccount = require('./sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  const families = await db.collection('families').get();
  console.log(`Found ${families.docs.length} families.`);
  for (const doc of families.docs) {
    console.log(`- ${doc.id}`);
    const plans = await db.collection('families').doc(doc.id).collection('weeklyPlans').get();
    console.log(`  Found ${plans.docs.length} weekly plans for this family.`);
    plans.forEach(p => {
      const days = p.data().days || [];
      console.log(`    Plan: ${p.id}, days length: ${days.length}`);
      days.forEach(d => console.log(`      ${d.dayName} - ${d.dateStr}`));
    });
  }
  process.exit(0);
}

check();
