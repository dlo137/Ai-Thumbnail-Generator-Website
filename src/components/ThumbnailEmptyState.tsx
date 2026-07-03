interface ThumbnailEmptyStateProps {
  onAddPress: () => void;
}

export default function ThumbnailEmptyState({ onAddPress }: ThumbnailEmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 bg-surface px-6 py-16">
      <button
        type="button"
        onClick={onAddPress}
        aria-label="Add a reference image"
        className="relative w-full max-w-[700px] aspect-[700/450] flex items-center justify-center"
      />
    </div>
  );
}
