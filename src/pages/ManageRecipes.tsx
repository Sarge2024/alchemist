import { motion, AnimatePresence } from 'motion/react';
import { Edit3, Trash2, ChevronRight, Loader2, Plus, Clock, Star, AlertTriangle, User } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { recipeService, Recipe } from '../infra/services/recipeService';
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
              className="flex-1 md:w-80 p-3 rounded-xl bg-white border border-stone-200 outline-none focus:ring-2 focus:ring-primary text-sm"
            />
            <button 
              onClick={handleScrape}
              disabled={scraping || !scrapeUrl}
              className="bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-primary-container transition-all disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >
              {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Importar'}
            </button>
          </div>
        </div>
      </motion.div>

      {recipes.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-container-low rounded-3xl p-12 text-center border-2 border-dashed border-stone-200"
        >
          <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Plus className="w-10 h-10 text-stone-300" />
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
              className="group bg-surface-container-low rounded-2xl p-4 md:p-6 border border-stone-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-6"
            >
              <div className="w-full md:w-32 h-32 rounded-xl overflow-hidden bg-stone-200 flex-shrink-0">
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

              <div className="flex items-center gap-2 md:pl-6 md:border-l border-stone-100">
                <Link 
                  to={`/recipe/${recipe.id}`}
                  className="p-3 text-stone-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                  title="Ver Receita"
                >
                  <ChevronRight className="w-6 h-6" />
                </Link>
                <Link 
                  to={`/submit/${recipe.id}`}
                  className="p-3 text-stone-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                  title="Editar"
                >
                  <Edit3 className="w-5 h-5" />
                </Link>
                <button 
                  onClick={() => setDeletingId(recipe.id || null)}
                  className="p-3 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
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
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl overflow-hidden"
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
                  className="flex-1 py-4 px-6 rounded-2xl font-bold text-on-surface-variant hover:bg-stone-50 transition-colors disabled:opacity-50"
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
    </div>
  );
}
