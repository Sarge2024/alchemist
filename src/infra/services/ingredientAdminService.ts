import { auth } from '../../lib/firebase';
import { supabase } from '../../lib/supabase';

export interface GlobalFoodItem {
  id: string;
  name: string;
  category?: string;
  subcategory?: string;
  micronutrients?: any;
  source: string;
  externalId?: string | null;
  calories: number;
  protein: number;
  carbohydrates: number;
  lipids: number;
  baseUnit: string;
  baseQuantity: number;
  density?: number | null;
  standardPurchaseQuantity?: number | null;
  standardPurchaseUnit?: string | null;
  estimatedPrice?: number | null;
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

export const ingredientAdminService = {
  async getPendingIngredients(): Promise<GlobalFoodItem[]> {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/admin/ingredients/pending', { headers });
    if (!response.ok) throw new Error('Falha ao buscar ingredientes pendentes');
    const resData = await response.json();
    return resData.data || [];
  },

  async getAllIngredients(): Promise<GlobalFoodItem[]> {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/admin/ingredients', { headers });
    if (!response.ok) throw new Error('Falha ao listar base de ingredientes');
    const resData = await response.json();
    return resData.data || [];
  },

  async searchExternal(query: string): Promise<any[]> {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/admin/ingredients/search-external?query=${encodeURIComponent(query)}`, { headers });
    if (!response.ok) throw new Error('Falha na busca externa');
    const resData = await response.json();
    return resData.data || [];
  },

  async createIngredient(data: Partial<GlobalFoodItem>): Promise<GlobalFoodItem> {
    const headers = await getAuthHeaders();
    const response = await fetch('/api/admin/ingredients', {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Falha ao criar ingrediente');
    const resData = await response.json();
    return resData.data;
  },

  async updateIngredient(id: string, data: Partial<GlobalFoodItem>): Promise<GlobalFoodItem> {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/admin/ingredients/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error('Falha ao atualizar ingrediente');
    const resData = await response.json();
    return resData.data;
  },

  async deleteIngredient(id: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/admin/ingredients/${id}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Falha ao excluir ingrediente');
  },

  async mergeIngredients(survivorId: string, duplicateIds: string[]): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/admin/ingredients/merge`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ survivorId, duplicateIds })
    });
    if (!response.ok) throw new Error('Falha ao mesclar ingredientes');
  }
};
