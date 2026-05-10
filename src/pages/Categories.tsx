import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { recipeService, Recipe } from '../infra/services/recipeService';
import { ASSETS, getAssetUrl } from '../lib/assets';

const CATEGORIES_DETAILED = [
  { 
    name: 'Café da Manhã', 
    desc: 'Comece o dia com receitas nutritivas e reconfortantes.',
    img: ASSETS.CATEGORIES.BREAKFAST 
  },
  { 
    name: 'Almoço', 
    desc: 'Refeições leves e equilibradas para o seu meio de dia.',
    img: ASSETS.CATEGORIES.LUNCH 
  },
  { 
    name: 'Jantar', 
    desc: 'Pratos sofisticados para encantar a família e amigos.',
    img: ASSETS.CATEGORIES.DINNER 
  },
  { 
    name: 'Sobremesas', 
    desc: 'Doces artesanais que celebram sabores naturais.',
    img: ASSETS.CATEGORIES.DESSERTS 
  },
  { 
    name: 'Petiscos / Aperitivos', 
    desc: 'Petiscos, quitutes e tira-gostos para cofee breaks e recepções.',
    img: ASSETS.CATEGORIES.SNACKS 
  },
  { 
    name: 'Bebidas', 
    desc: 'Sucos, drinks e bebidas refrescantes para todas as ocasiões.',
    img: ASSETS.CATEGORIES.DRINKS 
  }
];

export default function Categories() {
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const recipes = await recipeService.getAllRecipes();
        const counts: Record<string, number> = {};
        
        CATEGORIES_DETAILED.forEach(cat => {
          counts[cat.name] = recipes.filter(r => r.momento && r.momento.includes(cat.name)).length;
        });
        
        setCategoryCounts(counts);
      } catch (error) {
        console.error('Error loading category counts:', error);
      }
    };

    loadCounts();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 pb-xl">
      <header className="mb-12 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-on-surface mb-4">Categorias de Receitas</h1>
        <p className="text-on-surface-variant text-lg">Explore nosso universo culinário agrupado por momentos e sabores.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {CATEGORIES_DETAILED.map((cat, i) => (
          <Link key={i} to={`/explore?momento=${encodeURIComponent(cat.name)}`}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group relative h-80 rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500"
            >
              <img src={getAssetUrl(cat.img)} alt={cat.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-900/40 to-transparent" />
              <div className="absolute inset-0 p-8 flex flex-col justify-end text-white">
                <span className="text-sm font-bold text-secondary-container mb-2 tracking-widest uppercase">
                  {categoryCounts[cat.name] !== undefined ? `${categoryCounts[cat.name]} ${categoryCounts[cat.name] === 1 ? 'receita' : 'receitas'}` : 'Carregando...'}
                </span>
                <h3 className="text-3xl font-bold mb-2">{cat.name}</h3>
                <p className="text-stone-300 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  {cat.desc}
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
