export interface IngredientQuery {
  name: string;
  quantity: number;
  unit: string;
}

export interface NutritionalResult {
  ingredient: string;
  source: 'TACO' | 'USDA' | 'LOCAL' | 'NOT_FOUND';
  quantity: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  base_data?: any;
}

export class NutritionalEngineService {
  // Controle de Rate Limit da USDA
  private static usdaRateLimitReset: number = 0;

  /**
   * Ponto de entrada do Motor. Recebe uma lista de ingredientes e calcula.
   */
  public static async calculateRecipeNutrition(ingredients: IngredientQuery[]): Promise<{
    total_nutrition: { calories: number; protein: number; carbs: number; fat: number; },
    details: NutritionalResult[]
  }> {
    const details: NutritionalResult[] = [];
    
    // Totalizadores
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    for (const item of ingredients) {
      // 1. Tenta buscar na TACO primeiro
      let data = await this.fetchTacoData(item.name);
      
      // 2. Se falhar ou não achar, tenta na USDA
      if (!data) {
        data = await this.fetchUsdaData(item.name);
      }

      if (data) {
        // Regra de três: (quantidade_inserida / base_100g) * valor_do_nutriente
        const factor = item.quantity / 100;
        
        const calcCals = data.calories * factor;
        const calcProt = data.protein * factor;
        const calcCarbs = data.carbs * factor;
        const calcFat = data.fat * factor;

        details.push({
          ingredient: item.name,
          source: data.source,
          quantity: item.quantity,
          unit: item.unit,
          calories: calcCals,
          protein: calcProt,
          carbs: calcCarbs,
          fat: calcFat,
          base_data: data
        });

        totalCalories += calcCals;
        totalProtein += calcProt;
        totalCarbs += calcCarbs;
        totalFat += calcFat;
      } else {
        // Fallback: não encontrado
        details.push({
          ingredient: item.name,
          source: 'NOT_FOUND',
          quantity: item.quantity,
          unit: item.unit,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        });
      }
    }

    return {
      total_nutrition: {
        calories: Math.round(totalCalories * 10) / 10,
        protein: Math.round(totalProtein * 10) / 10,
        carbs: Math.round(totalCarbs * 10) / 10,
        fat: Math.round(totalFat * 10) / 10,
      },
      details
    };
  }

  /**
   * Consulta a Taco API (Vercel)
   */
  private static async fetchTacoData(name: string): Promise<any | null> {
    try {
      // Usando o endpoint sugerido
      const TACO_API = `https://taco-api-nodejs.vercel.app/api/v1/food`;
      const response = await globalThis.fetch(TACO_API);

      if (!response.ok) return null;
      
      const foods: any[] = await response.json();
      
      // Busca simplificada (case insensitive e contém o termo)
      const searchTerm = name.toLowerCase();
      const match = foods.find(f => f.description && f.description.toLowerCase().includes(searchTerm));

      if (match) {
        // Pega detalhes para ter os nutrientes corretos se preciso, mas a listagem principal já costuma ter atributos na Vercel
        // Na API do Raul, os atributos vêm em 'attributes'
        let protein = 0, carbs = 0, fat = 0, calories = 0;
        
        if (match.attributes) {
          if (match.attributes.protein && typeof match.attributes.protein.qty === 'number') protein = match.attributes.protein.qty;
          if (match.attributes.carbohydrate && typeof match.attributes.carbohydrate.qty === 'number') carbs = match.attributes.carbohydrate.qty;
          if (match.attributes.lipid && typeof match.attributes.lipid.qty === 'number') fat = match.attributes.lipid.qty;
          if (match.attributes.energy && match.attributes.energy.kcal && typeof match.attributes.energy.kcal === 'number') calories = match.attributes.energy.kcal;
        }

        return {
          source: 'TACO',
          id: match.id,
          name: match.description,
          calories,
          protein,
          carbs,
          fat
        };
      }
      
      return null;
    } catch (err) {
      console.warn(`[NutritionalEngine] Falha na TACO API para ${name}:`, err);
      return null;
    }
  }

  /**
   * Consulta a USDA FoodData Central (FDC)
   */
  private static async fetchUsdaData(name: string): Promise<any | null> {
    const apiKey = process.env.USDA_API_KEY;
    if (!apiKey) {
      console.warn('[NutritionalEngine] USDA_API_KEY não configurada no .env');
      return null;
    }

    // Rate limit check
    if (Date.now() < this.usdaRateLimitReset) {
      console.warn('[NutritionalEngine] USDA Rate Limit ativo. Pausando buscas.');
      return null;
    }

    try {
      const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(name)}&pageSize=1`;
      const response = await globalThis.fetch(url);

      if (response.status === 429) {
        console.warn('[NutritionalEngine] Recebido 429 da USDA. Bloqueando por 10 minutos.');
        this.usdaRateLimitReset = Date.now() + 10 * 60 * 1000;
        return null;
      }

      if (!response.ok) return null;

      const data: any = await response.json();

      if (data.foods && data.foods.length > 0) {
        const food = data.foods[0];
        
        let calories = 0, protein = 0, carbs = 0, fat = 0;

        // Nutrientes na USDA
        for (const nutrient of food.foodNutrients) {
          const nameLower = nutrient.nutrientName.toLowerCase();
          if (nameLower.includes('energy') && nutrient.unitName.toLowerCase() === 'kcal') calories = nutrient.value;
          else if (nameLower.includes('protein')) protein = nutrient.value;
          else if (nameLower.includes('carbohydrate')) carbs = nutrient.value;
          else if (nameLower.includes('lipid') || nameLower.includes('fat')) fat = nutrient.value;
        }

        return {
          source: 'USDA',
          id: food.fdcId,
          name: food.description,
          calories,
          protein,
          carbs,
          fat
        };
      }

      return null;
    } catch (err) {
      console.error(`[NutritionalEngine] Falha na USDA API para ${name}:`, err);
      return null;
    }
  }
}
