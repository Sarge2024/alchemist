/**
 * Lounge.tsx
 * Página do Lounge Gastronômico.
 * Ponto de encontro da comunidade para discussões em tempo real (Chat) e 
 * consulta de registros históricos da comunidade (Mural de Atas).
 */
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { LoungeChat } from '../components/LoungeChat';
import { MuralDeAtas } from '../components/MuralDeAtas';
import { ActiveCollaborators } from '../components/ActiveCollaborators';
import { ChefList } from '../components/ChefList';
import { MessageSquare, BookOpen, UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';

/**
 * Página do Lounge Gastronômico (v2.1.0).
 * Integra o Chat em tempo real e o Mural de Atas.
 */
const Lounge: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'atas'>('chat');
  const navigate = useNavigate();
  // Welcome popup state
  const [showWelcome, setShowWelcome] = useState<boolean>(false);
  const [welcomeSubject, setWelcomeSubject] = useState<string>('');
  const [welcomeStep, setWelcomeStep] = useState<1 | 2>(1);
  // Check if user is first visit of the day
  useEffect(() => {
    if (!user) return;
    const today = new Date().toDateString();
    const lastVisit = localStorage.getItem('loungeLastVisit');
    if (lastVisit !== today) {
      setShowWelcome(true);
    }
  }, [user]);

  const closeWelcome = () => {
    // Store today's date to prevent showing again
    localStorage.setItem('loungeLastVisit', new Date().toDateString());
    setShowWelcome(false);
  };

  const handleWelcomeSubmit = () => {
    if (welcomeSubject.trim()) {
      setWelcomeStep(2);
    } else {
      closeWelcome();
    }
  };

  // Enquanto verifica estado de autenticação, pode exibir loading (ou nada)
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <>
      {/* Welcome Popup */}
      {showWelcome && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 w-[350px] text-center shadow-lg border border-primary/20">
            {welcomeStep === 1 ? (
              <>
                <h2 className="text-xl font-semibold mb-4 text-primary">Bom dia!</h2>
                <p className="mb-2 text-primary/80">Eai! O que vamos ver hoje?</p>
                <input
                  type="text"
                  value={welcomeSubject}
                  onChange={e => setWelcomeSubject(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { handleWelcomeSubmit(); } }}
                  className="w-full mb-4 px-3 py-2 bg-white/20 rounded border border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Digite um assunto"
                  autoFocus
                />
                <button
                  onClick={handleWelcomeSubmit}
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 transition"
                >
                  OK
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold mb-4 text-primary">Onde procurar?</h2>
                <p className="mb-4 text-primary/80 text-sm">Escolha onde deseja buscar sobre "{welcomeSubject}":</p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => {
                      closeWelcome();
                      navigate(`/explore?q=${encodeURIComponent(welcomeSubject.trim())}`);
                    }}
                    className="w-full px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 transition flex items-center justify-center gap-2"
                  >
                    <UtensilsCrossed className="w-4 h-4" /> Receitas
                  </button>
                  <button
                    onClick={() => {
                      closeWelcome();
                      navigate(`/acervo?search=${encodeURIComponent(welcomeSubject.trim())}`);
                    }}
                    className="w-full px-4 py-2 bg-stone-800 text-white rounded hover:bg-stone-700 transition flex items-center justify-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" /> Acervo
                  </button>
                  <button
                    onClick={closeWelcome}
                    className="w-full px-4 py-2 bg-transparent text-stone-400 border border-stone-600 rounded hover:bg-stone-800 transition mt-2 text-sm"
                  >
                    Ficar no Lounge
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <div className="min-h-screen bg-background pb-20">
        <section className="pt-8 pb-6 px-4 md:px-8 max-w-[1600px] mx-auto w-full">
          <div className="w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <UtensilsCrossed className="w-7 h-7" />
                  </div>
                  <span className="text-primary font-black uppercase tracking-[0.2em] text-xs">Fase 2: Interatividade</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold text-on-surface tracking-tighter leading-[0.9]">
                  Lounge <br />
                  <span className="text-stone-300 dark:text-stone-700">Gastronômico</span>
                </h1>
              </div>

            {/* Tab Selector */}
            <div className="bg-surface-container p-1.5 md:p-2 rounded-2xl border border-stone-100 dark:border-stone-800 shadow-xl flex flex-row gap-1 w-full md:w-fit overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('chat')}
                className={`
                  flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-xl font-bold transition-all text-sm md:text-base whitespace-nowrap
                  ${activeTab === 'chat' ? 'bg-stone-900 dark:bg-stone-800 text-white shadow-lg' : 'text-stone-400 hover:text-stone-600'}
                `}
              >
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5" /> Chat
              </button>
              <button
                onClick={() => setActiveTab('atas')}
                className={`
                  flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-3 rounded-xl font-bold transition-all text-sm md:text-base whitespace-nowrap
                  ${activeTab === 'atas' ? 'bg-stone-900 dark:bg-stone-800 text-white shadow-lg' : 'text-stone-400 hover:text-stone-600'}
                `}
              >
                <BookOpen className="w-4 h-4 md:w-5 md:h-5" /> Mural
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Content */}
      <main className="px-4 md:px-8 pb-12 max-w-[1600px] mx-auto w-full">
        <div className="w-full">
          {activeTab === 'chat' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Esquerda: Chefs da Casa */}
              <div className="lg:col-span-2">
                <ChefList />
              </div>

              {/* Centro: Chat */}
              <div className="lg:col-span-8">
                <LoungeChat />
              </div>

              {/* Direita: Comunidade e Regras */}
              <div className="lg:col-span-2 space-y-6">
                {/* Lista de Colaboradores Ativos */}
                <ActiveCollaborators />

                {/* Regras de Convivência */}
                <div className="bg-primary/5 p-8 rounded-[40px] border border-primary/10">
                  <h4 className="text-primary font-black uppercase tracking-widest text-xs mb-4">Regras de Convivência</h4>
                  <ul className="space-y-4">
                    <li className="flex gap-3 text-primary/80 font-medium text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      Foco estrito em temas culinários e culturais.
                    </li>
                    <li className="flex gap-3 text-primary/80 font-medium text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      Compartilhamento de herança familiar é encorajado.
                    </li>
                    <li className="flex gap-3 text-primary/80 font-medium text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5" />
                      Moderação automática via IA (Gemini).
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <MuralDeAtas />
            </motion.div>
          )}
        </div>
      </main>
    </div>
    </>
  );
};

export default Lounge;
