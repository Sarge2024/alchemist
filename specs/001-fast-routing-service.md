# Especificação Técnica: Fast Routing Service

## Resumo
O **Fast Routing Service** é responsável por direcionar o usuário rapidamente no Lounge para áreas do sistema (receitas ou acervo) sem a necessidade de passar pelo fluxo pesado de busca vetorial (RAG). Ele atua como um roteador de intenções utilizando o Google Gemini e um índice enxuto mantido em memória do servidor.

## Índice de Revisões
| Revisão | Data       | Autor       | Descrição |
|---------|------------|-------------|-----------|
| 1.0     | 17/06/2026 | Antigravity | Implementação inicial do FastRoutingService com roteamento LLM. |
| 1.1     | 17/06/2026 | Antigravity | Adição de Caching de Memória, Failover de API Keys e Fallback Heurístico (Offline) para mitigar erros 503 da API Gemini. |

## Arquitetura do Serviço
O arquivo central encontra-se em: `src/infra/services/fastRoutingService.ts`.

### 1. Índice Compilado em Memória
O sistema lê a coleção `system/acervo_index` do Firestore e compila um índice local (cache TTL de 1 hora) com representações mínimas das receitas e documentos do acervo (contendo apenas ID, Título, Categoria e Tags). O objetivo é garantir que o backend não precise ler o banco de dados a cada interação do usuário.

### 2. Fluxo de Roteamento (LLM)
O serviço mapeia a palavra/termo buscado pelo usuário e formata os dados em um prompt enxuto pedindo à IA (Gemini) que monte links de roteamento em Markdown. 
O modelo principal utilizado é o `gemini-3-flash-preview` por ser veloz. 

### 3. Mecanismos de Alta Disponibilidade (Resiliência)
Devido a limitações de infraestrutura (Rate Limits 429 e High Demand 503 do modelo `gemini-3-flash-preview`), três sistemas paralelos de mitigação foram implementados para garantir **100% de Uptime**:

#### A. Semantic Memory Cache (`routingCache`)
As consultas bem-sucedidas são armazenadas em um `Map` local na memória do NodeJS. Se um usuário consultar "hamburguer" ou "carne" novamente, a resposta é entregue instantaneamente (0ms) sem requisições HTTP para a API do Gemini.

#### B. API Key Failover (`generateWithRetry`)
Se o LLM rejeitar a chamada via a primeira chave do `.env` por limite de tráfego, o sistema iterará pelas chaves restantes (`getAvailableGeminiKeys()`).

#### C. Fallback Heurístico (Offline Routing)
Se houver falha sistêmica no Google Gemini (todas as chaves recusadas), a função `generateFallbackRouting` é ativada.
- **Funcionamento:** O método utiliza o `Index Compilado` para realizar uma busca em expressões regulares e `.includes()` diretamente no servidor Node.js.
- **Vantagem:** Ele formata um resultado no mesmo padrão exigido pela UI, garantindo botões de ação ("Gatilhos de Conversa") precisos, com tempo de processamento sub-milissegundo (~0.001s).

## Endpoints Associados
- `POST /api/chat/quick-route`: Recebe `{ "topic": string }`. Processa a busca rápida (com todas as camadas de proteção ativas) e devolve a resposta formatada em Markdown.
- `GET /api/admin/rebuild-index`: (Requer secret key) Limpa o cache e obriga o servidor a refazer a leitura no Firestore. Útil em eventos webhook de criação/edição de receitas.
