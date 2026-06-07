/**
 * Layout.tsx
 * Shell principal da aplicação (Frame).
 * Define a navegação global, sistema de autenticação (Google Sign-In), 
 * barra de busca e estrutura comum a todas as páginas.
 */
import React, { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { APP_VERSION } from '../constants';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { Search, Bookmark, User, Share2, Mail, LogOut, LogIn, X, Menu, Users, ChevronDown, Shield, ArrowLeft, Beaker } from 'lucide-react';
import { userService } from '../infra/services/userService';
import { Avatar } from './Avatar';
import { RAGAssistant } from './RAGAssistant';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAdminDropdownOpen, setIsAdminDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Capture referral query parameters globally
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const ref = searchParams.get('ref');
    const phone = searchParams.get('phone');
    
    if (ref) {
      localStorage.setItem('referral_referrer_uid', ref);
      console.log(`[Referral] Referrer UID captured globally: ${ref}`);
    }
    if (phone) {
      localStorage.setItem('referral_phone', phone);
      console.log(`[Referral] Referral phone captured globally: ${phone}`);
    }
  }, [location.search]);

  const handleLogin = async () => {
    setAuthError(null);
    setIsLoggingIn(true);

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
      // Nota: o Supabase redirecionará a página para o Google e de volta para cá.
    } catch (error: any) {
      console.error('Login error:', error);
      setAuthError(`Erro ao entrar: ${error.message}`);
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsMobileMenuOpen(false);
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
    { path: '/calculadora-churrasco', label: 'Churrasco' },
    { path: '/acervo', label: 'Acervo' },
    { path: '/submit', label: 'Enviar' },
    { path: '/register-collaborator', label: 'Seja um Colaborador' },
  ];

  const showBackButton = location.pathname !== '/';

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
        <div className="max-w-[1600px] mx-auto flex items-center justify-between px-4 py-2 md:py-3">
          
          {/* LADO ESQUERDO: Logo e Toggle Mobile */}
          <div className="flex-1 flex items-center gap-2 md:gap-4">
            <div className="flex items-center gap-1 md:gap-2">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 hover:bg-surface-container rounded-xl text-on-surface transition-colors"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              
              {showBackButton && (
                <button 
                  onClick={() => navigate(-1)}
                  className="p-2 hover:bg-surface-container rounded-xl text-primary transition-all active:scale-90 flex items-center gap-1 group"
                  title="Voltar"
                >
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  <span className="hidden lg:inline text-xs font-bold uppercase tracking-widest">Voltar</span>
                </button>
              )}
            </div>

            <Link to="/" className="text-xl md:text-2xl font-bold text-primary tracking-tighter font-sans flex items-center gap-2">
              <span className="hidden sm:inline">Alquimia do Prato</span>
              <span className="sm:hidden">Alquimia</span>
            </Link>
          </div>

          <div className="hidden md:flex flex-[2] justify-center items-center gap-1 lg:gap-4 font-sans font-medium text-on-surface-variant text-sm">
            {navLinks.slice(0, 4).map(link => (
              <Link 
                key={link.path}
                to={link.path} 
                className={`px-3 py-2 rounded-xl transition-all ${isActive(link.path) ? 'text-primary font-bold bg-primary/10' : 'hover:text-primary hover:bg-surface-container-high'}`}
              >
                {link.label}
              </Link>
            ))}
            
            {user && (
              <>
                <Link 
                  to="/acervo" 
                  className={`px-3 py-2 rounded-xl transition-all ${isActive('/acervo') ? 'text-primary font-bold bg-primary/10' : 'hover:text-primary hover:bg-surface-container-high'}`}
                >
                  Acervo
                </Link>
                <Link 
                  to="/lounge" 
                  className={`px-3 py-2 rounded-xl transition-all ${isActive('/lounge') ? 'text-primary font-bold bg-primary/10' : 'hover:text-primary hover:bg-surface-container-high'}`}
                >
                  Lounge
                </Link>
              </>
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
                    <Link 
                      to="/meu-perfil/alquimista"
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${isActive('/meu-perfil/alquimista') ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                    >
                      <Beaker className="w-4 h-4" /> Painel do Alquimista
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* LADO DIREITO: Busca, Tema e Perfil */}
          <div className="flex-1 flex items-center justify-end gap-2 md:gap-4">
            <form onSubmit={handleSearchSubmit} className="relative hidden xl:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-4 h-4" />
              <input 
                type="text" 
                placeholder="Buscar receitas..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 rounded-full border-none bg-surface-container text-xs focus:ring-2 focus:ring-primary w-40 outline-none transition-all focus:w-56"
              />
            </form>
            
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
              <form onSubmit={handleSearchSubmit} className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="Buscar receitas..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-surface-container text-base focus:ring-2 focus:ring-primary outline-none"
                />
              </form>
              {navLinks.filter(link => link.path !== '/acervo').map(link => (
                <Link 
                  key={link.path}
                  to={link.path} 
                  className={`block p-3 rounded-xl font-bold transition-all ${isActive(link.path) ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                >
                  {link.label}
                </Link>
              ))}
              {user && (
                <>
                  <Link 
                    to="/acervo" 
                    className={`block p-3 rounded-xl font-bold transition-all ${isActive('/acervo') ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    Acervo
                  </Link>
                  <Link 
                    to="/lounge" 
                    className={`block p-3 rounded-xl font-bold transition-all ${isActive('/lounge') ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    Lounge
                  </Link>
                </>
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
                  <Link 
                    to="/meu-perfil/alquimista" 
                    className={`block p-3 rounded-xl font-bold transition-all ${isActive('/meu-perfil/alquimista') ? 'bg-primary/10 text-primary' : 'text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    Painel do Alquimista
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
        <div className="max-w-[1600px] mx-auto px-6 py-8">
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
      <RAGAssistant />
    </div>
  );
}
