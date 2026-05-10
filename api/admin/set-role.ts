/**
 * POST /api/admin/set-role
 * 
 * Vercel Serverless Function para atualizar Custom Claims de usuários.
 * Permite que o sistema sincronize a role do Firestore com as permissões de Auth.
 * 
 * Variáveis de ambiente:
 *   - FIREBASE_SERVICE_ACCOUNT_KEY (Base64)
 *   - APP_API_KEY (Proteção da API)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// Inicialização Singleton
function initAdmin() {
  if (getApps().length === 0) {
    const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountRaw) throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY missing");

    let jsonString: string;
    if (serviceAccountRaw.startsWith("{")) {
      jsonString = serviceAccountRaw;
    } else {
      jsonString = Buffer.from(serviceAccountRaw, "base64").toString("utf-8");
    }

    const serviceAccount = JSON.parse(jsonString);
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    });
  }
  return getAuth();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // Auth via API Key
  const apiKey = process.env.APP_API_KEY;
  const clientKey = req.headers["x-api-key"];
  
  if (apiKey && apiKey !== "" && clientKey !== apiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { uid, role } = req.body || {};

  if (!uid || !role) {
    return res.status(400).json({ error: "uid and role are required" });
  }

  try {
    const auth = initAdmin();

    // Define as Custom Claims (permissões a nível de token)
    // admin: true permite bypassar regras de segurança
    await auth.setCustomUserClaims(uid, { 
      role,
      admin: role === 'admin'
    });

    console.log(`[Admin API] Custom claims atualizadas para ${uid}: ${role}`);

    return res.status(200).json({ 
      success: true, 
      message: `Role ${role} sincronizada com sucesso.` 
    });
  } catch (error: any) {
    console.error("[Admin API] Erro ao definir claims:", error);
    return res.status(500).json({ error: error.message });
  }
}
