// src/infra/api/formatRecipeResponse.ts
//
// Função compartilhada para formatar receitas do Prisma em resposta JSON padronizada.
// Usada tanto pelo publicRecipesRouter quanto pelo dishAlchemistsRouter para garantir
// consistência de formato entre todas as origens de requisição.

export function formatRecipeResponse(recipe: any) {
  const nutrition = recipe.recipeIngredients.reduce(
    (acc: any, ri: any) => {
      const factor = (Number(ri.quantity) || 0) / 100;
      acc.calories += (ri.foodItem.calories || 0) * factor;
      acc.protein += (ri.foodItem.protein || 0) * factor;
      acc.carbs += (ri.foodItem.carbohydrates || 0) * factor;
      acc.fat += (ri.foodItem.lipids || 0) * factor;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Round nutrition values
  Object.keys(nutrition).forEach(k => {
    nutrition[k] = Math.round(nutrition[k] * 10) / 10;
  });

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
    instructions: recipe.instructions,
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
      quantity: ri.quantity,
      unit: ri.unit,
      preparationMode: ri.preparationMode || null,
      grossWeight: ri.grossWeight,
      cleanWeight: ri.cleanWeight,
      cookedWeight: ri.cookedWeight,
      correctionFactor: ri.correctionFactor,
      cookingFactor: ri.cookingFactor,
      perCapitaClean: ri.perCapitaClean,
      defaultCorrectionFactor: ri.foodItem.defaultCorrectionFactor,
      defaultCookingFactor: ri.foodItem.defaultCookingFactor
    })),
    nutrition
  };
}
