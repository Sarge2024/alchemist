/**
 * Script para corrigir a role de usuários Admin no Firestore.
 * Busca todos os usuários e atualiza os que devem ser admin.
 * 
 * Uso: npx tsx scripts/fix-admin-role.ts
 */
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';

// Configuração do Firebase (mesma do app)
const firebaseConfig = {
  apiKey: "AIzaSyBb4TaEkn85x1G6owNmFbW_cXBFMCkfBiI",
  authDomain: "receitas-alquimia.firebaseapp.com",
  projectId: "receitas-alquimia",
  storageBucket: "receitas-alquimia.firebasestorage.app",
  messagingSenderId: "830949498509",
  appId: "1:830949498509:web:7c9b0f0bc455e4c7dbc960"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Emails que devem ser admin
const ADMIN_EMAILS = [
  'sagacitas.sistemas@gmail.com',
  'alchemist.master1998@gmail.com',
];

async function fixAdminRoles() {
  console.log('🔍 Buscando todos os usuários no Firestore...\n');
  
  const usersSnapshot = await getDocs(collection(db, 'users'));
  
  console.log(`📋 Total de usuários encontrados: ${usersSnapshot.size}\n`);
  
  for (const userDoc of usersSnapshot.docs) {
    const data = userDoc.data();
    const email = data.email;
    const currentRole = data.role || '(sem role)';
    
    console.log(`  👤 ${data.displayName || '(sem nome)'} | ${email} | role: ${currentRole}`);
    
    if (ADMIN_EMAILS.includes(email) && currentRole !== 'admin') {
      console.log(`     ⚡ Atualizando role de "${currentRole}" para "admin"...`);
      await updateDoc(doc(db, 'users', userDoc.id), { role: 'admin' });
      console.log(`     ✅ Role atualizada com sucesso!`);
    }
  }
  
  console.log('\n🎯 Processo concluído!');
  process.exit(0);
}

fixAdminRoles().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});
