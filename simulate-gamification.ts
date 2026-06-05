import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function simulateGamification() {
  const targetUsers = [
    { name: 'Sarge bucc', nivel: 5, grau: 'MESTRE_ALQUIMISTA', xp: 450 },
    { name: 'Alquimist Master', nivel: 4, grau: 'PERITO', xp: 350 },
    { name: 'João Delpupo', nivel: 3, grau: 'ALQUIMISTA', xp: 250 },
    { name: 'Sergio Stulzer', nivel: 2, grau: 'ASSISTENTE', xp: 150 },
  ];

  for (const target of targetUsers) {
    const users = await prisma.user.findMany({
      where: {
        displayName: {
          contains: target.name,
          mode: 'insensitive'
        }
      }
    });

    if (users.length === 0) {
      console.log(`Usuário não encontrado: ${target.name}`);
      continue;
    }

    const user = users[0];
    console.log(`Encontrado usuário: ${user.displayName} (ID: ${user.id})`);

    const profile = await prisma.userGamificationProfile.upsert({
      where: { userId: user.id },
      update: {
        nivel: target.nivel,
        grau: target.grau as any,
        xp_total: target.xp
      },
      create: {
        userId: user.id,
        nivel: target.nivel,
        grau: target.grau as any,
        xp_total: target.xp
      }
    });

    console.log(`> Perfil atualizado: Nível ${profile.nivel}, Grau ${profile.grau}, XP ${profile.xp_total}`);
  }

  await prisma.$disconnect();
  process.exit(0);
}

simulateGamification().catch(e => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
