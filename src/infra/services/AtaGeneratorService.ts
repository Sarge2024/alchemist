import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { GoogleGenAI } from "@google/genai";



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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === "" || apiKey === "your_gemini_api_key_here") {
      throw new Error("[AtaGenerator] GEMINI_API_KEY não configurada.");
    }

    const db = getFirestore();
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    try {
      // ... (existing code for message retrieval) ...
      const messagesSnapshot = await db.collection('lounge_messages')
        .where('status', '==', 'approved')
        .where('timestamp', '>=', last24h)
        .orderBy('timestamp', 'asc')
        .get();

      if (messagesSnapshot.empty) {
        console.log("[AtaGenerator] Nenhuma mensagem aprovada para processar nas últimas 24h.");
        return null;
      }

      // 2. Prepara o contexto para a IA
      const messagesContent = messagesSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return `[${data.senderRole}] ${data.text}`;
        })
        .join('\n---\n');

      const prompt = `
        Você é o Cronista Oficial da Alquimia do Prato. Sua missão é ler as mensagens do Lounge Gastronômico 
        e sintetizar uma "Ata de Interação Comunitária" que inspire a nossa comunidade.
        
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
           
        3. Acervo Citado & Referências (Links do site):
           - Artigo: [Título sugerido]
           - E-book: [Título sugerido]
           
        4. Termômetro da Comunidade:
           - Clima: [Produtivo/Técnico/Inspiracional]
           - Participação: [Nº aproximado de colaboradores distintos]
           - Destaque do Dia: [Nome/ID do autor da contribuição mais relevante]

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
            "artigo": "...",
            "ebook": "..."
          },
          "termometro": {
            "clima": "...",
            "participacao": 0,
            "destaqueDoDia": "..."
          },
          "stats": { "totalMessages": ${messagesSnapshot.size} }
        }
      `;


      const client = new GoogleGenAI({ apiKey });
      
      const response = await client.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
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


    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error("[AtaGenerator Error] Falha no processo de geração:", errorMessage);
      throw error;
    }
  }
};
