import { motion } from 'motion/react';
import { Upload, Plus, Trash2, Loader2, Play, AlertTriangle } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { recipeService, Recipe, Ingredient } from '../infra/services/recipeService';
import { getAssetUrl } from '../lib/assets';
import { userService } from '../infra/services/userService';
import { AnimatePresence } from 'motion/react';
import { UserPlus, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Submit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(isEditing);
  const { user, isAdmin } = useAuth();
  const [imageOptions, setImageOptions] = useState<string[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const [shouldNotifyEmail, setShouldNotifyEmail] = useState(true);

  const [formData, setFormData] = useState<Omit<Recipe, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>>({
    title: '',
    description: '',
    image: '',
    momento: [],
    tipo_prato: [],
    base_alimento: [],
    origem: 'Brasileira',
    custo_estimado: '$$',
    dietType: 'Convencional',
    time: '',
    prepTime: '',
    servings: '',
    difficulty: 'Médio',
    ingredients: [{ name: '', quantity: '', group: '', preparationMode: '', preparationTime: '', grossWeight: '', cleanWeight: '', cookedWeight: '', perCapitaClean: '' }],
    instructions: [''],
    equipment: [],
    isClassic: false,
    chefTips: '',
  });

  const [originalRecipe, setOriginalRecipe] = useState<Recipe | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (user) {
        const profile = await userService.getUserProfile(user.uid);
        setHasProfile(!!profile);
      } else {
        setHasProfile(false);
      }
    };
    checkProfile();

    if (isEditing && user) {
      loadRecipe(id!);
    } else if (!isEditing && location.state?.scrapedData) {
      setShouldNotifyEmail(false); // Desativa notificação por e-mail por padrão para receitas via scrap
      setImageOptions(location.state.scrapedData.imageOptions || []);
      setFormData(prev => ({
        ...prev,
        ...location.state.scrapedData,
        // Ensure ingredients are in the correct format if they came as strings or mismatch
        ingredients: Array.isArray(location.state.scrapedData.ingredients) 
          ? location.state.scrapedData.ingredients.map((ing: any) => {
              if (typeof ing === 'string') return { name: ing, quantity: '', group: '', grossWeight: '', cleanWeight: '', cookedWeight: '', perCapitaClean: '' };
              return { 
                name: ing.name || '', 
                quantity: ing.quantity || '', 
                group: ing.group || '',
                preparationMode: ing.preparationMode || '',
                preparationTime: ing.preparationTime || '',
                grossWeight: ing.grossWeight || '',
                cleanWeight: ing.cleanWeight || '',
                cookedWeight: ing.cookedWeight || '',
                perCapitaClean: ing.perCapitaClean || ''
              };
            })
          : [{ name: '', quantity: '', group: '', grossWeight: '', cleanWeight: '', cookedWeight: '', perCapitaClean: '' }]
      }));
    }
  }, [user, id, isEditing, location.state]);

  const loadRecipe = async (recipeId: string) => {
    setFetching(true);
    try {
      const recipe = await recipeService.getRecipe(recipeId);
      if (recipe) {
        // Double check permissions with current user
        if (user && recipe.ownerId !== user.uid && !isAdmin) {
          alert('Você não tem permissão para editar esta receita.');
          navigate('/explore');
          return;
        }
        setOriginalRecipe(recipe);
        setFormData({
          title: recipe.title,
          description: recipe.description || '',
          image: recipe.image || '',
          momento: recipe.momento || [],
          tipo_prato: recipe.tipo_prato || [],
          base_alimento: recipe.base_alimento || [],
          origem: recipe.origem || 'Brasileira',
          custo_estimado: recipe.custo_estimado || '$$',
          dietType: recipe.dietType || 'Convencional',
          time: recipe.time || '',
          prepTime: recipe.prepTime || '',
          servings: recipe.servings || '',
          difficulty: recipe.difficulty || 'Médio',
          ingredients: recipe.ingredients.map(ing => 
            typeof ing === 'string' ? { name: ing, quantity: '' } : ing
          ),
          instructions: recipe.instructions,
          equipment: recipe.equipment || [],
          isClassic: recipe.isClassic || false,
          chefTips: recipe.chefTips || '',
        });
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
    } finally {
      setFetching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setUploadingImage(true);
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
        setFormData(prev => ({ ...prev, image: data.imageUrl }));
      } else {
        alert('Erro ao carregar imagem: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Falha ao enviar a imagem para o servidor.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string) => {
    const newIngredients = [...formData.ingredients] as Ingredient[];
    newIngredients[index] = { ...newIngredients[index], [field]: value };
    setFormData(prev => ({ ...prev, ingredients: newIngredients }));
  };

  const handleArrayChange = (index: number, value: string, field: 'instructions') => {
    const newArray = [...formData[field]];
    newArray[index] = value;
    setFormData(prev => ({ ...prev, [field]: newArray }));
  };

  const addArrayItem = (field: 'ingredients' | 'instructions') => {
    if (field === 'ingredients') {
      setFormData(prev => ({ ...prev, ingredients: [...prev.ingredients, { name: '', quantity: '', group: '', preparationMode: '', preparationTime: '', grossWeight: '', cleanWeight: '', cookedWeight: '', perCapitaClean: '' }] }));
    } else {
      setFormData(prev => ({ ...prev, instructions: [...prev.instructions, ''] }));
    }
  };

  const removeArrayItem = (index: number, field: 'ingredients' | 'instructions') => {
    if (formData[field].length > 1) {
      const newArray = [...formData[field]];
      newArray.splice(index, 1);
      setFormData(prev => ({ ...prev, [field]: newArray } as any));
    }
  };

  const [errorHeader, setErrorHeader] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorHeader(null);
    if (!user) {
      alert('Por favor, faça login para publicar uma receita.');
      return;
    }

    if (!hasProfile) {
      setShowRegisterPrompt(true);
      return;
    }

    console.log('Iniciando submissão da receita...', { isEditing, id });
    setLoading(true);

    if (formData.momento.length === 0 || formData.tipo_prato.length === 0 || formData.base_alimento.length === 0) {
      console.warn('Validação falhou: Campos obrigatórios vazios');
      const errorMsg = 'Por favor, selecione pelo menos um Momento, uma Técnica e uma Base de Alimento.';
      setErrorHeader(errorMsg);
      alert(errorMsg);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      console.log('Dados do formulário sendo enviados:', formData);
      if (isEditing && id) {
        console.log('Chamando updateRecipe...');
        await recipeService.updateRecipe(id, {
          ...formData,
          ownerId: originalRecipe?.ownerId || user.uid,
        });
        console.log('updateRecipe concluído com sucesso');
        alert('Receita atualizada com sucesso!');
      } else {
        console.log('Chamando createRecipe...');
        const newId = await recipeService.createRecipe({
          ...formData,
          ownerId: user.uid,
        }, { notifyEmail: shouldNotifyEmail });
        console.log('createRecipe concluído com sucesso, novo ID:', newId);
        
        // Gamification: points for publishing a recipe
        try {
          fetch('/api/gamification/event', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
            },
            body: JSON.stringify({
              uid: user.uid,
              eventType: 'RECIPE_PUBLISHED'
            })
          });
        } catch (err) {
          console.error("Gamification error:", err);
        }

        alert('Receita publicada com sucesso!');
      }
      
      console.log('Navegando para /explore');
      navigate('/explore');
    } catch (error: any) {
      console.error('Erro detalhado ao salvar receita:', error);
      
      let message = 'Erro ao salvar a receita. Verifique o console para mais detalhes.';
      if (error?.message) {
        try {
          if (error.message.includes('Firestore operation failed:')) {
             const cleanMsg = error.message.replace('Firestore operation failed: ', '');
             try {
               const parsed = JSON.parse(cleanMsg);
               message = `Erro Firestore (${parsed.operationType}): ${parsed.error}`;
             } catch (e) {
               message = `Erro: ${cleanMsg}`;
             }
          } else {
            message = `Erro: ${error.message}`;
          }
        } catch (e) {
          message = `Erro: ${error.message}`;
        }
      }
      
      setErrorHeader(message);
      alert(message);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
      console.log('Processo de submissão finalizado');
    }
  };

  const toggleCheckbox = (field: 'momento' | 'tipo_prato' | 'base_alimento', value: string) => {
    const current = [...(formData[field] as string[])];
    const index = current.indexOf(value);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(value);
    }
    setFormData(prev => ({ ...prev, [field]: current }));
  };

  const MOMENTOS = ["Café da Manhã", "Brunch", "Almoço", "Lanche / Chá da Tarde", "Jantar", "Ceia", "Entradas", "Básicas", "Petiscos&Food Tricks", "Bebidas"];
  const TIPOS_PRATO = ["Assados", "Frituras", "Grelhados", "Sopas e Caldos", "Cremes e Purés", "Massas e Risotos", "Saladas e Pratos Frios", "Cozidos / Guisados", "Padaria e Pastelaria", "Bebidas", "Doces e Sobremesas"];
  const BASES_ALIMENTO = ["Carnes", "Frutos do Mar", "Vegetais e Legumes", "Ovos e Laticínios", "Grãos e Leguminosas"];
  const ORIGENS = ["Latino-Americana", "Brasileira", "Mexicana", "Argentina", "Asiática", "Japonesa", "Chinesa", "Tailandesa", "Coreana", "Indiana", "Europeia", "Italiana", "Francesa", "Portuguesa", "Espanhola", "Árabe / Médio Oriente", "Americana"];
  const CUSTOS = ["$", "$$", "$$$", "$$$$"];

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-on-surface-variant font-semibold">Carregando dados da receita...</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto px-6 pb-xl"
    >
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold text-on-surface mb-2">
            {isEditing ? 'Editar Receita' : 'Publicar uma Receita'}
          </h1>
          <p className="text-on-surface-variant text-lg">
            {isEditing ? 'Atualize os detalhes da sua criação culinária.' : 'Compartilhe sua herança culinária com nossa comunidade.'}
          </p>
        </div>

        {(isEditing || location.state?.scrapedData) && (
          <div className="flex-shrink-0">
            <button 
              onClick={handleSubmit}
              type="button"
              disabled={loading || !user}
              className="w-full md:w-auto bg-primary disabled:bg-stone-300 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isEditing ? 'Salvar Alterações' : 'Publicar Receita'}
            </button>
          </div>
        )}
      </header>

      {errorHeader && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p className="font-semibold text-sm">{errorHeader}</p>
        </div>
      )}

      {!user && (
        <div className="mb-12 p-6 bg-secondary-container text-on-secondary-container rounded-2xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-secondary">
            <Play className="w-6 h-6 rotate-90 fill-secondary" />
          </div>
          <p className="font-bold text-lg">Você precisa estar logado para publicar receitas.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Taxonomy Axes */}
        <section className="space-y-8">
          <h2 className="text-2xl font-bold text-on-surface border-b border-stone-200 pb-4">Taxonomia e Classificação</h2>
          
          {/* Momento de Consumo */}
          <div className="space-y-4">
            <label className="block font-bold text-on-surface-variant flex items-center gap-2">
              Momento de Consumo <span className="text-primary">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {MOMENTOS.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleCheckbox('momento', m)}
                  className={`px-4 py-2 rounded-full border-2 transition-all font-medium text-sm ${formData.momento.includes(m) ? 'bg-primary border-primary text-white' : 'border-stone-200 text-stone-600 hover:border-primary/50'}`}
                >
                  {m}
                </button>
              ))}
            </div>
            {formData.momento.length === 0 && <p className="text-red-500 text-xs">Selecione pelo menos um momento.</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Categoria e Técnica */}
            <div className="space-y-4">
              <label className="block font-bold text-on-surface-variant">Categoria e Técnica <span className="text-primary">*</span></label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_PRATO.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => toggleCheckbox('tipo_prato', t)}
                    className={`px-3 py-1.5 rounded-lg border-2 transition-all font-medium text-xs ${formData.tipo_prato.includes(t) ? 'bg-secondary border-secondary text-white' : 'border-stone-200 text-stone-600 hover:border-secondary/50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Base de Alimento */}
            <div className="space-y-4">
              <label className="block font-bold text-on-surface-variant">Base de Alimento <span className="text-primary">*</span></label>
              <div className="flex flex-wrap gap-2">
                {BASES_ALIMENTO.map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleCheckbox('base_alimento', b)}
                    className={`px-3 py-1.5 rounded-lg border-2 transition-all font-medium text-xs ${formData.base_alimento.includes(b) ? 'bg-stone-700 border-stone-700 text-white' : 'border-stone-200 text-stone-600 hover:border-stone-500'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Receita Clássica Checkbox */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border-2 border-primary/20">
              <input 
                type="checkbox" 
                id="isClassic"
                name="isClassic"
                checked={formData.isClassic || false}
                onChange={(e) => setFormData(prev => ({ ...prev, isClassic: e.target.checked }))}
                className="w-5 h-5 accent-primary cursor-pointer"
              />
              <label htmlFor="isClassic" className="font-bold text-on-surface cursor-pointer select-none">
                Receita Clássica <span className="text-xs font-normal block text-on-surface-variant">Esta receita possui uma história tradicional por trás dela.</span>
              </label>
            </div>

            {/* Notificação por E-mail Checkbox */}
            <div className="flex items-center gap-3 p-4 bg-orange-50/50 rounded-xl border-2 border-orange-200/50">
              <input 
                type="checkbox" 
                id="shouldNotifyEmail"
                name="shouldNotifyEmail"
                checked={shouldNotifyEmail}
                onChange={(e) => setShouldNotifyEmail(e.target.checked)}
                className="w-5 h-5 accent-orange-500 cursor-pointer"
              />
              <label htmlFor="shouldNotifyEmail" className="font-bold text-on-surface cursor-pointer select-none text-orange-900/80">
                Notificar por E-mail <span className="text-xs font-normal block text-on-surface-variant">Enviar aviso para toda a comunidade sobre esta publicação.</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="block font-semibold text-on-surface-variant">Origem e Cultura</label>
              <select 
                name="origem"
                value={formData.origem}
                onChange={handleInputChange}
                className="w-full p-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none appearance-none"
              >
                {ORIGENS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block font-semibold text-on-surface-variant">Custo Estimado</label>
              <select 
                name="custo_estimado"
                value={formData.custo_estimado}
                onChange={handleInputChange}
                className="w-full p-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none appearance-none"
              >
                {CUSTOS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block font-semibold text-on-surface-variant">Tipo de Dieta</label>
              <select 
                name="dietType"
                value={formData.dietType}
                onChange={handleInputChange}
                className="w-full p-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none appearance-none"
              >
                <option>Convencional</option>
                <option>Vegana</option>
                <option>Vegetariana</option>
                <option>Low Carb</option>
                <option>Keto</option>
                <option>Sem Glúten</option>
                <option>Sem Lactose</option>
                <option>Fit</option>
              </select>
            </div>
          </div>
        </section>

        {/* Basic Info */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-on-surface border-b border-stone-200 pb-4">Detalhes da Receita</h2>
          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="block font-semibold text-on-surface-variant">Título da Receita</label>
              <input 
                type="text" 
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                placeholder="Ex: Torta de Maçã da Vovó" 
                className="w-full p-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none" 
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="block font-semibold text-on-surface-variant">Tempo de Preparação</label>
              <input 
                type="text" 
                name="prepTime"
                value={formData.prepTime}
                onChange={handleInputChange}
                placeholder="Ex: 15 min" 
                className="w-full p-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="block font-semibold text-on-surface-variant">Tempo Total</label>
              <input 
                type="text" 
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                placeholder="Ex: 45 min" 
                className="w-full p-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="block font-semibold text-on-surface-variant">Porções</label>
              <input 
                type="text" 
                name="servings"
                value={formData.servings}
                onChange={handleInputChange}
                placeholder="Ex: 4 pessoas" 
                className="w-full p-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="block font-semibold text-on-surface-variant">Dificuldade</label>
              <select 
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                className="w-full p-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none appearance-none"
              >
                <option>Fácil</option>
                <option>Médio</option>
                <option>Difícil</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="block font-semibold text-on-surface-variant">Pequena Descrição</label>
            <textarea 
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3} 
              placeholder="Conte a história por trás deste prato..." 
              className="w-full p-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none resize-none"
            ></textarea>
          </div>
        </section>

        {/* Media */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-on-surface border-b border-stone-200 pb-4">Imagem da Receita</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block font-semibold text-on-surface-variant">Upload de Arquivo Local</label>
                <div className="relative">
                  <input 
                    type="file" 
                    id="file-upload"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden" 
                  />
                  <label 
                    htmlFor="file-upload"
                    className={`flex items-center justify-center gap-3 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all ${uploadingImage ? 'bg-stone-50 border-stone-300' : 'border-primary/30 hover:border-primary hover:bg-primary/5'}`}
                  >
                    {uploadingImage ? (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    ) : (
                      <Upload className="w-5 h-5 text-primary" />
                    )}
                    <span className="font-bold text-primary">
                      {uploadingImage ? 'Enviando...' : 'Selecionar imagem do dispositivo'}
                    </span>
                  </label>
                </div>
                <p className="text-xs text-on-surface-variant">Arquivos suportados: JPG, PNG, WEBP. Máx 5MB.</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-stone-200"></span>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-on-surface-variant font-bold">OU</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block font-semibold text-on-surface-variant">URL da Imagem (Web)</label>
                <input 
                  type="url" 
                  name="image"
                  value={formData.image}
                  onChange={handleInputChange}
                  placeholder="https://exemplo.com/imagem.jpg" 
                  className="w-full p-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <label className="block font-semibold text-on-surface-variant">Pré-visualização</label>
              {formData.image ? (
                <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-md bg-stone-100 border border-stone-200 group relative">
                  <img src={getAssetUrl(formData.image)} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: '' }))}
                    className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white text-red-500 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="aspect-video w-full rounded-2xl border-4 border-dashed border-stone-200 flex flex-col items-center justify-center bg-surface-container-low text-stone-400">
                  <Upload className="w-12 h-12 mb-4 opacity-20" />
                  <p className="font-semibold">Nenhuma imagem selecionada</p>
                </div>
              )}
            </div>
          </div>

          {imageOptions.length > 0 && (
            <div className="space-y-4 pt-4">
              <label className="block font-semibold text-on-surface-variant">Outras imagens encontradas (Clique para selecionar):</label>
              <div className="flex overflow-x-auto gap-4 pb-2 scrollbar-thin scrollbar-thumb-stone-300">
                {imageOptions.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image: opt }))}
                    className={`flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 transition-all ${formData.image === opt ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-stone-300'}`}
                  >
                    <img src={getAssetUrl(opt)} alt={`Option ${idx}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Ingredients */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <h2 className="text-2xl font-bold text-on-surface">Ingredientes</h2>
            <button 
              type="button" 
              onClick={() => addArrayItem('ingredients')}
              className="text-primary font-bold flex items-center gap-2 hover:bg-primary/10 px-4 py-2 rounded-lg transition-all"
            >
              <Plus className="w-5 h-5" /> Adicionar
            </button>
          </div>
          <div className="space-y-4">
            {(formData.ingredients as Ingredient[]).map((ing, i) => (
              <div key={i} className="flex flex-col bg-surface-container rounded-2xl">
                <div className="flex flex-col md:flex-row gap-4 p-4 relative group items-end md:items-start">
                <div className="flex-1 min-w-[120px] space-y-2 w-full">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Parte / Grupo</label>
                  <input 
                    type="text" 
                    value={ing.group || ''}
                    onChange={(e) => handleIngredientChange(i, 'group', e.target.value)}
                    placeholder="Ex: Massa, Recheio..." 
                    className="w-full p-3 rounded-xl bg-white border border-stone-100 focus:ring-2 focus:ring-primary outline-none text-sm" 
                  />
                </div>
                <div className="flex-1 min-w-[120px] space-y-2 w-full">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Quantidade</label>
                  <input 
                    type="text" 
                    value={ing.quantity}
                    onChange={(e) => handleIngredientChange(i, 'quantity', e.target.value)}
                    placeholder="Ex: 1 xícara..." 
                    className="w-full p-3 rounded-xl bg-white border border-stone-100 focus:ring-2 focus:ring-primary outline-none text-sm" 
                  />
                </div>
                <div className="flex-[2] space-y-2 w-full">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ingrediente</label>
                  <input 
                    type="text" 
                    value={ing.name}
                    onChange={(e) => handleIngredientChange(i, 'name', e.target.value)}
                    placeholder="Ex: Açúcar, Farinha..." 
                    className="w-full p-3 rounded-xl bg-white border border-stone-100 focus:ring-2 focus:ring-primary outline-none text-sm" 
                  />
                </div>
                <div className="flex-1 min-w-[120px] space-y-2 w-full">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Preparo</label>
                  <select
                    value={ing.preparationMode || ''}
                    onChange={(e) => handleIngredientChange(i, 'preparationMode', e.target.value)}
                    className="w-full p-3 rounded-xl bg-white border border-stone-100 focus:ring-2 focus:ring-primary outline-none text-sm appearance-none"
                  >
                    <option value="">Selecione...</option>
                    <option value="Cru">Cru</option>
                    <option value="Cozido">Cozido</option>
                    <option value="Assado">Assado</option>
                    <option value="Frito">Frito</option>
                    <option value="Grelhado">Grelhado</option>
                    <option value="Refogado">Refogado</option>
                    <option value="Picado">Picado</option>
                    <option value="Fatiado">Fatiado</option>
                    <option value="Em cubos">Em cubos</option>
                    <option value="Em rodelas">Em rodelas</option>
                    <option value="Amassado">Amassado</option>
                    <option value="Moído">Moído</option>
                    <option value="Triturado">Triturado</option>
                    <option value="Ralado">Ralado</option>
                    <option value="Descascado">Descascado</option>
                    <option value="Lavado">Lavado</option>
                    <option value="Desfiado">Desfiado</option>
                    <option value="Laminado">Laminado</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[120px] space-y-2 w-full">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tempo (min)</label>
                  <input 
                    type="number"
                    min="0"
                    value={ing.preparationTime || ''}
                    onChange={(e) => handleIngredientChange(i, 'preparationTime', e.target.value)}
                    placeholder="Ex: 15" 
                    className="w-full p-3 rounded-xl bg-white border border-stone-100 focus:ring-2 focus:ring-primary outline-none text-sm" 
                  />
                </div>
              </div>
                <div className="flex flex-col md:flex-row gap-4 p-4 pt-0 relative group items-end md:items-start border-t border-stone-200/50">
                <div className="flex-1 min-w-[120px] space-y-2 w-full">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">PB (g)</label>
                  <input 
                    type="number"
                    min="0"
                    step="0.1"
                    value={ing.grossWeight || ''}
                    onChange={(e) => handleIngredientChange(i, 'grossWeight', e.target.value)}
                    placeholder="Peso Bruto" 
                    className="w-full p-3 rounded-xl bg-white border border-stone-100 focus:ring-2 focus:ring-primary outline-none text-sm" 
                  />
                </div>
                <div className="flex-1 min-w-[120px] space-y-2 w-full">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">PL (g)</label>
                  <input 
                    type="number"
                    min="0"
                    step="0.1"
                    value={ing.cleanWeight || ''}
                    onChange={(e) => handleIngredientChange(i, 'cleanWeight', e.target.value)}
                    placeholder="Peso Líquido" 
                    className="w-full p-3 rounded-xl bg-white border border-stone-100 focus:ring-2 focus:ring-primary outline-none text-sm" 
                  />
                </div>
                <div className="flex-1 min-w-[120px] space-y-2 w-full">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">PC (g)</label>
                  <input 
                    type="number"
                    min="0"
                    step="0.1"
                    value={ing.cookedWeight || ''}
                    onChange={(e) => handleIngredientChange(i, 'cookedWeight', e.target.value)}
                    placeholder="Peso Cozido" 
                    className="w-full p-3 rounded-xl bg-white border border-stone-100 focus:ring-2 focus:ring-primary outline-none text-sm" 
                  />
                </div>
                <div className="flex-1 min-w-[120px] space-y-2 w-full">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Per Capita (g)</label>
                  <input 
                    type="number"
                    min="0"
                    step="0.1"
                    value={ing.perCapitaClean || ''}
                    onChange={(e) => handleIngredientChange(i, 'perCapitaClean', e.target.value)}
                    placeholder="Por pessoa" 
                    className="w-full p-3 rounded-xl bg-white border border-stone-100 focus:ring-2 focus:ring-primary outline-none text-sm" 
                  />
                </div>
                {formData.ingredients.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeArrayItem(i, 'ingredients')}
                    className="p-2 text-stone-400 hover:text-red-500 transition-colors bg-white md:bg-transparent rounded-full shadow-sm md:shadow-none mb-1 ml-auto"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            ))}
          </div>
        </section>

        {/* Instructions */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <h2 className="text-2xl font-bold text-on-surface">Modo de Preparo</h2>
            <button 
              type="button" 
              onClick={() => addArrayItem('instructions')}
              className="text-primary font-bold flex items-center gap-2 hover:bg-primary/10 px-4 py-2 rounded-lg transition-all"
            >
              <Plus className="w-5 h-5" /> Adicionar Passo
            </button>
          </div>
          <div className="space-y-4">
            {formData.instructions.map((step, i) => (
              <div key={i} className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0 font-bold text-stone-400 mt-2">
                  {i + 1}
                </div>
                <textarea 
                  value={step}
                  onChange={(e) => handleArrayChange(i, e.target.value, 'instructions')}
                  placeholder={`Instrução ${i + 1}`} 
                  rows={2}
                  className="flex-1 p-4 rounded-xl bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none resize-none" 
                />
                {formData.instructions.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeArrayItem(i, 'instructions')}
                    className="p-4 text-stone-400 hover:text-red-500 transition-colors mt-2"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Equipment */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <h2 className="text-2xl font-bold text-on-surface">Utensílios e Equipamentos</h2>
            <button 
              type="button" 
              onClick={() => setFormData(prev => ({ ...prev, equipment: [...(prev.equipment || []), ''] }))}
              className="text-primary font-bold flex items-center gap-2 hover:bg-primary/10 px-4 py-2 rounded-lg transition-all"
            >
              <Plus className="w-5 h-5" /> Adicionar
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {(formData.equipment || []).map((item, i) => (
              <div key={i} className="flex items-center gap-2 bg-surface-container rounded-xl px-1 pr-1 group">
                <input 
                  type="text" 
                  value={item}
                  onChange={(e) => {
                    const newEquip = [...(formData.equipment || [])];
                    newEquip[i] = e.target.value;
                    setFormData(prev => ({ ...prev, equipment: newEquip }));
                  }}
                  placeholder="Ex: Frigideira antiaderente" 
                  className="p-3 bg-transparent border-none focus:ring-0 outline-none text-sm min-w-[200px]" 
                />
                <button 
                  type="button" 
                  onClick={() => {
                    const newEquip = [...(formData.equipment || [])];
                    newEquip.splice(i, 1);
                    setFormData(prev => ({ ...prev, equipment: newEquip }));
                  }}
                  className="p-2 text-stone-400 hover:text-red-500 transition-colors rounded-full"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {(!formData.equipment || formData.equipment.length === 0) && (
              <p className="text-sm text-on-surface-variant italic py-2">Nenhum utensílio adicionado. Clique em "Adicionar" para listar os equipamentos necessários.</p>
            )}
          </div>
        </section>

        {/* Chef Tips */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 pb-4">
            <h2 className="text-2xl font-bold text-on-surface">Dicas do Chef</h2>
          </div>
          <div className="space-y-4">
            <textarea 
              name="chefTips"
              value={formData.chefTips}
              onChange={handleInputChange}
              placeholder="Dê seus segredos de preparo, variações ou conselhos técnicos..." 
              rows={4}
              className="w-full p-6 rounded-[2rem] bg-surface-container border-none focus:ring-2 focus:ring-primary outline-none resize-none italic text-stone-700 min-h-[120px]" 
            />
            <p className="text-xs text-on-surface-variant flex items-center gap-2">
              <Plus className="w-3 h-3" /> Use este espaço para o "pulo do gato" que faz sua receita ser única.
            </p>
          </div>
        </section>

        <div className="pt-8">
          <button 
            type="submit" 
            disabled={loading || !user}
            className="w-full bg-primary disabled:bg-stone-300 text-white font-bold text-xl py-6 rounded-2xl shadow-xl hover:bg-primary-container transition-all active:scale-[0.98] flex items-center justify-center gap-4"
          >
            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : null}
            {isEditing ? 'Salvar Alterações' : 'Publicar Receita'}
          </button>
        </div>
      </form>

      {/* Registration Prompt Modal */}
      <AnimatePresence>
        {showRegisterPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRegisterPrompt(false)}
              className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-stone-100 overflow-hidden"
            >
              <div className="absolute top-6 right-6">
                <button 
                  onClick={() => setShowRegisterPrompt(false)}
                  className="p-2 text-stone-400 hover:text-stone-900 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                  <UserPlus className="w-10 h-10 text-primary" />
                </div>
                
                <h2 className="text-3xl font-bold text-stone-900 mb-4 tracking-tight">Quase lá, Alquimista!</h2>
                <p className="text-stone-500 text-lg mb-8 leading-relaxed">
                  Para publicar suas criações e construir sua herança culinária, precisamos completar seu perfil de colaborador.
                </p>

                <div className="space-y-4 mb-10">
                  <div className="flex items-start gap-4 text-left bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    <CheckCircle2 className="w-6 h-6 text-secondary shrink-0" />
                    <div>
                      <div className="font-bold text-stone-900">Perfil Público</div>
                      <div className="text-sm text-stone-500">Seu nome aparecerá como autor das receitas.</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 text-left bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    <CheckCircle2 className="w-6 h-6 text-secondary shrink-0" />
                    <div>
                      <div className="font-bold text-stone-900">Gestão de Conteúdo</div>
                      <div className="text-sm text-stone-500">Acompanhe suas receitas publicadas e interações.</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => navigate('/register-collaborator')}
                    className="w-full bg-primary hover:bg-primary-container text-white font-bold py-5 rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-3 text-lg"
                  >
                    Iniciar Cadastro <Plus className="w-5 h-5 text-white" />
                  </button>
                  <button 
                    onClick={() => setShowRegisterPrompt(false)}
                    className="w-full bg-transparent hover:bg-stone-50 text-stone-400 font-bold py-4 rounded-2xl transition-all"
                  >
                    Talvez mais tarde
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
