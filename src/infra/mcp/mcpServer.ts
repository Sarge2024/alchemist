import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";
import { prisma } from "../prisma/client";
import { RagBackendService } from "../services/ragBackendService";

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
