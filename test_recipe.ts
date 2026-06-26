const multiplyQuantityString = (quantity: string | undefined, ingredientName: string, multiplier: number, activePortions?: number): string => {
  if (!quantity) return '';
  const regex = /^(.*?)(\d+\s*(?:e\s*)?\d+\/\d+|\d+\/\d+|\d+(?:[,.]\d+)?)\s*(.*)$/i;
  const match = quantity.match(regex);
  if (!match) return quantity;
  const prefix = match[1] || '';
  const numStr = match[2];
  const unitStr = match[3] || '';
  let val = 0;
  if (numStr.includes('/')) {
    const parts = numStr.split(/e|\s/).map(p => p.trim()).filter(Boolean);
    if (parts.length === 2 && parts[1].includes('/')) {
      const whole = parseInt(parts[0], 10);
      const [n, d] = parts[1].split('/');
      val = whole + (parseInt(n, 10) / parseInt(d, 10));
    } else if (parts.length === 1 && parts[0].includes('/')) {
      const [n, d] = parts[0].split('/');
      val = parseInt(n, 10) / parseInt(d, 10);
    }
  } else {
    val = parseFloat(numStr.replace(',', '.'));
  }
  if (isNaN(val)) return quantity;
  let scaledVal = val * multiplier;
  let eggAdjective = '';
  const isEgg = /\bovos?\b/i.test(ingredientName) && 
                !/\b(clara|gema)s?\b/i.test(ingredientName) &&
                !/maltine/i.test(ingredientName);
                
  if (isEgg) {
    const targetWeight = val * 50 * multiplier;
    console.log("val:", val, "multiplier:", multiplier, "targetWeight:", targetWeight);
    const sizes = [
      { weight: 25, adjective: 'pequeno' },
      { weight: 50, adjective: '' },
      { weight: 75, adjective: 'grande' }
    ];
    let bestCount = Math.max(1, Math.round(targetWeight / 50));
    let bestAdjective = '';
    let minScore = Math.abs(bestCount * 50 - targetWeight) + (bestCount * 0.1);
    const minCount = Math.max(1, Math.floor(targetWeight / 75));
    const maxCount = Math.max(1, Math.ceil(targetWeight / 25));
    for (let c = minCount; c <= maxCount; c++) {
      for (const size of sizes) {
        const diff = Math.abs(c * size.weight - targetWeight);
        const penalty = (size.adjective === '' ? 0 : 3) + (c * 0.1);
        const score = diff + penalty;
        if (score < minScore) {
          minScore = score;
          bestCount = c;
          bestAdjective = size.adjective;
        }
      }
    }
    scaledVal = bestCount;
    eggAdjective = bestAdjective;
  }
  
  return `eggAdjective: ${eggAdjective}, scaledVal: ${scaledVal}`;
};

console.log(multiplyQuantityString("1", "ovo", 0.5));
console.log(multiplyQuantityString("1", "ovo", 0.25));
