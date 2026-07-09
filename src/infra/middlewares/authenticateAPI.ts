import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';

const apiKeyCache = new Map<string, { isActive: boolean, id: string, expiry: number }>();

export const authenticateAPI = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.APP_API_KEY;
  const isDevMode = (!apiKey || apiKey === "" || apiKey === "your_app_api_key_here");
  const clientKey = req.headers["x-api-key"] as string;

  if (!clientKey && isDevMode) {
    return next();
  }

  if (clientKey && clientKey === apiKey) {
    return next();
  }

  if (clientKey) {
    try {
      const cachedKey = apiKeyCache.get(clientKey);
      if (cachedKey && Date.now() < cachedKey.expiry) {
        if (cachedKey.isActive) {
          return next();
        }
        return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
      }

      const dynamicKey = await prisma.apiKey.findUnique({
        where: { key: clientKey }
      });

      if (dynamicKey) {
        apiKeyCache.set(clientKey, { isActive: dynamicKey.isActive, id: dynamicKey.id, expiry: Date.now() + 60 * 1000 });
        if (dynamicKey.isActive) {
          prisma.apiKey.update({
            where: { id: dynamicKey.id },
            data: { lastUsedAt: new Date() }
          }).catch(err => console.error('[Auth] Erro ao atualizar lastUsedAt:', err));
          
          return next();
        }
      } else {
        apiKeyCache.set(clientKey, { isActive: false, id: '', expiry: Date.now() + 60 * 1000 });
      }
    } catch (error) {
      console.error('[Auth] Erro na consulta de ApiKey:', error);
    }
  }

  res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
};
