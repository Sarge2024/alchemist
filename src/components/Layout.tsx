import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { signOut, browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { APP_VERSION } from '../constants';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { Search, Bookmark, User, Share2, Mail, LogOut, LogIn, X, Menu, Users, ChevronDown, Shield } from 'lucide-react';
import { userService } from '../infra/services/userService';
import { Avatar } from './Avatar';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogin = async () => {
    setAuthError(null);
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    try {
      // Use browserPopupRedirectResolver to improve compatibility in iframe/popup environments
      const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
      
      // Sincroniza o perfil do usuário com o Firestore se for um novo login
      if (result.user) {
        const profile = await userService.getUserProfile(result.user.uid);
        if (!profile) {
          console.log('[Auth] Novo alquimista detectado. Criando perfil...');
          await userService.createUserProfile({
            uid: result.user.uid,
            displayName: result.user.displayName || 'Alquimista',
            email: result.user.email || '',
            photoURL: result.user.photoURL || undefined,
            role: 'member',
            state: '',
            country: 'Brasil'
          });
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-blocked') {
        setAuthError('O popup foi bloqueado pelo seu navegador. Por favor, permita popups para este site.');
      } else if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        // Just user closing the popup
      } else if (error.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname;
        setAuthError(`Domínio não autorizado. O Firebase não reconhece "${domain}". No Console do Firebase (Authentication > Settings > Authorized Domains), certifique-se de adicionar EXATAMENTE: "${domain}" (sem https:// nem barras).`);
      } else {
        setAuthError(`Erro ao entrar: ${error.message} (Código: ${error.code})`);
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinks = [
    { path: '/', label: 'Início' },
    { path: '/explore', label: 'Explorar' },
    { path: '/categories', label: 'Categorias' },
    { path: '/submit', label: 'Enviar' },
    { path: '/register-collaborator', label: 'Seja um Colaborador' },
  ];

  return (
    <div className="min-h-screen bg-background selection:bg-secondary-container selection:text-secondary">
      {/* Error Banner */}
      {authError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] bg-red-50 text-red-600 px-6 py-3 rounded-2xl border border-red-100 shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <span className="text-sm font-semibold">{authError}</span>
          <button onClick={() => setAuthError(null)} className="p-1 hover:bg-red-100 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-surface-container-high/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 py-2 md:py-3">
          
          {/* LADO ESQUERDO: Logo e Toggle Mobile */}
          <div className="flex-1 flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 hover:bg-surface-container rounded-xl text-on-surface transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link to="/" className="text-xl md:text-2xl font-bold text-primary tracking-tighter font-sans flex items-center gap-2">
              <span className="hidden sm:inline">Alquimia do Prato</span>
              <span className="sm:hidden">Alquimia</span>
            </Link>
          </div>

          {/* CENTRO: Links de Navegação (Desktop) */}
          <div className="hidden md:flex flex-[2] justify-center items-center gap-1 lg:gap-4 font-sans font-medium text-on-surface-variant text-sm">
            {navLinks.slice(0, 3).map(link => (
              <Link 
                key={link.path}
                to={link.path} 
                className={`px-3 py-2 rounded-xl transition-all ${isActive(link.path) ? 'text-primary font-bold bg-primary/10' : 'hover:text-primary hover:bg-surface-container-high'}`}
              >
                {link.label}
              </Link>
            ))}
            
            {user && (
              <Link 
                to="/lounge" 
                className={`px-3 py-2 rounded-xl transition-all ${isActive('/lounge') ? 'text-primary font-bold bg-primary/10' : 'hover:text-primary hover:bg-surface-container-high'}`}
              >
                Lounge
              </Link>
            )}

            {isAdmin && (
              <div 
                className="relative group/admin"
                onMouseEnter={() => setIsAdminDropdownOpen(true)}
                onMouseLeave={() => setIsAdminDropdownOpen(false)}
              >
                <button 
                  className={`
                    px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer
                    ${(isActive('/admin') || isActive('/members')) ? 'text-primary font-bold bg-primary/10' : 'hover:text-primary hover:bg-surface-container-high'}
                  `}
                >
                  <Shield className="w-4 h-4" /> Admin <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isAdminDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className={`
                  absolute top-full left-0 mt-1 w-56 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high overflow-hidden transition-all duration-200 z-50
                  ${isAdminDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}
                `}>
                  <div className="p-2 space-y-1">
                    <Link 
                      to="/admin"
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${isActive('/admin') ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      <Shield className="w-4 h-4" /> Painel Geral
                    </Link>
                    <Link 
                      to="/members"
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${isActive('/members') ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      <Users className="w-4 h-4" /> Gestão de Membros
                    </Link>
                    <Link 
                      to="/manage"
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${isActive('/manage') ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      <Bookmark className="w-4 h-4" /> Minhas Receitas
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LADO DIREITO: Busca, Tema e Perfil */}
          <div className="flex-1 flex items-center justify-end gap-2 md:gap-4">
            <div className="relative hidden xl:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-9 pr-4 py-1.5 rounded-full border-none bg-surface-container text-xs focus:ring-2 focus:ring-primary w-40 outline-none transition-all focus:w-56"
              />
            </div>
            
            <div className="flex items-center gap-1 md:gap-2 text-on-surface-variant">
              <ThemeToggle />
              
              {user ? (
                <div className="flex items-center gap-2 ml-2">
                  <Link to="/profile" className="hover:ring-2 hover:ring-primary transition-all rounded-xl overflow-hidden">
                    <Avatar 
                      src={user.photoURL} 
                      alt={user.displayName || 'Alquimista'} 
                      size="sm"
                    />
                  </Link>
                  <button onClick={handleLogout} className="p-2 hover:text-primary transition-colors" title="Sair">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleLogin} 
                  disabled={isLoggingIn}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-full font-bold text-xs hover:bg-primary-hover transition-all shadow-lg shadow-primary/20"
                >
                  {isLoggingIn ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <LogIn className="w-4 h-4" />
                  )}
                  <span className="hidden sm:inline">Entrar</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-background border-t border-surface-container-high shadow-2xl animate-in slide-in-from-top-2 duration-200">
            <div className="p-4 space-y-2">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Buscar receitas..." 
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-surface-container text-base focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              {navLinks.map(link => (
                <Link 
                  key={link.path}
                  to={link.path} 
                  className={`block p-3 rounded-xl font-bold transition-all ${isActive(link.path) ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <Link 
                  to="/lounge" 
                  className={`block p-3 rounded-xl font-bold transition-all ${isActive('/lounge') ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                >
                  Lounge
                </Link>
              )}

              {user && (
                <Link 
                  to="/profile" 
                  className={`block p-3 rounded-xl font-bold transition-all ${isActive('/profile') ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                >
                  Meu Perfil
                </Link>
              )}
              {isAdmin && (
                <div className="pt-4 mt-4 border-t border-surface-container-high">
                  <div className="px-3 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Administração</div>
                  <Link 
                    to="/admin" 
                    className={`block p-3 rounded-xl font-bold transition-all ${isActive('/admin') ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    Painel Geral
                  </Link>
                  <Link 
                    to="/members" 
                    className={`block p-3 rounded-xl font-bold transition-all ${isActive('/members') ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    Gestão de Membros
                  </Link>
                  <Link 
                    to="/manage" 
                    className={`block p-3 rounded-xl font-bold transition-all ${isActive('/manage') ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    Minhas Receitas
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="pt-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-surface-container-high mt-12">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
            <div className="flex flex-col items-center md:items-start gap-2">
              <span className="text-xl font-bold text-primary">Alquimia do Prato</span>
              <p className="text-on-surface-variant text-center md:text-left text-sm">
                © 1998 - Alquimia do Prato. A magia da cozinha acessível a todos, em todo lugar.
                <span className="block mt-1 text-[10px] font-bold opacity-50 uppercase tracking-widest">v{APP_VERSION}</span>
              </p>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-6 text-on-surface-variant font-semibold text-sm">
              <Link to="/" className="hover:text-primary transition-colors">Sobre Nós</Link>
              <Link to="/" className="hover:text-primary transition-colors">Privacidade</Link>
              <Link to="/" className="hover:text-primary transition-colors">Termos</Link>
              <Link to="/" className="hover:text-primary transition-colors">Contato</Link>
            </div>
            <div className="flex gap-3">
              <button className="w-10 h-10 rounded-full border border-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-all">
                <Share2 className="w-4 h-4" />
              </button>
              <a href="mailto:alchemist.master1998@gmail.com" className="w-10 h-10 rounded-full border border-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary transition-all">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
