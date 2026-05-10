/**
 * POST /api/fetch-html
 * 
 * Vercel Serverless Function para buscar o HTML de uma URL (proxy).
 * Suporta Firecrawl (se configurado) ou fetch padrão com JSDOM para limpeza.
 * 
 * @layer Infrastructure (Serverless)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { JSDOM } from "jsdom";
import FirecrawlApp from "@mendable/firecrawl-js";

/**
 * Middleware de autenticação via API Key.
 */
function authenticateRequest(req: VercelRequest): boolean {
  const apiKey = process.env.APP_API_KEY;

  // Em modo dev ou sem chave configurada, libera acesso
  if (!apiKey || apiKey === "" || apiKey === "your_app_api_key_here") {
    return true;
  }

  const clientKey = req.headers["x-api-key"];
  return clientKey === apiKey;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Habilita CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-api-key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido. Use POST." });
  }

  if (!authenticateRequest(req)) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing API Key" });
  }

  let { url } = req.body || {};
  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  // Normalização básica de URL
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    // Validar formato de URL
    new URL(url);

    // Inicializa Firecrawl se a chave estiver disponível
    const firecrawlKey = process.env.FIRECRAWL_API_KEY;
    const firecrawl = (firecrawlKey && firecrawlKey !== "" && firecrawlKey !== "your_firecrawl_api_key_here") 
      ? new FirecrawlApp({ apiKey: firecrawlKey }) 
      : null;

    if (firecrawl) {
      console.log(`[Fetch Serverless] Usando Firecrawl para: ${url}`);
      try {
        const scrapeResult = await firecrawl.scrape(url, {
          formats: ["html"],
          onlyMainContent: true
        }) as any;

        if (scrapeResult && (scrapeResult.html || scrapeResult.markdown)) {
          return res.status(200).json({
            success: true,
            html: scrapeResult.html || scrapeResult.markdown,
            metaDescription: scrapeResult.metadata?.description || "",
            ogImage: scrapeResult.metadata?.ogImage || scrapeResult.metadata?.image || "",
            allImagesFound: scrapeResult.metadata?.images || []
          });
        }
      } catch (fError) {
        console.warn("[Fetch Serverless] Firecrawl falhou, tentando fetch manual:", fError);
      }
    }

    // Fallback: Fetch manual
    console.log(`[Fetch Serverless] Usando fetch manual para: ${url}`);
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      }
    });

    if (!response.ok) {
      return res.status(200).json({ 
        success: false, 
        status: response.status,
        error: response.status === 403 ? "site_blocked" : "fetch_failed"
      });
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Extrair imagens prováveis
    const allImagesFound: string[] = [];
    doc.querySelectorAll('img').forEach(img => {
      const src = img.getAttribute('src') || img.getAttribute('data-src') || img.getAttribute('srcset')?.split(' ')[0];
      if (src && src.startsWith('http') && !src.includes('logo') && !src.includes('icon')) {
        if (src.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
          allImagesFound.push(src);
        }
      }
    });
    const uniqueImages = Array.from(new Set(allImagesFound)).slice(0, 15);

    // Limpeza rápida
    const scripts = doc.querySelectorAll('script, style, nav, footer, iframe, noscript, header, svg');
    scripts.forEach(s => s.remove());

    return res.status(200).json({ 
      success: true,
      html: doc.body.innerHTML?.substring(0, 50000), 
      metaDescription: doc.querySelector('meta[name="description"]')?.getAttribute('content') || "",
      ogImage: doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || "",
      allImagesFound: uniqueImages
    });

  } catch (error: any) {
    console.error("[Fetch Serverless] Erro ao buscar HTML:", error);
    return res.status(200).json({ 
      success: false, 
      error: "Falha ao buscar o conteúdo da URL. Verifique o link e tente novamente." 
    });
  }
}
