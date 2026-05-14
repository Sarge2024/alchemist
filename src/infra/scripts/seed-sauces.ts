/**
 * seed-sauces.ts
 * Script para cadastrar automaticamente a nova apresentação e o documento de molhos no acervo.
 * 
 * Uso: npx tsx src/infra/scripts/seed-sauces.ts
 */
import "dotenv/config";
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const serviceAccountPath = path.resolve(process.cwd(), 'sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');

if (!fs.existsSync(configPath)) {
  console.error("❌ Arquivo de configuração firebase-applet-config.json não encontrado.");
  process.exit(1);
}

let firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let credential;
if (fs.existsSync(serviceAccountPath)) {
  credential = cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')));
}

initializeApp({
  projectId: firebaseConfig.projectId,
  ...(credential ? { credential } : {})
});

const db = getFirestore();

async function seedSauces() {
  console.log("🚀 Semeando itens de molhos no Acervo...");

  const libraryItems = [
    {
      title: "Arte dos Molhos: Guia de Alta Gastronomia",
      description: "Uma imersão interativa nos Molhos Mãe franceses e nos clássicos da tradição italiana. Inclui análise sensorial, dicas de preparo e harmonizações.",
      type: "presentation",
      category: "Técnicas Culinárias",
      author: "Alquimia do Prato",
      url: "/acervo/guia-dos-molhos",
      tags: ["molhos", "técnica francesa", "cozinha italiana", "escoffier"],
      createdAt: FieldValue.serverTimestamp()
    },
    {
      title: "O Cânone dos Molhos: Análise Técnica",
      description: "Documento detalhado sobre a evolução histórica, fundamentos científicos do roux e emulsões, e um guia completo das 16 sapatas da massa italiana.",
      type: "pdf",
      category: "Técnicas Culinárias",
      author: "Alquimia do Prato",
      url: "/acervo/guia-molhos.html",
      tags: ["artigo técnico", "história", "gastronomia clássica", "molhos"],
      createdAt: FieldValue.serverTimestamp()
    }
  ];

  for (const item of libraryItems) {
    // Verifica se já existe para evitar duplicatas (busca pelo título)
    const existing = await db.collection('library')
      .where('title', '==', item.title)
      .get();

    if (existing.empty) {
      const docRef = await db.collection('library').add(item);
      console.log(`✅ Item adicionado: "${item.title}" (ID: ${docRef.id})`);
    } else {
      console.log(`🟡 Item já existe: "${item.title}"`);
      // Opcional: atualizar o item existente
      await existing.docs[0].ref.update(item);
      console.log(`   🔄 Atualizado.`);
    }
  }

  console.log("\n✨ Semeadura concluída com sucesso!");
}

seedSauces().catch(err => {
  console.error("❌ Erro ao semear dados:", err);
  process.exit(1);
});
