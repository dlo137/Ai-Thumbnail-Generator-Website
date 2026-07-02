import { useState } from 'react';

interface GeneratedThumbnailCardProps {
  imageUrl: string;
  title: string;
  index: number;
}

export default function GeneratedThumbnailCard({ imageUrl, title, index }: GeneratedThumbnailCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleDownload() {
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = `${title.replace(/\s+/g, '-').toLowerCase()}-v${index + 1}.png`;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
    } catch {
      // Signed URL may have expired
    }
  }

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable
    }
  }

  return (
    <div className="group relative bg-[#151a21] rounded-xl overflow-hidden border border-[#232932] shadow-[0_10px_40px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1">
      <div className="aspect-video relative overflow-hidden">
        <img
          src={imageUrl}
          alt={`${title} — variation ${index + 1}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />

        {/* Variation badge */}
        <div className="absolute top-3 left-3">
          <span className="bg-background/70 backdrop-blur-md text-[10px] font-bold uppercase tracking-widest text-on-surface px-2.5 py-1 rounded-full border border-outline-variant/20">
            V{index + 1}
          </span>
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-background/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-full font-bold text-sm hover:brightness-110 active:scale-95 transition-all shadow-lg"
          >
            <span className="material-symbols-outlined text-sm">download</span>
            Download
          </button>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface-container-highest text-on-surface rounded-full font-bold text-sm hover:bg-surface-bright active:scale-95 transition-all shadow-lg"
          >
            <span className="material-symbols-outlined text-sm">
              {copied ? 'check' : 'link'}
            </span>
            {copied ? 'Copied!' : 'Copy URL'}
          </button>
        </div>
      </div>

      {/* Card footer */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs font-bold text-on-surface truncate">{title}</span>
          <span className="text-[10px] text-outline">Variation {index + 1}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyUrl}
            title="Copy URL"
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-sm">
              {copied ? 'check' : 'link'}
            </span>
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Download"
            className="w-8 h-8 rounded-full bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all active:scale-90"
          >
            <span className="material-symbols-outlined text-sm">download</span>
          </button>
        </div>
      </div>
    </div>
  );
}
