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
- **Cloud e IA:** Google Gemini API (`gemini-3-flash-preview` / `gemini-1.5-flash`), Firebase Auth, Firebase Storage.

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
Login exclusivo via Firebase Google Sign-In usando `browserPopupRedirectResolver`. O módulo de "Lounge Presence" utiliza indicadores estilo semáforo, monitorados por *heartbeats* regulares do cliente para o Firestore. Na saída (logout ou encerramento), funções de cleanup previnem conexões zumbis (isOnline: false).

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
Um chat flutuante, servido via Server-Sent Events (SSE). Permite a busca semântica em todo o *Acervo Técnico* transformando receitas e regras culinárias em vetores gerenciados via `pgvector`.

### 5.5 Fast Routing (Lounge)
Para contornar o peso da busca vetorial, o painel do Lounge consome um **Índice Compilado em Memória**. Este módulo (detalhado nos documentos indexados) entrega sugestões instantâneas utilizando failover multichaves e fallbacks heurísticos independentes da API da LLM.

## 6. Padrões de Código
- Padrão **Clean Code**: Funções curtas, variáveis explícitas e em inglês.
- O idioma obrigatório da UI, enums, tipos no Firestore e *prompts* de IA é **Português (pt-BR)**.
- Componentes não usam classes utilitárias isoladas excessivamente e respeitam os tokens e design moderno implementados no Tailwind v4.

---

## Índice de Especificações Técnicas (Módulos Detalhados)
Abaixo estão os guias detalhados salvos na pasta `specs/` que expandem a documentação técnica de partes específicas do projeto:

- 📄 [001 - Especificação: Fast Routing Service](001-fast-routing-service.md)

*(Novas implementações complexas deverão ser documentadas nesta pasta e referenciadas no índice acima).*
