import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

initializeApp({
  projectId: config.projectId
});

const db = getFirestore();

async function checkRecipes() {
  const snapshot = await db.collection('recipes').get();
  console.log(`Total recipes found: ${snapshot.size}`);
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}, Title: ${data.title}, Owner: ${data.ownerId}`);
  });
}

checkRecipes().catch(console.error);
