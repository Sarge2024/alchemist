/**
 * loungeService.ts
 * Serviço de infraestrutura para o Lounge Gastronômico.
 * Gerencia a troca de mensagens em tempo real, reações, votações em atas e moderação.
 */
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc,
  increment,
  setDoc,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';

export interface LoungeMessage {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  senderRole: string;
  timestamp: any;
  status: 'pending' | 'approved' | 'rejected';
  reactions: Record<string, boolean>;
  metadata?: any;
}

export interface DailyAta {
  id: string;
  date: string;
  groupName: string;
  topics: {
    title: string;
    summary: string;
    consensus: string;
    votes?: Record<string, boolean>;
  }[];
  insights: {
    termoDestaque: {
      termo: string;
      explicacao: string;
    };
    dicaDoChef: string;
  };
  referencias: {
    artigo: string;
    ebook: string;
  };
  termometro: {
    clima: string;
    participacao: number;
    destaqueDoDia: string;
  };
  stats: {
    totalMessages: number;
  };
  createdAt: any;
}


/**
 * Serviço do lado do cliente para interações com o Lounge Gastronômico.
 */
export const loungeService = {
  /**
   * Assina (listen) as mensagens aprovadas em tempo real.
   * @param callback Função chamada a cada atualização de mensagens.
   */
  subscribeToMessages(callback: (messages: LoungeMessage[]) => void) {
    const q = query(
      collection(db, 'lounge_messages'),
      where('status', '==', 'approved')
      // Removido orderBy('timestamp', 'asc') para evitar a necessidade de um Índice Composto no Firestore.
      // A ordenação será feita localmente no client.
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LoungeMessage[];
      
      // Ordenação local para garantir a cronologia sem exigir Índice no Firebase
      messages.sort((a, b) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeA - timeB;
      });
      
      callback(messages);
    });
  },

  /**
   * Assina (listen) os resumos diários (Atas) em tempo real.
   * @param callback Função chamada a cada atualização das atas.
   */
  subscribeToAtas(callback: (atas: DailyAta[]) => void) {
    const q = query(
      collection(db, 'daily_summaries'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const atas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DailyAta[];
      callback(atas);
    });
  },

  /**
   * Alterna a reação (curtida) de uma mensagem.
   */
  async toggleReaction(messageId: string, userId: string, currentReactions: Record<string, boolean>) {
    const docRef = doc(db, 'lounge_messages', messageId);
    const newReactions = { ...currentReactions };
    
    if (newReactions[userId]) {
      delete newReactions[userId];
    } else {
      newReactions[userId] = true;
    }

    await updateDoc(docRef, { reactions: newReactions });
  },

  /**
   * Vota em um tópico específico dentro de uma Ata.
   */
  async voteOnAtaTopic(ataId: string, topicIndex: number, userId: string) {
    const docRef = doc(db, 'daily_summaries', ataId);
    const voteKey = `topics.${topicIndex}.votes.${userId}`;
    
    await updateDoc(docRef, {
      [voteKey]: true
    });
  },


  /**
   * Envia uma mensagem via API para disparar a moderação automática por IA.
   */
  async sendMessage(text: string, senderId: string, senderRole: string, senderName?: string, metadata?: any) {
    const apiKey = import.meta.env.VITE_APP_API_KEY;
    
    const response = await fetch('/api/lounge/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey || ''
      },
      body: JSON.stringify({
        text,
        senderId,
        senderRole,
        senderName,
        metadata
      })
    });

    if (!response.ok) {
      throw new Error('Falha ao enviar mensagem');
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.error);
    return data;
  },

  /**
   * Remove uma mensagem (Acesso do Autor ou Admin).
   */
  async deleteMessage(messageId: string) {
    const docRef = doc(db, 'lounge_messages', messageId);
    await deleteDoc(docRef);
  },

  /**
   * Atualiza o texto de uma mensagem (Acesso do Autor).
   */
  async updateMessage(messageId: string, newText: string) {
    const docRef = doc(db, 'lounge_messages', messageId);
    await updateDoc(docRef, { 
      text: newText,
      updatedAt: new Date(), // Local date is fine for display
      isEdited: true
    });
  },

  /**
   * Recupera todas as mensagens para moderação admin.
   */
  async getAllMessagesForAdmin() {
    const q = query(
      collection(db, 'lounge_messages'),
      orderBy('timestamp', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as LoungeMessage[];
  }
};
