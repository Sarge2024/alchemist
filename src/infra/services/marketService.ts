import { db } from '../../lib/firebase';
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, query, where, arrayUnion } from 'firebase/firestore';
import { userService } from './userService';

export interface MarketItem {
  id?: string;
  nome: string;
  tipo: string;
  descricao: string;
  custoXP: number;
  custoMoedas: number;
  icone: string;
  cor: string;
  bg: string;
  ativo: boolean;
}

const MARKET_COLLECTION = 'market_items';

export const marketService = {
  async getItems(): Promise<MarketItem[]> {
    const q = query(collection(db, MARKET_COLLECTION), where('ativo', '==', true));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketItem));
  },

  async getAllItemsForAdmin(): Promise<MarketItem[]> {
    const querySnapshot = await getDocs(collection(db, MARKET_COLLECTION));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketItem));
  },

  async saveItem(item: MarketItem): Promise<string> {
    const itemRef = item.id ? doc(db, MARKET_COLLECTION, item.id) : doc(collection(db, MARKET_COLLECTION));
    const itemData = { ...item };
    if (!item.id) {
      itemData.id = itemRef.id;
    }
    await setDoc(itemRef, itemData, { merge: true });
    return itemRef.id;
  },

  async deleteItem(id: string): Promise<void> {
    const itemRef = doc(db, MARKET_COLLECTION, id);
    await updateDoc(itemRef, { ativo: false });
  },

  async buyItem(uid: string, itemId: string): Promise<{ success: boolean; message: string }> {
    // Busca o item
    const itemRef = doc(db, MARKET_COLLECTION, itemId);
    const itemSnap = await getDoc(itemRef);
    if (!itemSnap.exists()) {
      return { success: false, message: 'Item não encontrado.' };
    }
    const item = itemSnap.data() as MarketItem;

    if (!item.ativo) {
      return { success: false, message: 'Item indisponível no momento.' };
    }

    // Busca o usuário
    const userProfile = await userService.getUserProfile(uid);
    if (!userProfile) {
      return { success: false, message: 'Usuário não encontrado.' };
    }

    const moedas = userProfile.moedas || 0;
    const inventory = userProfile.inventory || [];

    if (inventory.includes(itemId)) {
      return { success: false, message: 'Você já possui este item.' };
    }

    if (moedas < item.custoMoedas) {
      return { success: false, message: 'Moedas insuficientes.' };
    }

    // Processa a compra: debita moedas, adiciona ao inventário
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      moedas: moedas - item.custoMoedas,
      inventory: arrayUnion(itemId)
    });

    return { success: true, message: 'Compra realizada com sucesso!' };
  }
};
