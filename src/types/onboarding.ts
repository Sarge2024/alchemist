export type UserRole = "user" | "admin" | "chef" | "community";

export type ChefRank = 
  | "Novato" 
  | "Iniciante" 
  | "Chef de Linha" 
  | "Sub-Chef" 
  | "Mestre Culinário";

export interface UserProgress {
  name: string;
  rank: ChefRank;
  points: number;
  avatar: string;
  selectedPath: string;
  completedQuizzes: string[];
  unlockedBadges: string[];
}

export interface TriviaQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  xpReward: number;
}

export interface BbqCalculationResult {
  picanhaKg: number;
  linguiçaKg: number;
  frangoKg: number;
  queijoCoalhoG: number;
  paoDeAlhoPcs: number;
  legumesG: number;
  carvaoSacos: number;
  cervejaLatas: number;
  refrigeranteL: number;
  aguaL: number;
}

export interface BbqInput {
  meateaters: number;
  vegetarians: number;
  children: number;
  drinksBeer: boolean;
  drinksSoda: boolean;
  durationHours: number;
}

export interface LoungeMessage {
  id: string;
  sender: string;
  role: UserRole;
  title: string;
  text: string;
  timestamp: string;
  avatar: string;
}

export interface AcervoArticle {
  id: string;
  category: "Gastronomia" | "Culinária" | "Nutrição";
  title: string;
  excerpt: string;
  content: string;
  readTime: string;
  image: string;
  difficulty?: "Iniciante" | "Intermediário" | "Avançado";
}
