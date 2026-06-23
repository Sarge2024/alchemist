import React, { useState } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, Copy, Check, Sparkles, Share2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ShareIncentiveProps {
  recipeTitle?: string;
}

export const ShareIncentive: React.FC<ShareIncentiveProps> = ({ recipeTitle }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'emotional' | 'practical' | 'social'>('emotional');
  const [copied, setCopied] = useState(false);

  const baseUrl = (import.meta.env.VITE_APP_URL as string) || window.location.origin;
  
  const isRecipePage = window.location.pathname.includes('/receita/') || window.location.pathname.includes('/recipe/');
  const targetPath = isRecipePage ? window.location.pathname : '/register';

  // Se estiver logado, gera link de indicação. Caso contrário, gera link geral.
  const referralLink = user 
    ? `${baseUrl}${targetPath}?ref=${user.uid}` 
    : `${baseUrl}${targetPath}`;

  const options = {
    emotional: {
      title: "Comida boa é comida compartilhada!",
      subtitle: "Apelo emocional",
      phrase: "Sabe aquele amigo que ama testar pratos novos ou que vive na dúvida do que cozinhar? Envie este site para ele e programem o próximo jantar!",
      btnLabel: "Compartilhar no WhatsApp",
      whatsappText: `*Comida boa é comida compartilhada!* ❤️\n\nLembrei de você com ${recipeTitle ? `esta receita de *${recipeTitle}*` : 'este site de receitas'}. Vamos escolher um prato para testar e programar o nosso próximo jantar juntos?\n\n🔗 Acesse com meu convite: ${referralLink}`
    },
    practical: {
      title: "Gostou do nosso conteúdo?",
      subtitle: "Praticidade",
      phrase: "Ajude seus amigos a salvarem o almoço de hoje! Compartilhe o site com quem precisa de uma dose de inspiração na cozinha.",
      btnLabel: "Enviar para um amigo",
      whatsappText: `*Para salvar o almoço de hoje!* 🍳\n\nDá uma olhada ${recipeTitle ? `nesta receita de *${recipeTitle}*` : 'neste site de receitas'} no Alquimia do Prato. Tem muita inspiração de dar água na boca!\n\n🔗 Acesse aqui: ${referralLink}`
    },
    social: {
      title: "Não guarde essas receitas só para você!",
      subtitle: "Redes sociais",
      phrase: "Quem cozinha bem sabe que dica boa é dica compartilhada. Mande o link para o seu parceiro de cozinha e preparem juntos.",
      btnLabel: "Compartilhar Receita",
      whatsappText: `*Dica boa é dica compartilhada!* 🤝\n\nOlha só ${recipeTitle ? `esta receita de *${recipeTitle}*` : 'este portal de receitas'} que legal! Pensei em você para ser meu parceiro(a) de cozinha nessa.\n\n🔗 Veja no Alquimia do Prato: ${referralLink}`
    }
  };

  const currentOption = options[activeTab];

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(currentOption.whatsappText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full bg-[#fcf9f6] dark:bg-stone-900 border-2 border-[#8b5a2b]/20 dark:border-stone-700 p-8 rounded-2xl relative overflow-hidden my-12 no-print font-sans">
      {/* Decorações do design */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#8b5a2b]/10 to-transparent pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8">
        
        {/* Left Side: Copy & Selection */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8b5a2b] dark:text-amber-400">
              Engajamento e Convites
            </span>
          </div>

          <h3 className="text-3xl font-serif italic font-medium text-stone-900 dark:text-stone-100 tracking-tight leading-tight">
            {currentOption.title}
          </h3>

          <p className="text-stone-600 dark:text-stone-300 text-base leading-relaxed max-w-xl">
            {currentOption.phrase}
          </p>

          {/* Selector Tabs */}
          <div className="flex flex-wrap gap-2 pt-2">
            {(Object.keys(options) as Array<keyof typeof options>).map((key) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                  activeTab === key
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                }`}
              >
                {options[key].subtitle}
              </button>
            ))}
          </div>

          {/* Incentive details */}
          {!user && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-normal">
                <strong>Dica de Alquimista:</strong> Entre em sua conta ou cadastre-se para gerar um link de convite personalizado. Você ganhará <strong>+5 XP</strong> na sua jornada de progressão para cada amigo que concluir o cadastro!
              </p>
            </div>
          )}

          {user && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5 animate-pulse" />
              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-normal">
                <strong>Link de Indicação Ativo!</strong> Compartilhe este convite. Quando seu convidado se cadastrar no portal Alquimia do Prato, você receberá <strong>+5 XP</strong> de bônus!
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Actions Stack */}
        <div className="w-full md:w-80 shrink-0 space-y-4 pt-4 md:pt-0">
          <div className="bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 p-6 rounded-2xl space-y-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-stone-400 block">
              Seu Link de Convite
            </span>
            
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={referralLink}
                className="flex-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-2 text-xs font-mono text-stone-500 dark:text-stone-400 outline-none overflow-ellipsis"
              />
              
              <button
                type="button"
                onClick={handleCopy}
                className="p-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-900 dark:hover:bg-stone-800 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
                title="Copiar Link"
              >
                {copied ? <Check className="w-4.5 h-4.5 text-emerald-600" /> : <Copy className="w-4.5 h-4.5" />}
              </button>
            </div>

            <button
              onClick={handleShareWhatsApp}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/10"
            >
              <MessageCircle className="w-5 h-5" />
              {currentOption.btnLabel}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
