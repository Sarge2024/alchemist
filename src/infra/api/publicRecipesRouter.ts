import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';

export const publicRecipesRouter = Router();

// Middleware: API Key authentication (reuses APP_API_KEY)
const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.APP_API_KEY;
  if (!apiKey || apiKey === '' || apiKey === 'your_app_api_key_here') {
    return next(); // Dev mode bypass
  }

  const clientKey = req.headers['x-api-key'];
  if (clientKey === apiKey) {
    return next();
  }

  res.status(401).json({ error: 'Unauthorized: Invalid or missing API Key' });
};

// Apply API Key auth to all routes in this router
publicRecipesRouter.use(authenticateApiKey);

// ──────────────────────────────────────────────────────────
// GET /recipes — List recipes with pagination
// Query params: ?limit=20&page=1&search=&category=&difficulty=
// ──────────────────────────────────────────────────────────
publicRecipesRouter.get('/recipes', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';
    const difficulty = (req.query.difficulty as string) || '';

    const where: any = {};

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (category) {
      where.OR = [
        { tipo_prato: { has: category } },
        { momento: { has: category } },
        { base_alimento: { has: category } }
      ];
    }
    if (difficulty) {
      where.difficulty = difficulty;
    }

    const [recipes, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        omit: { instructions: true },
        include: {
          recipeIngredients: {
            include: { foodItem: true }
          },
          owner: {
            select: { displayName: true, photoURL: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.recipe.count({ where })
    ]);

    const formattedRecipes = recipes.map(formatRecipeResponse);

    res.json({
      data: formattedRecipes,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('[Public API] Error listing recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /recipes/:id — Single recipe by ID
// ──────────────────────────────────────────────────────────
publicRecipesRouter.get('/recipes/:id', async (req: Request, res: Response) => {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id: req.params.id },
      include: {
        recipeIngredients: {
          include: { foodItem: true }
        },
        owner: {
          select: { displayName: true, photoURL: true }
        }
      }
    });

    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    res.json({ data: formatRecipeResponse(recipe) });
  } catch (error: any) {
    console.error('[Public API] Error fetching recipe:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /recipes/search — Full-text search across title/description
// Query: ?q=frango&limit=10
// ──────────────────────────────────────────────────────────
publicRecipesRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query "q" must be at least 2 characters' });
    }

    const recipes = await prisma.recipe.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } }
        ]
      },
      omit: { instructions: true },
      include: {
        recipeIngredients: {
          include: { foodItem: true }
        },
        owner: {
          select: { displayName: true, photoURL: true }
        }
      },
      orderBy: { rating: 'desc' },
      take: limit
    });

    res.json({
      data: recipes.map(formatRecipeResponse),
      total: recipes.length
    });
  } catch (error: any) {
    console.error('[Public API] Error searching recipes:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /categories — List distinct categories available
// ──────────────────────────────────────────────────────────
publicRecipesRouter.get('/categories', async (_req: Request, res: Response) => {
  try {
    const recipes = await prisma.recipe.findMany({
      select: { tipo_prato: true, base_alimento: true, momento: true }
    });

    const categories = new Set<string>();
    const bases = new Set<string>();
    const moments = new Set<string>();

    recipes.forEach(r => {
      r.tipo_prato.forEach(c => categories.add(c));
      r.base_alimento.forEach(b => bases.add(b));
      r.momento.forEach(m => moments.add(m));
    });

    res.json({
      tipo_prato: Array.from(categories).sort(),
      base_alimento: Array.from(bases).sort(),
      momento: Array.from(moments).sort()
    });
  } catch (error: any) {
    console.error('[Public API] Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────
// Helper: Format a Prisma Recipe into a clean API response
// ──────────────────────────────────────────────────────────
function formatRecipeResponse(recipe: any) {
  const nutrition = recipe.recipeIngredients.reduce(
    (acc: any, ri: any) => {
      const factor = (Number(ri.quantity) || 0) / 100;
      acc.calories += (ri.foodItem.calories || 0) * factor;
      acc.protein += (ri.foodItem.protein || 0) * factor;
      acc.carbs += (ri.foodItem.carbohydrates || 0) * factor;
      acc.fat += (ri.foodItem.lipids || 0) * factor;
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Round nutrition values
  Object.keys(nutrition).forEach(k => {
    nutrition[k] = Math.round(nutrition[k] * 10) / 10;
  });

  return {
    id: recipe.id,
    title: recipe.title,
    description: recipe.description || '',
    image: recipe.image || '',
    category: recipe.tipo_prato,
    base_alimento: recipe.base_alimento,
    momento: recipe.momento,
    origem: recipe.origem || '',
    difficulty: recipe.difficulty || '',
    prepTime: recipe.prepTime || '',
    servings: recipe.servings || '',
    dietType: recipe.dietType || '',
    custo_estimado: recipe.custo_estimado || '',
    instructions: recipe.instructions,
    rating: recipe.rating,
    reviewsCount: recipe.reviewsCount,
    isClassic: recipe.isClassic,
    createdAt: recipe.createdAt,
    author: recipe.owner
      ? { name: recipe.owner.displayName, avatar: recipe.owner.photoURL }
      : null,
    ingredients: recipe.recipeIngredients.map((ri: any) => ({
      id: ri.foodItem.id,
      name: ri.foodItem.name,
      category: ri.foodItem.category || '',
      quantity: ri.quantity,
      unit: ri.unit,
      preparationMode: ri.preparationMode || null
    })),
    nutrition
  };
}
