import { prisma } from '../prisma/client';
import { Grau } from '@prisma/client';

export class GamificationService {
  private static readonly XP_PER_LEVEL = 100;
  
  private static readonly EVENT_XP = {
    COLLABORATION_MESSAGE: 5,         // Colaboração entre participantes (antigo LOUNGE_MESSAGE)
    PROFILE_PARTIAL: 10,              // Preenchimento de Cadastro Parcial
    PROFILE_COMPLETE: 25,             // Cadastro Completo
    PROFILE_QUIZ: 5,                  // Quiz de perfil/preferências
    ARTICLE_PUBLISHED: 50,            // Publicação de Artigos em PDF
    RECIPE_PUBLISHED: 50,             // Publicação de Receitas (50 pts)
    RECIPE_UPVOTE_RECEIVED: 10,       // Avaliação positiva de receita
    REVIEW_WITH_PHOTO: 20,            // Postagem de Avaliação com foto (20 pts)
    WEEKLY_CHALLENGE_COMPLETED: 100,  // Completar Desafio da Semana (100 pts)
    PRODUCT_PURCHASED: 25,            // Compras de Produtos
    REFERRAL_CONFIRMED: 5,            // Indicação Confirmada (5 pts)
  };

  public static readonly BADGE_REQUIREMENTS: Record<string, { badgeCode: string; required: number }> = {
    PROFILE_PARTIAL: { badgeCode: 'perfil_iniciado', required: 1 },
    PROFILE_QUIZ: { badgeCode: 'alquimista_curioso', required: 1 },
    PROFILE_COMPLETE: { badgeCode: 'perfil_completo', required: 1 },
    PRODUCT_PURCHASED: { badgeCode: 'cliente_vip', required: 3 },
    COLLABORATION_MESSAGE: { badgeCode: 'comunicador_lounge', required: 50 },
    RECIPE_PUBLISHED: { badgeCode: 'chef_ativo', required: 10 },
    ARTICLE_PUBLISHED: { badgeCode: 'escritor_acervo', required: 5 },
    REVIEW_WITH_PHOTO: { badgeCode: 'fotografo_culinario', required: 15 },
    RECIPE_UPVOTE_RECEIVED: { badgeCode: 'receita_popular', required: 20 },
  };

  private static readonly BADGES_TO_SEED = [
    { codigo_evento: 'perfil_iniciado', nome: 'Perfil Iniciado', descricao: 'Preenchimento de cadastro parcial', url_vercel_blob: 'https://placehold.co/150x150/78716c/ffffff?text=PI' },
    { codigo_evento: 'alquimista_curioso', nome: 'Alquimista Curioso', descricao: 'Respondeu o quiz de preferências', url_vercel_blob: 'https://placehold.co/150x150/78716c/ffffff?text=AC' },
    { codigo_evento: 'perfil_completo', nome: 'Perfil Completo', descricao: 'Preenchimento de cadastro completo', url_vercel_blob: 'https://placehold.co/150x150/10b981/ffffff?text=PC' },
    { codigo_evento: 'cliente_vip', nome: 'Cliente VIP', descricao: 'Adquiriu 3 ou mais produtos na plataforma', url_vercel_blob: 'https://placehold.co/150x150/10b981/ffffff?text=CV' },
    { codigo_evento: 'comunicador_lounge', nome: 'Comunicador do Lounge', descricao: 'Enviou 50 mensagens no Lounge', url_vercel_blob: 'https://placehold.co/150x150/f59e0b/ffffff?text=CL' },
    { codigo_evento: 'chef_ativo', nome: 'Chef Ativo', descricao: 'Publicou 10 receitas no acervo', url_vercel_blob: 'https://placehold.co/150x150/f59e0b/ffffff?text=CA' },
    { codigo_evento: 'escritor_acervo', nome: 'Escritor do Acervo', descricao: 'Publicou 5 artigos em PDF', url_vercel_blob: 'https://placehold.co/150x150/3b82f6/ffffff?text=EA' },
    { codigo_evento: 'fotografo_culinario', nome: 'Fotógrafo Culinário', descricao: 'Realizou 15 avaliações com foto', url_vercel_blob: 'https://placehold.co/150x150/3b82f6/ffffff?text=FC' },
    { codigo_evento: 'receita_popular', nome: 'Receita Popular', descricao: 'Recebeu 20 curtidas em suas receitas', url_vercel_blob: 'https://placehold.co/150x150/a855f7/ffffff?text=RP' },
    { codigo_evento: 'mestre_fundador', nome: 'Mestre Fundador', descricao: 'Pioneiro da plataforma Alquimia do Prato', url_vercel_blob: 'https://placehold.co/150x150/FFD700/000000?text=MF' },
    { codigo_evento: 'guardiao_lounge', nome: 'Guardião do Lounge', descricao: 'Mais de 100 mensagens moderadas no Lounge', url_vercel_blob: 'https://placehold.co/150x150/8A2BE2/FFFFFF?text=GL' },
    { codigo_evento: 'criador_supremo', nome: 'Criador Supremo', descricao: 'Criou as 50 receitas originais da plataforma', url_vercel_blob: 'https://placehold.co/150x150/FF4500/FFFFFF?text=CS' },
    { codigo_evento: 'degustador_elite', nome: 'Degustador de Elite', descricao: 'Aprovou receitas cruciais', url_vercel_blob: 'https://placehold.co/150x150/32CD32/FFFFFF?text=DE' }
  ];

