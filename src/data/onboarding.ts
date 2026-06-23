import { TriviaQuestion, AcervoArticle } from "../types/onboarding";

export const CULINARY_PATHS = [
  {
    id: "masas",
    name: "Mestre das Massas Clássicas",
    description: "Domine a arte das massas frescas, molhos italianos aveludados e panificação artesanal.",
    icon: "🍝",
    color: "from-amber-400 to-orange-500",
  },
  {
    id: "carnes",
    name: "Alquimista da Grelha & Churrasco",
    description: "Entenda os cortes perfeitos, pontos da carne, salga correta e o segredo do braseiro profissional.",
    icon: "🥩",
    color: "from-red-500 to-orange-700",
  },
  {
    id: "confeitaria",
    name: "Arquiteto da Confeitaria Fina",
    description: "Explore a precisão milimétrica de chocolate, glaçagens espelhadas e merengues estruturados.",
    icon: "🍰",
    color: "from-pink-400 to-rose-600",
  },
  {
    id: "vegana",
    name: "Visionário de Plantas & Cozinha Saudável",
    description: "Crie pratos extraordinários focando em vegetais frescos, fermentações, nutrição e texturas sublimes.",
    icon: "🌱",
    color: "from-emerald-400 to-teal-600",
  },
];

export const AVATARS = [
  "/avatares/novatos/1.webp",
  "/avatares/novatos/2.webp",
  "/avatares/novatos/3.webp",
  "/avatares/novatos/4.webp",
  "/avatares/novatos/5.webp",
  "/avatares/novatos/6.webp",
  "/avatares/novatos/7.webp",
  "/avatares/novatos/8.webp",
];

export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    id: "trivia_maillard",
    question: "O que é cientificamente a 'Reação de Maillard' na culinária?",
    options: [
      "O choque térmico sofrido pelos vegetais ao serem colocados em água com gelo.",
      "A reação química entre aminoácidos e açúcares que doura a comida e cria aromas complexos ao grelhar.",
      "A quebra enzimática das proteínas das carnes pela adição de limão ou vinagre.",
      "O processo de fermentação anaeróbica do pão de fermentação natural.",
    ],
    correctAnswer: 1,
    explanation: "A Reação de Maillard ocorre tipicamente a partir de 140°C, quando proteínas e carboidratos redutores na superfície do alimento interagem, formando dezenas de novos compostos aromáticos e o desejado tom dourado.",
    xpReward: 150,
  },
  {
    id: "trivia_ponto",
    question: "Qual a temperatura interna média recomendada para uma carne vermelha 'Ao Ponto para Malpassada' (Medium Raw)?",
    options: [
      "Entre 40°C e 45°C",
      "Entre 52°C e 55°C",
      "Entre 65°C e 70°C",
      "Acima de 80°C",
    ],
    correctAnswer: 1,
    explanation: "A faixa entre 52°C e 55°C mantém a carne com suculência máxima, centro bem rosado e quente, sem endurecer as fibras de colágeno.",
    xpReward: 100,
  },
  {
    id: "trivia_nutricao",
    question: "Qual nutriente ajuda a emulsificar e estabilizar uma maionese caseira feita com gema de ovo?",
    options: [
      "Vitamina C",
      "Lecitina (um fosfolipídio presente na gema)",
      "Colágeno solúvel",
      "Amido resistente",
    ],
    correctAnswer: 1,
    explanation: "A lecitina possui pontas hidrofílicas e lipofílicas, conectando eficientemente as gotículas de óleo à água do ovo, criando uma emulsão firme e aveludada.",
    xpReward: 100,
  },
];

