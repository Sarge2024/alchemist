import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Welcome message based on context
    const welcomeText = recipeContext 
      ? `Olá! 🧑‍🍳 Sou o **Chef IA Alchemist**. Vejo que você está explorando a receita de **${recipeContext}**! Me conte: quer dicas de preparo, substituições de ingredientes ou entender alguma técnica?`
      : 'Olá, Alquimista! 🧑‍🍳 Sou o **Chef IA**, seu guia culinário pessoal. Me conte o que você quer preparar e juntos vamos encontrar a receita perfeita no nosso acervo!';
    
    setMessages([
      { id: 'welcome', sender: 'ai', text: welcomeText }
    ]);
  }, [recipeContext]);

  useEffect(() => {
    if (isOpen && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!user) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
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
        body: JSON.stringify({ question: userMsg.text, history })
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

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[350px] sm:w-[400px] max-h-[600px] h-[80vh] bg-surface-container-lowest border border-surface-container rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden"
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
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
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
