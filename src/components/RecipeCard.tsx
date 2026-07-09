/**
 * RecipeCard.tsx
 * Componente de card para exibição resumida de uma receita.
 * Apresenta imagem, título, tempo de preparo, dificuldade e avaliação.
 * Utilizado em grids de listagem e na home.
 */
import React from 'react';
import { motion } from 'motion/react';
import { Clock, Star, Gauge, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Recipe } from '../infra/services/recipeService';

import { ASSETS, getAssetUrl } from '../lib/assets';

interface RecipeCardProps {
  recipe: Recipe;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({ recipe }) => {
  const { id, title, image, time, difficulty, rating, reviewsCount, momento, custo_estimado } = recipe;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8 }}
      className="bg-surface-container-lowest rounded-2xl md:rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-surface-container-high flex flex-col h-full group"
    >
      {/* Image Section */}
      <div className="relative aspect-[4/5] md:aspect-[4/3] overflow-hidden">
        <img
          src={getAssetUrl(image || ASSETS.DEFAULT_RECIPE)}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = ASSETS.DEFAULT_RECIPE;
          }}
        />
        <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-wrap gap-1 md:gap-2">
          {recipe.isClassic && (
            <span className="px-2 py-0.5 md:px-3 md:py-1 bg-primary text-white text-[8px] md:text-[10px] font-bold rounded-full shadow-sm uppercase tracking-wider flex items-center gap-1">
              <Star className="w-2 h-2 md:w-2.5 md:h-2.5 fill-white" />
              Clássica
            </span>
          )}
          {momento && momento.length > 0 && (
            <span className="px-2 py-0.5 md:px-3 md:py-1 bg-white/90 backdrop-blur-md text-primary text-[8px] md:text-[10px] font-bold rounded-full shadow-sm uppercase tracking-wider">
              {momento[0]}
            </span>
          )}
          {custo_estimado && (
            <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-black/60 backdrop-blur-sm text-white text-[8px] md:text-[10px] font-bold rounded-md md:rounded-lg shadow-sm">
              {custo_estimado}
            </span>
          )}
        </div>
        {rating && reviewsCount > 0 ? (
          <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 px-1.5 py-0.5 md:px-2 md:py-1 bg-primary text-white text-[10px] md:text-xs font-bold rounded-md md:rounded-lg flex items-center gap-1 shadow-lg">
            <Star className="w-2.5 h-2.5 md:w-3 md:h-3 fill-white" />
            {rating.toFixed(1)}
          </div>
        ) : (
          <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 px-1.5 py-0.5 md:px-2 md:py-1 bg-black/40 backdrop-blur-sm text-white text-[8px] md:text-[10px] font-bold rounded-md md:rounded-lg flex items-center gap-1 shadow-lg">
            Nova
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-3.5 md:p-6 flex flex-col flex-1">
        <h3 className="text-sm md:text-xl font-bold text-on-surface mb-1 md:mb-2 line-clamp-2 min-h-[2.5rem] md:min-h-[3.5rem] group-hover:text-primary transition-colors">
          {title}
        </h3>

        {recipe.nutrition && (
          <div className="flex flex-wrap gap-1.5 md:gap-2 mb-2 md:mb-3">
            <span className="text-[9px] md:text-[11px] font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-md flex gap-1 items-center">
              <span className="font-bold text-amber-600">{Math.round(recipe.nutrition.calories || 0)}</span>
              <span className="opacity-75">kcal</span>
            </span>
            <span className="text-[9px] md:text-[11px] font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-md flex gap-1 items-center">
              <span className="font-bold text-blue-600">{Math.round(recipe.nutrition.protein || 0)}g</span>
              <span className="opacity-75">P</span>
            </span>
            <span className="text-[9px] md:text-[11px] font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-md flex gap-1 items-center">
              <span className="font-bold text-emerald-600">{Math.round(recipe.nutrition.carbs || 0)}g</span>
              <span className="opacity-75">C</span>
            </span>
            <span className="text-[9px] md:text-[11px] font-medium text-on-surface-variant bg-surface-container px-1.5 py-0.5 rounded-md flex gap-1 items-center">
              <span className="font-bold text-rose-600">{Math.round(recipe.nutrition.fat || 0)}g</span>
              <span className="opacity-75">G</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-6 text-on-surface-variant">
          <div className="flex items-center gap-1 md:gap-1.5">
            <Clock className="w-3 h-3 md:w-4 md:h-4 text-primary" />
            <span className="text-[10px] md:text-sm font-medium">{time || '20 min'}</span>
          </div>
          <div className="flex items-center gap-1 md:gap-1.5 border-l border-surface-container-high pl-2 md:pl-4">
            <Gauge className="w-3 h-3 md:w-4 md:h-4 text-primary" />
            <span className="text-[10px] md:text-sm font-medium">{difficulty || 'Fácil'}</span>
          </div>
        </div>

        <div className="mt-auto pt-2 border-t md:border-none border-outline-variant/30 flex items-center justify-between">
          <div className="text-[9px] md:text-xs text-on-surface-variant italic font-medium">
            {reviewsCount && reviewsCount > 0 ? `${reviewsCount} avaliações` : 'Sem avaliações'}
          </div>
          <Link
            to={`/receita/${recipe.slug || id}`}
            className="inline-flex items-center gap-1 md:gap-2 bg-surface-container-high hover:bg-primary hover:text-white text-primary font-bold px-2 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl transition-all active:scale-95 text-[10px] md:text-sm group/btn"
          >
            Ver Receita
            <ArrowRight className="w-3 h-3 md:w-4 md:h-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
