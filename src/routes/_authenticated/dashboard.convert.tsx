import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Download, Loader2, Repeat } from "lucide-react";
import { PageHeader, Panel, SavingsBadge } from "@/components/dashboard/ui-bits";
import { DropZone } from "@/components/tools/drop-zone";
import { CompareSlider } from "@/components/tools/compare-slider";
import { FormatPicker, QualitySlider } from "@/components/tools/settings-controls";
import { Button } from "@/components/ui/button";
import { useImageQueue, useObjectUrl } from "@/hooks/use-image-queue";
import { DEFAULT_QUALITY, FORMAT_LABEL, type ConcreteFormat, formatBytes, savingsPercent } from "@/lib/format";
import { downloadBlob, processImage, type ProcessResult } from "@/lib/image-processing";
import { recordSingle } from "@/services/jobs";

export const Route = createFileRoute("/_authenticated/dashboard/convert")({
  head: () => ({ meta: [{ title: "Format Converter – PixelForge" }] }),
  component: ConvertPage,
});

function ConvertPage() {
  const queue = useImageQueue({ single: true });
  const qc = useQueryClient();
  const item = queue.items[0] ?? null;
  const [target, setTarget] = useState<ConcreteFormat>("webp");
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [busy, setBusy] = useState(false);
  const url = useObjectUrl(result?.blob);

  useEffect(() => setResult(null), [item, target, quality]);

  async function convert() {
    if (!item) return;
    setBusy(true);
    try {
      const r = await processImage(item.file, { format: target, quality, stripMetadata: true });
      setResult(r);
      toast.success(`Converted to ${FORMAT_LABEL[r.format]}`);
      await recordSingle("convert", {
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
      toast.error(e instanceof Error ? e.message : "Conversion failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Format Converter" description="Convert between JPEG, PNG, WebP and AVIF." />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <DropZone onFiles={queue.addFiles} multiple={false} busy={queue.adding} compact={!!item} hint={item ? "Drop another image to replace" : undefined} />
          {item && (
            <Panel className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="truncate font-medium">{item.file.name}</span>
                <span className="rounded bg-surface px-1.5 py-0.5 font-mono text-xs">{FORMAT_LABEL[item.format]}</span>
                <ArrowRight className="size-3.5 text-muted-foreground" />
                <span className="rounded bg-primary-soft px-1.5 py-0.5 font-mono text-xs text-accent-foreground">{FORMAT_LABEL[target]}</span>
              </div>
              {url ? (
                <CompareSlider before={item.previewUrl} after={url} afterLabel={FORMAT_LABEL[target]} />
              ) : (
                <img src={item.previewUrl} alt={item.file.name} className="max-h-[420px] w-full rounded-xl border bg-checker object-contain" />
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-surface p-3">
                  <p className="text-xs text-muted-foreground">Original</p>
                  <p className="mt-1 font-mono text-sm font-medium">{formatBytes(item.file.size)} · {FORMAT_LABEL[item.format]}</p>
                </div>
                <div className="rounded-lg bg-surface p-3">
                  <p className="text-xs text-muted-foreground">Converted</p>
                  <p className="mt-1 font-mono text-sm font-medium">{result ? `${formatBytes(result.blob.size)} · ${FORMAT_LABEL[result.format]}` : "—"}</p>
                </div>
                <div className="rounded-lg bg-surface p-3">
                  <p className="text-xs text-muted-foreground">Difference</p>
                  <div className="mt-1">{result ? <SavingsBadge percent={savingsPercent(item.file.size, result.blob.size)} /> : "—"}</div>
                </div>
              </div>
            </Panel>
          )}
        </div>
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Panel className="space-y-5">
            <FormatPicker label="Target format" value={target} onChange={setTarget} options={["jpeg", "png", "webp", "avif"]} />
            <QualitySlider value={quality} onChange={setQuality} />
            {target === "jpeg" && <p className="text-xs text-muted-foreground">JPEG has no transparency — transparent areas become white.</p>}
          </Panel>
          <Button variant="brand" size="lg" className="w-full" onClick={convert} disabled={!item || busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Repeat />} Convert
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
