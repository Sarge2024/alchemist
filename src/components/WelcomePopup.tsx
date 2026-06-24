import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  Users, 
  Bot, 
  Trophy, 
  Flame, 
  Sparkles, 
  Calculator, 
  ChevronRight, 
  Check, 
  User, 
  MessageSquare, 
  HelpCircle,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { CULINARY_PATHS, AVATARS, TRIVIA_QUESTIONS } from "../data/onboarding";
import { UserProgress, BbqCalculationResult } from "../types/onboarding";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

interface WelcomePopupProps {
  onComplete: (progress: UserProgress) => void;
  isOpen: boolean;
  onClose?: () => void;
}

export default function WelcomePopup({ onComplete, isOpen, onClose }: WelcomePopupProps) {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedPath, setSelectedPath] = useState(CULINARY_PATHS[0].id);
  
  // Auth states
  const { user } = useAuth();
  const [emailData, setEmailData] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [avatarsList, setAvatarsList] = useState<string[]>(AVATARS);
  const [showOnStartup, setShowOnStartup] = useState(() => {
    return localStorage.getItem("hide_welcome_startup") !== "true";
  });

  useEffect(() => {
    if (showOnStartup) {
      localStorage.removeItem("hide_welcome_startup");
    } else {
      localStorage.setItem("hide_welcome_startup", "true");
    }
  }, [showOnStartup]);

  // Quiz states
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizXP, setQuizXP] = useState(0);

  // BBQ Calculator Test-Drive states
  const [bbqGuests, setBbqGuests] = useState({ meatEaters: 4, vegetarians: 1, children: 2 });
  const [bbqResult, setBbqResult] = useState<BbqCalculationResult>({
    picanhaKg: 1.6,
    linguiçaKg: 0.8,
    frangoKg: 0.8,
    queijoCoalhoG: 400,
    paoDeAlhoPcs: 8,
    legumesG: 500,
    carvaoSacos: 1,
    cervejaLatas: 18,
    refrigeranteL: 3,
    aguaL: 2
  });

  // Chef IA simulator/real states
  const [chefQuery, setChefQuery] = useState("");
  const [chefResponse, setChefResponse] = useState("");
  const [chefLoading, setChefLoading] = useState(false);
  const [chefError, setChefError] = useState("");
  const [chefXpEarned, setChefXpEarned] = useState(false);

  // Dynamic user status inside walkthrough
  const [xp, setXp] = useState(0);

  // A lista de avatares agora é baseada apenas nos AVATARS (os 8 novatos).

  // Recalculate simple BBQ parameters instantly for step-drive
  useEffect(() => {
    const adults = bbqGuests.meatEaters;
    const kids = bbqGuests.children;
    const vegs = bbqGuests.vegetarians;

    // Standard multipliers: 400g meat for meat adults, 150g for kids, 300g veg cheese for vegetarians
    const picanha = (adults * 0.25 + kids * 0.1).toFixed(1);
    const linguiça = (adults * 0.12 + kids * 0.05).toFixed(1);
    const frango = (adults * 0.12 + kids * 0.05).toFixed(1);
    const queijo = vegs * 300 + adults * 50;
    const pao = (adults + vegs) * 2 + kids * 1;
    const legumes = vegs * 400 + adults * 100;
    const carvao = Math.max(1, Math.ceil((adults + vegs + kids) / 6));
    const cerveja = (adults + vegs) * 4;
    const refrigerante = Math.ceil((kids * 0.5 + vegs * 0.3) * 10) / 10;
    const agua = Math.ceil((adults + vegs + kids) * 0.4);

    setBbqResult({
      picanhaKg: parseFloat(picanha),
      linguiçaKg: parseFloat(linguiça),
      frangoKg: parseFloat(frango),
      queijoCoalhoG: queijo,
      paoDeAlhoPcs: pao,
      legumesG: legumes,
      carvaoSacos: carvao,
      cervejaLatas: cerveja,
      refrigeranteL: refrigerante,
      aguaL: agua
    });
  }, [bbqGuests]);

  useEffect(() => {
    // If the user came back from Google OAuth, they're logged in. Skip to step 2 if on step 1.
    if (user && step === 1) {
      setStep(2);
    }
  }, [user, step]);

  if (!isOpen) return null;

  const currentQuiz = TRIVIA_QUESTIONS[quizIndex];

  // Auth logic
  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setAuthError('Falha ao autenticar com Google: ' + err.message);
      setAuthLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    if (!emailData.email || !emailData.password) {
      setAuthError('Por favor, preencha e-mail e senha.');
      return;
    }
    setAuthLoading(true);
    setAuthError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailData.email,
        password: emailData.password,
      });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          const { error: signUpError } = await supabase.auth.signUp({
            email: emailData.email,
            password: emailData.password,
          });
          if (signUpError) throw signUpError;
          setStep(2);
        } else {
          throw error;
        }
      } else {
        setStep(2);
      }
    } catch (err: any) {
      setAuthError('Erro na autenticação: ' + err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 2 && !username.trim()) {
      alert("Por favor, diga-nos o seu nome de Chef para continuarmos!");
      return;
    }
    setStep((prev) => prev + 1);
  };

  const handlePrevStep = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  const handleNextQuestion = () => {
    setQuizSubmitted(false);
    setSelectedAnswer(null);
    setQuizIndex((prev) => (prev + 1) % TRIVIA_QUESTIONS.length);
  };

  const handleAnswerSubmit = (optionIndex: number) => {
    if (quizSubmitted) return;
    setSelectedAnswer(optionIndex);
    setQuizSubmitted(true);
    
    if (optionIndex === currentQuiz.correctAnswer) {
      setQuizXP(currentQuiz.xpReward);
      setXp((prev) => prev + currentQuiz.xpReward);
    } else {
      setQuizXP(50); // consolation prize
      setXp((prev) => prev + 50);
    }
  };

  const askChefIa = async (presetQuestion?: string) => {
    const qText = presetQuestion || chefQuery;
    if (!qText.trim()) return;

    setChefLoading(true);
    setChefError("");
    setChefResponse("");

    // Respostas rápidas e hardcoded para os presets para não atrasar o onboarding
    if (qText === "Qual o maior segredo para o Risoto ficar italiano clássico beeeem cremoso e brilhante?") {
      setTimeout(() => {
        setChefResponse("O segredo do risoto 'all'onda' está na mantecatura: a emulsão mágica entre o amido liberado pelo arroz arbóreo/carnaroli, manteiga gelada e queijo parmesão. Isso deve ser feito SEMPRE fora do fogo! Agite a panela vigorosamente para frente e para trás, criando uma onda cremosa, aveludada e brilhante.");
        if (!chefXpEarned) { setXp((prev) => prev + 100); setChefXpEarned(true); }
        setChefLoading(false);
      }, 600);
      return;
    }

    if (qText === "Qual o ponto ideal do salmão na frigideira para manter a textura aveludada?") {
      setTimeout(() => {
        setChefResponse("O ponto ideal para o salmão é o 'mi-cuit' (bem selado por fora e morno/rosado no centro). Grelhe com a pele para baixo em fogo médio-alto até dourar e pururucar bem (cerca de 4 minutos). Depois, vire e dê apenas um 'susto' de 30 segundos do outro lado. A textura ficará desmanchando e incrivelmente macia na boca.");
        if (!chefXpEarned) { setXp((prev) => prev + 100); setChefXpEarned(true); }
        setChefLoading(false);
      }, 600);
      return;
    }

    if (qText === "Dicas de harmonização de vinho para um bife ancho pesado na mostarda dijon.") {
      setTimeout(() => {
        setChefResponse("O bife Ancho é uma carne rica em marmoreio (gordura), e a mostarda Dijon adiciona acidez e picância ao perfil. Para equilibrar, busque um vinho tinto com boa acidez e taninos estruturados, como um Syrah ou um Malbec argentino. A acidez limpa o paladar e os taninos interagem perfeitamente com a proteína.");
        if (!chefXpEarned) { setXp((prev) => prev + 100); setChefXpEarned(true); }
        setChefLoading(false);
      }, 600);
      return;
    }

    // Fallback para perguntas customizadas digitadas pelo usuário (Chama API Real)
    try {
      const res = await fetch("/api/chat/ask", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_APP_API_KEY || ""
        },
        body: JSON.stringify({ question: qText, history: [] })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setChefResponse(data.answer);
        if (!chefXpEarned) {
          setXp((prev) => prev + 100);
          setChefXpEarned(true);
        }
      } else {
        setChefError(data.error || "Algo deu errado ao processar.");
      }
    } catch (err) {
      setChefError("Não foi possível conectar ao Chef IA. O servidor local está ativo?");
    } finally {
      setChefLoading(false);
    }
  };

  const handleFinishOnboarding = () => {
    // Determine rank based on XP
    let finalRank: "Novato" | "Iniciante" | "Chef de Linha" = "Novato";
    if (xp >= 300) {
      finalRank = "Chef de Linha";
    } else if (xp >= 150) {
      finalRank = "Iniciante";
    }

    const progress: UserProgress = {
      name: username || "Chef Aprendiz",
      rank: finalRank,
      points: xp,
      avatar: selectedAvatar,
      selectedPath,
      completedQuizzes: quizSubmitted ? [currentQuiz.id] : [],
      unlockedBadges: xp >= 150 ? ["Conhecimento Químico", "Iniciado Espetacular"] : ["Iniciado"]
    };

    onComplete(progress);
  };

  // Compute Chef Rank title dynamically for top progress bar
  const getWalkthroughRank = () => {
    if (xp >= 300) return "Chef de Linha";
    if (xp >= 150) return "Iniciante";
    return "Novato";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 py-8 md:p-8 bg-black/60 backdrop-blur-md overflow-y-auto">
      <motion.div 
        id="welcome-popup-container"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-5xl bg-neutral-50 dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-amber-100/50 dark:border-zinc-800/80 m-auto shrink-0"
      >
        {/* TOP STATUS BAR (when creating user) */}
        {step > 1 && (
          <div className="h-14 bg-amber-50 dark:bg-zinc-800/50 px-6 sm:px-8 border-b border-amber-100/40 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-600/10 text-amber-700 dark:text-amber-400 font-medium h-fit uppercase tracking-wider">
                Tutorial Ativo
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                Passo {step} de 6
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Progress Level pill */}
              <div className="flex items-center gap-1.5 text-xs text-amber-900 dark:text-amber-100 font-semibold bg-white dark:bg-zinc-800 shadow-sm border border-amber-200/50 dark:border-zinc-700 rounded-full px-3 py-1">
                <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 animate-pulse" />
                <span>Nível: {getWalkthroughRank()}</span>
                <span className="ml-1 text-amber-600 font-mono">({xp} XP)</span>
              </div>

              {onClose && (
                <button 
                  onClick={onClose} 
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  title="Pular onboarding"
                >
                  Pular
                </button>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row min-h-[580px]">
          
          {/* STEP 1: COMPREHENSIVE PRESENTATION PILLARS (Matching Image 1 exactly in layout and tone) */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col md:flex-row w-full"
              >
                {/* LEFT PORTRAIT COLUMN (Aesthetic cooking photography overlay) */}
                <div className="relative w-full md:w-[45%] min-h-[300px] md:min-h-full bg-neutral-900 flex flex-col justify-end p-8 text-white overflow-hidden">
                  <div className="absolute inset-0 z-0 bg-cover bg-center opacity-70 scale-105 filter brightness-[0.70] contrast-[1.05]" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&fit=crop&q=80')` }}></div>
                  <div className="absolute inset-0 z-1 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                  
                  <div className="relative z-10 space-y-4">
                    <span className="inline-block tracking-widest text-[10px] md:text-xs font-mono font-bold bg-amber-600/90 text-white rounded px-2.5 py-1 uppercase border border-amber-400/30">
                      Alta Gastronomia & Tecnologia
                    </span>
                    <h1 className="text-3xl md:text-4xl font-serif leading-tight font-medium tracking-tight text-white">
                      Bem-vindo à Sua <br />
                      <span className="italic text-amber-400">Jornada</span> <br />
                      Gastronômica
                    </h1>
                    <p className="text-xs md:text-sm text-neutral-300 font-sans leading-relaxed max-w-sm">
                      Descubra um ecossistema onde a tradição culinária encontra a inteligência artificial para elevar cada ingrediente ao seu potencial máximo.
                    </p>
                  </div>
                </div>

                {/* RIGHT PILLARS COLUMN */}
                <div className="w-full md:w-[55%] p-6 sm:p-10 flex flex-col justify-between bg-white dark:bg-zinc-900 border-l border-amber-50/50 dark:border-zinc-800">
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-serif font-semibold text-neutral-800 dark:text-neutral-100 tracking-tight">Explore os Pilares</h2>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Sua evolução como mestre começa através destes caminhos integrados:</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Pillar 1 */}
                      <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-zinc-800/40 border border-amber-100/30 dark:border-zinc-800 flex gap-3 hover:translate-y-[-2px] transition-transform">
                        <div className="bg-amber-100 dark:bg-amber-950/40 h-9 w-9 rounded-xl flex items-center justify-center shrink-0">
                          <BookOpen className="w-4.5 h-4.5 text-amber-800 dark:text-amber-400" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-semibold text-neutral-800 dark:text-zinc-200">Academia Gastronômica</h4>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">Culinária básica a avançada, história e nutrição.</p>
                        </div>
                      </div>

                      {/* Pillar 2 */}
                      <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-zinc-800/40 border border-amber-100/30 dark:border-zinc-800 flex gap-3 hover:translate-y-[-2px] transition-transform">
                        <div className="bg-amber-100 dark:bg-amber-950/40 h-9 w-9 rounded-xl flex items-center justify-center shrink-0">
                          <Users className="w-4.5 h-4.5 text-amber-800 dark:text-amber-400" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-semibold text-neutral-800 dark:text-zinc-200">Lounge da Comunidade</h4>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">Conecte-se com profissionais, compartilhe acertos.</p>
                        </div>
                      </div>

                      {/* Pillar 3 */}
                      <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-zinc-800/40 border border-amber-100/30 dark:border-zinc-800 flex gap-3 hover:translate-y-[-2px] transition-transform relative overflow-hidden">
                        <div className="absolute top-2 right-2 flex gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500/60 animate-pulse" />
                        </div>
                        <div className="bg-amber-100 dark:bg-amber-950/40 h-9 w-9 rounded-xl flex items-center justify-center shrink-0">
                          <Bot className="w-4.5 h-4.5 text-amber-800 dark:text-amber-400" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-semibold text-neutral-800 dark:text-zinc-200">Chef IA Personalizado</h4>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">Seu orientador 24h para harmonizações e ajustes minuciosos.</p>
                        </div>
                      </div>

                      {/* Pillar 4 */}
                      <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-zinc-800/40 border border-amber-100/30 dark:border-zinc-800 flex gap-3 hover:translate-y-[-2px] transition-transform">
                        <div className="bg-amber-100 dark:bg-amber-950/40 h-9 w-9 rounded-xl flex items-center justify-center shrink-0">
                          <Trophy className="w-4.5 h-4.5 text-amber-800 dark:text-amber-400" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-semibold text-neutral-800 dark:text-zinc-200">Trilha do Mestre</h4>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">Acompanhe sua pontuação, progredindo de Novato a Mestre.</p>
                        </div>
                      </div>

                      {/* Pillar 5 (BBQ addition highlighted) */}
                      <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-zinc-800/40 border border-amber-100/30 dark:border-zinc-800 flex gap-3 hover:translate-y-[-2px] transition-transform sm:col-span-2">
                        <div className="bg-amber-100 dark:bg-amber-950/40 h-9 w-9 rounded-xl flex items-center justify-center shrink-0">
                          <Calculator className="w-4.5 h-4.5 text-amber-800 dark:text-amber-400" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-semibold text-neutral-800 dark:text-zinc-200 flex items-center gap-1.5">
                            Calculadora Avançada de Churrasco
                            <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.2 rounded-full dark:bg-red-950/50 dark:text-red-400 uppercase font-mono font-bold tracking-wide">Exclusivo</span>
                          </h4>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">Sabe aquele churrasco em família? Nossa inteligência dimensiona carnes, carvão e bebidas perfeitamente para evitar de vez qualquer escassez ou excesso.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-amber-100/40 dark:border-zinc-800">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="flex-1 w-full space-y-3">
                        <input 
                          type="email" 
                          placeholder="Seu E-mail"
                          value={emailData.email}
                          onChange={(e) => setEmailData({...emailData, email: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                        />
                        <input 
                          type="password" 
                          placeholder="Sua Senha"
                          value={emailData.password}
                          onChange={(e) => setEmailData({...emailData, password: e.target.value})}
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                        />
                        {authError && <p className="text-xs text-red-500">{authError}</p>}
                        <div className="flex flex-col sm:flex-row gap-3">
                          <button 
                            onClick={handleEmailLogin}
                            disabled={authLoading}
                            className="flex-1 py-3 bg-amber-800 hover:bg-amber-900 disabled:opacity-50 text-white rounded-xl font-medium shadow-md transition-all text-sm justify-center flex items-center gap-2"
                          >
                            Entrar com E-mail
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={handleGoogleLogin}
                            disabled={authLoading}
                            className="flex-1 py-3 bg-white dark:bg-zinc-800 border border-neutral-200 dark:border-zinc-700 hover:bg-neutral-50 dark:hover:bg-zinc-700 disabled:opacity-50 text-neutral-800 dark:text-neutral-200 rounded-xl font-medium shadow-sm transition-all text-sm flex items-center justify-center gap-2"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            Entrar com Google
                          </button>
                        </div>
                        <div className="pt-2 flex items-center justify-between">
                          <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300 transition-colors">
                            <input
                              type="checkbox"
                              checked={showOnStartup}
                              onChange={(e) => setShowOnStartup(e.target.checked)}
                              className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500 bg-white dark:bg-zinc-800"
                            />
                            Apresentar no início
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: PROFILE SETUP & CULINARY PATH SELECT */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 sm:p-10 w-full flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-serif text-neutral-800 dark:text-neutral-100">Sua Identidade Culinária</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Defina seu codinome no portal para darmos o primeiro passo gamificado.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Username & Avatar block */}
                    <div className="space-y-5 md:border-r md:border-neutral-100 dark:border-zinc-800 md:pr-8">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest block">Nome de Chef</label>
                        <input 
                          type="text" 
                          value={username} 
                          onChange={(e) => setUsername(e.target.value)} 
                          placeholder="Ex: Chef Augusto, Maria Silva"
                          className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                        />
                      </div>

                      <div className="space-y-3">
                        <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest block">Escolha seu Avatar</label>
                        <div className="flex gap-3 flex-wrap">
                          {avatarsList.map((avUrl, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedAvatar(avUrl)}
                              className={`relative rounded-full h-14 w-14 overflow-hidden border-2 transition-all p-0.5 ${selectedAvatar === avUrl ? "border-amber-600 scale-105" : "border-transparent opacity-70 hover:opacity-105"}`}
                            >
                              <img src={avUrl} className="h-full w-full object-cover rounded-full" alt="Avatar option" referrerPolicy="no-referrer" />
                              {selectedAvatar === avUrl && (
                                <span className="absolute bottom-0 right-0 bg-amber-600 text-white rounded-full p-0.5">
                                  <Check className="w-3 h-3" />
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Culinary Path select block */}
                    <div className="col-span-2 space-y-4">
                      <label className="text-xs font-semibold text-neutral-500 uppercase tracking-widest block">Escolha seu Caminho de Foco</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {CULINARY_PATHS.map((pathObj) => (
                          <div
                            key={pathObj.id}
                            onClick={() => setSelectedPath(pathObj.id)}
                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between h-[120px] ${selectedPath === pathObj.id ? "bg-amber-50/50 dark:bg-zinc-800/40 border-amber-600 shadow-sm" : "bg-white dark:bg-zinc-800/60 border-neutral-200 dark:border-zinc-800 hover:border-neutral-300"}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-2xl">{pathObj.icon}</span>
                              <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center ${selectedPath === pathObj.id ? "border-amber-600 bg-amber-600 text-white" : "border-neutral-400 bg-transparent"}`}>
                                {selectedPath === pathObj.id && <Check className="w-3 h-3" />}
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{pathObj.name}</h4>
                              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight line-clamp-2">{pathObj.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-zinc-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button onClick={handlePrevStep} className="px-6 py-2.5 rounded-full text-xs text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-zinc-800 font-medium">
                      Voltar
                    </button>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300 transition-colors">
                      <input
                        type="checkbox"
                        checked={showOnStartup}
                        onChange={(e) => setShowOnStartup(e.target.checked)}
                        className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500 bg-white dark:bg-zinc-800"
                      />
                      Apresentar no início
                    </label>
                  </div>
                  <button onClick={handleNextStep} className="px-8 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-full text-xs font-medium inline-flex items-center gap-1.5 shadow-md">
                    Prosseguir
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: QUIZ (ACERVO EDUCATION DEMO) */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 sm:p-10 w-full flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-mono tracking-widest bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-md font-bold uppercase block h-fit w-fit mb-1.5">
                        Fase 1: O Acervo Científico
                      </span>
                      <h2 className="text-2xl font-serif text-neutral-800 dark:text-neutral-100">Desafio de Alquimia de Alimentos</h2>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Nossos acervos mergulham na química alimentar. Resolva este mini-desafio para começar a ganhar pontos!
                      </p>
                    </div>
                    {/* XP Tag animation */}
                    <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 rounded-full px-3 py-1 font-mono text-xs font-bold animate-pulse ring-1 ring-emerald-500/20">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>+{currentQuiz.xpReward} XP se acertar!</span>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 bg-white dark:bg-zinc-800 rounded-2xl border border-neutral-200 dark:border-zinc-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <HelpCircle className="w-5 h-5 text-amber-600 shrink-0" />
                      <h3 className="font-semibold text-[15px] text-neutral-800 dark:text-neutral-200 leading-relaxed">
                        {currentQuiz.question}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3 pt-2">
                      {currentQuiz.options.map((option, idx) => {
                        const isCorrect = idx === currentQuiz.correctAnswer;
                        const isSelected = idx === selectedAnswer;
                        
                        let optionStyle = "border-neutral-200 dark:border-zinc-700 hover:bg-neutral-50 dark:hover:bg-zinc-700/50 text-neutral-700 dark:text-neutral-200";
                        if (quizSubmitted) {
                          if (isCorrect) optionStyle = "bg-emerald-500/15 border-emerald-500 text-emerald-900 dark:text-emerald-300 font-medium";
                          else if (isSelected) optionStyle = "bg-red-500/10 border-red-400 text-red-800 dark:text-red-400";
                          else optionStyle = "opacity-55 border-neutral-200 dark:border-zinc-800 text-neutral-700 dark:text-neutral-400";
                        }

                        return (
                          <button
                            key={idx}
                            disabled={quizSubmitted}
                            onClick={() => handleAnswerSubmit(idx)}
                            className={`w-full p-3.5 rounded-xl border-2 text-left text-xs transition-all flex justify-between items-center gap-4 ${optionStyle}`}
                          >
                            <span className="leading-relaxed">{option}</span>
                            {quizSubmitted && isCorrect && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {/* Result details */}
                    <AnimatePresence>
                      {quizSubmitted && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`p-4 rounded-xl border flex gap-3 text-xs leading-relaxed ${selectedAnswer === currentQuiz.correctAnswer ? "bg-emerald-50 dark:bg-emerald-950/10 border-emerald-300 text-emerald-800 dark:text-emerald-400" : "bg-amber-50 dark:bg-amber-950/10 border-amber-300 text-amber-800 dark:text-amber-400"}`}
                        >
                          <AlertCircle className="w-4.5 h-4.5 shrink-0" />
                          <div>
                            <span className="font-bold block text-sm mb-1">
                              {selectedAnswer === currentQuiz.correctAnswer ? `✦ Excelente! Você acertou (+${quizXP} XP)` : `✦ Quase lá! Aprendemos na prática (+${quizXP} XP)`}
                            </span>
                            {currentQuiz.explanation}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-zinc-800 flex justify-between gap-4">
                  <button onClick={handlePrevStep} className="px-6 py-2.5 rounded-full text-xs text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-zinc-800 font-medium">
                    Voltar
                  </button>
                  <div className="flex gap-2">
                    {quizSubmitted && (
                      <button 
                        onClick={handleNextQuestion} 
                        className="px-6 py-2.5 rounded-full text-xs font-medium inline-flex items-center bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 transition-all"
                      >
                        Próxima Questão
                      </button>
                    )}
                    <button 
                      disabled={!quizSubmitted}
                      onClick={handleNextStep} 
                      className={`px-6 py-2.5 rounded-full text-xs font-medium inline-flex items-center gap-1.5 shadow-md transition-all ${quizSubmitted ? "bg-amber-800 hover:bg-amber-900 text-white cursor-pointer" : "bg-neutral-200 text-neutral-400 dark:bg-zinc-800 dark:text-zinc-500 cursor-not-allowed"}`}
                    >
                      Prosseguir
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: INTERACTIVE BBQ TRIAL */}
            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 sm:p-10 w-full flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 px-2 py-0.5 rounded-md font-bold uppercase block h-fit w-fit mb-1.5">
                      Fase 2: Automações do Portal
                    </span>
                    <h2 className="text-2xl font-serif text-neutral-800 dark:text-neutral-100">Test-Drive: Calculadora de Churrasco</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Chega de incertezas no fim de semana. Ajuste os controles abaixo e veja a mágica da proporção exata acontecer:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white dark:bg-zinc-800 p-5 rounded-2xl border border-neutral-200 dark:border-zinc-800">
                    
                    {/* Controls */}
                    <div className="space-y-4 md:border-r md:border-neutral-100 dark:border-zinc-700 md:pr-6">
                      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Dimensione seus Convidados</h4>

                      {/* Control 1: Meat Adults */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          <span>Adultos Comedores de Carne</span>
                          <span className="text-orange-500 font-mono text-sm">{bbqGuests.meatEaters}</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="20" 
                          value={bbqGuests.meatEaters}
                          onChange={(e) => setBbqGuests({ ...bbqGuests, meatEaters: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-600"
                        />
                      </div>

                      {/* Control 2: Vegetarian Adults */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          <span>Adultos Vegetarianos</span>
                          <span className="text-emerald-500 font-mono text-sm">{bbqGuests.vegetarians}</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="10" 
                          value={bbqGuests.vegetarians}
                          onChange={(e) => setBbqGuests({ ...bbqGuests, vegetarians: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                      </div>

                      {/* Control 3: Children */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                          <span>Crianças (até 10 anos)</span>
                          <span className="text-amber-600 font-mono text-sm">{bbqGuests.children}</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="15" 
                          value={bbqGuests.children}
                          onChange={(e) => setBbqGuests({ ...bbqGuests, children: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-neutral-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                        />
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center gap-2 bg-amber-500/10 rounded-xl p-3 border border-amber-500/15 text-[11px] text-amber-700 dark:text-amber-400">
                          <TrendingUp className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>O algoritmo inteligente ajusta o consumo de pão de alho, queijos e carvão proporcionalmente à festa!</span>
                        </div>
                      </div>
                    </div>

                    {/* Live Output */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Resultado Calculado</h4>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-neutral-50 dark:bg-zinc-700/50 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-neutral-500 dark:text-neutral-400">🥩 Carnes (Totais)</span>
                          <span className="font-mono font-bold text-neutral-800 dark:text-white">
                            {(bbqResult.picanhaKg + bbqResult.linguiçaKg + bbqResult.frangoKg).toFixed(1)} kg
                          </span>
                        </div>

                        <div className="p-3 bg-neutral-50 dark:bg-zinc-700/50 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-neutral-500 dark:text-neutral-400">🧀 queijo Coalho</span>
                          <span className="font-mono font-bold text-neutral-800 dark:text-white">
                            {bbqResult.queijoCoalhoG} g
                          </span>
                        </div>

                        <div className="p-3 bg-neutral-50 dark:bg-zinc-700/50 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-neutral-500 dark:text-neutral-400">🥖 Pão de Alho</span>
                          <span className="font-mono font-bold text-neutral-800 dark:text-white">
                            {bbqResult.paoDeAlhoPcs} unid.
                          </span>
                        </div>

                        <div className="p-3 bg-neutral-50 dark:bg-zinc-700/50 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-neutral-500 dark:text-neutral-400">🔥 Carvão</span>
                          <span className="font-mono font-bold text-neutral-800 dark:text-white">
                            {bbqResult.carvaoSacos} {bbqResult.carvaoSacos > 1 ? "sacos" : "saco"}
                          </span>
                        </div>

                        <div className="p-3 bg-neutral-50 dark:bg-zinc-700/50 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-neutral-500 dark:text-neutral-400">🍺 Cerveja</span>
                          <span className="font-mono font-bold text-neutral-800 dark:text-white">
                            {bbqResult.cervejaLatas} latas
                          </span>
                        </div>

                        <div className="p-3 bg-neutral-50 dark:bg-zinc-700/50 rounded-xl flex items-center justify-between text-xs">
                          <span className="text-neutral-500 dark:text-neutral-400">🥤 Refrigerante</span>
                          <span className="font-mono font-bold text-neutral-800 dark:text-white">
                            {bbqResult.refrigeranteL} L
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          setXp((prev) => prev + 100);
                          handleNextStep();
                        }}
                        className="w-full py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl text-xs font-bold shadow-md transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                      >
                        Confirmar Plano e Ganhar +100 XP!
                      </button>
                    </div>

                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-zinc-800 flex justify-between gap-4">
                  <button onClick={handlePrevStep} className="px-6 py-2.5 rounded-full text-xs text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-zinc-800 font-medium">
                    Voltar
                  </button>
                  <button 
                    onClick={() => {
                      // auto grant xp if skipped next
                      setXp((prev) => prev + 100);
                      handleNextStep();
                    }}
                    className="px-8 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-full text-xs font-medium inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    Ir para Próximo
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 5: TRIAL CHEF IA (Live Endpoint calling Gemini api) */}
            {step === 5 && (
              <motion.div 
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-6 sm:p-10 w-full flex flex-col justify-between"
              >
                <div className="space-y-6">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-0.5 rounded-md font-bold uppercase block h-fit w-fit mb-1.5">
                      Fase 3: Inteligência Artificial
                    </span>
                    <h2 className="text-2xl font-serif text-neutral-800 dark:text-neutral-100">Teste o Chef IA Personalizado</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Conectado diretamente ao Gemini local. Envie uma dúvida gastronômica ou toque em nossas sugestões clássicas para ver receitas e ciência molecular em segundos:
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    {/* Suggested triggers */}
                    <div className="col-span-2 space-y-3">
                      <h4 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">Dúvidas Frequentes de Alta Cozinha</h4>
                      
                      <button 
                        onClick={() => {
                          setChefQuery("Qual o maior segredo para o Risoto ficar italiano clássico beeeem cremoso e brilhante?");
                          askChefIa("Qual o maior segredo para o Risoto ficar italiano clássico beeeem cremoso e brilhante?");
                        }}
                        className="w-full p-3 bg-white dark:bg-zinc-800 rounded-xl border border-neutral-200 dark:border-zinc-700 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-amber-400 hover:bg-amber-50/20 dark:hover:bg-zinc-700/50 transition-all flex gap-2"
                      >
                        <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>Como obter o risoto super cremoso (All'Onda)?</span>
                      </button>

                      <button 
                        onClick={() => {
                          setChefQuery("Qual o ponto ideal do salmão na frigideira para manter a textura aveludada?");
                          askChefIa("Qual o ponto ideal do salmão na frigideira para manter a textura aveludada?");
                        }}
                        className="w-full p-3 bg-white dark:bg-zinc-800 rounded-xl border border-neutral-200 dark:border-zinc-700 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-amber-400 hover:bg-amber-50/20 dark:hover:bg-zinc-700/50 transition-all flex gap-2"
                      >
                        <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>Qual o ponto perfeito do salmão selado?</span>
                      </button>

                      <button 
                        onClick={() => {
                          setChefQuery("Dicas de harmonização de vinho para um bife ancho pesado na mostarda dijon.");
                          askChefIa("Dicas de harmonização de vinho para um bife ancho pesado na mostarda dijon.");
                        }}
                        className="w-full p-3 bg-white dark:bg-zinc-800 rounded-xl border border-neutral-200 dark:border-zinc-700 text-left text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-amber-400 hover:bg-amber-50/20 dark:hover:bg-zinc-700/50 transition-all flex gap-2"
                      >
                        <MessageSquare className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>Harmonização ideal para Ancho com Mostarda</span>
                      </button>
                    </div>

                    {/* Chat screen */}
                    <div className="col-span-3 bg-white dark:bg-zinc-800 p-4 rounded-2xl border border-neutral-200 dark:border-zinc-700 flex flex-col justify-between h-[250px] md:h-[280px]">
                      
                      {/* Message screen block */}
                      <div className="overflow-y-auto flex-1 text-xs space-y-3 pr-2 scrollbar-thin scrollbar-thumb-amber-700">
                        {chefResponse ? (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2 text-[10px] text-amber-700 dark:text-amber-400 font-mono uppercase font-bold">
                              <Bot className="w-4 h-4 text-amber-600 animate-bounce" />
                              <span>Chef Alquimista</span>
                            </div>
                            <div className="bg-amber-50/55 dark:bg-zinc-900/60 p-3 rounded-xl border border-amber-100/40 dark:border-zinc-800 leading-relaxed text-neutral-800 dark:text-neutral-200 font-sans tracking-wide">
                              {chefResponse}
                            </div>
                          </div>
                        ) : chefLoading ? (
                          <div className="h-full flex flex-col items-center justify-center p-4 text-neutral-400 gap-2 font-medium">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
                            <span>O Chef está elaborando sua resposta científica...</span>
                          </div>
                        ) : chefError ? (
                          <div className="p-3 bg-red-100 text-red-700 rounded-xl leading-relaxed">
                            {chefError}
                          </div>
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400 dark:text-neutral-500 gap-1.5">
                            <Bot className="w-8 h-8 text-neutral-300 dark:text-zinc-700" />
                            <span>Escreva sua própria pergunta ou utilize um de nossos botões rápidos ao lado!</span>
                          </div>
                        )}
                      </div>

                      {/* Input field */}
                      <div className="flex gap-2 border-t border-neutral-100 dark:border-zinc-700 pt-3 mt-2">
                        <input 
                          type="text"
                          value={chefQuery}
                          onChange={(e) => setChefQuery(e.target.value)}
                          placeholder="Pergunte ao Chef (Ex: Como emulsificar molho?)"
                          disabled={chefLoading}
                          className="flex-1 px-3 py-1.8 bg-neutral-50 dark:bg-zinc-900 dark:text-zinc-200 border border-neutral-200 dark:border-zinc-700 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        <button 
                          onClick={() => askChefIa()}
                          disabled={chefLoading || !chefQuery.trim()}
                          className={`px-4 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-all ${chefLoading || !chefQuery.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          Enviar
                        </button>
                      </div>

                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-zinc-800 flex justify-between gap-4">
                  <button onClick={handlePrevStep} className="px-6 py-2.5 rounded-full text-xs text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-zinc-800 font-medium">
                    Voltar
                  </button>
                  <button 
                    onClick={() => {
                      if (!chefXpEarned) {
                        setXp((prev) => prev + 100);
                      }
                      handleNextStep();
                    }} 
                    className="px-8 py-2.5 bg-amber-800 hover:bg-amber-900 text-white rounded-full text-xs font-medium inline-flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    {chefXpEarned ? "Prosseguir (+100 XP Obtidos)" : "Prosseguir e Ganhar +100 XP"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 6: FINISHED & CONSECRATION CELEBRATION */}
            {step === 6 && (
              <motion.div 
                key="step6"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="p-6 sm:p-10 w-full flex flex-col justify-between"
              >
                <div className="text-center space-y-6 py-4 mx-auto max-w-xl">
                  {/* Badge visual */}
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 via-orange-500 to-yellow-400 p-0.5 animate-bounce shadow-xl">
                    <div className="h-full w-full bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center text-4xl">
                      🌟
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-3xl font-serif font-bold text-neutral-800 dark:text-neutral-200">Jornada Iniciada, Chef {username || "Aprendiz"}!</h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                      Você concluiu o onboarding gamificado e se provou digno da brasa e dos livros!
                    </p>
                  </div>

                  {/* Summary card */}
                  <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-zinc-800/40 border border-amber-200/40 dark:border-zinc-800 text-xs text-left grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-neutral-400 block uppercase tracking-wider font-mono text-[9px]">Classificação Inicial</span>
                      <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                        🏆 {getWalkthroughRank()}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-neutral-400 block uppercase tracking-wider font-mono text-[9px]">Pontuação Conquistada</span>
                      <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                        ⚡ {xp} Pontos XP
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-neutral-400 block uppercase tracking-wider font-mono text-[9px]">Foco Gastronômico</span>
                      <span className="font-bold text-sm text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                        📌 {CULINARY_PATHS.find(p => p.id === selectedPath)?.name || "Geral"}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-neutral-400 block uppercase tracking-wider font-mono text-[9px]">Recursos Desbloqueados</span>
                      <span className="font-bold text-sm text-amber-800 dark:text-amber-400 flex items-center gap-1">
                        🔓 Todas as Abas Liberadas
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-xl text-xs border border-emerald-500/15 text-center font-medium">
                    Parabéns! Suas conquistas e pontuação foram salvas no portal. Você agora possui acesso irrestrito a todo o ecosistema!
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-zinc-800 flex flex-col items-center gap-4">
                  <button 
                    onClick={handleFinishOnboarding}
                    className="px-12 py-4 bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white rounded-full font-bold text-sm shadow-xl hover:shadow-orange-950/20 hover:scale-103 transition-all uppercase tracking-wider"
                  >
                    Entrar no Portal Alquimia do Prato
                  </button>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300 transition-colors">
                    <input
                      type="checkbox"
                      checked={showOnStartup}
                      onChange={(e) => setShowOnStartup(e.target.checked)}
                      className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500 bg-white dark:bg-zinc-800"
                    />
                    Apresentar no início
                  </label>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </motion.div>
    </div>
  );
}
