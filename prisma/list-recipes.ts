import "dotenv/config";
import { prisma } from "../src/infra/prisma/client";

async function main() {
  const recipes = await prisma.recipe.findMany({
    select: { id: true, title: true }
  });
  console.log(JSON.stringify(recipes, null, 2));
}

main().finally(() => prisma.$disconnect());
