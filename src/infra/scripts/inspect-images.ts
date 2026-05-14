import "dotenv/config";
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const serviceAccountPath = path.resolve(process.cwd(), 'sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');

let firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let credential;
if (fs.existsSync(serviceAccountPath)) {
  credential = cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')));
}

initializeApp({
  projectId: firebaseConfig.projectId,
  ...(credential ? { credential } : {})
});

const db = getFirestore();

async function inspectImages() {
  const recipesSnapshot = await db.collection('recipes').get();
  console.log(`--- Analisando ${recipesSnapshot.size} Receitas ---`);
  
  recipesSnapshot.docs.forEach(doc => {
    const data = doc.data();
    console.log(`[${doc.id}] "${data.title}": ${data.image}`);
  });
}

inspectImages().catch(console.error);
