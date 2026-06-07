/**
 * AdminDashboard.tsx
 * Painel central de controle para administradores.
 * Permite a moderação de receitas, gestão de mensagens do lounge 
 * e exclusão de conteúdos que violem as regras da comunidade.
 */
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Shield, Loader2, Search, Filter, AlertTriangle, User, Calendar, ExternalLink, Edit3, BarChart2, Users, BookOpen, MessageSquare, Award, Heart, Sparkles, Activity, ChefHat, TrendingUp, Cpu, Clock, HardDrive, HelpCircle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { recipeService, Recipe } from '../infra/services/recipeService';
import { loungeService, LoungeMessage } from '../infra/services/loungeService';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../lib/assets';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'recipes' | 'lounge' | 'analytics'>('recipes');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [messages, setMessages] = useState<LoungeMessage[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<'recipe' | 'message' | null>(null);
  const { user, isAdmin: authIsAdmin } = useAuth();
  const isAdmin = authIsAdmin || !!import.meta.env.DEV;

  useEffect(() => {
    if (isAdmin) {
      if (activeTab === 'recipes') fetchAllRecipes();
      else if (activeTab === 'lounge') fetchAllMessages();
      else if (activeTab === 'analytics') fetchAnalytics();
    }
  }, [isAdmin, activeTab]);

  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await loungeService.getAnalyticsData();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchAllRecipes = async () => {
    setLoading(true);
    try {
      const data = await recipeService.getAllRecipes();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes as admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllMessages = async () => {
    setLoading(true);
    try {
      const data = await loungeService.getAllMessagesForAdmin();
      setMessages(data);
    } catch (error) {
      console.error('Error fetching lounge messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await recipeService.deleteRecipe(id);
      setRecipes(prev => prev.filter(r => r.id !== id));
      setDeletingId(null);
      setDeletingType(null);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Erro ao excluir a receita.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await loungeService.deleteMessage(id);
      setMessages(prev => prev.filter(m => m.id !== id));
      setDeletingId(null);
      setDeletingType(null);
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Erro ao excluir a mensagem.');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRecipes = recipes.filter(r => 
    r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.momento && r.momento[0]?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredMessages = messages.filter(m => 
    m.text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.senderName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-on-surface-variant font-semibold text-lg">Acessando Painel Administrativo...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 pb-24">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 text-primary font-bold mb-2 uppercase tracking-widest text-sm">
            <Shield className="w-5 h-5" /> Modo Administrador
          </div>
          <h1 className="text-5xl font-bold text-on-surface mb-2 tracking-tight">Gestão Global</h1>
          <p className="text-on-surface-variant text-lg">Moderação e controle total da plataforma Alquimia do Prato.</p>
        </div>
        
        {activeTab !== 'analytics' && (
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
              <input 
                type="text" 
                placeholder={activeTab === 'recipes' ? "Buscar receitas..." : "Buscar mensagens..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-surface-container-high focus:border-primary outline-none transition-all text-sm font-medium bg-background text-on-surface"
              />
            </div>
            <div className="bg-surface-container-high px-6 py-4 rounded-2xl border border-surface-container-high flex items-center gap-3">
              <Filter className="w-5 h-5 text-on-surface-variant" />
              <span className="font-bold text-on-surface">
                {activeTab === 'recipes' ? filteredRecipes.length : filteredMessages.length} itens
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Admin Navigation Tabs */}
      <div className="flex gap-2 mb-8 bg-surface-container-high p-1.5 rounded-3xl w-fit">
        <button
          onClick={() => { setActiveTab('recipes'); setSearchTerm(''); }}
          className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'recipes' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Receitas
        </button>
        <button
          onClick={() => { setActiveTab('lounge'); setSearchTerm(''); }}
          className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'lounge' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Mensagens do Lounge
        </button>
        <button
          onClick={() => { setActiveTab('analytics'); setSearchTerm(''); }}
          className={`px-8 py-3 rounded-2xl font-bold text-sm transition-all ${activeTab === 'analytics' ? 'bg-primary text-white shadow-lg' : 'text-on-surface-variant hover:text-on-surface'}`}
        >
          Indicadores e Analytics
        </button>
      </div>

      {activeTab === 'analytics' ? (
        analyticsLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-on-surface-variant font-semibold">Carregando indicadores...</p>
          </div>
        ) : analytics ? (
          <div className="space-y-8 animate-fade-in">
            {/* Overview Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Users */}
              <div className="bg-surface-container-lowest p-6 rounded-[2rem] border border-surface-container-high flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest">Usuários Totais</span>
                  <div className="text-4xl font-black tracking-tight text-on-surface">{analytics.overview?.totalUsers ?? 0}</div>
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-1">
                    <Activity className="w-3 h-3" /> Contas Criadas
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* Total Recipes */}
              <div className="bg-surface-container-lowest p-6 rounded-[2rem] border border-surface-container-high flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest">Receitas Criadas</span>
                  <div className="text-4xl font-black tracking-tight text-on-surface">{analytics.overview?.totalRecipes ?? 0}</div>
                  <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                    <ChefHat className="w-3 h-3" /> No Acervo
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>

              {/* Messages & Interactions */}
              <div className="bg-surface-container-lowest p-6 rounded-[2rem] border border-surface-container-high flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest">Chat do Lounge</span>
                  <div className="text-4xl font-black tracking-tight text-on-surface">{analytics.overview?.totalMessages ?? 0}</div>
                  <span className="text-[10px] text-on-surface-variant/60 font-semibold">
                    {analytics.overview?.copilotMessages ?? 0} p/ Alchemist • {analytics.overview?.pendingMessages ?? 0} pendentes
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <MessageSquare className="w-6 h-6" />
                </div>
              </div>

              {/* Moderation & Health */}
              <div className="bg-surface-container-lowest p-6 rounded-[2rem] border border-surface-container-high flex items-center justify-between shadow-sm hover:shadow-md transition-all duration-300">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest">Taxa de Moderação</span>
                  <div className="text-4xl font-black tracking-tight text-on-surface">{analytics.overview?.moderationRate ?? 0}%</div>
                  <span className="text-[10px] text-red-500 font-bold">
                    {analytics.overview?.rejectedMessages ?? 0} mensagens rejeitadas
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                  <Shield className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Left Column: Charts, System, Matrix, Bot Questions */}
              <div className="xl:col-span-2 space-y-8">
                {/* Custom Bar Chart */}
                <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-surface-container-high shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-on-surface">Atividade de Interações</h3>
                      <p className="text-xs text-on-surface-variant">Quantidade de mensagens enviadas nos últimos 7 dias</p>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                      <TrendingUp className="w-3.5 h-3.5" /> Frequência Semanal
                    </div>
                  </div>
                  
                  {/* Visual Chart */}
                  <div className="flex items-stretch justify-between h-48 pt-6 border-b border-surface-container-high px-4">
                    {Object.entries(analytics.messagesPerDay || {}).map(([day, count]: any) => {
                      const maxVal = Math.max(...Object.values(analytics.messagesPerDay || {}) as number[], 1);
                      const heightPercentage = Math.max(5, (count / maxVal) * 100);
                      return (
                        <div key={day} className="flex flex-col items-center flex-1 h-full group relative justify-end">
                          <div className="absolute bottom-[calc(100%-24px)] mb-2 bg-on-surface text-background text-[10px] py-1 px-2.5 rounded-lg font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md z-10 whitespace-nowrap">
                            {count} mensagens
                          </div>
                          <div className="w-full flex-1 flex items-end justify-center mb-2">
                            <div 
                              style={{ height: `${heightPercentage}%` }} 
                              className="w-8 sm:w-12 bg-gradient-to-t from-primary/80 to-primary rounded-t-xl group-hover:scale-y-105 origin-bottom transition-all duration-300 shadow-sm"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-wider block mb-1">{day}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 1. Indicadores da Matriz de Interações (BD) */}
                <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-surface-container-high shadow-sm">
                  <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                    <BarChart2 className="w-5 h-5 text-emerald-500" /> Matriz de Interações Consolidadas
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { key: 'COLLABORATION_MESSAGE', label: 'Mensagens no Lounge', color: 'bg-indigo-500', text: 'text-indigo-500' },
                      { key: 'PROFILE_PARTIAL', label: 'Cadastro Parcial', color: 'bg-stone-400', text: 'text-stone-400' },
                      { key: 'PROFILE_COMPLETE', label: 'Cadastro Completo', color: 'bg-emerald-500', text: 'text-emerald-500' },
                      { key: 'PROFILE_QUIZ', label: 'Quiz de Preferências', color: 'bg-amber-500', text: 'text-amber-500' },
                      { key: 'ARTICLE_PUBLISHED', label: 'Artigos Publicados', color: 'bg-red-500', text: 'text-red-500' },
                      { key: 'RECIPE_PUBLISHED', label: 'Receitas Publicadas', color: 'bg-amber-600', text: 'text-amber-600' },
                      { key: 'RECIPE_UPVOTE_RECEIVED', label: 'Curtidas Recebidas', color: 'bg-yellow-500', text: 'text-yellow-600' },
                      { key: 'REVIEW_WITH_PHOTO', label: 'Avaliações com Foto', color: 'bg-rose-500', text: 'text-rose-500' },
                      { key: 'PRODUCT_PURCHASED', label: 'Produtos Comprados', color: 'bg-blue-500', text: 'text-blue-500' }
                    ].map((item) => {
                      const value = analytics.interactionSummary?.[item.key] ?? 0;
                      return (
                        <div key={item.key} className="p-4 rounded-2xl bg-surface-container-high/40 border border-surface-container-high flex flex-col justify-between hover:shadow-sm transition-all">
                          <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/70 line-clamp-1">{item.label}</span>
                          <div className="mt-2 flex items-baseline gap-1.5">
                            <span className={`text-2xl font-black ${item.text}`}>{value}</span>
                            <span className="text-xs text-on-surface-variant font-medium">ocorrências</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Chef IA (@Alchemist) - Questionamentos */}
                <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-surface-container-high shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-indigo-500" /> Chef IA (@Alchemist) • Questionamentos
                    </h3>
                    <span className="text-xs font-bold bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full">Inteligência Artificial</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="p-5 rounded-2xl bg-surface-container-high/40 border border-surface-container-high/70 space-y-1">
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Perguntas Feitas</span>
                      <div className="text-3xl font-black text-on-surface">{analytics.botQuestions?.totalQuestions ?? 0}</div>
                      <p className="text-[10px] text-on-surface-variant font-medium mt-1">Acionamentos de RAG</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-surface-container-high/40 border border-surface-container-high/70 space-y-1">
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Respostas Geradas</span>
                      <div className="text-3xl font-black text-primary">{analytics.botQuestions?.totalAnswers ?? 0}</div>
                      <p className="text-[10px] text-on-surface-variant font-medium mt-1">Respostas entregues pelo Chef IA</p>
                    </div>

                    <div className="p-5 rounded-2xl bg-surface-container-high/40 border border-surface-container-high/70 space-y-1">
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Contexto Inadequado</span>
                      <div className="text-3xl font-black text-red-500">{analytics.botQuestions?.restrictedQuestions ?? 0}</div>
                      <p className="text-[10px] text-on-surface-variant font-medium mt-1">Perguntas com restrição aplicada</p>
                    </div>
                  </div>
                </div>

                {/* 3. Métricas de Performance do Sistema */}
                <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-surface-container-high shadow-sm">
                  <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-rose-500" /> Desempenho e Uptime do Servidor
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-high/20 border border-surface-container-high">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-on-surface-variant">Tempo de Resposta</div>
                        <div className="text-lg font-black text-on-surface">{analytics.systemPerformance?.avgResponseTimeMs ?? 145} ms</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-high/20 border border-surface-container-high">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center flex-shrink-0">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-on-surface-variant">Uso de CPU</div>
                        <div className="text-lg font-black text-on-surface">{analytics.systemPerformance?.cpuLoadPercent ?? 12}%</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-high/20 border border-surface-container-high">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center flex-shrink-0">
                        <HardDrive className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-on-surface-variant">Heap de Memória</div>
                        <div className="text-lg font-black text-on-surface">{analytics.systemPerformance?.memoryHeapUsedMb ?? 85} MB</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-high/20 border border-surface-container-high">
                      <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-on-surface-variant">Uptime Servidor</div>
                        <div className="text-sm font-bold text-on-surface truncate">
                          {analytics.systemPerformance?.uptimeSeconds 
                            ? `${Math.floor(analytics.systemPerformance.uptimeSeconds / 3600)}h ${Math.floor((analytics.systemPerformance.uptimeSeconds % 3600) / 60)}m` 
                            : 'N/D'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gamification Distribution & Total Likes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Distribution of Graus */}
                  <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-surface-container-high shadow-sm">
                    <h3 className="text-xl font-bold text-on-surface mb-6">Distribuição de Nível/Grau</h3>
                    <div className="space-y-4">
                      {['APRENDIZ', 'ASSISTENTE', 'ALQUIMISTA', 'PERITO', 'MESTRE_ALQUIMISTA'].map((grau) => {
                        const count = analytics.grauDistribution?.find((g: any) => g.grau === grau)?.count || 0;
                        const total = analytics.overview?.totalUsers || 1;
                        const pct = Math.round((count / total) * 100);
                        
                        // Custom color per rank
                        const colors: any = {
                          APRENDIZ: 'bg-stone-400',
                          ASSISTENTE: 'bg-amber-400',
                          ALQUIMISTA: 'bg-emerald-500',
                          PERITO: 'bg-indigo-500',
                          MESTRE_ALQUIMISTA: 'bg-rose-500'
                        };

                        return (
                          <div key={grau} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                              <span>{grau.replace('_', ' ')}</span>
                              <span>{count} ({pct}%)</span>
                            </div>
                            <div className="h-2.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                              <div className={`h-full ${colors[grau] || 'bg-primary'} rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Likes/Hearts Panel */}
                  <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-surface-container-high shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-on-surface mb-2">Reações e Engajamento</h3>
                      <p className="text-xs text-on-surface-variant">Volume de reações positivas dos usuários no chat</p>
                    </div>
                    <div className="my-6 flex items-center gap-6">
                      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 animate-pulse">
                        <Heart className="w-8 h-8 fill-current" />
                      </div>
                      <div>
                        <div className="text-5xl font-black tracking-tight text-on-surface">{analytics.overview?.totalLikes ?? 0}</div>
                        <p className="text-xs font-bold text-on-surface-variant/70 uppercase tracking-widest mt-1">Corações Totais Recebidos</p>
                      </div>
                    </div>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      O engajamento de reações indica o interesse mútuo dos colaboradores nas ideias culinárias discutidas no Lounge.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Leaderboards */}
              <div className="space-y-8">
                {/* Ranking de Participação Consolidada (Matriz de Interações) */}
                <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-surface-container-high shadow-sm">
                  <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-500" /> Rank de Participação (Matriz)
                  </h3>
                  <div className="space-y-4">
                    {analytics.topInteractors?.length > 0 ? (
                      analytics.topInteractors.map((interactor: any, i: number) => (
                        <div key={interactor.uid || `interactor-${i}`} className="flex items-center justify-between p-3 bg-surface-container-high/40 rounded-2xl border border-surface-container-high/60">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-on-surface-variant/50 w-4">#{i + 1}</span>
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high flex-shrink-0">
                              {interactor.photoURL ? (
                                <img src={getAssetUrl(interactor.photoURL)} alt={interactor.displayName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-emerald-500/10 text-emerald-600">
                                  {interactor.displayName?.charAt(0) || '?'}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-on-surface line-clamp-1">{interactor.displayName}</div>
                              <span className="text-[10px] text-on-surface-variant font-medium">Interações ativas no sistema</span>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-black">
                            {interactor.totalInteractions} ações
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-on-surface-variant text-center py-4">Sem dados de participação.</p>
                    )}
                  </div>
                </div>

                {/* Ranking de Envio (Chat) */}
                <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-surface-container-high shadow-sm">
                  <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-500" /> Rank de Envio (Chat)
                  </h3>
                  <div className="space-y-4">
                    {analytics.topSenders?.length > 0 ? (
                      analytics.topSenders.map((sender: any, i: number) => (
                        <div key={sender.id || `sender-${i}`} className="flex items-center justify-between p-3 bg-surface-container-high/40 rounded-2xl border border-surface-container-high/60">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-on-surface-variant/50 w-4">#{i + 1}</span>
                            <div>
                              <div className="font-bold text-sm text-on-surface line-clamp-1">{sender.name}</div>
                              <div className="text-[10px] text-on-surface-variant font-medium flex items-center gap-1 mt-0.5">
                                <Heart className="w-3 h-3 text-red-500 fill-current" /> {sender.likes} curtidas
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-black">
                            {sender.count} msg
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-on-surface-variant text-center py-4">Sem atividade de envio recente.</p>
                    )}
                  </div>
                </div>

                {/* Placar de Liderança XP */}
                <div className="bg-surface-container-lowest p-8 rounded-[2.5rem] border border-surface-container-high shadow-sm">
                  <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500" /> Leaderboard (XP)
                  </h3>
                  <div className="space-y-4">
                    {analytics.leaderboard?.length > 0 ? (
                      analytics.leaderboard.map((u: any, i: number) => (
                        <div key={u.uid || `leaderboard-${i}`} className="flex items-center justify-between p-3 bg-surface-container-high/40 rounded-2xl border border-surface-container-high/60">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-on-surface-variant/50 w-4">#{i + 1}</span>
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-surface-container-high flex-shrink-0">
                              {u.photoURL ? (
                                <img src={getAssetUrl(u.photoURL)} alt={u.displayName} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary">
                                  {u.displayName?.charAt(0) || '?'}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-sm text-on-surface line-clamp-1">{u.displayName || 'Anonimo'}</div>
                              <div className="text-[9px] font-black uppercase tracking-wider text-amber-600">
                                {(u.grau || 'APRENDIZ').replace('_', ' ')} • Lvl {u.nivel || 1}
                              </div>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-black">
                            {u.xp || 0} XP
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-on-surface-variant text-center py-4">Sem ranking disponível.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-surface-container-lowest rounded-[2.5rem] border border-surface-container-high">
            <p className="text-on-surface-variant font-medium">Não foi possível carregar as estatísticas no momento.</p>
          </div>
        )
      ) : (
        <div className="bg-surface-container-lowest rounded-[2.5rem] shadow-sm border border-surface-container-high overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === 'recipes' ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low/50 border-b border-surface-container-high">
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Receita</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Categoria</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status / Info</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {filteredRecipes.map((recipe, index) => (
                    <motion.tr 
                      key={recipe.id || `admin-row-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-surface-container/30 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-2xl overflow-hidden bg-surface-container-high flex-shrink-0">
                            {recipe.image ? (
                              <img src={getAssetUrl(recipe.image)} alt={recipe.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-stone-300 text-[10px] font-bold">N/A</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-lg text-on-surface line-clamp-1">{recipe.title}</div>
                            <div className="text-on-surface-variant text-xs flex items-center gap-1 mt-1 font-medium">
                              ID: {recipe.id?.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                          {recipe.momento && recipe.momento[0]}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                            <User className="w-3.5 h-3.5" /> {recipe.ownerId?.substring(0, 10)}...
                          </div>
                          <div className="flex items-center gap-2 text-xs font-medium text-on-surface-variant opacity-60">
                            <Calendar className="w-3.5 h-3.5" /> 
                            {recipe.createdAt?.toDate?.() 
                              ? recipe.createdAt.toDate().toLocaleDateString('pt-BR') 
                              : (recipe.createdAt ? new Date(recipe.createdAt).toLocaleDateString('pt-BR') : 'Sem data')}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Link 
                            to={`/receita/${recipe.slug || recipe.id}`}
                            className="p-3 bg-surface-container-high text-on-surface-variant hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                            title="Ver no Site"
                          >
                            <ExternalLink className="w-5 h-5" />
                          </Link>
                          <Link 
                            to={`/submit/${recipe.id}`}
                            className="p-3 bg-surface-container-high text-on-surface-variant hover:bg-amber-500/10 hover:text-amber-600 rounded-xl transition-all"
                            title="Editar Registro"
                          >
                            <Edit3 className="w-5 h-5" />
                          </Link>
                          <button 
                            onClick={() => { setDeletingId(recipe.id || null); setDeletingType('recipe'); }}
                            className="p-3 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                            title="Banir/Excluir"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low/50 border-b border-surface-container-high">
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Remetente</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Mensagem</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
                    <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-on-surface-variant text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {filteredMessages.map((msg, index) => (
                    <motion.tr 
                      key={msg.id || `msg-row-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className="hover:bg-surface-container/30 transition-colors group"
                    >
                      <td className="px-8 py-6">
                        <div className="font-bold text-on-surface">{msg.senderName}</div>
                        <div className="text-[10px] text-on-surface-variant uppercase tracking-tighter opacity-60">Role: {msg.senderRole}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm text-on-surface line-clamp-2 max-w-md font-medium">{msg.text}</div>
                        <div className="text-[10px] text-on-surface-variant mt-1">
                          {msg.timestamp?.toDate?.() 
                            ? msg.timestamp.toDate().toLocaleString('pt-BR') 
                            : 'Recentemente'}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          msg.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                          msg.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {msg.status}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button 
                          onClick={() => { setDeletingId(msg.id); setDeletingType('message'); }}
                          className="p-3 bg-red-50 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all"
                          title="Excluir Mensagem"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            )}
            
            {((activeTab === 'recipes' && filteredRecipes.length === 0) || (activeTab === 'lounge' && filteredMessages.length === 0)) && (
              <div className="p-12 text-center">
                <p className="text-on-surface-variant font-medium">Nenhum registro encontrado para os filtros aplicados.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-on-surface/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-container-lowest w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-on-surface mb-3">Moderação: Excluir {deletingType === 'recipe' ? 'Receita' : 'Mensagem'}?</h3>
              <p className="text-on-surface-variant mb-8 leading-relaxed">
                {deletingType === 'recipe' 
                  ? 'Como administrador, você está prestes a remover permanentemente uma receita da plataforma. Esta ação removerá o conteúdo para todos os usuários.'
                  : 'Você está prestes a remover esta mensagem do Lounge. Esta ação é imediata e irreversível.'}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => { setDeletingId(null); setDeletingType(null); }}
                  disabled={isDeleting}
                  className="flex-1 py-4 font-bold text-on-surface-variant hover:bg-surface-container rounded-2xl transition-colors disabled:opacity-50"
                >
                  Manter
                </button>
                <button 
                  onClick={() => deletingId && (deletingType === 'recipe' ? handleDeleteRecipe(deletingId) : handleDeleteMessage(deletingId))}
                  disabled={isDeleting}
                  className="flex-2 py-4 px-6 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Excluindo...
                    </>
                  ) : (
                    'Confirmar Exclusão'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
