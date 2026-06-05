import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { prisma } from './src/infra/prisma/client.js';
import * as fs from 'fs';
import * as path from 'path';

async function syncAndSimulate() {
  const serviceAccountPath = path.resolve(process.cwd(), 'sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');
  let credential;
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    credential = cert(serviceAccount);
  } else {
    throw new Error("Service account file not found.");
  }

  initializeApp({
    projectId: "sagacitas-financeiro",
    credential
  });

  const db = getFirestore();
  const usersSnapshot = await db.collection('users').get();
  console.log(`Found ${usersSnapshot.size} users in Firestore.`);

  for (const doc of usersSnapshot.docs) {
    const data = doc.data();
    const uid = doc.id;
    const displayName = data.displayName || data.name || 'Sem Nome';
    const email = data.email || `${uid}@example.com`;
    const photoURL = data.photoURL || null;

    try {
      await prisma.user.upsert({
        where: { uid },
        update: { displayName, photoURL },
        create: {
          uid,
          displayName,
          email,
          photoURL,
          state: 'ES',
          country: 'BR'
        }
      });
      console.log(`Synced user ${displayName} (${uid})`);
    } catch (err) {
      console.error(`Error syncing user ${displayName}:`, err);
    }
  }

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
      console.log(`Target Usuário não encontrado no DB Prisma: ${target.name}`);
      continue;
    }

    const user = users[0];
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

    console.log(`> Perfil Gamificação atualizado para ${user.displayName}: Nível ${profile.nivel}, Grau ${profile.grau}, XP ${profile.xp_total}`);
  }
}

syncAndSimulate()
  .then(() => process.exit(0))
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
