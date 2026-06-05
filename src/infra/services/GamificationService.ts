import { prisma } from '../prisma/client';
import { Grau } from '@prisma/client';

export class GamificationService {
  private static readonly XP_PER_LEVEL = 100;
  
  // Valores atualizados de XP por evento (Nova Matriz de Gamificação)
  private static readonly EVENT_XP = {
    COLLABORATION_MESSAGE: 5,         // Colaboração entre participantes (antigo LOUNGE_MESSAGE)
    PROFILE_PARTIAL: 10,              // Preenchimento de Cadastro Parcial
    PROFILE_COMPLETE: 25,             // Cadastro Completo
    PROFILE_QUIZ: 5,                  // Quiz de perfil/preferências
    ARTICLE_PUBLISHED: 50,            // Publicação de Artigos em PDF
    RECIPE_PUBLISHED_PHOTO: 25,       // Publicação de Receitas (com fotos)
    RECIPE_UPVOTE_RECEIVED: 10,       // Avaliação positiva de receita
    REVIEW_WITH_PHOTO: 30,            // Postagem de Avaliação com foto
    PRODUCT_PURCHASED: 25,            // Compras de Produtos
  };

  /**
   * Mapeia o nível numérico para o Grau correspondente.
   */
  static getGrauForLevel(level: number): Grau {
    if (level <= 1) return Grau.APRENDIZ;
    if (level === 2) return Grau.ASSISTENTE;
    if (level === 3) return Grau.ALQUIMISTA;
    if (level === 4) return Grau.PERITO;
    return Grau.MESTRE_ALQUIMISTA;
  }

  /**
   * Atribui XP ao usuário por um evento e verifica se ele subiu de nível.
   */
  static async processEvent(supabaseUid: string, eventType: keyof typeof GamificationService.EVENT_XP) {
    const xpGained = this.EVENT_XP[eventType];

    if (!xpGained) {
      throw new Error(`Evento desconhecido: ${eventType}`);
    }

    try {
      // 1. Encontrar o usuário no banco de dados usando o UID do Supabase
      const user = await prisma.user.findUnique({
        where: { uid: supabaseUid }
      });

      if (!user) {
        throw new Error(`Usuário com UID ${supabaseUid} não encontrado na base de dados Prisma. Ele precisa completar o cadastro primeiro.`);
      }

      // 2. Usar upsert para garantir que o perfil de gamificação seja criado caso seja a primeira vez
      const profile = await prisma.userGamificationProfile.upsert({
        where: { userId: user.id },
        update: {
          xp_total: { increment: xpGained }
        },
        create: {
          userId: user.id,
          xp_total: xpGained,
          nivel: 1,
          grau: Grau.APRENDIZ
        }
      });

      // 3. Cálculo de level-up
      const currentLevel = profile.nivel;
      const expectedLevel = Math.floor(profile.xp_total / this.XP_PER_LEVEL) + 1;

      const result = {
        xpGained,
        totalXp: profile.xp_total,
        currentLevel,
        leveledUp: false
      };

      if (expectedLevel > currentLevel) {
        const newGrau = this.getGrauForLevel(expectedLevel);
        await prisma.userGamificationProfile.update({
          where: { id: profile.id },
          data: { 
            nivel: expectedLevel,
            grau: newGrau
          }
        });
        result.currentLevel = expectedLevel;
        result.leveledUp = true;
        
        // TODO: Futuramente, atribuir Badges aqui de acordo com o level!
      }

      return result;
    } catch (error) {
      console.error('[Gamification] Erro ao processar evento:', error);
      throw error;
    }
  }

  /**
   * Obtém o perfil atual de gamificação de um usuário
   */
  static async getProfile(supabaseUid: string) {
    const user = await prisma.user.findUnique({
      where: { uid: supabaseUid }
    });

    if (!user) return null;

    return prisma.userGamificationProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        nivel: 1,
        grau: 'APRENDIZ',
        xp_total: 0
      },
      include: {
        user: {
          select: { displayName: true, photoURL: true }
        }
      }
    });
  }
}
