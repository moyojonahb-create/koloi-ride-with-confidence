import { useState, useEffect } from 'react';

type DataMode = 'high' | 'low' | 'offline';

interface NetworkInfo extends EventTarget {
  saveData?: boolean;
  effectiveType?: string;
  downlink?: number;
}

/**
 * Detects whether user is on a low-data connection.
 * Works on any bandwidth — adjusts polling intervals & image quality.
 */
export function useDataMode(): { mode: DataMode; pollInterval: number } {
  const [mode, setMode] = useState<DataMode>('high');

  useEffect(() => {
    const update = () => {
      if (!navigator.onLine) { setMode('offline'); return; }

      const conn = (navigator as Navigator & { connection?: NetworkInfo }).connection;
      if (conn?.saveData) { setMode('low'); return; }
      if (conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g' || conn?.effectiveType === '3g') {
        setMode('low'); return;
      }
      if (conn?.downlink != null && conn.downlink < 1.5) { setMode('low'); return; }
      setMode('high');
    };

    update();

    const conn = (navigator as Navigator & { connection?: NetworkInfo }).connection;
    conn?.addEventListener?.('change', update);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);

    return () => {
      conn?.removeEventListener?.('change', update);
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Adaptive polling: low data = less frequent polls
  const pollInterval = mode === 'low' ? 30000 : mode === 'offline' ? 60000 : 10000;

  return { mode, pollInterval };
}
