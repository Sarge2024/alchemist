const simulate = (val, basePortions, activePortions) => {
    const multiplier = activePortions / basePortions;
    const targetWeight = val * 50 * multiplier;
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
    
    console.log(`Val: ${val}, Base: ${basePortions}, Active: ${activePortions} -> Multiplier: ${multiplier}, TargetWeight: ${targetWeight}g -> ${bestCount} ovo(s) ${bestAdjective}`);
}

simulate(1, 4, 4);
simulate(1, 4, 2);
simulate(1, 4, 6);
simulate(1, 4, 8);
simulate(1, 4, 10);
