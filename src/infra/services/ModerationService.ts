import { GoogleGenAI } from "@google/genai";
import { getAvailableGeminiKeys, isQuotaExhaustedError } from "./geminiKeyManager";

/**
 * ModerationService
 * 
 * Serviço responsável por validar a pertinência de conteúdos postados no Lounge.
 * Utiliza o modelo Gemini 1.5 Flash para análise semântica.
 * 
 * @layer Infrastructure
 */
export const ModerationService = {
  
  /**
   * Analisa o texto da mensagem e determina se é relacionado à gastronomia.
   * 
   * @param text Conteúdo da mensagem a ser validado.
   * @returns Retorna 'approved' se for pertinente, 'rejected' caso contrário.
   */
  async validateCulinaryRelevance(text: string): Promise<'approved' | 'rejected'> {
    const apiKeys = getAvailableGeminiKeys();

    // Caso nenhuma chave esteja configurada, aprovamos por padrão (fail-open)
    if (apiKeys.length === 0) {
      console.warn("[Moderation] Nenhuma GEMINI_API_KEY configurada. Aprovando mensagem por padrão.");
      return 'approved';
    }

    const prompt = `
      Você é um moderador do "Lounge Gastronômico" da Alquimia do Prato.
      Sua tarefa é validar se a mensagem de um usuário é pertinente ao universo da gastronomia, 
      culinária, herança cultural alimentar ou técnicas de cozinha.
      
      Mensagem do Usuário: "${text}"
      
      REGRAS DE CLASSIFICAÇÃO:
      1. "approved": Assuntos de comida, receitas, ingredientes, técnicas, história da culinária ou dicas de cozinha.
      2. "rejected": Spam, ofensas, política, ódio, ou qualquer assunto totalmente desconexo da gastronomia.
      
      RETORNO: Responda APENAS com a palavra "approved" ou "rejected". Não adicione explicações.
    `;

    for (let i = 0; i < apiKeys.length; i++) {
      const apiKey = apiKeys[i];
      try {
        const client = new GoogleGenAI({ apiKey });
        
        const response = await client.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt
        });
        
        const responseText = (response.text || "").trim().toLowerCase();
        return responseText.includes('approved') ? 'approved' : 'rejected';

      } catch (error: any) {
        if (isQuotaExhaustedError(error) && i < apiKeys.length - 1) {
          console.warn(`[Moderation] Cota da chave ${i + 1} atingida. Rotacionando para chave ${i + 2}...`);
          continue;
        }
        
        console.error("[Moderation Error] Falha crítica na análise do Gemini:", error.message || error);
        // Em caso de erro técnico na IA, aprovamos para não bloquear a experiência do usuário
        return 'approved'; 
      }
    }

    return 'approved';
  }
};

