/**
 * seed-acervo-rag.ts
 * 
 * Script para cadastrar os documentos do Acervo em carne/churrasco no Firestore (coleção 'library')
 * e indexar seus sumários granulares (tópicos) no PostgreSQL (coleção 'SemanticDocument') com RAG.
 * 
 * Uso: npx tsx src/infra/scripts/seed-acervo-rag.ts
 */
import "dotenv/config";
import { initializeApp, cert, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { prisma } from "../prisma/client";
import { GoogleGenAI } from "@google/genai";
import { getAvailableGeminiKeys } from "../services/geminiKeyManager";
import fs from 'fs';
import path from 'path';

// 1. Inicializa Firebase Admin
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const serviceAccountPath = path.resolve(process.cwd(), 'sagacitas-financeiro-firebase-adminsdk-fbsvc-1298d3f890.json');

if (!fs.existsSync(configPath)) {
  console.error("❌ Arquivo de configuração firebase-applet-config.json não encontrado.");
  process.exit(1);
}

let firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let credential;
if (fs.existsSync(serviceAccountPath)) {
  credential = cert(JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')));
}

try {
  getApp();
} catch {
  initializeApp({
    projectId: firebaseConfig.projectId,
    ...(credential ? { credential } : {})
  });
}

const db = getFirestore();

// 2. Inicializa o cliente Gemini
const apiKeys = getAvailableGeminiKeys();
if (apiKeys.length === 0) {
  console.error("❌ Nenhuma GEMINI_API_KEY configurada.");
  process.exit(1);
}
const ai = new GoogleGenAI({ apiKey: apiKeys[0] });

// Definição dos itens do acervo com seus sumários e tópicos granulares
interface AcervoSeedItem {
  firestoreItem: {
    title: string;
    description: string;
    type: 'pdf' | 'ebook' | 'presentation' | 'infographic';
    category: string;
    author: string;
    url: string;
    tags: string[];
  };
  semanticChunks: {
    title: string;
    content: string;
  }[];
}

const SEED_DATA: AcervoSeedItem[] = [
  {
    firestoreItem: {
      title: "Padrão de Qualidade da Carne Angus",
      description: "Documento oficial detalhando os padrões de certificação da carne Angus, incluindo marmoreio, conformação e critérios de seleção de carnes premium.",
      type: "pdf",
      category: "Técnicas Culinárias",
      author: "Associação Brasileira de Angus",
      url: "/docs/acervo/Angus-2017.10.30-19.22.35.pdf",
      tags: ["angus", "qualidade", "marmoreio", "cortes de carne", "carne premium"]
    },
    semanticChunks: [
      {
        title: "Grau de Marmoreio na Carne Angus",
        content: "O marmoreio (gordura intramuscular) é o principal indicador de qualidade e suculência da carne Certified Angus Beef. Confere maciez superior e sabor amanteigado, pois derrete sob temperaturas baixas, umedecendo as fibras de dentro para fora."
      },
      {
        title: "Certificação Angus e Critérios de Qualidade",
        content: "Para obter a chancela Certified Angus Beef, a carcaça bovina precisa atender a requisitos estritos: maturidade jovem (dentição correspondente a animais jovens), grau mínimo de marmoreio médio a alto, cobertura de gordura externa uniforme e ausência de características de zebuínos."
      }
    ]
  },
  {
    firestoreItem: {
      title: "Manual e Cultura do Churrasco Brasileiro",
      description: "Guia completo sobre a história, rituais e técnicas do legítimo churrasco brasileiro, abordando fogo, brasa, salga e tempos de cocção dos cortes clássicos.",
      type: "pdf",
      category: "História",
      author: "Alquimia do Prato",
      url: "/docs/acervo/churrasco.pdf",
      tags: ["churrasco", "técnicas", "salga", "brasa", "história", "gastronomia brasileira"]
    },
    semanticChunks: [
      {
        title: "Origem e Tradição do Churrasco Gaúcho",
        content: "A tradição do churrasco brasileiro originou-se nos pampas com os gaúchos e tropeiros. Utilizavam valas escavadas no chão para abrigar a brasa de madeira e espetavam grandes pedaços de carne em estacas de madeira, salgando apenas com sal grosso."
      },
      {
        title: "Técnicas de Salga no Churrasco",
        content: "A salga ideal do churrasco de carnes grossas utiliza sal grosso de granulometria média ou sal de parrilla. O sal deve ser aplicado na carne minutos antes de ir para a grelha para evitar a desidratação (perda de sucos internos). Deve-se bater o excesso de sal antes de servir."
      },
      {
        title: "Reação de Maillard na Churrasqueira",
        content: "A crosta caramelizada, dourada e perfumada que se forma na superfície da carne assada na brasa é resultado da reação de Maillard. O calor intenso provoca uma reação entre os aminoácidos e açúcares da carne, criando compostos de sabor complexo e delicioso."
      }
    ]
  },
  {
    firestoreItem: {
      title: "Os 8 Melpios de Carne para Churrasco",
      description: "Análise detalhada sobre os cortes ideais para grelhar, como Picanha, Fraldinha, Contrafilé e Costela, explicando a gordura e suculência de cada um.",
      type: "pdf",
      category: "Técnicas Culinárias",
      author: "Chef Alquimista",
      url: "/docs/acervo/os-8-melhores-tipos-de-carne-para-churrasco.pdf",
      tags: ["churrasco", "cortes premium", "picanha", "fraldinha", "grelha", "contrafilé"]
    },
    semanticChunks: [
      {
        title: "Picanha: A Estrela do Churrasco",
        content: "A picanha é o corte mais cobiçado da grelha brasileira. Sua principal característica é a capa de gordura uniforme (cerca de 1cm de espessura) que protege a carne durante a cocção rápida. Deve ser servida em fatias grossas cortadas contra a fibra."
      },
      {
        title: "Fraldinha (Vazio): Fibra e Sabor",
        content: "A fraldinha é um corte do corte traseiro composto por fibras longas e soltas com excelente irrigação sanguínea, conferindo sabor intenso. Deve ser selada em fogo forte rapidamente para reter seus sucos e fatiada no sentido transversal das fibras."
      },
      {
        title: "Costela Bovina na Brasa Lenta",
        content: "A costela exige paciência e cozimento indireto lento (fogo de chão ou bafo por 4 a 6 horas). Esse processo quebra as fibras de colágeno presentes no corte, derretendo a gordura entre os ossos e tornando a carne extremamente macia e soltando do osso."
      },
      {
        title: "Contrafilé e Bife de Ancho",
        content: "O contrafilé é um corte nobre e versátil, muito apreciado na forma de Bife de Chorizo ou Bife Ancho (corte com faixa de gordura interna). Exige grelha bem quente para selar por fora mantendo o interior suculento e rosado."
      }
    ]
  },
  {
    firestoreItem: {
      title: "Qualidade Nutricional da Carne Vermelha",
      description: "Estudo científico sobre a composição nutricional, aminoácidos essenciais, ferro heme e vitamina B12 presentes na carne vermelha e seu papel na dieta.",
      type: "pdf",
      category: "Nutrição",
      author: "Nutri-Alchemist Research",
      url: "/docs/acervo/qualidade-nutricional-da-carne-vermelha.pdf",
      tags: ["nutrição", "carne vermelha", "ferro heme", "b12", "proteínas", "saúde"]
    },
    semanticChunks: [
      {
        title: "Ferro Heme e sua Biodisponibilidade na Carne",
        content: "A carne vermelha é uma das fontes mais ricas e biodisponíveis de ferro heme. Ao contrário do ferro não-heme de origem vegetal, o ferro heme é facilmente absorvido pelo trato intestinal humano, combatendo anemias de forma altamente eficiente."
      },
      {
        title: "Vitamina B12 e Aminoácidos Essenciais",
        content: "A carne vermelha é uma fonte indispensável de Vitamina B12 (cobalamina), nutriente fundamental para o desenvolvimento neural e formação das células vermelhas do sangue. Além disso, contém todos os aminoácidos essenciais de alto valor biológico."
      }
    ]
  },
  {
    firestoreItem: {
      title: "Fichas Técnicas de Cortes Bovinos",
      description: "Fichas técnicas detalhadas com peso, rendimento, teor de gordura e métodos recomendados de preparo para cada corte bovino.",
      type: "pdf",
      category: "Técnicas Culinárias",
      author: "TecMeat Bovinos",
      url: "/docs/acervo/FICHAS-TÉCNICAS-TECMEAT-BOVINO.compressed.pdf",
      tags: ["fichas técnicas", "rendimento", "bovino", "informação técnica", "açougue"]
    },
    semanticChunks: [
      {
        title: "Rendimento de Cortes de Traseiro Bovino",
        content: "As fichas técnicas de rendimento indicam que cortes do traseiro como Alcatra, Maminha e Picanha têm excelente aproveitamento para grelha direta e bifes, com baixo percentual de quebra por aparas de gordura ou ossos."
      },
      {
        title: "Métodos de Preparo Sugeridos nas Fichas Técnicas",
        content: "Cortes ricos em colágeno e fibras duras do dianteiro (Acém, Paleta, Peito) são recomendados para cozimento sob pressão ou braseado lento. Cortes nobres e macios do traseiro (Filé Mignon, Alcatra, Picanha) são ideais para calor seco rápido (grelha, frigideira)."
      }
    ]
  },
  {
    firestoreItem: {
      title: "Brazilian Beef: Global Standards",
      description: "Manual de referência global sobre a produção de carne bovina no Brasil, mapeando sustentabilidade, segurança alimentar e padrões técnicos de exportação.",
      type: "pdf",
      category: "Cultura",
      author: "ABIEC",
      url: "/docs/acervo/Brazilian_Beef_Global_Standards.pdf",
      tags: ["carne brasileira", "exportação", "sustentabilidade", "padrão técnico", "abiec"]
    },
    semanticChunks: [
      {
        title: "Segurança Alimentar e Rastreabilidade do Gado",
        content: "O Brasil segue rígidos padrões internacionais de segurança sanitária animal. O sistema de rastreabilidade permite monitorar a trajetória do boi desde a fazenda de origem até o frigorífico, garantindo carne livre de resíduos e doenças."
      },
      {
        title: "Sustentabilidade e Pastagens Tropicais",
        content: "A pecuária de corte brasileira baseia-se principalmente em pastagens tropicais nativas e cultivadas, permitindo a criação do gado a pasto (sistema sustentável e extensivo). Isso resulta em carnes mais magras e com perfil de ácidos graxos diferenciado."
      }
    ]
  },
  {
    firestoreItem: {
      title: "Apresentação Interativa de Cortes Bovinos",
      description: "Slide interativo com infográficos explicativos sobre a anatomia do boi e a localização exata de cada corte (acém, picanha, alcatra, etc.).",
      type: "presentation",
      category: "Técnicas Culinárias",
      author: "Alquimia do Prato",
      url: "/docs/acervo/apresenta_o_interativa_de_cortes_bovinos.html",
      tags: ["interativo", "anatomia bovina", "cortes", "infográfico", "apresentação"]
    },
    semanticChunks: [
      {
        title: "Localização Anatômica dos Cortes Bovinos",
        content: "A anatomia bovina divide os cortes em categorias de maciez: os cortes de menor movimentação muscular (como o lombo/filé mignon e picanha localizados no traseiro) são macios por natureza. Os cortes de maior esforço físico (dianteiro e pescoço) contêm mais colágeno."
      },
      {
        title: "O Cupim e sua Importância na Cultura do Dianteiro Bovino",
        content: "O cupim é a corcova característica de raças zebuínas (como o Nelore) criadas no Brasil. É constituído por feixes de fibras musculares entremeados por depósitos densos de gordura e colágeno, exigindo cocção lenta ou defumação longa para se tornar macio."
      }
    ]
  }
];

async function seed() {
  console.log("🚀 Semeando itens do acervo no Firestore e indexando no RAG...");

  for (const entry of SEED_DATA) {
    const { firestoreItem, semanticChunks } = entry;

    // 1. Salvar / Atualizar no Firestore
    const querySnapshot = await db.collection('library')
      .where('title', '==', firestoreItem.title)
      .get();

    let docId = "";
    if (querySnapshot.empty) {
      const docRef = await db.collection('library').add({
        ...firestoreItem,
        createdAt: FieldValue.serverTimestamp()
      });
      docId = docRef.id;
      console.log(`✅ [Firestore] Adicionado: "${firestoreItem.title}" (ID: ${docId})`);
    } else {
      const docRef = querySnapshot.docs[0].ref;
      docId = docRef.id;
      await docRef.update({
        ...firestoreItem,
        updatedAt: FieldValue.serverTimestamp()
      });
      console.log(`🟡 [Firestore] Atualizado: "${firestoreItem.title}" (ID: ${docId})`);
    }

    // 2. Gerar Embeddings e salvar no PostgreSQL (SemanticDocument)
    console.log(`   📝 Gerando RAG embeddings para chunks de "${firestoreItem.title}"...`);
    for (const chunk of semanticChunks) {
      const chunkTitle = `${firestoreItem.title} - ${chunk.title}`;
      const chunkContent = chunk.content;
      const docType = firestoreItem.type === 'presentation' ? 'presentation' : 'article';

      try {
        // Gerar Embedding usando gemini-embedding-2
        const embedResponse = await ai.models.embedContent({
          model: "gemini-embedding-2",
          contents: `[${firestoreItem.title}] ${chunk.title}: ${chunkContent}`,
          config: {
            outputDimensionality: 768
          }
        } as any);

        const queryVector = embedResponse.embeddings?.[0]?.values;
        if (!queryVector || queryVector.length !== 768) {
          throw new Error("Erro na geração do embedding: dimensões inválidas.");
        }

        const vectorLiteral = `[${queryVector.join(',')}]`;
        const chunkId = `rag-${docId}-${chunk.title.replace(/\s+/g, '-').toLowerCase()}`;

        // Executa insert com ON CONFLICT
        await prisma.$executeRawUnsafe(`
          INSERT INTO "SemanticDocument" (id, title, content, url, type, embedding, "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6::vector, NOW())
          ON CONFLICT (id) DO UPDATE 
          SET title = EXCLUDED.title, content = EXCLUDED.content, url = EXCLUDED.url, embedding = EXCLUDED.embedding, "updatedAt" = NOW()
        `, chunkId, chunkTitle, chunkContent, firestoreItem.url, docType, vectorLiteral);

        console.log(`      ✨ Chunk indexado: "${chunk.title}"`);
      } catch (err) {
        console.error(`      ❌ Erro ao indexar chunk "${chunk.title}":`, err);
      }
    }
  }

  console.log("\n✨ Semeado com sucesso!");
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
