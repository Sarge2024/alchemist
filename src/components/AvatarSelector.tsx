import React, { useState } from 'react';
import { Lock } from 'lucide-react';

export interface AvatarOptionData {
  id: string;
  codigo: string;
  url: string;
  bloqueado: boolean;
  tierMinimo: string;
}

interface AvatarSelectorProps {
  avatares: AvatarOptionData[];
  avatarAtualUrl: string;
  onSelect: (url: string) => void;
  onClose?: () => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ avatares, avatarAtualUrl, onSelect, onClose }) => {
  return (
    <div className="bg-surface-container-low rounded-3xl p-6 border border-surface-container-high shadow-xl max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-on-surface">Escolha seu Avatar</h3>
          <p className="text-sm text-on-surface-variant mt-1">
            Selecione a imagem que melhor representa você. Novos avatares são liberados ao subir de nível!
          </p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-2 bg-surface-container rounded-full hover:bg-surface-container-high transition-colors">
            X
          </button>
        )}
      </div>

      {/* Grid de Avatares */}
      {avatares.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          Nenhum avatar encontrado com esses filtros.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-6 max-h-[50vh] overflow-y-auto p-2 scrollbar-thin">
          {avatares.map((avatar) => {
            const isSelected = avatar.url === avatarAtualUrl;
            
            return (
              <button
                key={avatar.id}
                disabled={avatar.bloqueado}
                onClick={() => onSelect(avatar.url)}
                className={`relative aspect-square p-1 rounded-full transition-all duration-300 ${
                  avatar.bloqueado 
                    ? 'opacity-40 cursor-not-allowed grayscale' 
                    : 'hover:scale-105 active:scale-95 cursor-pointer'
                } ${
                  isSelected ? 'ring-4 ring-amber-500 bg-amber-500/10 scale-105' : 'ring-2 ring-stone-200 hover:ring-primary/50'
                }`}
                title={avatar.bloqueado ? 'Nível Insuficiente' : 'Selecionar Avatar'}
              >
                <img 
                  src={avatar.url} 
                  alt={`Avatar ${avatar.codigo}`} 
                  className="w-full h-full rounded-full object-cover"
                />
                
                {avatar.bloqueado && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 rounded-full text-white">
                    <Lock className="w-5 h-5 mb-1 opacity-80" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
