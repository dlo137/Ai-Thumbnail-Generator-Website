import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ThumbnailEmptyState from '../components/ThumbnailEmptyState';
import { useGenerationHistory } from '../contexts/GenerationHistoryContext';
import { useToast } from '../contexts/ToastContext';
import { downloadImage } from '../utils/imageUtils';

// download="..." picks the SAVED filename regardless of the (opaque, UUID-based)
// signed-URL path — gives downloads a clean name instead of a random string.
function downloadFilename(index?: number): string {
  const date = new Date().toISOString().slice(0, 10);
  return `thumbnail-${date}${index != null ? `-${index + 1}` : ''}.png`;
}

type GenStatus = 'idle' | 'loading' | 'success' | 'error';

interface HomePageProps {
  genStatus: GenStatus;
  imageUrls: string[];
  genError: string | null;
  /** Size of the batch currently generating — used only while genStatus is
   *  'loading', to show that many placeholder cards instead of always one. */
  pendingBatchCount: number;
  /** Aspect ratio the current/most recent batch was generated at (e.g. "16:9",
   *  "9:16") — applied to the loading skeleton and every thumbnail card so
   *  neither is stuck at a fixed 16:9 shape regardless of what was picked. */
  pendingAspectRatio: string;
  /** Prompt text the current/most recent batch was generated from — used as
   *  the title when a card is saved via the heart button. */
  pendingGenPrompt: string;
  /** Renders the success result as a blurred/locked teaser with a "Get Credits"
   *  CTA instead of the normal downloadable grid — used for the free/dev-bypass
   *  first generation, where the user hasn't actually purchased credits yet. */
  isTeaser?: boolean;
  /** Index of the thumbnail focused via the hover "+" button, or null when
   *  viewing the full batch grid. Lifted up to App so the NavBar/PromptBar can
   *  react to editing mode too. */
  editingIndex: number | null;
  onEdit: (index: number) => void;
  onExitEdit: () => void;
  /** Whether a scoped regenerate of the focused thumbnail (editingIndex) is
   *  currently in flight — distinct from `genStatus`, which tracks the full-batch
   *  generation instead. */
  editLoading: boolean;
  editError: string | null;
}

type ResultPanelProps = HomePageProps;

// Caps how tall any single thumbnail (or skeleton placeholder) is allowed to
// render, regardless of aspect ratio — without this, a portrait ratio like
// 9:16 stretched to fill a grid column's full width would blow way past the
// viewport height. Below the cap, width still fills 100% of the available
// column/container as before (landscape/square ratios rarely hit the cap at
// typical column widths); once filling that width would exceed the cap,
// width shrinks in step with the ratio instead of the box just getting clipped.
const MAX_CARD_HEIGHT_VH = 65;

function getRatioMultiplier(ratio: string): number {
  const [w, h] = ratio.split(':').map(Number);
  return w > 0 && h > 0 ? w / h : 16 / 9;
}

