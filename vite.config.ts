import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.png', 'apple-touch-icon.png'],
        workbox: {
          maximumFileSizeToCacheInBytes: 10000000,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
        },
        manifest: {
          name: 'Alchemist Lounge Gastronômico',
          short_name: 'Alchemist',
          description: 'A rede social linear para entusiastas da culinária.',
          theme_color: '#F59E0B',
          background_color: '#FDFCFB',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-icon-192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || null),
      'process.env.GEMINI_API_KEYS': JSON.stringify(env.GEMINI_API_KEYS || null),
      'process.env.GEMINI_API_KEY_1': JSON.stringify(env.GEMINI_API_KEY_1 || null),
      'process.env.GEMINI_API_KEY_2': JSON.stringify(env.GEMINI_API_KEY_2 || null),
      'process.env.GEMINI_API_KEY_3': JSON.stringify(env.GEMINI_API_KEY_3 || null),
      'process.env.GEMINI_API_KEY_4': JSON.stringify(env.GEMINI_API_KEY_4 || null),
      'process.env.GEMINI_API_KEY_5': JSON.stringify(env.GEMINI_API_KEY_5 || null),
      'process.env.GEMINI_API_KEY_6': JSON.stringify(env.GEMINI_API_KEY_6 || null),
      'process.env.GEMINI_API_KEY_7': JSON.stringify(env.GEMINI_API_KEY_7 || null),
      'process.env.GEMINI_API_KEY_8': JSON.stringify(env.GEMINI_API_KEY_8 || null),
      'process.env.GEMINI_API_KEY_9': JSON.stringify(env.GEMINI_API_KEY_9 || null),
      'process.env.GEMINI_API_KEY_10': JSON.stringify(env.GEMINI_API_KEY_10 || null),
    },
    resolve: {
      alias: {
        '@domain': path.resolve(__dirname, './src/domain'),
        '@infra': path.resolve(__dirname, './src/infra'),
        '@ui': path.resolve(__dirname, './src/ui'),
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true' ? { port: 24680 } : false,
    },
  };
});
