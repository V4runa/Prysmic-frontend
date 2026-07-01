import imageCompression from "browser-image-compression";

// Compress in the browser BEFORE upload so a big phone photo never leaves the
// device at full weight — this keeps the DB-backed store lean. Non-images and
// animated GIFs (which a canvas can't re-encode without losing animation) pass
// through untouched.

const COMPRESSIBLE = new Set(["image/png", "image/jpeg", "image/webp"]);

const TARGET_MAX_MB = 2;
const MAX_DIMENSION = 2048;

/** Swap a filename's extension to .webp for the re-encoded output. */
function toWebpName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot === -1 ? name : name.slice(0, dot);
  return `${base}.webp`;
}

/**
 * Returns a (usually smaller) File. On any failure it falls back to the
 * original so an upload is never blocked by compression.
 */
export async function compressImage(file: File): Promise<File> {
  if (!COMPRESSIBLE.has(file.type)) return file;

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: TARGET_MAX_MB,
      maxWidthOrHeight: MAX_DIMENSION,
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: 0.82,
    });

    // Guard against the rare case where re-encoding grew the file.
    if (compressed.size >= file.size) return file;

    return new File([compressed], toWebpName(file.name), {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
