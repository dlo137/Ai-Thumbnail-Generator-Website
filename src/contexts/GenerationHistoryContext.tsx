import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';

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

const STORAGE_KEY_PREFIX = 'generation_history';
const MAX_HISTORY_ENTRIES = 200;

const GenerationHistoryContext = createContext<GenerationHistoryContextValue | null>(null);

// Namespaced per signed-in user — without this, every account that ever logs
// into this browser reads and writes the exact same localStorage key, so
// switching accounts (or a shared/dev machine) would show one user's
// thumbnails as another user's history. Falls back to a distinct
// "anonymous" bucket for the no-real-session dev bypass, which never mixes
// with any real account's key.
function storageKeyFor(userId: string | undefined): string {
  return `${STORAGE_KEY_PREFIX}_${userId ?? 'anonymous'}`;
}

function readFromStorage(key: string): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(key);
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
// thumbnailStorage.ts here) — a per-user-namespaced localStorage store
// instead (see storageKeyFor), capped at MAX_HISTORY_ENTRIES most-recent
// entries. Note: the underlying image URLs are signed Supabase Storage links
// with a 7-day expiry — old entries will eventually stop loading.
export function GenerationHistoryProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const storageKey = storageKeyFor(user?.id);
  const [history, setHistory] = useState<HistoryEntry[]>(() => readFromStorage(storageKey));
  // Tracks which key `history` currently reflects. Adjusted during render
  // (React's documented pattern for "derived state reset on prop change"),
  // not in an effect — an effect would commit the OLD user's in-memory
  // history into the NEW user's storage key for one render before the
  // reload got a chance to replace it.
  const [loadedKey, setLoadedKey] = useState(storageKey);

  if (loadedKey !== storageKey) {
    setLoadedKey(storageKey);
    setHistory(readFromStorage(storageKey));
  }

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(history));
  }, [storageKey, history]);

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
