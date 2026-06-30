# Especificação Mestre do Projeto: Alquimia do Prato

Este documento atua como o ponto central de referência para a arquitetura, stack e módulos do projeto **Alquimia do Prato**. Ele deve ser consultado e atualizado sempre que novas funcionalidades estruturais forem adicionadas para garantir alinhamento entre as instâncias de IA e desenvolvedores.

## 1. Visão Geral
O Alquimia do Prato é uma plataforma culinária inteligente, oferecendo um Acervo Técnico, compartilhamento e visualização de Receitas, gamificação avançada e assistência orientada por Inteligência Artificial (Copilot persistente) baseada na arquitetura Model Context Protocol (MCP) e Recuperação Aumentada de Geração (RAG).

## 2. Stack Tecnológico Principal
- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4 (sem postcss, uso de `@theme`), React Router v7.
- **Animações e UI:** standalone Framer Motion (`motion`), `lucide-react`.
- **Backend:** Express (Node.js) operando na porta padrão.
- **Bancos de Dados:**
  - **Firebase Firestore:** Dados de usuários, receitas, presence (online/offline), controle de estado de tempo real.
  - **PostgreSQL (pgvector):** Banco vetorial para embeddings e estatísticas de gamificação via Prisma.
- **Cloud e IA:** Google Gemini API (`gemini-3-flash-preview` / `gemini-1.5-flash`), Supabase Auth (Autenticação Principal), Firebase Auth (Fallback), Firebase Storage.

## 3. Arquitetura do Sistema
O projeto é construído como uma Single Page Application (SPA) servida através do backend Express.

- **Modo Desenvolvimento:** O Vite roda em middleware integrado no Express (`tsx server.ts`), desativando o HMR explicitamente (`DISABLE_HMR=true`). Mudanças no backend requerem reinicialização do processo.
- **Modo Produção:** Entrega estática da pasta `dist/` com roteamento de fallback para a SPA.
- **Contexto Global:** Aliasing `@/*` é mapeado diretamente para a raiz do projeto.

## 4. Estruturas de Dados (Firestore)
- **`users`**: Registra dados do usuário, gamificação (nível, pontuação XP baseada em meta_nivel) e presença (Lounge heartbeat via `isOnline` e `lastSeen`). Apenas o próprio dono pode escrever.
- **`recipes`**: Cadastro de receitas extraídas ou inseridas manualmente. Requer validação no lado do servidor (`deepSanitize` limpando valores undefined) e `serverTimestamp()`. Escrita apenas para usuários com email verificado. Exige campos `rating` e `reviewsCount`.
- **Regras de Segurança:** Regras rigorosas configuradas. Somente administradores (email *sagacitas.sistemas@gmail.com*) possuem overrides totais.

## 5. Módulos Core
### 5.1 Autenticação e Presença
Transicionado para login principal via Supabase Auth (com fallback retroativo para Firebase Auth) usando Google Sign-In. O módulo de "Lounge Presence" utiliza indicadores estilo semáforo, monitorados por *heartbeats* regulares do cliente para o Firestore. Na saída (logout ou encerramento), funções de cleanup previnem conexões zumbis (isOnline: false). O backend possui um middleware de autenticação híbrido (`firebaseAuthMiddleware.ts`) que decodifica tokens Supabase ou Firebase sequencialmente.

### 5.2 Scraping Engine
Uma rota de API (`POST /api/fetch-html`) baseada em proxy que extrai receitas de URLs:
1. Tenta Firecrawl.
2. Faz fallback de `fetch` padrão + JSDOM.
3. Repassa HTML para a LLM Gemini extrair como JSON Estruturado.
4. Faz Grounding no Google Search em caso de bloqueio.

### 5.3 Gamificação e Progressão
Escala baseada em 5 níveis (Aprendiz a Mestre Alquimista). Utiliza a **Matriz de Interação de Selos** (Bronze, Prata e Ouro).
A progressão recalcula as metas dinamicamente multiplicando o valor base pelo Nível atual. Excedentes de XP progridem perfeitamente para o próximo nível. O backend calcula e submete eventos (`/api/gamification/event`).

