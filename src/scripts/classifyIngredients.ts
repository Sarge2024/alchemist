import { PrismaClient } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("ERRO: GEMINI_API_KEY não encontrada no arquivo .env");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview", generationConfig: { responseMimeType: "application/json" } });

const TAXONOMY = `
1. Mercearia (Secos e Molhados)
- Mercearia Salgada (Básica)
- Enlatados e Conservas
- Condimentos e Molhos
- Mercearia Doce
- Matinais

2. Perecíveis e Frescos
- Hortifrúti (FLV - Frutas, Legumes e Verduras)
- Padaria e Confeitaria

3. Açougue
- Carnes
- Linguiça
- Defumados

4. Refrigerados
- Embutidos
- Laticínios
- Frutos do mar

5. Congelados
- Pratos Prontos
- Vegetais Congelados
- Sorvetes e Sobremesas

6. Bebidas
- Não Alcoólicas
- Alcoólicas

7. Saudáveis / Diet e Light (Nicho)
- Alimentos Especiais
`;

const PROMPT_TEMPLATE = `
Você é um especialista em classificação de produtos de supermercado.
Abaixo está uma lista de ingredientes e a taxonomia permitida.

Taxonomia:
${TAXONOMY}

Por favor, classifique os seguintes ingredientes no melhor Departamento (Categoria) e Setor (Subcategoria) usando ESTRITAMENTE a taxonomia acima. Retorne a resposta como um array JSON onde cada objeto tem o id do ingrediente, "category" (Departamento) e "subcategory" (Setor).

Ingredientes a classificar:
`;

async function classifyBatch(ingredients: any[]) {
  const ingredientsText = ingredients.map(i => `ID: ${i.id} | Nome: ${i.name}`).join('\n');
  const prompt = PROMPT_TEMPLATE + ingredientsText;
  
  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    return parsed;
  } catch (err) {
    console.error("Erro na chamada do Gemini:", err);
    return [];
  }
}

async function main() {
  console.log("Iniciando classificação automática de ingredientes...");
  const ingredients = await prisma.globalFoodItem.findMany({
    where: {
      OR: [
        { category: null },
        { subcategory: null }
      ]
    },
    select: { id: true, name: true }
  });

  console.log(`Encontrados ${ingredients.length} ingredientes para classificar.`);

  const BATCH_SIZE = 50;
  
  for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
    const batch = ingredients.slice(i, i + BATCH_SIZE);
    console.log(`Processando lote ${i / BATCH_SIZE + 1} de ${Math.ceil(ingredients.length / BATCH_SIZE)}...`);
    
    const classifications = await classifyBatch(batch);
    
    for (const item of classifications) {
      if (item.id && item.category && item.subcategory) {
        // Normaliza os nomes para garantir que não existam problemas de aspas ou formatação
        await prisma.globalFoodItem.update({
          where: { id: item.id },
          data: {
            category: item.category,
            subcategory: item.subcategory
          }
        });
      }
    }
    
    console.log(`Lote ${i / BATCH_SIZE + 1} concluído.`);
  }

  console.log("Classificação finalizada com sucesso!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
