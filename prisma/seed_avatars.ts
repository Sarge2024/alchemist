import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const tiers = ['1', '2', '3', '4', '5'];

async function main() {
  console.log('Iniciando o Seed de Avatares...');

  // Limpa todos os avatares existentes
  await prisma.avatarOption.deleteMany({});
  console.log('Avatares antigos removidos.');

  let criados = 0;

  for (const t of tiers) {
    for (let i = 1; i <= 5; i++) {
      const codigoAvatar = `TIER${t}_OPT${i}`.toUpperCase();
      
      // Gera uma URL amigável
      const urlVercelBlob = `https://placehold.co/150x150?text=T${t}A${i}`;

      await prisma.avatarOption.create({
        data: {
          codigoAvatar,
          tierMinimo: t,
          urlVercelBlob,
        }
      });
      criados++;
      console.log(`✅ Criado: ${codigoAvatar}`);
    }
  }

  console.log(`\n🎉 Sucesso! ${criados} avatares possíveis foram inseridos no banco de dados.`);
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
