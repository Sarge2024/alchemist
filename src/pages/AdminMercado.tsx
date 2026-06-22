import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, Flame, Leaf, Crown, UserCircle, Book, Shield, Star, Gem, ShoppingBag } from 'lucide-react';
import { marketService, MarketItem } from '../infra/services/marketService';

const ICON_MAP: Record<string, any> = {
  Flame, Leaf, Crown, UserCircle, Book, Shield, Star, Gem, ShoppingBag
};

const ICONS_LIST = Object.keys(ICON_MAP);

export default function AdminMercado() {
  const [items, setItems] = useState<MarketItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<MarketItem | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const data = await marketService.getAllItemsForAdmin();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Deseja realmente inativar este item?")) return;
    try {
      await marketService.deleteItem(id);
      fetchItems();
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir item");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await marketService.saveItem(editingItem);
      setEditingItem(null);
      fetchItems();
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar item");
    }
  };

  const handleAddNew = () => {
    setEditingItem({
      nome: '',
      tipo: 'Avatar',
      descricao: '',
      custoXP: 0,
      custoMoedas: 0,
      icone: 'ShoppingBag',
      cor: 'text-primary',
      bg: 'bg-primary/10',
      ativo: true
    });
  };

  const filteredItems = items.filter(i => i.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <section className="bg-surface-container-low p-8 rounded-[2rem] border border-surface-container-high shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h3 className="text-2xl font-bold text-on-surface">Mercado de Permuta & Loja de Ingredientes</h3>
          <p className="text-sm text-on-surface-variant mt-1">Gerencie os itens disponíveis para troca e compra.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input 
              type="text" 
              placeholder="Busca..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-background border border-surface-container rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none w-48"
            />
          </div>
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>
      </div>

      {editingItem && (
        <form onSubmit={handleSave} className="mb-8 p-6 bg-surface-container rounded-2xl border border-surface-container-high shadow-lg">
          <h4 className="text-lg font-bold text-on-surface mb-4">{editingItem.id ? 'Editar Item' : 'Novo Item'}</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Nome</label>
              <input type="text" value={editingItem.nome} onChange={e => setEditingItem({...editingItem, nome: e.target.value})} className="w-full p-2 rounded-lg bg-background border border-surface-container" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Tipo</label>
              <input type="text" value={editingItem.tipo} onChange={e => setEditingItem({...editingItem, tipo: e.target.value})} className="w-full p-2 rounded-lg bg-background border border-surface-container" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Descrição</label>
              <input type="text" value={editingItem.descricao} onChange={e => setEditingItem({...editingItem, descricao: e.target.value})} className="w-full p-2 rounded-lg bg-background border border-surface-container" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Custo XP</label>
              <input type="number" value={editingItem.custoXP} onChange={e => setEditingItem({...editingItem, custoXP: Number(e.target.value)})} className="w-full p-2 rounded-lg bg-background border border-surface-container" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Custo Moedas</label>
              <input type="number" value={editingItem.custoMoedas} onChange={e => setEditingItem({...editingItem, custoMoedas: Number(e.target.value)})} className="w-full p-2 rounded-lg bg-background border border-surface-container" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-1">Ícone</label>
              <select value={editingItem.icone} onChange={e => setEditingItem({...editingItem, icone: e.target.value})} className="w-full p-2 rounded-lg bg-background border border-surface-container">
                {ICONS_LIST.map(ic => <option key={ic} value={ic}>{ic}</option>)}
              </select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-on-surface-variant mb-1">Cor (Tailwind)</label>
                <input type="text" value={editingItem.cor} onChange={e => setEditingItem({...editingItem, cor: e.target.value})} className="w-full p-2 rounded-lg bg-background border border-surface-container" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-on-surface-variant mb-1">BG (Tailwind)</label>
                <input type="text" value={editingItem.bg} onChange={e => setEditingItem({...editingItem, bg: e.target.value})} className="w-full p-2 rounded-lg bg-background border border-surface-container" />
              </div>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={editingItem.ativo} onChange={e => setEditingItem({...editingItem, ativo: e.target.checked})} className="w-4 h-4 rounded text-primary" />
              <label className="text-sm font-bold text-on-surface">Item Ativo no Mercado</label>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 rounded-xl text-on-surface-variant font-bold hover:bg-surface-container-high">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-container">Salvar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin text-primary"><ShoppingBag className="w-8 h-8" /></div></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const Icon = ICON_MAP[item.icone] || ShoppingBag;
            return (
              <div key={item.id} className={`bg-background rounded-2xl border ${item.ativo ? 'border-surface-container' : 'border-red-500/30'} p-5 hover:shadow-lg transition-shadow group flex flex-col`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${item.bg} ${item.cor} flex items-center justify-center shrink-0`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Tipo: {item.tipo}</div>
                    <h4 className="text-sm font-bold text-on-surface leading-tight">{item.nome}</h4>
                  </div>
                </div>
                <div className="text-xs text-on-surface-variant mb-4 flex-1">
                  {item.descricao}
                </div>
                <div className="flex items-center justify-between mb-4 text-xs font-bold">
                  <div className="flex gap-2">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">{item.custoXP} XP</span>
                    <span className="bg-amber-500/10 text-amber-600 px-2 py-1 rounded-md">{item.custoMoedas} Moedas</span>
                  </div>
                  {!item.ativo && <span className="text-red-500 text-[10px] uppercase">Inativo</span>}
                </div>
                <div className="flex items-center gap-2 pt-4 border-t border-surface-container">
                  <button onClick={() => setEditingItem(item)} className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors py-1">
                    <Edit2 className="w-3 h-3" /> Editar
                  </button>
                  <button onClick={() => item.id && handleDelete(item.id)} className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-on-surface-variant hover:text-red-500 transition-colors py-1">
                    <Trash2 className="w-3 h-3" /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
