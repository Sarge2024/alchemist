import { Router } from 'express';
import { prisma } from '../prisma/client';
import { authenticateFirebase } from '../auth/firebaseAuthMiddleware';
import fetch from 'node-fetch'; // O Node v24 suporta fetch globalmente, mas para garantir podemos usar global fetch.

export const dishAlchemistsRouter = Router();

// Endpoint para buscar receitas (PostgreSQL/Prisma)
dishAlchemistsRouter.get('/recipes', authenticateFirebase, async (req, res) => {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        ingredients: true
      },
      take: 50 // Limite para não sobrecarregar
    });

    // Mapeando para o formato esperado pelo frontend (DishRecipe)
    const formattedRecipes = recipes.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      category: (r.tipo_prato && r.tipo_prato[0]) || 'Geral',
      prep_time_minutes: parseInt(r.prepTime || '0', 10),
      image_url: r.image || '',
      instructions: r.instructions,
      ingredients: r.ingredients.map(ing => ({
        ingredient: {
          id: ing.id,
          name: ing.name,
          category: ing.group || 'Geral',
          default_unit: 'g' // Simplificação para este mapeamento
        },
        quantity: parseFloat(ing.quantity) || 0,
        unit: 'g' // Seria necessário parsear a string quantity no futuro
      })),
      total_nutrition: {
        calories: 0, // Como não temos isso direto no banco, enviar 0 e calcular depois via TACO
        protein: 0,
        carbs: 0,
        fat: 0
      }
    }));

    res.json(formattedRecipes);
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
      include: {
        ingredients: true
      }
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    const formattedRecipe = {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description || '',
      category: (recipe.tipo_prato && recipe.tipo_prato[0]) || 'Geral',
      prep_time_minutes: parseInt(recipe.prepTime || '0', 10),
      image_url: recipe.image || '',
      instructions: recipe.instructions,
      ingredients: recipe.ingredients.map(ing => ({
        ingredient: {
          id: ing.id,
          name: ing.name,
          category: ing.group || 'Geral',
          default_unit: 'g'
        },
        quantity: parseFloat(ing.quantity) || 0,
        unit: 'g'
      })),
      total_nutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      }
    };

    res.json(formattedRecipe);
  } catch (error: any) {
    console.error('[DishAlchemists API] Erro ao buscar receita:', error);
    res.status(500).json({ error: 'Erro interno ao buscar receita' });
  }
});

// Endpoint para buscar ingredientes da TACO via API externa
dishAlchemistsRouter.get('/ingredients', authenticateFirebase, async (req, res) => {
  try {
    // Busca ingredientes da API TACO
    const TACO_API_BASE = process.env.TACO_API_BASE || 'https://taco-api.netlify.app/api/v1';
    
    // Podemos fazer proxy para a busca de alimentos da TACO
    const response = await globalThis.fetch(`${TACO_API_BASE}/food`);
    
    if (!response.ok) {
      throw new Error(`Erro API TACO: ${response.status}`);
    }
    
    const foods = await response.json();
    
    // Mapear o formato do TACO para o formato esperado (Ingredient)
    // O TacoFoodBasic retorna { id, description, category_id }
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
