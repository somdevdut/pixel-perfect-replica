/**
 * Minimal JPEG metadata helpers. Re-encoding through canvas drops all metadata; when the user
 * chooses to keep it (JPEG → JPEG only) we copy the original APP1/Exif segments back in, with the
 * orientation tag reset because pixels were already rotated on decode.
 */

export function extractJpegExifSegments(src: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  if (src[0] !== 0xff || src[1] !== 0xd8) return out;
  let i = 2;
  while (i + 4 <= src.length) {
    if (src[i] !== 0xff) break;
    const marker = src[i + 1];
    if (marker === 0xda || marker === 0xd9) break; // start of scan / end
    const len = (src[i + 2] << 8) | src[i + 3];
    if (len < 2 || i + 2 + len > src.length) break;
    if (marker === 0xe1) {
      const seg = src.slice(i, i + 2 + len);
      const isExif = String.fromCharCode(...Array.from(seg.slice(4, 8))) === "Exif";
      if (isExif) resetOrientation(seg);
      out.push(seg);
    }
    i += 2 + len;
  }
  return out;
}

function resetOrientation(seg: Uint8Array) {
  const tiff = 10; // FF E1 LL LL 'Exif\0\0'
  if (seg.length < tiff + 8) return;
  const little = seg[tiff] === 0x49;
  const view = new DataView(seg.buffer, seg.byteOffset, seg.byteLength);
  const u16 = (o: number) => view.getUint16(o, little);
  const u32 = (o: number) => view.getUint32(o, little);
  const ifd0 = tiff + u32(tiff + 4);
  if (ifd0 + 2 > seg.length) return;
  const count = u16(ifd0);
  for (let e = 0; e < count; e++) {
    const entry = ifd0 + 2 + e * 12;
    if (entry + 12 > seg.length) return;
    if (u16(entry) === 0x0112) {
      view.setUint16(entry + 8, 1, little);
      return;
    }
  }
}

export function insertJpegSegments(jpeg: Uint8Array, segments: Uint8Array[]): Uint8Array {
  if (!segments.length) return jpeg;
  // Skip the encoder's own APP0 (JFIF) so Exif becomes the first app segment.
  let insertAt = 2;
  if (jpeg[2] === 0xff && jpeg[3] === 0xe0) insertAt = 4 + ((jpeg[4] << 8) | jpeg[5]);
  const extra = segments.reduce((n, s) => n + s.length, 0);
  const out = new Uint8Array(jpeg.length + extra);
  out.set(jpeg.slice(0, insertAt), 0);
  let o = insertAt;
  for (const s of segments) {
    out.set(s, o);
    o += s.length;
  }
  out.set(jpeg.slice(insertAt), o);
  return out;
}

/** True when a JPEG still carries an Exif APP1 block. */
export function jpegHasExif(bytes: Uint8Array): boolean {
  return extractJpegExifSegments(bytes).length > 0;
}
