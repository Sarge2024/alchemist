import "dotenv/config";
import { prisma } from "../src/infra/prisma/client.js";

async function main() {
  console.log("Limpando receitas 'mock' antigas...");
  await prisma.recipe.deleteMany();
  await prisma.recipeIngredient.deleteMany();

  const owner = await prisma.user.findFirst();
  if (!owner) {
    console.log("Erro: Usuário owner não encontrado.");
    return;
  }

  console.log("Inserindo receitas reais para o plano semanal...");
  // Upsert Ingredients
  const arrozIng = await prisma.globalFoodItem.upsert({
    where: { name: "Arroz, branco, cozido" }, update: {},
    create: { name: "Arroz, branco, cozido", category: "Cereais", calories: 128, protein: 2.5, carbohydrates: 28.1, lipids: 0.2, baseQuantity: 100, baseUnit: "g" }
  });
  const feijaoIng = await prisma.globalFoodItem.upsert({
    where: { name: "Feijão, carioca, cozido" }, update: {},
    create: { name: "Feijão, carioca, cozido", category: "Leguminosas", calories: 76, protein: 4.8, carbohydrates: 13.6, lipids: 0.5, baseQuantity: 100, baseUnit: "g" }
  });
  const carneIng = await prisma.globalFoodItem.upsert({
    where: { name: "Carne bovina, contrafilé, grelhado" }, update: {},
    create: { name: "Carne bovina, contrafilé, grelhado", category: "Carnes", calories: 243, protein: 30, carbohydrates: 0, lipids: 12, baseQuantity: 100, baseUnit: "g" }
  });
  const alfaceIng = await prisma.globalFoodItem.upsert({
    where: { name: "Alface, crespa, crua" }, update: {},
    create: { name: "Alface, crespa, crua", category: "Hortaliças", calories: 11, protein: 1.3, carbohydrates: 1.7, lipids: 0.2, baseQuantity: 100, baseUnit: "g" }
  });

  // Recipes
  await prisma.recipe.create({
    data: {
      title: "Arroz Branco Soltinho",
      description: "Arroz branco clássico, perfeito como guarnição e com durabilidade para vários dias.",
      tipo_prato: ["Cereais", "Guarnição"],
      base_alimento: ["Arroz"],
      momento: ["Almoço", "Jantar"],
      difficulty: "Fácil",
      prepTime: "25 min",
      servings: "4 porções",
      ownerId: owner.id,
      isClassic: true,
      recipeIngredients: {
        create: [
          { foodItemId: arrozIng.id, quantity: 200, unit: "g" }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: "Feijão Carioca Caseiro",
      description: "Feijão nutritivo que pode ser feito em lote para a semana inteira.",
      tipo_prato: ["Leguminosas", "Guarnição"],
      base_alimento: ["Feijão"],
      momento: ["Almoço", "Jantar"],
      difficulty: "Média",
      prepTime: "50 min",
      servings: "6 porções",
      ownerId: owner.id,
      isClassic: true,
      recipeIngredients: {
        create: [
          { foodItemId: feijaoIng.id, quantity: 300, unit: "g" }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: "Bife Grelhado",
      description: "Bife de contrafilé suculento, melhor preparado diariamente.",
      tipo_prato: ["Prato Principal", "ALTA PROTEÍNA"],
      base_alimento: ["Carne Bovina"],
      momento: ["Almoço", "Jantar"],
      difficulty: "Fácil",
      prepTime: "15 min",
      servings: "2 porções",
      ownerId: owner.id,
      isClassic: true,
      recipeIngredients: {
        create: [
          { foodItemId: carneIng.id, quantity: 400, unit: "g" }
        ]
      }
    }
  });

  await prisma.recipe.create({
    data: {
      title: "Salada Fresca de Alface",
      description: "Salada rápida para preparo diário.",
      tipo_prato: ["Entrada", "Salada"],
      base_alimento: ["Hortaliças"],
      momento: ["Almoço", "Jantar"],
      difficulty: "Fácil",
      prepTime: "5 min",
      servings: "2 porções",
      ownerId: owner.id,
      isClassic: true,
      recipeIngredients: {
        create: [
          { foodItemId: alfaceIng.id, quantity: 150, unit: "g" }
        ]
      }
    }
  });

  console.log("Receitas reais inseridas com sucesso.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
