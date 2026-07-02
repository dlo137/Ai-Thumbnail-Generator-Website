import { useRef, useState } from 'react';
import UploadModal from './UploadModal';

const ratios = ['16:9', '9:16', '1:1', '4:3', '4:5', '3:2', '21:9'];
const batchOptions = [1, 2, 3, 4, 6];

interface PromptBarProps {
  onGenerate: (prompt: string, batchCount: number, imageBase64?: string) => void;
  isLoading: boolean;
}

export default function PromptBar({ onGenerate, isLoading }: PromptBarProps) {
  const [prompt, setPrompt] = useState('');
  const [batchCount, setBatchCount] = useState(3);
  const [showBatchMenu, setShowBatchMenu] = useState(false);
  const batchRef = useRef<HTMLDivElement>(null);
  const [selectedRatio, setSelectedRatio] = useState('16:9');
  const [showRatioMenu, setShowRatioMenu] = useState(false);
  const ratioRef = useRef<HTMLDivElement>(null);
  const [uploadModal, setUploadModal] = useState<'subject' | 'reference' | null>(null);
  const [subjectFile, setSubjectFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [quickImage, setQuickImage] = useState<{ file: File; preview: string } | null>(null);
  const quickInputRef = useRef<HTMLInputElement>(null);

  function handleQuickUpload(file: File) {
    setQuickImage({ file, preview: URL.createObjectURL(file) });
  }

  async function handleGenerate() {
    if (!prompt.trim() || isLoading) return;
    if (quickImage) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(quickImage.file);
      });
      onGenerate(prompt.trim(), batchCount, base64);
    } else {
      onGenerate(prompt.trim(), batchCount);
    }
  }

  return (
    <>
    <div className="fixed bottom-0 right-0 left-0 pb-8 px-10 pointer-events-none">
      <div className="max-w-[68.5rem] mx-auto w-full pointer-events-auto">
        {/* Prompt input */}
        <div className="bg-gradient-to-r from-zinc-950 to-zinc-800 border border-outline-variant/20 rounded-3xl p-2 flex items-stretch gap-2 shadow-2xl">
          {/* Left: text input + ratio row */}
          <div className="flex-1 flex flex-col px-4 py-3 gap-3.5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => quickInputRef.current?.click()}
                className="relative shrink-0 hover:scale-110 transition-transform"
                title="Upload image"
              >
                {quickImage ? (
                  <div className="relative w-7 h-7">
                    <img src={quickImage.preview} className="w-7 h-7 rounded-md object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); setQuickImage(null); }}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-zinc-800 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>close</span>
                    </button>
                  </div>
                ) : (
                  <span className="material-symbols-outlined text-primary text-xl">add</span>
                )}
              </button>
              <input
                ref={quickInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleQuickUpload(f); e.target.value = ''; }}
              />
              <input
                className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/50 text-sm font-medium disabled:opacity-50"
                placeholder="Describe the visual story for your thumbnail..."
                value={prompt}
                disabled={isLoading}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setUploadModal('subject')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border text-xs font-bold transition-all bg-zinc-800 ${subjectFile ? 'border-primary/50 text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:border-primary/40 hover:text-primary'}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
                {subjectFile ? 'Subject ✓' : 'Subject'}
              </button>
              <button
                onClick={() => setUploadModal('reference')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border text-xs font-bold transition-all bg-zinc-800 ${referenceFile ? 'border-primary/50 text-primary' : 'border-outline-variant/20 text-on-surface-variant hover:border-primary/40 hover:text-primary'}`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>image</span>
                {referenceFile ? 'Reference ✓' : 'Reference'}
              </button>
              <span className="w-px h-4 bg-outline-variant/40 mx-0.5" />
              <div ref={batchRef} className="relative">
                <button
                  onClick={() => { setShowRatioMenu(false); setShowBatchMenu((v) => !v); }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all bg-zinc-800"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>burst_mode</span>
                  ×{batchCount}
                </button>
                {showBatchMenu && (
                  <div className="absolute bottom-full mb-2 left-0 bg-zinc-900 border border-outline-variant/30 rounded-xl p-1.5 flex gap-1 shadow-xl z-50">
                    {batchOptions.map((n) => (
                      <button
                        key={n}
                        onClick={() => { setBatchCount(n); setShowBatchMenu(false); }}
                        className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all ${
                          n === batchCount
                            ? 'bg-primary text-on-primary'
                            : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <span className="w-px h-4 bg-outline-variant/40 mx-0.5" />
              <div ref={ratioRef} className="relative">
                <button
                  onClick={() => { setShowBatchMenu(false); setShowRatioMenu((v) => !v); }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md border border-outline-variant/20 text-xs font-bold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all bg-zinc-800"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>aspect_ratio</span>
                  {selectedRatio}
                </button>
                {showRatioMenu && (
                  <div className="absolute bottom-full mb-2 left-0 bg-zinc-900 border border-outline-variant/30 rounded-xl p-1.5 flex gap-1 shadow-xl z-50">
                    {ratios.map((r) => (
                      <button
                        key={r}
                        onClick={() => { setSelectedRatio(r); setShowRatioMenu(false); }}
                        className={`px-2.5 h-7 rounded-lg text-[11px] font-bold transition-all ${
                          r === selectedRatio
                            ? 'bg-primary text-on-primary'
                            : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Generate button — full height */}
          <button
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="bg-gradient-to-r from-primary-container to-primary text-on-primary-container px-6 rounded-2xl font-bold text-sm flex items-center gap-2 hover:shadow-[0_0_20px_rgba(29,78,216,0.5)] transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 self-stretch"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary-container/40 border-t-on-primary-container rounded-full animate-spin" />
                <span>Generating…</span>
              </>
            ) : (
              <>
                <span>Generate</span>
                <span className="material-symbols-outlined text-sm">send</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>

    {uploadModal && (
      <UploadModal
        type={uploadModal}
        onCancel={() => setUploadModal(null)}
        onConfirm={(file) => {
          if (uploadModal === 'subject') setSubjectFile(file);
          else setReferenceFile(file);
          setUploadModal(null);
        }}
      />
    )}
    </>
  );
}
