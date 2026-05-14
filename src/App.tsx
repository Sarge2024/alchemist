/**
 * App.tsx
 * Componente raiz da aplicação Alchemist.
 * Gerencia o roteamento principal (React Router v7) e os provedores de contexto globais.
 */
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
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

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/register-collaborator" element={<RegisterCollaborator />} />
            
            {/* Protected Client Routes */}
            <Route path="/submit" element={<ProtectedRoute><Submit /></ProtectedRoute>} />
            <Route path="/submit/:id" element={<ProtectedRoute><Submit /></ProtectedRoute>} />
            <Route path="/manage" element={<ProtectedRoute><ManageRecipes /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/:uid" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/lounge" element={<ProtectedRoute><Lounge /></ProtectedRoute>} />
            
            {/* Admin Only Routes */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute requireAdmin><UserManagement /></ProtectedRoute>} />
            
            <Route path="/recipe/:id" element={<RecipeDetail />} />
            <Route path="/manifesto" element={<Manifesto />} />
            <Route path="/historia-das-especiarias" element={<SpicesHistory />} />
            <Route path="/acervo" element={<Acervo />} />

            
            <Route path="*" element={<Home />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  </ThemeProvider>
  );
}
