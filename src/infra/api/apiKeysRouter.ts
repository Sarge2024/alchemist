import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { authenticateFirebase } from '../auth/firebaseAuthMiddleware';
import crypto from 'crypto';

export const apiKeysRouter = Router();

// Função auxiliar para verificar permissão de ADMIN (opcional mas recomendado)
const requireAdmin = async (req: any, res: Response, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { uid: req.user.uid }
    });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerenciar chaves de API.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar permissões.' });
  }
};

// GET /api/admin/api-keys — Listar todas as chaves de API
apiKeysRouter.get('/admin/api-keys', authenticateFirebase, requireAdmin, async (req: Request, res: Response) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ data: apiKeys });
  } catch (error: any) {
    console.error('[ApiKeys API] Erro ao listar chaves de API:', error);
    res.status(500).json({ error: 'Erro interno ao buscar chaves de API' });
  }
});

// POST /api/admin/api-keys — Criar nova chave de API
apiKeysRouter.post('/admin/api-keys', authenticateFirebase, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'O nome da chave é obrigatório.' });
    }

    // Gerar uma chave segura: prefixo + 32 bytes randômicos hex
    const rawKey = crypto.randomBytes(32).toString('hex');
    const newKeyString = `ak_live_${rawKey}`;

    const newApiKey = await prisma.apiKey.create({
      data: {
        name,
        key: newKeyString,
        isActive: true
      }
    });

    res.status(201).json({ data: newApiKey });
  } catch (error: any) {
    console.error('[ApiKeys API] Erro ao criar chave de API:', error);
    res.status(500).json({ error: 'Erro interno ao criar chave de API' });
  }
});

// DELETE /api/admin/api-keys/:id — Revogar/Deletar chave de API
apiKeysRouter.delete('/admin/api-keys/:id', authenticateFirebase, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prisma.apiKey.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Chave de API revogada com sucesso.' });
  } catch (error: any) {
    console.error('[ApiKeys API] Erro ao revogar chave de API:', error);
    res.status(500).json({ error: 'Erro interno ao revogar chave de API' });
  }
});
