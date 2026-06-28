import 'dotenv/config';
import { prisma } from './src/infra/prisma/client.js';
async function main() {
  const recipes = await prisma.recipe.findMany({ 
    where: { title: { contains: "Arroz" } },
    select: { id: true, title: true } 
  });
  console.log(JSON.stringify(recipes, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
