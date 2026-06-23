/**
 * Home.tsx
 * Landing page e ponto de entrada visual do Alchemist.
 * Apresenta o destaque editorial, categorias populares de receitas e as publicações mais recentes da comunidade.
 */
import { motion } from 'motion/react';
import { ArrowRight, Clock, Utensils, Loader2, Coffee, Soup, Pizza, GlassWater, Cake, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { recipeService, Recipe } from '../infra/services/recipeService';
import { RecipeCard } from '../components/RecipeCard';
import { ASSETS, getAssetUrl } from '../lib/assets';
import { db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { userService } from '../infra/services/userService';

const CATEGORIES = [
  { 
    name: 'Café da Manhã', 
    img: ASSETS.CATEGORIES.BREAKFAST,
    filter: { key: 'momento', value: 'Café da Manhã' }
  },
  { 
    name: 'Almoço', 
    img: ASSETS.CATEGORIES.LUNCH,
    filter: { key: 'momento', value: 'Almoço' }
  },
  { 
    name: 'Jantar', 
    img: ASSETS.CATEGORIES.DINNER,
    filter: { key: 'momento', value: 'Jantar' }
  },
  { 
    name: 'Bebidas', 
    img: ASSETS.CATEGORIES.DRINKS,
    filter: { key: 'momento', value: 'Bebidas' }
  },
  { 
    name: 'Sobremesas', 
    img: ASSETS.CATEGORIES.DESSERTS,
    filter: { key: 'technique', value: 'Doces e Sobremesas' }
  },
  { 
    name: 'Entradas', 
    img: ASSETS.CATEGORIES.ENTRADAS,
    filter: { key: 'momento', value: 'Entradas' }
  },
  { 
    name: 'Básicas', 
    img: ASSETS.CATEGORIES.BASICAS,
    filter: { key: 'momento', value: 'Básicas' }
  },
  { 
    name: 'Petiscos&Food Tricks', 
    img: ASSETS.CATEGORIES.SNACKS,
    filter: { key: 'momento', value: 'Petiscos&Food Tricks' }
  }
];

const MOCK_RECIPES: Recipe[] = [];

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [customImages, setCustomImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);
  const { user } = useAuth();
  const [heroImage, setHeroImage] = useState(ASSETS.HOME.HERO);

  useEffect(() => {
    loadRecentRecipes();
    loadCustomImages();
  }, []);

  useEffect(() => {
    if (user?.uid) {
      userService.getUserProfile(user.uid).then(profile => {
        if (profile?.preferredHeroImage) {
          setHeroImage(profile.preferredHeroImage);
        } else if (customImages['Home Padrão']) {
          setHeroImage(customImages['Home Padrão']);
        } else {
          setHeroImage(ASSETS.HOME.HERO);
        }
      });
    } else {
      if (customImages['Home Padrão']) {
        setHeroImage(customImages['Home Padrão']);
      } else {
        setHeroImage(ASSETS.HOME.HERO);
      }
    }
  }, [user, customImages]);

  const loadCustomImages = async () => {
    try {
      const snap = await getDoc(doc(db, 'settings', 'categoryImages'));
      if (snap.exists()) {
        setCustomImages(snap.data() as Record<string, string>);
      }
    } catch (err) {
      console.error('Error loading custom images:', err);
    } finally {
      setLoadingImages(false);
    }
  };

  const loadRecentRecipes = async () => {
    try {
      const data = await recipeService.getAllRecipes();
      
      // Calculate category counts based on real data
      const counts: Record<string, number> = {};
      CATEGORIES.forEach(cat => {
        const field = cat.filter.key === 'momento' ? 'momento' : 'tipo_prato';
        counts[cat.name] = data.filter(r => {
          const values = (r as any)[field];
          return Array.isArray(values) && values.includes(cat.filter.value);
        }).length;
      });
      setCategoryCounts(counts);
      
      // Shuffle and pick 6 distinct category recipes for rotation
      const shuffled = [...data].sort(() => 0.5 - Math.random());
      const selectedRecipes: Recipe[] = [];
      const usedCategories = new Set<string>();

      for (const recipe of shuffled) {
        if (selectedRecipes.length >= 8) break;
        
        const typeField = (recipe as any).tipo_prato;
        const momentField = (recipe as any).momento;
        const mainCat = (Array.isArray(typeField) && typeField[0]) || (Array.isArray(momentField) && momentField[0]) || 'Outros';

        if (!usedCategories.has(mainCat)) {
          usedCategories.add(mainCat);
          selectedRecipes.push(recipe);
        }
      }

      // Fill remaining slots if we couldn't find 8 distinct categories
      if (selectedRecipes.length < 8) {
        for (const recipe of shuffled) {
          if (selectedRecipes.length >= 8) break;
          if (!selectedRecipes.some(r => r.id === recipe.id)) {
            selectedRecipes.push(recipe);
          }
        }
      }

      setRecipes(selectedRecipes);
    } catch (error) {
      console.error('Error loading recent recipes:', error);
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-xl">
      {/* Hero Section */}
      <section className="max-w-[1600px] w-full mx-auto px-4 md:px-6 mb-xl">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl md:rounded-3xl overflow-hidden bg-stone-900 min-h-[500px] md:min-h-[600px] flex items-center group"
        >
          <div className="absolute inset-0 z-0">
            <img 
              src={getAssetUrl(heroImage)} 
              alt="Featured Recipe" 
              className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105 opacity-40 md:opacity-60"
              referrerPolicy="no-referrer"
            />
            {/* Desktop Gradient Overlay */}
            <div className="hidden md:block absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-900/40 to-transparent"></div>
            {/* Mobile Ambient Overlay */}
            <div className="md:hidden absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/60 to-stone-900/40"></div>
          </div>

          <div className="relative z-10 max-w-2xl px-6 md:px-12 py-12 md:py-20 text-white w-full">
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-block px-3 py-1 rounded-full bg-secondary text-white text-[10px] md:text-sm font-bold mb-3 md:mb-4 tracking-widest uppercase"
            >
              Escolha do Editor
            </motion.span>
            <h1 className="text-3xl md:text-5xl font-bold mb-3 md:mb-4 leading-tight font-sans drop-shadow-md">
              Segredos da Alquimia do Prato: Tradição e Sabor
            </h1>
            <p className="text-base md:text-lg text-stone-200 mb-5 md:mb-6 max-w-lg leading-relaxed drop-shadow-sm">
              Celebre a magia dos sabores com pratos que honram ingredientes frescos e técnicas artesanais passadas por gerações.
            </p>
            
            <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-8 md:mb-10 text-stone-300 text-sm md:text-base">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <Clock className="w-4 h-4 text-secondary" />
                <span className="font-medium">Variado</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <Utensils className="w-4 h-4 text-secondary" />
                <span className="font-medium">Autêntico</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link to="/explore" className="inline-flex bg-primary hover:bg-primary-container text-white font-bold px-6 md:px-8 py-3.5 md:py-4 rounded-xl shadow-lg transition-all items-center gap-3 active:scale-95 w-full sm:w-fit text-base md:text-lg justify-center shadow-primary/30">
                Explorar Receitas <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/submit" className="inline-flex bg-white/10 hover:bg-white/20 text-white font-bold px-6 md:px-8 py-3.5 md:py-4 rounded-xl border border-white/20 transition-all items-center gap-3 active:scale-95 w-full sm:w-fit text-base md:text-lg justify-center backdrop-blur-sm">
                Começar a compartilhar <Plus className="w-5 h-5 text-secondary" />
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Popular Categories */}
      <section className="max-w-[1600px] w-full mx-auto px-6 mb-xl">
        <div className="mb-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-on-surface mb-1">Categorias Populares</h2>
              <p className="text-on-surface-variant text-sm md:text-base">Encontre exatamente o que você deseja hoje.</p>
            </div>
            <Link to="/categories" className="text-primary font-bold flex items-center gap-2 hover:underline">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
        
        {loadingImages ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-4 md:flex md:flex-nowrap md:justify-center gap-3 md:gap-4 lg:gap-6 xl:gap-8 w-full">
            {CATEGORIES.map((cat, i) => {
              const displayName = cat.name === 'Café da Manhã' ? 'Café' : cat.name;
              return (
              <Link 
                key={i} 
                to={`/explore?${cat.filter.key}=${encodeURIComponent(cat.filter.value)}`}
                className="group flex flex-col items-center gap-2 md:gap-4 cursor-pointer transition-all min-w-0 flex-1 md:flex-none"
              >
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 xl:w-32 xl:h-32 rounded-full overflow-hidden border-2 md:border-4 border-transparent group-hover:border-primary/50 transition-all duration-300 p-0.5 md:p-1 bg-surface-container shadow-inner flex-shrink-0"
                >
                  <img src={getAssetUrl(customImages[cat.name] || cat.img)} alt={cat.name} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                </motion.div>

                <div className="flex flex-col items-center text-center w-full min-w-0 px-1">
                  <span className="font-semibold text-on-surface group-hover:text-primary transition-colors text-xs sm:text-sm lg:text-base xl:text-xl truncate w-full">
                    {displayName}
                  </span>
                  <span className="hidden lg:block text-[10px] text-on-surface-variant uppercase font-bold tracking-widest mt-0.5">
                    {categoryCounts[cat.name] !== undefined ? `${categoryCounts[cat.name]} ${categoryCounts[cat.name] === 1 ? 'receita' : 'receitas'}` : 'Explorar'}
                  </span>
                </div>
              </Link>
            )})}
          </div>
        )}
      </section>

      {/* Recent Recipes */}
      <section className="max-w-[1600px] w-full mx-auto px-6 mb-xl">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-on-surface">Receitas Recentes</h2>
          <Link to="/explore" className="text-primary font-bold flex items-center gap-2 hover:underline">
            Ver todas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
            <p className="text-sm text-on-surface-variant">Carregando novidades...</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id || `home-recipe-${Math.random()}`} recipe={recipe} />
            ))}
          </div>
        )}
      </section>

      {/* Community Section */}
      <section className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 backdrop-blur-md py-12 md:py-16 mt-8 rounded-3xl max-w-[1600px] w-full mx-auto overflow-hidden border border-amber-100 dark:border-amber-900/50 shadow-xl shadow-amber-500/5">
        <div className="px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <img 
              src={getAssetUrl(ASSETS.HOME.COMMUNITY)} 
              alt="Comunidade Alquimia do Prato" 
              className="w-full h-[400px] object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // Fallback to high-quality Unsplash if Drive fails
                (e.target as HTMLImageElement).src = ASSETS.MANIFESTO.STORY_DECOR;
              }}
            />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-on-surface leading-tight">Compartilhe sua Jornada Culinária</h2>
            <p className="text-base md:text-lg text-on-surface-variant leading-relaxed">
              Junte-se a uma comunidade de cozinheiros que valorizam ingredientes de verdade e técnicas ancestrais. Envie suas próprias receitas e inspire outros.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link to="/submit" className="bg-primary text-white font-bold px-8 py-3 rounded-xl hover:shadow-lg transition-all active:scale-95 text-center shadow-xl shadow-primary/20">
                Publicar uma Receita
              </Link>
              <Link to="/manifesto" className="border-2 border-primary text-primary font-bold px-8 py-3 rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95 text-center">
                Saiba Mais
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
