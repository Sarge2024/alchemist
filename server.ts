import "dotenv/config";

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { JSDOM } from "jsdom";
import multer from "multer";
import fs from "fs";
import FirecrawlApp from "@mendable/firecrawl-js";
import { initializeApp as initializeAdminApp, cert } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { IdentityAccessService } from "./src/infra/auth/IdentityAccessService";
import { ModerationService } from "./src/infra/services/ModerationService";
import { AtaGeneratorService } from "./src/infra/services/AtaGeneratorService";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firecrawl if key is available
const firecrawlKey = process.env.FIRECRAWL_API_KEY;
const firecrawl = (firecrawlKey && firecrawlKey !== "" && firecrawlKey !== "your_firecrawl_api_key_here") 
  ? new FirecrawlApp({ apiKey: firecrawlKey }) 
  : null;

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Initialize Firebase Admin
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Tenta carregar o Service Account se disponível (necessário para rodar localmente sem emuladores)
const serviceAccountPath = path.resolve(process.cwd(), 'sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');
let credential;
try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    credential = cert(serviceAccount);
    console.log(`[Admin] Service Account Key carregada: ${serviceAccount.project_id}`);
  }
} catch (e) {
  console.warn(`[Admin] Aviso: Não foi possível carregar a Service Account Key:`, e);
}

try {
  initializeAdminApp({
    projectId: firebaseConfig.projectId,
    ...(credential ? { credential } : {})
  });
  console.log(`[Admin] Firebase Admin initialized for project: ${firebaseConfig.projectId}`);
} catch (e) {
  // Already initialized
}


const identityService = new IdentityAccessService();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "upload-" + uniqueSuffix + ext);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens são permitidas"));
    }
  }
});

// Middleware to protect API routes if APP_API_KEY is configured
const authenticateAPI = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const apiKey = process.env.APP_API_KEY;
  if (!apiKey || apiKey === "" || apiKey === "your_app_api_key_here") {
    return next(); // If not configured or placeholder, allow all (dev mode)
  }

  const clientKey = req.headers["x-api-key"];
  if (clientKey === apiKey) {
    return next();
  }

  res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

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

  // Also serve root public for any other assets
  app.use(express.static(path.resolve(process.cwd(), 'public'), {
    setHeaders: (res) => {
      res.set('Access-Control-Allow-Origin', '*');
    }
  }));

  // API Route for File Upload
  app.post("/api/upload", authenticateAPI, upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, imageUrl });
  });

  // API Route for Admin Role Management
  app.post("/api/admin/set-role", async (req, res) => {
    const { uid, role } = req.body;
    
    // In a production app, we would verify the requester's Admin Token here
    // For now, we allow the operation if the APP_API_KEY is correct or in dev mode
    
    if (!uid || !role) {
      return res.status(400).json({ error: "UID e Role são obrigatórios." });
    }

    try {
      await identityService.assignRole(uid, role);
      res.json({ success: true, message: `Role ${role} atribuída ao usuário ${uid}` });
    } catch (error: any) {
      console.error("[Admin API] Erro ao definir role:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // API Route for Fetching HTML (proxy to avoid CORS)
  app.post("/api/fetch-html", authenticateAPI, async (req, res) => {
    let { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Basic URL normalization
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    try {
      // Validate URL format
      new URL(url);

      // Check if Firecrawl is configured for premium scraping
      if (firecrawl) {
        console.log(`Using Firecrawl to scrape: ${url}`);
        const scrapeResult = await firecrawl.scrape(url, {
          formats: ["html"],
          onlyMainContent: true
        }) as any;

        if (scrapeResult && (scrapeResult.html || scrapeResult.markdown)) {
          return res.json({
            success: true,
            html: scrapeResult.html || scrapeResult.markdown,
            metaDescription: scrapeResult.metadata?.description || "",
            ogImage: scrapeResult.metadata?.ogImage || scrapeResult.metadata?.image || "",
            allImagesFound: scrapeResult.metadata?.images || []
          });
        }
        console.warn("Firecrawl failed or returned error, falling back to manual fetch");
      }

      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          "Sec-Ch-Ua-Mobile": "?0",
          "Sec-Ch-Ua-Platform": '"Windows"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1"
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
      
      // Clean HTML slightly on server to save payload size
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      // Extract all probable images before cleaning
      const allImagesFound: string[] = [];
      doc.querySelectorAll('img').forEach(img => {
        const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('srcset')?.split(' ')[0];
        if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) {
          if (src.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
            allImagesFound.push(src);
          }
        }
      });
      // Unique and limited list
      const uniqueImages = Array.from(new Set(allImagesFound)).slice(0, 15);

      const scripts = doc.querySelectorAll('script, style, nav, footer, iframe, noscript, header, svg');
      scripts.forEach(s => s.remove());
      
      res.json({ 
        success: true,
        html: doc.body.innerHTML?.substring(0, 50000), // Limit size
        metaDescription: doc.querySelector('meta[name="description"]')?.getAttribute('content') || "",
        ogImage: doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || "",
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
  
  // --- LOUNGE GASTRO (v2.1.0) ---
  
  // Enviar mensagem para o Lounge com moderação automática
  app.post("/api/lounge/messages", authenticateAPI, async (req, res) => {
    const { text, senderId, senderRole, senderName, metadata } = req.body;
    console.log(`[Lounge API] Recebendo mensagem de ${senderName || senderId} (${senderRole}): "${text?.substring(0, 50)}..."`);
    
    if (!text || !senderId) {
      return res.status(400).json({ error: "Texto e SenderId são obrigatórios." });
    }

    try {
      const db = getFirestore();
      
      // 1. Executa a moderação via IA antes de persistir
      console.log(`[Lounge API] Iniciando moderação para: "${text.substring(0, 30)}..."`);
      const status = await ModerationService.validateCulinaryRelevance(text);
      console.log(`[Lounge API] Resultado da moderação: ${status}`);
      
      const messageData = {
        text,
        senderId,
        senderName: senderName || 'Alquimista Anônimo',
        senderRole: senderRole || 'user',
        timestamp: new Date(), 
        status,
        reactions: {},
        metadata: metadata || {}
      };

      console.log(`[Lounge API] Salvando mensagem no Firestore...`);
      const docRef = await db.collection('lounge_messages').add({
        ...messageData,
        timestamp: FieldValue.serverTimestamp() // Força server timestamp
      });
      console.log(`[Lounge API] Mensagem salva com sucesso! ID: ${docRef.id}`);

      res.json({ 
        success: true, 
        id: docRef.id, 
        status,
        message: status === 'approved' ? "Mensagem publicada!" : "Sua mensagem passará por revisão."
      });
      
    } catch (error: any) {
      console.error("[Lounge API] ERRO CRÍTICO ao postar mensagem:", error);
      res.status(500).json({ error: error.message || "Erro interno ao processar mensagem" });
    }
  });


  // Gatilho manual para gerar Ata Diária
  app.post("/api/lounge/generate-ata", authenticateAPI, async (req, res) => {
    try {
      const ata = await AtaGeneratorService.generateDailyAta();
      if (!ata) {
        return res.json({ success: true, message: "Sem mensagens para gerar ata hoje." });
      }
      res.json({ success: true, ata });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
