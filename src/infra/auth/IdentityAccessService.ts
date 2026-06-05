import { getAuth } from 'firebase-admin/auth';

/**
 * IdentityAccessService
 * 
 * Este serviço gerencia as permissões de acesso (RBAC) dos usuários
 * utilizando a infraestrutura de Custom Claims do Firebase Auth.
 * 
 * @layer Infrastructure
 */
export class IdentityAccessService {
  
  // Roles permitidas conforme definido no Agentes_Personas.md e PRD
  private readonly allowedRoles = ['member', 'collaborator', 'chef', 'admin'];

  /**
   * Atribui uma função (role) administrativa ao usuário no Firebase Auth.
   * 
   * @param uid - ID único do usuário.
   * @param role - A role desejada (visitante, colaborador, editor, admin).
   * @returns Promise<void>
   * @throws Error caso a role seja inválida ou ocorra erro no Firebase.
   */
  async assignRole(uid: string, role: string): Promise<void> {
    // Validação da role antes de aplicar
    if (!this.allowedRoles.includes(role)) {
      throw new Error(`[AuthError] A role '${role}' não é permitida. Use uma das seguintes: ${this.allowedRoles.join(', ')}`);
    }

    try {
      // Aplicação da Custom Claim no Firebase Auth
      await getAuth().setCustomUserClaims(uid, { role });
      
      console.log(`[RBAC] Role '${role}' aplicada com sucesso ao UID: ${uid}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`[RBAC Fatal] Falha ao atribuir claims para o usuário ${uid}:`, errorMessage);
      throw new Error(`Falha na atribuição de permissões: ${errorMessage}`);
    }
  }

  /**
   * Verifica a role atual de um usuário.
   * Útil para auditorias internas e logs.
   */
  async checkUserRole(uid: string): Promise<string | null> {
    try {
      const userRecord = await getAuth().getUser(uid);
      return (userRecord.customClaims?.role as string) || null;
    } catch (error) {
      console.error(`[AuthError] Erro ao buscar dados do usuário ${uid}`);
      return null;
    }
  }
}
