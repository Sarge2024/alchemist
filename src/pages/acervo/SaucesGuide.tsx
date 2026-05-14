/**
 * SaucesGuide.tsx
 * Apresentação interativa sobre a Arte dos Molhos para o Acervo Digital.
 * Baseado no Guia Clássico de Alta Gastronomia.
 */
import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Info, Clock, MapPin, Lightbulb, ChefHat, ExternalLink, X, Utensils } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

Chart.register(...registerables);

const SAUCE_DATA: any = {
  french: [
    {
      id: 'bechamel',
      name: 'Béchamel',
      icon: '🥛',
      base: 'Roux Branco (Manteiga + Farinha) e Leite',
      origin: 'França / Itália',
      recipeIds: ['bAG3NyK83qxt85oRh10r'],
      time: '20 min',
      timeNum: 20,
      pairings: 'Lasanhas, gratinados de batata ou couve-flor, mac and cheese, croque monsieur.',
      tips: [
        'Cozinhe o roux em fogo baixo para que a farinha não escureça.',
        'Adicione o leite aos poucos, mexendo vigorosamente com um fouet.',
        'Uma pitada de noz-moscada ralada na hora é obrigatória.'
      ],
      flavor: [3, 1, 6, 4, 3] 
    },
    {
      id: 'veloute',
      name: 'Velouté',
      icon: '🍗',
      base: 'Roux Claro e Caldo Claro (Frango, Vitela ou Peixe)',
      origin: 'França (Carême)',
      time: '35 min',
      timeNum: 35,
      pairings: 'Aves brancas, peixes delicados, frutos do mar e base para sopas cremosas.',
      tips: [
        'A qualidade do Velouté depende 100% da qualidade do caldo utilizado.',
        'Coe o caldo antes de adicioná-lo ao roux para uma textura aveludada.',
        'Pode ser finalizado com creme de leite e gemas (liaison).'
      ],
      flavor: [5, 2, 4, 2, 4] 
    },
    {
      id: 'espagnole',
      name: 'Espagnole',
      icon: '🥩',
      base: 'Roux Escuro, Caldo de Carne e Mirepoix',
      origin: 'França',
      time: '180 min',
      timeNum: 180,
      pairings: 'Carnes vermelhas assadas, cordeiro, pratos de caça.',
      tips: [
        'O roux deve ser torrado até atingir a cor de avelã escuro.',
        'É um molho de redução longa. Escumar a gordura é vital.',
        'Base para o famoso molho Demi-glace.'
      ],
      flavor: [9, 3, 5, 2, 6] 
    },
    {
      id: 'hollandaise',
      name: 'Hollandaise',
      icon: '🧈',
      base: 'Gemas de Ovo, Manteiga Clarificada e Suco de Limão',
      origin: 'Holanda / França',
      time: '15 min',
      timeNum: 15,
      pairings: 'Ovos Benedict, aspargos, salmão, lagosta.',
      tips: [
        'É uma emulsão frágil. O banho-maria não pode ferver agressivamente.',
        'A manteiga deve ser adicionada em um fio finíssimo e constante.',
        'Sirva imediatamente. Não pode ser reaquecido em fogo alto.'
      ],
      flavor: [4, 6, 9, 1, 5] 
    },
    {
      id: 'tomato',
      name: 'Sauce Tomate',
      icon: '🍅',
      base: 'Tomates, Mirepoix e Caldo',
      origin: 'Américas / França',
      time: '90 min',
      timeNum: 90,
      pairings: 'Massas variadas, carnes brancas, nhoques.',
      tips: [
        'A versão de Escoffier usa roux e caldo de carne para dar profundidade.',
        'O cozimento lento suaviza a acidez do tomate.',
        'Passe por um chinois para uma textura clássica lisa.'
      ],
      flavor: [7, 8, 3, 5, 5] 
    }
  ],
  italian: [
    {
      id: 'pomodoro',
      name: 'Pomodoro / Sugo',
      icon: '🍅',
      base: 'Tomates Pelati, Alho ou Cebola, Azeite, Manjericão',
      origin: 'Nápoles / Itália',
      time: '45 min',
      timeNum: 45,
      pairings: 'Espaguete clássico, Penne, raviólis, Parmegiana.',
      tips: [
        'Diferente do francês, foca no frescor. Cozinhe rápido para reter o sabor.',
        'Use sempre tomates de excelente qualidade (ex: San Marzano).',
        'Rasgue o manjericão com as mãos no final para não oxidar.'
      ],
      flavor: [6, 8, 4, 6, 4]
    },
    {
      id: 'bolognese',
      name: 'Ragù alla Bolognese',
      icon: '🍝',
      base: 'Carne moída, Soffritto, Vinho, Extrato de Tomate, Leite',
      origin: 'Bolonha, Itália',
      time: '240 min',
      timeNum: 240,
      pairings: 'Tagliatelle, Pappardelle ou Lasagna Bolognese.',
      tips: [
        'Não é um "molho de tomate com carne", é um molho de carne.',
        'Cozimento lentíssimo (3 a 4 horas) é inegociável.',
        'O leite protege a carne da acidez do vinho e do tomate.'
      ],
      flavor: [10, 4, 7, 3, 6]
    },
    {
      id: 'carbonara',
      name: 'Carbonara',
      icon: '🥓',
      base: 'Guanciale, Queijo Pecorino, Gemas e Pimenta Preta',
      origin: 'Roma, Itália',
      time: '15 min',
      timeNum: 15,
      pairings: 'Espaguete, Rigatoni ou Bucatini.',
      tips: [
        'Nunca use creme de leite. A cremosidade vem da emulsão natural.',
        'Misture os ovos e o queijo fora do fogo residual da panela.',
        'A pimenta preta deve ser moída na hora e generosamente.'
      ],
      flavor: [8, 1, 8, 1, 9]
    },
    {
      id: 'pesto',
      name: 'Pesto Genovese',
      icon: '🌿',
      base: 'Manjericão, Pinoli, Queijos, Alho e Azeite EVOO',
      origin: 'Gênova, Itália',
      time: '10 min',
      timeNum: 10,
      pairings: 'Trofie, Gnocchi, Trenette ou sopas.',
      tips: [
        'Use um pilão para amassar as folhas, evitando oxidação.',
        'Nunca aqueça o pesto em uma panela. O calor amarga o manjericão.',
        'Adicione água do cozimento da massa para soltar o pesto.'
      ],
      flavor: [6, 2, 8, 2, 7]
    },
    {
      id: 'alfredo',
      name: 'Alfredo (Original)',
      icon: '🧀',
      base: 'Manteiga e Parmigiano-Reggiano jovem',
      origin: 'Roma, Itália',
      time: '10 min',
      timeNum: 10,
      pairings: 'Fettuccine.',
      tips: [
        'O autêntico italiano NÃO leva creme de leite.',
        'A massa deve estar bem quente para derreter o queijo.',
        'Sirva em pratos aquecidos para o molho não coagular.'
      ],
      flavor: [7, 1, 9, 1, 7]
    }
  ]
};

