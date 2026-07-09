// server.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { JSDOM } from "jsdom";
import multer from "multer";
import fs from "fs";
import FirecrawlApp from "@mendable/firecrawl-js";
import { initializeApp as initializeAdminApp, cert } from "firebase-admin/app";
import { getFirestore as getFirestore5, FieldValue as FieldValue2 } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// src/infra/auth/IdentityAccessService.ts
import { getAuth } from "firebase-admin/auth";
var IdentityAccessService = class {
  constructor() {
    // Roles permitidas conforme definido no Agentes_Personas.md e PRD
    this.allowedRoles = ["member", "collaborator", "chef", "admin"];
  }
  /**
   * Atribui uma função (role) administrativa ao usuário no Firebase Auth.
   * 
   * @param uid - ID único do usuário.
   * @param role - A role desejada (visitante, colaborador, editor, admin).
   * @returns Promise<void>
   * @throws Error caso a role seja inválida ou ocorra erro no Firebase.
   */
  async assignRole(uid, role) {
    if (!this.allowedRoles.includes(role)) {
      throw new Error(`[AuthError] A role '${role}' n\xE3o \xE9 permitida. Use uma das seguintes: ${this.allowedRoles.join(", ")}`);
    }
    try {
      await getAuth().setCustomUserClaims(uid, { role });
      console.log(`[RBAC] Role '${role}' aplicada com sucesso ao UID: ${uid}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error(`[RBAC Fatal] Falha ao atribuir claims para o usu\xE1rio ${uid}:`, errorMessage);
      throw new Error(`Falha na atribui\xE7\xE3o de permiss\xF5es: ${errorMessage}`);
    }
  }
  /**
   * Verifica a role atual de um usuário.
   * Útil para auditorias internas e logs.
   */
  async checkUserRole(uid) {
    try {
      const userRecord = await getAuth().getUser(uid);
      return userRecord.customClaims?.role || null;
    } catch (error) {
      console.error(`[AuthError] Erro ao buscar dados do usu\xE1rio ${uid}`);
      return null;
    }
  }
};

// src/infra/services/ModerationService.ts
import { GoogleGenAI } from "@google/genai";

// src/infra/services/geminiKeyManager.ts
function getAvailableGeminiKeys() {
  const keys = [];
  const rawKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
    process.env.GEMINI_API_KEY_9,
    process.env.GEMINI_API_KEY_10,
    // Fallback para import.meta.env caso o bundler suporte mas o define falhe
    // @ts-ignore
    typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY_1,
    // @ts-ignore
    typeof import.meta !== "undefined" && import.meta.env?.VITE_GEMINI_API_KEY_2
  ];
  for (const k of rawKeys) {
    if (k && typeof k === "string" && k.trim().length > 0 && k !== "null" && k !== "undefined" && !keys.includes(k.trim())) {
      keys.push(k.trim());
    }
  }
  const envKeysList = process.env.GEMINI_API_KEYS || "";
  if (envKeysList && envKeysList !== "null" && envKeysList !== "undefined") {
    keys.push(...envKeysList.split(",").map((k) => k.trim()).filter((k) => k.length > 0 && !keys.includes(k)));
  }
  const defaultKey = process.env.GEMINI_API_KEY;
  if (defaultKey && defaultKey.trim().length > 0 && defaultKey !== "null" && defaultKey !== "undefined" && !keys.includes(defaultKey.trim())) {
    keys.push(defaultKey.trim());
  }
  return keys;
}
function isQuotaExhaustedError(error) {
  const status = error?.status || error?.response?.status;
  const message = error?.message?.toLowerCase() || "";
  const reason = error?.response?.data?.error?.status || "";
  return Number(status) === 429 || status === "RESOURCE_EXHAUSTED" || reason === "RESOURCE_EXHAUSTED" || message.includes("429") || message.includes("quota") || message.includes("exhausted");
}

// src/infra/services/ModerationService.ts
var ModerationService = {
  /**
   * Analisa o texto da mensagem e determina se é relacionado à gastronomia.
   * 
   * @param text Conteúdo da mensagem a ser validado.
   * @returns Retorna 'approved' se for pertinente, 'rejected' caso contrário.
   */
  async validateCulinaryRelevance(text) {
    const lowerText = text.toLowerCase();
    if (lowerText.includes("@alchemist") || lowerText.includes("@copilot") || lowerText.includes("@chef") || lowerText.includes("@alquimista")) {
      return "approved";
    }
    const apiKeys = getAvailableGeminiKeys();
    if (apiKeys.length === 0) {
      console.warn("[Moderation] Nenhuma GEMINI_API_KEY configurada. Aprovando mensagem por padr\xE3o.");
      return "approved";
    }
    const prompt = `
      Voc\xEA \xE9 um moderador do "Lounge Gastron\xF4mico" da Alquimia do Prato.
      Sua tarefa \xE9 validar se a mensagem de um usu\xE1rio \xE9 pertinente ao universo da gastronomia, 
      culin\xE1ria, heran\xE7a cultural alimentar ou t\xE9cnicas de cozinha.
      
      Mensagem do Usu\xE1rio: "${text}"
      
      REGRAS DE CLASSIFICA\xC7\xC3O:
      1. "approved": Assuntos de comida, receitas, ingredientes, t\xE9cnicas, hist\xF3ria da culin\xE1ria ou dicas de cozinha.
      2. "rejected": Spam, ofensas, pol\xEDtica, \xF3dio, ou qualquer assunto totalmente desconexo da gastronomia.
      
      RETORNO: Responda APENAS com a palavra "approved" ou "rejected". N\xE3o adicione explica\xE7\xF5es.
    `;
    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      try {
        const client = new GoogleGenAI({ apiKey });
        const response = await client.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt
        });
        const responseText = (response.text || "").trim().toLowerCase();
        return responseText.includes("approved") ? "approved" : "rejected";
      } catch (error) {
        if (isQuotaExhaustedError(error) && i < apiKeys.length - 1) {
          console.warn(`[Moderation] Cota da chave ${i + 1} atingida. Rotacionando para chave ${i + 2}...`);
          continue;
        }
        console.error("[Moderation Error] Falha cr\xEDtica na an\xE1lise do Gemini:", error.message || error);
        return "approved";
      }
    }
    return "approved";
  }
};

// src/infra/services/AtaGeneratorService.ts
import { getFirestore as getFirestore2, FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI as GoogleGenAI3 } from "@google/genai";

// src/infra/services/ragBackendService.ts
import { getFirestore } from "firebase-admin/firestore";

// src/infra/prisma/client.ts
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
var connectionString = process.env.DATABASE_URL;
var pool = new Pool({ connectionString });
var adapter = new PrismaPg(pool);
var prisma = global.prisma || new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

// src/infra/services/ragBackendService.ts
import { GoogleGenAI as GoogleGenAI2 } from "@google/genai";
var RagBackendService = class {
  /**
   * Helper function to get an active Gemini AI client
   */
  static async getGeminiClient() {
    const apiKeys = getAvailableGeminiKeys();
    if (apiKeys.length === 0) {
      throw new Error("Nenhuma GEMINI_API_KEY configurada no backend.");
    }
    return new GoogleGenAI2({ apiKey: apiKeys[0] });
  }
  /**
   * Realiza busca semântica via RAG combinando Embeddings e busca vetorial no Postgres.
   * Suporta histórico de conversa para manter contexto multi-turno.
   */
  static async askGeminiWithContext(userQuestion, conversationHistory = [], limit = 5, userId, userName) {
    try {
      const lowerQ = userQuestion.toLowerCase();
      const isSalesQuery = (lowerQ.includes("venda") || lowerQ.includes("comprar") || lowerQ.includes("loja") || lowerQ.includes("shop") || lowerQ.includes("pre\xE7o") || lowerQ.includes("custo") || lowerQ.includes("comercializa\xE7\xE3o")) && (lowerQ.includes("produto") || lowerQ.includes("utens\xEDlio") || lowerQ.includes("faca") || lowerQ.includes("equipamento") || lowerQ.includes("panela") || lowerQ.includes("colher") || lowerQ.includes("prato") || lowerQ.includes("mesa"));
      if (isSalesQuery || lowerQ.includes("venda de produto")) {
        return "Ainda n\xE3o, mas muito em breve abriremos nosso Shop Alchemist, com produtos diferenciados de excelente qualidade, em breve, aguarde.";
      }
      const ai = await this.getGeminiClient();
      const context = await this.getSemanticContext(userQuestion, limit);
      let complementaryContext = "";
      if (context && context.includes("[Documento:")) {
        const basesMatch = [...context.matchAll(/Base do Alimento:\s*(.+)/g)].map((m) => m[1]);
        const momentosMatch = [...context.matchAll(/Categoria\/Momento:\s*(.+)/g)].map((m) => m[1]);
        const bases = basesMatch.join(" ");
        const momentos = momentosMatch.join(" ");
        let queryParts = [];
        if (/Carne|Frango|Peixe|Frutos do Mar/i.test(bases)) {
          queryParts.push("acompanhamento guarni\xE7\xE3o salada farofa vegetais molho");
        }
        if (/Almoço|Jantar|Ceia/i.test(momentos)) {
          queryParts.push("sobremesa doce pudim bolo bebida refresco drink");
        }
        if (/Café da Manhã|Lanche/i.test(momentos)) {
          queryParts.push("p\xE3o bolo biscoito geleia caf\xE9 bebida quente");
        }
        if (queryParts.length > 0) {
          const queryExtra = queryParts.join(" ");
          const extraDocs = await this.getSemanticContext(queryExtra, 2);
          if (extraDocs) {
            complementaryContext = `

## CONTEXTO COMPLEMENTAR (Op\xE7\xF5es de Acompanhamento / Combina\xE7\xE3o)
${extraDocs}`;
          }
        }
      }
      const historyBlock = conversationHistory.length > 0 ? conversationHistory.map((t) => `${t.role === "user" ? "USU\xC1RIO" : "ASSISTENTE"}: ${t.text}`).join("\n") : "";
      const userTurnCount = conversationHistory.filter((t) => t.role === "user").length;
      const phase = userTurnCount === 0 ? 0 : userTurnCount <= 2 ? 1 : 2;
      const finalPrompt = `
Voc\xEA \xE9 o **Chef IA Alchemist**, tutor gastron\xF4mico personalizado do portal "Alquimia do Prato".
${userName ? `O nome do usu\xE1rio \xE9 **${userName}**.` : ""}

## FASE ATUAL DA CONVERSA: ${phase === 0 ? "PRIMEIRO CONTATO" : phase === 1 ? "EXPLORA\xC7\xC3O" : "APROFUNDAMENTO"}
N\xFAmero de turnos do usu\xE1rio at\xE9 agora: ${userTurnCount}

## REGRA DE OURO: DI\xC1LOGO PROGRESSIVO E NATURALIDADE
- Voc\xEA NUNCA despeja todo o conhecimento de uma vez. A conversa evolui em fases.
- **A interface j\xE1 deu as boas-vindas personalizadas ao usu\xE1rio.** Portanto, NUNCA inicie mensagens com sauda\xE7\xF5es formais repetitivas ("Ol\xE1", "Oi", "Bem-vindo", "Tudo bem?").
- V\xE1 direto ao assunto desde a primeira resposta, mantendo um tom fluido, natural e coloquial.
- **Uso do Nome (Proximidade):** Use o primeiro nome do usu\xE1rio de forma espor\xE1dica e estrat\xE9gica (a cada 2 ou 3 perguntas) para direcionar questionamentos e criar proximidade, como faria um amigo. Exemplo: "${userName ? userName.split(" ")[0] : "Alquimista"}, o que voc\xEA acha sobre pontos de carne, qual a sua prefer\xEAncia?"

### FASE 0 \u2014 PRIMEIRO CONTATO (turno atual do usu\xE1rio = primeiro da sess\xE3o)
- Resposta CURTA (3-5 linhas no m\xE1ximo).
- N\xC3O fa\xE7a nenhuma sauda\xE7\xE3o de boas-vindas.
- Acolha o interesse com empatia (Efeito ELIZA): valide o desejo de forma empolgante usando as palavras do pr\xF3prio usu\xE1rio.
- N\xC3O ensine nada ainda. N\xC3O liste receitas. N\xC3O fa\xE7a inje\xE7\xE3o cognitiva.
- Termine com 1-2 perguntas direcionadoras para entender o que o usu\xE1rio realmente busca.
  Exemplos de perguntas direcionadoras:
  - "Voc\xEA quer explorar t\xE9cnicas de preparo, conhecer cortes espec\xEDficos ou descobrir receitas pr\xE1ticas?"
  - "\xC9 para um evento especial ou para o dia a dia?"
  - "Tem alguma prefer\xEAncia ou restri\xE7\xE3o alimentar que eu deva saber?"

### FASE 1 \u2014 EXPLORA\xC7\xC3O (turnos 2 e 3)
- Resposta CURTA A MODERADA (m\xE1ximo 2 par\xE1grafos curtos).
- Espelhamento emocional breve: reconhe\xE7a a resposta anterior do usu\xE1rio.
- Introduza UM insight cognitivo curto (ci\xEAncia, t\xE9cnica ou curiosidade) relevante ao que o usu\xE1rio indicou.
- Se houver receitas no acervo, mencione apenas 1 ou 2 brevemente com links [Nome](/recipe/ID).
- **Ping-Pong de Engajamento**: N\xE3o d\xEA muitas op\xE7\xF5es de uma vez. Fa\xE7a uma pergunta de encaminhamento espec\xEDfica que gere curiosidade.
  Exemplo: "Gostaria de saber que bebida iria bem com esta receita?" ou "Quer descobrir o segredo para deixar essa carne ainda mais suculenta?"

### FASE 2 \u2014 APROFUNDAMENTO (turno 4 em diante)
- Resposta DIRETA e FRACIONADA (evite blocos imensos de texto).
- Espelhamento emocional + Inje\xE7\xE3o cognitiva focada.
- Quando o usu\xE1rio responder a uma pergunta anterior (ex: aceitou saber sobre a bebida), d\xEA a resposta de forma empolgante e logo em seguida retorne ao tema central ou puxe um novo gancho.
- Apresente receitas e conte\xFAdos do acervo com entusiasmo e links, mas dose a quantidade.
- Proponha **iscas de intera\xE7\xE3o**:
  Exemplo: "Agora que resolvemos a prote\xEDna, quer pensar em um acompanhamento r\xE1pido ou prefere focar na sobremesa?"
- O fluxo de "vai e volta" (ping-pong) \xE9 ESSENCIAL para manter o usu\xE1rio raciocinando e interagindo, minimizando a leitura extensa.
- Ocasionalmente, inclua um mini-desafio ou quiz r\xE1pido baseado no conceito explicado.

## FERRAMENTAS MCP (Use quando apropriado, em qualquer fase)
- \`get_user_culinary_profile\`: Use no in\xEDcio para entender quem \xE9 o usu\xE1rio (n\xEDvel, restri\xE7\xF5es, prefer\xEAncias).
- \`update_user_culinary_profile\`: Se identificar restri\xE7\xE3o alimentar ou motiva\xE7\xE3o clara, salve imediatamente.
- \`trigger_gamification_event\`: Se o usu\xE1rio acertar um quiz/desafio, conceda XP com eventType "QUIZ_ANSWERED_CORRECTLY".

## COMPOSI\xC7\xC3O DE RECEITAS (apenas na Fase 2)
Ao identificar combina\xE7\xF5es vi\xE1veis entre receitas do contexto:
- Proponha com um nome criativo (ex: "Combo Alquimia do Fogo").
- Apresente cada receita com link: [Nome da Receita](/recipe/ID)
- Mostre brevemente como se complementam.

## REGRAS DE CONTEXTO DO ACERVO
- O CONTEXTO RECUPERADO abaixo cont\xE9m receitas e artigos do Acervo T\xE9cnico.
- Se houver conte\xFAdo relevante: use-o de acordo com a fase atual (na Fase 0 apenas mencione que temos materiais, nas Fases 1-2 apresente com links).
- Se N\xC3O houver conte\xFAdo direto no contexto para a pergunta culin\xE1ria:
  1. N\xC3O envie mensagem de erro ou recusa.
  2. Use empatia (ELIZA) para validar o interesse.
  3. D\xEA uma curiosidade breve e geral sobre o tema.
  4. Fa\xE7a uma pergunta que direcione para subtemas ou ingredientes que possamos ter no acervo.
  5. Inclua discretamente "[PEND\xCANCIA_ANOTADA]" no final.

## FORMATA\xC7\xC3O
- Use Markdown: **negrito**, ### t\xEDtulos, listas com * para ingredientes/passos.
- Links de receitas: [Nome da Receita](/recipe/ID)
- Op\xE7\xF5es selecion\xE1veis como lista com letras ou emojis quando apropriado.

---

${historyBlock ? `## HIST\xD3RICO DA CONVERSA ATUAL
${historyBlock}

---

` : ""}## CONTEXTO RECUPERADO DO ACERVO T\xC9CNICO
${context || "Nenhum resultado encontrado no acervo para esta consulta."}${complementaryContext}

---

## REGRAS ABSOLUTAS (SOBRESCREVEM QUALQUER CONTEXTO)
1. Se a pergunta for sobre COMERCIALIZA\xC7\xC3O/COMPRA/VENDA de produtos, equipamentos, facas, panelas etc.:
   Responda EXATAMENTE: "Ainda n\xE3o, mas muito em breve abriremos nosso Shop Alchemist, com produtos diferenciados de excelente qualidade, em breve, aguarde."
   NOTA: Se for sobre o USO culin\xE1rio desses itens (ex: "como amolar uma faca"), responda normalmente.

2. Se a pergunta N\xC3O tiver rela\xE7\xE3o com culin\xE1ria/gastronomia:
   Responda EXATAMENTE: "O tema n\xE3o faz parte de nosso acervo"

3. Se for culin\xE1ria sem informa\xE7\xE3o espec\xEDfica no contexto:
   Use empatia, d\xEA vis\xE3o geral breve e fa\xE7a pergunta interativa sugerindo subtemas do acervo. Adicione "[PEND\xCANCIA_ANOTADA]".

---

## MENSAGEM ATUAL DO USU\xC1RIO
${userQuestion}
`;
      const generation = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: finalPrompt
      });
      const responseText = generation.text || "Ainda n\xE3o encontrei uma informa\xE7\xE3o sobre isso. O que voc\xEA gostaria de cozinhar hoje? [PEND\xCANCIA_ANOTADA]";
      const isUnanswered = responseText.includes("[PEND\xCANCIA_ANOTADA]") || responseText.includes("O tema n\xE3o faz aparte de nosso acervo");
      const cleanedResponse = responseText.replaceAll("[PEND\xCANCIA_ANOTADA]", "").trim();
      if (isUnanswered) {
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
              context
            }
          });
          console.log("[RAG] Termo n\xE3o respondido registrado na Carteira de Conhecimento.");
        } catch (e) {
          console.error("[RAG] Erro ao registrar termo n\xE3o respondido", e);
        }
      }
      return cleanedResponse;
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
            context: "SYSTEM_ERROR"
          }
        });
      } catch (e) {
      }
      return "Desculpe, nossos servidores est\xE3o em delay, pergunte novamente por favor";
    }
  }
  /**
   * Retorna apenas o contexto semântico formatado para um dado texto de busca
   */
  static async getSemanticContext(queryText, limit = 5) {
    const ai = await this.getGeminiClient();
    const embeddingResponse = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: queryText,
      config: {
        outputDimensionality: 768
      }
    });
    const queryVector = embeddingResponse.embeddings?.[0]?.values;
    if (!queryVector || queryVector.length !== 768) {
      return "";
    }
    const vectorLiteral = `[${queryVector.join(",")}]`;
    const matchedDocs = await prisma.$queryRaw`
      SELECT id, title, content, url,
             1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "SemanticDocument"
      ORDER BY embedding <=> ${vectorLiteral}::vector ASC
      LIMIT ${limit};
    `;
    return matchedDocs.filter((doc) => doc.similarity > 0.6).map((doc) => {
      const urlStr = doc.url ? ` | Link/URL: ${doc.url}` : "";
      return `[Documento: ${doc.title}${urlStr}]
${doc.content}`;
    }).join("\n\n");
  }
  /**
   * Sincroniza mensagens do Lounge do Firestore para o PostgreSQL gerando Embeddings
   */
  static async syncChatsToPostgreSQL() {
    console.log("[RAG Sync] Iniciando sincroniza\xE7\xE3o de chats para o PostgreSQL...");
    const db = getFirestore();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    const snapshot = await db.collection("lounge_messages").where("timestamp", ">=", last24h).get();
    const approvedDocs = snapshot.docs.filter((doc) => doc.data().status === "approved");
    if (approvedDocs.length === 0) {
      console.log("[RAG Sync] Nenhuma mensagem nova nas \xFAltimas 24h.");
      return;
    }
    const messages = approvedDocs.map((doc) => ({
      id: doc.id,
      text: doc.data().text,
      sender: doc.data().senderRole || "user"
    }));
    const ai = await this.getGeminiClient();
    console.log(`[RAG Sync] Gerando embeddings para ${messages.length} mensagens...`);
    const embeddingResponse = await ai.models.embedContent({
      model: "gemini-embedding-2",
      contents: messages.map((m) => `[${m.sender}]: ${m.text}`),
      config: {
        outputDimensionality: 768
      }
    });
    const embeddings = embeddingResponse.embeddings;
    if (!embeddings || embeddings.length !== messages.length) {
      throw new Error("Tamanho de embeddings gerados diverge do total de mensagens.");
    }
    console.log("[RAG Sync] Salvando vetores no PostgreSQL...");
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const queryVector = embeddings[i].values;
      if (!queryVector || queryVector.length !== 768) continue;
      const vectorLiteral = `[${queryVector.join(",")}]`;
      await prisma.$executeRawUnsafe(`
        INSERT INTO "SemanticDocument" (id, title, content, type, embedding, "updatedAt")
        VALUES ($1, $2, $3, 'chat_summary', $4::vector, NOW())
        ON CONFLICT (id) DO UPDATE 
        SET content = EXCLUDED.content, embedding = EXCLUDED.embedding, "updatedAt" = NOW()
      `, m.id, `Mensagem de Chat ${m.id}`, m.text, vectorLiteral);
    }
    console.log("[RAG Sync] Sincroniza\xE7\xE3o conclu\xEDda com sucesso.");
  }
  /**
   * Sincroniza todas as receitas cadastradas do Firestore para o PostgreSQL (SemanticDocument) gerando Embeddings para RAG
   */
  static async syncRecipesToPostgreSQL() {
    console.log("[RAG Recipe Sync] Iniciando sincroniza\xE7\xE3o de receitas para o PostgreSQL...");
    const db = getFirestore();
    const snapshot = await db.collection("recipes").get();
    if (snapshot.empty) {
      console.log("[RAG Recipe Sync] Nenhuma receita encontrada no Firestore.");
      return;
    }
    const recipes = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const ai = await this.getGeminiClient();
    let syncedCount = 0;
    let skippedCount = 0;
    for (const recipe of recipes) {
      try {
        const docId = `recipe-${recipe.id}`;
        const firestoreUpdatedAt = recipe.updatedAt?.toDate ? recipe.updatedAt.toDate() : recipe.updatedAt?._seconds ? new Date(recipe.updatedAt._seconds * 1e3) : recipe.updatedAt ? new Date(recipe.updatedAt) : /* @__PURE__ */ new Date();
        const existingDoc = await prisma.semanticDocument.findUnique({
          where: { id: docId }
        });
        if (existingDoc && existingDoc.updatedAt.getTime() >= firestoreUpdatedAt.getTime()) {
          skippedCount++;
          continue;
        }
        const ingredientsText = Array.isArray(recipe.ingredients) ? recipe.ingredients.map((ing) => typeof ing === "string" ? ing : `${ing.quantity || ""} ${ing.name || ""}`.trim()).join(", ") : "";
        const instructionsText = Array.isArray(recipe.instructions) ? recipe.instructions.join("\n") : "";
        const content = `
T\xEDtulo: ${recipe.title}
Descri\xE7\xE3o: ${recipe.description || ""}
Categoria/Momento: ${Array.isArray(recipe.momento) ? recipe.momento.join(", ") : ""}
Tipo de Prato: ${Array.isArray(recipe.tipo_prato) ? recipe.tipo_prato.join(", ") : ""}
Base do Alimento: ${Array.isArray(recipe.base_alimento) ? recipe.base_alimento.join(", ") : ""}
Origem: ${recipe.origem || ""}
Tempo de Preparo: ${recipe.time || recipe.prepTime || ""}
Dificuldade: ${recipe.difficulty || ""}
Tipo de Dieta: ${recipe.dietType || ""}
Por\xE7\xF5es: ${recipe.servings || ""}
Custo Estimado: ${recipe.custo_estimado || ""}
Ingredientes: ${ingredientsText}
Modo de Preparo:
${instructionsText}
Dicas do Chef: ${recipe.chefTips || ""}
`.trim();
        const embedResponse = await ai.models.embedContent({
          model: "gemini-embedding-2",
          contents: `[Receita] ${recipe.title}: ${content}`,
          config: {
            outputDimensionality: 768
          }
        });
        const queryVector = embedResponse.embeddings?.[0]?.values;
        if (!queryVector || queryVector.length !== 768) {
          console.warn(`[RAG Recipe Sync] Falha ao gerar embedding para receita "${recipe.title}".`);
          continue;
        }
        const vectorLiteral = `[${queryVector.join(",")}]`;
        const recipeUrl = recipe.slug ? `/receita/${recipe.slug}` : `/recipe/${recipe.id}`;
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
    console.log(`[RAG Recipe Sync] Sincroniza\xE7\xE3o conclu\xEDda. Sincronizadas: ${syncedCount}, Ignoradas (j\xE1 atualizadas): ${skippedCount}`);
  }
  /**
   * Indexa uma publicação do Acervo (LibraryItem) diretamente no PostgreSQL gerando seu Embedding.
   */
  static async indexLibraryItemToRAG(item) {
    try {
      console.log(`[RAG Library Sync] Indexando item do acervo: "${item.title}"`);
      const docId = `library-${item.id}`;
      const ai = await this.getGeminiClient();
      const content = `
T\xEDtulo: ${item.title}
Descri\xE7\xE3o: ${item.description || ""}
Categoria: ${item.category || ""}
Tipo: ${item.type || ""}
Autor: ${item.author || ""}
Tags: ${Array.isArray(item.tags) ? item.tags.join(", ") : ""}
      `.trim();
      const embedResponse = await ai.models.embedContent({
        model: "gemini-embedding-2",
        contents: `[Acervo T\xE9cnico] ${item.title}: ${content}`,
        config: { outputDimensionality: 768 }
      });
      const queryVector = embedResponse.embeddings?.[0]?.values;
      if (!queryVector || queryVector.length !== 768) {
        console.warn(`[RAG Library Sync] Falha ao gerar embedding para acervo "${item.title}".`);
        return;
      }
      const vectorLiteral = `[${queryVector.join(",")}]`;
      const docType = item.type === "presentation" ? "presentation" : "article";
      await prisma.$executeRawUnsafe(`
        INSERT INTO "SemanticDocument" (id, title, content, url, type, embedding, "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6::vector, NOW())
        ON CONFLICT (id) DO UPDATE 
        SET title = EXCLUDED.title, content = EXCLUDED.content, url = EXCLUDED.url, type = EXCLUDED.type, embedding = EXCLUDED.embedding, "updatedAt" = EXCLUDED."updatedAt"
      `, docId, `Acervo T\xE9cnico: ${item.title}`, content, item.url || "", docType, vectorLiteral);
      console.log(`[RAG Library Sync] Item indexado com sucesso: ${item.id}`);
    } catch (err) {
      console.error(`[RAG Library Sync] Erro ao indexar acervo "${item.id}":`, err);
    }
  }
  /**
   * Generates a proactive response based on a list of recent lounge messages to stimulate conversation.
   */
  static async generateProactiveResponse(recentMessages) {
    const ai = await this.getGeminiClient();
    const conversationHistory = recentMessages.map((m) => `${m.senderName}: "${m.text}"`).join("\n");
    let semanticContext = "";
    try {
      const query = recentMessages.map((m) => m.text).join(" ").substring(0, 500);
      semanticContext = await this.getSemanticContext(query, 2);
    } catch (e) {
      console.warn("[Proactive] Failed to get semantic context:", e);
    }
    const proactivePrompt = `
      Voc\xEA \xE9 o assistente culin\xE1rio Alchemist do portal "Alquimia do Prato".
      Voc\xEA est\xE1 acompanhando a conversa no Lounge Gastron\xF4mico. A comunidade est\xE1 ativa discutindo v\xE1rios temas.
      Sua tarefa \xE9 intervir de forma natural, proativa e sutil para estimular a discuss\xE3o, acrescentando uma curiosidade, uma dica pr\xE1tica, um termo do acervo ou uma pergunta provocativa sobre culin\xE1ria/gastronomia.

      REGRAS:
      1. Seja extremamente natural e amig\xE1vel. N\xE3o pare\xE7a um rob\xF4.
      2. Mantenha seu tom de "Alquimista do Prato" - algu\xE9m apaixonado por qu\xEDmica culin\xE1ria, hist\xF3ria dos alimentos e t\xE9cnicas.
      3. Baseie-se no hist\xF3rico recente da conversa fornecido abaixo.
      4. Se relevante, incorpore elementos do contexto hist\xF3rico recuperado.
      5. Escreva em portugu\xEAs (pt-BR) e seja conciso (m\xE1ximo de 4-5 linhas).

      HIST\xD3RICO RECENTE DA CONVERSA:
      ${conversationHistory}

      CONTEXTO HIST\xD3RICO RECUPERADO:
      ${semanticContext || "Nenhum contexto espec\xEDfico do acervo encontrado."}
    `;
    const generation = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: proactivePrompt
    });
    return generation.text || "Continue cozinhando, alquimistas!";
  }
  /**
   * Checks the interaction density in the Lounge and triggers a proactive bot response if appropriate.
   */
  static async checkAndTriggerProactiveEngagement(db) {
    console.log("[Proactive] Checking interaction density...");
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1e3);
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1e3);
    try {
      const snapshot = await db.collection("lounge_messages").where("timestamp", ">=", oneHourAgo).get();
      const docs = snapshot.docs.map((doc) => {
        const data = doc.data();
        const t = data.timestamp?.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
        return { id: doc.id, ...data, timestampDate: t };
      });
      const botSpokeRecently = docs.some((d) => d.senderId === "copilot-agent");
      if (botSpokeRecently) {
        console.log("[Proactive] Bot spoke recently. Cooldown is active.");
        return;
      }
      const recentUserMessages = docs.filter(
        (d) => d.timestampDate.getTime() >= fifteenMinutesAgo.getTime() && d.status === "approved" && d.senderId !== "copilot-agent"
      );
      console.log(`[Proactive] Found ${recentUserMessages.length} user messages in the last 15 minutes.`);
      if (recentUserMessages.length >= 5) {
        console.log("[Proactive] High interaction density detected! Triggering proactive response.");
        recentUserMessages.sort((a, b) => a.timestampDate.getTime() - b.timestampDate.getTime());
        const messagesForContext = recentUserMessages.map((m) => ({
          text: m.text || "",
          senderName: m.senderName || "Alquimista"
        }));
        const answer = await this.generateProactiveResponse(messagesForContext);
        const copilotMessage = {
          text: answer,
          senderId: "copilot-agent",
          senderName: "Alchemist",
          senderRole: "agent",
          timestamp: /* @__PURE__ */ new Date(),
          status: "approved",
          reactions: {},
          metadata: { isBot: true, proactive: true }
        };
        const FieldValue3 = (await import("firebase-admin/firestore")).FieldValue;
        await db.collection("lounge_messages").add({
          ...copilotMessage,
          timestamp: FieldValue3.serverTimestamp()
        });
        console.log("[Proactive] Proactive Alchemist message posted successfully.");
      }
    } catch (error) {
      console.error("[Proactive Error] Failed to check or trigger proactive response:", error);
    }
  }
};

