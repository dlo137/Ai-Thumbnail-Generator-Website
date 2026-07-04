import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCredits } from '../contexts/CreditsContext';
import { generateThumbnails, generateTitle } from '../services/generationService';
import GeneratedThumbnailCard from '../components/GeneratedThumbnailCard';

const MIN_CREDITS = 3;
const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const SUGGESTIONS = ['Tech Review', 'Gaming Highlights', 'Podcast Episode', 'Tutorial', 'Vlog'];

const toBase64 = (file: File) => new Promise<string>((res, rej) => {
  const r = new FileReader();
  r.onload = () => res((r.result as string).split(',')[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

interface Results {
  title: string;
  urls: string[];
}

export default function GeneratePage() {
  const { current: credits, loading: creditsLoading } = useCredits();
  const [searchParams, setSearchParams] = useSearchParams();

  const [prompt, setPrompt] = useState(() => searchParams.get('prompt') ?? '');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState('');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [results, setResults] = useState<Results | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  const insufficientCredits = false; // TODO: re-enable credit check after testing
  const canSubmit = prompt.trim().length > 0 && status !== 'loading';

  // Auto-submit when navigated here from PromptBar with ?prompt=...
  useEffect(() => {
    if (searchParams.get('prompt') && !creditsLoading && status === 'idle') {
      setSearchParams({}, { replace: true }); // clean the URL
      handleSubmit();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creditsLoading]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError('Only JPEG, PNG, and WebP images are accepted.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setUploadError('Image must be under 5 MB.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    setUploadError('');
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setUploadError('');
    if (fileRef.current) fileRef.current.value = '';
  }

  async function handleSubmit() {
    if (!canSubmit) return;

    setStatus('loading');
    setErrorMsg('');
    setResults(null);

    const imageBase64 = imageFile ? await toBase64(imageFile) : undefined;

    let lastError = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const [title, urls] = await Promise.all([
          generateTitle(prompt),
          generateThumbnails(prompt, imageBase64),
        ]);

        // TODO: re-enable after manage-credits edge function is deployed
        // await deductCredits(MIN_CREDITS);
        // await refreshCredits();

        setResults({ title, urls });
        setStatus('success');
        return;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : 'Generation failed. Please try again.';
      }
    }

    setErrorMsg(lastError);
    setStatus('error');
  }

  return (
    <main className="pt-16 pb-20 min-h-screen">
      {/* Ambient blobs */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-5%] left-[20%] w-[30%] h-[30%] bg-tertiary/5 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="relative z-10 max-w-5xl mx-auto px-10 py-12 flex flex-col gap-10">

        {/* ── Header ── */}
        <section className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-on-surface mb-2">
              Generate{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-tertiary">
                Thumbnails
              </span>
            </h1>
            <p className="text-on-surface-variant text-base max-w-lg">
              Describe your video concept and let the AI craft three cinematic thumbnail variations.
            </p>
          </div>

          {/* Credits badge */}
          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant/15 rounded-xl px-5 py-3 shrink-0">
            <span
              className="material-symbols-outlined text-tertiary text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              bolt
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-outline">Credits</span>
              {creditsLoading ? (
                <span className="text-sm font-bold text-on-surface animate-pulse">—</span>
              ) : (
                <span className={`text-sm font-bold ${insufficientCredits ? 'text-error' : 'text-on-surface'}`}>
                  {credits}
                </span>
              )}
            </div>
          </div>
        </section>

        {/* ── Form card ── */}
        <div className="bg-surface-container-low border border-outline-variant/15 rounded-2xl p-8 flex flex-col gap-6">

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPrompt(s)}
                className="px-4 py-1.5 bg-surface-container border border-outline-variant/10 rounded-full text-xs font-bold text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
              Prompt
            </label>
            <textarea
              rows={4}
              placeholder="e.g. A developer reacts to the fastest GPU ever made — dramatic neon lighting, shocked expression, cinematic close-up"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleSubmit()}
              className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl p-4 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-1 focus:ring-primary/60 resize-none transition-all"
            />
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-outline mb-2">
              Reference image{' '}
              <span className="normal-case tracking-normal font-normal text-outline/50">
                (optional — JPEG, PNG, WebP · max 5 MB)
              </span>
            </label>

            {imagePreview && imageFile ? (
              <div className="relative inline-block group">
                <img
                  src={imagePreview}
                  alt="Uploaded reference"
                  className="h-28 w-auto rounded-xl object-cover border border-outline-variant/20"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-error text-on-error flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <span className="material-symbols-outlined text-sm leading-none">close</span>
                </button>
                <span className="block mt-1 text-[10px] text-outline truncate max-w-[14rem]">
                  {imageFile.name} · {(imageFile.size / 1024).toFixed(0)} KB
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-3 px-5 py-3 bg-surface-container border border-dashed border-outline-variant/30 rounded-xl text-sm text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined text-xl">add_photo_alternate</span>
                <span className="font-medium">Upload reference photo</span>
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="hidden"
              onChange={handleFileChange}
            />

            {uploadError && (
              <p className="mt-2 text-xs text-error flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">error</span>
                {uploadError}
              </p>
            )}
          </div>

          {/* Insufficient credits warning */}
          {insufficientCredits && (
            <div className="flex items-center gap-3 bg-error/10 border border-error/20 rounded-xl px-5 py-3">
              <span className="material-symbols-outlined text-error text-xl">error</span>
              <p className="text-sm text-error font-medium">
                Not enough credits — you need at least {MIN_CREDITS} to generate.
              </p>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-outline">
              Costs <span className="text-on-surface font-bold">{MIN_CREDITS} credits</span> · ⌘ Enter to submit
            </span>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="bg-gradient-to-r from-primary-container to-primary text-on-primary-container px-8 py-3 rounded-full font-bold text-sm flex items-center gap-2 hover:shadow-[0_0_24px_rgba(29,78,216,0.5)] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100"
            >
              {status === 'loading' ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-primary-container/40 border-t-on-primary-container rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  Generate
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Loading skeleton ── */}
        {status === 'loading' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin shrink-0" />
              <p className="text-sm text-on-surface-variant font-medium animate-pulse">
                Crafting your thumbnails — this usually takes 15–30 seconds…
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="aspect-video bg-surface-container rounded-xl animate-pulse"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {status === 'error' && (
          <div className="flex items-start gap-4 bg-error/10 border border-error/20 rounded-2xl p-6">
            <span className="material-symbols-outlined text-error text-2xl mt-0.5 shrink-0">error</span>
            <div className="flex flex-col gap-3">
              <p className="text-sm font-bold text-error">Generation failed after two attempts</p>
              <p className="text-sm text-on-surface-variant">{errorMsg}</p>
              <button
                type="button"
                onClick={handleSubmit}
                className="self-start px-5 py-2 bg-surface-container-highest text-on-surface rounded-full text-xs font-bold hover:bg-surface-bright transition-all"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {status === 'success' && results && (
          <section className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span
                className="material-symbols-outlined text-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              <h2 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">
                {results.title}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {results.urls.map((url, i) => (
                <GeneratedThumbnailCard
                  key={url}
                  imageUrl={url}
                  title={results.title}
                  index={i}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
