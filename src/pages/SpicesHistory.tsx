import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  Leaf, 
  FlaskConical, 
  History, 
  BookOpen, 
  Flame, 
  Quote,
  ArrowRight,
  Info
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, DoughnutController);

const SpicesHistory: React.FC = () => {
  const [activeTab, setActiveTab] = useState('intro');
  const [selectedClassification, setSelectedClassification] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState('india');

  // Classification Data
  const classifications = [
    { id: 'sementes', icon: '🌰', name: 'Sementes', desc: 'Sementes secas geralmente contêm óleos essenciais poderosos encapsulados.', ex: ['Noz-moscada', 'Cardamomo', 'Mostarda', 'Cominho'] },
    { id: 'frutos', icon: '🌶️', name: 'Frutos', desc: 'Bagas secas ou favas que muitas vezes desenvolvem sabor complexo durante a secagem.', ex: ['Pimenta-do-reino', 'Baunilha', 'Pimenta da Jamaica', 'Páprica'] },
    { id: 'botoes', icon: '🌸', name: 'Botões/Flores', desc: 'Botões florais não abertos e secos ao sol.', ex: ['Cravo-da-índia (botão)', 'Alcaparras secas'] },
    { id: 'cascas', icon: '🪵', name: 'Cascas', desc: 'Camada interna da casca de certas árvores, seca e enrolada.', ex: ['Canela do Ceilão', 'Cássia'] },
    { id: 'raizes', icon: '🫚', name: 'Raízes/Rizomas', desc: 'Caules subterrâneos ou raízes, geralmente ricos em amidos e óleos voláteis aromáticos.', ex: ['Gengibre', 'Cúrcuma', 'Galanga'] },
    { id: 'estigmas', icon: '🏵️', name: 'Estigmas', desc: 'A parte mais rara e cara; as partes reprodutivas femininas de flores específicas.', ex: ['Açafrão verdadeiro'] }
  ];

  // Origins Data
  const originData: Record<string, { title: string; content: string }> = {
    india: {
      title: "Subcontinente Indiano",
      content: "Considerado o lar ancestral de muitas especiarias quentes e pungentes. A costa do Malabar (sudoeste da Índia) era o epicentro do comércio da <strong>Pimenta-do-reino</strong>, conhecida como 'Ouro Negro'. Também é o berço do <strong>Cardamomo</strong> (a 'Rainha das Especiarias'), <strong>Cúrcuma</strong> e do <strong>Gengibre</strong>.<br><br><strong>Adoção:</strong> Mercadores árabes controlaram o fluxo destas especiarias para o Ocidente durante séculos, criando mitos sobre bestas voadoras protegendo as colheitas para manter os preços altos na Europa."
    },
    molucas: {
      title: "Ilhas Moluças (A Indonésia)",
      content: "Conhecidas literalmente como as 'Ilhas das Especiarias'. Até o século XVIII, este minúsculo arquipélago era o único lugar na Terra onde cresciam a <strong>Noz-moscada</strong>, o <strong>Macis</strong> e o <strong>Cravo-da-índia</strong>.<br><br><strong>Impacto:</strong> A busca pelo controle direto destas ilhas financiou a Era dos Descobrimentos. Portugueses e Holandeses (VOC - Companhia das Índias Orientais) travaram guerras sangrentas pelo monopólio, escravizando e dizimando populações locais para controlar árvores de noz-moscada."
    },
    americas: {
      title: "Mesoamérica & O Novo Mundo",
      content: "A chegada de Colombo às Américas, buscando uma rota para a Índia, introduziu uma nova revolução de sabores na Europa e na Ásia. A descoberta das <strong>Pimentas do gênero Capsicum</strong> (pimenta malagueta, jalapeño) transformou as culinárias da Índia à Tailândia de forma irreversível.<br><br>Além disso, o México presenteou o mundo com a <strong>Baunilha</strong> (originalmente usada pelos Astecas para aromatizar o chocolate) e a <strong>Pimenta da Jamaica</strong> (Allspice)."
    },
    oriente: {
      title: "Oriente Médio & Mediterrâneo Oriental",
      content: "Embora não seja o clima tropical úmido preferido pela maioria das especiarias intensas, esta região cultiva sementes vitais como <strong>Cominho</strong>, <strong>Coentro</strong> e <strong>Anis</strong>.<br><br>Mais criticamente, é a casa do <strong>Açafrão</strong> (estigmas da flor <em>Crocus sativus</em>), originário da Pérsia/Grécia. Sendo necessário colher manualmente milhares de flores para obter gramas do produto, o açafrão mantém o título de especiaria mais cara do mundo, introduzido na Europa Ibérica pelos Mouros."
    }
  };

  const chartData = {
    labels: ['Vanilina Sintética', 'Vanilina Natural (Biossíntese)', 'Extrato Fava Baunilha Natural'],
    datasets: [{
      data: [85, 14, 1],
      backgroundColor: [
        '#56642b', // Secondary
        '#eab308', // Saffron
        '#914730'  // Primary
      ],
      borderWidth: 2,
      borderColor: '#ffffff'
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          font: { family: 'Be Vietnam Pro', size: 11 },
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `${context.label}: ~${context.parsed}% do mercado`
        }
      }
    }
  };

  const selectedClass = classifications.find(c => c.id === selectedClassification);

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-[#2c241b] font-body pb-20">
      {/* Sub-Header Interativo */}
      <div className="sticky top-[64px] md:top-[72px] z-40 bg-[#fdfbf7]/95 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center py-4 overflow-x-auto">
            <nav className="flex space-x-1 sm:space-x-4">
              {[
                { id: 'intro', label: 'Início', icon: <BookOpen className="w-4 h-4" /> },
                { id: 'conceitos', label: 'Conceitos', icon: <Leaf className="w-4 h-4" /> },
                { id: 'origens', label: 'Origens', icon: <Globe className="w-4 h-4" /> },
                { id: 'evolucao', label: 'Evolução', icon: <History className="w-4 h-4" /> },
                { id: 'quimica', label: 'Ciência', icon: <FlaskConical className="w-4 h-4" /> },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-semibold transition-all rounded-lg
                    ${activeTab === tab.id 
                      ? 'text-primary bg-primary/5' 
                      : 'text-stone-500 hover:text-primary hover:bg-stone-50'}
                  `}
                >
                  {tab.icon}
                  <span className="hidden md:inline">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'intro' && (
            <motion.section
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-16"
            >
              <div className="text-center max-w-3xl mx-auto">
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-primary font-black tracking-[0.3em] uppercase text-xs mb-4"
                >
                  Alquimia do Prato Apresenta
                </motion.p>
                <h2 className="font-serif text-5xl sm:text-7xl text-stone-900 mb-8 leading-tight tracking-tighter">
                  O Mundo em uma <span className="text-primary italic text-6xl sm:text-8xl">Pitada</span>
                </h2>
                <p className="text-lg sm:text-xl text-stone-600 leading-relaxed mb-10 font-medium">
                  Muito antes de existirem supermercados, as especiarias moldaram o mapa do mundo. Elas motivaram descobrimentos, construíram impérios e revolucionaram a forma como a humanidade se relaciona com a comida.
                </p>
                <button 
                  onClick={() => setActiveTab('conceitos')}
                  className="bg-stone-900 text-white px-10 py-4 rounded-full hover:bg-primary transition-all duration-500 font-bold shadow-xl flex items-center gap-3 mx-auto group active:scale-95"
                >
                  Iniciar Exploração <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                  { icon: <Globe className="w-8 h-8" />, title: 'Poder Global', desc: 'Por séculos, o controle das rotas de especiarias significava o controle da economia global.' },
                  { icon: <Leaf className="w-8 h-8" />, title: 'Medicina Ancestral', desc: 'Originalmente valorizadas por suas propriedades conservantes e curativas antes de serem apenas temperos.' },
                  { icon: <FlaskConical className="w-8 h-8" />, title: 'Química Pura', desc: 'O sabor é, em sua essência, um complexo de compostos voláteis que hoje controlamos.' },
                ].map((item, i) => (
                  <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-stone-100 text-center hover:shadow-xl transition-all">
                    <div className="inline-flex items-center justify-center p-4 bg-stone-50 rounded-2xl text-primary mb-6">{item.icon}</div>
                    <h3 className="font-serif font-bold text-2xl mb-4 text-stone-900">{item.title}</h3>
                    <p className="text-stone-500 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {activeTab === 'conceitos' && (
            <motion.section
              key="conceitos"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              <div className="max-w-3xl">
                <h2 className="font-serif text-4xl text-stone-900 mb-6">O que são <span className="text-primary">Especiarias</span>?</h2>
                <p className="text-lg text-stone-600">
                  Para entender a história, precisamos definir o objeto. Nesta seção, exploramos a diferença fundamental entre ervas e especiarias e como classificamos esses tesouros de sabor.
                </p>
              </div>

              <div className="bg-white rounded-[40px] p-8 sm:p-12 shadow-xl border border-stone-100">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                  <div className="space-y-6">
                    <h3 className="font-serif text-3xl font-bold text-primary">Especiarias vs. Ervas</h3>
                    <div className="space-y-4 text-stone-700 leading-relaxed text-lg">
                      <p>
                        <strong>Ervas</strong> são as partes verdes e folhosas de plantas cultivadas em climas temperados (ex: manjericão, orégano).
                      </p>
                      <p>
                        <strong>Especiarias</strong> vêm de outras partes da planta — raízes, caules, cascas, sementes, frutos ou flores — e originam-se de regiões tropicais. Elas são quase sempre secas para preservar seus óleos voláteis.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
                    <div className="text-center space-y-4">
                      <div className="w-40 h-40 rounded-full bg-secondary/10 flex items-center justify-center text-6xl shadow-inner border-2 border-secondary/20">🌿</div>
                      <span className="font-black text-xs uppercase tracking-widest text-secondary">Ervas (Folhas)</span>
                    </div>
                    <div className="text-4xl text-stone-200 hidden sm:block">↔️</div>
                    <div className="text-center space-y-4">
                      <div className="w-40 h-40 rounded-full bg-primary/10 flex items-center justify-center text-6xl shadow-inner border-2 border-primary/20">🪵</div>
                      <span className="font-black text-xs uppercase tracking-widest text-primary">Especiarias (Resto)</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <div className="text-center">
                  <h3 className="font-serif text-3xl font-bold text-stone-900 mb-2">Classificação Botânica</h3>
                  <p className="text-stone-500">Selecione uma categoria para explorar os exemplos</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {classifications.map(c => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedClassification(c.id)}
                      className={`
                        p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 group
                        ${selectedClassification === c.id 
                          ? 'bg-primary border-primary text-white shadow-lg scale-105' 
                          : 'bg-white border-stone-100 hover:border-primary/30 text-stone-700'}
                      `}
                    >
                      <span className="text-4xl group-hover:scale-110 transition-transform">{c.icon}</span>
                      <span className="font-bold text-sm">{c.name}</span>
                    </button>
                  ))}
                </div>
                
                <AnimatePresence mode="wait">
                  {selectedClass && (
                    <motion.div
                      key={selectedClass.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-stone-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-8 opacity-10 text-9xl">{selectedClass.icon}</div>
                      <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-2xl">{selectedClass.icon}</div>
                          <h4 className="font-serif text-3xl font-bold">{selectedClass.name}</h4>
                        </div>
                        <p className="text-xl text-stone-300 max-w-2xl">{selectedClass.desc}</p>
                        <div className="flex flex-wrap gap-3">
                          {selectedClass.ex.map(ex => (
                            <span key={ex} className="bg-white/10 backdrop-blur-md px-5 py-2 rounded-full text-sm font-bold border border-white/10">{ex}</span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.section>
          )}

          {activeTab === 'origens' && (
            <motion.section
              key="origens"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-10"
            >
              <div className="max-w-3xl">
                <h2 className="font-serif text-4xl text-stone-900 mb-6">Geografia do <span className="text-primary">Sabor</span></h2>
                <p className="text-lg text-stone-600">
                  As especiarias são ligadas à geografia. Antes da globalização, certos sabores só existiam em pequenas ilhas ou ecossistemas específicos.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 flex flex-col gap-3">
                  {Object.entries(originData).map(([key, data]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedRegion(key)}
                      className={`
                        p-6 rounded-3xl border-2 text-left transition-all group
                        ${selectedRegion === key 
                          ? 'bg-stone-900 border-stone-900 text-white shadow-xl translate-x-2' 
                          : 'bg-white border-stone-100 hover:border-primary/40 text-stone-600'}
                      `}
                    >
                      <h3 className={`font-bold text-lg mb-1 ${selectedRegion === key ? 'text-white' : 'text-stone-900'}`}>{data.title}</h3>
                      <p className="text-xs font-medium opacity-60 uppercase tracking-widest">Explorar região</p>
                    </button>
                  ))}
                </div>
                
                <div className="lg:col-span-8 bg-white p-10 sm:p-16 rounded-[50px] shadow-2xl border border-stone-100 relative overflow-hidden">
                  <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full"></div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={selectedRegion}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-8 relative z-10"
                    >
                      <h3 className="font-serif text-4xl font-bold text-stone-900">{originData[selectedRegion].title}</h3>
                      <div 
                        className="text-stone-700 space-y-6 text-lg leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: originData[selectedRegion].content }}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </motion.section>
          )}

          {activeTab === 'evolucao' && (
            <motion.section
              key="evolucao"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-16"
            >
              <div className="text-center max-w-2xl mx-auto">
                <h2 className="font-serif text-4xl text-stone-900 mb-6">Linha do Tempo</h2>
                <p className="text-lg text-stone-600">
                  De oferendas sagradas a pilares da gastronomia cotidiana.
                </p>
              </div>

              <div className="max-w-4xl mx-auto relative pl-8 sm:pl-0">
                <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-1 bg-stone-200 rounded-full"></div>

                {[
                  { era: 'Antiguidade', date: '3000 a.C. - 500 d.C.', icon: '🏺', color: 'bg-amber-400', desc: 'Egípcios, Gregos e Romanos usavam especiarias em embalsamamentos, rituais e como remédios. O uso culinário era reservado à elite.' },
                  { era: 'Idade Média', date: 'Séc. V - XV', icon: '👑', color: 'bg-primary', desc: 'Símbolos supremos de status e riqueza. A culinária europeia rica era fortemente condimentada para ostentação social.' },
                  { era: 'Grandes Navegações', date: 'Séc. XV - XVII', icon: '⛵', color: 'bg-secondary', desc: 'A busca por rotas diretas para a Ásia motivou os maiores navegadores da história. Guerras globais pelo monopólio.' },
                  { era: 'Democratização', date: 'Séc. XVIII - Hoje', icon: '🍽️', color: 'bg-stone-900', desc: 'Quebra de monopólios e expansão do cultivo. Os preços caíram, tornando-as acessíveis para o uso diário global.' },
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className={`relative mb-16 flex flex-col sm:flex-row items-center gap-8 ${i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}
                  >
                    <div className={`sm:w-1/2 flex flex-col ${i % 2 === 0 ? 'sm:items-end sm:text-right' : 'sm:items-start sm:text-left'} pl-10 sm:pl-0`}>
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-stone-400 mb-2">{item.date}</span>
                      <h3 className="font-serif text-3xl font-bold text-stone-900 mb-4">{item.era}</h3>
                      <p className="text-stone-600 leading-relaxed text-lg">{item.desc}</p>
                    </div>
                    
                    <div className="absolute left-0 sm:left-1/2 -translate-x-1/2 w-12 h-12 rounded-2xl bg-white border-4 border-stone-50 shadow-xl flex items-center justify-center text-xl z-10 transition-transform hover:rotate-12">
                      <div className={`w-full h-full rounded-xl ${item.color} flex items-center justify-center text-white shadow-inner`}>
                        {item.icon}
                      </div>
                    </div>
                    
                    <div className="hidden sm:block sm:w-1/2"></div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {activeTab === 'quimica' && (
            <motion.section
              key="quimica"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="max-w-3xl">
                <h2 className="font-serif text-4xl text-stone-900 mb-6">A <span className="text-primary">Ciência</span> do Sabor</h2>
                <p className="text-lg text-stone-600">
                  Hoje, entendemos que o "sabor" é uma complexa matriz química. Podemos identificar, extrair e sintetizar as moléculas responsáveis pelos aromas.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-[35px] border-l-[12px] border-secondary shadow-lg">
                    <h3 className="font-serif text-2xl font-bold text-stone-900 mb-4 flex items-center gap-3">
                      <FlaskConical className="w-6 h-6 text-secondary" /> Compostos Voláteis
                    </h3>
                    <ul className="space-y-4 text-stone-700">
                      <li className="flex gap-4">
                        <span className="font-black text-secondary">•</span>
                        <div><strong>Piperina:</strong> O ardor característico da pimenta-do-reino.</div>
                      </li>
                      <li className="flex gap-4">
                        <span className="font-black text-secondary">•</span>
                        <div><strong>Eugenol:</strong> O aroma medicinal intenso e anestésico do cravo.</div>
                      </li>
                      <li className="flex gap-4">
                        <span className="font-black text-secondary">•</span>
                        <div><strong>Cinemaldeído:</strong> O sabor doce e picante da canela.</div>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-stone-900 text-white p-8 rounded-[35px] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">🍦</div>
                    <h3 className="font-serif text-2xl font-bold mb-4 flex items-center gap-3">
                      <Info className="w-6 h-6 text-primary" /> O Caso da Baunilha
                    </h3>
                    <p className="text-stone-300 leading-relaxed mb-6">
                      A síntese química permitiu atender à demanda global. A molécula principal, a <strong>Vanilina</strong>, é hoje sintetizada em larga escala, garantindo que o sabor esteja presente em todo o mundo.
                    </p>
                    <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                      <Quote className="w-8 h-8 text-primary opacity-50" />
                      <p className="text-sm italic font-medium">"A síntese química é a democratização final do luxo sensorial."</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[50px] shadow-2xl border border-stone-100 flex flex-col items-center">
                  <h3 className="font-bold text-xl text-stone-900 mb-2">Mercado Global de Baunilha</h3>
                  <p className="text-xs font-black uppercase tracking-widest text-stone-400 mb-8">Volume de Consumo por Origem</p>
                  
                  <div className="relative w-full h-[350px]">
                    <Doughnut data={chartData} options={chartOptions} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-serif font-bold text-stone-900">99%</span>
                      <span className="text-[10px] font-black uppercase text-stone-400">Aroma/Sintético</span>
                    </div>
                  </div>
                  
                  <p className="text-xs text-stone-500 mt-8 text-center max-w-sm leading-relaxed">
                    Embora a molécula principal seja idêntica, a fava natural (apenas 1%) carrega centenas de notas secundárias irreplicáveis.
                  </p>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default SpicesHistory;
