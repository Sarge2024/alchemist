# Alquimia do Prato — Agent Guide

## Stack

React 19 + TypeScript + Vite 6 + Tailwind CSS v4 + Express + Firebase Firestore/Auth + Google Gemini.

## Commands

| Command | Action |
|---|---|
| `npm run dev` | Start dev server (Express + Vite middleware via `tsx server.ts`) |
| `npm run build` | `rm -rf dist && vite build` |
| `npm run lint` | `tsc --noEmit` (type-check only — no runtime linter) |
| `npm run start` | `node server.ts` (production) |

No test framework is configured.

## Env

Copy `.env` (committed with dev keys), not `.env.local` as README says. Required vars: `GEMINI_API_KEY`, `FIRECRAWL_API_KEY`, `APP_API_KEY`, `VITE_APP_API_KEY`.

## Architecture

- SPA (React Router v7) served by an Express backend.
- Dev: Vite in middleware mode (`server.ts` line 202-207). Prod: static `dist/` with SPA fallback.
- Entry: `src/main.tsx` → `src/App.tsx`.
- Auth: Firebase Google Sign-In with `browserPopupRedirectResolver`.
- Admin email hardcoded: `sagacitas.sistemas@gmail.com`.
- Path alias `@/*` → project root (not `src/`).

## Firestore

- Collections: `recipes` (public read, verified-auth write) and `users` (auth read, owner write).
- `firestore.rules` are strict: `email_verified` required, specific admin email, field-level update constraints.
- Recipes require `rating` (default 4.5) and `reviewsCount` (0) on create.
- `createdAt`/`updatedAt` use `serverTimestamp()` — never pass client timestamps.
- `deepSanitize()` strips `undefined` before Firestore writes.

## Recipe Scraping Flow

1. POST `/api/fetch-html` → tries Firecrawl → falls back to `fetch` + JSDOM → returns cleaned HTML + metadata.
2. Client passes result to Gemini (`gemini-3-flash-preview`) for structured JSON extraction.
3. If Firecrawl unavailable and fetch fails (403, etc.), Gemini falls back to Google Search grounding using the URL alone.
4. Image search fallback: if extracted options < 2, Gemini search grounding enriches them.

## API Endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `POST /api/upload` | `x-api-key` header | Image upload (multer, 5MB, images only → `public/uploads/`) |
| `POST /api/fetch-html` | `x-api-key` header | Proxy + scrape recipe pages |

API key check is bypassed in dev when `APP_API_KEY` is not a placeholder.

## CSS / Styling

- Tailwind v4 style: `@import "tailwindcss"` + `@theme` directive (no `tailwind.config.js`).
- `motion` library (standalone Framer Motion).
- `lucide-react` for icons.
- `getAssetUrl()` helper normalizes image paths (supports http, blob, data, `/uploads/`, bare filename patterns).

## Lounge Presence System

- Presence is tracked in real-time in the Lounge using Firestore heartbeat indicators.
- When a user logs in, `isOnline: true` and a `lastSeen` timestamp are written to Firestore (`users` collection).
- A heartbeat interval regularly updates `lastSeen` while the Lounge is active.
- Cleanup triggers reset `isOnline: false` on logout, session end, or page unload to prevent "zombie" users.
- Status indicator colors ("semáforos") represent presence: active (online), recently active (away), inactive (offline).

## Gamification & Progression Engine

- Scale of 5 levels: 1-Aprendiz, 2-Assistente, 3-Alquimista, 4-Perito, 5-Mestre Alquimista.
- Profile gamification tracks 9 user interaction types matching the **Interaction Matrix for Seal Achievement** (Selo Bronze, Prata, Ouro).
- Progress targets scale dynamically: target counts for each interaction are multiplied by the user's level ID (e.g., base count * level ID).
- Submitting an event (`POST /api/gamification/event`) triggers backend recalculation.
- XP thresholds transition users to the next level. Surplus XP/credits exceeding the `meta_nivel` minimum are carried over into the new level.
- Lockout guidance: profile rendering displays a **Dicas** (Tips) action trigger when an interaction is uninitiated (count is 0), pointing the user to lounge, profile edit, recipe sharing, or explore pages.
- User profile shows cumulative progress and seal tiers directly inside level-based cards. Redundant progress panels under the Certificado grid must remain removed.

## Admin Analytics Dashboard

- The admin panel includes a consolidated analytics tab fetched via `/api/admin/analytics`.
- Displays global indicators: active users, total recipes, lounge statistics, and level distribution.
- Integrates data aggregates across PostgreSQL (Prisma interaction event count totals) and Firebase Firestore.
- Graceful Quota Fallback: Firestore `RESOURCE_EXHAUSTED` (quota exceeded) errors are caught inside the API, defaulting chat-dependent stats to empty arrays/zeros, while keeping the Postgres-dependent metrics (users, levels, recipes) functional.

## Model Context Protocol (MCP) & RAG

- The backend serves an MCP Server over Server-Sent Events (SSE).
- Floating persistent copilot chatbot allows global user queries from any view.
- Uses pgvector (PostgreSQL) and Google Gemini Embeddings to enable retrieval augmented generation (RAG) across the culinary technical base (Acervo Técnico).

## UI / Locale

- All UI text in **Portuguese (pt-BR)**.
- Recipe categories, difficulty, diet types, etc. are Portuguese enums (see `firebase-blueprint.json` for full enum lists).

## Gotchas

- HMR disabled via `DISABLE_HMR=true` env var — file watching is intentionally off.
- No postcss config needed (Tailwind v4 Vite plugin handles it).
- `tsconfig.json` has `noEmit: true`; Vite does the actual bundling.
- `.gitignore` excludes `public/uploads/` (user-uploaded images).
- Changes to server-side code (Express endpoints) require a manual process restart as file watching is disabled.
