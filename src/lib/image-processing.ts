/**
 * Real image processing in the browser. Decodes with createImageBitmap, resizes/crops on a canvas,
 * and encodes with the browser (JPEG/WebP), UPNG (palette PNG) or a WASM AVIF encoder.
 * Only call from event handlers / effects — never during SSR.
 */
import {
  type ConcreteFormat,
  type FitMode,
  type OutputFormat,
  FORMAT_MIME,
  MAX_FILE_BYTES,
  computeTargetSize,
  detectFormatFromBytes,
  extensionFormat,
  outputFilename,
  pngColorsForQuality,
  resolveFormat,
} from "./format";
import { extractJpegExifSegments, insertJpegSegments } from "./exif";

export type CropPosition = "center" | "attention";

export interface ResizeOptions {
  width?: number | null;
  height?: number | null;
  fit: FitMode;
  keepAspect: boolean;
  position: CropPosition;
}

export interface ProcessOptions {
  format: OutputFormat;
  quality: number;
  stripMetadata: boolean;
  resize?: ResizeOptions | null;
  filenameSuffix?: string;
}

export interface ProcessResult {
  blob: Blob;
  filename: string;
  format: ConcreteFormat;
  width: number;
  height: number;
  metadataStripped: boolean;
}

export interface InspectedImage {
  format: ConcreteFormat;
  width: number;
  height: number;
}

export class ImageValidationError extends Error {}

/** Validate size, extension and file signature, then read dimensions. */
export async function inspectImage(file: File): Promise<InspectedImage> {
  if (file.size === 0) throw new ImageValidationError("File is empty");
  if (file.size > MAX_FILE_BYTES)
    throw new ImageValidationError(`File is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB`);
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const format = detectFormatFromBytes(head);
  if (!format) throw new ImageValidationError("Not a JPEG, PNG, WebP or AVIF image");
  const extFormat = extensionFormat(file.name);
  if (!extFormat) throw new ImageValidationError("Unsupported file extension");
  const bmp = await decode(file, format);
  const out = { format, width: bmp.width, height: bmp.height };
  bmp.close();
  return out;
}

async function decode(file: Blob, format: ConcreteFormat): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch (err) {
    if (format === "avif") {
      const { default: decodeAvif } = await import("@jsquash/avif/decode");
      const data = await decodeAvif(await file.arrayBuffer());
      if (!data) throw new ImageValidationError("Could not decode AVIF image");
      return await createImageBitmap(data);
    }
    throw new ImageValidationError("Image could not be decoded — it may be corrupted");
  }
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("Canvas is not available in this browser");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return { canvas: c, ctx };
}

/** Find the most "interesting" crop window (edges + saturation), like Sharp's attention strategy. */
function attentionCrop(
  bmp: ImageBitmap,
  cropW: number,
  cropH: number,
): { sx: number; sy: number } {
  const maxSide = 160;
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.max(2, Math.round(bmp.width * scale));
  const h = Math.max(2, Math.round(bmp.height * scale));
  const { ctx } = makeCanvas(w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const luma = new Float32Array(w * h);
  const score = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
    luma[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const sat = max === 0 ? 0 : (max - min) / max;
    // Rough skin-tone boost so faces win over flat colourful backgrounds.
    const skin = r > 95 && g > 40 && b > 20 && r > g && r > b && r - Math.min(g, b) > 15 ? 0.6 : 0;
    score[i] = sat * 40 + skin * 60;
  }
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const gx = luma[i + 1] - luma[i - 1];
      const gy = luma[i + w] - luma[i - w];
      score[i] += Math.sqrt(gx * gx + gy * gy);
    }
  }
  // Integral image for O(1) window sums.
  const I = new Float64Array((w + 1) * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0;
    for (let x = 1; x <= w; x++) {
      row += score[(y - 1) * w + (x - 1)];
      I[y * (w + 1) + x] = I[(y - 1) * (w + 1) + x] + row;
    }
  }
  const cw = Math.max(1, Math.min(w, Math.round(cropW * scale)));
  const ch = Math.max(1, Math.min(h, Math.round(cropH * scale)));
  let best = -1, bx = 0, by = 0;
  for (let y = 0; y + ch <= h; y++) {
    for (let x = 0; x + cw <= w; x++) {
      const s =
        I[(y + ch) * (w + 1) + (x + cw)] - I[y * (w + 1) + (x + cw)] -
        I[(y + ch) * (w + 1) + x] + I[y * (w + 1) + x];
      if (s > best) { best = s; bx = x; by = y; }
    }
  }
  return {
    sx: Math.min(bmp.width - cropW, Math.max(0, Math.round(bx / scale))),
    sy: Math.min(bmp.height - cropH, Math.max(0, Math.round(by / scale))),
  };
}

