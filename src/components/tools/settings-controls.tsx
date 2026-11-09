import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { FORMAT_LABEL, type ConcreteFormat, type OutputFormat } from "@/lib/format";

export function FormatPicker<T extends OutputFormat>({
  value,
  onChange,
  options,
  label = "Output format",
}: {
  value: T;
  onChange: (v: T) => void;
  options: T[];
  label?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(o)}
            className={cn(
              "rounded-lg border px-2 py-2 text-xs font-medium transition-all",
              value === o
                ? "border-primary bg-primary-soft text-accent-foreground"
                : "bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
            )}
          >
            {o === "original" ? "Original" : FORMAT_LABEL[o as ConcreteFormat]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function QualitySlider({
  value,
  onChange,
  disabled,
  note,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="quality">Quality</Label>
        <span className="rounded-md bg-primary-soft px-2 py-0.5 font-mono text-xs font-medium text-accent-foreground tabular">
          {value}%
        </span>
      </div>
      <Slider
        id="quality"
        min={1}
        max={100}
        step={1}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        disabled={disabled}
        aria-label="Quality"
      />
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Smaller file</span>
        <span>Higher quality</span>
      </div>
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export function CheckRow({
  id,
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} disabled={disabled} className="mt-0.5" />
      <div className="space-y-0.5">
        <Label htmlFor={id} className="leading-snug">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
