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

## UI / Locale

- All UI text in **Portuguese (pt-BR)**.
- Recipe categories, difficulty, diet types, etc. are Portuguese enums (see `firebase-blueprint.json` for full enum lists).

## Gotchas

- HMR disabled via `DISABLE_HMR=true` env var — file watching is intentionally off.
- No postcss config needed (Tailwind v4 Vite plugin handles it).
- `tsconfig.json` has `noEmit: true`; Vite does the actual bundling.
- `.gitignore` excludes `public/uploads/` (user-uploaded images).
