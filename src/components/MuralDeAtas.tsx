import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Calendar, Star, ChevronRight, Hash, CheckCircle2, Quote, Flame, Users, Award, ShieldCheck, MessageSquare } from 'lucide-react';
import { loungeService, DailyAta } from '../infra/services/loungeService';
import { useAuth } from '../context/AuthContext';

/**
 * VoteButton Component
 * Permite que usuários confirmem a precisão de um tópico da ata.
 */
const VoteButton: React.FC<{ ataId: string, topicIndex: number, votes?: Record<string, boolean> }> = ({ ataId, topicIndex, votes }) => {
  const { user } = useAuth();
  const [isVoting, setIsVoting] = useState(false);
  
  // Garantia contra votos nulos do Firestore
  const safeVotes = votes || {};
  const voteCount = Object.keys(safeVotes).length;
  const hasVoted = user ? !!safeVotes[user.uid] : false;

  const handleVote = async () => {
    if (!user || isVoting || hasVoted) return;
    setIsVoting(true);
    try {
      await loungeService.voteOnAtaTopic(ataId, topicIndex, user.uid);
    } catch (error) {
      console.error("Erro ao votar:", error);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <button
      onClick={handleVote}
      disabled={!user || hasVoted || isVoting}
      className={`
        mt-3 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all
        ${hasVoted 
          ? 'bg-green-100 text-green-700 border border-green-200' 
          : 'bg-stone-100 text-stone-500 hover:bg-stone-200 border border-stone-200 active:scale-95'}
      `}
    >
      <CheckCircle2 className={`w-4 h-4 ${hasVoted ? 'fill-current' : ''}`} />
      {hasVoted ? 'Resumo Confirmado' : 'Este resumo está correto?'}
      {voteCount > 0 && <span className="ml-1 opacity-60">({voteCount})</span>}
    </button>
  );
};

/**
 * Componente Mural de Atas (Redesenhado v2.2.0).
 * Implementa o modelo editorial de Ata de Interação Comunitária.
 */
export const MuralDeAtas: React.FC = () => {
  const [atas, setAtas] = useState<DailyAta[]>([]);
  const [selectedAta, setSelectedAta] = useState<DailyAta | null>(null);

  useEffect(() => {
    const unsubscribe = loungeService.subscribeToAtas((newAtas) => {
      setAtas(newAtas);
    });
    return () => unsubscribe();
  }, []);

  // Auto-seleciona a ata mais recente quando a lista carregar pela primeira vez
  useEffect(() => {
    if (!selectedAta && atas.length > 0) {
      setSelectedAta(atas[0]);
    }
  }, [atas, selectedAta]);

  // Memoize para evitar re-calculo desnecessário do agrupamento
  const groupedAtas = React.useMemo(() => {
    return atas.reduce((acc, ata) => {
      const dateParts = (ata.date || "").split('/');
      if (dateParts.length < 3) return acc;
      const month = dateParts[1] + '/' + dateParts[2];
      if (!acc[month]) acc[month] = [];
      acc[month].push(ata);
      return acc;
    }, {} as Record<string, DailyAta[]>);
  }, [atas]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-on-surface tracking-tight flex items-center gap-3 md:gap-4">
          <BookOpen className="w-8 h-8 md:w-10 md:h-10 text-primary" /> Mural de Atas
        </h2>
        <p className="text-on-surface-variant text-sm md:text-base font-medium font-body italic">A memória viva da nossa inteligência gastronômica coletiva.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar: Histórico de Atas */}
        <div className="lg:col-span-4 space-y-4">
          <div className="px-4 py-2 bg-surface-container rounded-xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
            Histórico Recente
          </div>
          <div className="space-y-6">
            {(Object.entries(groupedAtas) as [string, DailyAta[]][]).map(([month, monthAtas]) => (
              <div key={month} className="space-y-3">
                <div className="flex items-center gap-2 px-2 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/60">
                  <div className="h-px flex-1 bg-surface-container-high"></div>
                  <span>{month}</span>
                  <div className="h-px flex-1 bg-surface-container-high"></div>
                </div>
                <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 no-scrollbar snap-x">
                  <AnimatePresence mode="popLayout">
                    {Array.isArray(monthAtas) && monthAtas.map((ata) => (
                      <motion.button
                        key={ata.id}
                        onClick={() => setSelectedAta(ata)}
                        whileHover={{ x: 4 }}
                        className={`
                          flex-shrink-0 w-[280px] lg:w-full p-4 rounded-2xl text-left transition-all border group snap-start
                          ${selectedAta?.id === ata.id 
                            ? 'bg-stone-900 dark:bg-stone-800 border-stone-900 dark:border-stone-700 text-white shadow-xl' 
                            : 'bg-background border-surface-container-high text-on-surface-variant hover:border-primary/40'}
                        `}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${selectedAta?.id === ata.id ? 'text-amber-400' : 'text-stone-400'}`}>
                            {ata.date}
                          </span>
                          <div className="flex items-center gap-1.5 text-[9px] font-bold opacity-60">
                            <MessageSquare className="w-3 h-3" />
                            {ata.stats?.totalMessages || 0}
                          </div>
                        </div>
                        <h4 className={`font-bold text-sm mb-1 line-clamp-1 ${selectedAta?.id === ata.id ? 'text-white' : 'text-on-surface'}`}>
                          {ata.topics?.[0]?.title || "Ata Sem Tópicos"}
                        </h4>
                        <p className={`text-[10px] font-medium opacity-60 line-clamp-1 italic ${selectedAta?.id === ata.id ? 'text-stone-300' : 'text-on-surface-variant'}`}>
                          Assunto: {ata.topics?.[0]?.summary || "Nenhum resumo disponível"}
                        </p>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>

          {atas.length === 0 && (
            <div className="p-12 text-center bg-surface-container/30 rounded-3xl border border-dashed border-surface-container-high">
              <p className="text-on-surface-variant/60 font-medium text-sm">Aguardando a primeira síntese do dia...</p>
            </div>
          )}
        </div>

        {/* Detalhe da Ata: Estilo Editorial */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedAta ? (
              <motion.div
                key={selectedAta.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -30 }}
                className="bg-background p-6 md:p-12 rounded-[30px] md:rounded-[50px] border border-surface-container-high shadow-2xl relative overflow-hidden"
              >
                {/* Status Badge - Adaptável para evitar overlap */}
                <div className="flex md:absolute md:top-8 md:right-8 mb-8 md:mb-0 items-center gap-2 px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-full text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest w-fit">
                  <ShieldCheck className="w-4 h-4" /> Verificada pela Alquimia IA
                </div>

                {/* Header Editorial */}
                <div className="mb-12 border-b border-stone-100 pb-10">
                  <h3 className="text-3xl md:text-5xl font-serif font-bold text-on-surface leading-tight mb-4 tracking-tighter">
                    Ata de Interação Comunitária: <br />
                    <span className="text-primary">{selectedAta.groupName || 'Lounge Gastronômico'}</span>
                  </h3>
                  <div className="flex items-center gap-4 text-on-surface-variant font-medium text-sm font-body italic">
                    <Calendar className="w-4 h-4" /> {selectedAta.date}
                  </div>
                </div>

                <div className="space-y-12">
                  {/* Seção 1: Tópicos em Foco */}
                  <section>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-xs font-bold">1</div>
                      <h5 className="text-2xl font-serif font-bold text-on-surface tracking-tight">🎯 Tópicos em Foco</h5>
                    </div>
                    
                    <div className="space-y-10 pl-6 md:pl-11">
                      {Array.isArray(selectedAta.topics) && selectedAta.topics.map((topic, i) => (
                        <div key={i} className="relative group">
                          <div className="absolute -left-6 md:-left-11 top-0 bottom-0 w-px bg-surface-container-high" />
                          <div className="absolute -left-[27px] md:-left-[45px] top-2 w-2 h-2 rounded-full bg-surface-container-highest group-hover:bg-primary transition-colors" />
                          
                          <h6 className="text-xl font-bold text-on-surface mb-2">{topic.title}</h6>
                          <p className="text-on-surface-variant font-body leading-relaxed text-sm md:text-base mb-3 italic">
                            {topic.summary}
                          </p>
                          <div className="p-4 bg-surface-container rounded-2xl border border-surface-container-high">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-1">Consenso do Grupo</span>
                            <p className="text-sm font-medium text-on-surface/80">{topic.consensus}</p>
                          </div>
                          
                          <VoteButton ataId={selectedAta.id} topicIndex={i} votes={topic.votes} />
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Seção 2: Insights e Cultura */}
                  <section className="bg-surface-container p-8 rounded-[40px] border border-surface-container-high">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-on-surface flex items-center justify-center text-background text-xs font-bold">2</div>
                      <h5 className="text-2xl font-serif font-bold text-on-surface tracking-tight">💡 Insights e Cultura</h5>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-body">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-2">Termo em Destaque</span>
                        <h6 className="text-lg font-bold text-on-surface mb-1">{selectedAta.insights?.termoDestaque?.termo}</h6>
                        <p className="text-sm text-on-surface-variant leading-relaxed">
                          {selectedAta.insights?.termoDestaque?.explicacao}
                        </p>
                      </div>
                      <div className="border-l border-surface-container-high pl-8">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-2">Dica do Chef</span>
                        <div className="flex gap-3">
                          <Quote className="w-5 h-5 text-on-surface-variant/40 flex-shrink-0" />
                          <p className="text-sm font-bold text-on-surface/80 italic leading-relaxed">
                            {selectedAta.insights?.dicaDoChef}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Seção 3: Acervo e Termômetro */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-12 font-body">
                    <section>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-xs font-bold">3</div>
                        <h5 className="text-xl font-serif font-bold text-on-surface tracking-tight">📚 Acervo & Referências</h5>
                      </div>
                      <div className="space-y-3">
                        <div 
                          onClick={() => {
                            const articleTitle = (selectedAta.referencias?.artigo || "").toLowerCase();
                            const isSpecificAta = selectedAta.date === "11/05/2026";
                            if (isSpecificAta || articleTitle.includes("especiarias")) {
                              window.location.href = "/historia-das-especiarias";
                            }
                          }}
                          className="p-4 bg-background border border-surface-container-high rounded-2xl flex items-center gap-3 hover:border-primary/30 transition-all cursor-pointer group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold text-xs">📖</div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Artigo no Site</p>
                            <p className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">{selectedAta?.referencias?.artigo || "Fundamentos da Gastronomia"}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-background border border-surface-container-high rounded-2xl flex items-center gap-3 hover:border-primary/30 transition-all cursor-pointer group">
                          <div className="w-10 h-10 rounded-xl bg-secondary/5 flex items-center justify-center text-secondary font-bold text-xs">📗</div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">E-book Gratuito</p>
                            <p className="text-sm font-bold text-on-surface group-hover:text-secondary transition-colors">{selectedAta.referencias?.ebook || "Manual do Alquimista Vol. 1"}</p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white text-xs font-bold">4</div>
                        <h5 className="text-xl font-serif font-bold text-on-surface tracking-tight">📊 Termômetro</h5>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-surface-container rounded-2xl border border-surface-container-high text-center">
                          <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                          <span className="text-[9px] font-black uppercase text-on-surface-variant block">Clima</span>
                          <span className="text-sm font-bold text-on-surface">{selectedAta.termometro?.clima}</span>
                        </div>
                        <div className="p-4 bg-surface-container rounded-2xl border border-surface-container-high text-center">
                          <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                          <span className="text-[9px] font-black uppercase text-on-surface-variant block">Participação</span>
                          <span className="text-sm font-bold text-on-surface">{selectedAta.termometro?.participacao} Ativos</span>
                        </div>
                        <div className="col-span-2 p-4 bg-on-surface text-background flex items-center gap-4 rounded-2xl">
                          <Award className="w-8 h-8 text-primary" />
                          <div>
                            <span className="text-[9px] font-black uppercase opacity-60 block">Destaque do Dia</span>
                            <span className="text-sm font-bold">{selectedAta.termometro?.destaqueDoDia}</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Footer de Moderação */}
                  <div className="pt-8 border-t border-surface-container-high">
                    <p className="text-[11px] text-on-surface-variant italic font-body text-center leading-relaxed max-w-lg mx-auto">
                      Esta ata foi sintetizada respeitando a linearidade da conversa. <br />
                      Discussões fora de tópico foram arquivadas para manter a clareza deste registro cultural.
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
            <div className="h-full flex items-center justify-center bg-surface-container/20 border border-surface-container-high rounded-[30px] md:rounded-[50px] border-dashed p-8 md:p-20">
                <div className="text-center">
                  <BookOpen className="w-20 h-20 text-on-surface-variant/20 mx-auto mb-6" />
                  <p className="text-on-surface-variant/40 font-serif text-3xl font-bold italic">Selecione uma ata para ler o legado do dia.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      </div>
    );
};

