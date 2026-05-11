import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

async function testPublicRead() {
  console.log('--- Testando Leitura Pública do Firestore ---');
  console.log(`Projeto: ${firebaseConfig.projectId}`);
  
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    const q = query(collection(db, 'recipes'), limit(1));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('✅ Conectado com sucesso, mas a coleção "recipes" está vazia.');
    } else {
      console.log(`✅ Sucesso! Consegui ler ${snapshot.size} receita(s) sem autenticação.`);
      console.log('Título da primeira receita:', snapshot.docs[0].data().title);
    }
  } catch (error: any) {
    console.error('❌ FALHA NA LEITURA PÚBLICA:');
    console.error(`Código do Erro: ${error.code}`);
    console.error(`Mensagem: ${error.message}`);
    
    if (error.code === 'permission-denied') {
      console.log('\nAnálise: O Firebase RECUSOU o acesso. As regras no Console não estão permitindo leitura pública ou o App Check está bloqueando.');
    }
  }
  
  process.exit();
}

testPublicRead();
