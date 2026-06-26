export const solidWeights: Record<string, number> = {
  'farinha de trigo': 120,
  'açúcar refinado': 180,
  'acucar refinado': 180,
  'açúcar mascavo': 140,
  'acucar mascavo': 140,
  'açúcar': 180,
  'acucar': 180,
  'manteiga': 200,
  'margarina': 200,
  'chocolate em pó': 100,
  'cacau em pó': 100,
  'amido de milho': 100,
  'arroz': 200,
};

export const unitWeights: Record<string, number> = {
  'ovo': 50,
  'cebola': 125,
  'tomate': 135,
  'batata': 165,
  'dente de alho': 4,
  'dentes de alho': 4,
  'limão': 35,
  'laranja': 70,
  'banana': 95,
};

export const formatScaledNumber = (num: number): string => {
  if (Number.isInteger(num)) return num.toString();
  const fractionMap: Record<string, string> = {
    '0.25': '1/4',
    '0.5': '1/2',
    '0.75': '3/4',
    '0.33': '1/3',
    '0.66': '2/3',
    '0.125': '1/8'
  };
  const whole = Math.floor(num);
  const remainder = num - whole;
  
  for (const [decStr, fracStr] of Object.entries(fractionMap)) {
    if (Math.abs(remainder - parseFloat(decStr)) < 0.05) {
      if (whole > 0) return `${whole} ${fracStr}`;
      return fracStr;
    }
  }
  return num.toFixed(1).replace('.0', '').replace('.', ',');
};

export const findUnitEquivalent = (ingredientName: string, grams: number): string | null => {
  const normalized = ingredientName.toLowerCase();
  for (const [key, weightCup] of Object.entries(solidWeights)) {
    if (normalized.includes(key)) {
      const cups = grams / weightCup;
      if (cups >= 0.25) {
        // Find nearest common fraction for cups
        const nearestCup = Math.round(cups * 4) / 4;
        if (nearestCup > 0) {
          return `${formatScaledNumber(nearestCup)} xícara${nearestCup > 1 ? 's' : ''}`;
        }
      }
      
      const weightSpoon = weightCup / 16;
      const spoons = Math.round(grams / weightSpoon);
      if (spoons > 0) {
        return `${spoons} colher${spoons > 1 ? 'es' : ''} de sopa`;
      }
    }
  }
  return null;
};

export const findGramEquivalent = (ingredientName: string, scaledValue: number, unit: string): string | null => {
  const normalized = ingredientName.toLowerCase();
  const normalizedUnit = unit.toLowerCase().trim();

  // Se for unidade
  if (!normalizedUnit || normalizedUnit === 'unidade' || normalizedUnit === 'unidades' || normalizedUnit === 'unid' || normalizedUnit === 'dente' || normalizedUnit === 'dentes') {
    for (const [key, weight] of Object.entries(unitWeights)) {
      if (normalized.includes(key)) {
        return `(~${Math.round(scaledValue * weight)}g)`;
      }
    }
  }

  // Se for xícara
  if (normalizedUnit.includes('xícara') || normalizedUnit.includes('xicara')) {
    for (const [key, weight] of Object.entries(solidWeights)) {
      if (normalized.includes(key)) {
        return `(~${Math.round(scaledValue * weight)}g)`;
      }
    }
  }

  // Se for colher de sopa
  if (normalizedUnit.includes('colher de sopa') || normalizedUnit.includes('colheres de sopa') || normalizedUnit.includes('colher (sopa)')) {
    for (const [key, weight] of Object.entries(solidWeights)) {
      if (normalized.includes(key)) {
        const weightPerSpoon = weight / 16;
        return `(~${Math.round(scaledValue * weightPerSpoon)}g)`;
      }
    }
  }

  return null;
};

export const smartConvertUnit = (val: number, unit: string): { newVal: number, newUnit: string } => {
  const u = unit.toLowerCase().trim();
  
  const replaceUnit = (oldUnit: RegExp, replacement: string) => unit.replace(oldUnit, replacement);

  if (u.match(/^colher(?:es)? de ch[aá]/)) {
    if (val >= 3) {
      const s = val / 3;
      return { newVal: s, newUnit: replaceUnit(/colher(?:es)? de ch[aá]/i, s > 1 ? 'colheres de sopa' : 'colher de sopa') };
    }
  }

  if (u.match(/^colher(?:es)? \(?sopa\)?/) || u.match(/^colher(?:es)? de sopa/)) {
    if (val >= 16) {
      const x = val / 16;
      return { newVal: x, newUnit: replaceUnit(/colher(?:es)? \(?sopa\)?|colher(?:es)? de sopa/i, x > 1 ? 'xícaras' : 'xícara') };
    }
    if (val === 8) {
      return { newVal: 0.5, newUnit: replaceUnit(/colher(?:es)? \(?sopa\)?|colher(?:es)? de sopa/i, 'xícara') };
    }
    if (val === 4) {
      return { newVal: 0.25, newUnit: replaceUnit(/colher(?:es)? \(?sopa\)?|colher(?:es)? de sopa/i, 'xícara') };
    }
    if (val === 12) {
      return { newVal: 0.75, newUnit: replaceUnit(/colher(?:es)? \(?sopa\)?|colher(?:es)? de sopa/i, 'xícara') };
    }
  }

  if (u.match(/^x[ií]cara/)) {
    if (val === 0.25) {
      return { newVal: 4, newUnit: replaceUnit(/x[ií]cara(?:s)?/i, 'colheres de sopa') };
    }
    if (val === 0.125) {
      return { newVal: 2, newUnit: replaceUnit(/x[ií]cara(?:s)?/i, 'colheres de sopa') };
    }
  }

  return { newVal: val, newUnit: unit };
};
