import { prisma } from './src/infra/prisma/client.js';

async function seedAdmin() {
  const adminEmail = 'sagacitas.sistemas@gmail.com';
  
  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (!adminUser) {
    console.log(`Admin user with email ${adminEmail} not found. Searching by displayName containing 'Admin'...`);
    const users = await prisma.user.findMany({
      where: { displayName: { contains: 'Admin', mode: 'insensitive' } }
    });
    if (users.length > 0) {
      adminUser = users[0];
    } else {
      console.log('No admin user found.');
      return;
    }
  }

  console.log(`Found admin user: ${adminUser.displayName} (${adminUser.id})`);

  // Create badges
  const badgesData = [
    { codigo_evento: 'mestre_fundador', nome: 'Mestre Fundador', descricao: 'Pioneiro da plataforma Alquimia do Prato', url_vercel_blob: 'https://placehold.co/150x150/FFD700/000000?text=MF' },
    { codigo_evento: 'guardiao_lounge', nome: 'Guardião do Lounge', descricao: 'Mais de 100 mensagens moderadas no Lounge', url_vercel_blob: 'https://placehold.co/150x150/8A2BE2/FFFFFF?text=GL' },
    { codigo_evento: 'criador_supremo', nome: 'Criador Supremo', descricao: 'Criou as 50 receitas originais da plataforma', url_vercel_blob: 'https://placehold.co/150x150/FF4500/FFFFFF?text=CS' },
    { codigo_evento: 'degustador_elite', nome: 'Degustador de Elite', descricao: 'Aprovou receitas cruciais', url_vercel_blob: 'https://placehold.co/150x150/32CD32/FFFFFF?text=DE' }
  ];

  for (const b of badgesData) {
    await prisma.badge.upsert({
      where: { codigo_evento: b.codigo_evento },
      update: b,
      create: b
    });
  }

  const allBadges = await prisma.badge.findMany({
    where: { codigo_evento: { in: badgesData.map(b => b.codigo_evento) } }
  });

  // Assign badges
  for (const badge of allBadges) {
    await prisma.userBadge.upsert({
      where: {
        userId_badgeId: {
          userId: adminUser.id,
          badgeId: badge.id
        }
      },
      update: {},
      create: {
        userId: adminUser.id,
        badgeId: badge.id
      }
    });
  }
  console.log(`Assigned ${allBadges.length} badges to admin.`);

  // Update gamification profile
  const profile = await prisma.userGamificationProfile.upsert({
    where: { userId: adminUser.id },
    update: {
      nivel: 5,
      grau: 'MESTRE_ALQUIMISTA',
      xp_total: 550
    },
    create: {
      userId: adminUser.id,
      nivel: 5,
      grau: 'MESTRE_ALQUIMISTA',
      xp_total: 550
    }
  });

  console.log(`Admin gamification updated: Nível ${profile.nivel}, Grau ${profile.grau}, XP ${profile.xp_total}`);
}

seedAdmin()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
