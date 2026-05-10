import { 
  collection, 
  getDocs, 
  query, 
  where,
  orderBy,
  doc,
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { UserProfile } from './userService';

/**
 * MemberService
 * 
 * Gerencia a listagem e moderação de membros (colaboradores/usuários)
 * a partir da coleção 'users' no Firestore.
 * 
 * @layer Infrastructure
 */
export const MemberService = {
  
  /**
   * Lista todos os usuários cadastrados na plataforma.
   * Apenas para uso administrativo.
   */
  async getAllMembers(): Promise<UserProfile[]> {
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ 
        ...doc.data() 
      } as UserProfile));
    } catch (error) {
      console.error('[MemberService] Erro ao listar membros:', error);
      // Fallback para query sem orderBy caso o índice não exista ainda
      const querySnapshot = await getDocs(collection(db, 'users'));
      return querySnapshot.docs.map(doc => ({ 
        ...doc.data() 
      } as UserProfile));
    }
  },

  /**
   * Altera a role de um usuário no Firestore.
   * Nota: A alteração de Custom Claims deve ser feita via API segura (Backend).
   */
  async updateMemberRole(uid: string, role: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        role,
        updatedAt: serverTimestamp()
      });
      
      // Aqui deveríamos chamar a API do backend para atualizar o Custom Claim
      await this.syncCustomClaim(uid, role);
      
      console.log(`[MemberService] Role de ${uid} atualizada para ${role}`);
    } catch (error) {
      console.error('[MemberService] Erro ao atualizar role:', error);
      throw error;
    }
  },

  /**
   * Sincroniza a role do Firestore com os Custom Claims do Firebase Auth
   * através de uma chamada ao nosso backend seguro.
   */
  async syncCustomClaim(uid: string, role: string): Promise<void> {
    const response = await fetch('/api/admin/set-role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
      },
      body: JSON.stringify({ uid, role })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Falha ao sincronizar permissões no Auth');
    }
  }
};
