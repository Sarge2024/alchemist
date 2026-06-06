// server.ts
import "dotenv/config";
import express from "express";
import path from "path";
import { JSDOM } from "jsdom";
import multer from "multer";
import fs from "fs";
import FirecrawlApp from "@mendable/firecrawl-js";
import { initializeApp as initializeAdminApp, cert } from "firebase-admin/app";
import { getFirestore as getFirestore3, FieldValue as FieldValue2 } from "firebase-admin/firestore";
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
   */
  static async askGeminiWithContext(userQuestion, limit = 5) {
    const ai = await this.getGeminiClient();
    const context = await this.getSemanticContext(userQuestion, limit);
    const finalPrompt = `
      Voc\xEA \xE9 o assistente culin\xE1rio Alchemist. Use as refer\xEAncias de contexto fornecidas abaixo para responder \xE0 pergunta do usu\xE1rio de forma precisa. Se n\xE3o souber a resposta ou se o contexto n\xE3o for suficiente, use seus conhecimentos de forma honesta, indicando que as informa\xE7\xF5es hist\xF3ricas locais do portal n\xE3o mencionam o assunto.

      CONTEXTO RECUPERADO:
      ${context || "Nenhum contexto hist\xF3rico relevante foi encontrado no banco de dados."}

      PERGUNTA DO USU\xC1RIO:
      ${userQuestion}
    `;
    const generation = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: finalPrompt
    });
    return generation.text || "Sem resposta.";
  }
  /**
   * Retorna apenas o contexto semântico formatado para um dado texto de busca
   */
  static async getSemanticContext(queryText, limit = 5) {
    const ai = await this.getGeminiClient();
    const embeddingResponse = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: queryText
    });
    const queryVector = embeddingResponse.embeddings?.[0]?.values;
    if (!queryVector || queryVector.length !== 768) {
      return "";
    }
    const vectorLiteral = `[${queryVector.join(",")}]`;
    const matchedDocs = await prisma.$queryRaw`
      SELECT id, title, content,
             1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
      FROM "SemanticDocument"
      ORDER BY embedding <=> ${vectorLiteral}::vector ASC
      LIMIT ${limit};
    `;
    return matchedDocs.filter((doc) => doc.similarity > 0.6).map((doc) => `[Documento: ${doc.title}]
${doc.content}`).join("\n\n");
  }
  /**
   * Sincroniza mensagens do Lounge do Firestore para o PostgreSQL gerando Embeddings
   */
  static async syncChatsToPostgreSQL() {
    console.log("[RAG Sync] Iniciando sincroniza\xE7\xE3o de chats para o PostgreSQL...");
    const db = getFirestore();
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1e3);
    const snapshot = await db.collection("lounge_messages").where("status", "==", "approved").where("timestamp", ">=", last24h).get();
    if (snapshot.empty) {
      console.log("[RAG Sync] Nenhuma mensagem nova nas \xFAltimas 24h.");
      return;
    }
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      text: doc.data().text,
      sender: doc.data().senderRole || "user"
    }));
    const ai = await this.getGeminiClient();
    console.log(`[RAG Sync] Gerando embeddings para ${messages.length} mensagens...`);
    const embeddingResponse = await ai.models.embedContent({
      model: "text-embedding-004",
      contents: messages.map((m) => `[${m.sender}]: ${m.text}`)
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
      const messagesSnapshot = await db.collection("lounge_messages").where("status", "==", "approved").where("timestamp", ">=", last24h).orderBy("timestamp", "asc").get();
      if (messagesSnapshot.empty) {
        console.log("[AtaGenerator] Nenhuma mensagem aprovada para processar nas \xFAltimas 24h.");
        return null;
      }
      const messagesContent = messagesSnapshot.docs.map((doc) => {
        const data = doc.data();
        return `[${data.senderRole}] ${data.text}`;
      }).join("\n---\n");
      let semanticContext = "";
      try {
        semanticContext = await RagBackendService.getSemanticContext(messagesContent.substring(0, 800), 3);
      } catch (e) {
        console.warn("[AtaGenerator] N\xE3o foi poss\xEDvel buscar contexto sem\xE2ntico:", e);
      }
      const prompt = `
        Voc\xEA \xE9 o Cronista Oficial da Alquimia do Prato. Sua miss\xE3o \xE9 ler as mensagens do Lounge Gastron\xF4mico 
        e sintetizar uma "Ata de Intera\xE7\xE3o Comunit\xE1ria" que inspire a nossa comunidade.
        Voc\xEA pode usar o "Contexto Hist\xF3rico do Acervo" para conectar as discuss\xF5es atuais com receitas ou temas do passado.
        
        CONTEXTO HIST\xD3RICO DO ACERVO (Para refer\xEAncia e conex\xF5es na se\xE7\xE3o de Insights):
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
           
        3. Acervo Citado & Refer\xEAncias (Links do site):
           - Artigo: [T\xEDtulo sugerido]
           - E-book: [T\xEDtulo sugerido]
           
        4. Term\xF4metro da Comunidade:
           - Clima: [Produtivo/T\xE9cnico/Inspiracional]
           - Participa\xE7\xE3o: [N\xBA aproximado de colaboradores distintos]
           - Destaque do Dia: [Nome/ID do autor da contribui\xE7\xE3o mais relevante]

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
            "artigo": "...",
            "ebook": "..."
          },
          "termometro": {
            "clima": "...",
            "participacao": 0,
            "destaqueDoDia": "..."
          },
          "stats": { "totalMessages": ${messagesSnapshot.size} }
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
      PRODUCT_PURCHASED: 25
      // Compras de Produtos
    };
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
      const profile = await prisma.userGamificationProfile.upsert({
        where: { userId: user.id },
        update: {
          xp_total: { increment: xpGained }
        },
        create: {
          userId: user.id,
          xp_total: xpGained,
          nivel: 1,
          grau: Grau.APRENDIZ
        }
      });
      const currentLevel = profile.nivel;
      const expectedLevel = Math.floor(profile.xp_total / this.XP_PER_LEVEL) + 1;
      const result = {
        xpGained,
        totalXp: profile.xp_total,
        currentLevel,
        leveledUp: false
      };
      if (expectedLevel > currentLevel) {
        const newGrau = this.getGrauForLevel(expectedLevel);
        await prisma.userGamificationProfile.update({
          where: { id: profile.id },
          data: {
            nivel: expectedLevel,
            grau: newGrau
          }
        });
        result.currentLevel = expectedLevel;
        result.leveledUp = true;
      }
      return result;
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
        xp_total: 0
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
      - momento (string[]): USE APENAS: 'Caf\xE9 da Manh\xE3', 'Brunch', 'Almo\xE7o', 'Lanche / Ch\xE1 da Tarde', 'Jantar', 'Ceia', 'Petiscos / Aperitivos', 'Bebidas'. (Pode ser mais de um).
      - tipo_prato (string[]): USE APENAS: 'Assados', 'Frituras', 'Grelhados', 'Sopas e Caldos', 'Cremes e Pur\xE9s', 'Massas e Risotos', 'Saladas e Pratos Frios', 'Cozidos / Guisados', 'Padaria e Pastelaria', 'Bebidas', 'Doces e Sobremesas'.
      - base_alimento (string[]): USE APENAS: 'Carnes', 'Frutos do Mar', 'Vegetais e Legumes', 'Ovos e Latic\xEDnios', 'Gr\xE3os e Leguminosas'.
      - origem (string): USE PREFERENCIALMENTE: 'Latino-Americana', 'Brasileira', 'Mexicana', 'Argentina', 'Asi\xE1tica', 'Japonesa', 'Chinesa', 'Tailandesa', 'Coreana', 'Indiana', 'Europeia', 'Italiana', 'Francesa', 'Portuguesa', 'Espanhola', '\xC1rabe / M\xE9dio Oriente', 'Americana'.
      - custo_estimado (string): USE: '$', '$$', '$$$', '$$$$'.
      - time (string): TEMPO TOTAL (ex: '45 min').
      - prepTime (string): TEMPO DE PREPARA\xC7\xC3O (ex: '15 min').
      - dietType (string): TIPO DE DIETA (USE EXATAMENTE UMA DESTAS: 'Convencional', 'Vegana', 'Vegetariana', 'Low Carb', 'Keto', 'Sem Gl\xFAten', 'Sem Lactose', 'Fit'). Se n\xE3o houver restri\xE7\xE3o clara, use 'Convencional'.
      - difficulty (F\xE1cil, M\xE9dio, Dif\xEDcil), servings.
      - isClassic (boolean): Determine se esta \xE9 uma receita CL\xC1SSICA ou TRADICIONAL. Receitas cl\xE1ssicas s\xE3o aquelas amplamente conhecidas, com origem hist\xF3rica clara, heran\xE7a cultural ou pratos ic\xF4nicos (ex: Feijoada, Carbonara, Ratatouille). Se o texto descrever uma hist\xF3ria de fam\xEDlia ou heran\xE7a, tamb\xE9m marque como true.
      - ingredients (objeto[] com name, quantity e group). 
        REGRAS DE INGREDIENTES:
        - SEPARE OBRIGATORIAMENTE a quantidade (n\xFAmero + unidade) do nome (ex: "500g de Farinha" -> name: "Farinha", quantity: "500g").
        - EXTRAIA A QUANTIDADE EXATA DO TEXTO. Se o texto diz "2 ovos" ou "4 copos", use quantity: "2" e quantity: "4 copos".
        - NUNCA use "a gosto" a menos que esteja explicitamente escrito no texto.
        - Mantenha fra\xE7\xF5es leg\xEDveis (ex: "1/2" em vez de "0.5") para facilitar a leitura.
        - N\xC3O repita a quantidade no nome.
        - REMOVA preposi\xE7\xF5es conectoras (ex: "de", "do", "da") do in\xEDcio do nome quando poss\xEDvel.
        - O campo 'group' deve ser usado para separar partes da receita (ex: 'Massa', 'Recheio', 'Cobertura').
        - EXEMPLOS:
          - "4 copos de farinha" -> { quantity: "4 copos", name: "farinha" }
          - "2 ovos" -> { quantity: "2", name: "ovos" }
          - "1/2 copo de \xE1gua" -> { quantity: "1/2 copo", name: "\xE1gua" }
          - "sal a gosto" -> { quantity: "a gosto", name: "sal" }
        - instructions (string[]).
        - chefTips (string): Dicas adicionais, segredos do chef, varia\xE7\xF5es da receita ou conselhos t\xE9cnicos importantes. Procure por blocos de texto que contenham dicas, notas ou "Dica do Chef".
        - image, imageOptions (string[]).
    `;
    const contentPrompt = isUrlOnly ? `Acesse e pesquise PROFUNDAMENTE os detalhes da receita no seguinte link: ${options.url}. 
         O site pode estar bloqueando acessos diretos, ent\xE3o use sua ferramenta de busca (Google Search) para encontrar o conte\xFAdo desta URL exata ou de fontes que repliquem esta receita espec\xEDfica.
         Procure por: T\xEDtulo, Ingredientes, Modo de Preparo, Tempo e Imagens.
         Se for um petisco, quitute ou acompanhamento para coffee break, classifique como 'Petiscos / Aperitivos'.` : `Extraia os dados da receita do seguinte HTML: ${html.substring(0, 3e4)}. 
         Ignore an\xFAncios e navega\xE7\xE3o. Foque no conte\xFAdo central da receita.
         Se for um petisco, quitute ou acompanhamento para coffee break, classifique como 'Petiscos / Aperitivos'.`;
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
          const result = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            ...isUrlOnly ? { tools: [{ googleSearch: {} }] } : {}
          });
          response = result;
          break;
        } catch (error) {
          lastError = error;
          if (isQuotaExhaustedError(error) && i < apiKeys.length - 1) {
            console.warn(`[Alquimia do Prato] Transmutando limites: a cota da chave ${i + 1} foi atingida. Ativando reserva ${i + 2} de ${apiKeys.length}...`);
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
      const ALL_MOMENTOS = ["Caf\xE9 da Manh\xE3", "Brunch", "Almo\xE7o", "Lanche / Ch\xE1 da Tarde", "Jantar", "Ceia", "Petiscos / Aperitivos", "Bebidas"];
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
                ...true ? { tools: [{ googleSearch: {} }] } : {}
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
        throw new Error("Falha na Extra\xE7\xE3o: O limite da cota gratuita da Intelig\xEAncia Artificial (Gemini) foi atingido. Verifique o plano de faturamento no Google AI Studio.");
      }
      throw new Error("Falha ao extrair dados da receita via AI.");
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
  limits: { fileSize: 5 * 1024 * 1024 },
  // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens s\xE3o permitidas"));
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
app.use(express.json());
registerMcpRoutes(app);
app.post("/api/presence", async (req, res) => {
  try {
    const { uid, isOnline, displayName, email, photoURL } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "uid is required" });
    }
    const db = getFirestore3();
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
app.use(express.static(path.resolve(process.cwd(), "public"), {
  setHeaders: (res) => {
    res.set("Access-Control-Allow-Origin", "*");
  }
}));
app.post("/api/upload", authenticateAPI, upload.single("image"), async (req, res) => {
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
    const db = getFirestore3();
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
    new URL(url);
    if (firecrawl) {
      console.log(`Using Firecrawl to scrape: ${url}`);
      const scrapeResult = await firecrawl.scrape(url, {
        formats: ["html"],
        onlyMainContent: true,
        waitFor: 3e3
      });
      if (scrapeResult && (scrapeResult.html || scrapeResult.markdown)) {
        return res.json({
          success: true,
          html: scrapeResult.html || scrapeResult.markdown,
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
      const src = img.getAttribute("src") || img.getAttribute("data-src") || img.getAttribute("srcset")?.split(" ")[0];
      if (src && src.startsWith("http") && !src.includes("logo") && !src.includes("icon")) {
        if (src.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
          allImagesFound.push(src);
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
    const db = getFirestore3();
    console.log(`[Lounge API] Iniciando modera\xE7\xE3o para: "${text.substring(0, 30)}..."`);
    const status = await ModerationService.validateCulinaryRelevance(text);
    console.log(`[Lounge API] Resultado da modera\xE7\xE3o: ${status}`);
    const messageData = {
      text,
      senderId,
      senderName: senderName || "Alquimista An\xF4nimo",
      senderRole: senderRole || "user",
      timestamp: /* @__PURE__ */ new Date(),
      status,
      reactions: {},
      metadata: metadata || {}
    };
    console.log(`[Lounge API] Salvando mensagem no Firestore...`);
    const docRef = await db.collection("lounge_messages").add({
      ...messageData,
      timestamp: FieldValue2.serverTimestamp()
      // Força server timestamp
    });
    console.log(`[Lounge API] Mensagem salva com sucesso! ID: ${docRef.id}`);
    let gamificationResult = null;
    try {
      gamificationResult = await GamificationService.processEvent(senderId, "COLLABORATION_MESSAGE");
      console.log(`[Lounge API] XP atribu\xEDdo: +${gamificationResult.xpGained} XP. N\xEDvel Atual: ${gamificationResult.currentLevel}`);
    } catch (gamiErr) {
      console.warn("[Lounge API] Erro n\xE3o fatal na gamifica\xE7\xE3o (Usu\xE1rio n\xE3o cadastrado no Prisma?):", gamiErr.message);
    }
    res.json({
      success: true,
      id: docRef.id,
      status,
      message: status === "approved" ? "Mensagem publicada!" : "Sua mensagem passar\xE1 por revis\xE3o.",
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
    res.json({ success: true, interaction });
  } catch (error) {
    console.error("Erro ao atualizar intera\xE7\xE3o:", error);
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/chat/ask", authenticateAPI, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }
    const answer = await RagBackendService.askGeminiWithContext(question);
    res.json({ success: true, answer });
  } catch (error) {
    console.error("[Chat RAG API] Erro:", error);
    res.status(500).json({ success: false, error: "Erro ao consultar o assistente." });
  }
});
app.post("/api/gamification/event", authenticateAPI, async (req, res) => {
  try {
    const { uid, eventType } = req.body;
    if (!uid || !eventType) {
      return res.status(400).json({ error: "uid and eventType are required" });
    }
    const result = await GamificationService.processEvent(uid, eventType);
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
    const profile = await GamificationService.getProfile(uid);
    if (!profile) {
      return res.status(404).json({ error: "Perfil de gamifica\xE7\xE3o n\xE3o encontrado." });
    }
    const mappedProfile = {
      ...profile,
      level: profile.nivel,
      tier: profile.grau,
      xp: profile.xp_total % 100,
      nextLevelXp: 100
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
    await prisma.avatarOption.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
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
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
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
    } catch (error) {
      console.error("[Cron] Falha na sincroniza\xE7\xE3o RAG:", error);
    }
  });
}
var server_default = app;
export {
  server_default as default
};
