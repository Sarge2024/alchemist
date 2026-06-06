/**
 * recipeService.ts
 * Core de dados para a gestão de receitas.
 * Implementa CRUD, filtragem por categoria/dificuldade e integração com o sistema de scraping.
 */
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { geminiService } from './geminiService';
import { ASSETS } from '../../lib/assets';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error Details:', errInfo);
  throw new Error(`Firestore operation failed: ${errInfo.error}`);
}

/**
 * Recursively removes undefined values from an object or array
 * to prevent Firestore "Unsupported field value: undefined" errors.
 */
export function deepSanitize<T>(obj: T): T {
  if (obj === undefined) return null as any;
  if (obj === null || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj
      .filter(item => item !== undefined)
      .map(item => deepSanitize(item)) as any;
  }

  const result: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = (obj as any)[key];
      if (value !== undefined) {
        result[key] = deepSanitize(value);
      }
    }
  }
  return result;
}

export function generateSlug(text: string): string {
  if (!text) return '';
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\\u0300-\\u036f]/g, "") // Remove acentos
    .replace(/\\s+/g, '-')           // Replace spaces with -
    .replace(/[^\\w\\-]+/g, '')       // Remove all non-word chars
    .replace(/\\-\\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start of text
    .replace(/-+$/, '');            // Trim - from end of text
}

export interface Ingredient {
  name: string;
  quantity: string;
  group?: string;
}

export interface Recipe {
  id?: string;
  slug?: string;
  title: string;
  description?: string;
  image?: string;
  momento: string[];
  tipo_prato: string[];
  base_alimento: string[];
  origem?: string;
  time?: string;
  prepTime?: string;
  dietType?: string;
  servings?: string;
  difficulty?: string;
  custo_estimado?: string;
  ingredients: (string | Ingredient)[];
  instructions: string[];
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
  rating?: number;
  reviewsCount?: number;
  isClassic?: boolean;
  imageOptions?: string[];
  chefTips?: string;
  faqs?: { question: string, answer: string }[];
}

const RECIPES_COLLECTION = 'recipes';

