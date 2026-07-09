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
import { FastRoutingService } from '../services/fastRoutingService';


const router = Router();

router.get("/history", authenticateAPI, async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const db = getFirestore();
    const snapshot = await db.collection("copilot_chat_history")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .limit(6)
      .get();

    const history = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        sender: data.role === 'user' ? 'user' : 'ai',
        text: data.text,
        timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
      };
    }).reverse();

    res.json({ success: true, history });
  } catch (error) {
    console.error("[Chat History] Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

router.post("/ask", authenticateAPI, async (req, res) => {
  try {
    const { question, history, userId, userName } = req.body;
    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }
    
    // Sanitize conversation history (last 10 turns max to avoid token overflow)
    const conversationHistory = Array.isArray(history)
      ? history.slice(-10).map((t: any) => ({
          role: t.role === 'user' ? 'user' as const : 'assistant' as const,
          text: typeof t.text === 'string' ? t.text.substring(0, 1000) : ''
        }))
      : [];
    
    // Calls the RAG Backend Service with conversation history for multi-turn context
    const answer = await RagBackendService.askGeminiWithContext(question, conversationHistory, 5, userId, userName);

    if (userId) {
      const db = getFirestore();
      
      // Save to Firestore with a slight offset to ensure stable sorting
      await db.collection("copilot_chat_history").add({
        userId,
        role: "user",
        text: question.substring(0, 2000),
        timestamp: new Date(Date.now() - 10)
      });
      
      await db.collection("copilot_chat_history").add({
        userId,
        role: "assistant",
        text: answer,
        timestamp: new Date()
      });
    }
    
    res.json({ success: true, answer });
  } catch (error: any) {
    console.error("[Chat RAG API] Erro:", error);
    res.json({ success: true, answer: "Desculpe, nossos servidores estão em delay, pergunte novamente por favor" });
  }
});

router.post("/quick-route", authenticateAPI, async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic) {
      return res.status(400).json({ error: "topic is required" });
    }
    const answer = await FastRoutingService.getQuickRoutingOptions(topic);
    res.json({ success: true, answer });
  } catch (error: any) {
    console.error("[Quick Route API] Erro:", error);
    res.json({ success: true, answer: "Não foi possível carregar as opções agora, mas pode mandar no chat." });
  }
});

export default router;
