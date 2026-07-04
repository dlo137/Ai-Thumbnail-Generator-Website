import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getCredits } from '../services/generationService';

interface CreditsContextValue {
  current: number;
  max: number;
  loading: boolean;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextValue | null>(null);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [current, setCurrent] = useState(0);
  const [max, setMax] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshCredits = useCallback(async () => {
    if (!user) {
      setCurrent(0);
      setMax(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const result = await getCredits();
      setCurrent(result.current);
      setMax(result.max);
    } catch {
      setCurrent(0);
      setMax(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCredits();
  }, [refreshCredits]);

  return (
    <CreditsContext.Provider value={{ current, max, loading, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits(): CreditsContextValue {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error('useCredits must be used within a CreditsProvider');
  return ctx;
}
