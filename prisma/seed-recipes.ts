import "dotenv/config";
import { prisma } from "../src/infra/prisma/client";

async function main() {
  console.log("Iniciando seed de receitas mockadas...");

  // Criar ou pegar um owner
  let owner = await prisma.user.findFirst();
  if (!owner) {
    owner = await prisma.user.create({
      data: {
        uid: "mock-uid-" + Date.now(),
        displayName: "Alquimista Chefe",
        email: "chefe@dishalchemists.com",
        state: "SP",
        country: "BR",
        role: "ADMIN"
      }
    });
  }

  // Pegar ou criar ingredientes base (mockados para testes caso a TACO não tenha algo fácil de buscar agora)
  const ingFrango = await prisma.globalFoodItem.upsert({
    where: { name: "Frango Desfiado (Mock)" },
    update: {},
    create: {
      name: "Frango Desfiado (Mock)",
      category: "Carnes",
      calories: 165,
      protein: 31,
      carbohydrates: 0,
      lipids: 3.6,
      baseQuantity: 100,
      baseUnit: "g",
      source: "CUSTOM"
    }
  });

  const ingAbacate = await prisma.globalFoodItem.upsert({
    where: { name: "Abacate (Mock)" },
    update: {},
    create: {
      name: "Abacate (Mock)",
      category: "Frutas",
      calories: 160,
      protein: 2,
      carbohydrates: 8.5,
      lipids: 14.7,
      baseQuantity: 100,
      baseUnit: "g",
      source: "CUSTOM"
    }
  });

  // Receita 1
  await prisma.recipe.create({
    data: {
      title: "Salada Alquimista de Abacate e Frango",
      description: "Uma salada cetogênica rica em gorduras boas e alta proteína. Combinação perfeita para saciedade e recuperação muscular.",
      image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80",
      tipo_prato: ["CETOGÊNICA", "ALTA PROTEÍNA"],
      momento: ["Almoço", "Jantar"],
      difficulty: "Fácil",
      prepTime: "15 min",
      ownerId: owner.id,
      instructions: ["Desfie o frango cozido.", "Corte o abacate em cubos.", "Misture tudo em um bowl com azeite e limão."],
      recipeIngredients: {
        create: [
          {
            foodItemId: ingFrango.id,
            quantity: 150, // 150g -> 1.5 * macros
            unit: "g"
          },
          {
            foodItemId: ingAbacate.id,
            quantity: 50, // 50g -> 0.5 * macros
            unit: "g"
          }
        ]
      }
    }
  });

  // Receita 2
  await prisma.recipe.create({
    data: {
      title: "Frango Grelhado com Vegetais Verdes",
      description: "A clássica fórmula de baixo carbo. Simples, rica em fibras e proteína de alto valor biológico.",
      image: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=800&q=80",
      tipo_prato: ["BAIXO CARBO", "ALTA PROTEÍNA"],
      momento: ["Jantar", "Almoço"],
      difficulty: "Média",
      prepTime: "25 min",
      ownerId: owner.id,
      instructions: ["Tempere o frango com sal, pimenta e ervas.", "Grelhe em fogo médio por 10 minutos de cada lado.", "Sirva com brócolis no vapor."],
      recipeIngredients: {
        create: [
          {
            foodItemId: ingFrango.id,
            quantity: 200,
            unit: "g"
          }
        ]
      }
    }
  });

  console.log("Seed de receitas concluído com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
