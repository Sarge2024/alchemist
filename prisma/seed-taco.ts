import "dotenv/config";
import { prisma } from "../src/infra/prisma/client";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Iniciando seed da tabela TACO...");

  const dataPath = path.join(process.cwd(), "prisma", "data", "taco.json");
  
  if (!fs.existsSync(dataPath)) {
    console.error(`Arquivo não encontrado em: ${dataPath}`);
    console.log("Por favor, providencie o json da tabela TACO.");
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataPath, "utf-8");
  const tacoItems = JSON.parse(rawData);

  let successCount = 0;

  for (const item of tacoItems) {
    try {
      await prisma.globalFoodItem.upsert({
        where: { name: item.description },
        update: {
          calories: item.energy_kcal || 0,
          protein: item.protein_g || 0,
          carbohydrates: item.carbohydrate_g || 0,
          lipids: item.lipid_g || 0,
          baseQuantity: item.base_qty || 100,
          baseUnit: item.base_unit || "g",
          source: "TACO",
          externalId: item.id ? String(item.id) : undefined,
          micronutrients: item.micronutrients || null,
        },
        create: {
          name: item.description,
          calories: item.energy_kcal || 0,
          protein: item.protein_g || 0,
          carbohydrates: item.carbohydrate_g || 0,
          lipids: item.lipid_g || 0,
          baseQuantity: item.base_qty || 100,
          baseUnit: item.base_unit || "g",
          source: "TACO",
          externalId: item.id ? String(item.id) : undefined,
          micronutrients: item.micronutrients || null,
        },
      });
      successCount++;
    } catch (e) {
      console.error(`Falha ao inserir item: ${item.description}`, e);
    }
  }

  console.log(`Seed TACO concluído! ${successCount} alimentos inseridos/atualizados.`);
}

main()
  .catch((e) => {
    console.error("Erro fatal durante seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
