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
      // Usamos query simples sem orderBy para evitar que usuários SEM a propriedade 'createdAt'
      // sejam silenciosamente omitidos pelo Firestore (comportamento padrão de índices)
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      
      const members = querySnapshot.docs.map(doc => ({ 
        uid: doc.id,
        ...doc.data() 
      } as UserProfile));

      // Ordenação local (descendente)
      return members.sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
      });
    } catch (error) {
      console.error('[MemberService] Erro ao listar membros:', error);
      throw error;
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
   * Altera apenas a flag de Chef de um usuário no Firestore.
   */
  async updateMemberChefStatus(uid: string, isChef: boolean): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        isChef,
        updatedAt: serverTimestamp()
      });
      console.log(`[MemberService] Status isChef de ${uid} atualizado para ${isChef}`);
    } catch (error) {
      console.error('[MemberService] Erro ao atualizar status de Chef:', error);
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
