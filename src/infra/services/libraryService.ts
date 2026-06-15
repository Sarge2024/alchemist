/**
 * libraryService.ts
 * Serviço de infraestrutura para gestão do Acervo Digital.
 * Interface com a API Express (PostgreSQL) para persistência de itens do acervo (LibraryItem).
 */

export type LibraryItemType = 'pdf' | 'ebook' | 'presentation' | 'infographic';

export interface LibraryItem {
  id?: string;
  title: string;
  description: string;
  type: LibraryItemType;
  category: string;
  tags: string[];
  url: string;
  thumbnail?: string;
  author: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    'x-api-key': (import.meta.env.VITE_APP_API_KEY as string) || ''
  };
};

export const libraryService = {
  async getItems(): Promise<LibraryItem[]> {
    try {
      const response = await fetch('/api/library', {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Falha ao buscar itens do acervo');
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Erro ao buscar itens do acervo:", error);
      return [];
    }
  },

  async addItem(item: Omit<LibraryItem, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      const response = await fetch('/api/library', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(item)
      });
      if (!response.ok) throw new Error('Falha ao adicionar item ao acervo');
      const data = await response.json();
      return data.id;
    } catch (error) {
      console.error("Erro ao adicionar item ao acervo:", error);
      throw error;
    }
  },

  async deleteItem(id: string) {
    try {
      const response = await fetch(`/api/library/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Falha ao deletar item do acervo');
      return true;
    } catch (error) {
      console.error("Erro ao remover item do acervo:", error);
      throw error;
    }
  },

  async updateItem(id: string, item: Partial<LibraryItem>) {
    try {
      const response = await fetch(`/api/library/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(item)
      });
      if (!response.ok) throw new Error('Falha ao atualizar item do acervo');
      return true;
    } catch (error) {
      console.error("Erro ao atualizar item do acervo:", error);
      throw error;
    }
  }
};
