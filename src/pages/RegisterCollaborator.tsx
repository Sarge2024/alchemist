import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Mail, User, Phone, MapPin, Globe, CheckCircle2, ArrowRight, Lock, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from '../context/AuthContext';
import { userService, UserProfile } from '../infra/services/userService';
import { ASSETS, getAssetUrl } from '../lib/assets';
import { auth, googleProvider } from '../lib/firebase';

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
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError('Falha ao autenticar com Google: ' + err.message);
    } finally {
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
        await createUserWithEmailAndPassword(auth, emailData.email, emailData.password);
      } else {
        await signInWithEmailAndPassword(auth, emailData.email, emailData.password);
      }
    } catch (err: any) {
      let msg = 'Erro na autenticação: ';
      if (err.code === 'auth/user-not-found') msg += 'Usuário não encontrado.';
      else if (err.code === 'auth/wrong-password') msg += 'Senha incorreta.';
      else if (err.code === 'auth/email-already-in-use') msg += 'Este e-mail já está em uso.';
      else msg += err.message;
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
      setSuccess(true);
      setTimeout(() => navigate('/'), 3000);
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro ao salvar seu perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 2MB');
      return;
    }

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
      } else {
        alert('Erro ao carregar imagem: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Falha ao enviar a imagem para o servidor.');
    } finally {
      setUploadingImage(false);
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

                    {/* Photo Upload */}
                    <div className="relative group">
                      <label className="block text-xs font-bold text-stone-400 uppercase tracking-widest mb-2 ml-1">Foto de Perfil</label>
                      <div className="flex items-center gap-6 p-6 bg-stone-50 border border-stone-200 rounded-[2rem]">
                        <div className="relative w-24 h-24 rounded-full overflow-hidden bg-white border-2 border-stone-100 shadow-sm shrink-0">
                          {formData.photoURL ? (
                            <img src={formData.photoURL} alt="Profile Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-300">
                              <User className="w-10 h-10" />
                            </div>
                          )}
                          {uploadingImage && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <p className="text-sm text-stone-500 mb-4 leading-relaxed">
                            {formData.photoURL 
                              ? "Foto carregada com sucesso! Deseja trocar?" 
                              : "Escolha uma foto que represente sua identidade como alquimista."}
                          </p>
                          <label className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-all cursor-pointer shadow-sm active:scale-95">
                            <Camera className="w-4 h-4 text-primary" />
                            {formData.photoURL ? "Alterar Foto" : "Selecionar Foto"}
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handleFileUpload}
                              disabled={uploadingImage}
                            />
                          </label>
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
    </div>
  );
}
