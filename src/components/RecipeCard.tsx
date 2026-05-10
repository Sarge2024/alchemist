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
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -8 }}
      className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-stone-100 flex flex-col h-full group"
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={getAssetUrl(image || ASSETS.DEFAULT_RECIPE)}
          alt={title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = ASSETS.DEFAULT_RECIPE;
          }}
        />
        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {recipe.isClassic && (
            <span className="px-3 py-1 bg-primary text-white text-[10px] font-bold rounded-full shadow-sm uppercase tracking-wider flex items-center gap-1">
              <Star className="w-2.5 h-2.5 fill-white" />
              Clássica
            </span>
          )}
          {momento && momento.length > 0 && (
            <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-primary text-[10px] font-bold rounded-full shadow-sm uppercase tracking-wider">
              {momento[0]}
            </span>
          )}
          {custo_estimado && (
            <span className="px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-[10px] font-bold rounded-lg shadow-sm">
              {custo_estimado}
            </span>
          )}
        </div>
        {rating && (
          <div className="absolute bottom-4 right-4 px-2 py-1 bg-primary text-white text-xs font-bold rounded-lg flex items-center gap-1 shadow-lg">
            <Star className="w-3 h-3 fill-white" />
            {rating.toFixed(1)}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-6 flex flex-col flex-1">
        <h3 className="text-xl font-bold text-on-surface mb-2 line-clamp-2 min-h-[3.5rem] group-hover:text-primary transition-colors">
          {title}
        </h3>

        <div className="flex items-center gap-4 mb-6 text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{time || '20 min'}</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-stone-200 pl-4">
            <Gauge className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{difficulty || 'Fácil'}</span>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="text-xs text-on-surface-variant italic font-medium">
            {reviewsCount || 0} avaliações
          </div>
          <Link
            to={`/recipe/${id}`}
            className="inline-flex items-center gap-2 bg-stone-100 hover:bg-primary hover:text-white text-primary font-bold px-4 py-2 rounded-xl transition-all active:scale-95 text-sm group/btn"
          >
            Ver Receita
            <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};
