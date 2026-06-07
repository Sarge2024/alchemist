import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from "@google/genai";
import { getAvailableGeminiKeys, isQuotaExhaustedError } from "./geminiKeyManager";
import { RagBackendService } from "./ragBackendService";

/**
 * AtaGeneratorService
 * 
 * Serviço responsável por consolidar as interações do Lounge em uma Ata Diária (Daily Summary).
 * Recupera mensagens aprovadas e utiliza o Gemini 1.5 Flash para síntese estruturada.
 * 
 * @layer Infrastructure
 */
export const AtaGeneratorService = {
  
  /**
   * Coleta mensagens aprovadas nas últimas 24h e gera um resumo em formato JSON.
   * O resultado é persistido na coleção 'daily_summaries' para exibição no Mural de Atas.
   * 
   * @returns A estrutura da ata gerada ou null se não houver mensagens.
   */
  async generateDailyAta(): Promise<any> {
    // Verificação de ambiente
    const apiKeys = getAvailableGeminiKeys();
    if (apiKeys.length === 0) {
      throw new Error("[AtaGenerator] Nenhuma GEMINI_API_KEY configurada.");
    }

    const db = getFirestore();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // 1. Recupera mensagens aprovadas nas últimas 24h
      const messagesSnapshot = await db.collection('lounge_messages')
        .where('timestamp', '>=', last24h)
        .get();

      const approvedDocs = messagesSnapshot.docs
        .map(doc => ({ id: doc.id, data: doc.data() }))
        .filter(item => item.data.status === 'approved')
        .sort((a, b) => {
          const tA = a.data.timestamp?.toDate ? a.data.timestamp.toDate().getTime() : new Date(a.data.timestamp).getTime();
          const tB = b.data.timestamp?.toDate ? b.data.timestamp.toDate().getTime() : new Date(b.data.timestamp).getTime();
          return tA - tB;
        });

      if (approvedDocs.length === 0) {
        console.log("[AtaGenerator] Nenhuma mensagem aprovada para processar nas últimas 24h.");
        return null;
      }

      // 2. Prepara o contexto para a IA
      const messagesContent = approvedDocs
        .map(item => `[${item.data.senderRole}] ${item.data.text}`)
        .join('\n---\n');

      // Busca contexto histórico relacionado às mensagens do dia
      let semanticContext = "";
      try {
        // Usa as primeiras mensagens (até 800 chars) como query para buscar temas relacionados no RAG
        semanticContext = await RagBackendService.getSemanticContext(messagesContent.substring(0, 800), 3);
      } catch (e) {
        console.warn("[AtaGenerator] Não foi possível buscar contexto semântico:", e);
      }

      const ACERVO_SUMMARY_LIST = [
        {
          title: "Padrão de Qualidade da Carne Angus",
          description: "Critérios de certificação de qualidade Angus, padrões de marmoreio e seleção de carnes premium.",
          url: "/docs/acervo/Angus-2017.10.30-19.22.35.pdf"
        },
        {
          title: "Manual e Cultura do Churrasco Brasileiro",
          description: "História e rituais do churrasco, salga correta, fogo e brasa, e reação de Maillard.",
          url: "/docs/acervo/churrasco.pdf"
        },
        {
          title: "Os 8 Melhores Tipos de Carne para Churrasco",
          description: "Análise de cortes bovinos para churrasco (Picanha, Fraldinha, Contrafilé/Ancho e Costela).",
          url: "/docs/acervo/os-8-melhores-tipos-de-carne-para-churrasco.pdf"
        },
        {
          title: "Qualidade Nutricional da Carne Vermelha",
          description: "Benefícios nutricionais da carne vermelha: ferro heme, vitamina B12 e proteínas essenciais.",
          url: "/docs/acervo/qualidade-nutricional-da-carne-vermelha.pdf"
        },
        {
          title: "Fichas Técnicas de Cortes Bovinos",
          description: "Rendimento, teor de gordura e métodos recomendados de preparo (dianteiro vs traseiro).",
          url: "/docs/acervo/FICHAS-TÉCNICAS-TECMEAT-BOVINO.compressed.pdf"
        },
        {
          title: "Brazilian Beef: Global Standards",
          description: "Manual sobre rastreabilidade, pastagens tropicais, sustentabilidade e exportação da carne brasileira.",
          url: "/docs/acervo/Brazilian_Beef_Global_Standards.pdf"
        },
        {
          title: "Apresentação Interativa de Cortes Bovinos",
          description: "Anatomia bovina, localização dos cortes, diferença de maciez do traseiro/dianteiro e cupim.",
          url: "/docs/acervo/apresenta_o_interativa_de_cortes_bovinos.html"
        },
        {
          title: "Arte dos Molhos: Guia de Alta Gastronomia",
          description: "Acompanhamentos culinários, emulsões clássicas francesas, reduções e espessantes.",
          url: "/acervo/guia-dos-molhos"
        }
      ];

      const acervoSummaryText = ACERVO_SUMMARY_LIST.map(item => 
        `- Título: "${item.title}" | Descrição: ${item.description}`
      ).join('\n');

      const prompt = `
        Você é o Cronista Oficial da Alquimia do Prato. Sua missão é ler as mensagens do Lounge Gastronômico 
        e sintetizar uma "Ata de Interação Comunitária" que inspire a nossa comunidade.
        Você pode usar o "Contexto Histórico do Acervo" para conectar as discussões atuais com receitas ou temas do passado.
        
        SUMÁRIO DE DOCUMENTOS DISPONÍVEIS NO ACERVO:
        ${acervoSummaryText}

        CONTEXTO HISTÓRICO DO ACERVO RETORNADO VIA RAG (Contém trechos e links específicos):
        ${semanticContext || "Nenhum contexto relacionado encontrado."}

        MENSAGENS APROVADAS (ÚLTIMAS 24H):
        ${messagesContent}
        
        MODELO DE ATA (SIGA ESTA ESTRUTURA):
        Ata de Interação Comunitária: [NOME DO GRUPO]
        Data: [DD/MM/AAAA] | Status: ✅ Verificada por Gemini IA
        
        1. Tópicos em Foco: 
           - Título: [Assunto]
           - Resumo: [2 linhas]
           - Consenso: [Opinião predominante ou info técnica]
           
        2. Insights e Cultura Gastronômica:
           - Termo em Destaque: [Termo técnico/histórico] - [Explicação cultural]
           - Dica do Chef: [Conselho prático orgânico]
           
        3. Acervo Citado & Referências:
           - Artigo: [Selecione obrigatoriamente um Título do Acervo acima que seja mais relevante para a conversa]
           - E-book: [Selecione obrigatoriamente outro Título do Acervo acima que complemente o assunto]
           
        4. Termômetro da Comunidade:
           - Clima: [Produtivo/Técnico/Inspiracional]
           - Participação: [Nº aproximado de colaboradores distintos]
           - Destaque do Dia: [Nome/ID do autor da contribuição mais relevante]

        REGRAS IMPORTANTES PARA A SEÇÃO "referencias" DO JSON:
        1. Você DEVE OBRIGATORIAMENTE mapear a discussão do Lounge a documentos existentes listados no "SUMÁRIO DE DOCUMENTOS DISPONÍVEIS NO ACERVO".
        2. As propriedades "artigo" e "ebook" no objeto "referencias" do JSON devem conter o TÍTULO EXATO de um dos documentos listados acima (sem o link/URL, apenas o título como por exemplo: "Os 8 Melhores Tipos de Carne para Churrasco" ou "Manual e Cultura do Churrasco Brasileiro" ou "Padrão de Qualidade da Carne Angus" ou "Qualidade Nutricional da Carne Vermelha").
        3. Não deixe esses campos vazios ou com valores genéricos como "Consultar Biblioteca" ou "Fundamentos da Gastronomia" se houver qualquer relação mínima (exemplo: se a conversa for sobre carnes/churrasco, use os documentos de carne/churrasco; se for sobre molhos, use "Arte dos Molhos: Guia de Alta Gastronomia").
        4. O título exato inserido no JSON será usado diretamente pelo sistema para abrir a busca do respectivo documento no acervo.

        REGRAS DE RETORNO (JSON ESTRITO):
        {
          "groupName": "Conversação Alquimista",
          "date": "Data atual (DD/MM/AAAA)",
          "topics": [
            { "title": "...", "summary": "...", "consensus": "..." }
          ],
          "insights": {
            "termoDestaque": { "termo": "...", "explicacao": "..." },
            "dicaDoChef": "..."
          },
          "referencias": {
            "artigo": "TÍTULO EXATO DO ARTIGO SELECIONADO DO ACERVO",
            "ebook": "TÍTULO EXATO DO EBOOK SELECIONADO DO ACERVO"
          },
          "termometro": {
            "clima": "...",
            "participacao": 0,
            "destaqueDoDia": "..."
          },
          "stats": { "totalMessages": ${approvedDocs.length} }
        }
      `;

      let response;
      let lastError;

      for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[i];
        try {
          const client = new GoogleGenAI({ apiKey });
          
          response = await client.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
          });
          
          break; // Sucesso
        } catch (error: any) {
          lastError = error;
          if (isQuotaExhaustedError(error) && i < apiKeys.length - 1) {
            console.warn(`[AtaGenerator] Cota da chave ${i + 1} atingida. Rotacionando para chave ${i + 2}...`);
            continue;
          }
          throw error;
        }
      }

      if (!response) {
        throw lastError || new Error("Falha ao gerar Ata Diária após tentar todas as chaves.");
      }
      
      const rawText = response.text || "";
      
      // Extração robusta do JSON caso a IA inclua blocos de markdown
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("[AtaGenerator] Falha ao extrair JSON da resposta da IA.");
      }

      const ataData = JSON.parse(jsonMatch[0]);

      // 4. Salva a Ata no Firestore (Mural de Atas)
      const ataRef = await db.collection('daily_summaries').add({
        ...ataData,
        createdAt: FieldValue.serverTimestamp(),
        type: 'daily_summary'
      });

      console.log(`[AtaGenerator] Ata Diária gerada seguindo novo modelo. ID: ${ataRef.id}`);
      return { id: ataRef.id, ...ataData };

    } catch (error: any) {
      console.error("[AtaGenerator Error] Falha no processo de geração:", error.message || error);
      throw error;
    }
  }
};
