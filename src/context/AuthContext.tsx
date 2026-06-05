/**
 * AuthContext.tsx
 * Provedor de contexto para autenticação (Refatorado para Supabase).
 * Expõe o estado do usuário, estado de carregamento (loading)
 * e permissões administrativas (isAdmin).
 */
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Criamos uma interface compatível com o que o app já espera do Firebase
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false });

// Helper para descobrir se precisamos aguardar o Supabase
const hasAuthToken = () => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash;
  const search = window.location.search;
  
  // Se está voltando do Google OAuth (tem hash de access_token ou code de redirecionamento)
  if (hash.includes('access_token') || search.includes('code=')) return true;
  
  // Procura pela chave do token do supabase no localStorage
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('sb-') && key?.endsWith('-auth-token')) {
      return true; // Tem token salvo
    }
  }
  return false; // Não tem token, não precisa esperar o auth inicializar para saber que está deslogado
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState<boolean>(hasAuthToken());

  const ADMIN_EMAIL = 'sagacitas.sistemas@gmail.com';
  const userRef = useRef<AppUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const updatePresence = async (appUser: AppUser | null, isOnline: boolean) => {
      if (appUser?.uid) {
        try {
          // Gravação direta via SDK Cliente (imediato, sem depender do backend da Vercel)
          const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          await setDoc(doc(db, "users", appUser.uid), {
            isOnline,
            lastSeen: serverTimestamp(),
            ...(appUser.displayName && { displayName: appUser.displayName }),
            ...(appUser.email && { email: appUser.email }),
            ...(appUser.photoURL && { photoURL: appUser.photoURL })
          }, { merge: true });
        } catch (err) {
          console.error("Error updating presence directly:", err);
        }
      }
    };

    // Usar sendBeacon para quando a página for fechada
    const sendBeaconPresence = (isOnline: boolean) => {
      if (userRef.current?.uid) {
        const data = JSON.stringify({
          uid: userRef.current.uid,
          isOnline,
          displayName: userRef.current.displayName,
          email: userRef.current.email,
          photoURL: userRef.current.photoURL
        });
        const blob = new Blob([data], { type: 'application/json' });
        navigator.sendBeacon('/api/presence', blob);
      }
    };

    // Busca a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const appUser = mapSupabaseUserToAppUser(session.user);
        setUser(appUser);
        updatePresence(appUser, true);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Escuta mudanças de autenticação (Login, Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const appUser = mapSupabaseUserToAppUser(session.user);
        setUser(appUser);
        updatePresence(appUser, true);
      } else {
        if (userRef.current) {
          updatePresence(userRef.current, false);
        }
        setUser(null);
      }
      setLoading(false);
    });

    const handleBeforeUnload = () => {
      sendBeaconPresence(false);
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Heartbeat: atualiza o lastSeen a cada 3 minutos para manter a sessão ativa
    const heartbeat = setInterval(() => {
      if (userRef.current) {
        updatePresence(userRef.current, true);
      }
    }, 3 * 60 * 1000);

    // Limpeza ao desmontar
    return () => {
      if (userRef.current) updatePresence(userRef.current, false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(heartbeat);
      subscription.unsubscribe();
    };
  }, []);

  // Helper para manter a compatibilidade com o formato antigo do Firebase
  const mapSupabaseUserToAppUser = (supabaseUser: any): AppUser => {
    return {
      uid: supabaseUser.id,
      email: supabaseUser.email ?? null,
      displayName: supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? '',
      photoURL: supabaseUser.user_metadata?.avatar_url ?? supabaseUser.user_metadata?.picture ?? '',
      emailVerified: supabaseUser.email_confirmed_at != null,
    };
  };

  const isAdmin = !!user && user.email === ADMIN_EMAIL && user.emailVerified;

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
