import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { supabase } from '../../lib/supabase';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateFirebase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Não autorizado. Token não fornecido.' });
  }

  const idToken = authHeader.split('Bearer ')[1];

  // 1. Tentar autenticação via Supabase
  try {
    const { data: { user }, error: supabaseError } = await supabase.auth.getUser(idToken);
    if (!supabaseError && user) {
      req.user = {
        uid: user.id,
        email: user.email,
        email_verified: user.email_confirmed_at != null
      };
      return next();
    }
  } catch (err) {
    console.warn('[FirebaseAuthMiddleware] Erro ao tentar autenticação pelo Supabase:', err);
  }

  // 2. Fallback para Firebase Auth
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('[FirebaseAuth] Erro ao verificar token:', error);
    return res.status(401).json({ error: 'Não autorizado. Token inválido ou expirado.' });
  }
};