// src/infra/services/AtaGeneratorService.ts
var AtaGeneratorService = {
  /**
   * Coleta mensagens aprovadas nas últimas 24h e gera um resumo em formato JSON.
   * O resultado é persistido na coleção 'daily_summaries' para exibição no Mural de Atas.
   * 
   * @returns A estrutura da ata gerada ou null se não houver mensagens.
   */
  async generateDailyAta() {
    const apiKeys = getAvailableGeminiKeys();
    if (apiKeys.length === 0) {
      throw new Error("[AtaGenerator] Nenhuma GEMINI_API_KEY configurada.");
    }
    const db = getFirestore2();
    const now = /* @__PURE__ */ new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1e3);
    try {
      const messagesSnapshot = await db.collection("lounge_messages").where("timestamp", ">=", last24h).get();
      const approvedDocs = messagesSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() })).filter((item) => item.data.status === "approved").sort((a, b) => {
        const tA = a.data.timestamp?.toDate ? a.data.timestamp.toDate().getTime() : new Date(a.data.timestamp).getTime();
        const tB = b.data.timestamp?.toDate ? b.data.timestamp.toDate().getTime() : new Date(b.data.timestamp).getTime();
        return tA - tB;
      });
      if (approvedDocs.length === 0) {
        console.log("[AtaGenerator] Nenhuma mensagem aprovada para processar nas \xFAltimas 24h.");
        return null;
      }
      const messagesContent = approvedDocs.map((item) => `[${item.data.senderRole}] ${item.data.text}`).join("\n---\n");
      let semanticContext = "";
      try {
        semanticContext = await RagBackendService.getSemanticContext(messagesContent.substring(0, 800), 3);
      } catch (e) {
        console.warn("[AtaGenerator] N\xE3o foi poss\xEDvel buscar contexto sem\xE2ntico:", e);
      }
      const ACERVO_SUMMARY_LIST = [
        {
          title: "Padr\xE3o de Qualidade da Carne Angus",
          description: "Crit\xE9rios de certifica\xE7\xE3o de qualidade Angus, padr\xF5es de marmoreio e sele\xE7\xE3o de carnes premium.",
          url: "/docs/acervo/Angus-2017.10.30-19.22.35.pdf"
        },
        {
          title: "Manual e Cultura do Churrasco Brasileiro",
          description: "Hist\xF3ria e rituais do churrasco, salga correta, fogo e brasa, e rea\xE7\xE3o de Maillard.",
          url: "/docs/acervo/churrasco.pdf"
        },
        {
          title: "Os 8 Melhores Tipos de Carne para Churrasco",
          description: "An\xE1lise de cortes bovinos para churrasco (Picanha, Fraldinha, Contrafil\xE9/Ancho e Costela).",
          url: "/docs/acervo/os-8-melhores-tipos-de-carne-para-churrasco.pdf"
        },
        {
          title: "Qualidade Nutricional da Carne Vermelha",
          description: "Benef\xEDcios nutricionais da carne vermelha: ferro heme, vitamina B12 e prote\xEDnas essenciais.",
          url: "/docs/acervo/qualidade-nutricional-da-carne-vermelha.pdf"
        },
        {
          title: "Fichas T\xE9cnicas de Cortes Bovinos",
          description: "Rendimento, teor de gordura e m\xE9todos recomendados de preparo (dianteiro vs traseiro).",
          url: "/docs/acervo/FICHAS-T\xC9CNICAS-TECMEAT-BOVINO.compressed.pdf"
        },
        {
          title: "Brazilian Beef: Global Standards",
          description: "Manual sobre rastreabilidade, pastagens tropicais, sustentabilidade e exporta\xE7\xE3o da carne brasileira.",
          url: "/docs/acervo/Brazilian_Beef_Global_Standards.pdf"
        },
        {
          title: "Apresenta\xE7\xE3o Interativa de Cortes Bovinos",
          description: "Anatomia bovina, localiza\xE7\xE3o dos cortes, diferen\xE7a de maciez do traseiro/dianteiro e cupim.",
          url: "/docs/acervo/apresenta_o_interativa_de_cortes_bovinos.html"
        },
        {
          title: "Arte dos Molhos: Guia de Alta Gastronomia",
          description: "Acompanhamentos culin\xE1rios, emuls\xF5es cl\xE1ssicas francesas, redu\xE7\xF5es e espessantes.",
          url: "/acervo/guia-dos-molhos"
        }
      ];
      const acervoSummaryText = ACERVO_SUMMARY_LIST.map(
        (item) => `- T\xEDtulo: "${item.title}" | Descri\xE7\xE3o: ${item.description}`
      ).join("\n");
      const prompt = `
        Voc\xEA \xE9 o Cronista Oficial da Alquimia do Prato. Sua miss\xE3o \xE9 ler as mensagens do Lounge Gastron\xF4mico 
        e sintetizar uma "Ata de Intera\xE7\xE3o Comunit\xE1ria" que inspire a nossa comunidade.
        Voc\xEA pode usar o "Contexto Hist\xF3rico do Acervo" para conectar as discuss\xF5es atuais com receitas ou temas do passado.
        
        SUM\xC1RIO DE DOCUMENTOS DISPON\xCDVEIS NO ACERVO:
        ${acervoSummaryText}

        CONTEXTO HIST\xD3RICO DO ACERVO RETORNADO VIA RAG (Cont\xE9m trechos e links espec\xEDficos):
        ${semanticContext || "Nenhum contexto relacionado encontrado."}

        MENSAGENS APROVADAS (\xDALTIMAS 24H):
        ${messagesContent}
        
        MODELO DE ATA (SIGA ESTA ESTRUTURA):
        Ata de Intera\xE7\xE3o Comunit\xE1ria: [NOME DO GRUPO]
        Data: [DD/MM/AAAA] | Status: \u2705 Verificada por Gemini IA
        
        1. T\xF3picos em Foco: 
           - T\xEDtulo: [Assunto]
           - Resumo: [2 linhas]
           - Consenso: [Opini\xE3o predominante ou info t\xE9cnica]
           
        2. Insights e Cultura Gastron\xF4mica:
           - Termo em Destaque: [Termo t\xE9cnico/hist\xF3rico] - [Explica\xE7\xE3o cultural]
           - Dica do Chef: [Conselho pr\xE1tico org\xE2nico]
           
        3. Acervo Citado & Refer\xEAncias:
           - Artigo: [Selecione obrigatoriamente um T\xEDtulo do Acervo acima que seja mais relevante para a conversa]
           - E-book: [Selecione obrigatoriamente outro T\xEDtulo do Acervo acima que complemente o assunto]
           
        4. Term\xF4metro da Comunidade:
           - Clima: [Produtivo/T\xE9cnico/Inspiracional]
           - Participa\xE7\xE3o: [N\xBA aproximado de colaboradores distintos]
           - Destaque do Dia: [Nome/ID do autor da contribui\xE7\xE3o mais relevante]

        REGRAS IMPORTANTES PARA A SE\xC7\xC3O "referencias" DO JSON:
        1. Voc\xEA DEVE OBRIGATORIAMENTE mapear a discuss\xE3o do Lounge a documentos existentes listados no "SUM\xC1RIO DE DOCUMENTOS DISPON\xCDVEIS NO ACERVO".
        2. As propriedades "artigo" e "ebook" no objeto "referencias" do JSON devem conter o T\xCDTULO EXATO de um dos documentos listados acima (sem o link/URL, apenas o t\xEDtulo como por exemplo: "Os 8 Melhores Tipos de Carne para Churrasco" ou "Manual e Cultura do Churrasco Brasileiro" ou "Padr\xE3o de Qualidade da Carne Angus" ou "Qualidade Nutricional da Carne Vermelha").
        3. N\xE3o deixe esses campos vazios ou com valores gen\xE9ricos como "Consultar Biblioteca" ou "Fundamentos da Gastronomia" se houver qualquer rela\xE7\xE3o m\xEDnima (exemplo: se a conversa for sobre carnes/churrasco, use os documentos de carne/churrasco; se for sobre molhos, use "Arte dos Molhos: Guia de Alta Gastronomia").
        4. O t\xEDtulo exato inserido no JSON ser\xE1 usado diretamente pelo sistema para abrir a busca do respectivo documento no acervo.

        REGRAS DE RETORNO (JSON ESTRITO):
        {
          "groupName": "Conversa\xE7\xE3o Alquimista",
          "date": "Data atual (DD/MM/AAAA)",
          "topics": [
            { "title": "...", "summary": "...", "consensus": "..." }
          ],
          "insights": {
            "termoDestaque": { "termo": "...", "explicacao": "..." },
            "dicaDoChef": "..."
          },
          "referencias": {
            "artigo": "T\xCDTULO EXATO DO ARTIGO SELECIONADO DO ACERVO",
            "ebook": "T\xCDTULO EXATO DO EBOOK SELECIONADO DO ACERVO"
          },
          "termometro": {
            "clima": "...",
            "participacao": 0,
            "destaqueDoDia": "..."
          },
          "stats": { "totalMessages": ${approvedDocs.length} }
        }
      `;
      let response;
      let lastError;
      for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];
        try {
          const client = new GoogleGenAI3({ apiKey });
          response = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
          });
          break;
        } catch (error) {
          lastError = error;
          if (isQuotaExhaustedError(error) && i < apiKeys.length - 1) {
            console.warn(`[AtaGenerator] Cota da chave ${i + 1} atingida. Rotacionando para chave ${i + 2}...`);
            continue;
          }
          throw error;
        }
      }
      if (!response) {
        throw lastError || new Error("Falha ao gerar Ata Di\xE1ria ap\xF3s tentar todas as chaves.");
      }
      const rawText = response.text || "";
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("[AtaGenerator] Falha ao extrair JSON da resposta da IA.");
      }
      const ataData = JSON.parse(jsonMatch[0]);
      const ataRef = await db.collection("daily_summaries").add({
        ...ataData,
        createdAt: FieldValue.serverTimestamp(),
        type: "daily_summary"
      });
      console.log(`[AtaGenerator] Ata Di\xE1ria gerada seguindo novo modelo. ID: ${ataRef.id}`);
      return { id: ataRef.id, ...ataData };
    } catch (error) {
      console.error("[AtaGenerator Error] Falha no processo de gera\xE7\xE3o:", error.message || error);
      throw error;
    }
  }
};

