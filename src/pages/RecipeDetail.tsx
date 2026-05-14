import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Clock, Utensils, Heart, Share2, Printer, ChevronLeft, CheckCircle2, Edit3, Trash2, Loader2, Gauge, Facebook, Twitter, MessageCircle, X, Star, Plus, Camera } from 'lucide-react';
import { recipeService, Recipe, Ingredient } from '../infra/services/recipeService';
import { auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import html2pdf from 'html2pdf.js';
import { reviewService, Review as ReviewType } from '../infra/services/reviewService';

import { ASSETS, getAssetUrl } from '../lib/assets';

const MOCK_RECIPES_DETAIL: Record<string, Recipe> = {
  'tapioca-rendada': {
    id: 'tapioca-rendada',
    title: 'Tapioca Rendada com Queijo Coalho',
    description: 'Uma versão gourmet da tradicional tapioca, com uma crosta crocante de queijo que derrete na boca.',
    momento: ['Café da Manhã'],
    tipo_prato: ['Grelhados'],
    base_alimento: ['Ovos e Laticínios'],
    origem: 'Brasileira',
    time: '12 min',
    difficulty: 'Fácil',
    servings: '1',
    rating: 4.9,
    reviewsCount: 45,
    image: ASSETS.MOCKS.TAPIOCA,
    ingredients: [
      { name: 'goma de tapioca peneirada', quantity: '100g' },
      { name: 'queijo coalho ralado grosso', quantity: '50g' },
      { name: 'Manteiga de garrafa para finalizar', quantity: 'a gosto' },
      { name: 'Recheio de sua preferência (coco, queijo ou carne de sol)', quantity: '' }
    ],
    instructions: [
      'Aqueça uma frigideira antiaderente em fogo médio.',
      'Espalhe o queijo coalho ralado por toda a superfície da frigideira até formar uma camada fina.',
      'Assim que o queijo começar a derreter, peneire a goma de tapioca por cima do queijo.',
      'Espere a tapioca "grudar" no queijo e formar a massa única.',
      'Vire a tapioca para dourar levemente o lado da massa.',
      'Adicione o recheio escolhido, dobre ao meio e finalize com um fio de manteiga de garrafa.'
    ],
    ownerId: 'system',
    createdAt: new Date().toISOString()
  },
  'feijoada-completa': {
    id: 'feijoada-completa',
    title: 'Feijoada Completa Tradicional',
    description: 'O prato mais emblemático do Brasil, preparado com carnes selecionadas e cozido lentamente para atingir perfeição.',
    momento: ['Almoço'],
    tipo_prato: ['Cozidos / Guisados'],
    base_alimento: ['Carnes'],
    origem: 'Brasileira',
    time: '3h 00min',
    difficulty: 'Médio',
    servings: '6',
    rating: 5.0,
    reviewsCount: 128,
    image: ASSETS.MOCKS.FEIJOADA,
    ingredients: [
      { name: 'feijão preto', quantity: '500g' },
      { name: 'carne seca', quantity: '200g' },
      { name: 'lombo salgado', quantity: '200g' },
      { name: 'paio', quantity: '100g' },
      { name: 'linguiça calabresa', quantity: '100g' },
      { name: 'Arroz branco, couve e farofa para acompanhar', quantity: 'a gosto' }
    ],
    instructions: [
      'Deixe as carnes salgadas de molho por 24h trocando a água.',
      'Cozinhe o feijão com as carnes mais duras primeiro.',
      'Adicione as carnes mais macias e as linguiças no meio do processo.',
      'Faça um refogado com alho, cebola e um pouco do caldo da feijoada e retorne à panela.',
      'Deixe apurar o caldo até engrossar.',
      'Sirva com os acompanhamentos tradicionais.'
    ],
    ownerId: 'system',
    createdAt: new Date().toISOString()
  },
  'salmao-ervas': {
    id: 'salmao-ervas',
    title: 'Salmão com Crosta de Ervas',
    description: 'Uma opção leve e sofisticada para o jantar. O salmão suculento contrasta perfeitamente com a crosta de ervas e cítricos.',
    momento: ['Jantar'],
    tipo_prato: ['Assados'],
    base_alimento: ['Frutos do Mar'],
    origem: 'Europeia',
    time: '25 min',
    difficulty: 'Fácil',
    servings: '2',
    rating: 4.8,
    reviewsCount: 67,
    image: ASSETS.MOCKS.SALMON,
    ingredients: [
      { name: 'Filés de salmão', quantity: '2' },
      { name: 'Salsa e alecrim picados', quantity: 'a gosto' },
      { name: 'Raspas de limão siciliano', quantity: 'a gosto' },
      { name: 'Azeite de oliva extra virgem', quantity: 'a gosto' },
      { name: 'Sal e pimenta a gosto', quantity: '' }
    ],
    instructions: [
      'Tempere os filés with sal e pimenta.',
      'Misture as ervas com as raspas de limão e um pouco de azeite.',
      'Pressione a mistura sobre o topo dos filés de salmão.',
      'Leve ao forno pré-aquecido a 200°C por cerca de 12-15 minutos.',
      'Sirva com legumes grelhados ou uma salada verde fresca.'
    ],
    ownerId: 'system',
    createdAt: new Date().toISOString()
  },
  'pudim-leite': {
    id: 'pudim-leite',
    title: 'Pudim de Leite Condensado',
    description: 'O clássico dos domingos brasileiros. Textura aveludada, sem furinhos (ou com, se preferir!) e uma calda de caramelo brilhante.',
    momento: ['Lanche / Chá da Tarde'],
    tipo_prato: ['Assados'],
    base_alimento: ['Ovos e Laticínios'],
    origem: 'Brasileira',
    time: '1h 30min',
    difficulty: 'Médio',
    servings: '8',
    rating: 4.9,
    reviewsCount: 210,
    image: ASSETS.MOCKS.BRUNCH,
    ingredients: [
      { name: 'leite condensado', quantity: '1 lata' },
      { name: 'leite integral', quantity: '2 latas' },
      { name: 'ovos', quantity: '3' },
      { name: 'açúcar para a calda', quantity: '1 xícara' }
    ],
    instructions: [
      'Prepare a calda derretendo o açúcar na forma de pudim até dourar.',
      'Bata no liquidificador o leite condensado, o leite e os ovos.',
      'Despeje a mistura na forma caramelizada.',
      'Cozinhe em banho-maria no forno por cerca de 1 hora.',
      'Deixe esfriar e leve à geladeira por pelo menos 4 horas antes de desenformar.'
    ],
    ownerId: 'system',
    createdAt: new Date().toISOString()
  }
};

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  
  // Reviews State
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [newRating, setNewRating] = useState(0); // Começa com 0 conforme imagem
  const [newComment, setNewComment] = useState('');
  const [newReviewPhoto, setNewReviewPhoto] = useState<string | null>(null);
  const [isUploadingReviewPhoto, setIsUploadingReviewPhoto] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(0);
  const [editComment, setEditComment] = useState('');
  const [isUpdatingReview, setIsUpdatingReview] = useState(false);

  const shareUrl = window.location.href;
  const shareText = recipe 
    ? `🥘 *${recipe.title}* \n\nConfira esta receita completa no Alquimia do Prato!` 
    : 'Confira esta receita no Alquimia do Prato!';

  const [isSharing, setIsSharing] = useState(false);

  const shareAsPDF = async () => {
    if (!recipe || !printRef.current) return;
    
    setIsSharing(true);
    setShowShareMenu(false);
    
    const element = printRef.current;
    const filename = `Receita_${recipe.title.replace(/\s+/g, '_')}.pdf`;
    
    const opt = {
      margin: [5, 5, 5, 5],
      filename: filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true,
        logging: false,
        scrollY: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    } as any;

    try {
      // 1. Generate PDF as blob
      const pdfBlob = await html2pdf().set(opt).from(element).output('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });

      // 2. Check if the browser supports sharing this specific file
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Ficha Técnica: ${recipe.title}`,
          text: `Confira a ficha técnica de preparo: *${recipe.title}*`
        });
      } else {
        // 3. Fallback for Desktop/Unsupported browsers
        // We can't "attach" files to WhatsApp Web via URL, so we download and notify
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('Seu navegador não suporta o envio direto de arquivos. O PDF foi baixado para que você possa anexá-lo manualmente no WhatsApp.');
      }
    } catch (error) {
      console.error('Error in PDF sharing:', error);
      alert('Não foi possível compartilhar o PDF. Tente copiar o link da receita.');
    } finally {
      setIsSharing(false);
    }
  };

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + shareUrl)}`
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Link da receita copiado!');
      setShowShareMenu(false);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, u => setUser(u));
    if (id) {
      loadRecipe(id);
      loadReviews(id);
    }
    return () => unsubscribe();
  }, [id]);

  const loadReviews = async (recipeId: string) => {
    const data = await reviewService.getRecipeReviews(recipeId);
    setReviews(data);
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id || !newComment.trim() || newRating === 0) {
      if (newRating === 0) alert('Por favor, selecione uma nota!');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await reviewService.addReview({
        recipeId: id,
        userId: user.uid,
        userName: user.displayName || 'Alquimista',
        userPhoto: user.photoURL || undefined,
        rating: newRating,
        comment: newComment,
        image: newReviewPhoto || undefined
      });
      
      setNewComment('');
      setNewRating(0);
      setNewReviewPhoto(null);
      setShowReviewForm(false);
      
      // Reload everything
      await loadRecipe(id);
      await loadReviews(id);
    } catch (error) {
      alert('Erro ao enviar avaliação. Tente novamente.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleReviewPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingReviewPhoto(true);
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
        },
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setNewReviewPhoto(data.imageUrl);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setIsUploadingReviewPhoto(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!id || !window.confirm('Tem certeza que deseja apagar esta avaliação?')) return;
    
    try {
      await reviewService.deleteReview(reviewId, id);
      await loadRecipe(id);
      await loadReviews(id);
    } catch (error) {
      alert('Erro ao apagar avaliação.');
    }
  };

  const handleStartEditReview = (review: ReviewType) => {
    setEditingReviewId(review.id || null);
    setEditRating(review.rating);
    setEditComment(review.comment);
  };

  const handleUpdateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !editingReviewId) return;

    setIsUpdatingReview(true);
    try {
      await reviewService.updateReview(editingReviewId, id, {
        rating: editRating,
        comment: editComment
      });
      setEditingReviewId(null);
      await loadRecipe(id);
      await loadReviews(id);
    } catch (error) {
      alert('Erro ao atualizar avaliação.');
    } finally {
      setIsUpdatingReview(false);
    }
  };

  useEffect(() => {
    if (recipe) {
      document.title = `${recipe.title} | Alquimia do Prato`;
      
      // Update meta tags for social previews (some modern scrapers use JS)
      const updateMeta = (name: string, property: string, content: string) => {
        let el = (name ? document.querySelector(`meta[name="${name}"]`) : null) || 
                 (property ? document.querySelector(`meta[property="${property}"]`) : null);
                 
        if (!el) {
          el = document.createElement('meta');
          if (name) el.setAttribute('name', name);
          if (property) el.setAttribute('property', property);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      };

      if (recipe.description) updateMeta('description', 'og:description', recipe.description);
      updateMeta('', 'og:title', recipe.title);
      if (recipe.image) {
        updateMeta('', 'og:image', recipe.image);
        updateMeta('', 'twitter:image', recipe.image);
      }
      updateMeta('', 'og:url', window.location.href);
      updateMeta('', 'og:type', 'article');
      updateMeta('', 'twitter:card', 'summary_large_image');
      updateMeta('', 'twitter:title', recipe.title);
      if (recipe.description) updateMeta('', 'twitter:description', recipe.description);
    }
  }, [recipe]);

  const loadRecipe = async (recipeId: string) => {
    try {
      const data = await recipeService.getRecipe(recipeId);
      if (data) {
        setRecipe(data);
      } else if (MOCK_RECIPES_DETAIL[recipeId]) {
        // Fallback for popular/mock recipes
        setRecipe(MOCK_RECIPES_DETAIL[recipeId]);
      } else {
        console.warn('Recipe not found in Firestore or Mocks');
      }
    } catch (error) {
      console.error('Error loading recipe:', error);
      // Even on error, try to check mocks as fallback
      if (MOCK_RECIPES_DETAIL[recipeId]) {
        setRecipe(MOCK_RECIPES_DETAIL[recipeId]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!recipe || !recipe.id) return;
    if (window.confirm('Tem certeza que deseja excluir esta receita?')) {
      setIsDeleting(true);
      try {
        await recipeService.deleteRecipe(recipe.id);
        alert('Receita excluída com sucesso.');
        navigate('/explore');
      } catch (error) {
        console.error('Delete error:', error);
        alert('Erro ao excluir a receita.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handlePrint = async () => {
    if (!recipe || !printRef.current) return;
    
    setIsPrinting(true);
    
    const element = printRef.current;
    const opt = {
      margin: [5, 5, 5, 5],
      filename: `Receita_${recipe.title.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
        letterRendering: true,
        logging: false,
        scrollY: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    } as any;

    try {
      // Show printing notification or handle state
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erro ao gerar PDF. Tente imprimir usando as ferramentas do navegador (Ctrl+P).');
    } finally {
      setIsPrinting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-on-surface-variant font-semibold">Buscando segredos culinários...</p>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-on-surface mb-4">Receita não encontrada</h2>
        <Link to="/explore" className="text-primary font-bold hover:underline">Voltar para Explorar</Link>
      </div>
    );
  }

  const isOwner = user && recipe.ownerId === user.uid;
  const isAdmin = user && user.email === 'sagacitas.sistemas@gmail.com';
  const canManage = isOwner || isAdmin;

  // Helper to group ingredients
  interface GroupedIngredients {
    [key: string]: (string | Ingredient)[];
  }

  const groupedIngredients: GroupedIngredients = {};
  recipe.ingredients.forEach(ing => {
    const groupName = (typeof ing === 'object' && ing.group) ? ing.group : 'Geral';
    if (!groupedIngredients[groupName]) {
      groupedIngredients[groupName] = [];
    }
    groupedIngredients[groupName].push(ing);
  });

  const groupKeys = Object.keys(groupedIngredients);
  const hasMultipleGroups = groupKeys.length > 1 || (groupKeys.length === 1 && groupKeys[0] !== 'Geral');

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto px-6 pb-xl"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-8 no-print">
        <Link to="/explore" className="inline-flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-semibold">
          <ChevronLeft className="w-5 h-5" /> Explorar Receitas
        </Link>
        
        {canManage && (
          <div className="flex gap-3">
            <Link 
              to={`/submit/${recipe.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface rounded-lg hover:bg-surface-container transition-all font-semibold"
            >
              <Edit3 className="w-4 h-4" /> Editar
            </Link>
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-semibold disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        )}
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-12 text-center border-b-2 border-stone-100 pb-6">
        <h2 className="text-4xl font-bold text-primary mb-1">Alquimia do Prato</h2>
        <p className="text-stone-500 font-medium">alquimiadoprato.app</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        {/* Gallery/Image */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="rounded-3xl overflow-hidden shadow-2xl h-[500px] bg-surface-container-low"
        >
          {recipe.image ? (
            <img 
              src={getAssetUrl(recipe.image)} 
              alt={recipe.title} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer" 
              onError={(e) => {
                (e.target as HTMLImageElement).src = ASSETS.DEFAULT_RECIPE;
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300 font-bold uppercase tracking-widest text-4xl">
              Alquimia
            </div>
          )}
        </motion.div>

        {/* Content Header */}
        <div className="flex flex-col justify-center space-y-6">
          <div className="space-y-4">
            {recipe.isClassic && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold uppercase tracking-wider">
                <Star className="w-3 h-3 fill-primary" />
                Receita Clássica
              </div>
            )}
            <h1 className="text-4xl md:text-5xl font-bold text-on-surface leading-tight font-sans">
              {recipe.title}
            </h1>
            <p className="text-lg text-on-surface-variant leading-relaxed">
              {recipe.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-6 py-6 border-y border-surface-container-high">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Preparação</p>
                <p className="font-semibold text-sm">{recipe.prepTime || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Tempo Total</p>
                <p className="font-semibold text-sm">{recipe.time || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Porções</p>
                <p className="font-semibold text-sm">{recipe.servings || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Gauge className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Origem</p>
                <p className="font-semibold text-sm">{recipe.origem || 'Brasileira'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Custo</p>
                <p className="font-semibold text-sm">{recipe.custo_estimado || '$$'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Dieta</p>
                <p className="font-semibold text-sm">{recipe.dietType || 'Convencional'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-4 border-t border-surface-container-high">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider text-[10px]">Avaliação</p>
                <p className="font-semibold text-sm">{recipe.rating?.toFixed(1) || '0.0'} ({recipe.reviewsCount || 0} avaliações)</p>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4 no-print">
            <button className="flex-1 bg-primary text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary-container transition-all active:scale-95 shadow-lg shadow-primary/20">
              <Heart className="w-5 h-5 fill-white" /> Salvar Receita
            </button>
            <button 
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className="p-4 rounded-xl border-2 border-surface-container-high hover:border-primary hover:text-primary transition-all active:scale-95 flex items-center gap-2 font-bold"
              title="Imprimir Receita"
            >
              {isPrinting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Printer className="w-6 h-6" />}
              <span className="hidden sm:inline">{isPrinting ? 'Gerando...' : 'Imprimir'}</span>
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowShareMenu(!showShareMenu)}
                disabled={isSharing}
                className={`p-4 rounded-xl border-2 transition-all active:scale-95 flex items-center gap-2 ${showShareMenu ? 'border-primary text-primary bg-primary/5' : 'border-surface-container-high hover:border-primary hover:text-primary'} ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Compartilhar"
              >
                {isSharing ? <Loader2 className="w-6 h-6 animate-spin" /> : (showShareMenu ? <X className="w-6 h-6" /> : <Share2 className="w-6 h-6" />)}
                <span className="hidden sm:inline">{isSharing ? 'Gerando...' : 'Compartilhar'}</span>
              </button>

              {showShareMenu && (
                <div className="absolute bottom-full mb-4 right-0 bg-surface-container-lowest rounded-2xl shadow-2xl border border-surface-container-high p-2 flex flex-col gap-1 min-w-[240px] z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <div className="px-3 py-2 text-xs font-bold text-on-surface-variant opacity-60 uppercase tracking-widest border-b border-surface-container-high mb-1">
                    Opções de Envio
                  </div>
                  
                  <button 
                    onClick={shareAsPDF}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-primary/5 text-primary transition-colors font-bold w-full text-left bg-primary/5"
                  >
                    <Share2 className="w-5 h-5" /> Enviar Ficha PDF
                  </button>

                  <button 
                    onClick={copyToClipboard}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-surface-container text-on-surface-variant transition-colors font-bold w-full text-left"
                  >
                    <Printer className="w-5 h-5" /> Copiar Link
                  </button>

                  <div className="h-px bg-surface-container-high my-1 mx-2"></div>

                  <a 
                    href={shareLinks.whatsapp} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-green-50 text-green-600 transition-colors font-bold"
                  >
                    <MessageCircle className="w-5 h-5" /> WhatsApp (Link)
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Ingredients & Instructions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        <aside className="lg:col-span-1 space-y-8">
          <div className="bg-surface-container-low p-8 rounded-3xl border border-surface-container-high">
            <h3 className="text-2xl font-bold mb-6 text-primary border-b border-primary/10 pb-4">Ingredientes</h3>
            <div className="space-y-8">
              {groupKeys.map(groupName => (
                <div key={groupName} className="space-y-4">
                  {hasMultipleGroups && (
                    <h4 className="text-sm font-bold text-secondary uppercase tracking-widest bg-secondary/5 px-3 py-1 rounded-md inline-block">
                      {groupName}
                    </h4>
                  )}
                  <ul className="space-y-3">
                    {groupedIngredients[groupName].map((ing, i) => (
                      <li key={i} className="flex items-start gap-4 group cursor-pointer border-b border-primary/5 pb-2 last:border-0">
                        <div className="mt-1 flex-shrink-0">
                          <CheckCircle2 className="w-4 h-4 text-on-surface-variant/30 group-hover:text-secondary transition-colors" />
                        </div>
                        <div className="flex flex-col">
                          {typeof ing === 'object' && ing.quantity && (
                            <span className="text-[10px] font-bold uppercase text-primary mb-0.5">{ing.quantity}</span>
                          )}
                          <span className="text-on-surface-variant group-hover:text-on-surface transition-colors font-medium text-sm">
                            {typeof ing === 'string' ? ing : ing.name}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="lg:col-span-2 space-y-8">
          <h3 className="text-2xl font-bold text-primary">Modo de Preparo</h3>
          <div className="space-y-12">
            {recipe.instructions.map((step, i) => (
              <div key={i} className="flex gap-8 group">
                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-surface-container text-primary flex items-center justify-center font-bold text-xl shadow-inner group-hover:bg-primary group-hover:text-white transition-all duration-500">
                  {i + 1}
                </div>
                <div className="pt-3">
                  <p className="text-lg text-on-surface-variant leading-relaxed font-sans">
                    {step}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Reviews Section */}
      <div className="mt-20 border-t border-surface-container-high pt-16 no-print">
        <div className="bg-[#fdf8f4] rounded-3xl p-8 mb-12 text-center border border-[#f3e5d8]">
          <h3 className="text-2xl font-bold text-[#5c3d2e] mb-2">Você fez esta receita? Queremos sua avaliação!</h3>
          <p className="text-[#8b7264] mb-4">Compartilhe conosco sua experiência. A receita ficou boa?</p>
          
          <button 
            onClick={() => user ? setShowReviewForm(true) : alert('Faça login para avaliar!')}
            className="inline-flex items-center gap-2 text-[#d97706] font-bold hover:underline"
          >
            <Camera className="w-4 h-4" /> Seja o primeiro a avaliar com foto!
          </button>
        </div>

        {/* Review Form */}
        <AnimatePresence>
          {showReviewForm && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mb-16"
            >
              <form onSubmit={handleAddReview} className="bg-[#fdf8f4] p-10 rounded-3xl border border-[#f3e5d8] space-y-8">
                <div>
                  <h4 className="text-xl font-bold text-[#5c3d2e] mb-4">sua nota</h4>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        className="transition-transform active:scale-125"
                      >
                        <Star 
                          className={`w-10 h-10 ${star <= newRating ? 'fill-[#f4a261] text-[#f4a261]' : 'text-stone-300'}`} 
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-8">
                  <div>
                    <h4 className="text-xl font-bold text-[#5c3d2e] mb-4">sua avaliação</h4>
                    <label className="relative flex flex-col items-center justify-center aspect-square bg-white border-2 border-dashed border-[#e7d4c1] rounded-2xl cursor-pointer hover:bg-stone-50 transition-all overflow-hidden group">
                      {isUploadingReviewPhoto ? (
                        <Loader2 className="w-8 h-8 animate-spin text-[#d97706]" />
                      ) : newReviewPhoto ? (
                        <img src={getAssetUrl(newReviewPhoto)} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-4">
                          <Camera className="w-8 h-8 text-[#5c3d2e] mx-auto mb-2" />
                          <p className="text-xs font-bold text-[#5c3d2e]">Foto da receita</p>
                          <p className="text-[10px] text-[#8b7264]">Sua foto inspira outros!</p>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleReviewPhotoUpload} />
                    </label>
                    <p className="mt-2 text-[10px] text-[#8b7264] text-center leading-tight">
                      A imagem deve ser em formato PNG, JPG ou JPEG e ter no máximo 30MB
                    </p>
                  </div>

                  <div className="space-y-4">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Conte como ficou! Fez alguma alteração? Tem alguma dica? Seu comentário ajuda outros a acertarem na receita."
                      className="w-full bg-white border border-[#e7d4c1] rounded-lg p-4 min-h-[160px] focus:ring-2 focus:ring-[#f4a261] outline-none transition-all text-[#5c3d2e]"
                      required
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Seu nome" 
                        readOnly 
                        value={user?.displayName || ''} 
                        className="bg-white border border-[#e7d4c1] rounded-lg p-3 text-sm text-[#8b7264]"
                      />
                      <input 
                        type="email" 
                        placeholder="Seu email" 
                        readOnly 
                        value={user?.email || ''} 
                        className="bg-white border border-[#e7d4c1] rounded-lg p-3 text-sm text-[#8b7264]"
                      />
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                      <button 
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="px-10 py-3 bg-[#f38d76] text-white rounded-full font-bold shadow-md hover:bg-[#e67a61] transition-all"
                      >
                        cancelar
                      </button>
                      <button 
                        type="submit"
                        disabled={isSubmittingReview || isUploadingReviewPhoto}
                        className="px-10 py-3 bg-[#f53d1a] text-white rounded-full font-bold shadow-md hover:bg-[#d43214] transition-all disabled:opacity-50"
                      >
                        {isSubmittingReview ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'enviar'}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rating Summary Breakdown */}
        <div className="mb-16 border-t border-stone-100 pt-12">
          <div className="flex flex-col items-center mb-10">
            <div className="flex gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`w-8 h-8 ${star <= Math.round(recipe.rating || 0) ? 'fill-[#f53d1a] text-[#f53d1a]' : 'text-stone-200'}`} 
                />
              ))}
            </div>
            <p className="text-xl font-bold text-[#5c3d2e]">
              {(recipe.rating || 0).toFixed(1)} de 5 ({recipe.reviewsCount || 0} avaliações)
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-3">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = reviews.filter(r => Math.round(r.rating) === star).length;
              const percentage = recipe.reviewsCount ? (count / recipe.reviewsCount) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-4 text-sm font-bold text-[#8b7264]">
                  <span className="w-16 whitespace-nowrap">{star} {star === 1 ? 'estrela' : 'estrelas'}</span>
                  <Star className="w-4 h-4 fill-[#5c3d2e] text-[#5c3d2e]" />
                  <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full bg-[#f53d1a]"
                    />
                  </div>
                  <span className="w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-8">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <motion.div 
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm"
              >
                <div className="flex flex-col md:flex-row gap-8">
                  {/* Left: User Info */}
                  <div className="flex md:flex-col items-center md:items-start gap-4 md:w-48 shrink-0">
                    {review.userPhoto ? (
                      <img src={review.userPhoto} alt={review.userName} className="w-14 h-14 rounded-full object-cover border-2 border-[#f3e5d8]" />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-[#fdf8f4] flex items-center justify-center text-[#5c3d2e] font-bold uppercase border-2 border-[#f3e5d8]">
                        {review.userName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h5 className="font-bold text-[#5c3d2e]">{review.userName}</h5>
                      <span className="text-[10px] text-[#8b7264] font-bold uppercase tracking-widest">
                        {review.createdAt?.toDate?.() ? review.createdAt.toDate().toLocaleDateString('pt-BR') : 'Recente'}
                      </span>
                    </div>
                  </div>

                  {/* Right: Content */}
                  <div className="flex-1 space-y-4">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star 
                          key={star} 
                          className={`w-4 h-4 ${star <= review.rating ? 'fill-[#f4a261] text-[#f4a261]' : 'text-stone-200'}`} 
                        />
                      ))}
                    </div>
                    <p className="text-[#5c3d2e] leading-relaxed text-lg italic">
                      "{review.comment}"
                    </p>
                    {review.image && (
                      <div className="mt-4 rounded-2xl overflow-hidden border border-stone-100 max-w-sm shadow-sm group">
                        <img 
                          src={getAssetUrl(review.image)} 
                          alt="Foto da receita" 
                          className="w-full h-auto hover:scale-105 transition-transform duration-500" 
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}

                    {/* Admin Actions */}
                    {isAdmin && (
                      <div className="flex gap-4 pt-4 border-t border-stone-50">
                        <button 
                          onClick={() => handleStartEditReview(review)}
                          className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                        >
                          <Edit3 className="w-4 h-4" /> Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteReview(review.id!)}
                          className="flex items-center gap-2 text-sm font-bold text-red-600 hover:underline"
                        >
                          <Trash2 className="w-4 h-4" /> Apagar
                        </button>
                      </div>
                    )}

                    {/* Inline Edit Form */}
                    <AnimatePresence>
                      {editingReviewId === review.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-6 p-6 bg-stone-50 rounded-2xl border border-stone-200"
                        >
                          <form onSubmit={handleUpdateReview} className="space-y-4">
                            <div>
                              <p className="text-sm font-bold text-[#5c3d2e] mb-2">Nota:</p>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    type="button"
                                    onClick={() => setEditRating(star)}
                                  >
                                    <Star 
                                      className={`w-6 h-6 ${star <= editRating ? 'fill-[#f4a261] text-[#f4a261]' : 'text-stone-300'}`} 
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>
                            <textarea
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              className="w-full p-4 border border-stone-200 rounded-xl bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20"
                              rows={3}
                            />
                            <div className="flex justify-end gap-3">
                              <button 
                                type="button"
                                onClick={() => setEditingReviewId(null)}
                                className="px-4 py-2 text-sm font-bold text-[#8b7264]"
                              >
                                Cancelar
                              </button>
                              <button 
                                type="submit"
                                disabled={isUpdatingReview}
                                className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-bold disabled:opacity-50"
                              >
                                {isUpdatingReview ? 'Salvando...' : 'Salvar Alterações'}
                              </button>
                            </div>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-[#fdf8f4] rounded-[3rem] border-2 border-dashed border-[#f3e5d8]">
              <Star className="w-16 h-16 text-[#e7d4c1] mx-auto mb-6" />
              <p className="text-xl font-bold text-[#5c3d2e]">Nenhuma avaliação ainda.</p>
              <p className="text-[#8b7264]">Seja o primeiro a compartilhar sua experiência!</p>
            </div>
          )}
        </div>
      </div>
      {/* Hidden Print Template for PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        <div ref={printRef} style={{ width: '200mm', backgroundColor: '#ffffff', color: '#1c1917', padding: '5mm', fontFamily: 'sans-serif' }}>
          {/* Decorative Border */}
          <div style={{ border: '1px solid #e7e5e4', padding: '6mm', position: 'relative' }}>
            
            {/* Header / Brand */}
            <div style={{ textAlign: 'center', marginBottom: '6mm', borderBottom: '1px solid #d6d3d1', paddingBottom: '3mm' }}>
              <div style={{ color: '#914730', fontSize: '18pt', fontWeight: 'bold', marginBottom: '1pt', letterSpacing: '-0.02em' }}>Alquimia do Prato</div>
              <div style={{ color: '#78716c', fontSize: '8pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ficha Técnica de Preparo</div>
            </div>

            {/* Main Title Section */}
            <div style={{ display: 'flex', gap: '6mm', marginBottom: '6mm' }}>
              <div style={{ flex: '0 0 70mm', height: '45mm', borderRadius: '8px', overflow: 'hidden', border: '1px solid #f5f5f4' }}>
                {recipe.image && (
                  <img 
                    src={getAssetUrl(recipe.image)} 
                    alt={recipe.title} 
                    style={{ width: '100%', height: '100%', objectPosition: 'center', objectFit: 'cover' }} 
                    crossOrigin="anonymous" 
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h1 style={{ fontSize: '20pt', fontWeight: 'bold', color: '#1c1917', margin: '0 0 3mm 0', lineHeight: '1.1' }}>{recipe.title}</h1>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2mm' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#914730' }}></div>
                    <span style={{ fontSize: '8pt', color: '#57534e', fontWeight: 'bold' }}>TEMPO: <span style={{ color: '#1c1917' }}>{recipe.time}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#914730' }}></div>
                    <span style={{ fontSize: '8pt', color: '#57534e', fontWeight: 'bold' }}>PORÇÕES: <span style={{ color: '#1c1917' }}>{recipe.servings}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#914730' }}></div>
                    <span style={{ fontSize: '8pt', color: '#57534e', fontWeight: 'bold' }}>DIFICULDADE: <span style={{ color: '#1c1917' }}>{recipe.difficulty}</span></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5mm' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#914730' }}></div>
                    <span style={{ fontSize: '8pt', color: '#57534e', fontWeight: 'bold' }}>AVALIAÇÃO: <span style={{ color: '#1c1917' }}>{recipe.rating} / 5.0</span></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div style={{ backgroundColor: '#fafaf9', padding: '3mm 4mm', borderRadius: '6px', marginBottom: '6mm', borderLeft: '3px solid #914730' }}>
              <p style={{ margin: 0, fontSize: '9pt', color: '#44403c', fontStyle: 'italic', lineHeight: '1.4' }}>
                {recipe.description}
              </p>
            </div>

            {/* Preparation Content */}
            <div style={{ display: 'flex', gap: '8mm' }}>
              {/* Sidebar Ingredients */}
              <div style={{ flex: '0 0 50mm' }}>
                <h3 style={{ fontSize: '10pt', fontWeight: 'bold', color: '#914730', borderBottom: '1.5px solid #914730', paddingBottom: '1.5mm', marginBottom: '3mm', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ingredientes
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4mm' }}>
                  {groupKeys.map(groupName => (
                    <div key={groupName} style={{ marginBottom: hasMultipleGroups ? '3mm' : '0' }}>
                      {hasMultipleGroups && (
                        <div style={{ fontSize: '7.5pt', fontWeight: 'bold', color: '#7c2d12', backgroundColor: '#fff7ed', padding: '1mm 2mm', borderRadius: '3px', marginBottom: '2mm', display: 'inline-block' }}>
                          {groupName.toUpperCase()}
                        </div>
                      )}
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {groupedIngredients[groupName].map((ing, i) => (
                          <li key={i} style={{ paddingBottom: '1mm', borderBottom: '1px solid #f5f5f4', marginBottom: '1mm' }}>
                            {typeof ing === 'object' && ing.quantity && (
                              <div style={{ fontSize: '6.5pt', fontWeight: 'bold', color: '#914730', marginBottom: '0.2pt' }}>{ing.quantity}</div>
                            )}
                            <div style={{ fontSize: '8.5pt', color: '#1c1917', fontWeight: '500' }}>{typeof ing === 'string' ? ing : ing.name}</div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Instructions */}
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '10pt', fontWeight: 'bold', color: '#914730', borderBottom: '1.5px solid #914730', paddingBottom: '1.5mm', marginBottom: '3mm', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Modo de Preparo
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3.5mm' }}>
                  {recipe.instructions.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: '3mm' }}>
                      <div style={{ flex: '0 0 6mm', height: '6mm', backgroundColor: '#914730', color: '#ffffff', borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '8pt' }}>
                        {i + 1}
                      </div>
                      <p style={{ margin: 0, fontSize: '9pt', color: '#1c1917', lineHeight: '1.5', paddingTop: '0.5mm' }}>
                        {step}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Contact */}
            <div style={{ marginTop: '10mm', borderTop: '1px solid #d6d3d1', paddingTop: '3mm', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '7pt', color: '#78716c', fontWeight: 'bold' }}>ALQUIMIA DO PRATO © 1998 - 2026</div>
              <div style={{ fontSize: '7pt', color: '#914730', fontWeight: 'bold' }}>ALQUIMIADOPRATO.APP</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
