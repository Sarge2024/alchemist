import { prisma } from './src/infra/prisma/client';
import { formatRecipeResponse } from './src/infra/api/formatRecipeResponse';

async function main() {
  const recipes = await prisma.recipe.findMany({
    include: {
      recipeIngredients: { include: { foodItem: true } },
      owner: true
    },
    take: 1
  });
  console.log("Recipes found:", recipes.length);
  if (recipes.length > 0) {
    const formatted = formatRecipeResponse(recipes[0]);
    console.log("Formatted:", formatted);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
