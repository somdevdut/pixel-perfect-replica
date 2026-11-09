import { useState } from "react";
import { cn } from "@/lib/utils";

/** Before/after image comparison with a draggable divider. */
export function CompareSlider({
  before,
  after,
  beforeLabel = "Original",
  afterLabel = "Compressed",
  className,
}: {
  before: string;
  after: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}) {
  const [pos, setPos] = useState(50);
  return (
    <div className={cn("relative overflow-hidden rounded-xl border bg-checker select-none", className)}>
      <img src={after} alt={afterLabel} className="block h-full max-h-[480px] w-full object-contain" />
      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <img src={before} alt={beforeLabel} className="block h-full max-h-[480px] w-full object-contain" />
      </div>
      <div className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="h-full w-0.5 -translate-x-1/2 bg-card shadow-card" />
        <div className="absolute top-1/2 left-0 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-card shadow-card">
          <span className="text-[10px] font-semibold text-muted-foreground">⟷</span>
        </div>
      </div>
      <span className="absolute top-3 left-3 rounded-md bg-card/90 px-2 py-1 text-xs font-medium shadow-soft">
        {beforeLabel}
      </span>
      <span className="absolute top-3 right-3 rounded-md bg-card/90 px-2 py-1 text-xs font-medium shadow-soft">
        {afterLabel}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Comparison position"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
      />
    </div>
  );
}
