import { createClient } from '@supabase/supabase-js';
import { cookieStorage } from './cookieStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERRO CRÍTICO: VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não estão definidos. Verifique suas variáveis de ambiente no Vercel/Servidor ou no arquivo .env local.");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: cookieStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }
);
