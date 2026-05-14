/**
 * firebase.ts
 * Configuração e inicialização do Firebase SDK.
 * Exporta as instâncias de Auth e Firestore (db) utilizadas em todo o sistema.
 * Inclui validação básica de conexão no carregamento.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
export const googleProvider = new GoogleAuthProvider();

// Validate Connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection established successfully.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('permission-denied')) {
        console.log("Firebase connection verified (Permission Denied as expected on test path).");
      } else if (error.message.includes('the client is offline')) {
        console.error("Firebase connection failed: Client is offline.");
      } else {
        console.warn("Firebase connection status unknown:", error.message);
      }
    }
  }
}

testConnection();
