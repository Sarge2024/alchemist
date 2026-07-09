import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';

export const publicIngredientsRouter = Router();

// Middleware: API Key authentication (same pattern as publicRecipesRouter)
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

publicIngredientsRouter.use(authenticateApiKey);

// ──────────────────────────────────────────────────────────
// GET /ingredients — List all validated ingredients (excludes NOT_FOUND)
// Query: ?limit=50&page=1&search=arroz&source=TACO
// ──────────────────────────────────────────────────────────
publicIngredientsRouter.get('/ingredients', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const source = (req.query.source as string) || '';
    const category = (req.query.category as string) || '';

    const where: any = {
      source: { notIn: ['NOT_FOUND', 'PENDING'] }
    };

    if (search) {
      where.name = { contains: search, mode: 'insensitive' };
    }
    if (source) {
      where.source = source;
    }
    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.globalFoodItem.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit
      }),
      prisma.globalFoodItem.count({ where })
    ]);

    res.json({
      data: items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('[Public API] Error listing ingredients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /ingredients/:id — Single ingredient by ID
// ──────────────────────────────────────────────────────────
publicIngredientsRouter.get('/ingredients/:id', async (req: Request, res: Response) => {
  try {
    const item = await prisma.globalFoodItem.findUnique({
      where: { id: req.params.id }
    });

    if (!item) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    res.json({ data: item });
  } catch (error: any) {
    console.error('[Public API] Error fetching ingredient:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /ingredients/search — Full-text search across ingredient names
// Query: ?q=frango&limit=10
// ──────────────────────────────────────────────────────────
publicIngredientsRouter.get('/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Query "q" must be at least 2 characters' });
    }

    const items = await prisma.globalFoodItem.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
        source: { notIn: ['NOT_FOUND', 'PENDING'] }
      },
      orderBy: { name: 'asc' },
      take: limit
    });

    res.json({
      data: items,
      total: items.length
    });
  } catch (error: any) {
    console.error('[Public API] Error searching ingredients:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /ingredients/by-name/:name — Lookup ingredient by exact name
// Useful for recipe-ingredient matching from external apps
// ──────────────────────────────────────────────────────────
publicIngredientsRouter.get('/by-name/:name', async (req: Request, res: Response) => {
  try {
    const name = decodeURIComponent(req.params.name);

    // Exact match first
    let item = await prisma.globalFoodItem.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        source: { notIn: ['NOT_FOUND', 'PENDING'] }
      }
    });

    // Fuzzy fallback
    if (!item) {
      item = await prisma.globalFoodItem.findFirst({
        where: {
          name: { contains: name, mode: 'insensitive' },
          source: { notIn: ['NOT_FOUND', 'PENDING'] }
        },
        orderBy: { name: 'asc' }
      });
    }

    if (!item) {
      return res.status(404).json({ error: 'Ingredient not found', query: name });
    }

    res.json({ data: item });
  } catch (error: any) {
    console.error('[Public API] Error looking up ingredient by name:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────
// POST /ingredients/batch — Lookup multiple ingredients by name at once
// Body: { "names": ["arroz", "feijão", "frango"] }
// ──────────────────────────────────────────────────────────
publicIngredientsRouter.post('/batch', async (req: Request, res: Response) => {
  try {
    const { names } = req.body;
    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({ error: '"names" must be a non-empty array of strings' });
    }

    if (names.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 ingredients per batch request' });
    }

    const results: Record<string, any> = {};

    for (const name of names) {
      if (typeof name !== 'string') continue;

      let item = await prisma.globalFoodItem.findFirst({
        where: {
          name: { equals: name, mode: 'insensitive' },
          source: { notIn: ['NOT_FOUND', 'PENDING'] }
        }
      });

      if (!item) {
        item = await prisma.globalFoodItem.findFirst({
          where: {
            name: { contains: name, mode: 'insensitive' },
            source: { notIn: ['NOT_FOUND', 'PENDING'] }
          },
          orderBy: { name: 'asc' }
        });
      }

      results[name] = item || null;
    }

    res.json({ data: results });
  } catch (error: any) {
    console.error('[Public API] Error in batch lookup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ──────────────────────────────────────────────────────────
// GET /measures — List culinary measures for unit conversion
// Query: ?ingredient=ovo
// ──────────────────────────────────────────────────────────
publicIngredientsRouter.get('/measures', async (req: Request, res: Response) => {
  try {
    const ingredient = (req.query.ingredient as string) || '';

    const where: any = {};
    if (ingredient) {
      where.ingredientName = { contains: ingredient, mode: 'insensitive' };
    }

    const measures = await prisma.culinaryMeasure.findMany({
      where,
      orderBy: { ingredientName: 'asc' }
    });

    res.json({ data: measures });
  } catch (error: any) {
    console.error('[Public API] Error listing measures:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