export const ACERVO_ARTICLES: AcervoArticle[] = [
  {
    id: "art_1",
    category: "Gastronomia",
    title: "A Ciência dos Sabores: O Quinto Gosto, Umami",
    excerpt: "Descubra como os receptores de glutamato de sódio na língua revolucionaram nossa apreciação da alta gastronomia moderna.",
    content: "O conceito de Umami foi descoberto em 1908 pelo químico Kikunae Ikeda, no Japão, ao tentar isolar o gosto peculiar que vinha de caldos ricos em alga kombu. Ao contrário do doce, salgado, azedo ou amargo, o Umami está ligado à sensação de saciedade e profundidade sensorial. Alimentos como queijo parmesão curado, tomates maduros, cogumelos secos e carnes grelhadas são bombas naturais de ácido glutâmico. Utilizar ingredientes umamogênicos permite reduzir o uso de sal refinado mantendo o prato extremamente apetitoso e balanceado.",
    readTime: "4 min de leitura",
    image: "https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?w=600&fit=crop&q=80",
    difficulty: "Iniciante",
  },
  {
    id: "art_2",
    category: "Culinária",
    title: "Dominando os 5 Molhos Mãe Selecionados por Escoffier",
    excerpt: "Béchamel, Velouté, Espagnole, Tomate e Holandês. Conheça as fundações técnicas que sustentam todo restaurante clássico.",
    content: "No século XIX, o lendário chef Auguste Escoffier codificou a culinária francesa estruturando os cinco molhos fundamentais. Cada um deles utiliza um agente espessante específico ou emulsão. O Béchamel combina leite morninho engatado por um roux branco. O Velouté utiliza caldos claros de ave ou peixe espessados com roux. O Espagnole foca em caldos escuros tostados. O molho de Tomate frita aromáticos antes do purê longo. E o Holandês é a emulsão temperada e morna de gema com manteiga clarificada. O segredo está no controle preciso das temperaturas para evitar a separação da gordura.",
    readTime: "6 min de leitura",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=600&fit=crop&q=80",
    difficulty: "Intermediário",
  },
  {
    id: "art_3",
    category: "Nutrição",
    title: "O Ponto de Fumaça dos Óleos e Suas Repercussões Térmicas",
    excerpt: "Por que fritar com azeite extravirgem pode arruinar as propriedades saudáveis e alterar o sabor do seu prato de forma indesejada.",
    content: "Cada óleo vegetal possui um limite térmico chamado 'Ponto de Fumaça'. Acima dele, a gordura começa a se quebrar em fumaça cinzenta liberando acroleína, um composto tóxico e de sabor extremamente amargo. O azeite extravirgem, embora maravilhoso para finalizações frias, tem ponto de fumaça baixo (~160°C). Para frituras rápidas ou selagem em alta temperatura de carnes, prefira óleo de girassol, canola, óleo de coco refinado ou banha de porco artesanal, cuja estrutura lipídica tolera picos de até 230°C sem oxidar os ácidos graxos essenciais.",
    readTime: "5 min de leitura",
    image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&fit=crop&q=80",
    difficulty: "Avançado",
  },
];

export const RANK_MAP = {
  Novato: {
    minXp: 0,
    badge: "🍳 Aprendiz Curioso",
    perk: "Acesso total à calculadora e visualizações básicas.",
    hex: "text-gray-400",
    bg: "bg-gray-100 dark:bg-zinc-800",
  },
  Iniciante: {
    minXp: 150,
    badge: "🔥 Domador do Fogo",
    perk: "Liberado bate-papo no Lounge Comunidade e Chef IA Básico.",
    hex: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
  },
  "Chef de Linha": {
    minXp: 300,
    badge: "🔪 Mestre dos Cortes",
    perk: "Perguntas complexas ilimitadas para o Chef IA com sugestões exclusivas.",
    hex: "text-orange-500",
    bg: "bg-orange-50 dark:bg-orange-950/20",
  },
  "Sub-Chef": {
    minXp: 500,
    badge: "👑 Alquimista Assistente",
    perk: "Opção de criar tópicos fixados no lounge comunitário.",
    hex: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/20",
  },
  "Mestre Culinário": {
    minXp: 800,
    badge: "🌟 Mestre Culinário Supremo",
    perk: "Título gravado em ouro na interface e prioridade de resposta instantânea.",
    hex: "text-yellow-600",
    bg: "bg-yellow-50 dark:bg-yellow-950/20",
  },
};
