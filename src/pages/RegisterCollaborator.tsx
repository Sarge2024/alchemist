import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Mail, User, Phone, MapPin, Globe, CheckCircle2, ArrowRight, Lock, ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userService, UserProfile } from '../infra/services/userService';
import { ASSETS, getAssetUrl } from '../lib/assets';
import { supabase } from '../lib/supabase';
import { AvatarSelector, AvatarOptionData } from '../components/AvatarSelector';
import { Avatar } from '../components/Avatar';

type AuthMethod = 'select' | 'email-login' | 'email-register';

export default function RegisterCollaborator() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [authMethod, setAuthMethod] = useState<AuthMethod>('select');
  const [emailData, setEmailData] = useState({ email: '', password: '' });
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    whatsapp: '',
    state: '',
    country: 'Brasil',
    photoURL: '',
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [avatarsList, setAvatarsList] = useState<AvatarOptionData[]>([]);
  const [referrerProfile, setReferrerProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    fetchAvatars();
  }, [user?.uid]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const ref = searchParams.get('ref');
    const phone = searchParams.get('phone');
    
    if (ref) {
      localStorage.setItem('referral_referrer_uid', ref);
      userService.getUserProfile(ref).then(profile => {
        if (profile) setReferrerProfile(profile);
      });
    } else {
      const savedRef = localStorage.getItem('referral_referrer_uid');
      if (savedRef) {
        userService.getUserProfile(savedRef).then(profile => {
          if (profile) setReferrerProfile(profile);
        });
      }
    }
    
    if (phone) {
      localStorage.setItem('referral_phone', phone);
      setFormData(prev => ({ ...prev, whatsapp: phone }));
    } else {
      const savedPhone = localStorage.getItem('referral_phone');
      if (savedPhone) {
        setFormData(prev => ({ ...prev, whatsapp: prev.whatsapp || savedPhone }));
      }
    }
  }, [user]);

  const fetchAvatars = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: any = {
        'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // Usa um uid genérico 'new' caso não esteja logado, 
      // o servidor irá retornar os avatares padrão do nível 1.
      const res = await fetch(`/api/avatars/${user?.uid || 'new'}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.avatars)) {
          const lockedOrOtherAvatars = data.avatars.filter((a: any) => 
            a.tierMinimo !== '1' && a.tierMinimo !== 'ini' && a.tierMinimo !== 'apr' && a.tierMinimo !== 'APRENDIZ'
          );

          const novatosAvatars = [
            { id: 'novato-1', codigo: 'NOVATO_1', url: '/avatares/novatos/1.webp', bloqueado: false, tierMinimo: '1' },
            { id: 'novato-2', codigo: 'NOVATO_2', url: '/avatares/novatos/2.webp', bloqueado: false, tierMinimo: '1' },
            { id: 'novato-3', codigo: 'NOVATO_3', url: '/avatares/novatos/3.webp', bloqueado: false, tierMinimo: '1' },
            { id: 'novato-4', codigo: 'NOVATO_4', url: '/avatares/novatos/4.webp', bloqueado: false, tierMinimo: '1' },
            { id: 'novato-5', codigo: 'NOVATO_5', url: '/avatares/novatos/5.webp', bloqueado: false, tierMinimo: '1' },
            { id: 'novato-6', codigo: 'NOVATO_6', url: '/avatares/novatos/6.webp', bloqueado: false, tierMinimo: '1' },
            { id: 'novato-7', codigo: 'NOVATO_7', url: '/avatares/novatos/7.webp', bloqueado: false, tierMinimo: '1' },
            { id: 'novato-8', codigo: 'NOVATO_8', url: '/avatares/novatos/8.webp', bloqueado: false, tierMinimo: '1' },
          ];

          setAvatarsList([...novatosAvatars, ...lockedOrOtherAvatars]);
        }
      }
    } catch (err) {
      console.error('Error fetching avatars:', err);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      setFormData(prev => ({
        ...prev,
        displayName: user.displayName || '',
        email: user.email || '',
        photoURL: user.photoURL || '',
      }));
    }
  }, [user, authLoading]);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError('Falha ao autenticar com Google: ' + err.message);
      setLoading(false);
    }
  };

  const handleEmailAuth = async (isRegister: boolean) => {
    if (!emailData.email || !emailData.password) {
      setError('Por favor, preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email: emailData.email,
          password: emailData.password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailData.email,
          password: emailData.password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      let msg = 'Erro na autenticação: ';
      msg += err.message;
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Você precisa estar logado para completar seu cadastro.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile: UserProfile = {
        uid: user.uid,
        displayName: formData.displayName,
        email: formData.email,
        photoURL: formData.photoURL,
        whatsapp: formData.whatsapp,
        state: formData.state,
        country: formData.country,
        role: 'collaborator',
      };

      await userService.createUserProfile(profile);

      // Sincronizar indicação se houver referrer UID no localStorage
      const referrerUid = localStorage.getItem('referral_referrer_uid');
      if (referrerUid) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const token = session?.access_token;
          const headers: any = {
            'Content-Type': 'application/json',
            'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
          };
          if (token) headers['Authorization'] = `Bearer ${token}`;

          const res = await fetch('/api/gamification/event', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              uid: referrerUid,
              eventType: 'REFERRAL_CONFIRMED'
            })
          });
          const resData = await res.json();
          if (resData.success) {
            console.log(`[Referral] Evento REFERRAL_CONFIRMED enviado com sucesso para ${referrerUid}.`);
            localStorage.removeItem('referral_referrer_uid');
            localStorage.removeItem('referral_phone');
          } else {
            console.error('[Referral] Erro ao enviar evento de indicação:', resData.error);
          }
        } catch (err) {
          console.error('[Referral] Erro na requisição de indicação:', err);
        }
      }

      // Atualiza o perfil centralizado do Supabase para que o avatar mude no header em tempo real
      await supabase.auth.updateUser({
        data: {
          avatar_url: formData.photoURL,
          full_name: formData.displayName
        }
      });
      setSuccess(true);
      setTimeout(() => navigate('/'), 4000); // 4 segundos para dar tempo de ver o popup de indicação aceita
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar seu perfil.');
    } finally {
      setLoading(false);
    }
  };


  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-stone-100">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          
          {/* Left Column: Form/Auth */}
          <div className="p-8 md:p-12 lg:p-16 flex flex-col justify-center min-h-[600px]">
            <motion.div
              key={user ? 'profile' : authMethod}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.4 }}
              className="w-full"
            >
              <h1 className="text-4xl md:text-5xl font-serif font-medium text-stone-900 mb-4 tracking-tight leading-none">
                {user ? 'Complete seu' : 'Inicie seu'} <span className="text-primary italic">Cadastro</span>
              </h1>
              <p className="text-stone-600 mb-10 text-lg leading-relaxed">
                {user 
                  ? 'Falta pouco! Preencha seus dados para começar a colaborar.' 
                  : 'Escolha como deseja se conectar à nossa comunidade.'
                }
              </p>

              {referrerProfile && !success && (
                <div className="mb-8 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-stone-800 text-sm">
                      Você foi convidado por <strong className="text-emerald-950">{referrerProfile.displayName}</strong>!
                    </p>
                    <p className="text-stone-500 text-xs mt-0.5">
                      Ao concluir seu cadastro, ele ganhará 5 pontos de XP.
                    </p>
                  </div>
                </div>
              )}

              {!user ? (
                <div className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm italic mb-6">
                      {error}
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {authMethod === 'select' ? (
                      <motion.div 
                        key="select"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <button
                          type="button"
                          onClick={handleGoogleLogin}
                          disabled={loading}
                          className="w-full py-5 bg-white text-stone-700 border border-stone-200 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow-md hover:border-stone-300 transition-all disabled:opacity-50"
                        >
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            <>
                              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                              Continuar com Google
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setAuthMethod('email-login')}
                          className="w-full py-5 bg-stone-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-stone-200 hover:bg-stone-800 transition-all"
                        >
                          <Mail className="w-5 h-5" />
                          Continuar com E-mail
                        </button>

                        <div className="relative py-4">
                          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-stone-200"></div></div>
                          <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-stone-400 font-bold tracking-widest">Alquimia do Prato</span></div>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="email-form"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-6 bg-stone-50 p-8 rounded-3xl border border-stone-100"
                      >
                        <button 
                          onClick={() => { setAuthMethod('select'); setError(null); }}
                          className="flex items-center gap-2 text-stone-400 hover:text-primary text-sm font-bold uppercase tracking-widest transition-colors mb-4"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Voltar
                        </button>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">E-mail</label>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                              <input 
                                type="email"
                                value={emailData.email}
                                onChange={(e) => setEmailData(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                placeholder="vitor@exemplo.com"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Senha</label>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                              <input 
                                type="password"
                                value={emailData.password}
                                onChange={(e) => setEmailData(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full pl-12 pr-4 py-4 bg-white border border-stone-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all"
                                placeholder="••••••••"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleEmailAuth(authMethod === 'email-register')}
                          className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all flex items-center justify-center gap-2"
                        >
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : (
                            authMethod === 'email-login' ? 'Entrar' : 'Criar Conta'
                          )}
                        </button>

                        <div className="text-center">
                          <button 
                            onClick={() => {
                              setAuthMethod(authMethod === 'email-login' ? 'email-register' : 'email-login');
                              setError(null);
                            }}
                            className="text-stone-500 hover:text-primary text-sm font-medium transition-colors underline underline-offset-4"
                          >
                            {authMethod === 'email-login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : success ? (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-green-50 border border-green-100 p-8 rounded-3xl text-center"
                >
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-green-900 mb-2">Cadastro Realizado!</h2>
                  <p className="text-green-700 mb-4">Seja bem-vindo, {formData.displayName}. Redirecionando você...</p>
                  <div className="bg-white/50 p-4 rounded-2xl border border-green-200 inline-block">
                    <span className="text-[10px] font-black uppercase tracking-widest text-green-600 block mb-1">Seu E-mail Interno:</span>
                    <code className="text-sm font-bold text-stone-900">
                      {formData.displayName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '.')}@alquimiadoprato.com.br
                    </code>
                  </div>

                  {referrerProfile && (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-6 p-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl shadow-sm flex flex-col items-center text-center max-w-md mx-auto"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-3">
                        <Sparkles className="w-6 h-6 animate-pulse" />
                      </div>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-widest rounded-full mb-2">
                        Indicação Confirmada
                      </span>
                      <h4 className="text-emerald-950 font-bold text-base mb-1">
                        Indicação Aceita!
                      </h4>
                      <p className="text-emerald-800 text-sm leading-relaxed">
                        Agradecemos o convite! <strong>+5 XP</strong> foram creditados para <strong>{referrerProfile.displayName}</strong> por indicar você.
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <form onSubmit={handleSubmitProfile} className="space-y-6">
                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm italic">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-6">
                    {/* Name */}
                    <div className="relative group">
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-primary transition-colors" />
                        <input
                          type="text"
                          name="displayName"
                          value={formData.displayName}
                          onChange={handleChange}
                          className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-stone-300"
                          placeholder="Como deseja ser chamado?"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Email (Read Only after Auth) */}
                      <div className="relative group">
                        <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">E-mail</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            disabled
                            className="w-full pl-12 pr-4 py-4 bg-stone-100 border border-stone-200 rounded-2xl text-stone-500 cursor-not-allowed outline-none"
                          />
                        </div>
                      </div>

                      {/* WhatsApp */}
                      <div className="relative group">
                        <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">WhatsApp (Opcional)</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-primary transition-colors" />
                          <input
                            type="tel"
                            name="whatsapp"
                            value={formData.whatsapp}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-stone-300"
                            placeholder="+55 00 00000-0000"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* State */}
                      <div className="relative group">
                        <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Estado</label>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-primary transition-colors" />
                          <input
                            type="text"
                            name="state"
                            value={formData.state}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-stone-300"
                            placeholder="Ex: SP"
                            required
                          />
                        </div>
                      </div>

                      {/* Country */}
                      <div className="relative group">
                        <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">País</label>
                        <div className="relative">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-primary transition-colors" />
                          <input
                            type="text"
                            name="country"
                            value={formData.country}
                            onChange={handleChange}
                            className="w-full pl-12 pr-4 py-4 bg-stone-50 border border-stone-200 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-stone-300"
                            placeholder="Ex: Brasil"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Avatar Selection */}
                    <div className="relative group">
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Avatar de Perfil</label>
                      <div className="flex items-center gap-6 p-6 bg-stone-50 border border-stone-200 rounded-[2rem]">
                        <div className="relative w-24 h-24 rounded-[1.5rem] overflow-hidden bg-white border-4 border-stone-100 shadow-sm shrink-0 transition-transform duration-300 group-hover:scale-105">
                          <Avatar 
                            src={formData.photoURL} 
                            alt={formData.displayName || "Avatar"} 
                            size="lg"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <div className="flex-1">
                          <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                            {formData.photoURL 
                              ? "Avatar selecionado! Deseja trocar?" 
                              : "Escolha um avatar que represente sua identidade como alquimista."}
                          </p>
                          <button 
                            type="button"
                            onClick={() => setShowAvatarSelector(true)}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            <User className="w-4 h-4 text-primary" />
                            {formData.photoURL ? "Alterar Avatar" : "Selecionar Avatar"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-primary text-white rounded-2xl font-bold text-lg shadow-xl shadow-primary/20 hover:bg-primary-hover hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {loading ? (
                      <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        Confirmar Cadastro
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </motion.div>
          </div>

          {/* Right Column: Image + Text */}
          <div className="relative bg-stone-900 border-l border-stone-100 flex flex-col">
            <div className="flex-1 relative overflow-hidden group">
              <img 
                src={getAssetUrl(ASSETS.HOME.COLLABORATOR_REGISTER)} 
                alt="Community Gathering" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 opacity-80"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = ASSETS.HOME.COMMUNITY;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-60" />
            </div>
            
            <div className="p-12 lg:p-16 bg-stone-950 text-white border-t border-stone-800">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <div className="w-12 h-1 bg-primary mb-8 rounded-full" />
                <h3 className="text-2xl md:text-3xl font-serif italic font-light mb-6 leading-tight">
                  "Cozinhar é um ato de amor e compartilhamento."
                </h3>
                <p className="text-stone-400 text-lg leading-relaxed font-light">
                  Como colaborador(a) do Alquimia do Prato, você terá acesso a ferramentas exclusivas 
                  para documentar suas criações, interagir com outros chefs e preservar o legado 
                  gastronômico da nossa cultura.
                </p>
                <div className="mt-8 flex items-center gap-4">
                  <div className="flex -space-x-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-stone-950 bg-stone-800 overflow-hidden">
                        <img src={`https://i.pravatar.cc/150?u=${i}`} alt="User" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <span className="text-stone-400 text-sm font-medium tracking-wide">
                    + de 2.000 Alquimistas já cadastrados
                  </span>
                </div>
              </motion.div>
            </div>
          </div>

        </div>
      </div>

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
    </div>
  );
}
