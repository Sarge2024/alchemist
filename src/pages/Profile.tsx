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
  X,
  Trophy,
  Star,
  Award
} from 'lucide-react';
import { userService, UserProfile } from '../infra/services/userService';
import { MemberService } from '../infra/services/MemberService';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { supabase } from '../lib/supabase';
import { AvatarSelector, AvatarOptionData } from '../components/AvatarSelector';
import { LevelUpPopup } from '../components/LevelUpPopup';

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
  const [gamification, setGamification] = useState<any>(null);
  const [avatarsList, setAvatarsList] = useState<AvatarOptionData[]>([]);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showLevelUpPopup, setShowLevelUpPopup] = useState(false);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(0);
  
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
      fetchAvatars();
    }
  }, [targetUid]);

  const fetchAvatars = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: any = {
        'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/avatars/${targetUid}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAvatarsList(data.avatars);
        }
      }
    } catch (err) {
      console.error('Error fetching avatars:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      let data = await userService.getUserProfile(targetUid!);
      
      // Fallback: se não achar no Firestore (banco antigo), mas for o usuário logado (novo Supabase)
      if (!data && targetUid === user?.uid) {
        data = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Alquimista',
          photoURL: user.photoURL || '',
          state: '',
          country: '',
          role: 'member'
        };
      }

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

      // Buscar perfil de Gamificação no Postgres (Prisma)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers: any = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const gRes = await fetch(`/api/gamification/profile/${targetUid}`, { headers });
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.success) {
            setGamification(gData.profile);
            
            if (user?.uid === targetUid) {
              const storedLevelStr = localStorage.getItem(`gamification_level_${user.uid}`);
              const storedLevel = storedLevelStr ? parseInt(storedLevelStr, 10) : gData.profile.level;
              
              if (gData.profile.level > storedLevel) {
                setUnlockedLevel(gData.profile.level);
                setShowLevelUpPopup(true);
              }
              
              if (!storedLevelStr) {
                localStorage.setItem(`gamification_level_${user.uid}`, gData.profile.level.toString());
              }
            }
          }
        }
      } catch (gErr) {
        console.error('Gamification fetch error:', gErr);
      }

    } catch (err) {
      setError('Falha ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseLevelUpPopup = () => {
    setShowLevelUpPopup(false);
    if (user?.uid && gamification) {
      localStorage.setItem(`gamification_level_${user.uid}`, gamification.level.toString());
    }
  };

  const handleChooseNewAvatar = () => {
    handleCloseLevelUpPopup();
    setIsEditing(true);
    setShowAvatarSelector(true);
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

      // Se o usuário estiver editando o próprio perfil, atualiza os dados centralizados no Supabase (AuthContext)
      if (user?.uid === targetUid) {
        await supabase.auth.updateUser({
          data: {
            avatar_url: formData.photoURL,
            full_name: formData.displayName
          }
        });
      }
      
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
    <div className="max-w-6xl mx-auto px-6 pb-24 pt-8 md:pt-12">
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
          {/* Header Banner - Premium Design */}
          <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-on-surface">
            {/* Cover Gradient & Texture */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-secondary/80 mix-blend-multiply" />
            <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/food.png')]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface-container-lowest to-transparent" />
          </div>

          <div className="px-6 sm:px-12 pb-12 relative -mt-20 sm:-mt-24">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start sm:items-end">
              {/* Avatar Container */}
              <div className="relative group shrink-0">
                <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-8 border-surface-container-lowest bg-surface-container-lowest shadow-2xl relative transition-transform duration-300 hover:scale-105">
                  <Avatar 
                    src={formData.photoURL} 
                    alt={profile.displayName} 
                    size="xl"
                    className="w-full h-full object-cover"
                  />
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={() => setShowAvatarSelector(true)}
                      className="absolute inset-0 bg-on-surface/50 backdrop-blur-md flex flex-col items-center justify-center text-background cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300 border-none outline-none"
                    >
                      <Camera className="w-8 h-8 mb-2 drop-shadow-md" />
                      <span className="text-[10px] font-black uppercase tracking-widest drop-shadow-md">Alterar Avatar</span>
                    </button>
                  )}
                </div>
                {profile.role === 'admin' && (
                  <div className="absolute -top-2 -right-2 bg-primary text-white p-2 sm:p-2.5 rounded-2xl shadow-xl border-4 border-surface-container-lowest">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                )}
              </div>

              <AnimatePresence>
                {showAvatarSelector && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                  >
                    <motion.div
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.95 }}
                      className="w-full max-w-4xl"
                    >
                      <AvatarSelector 
                        avatares={avatarsList}
                        avatarAtualUrl={formData.photoURL}
                        onSelect={(url) => {
                          setFormData(prev => ({ ...prev, photoURL: url }));
                          setShowAvatarSelector(false);
                        }}
                        onClose={() => setShowAvatarSelector(false)}
                      />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* User Info Container */}
              <div className="flex-1 pb-0 sm:pb-4">
                <h1 className="text-3xl sm:text-5xl font-black text-on-surface tracking-tight leading-none mb-3 sm:mb-4">
                  {profile.displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className={`
                    px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-sm
                    ${profile.role === 'admin' ? 'bg-on-surface text-background' : 
                      profile.role === 'chef' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      profile.role === 'collaborator' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-surface-container-high text-on-surface-variant'}
                  `}>
                    {profile.role === 'admin' ? 'Admin' : 
                     profile.role === 'chef' ? 'Chef Culinário' : 
                     profile.role === 'collaborator' ? 'Colaborador' : 'Membro'}
                  </span>
                  
                  <span className="text-on-surface-variant text-xs sm:text-sm font-semibold flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-xl border border-surface-container">
                    <Mail className="w-4 h-4" /> {profile.email}
                  </span>
                  
                  {profile.internalEmail && (
                    <span className="text-secondary text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-secondary/10 px-3 py-1.5 rounded-xl border border-secondary/20">
                      <Shield className="w-4 h-4" /> {profile.internalEmail}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 sm:px-12 pb-12">
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

            {/* Seção de Gamificação & Conquistas */}
            <div className="mt-16 pt-16 border-t border-surface-container-high">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-on-surface mb-2 flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-primary" />
                    Progresso & Conquistas
                  </h2>
                  <p className="text-on-surface-variant">Sua jornada culinária, nível atual e itens exclusivos desbloqueados.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Nível Atual */}
                <div className="p-8 bg-surface-container-low rounded-[2rem] border border-surface-container-high relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-stone-300/20 dark:bg-stone-700/20 rounded-bl-[100px] transition-transform group-hover:scale-110" />
                  <div className="flex items-center gap-5 mb-8 relative">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-stone-300 to-stone-500 flex items-center justify-center shadow-2xl border-4 border-background">
                      <Award className="w-10 h-10 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-1">
                        Nível {gamification?.level || 1}
                      </div>
                      <h3 className="text-3xl font-bold text-on-surface leading-none mb-1">
                        {gamification?.tier === 'APRENDIZ' ? 'Aprendiz' : 
                         gamification?.tier === 'ASSISTENTE' ? 'Assistente' : 
                         gamification?.tier === 'ALQUIMISTA' ? 'Alquimista' : 
                         gamification?.tier === 'PERITO' ? 'Perito' : 
                         gamification?.tier === 'MESTRE_ALQUIMISTA' ? 'Mestre Alquimista' : 'Aprendiz'}
                      </h3>
                      <p className="text-xs text-on-surface-variant font-medium">Grau Culinário</p>
                    </div>
                  </div>
                  
                  <div className="mb-3 flex justify-between text-sm font-black text-on-surface-variant tracking-wider uppercase">
                    <span>XP: {gamification?.xp || 0}</span>
                    <span>Meta: {gamification?.nextLevelXp || 100}</span>
                  </div>
                  <div className="w-full h-4 bg-surface-container-high rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-stone-400 dark:bg-stone-500 rounded-full shadow-lg transition-all duration-1000" 
                      style={{ width: `${Math.min(100, Math.max(0, ((gamification?.xp || 0) / (gamification?.nextLevelXp || 100)) * 100))}%` }}
                    />
                  </div>
                  <p className="text-xs text-on-surface-variant mt-5 font-medium flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" /> Próximo: <strong className="text-on-surface">Nível {(gamification?.level || 1) + 1}</strong>
                  </p>
                </div>

                {/* Itens Equipados / Loja */}
                <div className="lg:col-span-2 p-8 bg-surface-container-low rounded-[2rem] border border-surface-container-high">
                  <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant mb-6">Inventário & Itens Ativos</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Item 1 */}
                    <div className="p-5 bg-background rounded-2xl border border-surface-container flex gap-5 items-center hover:border-amber-200 transition-colors">
                      <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/50">
                        <Trophy className="w-7 h-7 text-amber-500" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-1">Título • Mestre</div>
                        <div className="text-base font-bold text-on-surface leading-tight">Mestre da Colaboração</div>
                      </div>
                    </div>
                    
                    {/* Item 2 */}
                    <div className="p-5 bg-background rounded-2xl border border-surface-container flex gap-5 items-center hover:border-purple-200 transition-colors">
                      <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center shrink-0 border border-purple-100 dark:border-purple-900/50">
                        <User className="w-7 h-7 text-purple-500" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-500 mb-1">Avatar • Avatar</div>
                        <div className="text-base font-bold text-on-surface leading-tight">Moldura de Avatar Exclusiva</div>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="p-5 bg-background rounded-2xl border border-surface-container flex gap-5 items-center hover:border-stone-200 transition-colors">
                      <div className="w-14 h-14 rounded-2xl bg-stone-900 flex items-center justify-center shrink-0 border border-stone-800">
                        <Shield className="w-7 h-7 text-stone-300" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-1">Tema • Premium</div>
                        <div className="text-base font-bold text-on-surface leading-tight">Tema Dark Premium</div>
                      </div>
                    </div>
                    
                    {/* Item 4 */}
                    <div className="p-5 bg-background rounded-2xl border border-surface-container flex gap-5 items-center hover:border-primary/20 transition-colors opacity-60 grayscale hover:grayscale-0 cursor-not-allowed">
                      <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center shrink-0 border border-surface-container">
                        <Award className="w-7 h-7 text-on-surface-variant" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Crachá • Gold</div>
                        <div className="text-base font-bold text-on-surface leading-tight">Crachá Gold do Perfil</div>
                        <div className="text-xs text-on-surface-variant mt-1">Desbloqueia no Nível 4 (600 XP)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Selector de Avatar */}
      {showAvatarSelector && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="my-auto w-full max-w-4xl">
            <AvatarSelector 
              avatares={avatarsList}
              avatarAtualUrl={formData.photoURL}
              onSelect={(url) => {
                setFormData(prev => ({ ...prev, photoURL: url }));
                setShowAvatarSelector(false);
              }}
              onClose={() => setShowAvatarSelector(false)}
            />
          </div>
        </div>
      )}

      {/* Level Up Popup */}
      <LevelUpPopup
        isOpen={showLevelUpPopup}
        newLevel={gamification?.level || 1}
        newTier={gamification?.tier || 'APRENDIZ'}
        onClose={handleCloseLevelUpPopup}
        onChooseAvatar={handleChooseNewAvatar}
      />
    </div>
  );
}
