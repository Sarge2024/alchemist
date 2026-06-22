import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const QA_DATA = [
  {
    question: 'O que são técnicas de confeitaria e por que elas são tão importantes?',
    answer: 'As técnicas de confeitaria são métodos que garantem estrutura, sabor e segurança nas receitas doces. Para quem está começando, dominar essas técnicas evita erros comuns e melhora a consistência dos resultados desde as primeiras preparações.'
  },
  {
    question: 'Quem está começando precisa dominar todas as técnicas de confeitaria?',
    answer: 'Não. O ideal é começar pelas técnicas de confeitaria básicas, como preparo de massas, controle de forno e cremes simples. Com a prática, novas técnicas podem ser incorporadas de forma gradual e segura.'
  },
  {
    question: 'Confeitaria para iniciantes exige equipamentos profissionais?',
    answer: 'Não. A confeitaria para iniciantes pode ser feita com utensílios domésticos básicos. O mais importante é entender as técnicas e respeitar medidas, tempos e temperaturas, independentemente do equipamento.'
  },
  {
    question: 'É possível aprender confeitaria sozinho?',
    answer: 'Sim. Muitas pessoas conseguem aprender confeitaria por conta própria, usando conteúdos educativos, receitas bem explicadas e prática constante. A evolução acontece quando as técnicas são compreendidas, e não apenas copiadas.'
  },
  {
    question: 'Quais técnicas de confeitaria ajudam a evitar erros comuns?',
    answer: 'Técnicas como pesar ingredientes, respeitar o pré-aquecimento do forno e entender o ponto correto de massas e cremes são fundamentais. Essas práticas reduzem falhas e garantem melhores resultados.'
  },
  {
    question: 'Posso adaptar receitas antes de dominar as técnicas de confeitaria?',
    answer: 'Para iniciantes, não é recomendado. Antes de adaptar receitas, é importante dominar as técnicas de confeitaria básicas. Isso evita problemas de textura, crescimento e sabor.'
  },
  {
    question: 'Técnicas de confeitaria são iguais para produção caseira e para venda?',
    answer: 'Sim, as técnicas são as mesmas. O que muda é o nível de controle, padronização e organização. Para quem deseja vender, dominar as técnicas é ainda mais importante para manter qualidade constante.'
  },
  {
    question: 'Quanto tempo leva para aprender técnicas básicas de confeitaria?',
    answer: 'Depende da prática. Em poucas semanas, já é possível compreender as principais técnicas de confeitaria, desde que haja repetição, atenção aos detalhes e aprendizado com erros.'
  },
  {
    question: 'Quais técnicas de confeitaria são mais importantes para quem quer empreender?',
    answer: 'Além das técnicas de preparo, é essencial dominar organização, armazenamento correto e controle de custos. Essas práticas garantem segurança e viabilidade financeira.'
  },
  {
    question: 'Onde encontrar ingredientes adequados para aprender confeitaria?',
    answer: 'Supermercados que oferecem variedade e qualidade facilitam o aprendizado. A Covabra, por exemplo, disponibiliza ingredientes e orientações que apoiam quem deseja aprender confeitaria com mais segurança.'
  },
  {
    question: 'Não se deve abrir o forno quando o bolo está assando?',
    answer: 'Se forem massas que levam fermento, não se deve abrir o forno na primeira meia hora. Pois é esse tempo que o fermento precisa para agir e fazer o bolo crescer e ficar firme. Se entrar uma corrente de ar frio no forno nesse período, seu bolo vai murchar.'
  },
  {
    question: 'Como faz para limpar cogumelos?',
    answer: 'Jamais lave cogumelos frescos. Eles são como esponjas e absorvem muita água. Se lavá-los, ficarão molengos e encharcados na panela. O ideal é limpá-los com papel toalha e uma escova de cerdas macias.'
  },
  {
    question: 'Como fazer com que a clara do ovo frito cozinhe e a gema fique mole?',
    answer: 'Na frigideira quente com azeite ou manteiga, coloque primeiro somente a clara e, depois de um minuto, quando ela começar a coagular (ficar branca) entre com a gema e deixe até o ponto desejado. Lembrando que o ideal é fazer o ovo frito em fogo médio.'
  },
  {
    question: 'Como evitar que a batata descascada e cortada escureça?',
    answer: 'Deixe sempre mergulhada em água fria até o momento de ir pra panela. Isso vale para batatas fritas ou assadas. Mas sempre seque-as antes de cozinhar.'
  },
  {
    question: 'O óleo na água de cozimento do macarrão ajuda a massa a não grudar?',
    answer: 'Mito. O óleo na água só serve deixar a massa pesada e dificultar a absorção do molho. O que evitará que a massa grude é o tamanho da panela, a quantidade de água e o sal. A proporção é de 1 litro de água para cada são 100 gramas de massa e 1 colher de sopa de sal para cada 500g de massa.'
  },
  {
    question: 'É preciso lavar o macarrão depois de cozido e escorrido?',
    answer: 'Não. A não ser que a ideia seja servi-lo frio. Ou caso você esteja fazendo um pré-cozimento da massa com o intuito de finalizá-la depois junto com o molho. Do contrário, deve ir direto do escorredor para o molho, e de lá para a mesa.'
  },
  {
    question: 'Como saber se o óleo de fritura está quente o suficiente?',
    answer: 'A temperatura mais indicada para frituras sequinhas e crocantes é de 180°C a 190°C. Mas se você não tem termômetro, vale aquele antigo truque do fósforo dentro da gordura. Assim que ele acender, está no ponto. Outra dica é colocar uma colher de pau no óleo, se surgirem bolhinhas, está na temperatura certa.'
  },
  {
    question: 'O que entra primeiro no refogado, alho ou cebola?',
    answer: 'Essa é pergunta mais polêmica da cozinha de guerrilha. Há quem defenda de tudo. Mas manda a reza que a cebola deve entrar primeiro por ser muito mais rica em água. Logo, o alho queima bem mais rápido.'
  },
  {
    question: 'Falando em alho e cebola, como descascar sem sofrer (tanto)?',
    answer: 'Deixe o alho de molho na água por alguns minutos antes de descascar, isso vai fazer com que a pele solte facilmente. Já a cebola, deixe na geladeira alguns minutos antes de picar, isso vai minimizar as lágrimas.'
  },
  {
    question: 'É correto temperar carnes que serão grelhadas antes de ir ao fogo?',
    answer: 'Evite, o sal acaba desidratando a carne. O mais indicado é temperar segundos antes de levar a grelha ou chapa. Os mais preciosistas preferem temperar depois. Isso garante carnes mais suculentas.'
  },
  {
    question: 'É possível fazer meu próprio açúcar superfino em casa em vez de comprar?',
    answer: 'Sim, você pode pulsar o açúcar cristal ou refinado em um processador de alimentos ou liquidificador até que fique bem moído, como um pó.'
  },
  {
    question: 'O que é o creme half and half?',
    answer: 'É uma mistura de 50% de leite integral e 50% de creme de leite. Ele não dá ponto de chantilly, mas você pode usá-lo na confeitaria como um substituto para o creme de leite fresco para reduzir a gordura.'
  },
  {
    question: 'Qual é a diferença entre um ovo cozido com gema mole e um com gema dura?',
    answer: 'O ovo com gema mole é preparado da mesma forma que o de gema dura, mas cozinha por menos tempo — a gema fica líquida em vez de firme. Já os ovos com cozimento médio têm a gema levemente firme.'
  },
  {
    question: 'Existe alguma maneira de evitar que purê de batatas mude de cor depois de congelados?',
    answer: 'Adicione uma colher de sopa de vinagre ou suco de limão ao purê de batatas antes de congelar. Isso ajudará a evitar que a descoloração aconteça.'
  },
  {
    question: 'Existe uma maneira de congelar ovos para consumo futuro?',
    answer: 'Sim, você pode congelar ovos, mas como não conseguirá separar a gema da clara após o descongelamento, você deve separá-las antes de congelar ou misturar a gema ao ovo antes do congelamento.'
  },
  {
    question: 'Tudo bem substituir o óleo vegetal por azeite de oliva em receitas de bolos e doces?',
    answer: 'Você pode assar com azeite de oliva, mas como ele tem um sabor mais forte que o óleo vegetal comum, isso afetará o sabor do produto final. Se precisar usar azeite, escolha um que tenha um sabor mais suave/leve.'
  },
  {
    question: 'Existe uma maneira de trazer os ovos para a temperatura ambiente rapidamente?',
    answer: 'Com certeza! Basta cobrir os ovos em uma tigela pequena com água morna (não quente). Eles estarão prontos para o uso em cerca de 5 minutos.'
  },
  {
    question: 'Como saber se um pacote de fermento biológico seco ainda está bom?',
    answer: 'Teste adicionando 1 colher de chá de açúcar a 1/4 de xícara de água morna e misture o fermento. Deixe descansar por 10 minutos; se o fermento espumar até a marca de 1/2 xícara, ele está ativo.'
  },
  {
    question: 'Percebo que quando faço biscoitos caseiros, eles se espalham demais. Alguma ideia do porquê?',
    answer: 'Você pode estar untando demais as assadeiras. Outra ideia é testar a temperatura do forno: se o calor estiver muito baixo, isso pode fazer com que os biscoitos se espalhem.'
  },
  {
    question: 'É seguro usar um vidro antigo de tempero que não consigo ver a data de validade?',
    answer: 'As especiarias não estragam (não apodrecem), mas perdem o sabor com o tempo. Se a cor parecer boa, prove um pouco para ver se ainda resta algum sabor.'
  },
  {
    question: 'O bloco de queijo duro com mofo pode ser salvo ou deve ser jogado fora?',
    answer: 'Se você cortar profundamente ao redor do mofo ou da parte antiga e removê-la, o restante do bloco de queijo estará próprio para o consumo.'
  },
  {
    question: 'Por quanto tempo o molho de carne (gravy) pode ficar congelado?',
    answer: 'Para obter os melhores resultados, consuma o molho dentro de um mês.'
  },
  {
    question: 'Tenho algumas misturas para bolo vencidas há pouco tempo — ainda estão boas para assar?',
    answer: 'Jogue fora. Os ingredientes podem estar rançosos ou ter perdido o sabor, além de que provavelmente o bolo não vai crescer bem.'
  },
  {
    question: 'Que tamanho de ovo devo usar se a receita não estipular o tamanho?',
    answer: 'Ovos grandes são o padrão, a menos que indicado de outra forma.'
  },
  {
    question: 'Qual é a diferença entre leite evaporado e leite condensado açucarado?',
    answer: 'Ambos têm uma grande porcentagem de água removida do produto (60%). Porém, a versão evaporada não tem adição de açúcar, ao contrário da versão condensada.'
  },
  {
    question: 'Existe um substituto para o extrato de baunilha que funcione na confeitaria?',
    answer: 'Tente extrato de amêndoa, essência de conhaque, xarope de bordo, baunilha em pó ou essência de rum. Se tiver uma fava de baunilha, 1/4 de fava equivale a 1/2 colher de chá de extrato.'
  },
  {
    question: 'Qual é a diferença entre o extrato artificial e o puro?',
    answer: 'A baunilha pura é feita pela infusão de favas em água e álcool etílico. As variedades de imitação são fabricadas quimicamente.'
  },
  {
    question: 'Como evitar que as fatias de maçã fiquem escuras depois de descascadas?',
    answer: 'Mergulhá-las em suco de limão ou refrigerante de limão (como Soda/7-Up) ajuda a evitar que as maçãs escureçam.'
  },
  {
    question: 'Como saber se o alho está fresco?',
    answer: 'A casca (semelhante a um papel) deve estar firme e os dentes bem rígidos quando você aperta a cabeça de alho.'
  },
  {
    question: 'Qual é a melhor maneira de armazenar batatas?',
    answer: 'Armazene as batatas em um local fresco e escuro para obter os melhores resultados. Guardá-las na geladeira é frio demais e aumenta o teor de açúcar nelas.'
  },
  {
    question: 'O que é essência de baunilha?',
    answer: 'No Reino Unido é outro termo para a baunilha de imitação (artificial). Em outros lugares, é uma forma altamente concentrada de extrato puro.'
  },
  {
    question: 'O que é baunilha em pó?',
    answer: 'É um pó feito de favas de baunilha secas e é um bom substituto para quem deseja um aromatizante sem álcool.'
  },
  {
    question: 'Quanto equivale a um "pedaço/noz" (knob) de manteiga?',
    answer: 'Não é uma medida exata, mas equivale a cerca de duas colheres de sopa.'
  },
  {
    question: 'O que é heavy cream?',
    answer: 'É um creme de leite fresco para bater com 36% a 40% de teor de gordura.'
  },
  {
    question: 'O que é exatamente a "ghee"?',
    answer: 'É o líquido amarelo claro obtido ao derreter manteiga sem sal e descartar os resíduos sólidos que se acumulam no fundo (manteiga clarificada).'
  },
  {
    question: 'O que é óleo de salada (salad oil) e tudo bem substituí-lo por óleo vegetal comum?',
    answer: 'Óleo de salada é um termo geral para qualquer óleo vegetal comestível. Você pode usar óleo de oliva, canola, açafrão, etc.'
  },
  {
    question: 'Qual é a diferença entre bicarbonato de sódio e fermento em pó?',
    answer: 'O bicarbonato de sódio é um agente de ação rápida (quando em contato com um ácido líquido), enquanto o fermento em pó age de forma mais lenta, dissolvendo-se ao assar.'
  },
  {
    question: 'Para que serve o pó de alúmen e onde é possível comprá-lo?',
    answer: 'O pó de alúmen é comum em receitas de conserva (picles), pois ajuda a manter os vegetais crocantes.'
  },
  {
    question: 'Quanto sal eu adiciono ao substituir a manteiga com sal por manteiga sem sal?',
    answer: 'Adicione 1/4 de colher de chá de sal para cada 1/2 xícara de manteiga.'
  },
  {
    question: 'Qual é a diferença entre extrato de tomate (tomato paste) e molho de tomate (tomato sauce)?',
    answer: 'O extrato de tomate é um concentrado espesso. O molho de tomate tem uma consistência mais líquida e já vem pronto para o uso.'
  },
  {
    question: 'Como assar uma torta de maçã congelada?',
    answer: 'Para uma torta crua que foi congelada, coloque-a direto no forno (não descongele) a 200°C por cerca de 60 minutos.'
  },
  {
    question: 'O que são dill heads?',
    answer: 'São as inflorescências (a parte com flores) da planta do endro (dill).'
  },
  {
    question: 'Tudo bem reutilizar o óleo de cozinha após uma fritura por imersão?',
    answer: 'Sim, mas o ponto de fumaça diminui a cada uso. Coe e armazene em recipiente hermético. Se estiver com um cheiro estranho, descarte.'
  },
  {
    question: 'Em qual temperatura minha geladeira deve estar configurada?',
    answer: 'A temperatura ideal é abaixo de 4°C / 40°F.'
  },
  {
    question: 'Acho que a temperatura do meu forno não está correta, existe uma maneira de testar isso?',
    answer: 'Coloque um termômetro de forno na grade central. Pré-aqueça a 220°C. Verifique a temperatura no termômetro e faça o ajuste de compensação caso esteja marcando errado.'
  },
  {
    question: 'Por quanto tempo os ovos cozidos duram?',
    answer: 'Mantenha-os refrigerados e eles estarão bons por uma semana.'
  },
  {
    question: 'Como se escalda o leite?',
    answer: 'Aqueça-o até o ponto em que o leite comece a soltar vapor e pequenas bolhas apareçam nas bordas externas — você não deve deixar atingir o ponto de fervura.'
  },
  {
    question: 'Qual é a diferença entre o açúcar mascavo claro e o escuro?',
    answer: 'A versão clara tem menos melaço do que a versão escura.'
  },
  {
    question: 'É possível fazer uma quantidade de suco de laranja para alguns dias e guardar na geladeira?',
    answer: 'O suco de laranja fresco dura bem na geladeira por cerca de 3 dias.'
  },
  {
    question: 'Qual é a diferença entre ovos brancos e ovos vermelhos/marrons?',
    answer: 'Não há diferenças nutricionais ou de sabor. A raça da galinha é o que determina a cor.'
  },
  {
    question: 'Como sei se minha farinha está boa ou ruim?',
    answer: 'A farinha estragada exala um odor "estranho" e rançoso. Você pode checar por carunchos flutuando em água morna.'
  },
  {
    question: 'A gordura de bacon pode ser congelada?',
    answer: 'Sim, pode. Mas mantê-la refrigerada em um pote de vidro já garante durabilidade por meses sem problemas.'
  },
  {
    question: 'Devo untar e enfarinhar formas de bolo antiaderentes?',
    answer: 'Se a receita pede, unte pelo menos. A farinha é opcional nestas formas, mas sempre recomendada.'
  },
  {
    question: 'Quanto tempo dura o azeite de oliva?',
    answer: 'O azeite de oliva dura cerca de dois anos; se ficar rançoso, haverá um cheiro forte característico.'
  },
  {
    question: 'Como meço as formas de bolo para ver qual é o tamanho delas?',
    answer: 'Meça de uma borda interna até a outra borda interna.'
  },
  {
    question: 'Tenho uma receita de bolo favorita, posso tentar fazer cupcakes com ela?',
    answer: 'Sim, preencha as forminhas até um pouco acima da metade e asse a 180°C por cerca de 18 a 20 minutos.'
  },
  {
    question: 'Há manchas brancas polvilhadas no meu chocolate de confeiteiro, ainda está próprio para o uso?',
    answer: 'Sim. Isso é o "fat bloom", acontece por variações de temperatura. O chocolate ainda pode ser consumido e usado sem problemas.'
  },
  {
    question: 'É possível derreter chocolate no micro-ondas?',
    answer: 'Sim, use potência média (50%) por 1 minuto, mexa, e repita o processo até derreter completamente.'
  },
  {
    question: 'Qual é a diferença entre jam e jelly?',
    answer: 'A jelly (geleia translúcida) é feita apenas com o suco da fruta, enquanto a jam (geleia com pedaços) usa a fruta inteira.'
  }
];

export function QuizPopups() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3 mb-8">
        <HelpCircle className="w-8 h-8 text-amber-600" />
        <h2 className="text-3xl font-bold text-slate-800">Dicas Preciosas da Cozinha</h2>
      </div>
      
      <div className="grid gap-4">
        {QA_DATA.map((qa, index) => {
          const isOpen = openIndex === index;
          
          return (
            <motion.div 
              key={index}
              layout
              className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
            >
              <button
                onClick={() => toggleQuestion(index)}
                className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors"
              >
                <span className="text-left font-medium text-slate-700 pr-8">
                  {qa.question}
                </span>
                
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                    {isOpen ? 'Esconder' : 'Mostrar Resposta'}
                  </span>
                  <motion.div
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  </motion.div>
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                  >
                    <div className="px-6 pb-5 pt-2 text-slate-600 leading-relaxed border-t border-slate-100">
                      {qa.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
