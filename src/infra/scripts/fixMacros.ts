import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { GoogleGenAI } from '@google/genai';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

// Setup Prisma Client explicitly for the script
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Conectando ao banco de dados...");
  
  // Buscar itens zerados (ou com calorias e proteínas 0)
  const items = await prisma.globalFoodItem.findMany({
    where: { 
      calories: 0,
      protein: 0
    },
    select: { id: true, name: true, source: true }
  });

  console.log(`Encontrados ${items.length} itens sem macronutrientes.`);

  if (items.length === 0) {
    console.log("Nenhum item precisa de atualização.");
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const client = new GoogleGenAI({ apiKey });

  // Processar em pequenos lotes para não estourar tokens do LLM
  const batchSize = 15;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    console.log(`\nProcessando lote ${i / batchSize + 1} de ${Math.ceil(items.length / batchSize)}...`);

    const namesList = batch.map(item => `- ${item.name}`).join('\n');
    const prompt = `
      Você é um especialista em nutrição e tabela TACO/USDA.
      Por favor, forneça as informações nutricionais médias (Calorias, Proteínas, Carboidratos e Gorduras/Lipídios)
      para 100g de cada um dos seguintes ingredientes:
      
      ${namesList}
      
      RETORNE APENAS UM ARRAY JSON VÁLIDO contendo objetos com o formato exato abaixo, sem markdown, sem explicações:
      [
        {
          "name": "nome do ingrediente exatamente como enviado",
          "calories": número,
          "protein": número,
          "carbohydrates": número,
          "lipids": número
        }
      ]
      Valores devem ser em gramas (g) ou calorias (kcal) correspondentes a uma porção de 100g.
      Se for sal ou água, retorne 0 para os macros apropriados.
    `;

    try {
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });

      const text = result.text || "";
      const jsonMatch = text.match(/\[\s*\{[\s\S]*\}\s*\]/);
      
      if (!jsonMatch) {
        console.error("Falha ao extrair JSON da resposta:", text);
        continue;
      }

      const parsedData = JSON.parse(jsonMatch[0]);

      for (const data of parsedData) {
        const itemToUpdate = batch.find(b => b.name.toLowerCase() === data.name.toLowerCase());
        
        if (itemToUpdate) {
          await prisma.globalFoodItem.update({
            where: { id: itemToUpdate.id },
            data: {
              calories: Number(data.calories) || 0,
              protein: Number(data.protein) || 0,
              carbohydrates: Number(data.carbohydrates) || 0,
              lipids: Number(data.lipids) || 0,
              source: "GEMINI_AI"
            }
          });
          console.log(`✅ Atualizado: ${itemToUpdate.name} (${data.calories} kcal)`);
        }
      }
      
      // Pequeno delay para respeitar rate limits (se houver)
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.error(`Erro ao processar o lote:`, err);
    }
  }

  console.log("\nProcesso concluído!");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
