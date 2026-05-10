import { IdentityAccessService } from '../auth/IdentityAccessService';
import { initializeApp } from 'firebase-admin/app';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Script de Inicialização de Administrador
 * 
 * Este script configura as Custom Claims necessárias para o primeiro admin.
 * Suporta o ambiente de emuladores e produção.
 */

// Carrega o config para obter o Project ID
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Configura o ambiente para usar o emulador de Auth se estiver rodando localmente
if (process.env.FIREBASE_AUTH_EMULATOR_HOST === undefined) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:9099';
}

try {
  initializeApp({
    projectId: config.projectId
  });
} catch (e) {
  // Já inicializado
}

const authService = new IdentityAccessService();
const userUid = process.argv[2];

if (!userUid || userUid === 'SEU_UID_AQUI') {
  console.error('❌ Erro: Por favor, forneça um UID válido.');
  console.log('Uso: npm run set-admin <UID>');
  process.exit(1);
}

console.log(`[RBAC] Iniciando promoção do usuário ${userUid} para admin no projeto ${config.projectId}...`);

authService.assignRole(userUid, 'admin')
  .then(() => {
    console.log(`✅ Sucesso! O usuário ${userUid} agora é um Administrador.`);
    console.log(`[Aviso] Se o usuário estiver logado, ele precisará atualizar o token (logout/login).`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Falha na operação:', err.message);
    process.exit(1);
  });
