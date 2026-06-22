import { getFirestore } from 'firebase-admin/firestore';
import { prisma } from '../prisma/client';
import { GoogleGenAI } from '@google/genai';
import { getAvailableGeminiKeys, isQuotaExhaustedError } from './geminiKeyManager';

interface SearchResult {
  id: string;
  title: string;
  content: string;
  url?: string | null;
  similarity: number;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
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
   * Suporta histórico de conversa para manter contexto multi-turno.
   */
  static async askGeminiWithContext(userQuestion: string, conversationHistory: ConversationTurn[] = [], limit = 5, userId?: string): Promise<string> {
    try {
      const lowerQ = userQuestion.toLowerCase();
      // Interceptador rígido para perguntas sobre vendas de produtos/utensílios
      const isSalesQuery = (
        lowerQ.includes('venda') ||
        lowerQ.includes('comprar') ||
        lowerQ.includes('loja') ||
        lowerQ.includes('shop') ||
        lowerQ.includes('preço') ||
        lowerQ.includes('custo') ||
        lowerQ.includes('comercialização')
      ) && (
          lowerQ.includes('produto') ||
          lowerQ.includes('utensílio') ||
          lowerQ.includes('faca') ||
          lowerQ.includes('equipamento') ||
          lowerQ.includes('panela') ||
          lowerQ.includes('colher') ||
          lowerQ.includes('prato') ||
          lowerQ.includes('mesa')
        );

      if (isSalesQuery || lowerQ.includes('venda de produto')) {
        return "Ainda não, mas muito em breve abriremos nosso Shop Alchemist, com produtos diferenciados de excelente qualidade, em breve, aguarde.";
      }

      const ai = await this.getGeminiClient();

      const context = await this.getSemanticContext(userQuestion, limit);

      let complementaryContext = "";
      if (context && context.includes("[Documento:")) {
        // Fase 2: Tenta extrair bases de alimentos e momentos do contexto primário
        const basesMatch = [...context.matchAll(/Base do Alimento:\s*(.+)/g)].map(m => m[1]);
        const momentosMatch = [...context.matchAll(/Categoria\/Momento:\s*(.+)/g)].map(m => m[1]);
        
        const bases = basesMatch.join(' ');
        const momentos = momentosMatch.join(' ');
        
        let queryParts = [];
        // Se tem proteína forte, busca acompanhamento/guarnição
        if (/Carne|Frango|Peixe|Frutos do Mar/i.test(bases)) {
           queryParts.push("acompanhamento guarnição salada farofa vegetais molho");
        } 
        // Se tem refeição principal, busca sobremesa ou bebida
        if (/Almoço|Jantar|Ceia/i.test(momentos)) {
           queryParts.push("sobremesa doce pudim bolo bebida refresco drink");
        }
        // Se for café da manhã ou lanche, busca complementos
        if (/Café da Manhã|Lanche/i.test(momentos)) {
           queryParts.push("pão bolo biscoito geleia café bebida quente");
        }

        if (queryParts.length > 0) {
           const queryExtra = queryParts.join(" ");
           const extraDocs = await this.getSemanticContext(queryExtra, 2);
           if (extraDocs) {
             complementaryContext = `\n\n## CONTEXTO COMPLEMENTAR (Opções de Acompanhamento / Combinação)\n${extraDocs}`;
           }
        }
      }

      // Build conversation history block for multi-turn context
      const historyBlock = conversationHistory.length > 0
        ? conversationHistory.map(t => `${t.role === 'user' ? 'USUÁRIO' : 'ASSISTENTE'}: ${t.text}`).join('\n')
        : '';

      const finalPrompt = `
Você é o **Chef IA Alchemist**, o assistente culinário mestre do portal "Alquimia do Prato".
Você é apaixonado por culinária, técnicas de cozinha, história dos alimentos e alquimia gastronômica.

## PERSONALIDADE
- Acolhedor, curioso e entusiasmado. Trate o usuário como um aprendiz de alquimista.
- Use linguagem natural e quente em português (pt-BR). Nunca soe robótico.
- Seja conciso: respostas devem ter no máximo 10-15 linhas, a menos que o usuário peça mais detalhes.

## COMPORTAMENTO SOCRÁTICO (OBRIGATÓRIO)
Você deve GUIAR o usuário passo a passo com perguntas de acompanhamento ao invés de despejar toda a informação de uma vez.
1. Quando o usuário faz uma pergunta ampla (ex: "quero fazer uma torta"), responda brevemente e faça 1-2 perguntas para refinar:
   - Tipo de torta? (doce, salgada)
   - Para quantas pessoas?
   - Tem algum ingrediente em mãos ou restrição alimentar?
2. A cada resposta do usuário, refine sua sugestão e faça novas perguntas até chegar a uma receita ou solução específica.
3. Quando chegar a algo concreto, apresente a resposta final completa.

## COMPOSIÇÃO DE RECEITAS (NOVO E OBRIGATÓRIO)
Ao receber receitas no contexto, SEMPRE analise se duas ou mais podem ser combinadas para formar um menu ou prato composto. Considere:
1. Compatibilidade de "momento" (ex: Prato principal + Sobremesa).
2. Complementaridade de ingredientes (ex: Carne + Farofa/Salada).
3. Sinergia de sabores e texturas.

Quando identificar uma combinação viável e que responda à necessidade do usuário:
- Proponha a COMBINAÇÃO com um nome criativo (ex: "Combo Alquimia do Fogo").
- Apresente CADA receita individual com link no formato: [Nome da Receita](/recipe/ID)
- Mostre um breve resumo de como elas se complementam.
- Pergunte se o usuário deseja ver os detalhes de preparo de cada uma.

## REGRAS DE CONTEXTO DO ACERVO
- O CONTEXTO RECUPERADO abaixo contém receitas e artigos do nosso Acervo Técnico (banco de dados vetorial).
- Se houver receitas relevantes no contexto, SEMPRE apresente-as com links clicáveis no formato: [Nome da Receita](/recipe/ID)
- Destaque que "temos isso no nosso acervo" ou "encontrei receitas no portal" para dar valor ao conteúdo proprietário.
- Se o contexto inclui artigos ou discussões históricas, mencione: "No nosso Acervo Técnico, há artigos que discutem isso."
- Se NÃO encontrou nada no contexto ou não conseguir produzir uma informação válida, responda EXATAMENTE: "Ainda não temos uma informação para este termo, mas já está anotado para incluirmos logo que processada a pendência"

## FORMATAÇÃO
- Use Markdown: **negrito** para destaques, ### para títulos de seção, listas com * para ingredientes/passos.
- Links de receitas no formato: [Nome da Receita](/recipe/ID)
- Finalize SEMPRE com uma pergunta de acompanhamento ou oferta de ajuda, EXCETO quando a conversa claramente chegou a uma conclusão.

---

${historyBlock ? `## HISTÓRICO DA CONVERSA ATUAL
${historyBlock}

---

` : ''}## CONTEXTO RECUPERADO DO ACERVO TÉCNICO
${context || "Nenhum resultado encontrado no acervo para esta consulta."}${complementaryContext}

---

## REGRAS ABSOLUTAS DE RESPOSTA (SOBRESCREVEM QUALQUER CONTEXTO)
1. Se a pergunta do usuário for explicitamente sobre a COMERCIALIZAÇÃO, COMPRA ou VENDA de (produtos, loja, ferramentas de cozinha, facas, equipamentos, panelas, etc):
   Você DEVE ignorar qualquer contexto e responder EXATAMENTE E APENAS: "Ainda não, mas muito em breve abriremos nosso Shop Alchemist, com produtos diferenciados de excelente qualidade, em breve, aguarde." (NÃO ADICIONE MAIS NADA). NOTA: Se a pergunta for apenas sobre o USO culinário de facas/panelas (ex: "como amolar uma faca"), NÃO aplique esta regra, e responda normalmente ajudando o usuário.

2. Se a pergunta NÃO tiver relação com culinária, gastronomia, ingredientes ou técnicas (ou seja, fora do tema do site):
   Você DEVE responder EXATAMENTE E APENAS: "O tema não faz aparte de nosso acervo"

3. Se a pergunta for de culinária mas NÃO houver nenhuma informação válida no contexto recuperado:
   Você DEVE responder EXATAMENTE E APENAS: "Ainda não temos uma informação para este termo, mas já está anotado para incluirmos logo que processada a pendência"

---

## MENSAGEM ATUAL DO USUÁRIO
${userQuestion}
`;

      const generation = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: finalPrompt,
      });

