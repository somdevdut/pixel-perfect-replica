import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Eye, FileArchive, Loader2, ShieldCheck, Trash2, X, Minimize2 } from "lucide-react";
import { PageHeader, Panel, SavingsBadge } from "@/components/dashboard/ui-bits";
import { DropZone } from "@/components/tools/drop-zone";
import { CompareSlider } from "@/components/tools/compare-slider";
import { CheckRow, FormatPicker, QualitySlider } from "@/components/tools/settings-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useImageQueue, useObjectUrl, type QueuedImage } from "@/hooks/use-image-queue";
import {
  BATCH_CONCURRENCY,
  DEFAULT_QUALITY,
  FORMAT_LABEL,
  type OutputFormat,
  formatBytes,
  resolveFormat,
  runWithConcurrency,
  savingsPercent,
} from "@/lib/format";
import { buildZip, downloadBlob, processImage, type ProcessOptions, type ProcessResult } from "@/lib/image-processing";
import { saveJobResults, startJob } from "@/services/jobs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/compress")({
  head: () => ({ meta: [{ title: "Image Compressor – PixelForge" }] }),
  component: CompressPage,
});

type Outcome = { ok: true; result: ProcessResult } | { ok: false; error: string };

function CompressPage() {
  const queue = useImageQueue();
  const qc = useQueryClient();
  const [format, setFormat] = useState<OutputFormat>("original");
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [strip, setStrip] = useState(true);
  const [keepAspect, setKeepAspect] = useState(true);
  const [keepDims, setKeepDims] = useState(true);
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [livePreview, setLivePreview] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [zipping, setZipping] = useState(false);

  const options: ProcessOptions = useMemo(
    () => ({
      format,
      quality,
      stripMetadata: strip,
      resize: keepDims
        ? null
        : { width: Number(width) || null, height: Number(height) || null, fit: "inside", keepAspect, position: "center" },
    }),
    [format, quality, strip, keepDims, width, height, keepAspect],
  );

  // Results are stale as soon as settings change.
  useEffect(() => setOutcomes({}), [options]);

  const selected = queue.items.find((i) => i.id === selectedId) ?? queue.items[0] ?? null;

  async function compressAll() {
    if (!queue.items.length) return;
    if (!keepDims && !Number(width) && !Number(height)) return toast.error("Enter a width or height, or keep original dimensions");
    setRunning(true);
    setDone(0);
    setOutcomes({});
    const items = [...queue.items];
    let jobId: string | null = null;
    try {
      jobId = await startJob("compress", items.length);
    } catch {
      toast.error("Couldn't start a job record — results won't be saved to history");
    }
    const records: Parameters<typeof saveJobResults>[1] = [];
    await runWithConcurrency(items, BATCH_CONCURRENCY, async (item) => {
      try {
        const result = await processImage(item.file, options);
        setOutcomes((o) => ({ ...o, [item.id]: { ok: true, result } }));
        records.push({
          original_filename: item.file.name,
          original_format: item.format,
          output_format: result.format,
          original_size: item.file.size,
          compressed_size: result.blob.size,
          width: result.width,
          height: result.height,
          metadata_stripped: result.metadataStripped,
          status: "completed",
        });
      } catch (e) {
        const error = e instanceof Error ? e.message : "Processing failed";
        setOutcomes((o) => ({ ...o, [item.id]: { ok: false, error } }));
        records.push({
          original_filename: item.file.name,
          original_format: item.format,
          output_format: resolveFormat(format, item.format),
          original_size: item.file.size,
          compressed_size: null,
          width: null,
          height: null,
          metadata_stripped: strip,
          status: "failed",
          error_message: error,
        });
      }
      setDone((d) => d + 1);
    });
    if (jobId) {
      try {
        await saveJobResults(jobId, records);
        qc.invalidateQueries();
      } catch {
        toast.error("Compressed, but saving to history failed");
      }
    }
    const ok = records.filter((r) => r.status === "completed");
    const orig = ok.reduce((n, r) => n + r.original_size, 0);
    const comp = ok.reduce((n, r) => n + (r.compressed_size ?? 0), 0);
    if (ok.length) toast.success(`Compressed ${ok.length} image${ok.length === 1 ? "" : "s"} · saved ${formatBytes(Math.max(0, orig - comp))}`);
    if (ok.length < records.length) toast.error(`${records.length - ok.length} image(s) failed`);
    setRunning(false);
  }

  async function downloadZip() {
    const entries = queue.items
      .map((i) => outcomes[i.id])
      .filter((o): o is { ok: true; result: ProcessResult } => !!o?.ok)
      .map((o) => ({ name: o.result.filename, blob: o.result.blob }));
    if (!entries.length) return;
    setZipping(true);
    try {
      downloadBlob(await buildZip(entries), "pixelforge-compressed.zip");
    } finally {
      setZipping(false);
    }
  }

  const successCount = Object.values(outcomes).filter((o) => o.ok).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Image Compressor" description="Upload images, tune the settings and compress. Everything runs on your device." />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <DropZone onFiles={queue.addFiles} busy={queue.adding} compact={queue.items.length > 0} />

          {queue.items.length > 0 && (
            <Panel className="p-0">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <p className="text-sm font-medium">{queue.items.length} image{queue.items.length === 1 ? "" : "s"}</p>
                <Button variant="ghost" size="sm" onClick={() => { queue.clear(); setOutcomes({}); }} disabled={running}>
                  <Trash2 /> Clear all
                </Button>
              </div>
              <ul className="divide-y">
                {queue.items.map((item) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    outcome={outcomes[item.id]}
                    selected={selected?.id === item.id}
                    onSelect={() => setSelectedId(item.id)}
                    onRemove={() => queue.remove(item.id)}
                    disabled={running}
                  />
                ))}
              </ul>
            </Panel>
          )}

          {selected && (
            <PreviewPanel item={selected} outcome={outcomes[selected.id]} options={options} live={livePreview && !outcomes[selected.id]} />
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Panel className="space-y-5">
            <h2 className="font-medium">Compression settings</h2>
            <FormatPicker value={format} onChange={setFormat} options={["original", "jpeg", "png", "webp", "avif"]} />
            <QualitySlider
              value={quality}
              onChange={setQuality}
              note={format === "png" ? "PNG below 100% reduces the colour palette; 100% is lossless." : undefined}
            />
            <div className="space-y-3.5 border-t pt-4">
              <CheckRow id="strip" checked={strip} onChange={setStrip} label="Remove Image Metadata (Recommended for Privacy)" description="Strips EXIF such as GPS location and camera details. Keeping it is only possible for JPEG → JPEG." />
              <CheckRow id="aspect" checked={keepAspect} onChange={setKeepAspect} label="Preserve aspect ratio" />
              <CheckRow id="dims" checked={keepDims} onChange={setKeepDims} label="Maintain original dimensions" />
              {!keepDims && (
                <div className="grid grid-cols-2 gap-2 pl-7">
                  <div className="space-y-1">
                    <Label htmlFor="w" className="text-xs">Max width</Label>
                    <Input id="w" inputMode="numeric" placeholder="e.g. 1920" value={width} onChange={(e) => setWidth(e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="h" className="text-xs">Max height</Label>
                    <Input id="h" inputMode="numeric" placeholder="e.g. 1080" value={height} onChange={(e) => setHeight(e.target.value.replace(/\D/g, ""))} />
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="live" className="flex items-center gap-2"><Eye className="size-4 text-muted-foreground" /> Compression preview</Label>
                <Switch id="live" checked={livePreview} onCheckedChange={setLivePreview} />
              </div>
            </div>
          </Panel>

          <Button variant="brand" size="lg" className="w-full" onClick={compressAll} disabled={!queue.items.length || running}>
            {running ? <Loader2 className="animate-spin" /> : <Minimize2 />}
            {running ? `Compressing ${done}/${queue.items.length}…` : "Compress Images"}
          </Button>
          {running && <Progress value={(done / Math.max(1, queue.items.length)) * 100} />}
          {successCount > 1 && !running && (
            <Button variant="outline" className="w-full" onClick={downloadZip} disabled={zipping}>
              {zipping ? <Loader2 className="animate-spin" /> : <FileArchive />} Download all as ZIP
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function QueueRow({
  item,
  outcome,
  selected,
  onSelect,
  onRemove,
  disabled,
}: {
  item: QueuedImage;
  outcome?: Outcome;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  disabled: boolean;
}) {
  return (
    <li className={cn("flex items-center gap-3 px-5 py-3 transition-colors", selected && "bg-primary-soft/50")}>
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`Preview ${item.file.name}`}>
        <img src={item.previewUrl} alt="" className="size-12 shrink-0 rounded-md border bg-checker object-cover" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.file.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {FORMAT_LABEL[item.format]} · {item.width}×{item.height} · {formatBytes(item.file.size)}
          </p>
        </div>
      </button>
      {outcome?.ok && (
        <div className="hidden items-center gap-2 sm:flex">
          <span className="font-mono text-xs text-muted-foreground">{formatBytes(outcome.result.blob.size)}</span>
          <SavingsBadge percent={savingsPercent(item.file.size, outcome.result.blob.size)} />
        </div>
      )}
      {outcome && !outcome.ok && <span className="text-xs text-destructive">{outcome.error}</span>}
      {outcome?.ok ? (
        <Button size="icon" variant="soft" onClick={() => downloadBlob(outcome.result.blob, outcome.result.filename)} aria-label={`Download ${outcome.result.filename}`}>
          <Download />
        </Button>
      ) : (
        <Button size="icon" variant="ghost" onClick={onRemove} disabled={disabled} aria-label={`Remove ${item.file.name}`}>
          <X />
        </Button>
      )}
    </li>
  );
}

/** Shows the final result, or a live preview computed with the current settings. */
function PreviewPanel({ item, outcome, options, live }: { item: QueuedImage; outcome?: Outcome; options: ProcessOptions; live: boolean }) {
  const [preview, setPreview] = useState<ProcessResult | null>(null);
  const [busy, setBusy] = useState(false);
  const result = outcome?.ok ? outcome.result : preview;
  const url = useObjectUrl(result?.blob);

  useEffect(() => {
    setPreview(null);
    if (!live) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const r = await processImage(item.file, options);
        if (!cancelled) setPreview(r);
      } catch {
        /* preview errors surface on compress */
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [item, options, live]);

  return (
    <Panel className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium">{outcome?.ok ? "Result" : "Preview"}</h2>
          <p className="text-xs text-muted-foreground">{item.file.name}</p>
        </div>
        {busy && <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" /> Rendering preview…</span>}
      </div>
      {url ? (
        <CompareSlider before={item.previewUrl} after={url} afterLabel={outcome?.ok ? "Compressed" : "Preview"} />
      ) : (
        <img src={item.previewUrl} alt={item.file.name} className="max-h-[420px] w-full rounded-xl border bg-checker object-contain" />
      )}
      {result && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Metric label="Original size" value={formatBytes(item.file.size)} />
          <Metric label={outcome?.ok ? "Compressed size" : "Estimated size"} value={formatBytes(result.blob.size)} />
          <Metric label="Saved" value={<SavingsBadge percent={savingsPercent(item.file.size, result.blob.size)} />} />
          <Metric label="Output" value={`${FORMAT_LABEL[result.format]} · ${result.width}×${result.height}`} />
        </div>
      )}
      {outcome?.ok && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className={cn("flex items-center gap-1.5 text-sm", outcome.result.metadataStripped ? "text-success" : "text-muted-foreground")}>
            <ShieldCheck className="size-4" />
            {outcome.result.metadataStripped ? "Metadata stripped from output" : "Original EXIF metadata kept"}
          </p>
          <Button variant="brand" onClick={() => downloadBlob(outcome.result.blob, outcome.result.filename)}>
            <Download /> Download
          </Button>
        </div>
      )}
      {outcome && !outcome.ok && <p className="text-sm text-destructive">{outcome.error}</p>}
    </Panel>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-surface p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 font-mono text-sm font-medium">{value}</div>
    </div>
  );
}
