import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Crop, FileImage, HardDrive, Images, Layers, Minimize2, Percent, Repeat } from "lucide-react";
import { EmptyState, PageHeader, Panel, SavingsBadge, StatCard, StatusBadge } from "@/components/dashboard/ui-bits";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { displayName } from "@/hooks/use-auth";
import { FORMAT_LABEL, formatBytes, savingsPercent, type ConcreteFormat } from "@/lib/format";
import { filesSinceQuery, jobCountQuery, jobsQuery, recentFilesQuery } from "@/services/queries";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [{ title: "Overview – PixelForge" }] }),
  component: Overview,
});

const JOB_LABEL: Record<string, string> = { compress: "Compress", batch: "Batch", convert: "Convert", resize: "Resize" };

function Overview() {
  const { user } = Route.useRouteContext();
  const files = useQuery(filesSinceQuery(null));
  const jobs = useQuery(jobsQuery(6));
  const recent = useQuery(recentFilesQuery(6));
  const counts = useQuery(jobCountQuery());

  const done = (files.data ?? []).filter((f) => f.status === "completed");
  const orig = done.reduce((n, f) => n + Number(f.original_size), 0);
  const comp = done.reduce((n, f) => n + Number(f.compressed_size ?? 0), 0);
  const saved = Math.max(0, orig - comp);
  const avg = done.length ? savingsPercent(orig, comp) : 0;
  const loading = files.isLoading || counts.isLoading;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Hi, ${displayName(user)}`}
        description="Here's how your image optimization is going."
        actions={
          <>
            <Button asChild variant="outline"><Link to="/dashboard/batch"><Layers /> Batch</Link></Button>
            <Button asChild variant="brand"><Link to="/dashboard/compress"><Minimize2 /> Compress images</Link></Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[116px] rounded-xl" />)
        ) : (
          <>
            <StatCard label="Total Images Processed" value={done.length.toLocaleString()} icon={Images} />
            <StatCard label="Total Storage Saved" value={formatBytes(saved)} icon={HardDrive} hint={`from ${formatBytes(orig)} original`} />
            <StatCard label="Average Compression" value={`${avg.toFixed(1)}%`} icon={Percent} hint="weighted by file size" />
            <StatCard label="Total Batch Jobs" value={(counts.data?.batch ?? 0).toLocaleString()} icon={Layers} hint={`${counts.data?.total ?? 0} jobs overall`} />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Recent compression jobs</h2>
            <Link to="/dashboard/history" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {jobs.isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : !jobs.data?.length ? (
            <EmptyState icon={FileImage} title="No jobs yet" description="Compress your first image and it will show up here." action={<Button asChild size="sm" variant="brand"><Link to="/dashboard/compress">Start compressing</Link></Button>} />
          ) : (
            <ul className="divide-y">
              {jobs.data.map((j) => (
                <li key={j.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {JOB_LABEL[j.job_type]} · {j.total_files} file{j.total_files === 1 ? "" : "s"}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {j.id.slice(0, 8)} · {format(new Date(j.created_at), "MMM d, HH:mm")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {j.status !== "processing" && j.original_total_size > 0 && (
                      <SavingsBadge percent={savingsPercent(Number(j.original_total_size), Number(j.compressed_total_size))} />
                    )}
                    <StatusBadge status={j.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel>
            <h2 className="font-medium">Quick actions</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { to: "/dashboard/compress", label: "Compress", icon: Minimize2 },
                { to: "/dashboard/batch", label: "Batch", icon: Layers },
                { to: "/dashboard/convert", label: "Convert", icon: Repeat },
                { to: "/dashboard/resize", label: "Resize", icon: Crop },
              ].map((a) => (
                <Link key={a.to} to={a.to} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-3 text-sm font-medium transition-all hover:border-primary/40 hover:bg-primary-soft">
                  <a.icon className="size-4 text-primary" /> {a.label}
                </Link>
              ))}
            </div>
          </Panel>
          <Panel>
            <h2 className="font-medium">Data footprint</h2>
            <p className="mt-1 text-xs text-muted-foreground">Original vs optimized size across all your files</p>
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 flex justify-between text-xs"><span>Original</span><span className="font-mono">{formatBytes(orig)}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-chart-5" style={{ width: orig ? "100%" : "0%" }} /></div>
              </div>
              <div>
                <div className="mb-1 flex justify-between text-xs"><span>Optimized</span><span className="font-mono">{formatBytes(comp)}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{ width: orig ? `${Math.min(100, (comp / orig) * 100)}%` : "0%" }} /></div>
              </div>
            </div>
          </Panel>
          <Panel>
            <h2 className="font-medium">Supported output formats</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(FORMAT_LABEL) as ConcreteFormat[]).map((f) => (
                <span key={f} className="rounded-md border bg-surface px-2.5 py-1 font-mono text-xs">{FORMAT_LABEL[f]}</span>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <h2 className="mb-4 font-medium">Recently processed files</h2>
        {recent.isLoading ? (
          <Skeleton className="h-24" />
        ) : !recent.data?.length ? (
          <p className="text-sm text-muted-foreground">Nothing here yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="pb-2 font-medium">File</th><th className="pb-2 font-medium">Format</th><th className="pb-2 font-medium">Size</th><th className="pb-2 font-medium">Saved</th></tr>
              </thead>
              <tbody className="divide-y">
                {recent.data.map((f) => (
                  <tr key={f.id}>
                    <td className="max-w-[220px] truncate py-2.5 pr-3">{f.original_filename}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs uppercase">{f.original_format} → {f.output_format}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{formatBytes(Number(f.original_size))} → {f.compressed_size != null ? formatBytes(Number(f.compressed_size)) : "—"}</td>
                    <td className="py-2.5">{f.status === "completed" && f.compressed_size != null ? <SavingsBadge percent={savingsPercent(Number(f.original_size), Number(f.compressed_size))} /> : <StatusBadge status={f.status} />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