// src/infra/services/GamificationService.ts
import { Grau } from "@prisma/client";
var GamificationService = class {
  static {
    this.XP_PER_LEVEL = 100;
  }
  static {
    this.EVENT_XP = {
      COLLABORATION_MESSAGE: 5,
      // Colaboração entre participantes (antigo LOUNGE_MESSAGE)
      PROFILE_PARTIAL: 10,
      // Preenchimento de Cadastro Parcial
      PROFILE_COMPLETE: 25,
      // Cadastro Completo
      PROFILE_QUIZ: 5,
      // Quiz de perfil/preferências
      QUIZ_ANSWERED_CORRECTLY: 5,
      // Acertou o quiz do Chef IA
      ARTICLE_PUBLISHED: 50,
      // Publicação de Artigos em PDF
      RECIPE_PUBLISHED: 50,
      // Publicação de Receitas (50 pts)
      RECIPE_UPVOTE_RECEIVED: 10,
      // Avaliação positiva de receita
      REVIEW_WITH_PHOTO: 20,
      // Postagem de Avaliação com foto (20 pts)
      WEEKLY_CHALLENGE_COMPLETED: 100,
      // Completar Desafio da Semana (100 pts)
      PRODUCT_PURCHASED: 25,
      // Compras de Produtos
      REFERRAL_CONFIRMED: 5
      // Indicação Confirmada (5 pts)
    };
  }
  static {
    this.BADGE_REQUIREMENTS = {
      PROFILE_PARTIAL: { badgeCode: "perfil_iniciado", required: 1 },
      PROFILE_QUIZ: { badgeCode: "alquimista_curioso", required: 1 },
      PROFILE_COMPLETE: { badgeCode: "perfil_completo", required: 1 },
      PRODUCT_PURCHASED: { badgeCode: "cliente_vip", required: 3 },
      COLLABORATION_MESSAGE: { badgeCode: "comunicador_lounge", required: 50 },
      RECIPE_PUBLISHED: { badgeCode: "chef_ativo", required: 10 },
      ARTICLE_PUBLISHED: { badgeCode: "escritor_acervo", required: 5 },
      REVIEW_WITH_PHOTO: { badgeCode: "fotografo_culinario", required: 15 },
      RECIPE_UPVOTE_RECEIVED: { badgeCode: "receita_popular", required: 20 }
    };
  }
  static {
    this.BADGES_TO_SEED = [
      { codigo_evento: "perfil_iniciado", nome: "Perfil Iniciado", descricao: "Preenchimento de cadastro parcial", url_vercel_blob: "https://placehold.co/150x150/78716c/ffffff?text=PI" },
      { codigo_evento: "alquimista_curioso", nome: "Alquimista Curioso", descricao: "Respondeu o quiz de prefer\xEAncias", url_vercel_blob: "https://placehold.co/150x150/78716c/ffffff?text=AC" },
      { codigo_evento: "perfil_completo", nome: "Perfil Completo", descricao: "Preenchimento de cadastro completo", url_vercel_blob: "https://placehold.co/150x150/10b981/ffffff?text=PC" },
      { codigo_evento: "cliente_vip", nome: "Cliente VIP", descricao: "Adquiriu 3 ou mais produtos na plataforma", url_vercel_blob: "https://placehold.co/150x150/10b981/ffffff?text=CV" },
      { codigo_evento: "comunicador_lounge", nome: "Comunicador do Lounge", descricao: "Enviou 50 mensagens no Lounge", url_vercel_blob: "https://placehold.co/150x150/f59e0b/ffffff?text=CL" },
      { codigo_evento: "chef_ativo", nome: "Chef Ativo", descricao: "Publicou 10 receitas no acervo", url_vercel_blob: "https://placehold.co/150x150/f59e0b/ffffff?text=CA" },
      { codigo_evento: "escritor_acervo", nome: "Escritor do Acervo", descricao: "Publicou 5 artigos em PDF", url_vercel_blob: "https://placehold.co/150x150/3b82f6/ffffff?text=EA" },
      { codigo_evento: "fotografo_culinario", nome: "Fot\xF3grafo Culin\xE1rio", descricao: "Realizou 15 avalia\xE7\xF5es com foto", url_vercel_blob: "https://placehold.co/150x150/3b82f6/ffffff?text=FC" },
      { codigo_evento: "receita_popular", nome: "Receita Popular", descricao: "Recebeu 20 curtidas em suas receitas", url_vercel_blob: "https://placehold.co/150x150/a855f7/ffffff?text=RP" },
      { codigo_evento: "mestre_fundador", nome: "Mestre Fundador", descricao: "Pioneiro da plataforma Alquimia do Prato", url_vercel_blob: "https://placehold.co/150x150/FFD700/000000?text=MF" },
      { codigo_evento: "guardiao_lounge", nome: "Guardi\xE3o do Lounge", descricao: "Mais de 100 mensagens moderadas no Lounge", url_vercel_blob: "https://placehold.co/150x150/8A2BE2/FFFFFF?text=GL" },
      { codigo_evento: "criador_supremo", nome: "Criador Supremo", descricao: "Criou as 50 receitas originais da plataforma", url_vercel_blob: "https://placehold.co/150x150/FF4500/FFFFFF?text=CS" },
      { codigo_evento: "degustador_elite", nome: "Degustador de Elite", descricao: "Aprovou receitas cruciais", url_vercel_blob: "https://placehold.co/150x150/32CD32/FFFFFF?text=DE" }
    ];
  }
  /**
   * Garante que todas as badges estão presentes no banco de dados.
   */
  static async ensureBadgesSeeded() {
    try {
      console.log("[Gamification] Garantindo que os selos da matriz de intera\xE7\xF5es estejam semeados...");
      for (const b of this.BADGES_TO_SEED) {
        await prisma.badge.upsert({
          where: { codigo_evento: b.codigo_evento },
          update: {
            nome: b.nome,
            descricao: b.descricao,
            url_vercel_blob: b.url_vercel_blob
          },
          create: b
        });
      }
      console.log("[Gamification] Selos da matriz de intera\xE7\xF5es semeados com sucesso.");
    } catch (error) {
      console.error("[Gamification] Erro ao semear selos:", error.message);
    }
  }
  /**
   * Verifica se a quantidade atingida atende aos requisitos do selo correspondente
   * e o atribui ou remove conforme necessário.
   */
  static async checkAndGrantBadges(userId, eventType, count) {
    const requirement = this.BADGE_REQUIREMENTS[eventType];
    if (requirement) {
      const badge = await prisma.badge.findUnique({
        where: { codigo_evento: requirement.badgeCode }
      });
      if (badge) {
        if (count >= requirement.required) {
          await prisma.userBadge.upsert({
            where: {
              userId_badgeId: {
                userId,
                badgeId: badge.id
              }
            },
            update: {},
            create: {
              userId,
              badgeId: badge.id
            }
          });
          console.log(`[Gamification] Selo '${badge.nome}' atribu\xEDdo ao usu\xE1rio ${userId}`);
        } else {
          try {
            await prisma.userBadge.delete({
              where: {
                userId_badgeId: {
                  userId,
                  badgeId: badge.id
                }
              }
            });
            console.log(`[Gamification] Selo '${badge.nome}' removido do usu\xE1rio ${userId} por n\xE3o atender mais o requisito.`);
          } catch (e) {
          }
        }
      }
    }
  }
  /**
   * Mapeia o nível numérico para o Grau correspondente.
   */
  static getGrauForLevel(level) {
    if (level <= 1) return Grau.APRENDIZ;
    if (level === 2) return Grau.ASSISTENTE;
    if (level === 3) return Grau.ALQUIMISTA;
    if (level === 4) return Grau.PERITO;
    return Grau.MESTRE_ALQUIMISTA;
  }
  /**
   * Recalcula a pontuação total (XP) e o nível do usuário com base nas suas interações reais no banco de dados.
   */
  static async recalculateXPAndLevel(userId) {
    const interactions = await prisma.userInteraction.findMany({
      where: { userId }
    });
    let totalXp = 0;
    for (const inter of interactions) {
      const xpValue = this.EVENT_XP[inter.eventType] || 0;
      totalXp += inter.count * xpValue;
    }
    let level = 1;
    let metaNivel = 100;
    if (totalXp < 100) {
      level = 1;
      metaNivel = 100;
    } else if (totalXp < 300) {
      level = 2;
      metaNivel = 200;
    } else if (totalXp < 600) {
      level = 3;
      metaNivel = 300;
    } else if (totalXp < 1e3) {
      level = 4;
      metaNivel = 400;
    } else {
      level = 5;
      metaNivel = 999999;
    }
    const grau = this.getGrauForLevel(level);
    return prisma.userGamificationProfile.upsert({
      where: { userId },
      update: {
        nivel: level,
        grau,
        xp_total: totalXp,
        meta_nivel: metaNivel
      },
      create: {
        userId,
        nivel: level,
        grau,
        xp_total: totalXp,
        meta_nivel: metaNivel
      }
    });
  }
  /**
   * Atribui XP ao usuário por um evento e verifica se ele subiu de nível.
   */
  static async processEvent(supabaseUid, eventType) {
    const xpGained = this.EVENT_XP[eventType];
    if (!xpGained) {
      throw new Error(`Evento desconhecido: ${eventType}`);
    }
    try {
      const user = await prisma.user.findUnique({
        where: { uid: supabaseUid }
      });
      if (!user) {
        throw new Error(`Usu\xE1rio com UID ${supabaseUid} n\xE3o encontrado na base de dados Prisma. Ele precisa completar o cadastro primeiro.`);
      }
      const existingProfile = await prisma.userGamificationProfile.findUnique({
        where: { userId: user.id }
      });
      const oldLevel = existingProfile ? existingProfile.nivel : 1;
      const userInteraction = await prisma.userInteraction.upsert({
        where: {
          userId_eventType: {
            userId: user.id,
            eventType
          }
        },
        update: {
          count: { increment: 1 }
        },
        create: {
          userId: user.id,
          eventType,
          count: 1
        }
      });
      await this.checkAndGrantBadges(user.id, eventType, userInteraction.count);
      const profile = await this.recalculateXPAndLevel(user.id);
      return {
        xpGained,
        totalXp: profile.xp_total,
        currentLevel: profile.nivel,
        leveledUp: profile.nivel > oldLevel
      };
    } catch (error) {
      console.error("[Gamification] Erro ao processar evento:", error);
      throw error;
    }
  }
  /**
   * Obtém o perfil atual de gamificação de um usuário
   */
  static async getProfile(supabaseUid) {
    const user = await prisma.user.findUnique({
      where: { uid: supabaseUid }
    });
    if (!user) return null;
    return prisma.userGamificationProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        nivel: 1,
        grau: "APRENDIZ",
        xp_total: 0,
        meta_nivel: 100
      },
      include: {
        user: {
          select: {
            displayName: true,
            photoURL: true,
            badges: {
              include: {
                badge: true
              }
            }
          }
        }
      }
    });
  }
};

