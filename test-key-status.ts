import { geminiService } from './src/infra/services/geminiService.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const keys = await geminiService.checkApiKeyStatus(process.env.GEMINI_API_KEY || '');
    console.log('Status for default key:', keys);
  } catch (e) {
    console.error('Error checking key status:', e);
  }
}

run();
