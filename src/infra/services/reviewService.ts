/**
 * reviewService.ts
 * Serviço de gestão de avaliações e comentários.
 * Lida com a submissão de reviews, upload de fotos de pratos feitos e 
 * cálculo de estatísticas de avaliação (rating).
 */
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
import { deepSanitize } from './recipeService';

export interface Review {
  id?: string;
  recipeId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  image?: string; // Foto da receita feita pelo usuário
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
        const sanitizedReview = deepSanitize({
          ...review,
          createdAt: serverTimestamp()
        });
        transaction.set(newReviewDocRef, sanitizedReview);

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
   * Remove uma avaliação e atualiza a média da receita.
   */
  async deleteReview(reviewId: string, recipeId: string) {
    const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId);

    try {
      await runTransaction(db, async (transaction) => {
        const reviewDoc = await transaction.get(reviewRef);
        const recipeDoc = await transaction.get(recipeRef);

        if (!reviewDoc.exists() || !recipeDoc.exists()) {
          throw new Error("Documento não encontrado!");
        }

        const reviewData = reviewDoc.data();
        const recipeData = recipeDoc.data();

        const currentRating = recipeData.rating || 0;
        const currentCount = recipeData.reviewsCount || 0;
        const deletedRating = reviewData.rating || 0;

        const newCount = Math.max(0, currentCount - 1);
        let newRating = 4.5; // Default if no reviews left

        if (newCount > 0) {
          newRating = Number(((currentRating * currentCount - deletedRating) / newCount).toFixed(1));
        }

        transaction.delete(reviewRef);
        transaction.update(recipeRef, {
          rating: newRating,
          reviewsCount: newCount,
          updatedAt: serverTimestamp()
        });
      });
      return true;
    } catch (error) {
      console.error("Erro ao remover avaliação:", error);
      throw error;
    }
  },

  /**
   * Atualiza uma avaliação e ajusta a média da receita se a nota mudou.
   */
  async updateReview(reviewId: string, recipeId: string, updates: Partial<Omit<Review, 'id' | 'recipeId' | 'userId' | 'createdAt'>>) {
    const reviewRef = doc(db, REVIEWS_COLLECTION, reviewId);
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId);

    try {
      await runTransaction(db, async (transaction) => {
        const reviewDoc = await transaction.get(reviewRef);
        const recipeDoc = await transaction.get(recipeRef);

        if (!reviewDoc.exists() || !recipeDoc.exists()) {
          throw new Error("Documento não encontrado!");
        }

        const oldReviewData = reviewDoc.data();
        const recipeData = recipeDoc.data();

        // Se a nota mudou, atualiza a média da receita
        if (updates.rating !== undefined && updates.rating !== oldReviewData.rating) {
          const currentRating = recipeData.rating || 0;
          const currentCount = recipeData.reviewsCount || 0;
          const oldRating = oldReviewData.rating || 0;
          const newRatingVal = updates.rating;

          const recipeNewRating = Number(((currentRating * currentCount - oldRating + newRatingVal) / currentCount).toFixed(1));
          
          transaction.update(recipeRef, {
            rating: recipeNewRating,
            updatedAt: serverTimestamp()
          });
        }

        transaction.update(reviewRef, {
          ...deepSanitize(updates),
          updatedAt: serverTimestamp()
        });
      });
      return true;
    } catch (error) {
      console.error("Erro ao atualizar avaliação:", error);
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
        where('recipeId', '==', recipeId)
      );
      
      const querySnapshot = await getDocs(q);
      const reviews = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Review[];

      // Sort in memory to avoid needing a composite index
      return reviews.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      console.error("Erro ao buscar avaliações:", error);
      return [];
    }
  }
};
