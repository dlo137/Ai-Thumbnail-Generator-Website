interface HeroPromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export default function HeroPromptInput({ value, onChange, onSubmit }: HeroPromptInputProps) {
  return (
    <div className="relative w-full max-w-[900px]">
      <div className="glass-panel rounded-[2rem] border border-primary/20 shadow-[0_0_60px_rgba(96,165,250,0.15)] h-[168px] p-8 flex flex-col text-left">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit();
            }
          }}
          placeholder="A shocked reaction to a $1,000,000 giveaway"
          className="flex-1 w-full bg-transparent border-none outline-none resize-none text-on-surface placeholder:text-on-surface-variant/40 text-lg"
        />
      </div>

      <button
        onClick={onSubmit}
        disabled={!value.trim()}
        className="absolute left-1/2 -translate-x-1/2 -bottom-7 px-8 py-4 rounded-full font-bold text-sm bg-gradient-to-r from-primary to-primary-container text-on-primary shadow-lg hover:shadow-[0_0_32px_rgba(96,165,250,0.5)] hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg disabled:active:scale-100"
      >
        <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
          bolt
        </span>
        Generate My First Thumbnail
      </button>
    </div>
  );
}
