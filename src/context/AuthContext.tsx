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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAIL = 'sagacitas.sistemas@gmail.com';
  const userRef = useRef<AppUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    const updatePresence = async (appUser: AppUser | null, isOnline: boolean) => {
      if (appUser?.uid) {
        try {
          await fetch('/api/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: appUser.uid,
              isOnline,
              displayName: appUser.displayName,
              email: appUser.email,
              photoURL: appUser.photoURL
            })
          });
        } catch (err) {
          console.error("Error updating presence:", err);
        }
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

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (userRef.current) updatePresence(userRef.current, false);
      } else if (document.visibilityState === 'visible') {
        if (userRef.current) updatePresence(userRef.current, true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Limpeza ao desmontar
    return () => {
      if (userRef.current) updatePresence(userRef.current, false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
