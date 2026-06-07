import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();

  const [showSpinner, setShowSpinner] = React.useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (loading) {
      // Aguarda 300ms antes de mostrar o spinner para evitar flashes rápidos (flicker)
      timer = setTimeout(() => setShowSpinner(true), 300);
    } else {
      setShowSpinner(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  if (loading) {
    if (!showSpinner) return null; // Retorna nulo no início para uma transição suave

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-on-surface-variant font-medium">Verificando credenciais...</p>
      </div>
    );
  }

  const isDevBypass = !!import.meta.env.DEV;

  if (!user && !isDevBypass) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin && !isDevBypass) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
