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

router.get("/interactions/:uid", authenticateAPI, async (req, res) => {
  try {
    const { uid } = req.params;
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const interactions = await prisma.userInteraction.findMany({
      where: { userId: user.id }
    });
    
    res.json({ success: true, interactions });
  } catch (error: any) {
    console.error("Erro ao buscar interações:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/interactions/:uid", authenticateAPI, async (req, res) => {
  try {
    const { uid } = req.params;
    const { eventType, count } = req.body;
    
    const user = await prisma.user.findUnique({ where: { uid } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const interaction = await prisma.userInteraction.upsert({
      where: {
        userId_eventType: {
          userId: user.id,
          eventType: eventType
        }
      },
      update: {
        count: count
      },
      create: {
        userId: user.id,
        eventType: eventType,
        count: count
      }
    });

    // Sincronizar selos/badges correspondentes à nova contagem
    await GamificationService.checkAndGrantBadges(user.id, eventType, count);

    // Recalcular a pontuação total (XP) e o nível do usuário
    await GamificationService.recalculateXPAndLevel(user.id);

    res.json({ success: true, interaction });
  } catch (error: any) {
    console.error("Erro ao atualizar interação:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/event", authenticateAPI, async (req, res) => {
  try {
    const { uid, eventType } = req.body;
    
    if (!uid || !eventType) {
      return res.status(400).json({ error: "uid and eventType are required" });
    }

    // Garantir que o usuário existe no Prisma (Postgres) buscando do Firestore se necessário
    let user = await prisma.user.findUnique({ where: { uid } });
    if (!user) {
      const db = getFirestore();
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const emailToUse = userData?.email || `${uid}@example.com`;
        let existingUserByEmail = await prisma.user.findUnique({ where: { email: emailToUse } });
        
        if (existingUserByEmail) {
          user = await prisma.user.update({
            where: { email: emailToUse },
            data: { uid: uid, displayName: userData?.displayName || existingUserByEmail.displayName }
          });
          console.log(`[Gamification Event API] Usuário ${user.displayName} teve o UID atualizado no Prisma.`);
        } else {
          user = await prisma.user.create({
            data: {
              uid,
              displayName: userData?.displayName || 'Sem Nome',
              email: emailToUse,
              photoURL: userData?.photoURL || null,
              whatsapp: userData?.whatsapp || null,
              state: userData?.state || 'ES',
              country: userData?.country || 'BR'
            }
          });
          console.log(`[Gamification Event API] Usuário ${user.displayName} auto-sincronizado para o Prisma.`);
        }
      } else {
        return res.json({ success: false, error: `Usuário com UID ${uid} não encontrado no Firestore nem no Prisma.` });
      }
    }

    const result = await GamificationService.processEvent(uid, eventType);
    
    // Mercador de Permuta: 1 Moeda a cada 10 XP
    if (result.xpGained > 0) {
      try {
        const db = getFirestore();
        const FieldValue = (await import('firebase-admin/firestore')).FieldValue;
        const moedasGanhas = result.xpGained / 10;
        await db.collection("users").doc(uid).update({
          moedas: FieldValue.increment(moedasGanhas)
        });
        console.log(`[Gamification Event API] +${moedasGanhas} Moedas dadas ao usuário ${uid}`);
      } catch (err) {
        console.error(`[Gamification Event API] Erro ao creditar moedas para ${uid}:`, err);
      }
    }

    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error(`[Gamification Event API] Erro ao processar evento ${req.body?.eventType}:`, error.message);
    // Retorna success: false mas 200 OK para não quebrar a UI
    res.json({ success: false, error: error.message });
  }
});

router.get("/profile/:uid", authenticateAPI, async (req, res) => {
  const { uid } = req.params;
  try {
    // Garantir que o usuário existe no Prisma (Postgres) buscando do Firestore se necessário
    let user = await prisma.user.findUnique({ where: { uid } });
    if (!user) {
      const db = getFirestore();
      const userDoc = await db.collection("users").doc(uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        const emailToUse = userData?.email || `${uid}@example.com`;
        let existingUserByEmail = await prisma.user.findUnique({ where: { email: emailToUse } });
        
        if (existingUserByEmail) {
          user = await prisma.user.update({
            where: { email: emailToUse },
            data: { uid: uid, displayName: userData?.displayName || existingUserByEmail.displayName }
          });
          console.log(`[Profile API] Usuário ${user.displayName} teve o UID atualizado no Prisma.`);
        } else {
          user = await prisma.user.create({
            data: {
              uid,
              displayName: userData?.displayName || 'Sem Nome',
              email: emailToUse,
              photoURL: userData?.photoURL || null,
              whatsapp: userData?.whatsapp || null,
              state: userData?.state || 'ES',
              country: userData?.country || 'BR'
            }
          });
          console.log(`[Profile API] Usuário ${user.displayName} auto-sincronizado para o Prisma.`);
        }
      }
    }

    const profile = await GamificationService.getProfile(uid);
    if (!profile) {
      return res.status(404).json({ error: "Perfil de gamificação não encontrado." });
    }
    let relativeXp = profile.xp_total;
    let nextLevelXp = 100;

    if (profile.xp_total < 100) {
      relativeXp = profile.xp_total;
      nextLevelXp = 100;
    } else if (profile.xp_total < 300) {
      relativeXp = profile.xp_total - 100;
      nextLevelXp = 200;
    } else if (profile.xp_total < 600) {
      relativeXp = profile.xp_total - 300;
      nextLevelXp = 300;
    } else if (profile.xp_total < 1000) {
      relativeXp = profile.xp_total - 600;
      nextLevelXp = 400;
    } else {
      relativeXp = profile.xp_total - 1000;
      nextLevelXp = 999999;
    }

    const mappedProfile = {
      ...profile,
      level: profile.nivel,
      tier: profile.grau,
      xp: relativeXp,
      nextLevelXp: nextLevelXp
    };
    res.json({ success: true, profile: mappedProfile });
  } catch (error: any) {
    console.error("[Gamification API] Erro ao buscar perfil:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
