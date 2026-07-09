import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.globalFoodItem.findMany({
    where: { calories: 0 },
    select: { id: true, name: true }
  });
  console.log(`Found ${items.length} ingredients with 0 calories.`);
  console.log(items.slice(0, 10)); // Show a sample
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
