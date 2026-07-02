type GenStatus = 'idle' | 'loading' | 'success' | 'error';

interface HomePageProps {
  genStatus: GenStatus;
  imageUrls: string[];
  genError: string | null;
}

function ResultPanel({ genStatus, imageUrls, genError }: HomePageProps) {
  if (genStatus === 'idle') return null;

  if (genStatus === 'loading') {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
          <span className="text-sm text-on-surface-variant font-medium">Generating your thumbnails…</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="aspect-video rounded-xl bg-surface-container animate-pulse"
              style={{ animationDelay: `${i * 150}ms` }}
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

  // success
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-bold uppercase tracking-widest text-primary">Generated thumbnails</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {imageUrls.map((url, i) => (
          <div key={i} className="relative group aspect-video rounded-xl overflow-hidden border border-outline-variant/20">
            <img src={url} alt={`Variation ${i + 1}`} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
              <a
                href={url}
                download
                className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-xs font-bold flex items-center gap-1 hover:brightness-110 transition-all"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Download
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage({ genStatus, imageUrls, genError }: HomePageProps) {
  return (
    <main className="pt-16 pb-44 min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col max-w-7xl mx-auto px-10 w-full">
        <section className="flex-1 flex items-center justify-center">
          {genStatus !== 'idle' && (
            <ResultPanel genStatus={genStatus} imageUrls={imageUrls} genError={genError} />
          )}
        </section>
      </div>
    </main>
  );
}
