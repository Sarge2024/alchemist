import { Router, Request, Response } from 'express';
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

// Auxiliar para slug
const generateSlug = (text: string) => {
  if (!text) return '';
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/\s+/g, '-')           // Substitui espaços por -
    .replace(/[^\w\-]+/g, '')       // Remove caracteres especiais
    .replace(/\-\-+/g, '-')         // Substitui múltiplos -- por -
    .replace(/^-+/, '')             // Trim do início
    .replace(/-+$/, '');            // Trim do final
};

// Auxiliar para parsing de quantidade e unidade
function parseQuantityAndUnit(qtyStr: string) {
  if (!qtyStr) return { quantity: 1, unit: 'un' };
  
  const numMatch = qtyStr.match(/^([\d\/\.\,\s]+)(.*)$/);
  if (!numMatch) {
    return { quantity: 1, unit: qtyStr.trim() || 'un' };
  }
  
  let qtyVal = parseFloat(numMatch[1].replace(',', '.').trim());
  if (isNaN(qtyVal)) {
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

// ──────────────────────────────────────────────────────────
// GET /recipes — Listar receitas com filtros (PostgreSQL)
// ──────────────────────────────────────────────────────────
dishAlchemistsRouter.get('/recipes', async (req: Request, res: Response) => {
  try {
    const { slug, momento, ownerId } = req.query;
    const where: any = {};

    if (slug) {
      where.slug = slug as string;
    }
    if (momento) {
      where.momento = { has: momento as string };
    }
    if (ownerId) {
      // Se filtrado por ownerId, corresponde ao UID do Firebase Auth no banco User.uid
      where.owner = { uid: ownerId as string };
    }

    const recipes = await prisma.recipe.findMany({
      where,
      include: recipeInclude,
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const formattedRecipes = recipes.map(formatRecipeResponse);
    res.json({ data: formattedRecipes });
  } catch (error: any) {
    console.error('[DishAlchemists API] Erro ao listar receitas:', error);
    res.status(500).json({ error: 'Erro interno ao buscar receitas' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /recipes/:id — Buscar receita específica por ID
// ──────────────────────────────────────────────────────────
dishAlchemistsRouter.get('/recipes/:id', async (req: Request, res: Response) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: recipeInclude
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    res.json({ data: formatRecipeResponse(recipe) });
  } catch (error: any) {
    console.error('[DishAlchemists API] Erro ao buscar receita por ID:', error);
    res.status(500).json({ error: 'Erro interno ao buscar receita' });
  }
});

// ──────────────────────────────────────────────────────────
// POST /recipes — Criar receita no PostgreSQL
// ──────────────────────────────────────────────────────────
dishAlchemistsRouter.post('/recipes', authenticateFirebase, async (req: any, res: Response) => {
  try {
    // Buscar o ID de usuário interno baseado no UID de autenticação do Firebase
    const user = await prisma.user.findUnique({
      where: { uid: req.user.uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não cadastrado no PostgreSQL' });
    }

    const {
      title,
      description,
      image,
      momento,
      tipo_prato,
      base_alimento,
      origem,
      time,
      prepTime,
      dietType,
      servings,
      difficulty,
      custo_estimado,
      instructions,
      ingredients,
      isClassic
    } = req.body;

    const slug = `${generateSlug(title || 'receita')}-${Math.random().toString(36).substring(2, 8)}`;

    const recipe = await prisma.recipe.create({
      data: {
        title: title || 'Sem título',
        description: description || null,
        image: image || null,
        momento: Array.isArray(momento) ? momento : [],
        tipo_prato: Array.isArray(tipo_prato) ? tipo_prato : [],
        base_alimento: Array.isArray(base_alimento) ? base_alimento : [],
        origem: origem || null,
        time: time || null,
        prepTime: prepTime || null,
        dietType: dietType || null,
        servings: servings || null,
        difficulty: difficulty || null,
        custo_estimado: custo_estimado || null,
        instructions: Array.isArray(instructions) ? instructions : [],
        rating: 4.5,
        reviewsCount: 0,
        isClassic: typeof isClassic === 'boolean' ? isClassic : false,
        slug,
        ownerId: user.id
      }
    });

    // Inserir ingredientes vinculados
    if (Array.isArray(ingredients)) {
      for (const ing of ingredients) {
        let name = '';
        let qtyStr = '';
        let group = 'Outros';

        if (typeof ing === 'string') {
          name = ing.trim();
        } else if (ing && typeof ing === 'object') {
          name = (ing.name || '').trim();
          qtyStr = ing.quantity || '';
          group = ing.group || 'Outros';
        }

        if (!name) continue;

        const foodItem = await prisma.globalFoodItem.upsert({
          where: { name },
          update: {},
          create: {
            name,
            category: group,
            source: 'CUSTOM'
          }
        });

        const { quantity, unit } = parseQuantityAndUnit(qtyStr);

        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            foodItemId: foodItem.id,
            quantity,
            unit,
            preparationMode: group !== 'Outros' ? group : null
          }
        });
      }
    }

    // Buscar a receita completa criada para formatar o retorno
    const fullRecipe = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: recipeInclude
    });

    res.status(201).json(formatRecipeResponse(fullRecipe!));
  } catch (error: any) {
    console.error('[DishAlchemists API] Erro ao criar receita:', error);
    res.status(500).json({ error: 'Erro interno ao criar receita' });
  }
});

// ──────────────────────────────────────────────────────────
// PUT /recipes/:id — Atualizar receita no PostgreSQL
// ──────────────────────────────────────────────────────────
dishAlchemistsRouter.put('/recipes/:id', authenticateFirebase, async (req: any, res: Response) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: { owner: true }
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    const user = await prisma.user.findUnique({
      where: { uid: req.user.uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Checar autoridade: somente dono ou ADMIN podem atualizar
    if (recipe.ownerId !== user.id && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado para modificar esta receita' });
    }

    const {
      title,
      description,
      image,
      momento,
      tipo_prato,
      base_alimento,
      origem,
      time,
      prepTime,
      dietType,
      servings,
      difficulty,
      custo_estimado,
      instructions,
      ingredients,
      isClassic
    } = req.body;

    let slug = recipe.slug;
    if (title && title !== recipe.title) {
      slug = `${generateSlug(title)}-${Math.random().toString(36).substring(2, 8)}`;
    }

    await prisma.recipe.update({
      where: { id: recipe.id },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        image: image !== undefined ? image : undefined,
        momento: Array.isArray(momento) ? momento : undefined,
        tipo_prato: Array.isArray(tipo_prato) ? tipo_prato : undefined,
        base_alimento: Array.isArray(base_alimento) ? base_alimento : undefined,
        origem: origem !== undefined ? origem : undefined,
        time: time !== undefined ? time : undefined,
        prepTime: prepTime !== undefined ? prepTime : undefined,
        dietType: dietType !== undefined ? dietType : undefined,
        servings: servings !== undefined ? servings : undefined,
        difficulty: difficulty !== undefined ? difficulty : undefined,
        custo_estimado: custo_estimado !== undefined ? custo_estimado : undefined,
        instructions: Array.isArray(instructions) ? instructions : undefined,
        isClassic: typeof isClassic === 'boolean' ? isClassic : undefined,
        slug
      }
    });

    // Atualizar ingredientes se fornecidos
    if (ingredients !== undefined && Array.isArray(ingredients)) {
      // Remover antigos
      await prisma.recipeIngredient.deleteMany({
        where: { recipeId: recipe.id }
      });

      // Cadastrar novos
      for (const ing of ingredients) {
        let name = '';
        let qtyStr = '';
        let group = 'Outros';

        if (typeof ing === 'string') {
          name = ing.trim();
        } else if (ing && typeof ing === 'object') {
          name = (ing.name || '').trim();
          qtyStr = ing.quantity || '';
          group = ing.group || 'Outros';
        }

        if (!name) continue;

        const foodItem = await prisma.globalFoodItem.upsert({
          where: { name },
          update: {},
          create: {
            name,
            category: group,
            source: 'CUSTOM'
          }
        });

        const { quantity, unit } = parseQuantityAndUnit(qtyStr);

        await prisma.recipeIngredient.create({
          data: {
            recipeId: recipe.id,
            foodItemId: foodItem.id,
            quantity,
            unit,
            preparationMode: group !== 'Outros' ? group : null
          }
        });
      }
    }

    const updatedRecipe = await prisma.recipe.findUnique({
      where: { id: recipe.id },
      include: recipeInclude
    });

    res.json(formatRecipeResponse(updatedRecipe!));
  } catch (error: any) {
    console.error('[DishAlchemists API] Erro ao atualizar receita:', error);
    res.status(500).json({ error: 'Erro interno ao atualizar receita' });
  }
});

// ──────────────────────────────────────────────────────────
// DELETE /recipes/:id — Deletar receita no PostgreSQL
// ──────────────────────────────────────────────────────────
dishAlchemistsRouter.delete('/recipes/:id', authenticateFirebase, async (req: any, res: Response) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id }
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Receita não encontrada' });
    }

    const user = await prisma.user.findUnique({
      where: { uid: req.user.uid }
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Apenas dono ou ADMIN
    if (recipe.ownerId !== user.id && user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Acesso negado para remover esta receita' });
    }

    // Cascade deletes ingredients automatically, but let's delete manually to be safe
    await prisma.recipeIngredient.deleteMany({
      where: { recipeId: recipe.id }
    });

    await prisma.recipe.delete({
      where: { id: recipe.id }
    });

    res.json({ success: true, message: 'Receita deletada com sucesso' });
  } catch (error: any) {
    console.error('[DishAlchemists API] Erro ao deletar receita:', error);
    res.status(500).json({ error: 'Erro interno ao deletar receita' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /ingredients — Buscar ingredientes da TACO via API externa
// ──────────────────────────────────────────────────────────
dishAlchemistsRouter.get('/ingredients', authenticateFirebase, async (req: Request, res: Response) => {
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

// ──────────────────────────────────────────────────────────
// POST /nutrition/calculate — Calcular nutrição
// ──────────────────────────────────────────────────────────
dishAlchemistsRouter.post('/nutrition/calculate', authenticateFirebase, async (req: Request, res: Response) => {
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
