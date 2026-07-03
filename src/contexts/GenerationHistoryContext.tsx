import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

export interface HistoryEntry {
  id: string;
  imageUrl: string;
  prompt: string;
  createdAt: number;
  favorited: boolean;
}

interface GenerationHistoryContextValue {
  history: HistoryEntry[];
  /** Records a generated thumbnail — called automatically after every
   *  successful generation (batch or single-image edit), not just saved ones. */
  addToHistory: (imageUrl: string, prompt: string) => void;
  isSaved: (imageUrl: string) => boolean;
  /** Flips the `favorited` flag on the matching entry (creating one first if
   *  somehow missing) — the heart button on the home page/editing view. */
  toggleSaved: (imageUrl: string, prompt: string) => void;
  /** Removes the entry entirely — distinct from un-saving, which just clears
   *  the favorited flag but keeps the entry in "All". */
  removeFromHistory: (imageUrl: string) => void;
}

const STORAGE_KEY = 'generation_history';
const MAX_HISTORY_ENTRIES = 200;

const GenerationHistoryContext = createContext<GenerationHistoryContextValue | null>(null);

function readFromStorage(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Every generated thumbnail is recorded here automatically — this backs the
// History page's "All" filter. "Saved" is just a `favorited` flag on top of
// the same entries (the heart button), not a separate list, so un-hearting
// something doesn't remove it from history — only the delete button does that.
// No Supabase table for this (no equivalent of the mobile app's
// thumbnailStorage.ts here) — a lightweight localStorage store instead,
// capped at MAX_HISTORY_ENTRIES most-recent entries. Note: the underlying
// image URLs are signed Supabase Storage links with a 7-day expiry — old
// entries will eventually stop loading.
export function GenerationHistoryProvider({ children }: { children: ReactNode }) {
  const [history, setHistory] = useState<HistoryEntry[]>(() => readFromStorage());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const addToHistory = useCallback((imageUrl: string, prompt: string) => {
    setHistory((prev) => {
      if (prev.some((h) => h.imageUrl === imageUrl)) return prev;
      const next = [
        { id: crypto.randomUUID(), imageUrl, prompt, createdAt: Date.now(), favorited: false },
        ...prev,
      ];
      return next.slice(0, MAX_HISTORY_ENTRIES);
    });
  }, []);

  const isSaved = useCallback(
    (imageUrl: string) => history.some((h) => h.imageUrl === imageUrl && h.favorited),
    [history]
  );

  const toggleSaved = useCallback((imageUrl: string, prompt: string) => {
    setHistory((prev) => {
      if (prev.some((h) => h.imageUrl === imageUrl)) {
        return prev.map((h) => (h.imageUrl === imageUrl ? { ...h, favorited: !h.favorited } : h));
      }
      // Defensive fallback — normally addToHistory already created this entry.
      return [{ id: crypto.randomUUID(), imageUrl, prompt, createdAt: Date.now(), favorited: true }, ...prev];
    });
  }, []);

  const removeFromHistory = useCallback((imageUrl: string) => {
    setHistory((prev) => prev.filter((h) => h.imageUrl !== imageUrl));
  }, []);

  return (
    <GenerationHistoryContext.Provider
      value={{ history, addToHistory, isSaved, toggleSaved, removeFromHistory }}
    >
      {children}
    </GenerationHistoryContext.Provider>
  );
}

export function useGenerationHistory(): GenerationHistoryContextValue {
  const ctx = useContext(GenerationHistoryContext);
  if (!ctx) throw new Error('useGenerationHistory must be used within a GenerationHistoryProvider');
  return ctx;
}