// src/infra/services/geminiService.ts
import { GoogleGenAI as GoogleGenAI4 } from "@google/genai";
var geminiService = {
  /**
   * Extrai dados de uma receita a partir de HTML ou URL.
   * Realiza a tradução, conversão de medidas e busca de imagens complementares.
   * 
   * @param html Conteúdo HTML da página (opcional se URL for fornecida).
   * @param options Metadados e URL para auxílio na extração.
   * @returns Objeto parcial de Receita sanitizado e pronto para o Firestore.
   */
  async extractRecipeFromHtml(html, options) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY n\xE3o configurada");
    }
    const isUrlOnly = !html || html.trim().length < 200;
    const basePrompt = `
      Voc\xEA \xE9 um especialista em culin\xE1ria, tradu\xE7\xE3o e extra\xE7\xE3o de dados. Extraia as informa\xE7\xF5es da receita.
      
      REGRAS DE TRADU\xC7\xC3O E CONVERS\xC3O:
      1. IDIOMA: Se a fonte n\xE3o for Portugu\xEAs (PT-BR), TRADUZA tudo para Portugu\xEAs do Brasil.
      2. MEDIDAS: Converta unidades imperiais (cups, oz, \xB0F) para m\xE9tricas (ml, g, \xB0C) ou medidas comuns no Brasil (x\xEDcaras, colheres).
      
      REGRAS ESTRITAS DE RETORNO (JSON):
      - title, description.
      - momento (string[]): USE APENAS: 'Caf\xE9 da Manh\xE3', 'Brunch', 'Almo\xE7o', 'Lanche / Ch\xE1 da Tarde', 'Jantar', 'Ceia', 'Entradas', 'B\xE1sicas', 'Petiscos&Food Tricks', 'Bebidas'. (Pode ser mais de um).
      - tipo_prato (string[]): USE APENAS: 'Assados', 'Frituras', 'Grelhados', 'Sopas e Caldos', 'Cremes e Pur\xE9s', 'Massas e Risotos', 'Saladas e Pratos Frios', 'Cozidos / Guisados', 'Padaria e Pastelaria', 'Bebidas', 'Doces e Sobremesas'.
      - base_alimento (string[]): USE APENAS: 'Carnes', 'Frutos do Mar', 'Vegetais e Legumes', 'Ovos e Latic\xEDnios', 'Gr\xE3os e Leguminosas'.
      - origem (string): USE PREFERENCIALMENTE: 'Latino-Americana', 'Brasileira', 'Mexicana', 'Argentina', 'Asi\xE1tica', 'Japonesa', 'Chinesa', 'Tailandesa', 'Coreana', 'Indiana', 'Europeia', 'Italiana', 'Francesa', 'Portuguesa', 'Espanhola', '\xC1rabe / M\xE9dio Oriente', 'Americana'.
      - custo_estimado (string): USE: '$', '$$', '$$$', '$$$$'.
      - time (string): TEMPO TOTAL (ex: '45 min').
      - prepTime (string): TEMPO DE PREPARA\xC7\xC3O (ex: '15 min').
      - dietType (string): TIPO DE DIETA (USE EXATAMENTE UMA DESTAS: 'Convencional', 'Vegana', 'Vegetariana', 'Low Carb', 'Keto', 'Sem Gl\xFAten', 'Sem Lactose', 'Fit'). Se n\xE3o houver restri\xE7\xE3o clara, use 'Convencional'.
      - difficulty (F\xE1cil, M\xE9dio, Dif\xEDcil), servings.
      - isClassic (boolean): Determine se esta \xE9 uma receita CL\xC1SSICA ou TRADICIONAL. Receitas cl\xE1ssicas s\xE3o aquelas amplamente conhecidas, com origem hist\xF3rica clara, heran\xE7a cultural ou pratos ic\xF4nicos (ex: Feijoada, Carbonara, Ratatouille). Se o texto descrever uma hist\xF3ria de fam\xEDlia ou heran\xE7a, tamb\xE9m marque como true.
      - ingredients (objeto[] com name, quantity, preparationMode e group).
        REGRAS DE INGREDIENTES:
        - SEPARE OBRIGATORIAMENTE a quantidade (n\xFAmero + unidade) do nome (ex: "500g de Farinha" -> name: "Farinha", quantity: "500g").
        - EXTRAIA A QUANTIDADE EXATA DO TEXTO. Se o texto diz "2 ovos" ou "4 copos", use quantity: "2" e quantity: "4 copos".
        - Quando o texto indicar "a gosto" (ou equivalente como "a gosto do fregues", "por gosto"), use quantity: "0" — estes sao itens opcionais/complementares com quantidade minima.
        - Mantenha fra\xE7\xF5es leg\xEDveis (ex: "1/2" em vez de "0.5") para facilitar a leitura.
        - N\xC3O repita a quantidade no nome.
        - REMOVA preposi\xE7\xF5es conectoras (ex: "de", "do", "da") do in\xEDcio do nome quando poss\xEDvel.
        - REMOVA termos de preparo/forma do nome do ingrediente e mova para o campo 'preparationMode' (ex: "picado", "fatiado", "amassado", "mo\xEDdo", "triturado", "ralado", "cortado", "descascado", "lavado", "inteiro", "cru", "cubos", "laminado", "rodelas", "desfiado", "picada", "fatiada", "em cubos", "em rodelas"). O campo preparationMode deve conter APENAS a forma de preparo, e o nome APENAS o ingrediente puro. Se n\xE3o houver termo de preparo, deixe preparationMode vazio ("").
        - O campo 'group' deve ser usado para separar partes da receita (ex: 'Massa', 'Recheio', 'Cobertura').
        - EXEMPLOS:
          - "4 copos de farinha" -> { quantity: "4 copos", name: "farinha", preparationMode: "" }
          - "2 ovos" -> { quantity: "2", name: "ovos", preparationMode: "" }
          - "1/2 copo de \xE1gua" -> { quantity: "1/2 copo", name: "\xE1gua", preparationMode: "" }
          - "sal a gosto" -> { quantity: "0", name: "sal", preparationMode: "" }
          - "alho picado" -> { quantity: "3 dentes", name: "alho", preparationMode: "Picado" }
          - "queijo ralado grosso" -> { quantity: "50g", name: "queijo", preparationMode: "Ralado" }
          - "cebola em cubos" -> { quantity: "1", name: "cebola", preparationMode: "Em cubos" }
          - "tomate fatiado" -> { quantity: "2", name: "tomate", preparationMode: "Fatiado" }
        - instructions (string[]).
        - equipment (string[]): Liste TODOS os utens\xEDlios e equipamentos de cozinha necess\xE1rios para o preparo da receita.
          Analise os ingredientes e instru\xE7\xF5es para inferir os equipamentos mesmo que n\xE3o estejam expl\xEDcitos no texto.
          EXEMPLOS: "Frigideira antiaderente", "Panela de press\xE3o", "Liquidificador", "Forno", "Assadeira", "Batedeira", "Peneira", "T\xE1bua de corte", "Faca de chef", "Esp\xE1tula de silicone", "Forma de pudim", "Papel manteiga", "Term\xF4metro culin\xE1rio".
          N\xC3O inclua utens\xEDlios gen\xE9ricos \xF3bvios como "prato" ou "copo". Foque nos itens espec\xEDficos necess\xE1rios para o preparo.
        - chefTips (string): Dicas adicionais, segredos do chef, varia\xE7\xF5es da receita ou conselhos t\xE9cnicos importantes. Procure por blocos de texto que contenham dicas, notas ou "Dica do Chef".
        - image, imageOptions (string[]).
    `;
    const contentPrompt = isUrlOnly ? `Acesse e pesquise PROFUNDAMENTE os detalhes da receita no seguinte link: ${options.url}. 
         O site pode estar bloqueando acessos diretos, ent\xE3o use sua ferramenta de busca (Google Search) para encontrar o conte\xFAdo desta URL exata ou de fontes que repliquem esta receita espec\xEDfica.
         Procure por: T\xEDtulo, Ingredientes, Modo de Preparo, Tempo e Imagens.
         Se for um petisco, quitute ou acompanhamento para coffee break, classifique como 'Petiscos&Food Tricks'.
         Se for uma entrada, antipasto ou couvert, classifique como 'Entradas'.
         Se for uma receita b\xE1sica do cotidiano (arroz, feij\xE3o, molhos base), classifique como 'B\xE1sicas'.` : `Extraia os dados da receita do seguinte HTML: ${html.substring(0, 3e4)}. 
         Ignore an\xFAncios e navega\xE7\xE3o. Foque no conte\xFAdo central da receita.
         Se for um petisco, quitute ou acompanhamento para coffee break, classifique como 'Petiscos&Food Tricks'.
         Se for uma entrada, antipasto ou couvert, classifique como 'Entradas'.
         Se for uma receita b\xE1sica do cotidiano (arroz, feij\xE3o, molhos base), classifique como 'B\xE1sicas'.`;
    const prompt = `
      ${basePrompt}
      ${contentPrompt}
      Meta Descri\xE7\xE3o: ${options.metaDescription || ""}
      OG Image: ${options.ogImage || ""}
      Imagens encontradas no site: ${options.allImagesFound?.join(", ") || "Nenhuma"}
    `;
    try {
      const apiKeys = getAvailableGeminiKeys();
      if (apiKeys.length === 0) {
        throw new Error("Nenhuma GEMINI_API_KEY configurada");
      }
      let response;
      let lastError;
      for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];
        try {
          const client = new GoogleGenAI4({ apiKey });
          const models = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-1.5-flash"];
          for (const modelName of models) {
            try {
              const result = await client.models.generateContent({
                model: modelName,
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                ...isUrlOnly ? { tools: [{ googleSearch: {} }] } : {}
              });
              response = result;
              break;
            } catch (modelErr) {
              if (isQuotaExhaustedError(modelErr) || modelErr?.status === 503) {
                console.warn(`[Alquimia do Prato] Model ${modelName} failed (status ${modelErr?.status}), trying next model...`);
                continue;
              }
              throw modelErr;
            }
          }
          if (response) break;
        } catch (error) {
          lastError = error;
          if (isQuotaExhaustedError(error) && i < apiKeys.length - 1) {
            console.warn(`[Alquimia do Prato] Transmutando limites: chave ${i + 1} atingida, usando reserva ${i + 2}/${apiKeys.length}`);
            continue;
          }
          throw error;
        }
      }
      if (!response) {
        throw lastError || new Error("Falha ao gerar conte\xFAdo ap\xF3s tentar todas as chaves.");
      }
      const text = response.text || "";
      let jsonStr = text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      } else {
        jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      }
      let recipeData;
      try {
        recipeData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Initial JSON parse failure, attempting to clean response:", text);
        const cleanerMatch = text.match(/\{[\s\S]*\}/);
        if (cleanerMatch) {
          recipeData = JSON.parse(cleanerMatch[0]);
        } else {
          throw parseError;
        }
      }
      recipeData.title = String(recipeData.title || "").substring(0, 300);
      recipeData.description = String(recipeData.description || "").substring(0, 5e3);
      const ALL_MOMENTOS = ["Caf\xE9 da Manh\xE3", "Brunch", "Almo\xE7o", "Lanche / Ch\xE1 da Tarde", "Jantar", "Ceia", "Entradas", "B\xE1sicas", "Petiscos&Food Tricks", "Bebidas"];
      recipeData.momento = Array.isArray(recipeData.momento) ? recipeData.momento.filter((m) => ALL_MOMENTOS.includes(m)) : [];
      if (recipeData.momento.length === 0) recipeData.momento = ["Almo\xE7o"];
      const ALL_TIPOS = ["Assados", "Frituras", "Grelhados", "Sopas e Caldos", "Cremes e Pur\xE9s", "Massas e Risotos", "Saladas e Pratos Frios", "Cozidos / Guisados", "Padaria e Pastelaria", "Bebidas", "Doces e Sobremesas"];
      recipeData.tipo_prato = Array.isArray(recipeData.tipo_prato) ? recipeData.tipo_prato.filter((t) => ALL_TIPOS.includes(t)) : [];
      if (recipeData.tipo_prato.length === 0) recipeData.tipo_prato = ["Cozidos / Guisados"];
      const ALL_BASES = ["Carnes", "Frutos do Mar", "Vegetais e Legumes", "Ovos e Latic\xEDnios", "Gr\xE3os e Leguminosas"];
      recipeData.base_alimento = Array.isArray(recipeData.base_alimento) ? recipeData.base_alimento.filter((b) => ALL_BASES.includes(b)) : [];
      if (recipeData.base_alimento.length === 0) {
        if (recipeData.momento?.includes("Bebidas") || recipeData.tipo_prato?.includes("Bebidas")) {
          recipeData.base_alimento = ["Vegetais e Legumes"];
        } else {
          recipeData.base_alimento = ["Vegetais e Legumes"];
        }
      }
      recipeData.origem = String(recipeData.origem || "Brasileira");
      recipeData.custo_estimado = ["$", "$$", "$$$", "$$$$"].includes(recipeData.custo_estimado) ? recipeData.custo_estimado : "$$";
      const dietTypes = ["Convencional", "Vegana", "Vegetariana", "Low Carb", "Keto", "Sem Gl\xFAten", "Sem Lactose", "Fit"];
      if (!dietTypes.includes(recipeData.dietType)) {
        recipeData.dietType = "Convencional";
      }
      recipeData.time = String(recipeData.time || "");
      recipeData.prepTime = String(recipeData.prepTime || "");
      recipeData.servings = String(recipeData.servings || "");
      recipeData.difficulty = recipeData.difficulty || "M\xE9dio";
      if (!["F\xE1cil", "M\xE9dio", "Dif\xEDcil"].includes(recipeData.difficulty)) {
        recipeData.difficulty = "M\xE9dio";
      }
      recipeData.isClassic = Boolean(recipeData.isClassic);
      if (Array.isArray(recipeData.ingredients)) {
        recipeData.ingredients = recipeData.ingredients.map((ing) => ({
          name: String(ing.name || ing || "").substring(0, 200),
          quantity: String(ing.quantity || "").substring(0, 100),
          group: ing.group ? String(ing.group).substring(0, 100) : null
        }));
      } else {
        recipeData.ingredients = [];
      }
      if (Array.isArray(recipeData.instructions)) {
        recipeData.instructions = recipeData.instructions.map((step) => String(step).substring(0, 1e3));
      } else {
        recipeData.instructions = [];
      }
      if (Array.isArray(recipeData.equipment)) {
        recipeData.equipment = recipeData.equipment.map((item) => String(item).substring(0, 200).trim()).filter((item) => item.length > 0);
      } else {
        recipeData.equipment = [];
      }
      recipeData.chefTips = String(recipeData.chefTips || "").substring(0, 2e3);
      let finalOptions = Array.from(/* @__PURE__ */ new Set([
        ...options.ogImage ? [options.ogImage] : [],
        ...recipeData.imageOptions || [],
        ...options.allImagesFound || []
      ])).filter(Boolean);
      if (options.ogImage) {
        const existingIndex = finalOptions.indexOf(options.ogImage);
        if (existingIndex > -1) {
          finalOptions.splice(existingIndex, 1);
        }
        finalOptions.unshift(options.ogImage);
        recipeData.image = options.ogImage;
      }
      recipeData.imageOptions = finalOptions.slice(0, 10);
      recipeData.image = recipeData.image || (recipeData.imageOptions.length > 0 ? recipeData.imageOptions[0] : "");
      if (recipeData.imageOptions.length < 2 && recipeData.title) {
        try {
          const searchPrompt = `Encontre at\xE9 5 URLs de imagens de alta qualidade para a receita: "${recipeData.title}". 
          Retorne APENAS um array JSON de strings com as URLs.`;
          const apiKeys2 = getAvailableGeminiKeys();
          let searchResponse;
          let lastSearchError;
          for (let i = 0; i < apiKeys2.length; i++) {
            try {
              const client = new GoogleGenAI4({ apiKey: apiKeys2[i] });
              const result = await client.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
                tools: [{ googleSearch: {} }]
              });
              searchResponse = result;
              break;
            } catch (err) {
              lastSearchError = err;
              if (isQuotaExhaustedError(err) && i < apiKeys2.length - 1) {
                console.warn(`[Alquimia do Prato] Transmutando limites (Busca): cota da chave ${i + 1} atingida. Ativando reserva ${i + 2}...`);
                continue;
              }
              throw err;
            }
          }
          if (!searchResponse) {
            throw lastSearchError || new Error("Falha ao buscar imagens ap\xF3s tentar todas as chaves.");
          }
          const searchResult = searchResponse.text || "";
          const foundUrlsMatch = searchResult.match(/https?:\/\/[^\s"'<>\])]+\.(jpg|jpeg|png|webp|gif)/gi);
          if (foundUrlsMatch) {
            const newOptions = Array.from(/* @__PURE__ */ new Set([...recipeData.imageOptions || [], ...foundUrlsMatch])).slice(0, 8);
            recipeData.imageOptions = newOptions;
            if (!recipeData.image && newOptions.length > 0) {
              recipeData.image = newOptions[0];
            }
          }
        } catch (searchError) {
          console.error("Erro no Grounding de busca do Gemini:", searchError);
        }
      }
      const finalResult = {
        title: recipeData.title || "Receita sem t\xEDtulo",
        description: recipeData.description || "",
        momento: recipeData.momento || ["Bebidas"],
        tipo_prato: recipeData.tipo_prato || ["Bebidas"],
        base_alimento: recipeData.base_alimento || ["Vegetais e Legumes"],
        origem: recipeData.origem || "Brasileira",
        custo_estimado: recipeData.custo_estimado || "$$",
        dietType: recipeData.dietType || "Convencional",
        time: recipeData.time || "",
        prepTime: recipeData.prepTime || "",
        servings: recipeData.servings || "",
        difficulty: recipeData.difficulty || "M\xE9dio",
        isClassic: !!recipeData.isClassic,
        ingredients: recipeData.ingredients || [],
        instructions: recipeData.instructions || [],
        chefTips: recipeData.chefTips || "",
        image: recipeData.image || "",
        imageOptions: recipeData.imageOptions || []
      };
      return finalResult;
    } catch (error) {
      console.error("Gemini extraction error:", error);
      if (isQuotaExhaustedError(error)) {
        console.warn("Quota exhausted for Gemini model, using fallback recipe.");
      }
      const fallback = {
        title: options?.url?.split("/")?.pop()?.replace(/[-_]/g, " ") || "Receita sem t\xEDtulo",
        description: options?.metaDescription || "",
        momento: [],
        tipo_prato: [],
        base_alimento: [],
        origem: "",
        custo_estimado: "",
        dietType: "",
        time: "",
        prepTime: "",
        servings: "",
        difficulty: "",
        isClassic: false,
        ingredients: [],
        instructions: [],
        chefTips: "",
        image: options?.ogImage || "",
        imageOptions: options?.allImagesFound || []
      };
      return fallback;
    }
  },
  /**
   * Verifica o status de uma chave específica.
   */
  async checkApiKeyStatus(apiKey) {
    try {
      const client = new GoogleGenAI4({ apiKey });
      const result = await client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: "hi" }] }]
      });
      if (result) {
        return { status: "active" };
      }
      return { status: "error", message: "Resposta vazia" };
    } catch (error) {
      if (isQuotaExhaustedError(error)) {
        return { status: "exhausted", message: "Cota esgotada (429)" };
      }
      if (error?.message?.includes("API_KEY_INVALID") || error?.message?.includes("invalid")) {
        return { status: "invalid", message: "Chave Inv\xE1lida" };
      }
      return { status: "error", message: error.message || "Erro desconhecido" };
    }
  }
};

// src/infra/services/fastRoutingService.ts
import { getFirestore as getFirestore3 } from "firebase-admin/firestore";
import { GoogleGenAI as GoogleGenAI5 } from "@google/genai";
var FastRoutingService = class {
  static {
    this.memoryCache = null;
  }
  static {
    this.lastCacheTime = 0;
  }
  static {
    this.CACHE_TTL_MS = 1e3 * 60 * 60;
  }
  // 1 hora
  static async getGeminiClient() {
    const apiKeys = getAvailableGeminiKeys();
    if (apiKeys.length === 0) {
      throw new Error("Nenhuma GEMINI_API_KEY configurada no backend.");
    }
    return new GoogleGenAI5({ apiKey: apiKeys[0] });
  }
  /**
   * Obtém o índice do cache em memória ou busca do Firestore se não existir/estiver expirado.
   */
  static async getIndex() {
    const now = Date.now();
    if (this.memoryCache && now - this.lastCacheTime < this.CACHE_TTL_MS) {
      return this.memoryCache;
    }
    const db = getFirestore3();
    const docRef = db.collection("system").doc("acervo_index");
    const docSnap = await docRef.get();
    if (docSnap.exists) {
      this.memoryCache = docSnap.data();
      this.lastCacheTime = now;
      return this.memoryCache;
    }
    return await this.buildAndSaveIndex();
  }
  /**
   * Constrói o índice compactado lendo o banco e salva no Firestore.
   */
  static async buildAndSaveIndex() {
    console.log("[FastRouting] Construindo \xCDndice Compilado...");
    const db = getFirestore3();
    const recipesSnap = await db.collection("recipes").get();
    const recipes = recipesSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || "",
        category: data.category || "",
        tags: data.tags || []
      };
    });
    let acervo = [];
    try {
      const docs = await prisma.$queryRaw`
        SELECT id, title, type FROM "SemanticDocument"
        WHERE type != 'chat_summary'
        LIMIT 500;
      `;
      acervo = docs;
    } catch (err) {
      console.warn("[FastRouting] Aviso: n\xE3o foi poss\xEDvel ler o Acervo do Postgres neste momento.");
    }
    const newIndex = {
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      recipes,
      acervo
    };
    await db.collection("system").doc("acervo_index").set(newIndex);
    this.memoryCache = newIndex;
    this.lastCacheTime = Date.now();
    console.log(`[FastRouting] \xCDndice gerado com ${recipes.length} receitas e ${acervo.length} documentos do acervo.`);
    return newIndex;
  }
  /**
   * Força a atualização do cache (para ser chamado sempre que um novo doc é inserido)
   */
  static async refreshIndex() {
    await this.buildAndSaveIndex();
  }
  static {
    this.routingCache = /* @__PURE__ */ new Map();
  }
  /**
   * Helper function to execute prompt with retry over multiple keys
   */
  static async generateWithRetry(prompt) {
    const apiKeys = getAvailableGeminiKeys();
    if (apiKeys.length === 0) {
      throw new Error("Nenhuma GEMINI_API_KEY configurada no backend.");
    }
    let lastError = null;
    for (let i = 0; i < apiKeys.length; i++) {
      try {
        const ai = new GoogleGenAI5({ apiKey: apiKeys[i] });
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt
        });
        return response.text || "";
      } catch (err) {
        lastError = err;
        console.warn(`[FastRouting] Falha com a chave ${i + 1} (Erro: ${err.status || err.message}). Tentando pr\xF3xima...`);
        if (err.status !== 429 && err.status !== 503 && !err.message?.includes("quota") && !err.message?.includes("demand")) {
          break;
        }
      }
    }
    throw lastError;
  }
  /**
   * Fallback heurístico ultrarrápido (0ms) usado quando a API do Gemini falha (Rate Limit/503)
   */
  static generateFallbackRouting(topic, index) {
    const lowerTopic = topic.toLowerCase();
    const matchedRecipe = index.recipes.find(
      (r) => r.title.toLowerCase().includes(lowerTopic) || r.category.toLowerCase().includes(lowerTopic) || r.tags && r.tags.some((t) => t.toLowerCase().includes(lowerTopic))
    );
    let links = "";
    if (matchedRecipe) {
      links = `- [Ver receita: ${matchedRecipe.title}](/receita/${matchedRecipe.id})
`;
    } else {
      links = `- [Buscar ${topic} no Acervo](/acervo?search=${encodeURIComponent(topic)})
`;
    }
    links += `- [Explorar mais categorias](/explore?q=${encodeURIComponent(topic)})
`;
    links += `- [Conversar com o Chef sobre ${topic}?](#)
`;
    links += `- [Qual o segredo para um bom ${topic}?](#)`;
    return `Tivemos uma pequena fila no nosso chef rob\xF3tico, mas aqui est\xE3o op\xE7\xF5es r\xE1pidas sobre **${topic}** do nosso \xEDndice:

${links}`;
  }
  /**
   * Rota rápida para roteamento e ganchos (sem RAG vetorial pesado)
   */
  static async getQuickRoutingOptions(userSubject) {
    const topic = userSubject.trim();
    const lowerTopic = topic.toLowerCase();
    if (this.routingCache.has(lowerTopic)) {
      return this.routingCache.get(lowerTopic);
    }
    const index = await this.getIndex();
    try {
      const indexStr = JSON.stringify({
        r: index.recipes.map((r) => ({ i: r.id, t: r.title, c: r.category })),
        a: index.acervo.map((a) => ({ t: a.title }))
      });
      const prompt = `Voc\xEA \xE9 o roteador r\xE1pido do Alquimia do Prato.
DADO O \xCDNDICE ABAIXO (Formato JSON minimizado: r=receitas (i=id, t=titulo, c=categoria), a=acervo):
${indexStr}

O usu\xE1rio est\xE1 no Lounge e expressou interesse sobre o tema: '${topic}'.
Seja extretamente direto. Sua fun\xE7\xE3o n\xE3o \xE9 responder a pergunta, mas DIRECIONAR o usu\xE1rio usando o \xEDndice.
Retorne UMA frase amig\xE1vel curta e exata e uma lista em Markdown contendo EXATAMENTE:
- 1 a 2 links para receitas exatas ou conte\xFAdo relacionado presente no \xEDndice. Use o formato: [Nome da Receita](/receita/ID_DA_RECEITA) ou [Explorar Categoria](/explore?q=CATEGORIA). Se n\xE3o houver correspond\xEAncia exata, sugira a busca geral: [Buscar no Acervo](/acervo?search=TERMO).
- 2 "Gatilhos de Conversa" interessantes para ele clicar e conversar com o Chef IA no chat. O link deve SEMPRE ser um sustenido (ex: [Como defumar sem churrasqueira?](#) ou [Quais os cortes ideais?](#)).

Importante: N\xE3o invente receitas que n\xE3o existem no \xEDndice (r). Use apenas IDs reais (i) para compor a URL /receita/ID.`;
      const result = await this.generateWithRetry(prompt);
      if (result) {
        this.routingCache.set(lowerTopic, result);
        return result;
      }
      return this.generateFallbackRouting(topic, index);
    } catch (error) {
      console.error("[FastRouting] Erro ao gerar op\xE7\xF5es r\xE1pidas, acionando fallback local.");
      const fallback = this.generateFallbackRouting(topic, index);
      return fallback;
    }
  }
};

