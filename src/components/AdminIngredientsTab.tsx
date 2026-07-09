import React, { useState, useEffect } from 'react';
import { Search, Edit3, Trash2, Save, Database, Plus, RefreshCw, CheckCircle } from 'lucide-react';
import { ingredientAdminService, GlobalFoodItem } from '../infra/services/ingredientAdminService';

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

  useEffect(() => {
    fetchData();
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
      </div>

      <div className="bg-surface-container-lowest rounded-3xl border border-surface-container-high overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50 text-on-surface-variant text-sm border-b border-surface-container-high">
                <th className="px-6 py-4 font-bold">Nome / Origem</th>
                <th className="px-6 py-4 font-bold">Kcal | P | C | G (100g)</th>
                <th className="px-6 py-4 font-bold">Densidade (g/ml)</th>
                <th className="px-6 py-4 font-bold">Compra (Qtd | Und | R$)</th>
                <th className="px-6 py-4 font-bold text-right">Ações</th>
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
                  <td colSpan={5} className="px-6 py-12 text-center text-on-surface-variant">
                    Nenhum ingrediente encontrado.
                  </td>
                </tr>
              ) : (
                filteredIngredients.map(ing => (
                  <tr key={ing.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="px-6 py-4">
                      {editingId === ing.id ? (
                        <input 
                          type="text" 
                          value={editForm.name || ''} 
                          onChange={e => setEditForm({...editForm, name: e.target.value})}
                          className="w-full bg-surface-container p-2 rounded-xl border border-surface-container-high focus:ring-2 focus:ring-primary"
                        />
                      ) : (
                        <div>
                          <div className="font-bold text-on-surface">{ing.name}</div>
                          <div className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                            <Database className="w-3 h-3" />
                            <span className={ing.source === 'NOT_FOUND' ? 'text-red-500 font-bold' : ''}>{ing.source}</span>
                            {ing.externalId && ` (ID: ${ing.externalId})`}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === ing.id ? (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <input type="number" placeholder="Kcal" value={editForm.calories ?? ''} onChange={e => setEditForm({...editForm, calories: parseFloat(e.target.value)})} className="bg-surface-container p-1 rounded border-none focus:ring-1 focus:ring-primary" />
                          <input type="number" placeholder="Prot" value={editForm.protein ?? ''} onChange={e => setEditForm({...editForm, protein: parseFloat(e.target.value)})} className="bg-surface-container p-1 rounded border-none focus:ring-1 focus:ring-primary" />
                          <input type="number" placeholder="Carb" value={editForm.carbohydrates ?? ''} onChange={e => setEditForm({...editForm, carbohydrates: parseFloat(e.target.value)})} className="bg-surface-container p-1 rounded border-none focus:ring-1 focus:ring-primary" />
                          <input type="number" placeholder="Gord" value={editForm.lipids ?? ''} onChange={e => setEditForm({...editForm, lipids: parseFloat(e.target.value)})} className="bg-surface-container p-1 rounded border-none focus:ring-1 focus:ring-primary" />
                        </div>
                      ) : (
                        <div className="text-sm font-medium">
                          {ing.calories} <span className="text-on-surface-variant font-normal">|</span> {ing.protein} <span className="text-on-surface-variant font-normal">|</span> {ing.carbohydrates} <span className="text-on-surface-variant font-normal">|</span> {ing.lipids}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === ing.id ? (
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="Ex: 0.8"
                          value={editForm.density ?? ''} 
                          onChange={e => setEditForm({...editForm, density: e.target.value === '' ? null : parseFloat(e.target.value)})}
                          className="w-full bg-surface-container p-2 rounded-xl border-none focus:ring-2 focus:ring-primary text-sm"
                        />
                      ) : (
                        <div className="text-sm">
                          {ing.density ? (
                            <span className="bg-indigo-500/10 text-indigo-500 px-2 py-1 rounded-lg font-bold">{ing.density} g/ml</span>
                          ) : (
                            <span className="text-on-surface-variant/50">-</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingId === ing.id ? (
                        <div className="flex gap-2 text-xs">
                          <input type="number" placeholder="Qtd" value={editForm.standardPurchaseQuantity ?? ''} onChange={e => setEditForm({...editForm, standardPurchaseQuantity: e.target.value === '' ? null : parseFloat(e.target.value)})} className="w-16 bg-surface-container p-1 rounded border-none focus:ring-1 focus:ring-primary" />
                          <input type="text" placeholder="Und" value={editForm.standardPurchaseUnit ?? ''} onChange={e => setEditForm({...editForm, standardPurchaseUnit: e.target.value})} className="w-12 bg-surface-container p-1 rounded border-none focus:ring-1 focus:ring-primary" />
                          <input type="number" placeholder="R$" step="0.01" value={editForm.estimatedPrice ?? ''} onChange={e => setEditForm({...editForm, estimatedPrice: e.target.value === '' ? null : parseFloat(e.target.value)})} className="w-16 bg-surface-container p-1 rounded border-none focus:ring-1 focus:ring-primary" />
                        </div>
                      ) : (
                        <div className="text-sm text-on-surface-variant">
                          {ing.standardPurchaseQuantity ? `${ing.standardPurchaseQuantity} ` : ''}
                          {ing.standardPurchaseUnit ? `${ing.standardPurchaseUnit} ` : ''}
                          {ing.estimatedPrice ? `| R$ ${ing.estimatedPrice.toFixed(2)}` : ''}
                          {!ing.standardPurchaseQuantity && !ing.standardPurchaseUnit && !ing.estimatedPrice && '-'}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {editingId === ing.id ? (
                        <>
                          <button onClick={() => setEditingId(null)} className="text-on-surface-variant hover:text-on-surface text-sm">Cancelar</button>
                          <button onClick={handleSaveEdit} className="text-primary hover:text-primary/80"><Save className="w-5 h-5" /></button>
                        </>
                      ) : (
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
                      )}
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
    </div>
  );
}
