import { prisma } from '../src/infra/prisma/client';

async function main() {
  console.log('Verificando banco de dados...');
  const avatars = await prisma.avatarOption.findMany();
  console.log(`Encontrados ${avatars.length} avatares.`);
  avatars.forEach(a => console.log(`- ${a.id} | ${a.codigoAvatar} | ${a.tierMinimo}`));
  
  const badges = await prisma.badge.findMany();
  console.log(`Encontrados ${badges.length} badges.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
