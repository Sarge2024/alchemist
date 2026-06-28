import "dotenv/config";
import { prisma } from "../src/infra/prisma/client.js";

async function main() {
  const owner = await prisma.user.findFirst();
  if (!owner) return;

  const arrozIng = await prisma.globalFoodItem.findFirst({ where: { name: { contains: "Arroz" } } });

  await prisma.recipe.create({
    data: {
      id: "1b0a79b6-0000-4000-8000-000000000000", // using a valid UUID starting with the requested string
      title: "Arroz prático na panela de arroz",
      description: "Receita restaurada: Arroz super prático feito na panela elétrica.",
      tipo_prato: ["Cereais", "Guarnição"],
      base_alimento: ["Arroz"],
      momento: ["Almoço", "Jantar"],
      difficulty: "Fácil",
      prepTime: "20 min",
      servings: "4 porções",
      ownerId: owner.id,
      isClassic: false,
      recipeIngredients: arrozIng ? {
        create: [
          { foodItemId: arrozIng.id, quantity: 200, unit: "g" }
        ]
      } : undefined
    }
  });

  console.log("Receita restaurada com sucesso!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
