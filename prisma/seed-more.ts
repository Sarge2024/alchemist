import "dotenv/config";
import { prisma } from "../src/infra/prisma/client";

async function main() {
  const owner = await prisma.user.findFirst();
  if (!owner) return;

  const frango = await prisma.globalFoodItem.upsert({
    where: { name: "Frango, peito, sem pele, cru" },
    update: {},
    create: { name: "Frango, peito, sem pele, cru", category: "Carnes", calories: 119, protein: 21.5, carbohydrates: 0, lipids: 3, baseQuantity: 100, baseUnit: "g" }
  });
  
  const batataDoce = await prisma.globalFoodItem.upsert({
    where: { name: "Batata-doce, cozida" },
    update: {},
    create: { name: "Batata-doce, cozida", category: "Raízes", calories: 77, protein: 0.6, carbohydrates: 18.4, lipids: 0.1, baseQuantity: 100, baseUnit: "g" }
  });

  const abacate = await prisma.globalFoodItem.upsert({
    where: { name: "Abacate, cru" },
    update: {},
    create: { name: "Abacate, cru", category: "Frutas", calories: 96, protein: 1.2, carbohydrates: 6, lipids: 8.4, baseQuantity: 100, baseUnit: "g" }
  });

  await prisma.recipe.create({
    data: {
      title: "Frango com Batata Doce Clássico",
      description: "O clássico maromba para hipertrofia.",
      image: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=800&q=80",
      tipo_prato: ["ALTA PROTEÍNA", "FITNESS"],
      momento: ["Almoço", "Jantar", "Pós-Treino"],
      base_alimento: ["Frango", "Batata Doce"],
      difficulty: "Fácil",
      prepTime: "25 min",
      servings: "1 porção",
      ownerId: owner.id,
      instructions: ["Cozinhe a batata.", "Grelhe o frango.", "Sirva."],
      recipeIngredients: {
        create: [
          { foodItemId: frango.id, quantity: 150, unit: "g" },
          { foodItemId: batataDoce.id, quantity: 200, unit: "g" }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: "Vitamina de Abacate Low Carb",
      description: "Vitamina rica em gorduras boas e saciante.",
      image: "https://images.unsplash.com/photo-1603569283847-aa295f0d016a?w=800&q=80",
      tipo_prato: ["BAIXO CARBO", "CETOGÊNICA"],
      momento: ["Café da Manhã", "Lanche"],
      base_alimento: ["Fruta"],
      difficulty: "Fácil",
      prepTime: "5 min",
      servings: "1 porção",
      ownerId: owner.id,
      instructions: ["Bata o abacate com água ou leite de amêndoas.", "Adicione adoçante.", "Beba gelado."],
      recipeIngredients: {
        create: [
          { foodItemId: abacate.id, quantity: 100, unit: "g" }
        ]
      }
    }
  });

  console.log("Mais 2 receitas inseridas!");
}

main().finally(() => prisma.$disconnect());
