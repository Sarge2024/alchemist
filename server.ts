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
import { GamificationService } from "./src/infra/services/GamificationService";
import { geminiService } from "./src/infra/services/geminiService";
import { getAvailableGeminiKeys } from "./src/infra/services/geminiKeyManager";
import { put } from "@vercel/blob";
import cron from "node-cron";
import { registerMcpRoutes } from "./src/infra/mcp/mcpServer";
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

app.use(express.json());
registerMcpRoutes(app);

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

// Also serve root public for any other assets
app.use(express.static(path.resolve(process.cwd(), 'public'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

// API Route for File Upload
app.post("/api/upload", authenticateAPI, upload.single("image"), async (req, res) => {
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

    // Integração da Gamificação: Dar XP pela mensagem no Lounge
    let gamificationResult = null;
    try {
      // Assumindo que senderId corresponde ao Supabase/Firebase UID
      gamificationResult = await GamificationService.processEvent(senderId, 'COLLABORATION_MESSAGE');
      console.log(`[Lounge API] XP atribuído: +${gamificationResult.xpGained} XP. Nível Atual: ${gamificationResult.currentLevel}`);
    } catch (gamiErr: any) {
      console.warn("[Lounge API] Erro não fatal na gamificação (Usuário não cadastrado no Prisma?):", gamiErr.message);
    }

    res.json({ 
      success: true, 
      id: docRef.id, 
      status,
      message: status === 'approved' ? "Mensagem publicada!" : "Sua mensagem passará por revisão.",
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

    // Option: Integrar com a GamificationService para dar XP a cada atualização? 
    // Deixaremos para o futuro ou manual.

    res.json({ success: true, interaction });
  } catch (error: any) {
    console.error("Erro ao atualizar interação:", error);
    res.status(500).json({ error: error.message });
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
    const profile = await GamificationService.getProfile(uid);
    if (!profile) {
      return res.status(404).json({ error: "Perfil de gamificação não encontrado." });
    }
    const mappedProfile = {
      ...profile,
      level: profile.nivel,
      tier: profile.grau,
      xp: profile.xp_total % 100,
      nextLevelXp: 100
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar avatares" });
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
      const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
      fs.writeFileSync(filepath, req.file.buffer);
      urlVercelBlob = `/uploads/${filename}`;
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
    await prisma.avatarOption.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
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
    const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, req.file.buffer);
    const urlVercelBlob = `/uploads/${filename}`;
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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar selos" });
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
      const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
      fs.writeFileSync(filepath, req.file.buffer);
      url_vercel_blob = `/uploads/${filename}`;
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
    const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
    fs.mkdirSync(path.dirname(filepath), { recursive: true });
    fs.writeFileSync(filepath, req.file.buffer);
    const urlVercelBlob = `/uploads/${filename}`;
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

  // Agendamento RAG: Todo dia às 03:00 da manhã
  // Sincroniza mensagens do Firebase para o PostgreSQL/pgvector para busca semântica
  cron.schedule("0 3 * * *", async () => {
    console.log("[Cron] Iniciando sincronização RAG: Firebase -> PostgreSQL...");
    try {
      await RagBackendService.syncChatsToPostgreSQL();
    } catch (error) {
      console.error("[Cron] Falha na sincronização RAG:", error);
    }
  });
}

export default app;
