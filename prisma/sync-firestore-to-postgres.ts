import 'dotenv/config';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { prisma } from '../src/infra/prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Parse quantity and unit helper
function parseQuantityAndUnit(qtyStr: string) {
  if (!qtyStr) return { quantity: 1, unit: 'un' };
  
  // Match numbers like 1, 1.5, 1/2, 100
  const numMatch = qtyStr.match(/^([\d\/\.\,\s]+)(.*)$/);
  if (!numMatch) {
    return { quantity: 1, unit: qtyStr.trim() || 'un' };
  }
  
  let qtyVal = parseFloat(numMatch[1].replace(',', '.').trim());
  if (isNaN(qtyVal)) {
    // Check if it is a fraction like 1/2
    if (numMatch[1].includes('/')) {
      const parts = numMatch[1].split('/');
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) {
        qtyVal = num / den;
      } else {
        qtyVal = 1;
      }
    } else {
      qtyVal = 1;
    }
  }
  
  const unitVal = numMatch[2].trim() || 'un';
  return { quantity: qtyVal, unit: unitVal };
}

async function sync() {
  console.log("Iniciando sincronização otimizada de Firestore para PostgreSQL...");

  // Initialize Firebase Admin
  const serviceAccountPath = path.resolve(process.cwd(), 'sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');
  if (!fs.existsSync(serviceAccountPath)) {
    throw new Error(`Arquivo de credenciais do Firebase não encontrado em: ${serviceAccountPath}`);
  }
  
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  if (!getApps().length) {
    initializeApp({
      credential: cert(serviceAccount)
    });
  }
  
  const db = getFirestore();

  // 1. Sincronizar usuários
  console.log("Sincronizando usuários...");
  const usersSnapshot = await db.collection('users').get();
  console.log(`Encontrados ${usersSnapshot.size} usuários no Firestore.`);
  
  const uidToPgIdMap = new Map<string, string>();
  
  for (const doc of usersSnapshot.docs) {
    const uData = doc.data();
    const uid = doc.id; // No Firestore, o id do doc é o UID
    
    // Tratar email duplicado/nulo
    let targetEmail = (uData.email || `${uid}@dishalchemists.com`).trim();
    if (!targetEmail) {
      targetEmail = `${uid}@dishalchemists.com`;
    }

    // Verificar se outro usuário já usa esse email no PostgreSQL
    const duplicateEmailUser = await prisma.user.findFirst({
      where: {
        email: targetEmail,
        uid: { not: uid }
      }
    });

    if (duplicateEmailUser) {
      console.log(`Aviso: Email duplicado detectado para ${uid} (${targetEmail}). Ajustando email.`);
      targetEmail = `${uid}-${targetEmail}`;
    }
    
    // Upsert no PostgreSQL
    const pgUser = await prisma.user.upsert({
      where: { uid },
      update: {
        displayName: uData.displayName || uData.name || 'Alquimista',
        email: targetEmail,
        photoURL: uData.photoURL || null,
        whatsapp: uData.whatsapp || null,
        state: uData.state || 'SP',
        country: uData.country || 'Brasil',
        role: uData.role === 'admin' ? 'ADMIN' : (uData.role === 'collaborator' ? 'COLLABORATOR' : 'USER'),
      },
      create: {
        uid,
        displayName: uData.displayName || uData.name || 'Alquimista',
        email: targetEmail,
        photoURL: uData.photoURL || null,
        whatsapp: uData.whatsapp || null,
        state: uData.state || 'SP',
        country: uData.country || 'Brasil',
        role: uData.role === 'admin' ? 'ADMIN' : (uData.role === 'collaborator' ? 'COLLABORATOR' : 'USER'),
      }
    });
    
    uidToPgIdMap.set(uid, pgUser.id);
  }
  
  // Garantir um usuário padrão para fallback
  let defaultUser = await prisma.user.findFirst();
  if (!defaultUser) {
    defaultUser = await prisma.user.create({
      data: {
        uid: 'system-default-alchemist',
        displayName: 'Mestre Alquimista',
        email: 'admin@dishalchemists.com',
        state: 'SP',
        country: 'Brasil',
        role: 'ADMIN'
      }
    });
  }
  const defaultUserId = defaultUser.id;
  console.log(`Usuários sincronizados. Fallback PG User ID: ${defaultUserId}`);

  // 2. Limpar receitas antigas do PostgreSQL
  console.log("Limpando receitas e ingredientes antigos do PostgreSQL...");
  await prisma.recipeIngredient.deleteMany({});
  await prisma.recipe.deleteMany({});
  console.log("Limpeza concluída.");

  // Pre-carregar GlobalFoodItems existentes para cache em memória
  console.log("Carregando cache de ingredientes (GlobalFoodItems)...");
  const existingFoodItems = await prisma.globalFoodItem.findMany({ select: { id: true, name: true } });
  const foodItemCache = new Map<string, string>();
  for (const item of existingFoodItems) {
    foodItemCache.set(item.name.toLowerCase().trim(), item.id);
  }
  console.log(`Cache carregado com ${foodItemCache.size} ingredientes.`);

  // 3. Sincronizar receitas
  const recipesSnapshot = await db.collection('recipes').get();
  console.log(`Encontradas ${recipesSnapshot.size} receitas no Firestore. Iniciando migração...`);
  
  let successCount = 0;
  
  // Processamento concorrente controlado (lotes de 10)
  const recipes = recipesSnapshot.docs;
  const batchSize = 10;
  
  for (let i = 0; i < recipes.length; i += batchSize) {
    const batch = recipes.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (doc) => {
      const rData = doc.data();
      const firestoreId = doc.id;
      
      try {
        // Determinar o ownerId correto
        let pgOwnerId = defaultUserId;
        if (rData.ownerId) {
          const mappedId = uidToPgIdMap.get(rData.ownerId);
          if (mappedId) {
            pgOwnerId = mappedId;
          } else {
            const foundUser = await prisma.user.findUnique({ where: { uid: rData.ownerId } });
            if (foundUser) {
              pgOwnerId = foundUser.id;
              uidToPgIdMap.set(rData.ownerId, foundUser.id);
            }
          }
        }

        // Converter timestamps
        const createdAt = rData.createdAt?.toDate ? rData.createdAt.toDate() : new Date();
        const updatedAt = rData.updatedAt?.toDate ? rData.updatedAt.toDate() : new Date();

        // Criar receita no PostgreSQL
        const createdRecipe = await prisma.recipe.create({
          data: {
            id: firestoreId,
            title: rData.title || 'Receita sem título',
            description: rData.description || null,
            image: rData.image || null,
            momento: Array.isArray(rData.momento) ? rData.momento : [],
            tipo_prato: Array.isArray(rData.tipo_prato) ? rData.tipo_prato : [],
            base_alimento: Array.isArray(rData.base_alimento) ? rData.base_alimento : [],
            origem: rData.origem || null,
            time: rData.time || null,
            prepTime: rData.prepTime || null,
            dietType: rData.dietType || null,
            servings: rData.servings || null,
            difficulty: rData.difficulty || null,
            custo_estimado: rData.custo_estimado || null,
            instructions: Array.isArray(rData.instructions) ? rData.instructions : [],
            rating: typeof rData.rating === 'number' ? rData.rating : 4.5,
            reviewsCount: typeof rData.reviewsCount === 'number' ? rData.reviewsCount : 0,
            isClassic: typeof rData.isClassic === 'boolean' ? rData.isClassic : false,
            slug: rData.slug || null,
            ownerId: pgOwnerId,
            createdAt,
            updatedAt
          }
        });

        // Processar ingredientes
        if (Array.isArray(rData.ingredients)) {
          for (const ing of rData.ingredients) {
            let ingName = '';
            let qtyStr = '';
            let group = 'Outros';

            if (typeof ing === 'string') {
              ingName = ing.trim();
            } else if (ing && typeof ing === 'object') {
              ingName = (ing.name || '').trim();
              qtyStr = ing.quantity || '';
              group = ing.group || 'Outros';
            }

            if (!ingName) continue;
            const normName = ingName.toLowerCase().trim();

            // Usar cache em memória ou criar no DB
            let foodItemId = foodItemCache.get(normName);
            if (!foodItemId) {
              const foodItem = await prisma.globalFoodItem.upsert({
                where: { name: ingName },
                update: {},
                create: {
                  name: ingName,
                  category: group,
                  source: 'CUSTOM',
                  baseQuantity: 100,
                  baseUnit: 'g'
                }
              });
              foodItemId = foodItem.id;
              foodItemCache.set(normName, foodItemId);
            }

            // Parse quantity and unit
            const { quantity, unit } = parseQuantityAndUnit(qtyStr);

            // Criar RecipeIngredient
            await prisma.recipeIngredient.create({
              data: {
                recipeId: createdRecipe.id,
                foodItemId,
                quantity,
                unit,
                preparationMode: group !== 'Outros' ? group : null
              }
            });
          }
        }

        successCount++;
      } catch (recipeError) {
        console.error(`Erro ao migrar receita "${rData.title}" (ID: ${firestoreId}):`, recipeError);
      }
    }));
    
    console.log(`Lote processado: ${Math.min(i + batchSize, recipes.length)} / ${recipes.length} receitas...`);
  }

  console.log(`\nSincronização concluída com sucesso!`);
  console.log(`Total de receitas no Firestore: ${recipesSnapshot.size}`);
  console.log(`Total de receitas migradas com sucesso para o PostgreSQL: ${successCount}`);
}

sync()
  .then(() => {
    console.log("Processo finalizado com sucesso.");
    process.exit(0);
  })
  .catch(err => {
    console.error("Erro fatal no processo de sincronização:", err);
    process.exit(1);
  });
