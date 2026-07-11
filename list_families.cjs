const admin = require('firebase-admin');
const serviceAccount = require('./sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function check() {
  const snapshot = await db.collection('families').get();
  for (const doc of snapshot.docs) {
    console.log(`Family: ${doc.id}`);
    const plans = await db.collection('families').doc(doc.id).collection('weeklyPlans').get();
    plans.forEach(p => {
      console.log(`  Plan ID: ${p.id}, days length: ${p.data().days?.length}`);
      if (p.data().days) {
        p.data().days.forEach((day, index) => {
          console.log(`    Day ${index}: ${day.dayName} - ${day.dateStr}`);
        });
      }
    });
  }
  process.exit(0);
}

check();
