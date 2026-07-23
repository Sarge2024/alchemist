import "dotenv/config";

import express from "express";
import { downloadAndSaveImage } from "./src/infra/utils/imageUtils";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import multer from "multer";
import fs from "fs";
import FirecrawlApp from "@mendable/firecrawl-js";
import { initializeApp as initializeAdminApp, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { IdentityAccessService } from "./src/infra/auth/IdentityAccessService";
import { ModerationService } from "./src/infra/services/ModerationService";
import { AtaGeneratorService } from "./src/infra/services/AtaGeneratorService";
import { GamificationService } from "./src/infra/services/GamificationService";
import { geminiService } from "./src/infra/services/geminiService";
import { getAvailableGeminiKeys } from "./src/infra/services/geminiKeyManager";
import { FastRoutingService } from "./src/infra/services/fastRoutingService";
import { put } from "@vercel/blob";
import cron from "node-cron";
import { registerMcpRoutes } from "./src/infra/mcp/mcpServer";
import { dishAlchemistsRouter } from "./src/infra/api/dishAlchemistsRouter";
import { publicRecipesRouter } from "./src/infra/api/publicRecipesRouter";
import { managerRouter } from "./src/infra/api/managerRouter";
import { productsRouter } from "./src/infra/api/productsRouter";
import { apiKeysRouter } from "./src/infra/api/apiKeysRouter";
import { adminIngredientsRouter } from './src/infra/api/adminIngredientsRouter';
import { publicIngredientsRouter } from './src/infra/api/publicIngredientsRouter';
import { RagBackendService } from "./src/infra/services/ragBackendService";
import { prisma } from "./src/infra/prisma/client";

// Removed __filename and __dirname to prevent import.meta.url SyntaxError

// Initialize Firecrawl if key is available
const firecrawlKey = process.env.FIRECRAWL_API_KEY;
const firecrawl = (firecrawlKey && firecrawlKey !== "" && firecrawlKey !== "your_firecrawl_api_key_here") 
  ? new FirecrawlApp({ apiKey: firecrawlKey }) 
  : null;

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (process.env.VERCEL !== "1") {
  if (!fs.existsSync(uploadDir)) {
    try {
      fs.mkdirSync(uploadDir, { recursive: true });
    } catch (e) {
      console.warn("Could not create uploads directory:", e);
    }
  }
}

// Initialize Firebase Admin
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } else {
    console.warn(`[Admin] Aviso: Config file não encontrado em ${configPath}. Firebase Admin pode falhar.`);
  }
} catch (e) {
  console.warn(`[Admin] Erro lendo firebase-applet-config.json:`, e);
}

const serviceAccountPath = path.resolve(process.cwd(), 'sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');
let credential;

if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
  try {
    const cleanBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64.replace(/\s+/g, '');
    const decoded = Buffer.from(cleanBase64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(decoded);
    credential = cert(serviceAccount);
    console.log(`[Admin] Service Account carregada via variável de ambiente BASE64 (Vercel).`);
  } catch (e) {
    console.warn(`[Admin] Erro ao fazer parse da FIREBASE_SERVICE_ACCOUNT_BASE64:`, e);
  }
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = cert(serviceAccount);
    console.log(`[Admin] Service Account carregada via variável de ambiente (Vercel).`);
  } catch (e) {
    console.warn(`[Admin] Erro ao fazer parse da FIREBASE_SERVICE_ACCOUNT:`, e);
  }
} else {
  try {
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      credential = cert(serviceAccount);
      console.log(`[Admin] Service Account Key carregada: ${serviceAccount.project_id}`);
    }
  } catch (e) {
    console.warn(`[Admin] Aviso: Não foi possível carregar a Service Account Key local:`, e);
  }
}

try {
  initializeAdminApp({
    projectId: firebaseConfig.projectId || "sagacitas-financeiro",
    storageBucket: "sagacitas-financeiro.appspot.com",
    ...(credential ? { credential } : {})
  });
  console.log(`[Admin] Firebase Admin initialized for project: ${firebaseConfig.projectId || "sagacitas-financeiro"}`);
  console.log(`[Admin] Storage Bucket padrão: ${getStorage().bucket().name}`);
} catch (e) {
  // Already initialized
}


const identityService = new IdentityAccessService();

const storage = multer.memoryStorage();




