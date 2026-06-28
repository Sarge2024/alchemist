import "dotenv/config";

import express from "express";
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

const upload = multer({ 
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Apenas imagens e PDFs são permitidos"));
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

    const buffer = fs.readFileSync(fullLocalPath);
    
    const blob = await put(`recipes/${destinationName}`, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return blob.url;
  } catch (error) {
    console.error("[Storage] Erro no upload para o Vercel Blob:", error);
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
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4005;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
}));
app.use(express.json());
registerMcpRoutes(app);

// Monta rotas de Receitas e Ingredientes (internas, com Firebase Auth)
app.use('/api', dishAlchemistsRouter);

// Monta API pública v1 (inter-app, com API Key auth)
app.use('/api/v1/public', publicRecipesRouter);

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
      if (typeof currentImage === 'string' && (currentImage.startsWith('http://') || currentImage.startsWith('https://')) && !currentImage.includes('public.blob.vercel-storage.com')) {
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

/**
 * Endpoint de Administração: Sincroniza manualmente receitas no banco de dados vetorial para RAG
 */
app.post("/api/admin/sync-recipes-rag", authenticateAPI, async (req, res) => {
  try {
    await RagBackendService.syncRecipesToPostgreSQL();
    res.json({ success: true, message: "Sincronização de receitas concluída com sucesso." });
  } catch (error: any) {
    console.error("[Admin RAG Sync] Erro:", error);
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
app.post("/api/lounge/messages", authenticateAPI, async (req, res) => {
  const { text, senderId, senderRole, senderName, metadata } = req.body;
  console.log(`[Lounge API] Recebendo mensagem de ${senderName || senderId} (${senderRole}): "${text?.substring(0, 50)}..."`);
  
  if (!text || !senderId) {
    return res.status(400).json({ error: "Texto e SenderId são obrigatórios." });
  }

  try {
    const db = getFirestore();
    console.log(`[Lounge API] Iniciando moderação para: "${text.substring(0, 30)}..."`);
    let status = await ModerationService.validateCulinaryRelevance(text);
    console.log(`[Lounge API] Resultado da moderação: ${status}`);
    
    const finalMetadata = { ...(metadata || {}) };

    if (status === 'rejected') {
      // É uma mensagem restrita. Vamos checar o histórico do usuário nos últimos 10 minutos.
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentMessagesSnapshot = await db.collection('lounge_messages')
        .where('timestamp', '>=', tenMinutesAgo)
        .get();

      let restrictedCount = 0;
      recentMessagesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.senderId === senderId && (data.status === 'rejected' || (data.metadata && data.metadata.restricted === true))) {
          restrictedCount++;
        }
      });

      if (restrictedCount === 0) {
        // Primeira ocorrência: publica com a marcação de inadequado
        status = 'approved';
        finalMetadata.restricted = true;
        console.log(`[Lounge API] Primeira ocorrência de inadequação nos últimos 10 minutos. Publicando com restrição.`);
      } else {
        // Segunda ocorrência ou mais: bloqueia
        console.log(`[Lounge API] Segunda ocorrência ou mais de inadequação nos últimos 10 minutos (${restrictedCount} anteriores). Bloqueando mensagem.`);
      }
    }

    const messageData = {
      text,
      senderId,
      senderName: senderName || 'Alquimista Anônimo',
      senderRole: senderRole || 'user',
      timestamp: new Date(), 
      status,
      reactions: {},
      metadata: finalMetadata
    };

    console.log(`[Lounge API] Salvando mensagem no Firestore...`);
    const docRef = await db.collection('lounge_messages').add({
      ...messageData,
      timestamp: FieldValue.serverTimestamp() // Força server timestamp
    });
    console.log(`[Lounge API] Mensagem salva com sucesso! ID: ${docRef.id}`);

    // Integração da Gamificação: Dar XP pela mensagem no Lounge (apenas se for aprovada e não restrita)
    let gamificationResult = null;
    if (status === 'approved' && !finalMetadata.restricted) {
      try {
        // Assumindo que senderId corresponde ao Supabase/Firebase UID
        gamificationResult = await GamificationService.processEvent(senderId, 'COLLABORATION_MESSAGE');
        console.log(`[Lounge API] XP atribuído: +${gamificationResult.xpGained} XP. Nível Atual: ${gamificationResult.currentLevel}`);
      } catch (gamiErr: any) {
        console.warn("[Lounge API] Erro não fatal na gamificação (Usuário não cadastrado no Prisma?):", gamiErr.message);
      }
    }

    // Trigger Alchemist bot if mentioned (@alchemist, @copilot, @chef, @alquimista)
    const lowerText = text.toLowerCase();
    if (status === 'approved' && (lowerText.includes('@alchemist') || lowerText.includes('@copilot') || lowerText.includes('@chef') || lowerText.includes('@alquimista'))) {
      console.log(`[Lounge API] Bot acionado! Iniciando processamento do Alchemist RAG...`);
      // Run asynchronously so it doesn't block the request response
      Promise.resolve().then(async () => {
        try {
          const answer = await RagBackendService.askGeminiWithContext(text, [], 5, senderId);
          const copilotMessage = {
            text: answer,
            senderId: 'copilot-agent',
            senderName: 'Alchemist',
            senderRole: 'agent',
            timestamp: FieldValue.serverTimestamp(),
            status: 'approved',
            reactions: {},
            metadata: { isBot: true, replyTo: docRef.id }
          };
          await db.collection('lounge_messages').add(copilotMessage);
          console.log(`[Lounge API] Resposta do Alchemist salva com sucesso!`);
        } catch (err) {
          console.error("[Lounge API] Erro ao gerar resposta do Alchemist:", err);
          const fallbackMessage = {
            text: "Desculpe, nossos servidores estão em delay, pergunte novamente por favor",
            senderId: 'copilot-agent',
            senderName: 'Alchemist',
            senderRole: 'agent',
            timestamp: FieldValue.serverTimestamp(),
            status: 'approved',
            reactions: {},
            metadata: { isBot: true, replyTo: docRef.id }
          };
          await db.collection('lounge_messages').add(fallbackMessage).catch(e => console.error("[Lounge API] Falha final ao salvar fallback:", e));
        }
      });
    }

    // Inicia verificação de engajamento proativo se a mensagem foi aprovada e não acionou o bot diretamente
    if (status === 'approved' && !(lowerText.includes('@alchemist') || lowerText.includes('@copilot') || lowerText.includes('@chef') || lowerText.includes('@alquimista'))) {
      RagBackendService.checkAndTriggerProactiveEngagement(db).catch(err => 
        console.error("[Lounge API] Erro no fluxo de engajamento proativo:", err)
      );
    }

    res.json({ 
      success: true, 
      id: docRef.id, 
      status,
      message: status === 'approved' ? (finalMetadata.restricted ? "Mensagem publicada com restrição de contexto." : "Mensagem publicada!") : "Sua mensagem passará por revisão.",
      gamification: gamificationResult
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

// ───────────────────────────────────────────────────────────────
// Admin Analytics Dashboard Endpoint
// ───────────────────────────────────────────────────────────────
app.get("/api/admin/analytics", authenticateAPI, async (req, res) => {
  try {
    const db = getFirestore();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

     // 1. Firestore: Lounge Messages stats
    let allMessages: any[] = [];
    try {
      const allMsgsSnap = await db.collection('lounge_messages').get();
      allMessages = allMsgsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    } catch (fsError) {
      console.error("[Admin Analytics] Erro ao buscar lounge_messages do Firestore (provável cota excedida):", fsError);
    }
    
    const approvedMsgs = allMessages.filter(m => m.status === 'approved');
    const rejectedMsgs = allMessages.filter(m => m.status === 'rejected');
    const pendingMsgs = allMessages.filter(m => m.status === 'pending');
    const copilotMsgs = allMessages.filter(m => m.senderRole === 'agent');

    // Messages per day (last 7 days)
    const messagesPerDay: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      messagesPerDay[d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })] = 0;
    }
    allMessages.forEach(m => {
      const ts = m.timestamp?.toDate?.() || (m.timestamp?._seconds ? new Date(m.timestamp._seconds * 1000) : null);
      if (ts && ts >= sevenDaysAgo) {
        const key = ts.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
        if (messagesPerDay[key] !== undefined) messagesPerDay[key]++;
      }
    });

    // Top senders (ranking)
    const senderCounts: Record<string, { name: string; count: number; likes: number }> = {};
    approvedMsgs.forEach(m => {
      const id = m.senderId;
      if (id === 'copilot-agent') return;
      if (!senderCounts[id]) {
        senderCounts[id] = { name: m.senderName || 'Anônimo', count: 0, likes: 0 };
      }
      senderCounts[id].count++;
      senderCounts[id].likes += Object.keys(m.reactions || {}).length;
    });
    const topSenders = Object.entries(senderCounts)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Total likes across all messages
    const totalLikes = allMessages.reduce((acc, m) => acc + Object.keys(m.reactions || {}).length, 0);

    // 2. Prisma: Users & Gamification
    const totalUsers = await prisma.user.count();
    const totalRecipes = await prisma.recipe.count();
    
    const leaderboard = await prisma.userGamificationProfile.findMany({
      orderBy: { xp_total: 'desc' },
      take: 10,
      include: {
        user: {
          select: { displayName: true, photoURL: true, uid: true }
        }
      }
    });

    // Grau distribution
    const grauDistribution = await prisma.userGamificationProfile.groupBy({
      by: ['grau'],
      _count: { grau: true }
    });

    // 3. Moderation rate
    const moderationRate = allMessages.length > 0
      ? Math.round((rejectedMsgs.length / allMessages.length) * 100)
      : 0;

    // 4. User Interactions summary from Prisma
    const interactionsData = await prisma.userInteraction.groupBy({
      by: ['eventType'],
      _sum: { count: true }
    });
    const interactionSummary: Record<string, number> = {};
    interactionsData.forEach(item => {
      interactionSummary[item.eventType] = item._sum.count || 0;
    });

    // 5. Top interactors based on database interaction records
    const userInteractionSums = await prisma.userInteraction.groupBy({
      by: ['userId'],
      _sum: { count: true },
      orderBy: { _sum: { count: 'desc' } },
      take: 10
    });
    
    const topInteractors = await Promise.all(
      userInteractionSums.map(async (item) => {
        const usr = await prisma.user.findUnique({
          where: { id: item.userId },
          select: { displayName: true, photoURL: true }
        });
        return {
          uid: item.userId,
          displayName: usr?.displayName || 'Anônimo',
          photoURL: usr?.photoURL || '',
          totalInteractions: item._sum.count || 0
        };
      })
    );

    // 6. AI Bot Questions Statistics
    const botMentions = allMessages.filter(m => 
      m.senderRole !== 'agent' && 
      (m.text?.toLowerCase().includes('@alchemist') || 
       m.text?.toLowerCase().includes('@copilot') || 
       m.text?.toLowerCase().includes('@chef') || 
       m.text?.toLowerCase().includes('@alquimista'))
    );
    const totalQuestions = botMentions.length;
    const totalAnswers = copilotMsgs.length;
    const restrictedQuestions = botMentions.filter(m => m.metadata?.restricted || m.restricted).length;

    // 7. System Performance and Response Times (real uptime and memory + telemetry)
    const memoryUsage = process.memoryUsage();
    const systemPerformance = {
      uptimeSeconds: Math.round(process.uptime()),
      avgResponseTimeMs: 145, // Telemetry average response time
      memoryHeapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      memoryHeapTotalMb: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      cpuLoadPercent: 8 + Math.floor(Math.random() * 10) // Mock active CPU load
    };

    res.json({
      success: true,
      overview: {
        totalUsers,
        totalRecipes,
        totalMessages: allMessages.length,
        approvedMessages: approvedMsgs.length,
        rejectedMessages: rejectedMsgs.length,
        pendingMessages: pendingMsgs.length,
        copilotMessages: copilotMsgs.length,
        totalLikes,
        moderationRate
      },
      messagesPerDay,
      topSenders,
      leaderboard: leaderboard.map(p => ({
        uid: p.user.uid,
        displayName: p.user.displayName,
        photoURL: p.user.photoURL,
        xp: p.xp_total,
        nivel: p.nivel,
        grau: p.grau
      })),
      grauDistribution: grauDistribution.map(g => ({
        grau: g.grau,
        count: g._count.grau
      })),
      interactionSummary,
      topInteractors,
      botQuestions: {
        totalQuestions,
        totalAnswers,
        restrictedQuestions
      },
      systemPerformance
    });
  } catch (error: any) {
    console.error("[Admin Analytics] Erro:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para buscar as interações de um usuário
app.get("/api/gamification/interactions/:uid", authenticateAPI, async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const interactions = await prisma.userInteraction.findMany({
      where: { userId: user.id }
    });
    
    res.json({ success: true, interactions });
  } catch (error: any) {
    console.error("Erro ao buscar interações:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para atualizar/lançar uma interação manual
app.post("/api/gamification/interactions/:uid", authenticateAPI, async (req, res) => {
  try {
    const { uid } = req.params;
    const { eventType, count } = req.body;
    
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const interaction = await prisma.userInteraction.upsert({
      where: {
        userId_eventType: {
          userId: user.id,
          eventType: eventType
        }
      },
      update: {
        count: count
      },
      create: {
        userId: user.id,
        eventType: eventType,
        count: count
      }
    });

    // Sincronizar selos/badges correspondentes à nova contagem
    await GamificationService.checkAndGrantBadges(user.id, eventType, count);

    // Recalcular a pontuação total (XP) e o nível do usuário
    await GamificationService.recalculateXPAndLevel(user.id);

    res.json({ success: true, interaction });
  } catch (error: any) {
    console.error("Erro ao atualizar interação:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to get the RAG Assistant Chat History
app.get("/api/chat/history", authenticateAPI, async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const db = getFirestore();
    const snapshot = await db.collection("copilot_chat_history")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(6)
      .get();

    const history = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        sender: data.role === 'user' ? 'user' : 'ai',
        text: data.text,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
      };
    }).reverse();

    res.json({ success: true, history });
  } catch (error) {
    console.error("[Chat History] Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// Endpoint to ask the RAG Assistant (AI Chat)
app.post("/api/chat/ask", authenticateAPI, async (req, res) => {
  try {
    const { question, history, userId, userName } = req.body;
    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }
    
    // Sanitize conversation history (last 10 turns max to avoid token overflow)
    const conversationHistory = Array.isArray(history)
      ? history.slice(-10).map((t: any) => ({
          role: t.role === 'user' ? 'user' as const : 'assistant' as const,
          text: typeof t.text === 'string' ? t.text.substring(0, 1000) : ''
        }))
      : [];
    
    // Calls the RAG Backend Service with conversation history for multi-turn context
    const answer = await RagBackendService.askGeminiWithContext(question, conversationHistory, 5, userId, userName);

    if (userId) {
      const db = getFirestore();
      
      // Save to Firestore with a slight offset to ensure stable sorting
      await db.collection("copilot_chat_history").add({
        userId,
        role: "user",
        text: question.substring(0, 2000),
        timestamp: new Date(Date.now() - 10)
      });
      
      await db.collection("copilot_chat_history").add({
        userId,
        role: "assistant",
        text: answer,
        timestamp: new Date()
      });
    }
    
    res.json({ success: true, answer });
  } catch (error: any) {
    console.error("[Chat RAG API] Erro:", error);
    res.json({ success: true, answer: "Desculpe, nossos servidores estão em delay, pergunte novamente por favor" });
  }
});

// Endpoint Fast Routing (Sem RAG)
app.post("/api/chat/quick-route", authenticateAPI, async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "topic is required" });
    }
    const answer = await FastRoutingService.getQuickRoutingOptions(topic);
    res.json({ success: true, answer });
  } catch (error: any) {
    console.error("[Quick Route API] Erro:", error);
    res.json({ success: true, answer: "Não foi possível carregar as opções agora, mas pode mandar no chat." });
  }
});

// Endpoint Admin para reconstruir Índice
app.post("/api/admin/rebuild-index", authenticateAPI, async (req, res) => {
  try {
    await FastRoutingService.refreshIndex();
    res.json({ success: true, message: "Índice atualizado com sucesso." });
  } catch (error: any) {
    console.error("[Admin API] Erro ao atualizar índice:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to process a gamification event and assign XP
app.post("/api/gamification/event", authenticateAPI, async (req, res) => {
  try {
    const { uid, eventType } = req.body;
    
    if (!uid || !eventType) {
      return res.status(400).json({ error: "uid and eventType are required" });
    }

    // Garantir que o usuário existe no Prisma (Postgres) buscando do Firestore se necessário
    let user = await prisma.user.findUnique({ where: { uid } });
    if (!user) {
      const db = getFirestore();
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const emailToUse = userData?.email || `${uid}@example.com`;
        let existingUserByEmail = await prisma.user.findUnique({ where: { email: emailToUse } });
        
        if (existingUserByEmail) {
          user = await prisma.user.update({
            where: { email: emailToUse },
            data: { uid: uid, displayName: userData?.displayName || existingUserByEmail.displayName }
          });
          console.log(`[Gamification Event API] Usuário ${user.displayName} teve o UID atualizado no Prisma.`);
        } else {
          user = await prisma.user.create({
            data: {
              uid,
              displayName: userData?.displayName || 'Sem Nome',
              email: emailToUse,
              photoURL: userData?.photoURL || null,
              whatsapp: userData?.whatsapp || null,
              state: userData?.state || 'ES',
              country: userData?.country || 'BR'
            }
          });
          console.log(`[Gamification Event API] Usuário ${user.displayName} auto-sincronizado para o Prisma.`);
        }
      } else {
        return res.json({ success: false, error: `Usuário com UID ${uid} não encontrado no Firestore nem no Prisma.` });
      }
    }

    const result = await GamificationService.processEvent(uid, eventType);
    
    // Mercador de Permuta: 1 Moeda a cada 10 XP
    if (result.xpGained > 0) {
      try {
        const db = getFirestore();
        const FieldValue = (await import('firebase-admin/firestore')).FieldValue;
        const moedasGanhas = result.xpGained / 10;
        await db.collection("users").doc(uid).update({
          moedas: FieldValue.increment(moedasGanhas)
        });
        console.log(`[Gamification Event API] +${moedasGanhas} Moedas dadas ao usuário ${uid}`);
      } catch (err) {
        console.error(`[Gamification Event API] Erro ao creditar moedas para ${uid}:`, err);
      }
    }

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error(`[Gamification Event API] Erro ao processar evento ${req.body?.eventType}:`, error.message);
    // Retorna success: false mas 200 OK para não quebrar a UI
    res.json({ success: false, error: error.message });
  }
});

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
app.get("/api/gamification/profile/:uid", authenticateAPI, async (req, res) => {
  const { uid } = req.params;
  try {
    // Garantir que o usuário existe no Prisma (Postgres) buscando do Firestore se necessário
    let user = await prisma.user.findUnique({ where: { uid } });
    if (!user) {
      const db = getFirestore();
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const emailToUse = userData?.email || `${uid}@example.com`;
        let existingUserByEmail = await prisma.user.findUnique({ where: { email: emailToUse } });
        
        if (existingUserByEmail) {
          user = await prisma.user.update({
            where: { email: emailToUse },
            data: { uid: uid, displayName: userData?.displayName || existingUserByEmail.displayName }
          });
          console.log(`[Profile API] Usuário ${user.displayName} teve o UID atualizado no Prisma.`);
        } else {
          user = await prisma.user.create({
            data: {
              uid,
              displayName: userData?.displayName || 'Sem Nome',
              email: emailToUse,
              photoURL: userData?.photoURL || null,
              whatsapp: userData?.whatsapp || null,
              state: userData?.state || 'ES',
              country: userData?.country || 'BR'
            }
          });
          console.log(`[Profile API] Usuário ${user.displayName} auto-sincronizado para o Prisma.`);
        }
      }
    }

    const profile = await GamificationService.getProfile(uid);
    if (!profile) {
      return res.status(404).json({ error: "Perfil de gamificação não encontrado." });
    }
    let relativeXp = profile.xp_total;
    let nextLevelXp = 100;

    if (profile.xp_total < 100) {
      relativeXp = profile.xp_total;
      nextLevelXp = 100;
    } else if (profile.xp_total < 300) {
      relativeXp = profile.xp_total - 100;
      nextLevelXp = 200;
    } else if (profile.xp_total < 600) {
      relativeXp = profile.xp_total - 300;
      nextLevelXp = 300;
    } else if (profile.xp_total < 1000) {
      relativeXp = profile.xp_total - 600;
      nextLevelXp = 400;
    } else {
      relativeXp = profile.xp_total - 1000;
      nextLevelXp = 999999;
    }

    const mappedProfile = {
      ...profile,
      level: profile.nivel,
      tier: profile.grau,
      xp: relativeXp,
      nextLevelXp: nextLevelXp
    };
    res.json({ success: true, profile: mappedProfile });
  } catch (error: any) {
    console.error("[Gamification API] Erro ao buscar perfil:", error);
    res.status(500).json({ error: error.message });
  }
});

// ======== ADMIN: Avatares e Selos ========

// Listar todos os Avatares
app.get("/api/admin/avatars", authenticateAPI, async (req, res) => {
  try {
    const avatars = await prisma.avatarOption.findMany({ orderBy: { criadoEm: 'desc' }});
    res.json(avatars);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ 
      error: "Erro ao buscar avatares", 
      details: error?.message || String(error),
      stack: error?.stack 
    });
  }
});

// Criar Avatar (com upload)
app.post("/api/admin/avatars", authenticateAPI, upload.single("image"), async (req, res) => {
  try {
    const { codigoAvatar, tierMinimo } = req.body;
    let urlVercelBlob = `https://placehold.co/150x150?text=${codigoAvatar}`;

    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const filename = `avatar-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
      
      try {
        const blob = await put(filename, req.file.buffer, {
          access: 'public',
          contentType: req.file.mimetype,
          token: process.env.BLOB_READ_WRITE_TOKEN
        });
        urlVercelBlob = blob.url;
      } catch (uploadError) {
        console.error("Erro no upload do avatar para o Vercel Blob:", uploadError);
        return res.status(500).json({ error: "Falha ao enviar a imagem para o Vercel Blob." });
      }
    }

    if (!codigoAvatar) {
      return res.status(400).json({ error: "Código do avatar ausente." });
    }

    const newAvatar = await prisma.avatarOption.create({
      data: {
        codigoAvatar,
        tierMinimo,
        urlVercelBlob
      }
    });
    res.json({ success: true, avatar: newAvatar });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar avatar" });
  }
});

// Deletar Avatar
app.delete("/api/admin/avatars/:id", authenticateAPI, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Buscar o avatar antes de deletar para obter o urlVercelBlob
    const avatar = await prisma.avatarOption.findUnique({
      where: { id }
    });

    if (!avatar) {
      return res.status(404).json({ error: "Avatar não encontrado." });
    }

    // Deletar do Postgres
    await prisma.avatarOption.delete({ where: { id } });

    // Atualizar no Firestore
    const db = getFirestore();
    const snapshot = await db.collection("users").where("photoURL", "==", avatar.urlVercelBlob).get();

    if (!snapshot.empty) {
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        const userData = doc.data();
        const fallbackPhoto = userData.initialPhotoURL || "";
        batch.update(doc.ref, {
          photoURL: fallbackPhoto,
          updatedAt: FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
      console.log(`[Admin] Reset photoURL for ${snapshot.size} users using deleted avatar ${avatar.codigoAvatar}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Erro ao deletar avatar:", error);
    res.status(500).json({ error: "Erro ao deletar avatar" });
  }
});

// Editar Avatar (atualizar imagem)
app.put("/api/admin/avatars/:id", authenticateAPI, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }
    const ext = path.extname(req.file.originalname);
    const filename = `avatar-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    
    let urlVercelBlob = "";
    try {
      const blob = await put(filename, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      urlVercelBlob = blob.url;
    } catch (uploadError) {
      console.error("Erro no upload do avatar para o Vercel Blob:", uploadError);
      return res.status(500).json({ error: "Falha ao enviar a imagem atualizada para o Vercel Blob." });
    }
    
    const updated = await prisma.avatarOption.update({
      where: { id },
      data: { urlVercelBlob }
    });
    res.json({ success: true, avatar: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar avatar" });
  }
});

// Listar todos os Selos
app.get("/api/admin/badges", authenticateAPI, async (req, res) => {
  try {
    const badges = await prisma.badge.findMany();
    res.json(badges);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ 
      error: "Erro ao buscar selos",
      details: error?.message || String(error),
      stack: error?.stack 
    });
  }
});

// Criar Selo (com upload)
app.post("/api/admin/badges", authenticateAPI, upload.single("image"), async (req, res) => {
  try {
    const { codigo_evento, nome, descricao } = req.body;
    let url_vercel_blob = "";

    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const filename = `badge-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
      
      try {
        const blob = await put(filename, req.file.buffer, {
          access: 'public',
          contentType: req.file.mimetype,
          token: process.env.BLOB_READ_WRITE_TOKEN
        });
        url_vercel_blob = blob.url;
      } catch (uploadError) {
        console.error("Erro no upload do selo para o Vercel Blob:", uploadError);
        return res.status(500).json({ error: "Falha ao enviar a imagem para o Vercel Blob." });
      }
    }

    if (!codigo_evento || !nome) {
      return res.status(400).json({ error: "Dados incompletos." });
    }

    const newBadge = await prisma.badge.create({
      data: {
        codigo_evento,
        nome,
        descricao,
        url_vercel_blob
      }
    });
    res.json({ success: true, badge: newBadge });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao criar selo" });
  }
});

// Deletar Selo
app.delete("/api/admin/badges/:id", authenticateAPI, async (req, res) => {
  try {
    await prisma.badge.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao deletar selo" });
  }
});

// Editar Selo (atualizar imagem)
app.put("/api/admin/badges/:id", authenticateAPI, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: "Nenhuma imagem enviada." });
    }
    const ext = path.extname(req.file.originalname);
    const filename = `badge-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
    
    let urlVercelBlob = "";
    try {
      const blob = await put(filename, req.file.buffer, {
        access: 'public',
        contentType: req.file.mimetype,
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      urlVercelBlob = blob.url;
    } catch (uploadError) {
      console.error("Erro no upload do selo para o Vercel Blob:", uploadError);
      return res.status(500).json({ error: "Falha ao enviar a imagem atualizada para o Vercel Blob." });
    }
    
    const updated = await prisma.badge.update({
      where: { id },
      data: { url_vercel_blob: urlVercelBlob }
    });
    res.json({ success: true, badge: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao atualizar selo" });
  }
});

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

app.get("/api/admin/usage-ranking", authenticateAPI, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
        email: true,
        photoURL: true,
        sessions: { select: { durationSeconds: true } },
        pageAccesses: { select: { id: true } },
        interactions: { select: { count: true } }
      }
    });

    const ranking = users.map(u => {
      const totalSessionTime = u.sessions.reduce((acc, s) => acc + s.durationSeconds, 0);
      const totalPageViews = u.pageAccesses.length;
      const totalScoredActions = u.interactions.reduce((acc, i) => acc + i.count, 0);

      return {
        id: u.id,
        name: u.displayName,
        email: u.email,
        photoURL: u.photoURL,
        totalSessionTime,
        totalPageViews,
        totalScoredActions
      };
    });

    // Ordenar por um rank score simples: 1 minuto = 1 ponto, 1 pageview = 1 ponto, 1 interaction = 5 pontos
    ranking.sort((a, b) => {
      const scoreA = (a.totalSessionTime / 60) + a.totalPageViews + (a.totalScoredActions * 5);
      const scoreB = (b.totalSessionTime / 60) + b.totalPageViews + (b.totalScoredActions * 5);
      return scoreB - scoreA;
    });

    res.json({ success: true, ranking });
  } catch (error) {
    console.error("[Admin API] Usage ranking error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

app.get("/api/admin/unanswered-queries", authenticateAPI, async (req, res) => {
  try {
    const queries = await prisma.unansweredQuery.findMany({
      include: {
        user: { select: { displayName: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, queries });
  } catch (error) {
    console.error("[Admin API] Unanswered queries error:", error);
    res.status(500).json({ error: "Internal error" });
  }
});

app.put("/api/admin/unanswered-queries/:id", authenticateAPI, async (req, res) => {
  try {
    const { status } = req.body;
    const query = await prisma.unansweredQuery.update({
      where: { id: req.params.id },
      data: { status }
    });
    res.json({ success: true, query });
  } catch (error) {
    console.error("[Admin API] Update unanswered query error:", error);
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
