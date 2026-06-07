/**
 * POST /api/lounge/messages
 *
 * Vercel Serverless Function para envio de mensagens no Lounge Gastronômico.
 * Executa moderação por IA (Gemini) e persiste no Firestore via Admin SDK.
 *
 * Variáveis de ambiente necessárias no Vercel:
 *   - APP_API_KEY (autenticação da requisição)
 *   - GEMINI_API_KEY (moderação por IA)
 *   - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY (Admin SDK)
 *
 * @layer Infrastructure (Serverless)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

/**
 * Obtém todas as chaves de API do Gemini cadastradas nas variáveis de ambiente.
 * Suporta listas separadas por vírgula (GEMINI_API_KEYS) ou sequenciais (GEMINI_API_KEY_1, _2, etc).
 */
function getAvailableApiKeys(): string[] {
  const keys: string[] = [];
  
  if (process.env.GEMINI_API_KEYS) {
    keys.push(...process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 0));
  }
  
  for (let i = 1; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key && key.trim().length > 0 && !keys.includes(key.trim())) {
      keys.push(key.trim());
    }
  }

  const defaultKey = process.env.GEMINI_API_KEY;
  if (defaultKey && defaultKey.trim().length > 0 && !keys.includes(defaultKey.trim())) {
    keys.push(defaultKey.trim());
  }

  return keys;
}

// ============================
// Inicialização do Firebase Admin (singleton)
// ============================

/**
 * Inicializa o Firebase Admin apenas uma vez.
 * Em ambiente serverless, múltiplas invocações podem reutilizar a mesma instância.
 */
function getDb() {
  if (getApps().length === 0) {
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountRaw) {
      throw new Error("Credenciais ausentes. Configure FIREBASE_SERVICE_ACCOUNT_KEY (Base64) no Vercel.");
    }

    try {
      // Decodifica o Service Account: aceita Base64 ou JSON direto
      let jsonString: string;
      if (serviceAccountRaw.startsWith("{")) {
        // JSON direto
        jsonString = serviceAccountRaw;
      } else {
        // Base64 → decodifica para JSON
        jsonString = Buffer.from(serviceAccountRaw, "base64").toString("utf-8");
      }

      const serviceAccount = JSON.parse(jsonString);
      console.log(`[Admin Serverless] Service Account carregado: ${serviceAccount.project_id}`);

      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      });

      console.log(`[Admin Serverless] Firebase Admin inicializado para: ${serviceAccount.project_id}`);
    } catch (error) {
      console.error("[Admin Serverless] Falha ao inicializar Firebase Admin:", error);
      throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY inválido. Use Base64 do JSON do Service Account.");
    }
  }

  return getFirestore();
}

// ============================
// Moderação por IA (Gemini)
// ============================

/**
 * Analisa o texto da mensagem e determina se é pertinente à gastronomia.
 *
 * @param text Conteúdo da mensagem a ser validado.
 * @returns Retorna 'approved' se pertinente, 'rejected' caso contrário.
 */
