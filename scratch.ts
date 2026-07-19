import { prisma } from './src/infra/prisma/client';

async function test() {
  const q = 'arroz';
  const terms = q.split(' ').filter(t => t.trim().length > 0);
  const where = { AND: terms.map(term => ({ description: { contains: term, mode: 'insensitive' as const } })) };
  
  console.log('where:', JSON.stringify(where, null, 2));
  
  const results = await prisma.tacoIngredient.findMany({
    where,
    take: 5
  });
  console.log('Results:', results.map(r => r.description));
  await prisma.$disconnect();
}

test().catch(console.error);
