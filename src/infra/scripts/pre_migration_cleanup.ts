import 'dotenv/config';
import { prisma } from '../prisma/client';

async function main() {
  console.log('Starting pre-migration database cleanup...');
  try {
    // Truncate tables that reference the old Grau enum or need resetting
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "UserGamificationProfile" CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "UserBadge" CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "AvatarOption" CASCADE;`);
    console.log('Successfully truncated gamification profiles, user badges, and avatar options.');
  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
