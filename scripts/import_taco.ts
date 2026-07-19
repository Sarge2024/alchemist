import fs from 'fs';
import path from 'path';
import { prisma } from '../src/infra/prisma/client';

const parseNumber = (val: string): number | null => {
  if (!val || val.trim() === '' || val.trim() === 'NA' || val.trim() === 'Tr' || val.trim() === '*') {
    return null;
  }
  return parseFloat(val.replace(/"/g, '').replace(',', '.'));
};

const parseString = (val: string): string => {
  return val ? val.replace(/^"|"$/g, '').trim() : '';
};

async function main() {
  const filePath = path.resolve(process.cwd(), 'docs/Taco-4a-Edicao - Página1.csv');
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  
  const lines = fileContent.split('\n').filter(line => line.trim() !== '');
  
  // Skip first 2 lines (headers)
  const dataLines = lines.slice(2);
  
  let inserted = 0;
  
  for (const line of dataLines) {
    // split by comma, respecting quotes
    const columns = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    if (columns.length < 50) continue; // Skip incomplete lines
    
    const idStr = parseString(columns[0]);
    const id = parseInt(idStr, 10);
    
    if (isNaN(id)) continue;
    
    const data = {
      id: id,
      categoryName: parseString(columns[1]),
      description: parseString(columns[2]),
      umidade: parseNumber(columns[3]),
      energia_kcal: parseNumber(columns[4]),
      energia_kj: parseNumber(columns[5]),
      proteina: parseNumber(columns[6]),
      lipideos: parseNumber(columns[7]),
      colesterol: parseNumber(columns[8]),
      carboidrato: parseNumber(columns[9]),
      fibra_alimentar: parseNumber(columns[10]),
      cinzas: parseNumber(columns[11]),
      calcio: parseNumber(columns[12]),
      magnesio: parseNumber(columns[13]),
      manganes: parseNumber(columns[14]),
      fosforo: parseNumber(columns[15]),
      ferro: parseNumber(columns[16]),
      sodio: parseNumber(columns[17]),
      potassio: parseNumber(columns[18]),
      cobre: parseNumber(columns[19]),
      zinco: parseNumber(columns[20]),
      retinol: parseNumber(columns[21]),
      re: parseNumber(columns[22]),
      rae: parseNumber(columns[23]),
      tiamina: parseNumber(columns[24]),
      riboflavina: parseNumber(columns[25]),
      piridoxina: parseNumber(columns[26]),
      niacina: parseNumber(columns[27]),
      vitamina_c: parseNumber(columns[28]),
      saturados: parseNumber(columns[29]),
      monoinsaturados: parseNumber(columns[30]),
      poliinsaturados: parseNumber(columns[31]),
      acidos_graxos_12_0: parseNumber(columns[32]),
      acidos_graxos_14_0: parseNumber(columns[33]),
      acidos_graxos_16_0: parseNumber(columns[34]),
      acidos_graxos_18_0: parseNumber(columns[35]),
      acidos_graxos_20_0: parseNumber(columns[36]),
      acidos_graxos_22_0: parseNumber(columns[37]),
      acidos_graxos_24_0: parseNumber(columns[38]),
      // 39 is 'Número do alimento', skip
      acidos_graxos_14_1: parseNumber(columns[40]),
      acidos_graxos_16_1: parseNumber(columns[41]),
      acidos_graxos_18_1: parseNumber(columns[42]),
      acidos_graxos_20_1: parseNumber(columns[43]),
      acidos_graxos_18_2_n6: parseNumber(columns[44]),
      acidos_graxos_18_3_n3: parseNumber(columns[45]),
      acidos_graxos_20_4: parseNumber(columns[46]),
      acidos_graxos_20_5: parseNumber(columns[47]),
      acidos_graxos_22_5: parseNumber(columns[48]),
      acidos_graxos_22_6: parseNumber(columns[49]),
      acidos_graxos_18_1t: parseNumber(columns[50]),
    };
    
    await prisma.tacoIngredient.upsert({
      where: { id: data.id },
      update: data,
      create: data,
    });
    
    inserted++;
  }
  
  console.log(`Successfully imported ${inserted} ingredients from TACO CSV.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
