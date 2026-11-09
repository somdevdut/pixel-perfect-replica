import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_FILE_BYTES } from "@/lib/format";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif";

export function DropZone({
  onFiles,
  multiple = true,
  busy = false,
  compact = false,
  hint,
}: {
  onFiles: (files: FileList | File[]) => void;
  multiple?: boolean;
  busy?: boolean;
  compact?: boolean;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files);
      }}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-card text-center transition-colors",
        compact ? "gap-2 px-4 py-6" : "gap-3 px-6 py-12",
        over ? "border-primary bg-primary-soft" : "border-input hover:border-primary/50",
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft text-primary">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium">
          {busy ? "Checking images…" : `Drag & drop image${multiple ? "s" : ""} here`}
        </p>
        <p className="text-xs text-muted-foreground">
          {hint ?? `JPEG, PNG, WebP or AVIF · up to ${MAX_FILE_BYTES / 1024 / 1024} MB each`}
        </p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={busy}>
        Browse Files
      </Button>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple={multiple}
        className="sr-only"
        aria-label="Choose images"
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
