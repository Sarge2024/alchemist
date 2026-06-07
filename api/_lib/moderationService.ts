/**
 * moderationService (Vercel Serverless)
 *
 * Versão serverless do serviço de moderação por IA para o Lounge Gastronômico.
 * Utiliza o Gemini 3 Flash Preview para classificação de conteúdo culinário.
 *
 * @layer Infrastructure (Serverless)
 */
import { GoogleGenAI } from "@google/genai";

/**
 * Analisa o texto da mensagem e determina se é pertinente à gastronomia.
 *
 * @param text Conteúdo da mensagem a ser validado.
 * @returns Retorna 'approved' se pertinente, 'rejected' caso contrário.
 */
export async function validateCulinaryRelevance(text: string): Promise<"approved" | "rejected"> {
  const lowerText = text.toLowerCase();
  // Mensagens chamando o bot são sempre aprovadas
  if (
    lowerText.includes('@alchemist') || 
    lowerText.includes('@copilot') || 
    lowerText.includes('@chef') || 
    lowerText.includes('@alquimista')
  ) {
    return 'approved';
  }

  const apiKey = process.env.GEMINI_API_KEY;

  // Caso a chave não esteja configurada, aprova por padrão (fail-open para dev)
  if (!apiKey || apiKey === "" || apiKey === "your_gemini_api_key_here") {
    console.warn("[Moderation Serverless] GEMINI_API_KEY não configurada. Aprovando por padrão.");
    return "approved";
  }

  try {
    const client = new GoogleGenAI({ apiKey });

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

    const response = await client.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const responseText = (response.text || "").trim().toLowerCase();

    // Retorna 'approved' se a IA contiver a palavra, caso contrário 'rejected'
    return responseText.includes("approved") ? "approved" : "rejected";
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[Moderation Serverless] Falha na análise do Gemini:", errorMessage);

    // Em caso de erro técnico na IA, aprovamos para não bloquear a experiência do usuário
    return "approved";
  }
}