  /**
   * Garante que todas as badges estão presentes no banco de dados.
   */
  static async ensureBadgesSeeded() {
    try {
      console.log('[Gamification] Garantindo que os selos da matriz de interações estejam semeados...');
      for (const b of this.BADGES_TO_SEED) {
        await prisma.badge.upsert({
          where: { codigo_evento: b.codigo_evento },
          update: {
            nome: b.nome,
            descricao: b.descricao,
            url_vercel_blob: b.url_vercel_blob
          },
          create: b
        });
      }
      console.log('[Gamification] Selos da matriz de interações semeados com sucesso.');
    } catch (error: any) {
      console.error('[Gamification] Erro ao semear selos:', error.message);
    }
  }

  /**
   * Verifica se a quantidade atingida atende aos requisitos do selo correspondente
   * e o atribui ou remove conforme necessário.
   */
  static async checkAndGrantBadges(userId: string, eventType: string, count: number) {
    const requirement = this.BADGE_REQUIREMENTS[eventType];
    if (requirement) {
      const badge = await prisma.badge.findUnique({
        where: { codigo_evento: requirement.badgeCode }
      });
      if (badge) {
        if (count >= requirement.required) {
          await prisma.userBadge.upsert({
            where: {
              userId_badgeId: {
                userId: userId,
                badgeId: badge.id
              }
            },
            update: {},
            create: {
              userId: userId,
              badgeId: badge.id
            }
          });
          console.log(`[Gamification] Selo '${badge.nome}' atribuído ao usuário ${userId}`);
        } else {
          // Se o valor caiu abaixo (ex: ajuste manual de admin), remove o selo
          try {
            await prisma.userBadge.delete({
              where: {
                userId_badgeId: {
                  userId: userId,
                  badgeId: badge.id
                }
              }
            });
            console.log(`[Gamification] Selo '${badge.nome}' removido do usuário ${userId} por não atender mais o requisito.`);
          } catch (e) {
            // Ignora se não existia
          }
        }
      }
    }
  }

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
   * Recalcula a pontuação total (XP) e o nível do usuário com base nas suas interações reais no banco de dados.
   */
  static async recalculateXPAndLevel(userId: string) {
    const interactions = await prisma.userInteraction.findMany({
      where: { userId }
    });

    let totalXp = 0;
    for (const inter of interactions) {
      const xpValue = this.EVENT_XP[inter.eventType as keyof typeof this.EVENT_XP] || 0;
      totalXp += inter.count * xpValue;
    }

    let level = 1;
    let metaNivel = 100;

    if (totalXp < 100) {
      level = 1;
      metaNivel = 100;
    } else if (totalXp < 300) {
      level = 2;
      metaNivel = 200;
    } else if (totalXp < 600) {
      level = 3;
      metaNivel = 300;
    } else if (totalXp < 1000) {
      level = 4;
      metaNivel = 400;
    } else {
      level = 5;
      metaNivel = 999999;
    }

    const grau = this.getGrauForLevel(level);

    return prisma.userGamificationProfile.upsert({
      where: { userId },
      update: {
        nivel: level,
        grau,
        xp_total: totalXp,
        meta_nivel: metaNivel
      },
      create: {
        userId,
        nivel: level,
        grau,
        xp_total: totalXp,
        meta_nivel: metaNivel
      }
    });
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

      // Obter nível antigo para saber se subiu de nível
      const existingProfile = await prisma.userGamificationProfile.findUnique({
        where: { userId: user.id }
      });
      const oldLevel = existingProfile ? existingProfile.nivel : 1;

      // 2. Increment/upsert the user's interaction count
      const userInteraction = await prisma.userInteraction.upsert({
        where: {
          userId_eventType: {
            userId: user.id,
            eventType: eventType
          }
        },
        update: {
          count: { increment: 1 }
        },
        create: {
          userId: user.id,
          eventType: eventType,
          count: 1
        }
      });

      // Verificar e conceder Badge se atingir o requisito
      await this.checkAndGrantBadges(user.id, eventType, userInteraction.count);

      // 3. Recalcular perfil com base na nova pontuação total
      const profile = await this.recalculateXPAndLevel(user.id);

      return {
        xpGained,
        totalXp: profile.xp_total,
        currentLevel: profile.nivel,
        leveledUp: profile.nivel > oldLevel
      };
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
        xp_total: 0,
        meta_nivel: 100
      },
      include: {
        user: {
          select: { 
            displayName: true, 
            photoURL: true,
            badges: {
              include: {
                badge: true
              }
            }
          }
        }
      }
    });
  }
}