export default function SaucesGuide() {
  const [category, setCategory] = useState<'french' | 'italian'>('french');
  const [selectedSauce, setSelectedSauce] = useState<any>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const barInstance = useRef<Chart | null>(null);

  useEffect(() => {
    updateBarChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const updateBarChart = () => {
    if (!barChartRef.current) return;
    
    if (barInstance.current) {
      barInstance.current.destroy();
    }

    const ctx = barChartRef.current.getContext('2d');
    if (!ctx) return;

    const data = SAUCE_DATA[category];
    const labels = data.map((s: any) => s.name);
    const times = data.map((s: any) => s.timeNum);
    
    const colors = times.map((t: number) => {
      if (t > 60) return 'rgba(139, 35, 35, 0.8)'; 
      if (t > 20) return 'rgba(44, 62, 80, 0.8)';  
      return 'rgba(46, 139, 87, 0.8)'; 
    });

    barInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Tempo (min)',
          data: times,
          backgroundColor: colors,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: { beginAtZero: true },
          x: { grid: { display: false } }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#2C3E50] font-sans pb-20">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/acervo" className="p-2 hover:bg-stone-100 rounded-full transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-[#8B2323]">Arte dos Molhos</h1>
              <p className="text-[10px] uppercase tracking-widest text-stone-400">Guia de Alta Gastronomia</p>
            </div>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-bold">
            <a href="#explorador" className="hover:text-[#8B2323] transition-colors">Explorador</a>
            <a href="#analise" className="hover:text-[#8B2323] transition-colors">Análise Técnica</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <section className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-serif font-bold mb-6 text-[#2C3E50]"
          >
            A Alma da Gastronomia
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-stone-600 leading-relaxed"
          >
            Na culinária clássica, o molho não é um mero acompanhamento; é a espinha dorsal que une, eleva e define um prato. 
            Explore a genialidade dos "Molhos Mãe" franceses e a tradição rústica dos clássicos italianos.
          </motion.p>
        </section>

        <section id="explorador" className="mb-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <h3 className="text-2xl font-bold mb-2 flex items-center gap-2">
                <ChefHat className="text-[#8B2323]" /> 1. Selecione a Tradição
              </h3>
              <p className="text-stone-500">Explore as bases fundamentais de cada escola culinária.</p>
            </div>
            <div className="flex bg-stone-100 p-1.5 rounded-2xl">
              <button 
                onClick={() => { setCategory('french'); setSelectedSauce(null); }}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${category === 'french' ? 'bg-white text-[#8B2323] shadow-md' : 'text-stone-500 hover:text-stone-700'}`}
              >
                🇫🇷 Francesa
              </button>
              <button 
                onClick={() => { setCategory('italian'); setSelectedSauce(null); }}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${category === 'italian' ? 'bg-white text-[#8B2323] shadow-md' : 'text-stone-500 hover:text-stone-700'}`}
              >
                🇮🇹 Italiana
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
            {SAUCE_DATA[category].map((sauce: any) => (
              <motion.button
                key={sauce.id}
                whileHover={{ y: -5 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedSauce(sauce)}
                className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center text-center ${selectedSauce?.id === sauce.id ? 'bg-white border-[#8B2323] shadow-xl' : 'bg-white border-transparent shadow-sm hover:shadow-md'}`}
              >
                <span className="text-4xl mb-4">{sauce.icon}</span>
                <h4 className="font-bold text-lg mb-1">{sauce.name}</h4>
                <span className="text-[10px] font-black uppercase text-stone-400 tracking-tighter">{sauce.time}</span>
              </motion.button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {selectedSauce ? (
              <SauceSpotlight key={selectedSauce.id} sauce={selectedSauce} />
            ) : (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-20 bg-stone-50 rounded-[2.5rem] border-2 border-dashed border-stone-200"
              >
                <ChefHat className="w-16 h-16 text-stone-200 mx-auto mb-4" />
                <p className="text-stone-400 font-bold uppercase tracking-widest text-sm">Selecione um molho para ver a análise</p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <section id="analise" className="bg-white p-10 md:p-16 rounded-[3rem] shadow-xl border border-stone-100">
          <div className="max-w-2xl mb-12">
            <h3 className="text-3xl font-bold mb-4">Análise Técnica de Tempo</h3>
            <p className="text-stone-600 leading-relaxed">
              O tempo de preparo é um indicador direto da profundidade de sabor (Umami). 
              Molhos de longa redução, como o Bolonhesa ou Espagnole, exigem paciência para a quebra de colágeno e concentração de aromas.
            </p>
          </div>
          <div className="h-[400px] w-full">
            <canvas ref={barChartRef}></canvas>
          </div>
        </section>
      </main>

      <footer className="mt-20 py-20 bg-[#2C3E50] text-white overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-16 relative z-10">
          <div>
            <h4 className="text-2xl font-serif font-bold mb-6">Alquimia do Prato</h4>
            <p className="text-stone-400 leading-relaxed max-w-md">
              Elevando a culinária caseira aos padrões da alta gastronomia com técnica, história e precisão científica.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h5 className="font-bold mb-4 uppercase text-xs tracking-widest text-stone-500">Acervo</h5>
              <ul className="space-y-2 text-sm text-stone-300">
                <li><Link to="/acervo" className="hover:text-white transition-colors">Voltar à Biblioteca</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">Técnicas Clássicas</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-bold mb-4 uppercase text-xs tracking-widest text-stone-500">Legal</h5>
              <p className="text-[10px] text-stone-500 leading-relaxed">
                As informações técnicas seguem os padrões de Escoffier e tradições regionais certificadas.
              </p>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-stone-800 text-center text-[10px] text-stone-500 font-bold uppercase tracking-[0.2em]">
          &copy; 2026 Alquimia do Prato • Digital Collection
        </div>
      </footer>
    </div>
  );
}

function SauceSpotlight({ sauce }: { sauce: any }) {
  const navigate = useNavigate();
  const [showSoonModal, setShowSoonModal] = useState(false);
  const [showSelectionModal, setShowSelectionModal] = useState(false);
  const radarRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!radarRef.current) return;

    // Usar um pequeno delay para garantir que o elemento está renderizado e com tamanho final
    const timer = setTimeout(() => {
      const ctx = radarRef.current?.getContext('2d');
      if (!ctx) return;

      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      chartInstance.current = new Chart(ctx, {
        type: 'radar',
        data: {
          labels: ['Umami', 'Acidez', 'Gordura', 'Doçura', 'Salgado'],
          datasets: [{
            label: `Perfil: ${sauce.name}`,
            data: sauce.flavor,
            backgroundColor: 'rgba(139, 35, 35, 0.2)',
            borderColor: 'rgba(139, 35, 35, 1)',
            pointBackgroundColor: 'rgba(46, 139, 87, 1)',
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: 'rgba(46, 139, 87, 1)',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: { duration: 800 },
          scales: {
            r: {
              angleLines: { color: 'rgba(0, 0, 0, 0.1)' },
              grid: { color: 'rgba(0, 0, 0, 0.1)' },
              pointLabels: {
                font: { size: 12, family: "'Inter', sans-serif", weight: 'bold' },
                color: '#2C3E50'
              },
              ticks: {
                beginAtZero: true,
                max: 10,
                stepSize: 2,
                display: false 
              }
            }
          },
          plugins: {
            legend: { display: false }
          }
        }
      });
    }, 150);

    return () => {
      clearTimeout(timer);
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [sauce]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-[2.5rem] shadow-2xl border border-stone-100 overflow-hidden"
    >
      <div className="bg-[#8B2323] p-8 text-white flex items-center justify-between">
        <h3 className="text-3xl font-serif font-bold">{sauce.name}</h3>
        <span className="text-4xl">{sauce.icon}</span>
      </div>
      <div className="p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-2">
              <Info className="w-3 h-3" /> A Base Estrutural
            </h4>
            <p className="text-xl font-medium border-l-4 border-[#8B2323] pl-4 italic">{sauce.base}</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
              <h4 className="text-xs font-bold text-stone-400 mb-2 flex items-center gap-2 uppercase"><MapPin className="w-3 h-3" /> Origem</h4>
              <p className="font-bold text-sm">{sauce.origin}</p>
            </div>
            <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100">
              <h4 className="text-xs font-bold text-stone-400 mb-2 flex items-center gap-2 uppercase"><Clock className="w-3 h-3" /> Preparo</h4>
              <p className="font-bold text-sm">{sauce.time}</p>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-[#2E8B57] mb-3">Harmonização</h4>
            <p className="text-stone-600 leading-relaxed">{sauce.pairings}</p>
          </div>

          <div className="bg-[#8B2323]/5 p-8 rounded-3xl border border-[#8B2323]/10">
            <h4 className="text-xs font-black uppercase tracking-widest text-[#8B2323] mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4" /> Segredos do Chef
            </h4>
            <ul className="space-y-3">
              {sauce.tips.map((tip: string, i: number) => (
                <li key={i} className="text-sm text-stone-700 flex gap-3">
                  <span className="text-[#8B2323] font-bold">•</span> {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-stone-50 rounded-[2rem] p-8 flex flex-col items-center justify-center border border-stone-100">
          <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-8">Análise Sensorial (0-10)</h4>
          <div className="w-full aspect-square max-w-[400px]">
            <canvas ref={radarRef}></canvas>
          </div>
          <p className="text-[10px] text-stone-400 mt-8 text-center max-w-xs uppercase font-bold tracking-widest">
            Equilíbrio entre Umami, Acidez, Gordura, Doçura e Salgado
          </p>

          <button 
            onClick={() => {
              const ids = sauce.recipeIds || [];
              if (ids.length > 1) {
                setShowSelectionModal(true);
              } else if (ids.length === 1) {
                navigate(`/recipe/${ids[0]}`);
              } else {
                setShowSoonModal(true);
              }
            }}
            className="w-full mt-10 py-4 bg-[#8B2323] text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-[#5C1616] transition-all shadow-xl shadow-[#8B2323]/20 group"
          >
            {(sauce.recipeIds?.length > 0) ? (
              <>
                <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {sauce.recipeIds.length > 1 ? 'Escolher Versão da Receita' : 'Ver Receita do Alquimista'}
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                Receita em Breve
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Seleção (Múltiplas Receitas) */}
      <AnimatePresence>
        {showSelectionModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSelectionModal(false)}
              className="absolute inset-0 bg-stone-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <div className="bg-[#8B2323] p-8 text-white">
                <h3 className="text-2xl font-serif font-bold mb-1">Escolha a Versão</h3>
                <p className="text-white/70 text-sm italic">Existem múltiplas variações para o {sauce.name}</p>
              </div>
              <div className="p-8 space-y-4">
                {sauce.recipeIds.map((id: string, idx: number) => (
                  <button
                    key={id}
                    onClick={() => navigate(`/recipe/${id}`)}
                    className="w-full p-6 rounded-2xl border-2 border-stone-100 hover:border-[#8B2323] hover:bg-[#8B2323]/5 transition-all flex items-center justify-between group"
                  >
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#8B2323] block mb-1">Opção {idx + 1}</span>
                      <span className="font-bold text-[#2C3E50]">{sauce.name} {idx === 0 ? 'Tradicional' : `Versão ${idx + 1}`}</span>
                    </div>
                    <ChevronLeft className="w-5 h-5 rotate-180 text-stone-300 group-hover:text-[#8B2323] transition-colors" />
                  </button>
                ))}
              </div>
              <div className="p-6 bg-stone-50 border-t border-stone-100 flex justify-center">
                <button 
                  onClick={() => setShowSelectionModal(false)}
                  className="text-stone-400 font-bold text-sm hover:text-stone-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Em Breve */}
      <AnimatePresence>
        {showSoonModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSoonModal(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Utensils className="w-10 h-10" />
              </div>
              <h3 className="text-3xl font-serif font-bold text-[#2C3E50] mb-4">Em Breve</h3>
              <p className="text-stone-500 leading-relaxed mb-8">
                Nossos alquimistas estão finalizando os testes técnicos desta receita clássica para garantir a perfeição no seu prato.
              </p>
              <button 
                onClick={() => setShowSoonModal(false)}
                className="w-full py-4 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-colors"
              >
                Entendido
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
