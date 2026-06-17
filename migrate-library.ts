import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Must import prisma dynamically AFTER dotenv.config()
async function run() {
  const { prisma } = await import('./src/infra/prisma/client.ts');
  const serviceAccount = JSON.parse(fs.readFileSync('./sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json', 'utf8'));

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();
  const snapshot = await db.collection('library').get();
  console.log(`Encontrados ${snapshot.size} itens no Firestore. Migrando para o PostgreSQL...`);
  
  let migratedCount = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    const existing = await prisma.libraryItem.findFirst({
      where: { title: data.title }
    });
    
    if (!existing) {
      try {
        await prisma.libraryItem.create({
          data: {
            title: data.title || 'Sem Título',
            description: data.description || 'Sem descrição.',
            type: data.type || 'pdf',
            category: data.category || 'História',
            tags: Array.isArray(data.tags) ? data.tags : [],
            url: data.url || '',
            thumbnail: data.thumbnail || null,
            author: data.author || 'Alchemist Master',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          }
        });
        console.log(`✅ Migrado: ${data.title}`);
        migratedCount++;
      } catch (err) {
        console.error(`❌ Erro ao migrar "${data.title}":`, err.message);
      }
    } else {
      console.log(`⏭️ Ignorado (Já existe): ${data.title}`);
    }
  }
  
  console.log(`\n🎉 Migração concluída! ${migratedCount} novos itens inseridos no PostgreSQL.`);
  await prisma.$disconnect();
}

run().catch(console.error);
