import "dotenv/config";

import express from "express";
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
import { geminiService } from "./src/infra/services/geminiService";
import { getAvailableGeminiKeys } from "./src/infra/services/geminiKeyManager";
import cron from "node-cron";

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
    storageBucket: "sagacitas-financeiro.appspot.com",
    ...(credential ? { credential } : {})
  });
  console.log(`[Admin] Firebase Admin initialized for project: ${firebaseConfig.projectId}`);
  console.log(`[Admin] Storage Bucket padrão: ${getStorage().bucket().name}`);
} catch (e) {
  // Already initialized
}


const identityService = new IdentityAccessService();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.VERCEL === "1" ? "/tmp" : uploadDir);
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

/**
 * Helper function to download and save an image locally
 */
/**
 * Helper: Faz upload de arquivo local para o Firebase Storage e retorna URL pública
 */
async function uploadToStorage(localPath: string, destinationName: string): Promise<string | null> {
  try {
    const bucket = getStorage().bucket("sagacitas-financeiro.appspot.com");
    let fullLocalPath = localPath;
    
    if (localPath.startsWith('/uploads/')) {
      fullLocalPath = path.join(process.cwd(), 'public', localPath);
    } else if (!path.isAbsolute(localPath)) {
      fullLocalPath = path.join(process.cwd(), 'public', localPath);
    }
    
    if (!fs.existsSync(fullLocalPath)) {
      console.error(`[Storage] Arquivo não encontrado para upload: ${fullLocalPath}`);
      return null;
    }

    const [file] = await bucket.upload(fullLocalPath, {
      destination: `recipes/${destinationName}`,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });

    // Torna o arquivo público e gera a URL
    await file.makePublic();
    return `https://storage.googleapis.com/${bucket.name}/${file.name}`;
  } catch (error) {
    console.error("[Storage] Erro no upload:", error);
    return null;
  }
}

async function downloadAndSaveImage(url: string): Promise<string | null> {
  try {
    if (!url || !url.startsWith('http')) return null;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      }
    });

    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      console.warn(`URL does not point to a valid image: ${url}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    
    // Extract extension from content-type or URL
    let extension = contentType.split("/")[1]?.split("+")[0] || "jpg";
    if (extension === "jpeg") extension = "jpg";
    
    const filename = `downloaded-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, buffer);
    console.log(`[Image Service] Salva com sucesso: /uploads/${filename}`);
    return `/uploads/${filename}`;
  } catch (error) {
    console.error(`[Image Service] Erro ao baixar imagem de ${url}:`, error);
    return null;
  }
}

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

// API Route for Checking Gemini API Keys Status
app.post("/api/admin/check-keys", authenticateAPI, async (req, res) => {
  try {
    const keys = getAvailableGeminiKeys();
    console.log(`[Admin API] Diagnóstico: Verificando ${keys.length} chaves...`);
    
    const results = [];
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const statusResult = await geminiService.checkApiKeyStatus(key);
      results.push({
        key: `API Key #${i + 1}`,
        keyRaw: key,
        ...statusResult
      });
    }
    
    res.json({ success: true, keys: results });
  } catch (error: any) {
    console.error("[Admin API] Erro no diagnóstico:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Endpoint de Migração: Converte imagens de receitas (URLs externas -> locais)
 */
app.post("/api/admin/migrate-recipe-images", authenticateAPI, async (req, res) => {
  try {
    const db = getFirestore();
    const recipesRef = db.collection('recipes');
    const snapshot = await recipesRef.get();
    
    console.log(`[Migration] Iniciando migração e sincronização em nuvem para ${snapshot.size} receitas...`);
    
    let migratedCount = 0;
    let cloudSyncedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentImage = data.image;
      
      console.log(`[Migration] Processando: "${data.title}" | Imagem atual: "${currentImage}"`);

      if (!currentImage) {
        skippedCount++;
        continue;
      }

      // Caso 1: Ainda é uma URL externa - Baixa e sobe pra nuvem
      if (typeof currentImage === 'string' && (currentImage.startsWith('http://') || currentImage.startsWith('https://')) && !currentImage.includes('storage.googleapis.com')) {
        console.log(`[Migration] Baixando e subindo para nuvem: ${data.title}`);
        const localPath = await downloadAndSaveImage(currentImage);
        
        if (localPath) {
          const fileName = path.basename(localPath);
          const cloudUrl = await uploadToStorage(localPath, fileName);
          
          if (cloudUrl) {
            await doc.ref.update({ 
              image: cloudUrl,
              updatedAt: FieldValue.serverTimestamp()
            });
            cloudSyncedCount++;
            migratedCount++;
          } else {
            // Se falhou cloud, mantém local por segurança
            await doc.ref.update({ image: localPath });
            migratedCount++;
          }
        } else {
          errorCount++;
        }
      } 
      // Caso 2: Já é local - Sobe pra nuvem se necessário
      else if (typeof currentImage === 'string' && currentImage.startsWith('/uploads/')) {
        console.log(`[Migration] Sincronizando imagem local com nuvem: ${data.title}`);
        const fileName = path.basename(currentImage);
        const cloudUrl = await uploadToStorage(currentImage, fileName);
        
        if (cloudUrl) {
          await doc.ref.update({ 
            image: cloudUrl,
            updatedAt: FieldValue.serverTimestamp()
          });
          cloudSyncedCount++;
        } else {
          skippedCount++;
        }
      }
      else {
        skippedCount++;
      }
    }

    res.json({ 
      success: true, 
      migratedCount, 
      cloudSyncedCount,
      skippedCount, 
      errorCount,
      message: `Sincronização concluída. ${cloudSyncedCount} imagens estão agora na nuvem.`
    });
  } catch (error: any) {
    console.error("[Migration] Erro crítico:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API Route for Admin Role Management
app.post("/api/admin/set-role", async (req, res) => {
  const { uid, role } = req.body;
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
  let { url, autoDownloadImage } = req.body;
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    new URL(url);

    if (firecrawl) {
      console.log(`Using Firecrawl to scrape: ${url}`);
      const scrapeResult = await firecrawl.scrape(url, {
        formats: ["html"],
        onlyMainContent: true,
        waitFor: 3000
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
      const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('srcset')?.split(' ')[0];
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) {
        if (src.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
          allImagesFound.push(src);
        }
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
app.post("/api/lounge/messages", authenticateAPI, async (req, res) => {
  const { text, senderId, senderRole, senderName, metadata } = req.body;
  console.log(`[Lounge API] Recebendo mensagem de ${senderName || senderId} (${senderRole}): "${text?.substring(0, 50)}..."`);
  
  if (!text || !senderId) {
    return res.status(400).json({ error: "Texto e SenderId são obrigatórios." });
  }

  try {
    const db = getFirestore();
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

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
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
}

export default app;
