import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "../prisma/client";
import { RagBackendService } from "../services/ragBackendService";
import { GamificationService } from "../services/GamificationService";
import { getFirestore } from "firebase-admin/firestore";

const mcpServer = new Server(
  {
    name: "alchemist-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Registrar Ferramentas Culinárias
mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_gastronomic_context",
        description: "Recupera artigos e receitas semânticas relevantes para um termo culinário.",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string", description: "O termo ou contexto gastronômico procurado" },
          },
          required: ["query"],
        },
      },
      {
        name: "get_user_culinary_profile",
        description: "Recupera o perfil do usuário para o Chef IA entender as preferências e restrições antes de responder.",
        inputSchema: {
          type: "object",
          properties: {
            uid: { type: "string", description: "O UID (Firebase/Supabase) do usuário autenticado." },
          },
          required: ["uid"],
        },
      },
      {
        name: "update_user_culinary_profile",
        description: "Salva insights psicológicos (Efeito ELIZA) ou restrições alimentares do usuário para longo prazo.",
        inputSchema: {
          type: "object",
          properties: {
            uid: { type: "string", description: "O UID do usuário autenticado." },
            motivation_root: { type: "string", description: "A motivação subconsciente do usuário ao cozinhar (ex: 'Aliviar estresse', 'Impressionar amigos')." },
            preferred_style: { type: "string", description: "Estilo preferido de culinária (ex: 'Rústica', 'Sofisticada', 'Rápida')." },
            dietary_restrictions: { type: "array", items: { type: "string" }, description: "Restrições alimentares identificadas." },
          },
          required: ["uid"],
        },
      },
      {
        name: "trigger_gamification_event",
        description: "Aciona um evento de gamificação, como quando o usuário responde corretamente a um quiz do Chef IA.",
        inputSchema: {
          type: "object",
          properties: {
            uid: { type: "string", description: "O UID do usuário autenticado." },
            eventType: { type: "string", description: "Tipo de evento (ex: 'QUIZ_ANSWERED_CORRECTLY')." },
            topic: { type: "string", description: "Tópico relacionado ao evento (ex: 'Reação de Maillard')." },
          },
          required: ["uid", "eventType"],
        },
      },
      {
        name: "check_gamification_status",
        description: "Verifica o status de gamificação do usuário, incluindo nível, XP, selos e contagem de eventos que pontuam (ex: publicação de receitas, perfil completo). O MCP deve usar essa ferramenta para validar os eventos do usuário.",
        inputSchema: {
          type: "object",
          properties: {
            uid: { type: "string", description: "O UID (Supabase) do usuário para verificar o status." },
          },
          required: ["uid"],
        },
      },
    ],
  };
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "get_gastronomic_context") {
    const query = request.params.arguments?.query as string;
    
    try {
      const resultText = await RagBackendService.askGeminiWithContext(query);
      return {
        content: [{ type: "text", text: resultText }],
      };
    } catch (error: any) {
      console.error("[MCP] Erro na ferramenta get_gastronomic_context:", error);
      return {
        content: [{ type: "text", text: `Erro ao buscar contexto: ${error.message}` }],
        isError: true,
      };
    }
  }

  if (request.params.name === "check_gamification_status") {
    const uid = request.params.arguments?.uid as string;
    
    try {
      const profile = await GamificationService.getProfile(uid);
      if (!profile) {
        return {
          content: [{ type: "text", text: `Perfil de gamificação não encontrado para o UID: ${uid}` }],
        };
      }
      
      const user = await prisma.user.findUnique({ where: { uid } });
      const interactions = await prisma.userInteraction.findMany({
        where: { userId: user?.id }
      });
      
      const statusText = `Status de Gamificação do Usuário:
Nível Atual: ${profile.nivel} (${profile.grau})
XP Total: ${profile.xp_total} / Meta Próximo Nível: ${profile.meta_nivel}
Selos Conquistados: ${profile.user?.badges.map((b: any) => b.badge.nome).join(", ") || "Nenhum"}

Eventos e Pontuações Registradas:
${interactions.length > 0 ? interactions.map((i: any) => `- Evento: ${i.eventType} | Contagem: ${i.count}`).join("\n") : "Nenhuma interação registrada ainda."}`;
      
      return {
        content: [{ type: "text", text: statusText }],
      };
    } catch (error: any) {
      console.error("[MCP] Erro na ferramenta check_gamification_status:", error);
      return {
        content: [{ type: "text", text: `Erro ao buscar status de gamificação: ${error.message}` }],
        isError: true,
      };
    }
  }

  if (request.params.name === "get_user_culinary_profile") {
    const uid = request.params.arguments?.uid as string;
    try {
      const db = getFirestore();
      const userDoc = await db.collection("users").doc(uid).get();
      const gamification = await GamificationService.getProfile(uid);
      
      if (!userDoc.exists) {
        return {
          content: [{ type: "text", text: `Usuário não encontrado no Firestore (UID: ${uid}). Gamificação Nível: ${gamification?.nivel || 1}` }],
        };
      }

      const userData = userDoc.data() || {};
      const profileData = {
        displayName: userData.displayName || "Desconhecido",
        motivation_root: userData.motivation_root || "Não mapeado ainda",
        preferred_style: userData.preferred_style || "Não mapeado ainda",
        dietary_restrictions: userData.dietary_restrictions || [],
        gamification_level: gamification?.nivel || 1,
        gamification_xp: gamification?.xp_total || 0
      };

      return {
        content: [{ type: "text", text: JSON.stringify(profileData, null, 2) }],
      };
    } catch (error: any) {
      console.error("[MCP] Erro na ferramenta get_user_culinary_profile:", error);
      return {
        content: [{ type: "text", text: `Erro ao buscar perfil culinário: ${error.message}` }],
        isError: true,
      };
    }
  }

  if (request.params.name === "update_user_culinary_profile") {
    const uid = request.params.arguments?.uid as string;
    const motivation_root = request.params.arguments?.motivation_root as string | undefined;
    const preferred_style = request.params.arguments?.preferred_style as string | undefined;
    const dietary_restrictions = request.params.arguments?.dietary_restrictions as string[] | undefined;
    
    try {
      const db = getFirestore();
      const updateData: any = {};
      if (motivation_root !== undefined) updateData.motivation_root = motivation_root;
      if (preferred_style !== undefined) updateData.preferred_style = preferred_style;
      if (dietary_restrictions !== undefined) updateData.dietary_restrictions = dietary_restrictions;

      await db.collection("users").doc(uid).set(updateData, { merge: true });

      return {
        content: [{ type: "text", text: `Perfil do usuário ${uid} atualizado com sucesso.` }],
      };
    } catch (error: any) {
      console.error("[MCP] Erro na ferramenta update_user_culinary_profile:", error);
      return {
        content: [{ type: "text", text: `Erro ao atualizar perfil culinário: ${error.message}` }],
        isError: true,
      };
    }
  }

  if (request.params.name === "trigger_gamification_event") {
    const uid = request.params.arguments?.uid as string;
    const eventType = request.params.arguments?.eventType as string;
    const topic = request.params.arguments?.topic as string | undefined;
    
    try {
      // Cast the string to the expected keys of GamificationService.EVENT_XP
      const gamificationResult = await GamificationService.processEvent(uid, eventType as any);
      
      return {
        content: [{ type: "text", text: `Evento '${eventType}' processado com sucesso. Tópico: ${topic || 'N/A'}. XP Ganho: ${gamificationResult.xpGained}. Nível Atual: ${gamificationResult.currentLevel}.` }],
      };
    } catch (error: any) {
      console.error("[MCP] Erro na ferramenta trigger_gamification_event:", error);
      return {
        content: [{ type: "text", text: `Erro ao processar evento de gamificação: ${error.message}` }],
        isError: true,
      };
    }
  }

  throw new Error("Tool não encontrada");
});

// Configuração de rotas SSE no Express
export function registerMcpRoutes(app: express.Express) {
  let sseTransport: SSEServerTransport | null = null;

  app.get("/api/mcp/sse", async (req, res) => {
    // Cria uma conexão SSE persistente
    sseTransport = new SSEServerTransport("/api/mcp/message", res);
    await mcpServer.connect(sseTransport);

    req.on("close", () => {
      console.log("[MCP] Conexão SSE encerrada.");
    });
  });

  app.post("/api/mcp/message", async (req, res) => {
    if (sseTransport) {
      await sseTransport.handlePostMessage(req, res);
    } else {
      res.status(400).send("Nenhuma sessão SSE MCP ativa.");
    }
  });
}
