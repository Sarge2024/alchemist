# Análise de Viabilidade Técnica: Google Embeddings, MCP e RAG

Este documento apresenta a análise de viabilidade, impactos de arquitetura, custos, performance e plano de implementação para integrar os três pilares tecnológicos de IA no portal **Alchemist**: Google Embeddings, Model Context Protocol (MCP) e RAG (Retrieval-Augmented Generation).

---

## 1. Armazenamento de Vetores (Prisma + pgvector + PostgreSQL)

### Aderência e Esforço
- **Esforço:** Médio. A extensão `pgvector` é nativa e amplamente suportada pelo PostgreSQL moderno (incluindo serviços gerenciados como Supabase, Neon e AWS RDS).
- **Integração com Prisma:** O Prisma possui suporte oficial a extensões do PostgreSQL desde a v4.11.0. Definimos a extensão `pgvector` no datasource e declaramos a coluna de vetor como um campo `Unsupported("vector(768)")` para acomodar os **768 elementos** retornados pelo modelo `text-embedding-004` do Google.
- **Limitação de Consulta:** O Prisma Client não suporta operadores matemáticos complexos (como `<=>` para distância de cosseno) de forma nativa na API de escrita tipada. Portanto, a busca vetorial deve ser feita obrigatoriamente via consultas SQL puras (`prisma.$queryRaw`).

### Estrutura do Schema Prisma
Adicionaremos a extensão e a nova tabela para os documentos semânticos:

```prisma
datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector")]
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

model SemanticDocument {
  id        String                      @id @default(uuid())
  title     String
  content   String                      // Trecho de texto do documento/chat/artigo
  type      String                      // 'article' | 'presentation' | 'chat_summary'
  embedding Unsupported("vector(768)")? // Vetor gerado pelo text-embedding-004
  createdAt DateTime                    @default(now())
  updatedAt DateTime                    @updatedAt

  @@index([type])
}
```

---

## 2. Implementação do Servidor MCP (STDIO vs SSE)

### Avaliação de Transportes
1. **STDIO (Standard Input/Output):**
   - *Funcionamento:* Comunicação via pipes locais de terminal (`stdin` / `stdout`).
   - *Limitação:* É estritamente unidirecional/monousuário (1-para-1). Se um agente local roda o servidor como subprocesso, outro agente remoto ou outra aba não conseguirá interagir com ele.
   - *Veredito:* **Inviável** para o portal Alchemist, que exige múltiplos agentes (Atas, Quiz, Gamer) consumindo as ferramentas em paralelo.

2. **SSE (Server-Sent Events):**
   - *Funcionamento:* O servidor abre um fluxo unidirecional persistente (`text/event-stream`) de eventos para os clientes, e os clientes respondem enviando requisições via POST.
   - *Veredito:* **Recomendado**. Permite conexão multicliente concorrente através da rede HTTP do portal. O Express pode expor o transporte SSE diretamente como rotas da API.

### Dependência Necessária
É preciso instalar o SDK oficial do MCP:
```bash
npm install @modelcontextprotocol/sdk
```

### Esboço do Servidor MCP com SSE no Express

```typescript
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";

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
    // Aqui seria executada a busca semântica no PostgreSQL
    return {
      content: [{ type: "text", text: `Resultado de busca vetorial para: ${query}` }],
    };
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
      console.log("Conexão MCP SSE encerrada.");
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
```

---

## 3. Refactoring do SDK do Gemini (`@google/genai`) para RAG

No SDK oficial `@google/genai` (v1.x), a geração de embeddings é feita pelo método `client.models.embedContent` usando o modelo `text-embedding-004`.

### Função RAG com Busca Semântica no PostgreSQL

```typescript
import { GoogleGenAI } from "@google/genai";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface SearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

/**
 * Realiza busca semântica via RAG combinando Embeddings e busca vetorial no Postgres.
 */
export async function askGeminiWithContext(userQuestion: string, limit = 5): Promise<string> {
  // 1. Gerar o Embedding da pergunta do usuário
  const embeddingResponse = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: userQuestion,
  });

  const queryVector = embeddingResponse.embedding?.values;
  if (!queryVector || queryVector.length !== 768) {
    throw new Error("Falha ao gerar vetor de embedding com tamanho correto.");
  }

  // 2. Consulta de similaridade de cosseno no PostgreSQL via Prisma Raw SQL
  const vectorStr = JSON.stringify(queryVector);
  const matchedDocs = await prisma.$queryRaw<SearchResult[]>`
    SELECT id, title, content,
           1 - (embedding <=> ${vectorStr}::vector) AS similarity
    FROM "SemanticDocument"
    ORDER BY embedding <=> ${vectorStr}::vector ASC
    LIMIT ${limit};
  `;

  // 3. Montar o contexto de prompt a partir dos pedaços mais semelhantes
  const context = matchedDocs
    .filter(doc => doc.similarity > 0.6) // Filtrar por relevância mínima de 60%
    .map(doc => `[Documento: ${doc.title}]\n${doc.content}`)
    .join("\n\n");

  // 4. Gerar a resposta final alimentando o Gemini 3 Flash Preview com o contexto injetado
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
```

