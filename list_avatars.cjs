const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const avatars = await prisma.avatarOption.findMany();
  console.log(JSON.stringify(avatars, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
