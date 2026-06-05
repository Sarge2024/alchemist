/**
 * userService.ts
 * Gestão de perfis e identidades de usuários.
 * Gerencia a persistência de perfis, atribuição de papéis (roles) 
 * e geração de e-mails internos automáticos.
 */
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { OperationType } from './recipeService';

export type UserRole = 'member' | 'collaborator' | 'chef' | 'admin';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  whatsapp?: string;
  city?: string;
  state: string;
  country: string;
  role: UserRole;
  internalEmail?: string;
  createdAt?: any;
  updatedAt?: any;
}

const USERS_COLLECTION = 'users';

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('User Service Error:', errInfo);
  throw new Error(`Erro no serviço de usuário: ${errInfo.error}`);
}

export const userService = {
  async getUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const docRef = doc(db, USERS_COLLECTION, uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${USERS_COLLECTION}/${uid}`);
      return null;
    }
  },

  async createUserProfile(profile: UserProfile) {
    try {
      const docRef = doc(db, USERS_COLLECTION, profile.uid);
      
      // Generate internal email if not present
      let internalEmail = profile.internalEmail;
      if (!internalEmail) {
        const cleanName = profile.displayName
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, '.');
        internalEmail = `${cleanName}@alquimiadoprato.com.br`;
      }

      await setDoc(docRef, {
        ...profile,
        internalEmail,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `${USERS_COLLECTION}/${profile.uid}`);
    }
  },

  async updateUserProfile(uid: string, profile: Partial<UserProfile>) {
    try {
      const docRef = doc(db, USERS_COLLECTION, uid);
      // Usamos setDoc com merge: true para evitar erro caso o documento não exista
      await setDoc(docRef, {
        ...profile,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${USERS_COLLECTION}/${uid}`);
    }
  }
};
