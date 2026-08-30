/**
 * Client-side photo compression for the build submission form.
 *
 * Vercel serverless functions cap request bodies at ~4.5MB, and phone photos
 * routinely run 5-15MB each — a few of those in one submission would blow past
 * that limit before the request even reaches our API route. Resizing and
 * re-encoding each photo in the browser first keeps a full submission well
 * under that ceiling.
 *
 * Falls back to returning the original file untouched if the browser can't
 * decode it (e.g. an unsupported format) — better to attempt the upload than
 * silently drop the photo.
 */
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.72;

export async function compressImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  let { width, height } = bitmap;
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
  if (!blob) return file;

  const newName = file.name.replace(/\.\w+$/, "") + ".jpg";
  return new File([blob], newName, { type: "image/jpeg" });
}
