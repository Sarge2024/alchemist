import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, Star, Award, Circle, MessageSquare } from 'lucide-react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../infra/services/userService';
import { Avatar } from './Avatar';

export const ChefList: React.FC = () => {
  const [chefs, setChefs] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Busca apenas usuários com flag 'isChef' == true
    const q = query(
      collection(db, 'users'),
      where('isChef', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chefList: UserProfile[] = [];
      snapshot.forEach((doc) => {
        chefList.push({ uid: doc.id, ...doc.data() } as UserProfile);
      });
      setChefs(chefList);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar chefs:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getInitials = (name: string = ''): string => {
    if (!name) return 'CH';
    return name.split(' ').filter(w => w.length > 0).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  };

  if (loading) {
    return (
      <div className="bg-surface-container/30 backdrop-blur-md rounded-3xl p-6 border border-stone-100 dark:border-stone-800 animate-pulse">
        <div className="h-6 w-32 bg-stone-200 dark:bg-stone-700 rounded mb-6"></div>
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-stone-200 dark:bg-stone-700"></div>
            <div className="flex-1">
              <div className="h-4 w-24 bg-stone-200 dark:bg-stone-700 rounded mb-2"></div>
              <div className="h-3 w-16 bg-stone-100 dark:bg-stone-800 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (chefs.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 backdrop-blur-md rounded-3xl p-6 border border-amber-100 dark:border-amber-900/50 shadow-xl shadow-amber-500/5">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ChefHat className="w-5 h-5 text-amber-600" />
          <h3 className="text-sm font-black uppercase tracking-widest text-amber-900 dark:text-amber-400">
            Chefs
          </h3>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
          {chefs.length}
        </span>
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {chefs.map((chef) => (
            <motion.div
              key={chef.uid}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex items-center gap-4 p-3 rounded-2xl bg-white/50 dark:bg-stone-900/50 hover:bg-white dark:hover:bg-stone-900 transition-all border border-transparent hover:border-amber-200 dark:hover:border-amber-800 group cursor-default"
            >
              {/* Avatar com coroa/destaque */}
              <div className="relative">
                <Avatar 
                  src={chef.photoURL} 
                  alt={chef.displayName}
                  size="lg"
                  className="ring-2 ring-amber-400 shadow-lg shadow-amber-500/20"
                />
                <div className="absolute -top-2 -right-2 bg-amber-500 text-white p-1 rounded-lg shadow-md">
                  <Star className="w-3 h-3 fill-current" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stone-900 dark:text-white truncate">
                  {chef.displayName || 'Chef Alchemist'}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Award className="w-3 h-3 text-amber-600" />
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-tighter">
                    Mestre Culinário
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const event = new CustomEvent('directed-message', { detail: chef });
                    window.dispatchEvent(event);
                  }}
                  className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                  title={`Enviar mensagem para Chef ${chef.displayName}`}
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
                <Circle className="w-2 h-2 text-emerald-500 fill-emerald-500 animate-pulse" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
