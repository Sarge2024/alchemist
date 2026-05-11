import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function initAdmin() {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Variáveis de ambiente do Firebase não configuradas no .env");
    process.exit(1);
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });
}

initAdmin();
const db = getFirestore();

async function checkRecentMail() {
  console.log("Verificando documentos recentes na coleção 'mail'...");
  const snapshot = await db.collection('mail').orderBy('message.subject', 'desc').limit(5).get();
  
  if (snapshot.empty) {
    console.log("Nenhum e-mail encontrado na coleção 'mail'.");
    return;
  }

  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`- ID: ${doc.id}`);
    console.log(`  Para: ${data.to}`);
    console.log(`  Assunto: ${data.message?.subject}`);
    console.log(`  Remetente: ${data.message?.from}`);
    console.log('---');
  });
}

checkRecentMail().catch(console.error);
