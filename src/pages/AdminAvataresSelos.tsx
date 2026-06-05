import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, Plus, Trash2, Image as ImageIcon, Shield, Award, Upload, ArrowUpDown, Search } from 'lucide-react';

export default function AdminAvataresSelos() {
  const [avatars, setAvatars] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [activeInnerTab, setActiveInnerTab] = useState<'avatars' | 'badges'>('avatars');

  // Ordenação da tabela de avatares
  const [sortField, setSortField] = useState<string>('codigoAvatar');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const sortedAvatars = useMemo(() => {
    const filtered = searchCode
      ? avatars.filter(a => a.codigoAvatar?.toLowerCase().includes(searchCode.toLowerCase()))
      : avatars;
    return [...filtered].sort((a, b) => {
      const valA = (a[sortField] || '').toString().toLowerCase();
      const valB = (b[sortField] || '').toString().toLowerCase();
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [avatars, sortField, sortDir, searchCode]);

  const SortIcon = ({ field }: { field: string }) => (
    <span className="inline-block ml-1 text-[10px] opacity-60">
      {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : ''}
    </span>
  );

  // Formulário Avatar
  const [newAvatar, setNewAvatar] = useState({
    tierMinimo: '1'
  });
  const [avatarImages, setAvatarImages] = useState<File[]>([]);

  // Formulário Selo
  const [newBadge, setNewBadge] = useState({
    codigo_evento: '',
    nome: '',
    descricao: ''
  });
  const [badgeImage, setBadgeImage] = useState<File | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {
        'x-api-key': import.meta.env.VITE_APP_API_KEY || ''
      };

      const [resAvatars, resBadges] = await Promise.all([
        fetch('/api/admin/avatars', { headers }),
        fetch('/api/admin/badges', { headers })
      ]);

      if (resAvatars.ok) setAvatars(await resAvatars.json());
      if (resBadges.ok) setBadges(await resBadges.json());
    } catch (err) {
      console.error('Error fetching avatars and badges:', err);
    }
    setLoading(false);
  };

  const handleCreateAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (avatarImages.length === 0) {
      alert("Selecione pelo menos uma imagem!");
      return;
    }

    try {
      let successCount = 0;
      for (let i = 0; i < avatarImages.length; i++) {
        const file = avatarImages[i];
        const formData = new FormData();
        const baseCode = `TIER${newAvatar.tierMinimo}`;
        const codigoGerado = `${baseCode}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        formData.append('codigoAvatar', codigoGerado);
        formData.append('tierMinimo', newAvatar.tierMinimo);
        formData.append('image', file);

        const res = await fetch('/api/admin/avatars', {
          method: 'POST',
          headers: { 'x-api-key': import.meta.env.VITE_APP_API_KEY || '' },
          body: formData
        });

        if (res.ok) {
          successCount++;
        }
      }

      if (successCount > 0) {
        alert(`${successCount} Avatar(es) criado(s) com sucesso!`);
        setAvatarImages([]);
        fetchData();
      } else {
        alert("Erro ao criar avatares.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao criar avatares.");
    }
  };

  const handleCreateBadge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!badgeImage) return alert("Selecione uma imagem!");

    try {
      const formData = new FormData();
      formData.append('codigo_evento', newBadge.codigo_evento);
      formData.append('nome', newBadge.nome);
      formData.append('descricao', newBadge.descricao);
      formData.append('image', badgeImage);

      const res = await fetch('/api/admin/badges', {
        method: 'POST',
        headers: { 'x-api-key': import.meta.env.VITE_APP_API_KEY || '' },
        body: formData
      });

      if (res.ok) {
        alert("Selo criado!");
        fetchData();
      } else {
        alert("Erro ao criar selo");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAvatar = async (id: string) => {
    if (!confirm("Deletar este avatar?")) return;
    try {
      await fetch(`/api/admin/avatars/${id}`, {
        method: 'DELETE',
        headers: { 'x-api-key': import.meta.env.VITE_APP_API_KEY || '' }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBadge = async (id: string) => {
    if (!confirm("Deletar este selo?")) return;
    try {
      await fetch(`/api/admin/badges/${id}`, {
        method: 'DELETE',
        headers: { 'x-api-key': import.meta.env.VITE_APP_API_KEY || '' }
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editingItemIdRef = useRef<{ id: string, type: 'avatar' | 'badge' } | null>(null);

  const handleEditImage = (id: string, type: 'avatar' | 'badge') => {
    editingItemIdRef.current = { id, type };
    editFileInputRef.current?.click();
  };

  const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const editingItem = editingItemIdRef.current;
    if (!file || !editingItem) return;

    // Reseta o input para permitir selecionar a mesma imagem novamente caso cancele
    if (editFileInputRef.current) editFileInputRef.current.value = '';

    setPopupState({
      isOpen: true,
      file,
      itemId: editingItem.id,
      type: editingItem.type,
      previewUrl: URL.createObjectURL(file),
      isUploading: false,
    });
  };

  const [popupState, setPopupState] = useState<{
    isOpen: boolean;
    file: File | null;
    itemId: string | null;
    type: 'avatar' | 'badge' | null;
    previewUrl: string | null;
    isUploading: boolean;
  }>({
    isOpen: false,
    file: null,
    itemId: null,
    type: null,
    previewUrl: null,
    isUploading: false,
  });

  const handleConfirmUpload = async () => {
    if (!popupState.file || !popupState.itemId || !popupState.type) return;

    setPopupState(prev => ({ ...prev, isUploading: true }));

    try {
      const formData = new FormData();
      formData.append('image', popupState.file);

      const endpoint = popupState.type === 'avatar' 
        ? `/api/admin/avatars/${popupState.itemId}`
        : `/api/admin/badges/${popupState.itemId}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'x-api-key': import.meta.env.VITE_APP_API_KEY || '' },
        body: formData
      });

      if (res.ok) {
        fetchData();
        handleCancelUpload();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Erro ao atualizar imagem: ${errData.error || res.statusText}`);
        setPopupState(prev => ({ ...prev, isUploading: false }));
      }
    } catch (err) {
      console.error(err);
      setPopupState(prev => ({ ...prev, isUploading: false }));
    }
  };

  const handleCancelUpload = () => {
    if (popupState.previewUrl) {
      URL.revokeObjectURL(popupState.previewUrl);
    }
    setPopupState({ isOpen: false, file: null, itemId: null, type: null, previewUrl: null, isUploading: false });
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-12">
      {/* Input oculto compartilhado para edição de imagens (avatares e selos) */}
      <input
        type="file"
        ref={editFileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageSelected}
      />
      
      {/* TABS INTERNAS */}
      <div className="flex gap-2 mb-6 bg-surface-container-high p-1.5 rounded-3xl w-fit">
        <button
          onClick={() => setActiveInnerTab('avatars')}
          className={`px-6 py-2 rounded-2xl font-bold text-sm transition-all ${activeInnerTab === 'avatars' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Cadastro de Avatares
        </button>
        <button
          onClick={() => setActiveInnerTab('badges')}
          className={`px-6 py-2 rounded-2xl font-bold text-sm transition-all ${activeInnerTab === 'badges' ? 'bg-amber-500 text-white shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Matriz de Interações para Conquista de Selos
        </button>
      </div>

      {/* SEÇÃO AVATARES */}
      {activeInnerTab === 'avatars' && (
      <section className="bg-surface-container rounded-3xl p-6 shadow-sm border border-surface-container-high">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2"><ImageIcon className="text-primary" /> UI de Cadastro de Avatares</h2>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              placeholder="Pesquisar código..."
              value={searchCode}
              onChange={e => setSearchCode(e.target.value)}
              className="pl-9 pr-3 py-2 rounded-lg bg-surface border border-outline text-sm outline-none focus:ring-2 focus:ring-primary w-48 font-mono"
            />
          </div>
        </div>
        
        <form onSubmit={handleCreateAvatar} className="flex flex-wrap items-center gap-3 mb-8 bg-surface-container-lowest p-3 rounded-xl border border-surface-container-high shadow-sm">
          <input 
            type="text" title="Código Gerado Automaticamente"
            value={`TIER${newAvatar.tierMinimo}_...`}
            readOnly
            className="flex-1 min-w-[150px] p-2 rounded-lg bg-surface border border-outline text-sm outline-none text-on-surface-variant font-mono cursor-not-allowed opacity-80"
          />
          <select value={newAvatar.tierMinimo} onChange={e => setNewAvatar({...newAvatar, tierMinimo: e.target.value})} className="p-2 rounded-lg bg-surface border border-outline text-sm">
            <option value="1">Nível 1 - Aprendiz</option>
            <option value="2">Nível 2 - Assistente</option>
            <option value="3">Nível 3 - Alquimista</option>
            <option value="4">Nível 4 - Perito</option>
            <option value="5">Nível 5 - Mestre</option>
          </select>
          
          <input type="file" accept="image/*" multiple onChange={e => setAvatarImages(Array.from(e.target.files || []))} className="w-56 p-1.5 text-sm bg-surface rounded-lg border border-outline" />
          <div className="text-xs text-on-surface-variant w-full -mt-2 ml-1">
            {avatarImages.length > 0 ? `${avatarImages.length} arquivo(s) selecionado(s)` : 'Nenhuma imagem selecionada'}
          </div>
          <button type="submit" className="bg-primary text-white font-bold rounded-lg px-4 py-2 hover:bg-primary-container flex items-center gap-2 text-sm shrink-0">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-outline bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low border-b border-outline text-xs uppercase font-black tracking-widest text-on-surface-variant">
              <tr>
                <th className="p-3 w-16 text-center">Imagem</th>
                <th className="p-3 cursor-pointer select-none hover:text-primary" onClick={() => toggleSort('codigoAvatar')}>Código Único<SortIcon field="codigoAvatar" /></th>
                <th className="p-3 cursor-pointer select-none hover:text-primary" onClick={() => toggleSort('tierMinimo')}>Nível (Tier) Liberado<SortIcon field="tierMinimo" /></th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {sortedAvatars.map(avatar => {
                const getNumericTier = (tier: string) => {
                  const map: Record<string, string> = { 'ini': '1', 'apr': '1', 'ast': '2', 'av': '3', 'alq': '3', 'per': '4', 'mes': '5' };
                  return map[tier.toLowerCase()] || tier;
                };
                const numericTier = getNumericTier(avatar.tierMinimo);

                return (
                  <tr key={avatar.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="p-3 text-center">
                      <div className="relative group w-10 h-10 mx-auto">
                        <img src={avatar.urlVercelBlob} alt={avatar.codigoAvatar} className="w-10 h-10 object-cover rounded-md border border-outline mx-auto" />
                        <button 
                          onClick={() => handleEditImage(avatar.id, 'avatar')}
                          className="absolute inset-0 bg-black/50 text-white rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3 font-mono font-bold text-on-surface">{avatar.codigoAvatar}</td>
                    <td className="p-3 uppercase text-xs font-black text-primary">Nível {numericTier}</td>
                    <td className="p-3 text-right flex items-center justify-end gap-1">
                      <button onClick={() => handleDeleteAvatar(avatar.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {avatars.length === 0 && <div className="p-6 text-center text-on-surface-variant">Nenhum avatar cadastrado no banco de dados.</div>}
        </div>
      </section>
      )}

      {/* SEÇÃO SELOS */}
      {activeInnerTab === 'badges' && (
      <section className="bg-surface-container rounded-3xl p-6 shadow-sm border border-surface-container-high">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Award className="text-amber-500" /> Matriz de Interações para Conquista de Selos</h2>
        
        <form onSubmit={handleCreateBadge} className="flex flex-wrap items-center gap-3 mb-8 bg-surface-container-lowest p-3 rounded-xl border border-surface-container-high shadow-sm">
          <input 
            type="text" placeholder="Código Evento" 
            value={newBadge.codigo_evento} onChange={e => setNewBadge({...newBadge, codigo_evento: e.target.value})}
            className="w-48 p-2 rounded-lg bg-surface border border-outline focus:ring-2 focus:ring-amber-500 text-sm outline-none" required
          />
          <input 
            type="text" placeholder="Nome do Selo" 
            value={newBadge.nome} onChange={e => setNewBadge({...newBadge, nome: e.target.value})}
            className="w-48 p-2 rounded-lg bg-surface border border-outline focus:ring-2 focus:ring-amber-500 text-sm outline-none" required
          />
          <input 
            type="text" placeholder="Descrição Opcional" 
            value={newBadge.descricao} onChange={e => setNewBadge({...newBadge, descricao: e.target.value})}
            className="flex-1 min-w-[200px] p-2 rounded-lg bg-surface border border-outline focus:ring-2 focus:ring-amber-500 text-sm outline-none"
          />
          
          <input type="file" accept="image/*" onChange={e => setBadgeImage(e.target.files?.[0] || null)} className="w-56 p-1.5 text-sm bg-surface rounded-lg border border-outline" required />
          <button type="submit" className="bg-amber-500 text-white font-bold rounded-lg px-4 py-2 hover:bg-amber-600 flex items-center gap-2 text-sm shrink-0">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-outline bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low border-b border-outline text-xs uppercase font-black tracking-widest text-on-surface-variant">
              <tr>
                <th className="p-3 w-16 text-center">Imagem</th>
                <th className="p-3">Nome do Selo</th>
                <th className="p-3">Código do Evento</th>
                <th className="p-3">Descrição</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {badges.map(badge => (
                <tr key={badge.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="p-3 text-center">
                    <div className="relative group w-10 h-10 mx-auto">
                      <img src={badge.url_vercel_blob} alt={badge.nome} className="w-10 h-10 object-cover rounded-full border border-outline bg-surface" />
                      <button 
                        onClick={() => handleEditImage(badge.id, 'badge')}
                        className="absolute inset-0 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Upload className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3 font-bold text-on-surface">{badge.nome}</td>
                  <td className="p-3 font-mono text-xs">{badge.codigo_evento}</td>
                  <td className="p-3 text-on-surface-variant max-w-xs truncate" title={badge.descricao}>{badge.descricao || '—'}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDeleteBadge(badge.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {badges.length === 0 && <div className="p-6 text-center text-on-surface-variant">Nenhum selo cadastrado no banco de dados.</div>}
        </div>
      </section>
      )}

      {/* POPUP DE CONFIRMAÇÃO DE IMAGEM */}
      {popupState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-surface-container-high animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 text-on-surface">Confirmar Nova Imagem</h3>
            {popupState.previewUrl && (
              <div className="relative mx-auto w-32 h-32 mb-4">
                <img 
                  src={popupState.previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover rounded-xl border-4 border-surface shadow-md" 
                />
                <div className="absolute inset-0 rounded-xl ring-2 ring-primary ring-offset-2 pointer-events-none"></div>
              </div>
            )}
            <p className="text-sm text-on-surface-variant mb-8">
              Você selecionou uma nova imagem para este {popupState.type === 'avatar' ? 'avatar' : 'selo'}. Deseja aplicar e salvar as alterações?
            </p>
            
            <div className="flex gap-3 justify-center">
              <button 
                type="button"
                onClick={handleCancelUpload}
                disabled={popupState.isUploading}
                className="px-6 py-2 rounded-xl text-on-surface-variant font-bold hover:bg-surface-container-high transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              
              <button 
                onClick={handleConfirmUpload}
                disabled={popupState.isUploading}
                className="px-6 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-container transition-colors flex items-center justify-center min-w-[140px] gap-2"
              >
                {popupState.isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {popupState.isUploading ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
