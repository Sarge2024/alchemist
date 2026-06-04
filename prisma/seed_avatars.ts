import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const generos = ['m', 'f'];
const idades = ['jo', 'ad', 'id'];
const tonsPele = ['cl', 'pa', 'es'];
const tiers = ['ini', 'av', 'mes'];

async function main() {
  console.log('Iniciando o Seed de Avatares...');

  // Limpa todos os avatares existentes
  await prisma.avatarOption.deleteMany({});
  console.log('Avatares antigos removidos.');

  let criados = 0;

  for (const g of generos) {
    for (const i of idades) {
      for (const p of tonsPele) {
        for (const t of tiers) {
          const codigoAvatar = `av_${g}_${i}_${p}_${t}`;
          
          // Gera uma URL amigável usando placehold.co com o código do avatar gerado para identificação visual provisória
          const urlVercelBlob = `https://placehold.co/150x150?text=${codigoAvatar}`;

          await prisma.avatarOption.create({
            data: {
              codigoAvatar,
              genero: g,
              faixaEtaria: i,
              tomPele: p,
              tierMinimo: t,
              urlVercelBlob,
            }
          });
          criados++;
          console.log(`✅ Criado: ${codigoAvatar}`);
        }
      }
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
