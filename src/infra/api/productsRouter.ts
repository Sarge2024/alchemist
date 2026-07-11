import { Router, Request, Response } from 'express';
import { prisma } from '../prisma/client';

export const productsRouter = Router();

// User-Agent obrigatório para a API do Open Food Facts
const OFF_USER_AGENT = 'AlchemistWeb/1.0 (https://alchemist-web.app)';

// ──────────────────────────────────────────────────────────
// GET /barcode/:ean — Busca produto pelo código de barras
// ──────────────────────────────────────────────────────────
productsRouter.get('/barcode/:ean', async (req: Request, res: Response) => {
  try {
    const { ean } = req.params;

    if (!ean || ean.length < 8) {
      return res.status(400).json({ error: 'Código de barras inválido. Mínimo 8 dígitos.' });
    }

    // 1. Busca no cache local
    const cached = await prisma.globalFoodItem.findFirst({
      where: { barcode: ean }
    });

    if (cached) {
      return res.json({
        success: true,
        source: 'cache',
        product: formatProduct(cached)
      });
    }

    // 2. Consulta Open Food Facts
    const offUrl = `https://world.openfoodfacts.org/api/v2/product/${ean}?fields=product_name,brands,image_url,nutriments,allergens_tags,serving_size,serving_quantity`;
    
    const offResponse = await globalThis.fetch(offUrl, {
      headers: { 'User-Agent': OFF_USER_AGENT }
    });

    if (!offResponse.ok) {
      return res.status(404).json({ success: false, error: 'Produto não encontrado na base Open Food Facts.' });
    }

    const offData: any = await offResponse.json();

    if (offData.status !== 1 || !offData.product) {
      return res.status(404).json({ success: false, error: 'Produto não encontrado na base Open Food Facts.' });
    }

    const p = offData.product;
    const nutriments = p.nutriments || {};

    // Parseia porção
    let portionSize = 100;
    let portionUnit = 'g';
    if (p.serving_quantity) {
      portionSize = parseFloat(p.serving_quantity) || 100;
    }
    if (p.serving_size) {
      const match = p.serving_size.match(/([\d.,]+)\s*(g|ml|kg|l)/i);
      if (match) {
        portionSize = parseFloat(match[1].replace(',', '.')) || 100;
        portionUnit = match[2].toLowerCase();
      }
    }

    // Parseia alérgenos
    const allergens: string[] = (p.allergens_tags || []).map((tag: string) =>
      tag.replace('en:', '').replace(/-/g, ' ')
    );

    // 3. Persiste no banco local
    const productName = p.product_name || `Produto ${ean}`;
    const brandName = p.brands || null;

    const created = await prisma.globalFoodItem.create({
      data: {
        name: brandName ? `${productName} (${brandName})` : productName,
        brand: brandName,
        barcode: ean,
        source: 'OFF',
        externalId: ean,
        calories: nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0,
        protein: nutriments['proteins_100g'] || nutriments['proteins'] || 0,
        carbohydrates: nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || 0,
        lipids: nutriments['fat_100g'] || nutriments['fat'] || 0,
        baseQuantity: 100,
        baseUnit: 'g',
        portionSize,
        portionUnit,
        imageUrl: p.image_url || null,
        allergens,
        micronutrients: {
          fiber: nutriments['fiber_100g'] || 0,
          sodium: nutriments['sodium_100g'] || 0,
          sugars: nutriments['sugars_100g'] || 0,
          saturated_fat: nutriments['saturated-fat_100g'] || 0
        }
      }
    });

    return res.json({
      success: true,
      source: 'openfoodfacts',
      product: formatProduct(created)
    });
  } catch (error: any) {
    // Se o erro for de unique constraint (produto já existe com outro barcode/nome)
    if (error.code === 'P2002') {
      // Tenta buscar o existente
      const existing = await prisma.globalFoodItem.findFirst({
        where: { barcode: req.params.ean }
      });
      if (existing) {
        return res.json({ success: true, source: 'cache', product: formatProduct(existing) });
      }
    }
    console.error('[Products API] Erro ao buscar por barcode:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao buscar produto.' });
  }
});

