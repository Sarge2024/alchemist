import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Heart, ChefHat, Shield, MessageCircle, Reply, X as CloseIcon } from 'lucide-react';
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
  const [replyingTo, setReplyingTo] = useState<LoungeMessage | null>(null);
  const [directedTo, setDirectedTo] = useState<UserProfile | null>(null);
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

  // Escuta eventos de mensagem direcionada (do Sidebar)
  useEffect(() => {
    const handleDirected = (e: any) => {
      const chef = e.detail;
      setDirectedTo(chef);
      setReplyingTo(null); // Limpa reply se estiver direcionando
      // Scroll para o input
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    window.addEventListener('directed-message', handleDirected);
    return () => window.removeEventListener('directed-message', handleDirected);
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
        userProfile?.displayName || user.displayName || user.email?.split('@')[0] || 'Membro',
        {
          ...(replyingTo ? {
            replyTo: {
              id: replyingTo.id,
              text: replyingTo.text,
              senderName: replyingTo.senderName || 'Alquimista'
            }
          } : {}),
          ...(directedTo ? {
            directedTo: {
              uid: directedTo.uid,
              name: directedTo.displayName,
              role: directedTo.role
            }
          } : {})
        }
      );
      setInputText('');
      setReplyingTo(null);
      setDirectedTo(null);
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
    <div className="flex flex-col h-[700px] bg-[#F3F4F6] dark:bg-stone-900/80 backdrop-blur-md rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden shadow-2xl">
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
          {messages.map((msg, index) => {
            const msgDate = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date();
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const prevDate = prevMsg?.timestamp?.toDate ? prevMsg.timestamp.toDate() : null;
            
            const isNewDay = !prevDate || 
              msgDate.getDate() !== prevDate.getDate() || 
              msgDate.getMonth() !== prevDate.getMonth() || 
              msgDate.getFullYear() !== prevDate.getFullYear();

            return (
              <React.Fragment key={msg.id}>
                {isNewDay && (
                  <div className="flex items-center justify-center my-8">
                    <div className="h-[1px] flex-1 bg-stone-200 dark:bg-stone-800"></div>
                    <span className="px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-900 rounded-full border border-stone-200 dark:border-stone-800">
                      {msgDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </span>
                    <div className="h-[1px] flex-1 bg-stone-200 dark:bg-stone-800"></div>
                  </div>
                )}
                
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 dark:text-stone-400">
                      {msg.senderName || (msg.senderId === user?.uid ? 'Você' : `Usuário-${String(msg.senderId || '0000').substring(0,4)}`)}
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
                    {/* Directed Message Badge */}
                    {msg.metadata?.directedTo && (
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-1.5 rounded-lg border border-amber-100 dark:border-amber-800">
                        <ChefHat className="w-3 h-3" />
                        PARA: CHEF {msg.metadata.directedTo.name}
                      </div>
                    )}

                    {/* Quoted Message Preview */}
                    {msg.metadata?.replyTo && (
                      <div className={`
                        mb-2 p-2 rounded-lg border-l-4 text-xs font-medium bg-black/5 dark:bg-white/5
                        ${msg.senderId === user?.uid ? 'border-amber-400' : 'border-primary'}
                      `}>
                        <p className="font-black uppercase tracking-tighter opacity-70 mb-0.5">
                          {msg.metadata.replyTo.senderName}
                        </p>
                        <p className="truncate opacity-90">{msg.metadata.replyTo.text}</p>
                      </div>
                    )}
                    
                    <p className="text-sm md:text-base leading-relaxed font-medium">{msg.text}</p>

                    {/* Actions Container */}
                    <div className="absolute -bottom-3 -right-2 flex items-center gap-1">
                      {/* Reply Button */}
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="w-8 h-8 rounded-full flex items-center justify-center border shadow-lg transition-all bg-white dark:bg-stone-800 border-stone-100 dark:border-stone-700 text-stone-300 hover:text-primary hover:scale-110"
                      >
                        <Reply className="w-4 h-4" />
                      </button>

                      {/* Like Button */}
                      <button
                        onClick={() => toggleLike(msg)}
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center border shadow-lg transition-all
                          ${msg.reactions?.[user?.uid || '']
                            ? 'bg-red-50 border-red-100 text-red-500 scale-110'
                            : 'bg-white dark:bg-stone-800 border-stone-100 dark:border-stone-700 text-stone-300 hover:text-red-400'}
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
                  </div>

                  {/* Timestamp */}
                  <div className="mt-1 px-1">
                    <span className="text-[9px] font-bold text-stone-400 dark:text-stone-500 flex items-center gap-1 uppercase tracking-wider">
                      {msg.timestamp?.toDate 
                        ? msg.timestamp.toDate().toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' }) 
                        : 'Agora mesmo'}
                    </span>
                  </div>
                </motion.div>
              </React.Fragment>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white/20 border-t border-stone-100 relative">
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-6 right-6 mb-2 p-3 bg-white dark:bg-stone-800 rounded-t-xl border-x border-t border-stone-200 dark:border-stone-700 shadow-lg flex items-center gap-3 overflow-hidden"
            >
              <div className="w-1 h-full bg-primary absolute left-0 top-0"></div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                  Respondendo a {replyingTo.senderName}
                </p>
                <p className="text-xs text-stone-600 dark:text-stone-400 truncate">
                  {replyingTo.text}
                </p>
              </div>
              <button 
                onClick={() => setReplyingTo(null)}
                className="p-1.5 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full text-stone-400"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {directedTo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-6 right-6 mb-2 p-3 bg-amber-50 dark:bg-amber-900/30 rounded-t-xl border-x border-t border-amber-200 dark:border-amber-800 shadow-lg flex items-center gap-3 overflow-hidden"
            >
              <div className="w-1 h-full bg-amber-500 absolute left-0 top-0"></div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                    PARA: CHEF {directedTo.displayName}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setDirectedTo(null)}
                className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-800 rounded-full text-amber-400"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

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
