import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Star, ArrowRight } from 'lucide-react';

interface LevelUpPopupProps {
  isOpen: boolean;
  newLevel: number;
  newTier: string;
  onClose: () => void;
  onChooseAvatar: () => void;
}

export const LevelUpPopup: React.FC<LevelUpPopupProps> = ({
  isOpen,
  newLevel,
  newTier,
  onClose,
  onChooseAvatar,
}) => {
  if (!isOpen) return null;

  const tierNames: Record<string, string> = {
    APRENDIZ: 'Aprendiz',
    ASSISTENTE: 'Assistente',
    ALQUIMISTA: 'Alquimista',
    PERITO: 'Perito',
    MESTRE_ALQUIMISTA: 'Mestre Alquimista'
  };

  const displayName = tierNames[newTier] || newTier || 'Alquimista';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            className="relative bg-surface-container-low rounded-[3rem] p-8 md:p-12 max-w-lg w-full text-center border border-surface-container-high shadow-2xl overflow-hidden"
          >
            {/* Fundo Decorativo */}
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-amber-500/20 to-transparent pointer-events-none" />
            
            <div className="relative mb-8">
              <motion.div 
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                className="w-32 h-32 mx-auto bg-gradient-to-br from-amber-400 to-amber-600 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.4)] border-4 border-surface-container-lowest"
              >
                <Award className="w-16 h-16 text-white" />
              </motion.div>
              
              <motion.div 
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="absolute -bottom-4 right-1/2 translate-x-12 bg-white text-amber-600 p-2 rounded-full shadow-lg border-2 border-amber-100"
              >
                <Star className="w-6 h-6 fill-amber-500 text-amber-500" />
              </motion.div>
            </div>

            <h2 className="text-3xl font-black text-on-surface mb-2 font-sans uppercase tracking-tight">
              Nível {newLevel} Alcançado!
            </h2>
            <p className="text-lg text-on-surface-variant font-medium mb-8">
              Parabéns! Você acaba de subir de nível e agora é um <strong className="text-primary">{displayName}</strong>.
            </p>

            <div className="bg-surface-container p-6 rounded-2xl mb-8 border border-surface-container-high">
              <h3 className="text-sm font-bold uppercase tracking-widest text-on-surface mb-3 flex items-center justify-center gap-2">
                <Star className="w-4 h-4 text-amber-500" /> Novas Recompensas
              </h3>
              <p className="text-sm text-on-surface-variant">
                Você desbloqueou novos avatares exclusivos para o seu nível! Seus avatares anteriores continuam disponíveis para uso.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={onChooseAvatar}
                className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-primary-container transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Escolher Novo Avatar <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="w-full text-on-surface-variant font-bold py-4 rounded-xl hover:bg-surface-container transition-all active:scale-95"
              >
                Manter Avatar Atual
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
