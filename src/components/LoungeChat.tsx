import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Heart, ChefHat, Shield, MessageCircle } from 'lucide-react';
import { loungeService, LoungeMessage } from '../infra/services/loungeService';
import { useAuth } from '../context/AuthContext';
import { userService, UserProfile } from '../infra/services/userService';

/**
 * Componente de Chat em Tempo Real para o Lounge Gastronômico.
 * Implementa interface linear e animações fluidas.
 */
export const LoungeChat: React.FC = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<LoungeMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Carrega o perfil do usuário para saber a Role
  useEffect(() => {
    if (user) {
      userService.getUserProfile(user.uid).then(setUserProfile);
    }
  }, [user]);

  // Subscreve às mensagens em tempo real
  useEffect(() => {
    const unsubscribe = loungeService.subscribeToMessages((newMessages) => {
      setMessages(newMessages);
      // Auto-scroll para o final
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    });
    return () => unsubscribe();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || isSending) return;

    setIsSending(true);
    try {
      await loungeService.sendMessage(
        inputText,
        user.uid,
        userProfile?.role || 'user',
        user.displayName || user.email?.split('@')[0] || 'Membro'
      );
      setInputText('');
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
    } finally {
      setIsSending(false);
    }
  };

  const toggleLike = (msg: LoungeMessage) => {
    if (!user) return;
    loungeService.toggleReaction(msg.id, user.uid, msg.reactions);
  };

  return (
    <div className="flex flex-col h-[600px] bg-[#F3F4F6] dark:bg-stone-900/80 backdrop-blur-md rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-100/30 dark:bg-stone-900/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-stone-950 dark:text-stone-50 uppercase tracking-tight">Conversação Alquimista</h3>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 font-bold uppercase tracking-widest">Ambiente linear e moderado</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-stone-200"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
                  {msg.senderId === user?.uid 
                    ? (user?.displayName || user?.email?.split('@')[0] || 'Você')
                    : ((typeof msg.senderName === 'string' && msg.senderName.toLowerCase().includes('alquimista')) || !msg.senderName || msg.senderName === 'Membro'
                        ? `Usuário-${String(msg.senderId || '0000').substring(0,4)}` 
                        : msg.senderName)}
                </span>
                {msg.senderRole === 'chef' && (
                  <span className="bg-amber-100 text-amber-700 p-0.5 rounded flex items-center gap-0.5 text-[8px] font-black px-1.5 border border-amber-200">
                    <ChefHat className="w-2.5 h-2.5" /> CHEF
                  </span>
                )}
                {msg.senderRole === 'admin' && (
                  <span className="bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 p-0.5 rounded flex items-center gap-0.5 text-[8px] font-black px-1.5">
                    <Shield className="w-2.5 h-2.5" /> ADMIN
                  </span>
                )}
              </div>

              <div className={`
                max-w-[85%] p-3 rounded-xl relative group shadow-sm
                ${msg.senderId === user?.uid
                  ? 'bg-stone-900 dark:bg-stone-700 text-white rounded-tr-none shadow-stone-400/10'
                  : 'bg-white dark:bg-stone-800 text-stone-900 dark:text-white border border-stone-100 dark:border-stone-700 rounded-tl-none shadow-stone-200/50'}
              `}>
                <p className="text-sm md:text-base leading-relaxed font-medium">{msg.text}</p>

                {/* Like Button */}
                <button
                  onClick={() => toggleLike(msg)}
                  className={`
                    absolute -bottom-3 -right-2 w-8 h-8 rounded-full flex items-center justify-center border shadow-lg transition-all
                    ${msg.reactions?.[user?.uid || '']
                      ? 'bg-red-50 border-red-100 text-red-500 scale-110'
                      : 'bg-white border-stone-100 text-stone-300 hover:text-red-400'}
                  `}
                >
                  <motion.div
                    whileTap={{ scale: 1.5 }}
                    animate={msg.reactions?.[user?.uid || ''] ? { scale: [1, 1.3, 1] } : {}}
                  >
                    <Heart className={`w-4 h-4 ${msg.reactions?.[user?.uid || ''] ? 'fill-current' : ''}`} />
                  </motion.div>
                </button>
              </div>

              {/* Timestamp */}
              <div className="mt-1 px-1">
                <span className="text-[9px] font-bold text-stone-400 dark:text-stone-500 flex items-center gap-1 uppercase tracking-wider">
                  {msg.timestamp?.toDate 
                    ? msg.timestamp.toDate().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) 
                    : 'Agora mesmo'}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white/20 border-t border-stone-100">
        <form onSubmit={handleSendMessage} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Compartilhe seu conhecimento culinário..."
            disabled={isSending}
            className="w-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl py-3 pl-6 pr-14 text-sm md:text-base font-bold text-stone-900 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-stone-400 dark:placeholder:text-stone-600 shadow-sm"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className={`
              absolute right-2 p-2.5 rounded-xl transition-all
              ${inputText.trim() && !isSending
                ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'
                : 'bg-stone-100 text-stone-300'}
            `}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
