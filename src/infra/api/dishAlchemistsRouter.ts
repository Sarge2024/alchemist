import { Router } from 'express';
import { prisma } from '../prisma/client';
import { authenticateFirebase } from '../auth/firebaseAuthMiddleware';
import { formatRecipeResponse } from './formatRecipeResponse';
import { NutritionalEngineService } from '../services/NutritionalEngineService';

export const dishAlchemistsRouter = Router();

// Include padrão para consultas de receitas com ingredientes e owner
const recipeInclude = {
  recipeIngredients: {
    include: { foodItem: true }
  },
  owner: {
    select: { displayName: true, photoURL: true }
  }
};

// Endpoint para buscar receitas (PostgreSQL/Prisma)
// Agora usa o formato padronizado via formatRecipeResponse (mesmo do publicRecipesRouter)
dishAlchemistsRouter.get('/recipes', authenticateFirebase, async (req, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      include: recipeInclude,
      take: 50
    });

    // Formato padronizado — idêntico ao publicRecipesRouter
    const formattedRecipes = recipes.map(formatRecipeResponse);

    res.json({ data: formattedRecipes });
  } catch (error: any) {
    console.error('[DishAlchemists API] Erro ao buscar receitas:', error);
    res.status(500).json({ error: 'Erro interno ao buscar receitas' });
  }
});

// Endpoint para buscar receita específica
dishAlchemistsRouter.get('/recipes/:id', authenticateFirebase, async (req, res) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: recipeInclude
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    // Formato padronizado — idêntico ao publicRecipesRouter
    res.json({ data: formatRecipeResponse(recipe) });
  } catch (error: any) {
    console.error('[DishAlchemists API] Erro ao buscar receita:', error);
    res.status(500).json({ error: 'Erro interno ao buscar receita' });
  }
});

// Endpoint para buscar ingredientes da TACO via API externa
dishAlchemistsRouter.get('/ingredients', authenticateFirebase, async (req, res) => {
  try {
    const TACO_API_BASE = process.env.TACO_API_BASE || 'https://taco-api.netlify.app/api/v1';
    
    const response = await globalThis.fetch(`${TACO_API_BASE}/food`);
    
    if (!response.ok) {
      throw new Error(`Erro API TACO: ${response.status}`);
    }
    
    const foods = await response.json();
    
    const ingredients = foods.map((food: any) => ({
      id: `taco_${food.id}`,
      name: food.description,
      category: `Categoria ${food.category_id}`,
      taco_id: food.id,
      default_unit: 'g'
    }));

    res.json(ingredients);
  } catch (error: any) {
    console.error('[DishAlchemists API] Erro ao buscar ingredientes:', error);
    res.status(500).json({ error: 'Erro interno ao buscar ingredientes' });
  }
});

// Endpoint para calcular nutrição com base na lista de ingredientes
dishAlchemistsRouter.post('/nutrition/calculate', authenticateFirebase, async (req, res) => {
  try {
    const { ingredients } = req.body;
    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'Array de ingredients obrigatório' });
    }
    
    const result = await NutritionalEngineService.calculateRecipeNutrition(ingredients);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error('[DishAlchemists API] Erro ao calcular nutrição:', error);
    res.status(500).json({ success: false, error: 'Erro interno no motor nutricional' });
  }
});
