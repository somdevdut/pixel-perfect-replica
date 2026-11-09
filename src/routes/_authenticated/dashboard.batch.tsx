import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Clock, Download, FileArchive, Loader2, Play, RotateCcw, Trash2, X, XCircle } from "lucide-react";
import { PageHeader, Panel, SavingsBadge, StatusBadge } from "@/components/dashboard/ui-bits";
import { DropZone } from "@/components/tools/drop-zone";
import { CheckRow, FormatPicker, QualitySlider } from "@/components/tools/settings-controls";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useImageQueue, type QueuedImage } from "@/hooks/use-image-queue";
import {
  BATCH_CONCURRENCY,
  DEFAULT_QUALITY,
  MAX_BATCH_FILES,
  type OutputFormat,
  formatBytes,
  resolveFormat,
  runWithConcurrency,
  savingsPercent,
} from "@/lib/format";
import { buildZip, downloadBlob, processImage, type ProcessResult } from "@/lib/image-processing";
import { saveJobResults, startJob, type FileRecord } from "@/services/jobs";

export const Route = createFileRoute("/_authenticated/dashboard/batch")({
  head: () => ({ meta: [{ title: "Batch Processing – PixelForge" }] }),
  component: BatchPage,
});

type FileState =
  | { status: "pending" }
  | { status: "processing" }
  | { status: "completed"; result: ProcessResult }
  | { status: "failed"; error: string };