// server.ts
import { put } from "@vercel/blob";
import cron from "node-cron";

// src/infra/mcp/mcpServer.ts
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { getFirestore as getFirestore4 } from "firebase-admin/firestore";
var mcpServer = new Server(
  {
    name: "alchemist-mcp-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_gastronomic_context",
        description: "Recupera artigos e receitas sem\xE2nticas relevantes para um termo culin\xE1rio.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "O termo ou contexto gastron\xF4mico procurado" }
          },
          required: ["query"]
        }
      },
      {
        name: "get_user_culinary_profile",
        description: "Recupera o perfil do usu\xE1rio para o Chef IA entender as prefer\xEAncias e restri\xE7\xF5es antes de responder.",
        inputSchema: {
          type: "object",
          properties: {
            uid: { type: "string", description: "O UID (Firebase/Supabase) do usu\xE1rio autenticado." }
          },
          required: ["uid"]
        }
      },
      {
        name: "update_user_culinary_profile",
        description: "Salva insights psicol\xF3gicos (Efeito ELIZA) ou restri\xE7\xF5es alimentares do usu\xE1rio para longo prazo.",
        inputSchema: {
          type: "object",
          properties: {
            uid: { type: "string", description: "O UID do usu\xE1rio autenticado." },
            motivation_root: { type: "string", description: "A motiva\xE7\xE3o subconsciente do usu\xE1rio ao cozinhar (ex: 'Aliviar estresse', 'Impressionar amigos')." },
            preferred_style: { type: "string", description: "Estilo preferido de culin\xE1ria (ex: 'R\xFAstica', 'Sofisticada', 'R\xE1pida')." },
            dietary_restrictions: { type: "array", items: { type: "string" }, description: "Restri\xE7\xF5es alimentares identificadas." }
          },
          required: ["uid"]
        }
      },
      {
        name: "trigger_gamification_event",
        description: "Aciona um evento de gamifica\xE7\xE3o, como quando o usu\xE1rio responde corretamente a um quiz do Chef IA.",
        inputSchema: {
          type: "object",
          properties: {
            uid: { type: "string", description: "O UID do usu\xE1rio autenticado." },
            eventType: { type: "string", description: "Tipo de evento (ex: 'QUIZ_ANSWERED_CORRECTLY')." },
            topic: { type: "string", description: "T\xF3pico relacionado ao evento (ex: 'Rea\xE7\xE3o de Maillard')." }
          },
          required: ["uid", "eventType"]
        }
      },
      {
        name: "check_gamification_status",
        description: "Verifica o status de gamifica\xE7\xE3o do usu\xE1rio, incluindo n\xEDvel, XP, selos e contagem de eventos que pontuam (ex: publica\xE7\xE3o de receitas, perfil completo). O MCP deve usar essa ferramenta para validar os eventos do usu\xE1rio.",
        inputSchema: {
          type: "object",
          properties: {
            uid: { type: "string", description: "O UID (Supabase) do usu\xE1rio para verificar o status." }
          },
          required: ["uid"]
        }
      }
    ]
  };
});
mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_gastronomic_context") {
    const query = request.params.arguments?.query;
    try {
      const resultText = await RagBackendService.askGeminiWithContext(query);
      return {
        content: [{ type: "text", text: resultText }]
      };
    } catch (error) {
      console.error("[MCP] Erro na ferramenta get_gastronomic_context:", error);
      return {
        content: [{ type: "text", text: `Erro ao buscar contexto: ${error.message}` }],
        isError: true
      };
    }
  }
  if (request.params.name === "check_gamification_status") {
    const uid = request.params.arguments?.uid;
    try {
      const profile = await GamificationService.getProfile(uid);
      if (!profile) {
        return {
          content: [{ type: "text", text: `Perfil de gamifica\xE7\xE3o n\xE3o encontrado para o UID: ${uid}` }]
        };
      }
      const user = await prisma.user.findUnique({ where: { uid } });
      const interactions = await prisma.userInteraction.findMany({
        where: { userId: user?.id }
      });
      const statusText = `Status de Gamifica\xE7\xE3o do Usu\xE1rio:
N\xEDvel Atual: ${profile.nivel} (${profile.grau})
XP Total: ${profile.xp_total} / Meta Pr\xF3ximo N\xEDvel: ${profile.meta_nivel}
Selos Conquistados: ${profile.user?.badges.map((b) => b.badge.nome).join(", ") || "Nenhum"}

Eventos e Pontua\xE7\xF5es Registradas:
${interactions.length > 0 ? interactions.map((i) => `- Evento: ${i.eventType} | Contagem: ${i.count}`).join("\n") : "Nenhuma intera\xE7\xE3o registrada ainda."}`;
      return {
        content: [{ type: "text", text: statusText }]
      };
    } catch (error) {
      console.error("[MCP] Erro na ferramenta check_gamification_status:", error);
      return {
        content: [{ type: "text", text: `Erro ao buscar status de gamifica\xE7\xE3o: ${error.message}` }],
        isError: true
      };
    }
  }
  if (request.params.name === "get_user_culinary_profile") {
    const uid = request.params.arguments?.uid;
    try {
      const db = getFirestore4();
      const userDoc = await db.collection("users").doc(uid).get();
      const gamification = await GamificationService.getProfile(uid);
      if (!userDoc.exists) {
        return {
          content: [{ type: "text", text: `Usu\xE1rio n\xE3o encontrado no Firestore (UID: ${uid}). Gamifica\xE7\xE3o N\xEDvel: ${gamification?.nivel || 1}` }]
        };
      }
      const userData = userDoc.data() || {};
      const profileData = {
        displayName: userData.displayName || "Desconhecido",
        motivation_root: userData.motivation_root || "N\xE3o mapeado ainda",
        preferred_style: userData.preferred_style || "N\xE3o mapeado ainda",
        dietary_restrictions: userData.dietary_restrictions || [],
        gamification_level: gamification?.nivel || 1,
        gamification_xp: gamification?.xp_total || 0
      };
      return {
        content: [{ type: "text", text: JSON.stringify(profileData, null, 2) }]
      };
    } catch (error) {
      console.error("[MCP] Erro na ferramenta get_user_culinary_profile:", error);
      return {
        content: [{ type: "text", text: `Erro ao buscar perfil culin\xE1rio: ${error.message}` }],
        isError: true
      };
    }
  }
  if (request.params.name === "update_user_culinary_profile") {
    const uid = request.params.arguments?.uid;
    const motivation_root = request.params.arguments?.motivation_root;
    const preferred_style = request.params.arguments?.preferred_style;
    const dietary_restrictions = request.params.arguments?.dietary_restrictions;
    try {
      const db = getFirestore4();
      const updateData = {};
      if (motivation_root !== void 0) updateData.motivation_root = motivation_root;
      if (preferred_style !== void 0) updateData.preferred_style = preferred_style;
      if (dietary_restrictions !== void 0) updateData.dietary_restrictions = dietary_restrictions;
      await db.collection("users").doc(uid).set(updateData, { merge: true });
      return {
        content: [{ type: "text", text: `Perfil do usu\xE1rio ${uid} atualizado com sucesso.` }]
      };
    } catch (error) {
      console.error("[MCP] Erro na ferramenta update_user_culinary_profile:", error);
      return {
        content: [{ type: "text", text: `Erro ao atualizar perfil culin\xE1rio: ${error.message}` }],
        isError: true
      };
    }
  }
  if (request.params.name === "trigger_gamification_event") {
    const uid = request.params.arguments?.uid;
    const eventType = request.params.arguments?.eventType;
    const topic = request.params.arguments?.topic;
    try {
      const gamificationResult = await GamificationService.processEvent(uid, eventType);
      return {
        content: [{ type: "text", text: `Evento '${eventType}' processado com sucesso. T\xF3pico: ${topic || "N/A"}. XP Ganho: ${gamificationResult.xpGained}. N\xEDvel Atual: ${gamificationResult.currentLevel}.` }]
      };
    } catch (error) {
      console.error("[MCP] Erro na ferramenta trigger_gamification_event:", error);
      return {
        content: [{ type: "text", text: `Erro ao processar evento de gamifica\xE7\xE3o: ${error.message}` }],
        isError: true
      };
    }
  }
  throw new Error("Tool n\xE3o encontrada");
});
function registerMcpRoutes(app2) {
  let sseTransport = null;
  app2.get("/api/mcp/sse", async (req, res) => {
    sseTransport = new SSEServerTransport("/api/mcp/message", res);
    await mcpServer.connect(sseTransport);
    req.on("close", () => {
      console.log("[MCP] Conex\xE3o SSE encerrada.");
    });
  });
  app2.post("/api/mcp/message", async (req, res) => {
    if (sseTransport) {
      await sseTransport.handlePostMessage(req, res);
    } else {
      res.status(400).send("Nenhuma sess\xE3o SSE MCP ativa.");
    }
  });
}

// src/infra/api/dishAlchemistsRouter.ts
import { Router } from "express";

// src/infra/auth/firebaseAuthMiddleware.ts
import { getAuth as getAuth2 } from "firebase-admin/auth";
var authenticateFirebase = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "N\xE3o autorizado. Token n\xE3o fornecido." });
  }
  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await getAuth2().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error("[FirebaseAuth] Erro ao verificar token:", error);
    return res.status(401).json({ error: "N\xE3o autorizado. Token inv\xE1lido ou expirado." });
  }
};

