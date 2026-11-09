import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Crop, Download, Loader2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/dashboard/ui-bits";
import { DropZone } from "@/components/tools/drop-zone";
import { FormatPicker, QualitySlider } from "@/components/tools/settings-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useImageQueue, useObjectUrl } from "@/hooks/use-image-queue";
import { DEFAULT_QUALITY, FORMAT_LABEL, type FitMode, type OutputFormat, computeTargetSize, formatBytes } from "@/lib/format";
import { downloadBlob, processImage, type CropPosition, type ProcessResult } from "@/lib/image-processing";
import { recordSingle } from "@/services/jobs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/resize")({
  head: () => ({ meta: [{ title: "Resize & Crop – PixelForge" }] }),
  component: ResizePage,
});

const PRESETS = [
  { label: "1920 × 1080", w: 1920, h: 1080 },
  { label: "1280 × 720", w: 1280, h: 720 },
  { label: "1080 × 1080", w: 1080, h: 1080 },
  { label: "1080 × 1350", w: 1080, h: 1350 },
  { label: "800 × 800", w: 800, h: 800 },
];

const FITS: { value: FitMode; label: string; hint: string }[] = [
  { value: "cover", label: "Cover", hint: "Fill the frame, crop the overflow" },
  { value: "inside", label: "Fit", hint: "Fit inside, keep whole image" },
  { value: "contain", label: "Contain", hint: "Fit inside, pad to exact size" },
];

function ResizePage() {
  const queue = useImageQueue({ single: true });
  const qc = useQueryClient();
  const item = queue.items[0] ?? null;
  const [width, setWidth] = useState("1080");
  const [height, setHeight] = useState("1080");
  const [keepAspect, setKeepAspect] = useState(true);
  const [fit, setFit] = useState<FitMode>("cover");
  const [position, setPosition] = useState<CropPosition>("attention");
  const [format, setFormat] = useState<OutputFormat>("original");
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [busy, setBusy] = useState(false);
  const url = useObjectUrl(result?.blob);

  useEffect(() => setResult(null), [item, width, height, keepAspect, fit, position, format, quality]);

  const w = Number(width) || null;
  const h = Number(height) || null;
  const target = item ? computeTargetSize(item.width, item.height, { width: w, height: h, fit, keepAspect }) : null;
  const preset = PRESETS.find((p) => p.w === w && p.h === h)?.label ?? "custom";

  async function resize() {
    if (!item) return;
    if (!w && !h) return toast.error("Enter a width or height");
    if ((w ?? 0) > 10000 || (h ?? 0) > 10000) return toast.error("Maximum size is 10000 px");
    setBusy(true);
    try {
      const r = await processImage(item.file, {
        format,
        quality,
        stripMetadata: true,
        resize: { width: w, height: h, fit, keepAspect, position },
        filenameSuffix: `-${target?.width}x${target?.height}`,
      });
      setResult(r);
      toast.success(`Resized to ${r.width}×${r.height}`);
      await recordSingle("resize", {
        original_filename: item.file.name,
        original_format: item.format,
        output_format: r.format,
        original_size: item.file.size,
        compressed_size: r.blob.size,
        width: r.width,
        height: r.height,
        metadata_stripped: r.metadataStripped,
        status: "completed",
      });
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Resize failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Resize & Crop" description="Resize to exact dimensions with fit, cover and smart crop." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <DropZone onFiles={queue.addFiles} multiple={false} busy={queue.adding} compact={!!item} hint={item ? "Drop another image to replace" : undefined} />
          {item && (
            <div className="grid gap-4 md:grid-cols-2">
              <Panel className="space-y-3">
                <p className="text-sm font-medium">Before</p>
                <img src={item.previewUrl} alt="Original" className="max-h-[360px] w-full rounded-lg border bg-checker object-contain" />
                <p className="font-mono text-xs text-muted-foreground">{item.width}×{item.height} · {formatBytes(item.file.size)} · {FORMAT_LABEL[item.format]}</p>
              </Panel>
              <Panel className="space-y-3">
                <p className="text-sm font-medium">After</p>
                {url ? (
                  <img src={url} alt="Resized" className="max-h-[360px] w-full rounded-lg border bg-checker object-contain" />
                ) : (
                  <div className="flex aspect-square max-h-[360px] w-full items-center justify-center rounded-lg border border-dashed bg-surface text-xs text-muted-foreground">
                    {target ? `Output will be ${target.width}×${target.height}` : "—"}
                  </div>
                )}
                <p className="font-mono text-xs text-muted-foreground">
                  {result ? `${result.width}×${result.height} · ${formatBytes(result.blob.size)} · ${FORMAT_LABEL[result.format]}` : "Not rendered yet"}
                </p>
              </Panel>
            </div>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Panel className="space-y-5">
            <div className="space-y-2">
              <Label>Preset dimensions</Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { setWidth(String(p.w)); setHeight(String(p.h)); }}
                    className={cn("rounded-md border px-2 py-1 font-mono text-xs transition-colors", preset === p.label ? "border-primary bg-primary-soft text-accent-foreground" : "text-muted-foreground hover:border-primary/40")}
                  >
                    {p.label}
                  </button>
                ))}
                <span className={cn("rounded-md border px-2 py-1 text-xs", preset === "custom" ? "border-primary bg-primary-soft text-accent-foreground" : "text-muted-foreground")}>Custom</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="rw" className="text-xs">Width (px)</Label>
                <Input id="rw" inputMode="numeric" value={width} onChange={(e) => setWidth(e.target.value.replace(/\D/g, ""))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rh" className="text-xs">Height (px)</Label>
                <Input id="rh" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value.replace(/\D/g, ""))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="ka">Maintain aspect ratio</Label>
              <Switch id="ka" checked={keepAspect} onCheckedChange={setKeepAspect} />
            </div>
            {keepAspect ? (
              <>
                <div className="space-y-2">
                  <Label>Fit</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {FITS.map((f) => (
                      <button key={f.value} onClick={() => setFit(f.value)} title={f.hint} className={cn("rounded-lg border px-2 py-2 text-xs font-medium", fit === f.value ? "border-primary bg-primary-soft text-accent-foreground" : "text-muted-foreground hover:border-primary/40")}>
                        {f.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{FITS.find((f) => f.value === fit)?.hint}</p>
                </div>
                {fit === "cover" && (
                  <div className="space-y-2">
                    <Label>Crop focus</Label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {([["center", "Center crop"], ["attention", "Smart (attention)"]] as const).map(([v, l]) => (
                        <button key={v} onClick={() => setPosition(v)} className={cn("rounded-lg border px-2 py-2 text-xs font-medium", position === v ? "border-primary bg-primary-soft text-accent-foreground" : "text-muted-foreground hover:border-primary/40")}>
                          {l}
                        </button>
                      ))}
                    </div>
                    {position === "attention" && <p className="text-xs text-muted-foreground">Keeps the most detailed, colourful region in frame.</p>}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">The image will be stretched to exactly these dimensions.</p>
            )}
            <div className="border-t pt-4 space-y-5">
              <FormatPicker value={format} onChange={setFormat} options={["original", "jpeg", "png", "webp", "avif"]} />
              <QualitySlider value={quality} onChange={setQuality} />
            </div>
          </Panel>
          <Button variant="brand" size="lg" className="w-full" onClick={resize} disabled={!item || busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Crop />} Resize image
          </Button>
          {result && (
            <Button variant="outline" className="w-full" onClick={() => downloadBlob(result.blob, result.filename)}>
              <Download /> Download {result.filename}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
