import { motion, AnimatePresence } from 'motion/react';
import { Edit3, Trash2, ChevronRight, Loader2, Plus, Clock, Star, AlertTriangle, User, ShieldCheck, Activity, CheckCircle2, XCircle, AlertCircle, Key, Info } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { recipeService, Recipe } from '../infra/services/recipeService';
import { geminiService } from '../infra/services/geminiService';
import { getAvailableGeminiKeys } from '../infra/services/geminiKeyManager';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../lib/assets';

export default function ManageRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showKeyStatus, setShowKeyStatus] = useState(false);
  const [checkingKeys, setCheckingKeys] = useState(false);
  const [keyStatuses, setKeyStatuses] = useState<any[]>([]);
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchRecipes(user.uid);
    }
  }, [user, isAdmin]);

  const fetchRecipes = async (userId: string) => {
    setLoading(true);
    try {
      const data = isAdmin 
        ? await recipeService.getAllRecipes() 
        : await recipeService.getUserRecipes(userId);
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      await recipeService.seedRecipes(user.uid);
      await fetchRecipes(user.uid);
    } catch (error) {
      console.error('Error seeding recipes:', error);
      alert('Erro ao cadastrar receitas iniciais.');
    } finally {
      setSeeding(false);
    }
  };

  const handleScrape = async () => {
    if (!scrapeUrl) return;
    setScraping(true);
    try {
      const data = await recipeService.scrapeRecipe(scrapeUrl);
      navigate('/submit', { state: { scrapedData: data } });
    } catch (error: any) {
      console.error('Scraping error:', error);
      alert(error.message || 'Erro ao buscar receita da URL. Verifique se o link está correto.');
    } finally {
      setScraping(false);
    }
  };

  const handleCheckKeys = async () => {
    setShowKeyStatus(true);
    setCheckingKeys(true);
    setKeyStatuses([]); // Limpa resultados anteriores
    
    try {
      const response = await fetch('/api/admin/check-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
        }
      });
      
      const data = await response.json();
      
      if (data.success && data.keys) {
        // Mostra o progresso de exibição individual para manter o efeito visual
        for (let i = 0; i < data.keys.length; i++) {
          setKeyStatuses(prev => [...prev, { ...data.keys[i], status: 'loading' }]);
          
          // Pequeno delay artificial para o usuário ver o "Analisando" de cada chave
          await new Promise(resolve => setTimeout(resolve, 300));
          
          setKeyStatuses(prev => {
            const newStatuses = [...prev];
            newStatuses[i] = { ...data.keys[i] };
            return newStatuses;
          });
        }
      } else {
        throw new Error(data.error || 'Falha ao obter status das chaves');
      }
    } catch (err: any) {
      console.error('Erro no diagnóstico:', err);
      setKeyStatuses([{ key: 'Erro Crítico', status: 'error', message: err.message || 'Falha na comunicação com o servidor' }]);
    } finally {
      setCheckingKeys(false);
    }
  };

  const resetKeyStatuses = () => {
    setKeyStatuses([]);
    setShowKeyStatus(false);
  };

  const handleDelete = async (id: string) => {
    if (!id) return;
    setIsDeleting(true);
    try {
      await recipeService.deleteRecipe(id);
      setRecipes(prev => prev.filter(r => r.id !== id));
      setDeletingId(null);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Erro ao excluir a receita.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-on-surface-variant font-semibold">Carregando suas receitas...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 pb-24">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold text-on-surface mb-2">
            {isAdmin ? 'Gestão de Cadastro' : 'Minhas Receitas'}
          </h1>
          <p className="text-on-surface-variant text-lg">
            {isAdmin 
              ? 'Visualize e modere todas as receitas cadastradas na plataforma.' 
              : 'Gerencie suas criações culinárias e compartilhe mais sabores.'}
          </p>
        </div>
        <Link 
          to="/submit" 
          className="bg-primary text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-lg hover:bg-primary-container transition-all active:scale-95"
        >
          <Plus className="w-6 h-6" /> Nova Receita
        </Link>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary/5 border border-primary/20 rounded-3xl p-6 mb-12"
      >
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-primary mb-1">Importar Receita via Link</h3>
            <p className="text-sm text-on-surface-variant">Cole o link de uma receita para extrair os dados automaticamente.</p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <input 
              type="url" 
              value={scrapeUrl}
              onChange={(e) => setScrapeUrl(e.target.value)}
              placeholder="https://panelinha.com.br/..."
              className="flex-1 md:w-80 p-3 rounded-xl bg-surface-container-low text-on-surface border border-surface-container-high outline-none focus:ring-2 focus:ring-primary text-sm placeholder:text-on-surface-variant/50 shadow-inner"
            />
            <button 
              onClick={handleScrape}
              disabled={scraping || !scrapeUrl}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary-container transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Importar'}
            </button>
            <button 
              onClick={handleCheckKeys}
              title="Verificar Saúde das APIs"
              className="p-3 bg-stone-100 text-stone-500 rounded-xl hover:bg-stone-200 hover:text-primary transition-all flex items-center justify-center"
            >
              <Activity className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>

      {recipes.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-low rounded-3xl p-12 text-center border-2 border-dashed border-surface-container-high"
        >
          <div className="w-20 h-20 bg-surface-container-high rounded-full flex items-center justify-center mx-auto mb-6">
            <Plus className="w-10 h-10 text-on-surface-variant/30" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-4">Você ainda não publicou nada</h2>
          <p className="text-on-surface-variant mb-8 max-w-md mx-auto">
            Comece a compartilhar suas receitas favoritas com o mundo hoje mesmo ou importe as receitas de exemplo!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/submit" 
              className="inline-flex bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-container transition-colors shadow-lg active:scale-95"
            >
              Criar Nova
            </Link>
            <button 
              onClick={handleSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 border-2 border-primary text-primary px-8 py-3 rounded-xl font-bold hover:bg-primary/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              {seeding ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Cadastrando...
                </>
              ) : (
                <>Importar Exemplos</>
              )}
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {recipes.map((recipe, index) => (
            <motion.div 
              key={recipe.id || `manage-row-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group bg-surface-container-low rounded-2xl p-4 md:p-6 border border-surface-container-high shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-6"
            >
              <div className="w-full md:w-32 h-32 rounded-xl overflow-hidden bg-surface-container-high flex-shrink-0">
                {recipe.image ? (
                  <img src={getAssetUrl(recipe.image)} alt={recipe.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 font-bold uppercase text-xs">
                    Sem Foto
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {recipe.momento && recipe.momento[0]}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-semibold">
                    <Clock className="w-3.5 h-3.5" /> {recipe.time || 'N/A'}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-semibold">
                    <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" /> {recipe.rating?.toFixed(1) || '0.0'}
                  </div>
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 text-[10px] text-stone-400 font-bold uppercase tracking-tight">
                      <User className="w-3 h-3" /> {recipe.ownerId?.substring(0, 8)}...
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                  {recipe.title}
                </h3>
                <p className="text-on-surface-variant text-sm line-clamp-1 mt-1">
                  {recipe.description || 'Sem descrição.'}
                </p>
              </div>

              <div className="flex items-center gap-2 md:pl-6 md:border-l border-surface-container-high">
                <Link 
                  to={`/recipe/${recipe.id}`}
                  className="p-3 text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                  title="Ver Receita"
                >
                  <ChevronRight className="w-6 h-6" />
                </Link>
                <Link 
                  to={`/submit/${recipe.id}`}
                  className="p-3 text-on-surface-variant hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all"
                  title="Editar"
                >
                  <Edit3 className="w-5 h-5" />
                </Link>
                <button 
                  onClick={() => setDeletingId(recipe.id || null)}
                  className="p-3 text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                  title="Excluir"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-0">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setDeletingId(null)}
                className="absolute inset-0 bg-background/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative bg-surface-container-lowest w-full max-w-md rounded-3xl p-8 shadow-2xl border border-surface-container-high overflow-hidden"
              >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-on-surface mb-3">Excluir Receita?</h3>
              <p className="text-on-surface-variant mb-8 leading-relaxed">
                Esta ação é permanente e não poderá ser desfeita. Você tem certeza que deseja remover esta receita da sua coleção?
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => deletingId && handleDelete(deletingId)}
                  disabled={isDeleting}
                  className="flex-2 py-4 px-6 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Excluindo...
                    </>
                  ) : (
                    'Sim, Excluir'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Key Status Modal */}
      <AnimatePresence>
        {showKeyStatus && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-0">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={resetKeyStatuses}
              className="absolute inset-0 bg-stone-950/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-stone-900 w-full max-w-lg rounded-[2.5rem] p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden"
            >
              {/* Decorative Gradient Background */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[100px] -z-10 rounded-full" />
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight">Status das APIs</h3>
                    <p className="text-sm text-stone-400 font-medium">Diagnóstico de Cotas Gemini</p>
                  </div>
                </div>
                <button 
                  onClick={resetKeyStatuses} 
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5 group"
                >
                  <XCircle className="w-6 h-6 text-stone-500 group-hover:text-white transition-colors" />
                </button>
              </div>

              <div className="space-y-4 mb-8 max-h-[450px] overflow-y-auto pr-3 custom-scrollbar">
                {keyStatuses.length === 0 && !checkingKeys && (
                  <div className="text-center py-12 px-6 bg-white/5 rounded-3xl border border-dashed border-white/10">
                    <AlertCircle className="w-10 h-10 text-stone-600 mx-auto mb-4" />
                    <p className="text-stone-400 font-bold">Nenhuma chave detectada.</p>
                    <p className="text-stone-600 text-xs mt-2 italic">Verifique as variáveis de ambiente no arquivo .env</p>
                  </div>
                )}
                {keyStatuses.map((item, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className={`flex items-center justify-between p-5 rounded-3xl border-2 transition-all group ${
                      item.status === 'active' ? 'bg-emerald-500/5 border-emerald-500/30' :
                      item.status === 'exhausted' ? 'bg-amber-500/5 border-amber-500/30' :
                      (item.status === 'invalid' || item.status === 'error') ? 'bg-red-500/5 border-red-500/30' :
                      'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${
                        item.status === 'active' ? 'bg-emerald-500 text-white' :
                        item.status === 'exhausted' ? 'bg-amber-500 text-white' :
                        (item.status === 'invalid' || item.status === 'error') ? 'bg-red-500 text-white' :
                        'bg-stone-800 text-stone-500'
                      }`}>
                        <Key className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-black text-white text-base mb-1">{item.key}</p>
                        <p className="text-[10px] font-mono font-black text-stone-400 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
                          ...{item.keyRaw?.substring(item.keyRaw.length - 15)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1.5">
                      {item.status === 'loading' && (
                        <div className="flex items-center gap-2 text-primary animate-pulse bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Analisando</span>
                        </div>
                      )}
                      {item.status === 'active' && (
                        <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Ativa</span>
                        </div>
                      )}
                      {item.status === 'exhausted' && (
                        <div className="flex items-center gap-2 text-amber-400 bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Esgotada</span>
                        </div>
                      )}
                      {(item.status === 'invalid' || item.status === 'error') && (
                        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20">
                          <XCircle className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Inválida</span>
                        </div>
                      )}
                      {item.message && item.status !== 'active' && (
                        <span className="text-[9px] font-bold text-stone-500 uppercase tracking-tighter">{item.message}</span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="bg-blue-500/10 border border-blue-500/20 rounded-[1.5rem] p-5 flex gap-4 mb-8">
                <Info className="w-6 h-6 text-blue-400 flex-shrink-0" />
                <p className="text-[11px] text-blue-300/80 font-medium leading-relaxed">
                  A Alquimia do Prato utiliza um sistema de <strong className="text-blue-300">transmutação de chaves</strong>: se uma API atingir o limite de cota gratuito, o sistema rotaciona automaticamente para a próxima chave saudável disponível.
                </p>
              </div>

              <button 
                onClick={resetKeyStatuses}
                className="w-full py-5 rounded-[1.5rem] font-black bg-primary text-white hover:bg-primary-container transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
              >
                FECHAR DIAGNÓSTICO
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