function draw(bmp: ImageBitmap, resize: ResizeOptions | null | undefined, opaque: boolean) {
  const target = resize
    ? computeTargetSize(bmp.width, bmp.height, resize)
    : { width: bmp.width, height: bmp.height };
  const { canvas, ctx } = makeCanvas(target.width, target.height);
  if (opaque) {
    ctx.fillStyle = "#ffffff"; // JPEG has no alpha channel; flatten onto white
    ctx.fillRect(0, 0, target.width, target.height);
  }
  const fit = resize && resize.keepAspect ? resize.fit : "fill";
  if (!resize || fit === "fill" || fit === "inside") {
    ctx.drawImage(bmp, 0, 0, target.width, target.height);
  } else if (fit === "cover") {
    const scale = Math.max(target.width / bmp.width, target.height / bmp.height);
    const cropW = Math.min(bmp.width, Math.round(target.width / scale));
    const cropH = Math.min(bmp.height, Math.round(target.height / scale));
    const { sx, sy } =
      resize.position === "attention"
        ? attentionCrop(bmp, cropW, cropH)
        : { sx: Math.round((bmp.width - cropW) / 2), sy: Math.round((bmp.height - cropH) / 2) };
    ctx.drawImage(bmp, sx, sy, cropW, cropH, 0, 0, target.width, target.height);
  } else {
    // contain: letterbox inside the box
    const scale = Math.min(target.width / bmp.width, target.height / bmp.height);
    const dw = Math.round(bmp.width * scale);
    const dh = Math.round(bmp.height * scale);
    ctx.drawImage(bmp, Math.round((target.width - dw) / 2), Math.round((target.height - dh) / 2), dw, dh);
  }
  return { canvas, ctx, width: target.width, height: target.height };
}

function canvasToBlob(canvas: HTMLCanvasElement, mime: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), mime, quality));
}

async function encode(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  format: ConcreteFormat,
  quality: number,
): Promise<Blob> {
  const q = Math.max(1, Math.min(100, quality));
  if (format === "jpeg" || format === "webp") {
    const blob = await canvasToBlob(canvas, FORMAT_MIME[format], q / 100);
    if (!blob || blob.type !== FORMAT_MIME[format])
      throw new Error(`This browser cannot encode ${format.toUpperCase()}`);
    return blob;
  }
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (format === "png") {
    const { default: UPNG } = await import("upng-js");
    const buf = UPNG.encode([data.data.buffer as ArrayBuffer], data.width, data.height, pngColorsForQuality(q));
    return new Blob([buf], { type: "image/png" });
  }
  // AVIF: use the native encoder when present, otherwise the WASM encoder.
  const native = await canvasToBlob(canvas, "image/avif", q / 100);
  if (native && native.type === "image/avif") return native;
  const { default: encodeAvif } = await import("@jsquash/avif/encode");
  const buf = await encodeAvif(data, { quality: q, speed: 6 });
  return new Blob([buf], { type: "image/avif" });
}

export async function processImage(file: File, opts: ProcessOptions): Promise<ProcessResult> {
  const head = new Uint8Array(await file.slice(0, 64).arrayBuffer());
  const source = detectFormatFromBytes(head);
  if (!source) throw new ImageValidationError("Not a JPEG, PNG, WebP or AVIF image");
  if (file.size > MAX_FILE_BYTES) throw new ImageValidationError("File is too large");
  const format = resolveFormat(opts.format, source);
  const bmp = await decode(file, source);
  try {
    const { canvas, ctx, width, height } = draw(bmp, opts.resize, format === "jpeg");
    let blob = await encode(canvas, ctx, format, opts.quality);
    let metadataStripped = true;
    if (!opts.stripMetadata && source === "jpeg" && format === "jpeg") {
      const segments = extractJpegExifSegments(new Uint8Array(await file.arrayBuffer()));
      if (segments.length) {
        const merged = insertJpegSegments(new Uint8Array(await blob.arrayBuffer()), segments);
        blob = new Blob([merged as BlobPart], { type: "image/jpeg" });
        metadataStripped = false;
      }
    }
    return {
      blob,
      filename: outputFilename(file.name, format, opts.filenameSuffix ?? ""),
      format,
      width,
      height,
      metadataStripped,
    };
  } finally {
    bmp.close();
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export async function buildZip(entries: { name: string; blob: Blob }[]): Promise<Blob> {
  const { zipSync } = await import("fflate");
  const { uniqueNames } = await import("./format");
  const names = uniqueNames(entries.map((e) => e.name));
  const files: Record<string, [Uint8Array, { level: 0 }]> = {};
  for (let i = 0; i < entries.length; i++) {
    files[names[i]] = [new Uint8Array(await entries[i].blob.arrayBuffer()), { level: 0 }];
  }
  const zipped = zipSync(files);
  return new Blob([zipped as BlobPart], { type: "application/zip" });
}
