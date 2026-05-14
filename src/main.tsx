/**
 * main.tsx
 * Ponto de entrada da aplicação Vite/React.
 * Inicializa o renderizador do React (DOM) e registra o Service Worker para suporte a PWA.
 */
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Registra o Service Worker do PWA para atualizações automáticas
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
