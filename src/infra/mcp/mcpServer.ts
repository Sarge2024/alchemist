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
