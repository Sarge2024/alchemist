/**
 * App.tsx
 * Componente raiz da aplicação Alchemist.
 * Gerencia o roteamento principal (React Router v7) e os provedores de contexto globais.
 */
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Categories from './pages/Categories';
import Submit from './pages/Submit';
import RecipeDetail from './pages/RecipeDetail';
import ManageRecipes from './pages/ManageRecipes';
import AdminDashboard from './pages/AdminDashboard';
import Manifesto from './pages/Manifesto';
import RegisterCollaborator from './pages/RegisterCollaborator';
import UserManagement from './pages/UserManagement';
import Profile from './pages/Profile';
import Lounge from './pages/Lounge';
import SpicesHistory from './pages/SpicesHistory';
import Acervo from './pages/Acervo';
import SaucesGuide from './pages/acervo/SaucesGuide';
import AlchemistPanel from './pages/AlchemistPanel';
import BBQCalculator from './pages/BBQCalculator';
import Mercado from './pages/Mercado';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { GlobalQuizPopup } from './components/GlobalQuizPopup';

import { TelemetryTracker } from './components/TelemetryTracker';
import WelcomePopup from './components/WelcomePopup';
import { UserProgress } from './types/onboarding';
export default function App() {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("alquimia_progress");
    if (!stored) {
      setIsOnboardingOpen(true);
    }
  }, []);

  const handleCompleteOnboarding = (progress: UserProgress) => {
    localStorage.setItem("alquimia_progress", JSON.stringify(progress));
    setIsOnboardingOpen(false);
  };

  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <TelemetryTracker />
          <ScrollToTop />
          <GlobalQuizPopup />
          <WelcomePopup 
            isOpen={isOnboardingOpen} 
            onComplete={handleCompleteOnboarding} 
            onClose={() => setIsOnboardingOpen(false)} 
          />
          <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/register-collaborator" element={<RegisterCollaborator />} />
            <Route path="/register" element={<RegisterCollaborator />} />
            
            {/* Protected Client Routes */}
            <Route path="/submit" element={<ProtectedRoute><Submit /></ProtectedRoute>} />
            <Route path="/submit/:id" element={<ProtectedRoute><Submit /></ProtectedRoute>} />
            <Route path="/manage" element={<ProtectedRoute><ManageRecipes /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:uid" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/meu-perfil/alquimista" element={<ProtectedRoute requireAdmin><AlchemistPanel /></ProtectedRoute>} />
            <Route path="/lounge" element={<ProtectedRoute><Lounge /></ProtectedRoute>} />
            
            {/* Admin Only Routes */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>} />
            
            <Route path="/recipe/:id" element={<RecipeDetail />} />
            <Route path="/receita/:slug" element={<RecipeDetail />} />
            <Route path="/manifesto" element={<Manifesto />} />
            <Route path="/historia-das-especiarias" element={<SpicesHistory />} />
            <Route path="/acervo" element={<ProtectedRoute><Acervo /></ProtectedRoute>} />
            <Route path="/acervo/guia-dos-molhos" element={<ProtectedRoute><SaucesGuide /></ProtectedRoute>} />
            <Route path="/mercado" element={<ProtectedRoute><Mercado /></ProtectedRoute>} />
            <Route path="/calculadora-churrasco" element={<BBQCalculator />} />

            
            <Route path="*" element={<Home />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  </ThemeProvider>
  );
}
