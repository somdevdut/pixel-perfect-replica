/** Pure helpers shared by every tool page. Kept free of browser APIs so they can be unit-tested. */

export const DEFAULT_QUALITY = 80;
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB per image
export const MAX_BATCH_FILES = 50;
export const BATCH_CONCURRENCY = 3;

export type ConcreteFormat = "jpeg" | "png" | "webp" | "avif";
export type OutputFormat = "original" | ConcreteFormat;

export const FORMAT_LABEL: Record<ConcreteFormat, string> = {
  jpeg: "JPEG",
  png: "PNG",
  webp: "WebP",
  avif: "AVIF",
};
export const FORMAT_EXT: Record<ConcreteFormat, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
};
export const FORMAT_MIME: Record<ConcreteFormat, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

/** Savings (%) = ((Original - Compressed) / Original) × 100. Negative means the output grew. */
export function savingsPercent(originalSize: number, compressedSize: number): number {
  if (!originalSize || originalSize <= 0) return 0;
  return ((originalSize - compressedSize) / originalSize) * 100;
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const v = bytes / 1024 ** i;
  return `${v.toFixed(i === 0 ? 0 : digits)} ${units[i]}`;
}

/** Identify the real image type from its first bytes. Never trusts filename or browser MIME. */
export function detectFormatFromBytes(b: Uint8Array): ConcreteFormat | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  )
    return "png";
  const ascii = (start: number, len: number) =>
    String.fromCharCode(...Array.from(b.slice(start, start + len)));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "webp";
  if (b.length >= 12 && ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (brand === "avif" || brand === "avis") return "avif";
    // Some encoders use a generic major brand and list avif among compatible brands.
    const head = ascii(8, Math.min(b.length - 8, 40));
    if (head.includes("avif")) return "avif";
  }
  return null;
}

const ALLOWED_EXT: Record<string, ConcreteFormat> = {
  jpg: "jpeg",
  jpeg: "jpeg",
  png: "png",
  webp: "webp",
  avif: "avif",
};

export function extensionFormat(filename: string): ConcreteFormat | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return ALLOWED_EXT[ext] ?? null;
}

export function baseName(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i > 0 ? filename.slice(0, i) : filename;
}

export function outputFilename(original: string, format: ConcreteFormat, suffix = ""): string {
  return `${baseName(original)}${suffix}.${FORMAT_EXT[format]}`;
}

export function resolveFormat(output: OutputFormat, source: ConcreteFormat): ConcreteFormat {
  return output === "original" ? source : output;
}

/** Map the 1–100 quality slider to a PNG palette size (0 = lossless). */
export function pngColorsForQuality(quality: number): number {
  if (quality >= 100) return 0;
  const q = Math.max(1, Math.min(99, quality));
  return Math.max(2, Math.round(2 + (q / 99) ** 1.4 * 254));
}

export type FitMode = "inside" | "cover" | "contain" | "fill";

/** Output canvas size for a resize request, mirroring Sharp's fit semantics. */
export function computeTargetSize(
  srcW: number,
  srcH: number,
  opts: { width?: number | null; height?: number | null; fit: FitMode; keepAspect: boolean },
): { width: number; height: number } {
  const w = opts.width && opts.width > 0 ? Math.round(opts.width) : null;
  const h = opts.height && opts.height > 0 ? Math.round(opts.height) : null;
  if (!w && !h) return { width: srcW, height: srcH };
  if (!w || !h) {
    if (!opts.keepAspect) return { width: w ?? srcW, height: h ?? srcH };
    const scale = w ? w / srcW : (h as number) / srcH;
    return { width: Math.max(1, Math.round(srcW * scale)), height: Math.max(1, Math.round(srcH * scale)) };
  }
  if (!opts.keepAspect || opts.fit === "fill" || opts.fit === "cover" || opts.fit === "contain") {
    return { width: w, height: h };
  }
  // inside: largest size that fits within w×h while keeping proportions
  const scale = Math.min(w / srcW, h / srcH);
  return { width: Math.max(1, Math.round(srcW * scale)), height: Math.max(1, Math.round(srcH * scale)) };
}

/** Run async work over items with a fixed number of workers in flight. */
export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  });
  await Promise.all(lanes);
}

/** De-duplicate names for ZIP entries: a.jpg, a (2).jpg, ... */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const count = seen.get(n) ?? 0;
    seen.set(n, count + 1);
    if (count === 0) return n;
    const i = n.lastIndexOf(".");
    return i > 0 ? `${n.slice(0, i)} (${count + 1})${n.slice(i)}` : `${n} (${count + 1})`;
  });
}
