import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando migração das etapas de preparo...");

  const recipes = await prisma.recipe.findMany({
    select: { id: true, instructions: true, preparationSteps: true }
  });

  console.log(`Foram encontradas ${recipes.length} receitas.`);

  let updatedCount = 0;

  for (const recipe of recipes) {
    if (!recipe.preparationSteps) {
      const steps = recipe.instructions.map((stepDesc) => ({
        descricao: stepDesc,
        preparo: "",
        tempo: 2
      }));

      await prisma.recipe.update({
        where: { id: recipe.id },
        data: {
          preparationSteps: steps
        }
      });
      updatedCount++;
    }
  }

  console.log(`Migração concluída! ${updatedCount} receitas atualizadas.`);
}

main()
  .catch((e) => {
    console.error("Erro na migração:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
