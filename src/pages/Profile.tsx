import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Shield, 
  Camera, 
  CheckCircle2, 
  ArrowLeft,
  Save,
  Loader2,
  X,
  Trophy,
  Star,
  Award,
  Utensils,
  Lock,
  ChefHat,
  BookOpen,
  Flame,
  Leaf,
  MessageCircle,
  Users,
  Crown,
  Search,
  Sparkles,
  Target,
  PlusCircle,
  MinusCircle,
  Copy,
  Check
} from 'lucide-react';
import { userService, UserProfile } from '../infra/services/userService';
import { MemberService } from '../infra/services/MemberService';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { supabase } from '../lib/supabase';
import { AvatarSelector, AvatarOptionData } from '../components/AvatarSelector';
import { LevelUpPopup } from '../components/LevelUpPopup';

const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' },
];

const EXPERIENCIA_OPTIONS = [
  { value: 'Iniciante', label: 'Iniciante: Sei o básico para sobrevivência (ovos, arroz, massas simples).' },
  { value: 'Intermediário', label: 'Intermediário: Sigo receitas com facilidade e arrisco algumas criações.' },
  { value: 'Avançado', label: 'Avançado: Tenho ótima técnica, domino cortes e cozinho intuitivamente.' },
  { value: 'Profissional', label: 'Profissional: Atuo ou tenho formação na área gastronômica.' }
];

const FREQUENCIA_OPTIONS = [
  'Diariamente',
  'Algumas vezes por semana',
  'Apenas nos fins de semana / Ocasiões especiais',
  'Raramente / Nunca'
];

const PREFERENCIAS_OPTIONS = [
  'Italiana (Massas, pizzas)',
  'Japonesa / Asiática (Sushi, lamen, wok)',
  'Árabe / Do Oriente Médio',
  'Francesa (Clássica, molhos, alta gastronomia)',
  'Contemporânea / Fusão',
  'Comida de Boteco / Petiscos',
  'Churrasco e Grelhados',
  'Confeitaria e Panificação'
];

const RESTRICOES_OPTIONS = [
  'Nenhuma (Como de tudo)',
  'Vegetariana',
  'Vegana',
  'Restrição a Glúten (Celíaco / Intolerante)',
  'Intolerância a Lactose',
  'Dieta Low Carb'
];

const NUTRICAO_OPTIONS = [
  'Alto: Busco receitas com contagem de macros/calorias e foco em performance/saúde.',
  'Moderado: Prefiro opções equilibradas e saudáveis, mas sem rigidez.',
  'Baixo: Foco apenas no sabor e na experiência, sem preocupação nutricional imediata.',
  'Foco em Alimentos Funcionais (Imunidade, digestão, etc.)',
  'Foco em Ingredientes Orgânicos / Naturais'
];

const CULTURA_OPTIONS = [
  'História da Gastronomia: Origem dos pratos, evolução dos ingredientes e técnicas ancestrais.',
  'Turismo Gastronômico: Roteiros de viagem focados em experiências culinárias locais.',
  'Processos Artesanais: Produção de queijos, vinhos, cervejas, embutidos e fermentação natural.',
  'Antropologia Alimentar: Como a comida conecta comunidades e molda sociedades.',
  'Sustentabilidade: Cadeia de suprimentos integrada, desperdício zero e pequenos produtores.'
];