// ──────────────────────────────────────────────────────────
// POST / — Cadastro manual de produto
// ──────────────────────────────────────────────────────────
productsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { name, brand, barcode, calories, protein, carbohydrates, lipids, portionSize, portionUnit, imageUrl, allergens, price, totalPackageSize, totalPackageUnit } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
    }

    const created = await prisma.globalFoodItem.create({
      data: {
        name: brand ? `${name} (${brand})` : name,
        brand: brand || null,
        barcode: barcode || null,
        source: 'MANUAL',
        calories: parseFloat(calories) || 0,
        protein: parseFloat(protein) || 0,
        carbohydrates: parseFloat(carbohydrates) || 0,
        lipids: parseFloat(lipids) || 0,
        baseQuantity: 100,
        baseUnit: 'g',
        portionSize: parseFloat(portionSize) || 100,
        portionUnit: portionUnit || 'g',
        imageUrl: imageUrl || null,
        allergens: allergens || [],
        estimatedPrice: price !== undefined && price !== null ? parseFloat(price) : null,
        standardPurchaseQuantity: totalPackageSize !== undefined && totalPackageSize !== null ? parseFloat(totalPackageSize) : null,
        standardPurchaseUnit: totalPackageUnit || null
      }
    });

    res.status(201).json({
      success: true,
      product: formatProduct(created)
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, error: 'Produto com este nome ou código de barras já existe.' });
    }
    console.error('[Products API] Erro ao cadastrar produto:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao cadastrar produto.' });
  }
});

// ──────────────────────────────────────────────────────────
// GET / — Listar produtos cadastrados (OFF + MANUAL)
// ──────────────────────────────────────────────────────────
productsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const { search, page = '1', limit = '20' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      source: { in: ['OFF', 'MANUAL'] }
    };

    if (search && typeof search === 'string' && search.trim().length > 0) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { brand: { contains: search.trim(), mode: 'insensitive' } },
        { barcode: { contains: search.trim() } }
      ];
    }

    const [items, total] = await Promise.all([
      prisma.globalFoodItem.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { name: 'asc' }
      }),
      prisma.globalFoodItem.count({ where })
    ]);

    res.json({
      success: true,
      data: items.map(formatProduct),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('[Products API] Erro ao listar produtos:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao listar produtos.' });
  }
});

// ──────────────────────────────────────────────────────────
// PATCH /:id — Atualiza preço e embalagem de um produto existente
// ──────────────────────────────────────────────────────────
productsRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { price, totalPackageSize, totalPackageUnit, imageUrl } = req.body;

    const updated = await prisma.globalFoodItem.update({
      where: { id },
      data: {
        estimatedPrice: price !== undefined && price !== null ? parseFloat(price) : undefined,
        standardPurchaseQuantity: totalPackageSize !== undefined && totalPackageSize !== null ? parseFloat(totalPackageSize) : undefined,
        standardPurchaseUnit: totalPackageUnit || undefined,
        imageUrl: imageUrl || undefined
      }
    });

    res.json({
      success: true,
      product: formatProduct(updated)
    });
  } catch (error) {
    console.error('[Products API] Erro ao atualizar produto:', error);
    res.status(500).json({ success: false, error: 'Erro interno ao atualizar produto.' });
  }
});

// ──────────────────────────────────────────────────────────
// Helper: Formata o GlobalFoodItem para o formato de resposta
// ──────────────────────────────────────────────────────────
function formatProduct(item: any) {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    barcode: item.barcode,
    image: item.imageUrl,
    portionSize: item.portionSize || 100,
    portionUnit: item.portionUnit || 'g',
    nutrition: {
      calories: item.calories,
      protein: item.protein,
      carbs: item.carbohydrates,
      fat: item.lipids
    },
    allergens: item.allergens || [],
    source: item.source,
    price: item.estimatedPrice || undefined,
    totalPackageSize: item.standardPurchaseQuantity || undefined,
    totalPackageUnit: item.standardPurchaseUnit || undefined
  };
}
