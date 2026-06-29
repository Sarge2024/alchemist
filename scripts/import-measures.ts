import { prisma } from '../src/infra/prisma/client';
import fs from 'fs';
import readline from 'readline';
import path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Categorias padrão (Enum) que vamos extrair da planilha
// A planilha tem textos livres, tentaremos classificar nelas
const MEASURE_ALIASES: Record<string, string[]> = {
  'XICARA': ['XICARA', 'XÍCARA'],
  'COLHER_SOPA': ['COLHER DE SOPA', 'COLHER SOPA', 'C.S.'],
  'COLHER_CHA': ['COLHER DE CHÁ', 'COLHER DE CHA', 'C.CHÁ', 'C.CHA'],
  'COLHER_SOBREMESA': ['COLHER DE SOBREMESA', 'C.SOBREMESA'],
  'COLHER_CAFE': ['COLHER DE CAFÉ', 'COLHER DE CAFE', 'C.CAFÉ', 'C.CAFE'],
  'UNIDADE': ['UNIDADE', 'UNID', 'UND'],
  'COPO': ['COPO'],
  'POTE': ['POTE'],
  'PRATO': ['PRATO'],
  'FATIA': ['FATIA'],
  'CONCHA': ['CONCHA'],
  'RAMO': ['RAMO', 'FOLHA']
};

function normalizeMeasureName(rawMeasure: string): string {
  const upper = rawMeasure.toUpperCase();
  for (const [standard, aliases] of Object.entries(MEASURE_ALIASES)) {
    for (const alias of aliases) {
      if (upper.includes(alias)) {
        // Preserva o nome padronizado
        return standard;
      }
    }
  }
  // Se não encontrou uma regra clara, retorna o texto limpo
  return rawMeasure.trim().toUpperCase();
}

async function main() {
  const csvPath = '/tmp/alimentos.csv';
  
  if (!fs.existsSync(csvPath)) {
    console.error(`Arquivo não encontrado: ${csvPath}`);
    process.exit(1);
  }

  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  console.log('Iniciando importação de medidas culinárias...');
  let count = 0;

  for await (const line of rl) {
    if (!line || line.trim() === '') continue;
    
    // Ignora cabeçalhos se existirem (verificação simples)
    if (line.toLowerCase().includes('alimento,') && line.toLowerCase().includes('medida')) {
      continue;
    }

    // Usando regex simples para parsear o CSV, pois os nomes podem ter aspas ou vírgulas
    // Formato esperado: ABACATE,1/2 UNIDADE MÉDIA,215 g
    // Como a planilha é bem estruturada por campos separados por vírgula e aspas para strings com vírgula:
    
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    if (parts.length < 3) continue;

    let ingredientName = parts[0].replace(/^"|"$/g, '').trim().toUpperCase();
    let rawMeasure = parts[1].replace(/^"|"$/g, '').trim();
    let rawWeight = parts[2].replace(/^"|"$/g, '').trim().toLowerCase();

    // Limpa o peso (ex: "215 g" -> 215, "5,7 g" -> 5.7)
    rawWeight = rawWeight.replace(' g', '').replace(',', '.');
    let weightInGrams = parseFloat(rawWeight);

    if (isNaN(weightInGrams)) {
      console.warn(`[AVISO] Peso inválido para ${ingredientName} - ${rawMeasure}: ${rawWeight}`);
      continue;
    }

    // Ocasionalmente a medida pode estar fracionada: "1/2 UNIDADE MÉDIA".
    // Precisamos ajustar o peso para 1 unidade inteira se formos padronizar como "UNIDADE".
    // Mas para manter a máxima fidelidade no início, vamos classificar a medida
    const measureName = normalizeMeasureName(rawMeasure);

    // Ajuste matemático de frações na string crua
    if (rawMeasure.includes('1/2')) weightInGrams *= 2;
    else if (rawMeasure.includes('1/3')) weightInGrams *= 3;
    else if (rawMeasure.includes('1/4')) weightInGrams *= 4;

    try {
      await prisma.culinaryMeasure.upsert({
        where: {
          ingredientName_measureName: {
            ingredientName,
            measureName
          }
        },
        update: {
          weightInGrams
        },
        create: {
          ingredientName,
          measureName,
          weightInGrams
        }
      });
      count++;
      if (count % 100 === 0) {
        console.log(`Processados ${count} registros...`);
      }
    } catch (error: any) {
      console.error(`Erro ao salvar ${ingredientName} - ${measureName}: ${error.message}`);
    }
  }

  console.log(`\nImportação concluída! Total de ${count} registros salvos.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
