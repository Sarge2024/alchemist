import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Plus, Trash2, Image as ImageIcon, Shield, Award, Upload } from 'lucide-react';

export default function AdminAvataresSelos() {
  const [avatars, setAvatars] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulário Avatar
  const [newAvatar, setNewAvatar] = useState({
    genero: 'm',
    faixaEtaria: 'ad',
    tomPele: 'pa',
    tierMinimo: 'ini'
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
      const codigoGerado = `av_${newAvatar.genero}_${newAvatar.faixaEtaria}_${newAvatar.tomPele}_${newAvatar.tierMinimo}`;
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
  const [editingAvatarId, setEditingAvatarId] = useState<string | null>(null);

  const handleEditAvatarImage = (id: string) => {
    setEditingAvatarId(id);
    editFileInputRef.current?.click();
  };

  const handleAvatarImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingAvatarId) return;

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await fetch(`/api/admin/avatars/${editingAvatarId}`, {
        method: 'PUT',
        headers: { 'x-api-key': import.meta.env.VITE_APP_API_KEY || '' },
        body: formData
      });

      if (res.ok) {
        fetchData();
      } else {
        alert('Erro ao atualizar imagem do avatar');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEditingAvatarId(null);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
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
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><ImageIcon className="text-primary" /> Gestão de Avatares</h2>
        
        <form onSubmit={handleCreateAvatar} className="flex flex-wrap items-center gap-3 mb-8 bg-surface-container-lowest p-3 rounded-xl border border-surface-container-high shadow-sm">
          <input 
            type="text" title="Código Gerado Automaticamente"
            value={`av_${newAvatar.genero}_${newAvatar.faixaEtaria}_${newAvatar.tomPele}_${newAvatar.tierMinimo}`}
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
            <option value="ini">Iniciante</option>
            <option value="av">Avançado</option>
            <option value="mes">Mestre</option>
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
                <th className="p-3">Código</th>
                <th className="p-3">Gênero</th>
                <th className="p-3">Idade</th>
                <th className="p-3">Pele</th>
                <th className="p-3">Tier</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline">
              {avatars.map(avatar => (
                <tr key={avatar.id} className="hover:bg-surface-container-lowest transition-colors">
                  <td className="p-3 text-center">
                    <img src={avatar.urlVercelBlob} alt={avatar.codigoAvatar} className="w-10 h-10 object-cover rounded-md border border-outline mx-auto" />
                  </td>
                  <td className="p-3 font-mono font-bold text-on-surface">{avatar.codigoAvatar}</td>
                  <td className="p-3 uppercase text-xs font-semibold">{avatar.genero}</td>
                  <td className="p-3 uppercase text-xs font-semibold">{avatar.faixaEtaria}</td>
                  <td className="p-3 uppercase text-xs font-semibold">{avatar.tomPele}</td>
                  <td className="p-3 uppercase text-xs font-black text-primary">{avatar.tierMinimo}</td>
                  <td className="p-3 text-right flex items-center justify-end gap-1">
                    <button onClick={() => handleEditAvatarImage(avatar.id)} title="Enviar imagem" className="p-2 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors">
                      <Upload className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteAvatar(avatar.id)} className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
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

    </div>
  );
}
