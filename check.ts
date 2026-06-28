import { prisma } from './src/prisma/client.js';
async function main() {
  const recipes = await prisma.recipe.findMany({ select: { id: true, title: true } });
  console.log(JSON.stringify(recipes, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
