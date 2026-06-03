import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, ChefHat, Shield, Circle } from 'lucide-react';
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
  const [collaborators, setCollaborators] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscreve à coleção de usuários em tempo real
  useEffect(() => {
    const q = query(collection(db, 'users'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
        .map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile & { isOnline?: boolean }))
        .filter(user => user.role !== 'chef'); // Chefs têm lista própria à esquerda

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
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
