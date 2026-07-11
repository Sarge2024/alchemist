// src/infra/api/formatRecipeResponse.ts
//
// Função compartilhada para formatar receitas do Prisma em resposta JSON padronizada.
// Usada tanto pelo publicRecipesRouter quanto pelo dishAlchemistsRouter para garantir
// consistência de formato entre todas as origens de requisição.

export function formatRecipeResponse(recipe: any) {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  const nutritionDetails = recipe.recipeIngredients.map((ri: any) => {
    let weightGrams = 0;
    if (ri.cleanWeight && ri.cleanWeight > 0) {
      weightGrams = Number(ri.cleanWeight);
    } else if (ri.grossWeight && ri.grossWeight > 0) {
      weightGrams = Number(ri.grossWeight);
    } else {
      const u = ri.unit?.toLowerCase() || '';
      if (u === 'g' || u === 'ml') weightGrams = Number(ri.quantity) || 0;
      else if (u === 'kg' || u === 'l') weightGrams = (Number(ri.quantity) || 0) * 1000;
      else weightGrams = Number(ri.quantity) || 0;
    }

    const factor = weightGrams / 100;
    const calories = (ri.foodItem.calories || 0) * factor;
    const protein = (ri.foodItem.protein || 0) * factor;
    const carbs = (ri.foodItem.carbohydrates || 0) * factor;
    const fat = (ri.foodItem.lipids || 0) * factor;

    totalCalories += calories;
    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;

    return {
      ingredient: ri.foodItem.name,
      source: 'TACO',
      quantity: weightGrams,
      unit: 'g',
      calories: Math.round(calories * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10
    };
  });

  const nutrition = {
    total_nutrition: {
      calories: Math.round(totalCalories * 10) / 10,
      protein: Math.round(totalProtein * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fat: Math.round(totalFat * 10) / 10
    },
    details: nutritionDetails
  };

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description || '',
    image: recipe.image || '',
    category: recipe.tipo_prato,
    base_alimento: recipe.base_alimento,
    momento: recipe.momento,
    origem: recipe.origem || '',
    difficulty: recipe.difficulty || '',
    prepTime: recipe.prepTime || '',
    servings: recipe.servings || '',
    dietType: recipe.dietType || '',
    custo_estimado: recipe.custo_estimado || '',
    preparationSteps: recipe.preparationSteps || [],
    rating: recipe.rating,
    reviewsCount: recipe.reviewsCount,
    isClassic: recipe.isClassic,
    createdAt: recipe.createdAt,
    author: recipe.owner
      ? { name: recipe.owner.displayName, avatar: recipe.owner.photoURL }
      : null,
    ingredients: recipe.recipeIngredients.map((ri: any) => ({
      id: ri.foodItem.id,
      name: ri.foodItem.name,
      category: ri.foodItem.category || '',
      subcategory: ri.foodItem.subcategory || '',
      quantity: ri.quantity,
      unit: ri.unit,
      grossWeight: ri.grossWeight,
      cleanWeight: ri.cleanWeight,
      cookedWeight: ri.cookedWeight,
      correctionFactor: ri.correctionFactor,
      cookingFactor: ri.cookingFactor,
      perCapitaClean: ri.perCapitaClean,
      defaultCorrectionFactor: ri.foodItem.defaultCorrectionFactor,
      defaultCookingFactor: ri.foodItem.defaultCookingFactor
    })),
    nutrition,
    chefTips: recipe.chefTips || ''
  };
}
