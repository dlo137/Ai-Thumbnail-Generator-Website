import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useGenerationHistory } from '../contexts/GenerationHistoryContext';
import { useToast } from '../contexts/ToastContext';
import { downloadImage } from '../utils/imageUtils';

// download="..." picks the SAVED filename regardless of the (opaque, UUID-based)
// signed-URL path — gives downloads a clean name instead of a random string.
function downloadFilename(title: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
  return `${slug || 'thumbnail'}-${date}.png`;
}

type Filter = 'All' | 'Saved';

interface HistoryItem {
  id: string;
  title: string;
  version: string;
  date: string;
  resolution: string;
  image: string;
  favorited: boolean;
}

function HistoryCard({
  item,
  locked,
  onToggleFavorite,
  onDelete,
  onEdit,
  onDownload,
  onShare,
}: {
  item: HistoryItem;
  /** No active subscription — blur the thumbnail and hide every action
   *  (edit/download/save/share/delete) behind a lock overlay, matching the
   *  home page's teaser treatment. Nothing about a past generation is usable
   *  until the user subscribes. */
  locked: boolean;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (imageUrl: string) => void;
  onDownload: () => void;
  onShare: () => void;
}) {
  return (
    <div className="group relative bg-[#151a21] rounded-lg overflow-hidden transition-all duration-300 hover:-translate-y-1 border border-[#232932] shadow-[0_10px_40px_rgba(0,0,0,0.3)]">
      <div className="aspect-video relative overflow-hidden">
        <img
          className={`w-full h-full object-cover transition-transform duration-700 ${
            locked ? 'blur-2xl scale-110' : 'group-hover:scale-105'
          }`}
          src={item.image}
          alt={item.title}
        />

        {locked ? (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 text-center px-4">
            <span className="material-symbols-outlined text-3xl text-on-surface drop-shadow-lg">lock</span>
            <Link
              to="/pricing"
              className="text-xs font-bold text-on-surface bg-primary px-3 py-1.5 rounded-full hover:brightness-110 transition-all"
            >
              Subscribe to unlock
            </Link>
          </div>
        ) : (
          <>
            {item.favorited && (
              <div className="absolute top-4 right-4 z-10">
                <div className="bg-tertiary/20 backdrop-blur-md p-2 rounded-full shadow-[0_0_15px_rgba(249,189,34,0.3)] border border-tertiary/30">
                  <span
                    className="material-symbols-outlined text-tertiary text-sm"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                </div>
              </div>
            )}

            <div className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button
                onClick={() => onEdit(item.image)}
                title="Focus and edit this thumbnail"
                className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all active:scale-90"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
              <button
                onClick={onDownload}
                className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all active:scale-90"
              >
                <span className="material-symbols-outlined text-lg">download</span>
              </button>
              {!item.favorited && (
                <button
                  onClick={() => onToggleFavorite(item.id)}
                  className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-tertiary hover:text-on-tertiary transition-all active:scale-90"
                >
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 0" }}>
                    favorite
                  </span>
                </button>
              )}
              <button
                onClick={onShare}
                className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-primary hover:text-on-primary transition-all active:scale-90"
              >
                <span className="material-symbols-outlined text-lg">share</span>
              </button>
              <button
                onClick={() => onDelete(item.id)}
                className="w-10 h-10 rounded-full bg-error-container text-on-error-container flex items-center justify-center hover:bg-error hover:text-on-error transition-all active:scale-90"
              >
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          </>
        )}
      </div>

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-headline font-bold text-lg text-on-surface group-hover:text-primary transition-colors">
            {item.title}
          </h3>
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant bg-surface-container px-2 py-1 rounded">
            {item.version}
          </span>
        </div>
        <p className="text-sm text-outline font-medium">
          {item.resolution ? `${item.date} • ${item.resolution}` : item.date}
        </p>
      </div>
    </div>
  );
}

interface HistoryPageProps {
  /** Focuses HomePage's single-thumbnail editing view on this image (the same
   *  view the "+" hover button on the home page grid opens), so a history/saved
   *  thumbnail can be tweaked further via a new prompt. */
  onEditThumbnail: (imageUrl: string) => void;
  /** NavBar's search box (only shown on this page) — simple case-insensitive
   *  substring match against each card's prompt, live as the user types. */
  searchQuery?: string;
}

