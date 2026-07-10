import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';
import { authenticateFirebase } from '../auth/firebaseAuthMiddleware';

export const adminIngredientsRouter = Router();

// Função auxiliar para verificar permissão de ADMIN
const requireAdmin = async (req: any, res: Response, next: any) => {
  try {
    const user = await prisma.user.findUnique({
      where: { uid: req.user.uid }
    });
    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem gerenciar ingredientes.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar permissões.' });
  }
};

// GET /api/admin/ingredients/pending — Listar ingredientes órfãos/NOT_FOUND
adminIngredientsRouter.get('/admin/ingredients/pending', authenticateFirebase, requireAdmin, async (req: Request, res: Response) => {
  try {
    const pendingItems = await prisma.globalFoodItem.findMany({
      where: {
        OR: [
          { source: 'NOT_FOUND' },
          { source: 'PENDING' }
        ]
      },
      orderBy: { name: 'asc' }
    });
    res.json({ data: pendingItems });
  } catch (error: any) {
    console.error('[AdminIngredients] Erro ao buscar pendentes:', error);
    res.status(500).json({ error: 'Erro ao buscar pendentes' });
  }
});

// GET /api/admin/ingredients — Listar todos os ingredientes (Base proprietária)
adminIngredientsRouter.get('/admin/ingredients', authenticateFirebase, requireAdmin, async (req: Request, res: Response) => {
  try {
    const items = await prisma.globalFoodItem.findMany({
      where: {
        source: { notIn: ['NOT_FOUND', 'PENDING'] }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ data: items });
  } catch (error: any) {
    console.error('[AdminIngredients] Erro ao listar ingredientes:', error);
    res.status(500).json({ error: 'Erro ao listar ingredientes' });
  }
});

// GET /api/admin/ingredients/search-external — Buscar na USDA para pareamento
adminIngredientsRouter.get('/admin/ingredients/search-external', authenticateFirebase, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query obrigatória' });
    }

    const apiKey = process.env.USDA_API_KEY;
    if (!apiKey || apiKey.includes('placeholder')) {
      return res.status(500).json({ error: 'USDA API Key não configurada.' });
    }

    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${apiKey}&query=${encodeURIComponent(query)}&pageSize=5`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Falha na USDA API' });
    }

    const data: any = await response.json();
    const results = (data.foods || []).map((food: any) => {
      let calories = 0, protein = 0, carbs = 0, fat = 0;
      for (const nutrient of food.foodNutrients) {
        const nameLower = nutrient.nutrientName.toLowerCase();
        const unit = nutrient.unitName.toLowerCase();
        const val = nutrient.value;
        if (nameLower.includes('energy') && unit === 'kcal') calories = val;
        else if (nameLower.includes('protein')) protein = val;
        else if (nameLower.includes('carbohydrate')) carbs = val;
        else if (nameLower.includes('lipid') || nameLower.includes('fat')) fat = val;
      }
      return {
        id: food.fdcId,
        name: food.description,
        source: 'USDA',
        calories,
        protein,
        carbohydrates: carbs,
        lipids: fat,
      };
    });

    res.json({ data: results });
  } catch (error: any) {
    console.error('[AdminIngredients] Erro na busca externa:', error);
    res.status(500).json({ error: 'Erro ao buscar em APIs externas' });
  }
});

// POST /api/admin/ingredients — Criar novo ingrediente manualmente
adminIngredientsRouter.post('/admin/ingredients', authenticateFirebase, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { 
      name,
      source,
      calories,
      protein,
      carbohydrates,
      lipids,
      density,
      standardPurchaseQuantity,
      standardPurchaseUnit,
      estimatedPrice,
      externalId
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'O nome do ingrediente é obrigatório' });
    }

    const newIngredient = await prisma.globalFoodItem.create({
      data: {
        name,
        source: source || 'PROPRIETARIA',
        calories: calories || 0,
        protein: protein || 0,
        carbohydrates: carbohydrates || 0,
        lipids: lipids || 0,
        density: density === "" ? null : (density ? parseFloat(density) : null),
        standardPurchaseQuantity: standardPurchaseQuantity === "" ? null : (standardPurchaseQuantity ? parseFloat(standardPurchaseQuantity) : null),
        standardPurchaseUnit: standardPurchaseUnit || null,
        estimatedPrice: estimatedPrice === "" ? null : (estimatedPrice ? parseFloat(estimatedPrice) : null),
        externalId: externalId || null,
        baseUnit: 'g',
        baseQuantity: 100
      }
    });

    res.status(201).json({ data: newIngredient });
  } catch (error: any) {
    console.error('[AdminIngredients] Erro ao criar ingrediente:', error);
    res.status(500).json({ error: 'Erro ao criar ingrediente.' });
  }
});

// PUT /api/admin/ingredients/:id — Atualizar/Parear ingrediente
adminIngredientsRouter.put('/admin/ingredients/:id', authenticateFirebase, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      source, 
      calories, 
      protein, 
      carbohydrates, 
      lipids, 
      density, 
      standardPurchaseQuantity, 
      standardPurchaseUnit, 
      estimatedPrice,
      externalId 
    } = req.body;

    const updateData: any = {};
    if (source !== undefined) updateData.source = source;
    if (calories !== undefined) updateData.calories = calories;
    if (protein !== undefined) updateData.protein = protein;
    if (carbohydrates !== undefined) updateData.carbohydrates = carbohydrates;
    if (lipids !== undefined) updateData.lipids = lipids;
    if (density !== undefined) updateData.density = density === "" ? null : parseFloat(density);
    if (standardPurchaseQuantity !== undefined) updateData.standardPurchaseQuantity = standardPurchaseQuantity === "" ? null : parseFloat(standardPurchaseQuantity);
    if (standardPurchaseUnit !== undefined) updateData.standardPurchaseUnit = standardPurchaseUnit;
    if (estimatedPrice !== undefined) updateData.estimatedPrice = estimatedPrice === "" ? null : parseFloat(estimatedPrice);
    if (externalId !== undefined) updateData.externalId = externalId;

    const updated = await prisma.globalFoodItem.update({
      where: { id },
      data: updateData
    });

    res.json({ data: updated });
  } catch (error: any) {
    console.error('[AdminIngredients] Erro ao atualizar ingrediente:', error);
    res.status(500).json({ error: 'Erro ao atualizar ingrediente' });
  }
});

// POST /api/admin/ingredients/merge — Mesclar ingredientes duplicados
adminIngredientsRouter.post('/admin/ingredients/merge', authenticateFirebase, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { survivorId, duplicateIds } = req.body;
    
    if (!survivorId || !Array.isArray(duplicateIds) || duplicateIds.length === 0) {
      return res.status(400).json({ error: 'Dados inválidos para mesclagem' });
    }

    // Executa a mesclagem em uma transação para garantir integridade
    await prisma.$transaction(async (tx) => {
      // 1. Redireciona todas as receitas que usavam as duplicatas para o sobrevivente
      await tx.recipeIngredient.updateMany({
        where: { foodItemId: { in: duplicateIds } },
        data: { foodItemId: survivorId }
      });

      // 2. Deleta os ingredientes duplicados
      await tx.globalFoodItem.deleteMany({
        where: { id: { in: duplicateIds } }
      });
    });

    res.json({ success: true, message: 'Ingredientes mesclados com sucesso' });
  } catch (error: any) {
    console.error('[AdminIngredients] Erro ao mesclar ingredientes:', error);
    res.status(500).json({ error: 'Erro interno ao mesclar ingredientes.' });
  }
});

// DELETE /api/admin/ingredients/:id — Remover ingrediente
adminIngredientsRouter.delete('/admin/ingredients/:id', authenticateFirebase, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.globalFoodItem.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error('[AdminIngredients] Erro ao deletar ingrediente:', error);
    res.status(500).json({ error: 'Erro ao deletar ingrediente. Ele pode estar sendo usado em receitas.' });
  }
});