      const responseText = generation.text || "Ainda não temos uma informação para este termo, mas já está anotado para incluirmos logo que processada a pendência";

      // Log unanswered queries to the Postgres Knowledge Wallet
      if (
        responseText.includes("Ainda não temos uma informação para este termo") || 
        responseText.includes("O tema não faz aparte de nosso acervo")
      ) {
        try {
          let prismaUserId = null;
          if (userId) {
            const user = await prisma.user.findFirst({ where: { OR: [{ id: userId }, { uid: userId }] } });
            if (user) prismaUserId = user.id;
          }
          await prisma.unansweredQuery.create({
            data: {
              userId: prismaUserId,
              queryText: userQuestion,
              context: context,
            }
          });
          console.log("[RAG] Termo não respondido registrado na Carteira de Conhecimento.");
        } catch (e) {
          console.error("[RAG] Erro ao registrar termo não respondido", e);
        }
      }

      return responseText;
    } catch (error) {
      console.error("[RagBackendService] Resource or API Error:", error);
      
      try {
        let prismaUserId = null;
        if (userId) {
          const user = await prisma.user.findFirst({ where: { OR: [{ id: userId }, { uid: userId }] } });
          if (user) prismaUserId = user.id;
        }
        await prisma.unansweredQuery.create({
          data: {
            userId: prismaUserId,
            queryText: userQuestion,
            context: "SYSTEM_ERROR",
          }
        });
      } catch (e) {}

      return "Desculpe, nossos servidores estão em delay, pergunte novamente por favor";
    }
  }

  /**
   * Retorna apenas o contexto semântico formatado para um dado texto de busca
   */
  static async getSemanticContext(queryText: string, limit = 5): Promise<string> {
    const ai = await this.getGeminiClient();

    const embeddingResponse = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: queryText,
      config: {
        outputDimensionality: 768
      }
    } as any);

    const queryVector = embeddingResponse.embeddings?.[0]?.values;

    if (!queryVector || queryVector.length !== 768) {
      return "";
    }

    const vectorLiteral = `[${queryVector.join(',')}]`;

    const matchedDocs = await prisma.$queryRaw<SearchResult[]>`
      SELECT id, title, content, url,
             1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "SemanticDocument"
      ORDER BY embedding <=> ${vectorLiteral}::vector ASC
      LIMIT ${limit};
    `;

    return matchedDocs
      .filter(doc => doc.similarity > 0.6)
      .map(doc => {
        const urlStr = doc.url ? ` | Link/URL: ${doc.url}` : "";
        return `[Documento: ${doc.title}${urlStr}]\n${doc.content}`;
      })
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
      .where("timestamp", ">=", last24h)
      .get();

    const approvedDocs = snapshot.docs.filter(doc => doc.data().status === "approved");

    if (approvedDocs.length === 0) {
      console.log("[RAG Sync] Nenhuma mensagem nova nas últimas 24h.");
      return;
    }

    const messages = approvedDocs.map(doc => ({
      id: doc.id,
      text: doc.data().text,
      sender: doc.data().senderRole || "user"
    }));

    // 2. Chamar o serviço do Google de forma vetorizada (em lote)
    const ai = await this.getGeminiClient();

    console.log(`[RAG Sync] Gerando embeddings para ${messages.length} mensagens...`);
    const embeddingResponse = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: messages.map(m => `[${m.sender}]: ${m.text}`),
      config: {
        outputDimensionality: 768
      }
    } as any);

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

  /**
   * Sincroniza todas as receitas cadastradas do Firestore para o PostgreSQL (SemanticDocument) gerando Embeddings para RAG
   */
  static async syncRecipesToPostgreSQL() {
    console.log("[RAG Recipe Sync] Iniciando sincronização de receitas para o PostgreSQL...");
    const db = getFirestore();

    // 1. Ler todas as receitas do Firestore
    const snapshot = await db.collection("recipes").get();
    if (snapshot.empty) {
      console.log("[RAG Recipe Sync] Nenhuma receita encontrada no Firestore.");
      return;
    }

    const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as any);
    const ai = await this.getGeminiClient();

    let syncedCount = 0;
    let skippedCount = 0;

    for (const recipe of recipes) {
      try {
        const docId = `recipe-${recipe.id}`;

        // Obter updatedAt do Firestore de forma segura
        const firestoreUpdatedAt = recipe.updatedAt?.toDate
          ? recipe.updatedAt.toDate()
          : (recipe.updatedAt?._seconds
            ? new Date(recipe.updatedAt._seconds * 1000)
            : (recipe.updatedAt ? new Date(recipe.updatedAt) : new Date()));

        // Verificar se já existe e está atualizado
        const existingDoc = await prisma.semanticDocument.findUnique({
          where: { id: docId }
        });

        if (existingDoc && existingDoc.updatedAt.getTime() >= firestoreUpdatedAt.getTime()) {
          skippedCount++;
          continue;
        }

        // Construir o conteúdo semântico da receita
        const ingredientsText = Array.isArray(recipe.ingredients)
          ? recipe.ingredients.map((ing: any) => typeof ing === 'string' ? ing : `${ing.quantity || ''} ${ing.name || ''}`.trim()).join(', ')
          : '';

        const instructionsText = Array.isArray(recipe.instructions)
          ? recipe.instructions.join('\n')
          : '';

        const content = `
Título: ${recipe.title}
Descrição: ${recipe.description || ''}
Categoria/Momento: ${Array.isArray(recipe.momento) ? recipe.momento.join(', ') : ''}
Tipo de Prato: ${Array.isArray(recipe.tipo_prato) ? recipe.tipo_prato.join(', ') : ''}
Base do Alimento: ${Array.isArray(recipe.base_alimento) ? recipe.base_alimento.join(', ') : ''}
Origem: ${recipe.origem || ''}
Tempo de Preparo: ${recipe.time || recipe.prepTime || ''}
Dificuldade: ${recipe.difficulty || ''}
Tipo de Dieta: ${recipe.dietType || ''}
Porções: ${recipe.servings || ''}
Custo Estimado: ${recipe.custo_estimado || ''}
Ingredientes: ${ingredientsText}
Modo de Preparo:
${instructionsText}
Dicas do Chef: ${recipe.chefTips || ''}
`.trim();

        // Gerar Embedding usando gemini-embedding-2
        const embedResponse = await ai.models.embedContent({
          model: "gemini-embedding-2",
          contents: `[Receita] ${recipe.title}: ${content}`,
          config: {
            outputDimensionality: 768
          }
        } as any);

        const queryVector = embedResponse.embeddings?.[0]?.values;
        if (!queryVector || queryVector.length !== 768) {
          console.warn(`[RAG Recipe Sync] Falha ao gerar embedding para receita "${recipe.title}".`);
          continue;
        }

        const vectorLiteral = `[${queryVector.join(',')}]`;
        const recipeUrl = recipe.slug ? `/receita/${recipe.slug}` : `/recipe/${recipe.id}`;

        // Executar upsert no SemanticDocument
        await prisma.$executeRawUnsafe(`
          INSERT INTO "SemanticDocument" (id, title, content, url, type, embedding, "updatedAt")
          VALUES ($1, $2, $3, $4, 'recipe', $5::vector, $6)
          ON CONFLICT (id) DO UPDATE 
          SET title = EXCLUDED.title, content = EXCLUDED.content, url = EXCLUDED.url, type = EXCLUDED.type, embedding = EXCLUDED.embedding, "updatedAt" = EXCLUDED."updatedAt"
        `, docId, `Receita: ${recipe.title}`, content, recipeUrl, vectorLiteral, firestoreUpdatedAt);

        syncedCount++;
      } catch (err) {
        console.error(`[RAG Recipe Sync] Erro ao sincronizar receita "${recipe.title || recipe.id}":`, err);
      }
    }

    console.log(`[RAG Recipe Sync] Sincronização concluída. Sincronizadas: ${syncedCount}, Ignoradas (já atualizadas): ${skippedCount}`);
  }

  /**
   * Indexa uma publicação do Acervo (LibraryItem) diretamente no PostgreSQL gerando seu Embedding.
   */
  static async indexLibraryItemToRAG(item: any) {
    try {
      console.log(`[RAG Library Sync] Indexando item do acervo: "${item.title}"`);
      const docId = `library-${item.id}`;
      const ai = await this.getGeminiClient();

      const content = `
Título: ${item.title}
Descrição: ${item.description || ''}
Categoria: ${item.category || ''}
Tipo: ${item.type || ''}
Autor: ${item.author || ''}
Tags: ${Array.isArray(item.tags) ? item.tags.join(', ') : ''}
      `.trim();

      const embedResponse = await ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: `[Acervo Técnico] ${item.title}: ${content}`,
        config: { outputDimensionality: 768 }
      } as any);

      const queryVector = embedResponse.embeddings?.[0]?.values;
      if (!queryVector || queryVector.length !== 768) {
        console.warn(`[RAG Library Sync] Falha ao gerar embedding para acervo "${item.title}".`);
        return;
      }

      const vectorLiteral = `[${queryVector.join(',')}]`;
      const docType = item.type === 'presentation' ? 'presentation' : 'article';

      await prisma.$executeRawUnsafe(`
        INSERT INTO "SemanticDocument" (id, title, content, url, type, embedding, "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6::vector, NOW())
        ON CONFLICT (id) DO UPDATE 
        SET title = EXCLUDED.title, content = EXCLUDED.content, url = EXCLUDED.url, type = EXCLUDED.type, embedding = EXCLUDED.embedding, "updatedAt" = EXCLUDED."updatedAt"
      `, docId, `Acervo Técnico: ${item.title}`, content, item.url || '', docType, vectorLiteral);

      console.log(`[RAG Library Sync] Item indexado com sucesso: ${item.id}`);
    } catch (err) {
      console.error(`[RAG Library Sync] Erro ao indexar acervo "${item.id}":`, err);
    }
  }

  /**
   * Generates a proactive response based on a list of recent lounge messages to stimulate conversation.
   */
  static async generateProactiveResponse(recentMessages: { text: string; senderName: string }[]): Promise<string> {
    const ai = await this.getGeminiClient();

    const conversationHistory = recentMessages
      .map(m => `${m.senderName}: "${m.text}"`)
      .join('\n');

    // We can also fetch semantic context based on the whole conversation summary
    let semanticContext = "";
    try {
      const query = recentMessages.map(m => m.text).join(" ").substring(0, 500);
      semanticContext = await this.getSemanticContext(query, 2);
    } catch (e) {
      console.warn("[Proactive] Failed to get semantic context:", e);
    }

    const proactivePrompt = `
      Você é o assistente culinário Alchemist do portal "Alquimia do Prato".
      Você está acompanhando a conversa no Lounge Gastronômico. A comunidade está ativa discutindo vários temas.
      Sua tarefa é intervir de forma natural, proativa e sutil para estimular a discussão, acrescentando uma curiosidade, uma dica prática, um termo do acervo ou uma pergunta provocativa sobre culinária/gastronomia.

      REGRAS:
      1. Seja extremamente natural e amigável. Não pareça um robô.
      2. Mantenha seu tom de "Alquimista do Prato" - alguém apaixonado por química culinária, história dos alimentos e técnicas.
      3. Baseie-se no histórico recente da conversa fornecido abaixo.
      4. Se relevante, incorpore elementos do contexto histórico recuperado.
      5. Escreva em português (pt-BR) e seja conciso (máximo de 4-5 linhas).

      HISTÓRICO RECENTE DA CONVERSA:
      ${conversationHistory}

      CONTEXTO HISTÓRICO RECUPERADO:
      ${semanticContext || "Nenhum contexto específico do acervo encontrado."}
    `;

    const generation = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: proactivePrompt,
    });

    return generation.text || "Continue cozinhando, alquimistas!";
  }

  /**
   * Checks the interaction density in the Lounge and triggers a proactive bot response if appropriate.
   */
  static async checkAndTriggerProactiveEngagement(db: any): Promise<void> {
    console.log("[Proactive] Checking interaction density...");
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    try {
      // Fetch all messages in the last 1 hour
      const snapshot = await db.collection('lounge_messages')
        .where('timestamp', '>=', oneHourAgo)
        .get();

      const docs = snapshot.docs.map(doc => {
        const data = doc.data();
        const t = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        return { id: doc.id, ...data, timestampDate: t };
      });

      // 1. Check if the bot has spoken in the last 1 hour
      const botSpokeRecently = docs.some(d => d.senderId === 'copilot-agent');
      if (botSpokeRecently) {
        console.log("[Proactive] Bot spoke recently. Cooldown is active.");
        return;
      }

      // 2. Count approved user messages in the last 15 minutes
      const recentUserMessages = docs.filter(d =>
        d.timestampDate.getTime() >= fifteenMinutesAgo.getTime() &&
        d.status === 'approved' &&
        d.senderId !== 'copilot-agent'
      );

      console.log(`[Proactive] Found ${recentUserMessages.length} user messages in the last 15 minutes.`);

      if (recentUserMessages.length >= 5) {
        console.log("[Proactive] High interaction density detected! Triggering proactive response.");

        // Sort chronologically for context
        recentUserMessages.sort((a, b) => a.timestampDate.getTime() - b.timestampDate.getTime());

        const messagesForContext = recentUserMessages.map(m => ({
          text: m.text || "",
          senderName: m.senderName || "Alquimista"
        }));

        const answer = await this.generateProactiveResponse(messagesForContext);

        const copilotMessage = {
          text: answer,
          senderId: 'copilot-agent',
          senderName: 'Alchemist',
          senderRole: 'agent',
          timestamp: new Date(),
          status: 'approved',
          reactions: {},
          metadata: { isBot: true, proactive: true }
        };

        const FieldValue = (await import('firebase-admin/firestore')).FieldValue;

        await db.collection('lounge_messages').add({
          ...copilotMessage,
          timestamp: FieldValue.serverTimestamp()
        });

        console.log("[Proactive] Proactive Alchemist message posted successfully.");
      }
    } catch (error) {
      console.error("[Proactive Error] Failed to check or trigger proactive response:", error);
    }
  }
}
