import { motion, AnimatePresence } from 'motion/react';
import { Trash2, Shield, Loader2, Search, Filter, AlertTriangle, User, Calendar, ExternalLink } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { recipeService, Recipe } from '../infra/services/recipeService';
import { useAuth } from '../context/AuthContext';
import { getAssetUrl } from '../lib/assets';

export default function AdminDashboard() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      fetchAllRecipes();
    }
  }, [isAdmin]);

  const fetchAllRecipes = async () => {
    try {
      const data = await recipeService.getAllRecipes();
      setRecipes(data);
    } catch (error) {
      console.error('Error fetching recipes as admin:', error);
    } finally {
      setLoading(false);
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

  const filteredRecipes = recipes.filter(r => 
    r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.momento && r.momento[0]?.toLowerCase().includes(searchTerm.toLowerCase()))
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
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="flex items-center gap-3 text-primary font-bold mb-2 uppercase tracking-widest text-sm">
            <Shield className="w-5 h-5" /> Modo Administrador
          </div>
          <h1 className="text-5xl font-bold text-on-surface mb-2 tracking-tight">Gestão Global</h1>
          <p className="text-on-surface-variant text-lg">Moderação de todas as receitas da plataforma Alquimia do Prato.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Buscar por título ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-stone-100 focus:border-primary outline-none transition-all text-sm font-medium"
            />
          </div>
          <div className="bg-surface-container-high px-6 py-4 rounded-2xl border border-stone-200 flex items-center gap-3">
            <Filter className="w-5 h-5 text-on-surface-variant" />
            <span className="font-bold text-on-surface">{filteredRecipes.length} receitas</span>
          </div>
        </div>
      </header>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-stone-50/50 border-b border-stone-100">
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-stone-400">Receita</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-stone-400">Categoria</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-stone-400">Status / Info</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-widest text-stone-400 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRecipes.map((recipe, index) => (
                <motion.tr 
                  key={recipe.id || `admin-row-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-stone-50/30 transition-colors group"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-100 flex-shrink-0">
                        {recipe.image ? (
                          <img src={getAssetUrl(recipe.image)} alt={recipe.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-300 text-[10px] font-bold">N/A</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-lg text-on-surface line-clamp-1">{recipe.title}</div>
                        <div className="text-stone-400 text-xs flex items-center gap-1 mt-1 font-medium">
                          ID: {recipe.id?.substring(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 rounded-full bg-stone-100 text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                      {recipe.momento && recipe.momento[0]}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs font-semibold text-on-surface-variant">
                        <User className="w-3.5 h-3.5" /> {recipe.ownerId?.substring(0, 10)}...
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-stone-400">
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
                        to={`/recipe/${recipe.id}`}
                        className="p-3 bg-stone-100 text-stone-500 hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                        title="Ver no Site"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </Link>
                      <button 
                        onClick={() => setDeletingId(recipe.id || null)}
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
          
          {filteredRecipes.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-on-surface-variant font-medium">Nenhuma receita encontrada para os filtros aplicados.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deletingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-on-surface mb-3">Moderação: Excluir?</h3>
              <p className="text-on-surface-variant mb-8 leading-relaxed">
                Como administrador, você está prestes a remover permanentemente uma receita da plataforma. Esta ação removerá o conteúdo para todos os usuários.
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeletingId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-4 font-bold text-on-surface-variant hover:bg-stone-50 rounded-2xl transition-colors disabled:opacity-50"
                >
                  Manter
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
