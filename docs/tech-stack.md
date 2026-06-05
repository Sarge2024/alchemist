# Alchemist - Tech Stack

Este documento detalha o stack tecnológico atual do projeto Alchemist (Alquimia do Prato), estruturado com base nas regras do projeto e nas dependências definidas.

## 🏗️ Arquitetura Geral
- **SPA (Single Page Application)** construída com React Router v7.
- Servida por um backend **Express (Node.js)**.
- **Desenvolvimento:** Vite em modo middleware via `tsx server.ts`.
- **Produção:** Arquivos estáticos (`dist/`) com fallback SPA.

## 💻 Frontend (Interface de Usuário)
- **Framework Principal:** React 19
- **Roteamento:** React Router DOM v7
- **Estilização:** Tailwind CSS v4 (usando diretiva `@theme` e `@import "tailwindcss"`)
- **Animações:** Motion (Framer Motion standalone)
- **Ícones:** Lucide React
- **Gráficos e Visualização:** Chart.js com `react-chartjs-2`
- **Geração de PDF:** `html2pdf.js`
- **Manipulação de Datas:** `date-fns`

## ⚙️ Backend e Serviços
- **Servidor Web:** Express
- **ORM / Banco de Dados Relacional:** Prisma ORM com PostgreSQL (`pg`, `@prisma/adapter-pg`)
- **Armazenamento de Dados:** 
  - Firebase Firestore (coleções principais: `recipes` e `users`)
  - Supabase (via `@supabase/supabase-js`)
- **Autenticação:** Firebase Auth (Google Sign-In com `browserPopupRedirectResolver`)
- **Upload de Arquivos:** Multer para processamento local e `@vercel/blob` (migração para Vercel Blob).
- **Tarefas Agendadas:** `node-cron`

## 🤖 Inteligência Artificial e Extração de Dados
- **Integração LLM:** Google Gemini (`@google/genai`, modelo `gemini-3-flash-preview`)
- **Scraping Avançado:** Firecrawl (`@mendable/firecrawl-js`)
- **Fallback de Scraping:** Fetch + JSDOM (`jsdom`)

## 🛠️ Ferramentas de Desenvolvimento e Build
- **Linguagem:** TypeScript (v5.8)
- **Bundler / Ferramenta de Build:** Vite v6 (com `@vitejs/plugin-react` e `vite-plugin-pwa` para PWA)
- **Runner TypeScript:** `tsx`
- **Testes:** Vitest (`@testing-library/react`, `@testing-library/jest-dom`)
- **Emuladores:** Firebase Tools (Firebase Emulators)

## 📌 Observações Adicionais
- **Linting:** Apenas checagem de tipos em tempo de build (`tsc --noEmit`), sem linter de runtime configurado.
- **HMR:** Desativado via `DISABLE_HMR=true` por decisões de arquitetura de ambiente.
- **Ambiente:** As variáveis de ambiente devem ser configuradas no arquivo `.env` (ex: `GEMINI_API_KEY`, `FIRECRAWL_API_KEY`, etc).
