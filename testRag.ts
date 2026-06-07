import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import path from 'path';
import { RagBackendService } from './src/infra/services/ragBackendService';

const serviceAccountPath = path.resolve(process.cwd(), 'sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');
try {
  initializeApp({
    credential: cert(serviceAccountPath)
  });
} catch (e) {
  // Ignore if already initialized
}

async function test() {
  try {
    await RagBackendService.syncRecipesToPostgreSQL();
    const res = await RagBackendService.askGeminiWithContext("existe receita de torta?");
    console.log("SUCCESS:", res);
  } catch (e) {
    console.error("ERROR:", e);
  }
}

test();
