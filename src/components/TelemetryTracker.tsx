import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HEARTBEAT_INTERVAL_MS = 60000; // 60 segundos

export const TelemetryTracker: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();
  const heartbeatTimer = useRef<number | null>(null);

  // Enviar PageView
  useEffect(() => {
    if (user && user.uid) {
      const sendPageView = async () => {
        try {
          await fetch('/api/telemetry/pageview', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': import.meta.env.VITE_APP_API_KEY || 'development_key'
            },
            body: JSON.stringify({
              uid: user.uid,
              path: location.pathname + location.search
            })
          });
        } catch (err) {
          console.error('[Telemetry] Failed to send pageview:', err);
        }
      };
      sendPageView();
    }
  }, [location, user]);

  // Enviar Heartbeat
  useEffect(() => {
    if (!user || !user.uid) return;

    const sendHeartbeat = async () => {
      // Apenas envia o heartbeat se a aba estiver visível
      if (document.visibilityState !== 'visible') return;
      
      try {
        await fetch('/api/telemetry/heartbeat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': import.meta.env.VITE_APP_API_KEY || 'development_key'
          },
          body: JSON.stringify({
            uid: user.uid,
            durationSeconds: HEARTBEAT_INTERVAL_MS / 1000
          })
        });
      } catch (err) {
        console.error('[Telemetry] Failed to send heartbeat:', err);
      }
    };

    // Primeiro disparo após o intervalo inicial
    heartbeatTimer.current = window.setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    return () => {
      if (heartbeatTimer.current) {
        clearInterval(heartbeatTimer.current);
      }
    };
  }, [user]);

  return null;
};