const MOCK_LEVELS = [
  {
    id: 1,
    title: 'Aprendiz',
    avatar: 'https://placehold.co/400x400/e7e5e4/a8a29e?text=Aprendiz',
    badges: [
      { id: 'b1', name: 'Primeiros Passos', icon: <Utensils className="w-5 h-5" />, xp: '160XP', bgColor: 'bg-stone-200', textColor: 'text-stone-600' },
      { id: 'b2', name: 'Explorador', icon: <Search className="w-5 h-5" />, xp: '220XP', bgColor: 'bg-stone-300', textColor: 'text-stone-700' },
    ]
  },
  {
    id: 2,
    title: 'Assistente',
    avatar: 'https://placehold.co/400x400/d6d3d1/78716c?text=Assistente',
    badges: [
      { id: 'b3', name: 'Mão na Massa', icon: <ChefHat className="w-5 h-5" />, xp: '340XP', bgColor: 'bg-emerald-100', textColor: 'text-emerald-600' },
      { id: 'b4', name: 'Receita Certa', icon: <BookOpen className="w-5 h-5" />, xp: '410XP', bgColor: 'bg-emerald-200', textColor: 'text-emerald-700' },
    ]
  },
  {
    id: 3,
    title: 'Alquimista',
    avatar: 'https://placehold.co/400x400/a8a29e/57534e?text=Alquimista',
    badges: [
      { id: 'b5', name: 'Transmutação', icon: <Flame className="w-5 h-5" />, xp: '600XP', bgColor: 'bg-amber-100', textColor: 'text-amber-600' },
      { id: 'b6', name: 'Mestre dos Temperos', icon: <Leaf className="w-5 h-5" />, xp: '850XP', bgColor: 'bg-amber-200', textColor: 'text-amber-700' },
    ]
  },
  {
    id: 4,
    title: 'Perito',
    avatar: 'https://placehold.co/400x400/78716c/44403c?text=Perito',
    badges: [
      { id: 'b7', name: 'Inovador', icon: <Sparkles className="w-5 h-5" />, xp: '1200XP', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
      { id: 'b8', name: 'Crítico Culinário', icon: <MessageCircle className="w-5 h-5" />, xp: '950XP', bgColor: 'bg-blue-200', textColor: 'text-blue-700' },
      { id: 'b9', name: 'Engajador', icon: <Users className="w-5 h-5" />, xp: '1100XP', bgColor: 'bg-blue-300', textColor: 'text-blue-800' },
    ]
  },
  {
    id: 5,
    title: 'Mestre Alquimista',
    avatar: 'https://placehold.co/400x400/57534e/292524?text=Mestre',
    badges: [
      { id: 'b10', name: 'Mestre Fundador', icon: <Trophy className="w-5 h-5" />, xp: '2500XP', bgColor: 'bg-purple-100', textColor: 'text-purple-600' },
      { id: 'b11', name: 'Guardião do Lounge', icon: <Shield className="w-5 h-5" />, xp: '3100XP', bgColor: 'bg-purple-200', textColor: 'text-purple-700' },
      { id: 'b12', name: 'Criador Supremo', icon: <Crown className="w-5 h-5" />, xp: '5000XP', bgColor: 'bg-purple-300', textColor: 'text-purple-800' },
    ]
  }
];

export default function Profile() {
  const { uid: paramUid } = useParams<{ uid: string }>();
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const targetUid = paramUid || user?.uid;
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [gamification, setGamification] = useState<any>(null);
  const [avatarsList, setAvatarsList] = useState<AvatarOptionData[]>([]);
  const [activeAvatarSelector, setActiveAvatarSelector] = useState<'profile' | number | null>(null);
  const [certAvatars, setCertAvatars] = useState<Record<number, string>>(() => {
    const saved = localStorage.getItem(`cert_avatars_${targetUid}`);
    return saved ? JSON.parse(saved) : {};
  });
  const [showLevelUpPopup, setShowLevelUpPopup] = useState(false);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(0);
  const [showInteractionsPopup, setShowInteractionsPopup] = useState(false);
  const [userInteractions, setUserInteractions] = useState<Record<string, number>>({});
  const [selectedLevelForTips, setSelectedLevelForTips] = useState<number | null>(null);
  const [showTipsPopup, setShowTipsPopup] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);
  const [friendPhone, setFriendPhone] = useState('');
  const [copied, setCopied] = useState(false);
  const baseUrl = (import.meta.env.VITE_APP_URL as string) || window.location.origin;

  const INTERACTION_MATRIX = [
    { id: 'COLLABORATION_MESSAGE', label: 'Mensagens no Lounge', required: 50 },
    { id: 'PROFILE_PARTIAL', label: 'Cadastro Parcial', required: 1 },
    { id: 'PROFILE_COMPLETE', label: 'Cadastro Completo', required: 1 },
    { id: 'PROFILE_QUIZ', label: 'Quiz de Preferências', required: 1 },
    { id: 'ARTICLE_PUBLISHED', label: 'Artigos Publicados', required: 5 },
    { id: 'RECIPE_PUBLISHED', label: 'Receitas Publicadas (c/ Foto)', required: 10 },
    { id: 'RECIPE_UPVOTE_RECEIVED', label: 'Avaliações Positivas Recebidas', required: 20 },
    { id: 'REVIEW_WITH_PHOTO', label: 'Avaliações Feitas (c/ Foto)', required: 15 },
    { id: 'PRODUCT_PURCHASED', label: 'Produtos Comprados', required: 3 }
  ];

  const getRelativeCountForLevel = (eventType: string, absoluteCount: number, levelId: number) => {
    const matrixItem = INTERACTION_MATRIX.find(item => item.id === eventType);
    if (!matrixItem) return 0;
    const baseReq = matrixItem.required;

    let remaining = absoluteCount;
    for (let lvl = 1; lvl < levelId; lvl++) {
      const targetForLvl = baseReq * lvl;
      if (remaining >= targetForLvl) {
        remaining -= targetForLvl;
      } else {
        return 0;
      }
    }
    return remaining;
  };

  const getTipsForInteraction = (id: string) => {
    switch (id) {
      case 'COLLABORATION_MESSAGE':
        return {
          title: 'Mensagens no Lounge',
          tip: 'Envie mensagens e tire dúvidas de culinária no Lounge. O Chef IA (@Alchemist) e outros membros estão sempre online!',
          action: 'Ir para o Lounge'
        };
      case 'PROFILE_PARTIAL':
        return {
          title: 'Cadastro Parcial',
          tip: 'Preencha suas informações básicas (Nome, Estado, WhatsApp) nas configurações de Perfil.',
          action: 'Editar Perfil'
        };
      case 'PROFILE_COMPLETE':
        return {
          title: 'Cadastro Completo',
          tip: 'Complete 100% do seu perfil, preenchendo todos os campos adicionais de endereço e preferências culinárias.',
          action: 'Editar Perfil'
        };
      case 'PROFILE_QUIZ':
        return {
          title: 'Quiz de Preferências',
          tip: 'Responda ao Quiz de preferências de culinária na aba de preferências para alinhar as recomendações do Chef IA.',
          action: 'Responder Quiz'
        };
      case 'ARTICLE_PUBLISHED':
        return {
          title: 'Artigos Publicados',
          tip: 'Publique artigos técnicos, guias gastronômicos ou PDFs de receitas e história da culinária no acervo compartilhado.',
          action: 'Acessar Acervo'
        };
      case 'RECIPE_PUBLISHED':
        return {
          title: 'Receitas Publicadas (c/ Foto)',
          tip: 'Publique suas próprias receitas deliciosas contendo fotos atrativas no acervo de receitas.',
          action: 'Publicar Receita'
        };
      case 'RECIPE_UPVOTE_RECEIVED':
        return {
          title: 'Avaliações Positivas Recebidas',
          tip: 'Compartilhe suas melhores receitas no acervo e incentive outros alquimistas a deixarem avaliações positivas!',
          action: 'Ver Minhas Receitas'
        };
      case 'REVIEW_WITH_PHOTO':
        return {
          title: 'Avaliações Feitas (c/ Foto)',
          tip: 'Avalie receitas enviadas por outros membros do Alquimia do Prato, adicionando uma foto do prato que você preparou.',
          action: 'Explorar Receitas'
        };
      case 'PRODUCT_PURCHASED':
        return {
          title: 'Produtos Comprados',
          tip: 'Visite nossa loja parceira ou selecione ingredientes especiais para compra na plataforma e amplie seu estoque culinário.',
          action: 'Visitar Loja'
        };
      default:
        return {
          title: 'Interação Culinária',
          tip: 'Execute ações na plataforma para acumular pontos de alquimista e desbloquear novos selos de maestria.',
          action: 'Explorar'
        };
    }
  };
  
  const [formData, setFormData] = useState({
    displayName: '',
    whatsapp: '',
    birthDate: '',
    zipcode: '',
    address: '',
    addressNumber: '',
    addressComplement: '',
    neighborhood: '',
    city: '',
    state: '',
    country: 'Brasil',
    photoURL: '',
    cookingExperienceLevel: '',
    cookingFrequency: '',
    gastronomicPreferences: [] as string[],
    dietaryRestrictions: [] as string[],
    nutritionalFocus: '' as string,
    culturalInterests: [] as string[],
    role: 'member' as UserProfile['role']
  });

  const canEdit = user?.uid === targetUid || isAdmin;

  useEffect(() => {
    if (targetUid) {
      fetchProfile();
      fetchAvatars();
      fetchInteractions();
    }
  }, [targetUid]);

  useEffect(() => {
    if (targetUid) {
      localStorage.setItem(`cert_avatars_${targetUid}`, JSON.stringify(certAvatars));
    }
  }, [certAvatars, targetUid]);

  const fetchAvatars = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: any = {
        'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/avatars/${targetUid}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAvatarsList(data.avatars);
        }
      }
    } catch (err) {
      console.error('Error fetching avatars:', err);
    }
  };

  const fetchInteractions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: any = {
        'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/gamification/interactions/${targetUid}`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.interactions) {
          const mapping: Record<string, number> = {};
          data.interactions.forEach((i: any) => {
            mapping[i.eventType] = i.count;
          });
          setUserInteractions(mapping);
        }
      }
    } catch (err) {
      console.error('Error fetching interactions:', err);
    }
  };

  const handleUpdateInteraction = async (eventType: string, increment: number) => {
    if (!canEdit) return;
    
    const currentCount = userInteractions[eventType] || 0;
    const newCount = Math.max(0, currentCount + increment);

    // Optimistic UI update
    setUserInteractions(prev => ({ ...prev, [eventType]: newCount }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const headers: any = {
        'Content-Type': 'application/json',
        'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/gamification/interactions/${targetUid}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ eventType, count: newCount })
      });
      
      if (!res.ok) {
        // Revert on failure
        setUserInteractions(prev => ({ ...prev, [eventType]: currentCount }));
        console.error("Failed to update interaction on server");
      }
    } catch (err) {
      console.error("Error updating interaction:", err);
      setUserInteractions(prev => ({ ...prev, [eventType]: currentCount }));
    }
  };

  const fetchProfile = async () => {
    try {
      let data = await userService.getUserProfile(targetUid!);
      
      // Fallback: se não achar no Firestore (banco antigo), mas for o usuário logado (novo Supabase)
      if (!data && targetUid === user?.uid) {
        data = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || 'Alquimista',
          photoURL: user.photoURL || '',
          state: '',
          country: '',
          role: 'member'
        };
      }

      if (data) {
        setProfile(data);
        setFormData({
          displayName: data.displayName || '',
          whatsapp: data.whatsapp || '',
          birthDate: data.birthDate || '',
          zipcode: data.zipcode || '',
          address: data.address || '',
          addressNumber: data.addressNumber || '',
          addressComplement: data.addressComplement || '',
          neighborhood: data.neighborhood || '',
          city: data.city || '',
          state: data.state || '',
          country: data.country || 'Brasil',
          photoURL: data.photoURL || '',
          cookingExperienceLevel: data.cookingExperienceLevel || '',
          cookingFrequency: data.cookingFrequency || '',
          gastronomicPreferences: data.gastronomicPreferences || [],
          dietaryRestrictions: data.dietaryRestrictions || [],
          nutritionalFocus: data.nutritionalFocus || '',
          culturalInterests: data.culturalInterests || [],
          role: data.role || 'member'
        });
      }

      // Buscar perfil de Gamificação no Postgres (Prisma)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const headers: any = {
          'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const gRes = await fetch(`/api/gamification/profile/${targetUid}`, { headers });
        if (gRes.ok) {
          const gData = await gRes.json();
          if (gData.success) {
            setGamification(gData.profile);
            
            if (user?.uid === targetUid) {
              const storedLevelStr = localStorage.getItem(`gamification_level_${user.uid}`);
              const storedLevel = storedLevelStr ? parseInt(storedLevelStr, 10) : gData.profile.level;
              
              if (gData.profile.level > storedLevel) {
                setUnlockedLevel(gData.profile.level);
                setShowLevelUpPopup(true);
              }
              
              if (!storedLevelStr) {
                localStorage.setItem(`gamification_level_${user.uid}`, gData.profile.level.toString());
              }
            }
          }
        }
      } catch (gErr) {
        console.error('Gamification fetch error:', gErr);
      }

    } catch (err) {
      setError('Falha ao carregar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseLevelUpPopup = () => {
    setShowLevelUpPopup(false);
    if (user?.uid && gamification) {
      localStorage.setItem(`gamification_level_${user.uid}`, gamification.level.toString());
    }
  };

  const handleChooseNewAvatar = () => {
    setActiveAvatarSelector('profile');
  };


  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUid) return;

    setSaving(true);
    setError(null);

    try {
      // Se a role mudou e quem edita é Admin, usamos o MemberService para sincronizar claims
      if (isAdmin && formData.role !== profile.role) {
        await MemberService.updateMemberRole(targetUid, formData.role);
      }
      
      // Atualiza o restante do perfil
      await userService.updateUserProfile(targetUid, formData);

      // Se o usuário estiver editando o próprio perfil, atualiza os dados centralizados no Supabase (AuthContext)
      if (user?.uid === targetUid) {
        await supabase.auth.updateUser({
          data: {
            avatar_url: formData.photoURL,
            full_name: formData.displayName
          }
        });
      }
      
      // Trigger gamificação do perfil
      const hadCompleteBadgeBefore = (userInteractions['PROFILE_COMPLETE'] || 0) > 0;
      
      const isBasicComplete = !!(
        formData.displayName && 
        formData.whatsapp && 
        formData.city && 
        formData.state && 
        formData.photoURL
      );

      const isFullComplete = !!(
        isBasicComplete &&
        formData.birthDate &&
        formData.address &&
        formData.cookingExperienceLevel &&
        formData.cookingFrequency &&
        formData.gastronomicPreferences.length > 0 &&
        formData.nutritionalFocus
      );

      let profileEvent = '';
      if (isFullComplete) {
        profileEvent = 'PROFILE_COMPLETE';
      } else if (isBasicComplete) {
        profileEvent = 'PROFILE_PARTIAL';
      }

      try {
        if (profileEvent) {
          await fetch('/api/gamification/event', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-KEY': (import.meta.env.VITE_APP_API_KEY as string) || ''
            },
            body: JSON.stringify({
              uid: targetUid,
              eventType: profileEvent
            })
          });
          await fetchInteractions();
          
          if (profileEvent === 'PROFILE_COMPLETE' && !hadCompleteBadgeBefore) {
            setShowCelebrationModal(true);
            const duration = 15 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000, colors: ['#10b981', '#fbbf24', '#f59e0b', '#3b82f6', '#ec4899'] };

            const interval: any = setInterval(function() {
              const timeLeft = animationEnd - Date.now();

              if (timeLeft <= 0) {
                return clearInterval(interval);
              }

              const particleCount = 50 * (timeLeft / duration);
              confetti({
                ...defaults, particleCount,
                origin: { x: Math.random() * 0.5, y: Math.random() * 0.5 }
              });
              confetti({
                ...defaults, particleCount,
                origin: { x: Math.random() * 0.5 + 0.5, y: Math.random() * 0.5 }
              });
            }, 250);
          }
        }
      } catch (gamiErr) {
        console.error("Erro ao registrar evento de gamificação de perfil:", gamiErr);
      }
      
      setProfile(prev => prev ? { ...prev, ...formData } : null);
      setIsEditing(false);
    } catch (err) {
      setError('Falha ao salvar alterações.');
    } finally {
      setSaving(false);
    }
  };

  const fetchAddressFromCep = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            address: data.logradouro || prev.address,
            neighborhood: data.bairro || prev.neighborhood,
            city: data.localidade || prev.city,
            state: data.uf || prev.state
          }));
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-24 text-center">
        <User className="w-16 h-16 text-on-surface-variant/20 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-on-surface mb-4">Perfil não encontrado</h1>
        <button onClick={() => navigate(-1)} className="text-primary font-bold">Voltar</button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 pt-6 sm:pt-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative"
      >
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-bold uppercase tracking-widest text-xs mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="bg-surface-container-lowest rounded-3xl sm:rounded-[3rem] shadow-2xl border border-surface-container-high overflow-hidden">
          {/* Header Banner - Premium Design */}
          <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-on-surface">
            {/* Cover Gradient & Texture */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-secondary/80 mix-blend-multiply" />
            <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/food.png')]" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface-container-lowest to-transparent" />
          </div>

          <div className="px-4 sm:px-12 pb-8 sm:pb-12 relative -mt-16 sm:-mt-24">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start sm:items-end">
              {/* Avatar Container */}
              <div className="relative group shrink-0">
                <div className="w-32 h-32 sm:w-44 sm:h-44 rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden border-8 border-surface-container-lowest bg-surface-container-lowest shadow-2xl relative transition-transform duration-300 hover:scale-105">
                  <Avatar 
                    src={formData.photoURL} 
                    alt={profile.displayName} 
                    size="xl"
                    className="w-full h-full object-cover"
                  />
                  {isEditing && (
                    <button 
                      type="button" 
                      onClick={() => setActiveAvatarSelector('profile')}
                      className="absolute inset-0 bg-on-surface/50 backdrop-blur-md flex flex-col items-center justify-center text-background cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity duration-300 border-none outline-none"
                    >
                      <Camera className="w-8 h-8 mb-2 drop-shadow-md" />
                      <span className="text-[10px] font-black uppercase tracking-widest drop-shadow-md">Alterar Avatar</span>
                    </button>
                  )}
                </div>
                {profile.role === 'admin' && (
                  <div className="absolute -top-2 -right-2 bg-primary text-white p-2 sm:p-2.5 rounded-2xl shadow-xl border-4 border-surface-container-lowest">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                )}
              </div>

              <AnimatePresence>
                {activeAvatarSelector !== null && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
                    onClick={() => setActiveAvatarSelector(null)}
                  >
                    <motion.div 
                      onClick={e => e.stopPropagation()}
                      initial={{ scale: 0.95 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.95 }}
                      className="w-full max-w-4xl"
                    >
                      <AvatarSelector 
                        avatares={activeAvatarSelector === 'profile' ? avatarsList : avatarsList.filter(a => a.tierMinimo === activeAvatarSelector.toString() || a.codigo.toUpperCase().includes(`TIER${activeAvatarSelector}`))}
                        avatarAtualUrl={activeAvatarSelector === 'profile' ? formData.photoURL : (certAvatars[activeAvatarSelector] || '')}
                        onSelect={(url) => {
                          if (activeAvatarSelector === 'profile') {
                            setFormData(prev => ({ ...prev, photoURL: url }));
                          } else if (typeof activeAvatarSelector === 'number') {
                            setCertAvatars(prev => ({ ...prev, [activeAvatarSelector]: url }));
                          }
                          setActiveAvatarSelector(null);
                        }}
                        onClose={() => setActiveAvatarSelector(null)}
                      />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* User Info Container */}
              <div className="flex-1 pb-0 sm:pb-4">
                <h1 className="text-3xl sm:text-5xl font-black text-on-surface tracking-tight leading-none mb-3 sm:mb-4">
                  {profile.displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className={`
                    px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-sm
                    ${profile.role === 'admin' ? 'bg-on-surface text-background' : 
                      profile.role === 'chef' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      profile.role === 'collaborator' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-surface-container-high text-on-surface-variant'}
                  `}>
                    {profile.role === 'admin' ? 'Admin' : 
                     profile.role === 'chef' ? 'Chef Culinário' : 
                     profile.role === 'collaborator' ? 'Colaborador' : 'Membro'}
                  </span>
                  
                  <span className="text-on-surface-variant text-xs sm:text-sm font-semibold flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-xl border border-surface-container">
                    <Mail className="w-4 h-4" /> {profile.email}
                  </span>
                  
                  {profile.internalEmail && (
                    <span className="text-secondary text-xs sm:text-sm font-bold flex items-center gap-1.5 bg-secondary/10 px-3 py-1.5 rounded-xl border border-secondary/20">
                      <Shield className="w-4 h-4" /> {profile.internalEmail}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-12 pb-12">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-8 sm:mb-12">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-on-surface mb-1 sm:mb-2">Informações do Perfil</h2>
                <p className="text-sm text-on-surface-variant">Detalhes da sua identidade na Alquimia do Prato.</p>
              </div>
              <div className="flex w-full md:w-auto gap-2.5">
                <button 
                  onClick={() => setShowInteractionsPopup(true)}
                  className="flex-1 md:flex-initial px-4 py-2.5 sm:px-6 sm:py-3 bg-primary-container text-on-primary-container rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold hover:bg-primary/20 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                  title="Matriz de Gamificação"
                >
                  <Target className="w-4 h-4 sm:w-5 sm:h-5" />
                  Progresso
                </button>
                {canEdit && !isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex-1 md:flex-initial px-4 py-2.5 sm:px-8 sm:py-3 bg-on-surface text-background rounded-xl sm:rounded-2xl text-sm sm:text-base font-bold hover:bg-on-surface-variant transition-all shadow-lg active:scale-95 whitespace-nowrap text-center"
                  >
                    Editar Perfil
                  </button>
                )}
              </div>
            </div>

            {error && (
              <div className="mb-8 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-sm italic">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">Nome de Exibição</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
                    <input 
                      type="text"
                      disabled={!isEditing}
                      value={formData.displayName}
                      onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                      className="w-full pl-12 pr-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">WhatsApp</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
                      <input 
                        type="text"
                        disabled={!isEditing}
                        value={formData.whatsapp}
                        placeholder="(XX) XXXXX-XXXX"
                        onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                        className="w-full pl-12 pr-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">Data de Nascimento</label>
                    <div className="relative">
                      <input 
                        type="date"
                        disabled={!isEditing}
                        value={formData.birthDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, birthDate: e.target.value }))}
                        className="w-full px-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">Endereço Completo</label>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
                        <input 
                          type="text"
                          placeholder="CEP (XXXXX-XXX)"
                          disabled={!isEditing}
                          value={formData.zipcode}
                          onChange={(e) => {
                            let val = e.target.value.replace(/\D/g, '');
                            if (val.length > 8) val = val.slice(0, 8);
                            if (val.length > 5) val = val.slice(0, 5) + '-' + val.slice(5);
                            setFormData(prev => ({ ...prev, zipcode: val }));
                            
                            if (val.replace(/\D/g, '').length === 8) {
                              fetchAddressFromCep(val);
                            }
                          }}
                          className="w-full pl-12 pr-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70 text-on-surface"
                        />
                      </div>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="Logradouro (Rua/Avenida)"
                          disabled={!isEditing}
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full px-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70 text-on-surface"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="Número"
                          disabled={!isEditing}
                          value={formData.addressNumber}
                          onChange={(e) => setFormData(prev => ({ ...prev, addressNumber: e.target.value }))}
                          className="w-full px-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70 text-on-surface"
                        />
                      </div>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="Complemento"
                          disabled={!isEditing}
                          value={formData.addressComplement}
                          onChange={(e) => setFormData(prev => ({ ...prev, addressComplement: e.target.value }))}
                          className="w-full px-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70 text-on-surface"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="Bairro"
                          disabled={!isEditing}
                          value={formData.neighborhood}
                          onChange={(e) => setFormData(prev => ({ ...prev, neighborhood: e.target.value }))}
                          className="w-full px-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70 text-on-surface"
                        />
                      </div>
                      <div className="relative">
                        <input 
                          type="text"
                          placeholder="Cidade"
                          disabled={!isEditing}
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full px-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70 text-on-surface"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="relative">
                        <select 
                          disabled={!isEditing}
                          value={formData.state}
                          onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full px-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all disabled:opacity-70 appearance-none text-on-surface"
                        >
                          <option value="" disabled>Selecione um Estado</option>
                          {BRAZILIAN_STATES.map(state => (
                            <option key={state.value} value={state.value}>{state.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="relative">
                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant/40" />
                        <input 
                          type="text"
                          placeholder="País"
                          disabled={true}
                          value="Brasil"
                          className="w-full pl-12 pr-4 py-4 bg-background border border-surface-container-high rounded-2xl focus:ring-4 focus:ring-primary/10 outline-none transition-all opacity-70 cursor-not-allowed text-on-surface"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-6">
                  <div className="p-6 bg-surface-container-low rounded-[2rem] border border-surface-container-high flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-secondary shrink-0 mt-1" />
                    <div>
                      <div className="font-bold text-on-surface">Membro Verificado</div>
                      <p className="text-sm text-on-surface-variant">Seu perfil é verificado e suas receitas são compartilhadas com a comunidade.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 mt-8 space-y-8 border-t border-surface-container-high pt-8">
                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                    <ChefHat className="w-6 h-6 text-primary" /> Perfil Culinário e Experiência
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">Nível de Experiência na Cozinha</label>
                      <div className="flex flex-col gap-2 p-4 bg-surface-container-lowest border border-surface-container-high rounded-2xl">
                        {EXPERIENCIA_OPTIONS.map(opt => (
                          <label key={opt.value} className="flex items-start gap-3 py-1.5 cursor-pointer hover:text-primary transition-colors group">
                            <input 
                              type="radio"
                              name="cookingExperienceLevel"
                              value={opt.value}
                              disabled={!isEditing}
                              checked={formData.cookingExperienceLevel === opt.value}
                              onChange={(e) => setFormData(prev => ({ ...prev, cookingExperienceLevel: e.target.value }))}
                              className="mt-1"
                            />
                            <span className="text-sm text-on-surface group-hover:text-primary transition-colors">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">Frequência com que Cozinha</label>
                      <div className="flex flex-col gap-2 p-4 bg-surface-container-lowest border border-surface-container-high rounded-2xl">
                        {FREQUENCIA_OPTIONS.map(opt => (
                          <label key={opt} className="flex items-start gap-3 py-1.5 cursor-pointer hover:text-primary transition-colors group">
                            <input 
                              type="radio"
                              name="cookingFrequency"
                              value={opt}
                              disabled={!isEditing}
                              checked={formData.cookingFrequency === opt}
                              onChange={(e) => setFormData(prev => ({ ...prev, cookingFrequency: e.target.value }))}
                              className="mt-1"
                            />
                            <span className="text-sm text-on-surface group-hover:text-primary transition-colors">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                    <Utensils className="w-6 h-6 text-primary" /> Preferências Gastronômicas e Restrições
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">Estilos e Tipos de Cozinha</label>
                      <div className="flex flex-col gap-2 p-4 bg-surface-container-lowest border border-surface-container-high rounded-2xl">
                        {PREFERENCIAS_OPTIONS.map(opt => (
                          <label key={opt} className="flex items-start gap-3 py-1.5 cursor-pointer hover:text-primary transition-colors group">
                            <input 
                              type="checkbox"
                              disabled={!isEditing}
                              checked={formData.gastronomicPreferences.includes(opt)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData(prev => ({
                                  ...prev,
                                  gastronomicPreferences: checked 
                                    ? [...prev.gastronomicPreferences, opt]
                                    : prev.gastronomicPreferences.filter(p => p !== opt)
                                }));
                              }}
                              className="mt-1"
                            />
                            <span className="text-sm text-on-surface group-hover:text-primary transition-colors">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">Restrições ou Dietas Específicas</label>
                      <div className="flex flex-col gap-2 p-4 bg-surface-container-lowest border border-surface-container-high rounded-2xl">
                        {RESTRICOES_OPTIONS.map(opt => (
                          <label key={opt} className="flex items-start gap-3 py-1.5 cursor-pointer hover:text-primary transition-colors group">
                            <input 
                              type="checkbox"
                              disabled={!isEditing}
                              checked={formData.dietaryRestrictions.includes(opt)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData(prev => ({
                                  ...prev,
                                  dietaryRestrictions: checked 
                                    ? [...prev.dietaryRestrictions, opt]
                                    : prev.dietaryRestrictions.filter(p => p !== opt)
                                }));
                              }}
                              className="mt-1"
                            />
                            <span className="text-sm text-on-surface group-hover:text-primary transition-colors">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                    <Leaf className="w-6 h-6 text-primary" /> Aspectos Nutricionais e Saúde
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">Interesse em Aspectos Nutricionais</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-surface-container-lowest border border-surface-container-high rounded-2xl">
                        {NUTRICAO_OPTIONS.map(opt => (
                          <label key={opt} className="flex items-start gap-3 py-1.5 cursor-pointer hover:text-primary transition-colors group">
                            <input 
                              type="radio"
                              name="nutritionalFocus"
                              value={opt}
                              disabled={!isEditing}
                              checked={formData.nutritionalFocus === opt}
                              onChange={(e) => setFormData(prev => ({ ...prev, nutritionalFocus: e.target.value }))}
                              className="mt-1"
                            />
                            <span className="text-sm text-on-surface group-hover:text-primary transition-colors">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                    <BookOpen className="w-6 h-6 text-primary" /> Cultura Gastronômica
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <label className="block text-xs font-black text-on-surface-variant uppercase tracking-widest mb-3 ml-1">Interesse em Cultura Gastronômica</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-4 bg-surface-container-lowest border border-surface-container-high rounded-2xl">
                      {CULTURA_OPTIONS.map(opt => (
                        <label key={opt} className="flex items-start gap-3 py-1.5 cursor-pointer hover:text-primary transition-colors group">
                          <input 
                            type="checkbox"
                            disabled={!isEditing}
                            checked={formData.culturalInterests.includes(opt)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormData(prev => ({
                                ...prev,
                                culturalInterests: checked 
                                  ? [...prev.culturalInterests, opt]
                                  : prev.culturalInterests.filter(p => p !== opt)
                              }));
                            }}
                            className="mt-1"
                          />
                          <span className="text-sm text-on-surface group-hover:text-primary transition-colors">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {isEditing && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="col-span-1 md:col-span-2 pt-8 flex gap-4"
                  >
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Salvar Alterações
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setIsEditing(false);
                        fetchProfile();
                      }}
                      className="px-8 py-4 bg-surface-container-high text-on-surface rounded-2xl font-bold hover:bg-surface-container transition-all active:scale-[0.98] disabled:opacity-70 flex items-center gap-2"
                    >
                      <X className="w-5 h-5" />
                      Cancelar
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            {user?.uid === targetUid && (
              <div className="mt-12 pt-12 border-t border-surface-container-high">
                <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-emerald-950/10 dark:to-teal-950/5 border border-emerald-500/20 rounded-[2.5rem] p-6 md:p-10 relative overflow-hidden shadow-sm">
                  {/* Decorative glowing sphere */}
                  <div className="absolute -top-10 -left-10 w-[200px] h-[200px] bg-primary/10 rounded-full blur-[60px] pointer-events-none" />
                  <div className="absolute -bottom-10 -right-10 w-[200px] h-[200px] bg-teal-500/10 rounded-full blur-[60px] pointer-events-none" />

                  <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-center justify-between">
                    <div className="flex-1 text-center lg:text-left">
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-widest mb-4">
                        <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                        Indique e Ganhe
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-serif font-medium text-stone-900 mb-3 tracking-tight">
                        Traga um amigo alquimista!
                      </h3>
                      <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-xl">
                        Compartilhe o seu link de indicação personalizado. Quando seu amigo concluir o cadastro de colaborador, você receberá <strong>+5 XP</strong> instantaneamente para subir de nível!
                      </p>
                    </div>

                    <div className="w-full lg:w-auto min-w-[280px] sm:min-w-[400px] bg-white rounded-3xl p-5 border border-stone-200 shadow-sm flex flex-col gap-4">
                      {/* Friend's WhatsApp Input */}
                      <div>
                        <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">
                          WhatsApp do amigo (opcional):
                        </label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                          <input 
                            type="tel"
                            placeholder="Ex: 5511999999999"
                            value={friendPhone}
                            onChange={(e) => setFriendPhone(e.target.value.replace(/\D/g, ''))}
                            className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 outline-none text-stone-850"
                          />
                        </div>
                        <span className="text-[10px] text-stone-400 mt-1 block leading-tight ml-1">
                          Se preenchido, o número virá preenchido no cadastro dele e abrirá a conversa diretamente.
                        </span>
                      </div>

                      {/* Referral Link Field */}
                      <div>
                        <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-1">
                          Seu link de indicação:
                        </label>
                        <div className="flex gap-2">
                          <input 
                            type="text"
                            readOnly
                            value={`${baseUrl}/register?ref=${targetUid}${friendPhone ? '&phone=' + friendPhone : ''}`}
                            className="flex-1 px-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono outline-none text-stone-655 overflow-ellipsis"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const referralLink = `${baseUrl}/register?ref=${targetUid}${friendPhone ? '&phone=' + friendPhone : ''}`;
                              navigator.clipboard.writeText(referralLink);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            }}
                            className="px-4 py-3 bg-stone-100 hover:bg-stone-200 border border-stone-200 rounded-xl text-stone-750 transition-all flex items-center justify-center shrink-0 cursor-pointer"
                            title="Copiar Link"
                          >
                            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Share WhatsApp Action */}
                      <button
                        type="button"
                        onClick={() => {
                          const referralLink = `${baseUrl}/register?ref=${targetUid}${friendPhone ? '&phone=' + friendPhone : ''}`;
                          const text = `Olá! Junte-se a mim na Alquimia do Prato para compartilharmos receitas e conversarmos com o Chef IA! Cadastre-se pelo link: ${referralLink}`;
                          const whatsappUrl = `https://api.whatsapp.com/send?${friendPhone ? 'phone=' + friendPhone + '&' : ''}text=${encodeURIComponent(text)}`;
                          window.open(whatsappUrl, '_blank');
                        }}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/10 active:scale-95 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        Enviar no WhatsApp
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-12 pt-12 border-t border-surface-container-high">
              <div className="mb-8 text-center">
                <h2 className="text-xl sm:text-3xl font-black text-on-surface mb-2 flex items-center justify-center gap-2 sm:gap-3">
                  <Award className="w-5 h-5 sm:w-8 sm:h-8 text-primary shrink-0" />
                  <span className="text-center">Certificado de Conquistas</span>
                  <Award className="w-5 h-5 sm:w-8 sm:h-8 text-primary shrink-0" />
                </h2>
                <p className="text-on-surface-variant text-sm sm:text-base font-medium">Sua jornada culinária e maestria, faixa a faixa.</p>
              </div>



              <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                {MOCK_LEVELS.map(level => {
                   const isUnlocked = (gamification?.level || 1) >= level.id;
                   
                   return (
                     <div key={level.id} className={`relative p-5 md:p-6 rounded-3xl border-2 overflow-hidden flex flex-col sm:flex-row gap-6 md:gap-8 items-center sm:items-start transition-all duration-500 ${isUnlocked ? 'bg-surface-container-lowest border-primary/20 shadow-lg' : 'bg-surface-container/30 border-surface-container-high opacity-70 grayscale'}`}>
                       
                       {/* Background decoration */}
                       {isUnlocked && (
                         <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[60px] -mr-20 -mt-20 pointer-events-none"></div>
                       )}

                       {/* Left: Avatar */}
                       <div className="shrink-0 relative z-10 flex flex-col items-center">
                          {(() => {
                               const matchingAvatar = avatarsList.find(a => 
                                 a.codigo.toUpperCase().includes(`TIER${level.id}`) || 
                                 a.tierMinimo === level.id.toString()
                               );
                               const avatarUrl = isUnlocked 
                                 ? (certAvatars[level.id] || (matchingAvatar ? matchingAvatar.url : level.avatar))
                                 : level.avatar;
                                 
                               const isClickable = isUnlocked && canEdit;

                               return (
                                 <div 
                                   className={`w-32 h-32 md:w-40 md:h-40 rounded-full border-4 shadow-xl overflow-hidden relative group/cert-avatar ${isUnlocked ? 'border-primary/30 bg-primary/5' : 'border-surface-container bg-surface-container'} ${isClickable ? 'cursor-pointer' : ''}`}
                                   onClick={() => {
                                     if (isClickable) {
                                       setActiveAvatarSelector(level.id);
                                     }
                                   }}
                                 >
                                   <img 
                                     src={avatarUrl} 
                                     alt={level.title} 
                                     className={`w-full h-full object-cover transition-transform duration-300 ${isClickable ? 'group-hover/cert-avatar:scale-110' : ''} ${(!isUnlocked || avatarUrl === level.avatar) ? 'mix-blend-multiply' : ''}`} 
                                   />
                                   
                                   {isClickable && (
                                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/cert-avatar:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-[2px]">
                                       <Camera className="w-8 h-8 mb-1" />
                                       <span className="text-[10px] font-black tracking-widest uppercase text-center px-2 leading-tight">Trocar<br/>Avatar</span>
                                     </div>
                                   )}

                                   {!isUnlocked && (
                                     <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-[1px]">
                                       <Lock className="w-10 h-10 text-on-surface-variant/40" />
                                     </div>
                                   )}
                                 </div>
                               );
                             })()}
                          {/* Level Badge */}
                          <div className={`absolute -bottom-3 px-6 py-1.5 rounded-full font-black uppercase tracking-widest text-xs shadow-md border-2 border-background ${isUnlocked ? 'bg-primary text-white' : 'bg-surface-container-high text-on-surface-variant'}`}>
                             Nível {level.id}
                          </div>
                       </div>

                       {/* Right: Medals & XP */}
                       <div className="flex-1 flex flex-col justify-center gap-4 z-10 w-full pt-4 sm:pt-0">
                          <h3 className="text-2xl font-black text-on-surface tracking-tight text-center sm:text-left">
                            {level.title}
                          </h3>
                          
                          <div className="flex flex-col gap-3">
                            {isUnlocked && (
                              <div className="mt-2 p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/60 flex flex-col gap-3 shadow-sm">
                                {(() => {
                                  const activeLines = INTERACTION_MATRIX.map(interaction => {
                                    const absoluteCount = userInteractions[interaction.id] || 0;
                                    const relativeCount = getRelativeCountForLevel(interaction.id, absoluteCount, level.id);
                                    const targetForLevel = interaction.required * level.id;
                                    
                                    let seal: 'locked' | 'bronze' | 'prata' | 'ouro' = 'locked';
                                    if (relativeCount >= targetForLevel * 4) {
                                      seal = 'ouro';
                                    } else if (relativeCount >= targetForLevel * 2) {
                                      seal = 'prata';
                                    } else if (relativeCount >= targetForLevel) {
                                      seal = 'bronze';
                                    }

                                    return {
                                      ...interaction,
                                      relativeCount,
                                      targetForLevel,
                                      seal
                                    };
                                  }).filter(line => line.relativeCount > 0);

                                  if (activeLines.length === 0) {
                                    return (
                                      <div className="text-center py-4 px-2">
                                        <p className="text-xs text-on-surface-variant font-medium italic">Nenhuma pontuação acumulada neste nível.</p>
                                      </div>
                                    );
                                  }

                                  return activeLines.map(line => {
                                    return (
                                      <div key={line.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface-container-lowest hover:bg-surface-container-low transition-colors duration-200 border border-surface-container-high/40 text-left">
                                        {/* 1. Selo */}
                                        <div className="flex items-center gap-2">
                                          {line.seal === 'locked' && (
                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-stone-100 text-stone-500 px-2.5 py-1 rounded-full border border-stone-200 shadow-sm">
                                              <Lock className="w-3 h-3 shrink-0 text-stone-400" /> Em Progresso
                                            </span>
                                          )}
                                          {line.seal === 'bronze' && (
                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-amber-700/10 text-amber-700 px-2.5 py-1 rounded-full border border-amber-700/20 shadow-sm">
                                              <Award className="w-3 h-3 shrink-0 text-amber-700 animate-pulse" /> Bronze
                                            </span>
                                          )}
                                          {line.seal === 'prata' && (
                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-slate-300/30 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300 shadow-sm">
                                              <Award className="w-3 h-3 shrink-0 text-slate-600 animate-pulse" /> Prata
                                            </span>
                                          )}
                                          {line.seal === 'ouro' && (
                                            <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-yellow-400/10 text-yellow-600 px-2.5 py-1 rounded-full border border-yellow-400/30 shadow-sm">
                                              <Trophy className="w-3 h-3 shrink-0 text-yellow-500 animate-pulse" /> Ouro
                                            </span>
                                          )}
                                        </div>

                                        {/* 2. Item de Interação */}
                                        <span className="text-xs font-bold text-on-surface leading-tight flex-1">
                                          {line.label}
                                        </span>

                                        {/* 3. Pontuação Acumulada */}
                                        <div className="flex items-center gap-3 w-full sm:w-auto mt-1 sm:mt-0 shrink-0 justify-end">
                                          <div className="flex-1 sm:w-24 bg-surface-container-high rounded-full h-2 overflow-hidden border border-surface-container-high/40">
                                            <div 
                                              className={`h-full rounded-full transition-all duration-500 ${line.seal === 'ouro' ? 'bg-yellow-500' : line.seal === 'prata' ? 'bg-slate-400' : line.seal === 'bronze' ? 'bg-amber-600' : 'bg-primary'}`} 
                                              style={{ width: `${Math.min(100, (line.relativeCount / line.targetForLevel) * 100)}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-black text-on-surface-variant font-mono tabular-nums leading-none min-w-[50px] text-right">
                                            {line.relativeCount} / {line.targetForLevel}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                                
                                <div className="flex justify-end mt-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedLevelForTips(level.id);
                                      setShowTipsPopup(true);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all duration-300 cursor-pointer shadow-sm active:scale-95"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                                    Dicas
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                       </div>

                       {!isUnlocked && (
                         <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/20 backdrop-blur-[1px]">
                           <div className="bg-surface-container-high text-on-surface px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center gap-2 shadow-xl">
                             <Shield className="w-5 h-5" />
                             Bloqueado
                           </div>
                         </div>
                       )}
                     </div>
                   );
                })}
              </div>
            </div>
          </div>
        </div>
      </motion.div>


      {/* Interactions Matrix Popup */}
      <AnimatePresence>
        {showInteractionsPopup && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
            onClick={() => setShowInteractionsPopup(false)}
          >
            <motion.div 
              onClick={e => e.stopPropagation()}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-surface rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-surface-container-high my-auto"
            >
              <div className="flex justify-between items-start gap-4 mb-6">
                <div>
                  <h3 className="text-lg sm:text-2xl font-black text-on-surface flex items-center gap-2">
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                    Progresso de Gamificação
                  </h3>
                  <p className="text-xs sm:text-sm text-on-surface-variant mt-1">Acompanhe seu progresso na matriz de interações para conquista de selos.</p>
                </div>
                <button onClick={() => setShowInteractionsPopup(false)} className="p-2 bg-surface-container rounded-full hover:bg-surface-container-high transition-colors shrink-0">
                  <X className="w-5 h-5 text-on-surface-variant" />
                </button>
              </div>

              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin">
                {INTERACTION_MATRIX.map(interaction => {
                  const current = userInteractions[interaction.id] || 0;
                  const progress = Math.min(100, (current / interaction.required) * 100);
                  const isCompleted = current >= interaction.required;

                  return (
                    <div key={interaction.id} className="bg-surface-container-lowest border border-surface-container-high p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
                      <div className="flex-1 w-full">
                        <div className="flex justify-between mb-1">
                          <span className="font-bold text-on-surface text-sm flex items-center gap-2">
                            {interaction.label}
                            {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          </span>
                          <span className="text-xs font-mono font-bold text-on-surface-variant">
                            {current} / {interaction.required}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-primary'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button 
                            onClick={() => handleUpdateInteraction(interaction.id, -1)}
                            disabled={current <= 0}
                            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant disabled:opacity-50 transition-colors"
                          >
                            <MinusCircle className="w-5 h-5" />
                          </button>
                          <span className="font-mono font-bold w-6 text-center">{current}</span>
                          <button 
                            onClick={() => handleUpdateInteraction(interaction.id, 1)}
                            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary transition-colors"
                          >
                            <PlusCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tips Popup */}
      <AnimatePresence>
        {showTipsPopup && selectedLevelForTips !== null && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTipsPopup(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Content */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="bg-surface rounded-3xl p-6 md:p-8 max-w-lg w-full border border-surface-container-high shadow-2xl relative z-10 overflow-hidden text-left"
            >
              {/* Background gradient hint */}
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary/5 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none"></div>

              <div className="flex items-center justify-between mb-6 border-b border-surface-container-high pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-on-surface leading-tight">Dicas de Alquimista</h3>
                    <p className="text-xs text-on-surface-variant font-medium mt-0.5">Nível {selectedLevelForTips} — Como pontuar</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowTipsPopup(false)}
                  className="p-2 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant hover:text-on-surface"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-[350px] overflow-y-auto pr-1 flex flex-col gap-4">
                {(() => {
                  const unrankedInteractions = INTERACTION_MATRIX.filter(interaction => {
                    const abs = userInteractions[interaction.id] || 0;
                    const rel = getRelativeCountForLevel(interaction.id, abs, selectedLevelForTips);
                    return rel === 0;
                  });

                  if (unrankedInteractions.length === 0) {
                    return (
                      <div className="text-center py-6">
                        <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3 animate-bounce" />
                        <h4 className="font-bold text-on-surface">Excelente trabalho!</h4>
                        <p className="text-xs text-on-surface-variant mt-1.5 px-4">Você já iniciou a pontuação em todos os itens de interação deste nível!</p>
                      </div>
                    );
                  }

                  return unrankedInteractions.map(interaction => {
                    const tipInfo = getTipsForInteraction(interaction.id);
                    return (
                      <div key={interaction.id} className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-high/60 hover:border-primary/20 transition-all duration-300 flex flex-col gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-bold text-sm text-on-surface leading-tight">{tipInfo.title}</h4>
                            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed font-medium">{tipInfo.tip}</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setShowTipsPopup(false);
                              if (interaction.id === 'PROFILE_PARTIAL' || interaction.id === 'PROFILE_COMPLETE') {
                                setIsEditing(true);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              } else if (interaction.id === 'COLLABORATION_MESSAGE') {
                                navigate('/lounge');
                              } else if (interaction.id === 'RECIPE_PUBLISHED') {
                                navigate('/submit');
                              } else if (interaction.id === 'ARTICLE_PUBLISHED') {
                                navigate('/acervo');
                              } else if (interaction.id === 'REVIEW_WITH_PHOTO') {
                                navigate('/explore');
                              } else {
                                alert(`Para pontuar, realize ações de "${tipInfo.title}" no lounge, acervo ou receitas!`);
                              }
                            }}
                            className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all cursor-pointer"
                          >
                            {tipInfo.action}
                          </button>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="mt-6 border-t border-surface-container-high pt-4 flex justify-end">
                <button
                  onClick={() => setShowTipsPopup(false)}
                  className="px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/10 hover:bg-primary-hover transition-all cursor-pointer"
                >
                  Entendi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Level Up Popup */}
      <LevelUpPopup
        isOpen={showLevelUpPopup}
        newLevel={gamification?.level || 1}
        newTier={gamification?.tier || 'APRENDIZ'}
        onClose={handleCloseLevelUpPopup}
        onChooseAvatar={handleChooseNewAvatar}
      />

      {/* Celebration Modal */}
      <AnimatePresence>
        {showCelebrationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowCelebrationModal(false)}
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.6, bounce: 0.4 }}
              className="bg-surface dark:bg-surface-container rounded-3xl p-8 max-w-sm w-full border-2 border-emerald-500/30 shadow-2xl relative z-10 overflow-hidden text-center"
            >
              <div className="absolute top-0 right-0 w-[150px] h-[150px] bg-emerald-500/10 rounded-full blur-[40px] -mr-10 -mt-10 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-[150px] h-[150px] bg-primary/10 rounded-full blur-[40px] -ml-10 -mb-10 pointer-events-none"></div>
              
              <div className="mx-auto w-24 h-24 mb-6 relative">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-full h-full bg-gradient-to-tr from-emerald-400 to-teal-500 rounded-full flex items-center justify-center border-4 border-surface shadow-xl">
                  <CheckCircle2 className="w-12 h-12 text-white" />
                </div>
              </div>

              <h2 className="text-2xl font-black text-on-surface mb-2">Cadastro Completo!</h2>
              <p className="text-on-surface-variant text-sm mb-6 font-medium">
                Selo alcançado! Você desbloqueou uma nova meta em seu Certificado de Conquistas.
              </p>

              <button
                onClick={() => setShowCelebrationModal(false)}
                className="w-full py-3.5 bg-on-surface dark:bg-primary text-background dark:text-white rounded-xl font-bold hover:opacity-90 transition-opacity cursor-pointer"
              >
                Continuar Jornada
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