import adminRouter from './src/infra/api/adminRouter';
import loungeRouter from './src/infra/api/loungeRouter';
import chatRouter from './src/infra/api/chatRouter';
import gamificationRouter from './src/infra/api/gamificationRouter';
import { authenticateAPI } from './src/infra/middlewares/authenticateAPI';
import { upload } from './src/infra/middlewares/uploadMiddleware';

const app = express();

app.use('/api/admin', adminRouter);
app.use('/api/lounge', loungeRouter);
app.use('/api/chat', chatRouter);
app.use('/api/gamification', gamificationRouter);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 11000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
app.use(express.json());
registerMcpRoutes(app);

// Monta rotas de Receitas e Ingredientes (internas, com Firebase Auth)
app.use('/api', dishAlchemistsRouter);
app.use('/api', apiKeysRouter);
app.use('/api', adminIngredientsRouter);

// Monta API pública v1 (inter-app, com API Key auth)
app.use('/api/v1/public', publicRecipesRouter);
app.use('/api/v1/public', publicIngredientsRouter);

// Monta API B2B do Alchymist Manager v1
app.use('/api/v1/manager', managerRouter);

// Monta API de Produtos Industrializados (barcode + Open Food Facts)
app.use('/api/v1/products', productsRouter);

// Endpoint to update presence in Firestore (called from frontend AuthContext)
app.post("/api/presence", async (req, res) => {
  try {
    const { uid, isOnline, displayName, email, photoURL } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "uid is required" });
    }
    
    const db = getFirestore();
    await db.collection("users").doc(uid).set({
      isOnline,
      lastSeen: FieldValue.serverTimestamp(),
      ...(displayName && { displayName }),
      ...(email && { email }),
      ...(photoURL && { photoURL })
    }, { merge: true });
    
    res.json({ success: true });
  } catch (error) {
    console.error("[Presence API] Error updating presence:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Serve static files from public/uploads
const uploadsPath = path.resolve(process.cwd(), 'public', 'uploads');
console.log(`Configuring static serving for /uploads from: ${uploadsPath}`);
app.use('/uploads', express.static(uploadsPath, {
  fallthrough: true,
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=3600');
  }
}));

// Serve static files from docs/acervo (Library resources)
app.use('/docs/acervo', express.static(path.resolve(process.cwd(), 'docs', 'acervo'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// Also serve root public for any other assets
app.use(express.static(path.resolve(process.cwd(), 'public'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// API Route for File Upload
app.post("/api/upload", authenticateAPI, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      console.error("[Upload] Multer error:", err);
      return res.status(400).json({ error: "Erro no upload do arquivo: " + err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    try {
      // Determine a content type for the blob
      const contentType = req.file.mimetype || 'image/jpeg';
      
      // Upload to Vercel Blob
      const blob = await put(req.file.originalname, req.file.buffer, {
        access: 'public',
        contentType: contentType,
        addRandomSuffix: true,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });

      console.log(`[Upload] File uploaded to Vercel Blob: ${blob.url}`);
      res.json({ success: true, imageUrl: blob.url });
    } catch (error: any) {
      console.error("[Upload] Error uploading to Vercel Blob:", error);
      res.status(500).json({ error: "Falha no upload para o Vercel Blob: " + error.message });
    }
  });
});

// API Route for Checking Gemini API Keys Status


/**
 * Endpoint de Migração: Converte imagens de receitas (URLs externas -> locais)
 */


/**
 * Endpoint de Administração: Sincroniza manualmente receitas no banco de dados vetorial para RAG
 */


// API Route for Admin Role Management



// API Route for Fetching HTML (proxy to avoid CORS)
app.post("/api/fetch-html", authenticateAPI, async (req, res) => {
  let { url, autoDownloadImage } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    const parsedBaseUrl = new URL(url);
    if (firecrawl) {
      console.log(`Using Firecrawl to scrape: ${url}`);
      const scrapeResult = await firecrawl.scrape(url, {
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000
      }) as any;

      if (scrapeResult && (scrapeResult.html || scrapeResult.markdown)) {
        return res.json({
          success: true,
          html: (scrapeResult.markdown || scrapeResult.html || "").substring(0, 50000),
          metaDescription: scrapeResult.metadata?.description || "",
          ogImage: scrapeResult.metadata?.ogImage || scrapeResult.metadata?.image || "",
          allImagesFound: scrapeResult.metadata?.images || []
        });
      }
      console.warn("Firecrawl failed or returned error, falling back to manual fetch");
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Referer": "https://www.google.com/"
      }
    });
    
    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status} for URL: ${url}`);
      return res.json({ 
        success: false, 
        status: response.status,
        error: response.status === 403 ? "site_blocked" : "fetch_failed"
      });
    }
    
    const html = await response.text();
    
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const allImagesFound: string[] = [];
    doc.querySelectorAll('img').forEach(img => {
      let src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('srcset')?.split(' ')[0];
      if (src) {
        try {
          const absoluteUrl = new URL(src, parsedBaseUrl.origin).toString();
          if (absoluteUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) && !absoluteUrl.includes('logo') && !absoluteUrl.includes('icon')) {
            allImagesFound.push(absoluteUrl);
          }
        } catch (e) {}
      }
    });
    const uniqueImages = Array.from(new Set(allImagesFound)).slice(0, 15);

    const scripts = doc.querySelectorAll('script, style, nav, footer, iframe, noscript, header, svg');
    scripts.forEach(s => s.remove());
    
    const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || "";
    
    // Se solicitado, baixa a imagem principal automaticamente
    let localOgImage = ogImage;
    if (autoDownloadImage && ogImage && ogImage.startsWith('http')) {
      const downloaded = await downloadAndSaveImage(ogImage);
      if (downloaded) localOgImage = downloaded;
    }

    res.json({ 
      success: true,
      html: doc.body.innerHTML?.substring(0, 50000),
      metaDescription: doc.querySelector('meta[name="description"]')?.getAttribute('content') || "",
      ogImage: localOgImage,
      originalOgImage: ogImage,
      allImagesFound: uniqueImages
    });
  } catch (error: any) {
    console.error("Fetch HTML error:", error);
    res.json({ 
      success: false, 
      error: "Falha ao buscar o conteúdo da URL. Verifique o link e tente novamente." 
    });
  }
});

// Enviar mensagem para o Lounge com moderação automática


// Gatilho manual para gerar Ata Diária


// ───────────────────────────────────────────────────────────────
// Admin Analytics Dashboard Endpoint
// ───────────────────────────────────────────────────────────────


// Endpoint para buscar as interações de um usuário


// Endpoint para atualizar/lançar uma interação manual


// Endpoint to get the RAG Assistant Chat History


// Endpoint to ask the RAG Assistant (AI Chat)


// Endpoint Fast Routing (Sem RAG)


// Endpoint Admin para reconstruir Índice


// Endpoint to process a gamification event and assign XP


// Endpoint para retornar os avatares permitidos de acordo com o nível do usuário
app.get("/api/avatars/:uid", authenticateAPI, async (req, res) => {
  try {
    const { uid } = req.params;
    
    // 1. Busca o usuário pelo UID
    const user = await prisma.user.findUnique({
      where: { uid }
    });
    
    // 2. Busca o perfil de gamificação usando o ID interno do usuário
    const profile = user ? await prisma.userGamificationProfile.findUnique({
      where: { userId: user.id }
    }) : null;

    // Se não tiver perfil (usuário novo), assume nível 1 (apenas '1'/'APRENDIZ' liberado, com fallback legado 'ini', 'apr')
    let tiersPermitidos = ['1', 'ini', 'apr', 'APRENDIZ'];
    if (profile) {
      if (profile.nivel >= 2) {
        tiersPermitidos.push('2', 'ast', 'ASSISTENTE');
      }
      if (profile.nivel >= 3) {
        tiersPermitidos.push('3', 'alq', 'av', 'ALQUIMISTA');
      }
      if (profile.nivel >= 4) {
        tiersPermitidos.push('4', 'per', 'PERITO');
      }
      if (profile.nivel >= 5) {
        tiersPermitidos.push('5', 'mes', 'MESTRE_ALQUIMISTA');
      }
    }

    // 3. Busca os avatares do banco de dados
    const todosAvatares = await prisma.avatarOption.findMany();

    // 4. Retorna os avatares mapeando quais estão bloqueados
    const avataresTratados = todosAvatares.map(avatar => ({
      id: avatar.id,
      codigo: avatar.codigoAvatar,
      url: avatar.urlVercelBlob,
      tierMinimo: avatar.tierMinimo,
      bloqueado: !tiersPermitidos.includes(avatar.tierMinimo)
    }));

    res.json({ success: true, avatars: avataresTratados });
  } catch (error) {
    console.error("[Avatars API] Erro ao buscar avatares:", error);
    res.status(500).json({ error: "Erro interno no servidor", details: error instanceof Error ? error.message : String(error) });
  }
});

// Endpoint para buscar o Perfil de Gamificação do Usuário


// ======== ADMIN: Avatares e Selos ========

// Listar todos os Avatares


// Criar Avatar (com upload)


// Deletar Avatar


// Editar Avatar (atualizar imagem)


// Listar todos os Selos


// Criar Selo (com upload)


// Deletar Selo


// Editar Selo (atualizar imagem)


// ==========================================
// ACERVO (Library) API - PostgreSQL
// ==========================================

// Listar Acervo
app.get("/api/library", authenticateAPI, async (req, res) => {
  console.log("[API Library] GET request received");
  try {
    const items = await prisma.libraryItem.findMany({
      orderBy: { createdAt: 'desc' }
    });
    console.log(`[API Library] Returning ${items.length} items`);
    res.json(items);
  } catch (error) {
    console.error("Erro ao listar acervo:", error);
    res.status(500).json({ error: "Erro ao listar acervo" });
  }
});

// Criar Item no Acervo
app.post("/api/library", authenticateAPI, async (req, res) => {
  try {
    const { title, description, type, category, tags, url, thumbnail, author } = req.body;
    
    if (!title || !description || !type || !url) {
      return res.status(400).json({ error: "Dados incompletos para criar item no acervo." });
    }

    const newItem = await prisma.libraryItem.create({
      data: {
        title,
        description,
        type,
        category: category || '',
        tags: tags || [],
        url,
        thumbnail,
        author: author || 'Autor Desconhecido'
      }
    });

    // Sincronizar com o RAG (PostgreSQL SemanticDocument) de forma assíncrona
    RagBackendService.indexLibraryItemToRAG(newItem).catch(err => {
      console.error("[RAG] Falha ao indexar novo item do acervo:", err);
    });

    res.json({ success: true, item: newItem, id: newItem.id });
  } catch (error) {
    console.error("Erro ao criar item no acervo:", error);
    res.status(500).json({ error: "Erro ao criar item no acervo" });
  }
});

// Atualizar Item no Acervo
app.put("/api/library/:id", authenticateAPI, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, category, tags, url, thumbnail, author } = req.body;

    const updated = await prisma.libraryItem.update({
      where: { id },
      data: { title, description, type, category, tags, url, thumbnail, author }
    });

    // Sincronizar com o RAG
    RagBackendService.indexLibraryItemToRAG(updated).catch(err => {
      console.error("[RAG] Falha ao re-indexar item do acervo:", err);
    });

    res.json({ success: true, item: updated });
  } catch (error) {
    console.error("Erro ao atualizar acervo:", error);
    res.status(500).json({ error: "Erro ao atualizar item no acervo" });
  }
});

// Deletar Item no Acervo
app.delete("/api/library/:id", authenticateAPI, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.libraryItem.delete({ where: { id } });
    
    // Deletar o vetor associado
    const docId = `library-${id}`;
    await prisma.semanticDocument.deleteMany({ where: { id: docId } });

    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar acervo:", error);
    res.status(500).json({ error: "Erro ao deletar item no acervo" });
  }
});
// ==========================================
// MÓDULO: TELEMETRIA & RANKING DE USO
// ==========================================

app.post("/api/telemetry/heartbeat", authenticateAPI, async (req, res) => {
  try {
    const { uid, durationSeconds } = req.body;
    if (!uid) return res.status(400).json({ error: "uid required" });

    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) return res.status(404).json({ error: "user not found" });

    // Encontra ou cria uma sessão ativa (últimos 5 minutos)
    const activeSession = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        lastPing: { gte: new Date(Date.now() - 5 * 60 * 1000) }
      },
      orderBy: { lastPing: 'desc' }
    });

    if (activeSession) {
      await prisma.userSession.update({
        where: { id: activeSession.id },
        data: {
          lastPing: new Date(),
          durationSeconds: { increment: durationSeconds || 60 }
        }
      });
    } else {
      await prisma.userSession.create({
        data: {
          userId: user.id,
          lastPing: new Date(),
          durationSeconds: durationSeconds || 60
        }
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("[Telemetry] Heartbeat error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

app.post("/api/telemetry/pageview", authenticateAPI, async (req, res) => {
  try {
    const { uid, path } = req.body;
    if (!uid || !path) return res.status(400).json({ error: "uid and path required" });

    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) return res.status(404).json({ error: "user not found" });

    await prisma.pageAccess.create({
      data: {
        userId: user.id,
        path: path
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error("[Telemetry] Pageview error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});







async function startServer() {
  // Garantir a semeadura automática dos selos no startup
  await GamificationService.ensureBadgesSeeded();

  // Sincronizar receitas no banco de dados vetorial em background (para RAG)
  RagBackendService.syncRecipesToPostgreSQL().catch(err => {
    console.error("[Startup] Falha na sincronização de receitas para RAG:", err);
  });

  // Injeção de Meta Tags (SEO) para Receitas
  const serveRecipeHTML = async (req: express.Request, res: express.Response, next: express.NextFunction, vite?: any) => {
    try {
      const { slug, id } = req.params;
      const db = getFirestore();
      let recipeData = null;

      if (slug) {
        const snapshot = await db.collection('recipes').where('slug', '==', slug).limit(1).get();
        if (!snapshot.empty) recipeData = snapshot.docs[0].data();
      } else if (id) {
        const doc = await db.collection('recipes').doc(id).get();
        if (doc.exists) recipeData = doc.data();
      }

      let template = "";
      if (process.env.NODE_ENV !== "production" && vite) {
        template = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
      } else {
        template = fs.readFileSync(path.join(process.cwd(), 'dist', 'index.html'), 'utf-8');
      }

      if (recipeData) {
        const title = `${recipeData.title} - Alquimia do Prato`;
        const desc = recipeData.description || 'Confira esta deliciosa receita no Alquimia do Prato!';
        // Fallback to absolute URL for og:image as social scrapers require absolute URLs
        const img = recipeData.image 
          ? (recipeData.image.startsWith('http') ? recipeData.image : `https://alquimiadoprato.com${recipeData.image}`)
          : 'https://alquimiadoprato.com/pwa-icon-512.png';
        
        const metaTags = `
    <title>${title}</title>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:image" content="${img}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="description" content="${desc}" />`;
        
        template = template.replace(/<title>.*?<\/title>/, metaTags);
      }

      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      next(e);
    }
  };

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom", // Changed from "spa" so Vite doesn't auto-handle index.html for us
    });

    // Intercept recipes for SEO
    app.get(["/receita/:slug", "/recipe/:id"], (req, res, next) => serveRecipeHTML(req, res, next, vite));
    
    app.use(vite.middlewares);

    // Fallback for all other routes in dev
    app.use("*", async (req, res, next) => {
      try {
        let template = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });

  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static assets first
    app.use(express.static(distPath, { index: false })); // Disable automatic index.html serving
    
    // Intercept recipes for SEO
    app.get(["/receita/:slug", "/recipe/:id"], (req, res, next) => serveRecipeHTML(req, res, next));
    
    // Fallback for all other routes
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Only start the server automatically if not running in Vercel
if (process.env.VERCEL !== "1") {
  startServer();
  
  // Agendamento da Ata Diária: Todo dia às 23:59
  // Garante que as conversas do dia sejam consolidadas no Mural
  cron.schedule("59 23 * * *", async () => {
    console.log("[Cron] Iniciando transmutação: Gerando Ata Diária do Lounge...");
    try {
      const ata = await AtaGeneratorService.generateDailyAta();
      if (ata) {
        console.log("[Cron] Sucesso: Ata Diária gerada e persistida.");
      } else {
        console.log("[Cron] Silêncio no Lounge: Nenhuma mensagem para resumir hoje.");
      }
    } catch (error) {
      console.error("[Cron] Falha na transmutação da Ata:", error);
    }
  });

  // Agendamento RAG: Todo dia às 03:00 da manhã
  // Sincroniza mensagens do Firebase para o PostgreSQL/pgvector para busca semântica
  cron.schedule("0 3 * * *", async () => {
    console.log("[Cron] Iniciando sincronização RAG: Firebase -> PostgreSQL...");
    try {
      await RagBackendService.syncChatsToPostgreSQL();
      await RagBackendService.syncRecipesToPostgreSQL();
    } catch (error) {
      console.error("[Cron] Falha na sincronização RAG:", error);
    }
  });
}

export default app;
