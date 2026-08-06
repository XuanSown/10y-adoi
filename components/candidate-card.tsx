"use client";

interface CandidateCardProps {
  id: string;
  name: string;
  imagePath: string;
  voteCount: number;
  displayOrder: number;
  disabled: boolean;
  selected: boolean;
  hasVoted: boolean;
  onSelect?: (id: string) => void;
}

export function CandidateCard({
  id,
  name,
  imagePath,
  voteCount,
  displayOrder,
  disabled,
  selected,
  hasVoted,
  onSelect,
}: CandidateCardProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onSelect?.(id)}
      className={`relative flex flex-col rounded-xl overflow-hidden shadow-lg transition-all duration-200 ${
        disabled ? "cursor-not-allowed opacity-70" : "cursor-pointer hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]"
      } ${selected ? "ring-4 ring-accent" : "ring-1 ring-gray-200"}`}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagePath}
          alt={name}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute top-1 left-1 bg-black/60 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {displayOrder}
        </div>
      </div>
      <div className="p-2 bg-white text-center">
        <p className="font-semibold text-sm text-on-surface truncate">{name}</p>
        <p className="text-xs text-on-surface-muted mt-0.5">{voteCount} vote</p>
        {hasVoted && selected && (
          <span className="inline-block mt-1 text-xs bg-success/10 text-success px-2 py-0.5 rounded-full font-medium">
            ✓ Đã chọn
          </span>
        )}
      </div>
    </button>
  );
}
