import { GoogleGenAI } from "@google/genai";
import { Recipe } from "./recipeService";
import { getAvailableGeminiKeys, isQuotaExhaustedError } from "./geminiKeyManager";

/**
 * geminiService
 * 
 * Serviço especializado na extração e processamento de dados de receitas utilizando IA.
 * Responsável por converter HTML bruto ou URLs em objetos estruturados de receita.
 * 
 * @layer Infrastructure
 */
export const geminiService = {
  /**
   * Extrai dados de uma receita a partir de HTML ou URL.
   * Realiza a tradução, conversão de medidas e busca de imagens complementares.
   * 
   * @param html Conteúdo HTML da página (opcional se URL for fornecida).
   * @param options Metadados e URL para auxílio na extração.
   * @returns Objeto parcial de Receita sanitizado e pronto para o Firestore.
   */
  async extractRecipeFromHtml(html: string, options: { metaDescription?: string, ogImage?: string, allImagesFound?: string[], url?: string }): Promise<Partial<Recipe>> {

    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada");
    }

    // Verifica se recebemos apenas uma URL ou o HTML completo
    const isUrlOnly = !html || html.trim().length < 200;


    const basePrompt = `
      Você é um especialista em culinária, tradução e extração de dados. Extraia as informações da receita.
      
      REGRAS DE TRADUÇÃO E CONVERSÃO:
      1. IDIOMA: Se a fonte não for Português (PT-BR), TRADUZA tudo para Português do Brasil.
      2. MEDIDAS: Converta unidades imperiais (cups, oz, °F) para métricas (ml, g, °C) ou medidas comuns no Brasil (xícaras, colheres).
      
      REGRAS ESTRITAS DE RETORNO (JSON):
      - title, description.
      - momento (string[]): USE APENAS: 'Café da Manhã', 'Brunch', 'Almoço', 'Lanche / Chá da Tarde', 'Jantar', 'Ceia', 'Entradas', 'Básicas', 'Petiscos&Food Tricks', 'Bebidas'. (Pode ser mais de um).
      - tipo_prato (string[]): USE APENAS: 'Assados', 'Frituras', 'Grelhados', 'Sopas e Caldos', 'Cremes e Purés', 'Massas e Risotos', 'Saladas e Pratos Frios', 'Cozidos / Guisados', 'Padaria e Pastelaria', 'Bebidas', 'Doces e Sobremesas'.
      - base_alimento (string[]): USE APENAS: 'Carnes', 'Frutos do Mar', 'Vegetais e Legumes', 'Ovos e Laticínios', 'Grãos e Leguminosas'.
      - origem (string): USE PREFERENCIALMENTE: 'Latino-Americana', 'Brasileira', 'Mexicana', 'Argentina', 'Asiática', 'Japonesa', 'Chinesa', 'Tailandesa', 'Coreana', 'Indiana', 'Europeia', 'Italiana', 'Francesa', 'Portuguesa', 'Espanhola', 'Árabe / Médio Oriente', 'Americana'.
      - custo_estimado (string): USE: '$', '$$', '$$$', '$$$$'.
      - time (string): TEMPO TOTAL (ex: '45 min').
      - prepTime (string): TEMPO DE PREPARAÇÃO (ex: '15 min').
      - dietType (string): TIPO DE DIETA (USE EXATAMENTE UMA DESTAS: 'Convencional', 'Vegana', 'Vegetariana', 'Low Carb', 'Keto', 'Sem Glúten', 'Sem Lactose', 'Fit'). Se não houver restrição clara, use 'Convencional'.
      - difficulty (Fácil, Médio, Difícil), servings.
      - isClassic (boolean): Determine se esta é uma receita CLÁSSICA ou TRADICIONAL. Receitas clássicas são aquelas amplamente conhecidas, com origem histórica clara, herança cultural ou pratos icônicos (ex: Feijoada, Carbonara, Ratatouille). Se o texto descrever uma história de família ou herança, também marque como true.
      - ingredients (objeto[] com name, quantity e group). 
        REGRAS DE INGREDIENTES:
        - SEPARE OBRIGATORIAMENTE a quantidade (número + unidade) do nome (ex: "500g de Farinha" -> name: "Farinha", quantity: "500g").
        - EXTRAIA A QUANTIDADE EXATA DO TEXTO. Se o texto diz "2 ovos" ou "4 copos", use quantity: "2" e quantity: "4 copos".
        - NUNCA use "a gosto" a menos que esteja explicitamente escrito no texto.
        - Mantenha frações legíveis (ex: "1/2" em vez de "0.5") para facilitar a leitura.
        - NÃO repita a quantidade no nome.
        - REMOVA preposições conectoras (ex: "de", "do", "da") do início do nome quando possível.
        - O campo 'group' deve ser usado para separar partes da receita (ex: 'Massa', 'Recheio', 'Cobertura').
        - EXEMPLOS:
          - "4 copos de farinha" -> { quantity: "4 copos", name: "farinha" }
          - "2 ovos" -> { quantity: "2", name: "ovos" }
          - "1/2 copo de água" -> { quantity: "1/2 copo", name: "água" }
          - "sal a gosto" -> { quantity: "a gosto", name: "sal" }
        - instructions (string[]).
        - chefTips (string): Dicas adicionais, segredos do chef, variações da receita ou conselhos técnicos importantes. Procure por blocos de texto que contenham dicas, notas ou "Dica do Chef".
        - image, imageOptions (string[]).
    `;

    const contentPrompt = isUrlOnly 
      ? `Acesse e pesquise PROFUNDAMENTE os detalhes da receita no seguinte link: ${options.url}. 
         O site pode estar bloqueando acessos diretos, então use sua ferramenta de busca (Google Search) para encontrar o conteúdo desta URL exata ou de fontes que repliquem esta receita específica.
         Procure por: Título, Ingredientes, Modo de Preparo, Tempo e Imagens.
         Se for um petisco, quitute ou acompanhamento para coffee break, classifique como 'Petiscos&Food Tricks'.
         Se for uma entrada, antipasto ou couvert, classifique como 'Entradas'.
         Se for uma receita básica do cotidiano (arroz, feijão, molhos base), classifique como 'Básicas'.`
      : `Extraia os dados da receita do seguinte HTML: ${html.substring(0, 30000)}. 
         Ignore anúncios e navegação. Foque no conteúdo central da receita.
         Se for um petisco, quitute ou acompanhamento para coffee break, classifique como 'Petiscos&Food Tricks'.
         Se for uma entrada, antipasto ou couvert, classifique como 'Entradas'.
         Se for uma receita básica do cotidiano (arroz, feijão, molhos base), classifique como 'Básicas'.`;

    const prompt = `
      ${basePrompt}
      ${contentPrompt}
      Meta Descrição: ${options.metaDescription || ""}
      OG Image: ${options.ogImage || ""}
      Imagens encontradas no site: ${options.allImagesFound?.join(', ') || "Nenhuma"}
    `;

    try {
      const apiKeys = getAvailableGeminiKeys();
      if (apiKeys.length === 0) {
        throw new Error("Nenhuma GEMINI_API_KEY configurada");
      }

      let response;
      let lastError;

      for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];
        try {
          const client = new GoogleGenAI({ apiKey });
          // List of models to try in order of preference
          const models = ["gemini-3-flash-preview", "gemini-2.5-flash", "gemini-1.5-flash"];
          for (const modelName of models) {
            try {
              const result = await client.models.generateContent({
                model: modelName,
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                ...(isUrlOnly ? { tools: [{ googleSearch: {} }] } : {})
              } as any);
              response = result;
              // Success, exit both loops
              break;
            } catch (modelErr: any) {
              // Treat quota exhausted or service unavailable (503) as retryable
              if (isQuotaExhaustedError(modelErr) || modelErr?.status === 503) {
                console.warn(`[Alquimia do Prato] Model ${modelName} failed (status ${modelErr?.status}), trying next model...`);
                continue;
              }
              // Other errors are fatal for this key
              throw modelErr;
            }
          }
          if (response) break; // got a good response, stop trying more keys
        } catch (error: any) {
          lastError = error;
          if (isQuotaExhaustedError(error) && i < apiKeys.length - 1) {
            console.warn(`[Alquimia do Prato] Transmutando limites: chave ${i + 1} atingida, usando reserva ${i + 2}/${apiKeys.length}`);
            continue;
          }
          throw error;
        }
      }

      if (!response) {
        throw lastError || new Error("Falha ao gerar conteúdo após tentar todas as chaves.");
      }
      
      const text = response.text || "";

      // Extração robusta do JSON: Localiza o primeiro { e o último } para evitar ruídos na resposta da IA

      let jsonStr = text;
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      } else {
        // Fallback para limpeza simples caso a busca por bloco falhe
        jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
      }


      let recipeData: any;
      try {
        recipeData = JSON.parse(jsonStr);
      } catch (parseError) {
        console.error("Initial JSON parse failure, attempting to clean response:", text);
        // Busca profunda por JSON caso o parse inicial falhe (Gemini às vezes envolve JSON em blocos markdown)
        const cleanerMatch = text.match(/\{[\s\S]*\}/);

        if (cleanerMatch) {
           recipeData = JSON.parse(cleanerMatch[0]);
        } else {
           throw parseError;
        }
      }


      // Sanitização de campos para garantir os tipos corretos no Firestore
      recipeData.title = String(recipeData.title || "").substring(0, 300);

      recipeData.description = String(recipeData.description || "").substring(0, 5000);
      
      const ALL_MOMENTOS = ['Café da Manhã', 'Brunch', 'Almoço', 'Lanche / Chá da Tarde', 'Jantar', 'Ceia', 'Entradas', 'Básicas', 'Petiscos&Food Tricks', 'Bebidas'];
      recipeData.momento = Array.isArray(recipeData.momento) 
        ? recipeData.momento.filter((m: string) => ALL_MOMENTOS.includes(m))
        : [];
      if (recipeData.momento.length === 0) recipeData.momento = ["Almoço"];

      const ALL_TIPOS = ["Assados", "Frituras", "Grelhados", "Sopas e Caldos", "Cremes e Purés", "Massas e Risotos", "Saladas e Pratos Frios", "Cozidos / Guisados", "Padaria e Pastelaria", "Bebidas", "Doces e Sobremesas"];
      recipeData.tipo_prato = Array.isArray(recipeData.tipo_prato)
        ? recipeData.tipo_prato.filter((t: string) => ALL_TIPOS.includes(t))
        : [];
      if (recipeData.tipo_prato.length === 0) recipeData.tipo_prato = ["Cozidos / Guisados"];

      const ALL_BASES = ["Carnes", "Frutos do Mar", "Vegetais e Legumes", "Ovos e Laticínios", "Grãos e Leguminosas"];
      recipeData.base_alimento = Array.isArray(recipeData.base_alimento)
        ? recipeData.base_alimento.filter((b: string) => ALL_BASES.includes(b))
        : [];
      
      // Para bebidas, base_alimento pode estar vazio, então adicionamos um genérico ou lógica específica
      if (recipeData.base_alimento.length === 0) {
        if (recipeData.momento?.includes('Bebidas') || recipeData.tipo_prato?.includes('Bebidas')) {
          recipeData.base_alimento = ["Vegetais e Legumes"]; // Padrão para bebidas botânicas/frutas
        } else {
          recipeData.base_alimento = ["Vegetais e Legumes"];
        }
      }


      recipeData.origem = String(recipeData.origem || "Brasileira");
      recipeData.custo_estimado = ["$", "$$", "$$$", "$$$$"].includes(recipeData.custo_estimado) ? recipeData.custo_estimado : "$$";
      
      const dietTypes = ['Convencional', 'Vegana', 'Vegetariana', 'Low Carb', 'Keto', 'Sem Glúten', 'Sem Lactose', 'Fit'];
      if (!dietTypes.includes(recipeData.dietType)) {
        recipeData.dietType = "Convencional";
      }

      recipeData.time = String(recipeData.time || "");
      recipeData.prepTime = String(recipeData.prepTime || "");
      recipeData.servings = String(recipeData.servings || "");
      recipeData.difficulty = recipeData.difficulty || "Médio";
      if (!['Fácil', 'Médio', 'Difícil'].includes(recipeData.difficulty)) {
        recipeData.difficulty = "Médio";
      }

      recipeData.isClassic = Boolean(recipeData.isClassic);
      
      if (Array.isArray(recipeData.ingredients)) {
        recipeData.ingredients = recipeData.ingredients.map((ing: any) => ({
          name: String(ing.name || ing || "").substring(0, 200),
          quantity: String(ing.quantity || "").substring(0, 100),
          group: ing.group ? String(ing.group).substring(0, 100) : null
        }));
      } else {
        recipeData.ingredients = [];
      }

      if (Array.isArray(recipeData.instructions)) {
        recipeData.instructions = recipeData.instructions.map((step: any) => String(step).substring(0, 1000));
      } else {
        recipeData.instructions = [];
      }

      recipeData.chefTips = String(recipeData.chefTips || "").substring(0, 2000);


      // Mescla final de opções de imagem: Imagens originais do site + Imagens encontradas pela IA + Busca Google (se necessário)
      let finalOptions = Array.from(new Set([
        ...(options.ogImage ? [options.ogImage] : []),
        ...(recipeData.imageOptions || []),
        ...(options.allImagesFound || [])
      ])).filter(Boolean);


      // Prioriza a imagem principal original (ogImage) como a opção padrão
      if (options.ogImage) {
        const existingIndex = finalOptions.indexOf(options.ogImage);
        if (existingIndex > -1) {
          finalOptions.splice(existingIndex, 1);
        }
        finalOptions.unshift(options.ogImage);
        recipeData.image = options.ogImage;
      }


      recipeData.imageOptions = finalOptions.slice(0, 10);
      recipeData.image = recipeData.image || (recipeData.imageOptions.length > 0 ? recipeData.imageOptions[0] : "");

      // Busca de Contingência: Se menos de 2 opções de imagem forem encontradas, busca mais usando o Grounding do Gemini
      if (recipeData.imageOptions.length < 2 && recipeData.title) {

        try {
          const searchPrompt = `Encontre até 5 URLs de imagens de alta qualidade para a receita: "${recipeData.title}". 
          Retorne APENAS um array JSON de strings com as URLs.`;
          
          const apiKeys = getAvailableGeminiKeys();
          let searchResponse;
          let lastSearchError;

          for (let i = 0; i < apiKeys.length; i++) {
            try {
              const client = new GoogleGenAI({ apiKey: apiKeys[i] });
              const result = await client.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: [{ role: "user", parts: [{ text: searchPrompt }] }],
                tools: [{ googleSearch: {} }]
              } as any);
              
              searchResponse = result;
              break; // Sucesso
            } catch (err: any) {
              lastSearchError = err;
              
              if (isQuotaExhaustedError(err) && i < apiKeys.length - 1) {
                console.warn(`[Alquimia do Prato] Transmutando limites (Busca): cota da chave ${i + 1} atingida. Ativando reserva ${i + 2}...`);
                continue;
              }
              throw err;
            }
          }

          if (!searchResponse) {
            throw lastSearchError || new Error("Falha ao buscar imagens após tentar todas as chaves.");
          }
          
          const searchResult = searchResponse.text || "";


          const foundUrlsMatch = searchResult.match(/https?:\/\/[^\s"'<>\])]+\.(jpg|jpeg|png|webp|gif)/gi);
          
          if (foundUrlsMatch) {
            const newOptions = Array.from(new Set([...(recipeData.imageOptions || []), ...foundUrlsMatch])).slice(0, 8);
            recipeData.imageOptions = newOptions;
            if (!recipeData.image && newOptions.length > 0) {
              recipeData.image = newOptions[0];
            }
          }
        } catch (searchError) {
          console.error("Erro no Grounding de busca do Gemini:", searchError);
          // Não falha o processo todo se a busca falhar, apenas mantém o que já temos
        }
      }


      // Garante que nenhum campo seja undefined antes de retornar para o Firestore
      const finalResult: Partial<Recipe> = {

        title: recipeData.title || "Receita sem título",
        description: recipeData.description || "",
        momento: recipeData.momento || ["Bebidas"],
        tipo_prato: recipeData.tipo_prato || ["Bebidas"],
        base_alimento: recipeData.base_alimento || ["Vegetais e Legumes"],
        origem: recipeData.origem || "Brasileira",
        custo_estimado: recipeData.custo_estimado || "$$",
        dietType: recipeData.dietType || "Convencional",
        time: recipeData.time || "",
        prepTime: recipeData.prepTime || "",
        servings: recipeData.servings || "",
        difficulty: recipeData.difficulty || "Médio",
        isClassic: !!recipeData.isClassic,
        ingredients: recipeData.ingredients || [],
        instructions: recipeData.instructions || [],
        chefTips: recipeData.chefTips || "",
        image: recipeData.image || "",
        imageOptions: recipeData.imageOptions || []
      };


      return finalResult;
      } catch (error: any) {
        console.error("Gemini extraction error:", error);

        // If quota exhausted, log and continue with fallback
        if (isQuotaExhaustedError(error)) {
          console.warn("Quota exhausted for Gemini model, using fallback recipe.");
        }

        // Build a minimal fallback recipe using available metadata
        const fallback: Partial<Recipe> = {
          title: options?.url?.split('/')?.pop()?.replace(/[-_]/g, ' ') || 'Receita sem título',
          description: options?.metaDescription || '',
          momento: [],
          tipo_prato: [],
          base_alimento: [],
          origem: '',
          custo_estimado: '',
          dietType: '',
          time: '',
          prepTime: '',
          servings: '',
          difficulty: '',
          isClassic: false,
          ingredients: [],
          instructions: [],
          chefTips: '',
          image: options?.ogImage || '',
          imageOptions: options?.allImagesFound || []
        };
        return fallback;
      }
  },

  /**
   * Verifica o status de uma chave específica.
   */
  async checkApiKeyStatus(apiKey: string): Promise<{ status: 'active' | 'exhausted' | 'invalid' | 'error', message?: string }> {
    try {
      const client = new GoogleGenAI({ apiKey });
      const result = await client.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: 'hi' }] }]
      });
      
      if (result) {
        return { status: 'active' };
      }
      return { status: 'error', message: 'Resposta vazia' };
    } catch (error: any) {
      if (isQuotaExhaustedError(error)) {
        return { status: 'exhausted', message: 'Cota esgotada (429)' };
      }
      if (error?.message?.includes('API_KEY_INVALID') || error?.message?.includes('invalid')) {
        return { status: 'invalid', message: 'Chave Inválida' };
      }
      return { status: 'error', message: error.message || 'Erro desconhecido' };
    }
  }
};
