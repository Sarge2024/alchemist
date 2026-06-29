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
  preparationMode?: string;
  preparationTime?: string;
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
  equipment?: string[];
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

const getAuthHeaders = async () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = await auth.currentUser?.getIdToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

const mapRecipeResponse = (recipe: any): any => {
  if (!recipe) return null;
  return {
    ...recipe,
    // Garante que o ownerId esteja preenchido para compatibilidade com verificações de propriedade
    ownerId: recipe.author ? recipe.author.uid : recipe.ownerId,
    ingredients: Array.isArray(recipe.ingredients)
      ? recipe.ingredients.map((ing: any) => ({
          name: ing.name,
          quantity: ing.quantity ? `${ing.quantity} ${ing.unit || ''}`.trim() : '',
          group: ing.preparationMode || ing.category || 'Geral'
        }))
      : []
  };
};

export const recipeService = {
  async createRecipe(recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>, options: { notifyEmail: boolean } = { notifyEmail: true }) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers,
        body: JSON.stringify(recipe)
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao criar receita');
      }
      const data = await response.json();
      
      // Notificação opcional no Lounge local (Firestore)
      try {
        let authorName = 'Um Alquimista';
        if (recipe.ownerId) {
          const userSnap = await getDoc(doc(db, 'users', recipe.ownerId));
          if (userSnap.exists()) {
            authorName = userSnap.data().displayName || userSnap.data().name || authorName;
          }
        }
        await addDoc(collection(db, 'lounge_messages'), {
          text: `${authorName}, publicou nova receita ${recipe.title}.`,
          senderId: 'system',
          senderName: 'Alquimia do Prato',
          senderRole: 'admin',
          status: 'approved',
          timestamp: serverTimestamp(),
          reactions: {},
          metadata: {
            type: 'new_recipe',
            recipeId: data.id
          }
        });
      } catch (notifyErr) {
        console.warn('Erro ao notificar no Lounge do site:', notifyErr);
      }

      return data.id;
    } catch (error) {
      console.error('Erro no createRecipe:', error);
      throw error;
    }
  },

  async updateRecipe(id: string, recipe: Partial<Recipe>) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(recipe)
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao atualizar receita');
      }
    } catch (error) {
      console.error('Erro no updateRecipe:', error);
      throw error;
    }
  },

  async deleteRecipe(id: string) {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/recipes/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Erro ao deletar receita');
      }
    } catch (error) {
      console.error('Erro no deleteRecipe:', error);
      throw error;
    }
  },

  async getRecipe(id: string): Promise<Recipe | null> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/recipes/${id}`, {
        headers
      });
      if (!response.ok) return null;
      const resData = await response.json();
      return mapRecipeResponse(resData.data);
    } catch (error) {
      console.error('Erro no getRecipe:', error);
      return null;
    }
  },

  async getRecipeBySlug(slug: string): Promise<Recipe | null> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/recipes?slug=${encodeURIComponent(slug)}`, {
        headers
      });
      if (!response.ok) return null;
      const resData = await response.json();
      if (Array.isArray(resData.data) && resData.data.length > 0) {
        return mapRecipeResponse(resData.data[0]);
      }
      return null;
    } catch (error) {
      console.error('Erro no getRecipeBySlug:', error);
      return null;
    }
  },

  async getAllRecipes(): Promise<Recipe[]> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/recipes', {
        headers
      });
      if (!response.ok) return [];
      const resData = await response.json();
      return (resData.data || []).map(mapRecipeResponse);
    } catch (error) {
      console.error('Erro no getAllRecipes:', error);
      return [];
    }
  },

  async getRecipesByMomento(momento: string): Promise<Recipe[]> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/recipes?momento=${encodeURIComponent(momento)}`, {
        headers
      });
      if (!response.ok) return [];
      const resData = await response.json();
      return (resData.data || []).map(mapRecipeResponse);
    } catch (error) {
      console.error('Erro no getRecipesByMomento:', error);
      return [];
    }
  },

  async getUserRecipes(userId: string): Promise<Recipe[]> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/recipes?ownerId=${encodeURIComponent(userId)}`, {
        headers
      });
      if (!response.ok) return [];
      const resData = await response.json();
      return (resData.data || []).map(mapRecipeResponse);
    } catch (error) {
      console.error('Erro no getUserRecipes:', error);
      return [];
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
    // ==== Nestlé site specific parsing ==== //
    if (url.includes('receitasnestle.com.br')) {
      try {
        // Lazy‑load cheerio to avoid extra bundle weight when not needed
        const cheerio = await import('cheerio');
        const $ = cheerio.load(html);
        const title = $('h1').first().text().trim();
        const description = $('meta[name="description"]').attr('content') || '';
        const ingredients: any[] = [];
        $('ul.ingredients-list li, .ingredients li').each((_, el) => {
          const txt = $(el).text().trim();
          // Simple split on first numeric token
          const match = txt.match(/^([\d/\.\s]+[a-zA-Z]*?)\s+(.*)$/);
          if (match) {
            ingredients.push({ name: match[2], quantity: match[1] });
          } else {
            ingredients.push({ name: txt, quantity: '' });
          }
        });
        const instructions: string[] = [];
        $('ol.preparation-steps li, .preparation li').each((_, el) => {
          const step = $(el).text().trim();
          if (step) instructions.push(step);
        });
        // If we have at least title and ingredients, consider it a successful parse
        if (title && ingredients.length && instructions.length) {
          const nestleResult: Partial<Recipe> = {
            title,
            description,
            ingredients,
            instructions,
            image: ogImage || (allImagesFound && allImagesFound[0]) || '',
            imageOptions: allImagesFound || []
          };
          return nestleResult;
        }
      } catch (e) {
        console.error('Erro ao parsear receita Nestlé com Cheerio:', e);
      }
    }
    // If site‑specific parsing does not yield sufficient data, we fall back to the Gemini model for extraction
// Fallback to Gemini extraction when site‑specific parsing fails or isn’t applicable
    const scrapedRecipe = await geminiService.extractRecipeFromHtml(html, { metaDescription, ogImage, allImagesFound, url });
    return scrapedRecipe;
  }
};
