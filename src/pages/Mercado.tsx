import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingBag, Flame, Leaf, Crown, UserCircle, Book, Shield, Star, Gem, Lock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userService, UserProfile } from '../infra/services/userService';
import { marketService, MarketItem } from '../infra/services/marketService';

const ICON_MAP: Record<string, any> = {
  Flame, Leaf, Crown, UserCircle, Book, Shield, Star, Gem, ShoppingBag
};

export default function Mercado() {
  const { user } = useAuth();
  const [items, setItems] = useState<MarketItem[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [marketItems, userProfile] = await Promise.all([
        marketService.getItems(),
        userService.getUserProfile(user.uid)
      ]);
      setItems(marketItems);
      setProfile(userProfile);
    } catch (err) {
      console.error("Erro ao buscar dados do mercado:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (item: MarketItem) => {
    if (!user || !item.id) return;
    
    // Confirmação
    if (!window.confirm(`Deseja comprar '${item.nome}' por ${item.custoMoedas} Moedas?`)) return;

    setBuying(item.id);
    try {
      const res = await marketService.buyItem(user.uid, item.id);
      if (res.success) {
        alert("Compra realizada com sucesso!");
        // Envia o evento de gamificação para recompensar o ato da compra
        fetch('/api/gamification/event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-KEY': import.meta.env.VITE_APP_API_KEY || ''
          },
          body: JSON.stringify({ uid: user.uid, eventType: 'PRODUCT_PURCHASED' })
        }).catch(e => console.error("Erro gamificação compra:", e));
        
        await fetchData(); // Atualiza moedas e inventário
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert("Erro ao processar a compra.");
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 pb-12">
        <div className="animate-spin text-primary"><ShoppingBag className="w-12 h-12" /></div>
      </div>
    );
  }

  const moedas = profile?.moedas || 0;
  const inventory = profile?.inventory || [];

  const renderItem = (item: MarketItem) => {
    const Icon = ICON_MAP[item.icone] || ShoppingBag;
    const hasItem = item.id && inventory.includes(item.id);
    const canAfford = moedas >= item.custoMoedas;

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        key={item.id} 
        className={`bg-surface-container-low rounded-3xl border ${hasItem ? 'border-primary' : 'border-surface-container'} p-6 flex flex-col`}
      >
        <div className="flex items-start gap-4 mb-4">
          <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.cor} flex items-center justify-center shrink-0`}>
            <Icon className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">{item.tipo}</div>
            <h4 className="text-lg font-bold text-on-surface leading-tight">{item.nome}</h4>
          </div>
        </div>
        <p className="text-sm text-on-surface-variant flex-1 mb-6">
          {item.descricao}
        </p>
        
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center gap-2 font-black">
            <div className="bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-xl text-sm">
              {item.custoMoedas} Moedas
            </div>
            {item.custoXP > 0 && (
              <div className="bg-primary/10 text-primary px-3 py-1.5 rounded-xl text-sm">
                Req: {item.custoXP} XP
              </div>
            )}
          </div>
          
          {hasItem ? (
            <button disabled className="bg-surface-container text-on-surface-variant px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Adquirido
            </button>
          ) : (
            <button 
              onClick={() => handleBuy(item)}
              disabled={!canAfford || buying === item.id}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                canAfford 
                ? 'bg-primary text-white hover:shadow-lg hover:shadow-primary/30' 
                : 'bg-surface-container text-on-surface-variant/50 cursor-not-allowed'
              }`}
            >
              {buying === item.id ? 'Comprando...' : (canAfford ? 'Comprar' : <><Lock className="w-4 h-4"/> Saldo Insuficiente</>)}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background pt-24 pb-20 px-4 md:px-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Market */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 rounded-[2.5rem] p-8 md:p-12 mb-12 flex flex-col md:flex-row items-center justify-between border border-amber-500/30">
          <div className="flex items-center gap-6 mb-6 md:mb-0">
            <div className="w-20 h-20 bg-amber-500 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-amber-500/20 rotate-3">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-on-surface mb-2">Mercado de Permuta</h1>
              <p className="text-on-surface-variant">Troque suas moedas de alquimista por cosméticos, selos e bônus.</p>
            </div>
          </div>
          <div className="bg-surface-container-lowest/80 backdrop-blur-md rounded-2xl p-6 border border-surface-container-high shadow-lg text-center min-w-[200px]">
            <div className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant mb-1">Seu Saldo</div>
            <div className="text-4xl font-black text-amber-500">{Math.floor(moedas)}</div>
            <div className="text-xs text-on-surface-variant font-medium mt-1">Moedas</div>
          </div>
        </div>

        {/* Catalog */}
        <div className="space-y-12">
          {items.length === 0 ? (
            <div className="text-center text-on-surface-variant py-12">O mercado está sem itens no momento. Volte mais tarde!</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map(renderItem)}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
