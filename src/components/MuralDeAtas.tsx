import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Calendar, Star, ChevronRight, Hash, CheckCircle2, Quote, Flame, Users, Award, ShieldCheck } from 'lucide-react';
import { loungeService, DailyAta } from '../infra/services/loungeService';
import { useAuth } from '../context/AuthContext';

/**
 * VoteButton Component
 * Permite que usuários confirmem a precisão de um tópico da ata.
 */
const VoteButton: React.FC<{ ataId: string, topicIndex: number, votes?: Record<string, boolean> }> = ({ ataId, topicIndex, votes = {} }) => {
  const { user } = useAuth();
  const [isVoting, setIsVoting] = useState(false);
  const voteCount = Object.keys(votes).length;
  const hasVoted = user ? !!votes[user.uid] : false;

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
 * Componente Mural de Atas (Redesenhado v2.1.0).
 * Implementa o modelo editorial de Ata de Interação Comunitária.
 */
export const MuralDeAtas: React.FC = () => {
  const [atas, setAtas] = useState<DailyAta[]>([]);
  const [selectedAta, setSelectedAta] = useState<DailyAta | null>(null);

  useEffect(() => {
    const unsubscribe = loungeService.subscribeToAtas((newAtas) => {
      setAtas(newAtas);
      // Auto-seleciona a mais recente se nada selecionado
      if (!selectedAta && newAtas.length > 0) {
        setSelectedAta(newAtas[0]);
      } else if (selectedAta) {
        // Atualiza a ata selecionada se houver novos dados
        const updated = newAtas.find(a => a.id === selectedAta.id);
        if (updated) setSelectedAta(updated);
      }
    });
    return () => unsubscribe();
  }, [selectedAta]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl font-serif font-bold text-stone-900 tracking-tight flex items-center gap-4">
          <BookOpen className="w-10 h-10 text-primary" /> Mural de Atas
        </h2>
        <p className="text-stone-500 font-medium font-body italic">A memória viva da nossa inteligência gastronômica coletiva.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Sidebar: Histórico de Atas */}
        <div className="lg:col-span-4 space-y-4">
          <div className="px-4 py-2 bg-stone-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-stone-500">
            Histórico Recente
          </div>
          <div className="space-y-3">
            <AnimatePresence>
              {atas.map((ata) => (
                <motion.button
                  key={ata.id}
                  onClick={() => setSelectedAta(ata)}
                  whileHover={{ x: 4 }}
                  className={`
                    w-full p-5 rounded-3xl text-left transition-all border
                    ${selectedAta?.id === ata.id 
                      ? 'bg-stone-900 border-stone-900 text-white shadow-2xl shadow-stone-200' 
                      : 'bg-white border-stone-100 text-stone-600 hover:border-primary/40'}
                  `}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 opacity-60">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-black uppercase tracking-widest font-body">{ata.date}</span>
                    </div>
                  </div>
                  <h4 className={`font-bold text-base mb-2 line-clamp-1 ${selectedAta?.id === ata.id ? 'text-white' : 'text-stone-800'}`}>
                    {ata.topics?.[0]?.title || "Ata Sem Tópicos"}
                  </h4>
                  <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-tighter opacity-50">
                    <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {ata.topics?.length || 0} tópicos</span>
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {ata.stats?.totalMessages || 0} msgs</span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          </div>

          {atas.length === 0 && (
            <div className="p-12 text-center bg-stone-50 rounded-3xl border border-dashed border-stone-200">
              <p className="text-stone-400 font-medium text-sm">Aguardando a primeira síntese do dia...</p>
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
                className="bg-white p-12 rounded-[50px] border border-stone-100 shadow-2xl shadow-stone-100 relative overflow-hidden"
              >
                {/* Status Badge */}
                <div className="absolute top-8 right-8 flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100 rounded-full text-[10px] font-black text-green-600 uppercase tracking-widest">
                  <ShieldCheck className="w-4 h-4" /> Verificada por {selectedAta.moderatorName || 'IA'}
                </div>

                {/* Header Editorial */}
                <div className="mb-12 border-b border-stone-100 pb-10">
                  <h3 className="text-5xl font-serif font-bold text-stone-900 leading-tight mb-4 tracking-tighter">
                    Ata de Interação Comunitária: <br />
                    <span className="text-primary">{selectedAta.groupName || 'Lounge Gastronômico'}</span>
                  </h3>
                  <div className="flex items-center gap-4 text-stone-400 font-medium text-sm font-body italic">
                    <Calendar className="w-4 h-4" /> {selectedAta.date}
                  </div>
                </div>

                <div className="space-y-12">
                  {/* Seção 1: Tópicos em Foco */}
                  <section>
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-white text-xs font-bold">1</div>
                      <h5 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">🎯 Tópicos em Foco</h5>
                    </div>
                    
                    <div className="space-y-10 pl-11">
                      {selectedAta.topics?.map((topic, i) => (
                        <div key={i} className="relative group">
                          <div className="absolute -left-11 top-0 bottom-0 w-px bg-stone-100" />
                          <div className="absolute -left-[45px] top-2 w-2 h-2 rounded-full bg-stone-300 group-hover:bg-primary transition-colors" />
                          
                          <h6 className="text-xl font-bold text-stone-800 mb-2">{topic.title}</h6>
                          <p className="text-stone-600 font-body leading-relaxed text-base mb-3 italic">
                            {topic.summary}
                          </p>
                          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-1">Consenso do Grupo</span>
                            <p className="text-sm font-medium text-stone-700">{topic.consensus}</p>
                          </div>
                          
                          <VoteButton ataId={selectedAta.id} topicIndex={i} votes={topic.votes} />
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* Seção 2: Insights e Cultura */}
                  <section className="bg-stone-50 p-8 rounded-[40px] border border-stone-100">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-white text-xs font-bold">2</div>
                      <h5 className="text-2xl font-serif font-bold text-stone-900 tracking-tight">💡 Insights e Cultura</h5>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-body">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-2">Termo em Destaque</span>
                        <h6 className="text-lg font-bold text-stone-900 mb-1">{selectedAta.insights?.termoDestaque?.termo}</h6>
                        <p className="text-sm text-stone-600 leading-relaxed">
                          {selectedAta.insights?.termoDestaque?.explicacao}
                        </p>
                      </div>
                      <div className="border-l border-stone-200 pl-8">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary block mb-2">Dica do Chef</span>
                        <div className="flex gap-3">
                          <Quote className="w-5 h-5 text-stone-300 flex-shrink-0" />
                          <p className="text-sm font-bold text-stone-800 italic leading-relaxed">
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
                        <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-white text-xs font-bold">3</div>
                        <h5 className="text-xl font-serif font-bold text-stone-900 tracking-tight">📚 Acervo & Referências</h5>
                      </div>
                      <div className="space-y-3">
                        <div className="p-4 bg-white border border-stone-100 rounded-2xl flex items-center gap-3 hover:border-primary/30 transition-all cursor-pointer group">
                          <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary font-bold text-xs">📖</div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">Artigo no Site</p>
                            <p className="text-sm font-bold text-stone-800 group-hover:text-primary transition-colors">{selectedAta.referencias?.artigo || "Fundamentos da Gastronomia"}</p>
                          </div>
                        </div>
                        <div className="p-4 bg-white border border-stone-100 rounded-2xl flex items-center gap-3 hover:border-primary/30 transition-all cursor-pointer group">
                          <div className="w-10 h-10 rounded-xl bg-secondary/5 flex items-center justify-center text-secondary font-bold text-xs">📗</div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">E-book Gratuito</p>
                            <p className="text-sm font-bold text-stone-800 group-hover:text-secondary transition-colors">{selectedAta.referencias?.ebook || "Manual do Alquimista Vol. 1"}</p>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section>
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-8 h-8 rounded-lg bg-stone-900 flex items-center justify-center text-white text-xs font-bold">4</div>
                        <h5 className="text-xl font-serif font-bold text-stone-900 tracking-tight">📊 Termômetro</h5>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 text-center">
                          <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                          <span className="text-[9px] font-black uppercase text-stone-400 block">Clima</span>
                          <span className="text-sm font-bold text-stone-800">{selectedAta.termometro?.clima}</span>
                        </div>
                        <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 text-center">
                          <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                          <span className="text-[9px] font-black uppercase text-stone-400 block">Participação</span>
                          <span className="text-sm font-bold text-stone-800">{selectedAta.termometro?.participacao} Ativos</span>
                        </div>
                        <div className="col-span-2 p-4 bg-stone-900 rounded-2xl text-white flex items-center gap-4">
                          <Award className="w-8 h-8 text-yellow-400" />
                          <div>
                            <span className="text-[9px] font-black uppercase text-white/40 block">Destaque do Dia</span>
                            <span className="text-sm font-bold">{selectedAta.termometro?.destaqueDoDia}</span>
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Footer de Moderação */}
                  <div className="pt-8 border-t border-stone-100">
                    <p className="text-[11px] text-stone-400 italic font-body text-center leading-relaxed max-w-lg mx-auto">
                      "Esta ata foi sintetizada respeitando a linearidade da conversa. <br />
                      Discussões fora de tópico foram arquivadas para manter a clareza deste registro cultural."
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center bg-white/40 border border-stone-100 rounded-[50px] border-dashed p-20">
                <div className="text-center">
                  <BookOpen className="w-20 h-20 text-stone-100 mx-auto mb-6" />
                  <p className="text-stone-300 font-serif text-3xl font-bold italic">Selecione uma ata para ler o legado do dia.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

