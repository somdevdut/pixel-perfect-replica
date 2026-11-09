import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { ConcreteFormat } from "@/lib/format";
import { MAX_BATCH_FILES } from "@/lib/format";
import { ImageValidationError, inspectImage } from "@/lib/image-processing";

export interface QueuedImage {
  id: string;
  file: File;
  previewUrl: string;
  format: ConcreteFormat;
  width: number;
  height: number;
}

/** Holds validated uploads with object-URL previews; revokes URLs on removal/unmount. */
export function useImageQueue(opts: { max?: number; single?: boolean } = {}) {
  const max = opts.single ? 1 : (opts.max ?? MAX_BATCH_FILES);
  const [items, setItems] = useState<QueuedImage[]>([]);
  const [adding, setAdding] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl)), []);

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const files = Array.from(list);
      if (!files.length) return;
      setAdding(true);
      const current = opts.single ? 0 : itemsRef.current.length;
      const room = Math.max(0, max - current);
      if (files.length > room) {
        toast.error(`You can add up to ${max} image${max === 1 ? "" : "s"} at a time`);
      }
      const accepted: QueuedImage[] = [];
      for (const file of files.slice(0, room || (opts.single ? 1 : 0))) {
        try {
          const info = await inspectImage(file);
          accepted.push({
            id: crypto.randomUUID(),
            file,
            previewUrl: URL.createObjectURL(file),
            ...info,
          });
        } catch (e) {
          const msg = e instanceof ImageValidationError ? e.message : "Could not read image";
          toast.error(`${file.name}: ${msg}`);
        }
      }
      setItems((prev) => {
        if (opts.single) {
          prev.forEach((i) => URL.revokeObjectURL(i.previewUrl));
          return accepted.slice(0, 1);
        }
        return [...prev, ...accepted];
      });
      setAdding(false);
      return accepted;
    },
    [max, opts.single],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const hit = prev.find((i) => i.id === id);
      if (hit) URL.revokeObjectURL(hit.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setItems((prev) => {
      prev.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      return [];
    });
  }, []);

  return { items, addFiles, remove, clear, adding };
}

/** Object URL for a blob that is revoked when the blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
