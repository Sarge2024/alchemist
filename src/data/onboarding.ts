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
  {
    id: "trivia_ethanol_solvente",
    question: "O que caracteriza a estrutura molecular do etanol como um \"solvente de ponte\"?",
    options: [
      "Sua capacidade de congelar a temperaturas inferiores a 0°C.",
      "Sua natureza anfifílica, com partes polares e apolares.",
      "Sua alta viscosidade em comparação com óleos vegetais."
    ],
    correctAnswer: 1,
    explanation: "A estrutura molecular possui uma extremidade polar (hidroxila) e uma apolar (etil), permitindo interagir e dissolver ambos os meios.",
    xpReward: 100,
  },
  {
    id: "trivia_alcool_tensao",
    question: "Qual é o impacto culinário direto da baixa tensão superficial do álcool?",
    options: [
      "Aumentar o tempo de cozimento de carnes vermelhas.",
      "Melhorar a adesão de massas e a penetração de marinadas.",
      "Impedir a dissolução de açúcares em caldos frios."
    ],
    correctAnswer: 1,
    explanation: "A baixa tensão superficial facilita que o líquido penetre de forma mais eficiente nos ingredientes alimentares.",
    xpReward: 100,
  },
  {
    id: "trivia_vodka_tomate",
    question: "Por que a vodka é frequentemente utilizada em molhos de tomate?",
    options: [
      "Para aumentar a acidez natural do fruto.",
      "Para liberar notas de sabor aprisionadas que não são solúveis em água.",
      "Para acelerar o processo de caramelização dos açúcares."
    ],
    correctAnswer: 1,
    explanation: "O etanol solubiliza os compostos aromáticos lipossolúveis presentes no tomate que a água sozinha não consegue extrair.",
    xpReward: 100,
  },
  {
    id: "trivia_alcool_volatilidade",
    question: "Como a volatilidade do álcool influencia a experiência sensorial?",
    options: [
      "Neutraliza os odores indesejados da proteína animal.",
      "Transporta compostos aromáticos dissolvidos para o ar, saturando o olfato.",
      "Reduz a temperatura interna da panela, preservando vitaminas."
    ],
    correctAnswer: 1,
    explanation: "Ao evaporar rapidamente devido ao baixo ponto de ebulição, o álcool carrega as moléculas aromáticas diretamente ao epitélio olfativo.",
    xpReward: 100,
  },
  {
    id: "trivia_fond",
    question: "O que é o fond no contexto culinário?",
    options: [
      "Uma técnica de corte francesa para vegetais de raiz.",
      "Resíduos concentrados de sabor gerados por caramelização e Reação de Maillard.",
      "O líquido resultante da fermentação primária de uvas."
    ],
    correctAnswer: 1,
    explanation: "O fond consiste nos compostos ricos em sabor que aderem ao fundo do recipiente após dourar o alimento.",
    xpReward: 100,
  },
  {
    id: "trivia_deglaceamento_vinho",
    question: "Qual a vantagem química do vinho sobre a água no deglaceamento?",
    options: [
      "O vinho impede que a temperatura da panela ultrapasse 100°C.",
      "A acidez e o álcool do vinho dissolvem compostos insolúveis em meios puramente aquosos.",
      "O vinho elimina completamente a necessidade de usar sal na preparação."
    ],
    correctAnswer: 1,
    explanation: "A combinação de pH baixo (acidez) que ajuda na hidrólise proteica com o etanol dissolve os compostos complexos da Reação de Maillard.",
    xpReward: 100,
  },
  {
    id: "trivia_etanol_amaciamento",
    question: "Como o etanol promove o amaciamento físico da carne?",
    options: [
      "Selando as fibras para impedir a saída de sucos naturais.",
      "Desnaturando proteínas e rompendo interações hidrofóbicas que mantêm a estrutura muscular.",
      "Criando uma barreira de gordura que lubrifica o corte."
    ],
    correctAnswer: 1,
    explanation: "O álcool rompe as pontes de hidrogênio e as ligações da estrutura proteica, causando relaxamento das fibras e retenção de umidade.",
    xpReward: 100,
  },
  {
    id: "trivia_marinar_alcool",
    question: "Qual o risco de marinar carnes em meios enzimáticos alcoólicos por tempo excessivo?",
    options: [
      "A carne tornar-se extremamente dura devido à perda de água.",
      "A degradação excessiva das fibras, resultando em uma textura indesejável e 'pastosa'.",
      "A neutralização total de qualquer sabor de temperos adicionados."
    ],
    correctAnswer: 1,
    explanation: "Marinadas longas demais (passando de 24 horas) degradam colágeno e elastina de forma agressiva, arruinando a textura física da carne.",
    xpReward: 100,
  },
  {
    id: "trivia_fritura_alcool",
    question: "O que ocorre com o álcool no momento em que a massa atinge o óleo a 180°C?",
    options: [
      "Ele se liquefaz e penetra no alimento.",
      "Ele sofre vaporização instantânea (flash), criando micro-canais de ar.",
      "Ele endurece instantaneamente, formando uma barreira impermeável ao vapor."
    ],
    correctAnswer: 1,
    explanation: "Pelo baixo ponto de ebulição, ocorre a vaporização flash que abre bolhas de ar e expele o vapor interno.",
    xpReward: 100,
  },
  {
    id: "trivia_massas_alcool_gordura",
    question: "Por que massas com álcool tendem a ser menos gordurosas?",
    options: [
      "Porque o álcool dissolve a gordura do óleo de fritura.",
      "A pressão de vapor do álcool saindo da massa atua como barreira física contra a entrada de óleo.",
      "Porque o álcool aumenta a viscosidade da massa, repelindo o óleo."
    ],
    correctAnswer: 1,
    explanation: "A rápida saída dos vapores de etanol gera uma pressão positiva empurrando para fora, bloqueando a penetração de óleo na crosta.",
    xpReward: 100,
  },
  {
    id: "trivia_vodka_tortas",
    question: "Por que se utiliza vodka em massas de tortas (pie crusts)?",
    options: [
      "Para conferir um sabor picante à massa.",
      "Para inibir a formação excessiva de glúten, garantindo maciez e folhagem.",
      "Para impedir que a massa cresça durante o cozimento."
    ],
    correctAnswer: 1,
    explanation: "A hidratação do glúten necessita de água livre; ao usar vodka (40% de álcool), reduz-se a água disponível para ativar a rede elástica proteica.",
    xpReward: 100,
  },
  {
    id: "trivia_etanol_forno",
    question: "O que acontece com o etanol após desempenhar seu papel estrutural na massa?",
    options: [
      "Ele permanece líquido, mantendo a massa úmida após o resfriamento.",
      "Ele evapora rapidamente no forno, deixando uma estrutura proteica fragmentada.",
      "Ele reage quimicamente com o açúcar para formar gás carbônico."
    ],
    correctAnswer: 1,
    explanation: "O álcool cumpre o papel de dar liga na manipulação fria e evapora totalmente no calor do forno, garantindo a textura quebradiça.",
    xpReward: 100,
  },
  {
    id: "trivia_flambagem_retencao",
    question: "Quanto álcool, em média, permanece em um prato após a técnica de flambagem?",
    options: [
      "0%.",
      "25%.",
      "75%."
    ],
    correctAnswer: 2,
    explanation: "Contra a intuição popular, a flambagem consome apenas os vapores superficiais, mantendo cerca de 75% do álcool original no alimento.",
    xpReward: 100,
  },
  {
    id: "trivia_fervura_alcool",
    question: "Qual fator acelera a perda de álcool durante a fervura?",
    options: [
      "O uso de um caldeirão alto e estreito.",
      "Uma maior área de superfície exposta, como em uma frigideira larga.",
      "Manter o recipiente hermeticamente fechado."
    ],
    correctAnswer: 1,
    explanation: "Quanto maior a superfície de evaporação livre exposta à atmosfera, mais acelerada será a quebra do equilíbrio azeotrópico.",
    xpReward: 100,
  },
  {
    id: "trivia_flambagem_quimica",
    question: "Qual o principal efeito químico da flambagem na superfície do alimento?",
    options: [
      "Cozimento profundo das fibras internas.",
      "Caramelização ultrarrápida e reações de pirólise controlada.",
      "Hidratação intensa da pele do ingrediente."
    ],
    correctAnswer: 1,
    explanation: "O calor gerado pela chama ultrapassa 500°C, modificando os açúcares e as proteínas da superfície, agregando notas defumadas.",
    xpReward: 100,
  },
  {
    id: "trivia_ponto_fulgor",
    question: "Para que uma bebida possa ser flambada, ela deve atingir qual condição?",
    options: [
      "Ponto de congelamento.",
      "Ponto de fulgor (liberação de vapores inflamáveis).",
      "Saturação total de açúcares residuais."
    ],
    correctAnswer: 1,
    explanation: "O líquido precisa estar aquecido o suficiente para desprender vapores combustíveis capazes de sustentar a chama inicial.",
    xpReward: 100,
  },
  {
    id: "trivia_vinho_gordura",
    question: "Como o vinho auxilia na degustação de pratos ricos em gordura?",
    options: [
      "Aumentando a viscosidade da saliva.",
      "A acidez do vinho ajuda a remover moléculas de gordura das papilas gustativas.",
      "O álcool do vinho solidifica a gordura, facilitando a digestão."
    ],
    correctAnswer: 1,
    explanation: "A alta acidez faz uma limpeza química das papilas, cortando a sensação untuosa e preparando o paladar para a próxima garfada.",
    xpReward: 100,
  },
  {
    id: "trivia_alcool_pimenta",
    question: "Qual o efeito de combinar bebidas de alto teor alcoólico com comidas muito picantes?",
    options: [
      "O álcool neutraliza completamente a ardência da pimenta.",
      "Ele exacerba a sensação de calor produzida pela capsaicina.",
      "Ele transforma o sabor picante em um sabor doce."
    ],
    correctAnswer: 1,
    explanation: "O álcool atua estimulando os receptores de calor VR1, gerando um efeito cumulativo e intensificando a ardência da pimenta.",
    xpReward: 100,
  },
  {
    id: "trivia_taninos_carne",
    question: "Qual o papel dos taninos do vinho tinto ao cozinhar carnes vermelhas?",
    options: [
      "Eles impedem que a carne escureça durante o cozimento.",
      "Eles se ligam às proteínas da carne, suavizando a adstringência do molho.",
      "Eles aceleram a fermentação natural da proteína animal."
    ],
    correctAnswer: 1,
    explanation: "Ao se ligarem quimicamente às proteínas da carne, os taninos perdem a capacidade de amarrar a boca, arredondando o sabor do molho.",
    xpReward: 100,
  },
  {
    id: "trivia_lupulo_reducao",
    question: "Por que reduções longas de cervejas muito lupuladas (como IPAs) devem ser evitadas?",
    options: [
      "Porque o álcool se torna tóxico ao ser reduzido.",
      "Porque o amargor do lúpulo se concentra, tornando o molho desagradável.",
      "Porque a cerveja perde toda a sua cor original."
    ],
    correctAnswer: 1,
    explanation: "Os ácidos alfa do lúpulo não evaporam com a água; ao reduzir o volume, a concentração de amargor sobe a níveis intragáveis.",
    xpReward: 100,
  },
  {
    id: "trivia_probiotico_fermentado",
    question: "Qual a diferença fundamental entre um alimento fermentado e um probiótico?",
    options: [
      "Todo alimento fermentado é, por definição, probiótico.",
      "Probióticos exigem identificação de cepas específicas e comprovação clínica de benefícios.",
      "Alimentos fermentados são sempre sólidos, enquanto probióticos são líquidos."
    ],
    correctAnswer: 1,
    explanation: "Para receber a alcunha de probiótico, o produto deve carregar microrganismos vivos específicos com eficácia à saúde humana chancelada por estudos.",
    xpReward: 100,
  },
  {
    id: "trivia_eps_fermentacao",
    question: "O que são exopolissacarídeos (EPSs) produzidos na fermentação?",
    options: [
      "Açúcares simples que causam cáries.",
      "Polímeros que podem ter efeitos antioxidantes, antivirais e redutores de colesterol.",
      "Resíduos tóxicos que devem ser filtrados antes do consumo."
    ],
    correctAnswer: 1,
    explanation: "São biopolímeros funcionais secretados por bactérias benéficas protetoras que auxiliam na modulação imune e metabólica.",
    xpReward: 100,
  }
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
