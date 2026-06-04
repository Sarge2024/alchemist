import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    const user = await prisma.user.create({
      data: {
        uid: 'cf78da93-325e-4a62-9599-ede3f577a56c',
        displayName: 'sagacitas sistemas',
        email: 'sagacitas.sistemas@gmail.com',
        state: 'Pendente',
        country: 'Pendente'
      }
    });
    console.log('Created user:', user);
  } catch (e) {
    console.error(e);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
