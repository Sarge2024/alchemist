/**
 * geminiKeyManager
 * 
 * Centraliza o gerenciamento de múltiplas chaves de API do Google Gemini.
 * Suporta rotação automática para contornar limites de cota (429 - RESOURCE_EXHAUSTED).
 * 
 * Compatível com Node.js (Express) e Browser (Vite).
 */

export function getAvailableGeminiKeys(): string[] {
  const keys: string[] = [];
  
  // 1. Chaves sequenciais (formato organizado: GEMINI_API_KEY_1 até 10)
  // Nota: Listamos explicitamente para que o compilador/bundler (Vite) possa substituir via 'define'
  const rawKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
    process.env.GEMINI_API_KEY_9,
    process.env.GEMINI_API_KEY_10,
    // Fallback para import.meta.env caso o bundler suporte mas o define falhe
    // @ts-ignore
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY_1),
    // @ts-ignore
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY_2),
  ];

  for (const k of rawKeys) {
    if (k && typeof k === 'string' && k.trim().length > 0 && k !== "null" && k !== "undefined" && !keys.includes(k.trim())) {
      keys.push(k.trim());
    }
  }

  // 2. Chaves separadas por vírgula (formato flexível)
  const envKeysList = process.env.GEMINI_API_KEYS || "";
  if (envKeysList && envKeysList !== "null" && envKeysList !== "undefined") {
    keys.push(...envKeysList.split(',').map(k => k.trim()).filter(k => k.length > 0 && !keys.includes(k)));
  }

  // 3. Chave padrão (fallback)
  const defaultKey = process.env.GEMINI_API_KEY;
  if (defaultKey && defaultKey.trim().length > 0 && defaultKey !== "null" && defaultKey !== "undefined" && !keys.includes(defaultKey.trim())) {
    keys.push(defaultKey.trim());
  }

  return keys;
}

/**
 * Helper para verificar se um erro é relacionado a excesso de cota.
 */
export function isQuotaExhaustedError(error: any): boolean {
  const status = error?.status || error?.response?.status;
  const message = error?.message?.toLowerCase() || "";
  const reason = error?.response?.data?.error?.status || "";

  return Number(status) === 429 || 
         status === "RESOURCE_EXHAUSTED" || 
         reason === "RESOURCE_EXHAUSTED" ||
         message.includes("429") || 
         message.includes("quota") ||
         message.includes("exhausted");
}