function BatchPage() {
  const queue = useImageQueue({ max: MAX_BATCH_FILES });
  const qc = useQueryClient();
  const [format, setFormat] = useState<OutputFormat>("webp");
  const [quality, setQuality] = useState(DEFAULT_QUALITY);
  const [strip, setStrip] = useState(true);
  const [states, setStates] = useState<Record<string, FileState>>({});
  const [jobId, setJobId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [zipping, setZipping] = useState(false);
  const jobRef = useRef<string | null>(null);

  const stateOf = (id: string): FileState => states[id] ?? { status: "pending" };
  const set = (id: string, s: FileState) => setStates((prev) => ({ ...prev, [id]: s }));

  async function run(items: QueuedImage[], retry = false) {
    if (!items.length) return;
    setRunning(true);
    items.forEach((i) => set(i.id, { status: "pending" }));
    let id = retry ? jobRef.current : null;
    if (!id) {
      try {
        id = await startJob("batch", items.length);
      } catch {
        toast.error("Couldn't create a job record — results won't be saved to history");
      }
      jobRef.current = id;
      setJobId(id);
    }
    const records: FileRecord[] = [];
    await runWithConcurrency(items, BATCH_CONCURRENCY, async (item) => {
      set(item.id, { status: "processing" });
      try {
        const result = await processImage(item.file, { format, quality, stripMetadata: strip });
        set(item.id, { status: "completed", result });
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
        set(item.id, { status: "failed", error });
        if (!retry) {
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
      }
    });
    if (id) {
      try {
        // On retry, replace earlier failed rows for files that now succeeded.
        if (retry) {
          const { supabase } = await import("@/integrations/supabase/client");
          const names = records.map((r) => r.original_filename);
          if (names.length)
            await supabase.from("files").delete().eq("job_id", id).eq("status", "failed").in("original_filename", names);
        }
        await saveJobResults(id, records);
        qc.invalidateQueries();
      } catch {
        toast.error("Processed, but saving to history failed");
      }
    }
    setRunning(false);
    const ok = records.filter((r) => r.status === "completed").length;
    const failed = items.length - ok;
    if (failed === 0) toast.success(`Batch complete · ${ok} image${ok === 1 ? "" : "s"} processed`);
    else toast.warning(`Batch finished · ${ok} succeeded, ${failed} failed`);
  }

  function start() {
    jobRef.current = null;
    setStates({});
    run(queue.items);
  }

  function retryFailed() {
    run(queue.items.filter((i) => stateOf(i.id).status === "failed"), true);
  }

  const summary = useMemo(() => {
    let completed = 0, failed = 0, processing = 0, orig = 0, comp = 0;
    for (const item of queue.items) {
      const s = states[item.id];
      if (s?.status === "completed") {
        completed++;
        orig += item.file.size;
        comp += s.result.blob.size;
      } else if (s?.status === "failed") failed++;
      else if (s?.status === "processing") processing++;
    }
    const total = queue.items.length;
    const pending = total - completed - failed - processing;
    return { total, completed, failed, processing, pending, orig, comp, finished: completed + failed };
  }, [queue.items, states]);

  const started = Object.keys(states).length > 0;
  const pct = summary.total ? Math.round((summary.finished / summary.total) * 100) : 0;

  async function downloadZip() {
    const entries = queue.items.flatMap((i) => {
      const s = states[i.id];
      return s?.status === "completed" ? [{ name: s.result.filename, blob: s.result.blob }] : [];
    });
    setZipping(true);
    try {
      downloadBlob(await buildZip(entries), `pixelforge-batch-${(jobId ?? "export").slice(0, 8)}.zip`);
    } finally {
      setZipping(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Batch Processing" description={`Process up to ${MAX_BATCH_FILES} images at once, ${BATCH_CONCURRENCY} at a time, and download them as one ZIP.`} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <DropZone onFiles={queue.addFiles} busy={queue.adding} compact={queue.items.length > 0} />

          {started && (
            <Panel className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Batch Processing: <span className="font-mono">{pct}%</span></p>
                {jobId && <span className="font-mono text-xs text-muted-foreground">Job {jobId.slice(0, 8)}</span>}
              </div>
              <Progress value={pct} />
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="size-3.5 text-success" /> {summary.completed} completed</span>
                <span className="flex items-center gap-1"><Loader2 className="size-3.5 text-primary" /> {summary.processing} processing</span>
                <span className="flex items-center gap-1"><Clock className="size-3.5" /> {summary.pending} pending</span>
                <span className="flex items-center gap-1"><XCircle className="size-3.5 text-destructive" /> {summary.failed} failed</span>
              </div>
            </Panel>
          )}

          {queue.items.length > 0 && (
            <Panel className="p-0">
              <div className="flex items-center justify-between border-b px-5 py-3">
                <p className="text-sm font-medium">{queue.items.length} file{queue.items.length === 1 ? "" : "s"}</p>
                <Button variant="ghost" size="sm" onClick={() => { queue.clear(); setStates({}); setJobId(null); }} disabled={running}>
                  <Trash2 /> Clear all
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-5 py-2 font-medium">Filename</th>
                      <th className="px-3 py-2 font-medium">Original</th>
                      <th className="px-3 py-2 font-medium">Output</th>
                      <th className="px-3 py-2 font-medium">Saved</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-5 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {queue.items.map((item) => {
                      const s = stateOf(item.id);
                      return (
                        <tr key={item.id}>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-3">
                              <img src={item.previewUrl} alt="" className="size-9 shrink-0 rounded border bg-checker object-cover" />
                              <span className="max-w-[200px] truncate">{item.file.name}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 font-mono text-xs">{formatBytes(item.file.size)}</td>
                          <td className="px-3 py-2.5 font-mono text-xs">{s.status === "completed" ? formatBytes(s.result.blob.size) : "—"}</td>
                          <td className="px-3 py-2.5">{s.status === "completed" ? <SavingsBadge percent={savingsPercent(item.file.size, s.result.blob.size)} /> : "—"}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {s.status === "processing" && <Loader2 className="size-3.5 animate-spin text-primary" />}
                              <StatusBadge status={s.status} />
                            </div>
                            {s.status === "failed" && <p className="mt-1 max-w-[180px] text-xs text-destructive">{s.error}</p>}
                          </td>
                          <td className="px-5 py-2.5 text-right">
                            {s.status === "completed" ? (
                              <Button size="icon" variant="soft" onClick={() => downloadBlob(s.result.blob, s.result.filename)} aria-label={`Download ${s.result.filename}`}>
                                <Download />
                              </Button>
                            ) : (
                              <Button size="icon" variant="ghost" onClick={() => queue.remove(item.id)} disabled={running} aria-label={`Remove ${item.file.name}`}>
                                <X />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          {started && !running && summary.finished === summary.total && (
            <Panel>
              <h2 className="font-medium">Batch summary</h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  ["Total uploaded", summary.total],
                  ["Successfully processed", summary.completed],
                  ["Failed", summary.failed],
                  ["Total original size", formatBytes(summary.orig)],
                  ["Total compressed size", formatBytes(summary.comp)],
                  ["Total storage saved", `${formatBytes(Math.max(0, summary.orig - summary.comp))} (${savingsPercent(summary.orig, summary.comp).toFixed(1)}%)`],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-surface p-3">
                    <dt className="text-xs text-muted-foreground">{l}</dt>
                    <dd className="mt-1 font-mono text-sm font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Panel className="space-y-5">
            <h2 className="font-medium">Batch settings</h2>
            <FormatPicker value={format} onChange={setFormat} options={["original", "jpeg", "png", "webp", "avif"]} />
            <QualitySlider value={quality} onChange={setQuality} />
            <div className="border-t pt-4">
              <CheckRow id="strip-b" checked={strip} onChange={setStrip} label="Remove Image Metadata (Recommended for Privacy)" />
            </div>
          </Panel>
          <Button variant="brand" size="lg" className="w-full" onClick={start} disabled={!queue.items.length || running}>
            {running ? <Loader2 className="animate-spin" /> : <Play />}
            {running ? `Processing… ${pct}%` : "Start batch"}
          </Button>
          {summary.failed > 0 && !running && (
            <Button variant="outline" className="w-full" onClick={retryFailed}>
              <RotateCcw /> Retry {summary.failed} failed
            </Button>
          )}
          {summary.completed > 0 && !running && (
            <Button variant="outline" className="w-full" onClick={downloadZip} disabled={zipping}>
              {zipping ? <Loader2 className="animate-spin" /> : <FileArchive />} Download ZIP ({summary.completed})
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
