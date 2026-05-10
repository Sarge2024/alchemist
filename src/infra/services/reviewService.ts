import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface Review {
  id?: string;
  recipeId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  createdAt: any;
}

const REVIEWS_COLLECTION = 'reviews';
const RECIPES_COLLECTION = 'recipes';

export const reviewService = {
  /**
   * Adiciona uma nova avaliação e atualiza a média da receita usando transação.
   */
  async addReview(review: Omit<Review, 'id' | 'createdAt'>) {
    const reviewRef = collection(db, REVIEWS_COLLECTION);
    const recipeRef = doc(db, RECIPES_COLLECTION, review.recipeId);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. Obter a receita atual
        const recipeDoc = await transaction.get(recipeRef);
        if (!recipeDoc.exists()) {
          throw new Error("Receita não encontrada!");
        }

        const recipeData = recipeDoc.data();
        const currentRating = recipeData.rating || 0;
        const currentCount = recipeData.reviewsCount || 0;

        // 2. Calcular nova média
        // Nova Média = ((Média Atual * Total Antigo) + Nova Nota) / Novo Total
        const newCount = currentCount + 1;
        const newRating = Number(((currentRating * currentCount + review.rating) / newCount).toFixed(1));

        // 3. Adicionar o documento da review
        const newReviewDocRef = doc(reviewRef);
        transaction.set(newReviewDocRef, {
          ...review,
          createdAt: serverTimestamp()
        });

        // 4. Atualizar a receita com a nova média e contagem
        transaction.update(recipeRef, {
          rating: newRating,
          reviewsCount: newCount,
          updatedAt: serverTimestamp()
        });
      });

      return true;
    } catch (error) {
      console.error("Erro ao adicionar avaliação:", error);
      throw error;
    }
  },

  /**
   * Busca todas as avaliações de uma receita.
   */
  async getRecipeReviews(recipeId: string): Promise<Review[]> {
    try {
      const q = query(
        collection(db, REVIEWS_COLLECTION),
        where('recipeId', '==', recipeId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];
    } catch (error) {
      console.error("Erro ao buscar avaliações:", error);
      return [];
    }
  }
};
