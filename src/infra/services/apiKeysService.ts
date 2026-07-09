import { auth } from '../../lib/firebase';
import { supabase } from '../../lib/supabase';

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string | null;
  isActive: boolean;
}

const getAuthHeaders = async () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  let token: string | undefined;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token;
  } catch (err) {
    console.warn('Erro ao obter token do Supabase:', err);
  }

  if (!token) {
    try {
      token = await auth.currentUser?.getIdToken();
    } catch (err) {
      console.warn('Erro ao obter token do Firebase:', err);
    }
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const apiKeysService = {
  async getAllKeys(): Promise<ApiKey[]> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/api-keys', { headers });
      if (!response.ok) {
        throw new Error('Falha ao buscar as chaves de API');
      }
      const resData = await response.json();
      return resData.data || [];
    } catch (error) {
      console.error('Erro no apiKeysService.getAllKeys:', error);
      throw error;
    }
  },

  async createKey(name: string): Promise<ApiKey> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name })
      });
      if (!response.ok) {
        throw new Error('Falha ao gerar nova chave de API');
      }
      const resData = await response.json();
      return resData.data;
    } catch (error) {
      console.error('Erro no apiKeysService.createKey:', error);
      throw error;
    }
  },

  async revokeKey(id: string): Promise<void> {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'DELETE',
        headers
      });
      if (!response.ok) {
        throw new Error('Falha ao revogar chave de API');
      }
    } catch (error) {
      console.error('Erro no apiKeysService.revokeKey:', error);
      throw error;
    }
  }
};
