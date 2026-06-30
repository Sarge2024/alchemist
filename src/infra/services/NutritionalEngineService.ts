import { prisma } from '../prisma/client';

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
  micronutrients?: any;
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
      // 1. Busca local via Prisma (Cache Write-Through)
      let data = await this.fetchLocalData(item.name);

      // 2. Fallback USDA API se não encontrado
      if (!data) {
        data = await this.fetchUsdaData(item.name);
        
        if (data) {
          // Salva no cache local para requisições futuras
          await this.persistToLocalCache(data);
        } else {
          // Salva falha para não buscar novamente (impede esgotar Rate Limit)
          await this.persistNotFound(item.name);
        }
      }

      if (data && data.source !== 'NOT_FOUND') {
        let normalizedQuantity = item.quantity;
        let normalizedUnit = item.unit.toLowerCase().trim();

        // Conversão de medidas caseiras
        if (normalizedUnit !== 'g' && normalizedUnit !== 'ml') {
           if (normalizedUnit === 'kg') {
               normalizedQuantity *= 1000;
           } else if (normalizedUnit === 'mg') {
               normalizedQuantity /= 1000;
           } else {
               const standardUnit = this.normalizeMeasureName(item.unit);
               
               const searchUnits = standardUnit === 'UNIDADE' ? ['UNIDADE', 'INTEIRO'] : [standardUnit];
               
               // Busca fator de conversão na tabela CulinaryMeasure
               const measure = await prisma.culinaryMeasure.findFirst({
                 where: {
                   ingredientName: {
                     contains: item.name,
                     mode: 'insensitive'
                   },
                   measureName: { in: searchUnits }
                 }
               });
               
               if (measure) {
                 normalizedQuantity = item.quantity * measure.weightInGrams;
               } else {
                 // Fallback genérico caso a medida não exista para este ingrediente específico
                 if (standardUnit === 'COLHER_SOPA') normalizedQuantity = item.quantity * 15;
                 else if (standardUnit === 'XICARA') normalizedQuantity = item.quantity * 150;
                 else if (standardUnit === 'COLHER_CHA') normalizedQuantity = item.quantity * 5;
                 // Evita que 1 unidade = 1g
                 else if (standardUnit === 'UNIDADE') normalizedQuantity = item.quantity * 100;
               }
           }
        }

        // Regra de três: (quantidade_normalizada / base_100g) * valor_do_nutriente
        const factor = normalizedQuantity / 100;
        
        const calcCals = data.calories * factor;
        const calcProt = data.protein * factor;
        const calcCarbs = data.carbs * factor;
        const calcFat = data.fat * factor;

        details.push({
          ingredient: item.name,
          source: data.source as any,
          quantity: item.quantity,
          unit: item.unit,
          calories: calcCals,
          protein: calcProt,
          carbs: calcCarbs,
          fat: calcFat,
          micronutrients: data.micronutrients,
          base_data: data
        });

        totalCalories += calcCals;
        totalProtein += calcProt;
        totalCarbs += calcCarbs;
        totalFat += calcFat;
      } else {
        // Fallback: não encontrado (ou em cache como NOT_FOUND)
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
   * Normaliza o nome da unidade para padronização Enum
   */
  private static normalizeMeasureName(rawMeasure: string): string {
    const upper = rawMeasure.toUpperCase();
    const MEASURE_ALIASES: Record<string, string[]> = {
      'XICARA': ['XICARA', 'XÍCARA'],
      'COLHER_SOPA': ['COLHER DE SOPA', 'COLHER SOPA', 'C.S.', 'SOPA'],
      'COLHER_CHA': ['COLHER DE CHÁ', 'COLHER DE CHA', 'C.CHÁ', 'C.CHA', 'CHÁ', 'CHA'],
      'COLHER_SOBREMESA': ['COLHER DE SOBREMESA', 'C.SOBREMESA'],
      'COLHER_CAFE': ['COLHER DE CAFÉ', 'COLHER DE CAFE', 'C.CAFÉ', 'C.CAFE'],
      'UNIDADE': ['UNIDADE', 'UNID', 'UND', 'INTEIRO'],
      'COPO': ['COPO'],
      'POTE': ['POTE'],
      'PRATO': ['PRATO'],
      'FATIA': ['FATIA'],
      'CONCHA': ['CONCHA'],
      'RAMO': ['RAMO', 'FOLHA']
    };
    for (const [standard, aliases] of Object.entries(MEASURE_ALIASES)) {
      for (const alias of aliases) {
        if (upper.includes(alias)) return standard;
      }
    }
    return rawMeasure.trim().toUpperCase();
  }

  /**
   * Busca dados localmente usando Prisma e Busca Fuzzy (ILIKE)
   */
  private static async fetchLocalData(name: string): Promise<any | null> {
    try {
      const items = await prisma.globalFoodItem.findMany({
        where: {
          name: {
            contains: name,
            mode: 'insensitive'
          }
        },
        take: 20
      });
      
      if (items.length > 0) {
        const nameLower = name.toLowerCase();
        
        items.sort((a, b) => {
          // Prioriza fontes confiáveis PRIMEIRO
          const getSourcePriority = (item: any) => {
            if (item.source === 'TACO') return 4;
            if (item.source === 'USDA') return 3;
            // Se for CUSTOM, mas tiver dados válidos, damos prioridade média
            if (item.source === 'CUSTOM' && (item.calories > 0 || item.protein > 0)) return 2;
            return 1; // NOT_FOUND ou CUSTOM zerado
          };
          
          const aPriority = getSourcePriority(a);
          const bPriority = getSourcePriority(b);
          
          // NOT_FOUND e zerados nunca devem ganhar de TACO/USDA, mesmo se o nome for exato
          if (aPriority !== bPriority && (aPriority === 1 || bPriority === 1)) {
             return bPriority - aPriority;
          }

          // Prioriza correspondência exata depois de garantir fontes viáveis
          const aExact = a.name.toLowerCase() === nameLower;
          const bExact = b.name.toLowerCase() === nameLower;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;

          if (aPriority !== bPriority) return bPriority - aPriority;
          
          // Como critério de desempate, escolhe o nome mais curto (ex: "ovo" vs "ovo de codorna") se a busca foi por "ovo"
          return a.name.length - b.name.length;
        });

        const bestMatch = items[0];

        // Se o melhor match for um item zerado/NOT_FOUND, retornamos null para tentar buscar na USDA API
        if (bestMatch.source === 'NOT_FOUND' || (bestMatch.source === 'CUSTOM' && bestMatch.calories === 0 && bestMatch.protein === 0)) {
          return null;
        }

        return {
          source: bestMatch.source,
          id: bestMatch.externalId,
          name: bestMatch.name,
          calories: bestMatch.calories,
          protein: bestMatch.protein,
          carbs: bestMatch.carbohydrates,
          fat: bestMatch.lipids,
          micronutrients: bestMatch.micronutrients
        };
      }
      return null;
    } catch (e) {
      console.error("[NutritionalEngine] Falha ao buscar no Prisma:", e);
      return null;
    }
  }

  /**
   * Persiste resultado externo no banco local
   */
  private static async persistToLocalCache(data: any): Promise<void> {
    try {
      await prisma.globalFoodItem.upsert({
        where: { name: data.name },
        update: {},
        create: {
          name: data.name,
          source: data.source,
          externalId: String(data.id),
          calories: data.calories,
          protein: data.protein,
          carbohydrates: data.carbs,
          lipids: data.fat,
          baseQuantity: 100,
          baseUnit: "g",
          micronutrients: data.micronutrients
        }
      });
    } catch (e) {
      console.error("[NutritionalEngine] Falha ao persistir cache local:", e);
    }
  }

  /**
   * Salva como NOT_FOUND para evitar novas consultas desnecessárias
   */
  private static async persistNotFound(name: string): Promise<void> {
    try {
      await prisma.globalFoodItem.upsert({
        where: { name: name },
        update: {},
        create: {
          name: name,
          source: "NOT_FOUND",
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          lipids: 0,
          baseQuantity: 100,
          baseUnit: "g"
        }
      });
    } catch (e) {
      // Ignorar erros de colisão aqui
    }
  }

  /**
   * Consulta a USDA FoodData Central (FDC)
   */
  private static async fetchUsdaData(name: string): Promise<any | null> {
    const apiKey = process.env.USDA_API_KEY;
    if (!apiKey || apiKey.includes('placeholder')) {
      console.warn('[NutritionalEngine] USDA_API_KEY não configurada corretamente');
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
        let micronutrients: any = {};

        // Nutrientes na USDA
        for (const nutrient of food.foodNutrients) {
          const nameLower = nutrient.nutrientName.toLowerCase();
          const unit = nutrient.unitName.toLowerCase();
          const val = nutrient.value;
          
          if (nameLower.includes('energy') && unit === 'kcal') calories = val;
          else if (nameLower.includes('protein')) protein = val;
          else if (nameLower.includes('carbohydrate')) carbs = val;
          else if (nameLower.includes('lipid') || nameLower.includes('fat')) fat = val;
          else if (nameLower.includes('fiber')) micronutrients.fiber = val;
          else if (nameLower.includes('calcium')) micronutrients.calcium = val;
          else if (nameLower.includes('iron')) micronutrients.iron = val;
          else if (nameLower.includes('sodium')) micronutrients.sodium = val;
          else if (nameLower.includes('potassium')) micronutrients.potassium = val;
          else if (nameLower.includes('vitamin c')) micronutrients.vitamin_c = val;
        }

        return {
          source: 'USDA',
          id: food.fdcId,
          name: food.description,
          calories,
          protein,
          carbs,
          fat,
          micronutrients
        };
      }

      return null;
    } catch (err) {
      console.error(`[NutritionalEngine] Falha na USDA API para ${name}:`, err);
      return null;
    }
  }
}
