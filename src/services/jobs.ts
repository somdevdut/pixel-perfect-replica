import { supabase } from "@/integrations/supabase/client";
import { savingsPercent } from "@/lib/format";

export type JobType = "compress" | "batch" | "convert" | "resize";

export interface FileRecord {
  original_filename: string;
  original_format: string;
  output_format: string;
  original_size: number;
  compressed_size: number | null;
  width: number | null;
  height: number | null;
  metadata_stripped: boolean;
  status: "completed" | "failed";
  error_message?: string | null;
}

/** Creates the job row up front so the UI can show its ID while processing runs. */
export async function startJob(type: JobType, totalFiles: number): Promise<string> {
  const { data, error } = await supabase
    .from("jobs")
    .insert({ job_type: type, total_files: totalFiles, status: "processing" })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** Saves file results for a job and recomputes the job totals + stats from all its file rows. */
export async function saveJobResults(jobId: string, records: FileRecord[]) {
  if (records.length) {
    const { error } = await supabase.from("files").insert(records.map((r) => ({ ...r, job_id: jobId })));
    if (error) throw error;
  }
  const { data: rows, error: readErr } = await supabase
    .from("files")
    .select("status, original_size, compressed_size")
    .eq("job_id", jobId);
  if (readErr) throw readErr;

  const done = rows.filter((r) => r.status === "completed");
  const failed = rows.length - done.length;
  const original = done.reduce((n, r) => n + Number(r.original_size), 0);
  const compressed = done.reduce((n, r) => n + Number(r.compressed_size ?? 0), 0);
  const status = failed === 0 ? "completed" : done.length === 0 ? "failed" : "partial";

  const { error: jobErr } = await supabase
    .from("jobs")
    .update({
      status,
      total_files: rows.length,
      completed_files: done.length,
      failed_files: failed,
      original_total_size: original,
      compressed_total_size: compressed,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);
  if (jobErr) throw jobErr;

  await supabase.from("compression_stats").delete().eq("job_id", jobId);
  const { error: statErr } = await supabase.from("compression_stats").insert({
    job_id: jobId,
    total_original_size: original,
    total_compressed_size: compressed,
    compression_ratio: Number(savingsPercent(original, compressed).toFixed(2)),
    storage_saved: Math.max(0, original - compressed),
  });
  if (statErr) throw statErr;
}

/** Convenience for single-file tools: one job, one result. Failures are logged, never thrown. */
export async function recordSingle(type: JobType, record: FileRecord) {
  try {
    const id = await startJob(type, 1);
    await saveJobResults(id, [record]);
    return id;
  } catch (e) {
    console.error("Could not save history", e);
    return null;
  }
}