function ResultPanel({
  genStatus,
  imageUrls,
  genError,
  pendingBatchCount,
  pendingAspectRatio,
  pendingGenPrompt,
  isTeaser,
  editingIndex,
  onEdit,
  onExitEdit,
  editLoading,
  editError,
}: ResultPanelProps) {
  const navigate = useNavigate();
  // Persisted across the app (home page grid + editing view + History page)
  // via GenerationHistoryContext, keyed by image URL rather than index so it
  // stays correct if the batch array is ever reordered/replaced.
  const { isSaved, toggleSaved: toggleSavedThumbnail } = useGenerationHistory();
  const { showToast } = useToast();

  function toggleSaved(url: string) {
    const wasSaved = isSaved(url);
    toggleSavedThumbnail(url, pendingGenPrompt);
    showToast(wasSaved ? 'Removed from saved' : 'Saved!');
  }

  // A plain <a href download> only forces a real download for same-origin URLs;
  // for our cross-origin Supabase Storage links browsers just ignore `download`
  // and navigate/open a new tab instead. Fetching to a blob: URL sidesteps that
  // and, as a bonus, gives a real success/failure signal for the toast.
  async function handleDownload(url: string, filename: string) {
    try {
      await downloadImage(url, filename);
      showToast('Downloaded!');
    } catch {
      showToast('Download failed. Please try again.');
    }
  }
  // CSS aspect-ratio takes "w/h", not "w:h".
  const cssAspectRatio = pendingAspectRatio.replace(':', '/');

  // Single-image views (1-count success, teaser, editing focus): no neighboring
  // card to sit flush against, so this shrinks width to keep the FULL,
  // uncropped ratio under MAX_CARD_HEIGHT_VH instead of ever cropping.
  const singleCardStyle = {
    aspectRatio: cssAspectRatio,
    width: `min(100%, calc(${MAX_CARD_HEIGHT_VH}vh * ${getRatioMultiplier(pendingAspectRatio).toFixed(4)}))`,
  };

  // Grid cards (2+ thumbnails side by side): must always fill 100% of their
  // column so cards stay flush against each other with zero gap — shrinking
  // width like the single-card variant would leave visible space at each
  // card's auto-centered margins. Height is capped via max-height instead;
  // object-cover on the <img> crops rather than leaving a gap when a portrait
  // ratio would otherwise blow past MAX_CARD_HEIGHT_VH.
  const gridCardStyle = {
    aspectRatio: cssAspectRatio,
    maxHeight: `${MAX_CARD_HEIGHT_VH}vh`,
  };

  // Called as a plain function (not JSX'd as <ThumbnailCard />) so its output is
  // just ordinary <div>/<img> elements in the tree — using it as a component tag
  // instead would give React a fresh component type every render (since it's
  // redefined each time), forcing every card to remount — and its <img> to
  // re-fetch/flicker — any time savedIndices or any other panel state changes.
  function renderThumbnailCard(url: string, index: number, variant: 'single' | 'grid' = 'grid') {
    const cardClassName =
      variant === 'single'
        ? 'relative group mx-auto rounded-xl overflow-hidden border border-outline-variant/20'
        : 'relative group w-full rounded-xl overflow-hidden border border-outline-variant/20';
    return (
      <div className={cardClassName} style={variant === 'single' ? singleCardStyle : gridCardStyle}>
        <img src={url} alt={`Variation ${index + 1}`} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(index)}
            title="Focus and edit this thumbnail"
            className="w-8 h-8 rounded-full bg-white/10 border border-white/20 text-on-surface flex items-center justify-center hover:bg-primary hover:border-primary hover:text-on-primary active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
          <button
            type="button"
            onClick={() => toggleSaved(url)}
            title={isSaved(url) ? 'Saved' : 'Save'}
            className={`w-8 h-8 rounded-full border flex items-center justify-center active:scale-95 transition-all ${
              isSaved(url)
                ? 'bg-primary/20 border-primary/60 text-primary'
                : 'bg-white/10 border-white/20 text-on-surface hover:bg-primary hover:border-primary hover:text-on-primary'
            }`}
          >
            <span
              className="material-symbols-outlined text-lg"
              style={isSaved(url) ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              favorite
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleDownload(url, downloadFilename(index))}
            className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold flex items-center gap-1 hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Download
          </button>
        </div>
      </div>
    );
  }

  if (genStatus === 'idle') return null;

  if (genStatus === 'loading') {
    // Mirrors the success grid's own layout rule (1 = centered, 2-3 = n-up,
    // 4+ caps at 3 columns and wraps) so the skeleton doesn't jump around once
    // the real results land in the same shape.
    const loadingCount = Math.max(pendingBatchCount, 1);
    const isSingleLoading = loadingCount === 1;
    const loadingColumns = Math.min(loadingCount, 3);
    return (
      <div className={`flex flex-col gap-4 w-full ${isSingleLoading ? 'max-w-[72rem]' : ''}`}>
        <div className="flex items-center gap-3 mb-1">
          <span className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-on-surface-variant font-medium">Generating your thumbnail…</span>
        </div>
        <div
          className={isSingleLoading ? '' : 'grid gap-4 w-full'}
          style={isSingleLoading ? undefined : { gridTemplateColumns: `repeat(${loadingColumns}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: loadingCount }).map((_, i) => (
            <div
              key={i}
              className={isSingleLoading ? 'mx-auto rounded-xl bg-surface-container animate-pulse' : 'w-full rounded-xl bg-surface-container animate-pulse'}
              style={isSingleLoading ? singleCardStyle : gridCardStyle}
            />
          ))}
        </div>
      </div>
    );
  }

  if (genStatus === 'error') {
    return (
      <div className="relative bg-error/10 border border-error/30 rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px] gap-4">
        <div className="w-14 h-14 rounded-full bg-error/15 flex items-center justify-center text-error">
          <span className="material-symbols-outlined text-3xl">error</span>
        </div>
        <div className="text-center">
          <p className="font-headline text-lg font-bold text-error mb-1">Generation failed</p>
          <p className="text-sm text-on-surface-variant max-w-sm">{genError}</p>
        </div>
      </div>
    );
  }

  // success — blurred/locked teaser (free/dev-bypass generation)
  if (isTeaser) {
    return (
      <div className="w-full max-w-[72rem]">
        <div className="relative mx-auto rounded-xl overflow-hidden border border-outline-variant/20" style={singleCardStyle}>
          <img src={imageUrls[0]} alt="Your generated thumbnail" className="w-full h-full object-cover blur-2xl scale-110" />
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-5 text-center px-6">
            <span className="material-symbols-outlined text-5xl text-on-surface drop-shadow-lg">lock</span>
            <p className="font-headline text-2xl font-extrabold text-on-surface drop-shadow-lg">Your Thumbnail is Ready</p>
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="px-8 py-3.5 rounded-full font-bold text-sm bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-lg hover:shadow-[0_0_28px_rgba(96,165,250,0.5)] active:scale-95 transition-all flex items-center gap-2"
            >
              Get Credits
            </button>
          </div>
        </div>
      </div>
    );
  }

  // success — editing mode: a single thumbnail focused via the hover "+" button.
  // Just the image and the prompt bar (docked below), no grid or label.
  if (editingIndex !== null && imageUrls[editingIndex]) {
    return (
      <div className="w-full max-w-[72rem]">
        <button
          type="button"
          onClick={onExitEdit}
          className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-primary transition-colors mb-3"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to all thumbnails
        </button>
        <div className="relative mx-auto rounded-xl overflow-hidden border border-outline-variant/20" style={singleCardStyle}>
          <img src={imageUrls[editingIndex]} alt={`Variation ${editingIndex + 1}`} className="w-full h-full object-cover" />
          {editLoading && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
              <span className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
              <span className="text-sm text-on-surface font-medium">Updating your thumbnail…</span>
            </div>
          )}
        </div>
        {editError && (
          <p className="text-sm text-error font-medium text-center mt-3">{editError}</p>
        )}
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => toggleSaved(imageUrls[editingIndex])}
            title={isSaved(imageUrls[editingIndex]) ? 'Saved' : 'Save'}
            className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all active:scale-95 ${
              isSaved(imageUrls[editingIndex])
                ? 'bg-primary/15 border-primary/50 text-primary'
                : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:border-primary/40 hover:text-primary'
            }`}
          >
            <span
              className="material-symbols-outlined text-xl"
              style={isSaved(imageUrls[editingIndex]) ? { fontVariationSettings: "'FILL' 1" } : undefined}
            >
              favorite
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleDownload(imageUrls[editingIndex], downloadFilename(editingIndex))}
            title="Download"
            className="w-11 h-11 rounded-full bg-surface-container border border-outline-variant/20 text-on-surface-variant flex items-center justify-center hover:border-primary/40 hover:text-primary transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-xl">download</span>
          </button>
        </div>
      </div>
    );
  }

  // success — normal downloadable grid.
  // - 1 image: centered at a fixed max width, same as the locked teaser.
  // - 2-3 images: an n-column grid sized to fill the full page-body width.
  // - 4+ images: caps at 3 columns and wraps into additional rows — a plain CSS
  //   grid does this on its own once a row's 3 tracks are filled, no scrolling
  //   or JS measurement needed.
  const isSingleImage = imageUrls.length === 1;
  const gridColumns = Math.min(imageUrls.length, 3);

  return (
    <div className="flex flex-col items-center w-full">
      <div className={`flex flex-col gap-4 w-full ${isSingleImage ? 'max-w-[72rem]' : ''}`}>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Generated thumbnails</p>

        {isSingleImage ? (
          renderThumbnailCard(imageUrls[0], 0, 'single')
        ) : (
          <div className="grid gap-4 w-full" style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}>
            {imageUrls.map((url, i) => (
              <div key={i}>{renderThumbnailCard(url, i)}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage({
  genStatus,
  imageUrls,
  genError,
  pendingBatchCount,
  pendingAspectRatio,
  pendingGenPrompt,
  isTeaser,
  editingIndex,
  onEdit,
  onExitEdit,
  editLoading,
  editError,
}: HomePageProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <main className={`${editingIndex !== null ? 'pt-12' : 'pt-16'} pb-44 min-h-screen flex flex-col`}>
      <div className="flex-1 flex flex-col max-w-[110rem] mx-auto px-10 w-full">
        <section className="flex-1 flex items-center justify-center">
          {genStatus === 'idle' ? (
            <ThumbnailEmptyState onAddPress={() => fileRef.current?.click()} />
          ) : (
            <ResultPanel
              genStatus={genStatus}
              imageUrls={imageUrls}
              genError={genError}
              pendingBatchCount={pendingBatchCount}
              pendingAspectRatio={pendingAspectRatio}
              pendingGenPrompt={pendingGenPrompt}
              isTeaser={isTeaser}
              editingIndex={editingIndex}
              onEdit={onEdit}
              onExitEdit={onExitEdit}
              editLoading={editLoading}
              editError={editError}
            />
          )}
        </section>
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" />
    </main>
  );
}
