import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Heart, ChefHat, Shield, MessageCircle, Reply, X as CloseIcon, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { loungeService, LoungeMessage } from '../infra/services/loungeService';
import { useAuth } from '../context/AuthContext';
import { userService, UserProfile } from '../infra/services/userService';

/**
 * Componente de Chat em Tempo Real para o Lounge Gastronômico.
 * Implementa interface linear e animações fluidas.
 */
export const LoungeChat: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<LoungeMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [replyingTo, setReplyingTo] = useState<LoungeMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<LoungeMessage | null>(null);
  const [editInput, setEditInput] = useState('');
  const [directedTo, setDirectedTo] = useState<UserProfile | null>(null);
  const [userNamesCache, setUserNamesCache] = useState<Record<string, string>>({});
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

      // Busca perfis para mensagens antigas que não possuem senderName
      newMessages.forEach(msg => {
        if (!msg.senderName && msg.senderId) {
          setUserNamesCache(prev => {
            if (prev[msg.senderId]) return prev; // já temos no cache local
            
            // Busca o perfil de forma assíncrona
            userService.getUserProfile(msg.senderId).then(profile => {
              if (profile?.displayName) {
                setUserNamesCache(current => ({
                  ...current,
                  [msg.senderId]: profile.displayName
                }));
              }
            });
            // Marca como pendente (string vazia por enquanto para não refazer o fetch)
            return { ...prev, [msg.senderId]: '' };
          });
        }
      });
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
        userProfile?.role || 'member',
        userProfile?.displayName || user.displayName || 'Membro',
        {
          replyTo: replyingTo ? {
            id: replyingTo.id,
            text: replyingTo.text,
            senderName: replyingTo.senderName
          } : undefined,
          directedTo: directedTo ? {
            uid: directedTo.uid,
            name: directedTo.displayName
          } : undefined
        }
      );
      setInputText('');
      setReplyingTo(null);
      setDirectedTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleUpdateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMessage || !editInput.trim() || isSending) return;

    setIsSending(true);
    try {
      await loungeService.updateMessage(editingMessage.id, editInput);
      setEditingMessage(null);
      setEditInput('');
    } catch (error) {
      console.error('Error updating message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!window.confirm('Deseja realmente excluir esta mensagem?')) return;
    
    try {
      await loungeService.deleteMessage(messageId);
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const startEditing = (msg: LoungeMessage) => {
    setEditingMessage(msg);
    setEditInput(msg.text);
  };

  const toggleLike = (msg: LoungeMessage) => {
    if (!user) return;
    loungeService.toggleReaction(msg.id, user.uid, msg.reactions);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[600px] max-h-[1200px] bg-surface-container backdrop-blur-md rounded-2xl border border-surface-container-high overflow-hidden shadow-2xl transition-all">
      {/* Header */}
      <div className="p-4 border-b border-surface-container-high flex items-center justify-between bg-surface-container-low/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-on-surface uppercase tracking-tight">Conversação Alquimista</h3>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Ambiente linear e moderado</p>
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
                    <div className="h-[1px] flex-1 bg-surface-container-high"></div>
                    <span className="px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant bg-surface-container-lowest rounded-full border border-surface-container-high">
                      {msgDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </span>
                    <div className="h-[1px] flex-1 bg-surface-container-high"></div>
                  </div>
                )}
                
                <motion.div
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                      {msg.senderId === user?.uid ? 'Você' : (msg.senderName || userNamesCache[msg.senderId] || 'Membro')}
                    </span>
                    {msg.senderRole === 'chef' && (
                      <span className="bg-amber-100 text-amber-700 p-0.5 rounded flex items-center gap-0.5 text-[8px] font-black px-1.5 border border-amber-200">
                        <ChefHat className="w-2.5 h-2.5" /> CHEF
                      </span>
                    )}
                    {msg.senderRole === 'admin' && (
                      <span className="bg-on-surface text-background p-0.5 rounded flex items-center gap-0.5 text-[8px] font-black px-1.5">
                        <Shield className="w-2.5 h-2.5" /> ADMIN
                      </span>
                    )}
                  </div>

                  <div className={`
                    max-w-[90%] md:max-w-[85%] p-3 rounded-xl relative group shadow-sm
                    ${msg.senderId === user?.uid
                      ? 'bg-on-surface text-background rounded-tr-none'
                      : msg.metadata?.type === 'new_recipe'
                        ? 'bg-primary/10 border-2 border-primary/30 text-on-surface shadow-primary/10 cursor-pointer hover:bg-primary/20 transition-all'
                        : 'bg-surface-container-lowest text-on-surface border border-surface-container-high rounded-tl-none shadow-stone-200/50'}
                  `}
                  onClick={() => {
                    if (msg.metadata?.type === 'new_recipe' && msg.metadata?.recipeId) {
                      navigate(`/receita/${msg.metadata.recipeId}`);
                    }
                  }}
                  >
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
                    
                    {editingMessage?.id === msg.id ? (
                      <form onSubmit={handleUpdateMessage} className="relative">
                        <textarea
                          value={editInput}
                          onChange={(e) => setEditInput(e.target.value)}
                          className="w-full bg-background/50 border border-primary/30 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-none font-medium"
                          autoFocus
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button 
                            type="button" 
                            onClick={() => setEditingMessage(null)}
                            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant hover:bg-surface-container rounded-lg"
                          >
                            Cancelar
                          </button>
                          <button 
                            type="submit"
                            disabled={!editInput.trim() || isSending}
                            className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-primary text-white rounded-lg shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50"
                          >
                            Salvar
                          </button>
                        </div>
                      </form>
                    ) : msg.metadata?.type === 'new_recipe' && msg.metadata?.recipeId ? (
                      <div className="text-sm md:text-base leading-relaxed font-bold text-primary flex items-center gap-2 group/link">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                          <ExternalLink className="w-4 h-4 text-primary" />
                        </div>
                        {msg.text}
                      </div>
                    ) : (
                      <div className="relative group/text">
                        <p className="text-sm md:text-base leading-relaxed font-medium">{msg.text}</p>
                        {msg.metadata?.isEdited && (
                          <span className="text-[8px] italic opacity-40">(editada)</span>
                        )}
                      </div>
                    )}

                    {/* Actions Container */}
                    <div className="absolute -bottom-3 -right-2 flex items-center gap-1">
                      {/* Owner Actions */}
                      {msg.senderId === user?.uid && !editingMessage && (
                        <>
                          <button
                            onClick={() => startEditing(msg)}
                            className="w-8 h-8 rounded-full flex items-center justify-center border shadow-lg transition-all bg-surface-container-lowest border-surface-container-high text-on-surface-variant/40 hover:text-amber-500 hover:scale-110"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="w-8 h-8 rounded-full flex items-center justify-center border shadow-lg transition-all bg-surface-container-lowest border-surface-container-high text-on-surface-variant/40 hover:text-red-500 hover:scale-110"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}

                      {/* Reply Button */}
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="w-8 h-8 rounded-full flex items-center justify-center border shadow-lg transition-all bg-surface-container-lowest border-surface-container-high text-on-surface-variant/40 hover:text-primary hover:scale-110"
                      >
                        <Reply className="w-4 h-4" />
                      </button>

                      {/* Like Button */}
                      <button
                        onClick={() => toggleLike(msg)}
                        className={`
                          w-8 h-8 rounded-full flex items-center justify-center border shadow-lg transition-all
                          ${msg.reactions?.[user?.uid || '']
                            ? 'bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20 text-red-500 scale-110'
                            : 'bg-surface-container-lowest border-surface-container-high text-on-surface-variant/40 hover:text-red-400'}
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
      <div className="p-6 bg-surface-container-lowest/20 border-t border-surface-container-high relative">
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full left-6 right-6 mb-2 p-3 bg-surface-container-lowest rounded-t-xl border-x border-t border-surface-container-high shadow-lg flex items-center gap-3 overflow-hidden"
            >
              <div className="w-1 h-full bg-primary absolute left-0 top-0"></div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                  Respondendo a {replyingTo.senderName}
                </p>
                <p className="text-xs text-on-surface-variant truncate">
                  {replyingTo.text}
                </p>
              </div>
              <button 
                onClick={() => setReplyingTo(null)}
                className="p-1.5 hover:bg-surface-container rounded-full text-on-surface-variant"
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
            className="w-full bg-background border border-surface-container-high rounded-xl py-3 pl-6 pr-14 text-sm md:text-base font-bold text-on-surface focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-on-surface-variant/40 shadow-sm"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className={`
              absolute right-2 p-2.5 rounded-xl transition-all
              ${inputText.trim() && !isSending
                ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95'
                : 'bg-surface-container text-on-surface-variant/20'}
            `}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
