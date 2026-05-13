import React, { useState } from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallbackText?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Componente de Avatar unificado.
 * Lida com falhas de carregamento de imagem e fallback para iniciais.
 */
export const Avatar: React.FC<AvatarProps> = ({ 
  src, 
  alt = 'Usuário', 
  className = '', 
  fallbackText = '?',
  size = 'md'
}) => {
  const [error, setError] = useState(false);

  const getInitials = (text: string) => {
    return text
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-stone-500', 'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 
      'bg-violet-500', 'bg-rose-500', 'bg-orange-500', 'bg-teal-500'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const initials = getInitials(alt || fallbackText);
  const bgColor = getAvatarColor(alt || fallbackText);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  if (!src || error) {
    return (
      <div className={`${sizeClasses[size]} rounded-xl ${bgColor} flex items-center justify-center text-white font-bold shadow-inner ${className}`}>
        {initials}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 ${className}`}>
      <img
        src={src}
        alt={alt}
        onError={() => setError(true)}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
};
