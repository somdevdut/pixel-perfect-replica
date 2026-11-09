import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const jobsQuery = (limit = 8) =>
  queryOptions({
    queryKey: ["jobs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });

export const recentFilesQuery = (limit = 6) =>
  queryOptions({
    queryKey: ["files", "recent", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("files")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });

/** All completed file rows since a date (analytics + overview totals). Paged past the 1000-row cap. */
export const filesSinceQuery = (sinceIso: string | null) =>
  queryOptions({
    queryKey: ["files", "since", sinceIso],
    queryFn: async () => {
      const rows: {
        created_at: string;
        output_format: string;
        original_format: string;
        original_size: number;
        compressed_size: number | null;
        status: string;
        job_id: string;
      }[] = [];
      const page = 1000;
      for (let from = 0; ; from += page) {
        let q = supabase
          .from("files")
          .select("created_at, output_format, original_format, original_size, compressed_size, status, job_id")
          .order("created_at", { ascending: true })
          .range(from, from + page - 1);
        if (sinceIso) q = q.gte("created_at", sinceIso);
        const { data, error } = await q;
        if (error) throw error;
        rows.push(...data);
        if (data.length < page) break;
      }
      return rows;
    },
  });

export const jobCountQuery = () =>
  queryOptions({
    queryKey: ["jobs", "count"],
    queryFn: async () => {
      const [{ count: total }, { count: batch }] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }),
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("job_type", "batch"),
      ]);
      return { total: total ?? 0, batch: batch ?? 0 };
    },
  });