export const recipeService = {
  async createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>, options: { notifyEmail: boolean } = { notifyEmail: true }) {
    try {
      const sanitizedRecipe = deepSanitize(recipe);
      
      // Gera o slug baseado no título
      let slug = generateSlug(sanitizedRecipe.title);
      // Opcional: checar se já existe e adicionar hash, mas para simplificar:
      slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
      
      const docRef = await addDoc(collection(db, RECIPES_COLLECTION), {
        ...sanitizedRecipe,
        slug,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        rating: 0, // Initial rating
        reviewsCount: 0
      });

      // Promoção automática para Colaborador
      if (recipe.ownerId) {
        const userRef = doc(db, 'users', recipe.ownerId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.role === 'member' || !userData.role) {
            await updateDoc(userRef, { 
              role: 'collaborator',
              updatedAt: serverTimestamp() 
            });
          }
        }
      }

      // Notificação de Nova Receita (Post no Lounge e E-mail para membros)
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const memberEmails = usersSnapshot.docs
          .map(userDoc => userDoc.data().email)
          .filter(email => !!email);
          
        let authorName = 'Um Alquimista';
        if (recipe.ownerId) {
          const userSnap = await getDoc(doc(db, 'users', recipe.ownerId));
          if (userSnap.exists()) {
            authorName = userSnap.data().displayName || userSnap.data().name || authorName;
          }
        }

        // Post no Lounge (Sempre envia ao publicar)
        await addDoc(collection(db, 'lounge_messages'), {
          text: `${authorName}, publicou nova receita ${sanitizedRecipe.title}.`,
          senderId: 'system',
          senderName: 'Alquimia do Prato',
          senderRole: 'admin',
          status: 'approved',
          timestamp: serverTimestamp(),
          reactions: {},
          metadata: {
            type: 'new_recipe',
            recipeId: docRef.id
          }
        });

        // Email via Trigger Email Extension (collection 'mail') - OPCIONAL
        if (options.notifyEmail && memberEmails.length > 0) {
          await addDoc(collection(db, 'mail'), {
            to: memberEmails,
            message: {
              from: '"Mestre Alquemista" <alchemist.master1998@gmail.com>',
              subject: `Nova Receita no Alquimia: ${sanitizedRecipe.title}`,
              html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                  <h2 style="color: #d97706;">Olá Alquimista!</h2>
                  <p>Uma nova receita acabou de ser publicada em nossa comunidade pelo alquimista <strong>${authorName}</strong>:</p>
                  <div style="background-color: #fff7ed; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #9a3412;">${sanitizedRecipe.title}</h3>
                    <p>${sanitizedRecipe.description || 'Uma deliciosa nova criação culinária aguarda por você.'}</p>
                  </div>
                  <p>Acesse o <strong>Alquimia do Prato</strong> para conferir os detalhes, ingredientes e modo de preparo.</p>
                  <br/>
                  <p>Abraços,<br/><strong>Equipe Alquimia do Prato</strong></p>
                </div>
              `
            }
          });
        }
      } catch (notifyError) {
        console.error('Falha ao enviar notificações de nova receita:', notifyError);
      }

      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, RECIPES_COLLECTION);
    }
  },

  async updateRecipe(id: string, recipe: Partial<Recipe>) {
    try {
      const sanitizedRecipe = deepSanitize(recipe);
      // Remove id from payload to avoid overwriting doc.id or storing it as a field
      const { id: _, ...dataToUpdate } = sanitizedRecipe as any;
      
      if (dataToUpdate.title && !dataToUpdate.slug) {
        // Only update slug if title changes and no specific slug was provided
        dataToUpdate.slug = `${generateSlug(dataToUpdate.title)}-${Math.random().toString(36).substring(2, 8)}`;
      }
      
      const docRef = doc(db, RECIPES_COLLECTION, id);
      await updateDoc(docRef, {
        ...dataToUpdate,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `${RECIPES_COLLECTION}/${id}`);
    }
  },

  async deleteRecipe(id: string) {
    try {
      const docRef = doc(db, RECIPES_COLLECTION, id);
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${RECIPES_COLLECTION}/${id}`);
    }
  },

  async getRecipe(id: string): Promise<Recipe | null> {
    try {
      const docRef = doc(db, RECIPES_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { ...docSnap.data(), id: docSnap.id } as Recipe;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `${RECIPES_COLLECTION}/${id}`);
      return null;
    }
  },

  async getRecipeBySlug(slug: string): Promise<Recipe | null> {
    try {
      const q = query(collection(db, RECIPES_COLLECTION), where('slug', '==', slug), limit(1));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { ...doc.data(), id: doc.id } as Recipe;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar receita por slug:', error);
      return null;
    }
  },

  async getAllRecipes(): Promise<Recipe[]> {
    try {
      // Fetch everything without ordering to avoid index/permission issues
      const querySnapshot = await getDocs(collection(db, RECIPES_COLLECTION));
      const recipes = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Recipe));
      
      // Sort in memory by createdAt desc
      return recipes.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, RECIPES_COLLECTION);
      return [];
    }
  },

  async getRecipesByMomento(momento: string): Promise<Recipe[]> {
    try {
      const q = query(
        collection(db, RECIPES_COLLECTION), 
        where('momento', 'array-contains', momento),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Recipe));
    } catch (error) {
      console.warn('Momento query with orderBy failed, falling back to client-side filter:', error);
      try {
        const recipes = await this.getAllRecipes();
        return recipes.filter(r => r.momento && r.momento.includes(momento));
      } catch (innerError) {
        handleFirestoreError(innerError, OperationType.LIST, RECIPES_COLLECTION);
        return [];
      }
    }
  },

  async getUserRecipes(userId: string): Promise<Recipe[]> {
    try {
      const q = query(
        collection(db, RECIPES_COLLECTION), 
        where('ownerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Recipe));
    } catch (error) {
      console.warn('User query with orderBy failed, falling back to client-side filter:', error);
      try {
        const recipes = await this.getAllRecipes();
        return recipes.filter(r => r.ownerId === userId);
      } catch (innerError) {
        handleFirestoreError(innerError, OperationType.LIST, RECIPES_COLLECTION);
        return [];
      }
    }
  },

  async seedRecipes(userId: string) {
    const seeds: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        title: 'Tapioca Rendada com Queijo Coalho',
        description: 'Uma versão gourmet da tradicional tapioca, com uma crosta crocante de queijo que derrete na boca.',
        momento: ['Café da Manhã'],
        tipo_prato: ['Grelhados'],
        base_alimento: ['Ovos e Laticínios', 'Grãos e Leguminosas'],
        origem: 'Brasileira',
        time: '12 min',
        difficulty: 'Fácil',
        custo_estimado: '$',
        servings: '1',
        rating: 4.9,
        reviewsCount: 45,
        image: ASSETS.MOCKS.TAPIOCA,
        ingredients: [
          { name: 'goma de tapioca peneirada', quantity: '100g' },
          { name: 'queijo coalho ralado grosso', quantity: '50g' },
          { name: 'Manteiga de garrafa para finalizar', quantity: 'a gosto' },
          { name: 'Recheio de sua preferência (coco, queijo ou carne de sol)', quantity: '' }
        ],
        instructions: [
          'Aqueça uma frigideira antiaderente em fogo médio.',
          'Espalhe o queijo coalho ralado por toda a superfície da frigideira até formar uma camada fina.',
          'Assim que o queijo começar a derreter, peneire a goma de tapioca por cima do queijo.',
          'Espere a tapioca "grudar" no queijo e formar a massa única.',
          'Vire a tapioca para dourar levemente o lado da massa.',
          'Adicione o recheio escolhido, dobre ao meio e finalize com um fio de manteiga de garrafa.'
        ],
        ownerId: userId,
        isClassic: true
      },
      {
        title: 'Feijoada Completa Tradicional',
        description: 'O prato mais emblemático do Brasil, preparado com carnes selecionadas e cozido lentamente para atingir perfeição.',
        momento: ['Almoço'],
        tipo_prato: ['Cozidos / Guisados'],
        base_alimento: ['Carnes', 'Grãos e Leguminosas'],
        origem: 'Brasileira',
        time: '3h 00min',
        difficulty: 'Médio',
        custo_estimado: '$$',
        servings: '6',
        rating: 5.0,
        reviewsCount: 128,
        image: ASSETS.MOCKS.FEIJOADA,
        ingredients: [
          { name: 'feijão preto', quantity: '500g' },
          { name: 'carne seca', quantity: '200g' },
          { name: 'lombo salgado', quantity: '200g' },
          { name: 'paio', quantity: '100g' },
          { name: 'linguiça calabresa', quantity: '100g' },
          { name: 'Arroz branco, couve e farofa para acompanhar', quantity: 'a gosto' }
        ],
        instructions: [
          'Deixe as carnes salgadas de molho por 24h trocando a água.',
          'Cozinhe o feijão com as carnes mais duras primeiro.',
          'Adicione as carnes mais macias e as linguiças no meio do processo.',
          'Faça um refogado com alho, cebola e um pouco do caldo da feijoada e retorne à panela.',
          'Deixe apurar o caldo até engrossar.',
          'Sirva with os acompanhamentos tradicionais.'
        ],
        ownerId: userId,
        isClassic: true
      },
      {
        title: 'Salmão com Crosta de Ervas',
        description: 'Uma opção leve e sofisticada para o jantar. O salmão suculento contrasta perfeitamente com a crosta de ervas e cítricos.',
        momento: ['Jantar'],
        tipo_prato: ['Assados'],
        base_alimento: ['Frutos do Mar'],
        origem: 'Europeia',
        time: '25 min',
        difficulty: 'Fácil',
        custo_estimado: '$$$',
        servings: '2',
        rating: 4.8,
        reviewsCount: 67,
        image: ASSETS.MOCKS.SALMON,
        ingredients: [
          { name: 'Filés de salmão', quantity: '2' },
          { name: 'Salsa e alecrim picados', quantity: 'a gosto' },
          { name: 'Raspas de limão siciliano', quantity: 'a gosto' },
          { name: 'Azeite de oliva extra virgem', quantity: 'a gosto' },
          { name: 'Sal e pimenta a gosto', quantity: '' }
        ],
        instructions: [
          'Tempere os filés with sal e pimenta.',
          'Misture as ervas com as raspas de limão e um pouco de azeite.',
          'Pressione a mistura sobre o topo dos filés de salmão.',
          'Leve ao forno pré-aquecido a 200°C por cerca de 12-15 minutos.',
          'Sirva com legumes grelhados ou uma salada verde fresca.'
        ],
        ownerId: userId
      },
      {
        title: 'Pudim de Leite Condensado',
        description: 'O clássico dos domingos brasileiros. Textura aveludada, sem furinhos e uma calda de caramelo brilhante.',
        momento: ['Lanche / Chá da Tarde', 'Ceia'],
        tipo_prato: ['Doces e Sobremesas'],
        base_alimento: ['Ovos e Laticínios'],
        origem: 'Brasileira',
        time: '1h 30min',
        difficulty: 'Médio',
        custo_estimado: '$',
        servings: '8',
        rating: 4.9,
        reviewsCount: 210,
        image: ASSETS.MOCKS.BRUNCH,
        ingredients: [
          { name: 'leite condensado', quantity: '1 lata' },
          { name: 'leite integral', quantity: '2 latas' },
          { name: 'ovos', quantity: '3' },
          { name: 'açúcar para a calda', quantity: '1 xícara' }
        ],
        instructions: [
          'Prepare a calda derretendo o açúcar na forma de pudim até dourar.',
          'Bata no liquidificador o leite condensado, o leite e os ovos.',
          'Despeje a mistura na forma caramelizada.',
          'Cozinhe em banho-maria no forno por cerca de 1 hora.',
          'Deixe esfriar e leve à geladeira por pelo menos 4 horas antes de desenformar.'
        ],
        ownerId: userId,
        isClassic: true
      }
    ];

    try {
      const promises = seeds.map(s => this.createRecipe(s));
      await Promise.all(promises);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, RECIPES_COLLECTION);
    }
  },

  async scrapeRecipe(url: string): Promise<Partial<Recipe>> {
    const response = await fetch('/api/fetch-html', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
      },
      body: JSON.stringify({ url })
    });

    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      console.error('Failed to parse proxy response as JSON:', e);
      // If parsing fails (e.g. redirected to HTML page), fallback to URL only
      return await geminiService.extractRecipeFromHtml("", { url });
    }
    
    if (!responseData.success) {
      console.warn(`Scraping direct fetch failed: ${responseData.error || 'Unknown error'}. Attempting search-based extraction for: ${url}`);
      return await geminiService.extractRecipeFromHtml("", { url });
    }

    const { html, metaDescription, ogImage, allImagesFound } = responseData;
    const scrapedRecipe = await geminiService.extractRecipeFromHtml(html, { metaDescription, ogImage, allImagesFound });

    return scrapedRecipe;
  }
};
