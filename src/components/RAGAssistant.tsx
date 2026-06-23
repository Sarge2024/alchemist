import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Loader2, Maximize2, Minimize2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
}

const MarkdownText = ({ text }: { text: string }) => {
  const escapeHtml = (unsafe: string) => {
    return unsafe
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const safeText = escapeHtml(text);
  
  const html = safeText
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-black mt-4 mb-2 text-primary">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-black mt-5 mb-2 text-primary">$1</h2>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-stone-900 dark:text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-primary hover:underline font-medium">$1</a>')
    .replace(/^\s*\*\s+(.*$)/gim, '<li class="ml-5 list-disc mb-1">$1</li>')
    .replace(/\n/g, '<br />')
    .replace(/<br \/>(<li)/g, '$1')
    .replace(/(<\/li>)<br \/>/g, '$1')
    .replace(/(<\/h[23]>)<br \/>/g, '$1');

  return <div className="text-sm leading-relaxed font-sans" dangerouslySetInnerHTML={{ __html: html }} />;
};

import { useAuth } from '../context/AuthContext';

export const RAGAssistant: React.FC<{ recipeContext?: string }> = ({ recipeContext }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasAutoExpanded, setHasAutoExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const firstName = user?.displayName?.split(' ')[0] || '';
    const greetingName = firstName ? `**${firstName}**` : 'Alquimista';
    
    const lastInteractionStr = localStorage.getItem('alquimia_chef_last_interaction');
    let welcomeText = '';

    if (!lastInteractionStr) {
      // Primeiro contato absoluto
      if (recipeContext) {
        welcomeText = `Olá, ${greetingName}! 🧑‍🍳 Sou o **Chef IA Alchemist**. Que legal ter você aqui pela primeira vez! Vejo que você está de olho na receita de **${recipeContext}**. Quer dicas de preparo ou entender alguma técnica?`;
      } else {
        welcomeText = `Olá, ${greetingName}! 🧑‍🍳 Sou o **Chef IA**, seu guia culinário pessoal. É um prazer falar com você pela primeira vez! Me conte, o que você quer descobrir ou cozinhar hoje?`;
      }
    } else {
      try {
        const { timestamp, lastQuestion } = JSON.parse(lastInteractionStr);
        const hoursSinceLast = (Date.now() - timestamp) / (1000 * 60 * 60);

        if (hoursSinceLast > 24) {
          // Muito tempo sem acessar (mais de 24h)
          if (recipeContext) {
            welcomeText = `Senti sua falta por aqui, ${greetingName}! 🧑‍🍳 Da última vez você perguntou sobre *"${lastQuestion}"*, espero que tenha dado tudo certo! Vejo que agora o alvo é **${recipeContext}**. Mas e aí, como posso ajudar com ela?`;
          } else {
            welcomeText = `Que bom te ver de novo, ${greetingName}! Senti sua falta na nossa cozinha! 🧑‍🍳 Da última vez a conversa rendeu sobre *"${lastQuestion}"*... Mas e aí, o que vamos ter para hoje?`;
          }
        } else {
          // Retorno recente (menos de 24h)
          if (recipeContext) {
            welcomeText = `De volta à ativa, ${greetingName}! 🧑‍🍳 Estamos explorando **${recipeContext}** agora, certo? Conta pra mim, que dúvida pintou?`;
          } else {
            welcomeText = `E aí, ${greetingName}! 🧑‍🍳 Prontos para continuar nossa alquimia na cozinha? O que vamos preparar agora?`;
          }
        }
      } catch (e) {
        // Fallback em caso de erro no parse do JSON
        welcomeText = `E aí, ${greetingName}! 🧑‍🍳 Bora pra cozinha? Me conte o que você quer explorar e juntos vamos descobrir algo incrível!`;
      }
    }

    setMessages([
      { id: 'welcome', sender: 'ai', text: welcomeText }
    ]);
  }, [recipeContext, user?.displayName]);

  useEffect(() => {
    // Auto-expand after 2 user turns
    const userTurns = messages.filter(m => m.sender === 'user').length;
    if (userTurns >= 2 && !hasAutoExpanded && isOpen) {
      setIsExpanded(true);
      setHasAutoExpanded(true);
    }
  }, [messages, hasAutoExpanded, isOpen]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isExpanded]);

  if (!user) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    
    // Salva a interação para personalização futura de saudação
    localStorage.setItem('alquimia_chef_last_interaction', JSON.stringify({
      timestamp: Date.now(),
      lastQuestion: input.substring(0, 80) + (input.length > 80 ? '...' : '') // Limita o tamanho para não estragar o layout
    }));

    setInput('');
    setIsTyping(true);

    try {
      // Build conversation history from existing messages (exclude welcome)
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          text: m.text
        }));

      const response = await fetch('/api/chat/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || 'alchemist-app-secret-2024'
        },
        body: JSON.stringify({ question: userMsg.text, history, userId: user?.uid, userName: user?.displayName })
      });

      const data = await response.json();
      if (data.success) {
        const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'ai', text: data.answer };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        const errMsg: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'ai', text: data.error || 'Desculpe, tive um problema ao buscar a resposta.' };
        setMessages(prev => [...prev, errMsg]);
      }
    } catch (err) {
      const errMsg: ChatMessage = { id: (Date.now() + 1).toString(), sender: 'ai', text: 'Erro de conexão.' };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors z-50 group"
          >
            <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop for Expanded State */}
      <AnimatePresence>
        {isOpen && isExpanded && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[45]"
            onClick={() => setIsExpanded(false)}
          />
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed z-50 flex flex-col overflow-hidden bg-surface-container-lowest border border-surface-container rounded-3xl shadow-2xl ${
              isExpanded 
                ? "inset-0 m-auto w-[90vw] sm:w-[80vw] max-w-3xl h-[85vh] max-h-[800px]" 
                : "bottom-6 right-6 w-[350px] sm:w-[400px] max-h-[600px] h-[80vh]"
            }`}
          >
            {/* Header */}
            <div className="bg-primary px-6 py-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold">Chef IA Alchemist</h3>
                  <p className="text-xs text-white/80">Seu guia culinário</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                  title={isExpanded ? "Minimizar" : "Expandir"}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#fdf8f4] dark:bg-stone-950">
              {messages.map((msg) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-4 ${
                    msg.sender === 'user' 
                      ? 'bg-primary text-white rounded-br-sm' 
                      : 'bg-white dark:bg-stone-900 border border-surface-container-high dark:border-stone-800 text-on-surface rounded-bl-sm'
                  }`}>
                    <MarkdownText text={msg.text} />
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white dark:bg-stone-900 border border-surface-container-high dark:border-stone-800 rounded-2xl rounded-bl-sm p-4 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-xs text-on-surface-variant font-medium">Consultando acervo...</span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white dark:bg-stone-900 border-t border-surface-container dark:border-stone-800">
              <div className="relative">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="O que você quer cozinhar hoje?"
                  className="w-full bg-surface-container-lowest border border-surface-container-high rounded-full pl-5 pr-12 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm text-on-surface"
                />
                <button 
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
