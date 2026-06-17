import { getFirestore } from 'firebase-admin/firestore';
import { prisma } from '../prisma/client';
import { GoogleGenAI } from '@google/genai';
import { getAvailableGeminiKeys } from './geminiKeyManager';

/**
 * Interface otimizada do Índice para leitura por máquina (LLM)
 */
interface CompiledIndex {
  updatedAt: string;
  recipes: Array<{
    id: string;
    title: string;
    category: string;
    tags: string[];
  }>;
  acervo: Array<{
    id: string;
    title: string;
    type: string;
  }>;
}

export class FastRoutingService {
  private static memoryCache: CompiledIndex | null = null;
  private static lastCacheTime: number = 0;
  private static readonly CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora
  
  private static async getGeminiClient() {
    const apiKeys = getAvailableGeminiKeys();
    if (apiKeys.length === 0) {
      throw new Error("Nenhuma GEMINI_API_KEY configurada no backend.");
    }
    return new GoogleGenAI({ apiKey: apiKeys[0] });
  }

  /**
   * Obtém o índice do cache em memória ou busca do Firestore se não existir/estiver expirado.
   */
  public static async getIndex(): Promise<CompiledIndex> {
    const now = Date.now();
    if (this.memoryCache && (now - this.lastCacheTime < this.CACHE_TTL_MS)) {
      return this.memoryCache;
    }

    const db = getFirestore();
    const docRef = db.collection('system').doc('acervo_index');
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      this.memoryCache = docSnap.data() as CompiledIndex;
      this.lastCacheTime = now;
      return this.memoryCache;
    }

    // Se o documento não existe, constrói agora
    return await this.buildAndSaveIndex();
  }

  /**
   * Constrói o índice compactado lendo o banco e salva no Firestore.
   */
  public static async buildAndSaveIndex(): Promise<CompiledIndex> {
    console.log("[FastRouting] Construindo Índice Compilado...");
    const db = getFirestore();
    
    // Buscar receitas
    const recipesSnap = await db.collection('recipes').get();
    const recipes = recipesSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        category: data.category || '',
        tags: data.tags || []
      };
    });

    // Buscar Acervo (do Postgres)
    let acervo: Array<{id: string, title: string, type: string}> = [];
    try {
      const docs = await prisma.$queryRaw<Array<{id: string, title: string, type: string}>>`
        SELECT id, title, type FROM "SemanticDocument"
        WHERE type != 'chat_summary'
        LIMIT 500;
      `;
      acervo = docs;
    } catch (err) {
      console.warn("[FastRouting] Aviso: não foi possível ler o Acervo do Postgres neste momento.");
    }

    const newIndex: CompiledIndex = {
      updatedAt: new Date().toISOString(),
      recipes,
      acervo
    };

    // Salvar no Firestore
    await db.collection('system').doc('acervo_index').set(newIndex);
    
    // Atualizar Cache local
    this.memoryCache = newIndex;
    this.lastCacheTime = Date.now();

    console.log(`[FastRouting] Índice gerado com ${recipes.length} receitas e ${acervo.length} documentos do acervo.`);
    return newIndex;
  }

  /**
   * Força a atualização do cache (para ser chamado sempre que um novo doc é inserido)
   */
  public static async refreshIndex(): Promise<void> {
    await this.buildAndSaveIndex();
  }

  /**
   * Rota rápida para roteamento e ganchos (sem RAG vetorial pesado)
   */
  public static async getQuickRoutingOptions(userSubject: string): Promise<string> {
    try {
      const index = await this.getIndex();
      
      // Criar uma representação ultra-enxuta apenas com títulos e categorias
      const indexStr = JSON.stringify({
        r: index.recipes.map(r => ({ i: r.id, t: r.title, c: r.category })),
        a: index.acervo.map(a => ({ t: a.title }))
      });

      const ai = await this.getGeminiClient();
      
      const prompt = `Você é o roteador rápido do Alquimia do Prato.
DADO O ÍNDICE ABAIXO (Formato JSON minimizado: r=receitas (i=id, t=titulo, c=categoria), a=acervo):
${indexStr}

O usuário está no Lounge e expressou interesse sobre o tema: '${userSubject}'.
Seja extretamente direto. Sua função não é responder a pergunta, mas DIRECIONAR o usuário usando o índice.
Retorne UMA frase amigável curta e exata e uma lista em Markdown contendo EXATAMENTE:
- 1 a 2 links para receitas exatas ou conteúdo relacionado presente no índice. Use o formato: [Nome da Receita](/receita/ID_DA_RECEITA) ou [Explorar Categoria](/explore?q=CATEGORIA). Se não houver correspondência exata, sugira a busca geral: [Buscar no Acervo](/acervo?search=TERMO).
- 2 "Gatilhos de Conversa" interessantes para ele clicar e conversar com o Chef IA no chat. O link deve SEMPRE ser um sustenido (ex: [Como defumar sem churrasqueira?](#) ou [Quais os cortes ideais?](#)).

Importante: Não invente receitas que não existem no índice (r). Use apenas IDs reais (i) para compor a URL /receita/ID.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      return response.text || "Pode me perguntar qualquer coisa no chat abaixo!";
    } catch (error) {
      console.error("[FastRouting] Erro ao gerar opções rápidas:", error);
      return "Não consegui carregar as sugestões, mas me pergunte no chat abaixo!";
    }
  }
}
