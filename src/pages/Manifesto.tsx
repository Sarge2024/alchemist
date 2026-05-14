/**
 * Manifesto.tsx
 * Página institucional que detalha a visão, missão e valores do Alchemist.
 * Explica a filosofia de resgate da cultura gastronômica e convida o usuário a participar.
 */
import { motion } from 'motion/react';
import { ChevronLeft, Info, Heart, BookOpen, Users, Coffee } from 'lucide-react';
import { Link } from 'react-router-dom';

import { ASSETS, getAssetUrl } from '../lib/assets';

export default function Manifesto() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-24">
      <Link to="/" className="inline-flex items-center gap-2 text-primary font-semibold mb-8 hover:underline">
        <ChevronLeft className="w-4 h-4" /> Voltar para o Início
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-12"
      >
        <header className="border-b border-primary/10 pb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider mb-6">
            <Info className="w-3 h-3" /> Conheça nossa visão
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-on-surface leading-tight font-sans">
            Mais que Receitas: Um Manifesto pelo Sabor Autêntico e pela Memória Gastronômica
          </h1>
        </header>

        <div className="prose prose-lg max-w-none text-on-surface-variant leading-relaxed space-y-8 font-sans">
          <section className="relative">
            <p className="text-xl md:text-2xl text-on-surface font-medium border-l-4 border-primary pl-6 py-2 bg-primary/5 rounded-r-xl">
              Cozinhar é, talvez, a forma mais antiga e genuína de comunicação humana. No entanto, em um mundo cada vez mais acelerado e dominado por soluções ultraprocessadas, a arte de transformar ingredientes brutos em banquetes memoráveis corre o risco de se tornar apenas uma conveniência funcional.
            </p>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Heart className="w-6 h-6" />
              <h2 className="text-2xl font-bold m-0">Nossa Proposta</h2>
            </div>
            <p>
              Nossa proposta nasce da urgência de resgatar o protagonismo do alimento, celebrando aqueles que entendem que uma refeição é um ritual de conexão, um elo entre o passado que nos moldou e o presente que compartilhamos à mesa.
            </p>
            <p>
              Acreditamos que a verdadeira sofisticação na cozinha não reside em equipamentos caros, mas na valorização dos ingredientes de verdade. Quando escolhemos o produtor local, o tempo necessário para uma fermentação natural e o tempero fresco, estamos honrando técnicas ancestrais que foram refinadas por gerações. Este espaço é um convite para quem não tem medo de sujar as mãos de farinha e para quem reconhece que o aroma de um refogado bem feito é a base de qualquer cultura civilizada. É o ponto de encontro para quem busca a excelência através da simplicidade e do respeito à natureza.
            </p>
          </section>

          <section className="grid grid-cols-1 md:grid-cols-2 gap-8 py-8">
            <div className="bg-surface-container rounded-2xl p-8 space-y-4 border border-stone-100 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-on-surface">Experiência Coletiva</h3>
              <p className="text-sm">
                Imagine um ambiente onde o segredo daquela massa perfeita de uma avó italiana converge com o domínio das especiarias de um entusiasta da culinária árabe.
              </p>
            </div>
            <div className="bg-primary/5 rounded-2xl p-8 space-y-4 border border-primary/10 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-on-surface">Legado Compartilhado</h3>
              <p className="text-sm">
                Ao compartilhar suas receitas e vivências, você não está apenas enviando uma lista de instruções; você está doando um pedaço da sua história.
              </p>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-3 text-primary">
              <Coffee className="w-6 h-6" />
              <h2 className="text-2xl font-bold m-0">Um Porto Seguro de Cultura</h2>
            </div>
            <p>
              Este ecossistema foi projetado para be um porto seguro de informação e cultura. Além das proporções e ingredientes, queremos mergulhar nas histórias por trás de cada prato, na geografia dos sabores e no porquê de cada técnica. Queremos que este seja o seu dicionário vivo de gastronomia, onde cada acesso traga um novo aprendizado sobre como a comida molda as sociedades e como podemos usar esse conhecimento para viver melhor, com mais saúde, prazer e consciência do que colocamos no prato.
            </p>
          </section>

          <section className="bg-stone-900 text-white p-10 md:p-14 rounded-3xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-3xl rounded-full -mr-20 -mt-20"></div>
            <h2 className="text-3xl font-bold relative z-10 m-0">Seja um Curador</h2>
            <p className="text-stone-300 relative z-10 text-lg leading-relaxed">
              Portanto, estendemos a você o convite para ser mais que um espectador: seja um curador desta jornada. Traga suas descobertas, suas memórias afetivas e sua paixão pela cozinha autêntica. Juntos, formaremos uma comunidade onde o conhecimento circula livremente e o amor pela culinária se transforma em um legado compartilhado. Afinal, a boa comida é boa demais para ser guardada apenas para si — ela brilha mais forte quando é celebrada, discutida e, acima de tudo, inspirada.
            </p>
            <div className="pt-4 relative z-10">
              <Link to="/submit" className="inline-block bg-primary text-white font-bold px-8 py-4 rounded-xl hover:shadow-lg transition-all active:scale-95">
                Começar a Compartilhar
              </Link>
            </div>
          </section>

          <section className="pt-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="rounded-3xl overflow-hidden shadow-2xl border border-stone-200"
            >
              <img 
                src={getAssetUrl(ASSETS.MANIFESTO.VISION_HERO)} 
                alt="Nossa Visão Gastronômica" 
                className="w-full h-auto object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = ASSETS.HOME.HERO;
                }}
              />
            </motion.div>
          </section>
        </div>
      </motion.div>
    </div>
  );
}
