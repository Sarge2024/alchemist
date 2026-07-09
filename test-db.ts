import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.globalFoodItem.findMany({ take: 5, select: { id: true, name: true, calories: true } });
  console.log(items);
}
main().catch(console.error).finally(() => prisma.$disconnect());