---

## 4. Impactos, Custos e Aderência nas Dependências

### Performance de Leitura do Firestore + Geração de Embeddings (Agente de Atas)
O "Agente de Atas Diárias" lê coleções de chats e interações do Firestore para resumir o dia.
- **Custo e Performance no Firestore:** Operações de leitura em lote são cobradas por documento lido. Fazer queries volumosas a cada hora gera um pico de custos.
- **Estratégia de Performance:**
  1. **Time-windowing:** Filtrar mensagens estritamente pela data (`timestamp >= last24h`), evitando consultas completas na coleção.
  2. **Batching de Embeddings:** O SDK `@google/genai` permite passar uma lista de strings para `embedContent` para gerar múltiplos embeddings em uma única chamada de rede. Isso reduz o overhead de latência (RTT) de requisições sequenciais.
  3. **Bulk Upsert no Postgres:** Salvar os vetores gerados no PostgreSQL usando uma única query de inserção em massa para não sobrecarregar as conexões do pool do Prisma.

#### Exemplo de Processamento em Lote (Firestore -> Gemini -> Postgres)
```typescript
import { getFirestore } from "firebase-admin/firestore";

export async function syncChatsToPostgreSQL() {
  const db = getFirestore();
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // 1. Ler mensagens recentes em lote único do Firestore
  const snapshot = await db.collection("lounge_messages")
    .where("status", "==", "approved")
    .where("timestamp", ">=", last24h)
    .get();

  if (snapshot.empty) return;

  const messages = snapshot.docs.map(doc => ({
    id: doc.id,
    text: doc.data().text,
    sender: doc.data().senderRole || "user"
  }));

  // 2. Chamar o serviço do Google de forma vetorizada (em lote)
  // Gerando embeddings de vários textos de uma vez só
  const embeddingResponse = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: messages.map(m => `[${m.sender}]: ${m.text}`),
  });

  const embeddings = embeddingResponse.embeddings; // Array de { values: number[] }

  if (!embeddings || embeddings.length !== messages.length) {
    throw new Error("Tamanho de embeddings gerados diverge do total de mensagens.");
  }

  // 3. Inserção em massa (Bulk Insert) no PostgreSQL usando SQL bruto e transações
  const queries = messages.map((m, index) => {
    const vectorStr = JSON.stringify(embeddings[index].values);
    return prisma.$executeRawUnsafe(`
      INSERT INTO "SemanticDocument" (id, title, content, type, embedding, "updatedAt")
      VALUES ($1, $2, $3, 'chat_summary', $4::vector, NOW())
      ON CONFLICT (id) DO UPDATE 
      SET content = EXCLUDED.content, embedding = EXCLUDED.embedding, "updatedAt" = NOW()
    `, m.id, `Mensagem de Chat ${m.id}`, m.text, vectorStr);
  });

  await prisma.$transaction(queries);
}
```

### Impacto do HMR e Vite em Modo Middleware no Desenvolvimento Local do Servidor MCP
- **O HMR desativado (`DISABLE_HMR=true`)** não impacta o servidor MCP, uma vez que o Hot Module Replacement é uma funcionalidade estritamente do frontend para atualizar componentes sem recarregar o navegador.
- **O uso do Vite em modo middleware via Express** significa que o Express controla o ciclo de vida da execução de back-end. Como o servidor MCP roda acoplado como rotas adicionais (`/api/mcp/sse`), o Vite não interfere no comportamento desse protocolo.
- **O impacto crítico está no uso do `tsx` no backend:** Durante o desenvolvimento, o `tsx` atua recarregando o backend sempre que alterações nos arquivos são detectadas (modo watch). Sempre que o servidor reiniciar, todas as conexões SSE ativas do MCP serão derrubadas. 
  - *Mitigação:* Os agentes clientes do MCP no portal devem ter mecanismos robustos de reconexão automática (`auto-reconnect`) ao detectar a queda da stream SSE.
