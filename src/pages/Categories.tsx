import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { recipeService, Recipe } from '../infra/services/recipeService';
import { ASSETS, getAssetUrl } from '../lib/assets';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Pencil, Loader2 } from 'lucide-react';

const CATEGORIES_DETAILED = [
  { 
    name: 'Café da Manhã', 
    desc: 'Comece o dia com receitas nutritivas e reconfortantes.',
    img: ASSETS.CATEGORIES.BREAKFAST,
    filter: { key: 'momento', value: 'Café da Manhã' }
  },
  { 
    name: 'Almoço', 
    desc: 'Refeições leves e equilibradas para o seu meio de dia.',
    img: ASSETS.CATEGORIES.LUNCH,
    filter: { key: 'momento', value: 'Almoço' }
  },
  { 
    name: 'Jantar', 
    desc: 'Pratos sofisticados para encantar a família e amigos.',
    img: ASSETS.CATEGORIES.DINNER,
    filter: { key: 'momento', value: 'Jantar' }
  },
  { 
    name: 'Sobremesas', 
    desc: 'Doces artesanais que celebram sabores naturais.',
    img: ASSETS.CATEGORIES.DESSERTS,
    filter: { key: 'technique', value: 'Doces e Sobremesas' }
  },
  { 
    name: 'Entradas', 
    desc: 'Sopas, saladas e porções de abertura para iniciar a refeição com elegância.',
    img: ASSETS.CATEGORIES.ENTRADAS,
    filter: { key: 'momento', value: 'Entradas' }
  },
  { 
    name: 'Básicas', 
    desc: 'Receitas essenciais do dia a dia: arroz, feijão, molhos e acompanhamentos.',
    img: ASSETS.CATEGORIES.BASICAS,
    filter: { key: 'momento', value: 'Básicas' }
  },
  { 
    name: 'Petiscos&Food Tricks', 
    desc: 'Petiscos criativos, finger foods e truques culinários para surpreender.',
    img: ASSETS.CATEGORIES.SNACKS,
    filter: { key: 'momento', value: 'Petiscos&Food Tricks' }
  },
  { 
    name: 'Bebidas', 
    desc: 'Sucos, drinks e bebidas refrescantes para todas as ocasiões.',
    img: ASSETS.CATEGORIES.DRINKS,
    filter: { key: 'momento', value: 'Bebidas' }
  }
];

export default function Categories() {
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const { isAdmin } = useAuth();
  const [customImages, setCustomImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState(true);
  const [uploadingCategory, setUploadingCategory] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeCategoryToUpload, setActiveCategoryToUpload] = useState<string | null>(null);

  useEffect(() => {
    const loadCounts = async () => {
      try {
        const recipes = await recipeService.getAllRecipes();
        const counts: Record<string, number> = {};
        
        CATEGORIES_DETAILED.forEach(cat => {
          const field = cat.filter.key === 'momento' ? 'momento' : 'tipo_prato';
          counts[cat.name] = recipes.filter(r => {
            const values = (r as any)[field];
            return Array.isArray(values) && values.includes(cat.filter.value);
          }).length;
        });
        
        setCategoryCounts(counts);
      } catch (error) {
        console.error('Error loading category counts:', error);
      }
    };

    const loadCustomImages = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'categoryImages'));
        if (snap.exists()) {
          setCustomImages(snap.data() as Record<string, string>);
        }
      } catch (err) {
        console.error('Error loading custom images:', err);
      } finally {
        setLoadingImages(false);
      }
    };

    loadCounts();
    loadCustomImages();
  }, []);

  const handleEditClick = (e: React.MouseEvent, categoryName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveCategoryToUpload(categoryName);
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const categoryName = activeCategoryToUpload;
    if (!file || !categoryName) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingCategory(categoryName);
    const formDataUpload = new FormData();
    formDataUpload.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
        },
        body: formDataUpload,
      });
      const data = await response.json();
      if (data.success) {
        const newImages = { ...customImages, [categoryName]: data.imageUrl };
        setCustomImages(newImages);
        await setDoc(doc(db, 'settings', 'categoryImages'), newImages, { merge: true });
      } else {
        alert('Erro ao carregar imagem: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Falha ao enviar a imagem para o servidor.');
    } finally {
      setUploadingCategory(null);
      setActiveCategoryToUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 pb-xl">
      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      <header className="mb-12 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold text-on-surface mb-4">Categorias de Receitas</h1>
        <p className="text-on-surface-variant text-lg">Explore nosso universo culinário agrupado por momentos e sabores.</p>
      </header>

      {loadingImages ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-on-surface-variant font-medium">Carregando categorias...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {CATEGORIES_DETAILED.map((cat, i) => (
          <Link key={i} to={`/explore?${cat.filter.key}=${encodeURIComponent(cat.filter.value)}`}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group relative h-80 rounded-3xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl transition-all duration-500"
            >
              <img src={getAssetUrl(customImages[cat.name] || cat.img)} alt={cat.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-900/40 to-transparent" />
              
              {isAdmin && (
                <button
                  onClick={(e) => handleEditClick(e, cat.name)}
                  disabled={uploadingCategory === cat.name}
                  className="absolute top-4 right-4 z-20 p-3 bg-white/20 hover:bg-white text-white hover:text-primary rounded-full shadow-lg backdrop-blur-sm transition-all"
                  title="Alterar imagem da categoria"
                >
                  {uploadingCategory === cat.name ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Pencil className="w-5 h-5" />
                  )}
                </button>
              )}

              <div className="absolute inset-0 p-8 flex flex-col justify-end text-white pointer-events-none">
                <span className="text-sm font-bold text-secondary-container mb-2 tracking-widest uppercase">
                  {categoryCounts[cat.name] !== undefined ? `${categoryCounts[cat.name]} ${categoryCounts[cat.name] === 1 ? 'receita' : 'receitas'}` : 'Carregando...'}
                </span>
                <h3 className="text-3xl font-bold mb-2">{cat.name}</h3>
                <p className="text-stone-300 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                  {cat.desc}
                </p>
              </div>
            </motion.div>
          </Link>
        ))}
        </div>
      )}
    </div>
  );
}
