import { config } from 'dotenv'
config({ path: '/mnt/46F84CA3F84C935B/SAGACITAS_SaaS/Alchymist/.env' })

import { prisma } from './src/infra/prisma/client'

async function main() {
  const alho = await prisma.globalFoodItem.findMany({
    where: {
      name: {
        contains: 'Alho',
        mode: 'insensitive'
      }
    }
  })
  console.log('Alho in DB:', alho.map(a => ({ id: a.id, name: a.name, source: a.source, category: a.category })))
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect())
