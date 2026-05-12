import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Shield, 
  Camera, 
  CheckCircle2, 
  ArrowLeft,
  Save,
  Loader2,
  X
} from 'lucide-react';
import { userService, UserProfile } from '../infra/services/userService';
import { MemberService } from '../infra/services/MemberService';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { uid: paramUid } = useParams<{ uid: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const targetUid = paramUid || user?.uid;
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    displayName: '',
    whatsapp: '',
    state: '',
    country: '',
    photoURL: '',
    role: 'member' as UserProfile['role']
  });

  const canEdit = user?.uid === targetUid || isAdmin;

  useEffect(() => {
    if (targetUid) {
      fetchProfile();
    }
  }, [targetUid]);

  const fetchProfile = async () => {
    try {
      const data = await userService.getUserProfile(targetUid!);
      if (data) {
        setProfile(data);
        setFormData({
          displayName: data.displayName || '',
          whatsapp: data.whatsapp || '',
          state: data.state || '',
          country: data.country || '',
          photoURL: data.photoURL || '',
          role: data.role || 'member'
        });
      }
    } catch (err) {
      setError('Falha ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
        },
        body: formDataUpload,
      });
      const data = await response.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, photoURL: data.imageUrl }));
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUid) return;

    setSaving(true);
    setError(null);

    try {
      // Se a role mudou e quem edita é Admin, usamos o MemberService para sincronizar claims
      if (isAdmin && formData.role !== profile.role) {
        await MemberService.updateMemberRole(targetUid, formData.role);
      }
      
      // Atualiza o restante do perfil
      await userService.updateUserProfile(targetUid, formData);
      
      setProfile(prev => prev ? { ...prev, ...formData } : null);
      setIsEditing(false);
    } catch (err) {
      setError('Falha ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <User className="w-16 h-16 text-on-surface-variant/20 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-on-surface mb-4">Perfil não encontrado</h1>
        <button onClick={() => navigate(-1)} className="text-primary font-bold">Voltar</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-6 pb-24 pt-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="bg-surface-container-lowest rounded-[3rem] shadow-2xl border border-surface-container-high overflow-hidden">
          {/* Header Banner */}
          <div className="h-48 bg-on-surface relative">
            <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
            <div className="absolute -bottom-16 left-12 flex items-end gap-6">
              <div className="relative group">
                <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-8 border-surface-container-lowest bg-surface-container-lowest shadow-xl relative">
                  <img 
                    src={formData.photoURL || 'https://via.placeholder.com/150'} 
                    alt={profile.displayName} 
                    className="w-full h-full object-cover"
                  />
                  {isEditing && (
                    <label className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm flex flex-col items-center justify-center text-background cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingImage ? (
                        <Loader2 className="w-8 h-8 animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 mb-2" />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Alterar</span>
                        </>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                    </label>
                  )}
                </div>
                {profile.role === 'admin' && (
                  <div className="absolute -top-2 -right-2 bg-primary text-white p-2 rounded-2xl shadow-lg border-4 border-surface-container-lowest">
                    <Shield className="w-5 h-5" />
                  </div>
                )}
              </div>
              <div className="mb-4">
                <h1 className="text-4xl font-bold text-on-surface tracking-tight leading-none mb-2">
                  {profile.displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`
                    px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest
                    ${profile.role === 'admin' ? 'bg-on-surface text-background' : 
                      profile.role === 'chef' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                      profile.role === 'collaborator' ? 'bg-emerald-100 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant'}
                  `}>
                    {profile.role === 'admin' ? 'Admin' : 
                     profile.role === 'chef' ? 'Chef' : 
                     profile.role === 'collaborator' ? 'Colaborador' : 'Membro'}
                  </span>
                  <span className="text-on-surface-variant text-sm font-medium flex items-center gap-1.5">
                    <Mail className="w-4 h-4" /> {profile.email}
                  </span>
                  {profile.internalEmail && (
                    <span className="text-secondary text-sm font-bold flex items-center gap-1.5 bg-secondary/5 px-3 py-1 rounded-full">
                      <Shield className="w-4 h-4" /> {profile.internalEmail}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-24 p-12">
            <div className="flex justify-between items-start mb-12">
              <div>
                <h2 className="text-2xl font-bold text-on-surface mb-2">Informações do Perfil</h2>
                <p className="text-on-surface-variant">Detalhes da sua identidade na Alquimia do Prato.</p>
              </div>
              {canEdit && !isEditing && (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-8 py-3 bg-on-surface text-background rounded-2xl font-bold hover:bg-on-surface-variant transition-all shadow-lg active:scale-95"
                >
                  Editar Perfil
                </button>
              )}
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm italic">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">Nome de Exibição</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
                    <input 
                      type="text"
                      disabled={!isEditing}
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
                    <input 
                      type="text"
                      disabled={!isEditing}
                      value={formData.whatsapp}
                      onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">Localização</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
                      <input 
                        type="text"
                        placeholder="Estado"
                        disabled={!isEditing}
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70"
                      />
                    </div>
                    <div className="relative">
                      <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
                      <input 
                        type="text"
                        placeholder="País"
                        disabled={!isEditing}
                        value={formData.country}
                        onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="p-6 bg-surface-container-low rounded-[2rem] border border-surface-container-high flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-secondary shrink-0 mt-1" />
                    <div>
                      <div className="font-bold text-on-surface">Membro Verificado</div>
                      <p className="text-sm text-on-surface-variant">Seu perfil é verificado e suas receitas são compartilhadas com a comunidade.</p>
                    </div>
                  </div>
                </div>

                {/* Box de Classificação como Chef (Admin Only) */}
                {isAdmin && isEditing && (
                  <div className="pt-6">
                    <div className="p-6 bg-amber-50 dark:bg-amber-950/20 rounded-[2rem] border border-amber-200 dark:border-amber-900/50">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-amber-600" />
                        <h3 className="text-sm font-black uppercase tracking-widest text-amber-900 dark:text-amber-400">
                          Configurações de Acesso
                        </h3>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-surface-container/50 rounded-2xl border border-amber-100/20">
                        <div>
                          <div className="font-bold text-on-surface flex items-center gap-2">
                            Classificar como Chef
                          </div>
                          <p className="text-xs text-on-surface-variant">Exibe o selo de Mestre Culinário no Lounge.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ 
                            ...prev, 
                            role: prev.role === 'chef' ? 'collaborator' : 'chef' 
                          }))}
                          className={`
                            w-12 h-6 rounded-full p-1 transition-colors
                            ${formData.role === 'chef' ? 'bg-amber-500' : 'bg-surface-container-high'}
                          `}
                        >
                          <div className={`
                            w-4 h-4 bg-white rounded-full transition-transform
                            ${formData.role === 'chef' ? 'translate-x-6' : 'translate-x-0'}
                          `} />
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, role: 'member' }))}
                          className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${formData.role === 'member' ? 'bg-on-surface text-background' : 'bg-surface-container-lowest border border-surface-container-high text-on-surface-variant'}`}
                        >
                          Membro
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, role: 'collaborator' }))}
                          className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${formData.role === 'collaborator' ? 'bg-emerald-500 text-white' : 'bg-surface-container-lowest border border-surface-container-high text-on-surface-variant'}`}
                        >
                          Colaborador
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <AnimatePresence>
                {isEditing && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="md:col-span-2 flex justify-end gap-4 mt-8"
                  >
                    <button 
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-8 py-4 text-on-surface-variant font-bold hover:text-on-surface transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      disabled={saving}
                      className="px-12 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all flex items-center gap-3 active:scale-95 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                      Salvar Alterações
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
