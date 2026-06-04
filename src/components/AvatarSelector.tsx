import React, { useState } from 'react';
import { Lock } from 'lucide-react';

export interface AvatarOptionData {
  id: string;
  codigo: string;
  url: string;
  bloqueado: boolean;
  config: {
    genero: string;
    idade: string;
    pele: string;
  };
}

interface AvatarSelectorProps {
  avatares: AvatarOptionData[];
  avatarAtualUrl: string;
  onSelect: (url: string) => void;
  onClose?: () => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ avatares, avatarAtualUrl, onSelect, onClose }) => {
  const [generoFilter, setGeneroFilter] = useState<string | null>(null);
  const [peleFilter, setPeleFilter] = useState<string | null>(null);

  const filteredAvatars = avatares.filter(avatar => {
    if (generoFilter && avatar.config.genero !== generoFilter) return false;
    if (peleFilter && avatar.config.pele !== peleFilter) return false;
    return true;
  });

  return (
    <div className="bg-surface-container-low rounded-3xl p-6 border border-surface-container-high shadow-xl max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-on-surface">Escolha seu Avatar</h3>
        {onClose && (
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface p-2">
            X
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-6 mb-8">
        <div className="space-y-2">
          <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Gênero</p>
          <div className="flex gap-2">
            <button 
              onClick={() => setGeneroFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${generoFilter === null ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setGeneroFilter('m')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${generoFilter === 'm' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              Masculino
            </button>
            <button 
              onClick={() => setGeneroFilter('f')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${generoFilter === 'f' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              Feminino
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-on-surface-variant uppercase tracking-wider text-[10px]">Tom de Pele</p>
          <div className="flex gap-2">
            <button 
              onClick={() => setPeleFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${peleFilter === null ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setPeleFilter('cl')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${peleFilter === 'cl' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              Clara
            </button>
            <button 
              onClick={() => setPeleFilter('pa')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${peleFilter === 'pa' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              Parda
            </button>
            <button 
              onClick={() => setPeleFilter('es')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${peleFilter === 'es' ? 'bg-primary text-white' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
            >
              Escura
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Avatares */}
      {filteredAvatars.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          Nenhum avatar encontrado com esses filtros.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 md:grid-cols-4 lg:grid-cols-6 max-h-[50vh] overflow-y-auto p-2 scrollbar-thin">
          {filteredAvatars.map((avatar) => {
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
