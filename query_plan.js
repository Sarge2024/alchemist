const admin = require('firebase-admin');
const serviceAccount = require('./sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json'); // I saw this in Alchymist dir

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkPlan() {
  const snapshot = await db.collection('families').doc('f-mock').collection('weeklyPlans').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`Plan ID: ${doc.id}`);
    console.log(`Number of days: ${data.days?.length}`);
    if (data.days) {
      data.days.forEach((day, index) => {
        console.log(`  Day ${index}: ${day.dayName} - ${day.dateStr}`);
      });
    }
  });
  process.exit(0);
}

checkPlan();
