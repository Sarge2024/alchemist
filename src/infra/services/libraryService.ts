/**
 * libraryService.ts
 * Serviço de infraestrutura para gestão do Acervo Digital.
 * Interface com o Firestore para persistência de itens do acervo (LibraryItem).
 */
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { deepSanitize } from './recipeService';

export type LibraryItemType = 'pdf' | 'ebook' | 'presentation' | 'infographic';

export interface LibraryItem {
  id?: string;
  title: string;
  description: string;
  type: LibraryItemType;
  category: string;
  tags: string[];
  url: string;
  thumbnail?: string;
  author: string;
  createdAt: any;
}

const LIBRARY_COLLECTION = 'library';

export const libraryService = {
  async getItems(): Promise<LibraryItem[]> {
    try {
      const q = query(
        collection(db, LIBRARY_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LibraryItem[];
    } catch (error) {
      console.error("Erro ao buscar itens do acervo:", error);
      return [];
    }
  },

  async addItem(item: Omit<LibraryItem, 'id' | 'createdAt'>) {
    try {
      const sanitizedItem = deepSanitize({
        ...item,
        createdAt: serverTimestamp()
      });
      const docRef = await addDoc(collection(db, LIBRARY_COLLECTION), sanitizedItem);
      return docRef.id;
    } catch (error) {
      console.error("Erro ao adicionar item ao acervo:", error);
      throw error;
    }
  },

  async deleteItem(id: string) {
    try {
      await deleteDoc(doc(db, LIBRARY_COLLECTION, id));
      return true;
    } catch (error) {
      console.error("Erro ao remover item do acervo:", error);
      throw error;
    }
  },

  async updateItem(id: string, item: Partial<LibraryItem>) {
    try {
      const sanitizedItem = deepSanitize(item);
      await updateDoc(doc(db, LIBRARY_COLLECTION, id), sanitizedItem);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar item do acervo:", error);
      throw error;
    }
  }
};
