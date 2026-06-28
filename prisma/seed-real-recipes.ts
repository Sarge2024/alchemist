import "dotenv/config";
import { prisma } from "../src/infra/prisma/client";

async function main() {
  console.log("Iniciando seed de receitas reais usando a base TACO...");

  // Pegar um owner
  const owner = await prisma.user.findFirst();
  if (!owner) {
    console.log("Erro: Usuário owner não encontrado.");
    return;
  }

  // Upsert ingredientes para garantir que existam
  const salmon = await prisma.globalFoodItem.upsert({
    where: { name: "Salmão, sem pele, fresco" },
    update: {},
    create: { name: "Salmão, sem pele, fresco", category: "Pescados", calories: 170, protein: 19.3, carbohydrates: 0, lipids: 9.7, baseQuantity: 100, baseUnit: "g" }
  });
  const azeite = await prisma.globalFoodItem.upsert({
    where: { name: "Azeite, de oliva, extra virgem" },
    update: {},
    create: { name: "Azeite, de oliva, extra virgem", category: "Óleos e Gorduras", calories: 884, protein: 0, carbohydrates: 0, lipids: 100, baseQuantity: 100, baseUnit: "g" }
  });
  const brocolis = await prisma.globalFoodItem.upsert({
    where: { name: "Brócolis, cozido" },
    update: {},
    create: { name: "Brócolis, cozido", category: "Hortaliças", calories: 25, protein: 2.1, carbohydrates: 4.4, lipids: 0.5, baseQuantity: 100, baseUnit: "g" }
  });
  const ovo = await prisma.globalFoodItem.upsert({
    where: { name: "Ovo, de galinha, inteiro, cru" },
    update: {},
    create: { name: "Ovo, de galinha, inteiro, cru", category: "Ovos", calories: 143, protein: 13, carbohydrates: 1.6, lipids: 8.9, baseQuantity: 100, baseUnit: "g" }
  });
  const aveia = await prisma.globalFoodItem.upsert({
    where: { name: "Aveia, flocos, crua" },
    update: {},
    create: { name: "Aveia, flocos, crua", category: "Cereais", calories: 394, protein: 13.9, carbohydrates: 66.6, lipids: 8.5, baseQuantity: 100, baseUnit: "g" }
  });
  // Deletar as antigas que fiz
  await prisma.recipe.deleteMany({
    where: { title: { in: ["Salada Alquimista de Abacate e Frango", "Frango Grelhado com Vegetais Verdes"] } }
  });

  // Criar Receita 1: Salmão ao Forno com Brócolis
  if (salmon && azeite && brocolis) {
    await prisma.recipe.create({
      data: {
        title: "Salmão Assado em Crosta de Ervas com Brócolis",
        description: "Uma refeição mediterrânea rica em ômega-3, proteínas de alta qualidade e fibras prebióticas. Ideal para almoços voltados à saúde cardiovascular e longevidade.",
        image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
        tipo_prato: ["MEDITERRÂNEA", "BAIXO CARBO", "ALTA PROTEÍNA"],
        momento: ["Almoço", "Jantar"],
        difficulty: "Média",
        prepTime: "30 min",
        servings: "2 porções",
        ownerId: owner.id,
        instructions: [
          "Pré-aqueça o forno a 200°C.",
          "Tempere o salmão com sal, pimenta e misture o azeite com as ervas.",
          "Corte o brócolis em floretes e disponha na assadeira ao lado do salmão.",
          "Asse por 20 minutos até que o salmão esteja dourado e o brócolis macio."
        ],
        recipeIngredients: {
          create: [
            { foodItemId: salmon.id, quantity: 200, unit: "g" },
            { foodItemId: azeite.id, quantity: 15, unit: "ml" },
            { foodItemId: brocolis.id, quantity: 150, unit: "g" }
          ]
        }
      }
    });
    console.log("Receita 'Salmão Assado' criada com ingredientes reais da TACO!");
  }

  // Criar Receita 2: Panqueca de Aveia Rica em Proteínas
  if (ovo && aveia) {
    await prisma.recipe.create({
      data: {
        title: "Panqueca Funcional de Aveia",
        description: "Opção rápida e equilibrada para o café da manhã ou lanche. Fornece energia sustentada através dos carboidratos complexos da aveia e proteína dos ovos.",
        image: "https://images.unsplash.com/photo-1528207776546-384cb1119b76?w=800&q=80",
        tipo_prato: ["CAFÉ DA MANHÃ", "FITNESS", "FUNCIONAL"],
        momento: ["Café da Manhã", "Lanche"],
        difficulty: "Fácil",
        prepTime: "10 min",
        servings: "1 porção",
        ownerId: owner.id,
        instructions: [
          "No liquidificador, bata os ovos e a aveia até formar uma massa homogênea.",
          "Aqueça uma frigideira antiaderente em fogo médio.",
          "Despeje a massa e doure por 2 minutos de cada lado.",
          "Sirva com frutas de sua preferência (opcional)."
        ],
        recipeIngredients: {
          create: [
            { foodItemId: ovo.id, quantity: 100, unit: "g" }, // aprox 2 ovos
            { foodItemId: aveia.id, quantity: 40, unit: "g" }
          ]
        }
      }
    });
    console.log("Receita 'Panqueca Funcional' criada com ingredientes reais da TACO!");
  }

  console.log("Limpeza e Seed real concluídos com sucesso.");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
