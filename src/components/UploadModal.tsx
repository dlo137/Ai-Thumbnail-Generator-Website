import { useRef, useState } from 'react';
import { uploadReferenceImage } from '../services/generationService';

interface UploadModalProps {
  type: 'subject' | 'reference';
  /** Called with the uploaded image's URL once the upload succeeds — the
   *  modal owns the upload itself (matching the mobile app's Subject/Reference
   *  modals) so callers only ever deal in ready-to-use URLs. */
  onConfirm: (url: string) => void;
  onCancel: () => void;
}

export default function UploadModal({ type, onConfirm, onCancel }: UploadModalProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSubject = type === 'subject';
  const title = isSubject ? 'Add Subject' : 'Add Reference';
  const description = isSubject
    ? 'Upload an image of a person or object to include.'
    : 'Upload a reference image to match the visual style.';
  const confirmLabel = isSubject ? 'Add Subject' : 'Add Reference';

  function handleFile(f: File) {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setUploadError(null);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) handleFile(f);
  }

  async function handleConfirm() {
    if (!file || isUploading) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const url = await uploadReferenceImage(file, type);
      onConfirm(url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-outline-variant/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col gap-5">
        {/* Header */}
        <div>
          <h2 className="font-headline font-bold text-lg text-on-surface">{title}</h2>
          <p className="text-xs text-on-surface-variant mt-1">{description}</p>
        </div>

        {/* Upload area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="relative border-2 border-dashed border-outline-variant/30 rounded-2xl min-h-[180px] flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-surface-container/40 transition-all group overflow-hidden"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover absolute inset-0 rounded-2xl" />
          ) : (
            <>
              <span className="material-symbols-outlined text-4xl text-outline group-hover:text-primary transition-colors mb-2">
                cloud_upload
              </span>
              <span className="text-xs text-on-surface-variant">Click or drag an image here</span>
            </>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {uploadError && <p className="text-xs text-error font-medium">{uploadError}</p>}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={isUploading}
            className="flex-1 py-2.5 rounded-xl border border-outline-variant/30 text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!file || isUploading}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary-container to-primary text-on-primary font-bold text-sm hover:shadow-[0_0_20px_rgba(29,78,216,0.5)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <span className="w-4 h-4 border-2 border-on-primary/40 border-t-on-primary rounded-full animate-spin" />
                Uploading…
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
