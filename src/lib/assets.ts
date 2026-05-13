/**
 * Central de Ativos do Projeto
 * Facilita a manutenção e troca de imagens em todo o ecossistema.
 */

export const ASSETS = {
  MANIFESTO: {
    VISION_HERO: 'https://images.unsplash.com/photo-1504387828636-adeb507f7ced?auto=format&fit=crop&q=80&w=1400',
    STORY_DECOR: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80',
  },
  HOME: {
    HERO: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=1400',
    COMMUNITY: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&q=80&w=1200',
    COLLABORATOR_REGISTER: 'https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&q=80&w=1200',
  },
  CATEGORIES: {
    BREAKFAST: 'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&q=80&w=800',
    LUNCH: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&q=80&w=800',
    DINNER: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&q=80&w=800',
    DRINKS: 'https://images.unsplash.com/photo-1541529086526-db283c563270?auto=format&fit=crop&q=80&w=800',
    DESSERTS: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&q=80&w=800',
    SNACKS: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&q=80&w=800',
  },
  MOCKS: {
    TAPIOCA: 'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d?auto=format&fit=crop&q=80&w=800',
    FEIJOADA: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&q=80&w=800',
    SALMON: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800',
    BRUNCH: 'https://images.unsplash.com/photo-1528975604071-b4dc52a2d18c?auto=format&fit=crop&q=80&w=800',
  },
  BRAND: {
    LOGO_PLACEHOLDER: 'https://images.unsplash.com/photo-1547517023-7ca0c162f816?auto=format&fit=crop&q=80&w=200',
    FAVICON: '/favicon.ico',
  },
  DEFAULT_RECIPE: 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&q=80',
};

/**
 * Helper para resolver caminhos de imagem.
 * Se a imagem começar com http, retorna ela mesma.
 * Se for apenas um nome de arquivo, assume que está em /assets/images/
 */
export const getAssetUrl = (path: string | undefined | null) => {
  if (!path) return ASSETS.DEFAULT_RECIPE;
  
  const cleanPath = path.trim();
  
  if (
    cleanPath.startsWith('http') || 
    cleanPath.startsWith('blob:') || 
    cleanPath.startsWith('data:')
  ) {
    // Handle Google Drive links to make them direct image links
    if (cleanPath.includes('drive.google.com')) {
      const driveId = cleanPath.match(/\/d\/([^\/]+)/)?.[1] || cleanPath.match(/id=([^&]+)/)?.[1];
      if (driveId) {
        return `https://drive.google.com/uc?export=view&id=${driveId}`;
      }
    }
    return cleanPath;
  }

  let finalPath = cleanPath;
  
  // Strip /public/ or public/ prefix if present
  if (finalPath.startsWith('/public/')) {
    finalPath = finalPath.replace('/public/', '/');
  } else if (finalPath.startsWith('public/')) {
    finalPath = '/' + finalPath.replace('public/', '');
  }

  // Handle case where path is a local filename 'recipe-...' or 'downloaded-...'
  // without the '/uploads/' prefix
  const uploadMatch = finalPath.match(/^\/?((?:recipe|downloaded|upload)-.*)$/);
  if (uploadMatch && !finalPath.includes('uploads')) {
    finalPath = '/uploads/' + uploadMatch[1];
  }

  // Ensure it starts with a /
  if (!finalPath.startsWith('/')) {
    finalPath = '/' + finalPath;
  }

  // Prevent double slashes throughout the path (except for http://)
  if (!finalPath.startsWith('http')) {
    finalPath = finalPath.replace(/\/+/g, '/');
  }

  // If path is basically empty after stripping, return default
  if (finalPath === '/' || finalPath === '') return ASSETS.DEFAULT_RECIPE;
  
  return finalPath;
};
