import { Router } from 'express';
import { authenticateAPI } from '../middlewares/authenticateAPI';
import { upload } from '../middlewares/uploadMiddleware';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { prisma } from '../prisma/client';
import { geminiService } from '../services/geminiService';
import { GamificationService } from '../services/GamificationService';
import { AtaGeneratorService } from '../services/AtaGeneratorService';
import { ModerationService } from '../services/ModerationService';
import { RagBackendService } from '../services/ragBackendService';
import { getAvailableGeminiKeys } from '../services/geminiKeyManager';

const router = Router();

router.post("/messages", authenticateAPI, async (req, res) => {
  const { text, senderId, senderRole, senderName, metadata } = req.body;
  console.log(`[Lounge API] Recebendo mensagem de ${senderName || senderId} (${senderRole}): "${text?.substring(0, 50)}..."`);
  
  if (!text || !senderId) {
    return res.status(400).json({ error: "Texto e SenderId são obrigatórios." });
  }

  try {
    const db = getFirestore();
    console.log(`[Lounge API] Iniciando moderação para: "${text.substring(0, 30)}..."`);
    let status = await ModerationService.validateCulinaryRelevance(text);
    console.log(`[Lounge API] Resultado da moderação: ${status}`);
    
    const finalMetadata = { ...(metadata || {}) };

    if (status === 'rejected') {
      // É uma mensagem restrita. Vamos checar o histórico do usuário nos últimos 10 minutos.
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentMessagesSnapshot = await db.collection('lounge_messages')
        .where('timestamp', '>=', tenMinutesAgo)
        .get();

      let restrictedCount = 0;
      recentMessagesSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.senderId === senderId && (data.status === 'rejected' || (data.metadata && data.metadata.restricted === true))) {
          restrictedCount++;
        }
      });

      if (restrictedCount === 0) {
        // Primeira ocorrência: publica com a marcação de inadequado
        status = 'approved';
        finalMetadata.restricted = true;
        console.log(`[Lounge API] Primeira ocorrência de inadequação nos últimos 10 minutos. Publicando com restrição.`);
      } else {
        // Segunda ocorrência ou mais: bloqueia
        console.log(`[Lounge API] Segunda ocorrência ou mais de inadequação nos últimos 10 minutos (${restrictedCount} anteriores). Bloqueando mensagem.`);
      }
    }

    const messageData = {
      text,
      senderId,
      senderName: senderName || 'Alquimista Anônimo',
      senderRole: senderRole || 'user',
      timestamp: new Date(), 
      status,
      reactions: {},
      metadata: finalMetadata
    };

    console.log(`[Lounge API] Salvando mensagem no Firestore...`);
    const docRef = await db.collection('lounge_messages').add({
      ...messageData,
      timestamp: FieldValue.serverTimestamp() // Força server timestamp
    });
    console.log(`[Lounge API] Mensagem salva com sucesso! ID: ${docRef.id}`);

    // Integração da Gamificação: Dar XP pela mensagem no Lounge (apenas se for aprovada e não restrita)
    let gamificationResult = null;
    if (status === 'approved' && !finalMetadata.restricted) {
      try {
        // Assumindo que senderId corresponde ao Supabase/Firebase UID
        gamificationResult = await GamificationService.processEvent(senderId, 'COLLABORATION_MESSAGE');
        console.log(`[Lounge API] XP atribuído: +${gamificationResult.xpGained} XP. Nível Atual: ${gamificationResult.currentLevel}`);
      } catch (gamiErr: any) {
        console.warn("[Lounge API] Erro não fatal na gamificação (Usuário não cadastrado no Prisma?):", gamiErr.message);
      }
    }

    // Trigger Alchemist bot if mentioned (@alchemist, @copilot, @chef, @alquimista)
    const lowerText = text.toLowerCase();
    if (status === 'approved' && (lowerText.includes('@alchemist') || lowerText.includes('@copilot') || lowerText.includes('@chef') || lowerText.includes('@alquimista'))) {
      console.log(`[Lounge API] Bot acionado! Iniciando processamento do Alchemist RAG...`);
      // Run asynchronously so it doesn't block the request response
      Promise.resolve().then(async () => {
        try {
          const answer = await RagBackendService.askGeminiWithContext(text, [], 5, senderId);
          const copilotMessage = {
            text: answer,
            senderId: 'copilot-agent',
            senderName: 'Alchemist',
            senderRole: 'agent',
            timestamp: FieldValue.serverTimestamp(),
            status: 'approved',
            reactions: {},
            metadata: { isBot: true, replyTo: docRef.id }
          };
          await db.collection('lounge_messages').add(copilotMessage);
          console.log(`[Lounge API] Resposta do Alchemist salva com sucesso!`);
        } catch (err) {
          console.error("[Lounge API] Erro ao gerar resposta do Alchemist:", err);
          const fallbackMessage = {
            text: "Desculpe, nossos servidores estão em delay, pergunte novamente por favor",
            senderId: 'copilot-agent',
            senderName: 'Alchemist',
            senderRole: 'agent',
            timestamp: FieldValue.serverTimestamp(),
            status: 'approved',
            reactions: {},
            metadata: { isBot: true, replyTo: docRef.id }
          };
          await db.collection('lounge_messages').add(fallbackMessage).catch(e => console.error("[Lounge API] Falha final ao salvar fallback:", e));
        }
      });
    }

    // Inicia verificação de engajamento proativo se a mensagem foi aprovada e não acionou o bot diretamente
    if (status === 'approved' && !(lowerText.includes('@alchemist') || lowerText.includes('@copilot') || lowerText.includes('@chef') || lowerText.includes('@alquimista'))) {
      RagBackendService.checkAndTriggerProactiveEngagement(db).catch(err => 
        console.error("[Lounge API] Erro no fluxo de engajamento proativo:", err)
      );
    }

    res.json({ 
      success: true, 
      id: docRef.id, 
      status,
      message: status === 'approved' ? (finalMetadata.restricted ? "Mensagem publicada com restrição de contexto." : "Mensagem publicada!") : "Sua mensagem passará por revisão.",
      gamification: gamificationResult
    });
    
  } catch (error: any) {
    console.error("[Lounge API] ERRO CRÍTICO ao postar mensagem:", error);
    res.status(500).json({ error: error.message || "Erro interno ao processar mensagem" });
  }
});

router.post("/generate-ata", authenticateAPI, async (req, res) => {
  try {
    const ata = await AtaGeneratorService.generateDailyAta();
    if (!ata) {
      return res.json({ success: true, message: "Sem mensagens para gerar ata hoje." });
    }
    res.json({ success: true, ata });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