async function validateCulinaryRelevance(text: string): Promise<"approved" | "rejected"> {
  const lowerText = text.toLowerCase();
  // Mensagens chamando o bot são sempre aprovadas
  if (
    lowerText.includes('@alchemist') || 
    lowerText.includes('@copilot') || 
    lowerText.includes('@chef') || 
    lowerText.includes('@alquimista')
  ) {
    return 'approved';
  }

  const apiKeys = getAvailableApiKeys();

  // Sem chave configurada, aprova por padrão (fail-open)
  if (apiKeys.length === 0 || apiKeys[0] === "your_gemini_api_key_here") {
    console.warn("[Moderation Serverless] GEMINI_API_KEY não configurada. Aprovando por padrão.");
    return "approved";
  }

  const prompt = `
    Você é um moderador do "Lounge Gastronômico" da Alquimia do Prato.
    Sua tarefa é validar se a mensagem de um usuário é pertinente ao universo da gastronomia, 
    culinária, herança cultural alimentar ou técnicas de cozinha.
    
    Mensagem do Usuário: "${text}"
    
    REGRAS DE CLASSIFICAÇÃO:
    1. "approved": Assuntos de comida, receitas, ingredientes, técnicas, história da culinária ou dicas de cozinha.
    2. "rejected": Spam, ofensas, política, ódio, ou qualquer assunto totalmente desconexo da gastronomia.
    
    RETORNO: Responda APENAS com a palavra "approved" ou "rejected". Não adicione explicações.
  `;

  for (let i = 0; i < apiKeys.length; i++) {
    try {
      const client = new GoogleGenAI({ apiKey: apiKeys[i] });

      const response = await client.models.generateContent({
        model: "gemini-1.5-flash",
        contents: prompt,
      });

      const responseText = (response.text || "").trim().toLowerCase();
      return responseText.includes("approved") ? "approved" : "rejected";
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      const isQuotaError = status === 429 || status === "RESOURCE_EXHAUSTED" || error?.message?.includes("429") || error?.message?.includes("quota");
      
      if (isQuotaError && i < apiKeys.length - 1) {
        console.warn(`[Moderation] Quota excedida na chave ${i + 1}. Tentando próxima chave (${i + 2}/${apiKeys.length})...`);
        continue;
      }
      
      const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
      console.error("[Moderation Serverless] Falha na análise do Gemini:", errorMessage);
      // Em caso de erro técnico ou se todas as chaves falharem, aprovamos para não bloquear a experiência do usuário
      return "approved";
    }
  }
  
  return "approved";
}

// ============================
// Handler Principal
// ============================

/**
 * Middleware de autenticação via API Key.
 */
