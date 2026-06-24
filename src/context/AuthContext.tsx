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
  try {
    for (let i = 0; i < localStorage.length; i++) {
      if (localStorage.key(i)?.includes('-auth-token')) {
        return true;
      }
    }
  } catch (e) {
    // Ignora erros de acesso ao localStorage (ex: navegação privada estrita)
  }
  
  return false; // Não tem token, não precisa esperar o auth inicializar para saber que está deslogado
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [dbRole, setDbRole] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(hasAuthToken());

  const ADMIN_EMAIL = 'sagacitas.sistemas@gmail.com';
  const userRef = useRef<AppUser | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // Busca o role do usuário no Firestore para definir permissões administrativas.
    // Suporta fallback por email para cobrir migração Firebase Auth → Supabase Auth
    // (os UIDs mudaram, mas os documentos legados contêm o role correto).
    const fetchUserRole = async (uid: string, email: string | null) => {
      try {
        const { doc, getDoc, collection, query, where, getDocs, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');

        // 1. Tentar pelo documento com o UID atual (Supabase)
        const docSnap = await getDoc(doc(db, "users", uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          const role = data.role || null;
          if (role && role !== 'member') {
            console.log('[Auth] Role from UID doc:', role);
            setDbRole(role);
            return;
          }
        }

        // 2. Fallback: buscar por email (cobre documentos legados com UID do Firebase Auth)
        if (email) {
          const q = query(collection(db, "users"), where("email", "==", email));
          const snapshot = await getDocs(q);
          for (const d of snapshot.docs) {
            const data = d.data();
            if (data.role && data.role !== 'member') {
              console.log('[Auth] Role from email fallback:', data.role, '(doc:', d.id, ')');
              setDbRole(data.role);

              // Migrar o role para o documento com UID do Supabase para futuras consultas
              if (d.id !== uid && docSnap.exists()) {
                await updateDoc(doc(db, "users", uid), { role: data.role });
                console.log('[Auth] Role migrated to Supabase UID doc');
              }
              return;
            }
          }
        }

        // 3. Nenhum role privilegiado encontrado
        const finalRole = docSnap.exists() ? (docSnap.data().role || null) : null;
        console.log('[Auth] Final role resolved:', finalRole);
        setDbRole(finalRole);
      } catch (err) {
        console.error('[Auth] Error fetching user role:', err);
      }
    };

    const updatePresence = async (appUser: AppUser | null, isOnline: boolean) => {
      if (appUser?.uid) {
        try {
          const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          await setDoc(doc(db, "users", appUser.uid), {
            isOnline,
            lastSeen: serverTimestamp()
          }, { merge: true });
        } catch (err) {
          console.error("Error updating presence directly:", err);
        }
      }
    };

    const syncProfileAndPresence = async (appUser: AppUser, isOnline: boolean) => {
      try {
        const { doc, getDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');

        const userDocRef = doc(db, "users", appUser.uid);
        const docSnap = await getDoc(userDocRef);
        const currentData = docSnap.exists() ? docSnap.data() : null;

        // Resolve photo URLs
        const initialPhotoURL = currentData?.initialPhotoURL || appUser.photoURL || '';
        const finalPhotoURL = currentData?.photoURL || appUser.photoURL || '';

        // If the Firestore photoURL is different from the mapped one, we want to update the React state
        if (finalPhotoURL !== appUser.photoURL) {
          setUser(prev => prev ? { ...prev, photoURL: finalPhotoURL } : null);
        }

        await setDoc(userDocRef, {
          isOnline,
          lastSeen: serverTimestamp(),
          ...(appUser.displayName && { displayName: appUser.displayName }),
          ...(appUser.email && { email: appUser.email }),
          photoURL: finalPhotoURL,
          initialPhotoURL
        }, { merge: true });

        // Busca o papel/role do usuário
        await fetchUserRole(appUser.uid, appUser.email);
      } catch (err) {
        console.error("Error syncing profile and presence:", err);
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const appUser = mapSupabaseUserToAppUser(session.user);
        setUser(appUser);
        await syncProfileAndPresence(appUser, true);
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
        await syncProfileAndPresence(appUser, true);
      } else {
        if (userRef.current) {
          updatePresence(userRef.current, false);
        }
        setUser(null);
        setDbRole(null);
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

  const role = dbRole?.toLowerCase() || '';
  const isAdmin = !!user && (
    user.email === ADMIN_EMAIL || 
    role === 'admin' || 
    role === 'mestre alquimista' || 
    role === 'alquimista master'
  );

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