export default function HistoryPage({ onEditThumbnail, searchQuery = '' }: HistoryPageProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  // No active subscription — every card blurs and hides its actions behind
  // a lock overlay, same as the home page's teaser. `profile` is null before
  // it loads or for the no-real-session dev bypass, and both should fail
  // closed (locked) rather than briefly flashing unlocked content.
  const isLocked = !profile?.is_pro_version;
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  // Every generated thumbnail (full batch or a single edit) shows up here
  // automatically via GenerationHistoryContext — "Saved" is just the
  // `favorited` flag on top of the same entries, toggled by the heart button.
  const { history, toggleSaved, removeFromHistory } = useGenerationHistory();
  const { showToast } = useToast();
  const filters: Filter[] = ['All', 'Saved'];
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const displayed: HistoryItem[] = history
    .filter((h) => (activeFilter === 'Saved' ? h.favorited : true))
    .filter((h) => (normalizedQuery ? h.prompt.toLowerCase().includes(normalizedQuery) : true))
    .map((h) => ({
      id: h.id,
      title: h.prompt ? (h.prompt.length > 48 ? `${h.prompt.slice(0, 48)}…` : h.prompt) : 'Generated thumbnail',
      version: h.favorited ? 'Saved' : 'Generated',
      date: new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      resolution: '',
      image: h.imageUrl,
      favorited: h.favorited,
    }));

  function toggleFavorite(id: string) {
    const entry = history.find((h) => h.id === id);
    if (entry) {
      toggleSaved(entry.imageUrl, entry.prompt);
      showToast('Saved!');
    }
  }

  function deleteItem(id: string) {
    const entry = history.find((h) => h.id === id);
    if (entry) {
      removeFromHistory(entry.imageUrl);
      showToast('Removed from history');
    }
  }

  // Same blob-based approach as the home page — a plain <a href download> only
  // forces a real download for same-origin URLs; these signed Supabase Storage
  // links are cross-origin, so browsers were silently ignoring `download` and
  // just opening a new tab instead.
  async function handleDownload(item: HistoryItem) {
    try {
      await downloadImage(item.image, downloadFilename(item.title));
      showToast('Downloaded!');
    } catch {
      showToast('Download failed. Please try again.');
    }
  }

  async function handleShare(item: HistoryItem) {
    try {
      if (navigator.share) {
        await navigator.share({ title: item.title, url: item.image });
        showToast('Shared!');
      } else {
        await navigator.clipboard.writeText(item.image);
        showToast('Link copied to clipboard!');
      }
    } catch (err) {
      // The native share sheet's own cancel button rejects with AbortError —
      // that's the user backing out, not a real failure, so stay quiet.
      if (err instanceof Error && err.name === 'AbortError') return;
      showToast('Failed to share. Please try again.');
    }
  }

  return (
    <main className="pt-16 min-h-screen flex flex-col">
      <div className="p-10 flex-1">
        {/* Page header + filter bar */}
        <section className="mb-12 flex justify-between items-end">
          <div>
            <h2 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface mb-2">
              Thumbnail History
            </h2>
            <p className="text-on-surface-variant text-base font-medium">Track and manage your generated content</p>
          </div>

          <div className="flex items-center bg-surface-container-low p-1 rounded-full border border-outline-variant/10">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-6 py-2 rounded-full text-xs font-bold transition-all ${
                  activeFilter === f
                    ? 'bg-surface-container-highest text-primary'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {displayed.map((item) => (
            <HistoryCard
              key={item.id}
              item={item}
              locked={isLocked}
              onToggleFavorite={toggleFavorite}
              onDelete={deleteItem}
              onEdit={onEditThumbnail}
              onDownload={() => handleDownload(item)}
              onShare={() => handleShare(item)}
            />
          ))}

          {/* Generate new card */}
          <button
            onClick={() => navigate('/')}
            className="group rounded-lg border-2 border-dashed border-outline-variant/30 flex flex-col items-center justify-center min-h-[320px] hover:border-primary/50 hover:bg-surface-container-low transition-all"
          >
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-3xl">add</span>
            </div>
            <p className="font-headline font-bold text-on-surface">Generate New</p>
            <p className="text-xs text-on-surface-variant mt-1">Start a fresh project</p>
          </button>
        </div>

        {/* Load more */}
        <div className="mt-16 flex justify-center">
          <button className="group px-12 py-4 bg-surface-container-high text-on-surface rounded-full border border-outline-variant/10 text-xs font-bold uppercase tracking-widest hover:bg-surface-container-highest hover:border-primary/30 transition-all flex items-center">
            Load Older Generations
            <span className="material-symbols-outlined ml-2 text-sm group-hover:translate-y-1 transition-transform">
              arrow_downward
            </span>
          </button>
        </div>
      </div>
    </main>
  );
}
