const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.globalFoodItem.findMany({ take: 5 });
  console.log(items);
}
main().catch(console.error).finally(() => prisma.$disconnect());
