import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, ChefHat, Shield, Circle, MessageSquare } from 'lucide-react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../infra/services/userService';
import { Avatar } from './Avatar';

/**
 * Componente que exibe a lista de colaboradores registrados na plataforma.
 * Apresenta avatar, nome e role de cada membro com indicador visual de status.
 * 
 * @layer UI (Lounge Sidebar)
 */
export const ActiveCollaborators: React.FC = () => {
  const [collaborators, setCollaborators] = useState<(UserProfile & { isOnline?: boolean })[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscreve à coleção de usuários em tempo real
  useEffect(() => {
    const q = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date().getTime();
      const FIVE_MINUTES = 5 * 60 * 1000;

      const users = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile & { isOnline?: boolean, lastSeen?: any }))
        .filter(user => {
          if (user.isChef) return false;
          if (!user.isOnline) return false;

          // Usuários sem lastSeen são zumbis de versões anteriores (ficaram presos antes do patch)
          if (!user.lastSeen) return false;

          // lastSeen pode ser um Timestamp do Firestore ou uma string/Date dependendo da serialização
          const lastSeenTime = user.lastSeen?.toDate ? user.lastSeen.toDate().getTime() : new Date(user.lastSeen).getTime();
          
          // Se a data for inválida, é um zumbi
          if (isNaN(lastSeenTime)) return false;

          // Tolerância de 5 minutos
          if (now - lastSeenTime > FIVE_MINUTES) {
            return false; 
          }
          
          return true;
        });

      // Ordena: Online primeiro, depois ordem alfabética
      users.sort((a, b) => {
        const aOnline = a.isOnline ? 1 : 0;
        const bOnline = b.isOnline ? 1 : 0;
        
        if (aOnline !== bOnline) {
          return bOnline - aOnline; // Online primeiro
        }
        
        // Desempate: Ordem alfabética
        const nameA = a.displayName || '';
        const nameB = b.displayName || '';
        return nameA.localeCompare(nameB);
      });

      setCollaborators(users);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  /**
   * Retorna as iniciais do nome para exibição no avatar.
   */
  const getInitials = (name: string = ''): string => {
    if (!name) return '??';
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  /**
   * Gera uma cor de fundo baseada no nome do usuário (determinística).
   */
  const getAvatarColor = (name: string = ''): string => {
    const safeName = name || 'Unknown';
    const colors = [
      'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500',
      'bg-rose-500', 'bg-orange-500', 'bg-teal-500', 'bg-indigo-500',
    ];
    const hash = safeName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  /**
   * Retorna o badge de role e o ícone correspondente.
   */
  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="flex items-center gap-1 bg-stone-900 dark:bg-stone-800 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
            <Shield className="w-2.5 h-2.5 text-amber-400" /> Admin
          </span>
        );
      case 'collaborator':
        return (
          <span className="flex items-center gap-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-emerald-200/50">
            <ChefHat className="w-2.5 h-2.5" /> Colaborador
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider border border-stone-200/50 dark:border-stone-700">
            <Circle className="w-2.5 h-2.5" /> Membro
          </span>
        );
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 backdrop-blur-md rounded-3xl p-6 border border-amber-100 dark:border-amber-900/50 shadow-xl shadow-amber-500/5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
          <Users className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-black text-amber-900 dark:text-amber-400 text-sm uppercase tracking-tight">Comunidade</h4>
          <p className="text-[10px] text-amber-700 dark:text-amber-500/70 font-bold uppercase tracking-widest">
            {collaborators.length} {collaborators.length === 1 ? 'Membro' : 'Membros'}
          </p>
        </div>
      </div>

      {/* Lista de Colaboradores */}
      <div className="space-y-1.5 max-h-[320px] overflow-y-auto scrollbar-thin scrollbar-thumb-stone-200">
        {isLoading ? (
          // Skeletons de carregamento
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-stone-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-stone-200 rounded w-3/4" />
                <div className="h-2 bg-stone-100 rounded w-1/3" />
              </div>
            </div>
          ))
        ) : collaborators.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs font-bold text-amber-900/40 dark:text-amber-500/40 uppercase tracking-widest">
              Nenhum membro online
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {collaborators.map((collab, index) => (
              <motion.div
                key={collab.uid}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-stone-50 transition-colors group cursor-default"
              >
                {/* Avatar */}
                <div className="relative">
                  <Avatar 
                    src={collab.photoURL} 
                    alt={collab.displayName || 'Alquimista'}
                    size="sm"
                    className="ring-2 ring-white shadow-sm"
                  />
                  {/* Indicador de status (online visual) */}
                  <Circle className={`w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 stroke-white stroke-[3] ${collab.isOnline ? 'text-emerald-400 fill-emerald-400' : 'text-red-400 fill-red-400'}`} />
                </div>

                {/* Informações */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
                    {collab.displayName || 'Alquimista'}
                  </p>
                  <div className="mt-0.5">
                    {getRoleBadge(collab.role)}
                  </div>
                </div>

                {/* Ação: Enviar Mensagem */}
                <button
                  onClick={() => {
                    const event = new CustomEvent('directed-message', { detail: collab });
                    window.dispatchEvent(event);
                  }}
                  className="p-1.5 md:p-2 rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-500 hover:bg-primary hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title={`Enviar mensagem para ${collab.displayName}`}
                >
                  <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
