import React, { useState, useEffect } from 'react';
import { Search, Edit3, Trash2, Save, Database, Plus, RefreshCw, CheckCircle, Tag } from 'lucide-react';
import { ingredientAdminService, GlobalFoodItem } from '../infra/services/ingredientAdminService';

const CATEGORY_MAP: Record<string, string[]> = {
  "Mercearia (Secos e Molhados)": [
    "Mercearia Salgada (Básica)",
    "Enlatados e Conservas",
    "Condimentos e Molhos",
    "Mercearia Doce",
    "Matinais"
  ],
  "Perecíveis e Frescos": [
    "Hortifrúti (FLV)",
    "Padaria e Confeitaria"
  ],
  "Açougue": [
    "Carnes",
    "Linguiça",
    "Defumados"
  ],
  "Refrigerados": [
    "Embutidos",
    "Laticínios",
    "Frutos do mar"
  ],
  "Congelados": [
    "Pratos Prontos",
    "Vegetais Congelados",
    "Sorvetes e Sobremesas"
  ],
  "Bebidas": [
    "Não Alcoólicas",
    "Alcoólicas"
  ],
  "Saudáveis / Diet e Light": [
    "Alimentos Especiais"
  ]
};

export function AdminIngredientsTab() {
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'all'>('pending');
  const [ingredients, setIngredients] = useState<GlobalFoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<GlobalFoodItem>>({});

  // External Search state
  const [searchExternalModal, setSearchExternalModal] = useState<GlobalFoodItem | null>(null);
  const [externalResults, setExternalResults] = useState<any[]>([]);
  const [searchingExternal, setSearchingExternal] = useState(false);
  const [externalQuery, setExternalQuery] = useState('');

  // Merge state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [survivorId, setSurvivorId] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);

  // Create state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<GlobalFoodItem>>({
    name: '', calories: 0, protein: 0, carbohydrates: 0, lipids: 0, source: 'PROPRIETARIA', category: '', subcategory: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
    setSelectedIds(new Set());
  }, [activeSubTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'pending') {
        const data = await ingredientAdminService.getPendingIngredients();
        setIngredients(data);
      } else {
        const data = await ingredientAdminService.getAllIngredients();
        setIngredients(data);
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao carregar ingredientes');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (ing: GlobalFoodItem) => {
    setEditingId(ing.id);
    setEditForm(ing);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await ingredientAdminService.updateIngredient(editingId, editForm);
      setEditingId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir? Pode quebrar receitas.')) return;
    try {
      await ingredientAdminService.deleteIngredient(id);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir. O ingrediente pode estar em uso.');
    }
  };

  // Pareamento USDA
  const handleOpenSearchModal = (ing: GlobalFoodItem) => {
    setSearchExternalModal(ing);
    setExternalQuery(ing.name);
    setExternalResults([]);
  };

  const handleSearchExternal = async () => {
    if (!externalQuery) return;
    setSearchingExternal(true);
    try {
      const results = await ingredientAdminService.searchExternal(externalQuery);
      setExternalResults(results);
    } catch (err) {
      console.error(err);
      alert('Erro na busca USDA');
    } finally {
      setSearchingExternal(false);
    }
  };

  const handlePairIngredient = async (externalMatch: any) => {
    if (!searchExternalModal) return;
    try {
      await ingredientAdminService.updateIngredient(searchExternalModal.id, {
        source: externalMatch.source,
        externalId: externalMatch.id,
        calories: externalMatch.calories,
        protein: externalMatch.protein,
        carbohydrates: externalMatch.carbohydrates,
        lipids: externalMatch.lipids,
      });
      setSearchExternalModal(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao parear ingrediente');
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleExecuteMerge = async () => {
    if (!survivorId) {
      alert("Selecione o ingrediente mestre (que deve permanecer).");
      return;
    }
    const duplicateIds = Array.from(selectedIds).filter(id => id !== survivorId);
    if (duplicateIds.length === 0) {
      alert("É necessário pelo menos um ingrediente duplicado para mesclar.");
      return;
    }
    if (!confirm(`Tem certeza? As fichas técnicas apontarão para o ingrediente mestre escolhido e os demais (${duplicateIds.length}) serão EXCLUÍDOS permanentemente.`)) return;
    
    setMerging(true);
    try {
      await ingredientAdminService.mergeIngredients(survivorId, duplicateIds);
      setShowMergeModal(false);
      setSelectedIds(new Set());
      setSurvivorId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao mesclar ingredientes');
    } finally {
      setMerging(false);
    }
  };

  const handleCreateIngredient = async () => {
    if (!createForm.name) {
      alert("O nome do ingrediente é obrigatório.");
      return;
    }
    setCreating(true);
    try {
      await ingredientAdminService.createIngredient(createForm);
      setShowCreateModal(false);
      setCreateForm({ name: '', calories: 0, protein: 0, carbohydrates: 0, lipids: 0, source: 'PROPRIETARIA', category: '', subcategory: '' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao criar ingrediente');
    } finally {
      setCreating(false);
    }
  };

  const filteredIngredients = ingredients.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex bg-surface-container-low rounded-2xl p-1 shadow-inner">
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === 'pending' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Carteira de Avaliação ({activeSubTab === 'pending' ? filteredIngredients.length : '?'})
          </button>
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
              activeSubTab === 'all' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Base Proprietária
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Buscar ingrediente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-2xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary text-on-surface w-64"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-white px-4 py-2 rounded-2xl font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Novo Ingrediente
          </button>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white w-8 h-8 rounded-full flex items-center justify-center font-bold">
              {selectedIds.size}
            </div>
            <span className="text-on-surface font-medium">Ingredientes selecionados para Carteira de Avaliação</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 text-on-surface-variant hover:text-on-surface transition-colors font-medium text-sm"
            >
              Cancelar
            </button>
            <button 
              onClick={() => setShowMergeModal(true)}
              className="bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-primary/90 transition-colors text-sm shadow-md flex items-center gap-2"
            >
              <Database className="w-4 h-4" /> Avaliar Duplicatas (Mesclar)
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high overflow-hidden shadow-sm flex flex-col max-h-[60vh]">
        <div className="overflow-y-auto flex-1 relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 shadow-sm backdrop-blur-md bg-surface-container-low/95">
              <tr className="text-on-surface-variant text-sm border-b border-surface-container-high">
                <th className="px-4 py-4 w-12 text-center bg-surface-container-low/95">
                  {/* Título vazio para coluna de checkbox */}
                </th>
                <th className="px-6 py-4 font-bold bg-surface-container-low/95">Nome / Origem</th>
                <th className="px-6 py-4 font-bold bg-surface-container-low/95">Classificação</th>
                <th className="px-6 py-4 font-bold bg-surface-container-low/95">Kcal | P | C | G (100g)</th>
                <th className="px-6 py-4 font-bold bg-surface-container-low/95">Densidade (g/ml)</th>
                <th className="px-6 py-4 font-bold bg-surface-container-low/95">Compra (Qtd | Und | R$)</th>
                <th className="px-6 py-4 font-bold text-right bg-surface-container-low/95">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Carregando ingredientes...
                  </td>
                </tr>
              ) : filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant">
                    Nenhum ingrediente encontrado.
                  </td>
                </tr>
              ) : (
                filteredIngredients.map(ing => (
                  <tr key={ing.id} className={`hover:bg-surface-container-lowest transition-colors ${selectedIds.has(ing.id) ? 'bg-primary/5' : ''}`}>
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="checkbox"
                        checked={selectedIds.has(ing.id)}
                        onChange={() => handleToggleSelect(ing.id)}
                        className="w-4 h-4 rounded text-primary focus:ring-primary border-surface-container-high cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-bold text-on-surface">{ing.name}</div>
                        <div className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                          <Database className="w-3 h-3" />
                          <span className={ing.source === 'NOT_FOUND' ? 'text-red-500 font-bold' : ''}>{ing.source}</span>
                          {ing.externalId && ` (ID: ${ing.externalId})`}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {ing.category || ing.subcategory ? (
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-on-surface">{ing.category || '-'}</span>
                          <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {ing.subcategory || '-'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant/50">Sem classificação</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium">
                        {ing.calories} <span className="text-on-surface-variant font-normal">|</span> {ing.protein} <span className="text-on-surface-variant font-normal">|</span> {ing.carbohydrates} <span className="text-on-surface-variant font-normal">|</span> {ing.lipids}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {ing.density ? (
                          <span className="bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-lg font-bold">{ing.density} g/ml</span>
                        ) : (
                          <span className="text-on-surface-variant/50">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-on-surface-variant">
                        {ing.standardPurchaseQuantity ? `${ing.standardPurchaseQuantity} ` : ''}
                        {ing.standardPurchaseUnit ? `${ing.standardPurchaseUnit} ` : ''}
                        {ing.estimatedPrice ? `| R$ ${ing.estimatedPrice.toFixed(2)}` : ''}
                        {!ing.standardPurchaseQuantity && !ing.standardPurchaseUnit && !ing.estimatedPrice && '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <>
                          {ing.source === 'NOT_FOUND' && (
                            <button 
                              onClick={() => handleOpenSearchModal(ing)}
                              className="text-amber-500 hover:text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                            >
                              <Database className="w-3 h-3" /> Parear USDA
                            </button>
                          )}
                          <button onClick={() => handleEditClick(ing)} className="p-2 text-on-surface-variant hover:text-primary transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(ing.id)} className="p-2 text-on-surface-variant hover:text-red-500 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pareamento USDA Modal */}
      {searchExternalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-3xl rounded-[2rem] border border-surface-container-high shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-surface-container-high flex justify-between items-center bg-surface-container-low/30">
              <div>
                <h3 className="text-xl font-black text-on-surface">Pareamento USDA</h3>
                <p className="text-sm text-on-surface-variant">
                  Buscando correspondência para o ingrediente órfão: <span className="font-bold text-amber-500">{searchExternalModal.name}</span>
                </p>
              </div>
              <button 
                onClick={() => setSearchExternalModal(null)}
                className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 border-b border-surface-container-high flex gap-3 bg-surface-container-lowest">
              <input 
                type="text" 
                value={externalQuery}
                onChange={e => setExternalQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearchExternal()}
                placeholder="Ex: Chicken breast, Rice..."
                className="flex-1 bg-surface-container p-4 rounded-2xl border-none focus:ring-2 focus:ring-primary text-on-surface font-medium"
              />
              <button 
                onClick={handleSearchExternal}
                disabled={searchingExternal}
                className="bg-primary text-white px-8 py-4 rounded-2xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {searchingExternal ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                Buscar
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {searchingExternal ? (
                <div className="flex justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-primary" /></div>
              ) : externalResults.length > 0 ? (
                <div className="space-y-4">
                  {externalResults.map((res, idx) => (
                    <div key={idx} className="bg-surface-container-low p-5 rounded-2xl border border-surface-container-high flex justify-between items-center hover:border-primary/50 transition-colors">
                      <div>
                        <h4 className="font-bold text-on-surface">{res.name}</h4>
                        <div className="text-xs text-on-surface-variant mt-1 flex gap-4">
                          <span>Kcal: {res.calories}</span>
                          <span>Prot: {res.protein}g</span>
                          <span>Carb: {res.carbohydrates}g</span>
                          <span>Gord: {res.lipids}g</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => handlePairIngredient(res)}
                        className="bg-primary/10 text-primary px-4 py-2 rounded-xl font-bold hover:bg-primary hover:text-white transition-colors flex items-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Vincular
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-on-surface-variant">
                  {externalQuery ? 'Nenhum resultado encontrado na USDA para essa busca.' : 'Digite um termo em inglês e clique em Buscar.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-surface-container-high flex justify-between items-center bg-surface-container-low">
              <div>
                <h3 className="text-xl font-black text-on-surface flex items-center gap-2">
                  <Database className="text-primary w-6 h-6" /> Carteira de Avaliação: Mesclar Ingredientes
                </h3>
                <p className="text-sm text-on-surface-variant mt-1">
                  Selecione qual ingrediente deve <strong>permanecer</strong>. Os demais serão excluídos e as fichas técnicas serão atualizadas automaticamente para apontar para o ingrediente escolhido.
                </p>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {ingredients.filter(ing => selectedIds.has(ing.id)).map(ing => (
                <label 
                  key={ing.id} 
                  className={`flex items-start gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${survivorId === ing.id ? 'border-primary bg-primary/5' : 'border-surface-container-high hover:border-primary/30 bg-surface-container-low'}`}
                >
                  <input 
                    type="radio" 
                    name="survivor" 
                    value={ing.id} 
                    checked={survivorId === ing.id}
                    onChange={() => setSurvivorId(ing.id)}
                    className="mt-1 w-5 h-5 text-primary focus:ring-primary border-surface-container-high"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-on-surface text-lg">{ing.name}</div>
                    <div className="text-sm text-on-surface-variant flex gap-4 mt-1">
                      <span>Origem: {ing.source}</span>
                      <span>Kcal: {ing.calories}</span>
                      <span>Prot: {ing.protein}g</span>
                      <span>ID: {ing.id.split('-')[0]}...</span>
                    </div>
                  </div>
                  {survivorId === ing.id && (
                    <div className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Mestre
                    </div>
                  )}
                </label>
              ))}
            </div>

            <div className="p-6 border-t border-surface-container-high flex justify-end gap-3 bg-surface-container-low">
              <button 
                onClick={() => { setShowMergeModal(false); setSurvivorId(null); }}
                className="px-6 py-3 font-bold text-on-surface-variant hover:text-on-surface transition-colors"
                disabled={merging}
              >
                Cancelar
              </button>
              <button 
                onClick={handleExecuteMerge}
                disabled={merging || !survivorId}
                className="bg-primary text-white px-8 py-3 rounded-2xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {merging ? (
                  <><RefreshCw className="w-5 h-5 animate-spin" /> Mesclando e atualizando receitas...</>
                ) : (
                  <><Save className="w-5 h-5" /> Mesclar Fichas e Excluir Duplicatas</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-[2rem] border border-surface-container-high shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-surface-container-high flex justify-between items-center bg-surface-container-low/30">
              <h3 className="text-xl font-black text-on-surface">Novo Ingrediente</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-1">Nome do Ingrediente *</label>
                <input 
                  type="text" 
                  value={createForm.name || ''} 
                  onChange={e => setCreateForm({...createForm, name: e.target.value})}
                  className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface"
                  placeholder="Ex: Farinha de Trigo Especial"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-1">Departamento (Categoria)</label>
                  <select
                    value={createForm.category || ''}
                    onChange={e => setCreateForm({...createForm, category: e.target.value, subcategory: ''})}
                    className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface text-sm"
                  >
                    <option value="">Selecione um departamento...</option>
                    {Object.keys(CATEGORY_MAP).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-1">Setor (Subcategoria)</label>
                  <select
                    value={createForm.subcategory || ''}
                    onChange={e => setCreateForm({...createForm, subcategory: e.target.value})}
                    disabled={!createForm.category}
                    className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface text-sm disabled:opacity-50"
                  >
                    <option value="">Selecione um setor...</option>
                    {createForm.category && CATEGORY_MAP[createForm.category]?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Kcal (100g)</label>
                  <input type="number" value={createForm.calories ?? ''} onChange={e => setCreateForm({...createForm, calories: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Proteínas (g)</label>
                  <input type="number" value={createForm.protein ?? ''} onChange={e => setCreateForm({...createForm, protein: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Carboidratos (g)</label>
                  <input type="number" value={createForm.carbohydrates ?? ''} onChange={e => setCreateForm({...createForm, carbohydrates: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Gorduras (g)</label>
                  <input type="number" value={createForm.lipids ?? ''} onChange={e => setCreateForm({...createForm, lipids: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-surface-container-high">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Densidade (g/ml)</label>
                  <input type="number" step="0.01" value={createForm.density ?? ''} onChange={e => setCreateForm({...createForm, density: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" placeholder="Opcional. Ex: 0.92 para óleo" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-surface-container-high">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Qtd. Compra</label>
                  <input type="number" step="0.01" value={createForm.standardPurchaseQuantity ?? ''} onChange={e => setCreateForm({...createForm, standardPurchaseQuantity: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" placeholder="Ex: 5" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Un. Compra</label>
                  <select 
                    value={createForm.standardPurchaseUnit ?? ''} 
                    onChange={e => setCreateForm({...createForm, standardPurchaseUnit: e.target.value})} 
                    className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione...</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">L</option>
                    <option value="ml">ml</option>
                    <option value="un">un</option>
                    <option value="dz">dz</option>
                    <option value="pct">pct</option>
                    <option value="cx">cx</option>
                    <option value="lata">lata</option>
                    <option value="mç">mç</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Preço (R$)</label>
                  <input type="number" step="0.01" value={createForm.estimatedPrice ?? ''} onChange={e => setCreateForm({...createForm, estimatedPrice: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" placeholder="Ex: 24.90" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-surface-container-high bg-surface-container-low/30 flex justify-end gap-3">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-3 rounded-xl text-on-surface-variant hover:text-on-surface font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateIngredient}
                disabled={creating}
                className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {creating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                Salvar Ingrediente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-[2rem] border border-surface-container-high shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-surface-container-high flex justify-between items-center bg-surface-container-low/30">
              <h3 className="text-xl font-black text-on-surface flex items-center gap-2"><Edit3 className="w-5 h-5 text-primary" /> Editar Ingrediente</h3>
              <button 
                onClick={() => setEditingId(null)}
                className="w-10 h-10 rounded-xl bg-surface-container hover:bg-surface-container-high flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-sm font-bold text-on-surface-variant mb-1">Nome do Ingrediente *</label>
                <input 
                  type="text" 
                  value={editForm.name || ''} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-1">Departamento (Categoria)</label>
                  <select
                    value={editForm.category || ''}
                    onChange={e => setEditForm({...editForm, category: e.target.value, subcategory: ''})}
                    className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface text-sm"
                  >
                    <option value="">Selecione um departamento...</option>
                    {Object.keys(CATEGORY_MAP).map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-on-surface-variant mb-1">Setor (Subcategoria)</label>
                  <select
                    value={editForm.subcategory || ''}
                    onChange={e => setEditForm({...editForm, subcategory: e.target.value})}
                    disabled={!editForm.category}
                    className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface text-sm disabled:opacity-50"
                  >
                    <option value="">Selecione um setor...</option>
                    {editForm.category && CATEGORY_MAP[editForm.category]?.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Kcal (100g)</label>
                  <input type="number" value={editForm.calories ?? ''} onChange={e => setEditForm({...editForm, calories: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Proteínas (g)</label>
                  <input type="number" value={editForm.protein ?? ''} onChange={e => setEditForm({...editForm, protein: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Carboidratos (g)</label>
                  <input type="number" value={editForm.carbohydrates ?? ''} onChange={e => setEditForm({...editForm, carbohydrates: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Gorduras (g)</label>
                  <input type="number" value={editForm.lipids ?? ''} onChange={e => setEditForm({...editForm, lipids: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-surface-container-high">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Densidade (g/ml)</label>
                  <input type="number" step="0.01" value={editForm.density ?? ''} onChange={e => setEditForm({...editForm, density: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" placeholder="Opcional" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-surface-container-high">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Qtd. Compra</label>
                  <input type="number" step="0.01" value={editForm.standardPurchaseQuantity ?? ''} onChange={e => setEditForm({...editForm, standardPurchaseQuantity: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Un. Compra</label>
                  <select 
                    value={editForm.standardPurchaseUnit ?? ''} 
                    onChange={e => setEditForm({...editForm, standardPurchaseUnit: e.target.value})} 
                    className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Selecione...</option>
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">L</option>
                    <option value="ml">ml</option>
                    <option value="un">un</option>
                    <option value="dz">dz</option>
                    <option value="pct">pct</option>
                    <option value="cx">cx</option>
                    <option value="lata">lata</option>
                    <option value="mç">mç</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant mb-1">Preço (R$)</label>
                  <input type="number" step="0.01" value={editForm.estimatedPrice ?? ''} onChange={e => setEditForm({...editForm, estimatedPrice: parseFloat(e.target.value)})} className="w-full bg-surface-container p-3 rounded-xl border-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-surface-container-high bg-surface-container-low/30 flex justify-end gap-3">
              <button 
                onClick={() => setEditingId(null)}
                className="px-6 py-3 rounded-xl text-on-surface-variant hover:text-on-surface font-bold transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveEdit}
                className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" /> Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