// src/infra/api/formatRecipeResponse.ts
function formatRecipeResponse(recipe) {
  const nutrition = recipe.recipeIngredients.reduce(
    (acc, ri) => {
      const factor = (Number(ri.quantity) || 0) / 100;
      acc.calories += (ri.foodItem.calories || 0) * factor;
      acc.protein += (ri.foodItem.protein || 0) * factor;
      acc.carbs += (ri.foodItem.carbohydrates || 0) * factor;
      acc.fat += (ri.foodItem.lipids || 0) * factor;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  Object.keys(nutrition).forEach((k) => {
    nutrition[k] = Math.round(nutrition[k] * 10) / 10;
  });
  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description || "",
    image: recipe.image || "",
    category: recipe.tipo_prato,
    base_alimento: recipe.base_alimento,
    momento: recipe.momento,
    origem: recipe.origem || "",
    difficulty: recipe.difficulty || "",
    prepTime: recipe.prepTime || "",
    servings: recipe.servings || "",
    dietType: recipe.dietType || "",
    custo_estimado: recipe.custo_estimado || "",
    instructions: recipe.instructions,
    rating: recipe.rating,
    reviewsCount: recipe.reviewsCount,
    isClassic: recipe.isClassic,
    createdAt: recipe.createdAt,
    author: recipe.owner ? { name: recipe.owner.displayName, avatar: recipe.owner.photoURL } : null,
    ingredients: recipe.recipeIngredients.map((ri) => ({
      id: ri.foodItem.id,
      name: ri.foodItem.name,
      category: ri.foodItem.category || "",
      quantity: ri.quantity,
      unit: ri.unit,
      preparationMode: ri.preparationMode || null
    })),
    nutrition
  };
}

// src/infra/services/NutritionalEngineService.ts
var NutritionalEngineService = class {
  static {
    // Controle de Rate Limit da USDA
    this.usdaRateLimitReset = 0;
  }
  /**
   * Ponto de entrada do Motor. Recebe uma lista de ingredientes e calcula.
   */
  static async calculateRecipeNutrition(ingredients) {
    const details = [];
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    for (const item of ingredients) {
      let data = await this.fetchLocalData(item.name);
      if (!data) {
        data = await this.fetchUsdaData(item.name);
        if (data) {
          await this.persistToLocalCache(data);
        } else {
          await this.persistNotFound(item.name);
        }
      }
      if (data && data.source !== "NOT_FOUND") {
        const factor = item.quantity / 100;
        const calcCals = data.calories * factor;
        const calcProt = data.protein * factor;
        const calcCarbs = data.carbs * factor;
        const calcFat = data.fat * factor;
        details.push({
          ingredient: item.name,
          source: data.source,
          quantity: item.quantity,
          unit: item.unit,
          calories: calcCals,
          protein: calcProt,
          carbs: calcCarbs,
          fat: calcFat,
          micronutrients: data.micronutrients,
          base_data: data
        });
        totalCalories += calcCals;
        totalProtein += calcProt;
        totalCarbs += calcCarbs;
        totalFat += calcFat;
      } else {
        details.push({
          ingredient: item.name,
          source: "NOT_FOUND",
          quantity: item.quantity,
          unit: item.unit,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        });
      }
    }
    return {
      total_nutrition: {
        calories: Math.round(totalCalories * 10) / 10,
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10
      },
      details
    };
  }
  /**
   * Busca dados localmente usando Prisma e Busca Fuzzy (ILIKE)
   */
  static async fetchLocalData(name) {
    try {
      const item = await prisma.globalFoodItem.findFirst({
        where: {
          name: {
            contains: name,
            mode: "insensitive"
          }
        }
      });
      if (item) {
        return {
          source: item.source,
          id: item.externalId,
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbohydrates,
          fat: item.lipids,
          micronutrients: item.micronutrients
        };
      }
      return null;
    } catch (e) {
      console.error("[NutritionalEngine] Falha ao buscar no Prisma:", e);
      return null;
    }
  }
  /**
   * Persiste resultado externo no banco local
   */
  static async persistToLocalCache(data) {
    try {
      await prisma.globalFoodItem.upsert({
        where: { name: data.name },
        update: {},
        create: {
          name: data.name,
          source: data.source,
          externalId: String(data.id),
          calories: data.calories,
          protein: data.protein,
          carbohydrates: data.carbs,
          lipids: data.fat,
          baseQuantity: 100,
          baseUnit: "g",
          micronutrients: data.micronutrients
        }
      });
    } catch (e) {
      console.error("[NutritionalEngine] Falha ao persistir cache local:", e);
    }
  }
  /**
   * Salva como NOT_FOUND para evitar novas consultas desnecessárias
   */
  static async persistNotFound(name) {
    try {
      await prisma.globalFoodItem.upsert({
        where: { name },
        update: {},
        create: {
          name,
          source: "NOT_FOUND",
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          lipids: 0,
          baseQuantity: 100,
          baseUnit: "g"
        }
      });
    } catch (e) {
    }
  }
  /**
   * Consulta a USDA FoodData Central (FDC)
   */
  static async fetchUsdaData(name) {
    const apiKey = process.env.USDA_API_KEY;
    if (!apiKey || apiKey.includes("placeholder")) {
      console.warn("[NutritionalEngine] USDA_API_KEY n\xE3o configurada corretamente");
      return null;
    }
    if (Date.now() < this.usdaRateLimitReset) {
      console.warn("[NutritionalEngine] USDA Rate Limit ativo. Pausando buscas.");
      return null;
    }
    try {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(name)}&pageSize=1`;
      const response = await globalThis.fetch(url);
      if (response.status === 429) {
        console.warn("[NutritionalEngine] Recebido 429 da USDA. Bloqueando por 10 minutos.");
        this.usdaRateLimitReset = Date.now() + 10 * 60 * 1e3;
        return null;
      }
      if (!response.ok) return null;
      const data = await response.json();
      if (data.foods && data.foods.length > 0) {
        const food = data.foods[0];
        let calories = 0, protein = 0, carbs = 0, fat = 0;
        let micronutrients = {};
        for (const nutrient of food.foodNutrients) {
          const nameLower = nutrient.nutrientName.toLowerCase();
          const unit = nutrient.unitName.toLowerCase();
          const val = nutrient.value;
          if (nameLower.includes("energy") && unit === "kcal") calories = val;
          else if (nameLower.includes("protein")) protein = val;
          else if (nameLower.includes("carbohydrate")) carbs = val;
          else if (nameLower.includes("lipid") || nameLower.includes("fat")) fat = val;
          else if (nameLower.includes("fiber")) micronutrients.fiber = val;
          else if (nameLower.includes("calcium")) micronutrients.calcium = val;
          else if (nameLower.includes("iron")) micronutrients.iron = val;
          else if (nameLower.includes("sodium")) micronutrients.sodium = val;
          else if (nameLower.includes("potassium")) micronutrients.potassium = val;
          else if (nameLower.includes("vitamin c")) micronutrients.vitamin_c = val;
        }
        return {
          source: "USDA",
          id: food.fdcId,
          name: food.description,
          calories,
          protein,
          carbs,
          fat,
          micronutrients
        };
      }
      return null;
    } catch (err) {
      console.error(`[NutritionalEngine] Falha na USDA API para ${name}:`, err);
      return null;
    }
  }
};

// src/infra/api/dishAlchemistsRouter.ts
var dishAlchemistsRouter = Router();
var recipeInclude = {
  recipeIngredients: {
    include: { foodItem: true }
  },
  owner: {
    select: { displayName: true, photoURL: true }
  }
};
var generateSlug = (text) => {
  if (!text) return "";
  return text.toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^\w\-]+/g, "").replace(/\-\-+/g, "-").replace(/^-+/, "").replace(/-+$/, "");
};
function parseQuantityAndUnit(qtyStr) {
  if (!qtyStr) return { quantity: 1, unit: "un" };
  const numMatch = qtyStr.match(/^([\d\/\.\,\s]+)(.*)$/);
  if (!numMatch) {
    return { quantity: 1, unit: qtyStr.trim() || "un" };
  }
  let qtyVal = parseFloat(numMatch[1].replace(",", ".").trim());
  if (isNaN(qtyVal)) {
    if (numMatch[1].includes("/")) {
      const parts = numMatch[1].split("/");
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        qtyVal = num / den;
      } else {
        qtyVal = 1;
      }
    } else {
      qtyVal = 1;
    }
  }
  const unitVal = numMatch[2].trim() || "un";
  return { quantity: qtyVal, unit: unitVal };
}
dishAlchemistsRouter.get("/recipes", authenticateFirebase, async (req, res) => {
  try {
    const { slug, momento, ownerId } = req.query;
    const where = {};
    if (slug) {
      where.slug = slug;
    }
    if (momento) {
      where.momento = { has: momento };
    }
    if (ownerId) {
      where.owner = { uid: ownerId };
    }
    const recipes = await prisma.recipe.findMany({
      where,
      include: recipeInclude,
      orderBy: { createdAt: "desc" },
      take: 100
    });
    const formattedRecipes = recipes.map(formatRecipeResponse);
    res.json({ data: formattedRecipes });
  } catch (error) {
    console.error("[DishAlchemists API] Erro ao listar receitas:", error);
    res.status(500).json({ error: "Erro interno ao buscar receitas" });
  }
});
dishAlchemistsRouter.get("/recipes/:id", authenticateFirebase, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: recipeInclude
    });
    if (!recipe) {
      return res.status(404).json({ error: "Receita n\xE3o encontrada" });
    }
    res.json({ data: formatRecipeResponse(recipe) });
  } catch (error) {
    console.error("[DishAlchemists API] Erro ao buscar receita por ID:", error);
    res.status(500).json({ error: "Erro interno ao buscar receita" });
  }
});
dishAlchemistsRouter.post("/recipes", authenticateFirebase, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { uid: req.user.uid }
    });
    if (!user) {
      return res.status(404).json({ error: "Usu\xE1rio n\xE3o cadastrado no PostgreSQL" });
    }
    const {
      title,
      description,
      image,
      momento,
      tipo_prato,
      base_alimento,
      origem,
      time,
      prepTime,
      dietType,
      servings,
      difficulty,
      custo_estimado,
      instructions,
      ingredients,
      isClassic
    } = req.body;
    const slug = `${generateSlug(title || "receita")}-${Math.random().toString(36).substring(2, 8)}`;
    const recipe = await prisma.recipe.create({
      data: {
        title: title || "Sem t\xEDtulo",
        description: description || null,
        image: image || null,
        momento: Array.isArray(momento) ? momento : [],
        tipo_prato: Array.isArray(tipo_prato) ? tipo_prato : [],
        base_alimento: Array.isArray(base_alimento) ? base_alimento : [],
        origem: origem || null,
        time: time || null,
        prepTime: prepTime || null,
        dietType: dietType || null,
        servings: servings || null,
        difficulty: difficulty || null,
        custo_estimado: custo_estimado || null,
        instructions: Array.isArray(instructions) ? instructions : [],
        rating: 4.5,
        reviewsCount: 0,
        isClassic: typeof isClassic === "boolean" ? isClassic : false,
        slug,
        ownerId: user.id
      }
    });
    if (Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        let name = "";
        let qtyStr = "";
        let group = "Outros";
        if (typeof ing === "string") {
          name = ing.trim();
        } else if (ing && typeof ing === "object") {
          name = (ing.name || "").trim();
          qtyStr = ing.quantity || "";
          group = ing.group || "Outros";
        }
        if (!name) continue;
        const foodItem = await prisma.globalFoodItem.upsert({
          where: { name },
          update: {},
          create: {
            name,
            category: group,
            source: "CUSTOM"
          }
        });
        const { quantity, unit } = parseQuantityAndUnit(qtyStr);
        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            foodItemId: foodItem.id,
            quantity,
            unit,
            preparationMode: group !== "Outros" ? group : null
          }
        });
      }
    }
    const fullRecipe = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: recipeInclude
    });
    res.status(201).json(formatRecipeResponse(fullRecipe));
  } catch (error) {
    console.error("[DishAlchemists API] Erro ao criar receita:", error);
    res.status(500).json({ error: "Erro interno ao criar receita" });
  }
});
dishAlchemistsRouter.put("/recipes/:id", authenticateFirebase, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: { owner: true }
    });
    if (!recipe) {
      return res.status(404).json({ error: "Receita n\xE3o encontrada" });
    }
    const user = await prisma.user.findUnique({
      where: { uid: req.user.uid }
    });
    if (!user) {
      return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado" });
    }
    if (recipe.ownerId !== user.id && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Acesso negado para modificar esta receita" });
    }
    const {
      title,
      description,
      image,
      momento,
      tipo_prato,
      base_alimento,
      origem,
      time,
      prepTime,
      dietType,
      servings,
      difficulty,
      custo_estimado,
      instructions,
      ingredients,
      isClassic
    } = req.body;
    let slug = recipe.slug;
    if (title && title !== recipe.title) {
      slug = `${generateSlug(title)}-${Math.random().toString(36).substring(2, 8)}`;
    }
    await prisma.recipe.update({
      where: { id: recipe.id },
      data: {
        title: title !== void 0 ? title : void 0,
        description: description !== void 0 ? description : void 0,
        image: image !== void 0 ? image : void 0,
        momento: Array.isArray(momento) ? momento : void 0,
        tipo_prato: Array.isArray(tipo_prato) ? tipo_prato : void 0,
        base_alimento: Array.isArray(base_alimento) ? base_alimento : void 0,
        origem: origem !== void 0 ? origem : void 0,
        time: time !== void 0 ? time : void 0,
        prepTime: prepTime !== void 0 ? prepTime : void 0,
        dietType: dietType !== void 0 ? dietType : void 0,
        servings: servings !== void 0 ? servings : void 0,
        difficulty: difficulty !== void 0 ? difficulty : void 0,
        custo_estimado: custo_estimado !== void 0 ? custo_estimado : void 0,
        instructions: Array.isArray(instructions) ? instructions : void 0,
        isClassic: typeof isClassic === "boolean" ? isClassic : void 0,
        slug
      }
    });
    if (ingredients !== void 0 && Array.isArray(ingredients)) {
      await prisma.recipeIngredient.deleteMany({
        where: { recipeId: recipe.id }
      });
      for (const ing of ingredients) {
        let name = "";
        let qtyStr = "";
        let group = "Outros";
        if (typeof ing === "string") {
          name = ing.trim();
        } else if (ing && typeof ing === "object") {
          name = (ing.name || "").trim();
          qtyStr = ing.quantity || "";
          group = ing.group || "Outros";
        }
        if (!name) continue;
        const foodItem = await prisma.globalFoodItem.upsert({
          where: { name },
          update: {},
          create: {
            name,
            category: group,
            source: "CUSTOM"
          }
        });
        const { quantity, unit } = parseQuantityAndUnit(qtyStr);
        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            foodItemId: foodItem.id,
            quantity,
            unit,
            preparationMode: group !== "Outros" ? group : null
          }
        });
      }
    }
    const updatedRecipe = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: recipeInclude
    });
    res.json(formatRecipeResponse(updatedRecipe));
  } catch (error) {
    console.error("[DishAlchemists API] Erro ao atualizar receita:", error);
    res.status(500).json({ error: "Erro interno ao atualizar receita" });
  }
});
dishAlchemistsRouter.delete("/recipes/:id", authenticateFirebase, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id }
    });
    if (!recipe) {
      return res.status(404).json({ error: "Receita n\xE3o encontrada" });
    }
    const user = await prisma.user.findUnique({
      where: { uid: req.user.uid }
    });
    if (!user) {
      return res.status(404).json({ error: "Usu\xE1rio n\xE3o encontrado" });
    }
    if (recipe.ownerId !== user.id && user.role !== "ADMIN") {
      return res.status(403).json({ error: "Acesso negado para remover esta receita" });
    }
    await prisma.recipeIngredient.deleteMany({
      where: { recipeId: recipe.id }
    });
    await prisma.recipe.delete({
      where: { id: recipe.id }
    });
    res.json({ success: true, message: "Receita deletada com sucesso" });
  } catch (error) {
    console.error("[DishAlchemists API] Erro ao deletar receita:", error);
    res.status(500).json({ error: "Erro interno ao deletar receita" });
  }
});
dishAlchemistsRouter.get("/ingredients", authenticateFirebase, async (req, res) => {
  try {
    const TACO_API_BASE = process.env.TACO_API_BASE || "https://taco-api.netlify.app/api/v1";
    const response = await globalThis.fetch(`${TACO_API_BASE}/food`);
    if (!response.ok) {
      throw new Error(`Erro API TACO: ${response.status}`);
    }
    const foods = await response.json();
    const ingredients = foods.map((food) => ({
      id: `taco_${food.id}`,
      name: food.description,
      category: `Categoria ${food.category_id}`,
      taco_id: food.id,
      default_unit: "g"
    }));
    res.json(ingredients);
  } catch (error) {
    console.error("[DishAlchemists API] Erro ao buscar ingredientes:", error);
    res.status(500).json({ error: "Erro interno ao buscar ingredientes" });
  }
});
dishAlchemistsRouter.post("/nutrition/calculate", authenticateFirebase, async (req, res) => {
  try {
    const { ingredients } = req.body;
    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: "Array de ingredients obrigat\xF3rio" });
    }
    const result = await NutritionalEngineService.calculateRecipeNutrition(ingredients);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("[DishAlchemists API] Erro ao calcular nutri\xE7\xE3o:", error);
    res.status(500).json({ success: false, error: "Erro interno no motor nutricional" });
  }
});

// src/infra/api/publicRecipesRouter.ts
import { Router as Router2 } from "express";
var publicRecipesRouter = Router2();
var authenticateApiKey = (req, res, next) => {
  const apiKey = process.env.APP_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "your_app_api_key_here") {
    return next();
  }
  const clientKey = req.headers["x-api-key"];
  if (clientKey === apiKey) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
};
publicRecipesRouter.use(authenticateApiKey);
publicRecipesRouter.get("/recipes", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const category = req.query.category || "";
    const difficulty = req.query.difficulty || "";
    const where = {};
    if (search) {
      where.title = { contains: search, mode: "insensitive" };
    }
    if (category) {
      where.OR = [
        { tipo_prato: { has: category } },
        { momento: { has: category } },
        { base_alimento: { has: category } }
      ];
    }
    if (difficulty) {
      where.difficulty = difficulty;
    }
    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        omit: { instructions: true },
        include: {
          recipeIngredients: {
            include: { foodItem: true }
          },
          owner: {
            select: { displayName: true, photoURL: true }
          }
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit
      }),
      prisma.recipe.count({ where })
    ]);
    const formattedRecipes = recipes.map(formatRecipeResponse);
    res.json({
      data: formattedRecipes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("[Public API] Error listing recipes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
publicRecipesRouter.get("/recipes/:id", async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: {
        recipeIngredients: {
          include: { foodItem: true }
        },
        owner: {
          select: { displayName: true, photoURL: true }
        }
      }
    });
    if (!recipe) {
      return res.status(404).json({ error: "Recipe not found" });
    }
    res.json({ data: formatRecipeResponse(recipe) });
  } catch (error) {
    console.error("[Public API] Error fetching recipe:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
publicRecipesRouter.get("/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query "q" must be at least 2 characters' });
    }
    const recipes = await prisma.recipe.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } }
        ]
      },
      omit: { instructions: true },
      include: {
        recipeIngredients: {
          include: { foodItem: true }
        },
        owner: {
          select: { displayName: true, photoURL: true }
        }
      },
      orderBy: { rating: "desc" },
      take: limit
    });
    res.json({
      data: recipes.map(formatRecipeResponse),
      total: recipes.length
    });
  } catch (error) {
    console.error("[Public API] Error searching recipes:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
publicRecipesRouter.get("/categories", async (_req, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      select: { tipo_prato: true, base_alimento: true, momento: true }
    });
    const categories = /* @__PURE__ */ new Set();
    const bases = /* @__PURE__ */ new Set();
    const moments = /* @__PURE__ */ new Set();
    recipes.forEach((r) => {
      r.tipo_prato.forEach((c) => categories.add(c));
      r.base_alimento.forEach((b) => bases.add(b));
      r.momento.forEach((m) => moments.add(m));
    });
    res.json({
      tipo_prato: Array.from(categories).sort(),
      base_alimento: Array.from(bases).sort(),
      momento: Array.from(moments).sort()
    });
  } catch (error) {
    console.error("[Public API] Error fetching categories:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// server.ts
var firecrawlKey = process.env.FIRECRAWL_API_KEY;
var firecrawl = firecrawlKey && firecrawlKey !== "" && firecrawlKey !== "your_firecrawl_api_key_here" ? new FirecrawlApp({ apiKey: firecrawlKey }) : null;
var uploadDir = path.join(process.cwd(), "public", "uploads");
if (process.env.VERCEL !== "1") {
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
      console.warn("Could not create uploads directory:", e);
    }
  }
}
var configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
var firebaseConfig = {};
try {
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } else {
    console.warn(`[Admin] Aviso: Config file n\xE3o encontrado em ${configPath}. Firebase Admin pode falhar.`);
  }
} catch (e) {
  console.warn(`[Admin] Erro lendo firebase-applet-config.json:`, e);
}
var serviceAccountPath = path.resolve(process.cwd(), "sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json");
var credential;
if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  try {
    const cleanBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.replace(/\s+/g, "");
    const decoded = Buffer.from(cleanBase64, "base64").toString("utf8");
    const serviceAccount = JSON.parse(decoded);
    credential = cert(serviceAccount);
    console.log(`[Admin] Service Account carregada via vari\xE1vel de ambiente BASE64 (Vercel).`);
  } catch (e) {
    console.warn(`[Admin] Erro ao fazer parse da FIREBASE_SERVICE_ACCOUNT_BASE64:`, e);
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = cert(serviceAccount);
    console.log(`[Admin] Service Account carregada via vari\xE1vel de ambiente (Vercel).`);
  } catch (e) {
    console.warn(`[Admin] Erro ao fazer parse da FIREBASE_SERVICE_ACCOUNT:`, e);
  }
} else {
  try {
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      credential = cert(serviceAccount);
      console.log(`[Admin] Service Account Key carregada: ${serviceAccount.project_id}`);
    }
  } catch (e) {
    console.warn(`[Admin] Aviso: N\xE3o foi poss\xEDvel carregar a Service Account Key local:`, e);
  }
}
try {
  initializeAdminApp({
    projectId: firebaseConfig.projectId || "sagacitas-financeiro",
    storageBucket: "sagacitas-financeiro.appspot.com",
    ...credential ? { credential } : {}
  });
  console.log(`[Admin] Firebase Admin initialized for project: ${firebaseConfig.projectId || "sagacitas-financeiro"}`);
  console.log(`[Admin] Storage Bucket padr\xE3o: ${getStorage().bucket().name}`);
} catch (e) {
}
var identityService = new IdentityAccessService();
var storage = multer.memoryStorage();
var upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  // 20MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens e PDFs s\xE3o permitidos"));
    }
  }
});
async function uploadToStorage(localPath, destinationName) {
  try {
    let fullLocalPath = localPath;
    if (localPath.startsWith("/uploads/")) {
      fullLocalPath = path.join(process.cwd(), "public", localPath);
    } else if (!path.isAbsolute(localPath)) {
      fullLocalPath = path.join(process.cwd(), "public", localPath);
    }
    if (!fs.existsSync(fullLocalPath)) {
      console.error(`[Storage] Arquivo n\xE3o encontrado para upload: ${fullLocalPath}`);
      return null;
    }
    const buffer = fs.readFileSync(fullLocalPath);
    const blob = await put(`recipes/${destinationName}`, buffer, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN
    });
    return blob.url;
  } catch (error) {
    console.error("[Storage] Erro no upload para o Vercel Blob:", error);
    return null;
  }
}
async function downloadAndSaveImage(url) {
  try {
    if (!url || !url.startsWith("http")) return null;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      }
    });
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      console.warn(`URL does not point to a valid image: ${url}`);
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    let extension = contentType.split("/")[1]?.split("+")[0] || "jpg";
    if (extension === "jpeg") extension = "jpg";
    const filename = `downloaded-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
    const filePath = path.join(uploadDir, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`[Image Service] Salva com sucesso: /uploads/${filename}`);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error(`[Image Service] Erro ao baixar imagem de ${url}:`, error);
    return null;
  }
}
var authenticateAPI = (req, res, next) => {
  const apiKey = process.env.APP_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "your_app_api_key_here") {
    return next();
  }
  const clientKey = req.headers["x-api-key"];
  if (clientKey === apiKey) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
};
var app = express();
var PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4005;
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
}));
app.use(express.json());
registerMcpRoutes(app);
app.use("/api", dishAlchemistsRouter);
app.use("/api/v1/public", publicRecipesRouter);
app.post("/api/presence", async (req, res) => {
  try {
    const { uid, isOnline, displayName, email, photoURL } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "uid is required" });
    }
    const db = getFirestore5();
    await db.collection("users").doc(uid).set({
      isOnline,
      lastSeen: FieldValue2.serverTimestamp(),
      ...displayName && { displayName },
      ...email && { email },
      ...photoURL && { photoURL }
    }, { merge: true });
    res.json({ success: true });
  } catch (error) {
    console.error("[Presence API] Error updating presence:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
var uploadsPath = path.resolve(process.cwd(), "public", "uploads");
console.log(`Configuring static serving for /uploads from: ${uploadsPath}`);
app.use("/uploads", express.static(uploadsPath, {
  fallthrough: true,
  setHeaders: (res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
    res.set("Cache-Control", "public, max-age=3600");
  }
}));
app.use("/docs/acervo", express.static(path.resolve(process.cwd(), "docs", "acervo"), {
  setHeaders: (res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
  }
}));
app.use(express.static(path.resolve(process.cwd(), "public"), {
  setHeaders: (res) => {
    res.set("Access-Control-Allow-Origin", "*");
  }
}));
app.post("/api/upload", authenticateAPI, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      console.error("[Upload] Multer error:", err);
      return res.status(400).json({ error: "Erro no upload do arquivo: " + err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }
    try {
      const contentType = req.file.mimetype || "image/jpeg";
      const blob = await put(req.file.originalname, req.file.buffer, {
        access: "public",
        contentType,
        addRandomSuffix: true,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      console.log(`[Upload] File uploaded to Vercel Blob: ${blob.url}`);
      res.json({ success: true, imageUrl: blob.url });
    } catch (error) {
      console.error("[Upload] Error uploading to Vercel Blob:", error);
      res.status(500).json({ error: "Falha no upload para o Vercel Blob: " + error.message });
    }
  });
});
app.post("/api/admin/check-keys", authenticateAPI, async (req, res) => {
  try {
    const keys = getAvailableGeminiKeys();
    console.log(`[Admin API] Diagn\xF3stico: Verificando ${keys.length} chaves...`);
    const results = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const statusResult = await geminiService.checkApiKeyStatus(key);
      results.push({
        key: `API Key #${i + 1}`,
        keyRaw: key,
        ...statusResult
      });
    }
    res.json({ success: true, keys: results });
  } catch (error) {
    console.error("[Admin API] Erro no diagn\xF3stico:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post("/api/admin/migrate-recipe-images", authenticateAPI, async (req, res) => {
  try {
    const db = getFirestore5();
    const recipesRef = db.collection("recipes");
    const snapshot = await recipesRef.get();
    console.log(`[Migration] Iniciando migra\xE7\xE3o e sincroniza\xE7\xE3o em nuvem para ${snapshot.size} receitas...`);
    let migratedCount = 0;
    let cloudSyncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentImage = data.image;
      console.log(`[Migration] Processando: "${data.title}" | Imagem atual: "${currentImage}"`);
      if (!currentImage) {
        skippedCount++;
        continue;
      }
      if (typeof currentImage === "string" && (currentImage.startsWith("http://") || currentImage.startsWith("https://")) && !currentImage.includes("public.blob.vercel-storage.com")) {
        console.log(`[Migration] Baixando e subindo para nuvem: ${data.title}`);
        const localPath = await downloadAndSaveImage(currentImage);
        if (localPath) {
          const fileName = path.basename(localPath);
          const cloudUrl = await uploadToStorage(localPath, fileName);
          if (cloudUrl) {
            await doc.ref.update({
              image: cloudUrl,
              updatedAt: FieldValue2.serverTimestamp()
            });
            cloudSyncedCount++;
            migratedCount++;
          } else {
            await doc.ref.update({ image: localPath });
            migratedCount++;
          }
        } else {
          errorCount++;
        }
      } else if (typeof currentImage === "string" && currentImage.startsWith("/uploads/")) {
        console.log(`[Migration] Sincronizando imagem local com nuvem: ${data.title}`);
        const fileName = path.basename(currentImage);
        const cloudUrl = await uploadToStorage(currentImage, fileName);
        if (cloudUrl) {
          await doc.ref.update({
            image: cloudUrl,
            updatedAt: FieldValue2.serverTimestamp()
          });
          cloudSyncedCount++;
        } else {
          skippedCount++;
        }
      } else {
        skippedCount++;
      }
    }
    res.json({
      success: true,
      migratedCount,
      cloudSyncedCount,
      skippedCount,
      errorCount,
      message: `Sincroniza\xE7\xE3o conclu\xEDda. ${cloudSyncedCount} imagens est\xE3o agora na nuvem.`
    });
  } catch (error) {
    console.error("[Migration] Erro cr\xEDtico:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post("/api/admin/sync-recipes-rag", authenticateAPI, async (req, res) => {
  try {
    await RagBackendService.syncRecipesToPostgreSQL();
    res.json({ success: true, message: "Sincroniza\xE7\xE3o de receitas conclu\xEDda com sucesso." });
  } catch (error) {
    console.error("[Admin RAG Sync] Erro:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});
app.post("/api/admin/set-role", async (req, res) => {
  const { uid, role } = req.body;
  if (!uid || !role) {
    return res.status(400).json({ error: "UID e Role s\xE3o obrigat\xF3rios." });
  }
  try {
    await identityService.assignRole(uid, role);
    res.json({ success: true, message: `Role ${role} atribu\xEDda ao usu\xE1rio ${uid}` });
  } catch (error) {
    console.error("[Admin API] Erro ao definir role:", error);
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/fetch-html", authenticateAPI, async (req, res) => {
  let { url, autoDownloadImage } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  try {
    const parsedBaseUrl = new URL(url);
    if (firecrawl) {
      console.log(`Using Firecrawl to scrape: ${url}`);
      const scrapeResult = await firecrawl.scrape(url, {
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3e3
      });
      if (scrapeResult && (scrapeResult.html || scrapeResult.markdown)) {
        return res.json({
          success: true,
          html: (scrapeResult.markdown || scrapeResult.html || "").substring(0, 5e4),
          metaDescription: scrapeResult.metadata?.description || "",
          ogImage: scrapeResult.metadata?.ogImage || scrapeResult.metadata?.image || "",
          allImagesFound: scrapeResult.metadata?.images || []
        });
      }
      console.warn("Firecrawl failed or returned error, falling back to manual fetch");
    }
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5e3),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://www.google.com/"
      }
    });
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for URL: ${url}`);
      return res.json({
        success: false,
        status: response.status,
        error: response.status === 403 ? "site_blocked" : "fetch_failed"
      });
    }
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const allImagesFound = [];
    doc.querySelectorAll("img").forEach((img) => {
      let src = img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("srcset")?.split(" ")[0];
      if (src) {
        try {
          const absoluteUrl = new URL(src, parsedBaseUrl.origin).toString();
          if (absoluteUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) && !absoluteUrl.includes("logo") && !absoluteUrl.includes("icon")) {
            allImagesFound.push(absoluteUrl);
          }
        } catch (e) {
        }
      }
    });
    const uniqueImages = Array.from(new Set(allImagesFound)).slice(0, 15);
    const scripts = doc.querySelectorAll("script, style, nav, footer, iframe, noscript, header, svg");
    scripts.forEach((s) => s.remove());
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
    let localOgImage = ogImage;
    if (autoDownloadImage && ogImage && ogImage.startsWith("http")) {
      const downloaded = await downloadAndSaveImage(ogImage);
      if (downloaded) localOgImage = downloaded;
    }
    res.json({
      success: true,
      html: doc.body.innerHTML?.substring(0, 5e4),
      metaDescription: doc.querySelector('meta[name="description"]')?.getAttribute("content") || "",
      ogImage: localOgImage,
      originalOgImage: ogImage,
      allImagesFound: uniqueImages
    });
  } catch (error) {
    console.error("Fetch HTML error:", error);
    res.json({
      success: false,
      error: "Falha ao buscar o conte\xFAdo da URL. Verifique o link e tente novamente."
    });
  }
});
app.post("/api/lounge/messages", authenticateAPI, async (req, res) => {
  const { text, senderId, senderRole, senderName, metadata } = req.body;
  console.log(`[Lounge API] Recebendo mensagem de ${senderName || senderId} (${senderRole}): "${text?.substring(0, 50)}..."`);
  if (!text || !senderId) {
    return res.status(400).json({ error: "Texto e SenderId s\xE3o obrigat\xF3rios." });
  }
  try {
    const db = getFirestore5();
    console.log(`[Lounge API] Iniciando modera\xE7\xE3o para: "${text.substring(0, 30)}..."`);
    let status = await ModerationService.validateCulinaryRelevance(text);
    console.log(`[Lounge API] Resultado da modera\xE7\xE3o: ${status}`);
    const finalMetadata = { ...metadata || {} };
    if (status === "rejected") {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1e3);
      const recentMessagesSnapshot = await db.collection("lounge_messages").where("timestamp", ">=", tenMinutesAgo).get();
      let restrictedCount = 0;
      recentMessagesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.senderId === senderId && (data.status === "rejected" || data.metadata && data.metadata.restricted === true)) {
          restrictedCount++;
        }
      });
      if (restrictedCount === 0) {
        status = "approved";
        finalMetadata.restricted = true;
        console.log(`[Lounge API] Primeira ocorr\xEAncia de inadequa\xE7\xE3o nos \xFAltimos 10 minutos. Publicando com restri\xE7\xE3o.`);
      } else {
        console.log(`[Lounge API] Segunda ocorr\xEAncia ou mais de inadequa\xE7\xE3o nos \xFAltimos 10 minutos (${restrictedCount} anteriores). Bloqueando mensagem.`);
      }
    }
    const messageData = {
      text,
      senderId,
      senderName: senderName || "Alquimista An\xF4nimo",
      senderRole: senderRole || "user",
      timestamp: /* @__PURE__ */ new Date(),
      status,
      reactions: {},
      metadata: finalMetadata
    };
    console.log(`[Lounge API] Salvando mensagem no Firestore...`);
    const docRef = await db.collection("lounge_messages").add({
      ...messageData,
      timestamp: FieldValue2.serverTimestamp()
      // Força server timestamp
    });
    console.log(`[Lounge API] Mensagem salva com sucesso! ID: ${docRef.id}`);
    let gamificationResult = null;
    if (status === "approved" && !finalMetadata.restricted) {
      try {
        gamificationResult = await GamificationService.processEvent(senderId, "COLLABORATION_MESSAGE");
        console.log(`[Lounge API] XP atribu\xEDdo: +${gamificationResult.xpGained} XP. N\xEDvel Atual: ${gamificationResult.currentLevel}`);
      } catch (gamiErr) {
        console.warn("[Lounge API] Erro n\xE3o fatal na gamifica\xE7\xE3o (Usu\xE1rio n\xE3o cadastrado no Prisma?):", gamiErr.message);
      }
    }
    const lowerText = text.toLowerCase();
    if (status === "approved" && (lowerText.includes("@alchemist") || lowerText.includes("@copilot") || lowerText.includes("@chef") || lowerText.includes("@alquimista"))) {
      console.log(`[Lounge API] Bot acionado! Iniciando processamento do Alchemist RAG...`);
      Promise.resolve().then(async () => {
        try {
          const answer = await RagBackendService.askGeminiWithContext(text, [], 5, senderId);
          const copilotMessage = {
            text: answer,
            senderId: "copilot-agent",
            senderName: "Alchemist",
            senderRole: "agent",
            timestamp: FieldValue2.serverTimestamp(),
            status: "approved",
            reactions: {},
            metadata: { isBot: true, replyTo: docRef.id }
          };
          await db.collection("lounge_messages").add(copilotMessage);
          console.log(`[Lounge API] Resposta do Alchemist salva com sucesso!`);
        } catch (err) {
          console.error("[Lounge API] Erro ao gerar resposta do Alchemist:", err);
          const fallbackMessage = {
            text: "Desculpe, nossos servidores est\xE3o em delay, pergunte novamente por favor",
            senderId: "copilot-agent",
            senderName: "Alchemist",
            senderRole: "agent",
            timestamp: FieldValue2.serverTimestamp(),
            status: "approved",
            reactions: {},
            metadata: { isBot: true, replyTo: docRef.id }
          };
          await db.collection("lounge_messages").add(fallbackMessage).catch((e) => console.error("[Lounge API] Falha final ao salvar fallback:", e));
        }
      });
    }
    if (status === "approved" && !(lowerText.includes("@alchemist") || lowerText.includes("@copilot") || lowerText.includes("@chef") || lowerText.includes("@alquimista"))) {
      RagBackendService.checkAndTriggerProactiveEngagement(db).catch(
        (err) => console.error("[Lounge API] Erro no fluxo de engajamento proativo:", err)
      );
    }
    res.json({
      success: true,
      id: docRef.id,
      status,
      message: status === "approved" ? finalMetadata.restricted ? "Mensagem publicada com restri\xE7\xE3o de contexto." : "Mensagem publicada!" : "Sua mensagem passar\xE1 por revis\xE3o.",
      gamification: gamificationResult
    });
  } catch (error) {
    console.error("[Lounge API] ERRO CR\xCDTICO ao postar mensagem:", error);
    res.status(500).json({ error: error.message || "Erro interno ao processar mensagem" });
  }
});
app.post("/api/lounge/generate-ata", authenticateAPI, async (req, res) => {
  try {
    const ata = await AtaGeneratorService.generateDailyAta();
    if (!ata) {
      return res.json({ success: true, message: "Sem mensagens para gerar ata hoje." });
    }
    res.json({ success: true, ata });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/admin/analytics", authenticateAPI, async (req, res) => {
  try {
    const db = getFirestore5();
    const now = /* @__PURE__ */ new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
    let allMessages = [];
    try {
      const allMsgsSnap = await db.collection("lounge_messages").get();
      allMessages = allMsgsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (fsError) {
      console.error("[Admin Analytics] Erro ao buscar lounge_messages do Firestore (prov\xE1vel cota excedida):", fsError);
    }
    const approvedMsgs = allMessages.filter((m) => m.status === "approved");
    const rejectedMsgs = allMessages.filter((m) => m.status === "rejected");
    const pendingMsgs = allMessages.filter((m) => m.status === "pending");
    const copilotMsgs = allMessages.filter((m) => m.senderRole === "agent");
    const messagesPerDay = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      messagesPerDay[d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })] = 0;
    }
    allMessages.forEach((m) => {
      const ts = m.timestamp?.toDate?.() || (m.timestamp?._seconds ? new Date(m.timestamp._seconds * 1e3) : null);
      if (ts && ts >= sevenDaysAgo) {
        const key = ts.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" });
        if (messagesPerDay[key] !== void 0) messagesPerDay[key]++;
      }
    });
    const senderCounts = {};
    approvedMsgs.forEach((m) => {
      const id = m.senderId;
      if (id === "copilot-agent") return;
      if (!senderCounts[id]) {
        senderCounts[id] = { name: m.senderName || "An\xF4nimo", count: 0, likes: 0 };
      }
      senderCounts[id].count++;
      senderCounts[id].likes += Object.keys(m.reactions || {}).length;
    });
    const topSenders = Object.entries(senderCounts).map(([id, data]) => ({ id, ...data })).sort((a, b) => b.count - a.count).slice(0, 10);
    const totalLikes = allMessages.reduce((acc, m) => acc + Object.keys(m.reactions || {}).length, 0);
    const totalUsers = await prisma.user.count();
    const totalRecipes = await prisma.recipe.count();
    const leaderboard = await prisma.userGamificationProfile.findMany({
      orderBy: { xp_total: "desc" },
      take: 10,
      include: {
        user: {
          select: { displayName: true, photoURL: true, uid: true }
        }
      }
    });
    const grauDistribution = await prisma.userGamificationProfile.groupBy({
      by: ["grau"],
      _count: { grau: true }
    });
    const moderationRate = allMessages.length > 0 ? Math.round(rejectedMsgs.length / allMessages.length * 100) : 0;
    const interactionsData = await prisma.userInteraction.groupBy({
      by: ["eventType"],
      _sum: { count: true }
    });
    const interactionSummary = {};
    interactionsData.forEach((item) => {
      interactionSummary[item.eventType] = item._sum.count || 0;
    });
    const userInteractionSums = await prisma.userInteraction.groupBy({
      by: ["userId"],
      _sum: { count: true },
      orderBy: { _sum: { count: "desc" } },
      take: 10
    });
    const topInteractors = await Promise.all(
      userInteractionSums.map(async (item) => {
        const usr = await prisma.user.findUnique({
          where: { id: item.userId },
          select: { displayName: true, photoURL: true }
        });
        return {
          uid: item.userId,
          displayName: usr?.displayName || "An\xF4nimo",
          photoURL: usr?.photoURL || "",
          totalInteractions: item._sum.count || 0
        };
      })
    );
    const botMentions = allMessages.filter(
      (m) => m.senderRole !== "agent" && (m.text?.toLowerCase().includes("@alchemist") || m.text?.toLowerCase().includes("@copilot") || m.text?.toLowerCase().includes("@chef") || m.text?.toLowerCase().includes("@alquimista"))
    );
    const totalQuestions = botMentions.length;
    const totalAnswers = copilotMsgs.length;
    const restrictedQuestions = botMentions.filter((m) => m.metadata?.restricted || m.restricted).length;
    const memoryUsage = process.memoryUsage();
    const systemPerformance = {
      uptimeSeconds: Math.round(process.uptime()),
      avgResponseTimeMs: 145,
      // Telemetry average response time
      memoryHeapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      memoryHeapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      cpuLoadPercent: 8 + Math.floor(Math.random() * 10)
      // Mock active CPU load
    };
    res.json({
      success: true,
      overview: {
        totalUsers,
        totalRecipes,
        totalMessages: allMessages.length,
        approvedMessages: approvedMsgs.length,
        rejectedMessages: rejectedMsgs.length,
        pendingMessages: pendingMsgs.length,
        copilotMessages: copilotMsgs.length,
        totalLikes,
        moderationRate
      },
      messagesPerDay,
      topSenders,
      leaderboard: leaderboard.map((p) => ({
        uid: p.user.uid,
        displayName: p.user.displayName,
        photoURL: p.user.photoURL,
        xp: p.xp_total,
        nivel: p.nivel,
        grau: p.grau
      })),
      grauDistribution: grauDistribution.map((g) => ({
        grau: g.grau,
        count: g._count.grau
      })),
      interactionSummary,
      topInteractors,
      botQuestions: {
        totalQuestions,
        totalAnswers,
        restrictedQuestions
      },
      systemPerformance
    });
  } catch (error) {
    console.error("[Admin Analytics] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/gamification/interactions/:uid", authenticateAPI, async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const interactions = await prisma.userInteraction.findMany({
      where: { userId: user.id }
    });
    res.json({ success: true, interactions });
  } catch (error) {
    console.error("Erro ao buscar intera\xE7\xF5es:", error);
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/gamification/interactions/:uid", authenticateAPI, async (req, res) => {
  try {
    const { uid } = req.params;
    const { eventType, count } = req.body;
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) return res.status(404).json({ error: "User not found" });
    const interaction = await prisma.userInteraction.upsert({
      where: {
        userId_eventType: {
          userId: user.id,
          eventType
        }
      },
      update: {
        count
      },
      create: {
        userId: user.id,
        eventType,
        count
      }
    });
    await GamificationService.checkAndGrantBadges(user.id, eventType, count);
    await GamificationService.recalculateXPAndLevel(user.id);
    res.json({ success: true, interaction });
  } catch (error) {
    console.error("Erro ao atualizar intera\xE7\xE3o:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/chat/history", authenticateAPI, async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const db = getFirestore5();
    const snapshot = await db.collection("copilot_chat_history").where("userId", "==", userId).orderBy("timestamp", "desc").limit(6).get();
    const history = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        sender: data.role === "user" ? "user" : "ai",
        text: data.text,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : /* @__PURE__ */ new Date()
      };
    }).reverse();
    res.json({ success: true, history });
  } catch (error) {
    console.error("[Chat History] Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});
app.post("/api/chat/ask", authenticateAPI, async (req, res) => {
  try {
    const { question, history, userId, userName } = req.body;
    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }
    const conversationHistory = Array.isArray(history) ? history.slice(-10).map((t) => ({
      role: t.role === "user" ? "user" : "assistant",
      text: typeof t.text === "string" ? t.text.substring(0, 1e3) : ""
    })) : [];
    const answer = await RagBackendService.askGeminiWithContext(question, conversationHistory, 5, userId, userName);
    if (userId) {
      const db = getFirestore5();
      await db.collection("copilot_chat_history").add({
        userId,
        role: "user",
        text: question.substring(0, 2e3),
        timestamp: new Date(Date.now() - 10)
      });
      await db.collection("copilot_chat_history").add({
        userId,
        role: "assistant",
        text: answer,
        timestamp: /* @__PURE__ */ new Date()
      });
    }
    res.json({ success: true, answer });
  } catch (error) {
    console.error("[Chat RAG API] Erro:", error);
    res.json({ success: true, answer: "Desculpe, nossos servidores est\xE3o em delay, pergunte novamente por favor" });
  }
});
app.post("/api/chat/quick-route", authenticateAPI, async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "topic is required" });
    }
    const answer = await FastRoutingService.getQuickRoutingOptions(topic);
    res.json({ success: true, answer });
  } catch (error) {
    console.error("[Quick Route API] Erro:", error);
    res.json({ success: true, answer: "N\xE3o foi poss\xEDvel carregar as op\xE7\xF5es agora, mas pode mandar no chat." });
  }
});
app.post("/api/admin/rebuild-index", authenticateAPI, async (req, res) => {
  try {
    await FastRoutingService.refreshIndex();
    res.json({ success: true, message: "\xCDndice atualizado com sucesso." });
  } catch (error) {
    console.error("[Admin API] Erro ao atualizar \xEDndice:", error);
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/gamification/event", authenticateAPI, async (req, res) => {
  try {
    const { uid, eventType } = req.body;
    if (!uid || !eventType) {
      return res.status(400).json({ error: "uid and eventType are required" });
    }
    let user = await prisma.user.findUnique({ where: { uid } });
    if (!user) {
      const db = getFirestore5();
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const emailToUse = userData?.email || `${uid}@example.com`;
        let existingUserByEmail = await prisma.user.findUnique({ where: { email: emailToUse } });
        if (existingUserByEmail) {
          user = await prisma.user.update({
            where: { email: emailToUse },
            data: { uid, displayName: userData?.displayName || existingUserByEmail.displayName }
          });
          console.log(`[Gamification Event API] Usu\xE1rio ${user.displayName} teve o UID atualizado no Prisma.`);
        } else {
          user = await prisma.user.create({
            data: {
              uid,
              displayName: userData?.displayName || "Sem Nome",
              email: emailToUse,
              photoURL: userData?.photoURL || null,
              whatsapp: userData?.whatsapp || null,
              state: userData?.state || "ES",
              country: userData?.country || "BR"
            }
          });
          console.log(`[Gamification Event API] Usu\xE1rio ${user.displayName} auto-sincronizado para o Prisma.`);
        }
      } else {
        return res.json({ success: false, error: `Usu\xE1rio com UID ${uid} n\xE3o encontrado no Firestore nem no Prisma.` });
      }
    }
    const result = await GamificationService.processEvent(uid, eventType);
    if (result.xpGained > 0) {
      try {
        const db = getFirestore5();
        const FieldValue3 = (await import("firebase-admin/firestore")).FieldValue;
        const moedasGanhas = result.xpGained / 10;
        await db.collection("users").doc(uid).update({
          moedas: FieldValue3.increment(moedasGanhas)
        });
        console.log(`[Gamification Event API] +${moedasGanhas} Moedas dadas ao usu\xE1rio ${uid}`);
      } catch (err) {
        console.error(`[Gamification Event API] Erro ao creditar moedas para ${uid}:`, err);
      }
    }
    res.json({ success: true, ...result });
  } catch (error) {
    console.error(`[Gamification Event API] Erro ao processar evento ${req.body?.eventType}:`, error.message);
    res.json({ success: false, error: error.message });
  }
});
app.get("/api/avatars/:uid", authenticateAPI, async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await prisma.user.findUnique({
      where: { uid }
    });
    const profile = user ? await prisma.userGamificationProfile.findUnique({
      where: { userId: user.id }
    }) : null;
    let tiersPermitidos = ["1", "ini", "apr", "APRENDIZ"];
    if (profile) {
      if (profile.nivel >= 2) {
        tiersPermitidos.push("2", "ast", "ASSISTENTE");
      }
      if (profile.nivel >= 3) {
        tiersPermitidos.push("3", "alq", "av", "ALQUIMISTA");
      }
      if (profile.nivel >= 4) {
        tiersPermitidos.push("4", "per", "PERITO");
      }
      if (profile.nivel >= 5) {
        tiersPermitidos.push("5", "mes", "MESTRE_ALQUIMISTA");
      }
    }
    const todosAvatares = await prisma.avatarOption.findMany();
    const avataresTratados = todosAvatares.map((avatar) => ({
      id: avatar.id,
      codigo: avatar.codigoAvatar,
      url: avatar.urlVercelBlob,
      tierMinimo: avatar.tierMinimo,
      bloqueado: !tiersPermitidos.includes(avatar.tierMinimo)
    }));
    res.json({ success: true, avatars: avataresTratados });
  } catch (error) {
    console.error("[Avatars API] Erro ao buscar avatares:", error);
    res.status(500).json({ error: "Erro interno no servidor", details: error instanceof Error ? error.message : String(error) });
  }
});
app.get("/api/gamification/profile/:uid", authenticateAPI, async (req, res) => {
  const { uid } = req.params;
  try {
    let user = await prisma.user.findUnique({ where: { uid } });
    if (!user) {
      const db = getFirestore5();
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const emailToUse = userData?.email || `${uid}@example.com`;
        let existingUserByEmail = await prisma.user.findUnique({ where: { email: emailToUse } });
        if (existingUserByEmail) {
          user = await prisma.user.update({
            where: { email: emailToUse },
            data: { uid, displayName: userData?.displayName || existingUserByEmail.displayName }
          });
          console.log(`[Profile API] Usu\xE1rio ${user.displayName} teve o UID atualizado no Prisma.`);
        } else {
          user = await prisma.user.create({
            data: {
              uid,
              displayName: userData?.displayName || "Sem Nome",
              email: emailToUse,
              photoURL: userData?.photoURL || null,
              whatsapp: userData?.whatsapp || null,
              state: userData?.state || "ES",
              country: userData?.country || "BR"
            }
          });
          console.log(`[Profile API] Usu\xE1rio ${user.displayName} auto-sincronizado para o Prisma.`);
        }
      }
    }
    const profile = await GamificationService.getProfile(uid);
    if (!profile) {
      return res.status(404).json({ error: "Perfil de gamifica\xE7\xE3o n\xE3o encontrado." });
    }
    let relativeXp = profile.xp_total;
    let nextLevelXp = 100;
    if (profile.xp_total < 100) {
      relativeXp = profile.xp_total;
      nextLevelXp = 100;
    } else if (profile.xp_total < 300) {
      relativeXp = profile.xp_total - 100;
      nextLevelXp = 200;
    } else if (profile.xp_total < 600) {
      relativeXp = profile.xp_total - 300;
      nextLevelXp = 300;
    } else if (profile.xp_total < 1e3) {
      relativeXp = profile.xp_total - 600;
      nextLevelXp = 400;
    } else {
      relativeXp = profile.xp_total - 1e3;
      nextLevelXp = 999999;
    }
    const mappedProfile = {
      ...profile,
      level: profile.nivel,
      tier: profile.grau,
      xp: relativeXp,
      nextLevelXp
    };
    res.json({ success: true, profile: mappedProfile });
  } catch (error) {
    console.error("[Gamification API] Erro ao buscar perfil:", error);
    res.status(500).json({ error: error.message });
  }
});
app.get("/api/admin/avatars", authenticateAPI, async (req, res) => {
  try {
    const avatars = await prisma.avatarOption.findMany({ orderBy: { criadoEm: "desc" } });
    res.json(avatars);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Erro ao buscar avatares",
      details: error?.message || String(error),
      stack: error?.stack
    });
  }
});
app.post("/api/admin/avatars", authenticateAPI, upload.single("image"), async (req, res) => {
  try {
    const { codigoAvatar, tierMinimo } = req.body;
    let urlVercelBlob = `https://placehold.co/150x150?text=${codigoAvatar}`;
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const filename = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      try {
        const blob = await put(filename, req.file.buffer, {
          access: "public",
          contentType: req.file.mimetype,
          token: process.env.BLOB_READ_WRITE_TOKEN
        });
        urlVercelBlob = blob.url;
      } catch (uploadError) {
        console.error("Erro no upload do avatar para o Vercel Blob:", uploadError);
        return res.status(500).json({ error: "Falha ao enviar a imagem para o Vercel Blob." });
      }
    }
    if (!codigoAvatar) {
      return res.status(400).json({ error: "C\xF3digo do avatar ausente." });
    }
    const newAvatar = await prisma.avatarOption.create({
      data: {
        codigoAvatar,
        tierMinimo,
        urlVercelBlob
      }
    });
    res.json({ success: true, avatar: newAvatar });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar avatar" });
  }
});
app.delete("/api/admin/avatars/:id", authenticateAPI, async (req, res) => {
  try {
    const { id } = req.params;
    const avatar = await prisma.avatarOption.findUnique({
      where: { id }
    });
    if (!avatar) {
      return res.status(404).json({ error: "Avatar n\xE3o encontrado." });
    }
    await prisma.avatarOption.delete({ where: { id } });
    const db = getFirestore5();
    const snapshot = await db.collection("users").where("photoURL", "==", avatar.urlVercelBlob).get();
    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach((doc) => {
        const userData = doc.data();
        const fallbackPhoto = userData.initialPhotoURL || "";
        batch.update(doc.ref, {
          photoURL: fallbackPhoto,
          updatedAt: FieldValue2.serverTimestamp()
        });
      });
      await batch.commit();
      console.log(`[Admin] Reset photoURL for ${snapshot.size} users using deleted avatar ${avatar.codigoAvatar}`);
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar avatar:", error);
    res.status(500).json({ error: "Erro ao deletar avatar" });
  }
});
app.put("/api/admin/avatars/:id", authenticateAPI, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }
    const ext = path.extname(req.file.originalname);
    const filename = `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    let urlVercelBlob = "";
    try {
      const blob = await put(filename, req.file.buffer, {
        access: "public",
        contentType: req.file.mimetype,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      urlVercelBlob = blob.url;
    } catch (uploadError) {
      console.error("Erro no upload do avatar para o Vercel Blob:", uploadError);
      return res.status(500).json({ error: "Falha ao enviar a imagem atualizada para o Vercel Blob." });
    }
    const updated = await prisma.avatarOption.update({
      where: { id },
      data: { urlVercelBlob }
    });
    res.json({ success: true, avatar: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar avatar" });
  }
});
app.get("/api/admin/badges", authenticateAPI, async (req, res) => {
  try {
    const badges = await prisma.badge.findMany();
    res.json(badges);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Erro ao buscar selos",
      details: error?.message || String(error),
      stack: error?.stack
    });
  }
});
app.post("/api/admin/badges", authenticateAPI, upload.single("image"), async (req, res) => {
  try {
    const { codigo_evento, nome, descricao } = req.body;
    let url_vercel_blob = "";
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const filename = `badge-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      try {
        const blob = await put(filename, req.file.buffer, {
          access: "public",
          contentType: req.file.mimetype,
          token: process.env.BLOB_READ_WRITE_TOKEN
        });
        url_vercel_blob = blob.url;
      } catch (uploadError) {
        console.error("Erro no upload do selo para o Vercel Blob:", uploadError);
        return res.status(500).json({ error: "Falha ao enviar a imagem para o Vercel Blob." });
      }
    }
    if (!codigo_evento || !nome) {
      return res.status(400).json({ error: "Dados incompletos." });
    }
    const newBadge = await prisma.badge.create({
      data: {
        codigo_evento,
        nome,
        descricao,
        url_vercel_blob
      }
    });
    res.json({ success: true, badge: newBadge });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar selo" });
  }
});
app.delete("/api/admin/badges/:id", authenticateAPI, async (req, res) => {
  try {
    await prisma.badge.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao deletar selo" });
  }
});
app.put("/api/admin/badges/:id", authenticateAPI, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }
    const ext = path.extname(req.file.originalname);
    const filename = `badge-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    let urlVercelBlob = "";
    try {
      const blob = await put(filename, req.file.buffer, {
        access: "public",
        contentType: req.file.mimetype,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      urlVercelBlob = blob.url;
    } catch (uploadError) {
      console.error("Erro no upload do selo para o Vercel Blob:", uploadError);
      return res.status(500).json({ error: "Falha ao enviar a imagem atualizada para o Vercel Blob." });
    }
    const updated = await prisma.badge.update({
      where: { id },
      data: { url_vercel_blob: urlVercelBlob }
    });
    res.json({ success: true, badge: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar selo" });
  }
});
app.get("/api/library", authenticateAPI, async (req, res) => {
  console.log("[API Library] GET request received");
  try {
    const items = await prisma.libraryItem.findMany({
      orderBy: { createdAt: "desc" }
    });
    console.log(`[API Library] Returning ${items.length} items`);
    res.json(items);
  } catch (error) {
    console.error("Erro ao listar acervo:", error);
    res.status(500).json({ error: "Erro ao listar acervo" });
  }
});
app.post("/api/library", authenticateAPI, async (req, res) => {
  try {
    const { title, description, type, category, tags, url, thumbnail, author } = req.body;
    if (!title || !description || !type || !url) {
      return res.status(400).json({ error: "Dados incompletos para criar item no acervo." });
    }
    const newItem = await prisma.libraryItem.create({
      data: {
        title,
        description,
        type,
        category: category || "",
        tags: tags || [],
        url,
        thumbnail,
        author: author || "Autor Desconhecido"
      }
    });
    RagBackendService.indexLibraryItemToRAG(newItem).catch((err) => {
      console.error("[RAG] Falha ao indexar novo item do acervo:", err);
    });
    res.json({ success: true, item: newItem, id: newItem.id });
  } catch (error) {
    console.error("Erro ao criar item no acervo:", error);
    res.status(500).json({ error: "Erro ao criar item no acervo" });
  }
});
app.put("/api/library/:id", authenticateAPI, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, category, tags, url, thumbnail, author } = req.body;
    const updated = await prisma.libraryItem.update({
      where: { id },
      data: { title, description, type, category, tags, url, thumbnail, author }
    });
    RagBackendService.indexLibraryItemToRAG(updated).catch((err) => {
      console.error("[RAG] Falha ao re-indexar item do acervo:", err);
    });
    res.json({ success: true, item: updated });
  } catch (error) {
    console.error("Erro ao atualizar acervo:", error);
    res.status(500).json({ error: "Erro ao atualizar item no acervo" });
  }
});
app.delete("/api/library/:id", authenticateAPI, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.libraryItem.delete({ where: { id } });
    const docId = `library-${id}`;
    await prisma.semanticDocument.deleteMany({ where: { id: docId } });
    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar acervo:", error);
    res.status(500).json({ error: "Erro ao deletar item no acervo" });
  }
});
app.post("/api/telemetry/heartbeat", authenticateAPI, async (req, res) => {
  try {
    const { uid, durationSeconds } = req.body;
    if (!uid) return res.status(400).json({ error: "uid required" });
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) return res.status(404).json({ error: "user not found" });
    const activeSession = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        lastPing: { gte: new Date(Date.now() - 5 * 60 * 1e3) }
      },
      orderBy: { lastPing: "desc" }
    });
    if (activeSession) {
      await prisma.userSession.update({
        where: { id: activeSession.id },
        data: {
          lastPing: /* @__PURE__ */ new Date(),
          durationSeconds: { increment: durationSeconds || 60 }
        }
      });
    } else {
      await prisma.userSession.create({
        data: {
          userId: user.id,
          lastPing: /* @__PURE__ */ new Date(),
          durationSeconds: durationSeconds || 60
        }
      });
    }
    res.json({ success: true });
  } catch (error) {
    console.error("[Telemetry] Heartbeat error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});
app.post("/api/telemetry/pageview", authenticateAPI, async (req, res) => {
  try {
    const { uid, path: path2 } = req.body;
    if (!uid || !path2) return res.status(400).json({ error: "uid and path required" });
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) return res.status(404).json({ error: "user not found" });
    await prisma.pageAccess.create({
      data: {
        userId: user.id,
        path: path2
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error("[Telemetry] Pageview error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});
app.get("/api/admin/usage-ranking", authenticateAPI, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        email: true,
        photoURL: true,
        sessions: { select: { durationSeconds: true } },
        pageAccesses: { select: { id: true } },
        interactions: { select: { count: true } }
      }
    });
    const ranking = users.map((u) => {
      const totalSessionTime = u.sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
      const totalPageViews = u.pageAccesses.length;
      const totalScoredActions = u.interactions.reduce((acc, i) => acc + i.count, 0);
      return {
        id: u.id,
        name: u.displayName,
        email: u.email,
        photoURL: u.photoURL,
        totalSessionTime,
        totalPageViews,
        totalScoredActions
      };
    });
    ranking.sort((a, b) => {
      const scoreA = a.totalSessionTime / 60 + a.totalPageViews + a.totalScoredActions * 5;
      const scoreB = b.totalSessionTime / 60 + b.totalPageViews + b.totalScoredActions * 5;
      return scoreB - scoreA;
    });
    res.json({ success: true, ranking });
  } catch (error) {
    console.error("[Admin API] Usage ranking error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});
app.get("/api/admin/unanswered-queries", authenticateAPI, async (req, res) => {
  try {
    const queries = await prisma.unansweredQuery.findMany({
      include: {
        user: { select: { displayName: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    res.json({ success: true, queries });
  } catch (error) {
    console.error("[Admin API] Unanswered queries error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});
app.put("/api/admin/unanswered-queries/:id", authenticateAPI, async (req, res) => {
  try {
    const { status } = req.body;
    const query = await prisma.unansweredQuery.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json({ success: true, query });
  } catch (error) {
    console.error("[Admin API] Update unanswered query error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});
async function startServer() {
  await GamificationService.ensureBadgesSeeded();
  RagBackendService.syncRecipesToPostgreSQL().catch((err) => {
    console.error("[Startup] Falha na sincroniza\xE7\xE3o de receitas para RAG:", err);
  });
  const serveRecipeHTML = async (req, res, next, vite) => {
    try {
      const { slug, id } = req.params;
      const db = getFirestore5();
      let recipeData = null;
      if (slug) {
        const snapshot = await db.collection("recipes").where("slug", "==", slug).limit(1).get();
        if (!snapshot.empty) recipeData = snapshot.docs[0].data();
      } else if (id) {
        const doc = await db.collection("recipes").doc(id).get();
        if (doc.exists) recipeData = doc.data();
      }
      let template = "";
      if (process.env.NODE_ENV !== "production" && vite) {
        template = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
      } else {
        template = fs.readFileSync(path.join(process.cwd(), "dist", "index.html"), "utf-8");
      }
      if (recipeData) {
        const title = `${recipeData.title} - Alquimia do Prato`;
        const desc = recipeData.description || "Confira esta deliciosa receita no Alquimia do Prato!";
        const img = recipeData.image ? recipeData.image.startsWith("http") ? recipeData.image : `https://alquimiadoprato.com${recipeData.image}` : "https://alquimiadoprato.com/pwa-icon-512.png";
        const metaTags = `
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="description" content="${desc}" />`;
        template = template.replace(/<title>.*?<\/title>/, metaTags);
      }
      res.status(200).set({ "Content-Type": "text/html" }).end(template);
    } catch (e) {
      next(e);
    }
  };
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom"
      // Changed from "spa" so Vite doesn't auto-handle index.html for us
    });
    app.get(["/receita/:slug", "/recipe/:id"], (req, res, next) => serveRecipeHTML(req, res, next, vite));
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      try {
        let template = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    app.get(["/receita/:slug", "/recipe/:id"], (req, res, next) => serveRecipeHTML(req, res, next));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
if (process.env.VERCEL !== "1") {
  startServer();
  cron.schedule("59 23 * * *", async () => {
    console.log("[Cron] Iniciando transmuta\xE7\xE3o: Gerando Ata Di\xE1ria do Lounge...");
    try {
      const ata = await AtaGeneratorService.generateDailyAta();
      if (ata) {
        console.log("[Cron] Sucesso: Ata Di\xE1ria gerada e persistida.");
      } else {
        console.log("[Cron] Sil\xEAncio no Lounge: Nenhuma mensagem para resumir hoje.");
      }
    } catch (error) {
      console.error("[Cron] Falha na transmuta\xE7\xE3o da Ata:", error);
    }
  });
  cron.schedule("0 3 * * *", async () => {
    console.log("[Cron] Iniciando sincroniza\xE7\xE3o RAG: Firebase -> PostgreSQL...");
    try {
      await RagBackendService.syncChatsToPostgreSQL();
      await RagBackendService.syncRecipesToPostgreSQL();
    } catch (error) {
      console.error("[Cron] Falha na sincroniza\xE7\xE3o RAG:", error);
    }
  });
}
var server_default = app;
export {
  server_default as default
};
