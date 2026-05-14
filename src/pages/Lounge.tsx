/**
 * Lounge.tsx
 * Página do Lounge Gastronômico.
 * Ponto de encontro da comunidade para discussões em tempo real (Chat) e 
 * consulta de registros históricos da comunidade (Mural de Atas).
 */
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LoungeChat } from '../components/LoungeChat';
import { MuralDeAtas } from '../components/MuralDeAtas';
import { ActiveCollaborators } from '../components/ActiveCollaborators';
import { ChefList } from '../components/ChefList';
import { MessageSquare, BookOpen, UtensilsCrossed } from 'lucide-react';

/**
 * Página do Lounge Gastronômico (v2.1.0).
 * Integra o Chat em tempo real e o Mural de Atas.
 */
const Lounge: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'atas'>('chat');

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <section className="pt-8 pb-8 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-end justify-between gap-8"
          >
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
      <main className="px-6">
        <div className="max-w-7xl mx-auto">
          {activeTab === 'chat' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8"
            >
              {/* Esquerda: Chefs da Casa */}
              <div className="lg:col-span-3">
                <ChefList />
              </div>

              {/* Centro: Chat */}
              <div className="lg:col-span-6">
                <LoungeChat />
              </div>

              {/* Direita: Comunidade e Regras */}
              <div className="lg:col-span-3 space-y-6">
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
  );
};

export default Lounge;
