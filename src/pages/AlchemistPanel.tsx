import React, { useState } from 'react';
import { motion } from 'motion/react';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Shield, 
  Award, 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2,
  Flame,
  Beaker,
  Crown,
  UserCircle,
  Book,
  Star,
  Leaf,
  Droplet,
  Wind,
  Gem,
  Upload,
  Save
} from 'lucide-react';

// Dados baseados no JSON fornecido
const menuItems = [
  { id: 'dashboard', label: 'Dashboard do Alquimista', icon: LayoutDashboard },
  { id: 'mercado', label: 'Mercado de Permuta (Loja)', icon: ShoppingBag },
  { id: 'avatares', label: 'Avatares & Selos', icon: Shield },
  { id: 'conquistas', label: 'Conquistas Culinárias', icon: Award },
  { id: 'membros', label: 'Membros do Clã', icon: Users },
];

const marketItems = [
  { id: 1, nome: 'Selo de Fogo', tipo: 'Premium', xp: 50, moedas: 100, desc: 'Desbloqueia receitas quentes', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { id: 2, nome: 'Crachá de Erborista', tipo: 'Gold', xp: 75, moedas: 150, desc: 'Acesso a plantas raras', icon: Leaf, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 3, nome: 'Título "Mestre da Destilação"', tipo: 'Mestre', xp: 100, moedas: 200, desc: 'Título exclusivo para mestre...', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 4, nome: 'Moldura de Cadinho', tipo: 'Avatar', xp: 300, moedas: 600, desc: 'Moldura de Avatar Exclusiva', icon: UserCircle, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 5, nome: 'Grimório Culinário', tipo: 'Bronze', xp: 1000, moedas: 2000, desc: 'Tema do Item', icon: Book, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 6, nome: 'Crachá de Iniciante', tipo: 'Bronze', xp: 750, moedas: 500, desc: 'Crachá do Perfil', icon: Shield, color: 'text-stone-500', bg: 'bg-stone-500/10' },
  { id: 7, nome: 'Título Ouro do Perfil', tipo: 'Gold', xp: 500, moedas: 1000, desc: 'Título Mestre da Colabora...', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { id: 8, nome: 'Avatar Exclusivo', tipo: 'Avatar', xp: 300, moedas: 600, desc: 'Moldura Avatar Exclusiva', icon: UserCircle, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
];

const progressionLevels = [
  { id: 1, nivel: 'Nível 1 (Aprendiz)', medalha: 'Iniciante do Fogo', desc: 'Dominar o básico', icon: Flame, color: 'text-orange-500' },
  { id: 2, nivel: 'Nível 2 (Iniciado do Solo)', medalha: 'Colecionador de Ervas', desc: 'Criar 10 poções de cura', icon: Leaf, color: 'text-emerald-500' },
  { id: 3, nivel: 'Nível 3 (Mestre da Água)', medalha: 'Senhor dos Elixires', desc: 'Alcançar a pureza total', icon: Droplet, color: 'text-blue-500' },
  { id: 4, nivel: 'Nível 4 (Alquimista do Ar)', medalha: 'Caminhante dos Ventos', desc: 'Criar um prato flutuante', icon: Wind, color: 'text-cyan-500' },
  { id: 5, nivel: 'Nível 5 (Pedra Filosofal)', medalha: 'A Pedra Transmutada', desc: 'Conquistar todos os elixires', icon: Gem, color: 'text-fuchsia-500' },
];

const summaryTable = [
  { nivel: 'Nível 1', medalha: 'Cobre', xp: 1000 },
  { nivel: 'Nível 2', medalha: 'Bronze', xp: 750 },
  { nivel: 'Nível 3', medalha: 'Prata', xp: 550 },
  { nivel: 'Nível 4', medalha: 'Ouro', xp: 600 },
  { nivel: 'Nível 5', medalha: 'Platina', xp: 1000 },
];

const selosGroup = [
  { level: 'Ouro', id: 'ouro', items: [1, 2, 3, 4, 5, 6].map(n => `o${n}.512.Webp`), color: 'text-yellow-500', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  { level: 'Prata', id: 'prata', items: [1, 2, 3, 4, 5, 6].map(n => `p${n}.512.Webp`), color: 'text-stone-400', bg: 'bg-stone-400/10 border-stone-400/20' },
  { level: 'Bronze', id: 'bronze', items: [1, 2, 3, 4, 5, 6].map(n => `b${n}.512.Webp`), color: 'text-amber-700', bg: 'bg-amber-700/10 border-amber-700/20' },
];

const matrixInteracoes = [
  { id: 'S-01', nome: 'Colaboração entre participantes', bronze: 20, prata: 50, ouro: 100, index: 1 },
  { id: 'S-02', nome: 'Publicação de Receita', bronze: 5, prata: 15, ouro: 30, index: 2 },
  { id: 'S-03', nome: 'Publicação de Artigo', bronze: 2, prata: 8, ouro: 15, index: 3 },
  { id: 'S-04', nome: 'Preparo e publicação com foto', bronze: 10, prata: 25, ouro: 50, index: 4 },
  { id: 'S-05', nome: 'Avaliação de Receitas', bronze: 30, prata: 75, ouro: 150, index: 5 },
  { id: 'S-06', nome: 'Compra de Produtos', bronze: 100, prata: 250, ouro: 500, index: 6, isXP: true },
];

export default function AlchemistPanel() {
  const [activeTab, setActiveTab] = useState('avatares');
  const [matrix, setMatrix] = useState(matrixInteracoes);

  const updateMatrixValue = (id: string, level: 'bronze' | 'prata' | 'ouro', delta: number) => {
    setMatrix(prev => prev.map(row => {
      if (row.id === id) {
        const currentVal = row[level] as number;
        const step = row.isXP ? 50 : 1;
        const newVal = Math.max(0, currentVal + (delta * step));
        return { ...row, [level]: newVal };
      }
      return row;
    }));
  };

  const handleMatrixInputChange = (id: string, level: 'bronze' | 'prata' | 'ouro', rawValue: string) => {
    const num = parseInt(rawValue.replace(/\D/g, ''), 10);
    if (!isNaN(num)) {
      setMatrix(prev => prev.map(row => {
        if (row.id === id) return { ...row, [level]: num };
        return row;
      }));
    }
  };

  const handleSave = async () => {
    try {
      await setDoc(doc(db, 'config', 'matrix'), { matrix });
      alert('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      alert('Falha ao salvar as configurações.');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row pb-20 md:pb-0 pt-16 md:pt-0">
      {/* Sidebar Oculta em Mobile via Header Principal, mas mostrada aqui de forma responsiva */}
      <aside className="w-full md:w-72 bg-surface-container-lowest border-r border-surface-container-high p-6 flex flex-col shrink-0">
        <div className="mb-10 mt-4 md:mt-20">
          <h2 className="text-xl font-bold text-on-surface flex items-center gap-2 mb-1">
            <Beaker className="w-6 h-6 text-primary" />
            Painel do Alquimista
          </h2>
          <p className="text-xs text-on-surface-variant font-medium uppercase tracking-widest">Configuração Master</p>
        </div>

        <nav className="flex-1 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all text-sm
                ${activeTab === item.id 
                  ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                  : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-8 md:pt-24 no-scrollbar">
        <div className={`mx-auto space-y-12 ${activeTab === 'avatares' ? 'w-full max-w-[1600px]' : 'max-w-6xl'}`}>
          
          {activeTab === 'mercado' && (
            <>
              {/* Seção 1: Mercado de Permuta */}
              <section className="bg-surface-container-low p-8 rounded-[2rem] border border-surface-container-high shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-2xl font-bold text-on-surface">Mercado de Permuta & Loja de Ingredientes</h3>
                <p className="text-sm text-on-surface-variant mt-1">Gerencie os itens disponíveis para troca e compra.</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
                  <input 
                    type="text" 
                    placeholder="Busca..." 
                    className="pl-9 pr-4 py-2 bg-background border border-surface-container rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none w-48"
                  />
                </div>
                <button className="flex items-center gap-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                  <Plus className="w-4 h-4" /> Adicionar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {marketItems.map(item => (
                <div key={item.id} className="bg-background rounded-2xl border border-surface-container p-5 hover:shadow-lg transition-shadow group">
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${item.bg} ${item.color} flex items-center justify-center shrink-0`}>
                      <item.icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Tipo: {item.tipo}</div>
                      <h4 className="text-sm font-bold text-on-surface leading-tight">{item.nome}</h4>
                    </div>
                  </div>
                  <div className="text-xs text-on-surface-variant mb-4 line-clamp-2 min-h-[2rem]">
                    {item.desc}
                  </div>
                  <div className="flex items-center gap-2 mb-4 text-xs font-bold">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded-md">{item.xp} XP</span>
                    <span className="bg-amber-500/10 text-amber-600 px-2 py-1 rounded-md">{item.moedas} Moedas</span>
                  </div>
                  <div className="flex items-center gap-2 pt-4 border-t border-surface-container opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors py-1">
                      <Edit2 className="w-3 h-3" /> Editar
                    </button>
                    <button className="flex-1 flex items-center justify-center gap-1 text-xs font-bold text-on-surface-variant hover:text-red-500 transition-colors py-1">
                      <Trash2 className="w-3 h-3" /> Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Seção 2: Jornada da Transmutação */}
          <section className="bg-surface-container-low p-8 rounded-[2rem] border border-surface-container-high shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div>
                <h3 className="text-2xl font-bold text-on-surface">Jornada da Transmutação</h3>
                <p className="text-sm text-on-surface-variant mt-1">Configuração dos níveis de progressão e conquistas.</p>
              </div>
              <div className="flex gap-2">
                <button className="flex items-center gap-2 bg-surface-container-high text-on-surface px-4 py-2 rounded-xl text-sm font-bold hover:bg-surface-container-highest transition-colors">
                  <Plus className="w-4 h-4" /> Novo Nível
                </button>
              </div>
            </div>

            {/* Scroll Horizontal de Níveis */}
            <div className="flex overflow-x-auto gap-4 pb-6 no-scrollbar snap-x">
              {progressionLevels.map((level, index) => (
                <div key={level.id} className="min-w-[280px] shrink-0 snap-start">
                  {/* Conector */}
                  <div className="flex items-center mb-4">
                    <div className="text-xs font-black uppercase tracking-widest text-on-surface-variant flex-1">
                      {level.nivel}
                    </div>
                    {index < progressionLevels.length - 1 && (
                      <div className="w-12 h-px bg-surface-container-highest" />
                    )}
                  </div>
                  
                  <div className="bg-background rounded-2xl border border-surface-container p-6 relative group">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-bold text-on-surface-variant">Avatar Principal</div>
                        <div className="h-24 rounded-xl bg-surface-container flex flex-col items-center justify-center border border-dashed border-surface-container-high text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer">
                          <UserCircle className="w-6 h-6 mb-1" />
                          <span className="text-[10px]">Preview</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] uppercase font-bold text-on-surface-variant">Medalha</div>
                        <div className="h-24 rounded-xl bg-surface-container flex flex-col items-center justify-center border border-dashed border-surface-container-high text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer">
                          <level.icon className={`w-8 h-8 ${level.color} mb-1`} />
                          <span className="text-[10px]">Preview</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Nome da Medalha</div>
                      <div className="text-sm font-bold text-on-surface mb-3">{level.medalha}</div>
                      
                      <div className="text-[10px] uppercase font-bold text-on-surface-variant mb-1">Desbloqueio</div>
                      <div className="text-xs text-on-surface-variant leading-relaxed">{level.desc}</div>
                    </div>

                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <button className="p-2 bg-background rounded-lg border border-surface-container text-on-surface-variant hover:text-primary shadow-lg"><Edit2 className="w-3 h-3" /></button>
                      <button className="p-2 bg-background rounded-lg border border-surface-container text-on-surface-variant hover:text-red-500 shadow-lg"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Tabela de Resumo */}
            <div className="mt-8 border border-surface-container rounded-2xl overflow-hidden bg-background">
              <table className="w-full text-left text-sm">
                <thead className="bg-surface-container text-xs uppercase font-black tracking-widest text-on-surface-variant">
                  <tr>
                    <th className="px-6 py-4">Nível</th>
                    <th className="px-6 py-4">Medalha</th>
                    <th className="px-6 py-4 text-right">Pontos / XP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container font-medium text-on-surface">
                  {summaryTable.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-container-lowest transition-colors">
                      <td className="px-6 py-4">{row.nivel}</td>
                      <td className="px-6 py-4">{row.medalha}</td>
                      <td className="px-6 py-4 text-right">{row.xp} XP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
            </>
          )}

          {activeTab === 'avatares' && (
            <section className="bg-surface-container-low p-8 rounded-[2rem] border border-surface-container-high shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-on-surface">Matriz de Interações para Conquista de Selos</h3>
                  <p className="text-sm text-on-surface-variant mt-1">Configure os valores necessários para desbloquear cada nível de selo.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20">
                    <Save className="w-4 h-4" /> Aplicar Configuração
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-surface-container bg-background shadow-inner">
                <table className="w-full text-left min-w-[800px] border-collapse">
                  <thead>
                    <tr className="bg-surface-container-lowest">
                      <th className="p-4 border-b border-r border-surface-container font-black text-xs uppercase tracking-widest text-on-surface-variant text-center w-20">Selo ID</th>
                      <th className="p-4 border-b border-r border-surface-container font-black text-xs uppercase tracking-widest text-on-surface-variant w-auto min-w-[250px]">Tipo de Interação</th>
                      
                      {/* Headers dos Níveis */}
                      <th className="p-4 border-b border-r border-surface-container text-center bg-orange-900/10 w-56">
                        <div className="font-black text-sm text-orange-700 dark:text-orange-500 uppercase tracking-wider mb-1">Nível Bronze</div>
                        <div className="text-[10px] text-orange-600/70 uppercase">Coluna</div>
                      </th>
                      <th className="p-4 border-b border-r border-surface-container text-center bg-stone-300/20 dark:bg-stone-700/20 w-56">
                        <div className="font-black text-sm text-stone-600 dark:text-stone-300 uppercase tracking-wider mb-1">Nível Prata</div>
                        <div className="text-[10px] text-stone-500/70 uppercase">Coluna</div>
                      </th>
                      <th className="p-4 border-b border-surface-container text-center bg-amber-500/10 w-56">
                        <div className="font-black text-sm text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">Nível Ouro</div>
                        <div className="text-[10px] text-amber-500/70 uppercase">Coluna</div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {matrix.map((row, idx) => (
                      <tr key={row.id} className="group hover:bg-surface-container-lowest/50 transition-colors">
                        <td className="p-4 border-b border-r border-surface-container text-center">
                          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-container-high font-bold text-on-surface border border-surface-container">
                            {row.id.split('-')[1]}
                          </div>
                        </td>
                        <td className="p-4 border-b border-r border-surface-container font-bold text-sm text-on-surface">
                          {row.id} - {row.nome}
                        </td>
                        
                        {/* Célula Bronze */}
                        <td className="p-4 border-b border-r border-surface-container bg-orange-900/5 group-hover:bg-orange-900/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <img src={`/medalhas/b${row.index}.512.Webp`} alt={`Bronze ${row.index}`} className="w-10 h-10 object-contain drop-shadow-md" />
                            <div className="flex-1 flex items-stretch bg-background rounded-xl border border-orange-500/30 overflow-hidden shadow-sm">
                              <input 
                                type="text" 
                                value={row.bronze + (row.isXP ? ' XP' : '')} 
                                onChange={(e) => handleMatrixInputChange(row.id, 'bronze', e.target.value)}
                                className="w-full min-w-[70px] px-2 py-3 text-center text-sm font-bold text-orange-700 dark:text-orange-400 bg-transparent outline-none" 
                              />
                              <div className="flex flex-col border-l border-orange-500/20 bg-orange-50/50 dark:bg-orange-900/10 shrink-0">
                                <button onClick={() => updateMatrixValue(row.id, 'bronze', 1)} className="px-3 py-1.5 flex-1 hover:bg-orange-500/20 text-orange-700 font-black border-b border-orange-500/20 transition-colors">+</button>
                                <button onClick={() => updateMatrixValue(row.id, 'bronze', -1)} className="px-3 py-1.5 flex-1 hover:bg-orange-500/20 text-orange-700 font-black transition-colors">-</button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Célula Prata */}
                        <td className="p-4 border-b border-r border-surface-container bg-stone-300/10 dark:bg-stone-700/10 group-hover:bg-stone-300/20 transition-colors">
                          <div className="flex items-center gap-3">
                            <img src={`/medalhas/p${row.index}.512.Webp`} alt={`Prata ${row.index}`} className="w-10 h-10 object-contain drop-shadow-md" />
                            <div className="flex-1 flex items-stretch bg-background rounded-xl border border-stone-500/30 overflow-hidden shadow-sm">
                              <input 
                                type="text" 
                                value={row.prata + (row.isXP ? ' XP' : '')} 
                                onChange={(e) => handleMatrixInputChange(row.id, 'prata', e.target.value)}
                                className="w-full min-w-[70px] px-2 py-3 text-center text-sm font-bold text-stone-600 dark:text-stone-300 bg-transparent outline-none" 
                              />
                              <div className="flex flex-col border-l border-stone-500/20 bg-stone-100/50 dark:bg-stone-800/20 shrink-0">
                                <button onClick={() => updateMatrixValue(row.id, 'prata', 1)} className="px-3 py-1.5 flex-1 hover:bg-stone-500/20 text-stone-700 dark:text-stone-300 font-black border-b border-stone-500/20 transition-colors">+</button>
                                <button onClick={() => updateMatrixValue(row.id, 'prata', -1)} className="px-3 py-1.5 flex-1 hover:bg-stone-500/20 text-stone-700 dark:text-stone-300 font-black transition-colors">-</button>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Célula Ouro */}
                        <td className="p-4 border-b border-surface-container bg-amber-500/5 group-hover:bg-amber-500/10 transition-colors">
                          <div className="flex items-center gap-3">
                            <img src={`/medalhas/o${row.index}.512.Webp`} alt={`Ouro ${row.index}`} className="w-10 h-10 object-contain drop-shadow-md" />
                            <div className="flex-1 flex items-stretch bg-background rounded-xl border border-amber-500/30 overflow-hidden shadow-sm">
                              <input 
                                type="text" 
                                value={row.ouro + (row.isXP ? ' XP' : '')} 
                                onChange={(e) => handleMatrixInputChange(row.id, 'ouro', e.target.value)}
                                className="w-full min-w-[70px] px-2 py-3 text-center text-sm font-bold text-amber-700 dark:text-amber-400 bg-transparent outline-none" 
                              />
                              <div className="flex flex-col border-l border-amber-500/20 bg-amber-50/50 dark:bg-amber-900/10 shrink-0">
                                <button onClick={() => updateMatrixValue(row.id, 'ouro', 1)} className="px-3 py-1.5 flex-1 hover:bg-amber-500/20 text-amber-700 font-black border-b border-amber-500/20 transition-colors">+</button>
                                <button onClick={() => updateMatrixValue(row.id, 'ouro', -1)} className="px-3 py-1.5 flex-1 hover:bg-amber-500/20 text-amber-700 font-black transition-colors">-</button>
                              </div>
                            </div>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      </main>
    </div>
  );
}
