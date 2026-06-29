import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { supabase } from '../lib/supabase';
import { Loader2, Info, Activity, Flame, Beef, Wheat } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe } from '../infra/services/recipeService';

interface NutritionalDataProps {
  recipe: Recipe;
}

interface NutriData {
  total_nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  details: {
    ingredient: string;
    source: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
}

export const NutritionalData: React.FC<NutritionalDataProps> = ({ recipe }) => {
  const [data, setData] = useState<NutriData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchNutrition = async () => {
      if (!recipe.ingredients || recipe.ingredients.length === 0) return;
      
      setLoading(true);
      setError('');
      try {
        let token: string | undefined;
        try {
          const { data: { session } } = await supabase.auth.getSession();
          token = session?.access_token;
        } catch (err) {
          console.warn('Erro ao obter token do Supabase em NutritionalData:', err);
        }

        if (!token) {
          try {
            const auth = getAuth();
            token = await auth.currentUser?.getIdToken();
          } catch (err) {
            console.warn('Erro ao obter token do Firebase em NutritionalData:', err);
          }
        }
        
        // Parse frontend ingredients to match backend format
        const parsedIngredients = recipe.ingredients.map(ing => {
          let name = '';
          let quantityStr = '';
          
          if (typeof ing === 'string') {
            // Regex to capture "100g de frango" or "1 lata de leite"
            const match = ing.match(/^([\d/.,]+)\s*([a-zA-Zçãéíóú]*)\s+(?:de\s+)?(.*)/i);
            if (match) {
              quantityStr = match[1];
              name = match[3];
            } else {
              name = ing;
            }
          } else {
            name = ing.name;
            quantityStr = typeof ing.quantity === 'string' ? ing.quantity : String(ing.quantity || '');
          }
          
          let qty = parseFloat(quantityStr.replace(',', '.')) || 1;
          let unit = 'porção';
          
          if (quantityStr.toLowerCase().includes('g')) unit = 'g';
          else if (quantityStr.toLowerCase().includes('ml')) unit = 'ml';
          else if (quantityStr.toLowerCase().includes('lata')) unit = 'lata';
          else if (quantityStr.toLowerCase().includes('xícara')) unit = 'xícara';
          else if (quantityStr.toLowerCase().includes('colher')) unit = 'colher';

          return { name, quantity: qty, unit };
        });

        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch('/api/nutrition/calculate', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ingredients: parsedIngredients })
        });

        const result = await response.json();
        
        if (result.success && result.total_nutrition) {
          setData(result);
        } else {
          setError('Não foi possível calcular os dados nutricionais.');
        }
      } catch (err) {
        console.error('Nutrition Fetch Error:', err);
        setError('Erro de conexão com o motor nutricional.');
      } finally {
        setLoading(false);
      }
    };

    fetchNutrition();
  }, [recipe]);

  if (loading) {
    return (
      <div className="bg-surface-container-low p-6 rounded-3xl border border-surface-container-high flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-sm font-bold text-on-surface-variant">Analisando Tabela TACO e USDA...</span>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const { total_nutrition, details } = data;

  return (
    <div className="bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-8 rounded-3xl border border-surface-container-high shadow-sm my-8 no-print overflow-hidden relative group">
      {/* Decoração de fundo */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
        <Activity className="w-48 h-48" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8 border-b border-surface-container-high pb-4">
          <h3 className="text-2xl font-bold text-on-surface flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" /> 
            Perfil Nutricional
          </h3>
          <span className="text-xs font-bold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-widest">
            IA + TACO
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-surface-container p-5 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white hover:shadow-md transition-all">
            <Flame className="w-8 h-8 text-orange-500 mb-2" />
            <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">Calorias</span>
            <span className="text-2xl font-black text-on-surface">{String(Math.round(total_nutrition.calories))}</span>
            <span className="text-[10px] text-on-surface-variant">kcal</span>
          </div>
          
          <div className="bg-surface-container p-5 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white hover:shadow-md transition-all">
            <Beef className="w-8 h-8 text-red-500 mb-2" />
            <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">Proteínas</span>
            <span className="text-2xl font-black text-on-surface">{String(Math.round(total_nutrition.protein))}<span className="text-base font-bold ml-1">g</span></span>
          </div>

          <div className="bg-surface-container p-5 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white hover:shadow-md transition-all">
            <Wheat className="w-8 h-8 text-yellow-600 mb-2" />
            <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">Carboidratos</span>
            <span className="text-2xl font-black text-on-surface">{String(Math.round(total_nutrition.carbs))}<span className="text-base font-bold ml-1">g</span></span>
          </div>

          <div className="bg-surface-container p-5 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white hover:shadow-md transition-all">
            <div className="w-8 h-8 rounded-full border-4 border-yellow-400 mb-2"></div>
            <span className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mb-1">Gorduras</span>
            <span className="text-2xl font-black text-on-surface">{String(Math.round(total_nutrition.fat))}<span className="text-base font-bold ml-1">g</span></span>
          </div>
        </div>

        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm font-bold text-primary hover:underline flex items-center gap-2 mx-auto mt-4"
        >
          <Info className="w-4 h-4" />
          {showDetails ? 'Ocultar detalhamento' : 'Ver detalhamento por ingrediente'}
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-6"
            >
              <div className="bg-white rounded-2xl border border-surface-container-high overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-container-lowest border-b border-surface-container-high">
                    <tr>
                      <th className="p-3 font-bold text-on-surface-variant">Ingrediente</th>
                      <th className="p-3 font-bold text-on-surface-variant text-right">Kcal</th>
                      <th className="p-3 font-bold text-on-surface-variant text-right">Prot (g)</th>
                      <th className="p-3 font-bold text-on-surface-variant text-right">Carb (g)</th>
                      <th className="p-3 font-bold text-on-surface-variant text-right">Gord (g)</th>
                      <th className="p-3 font-bold text-on-surface-variant text-center">Fonte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((item, idx) => (
                      <tr key={idx} className="border-b border-surface-container-high last:border-0 hover:bg-surface-container-lowest">
                        <td className="p-3 text-on-surface font-medium capitalize">{item.ingredient}</td>
                        <td className="p-3 text-on-surface text-right">{String(Math.round(item.calories))}</td>
                        <td className="p-3 text-on-surface text-right">{String(Math.round(item.protein))}</td>
                        <td className="p-3 text-on-surface text-right">{String(Math.round(item.carbs))}</td>
                        <td className="p-3 text-on-surface text-right">{String(Math.round(item.fat))}</td>
                        <td className="p-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${item.source === 'NOT_FOUND' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {item.source}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-on-surface-variant text-center mt-6 uppercase tracking-wider font-bold opacity-60">
          Valores baseados nas tabelas TACO (Unicamp) e USDA. A manipulação dos alimentos e métodos de cocção podem interferir nos nutrientes finais. Valores aproximados.
        </p>
      </div>
    </div>
  );
};
