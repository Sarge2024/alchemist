import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, Plus, Trash2, Image as ImageIcon, Shield, Award, Upload, ArrowUpDown, Search } from 'lucide-react';

export default function AdminAvataresSelos() {
  const [avatars, setAvatars] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');

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
    genero: 'h',
    faixaEtaria: 'jo',
    tomPele: 'cl',
    tierMinimo: '1'
  });
  const [avatarImage, setAvatarImage] = useState<File | null>(null);

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

    try {
      const formData = new FormData();
      const codigoGerado = `${newAvatar.genero[0]}${newAvatar.faixaEtaria[0]}${newAvatar.tomPele[0]}${newAvatar.tierMinimo[0]}`.toUpperCase();
      formData.append('codigoAvatar', codigoGerado);
      formData.append('genero', newAvatar.genero);
      formData.append('faixaEtaria', newAvatar.faixaEtaria);
      formData.append('tomPele', newAvatar.tomPele);
      formData.append('tierMinimo', newAvatar.tierMinimo);
      if (avatarImage) formData.append('image', avatarImage);

      const res = await fetch('/api/admin/avatars', {
        method: 'POST',
        headers: { 'x-api-key': import.meta.env.VITE_APP_API_KEY || '' },
        body: formData
      });

      if (res.ok) {
        alert("Avatar criado!");
        fetchData();
      } else {
        alert("Erro ao criar avatar");
      }
    } catch (err) {
      console.error(err);
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
  const editingAvatarIdRef = useRef<string | null>(null);

  const handleEditAvatarImage = (id: string) => {
    editingAvatarIdRef.current = id;
    editFileInputRef.current?.click();
  };

  const handleAvatarImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const editingAvatarId = editingAvatarIdRef.current;
    if (!file || !editingAvatarId) return;

    // Reseta o input para permitir selecionar a mesma imagem novamente caso cancele
    if (editFileInputRef.current) editFileInputRef.current.value = '';

    setAvatarPopupState({
      isOpen: true,
      file,
      avatarId: editingAvatarId,
      previewUrl: URL.createObjectURL(file),
      isUploading: false,
    });
  };

  const [avatarPopupState, setAvatarPopupState] = useState<{
    isOpen: boolean;
    file: File | null;
    avatarId: string | null;
    previewUrl: string | null;
    isUploading: boolean;
  }>({
    isOpen: false,
    file: null,
    avatarId: null,
    previewUrl: null,
    isUploading: false,
  });

  const handleConfirmAvatarUpload = async () => {
    if (!avatarPopupState.file || !avatarPopupState.avatarId) return;

    setAvatarPopupState(prev => ({ ...prev, isUploading: true }));

    try {
      const formData = new FormData();
      formData.append('image', avatarPopupState.file);

      const res = await fetch(`/api/admin/avatars/${avatarPopupState.avatarId}`, {
        method: 'PUT',
        headers: { 'x-api-key': import.meta.env.VITE_APP_API_KEY || '' },
        body: formData
      });

      if (res.ok) {
        fetchData();
        handleCancelAvatarUpload();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Erro ao atualizar imagem: ${errData.error || res.statusText}`);
        setAvatarPopupState(prev => ({ ...prev, isUploading: false }));
      }
    } catch (err) {
      console.error(err);
      setAvatarPopupState(prev => ({ ...prev, isUploading: false }));
    }
  };

  const handleCancelAvatarUpload = () => {
    if (avatarPopupState.previewUrl) {
      URL.revokeObjectURL(avatarPopupState.previewUrl);
    }
    setAvatarPopupState({ isOpen: false, file: null, avatarId: null, previewUrl: null, isUploading: false });
    editingAvatarIdRef.current = null;
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-12">
      {/* Input file oculto para edição de avatar */}
      <input
        ref={editFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarImageSelected}
      />
      
      {/* SEÇÃO AVATARES */}
      <section className="bg-surface-container rounded-3xl p-6 shadow-sm border border-surface-container-high">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2"><ImageIcon className="text-primary" /> Gestão de Avatares</h2>
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
            value={`${newAvatar.genero[0]}${newAvatar.faixaEtaria[0]}${newAvatar.tomPele[0]}${newAvatar.tierMinimo[0]}`.toUpperCase()}
            readOnly
            className="flex-1 min-w-[150px] p-2 rounded-lg bg-surface border border-outline text-sm outline-none text-on-surface-variant font-mono cursor-not-allowed opacity-80"
          />
          <select value={newAvatar.genero} onChange={e => setNewAvatar({...newAvatar, genero: e.target.value})} className="p-2 rounded-lg bg-surface border border-outline text-sm">
            <option value="m">Masc</option>
            <option value="f">Fem</option>
          </select>
          <select value={newAvatar.faixaEtaria} onChange={e => setNewAvatar({...newAvatar, faixaEtaria: e.target.value})} className="p-2 rounded-lg bg-surface border border-outline text-sm">
            <option value="jo">Jovem</option>
            <option value="ad">Adulto</option>
            <option value="id">Idoso</option>
          </select>
          <select value={newAvatar.tomPele} onChange={e => setNewAvatar({...newAvatar, tomPele: e.target.value})} className="p-2 rounded-lg bg-surface border border-outline text-sm">
            <option value="cl">Clara</option>
            <option value="pa">Parda</option>
            <option value="es">Escura</option>
          </select>
          <select value={newAvatar.tierMinimo} onChange={e => setNewAvatar({...newAvatar, tierMinimo: e.target.value})} className="p-2 rounded-lg bg-surface border border-outline text-sm">
            <option value="1">Aprendiz</option>
            <option value="2">Assistente</option>
            <option value="3">Alquimista</option>
            <option value="4">Perito</option>
            <option value="5">Mestre Alquimista</option>
          </select>
          
          <input type="file" accept="image/*" onChange={e => setAvatarImage(e.target.files?.[0] || null)} className="w-56 p-1.5 text-sm bg-surface rounded-lg border border-outline" />
          <button type="submit" className="bg-primary text-white font-bold rounded-lg px-4 py-2 hover:bg-primary-container flex items-center gap-2 text-sm shrink-0">
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-outline bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-low border-b border-outline text-xs uppercase font-black tracking-widest text-on-surface-variant">
              <tr>
                <th className="p-3 w-16 text-center">Imagem</th>
                <th className="p-3 cursor-pointer select-none hover:text-primary" onClick={() => toggleSort('codigoAvatar')}>Código<SortIcon field="codigoAvatar" /></th>
                <th className="p-3 cursor-pointer select-none hover:text-primary" onClick={() => toggleSort('genero')}>Gênero<SortIcon field="genero" /></th>
                <th className="p-3 cursor-pointer select-none hover:text-primary" onClick={() => toggleSort('faixaEtaria')}>Idade<SortIcon field="faixaEtaria" /></th>
                <th className="p-3 cursor-pointer select-none hover:text-primary" onClick={() => toggleSort('tomPele')}>Pele<SortIcon field="tomPele" /></th>
                <th className="p-3 cursor-pointer select-none hover:text-primary" onClick={() => toggleSort('tierMinimo')}>Tier<SortIcon field="tierMinimo" /></th>
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
                const displayCode = avatar.codigoAvatar.length === 4 
                  ? avatar.codigoAvatar.substring(0, 3) + numericTier 
                  : avatar.codigoAvatar;

                return (
                  <tr key={avatar.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="p-3 text-center">
                      <img src={avatar.urlVercelBlob} alt={displayCode} className="w-10 h-10 object-cover rounded-md border border-outline mx-auto" />
                    </td>
                    <td className="p-3 font-mono font-bold text-on-surface">{displayCode}</td>
                    <td className="p-3 uppercase text-xs font-semibold">{avatar.genero}</td>
                    <td className="p-3 uppercase text-xs font-semibold">{avatar.faixaEtaria}</td>
                    <td className="p-3 uppercase text-xs font-semibold">{avatar.tomPele}</td>
                    <td className="p-3 uppercase text-xs font-black text-primary text-center">{numericTier}</td>
                    <td className="p-3 text-right flex items-center justify-end gap-1">
                      <button onClick={() => handleEditAvatarImage(avatar.id)} title="Enviar imagem" className="p-2 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors">
                        <Upload className="w-4 h-4" />
                      </button>
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

      {/* SEÇÃO SELOS */}
      <section className="bg-surface-container rounded-3xl p-6 shadow-sm border border-surface-container-high">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Award className="text-amber-500" /> Gestão de Selos (Gamificação)</h2>
        
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
                    <img src={badge.url_vercel_blob} alt={badge.nome} className="w-10 h-10 object-cover rounded-full border border-outline mx-auto" />
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

      {/* POPUP DE CONFIRMAÇÃO DE IMAGEM */}
      {avatarPopupState.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-surface p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center border border-surface-container-high animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold mb-4 text-on-surface">Confirmar Nova Imagem</h3>
            {avatarPopupState.previewUrl && (
              <div className="relative mx-auto w-32 h-32 mb-4">
                <img 
                  src={avatarPopupState.previewUrl} 
                  alt="Preview" 
                  className="w-full h-full object-cover rounded-xl border-4 border-surface shadow-md" 
                />
                <div className="absolute inset-0 rounded-xl ring-2 ring-primary ring-offset-2 pointer-events-none"></div>
              </div>
            )}
            <p className="text-sm text-on-surface-variant mb-8">
              Você selecionou uma nova imagem para este avatar. Deseja aplicar e salvar as alterações?
            </p>
            
            <div className="flex gap-3 justify-center">
              <button 
                type="button"
                onClick={handleCancelAvatarUpload}
                disabled={avatarPopupState.isUploading}
                className="flex-1 py-2.5 rounded-xl font-bold text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                type="button"
                onClick={handleConfirmAvatarUpload}
                disabled={avatarPopupState.isUploading}
                className="flex-1 py-2.5 rounded-xl font-bold bg-primary text-white hover:bg-primary-container transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-sm"
              >
                {avatarPopupState.isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {avatarPopupState.isUploading ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