### 5.4 MCP (Model Context Protocol) e RAG
O portal conta com o **Chef IA**, um copilot persistente e flutuante acessível globalmente. O backend Express atua como Host servindo o protocolo via Server-Sent Events (SSE) e integrando buscas semânticas vetoriais (`pgvector` e Google Gemini Embeddings) no banco PostgreSQL.
- **Interação Psicológica e Cognitiva:** Utiliza as heurísticas de **Efeito ELIZA** (para espelhamento emocional e validação de dores culinárias do usuário), **Injeção Cognitiva** (explicação técnica e científica curta de ingredientes/processos) e **Comportamento Socrático** para refinamento interativo antes de propor as receitas.
- **Saudação e Naturalidade (Fase 0):** A interface utiliza `localStorage` (`alquimia_chef_last_interaction`) para controlar o tempo desde a última interação e apresentar saudações personalizadas na UI ao invés de repetições textuais pelo LLM, criando conversas orgânicas e diretas após a primeira mensagem.
- **Ferramentas MCP (Tools):** Expõe as ferramentas `get_user_culinary_profile`, `update_user_culinary_profile` (gravação de dores e motivações) e `trigger_gamification_event` (disparo de eventos de progresso, incluindo o acerto de mini-desafios cognitivos via evento `QUIZ_ANSWERED_CORRECTLY` que adiciona 5 XP).
- **Tratamento Conversacional de Fallback:** Termos culinários não encontrados ou muito amplos (ex: "carnes") não acionam recusas rígidas. O Chef IA acolhe o interesse, explica o conceito de forma teórica e devolve uma pergunta guia instigando o usuário a explorar subcategorias e receitas disponíveis. A busca vazia gera internamente a tag `[PENDÊNCIA_ANOTADA]` que é gravada na tabela `unansweredQuery` no Postgres para auditoria administrativa de conteúdo ausente, sendo removida antes da exibição ao usuário.

### 5.5 Fast Routing (Lounge)
Para contornar o peso da busca vetorial, o painel do Lounge consome um **Índice Compilado em Memória**. Este módulo (detalhado nos documentos indexados) entrega sugestões instantâneas utilizando failover multichaves e fallbacks heurísticos independentes da API da LLM.

### 5.6 Mapeamento de Payload e Reparação de Portas
- **Sincronização de Campos:** O backend padroniza a resposta JSON das receitas mapeando a técnica culinária (`tipo_prato`) para o campo `category`. O frontend resolve isso na camada de serviço (`recipeService.ts`), mapeando os valores de volta para garantir funcionamento consistente nas páginas de Categoria e Exploração.
- **Utilitário de Recuperação:** O comando `npm run dev:repair` atua como salvaguarda local, liberando as portas ocupadas e matando processos órfãos que impedem o reinício do servidor de desenvolvimento.

## 6. Padrões de Código
- Padrão **Clean Code**: Funções curtas, variáveis explícitas e em inglês.
- O idioma obrigatório da UI, enums, tipos no Firestore e *prompts* de IA é **Português (pt-BR)**.
- Componentes não usam classes utilitárias isoladas excessivamente e respeitam os tokens e design moderno implementados no Tailwind v4.
- **Mobile-First e Responsividade:** O projeto aplica breakpoints adaptativos (especialmente `md:`), provendo em telas menores listas com densidade compacta de 2 colunas e cartões verticais proporção `aspect-[4/5]`, escalando para grid expandido em desktop.

---

## Índice de Especificações Técnicas (Módulos Detalhados)
Abaixo estão os guias detalhados salvos na pasta `specs/` que expandem a documentação técnica de partes específicas do projeto:

- 📄 [001 - Especificação: Fast Routing Service](001-fast-routing-service.md)
- 📄 [002 - Especificação: API Pública de Receitas (Conexão Receitas DB)](002-api-recipes-specification.md)

*(Novas implementações complexas deverão ser documentadas nesta pasta e referenciadas no índice acima).*