function authenticateRequest(req: VercelRequest): boolean {
  const apiKey = process.env.APP_API_KEY;

  // Em modo dev ou sem chave configurada, libera acesso
  if (!apiKey || apiKey === "" || apiKey === "your_app_api_key_here") {
    return true;
  }

  const clientKey = req.headers["x-api-key"];
  return clientKey === apiKey;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Habilita CORS para o frontend na Vercel
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  // Responde a preflight requests (CORS)
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Aceita apenas POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  // Verifica autenticação via API Key
  if (!authenticateRequest(req)) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
  }

  const { text, senderId, senderRole, metadata } = req.body || {};

  console.log(`[Lounge Serverless] Recebendo mensagem de ${senderId} (${senderRole}): "${text?.substring(0, 50)}..."`);

  if (!text || !senderId) {
    return res.status(400).json({ error: "Texto e SenderId são obrigatórios." });
  }

  try {
    const db = getDb();

    // 1. Executa a moderação via IA antes de persistir
    console.log(`[Lounge Serverless] Iniciando moderação para: "${text.substring(0, 30)}..."`);
    let status = await validateCulinaryRelevance(text);
    console.log(`[Lounge Serverless] Resultado da moderação: ${status}`);

    const finalMetadata = { ...(metadata || {}) };

    if (status === 'rejected') {
      // É uma mensagem restrita. Vamos checar o histórico do usuário nos últimos 10 minutos.
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentMessagesSnapshot = await db.collection('lounge_messages')
        .where('timestamp', '>=', tenMinutesAgo)
        .get();

      let restrictedCount = 0;
      recentMessagesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.senderId === senderId && (data.status === 'rejected' || (data.metadata && data.metadata.restricted === true))) {
          restrictedCount++;
        }
      });

      if (restrictedCount === 0) {
        // Primeira ocorrência: publica com a marcação de inadequado
        status = 'approved';
        finalMetadata.restricted = true;
        console.log(`[Lounge Serverless] Primeira ocorrência de inadequação nos últimos 10 minutos. Publicando com restrição.`);
      } else {
        // Segunda ocorrência ou mais: bloqueia
        console.log(`[Lounge Serverless] Segunda ocorrência ou mais de inadequação nos últimos 10 minutos (${restrictedCount} anteriores). Bloqueando mensagem.`);
      }
    }

    // 2. Salva a mensagem no Firestore com server timestamp
    const docRef = await db.collection("lounge_messages").add({
      text,
      senderId,
      senderRole: senderRole || "user",
      timestamp: FieldValue.serverTimestamp(),
      status,
      reactions: {},
      metadata: finalMetadata,
    });

    console.log(`[Lounge Serverless] Mensagem salva com sucesso! ID: ${docRef.id}`);

    // Integração da Gamificação: Dar XP pela mensagem no Lounge (apenas se for aprovada e não restrita)
    let gamificationResult = null;
    if (status === 'approved' && !finalMetadata.restricted) {
      try {
        const { GamificationService } = await import("../../src/infra/services/GamificationService");
        gamificationResult = await GamificationService.processEvent(senderId, 'COLLABORATION_MESSAGE');
        console.log(`[Lounge Serverless] XP atribuído: +${gamificationResult.xpGained} XP. Nível Atual: ${gamificationResult.currentLevel}`);
      } catch (gamiErr: any) {
        console.warn("[Lounge Serverless] Erro não fatal na gamificação (Usuário não cadastrado no Prisma?):", gamiErr.message);
      }
    }

    // Trigger Alchemist bot if mentioned (@alchemist, @copilot, @chef, @alquimista)
    const lowerText = text.toLowerCase();
    if (status === 'approved' && (lowerText.includes('@alchemist') || lowerText.includes('@copilot') || lowerText.includes('@chef') || lowerText.includes('@alquimista'))) {
      console.log(`[Lounge Serverless] Bot acionado! Iniciando processamento do Alchemist RAG...`);
      try {
        const { RagBackendService } = await import("../../src/infra/services/ragBackendService");
        // Await the bot generation to prevent Vercel from terminating/freezing the execution early
        const answer = await RagBackendService.askGeminiWithContext(text);
        const copilotMessage = {
          text: answer,
          senderId: 'copilot-agent',
          senderName: 'Alchemist',
          senderRole: 'agent',
          timestamp: FieldValue.serverTimestamp(),
          status: 'approved',
          reactions: {},
          metadata: { isBot: true, replyTo: docRef.id }
        };
        await db.collection('lounge_messages').add(copilotMessage);
        console.log(`[Lounge Serverless] Resposta do Alchemist salva com sucesso!`);
      } catch (err: any) {
        console.error("[Lounge Serverless] Erro ao gerar resposta do Alchemist:", err);
      }
    }

    // Inicia verificação de engajamento proativo se a mensagem foi aprovada e não acionou o bot diretamente
    if (status === 'approved' && !(lowerText.includes('@alchemist') || lowerText.includes('@copilot') || lowerText.includes('@chef') || lowerText.includes('@alquimista'))) {
      import("../../src/infra/services/ragBackendService").then(({ RagBackendService }) => {
        RagBackendService.checkAndTriggerProactiveEngagement(db).catch(err => 
          console.error("[Lounge Serverless] Erro no fluxo de engajamento proativo:", err)
        );
      }).catch(err => console.error("[Lounge Serverless] Erro ao carregar RagBackendService para engajamento proativo:", err));
    }

    return res.status(200).json({
      success: true,
      id: docRef.id,
      status,
      message: status === "approved" ? (finalMetadata.restricted ? "Mensagem publicada com restrição de contexto." : "Mensagem publicada!") : "Sua mensagem passará por revisão.",
      gamification: gamificationResult
    });
  } catch (error: any) {
    console.error("[Lounge Serverless] ERRO CRÍTICO ao postar mensagem:", error);
    return res.status(500).json({ error: error.message || "Erro interno ao processar mensagem" });
  }
}
