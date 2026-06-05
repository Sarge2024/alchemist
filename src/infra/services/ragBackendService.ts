import { getFirestore } from 'firebase-admin/firestore';
import { prisma } from '../prisma/client';
import { GoogleGenAI } from '@google/genai';
import { getAvailableGeminiKeys, isQuotaExhaustedError } from './geminiKeyManager';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

export class RagBackendService {
  /**
   * Helper function to get an active Gemini AI client
   */
  private static async getGeminiClient() {
    const apiKeys = getAvailableGeminiKeys();
    if (apiKeys.length === 0) {
      throw new Error("Nenhuma GEMINI_API_KEY configurada no backend.");
    }
    // Para simplificar, pegamos a primeira disponível. Em um cenário real, 
    // poderíamos testar rotatividade em caso de erro 429 como no geminiService.
    return new GoogleGenAI({ apiKey: apiKeys[0] });
  }

  /**
   * Realiza busca semântica via RAG combinando Embeddings e busca vetorial no Postgres.
   */
  static async askGeminiWithContext(userQuestion: string, limit = 5): Promise<string> {
    const ai = await this.getGeminiClient();

    const context = await this.getSemanticContext(userQuestion, limit);

    // 4. Gerar a resposta final alimentando o Gemini com o contexto injetado
    const finalPrompt = `
      Você é o assistente culinário Alchemist. Use as referências de contexto fornecidas abaixo para responder à pergunta do usuário de forma precisa. Se não souber a resposta ou se o contexto não for suficiente, use seus conhecimentos de forma honesta, indicando que as informações históricas locais do portal não mencionam o assunto.

      CONTEXTO RECUPERADO:
      ${context || "Nenhum contexto histórico relevante foi encontrado no banco de dados."}

      PERGUNTA DO USUÁRIO:
      ${userQuestion}
    `;

    const generation = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: finalPrompt,
    });

    return generation.text || "Sem resposta.";
  }

  /**
   * Retorna apenas o contexto semântico formatado para um dado texto de busca
   */
  static async getSemanticContext(queryText: string, limit = 5): Promise<string> {
    const ai = await this.getGeminiClient();

    const embeddingResponse = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: queryText,
    });

    const queryVector = embeddingResponse.embeddings?.[0]?.values;
    
    if (!queryVector || queryVector.length !== 768) {
      return "";
    }

    const vectorLiteral = `[${queryVector.join(',')}]`;

    const matchedDocs = await prisma.$queryRaw<SearchResult[]>`
      SELECT id, title, content,
             1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "SemanticDocument"
      ORDER BY embedding <=> ${vectorLiteral}::vector ASC
      LIMIT ${limit};
    `;

    return matchedDocs
      .filter(doc => doc.similarity > 0.6)
      .map(doc => `[Documento: ${doc.title}]\n${doc.content}`)
      .join("\n\n");
  }

  /**
   * Sincroniza mensagens do Lounge do Firestore para o PostgreSQL gerando Embeddings
   */
  static async syncChatsToPostgreSQL() {
    console.log("[RAG Sync] Iniciando sincronização de chats para o PostgreSQL...");
    const db = getFirestore();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 1. Ler mensagens recentes em lote único do Firestore
    const snapshot = await db.collection("lounge_messages")
      .where("status", "==", "approved")
      .where("timestamp", ">=", last24h)
      .get();

    if (snapshot.empty) {
      console.log("[RAG Sync] Nenhuma mensagem nova nas últimas 24h.");
      return;
    }

    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      text: doc.data().text,
      sender: doc.data().senderRole || "user"
    }));

    // 2. Chamar o serviço do Google de forma vetorizada (em lote)
    const ai = await this.getGeminiClient();
    
    console.log(`[RAG Sync] Gerando embeddings para ${messages.length} mensagens...`);
    const embeddingResponse = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: messages.map(m => `[${m.sender}]: ${m.text}`),
    });

    const embeddings = embeddingResponse.embeddings; // Array de { values: number[] }

    if (!embeddings || embeddings.length !== messages.length) {
      throw new Error("Tamanho de embeddings gerados diverge do total de mensagens.");
    }

    // 3. Inserção em massa (Bulk Insert) no PostgreSQL usando SQL bruto e transações
    console.log("[RAG Sync] Salvando vetores no PostgreSQL...");
    
    // We run queries sequentially or via transaction
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const queryVector = embeddings[i].values;
      if (!queryVector || queryVector.length !== 768) continue;
      
      const vectorLiteral = `[${queryVector.join(',')}]`;
      
      await prisma.$executeRawUnsafe(`
        INSERT INTO "SemanticDocument" (id, title, content, type, embedding, "updatedAt")
        VALUES ($1, $2, $3, 'chat_summary', $4::vector, NOW())
        ON CONFLICT (id) DO UPDATE 
        SET content = EXCLUDED.content, embedding = EXCLUDED.embedding, "updatedAt" = NOW()
      `, m.id, `Mensagem de Chat ${m.id}`, m.text, vectorLiteral);
    }

    console.log("[RAG Sync] Sincronização concluída com sucesso.");
  }
}
