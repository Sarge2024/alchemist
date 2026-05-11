import { motion } from 'motion/react';
import { Heart, Star, Clock, Filter, ChevronDown, Loader2, X, LayoutGrid, List, Utensils } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { recipeService, Recipe } from '../infra/services/recipeService';

import { RecipeCard } from '../components/RecipeCard';
import { ASSETS, getAssetUrl } from '../lib/assets';

const MOCK_RECIPES: Recipe[] = [
  {
    id: 'tapioca-rendada',
    title: 'Tapioca Rendada com Queijo Coalho',
    momento: ['Café da Manhã'],
    tipo_prato: ['Grelhados'],
    base_alimento: ['Ovos e Laticínios'],
    origem: 'Brasileira',
    time: '12 min',
    rating: 4.9,
    reviewsCount: 45,
    difficulty: 'Fácil',
    image: ASSETS.MOCKS.TAPIOCA,
    ownerId: 'system',
    ingredients: [],
    instructions: []
  },
  {
    id: 'feijoada-completa',
    title: 'Feijoada Completa Tradicional',
    momento: ['Almoço'],
    tipo_prato: ['Cozidos / Guisados'],
    base_alimento: ['Carnes'],
    origem: 'Brasileira',
    time: '3h 00min',
    rating: 5.0,
    reviewsCount: 128,
    difficulty: 'Médio',
    image: ASSETS.MOCKS.FEIJOADA,
    ownerId: 'system',
    ingredients: [],
    instructions: []
  },
  {
    id: 'salmao-ervas',
    title: 'Salmão com Crosta de Ervas',
    momento: ['Jantar'],
    tipo_prato: ['Assados'],
    base_alimento: ['Frutos do Mar'],
    origem: 'Europeia',
    time: '25 min',
    rating: 4.8,
    reviewsCount: 67,
    difficulty: 'Fácil',
    image: ASSETS.MOCKS.SALMON,
    ownerId: 'system',
    ingredients: [],
    instructions: []
  },
  {
    id: 'pudim-leite',
    title: 'Pudim de Leite Condensado',
    momento: ['Lanche / Chá da Tarde'],
    tipo_prato: ['Doces e Sobremesas'],
    base_alimento: ['Ovos e Laticínios'],
    origem: 'Brasileira',
    time: '1h 30min',
    rating: 4.9,
    reviewsCount: 210,
    difficulty: 'Médio',
    image: ASSETS.MOCKS.BRUNCH,
    ownerId: 'system',
    ingredients: [],
    instructions: []
  }
];

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryFilter = searchParams.get('category');
  
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    loadRecipes();
  }, []);

  useEffect(() => {
    const momento = searchParams.get('momento');
    const technique = searchParams.get('technique');
    const base = searchParams.get('base');
    const diet = searchParams.get('diet');
    const difficulty = searchParams.get('difficulty');
    const classic = searchParams.get('classic');
    
    let filtered = [...recipes];
    
    if (momento) {
      filtered = filtered.filter(r => r.momento && r.momento.includes(momento));
    }

    if (technique) {
      filtered = filtered.filter(r => r.tipo_prato && r.tipo_prato.includes(technique));
    }

    if (base) {
      filtered = filtered.filter(r => r.base_alimento && r.base_alimento.includes(base));
    }
    
    if (diet) {
      filtered = filtered.filter(r => r.dietType === diet);
    }

    if (difficulty) {
      filtered = filtered.filter(r => r.difficulty === difficulty);
    }

    if (classic === 'true') {
      filtered = filtered.filter(r => r.isClassic === true);
    }
    
    setFilteredRecipes(filtered);
  }, [searchParams, recipes]);

  const loadRecipes = async () => {
    try {
      const data = await recipeService.getAllRecipes();
      const allRecipes = data.length > 0 ? data : MOCK_RECIPES;
      setRecipes(allRecipes);
    } catch (error) {
      console.error('Error loading recipes:', error);
      setRecipes(MOCK_RECIPES);
    } finally {
      setLoading(false);
    }
  };

  const clearFilter = () => {
    setSearchParams({});
  };

  const getMomentoColor = (momento: string) => {
    switch (momento) {
      case 'Café da Manhã': return 'bg-yellow-100 text-yellow-700';
      case 'Almoço': return 'bg-primary-fixed text-on-primary-fixed';
      case 'Jantar': return 'bg-secondary-container text-on-secondary-container';
      case 'Petiscos / Aperitivos': return 'bg-orange-100 text-orange-700';
      case 'Lanche / Chá da Tarde': return 'bg-blue-100 text-blue-700';
      case 'Brunch': return 'bg-indigo-100 text-indigo-700';
      case 'Bebidas': return 'bg-cyan-100 text-cyan-700';
      default: return 'bg-stone-100 text-stone-700';
    }
  };

  const getDietTagColor = (diet?: string) => {
    switch (diet) {
      case 'Vegana': return 'bg-green-100 text-green-700';
      case 'Vegetariana': return 'bg-emerald-100 text-emerald-700';
      case 'Low Carb': return 'bg-blue-100 text-blue-700';
      case 'Fit': return 'bg-cyan-100 text-cyan-700';
      case 'Sem Glúten': return 'bg-amber-100 text-amber-700';
      case 'Sem Lactose': return 'bg-orange-100 text-orange-700';
      case 'Keto': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-stone-50 text-stone-500 border border-stone-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pb-xl">
      <header className="mb-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-6">
          <div>
            <h1 className="text-4xl font-bold text-on-surface mb-2">Explorar Receitas</h1>
            <p className="text-on-surface-variant text-lg">Navegue por nossa coleção completa de receitas artesanais.</p>
          </div>
          
          <div className="flex items-center bg-surface-container rounded-xl p-1 shadow-inner">
            <button 
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            >
              <LayoutGrid className="w-4 h-4" />
              Grid
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-md' : 'text-on-surface-variant hover:text-primary'}`}
            >
              <List className="w-4 h-4" />
              Lista
            </button>
          </div>
        </div>
        
        {searchParams.toString() && (
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Filtros ativos:</span>
            {Array.from(searchParams.entries()).map(([key, value]) => (
              <div key={key} className="px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-bold flex items-center gap-2">
                <span className="text-[10px] text-stone-400 uppercase">{key}:</span>
                {value}
                <button 
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete(key);
                    setSearchParams(newParams);
                  }}
                  className="p-0.5 hover:bg-black/10 rounded-full transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button 
              onClick={clearFilter}
              className="text-xs font-bold text-primary hover:underline ml-2"
            >
              Limpar tudo
            </button>
          </div>
        )}
      </header>

      <div className="flex flex-col md:flex-row gap-8 mb-12">
        {/* Filters Sidebar */}
        <aside className="w-full md:w-64 space-y-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Filter className="w-5 h-5" /> Filtros
              </h3>
              {searchParams.toString() && (
                <button 
                  onClick={clearFilter}
                  className="text-xs font-bold text-primary hover:bg-primary/5 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Limpar
                </button>
              )}
            </div>
            <div className="space-y-4">
              {/* Classic Filter */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary"
                    checked={searchParams.get('classic') === 'true'}
                    onChange={(e) => {
                      const newParams = new URLSearchParams(searchParams);
                      if (e.target.checked) {
                        newParams.set('classic', 'true');
                      } else {
                        newParams.delete('classic');
                      }
                      setSearchParams(newParams);
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="font-bold text-primary text-sm">Receitas Clássicas</span>
                    <span className="text-[10px] text-on-surface-variant font-medium">História e Tradição</span>
                  </div>
                </label>
              </div>

              {/* Momento Filter */}
              <div className="p-4 bg-surface-container rounded-xl">
                <button className="w-full flex items-center justify-between font-semibold">
                  Momento <ChevronDown className="w-4 h-4" />
                </button>
                <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                  {['Café da Manhã', 'Brunch', 'Almoço', 'Lanche / Chá da Tarde', 'Jantar', 'Ceia', 'Petiscos', 'Bebidas'].map(cat => (
                    <label key={cat} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="momento" 
                        checked={searchParams.get('momento') === cat}
                        onChange={() => {
                          const newParams = new URLSearchParams(searchParams);
                          newParams.set('momento', cat);
                          setSearchParams(newParams);
                        }}
                        className="text-primary focus:ring-primary" 
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Técnica Filter */}
              <div className="p-4 bg-surface-container rounded-xl">
                <button className="w-full flex items-center justify-between font-semibold">
                  Técnica <ChevronDown className="w-4 h-4" />
                </button>
                <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                  {['Assados', 'Frituras', 'Grelhados', 'Sopas e Caldos', 'Massas e Risotos', 'Bebidas', 'Doces e Sobremesas'].map(tech => (
                    <label key={tech} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="technique" 
                        checked={searchParams.get('technique') === tech}
                        onChange={() => {
                          const newParams = new URLSearchParams(searchParams);
                          newParams.set('technique', tech);
                          setSearchParams(newParams);
                        }}
                        className="text-primary focus:ring-primary" 
                      />
                      <span>{tech}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Base Filter */}
              <div className="p-4 bg-surface-container rounded-xl">
                <button className="w-full flex items-center justify-between font-semibold">
                  Base <ChevronDown className="w-4 h-4" />
                </button>
                <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                  {['Carnes', 'Frutos do Mar', 'Vegetais e Legumes', 'Ovos e Laticínios', 'Grãos and Leguminosas'].map(base => (
                    <label key={base} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="base" 
                        checked={searchParams.get('base') === base}
                        onChange={() => {
                          const newParams = new URLSearchParams(searchParams);
                          newParams.set('base', base);
                          setSearchParams(newParams);
                        }}
                        className="text-primary focus:ring-primary" 
                      />
                      <span>{base}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-surface-container rounded-xl">
                <button className="w-full flex items-center justify-between font-semibold">
                  Dieta <ChevronDown className="w-4 h-4" />
                </button>
                <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                  {['Convencional', 'Vegana', 'Vegetariana', 'Low Carb', 'Keto', 'Sem Glúten', 'Sem Lactose', 'Fit'].map(diet => (
                    <label key={diet} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="rounded text-primary focus:ring-primary"
                        checked={searchParams.get('diet') === diet}
                        onChange={(e) => {
                          const newParams = new URLSearchParams(searchParams);
                          if (e.target.checked) {
                            newParams.set('diet', diet);
                          } else {
                            newParams.delete('diet');
                          }
                          setSearchParams(newParams);
                        }}
                      />
                      <span>{diet}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-surface-container rounded-xl">
                <button className="w-full flex items-center justify-between font-semibold">
                  Dificuldade <ChevronDown className="w-4 h-4" />
                </button>
                <div className="mt-3 space-y-2 text-sm text-on-surface-variant">
                  {['Fácil', 'Médio', 'Difícil'].map(level => (
                    <label key={level} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="difficulty" 
                        className="text-primary focus:ring-primary" 
                        checked={searchParams.get('difficulty') === level}
                        onChange={() => {
                          const newParams = new URLSearchParams(searchParams);
                          newParams.set('difficulty', level);
                          setSearchParams(newParams);
                        }}
                      />
                      <span>{level}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Recipe Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="text-on-surface-variant">Buscando as melhores receitas...</p>
            </div>
          ) : (
            <>
              {filteredRecipes.length > 0 ? (
                <>
                  {viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredRecipes.map((recipe) => (
                        <RecipeCard key={recipe.id || `explore-grid-${Math.random()}`} recipe={recipe} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredRecipes.map((recipe, i) => (
                        <motion.div
                          key={recipe.id || `explore-list-${i}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                        >
                          <Link 
                            to={`/recipe/${recipe.id}`}
                            className="bg-surface-container-low p-3 md:p-4 rounded-xl border border-stone-100 flex items-center gap-4 hover:bg-surface-container transition-colors group"
                          >
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-stone-200">
                              {recipe.image ? (
                                <img 
                                  src={getAssetUrl(recipe.image)} 
                                  alt={recipe.title} 
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                                  referrerPolicy="no-referrer" 
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = ASSETS.DEFAULT_RECIPE;
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 font-bold uppercase">N/A</div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {recipe.momento && recipe.momento.length > 0 && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${getMomentoColor(recipe.momento[0])}`}>
                                    {recipe.momento[0]}
                                  </span>
                                )}
                                {recipe.dietType && (
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight ${getDietTagColor(recipe.dietType)}`}>
                                    {recipe.dietType}
                                  </span>
                                )}
                              </div>
                              <h3 className="text-base md:text-lg font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                                {recipe.title}
                              </h3>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant font-medium mt-1">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recipe.time}</span>
                                <span className="flex items-center gap-1"><Utensils className="w-3 h-3" /> {recipe.servings}</span>
                                <span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {recipe.rating?.toFixed(1)}</span>
                              </div>
                            </div>
                            <button className="p-2 text-primary bg-primary/10 rounded-full hover:bg-primary hover:text-white transition-colors">
                              <Heart className="w-4 h-4" />
                            </button>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 px-6 bg-surface-container rounded-3xl">
                  <h3 className="text-xl font-bold text-on-surface mb-2">Nenhuma receita encontrada</h3>
                  <p className="text-on-surface-variant mb-6">Parece que não temos nada nessa categoria no momento.</p>
                  <button 
                    onClick={clearFilter}
                    className="bg-primary text-white font-bold px-6 py-2 rounded-xl hover:bg-primary-container transition-all"
                  >
                    Ver todas as receitas
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
