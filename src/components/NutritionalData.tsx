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
      
      // Use pre-calculated backend nutrition if available!
      if (recipe.nutrition && recipe.nutrition.total_nutrition && recipe.nutrition.details) {
        setData(recipe.nutrition as unknown as NutriData);
        return;
      }
      
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
    <div className="bg-gradient-to-br from-surface-container-lowest to-surface-container-low p-4 sm:p-6 rounded-3xl border border-surface-container-high shadow-sm my-0 no-print w-full overflow-hidden relative group">
      {/* Decoração de fundo */}
      <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
        <Activity className="w-32 h-32" />
      </div>

      <div className="relative z-10">
        <div className="flex flex-wrap items-center justify-between mb-4 border-b border-surface-container-high pb-3 gap-2">
          <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> 
            Perfil Nutricional
          </h3>
          <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-1 rounded-full uppercase tracking-widest whitespace-nowrap">
            IA + TACO
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="bg-surface-container p-2 sm:p-3 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white hover:shadow-md transition-all">
            <Flame className="w-5 h-5 text-orange-500 mb-1" />
            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Cal</span>
            <span className="text-sm font-black text-on-surface leading-none">{String(Math.round(total_nutrition.calories))}</span>
          </div>
          
          <div className="bg-surface-container p-2 sm:p-3 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white hover:shadow-md transition-all">
            <Beef className="w-5 h-5 text-red-500 mb-1" />
            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Prot</span>
            <span className="text-sm font-black text-on-surface leading-none">{String(Math.round(total_nutrition.protein))}g</span>
          </div>

          <div className="bg-surface-container p-2 sm:p-3 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white hover:shadow-md transition-all">
            <Wheat className="w-5 h-5 text-yellow-600 mb-1" />
            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Carb</span>
            <span className="text-sm font-black text-on-surface leading-none">{String(Math.round(total_nutrition.carbs))}g</span>
          </div>

          <div className="bg-surface-container p-2 sm:p-3 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-white hover:shadow-md transition-all">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-[3px] border-yellow-400 mb-1"></div>
            <span className="text-[9px] text-on-surface-variant font-bold uppercase tracking-wider mb-1">Gord</span>
            <span className="text-sm font-black text-on-surface leading-none">{String(Math.round(total_nutrition.fat))}g</span>
          </div>
        </div>

        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs font-bold text-primary hover:underline flex items-center gap-2 mx-auto mt-2"
        >
          <Info className="w-3 h-3" />
          {showDetails ? 'Ocultar detalhamento' : 'Ver detalhamento'}
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-4"
            >
              <div className="bg-white rounded-xl border border-surface-container-high overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[300px]">
                  <thead className="bg-surface-container-lowest border-b border-surface-container-high">
                    <tr>
                      <th className="p-2 font-bold text-on-surface-variant">Ingrediente</th>
                      <th className="p-2 font-bold text-on-surface-variant text-right">Kcal</th>
                      <th className="p-2 font-bold text-on-surface-variant text-right">P(g)</th>
                      <th className="p-2 font-bold text-on-surface-variant text-right">C(g)</th>
                      <th className="p-2 font-bold text-on-surface-variant text-right">G(g)</th>
                      <th className="p-2 font-bold text-on-surface-variant text-center">Fonte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((item, idx) => (
                      <tr key={idx} className="border-b border-surface-container-high last:border-0 hover:bg-surface-container-lowest">
                        <td className="p-2 text-on-surface font-medium capitalize truncate max-w-[100px] sm:max-w-none" title={item.ingredient}>{item.ingredient}</td>
                        <td className="p-2 text-on-surface text-right">{item.calories.toFixed(2)}</td>
                        <td className="p-2 text-on-surface text-right">{item.protein.toFixed(2)}</td>
                        <td className="p-2 text-on-surface text-right">{item.carbs.toFixed(2)}</td>
                        <td className="p-2 text-on-surface text-right">{item.fat.toFixed(2)}</td>
                        <td className="p-2 text-center">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${item.source === 'NOT_FOUND' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {item.source === 'NOT_FOUND' ? 'NF' : 'TACO'}
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

        <p className="text-[9px] text-on-surface-variant text-center mt-4 uppercase tracking-wider font-bold opacity-60">
          TACO (Unicamp) / USDA. Valores aproximados. Baseado em porção de 100g.
        </p>
      </div>
    </div>
  );
};
