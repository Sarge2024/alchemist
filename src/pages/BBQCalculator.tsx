import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Beef, ShoppingCart, Beer, Flame, ChevronRight, ChevronLeft, Copy, Printer, Check } from 'lucide-react';

type Step = 1 | 2 | 3;

interface Guests {
  men: number;
  women: number;
  children: number;
  beerDrinkers: number;
}

interface MenuSelection {
  bovina: boolean;
  frango: boolean;
  suina: boolean;
  paoDeAlho: boolean;
  queijoCoalho: boolean;
  arroz: boolean;
  farofa: boolean;
  vinagrete: boolean;
  cerveja: boolean;
  refriSuco: boolean;
  agua: boolean;
}

const INITIAL_GUESTS: Guests = { men: 0, women: 0, children: 0, beerDrinkers: 0 };
const INITIAL_MENU: MenuSelection = {
  bovina: true, frango: true, suina: true,
  paoDeAlho: true, queijoCoalho: true, arroz: false, farofa: true, vinagrete: true,
  cerveja: true, refriSuco: true, agua: true
};

export default function BBQCalculator() {
  const [step, setStep] = useState<Step>(1);
  const [guests, setGuests] = useState<Guests>(INITIAL_GUESTS);
  const [menu, setMenu] = useState<MenuSelection>(INITIAL_MENU);
  const [copied, setCopied] = useState(false);

  // Auto-adjust beer drinkers when adults change
  useEffect(() => {
    const totalAdults = guests.men + guests.women;
    if (guests.beerDrinkers > totalAdults) {
      setGuests(prev => ({ ...prev, beerDrinkers: totalAdults }));
    }
  }, [guests.men, guests.women]);

  const totalPeople = guests.men + guests.women + guests.children;
  const totalAdults = guests.men + guests.women;

  const handleGuestChange = (field: keyof Guests, delta: number) => {
    setGuests(prev => {
      const newVal = Math.max(0, prev[field] + delta);
      // Constraint: beerDrinkers cannot exceed total adults
      if (field === 'beerDrinkers') {
        const maxAdults = prev.men + prev.women;
        return { ...prev, beerDrinkers: Math.min(newVal, maxAdults) };
      }
      return { ...prev, [field]: newVal };
    });
  };

  const toggleMenu = (item: keyof MenuSelection) => {
    setMenu(prev => ({ ...prev, [item]: !prev[item] }));
  };

  const shoppingList = useMemo(() => {
    if (totalPeople === 0) return [];

    // Weights: Men=1.2, Women=0.8, Children=0.4
    const meatMultiplier = (guests.men * 1.2) + (guests.women * 0.8) + (guests.children * 0.4);
    
    let totalMeatKg = 0;
    const list: { category: string, items: { name: string, qty: string }[] }[] = [];

    // 1. CARNES
    const carnes = [];
    if (menu.bovina) {
      const bovinaKg = (200 * meatMultiplier) / 1000;
      totalMeatKg += bovinaKg;
      carnes.push({ name: 'Carne Bovina (Picanha, Alcatra, etc)', qty: `${bovinaKg.toFixed(1)} kg` });
    }
    if (menu.suina) {
      const suinaKg = (150 * meatMultiplier) / 1000;
      totalMeatKg += suinaKg;
      carnes.push({ name: 'Carne Suína (Linguiça, Costela)', qty: `${suinaKg.toFixed(1)} kg` });
    }
    if (menu.frango) {
      const frangoKg = (100 * meatMultiplier) / 1000;
      totalMeatKg += frangoKg;
      carnes.push({ name: 'Frango (Coração, Coxinha, Asa)', qty: `${frangoKg.toFixed(1)} kg` });
    }
    if (carnes.length > 0) list.push({ category: '🥩 Carnes', items: carnes });

    // 2. ACOMPANHAMENTOS
    const acompanhamentos = [];
    if (menu.paoDeAlho) {
      const paoTotal = (totalAdults * 2) + (guests.children * 1);
      acompanhamentos.push({ name: 'Pão de Alho', qty: `${paoTotal} unidades` });
    }
    if (menu.queijoCoalho) {
      const queijoTotal = Math.ceil(totalPeople * 1.5);
      acompanhamentos.push({ name: 'Queijo Coalho', qty: `${queijoTotal} espetos` });
    }
    if (menu.arroz) {
      const arrozKg = (totalPeople * 50) / 1000;
      acompanhamentos.push({ name: 'Arroz (Cru)', qty: `${arrozKg.toFixed(1)} kg` });
    }
    if (menu.farofa) {
      const farofaKg = (totalPeople * 30) / 1000;
      acompanhamentos.push({ name: 'Farofa Pronta', qty: `${farofaKg.toFixed(1)} kg` });
    }
    if (menu.vinagrete) {
      const vinagreteKg = (totalPeople * 50) / 1000;
      acompanhamentos.push({ name: 'Vinagrete (Ingredientes)', qty: `${vinagreteKg.toFixed(1)} kg` });
    }
    if (acompanhamentos.length > 0) list.push({ category: '🥖 Acompanhamentos', items: acompanhamentos });

    // 3. BEBIDAS
    const bebidas = [];
    if (menu.cerveja && guests.beerDrinkers > 0) {
      const cervejaLatas = guests.beerDrinkers * 5;
      const cervejaLitros = (cervejaLatas * 350) / 1000;
      bebidas.push({ name: 'Cerveja (Latas 350ml)', qty: `${cervejaLitros.toFixed(1)} L (${cervejaLatas} latas)` });
    }
    if (menu.refriSuco) {
      const refriLitros = (totalPeople * 400) / 1000;
      bebidas.push({ name: 'Refrigerante / Suco', qty: `${refriLitros.toFixed(1)} L` });
    }
    if (menu.agua) {
      const aguaLitros = (totalPeople * 300) / 1000;
      bebidas.push({ name: 'Água', qty: `${aguaLitros.toFixed(1)} L` });
    }
    if (bebidas.length > 0) list.push({ category: '🍻 Bebidas', items: bebidas });

    // 4. SUPRIMENTOS
    const suprimentos = [];
    if (totalMeatKg > 0) {
      // 1kg carvão para cada 1.2kg carne
      const carvaoKg = Math.ceil(totalMeatKg / 1.2);
      suprimentos.push({ name: 'Carvão', qty: `${carvaoKg} kg` });
      suprimentos.push({ name: 'Sal Grosso', qty: `1 pct (500g)` });
    }
    if (suprimentos.length > 0) list.push({ category: '🔥 Suprimentos', items: suprimentos });

    return list;
  }, [guests, menu, totalPeople, totalAdults]);

  const copyToClipboard = () => {
    let text = `🔥 *Lista de Compras do Churrasco* 🔥\n\n`;
    text += `👥 *Convidados:* ${guests.men} Homens, ${guests.women} Mulheres, ${guests.children} Crianças\n\n`;
    
    shoppingList.forEach(cat => {
      text += `*${cat.category}*\n`;
      cat.items.forEach(item => {
        text += `• ${item.name}: ${item.qty}\n`;
      });
      text += `\n`;
    });
    
    text += `Gerado por Alquimia do Prato`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printList = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 pb-20 font-sans">
      <style>{`
        @media print {
          @page { margin: 8mm; }
          body { background-color: white !important; }
          .no-print { display: none !important; }
          .printable-area { 
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }
          .page-break-inside-avoid { break-inside: avoid; }
        }
      `}</style>
      {/* Header */}
      <div className="bg-stone-900 text-white p-6 pb-12 rounded-b-[2.5rem] shadow-lg no-print relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/20 rounded-full blur-[50px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-red-600/20 rounded-full blur-[50px] pointer-events-none" />
        
        <div className="max-w-2xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-orange-600 rounded-xl">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight">Mestre Churrasqueiro</h1>
          </div>
          <p className="text-stone-400 text-sm">A lista de compras perfeita, sem desperdício.</p>

          {/* Stepper */}
          <div className="flex items-center justify-between mt-8 relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-stone-800 -z-10 -translate-y-1/2" />
            
            {[
              { num: 1, icon: Users, label: 'Convidados' },
              { num: 2, icon: Beef, label: 'Cardápio' },
              { num: 3, icon: ShoppingCart, label: 'Lista' }
            ].map((s) => {
              const active = step >= s.num;
              const current = step === s.num;
              const Icon = s.icon;
              return (
                <div key={s.num} className="flex flex-col items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-2 ${
                    current ? 'bg-orange-600 border-orange-600 text-white shadow-[0_0_15px_rgba(234,88,12,0.4)]' : 
                    active ? 'bg-stone-800 border-orange-600 text-orange-500' : 'bg-stone-900 border-stone-700 text-stone-600'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${active ? 'text-stone-200' : 'text-stone-600'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-6 relative z-20">
        <div className="bg-white rounded-3xl shadow-sm border border-stone-200 p-6 sm:p-8 min-h-[400px]">
          
          <AnimatePresence mode="wait">
            
            {/* STEP 1: CONVIDADOS */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-serif font-medium text-stone-900">Quem vai pro churras?</h2>
                  <p className="text-stone-500 text-sm mt-1">Nossa IA ajusta o peso para cada perfil.</p>
                </div>

                <div className="space-y-4">
                  <GuestCounter 
                    label="Homens" 
                    desc="Consumo base 1.2x"
                    value={guests.men} 
                    onChange={(d) => handleGuestChange('men', d)} 
                  />
                  <GuestCounter 
                    label="Mulheres" 
                    desc="Consumo base 0.8x"
                    value={guests.women} 
                    onChange={(d) => handleGuestChange('women', d)} 
                  />
                  <GuestCounter 
                    label="Crianças" 
                    desc="Consumo reduzido"
                    value={guests.children} 
                    onChange={(d) => handleGuestChange('children', d)} 
                  />
                </div>

                <div className="pt-6 border-t border-stone-100">
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-orange-950 flex items-center gap-2">
                        <Beer className="w-4 h-4 text-orange-600" /> Bebem Cerveja
                      </h4>
                      <p className="text-xs text-orange-800/70 mt-0.5">Dentre os {totalAdults} adultos</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleGuestChange('beerDrinkers', -1)} className="w-8 h-8 rounded-full bg-white text-orange-600 shadow-sm flex items-center justify-center active:scale-95 disabled:opacity-50" disabled={guests.beerDrinkers <= 0}>-</button>
                      <span className="w-6 text-center font-bold text-orange-950">{guests.beerDrinkers}</span>
                      <button onClick={() => handleGuestChange('beerDrinkers', 1)} className="w-8 h-8 rounded-full bg-orange-600 text-white shadow-sm flex items-center justify-center active:scale-95 disabled:opacity-50" disabled={guests.beerDrinkers >= totalAdults}>+</button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  disabled={totalPeople === 0}
                  className="w-full py-4 mt-4 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  Continuar <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* STEP 2: CARDÁPIO */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-serif font-medium text-stone-900">O que vai ter?</h2>
                  <p className="text-stone-500 text-sm mt-1">Selecione os itens do cardápio.</p>
                </div>

                <div className="space-y-6">
                  <MenuCategory title="🥩 Carnes Principais">
                    <MenuItem label="Bovina (Picanha, Alcatra)" checked={menu.bovina} onChange={() => toggleMenu('bovina')} />
                    <MenuItem label="Suína (Linguiça, Costela)" checked={menu.suina} onChange={() => toggleMenu('suina')} />
                    <MenuItem label="Frango (Coração, Asa)" checked={menu.frango} onChange={() => toggleMenu('frango')} />
                  </MenuCategory>

                  <MenuCategory title="🥖 Acompanhamentos">
                    <MenuItem label="Pão de Alho" checked={menu.paoDeAlho} onChange={() => toggleMenu('paoDeAlho')} />
                    <MenuItem label="Queijo Coalho" checked={menu.queijoCoalho} onChange={() => toggleMenu('queijoCoalho')} />
                    <MenuItem label="Arroz" checked={menu.arroz} onChange={() => toggleMenu('arroz')} />
                    <MenuItem label="Farofa" checked={menu.farofa} onChange={() => toggleMenu('farofa')} />
                    <MenuItem label="Vinagrete" checked={menu.vinagrete} onChange={() => toggleMenu('vinagrete')} />
                  </MenuCategory>

                  <MenuCategory title="🍻 Bebidas">
                    <MenuItem label="Cerveja" checked={menu.cerveja} onChange={() => toggleMenu('cerveja')} disabled={guests.beerDrinkers === 0} />
                    <MenuItem label="Refrigerante / Suco" checked={menu.refriSuco} onChange={() => toggleMenu('refriSuco')} />
                    <MenuItem label="Água" checked={menu.agua} onChange={() => toggleMenu('agua')} />
                  </MenuCategory>
                </div>

                <div className="flex gap-3 pt-4">
                  <button onClick={() => setStep(1)} className="px-5 py-4 bg-stone-100 text-stone-600 font-bold rounded-2xl flex items-center transition-all cursor-pointer hover:bg-stone-200">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button onClick={() => setStep(3)} className="flex-1 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-orange-600/20">
                    Gerar Lista <ShoppingCart className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: RESULTADO */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center mb-6 no-print">
                  <h2 className="text-2xl font-serif font-medium text-stone-900">Lista Pronta!</h2>
                  <p className="text-stone-500 text-sm mt-1">Para {totalPeople} pessoas ({guests.men}H, {guests.women}M, {guests.children}C)</p>
                </div>

                {/* Resumo da Lista */}
                <div className="bg-stone-50 rounded-2xl p-6 border border-stone-200 printable-area">
                  <div className="hidden print:block text-center mb-6 border-b pb-4">
                    <h1 className="text-2xl font-black text-stone-900">Lista de Compras - Churrasco</h1>
                    <p className="text-stone-600 mt-1">{totalPeople} Pessoas</p>
                  </div>

                  {shoppingList.map((category, idx) => (
                    <div key={idx} className="mb-6 last:mb-0 print:mb-4 page-break-inside-avoid">
                      <h3 className="font-black uppercase tracking-widest text-xs text-orange-700 mb-3 border-b border-orange-200 pb-2 print:mb-2 print:pb-1 print:border-stone-300 print:text-stone-800">
                        {category.category}
                      </h3>
                      <ul className="space-y-3 print:space-y-1.5">
                        {category.items.map((item, i) => (
                          <li key={i} className="flex justify-between items-center text-sm print:text-sm">
                            <span className="text-stone-700 font-medium print:text-black">{item.name}</span>
                            <span className="text-stone-900 font-bold bg-white px-2 py-1 rounded-md shadow-sm border border-stone-100 print:bg-transparent print:border-none print:shadow-none print:p-0 print:text-black">{item.qty}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 no-print">
                  <button onClick={() => setStep(2)} className="py-4 px-6 bg-stone-100 text-stone-600 font-bold rounded-2xl flex items-center justify-center transition-all cursor-pointer hover:bg-stone-200 shrink-0">
                    <ChevronLeft className="w-5 h-5 mr-1" /> Voltar
                  </button>
                  <div className="flex-1 flex gap-3">
                    <button onClick={printList} className="flex-1 py-4 bg-stone-900 hover:bg-stone-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer">
                      <Printer className="w-4 h-4" /> <span className="hidden sm:inline">Imprimir</span>
                    </button>
                    <button onClick={copyToClipboard} className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/20">
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      {copied ? 'Copiado!' : 'Copiar p/ WhatsApp'}
                    </button>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </div>
  );
}

// Subcomponents

function GuestCounter({ label, desc, value, onChange }: { label: string, desc: string, value: number, onChange: (d: number) => void }) {
  return (
    <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-100 rounded-2xl">
      <div>
        <h4 className="font-bold text-stone-900">{label}</h4>
        <p className="text-xs text-stone-500">{desc}</p>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={() => onChange(-1)} className="w-10 h-10 rounded-full bg-white border border-stone-200 text-stone-600 shadow-sm flex items-center justify-center active:scale-95">-</button>
        <span className="w-6 text-center font-black text-lg text-stone-900">{value}</span>
        <button onClick={() => onChange(1)} className="w-10 h-10 rounded-full bg-stone-900 text-white shadow-sm flex items-center justify-center active:scale-95">+</button>
      </div>
    </div>
  );
}

function MenuCategory({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-black uppercase tracking-widest text-stone-400 mb-3 ml-2">{title}</h4>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function MenuItem({ label, checked, onChange, disabled }: { label: string, checked: boolean, onChange: () => void, disabled?: boolean }) {
  return (
    <label className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${checked && !disabled ? 'bg-orange-50/50 border-orange-200' : 'bg-white border-stone-200'} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>
      <span className={`font-medium ${checked ? 'text-orange-950' : 'text-stone-600'}`}>{label}</span>
      <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 transition-colors ${checked && !disabled ? 'bg-orange-600 border-orange-600 text-white' : 'border-stone-300'}`}>
        {checked && <Check className="w-4 h-4" />}
      </div>
      <input type="checkbox" className="hidden" checked={checked} onChange={onChange} disabled={disabled} />
    </label>
  );
}
