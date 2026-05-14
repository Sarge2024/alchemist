/**
 * migrate-to-vercel-blob.ts
 * Script de utilidade para migrar imagens locais e do Firebase Storage para o Vercel Blob.
 * 
 * Uso: tsx src/infra/scripts/migrate-to-vercel-blob.ts
 */
import "dotenv/config";
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { put } from '@vercel/blob';
import fs from 'fs';
import path from 'path';
// Using native fetch from Node 18+

// Reutiliza lógica de inicialização do server.ts
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const serviceAccountPath = path.resolve(process.cwd(), 'sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');

let firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let credential;
if (fs.existsSync(serviceAccountPath)) {
  credential = cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')));
}

initializeApp({
  projectId: firebaseConfig.projectId,
  storageBucket: "sagacitas-financeiro.appspot.com",
  ...(credential ? { credential } : {})
});

const db = getFirestore();
const storage = getStorage();

async function migrateImages() {
  console.log("🚀 Iniciando migração total para Vercel Blob...");

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("❌ Erro: BLOB_READ_WRITE_TOKEN não configurado no .env");
    return;
  }

  // 1. Migrar Receitas
  const recipesSnapshot = await db.collection('recipes').get();
  console.log(`\n--- Processando ${recipesSnapshot.size} Receitas ---`);
  let recipeCount = 0;

  for (const doc of recipesSnapshot.docs) {
    const data = doc.data();
    const currentImage = data.image;

    if (shouldMigrate(currentImage)) {
      console.log(`📦 [RECEITA] Migrando: "${data.title}"`);
      const newUrl = await uploadToBlob(currentImage, `recipes/${doc.id}`);
      if (newUrl) {
        await doc.ref.update({ 
          image: newUrl,
          updatedAt: FieldValue.serverTimestamp()
        });
        recipeCount++;
        console.log(`   ✅ Sucesso: ${newUrl.substring(0, 50)}...`);
      }
    }
  }

  // 2. Migrar Reviews
  const reviewsSnapshot = await db.collection('reviews').get();
  console.log(`\n--- Processando ${reviewsSnapshot.size} Reviews ---`);
  let reviewCount = 0;

  for (const doc of reviewsSnapshot.docs) {
    const data = doc.data();
    const currentImage = data.dishPhoto;

    if (shouldMigrate(currentImage)) {
      console.log(`📦 [REVIEW] Migrando foto: ${doc.id}`);
      const newUrl = await uploadToBlob(currentImage, `reviews/${doc.id}`);
      if (newUrl) {
        await doc.ref.update({ 
          dishPhoto: newUrl,
          updatedAt: FieldValue.serverTimestamp()
        });
        reviewCount++;
        console.log(`   ✅ Sucesso: ${newUrl.substring(0, 50)}...`);
      }
    }
  }

  console.log(`\n✅ Migração concluída!`);
  console.log(`📊 Receitas atualizadas: ${recipeCount}`);
  console.log(`📊 Reviews atualizados: ${reviewCount}`);
}

function shouldMigrate(url: string | any): boolean {
  if (typeof url !== 'string' || !url) return false;
  
  // Se já está no Vercel Blob, ignora
  if (url.includes('public.blob.vercel-storage.com')) return false;
  
  // Se for uma URL externa (http), local (/uploads) ou apenas um nome de arquivo local, migra!
  return url.startsWith('http') || 
         url.startsWith('/uploads/') || 
         /^(recipe|downloaded|upload)-/.test(url);
}

async function uploadToBlob(sourceUrl: string, prefix: string): Promise<string | null> {
  try {
    let buffer: Buffer;
    let filename: string;

    if (sourceUrl.startsWith('/uploads/') || /^(recipe|downloaded|upload)-/.test(sourceUrl)) {
      // Caso Local
      let localPath = sourceUrl.startsWith('/') 
        ? path.join(process.cwd(), 'public', sourceUrl)
        : path.join(process.cwd(), 'public', 'uploads', sourceUrl);
        
      if (!fs.existsSync(localPath)) {
        // Tenta buscar diretamente em public/ se não achou em uploads
        const altPath = path.join(process.cwd(), 'public', sourceUrl);
        if (fs.existsSync(altPath)) localPath = altPath;
        else return null;
      }
      buffer = fs.readFileSync(localPath);
      filename = `${prefix}-${path.basename(localPath)}`;
    } else {
      // Caso Firebase / Externo
      const response = await fetch(sourceUrl);
      if (!response.ok) return null;
      buffer = Buffer.from(await response.arrayBuffer());
      filename = `${prefix}-${Date.now()}.jpg`;
    }

    const blob = await put(filename, buffer, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN
    });

    return blob.url;
  } catch (error) {
    console.error(`❌ Erro ao subir ${sourceUrl}:`, error);
    return null;
  }
}

migrateImages().catch(console.error);
