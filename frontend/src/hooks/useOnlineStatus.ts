import { useState, useEffect } from 'react';
import { drainQueue, getQueueSize, type SyncResult } from '../lib/portariaQueue';

interface OnlineStatus {
  isOnline:   boolean;
  queueSize:  number;
  syncing:    boolean;
  lastSync:   Date | null;
  lastResult: SyncResult | null;
}

export function useOnlineStatus(): OnlineStatus {
  const [isOnline,   setIsOnline]   = useState(navigator.onLine);
  const [queueSize,  setQueueSize]  = useState(0);
  const [syncing,    setSyncing]    = useState(false);
  const [lastSync,   setLastSync]   = useState<Date | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);

  // Atualiza tamanho da fila periodicamente
  useEffect(() => {
    getQueueSize().then(setQueueSize);
    const id = setInterval(() => getQueueSize().then(setQueueSize), 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const size = await getQueueSize();
      setQueueSize(size);
      if (size === 0) return;

      setSyncing(true);
      try {
        const result = await drainQueue();
        setLastResult(result);
        setLastSync(new Date());
        setQueueSize(await getQueueSize());
      } finally {
        setSyncing(false);
      }
    };

    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    // Tenta drenar fila se já estiver online com itens pendentes (ex: reload após offline)
    if (navigator.onLine) handleOnline();

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, queueSize, syncing, lastSync, lastResult };
}
