import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = {
  // We can't easily read the json if path is wrong, but wait, the file is in the root directory!
  // Let's use standard fs to read it
};
