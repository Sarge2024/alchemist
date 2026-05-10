/**
 * firebaseAdmin (Vercel Serverless)
 *
 * Módulo utilitário para inicializar o Firebase Admin SDK em ambiente serverless.
 * Utiliza variáveis de ambiente do Vercel em vez de arquivos JSON de credencial.
 *
 * Variáveis obrigatórias no painel Vercel:
 *   - FIREBASE_PROJECT_ID
 *   - FIREBASE_CLIENT_EMAIL
 *   - FIREBASE_PRIVATE_KEY (com quebras de linha escapadas como \\n)
 *
 * @layer Infrastructure (Serverless)
 */
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/**
 * Inicializa o Firebase Admin apenas uma vez (singleton).
 * Em ambiente serverless, múltiplas invocações podem reutilizar a mesma instância.
 */
function initAdmin() {
  if (getApps().length > 0) {
    return; // Já inicializado — reutiliza a instância existente
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error("[Admin Serverless] Variáveis de ambiente do Firebase não configuradas.");
    throw new Error("Credenciais do Firebase Admin ausentes no ambiente Vercel.");
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId,
  });

  console.log(`[Admin Serverless] Firebase Admin inicializado para: ${projectId}`);
}

// Executa a inicialização ao importar o módulo
initAdmin();

/** Instância do Firestore pronta para uso */
export const db = getFirestore();

/** Referência ao FieldValue para operações como serverTimestamp() */
export { FieldValue };
