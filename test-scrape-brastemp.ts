import { geminiService } from './src/infra/services/geminiService.ts';
import { getAvailableGeminiKeys } from './src/infra/services/geminiKeyManager.ts';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = "https://www.brastemp.com.br/experience/gastronomia/steak-tartare-receita-de-tartar/";
  console.log("Fetching HTML...");
  
  try {
    const response = await fetch("http://localhost:4005/api/fetch-html", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': process.env.APP_API_KEY || ''
      },
      body: JSON.stringify({ url })
    });
    
    const data = await response.json();
    console.log("Proxy response success:", data.success);
    if (!data.success) {
      console.log("Proxy Error:", data.error);
    }
    
    console.log("HTML length:", data.html?.length || 0);
    console.log("Images found:", data.allImagesFound?.length || 0);

    console.log("\nStarting Gemini extraction...");
    const res = await geminiService.extractRecipeFromHtml(data.html || "", { 
      url, 
      metaDescription: data.metaDescription, 
      ogImage: data.ogImage, 
      allImagesFound: data.allImagesFound 
    });
    console.log("\nResult Title:", res.title);
    console.log("Result Ingredients Count:", res.ingredients?.length);
    console.log("Result Image Options:", res.imageOptions?.length);
  } catch(e) {
    console.error("Error during extraction:", e);
  }
}
run();
