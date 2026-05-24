// Pure helpers shared by R2 edge functions.
// Kept side-effect free so they can be unit-tested with Deno.

export const ALLOWED_FOLDERS = new Set([
  "annonces",
  "avatars",
  "premium",
  "documents",
  "ads",
]);

export const ALLOWED_EXTS = new Set(["webp", "jpg", "jpeg", "png"]);

export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/** Returns true when `key` is owned by `userId`.
 * Keys must be of the form `<folder>/<userId>/<filename>`.
 * Defensive against path traversal (`..`), absolute paths, and trailing slashes.
 */
export function isOwnedKey(key: unknown, userId: unknown): boolean {
  if (typeof key !== "string" || typeof userId !== "string") return false;
  if (key.length === 0 || key.length > 512) return false;
  if (userId.length === 0) return false;
  if (key.includes("..") || key.startsWith("/")) return false;

  const parts = key.split("/");
  if (parts.length < 3) return false;
  const [folder, ownerId, ...rest] = parts;
  if (!ALLOWED_FOLDERS.has(folder)) return false;
  if (ownerId !== userId) return false;
  if (rest.join("/").length === 0) return false;
  return true;
}

/** Extract an R2 object key from a public URL given the configured public prefix. */
export function keyFromUrl(url: unknown, publicUrl: string): string | null {
  if (typeof url !== "string") return null;
  const prefix = publicUrl.replace(/\/$/, "") + "/";
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return key.length > 0 ? key : null;
}

/** Magic-byte sniffing — small and dependency-free.
 * Returns the detected MIME type or null if unknown / not an allowed image. */
export function sniffMime(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e &&
    bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a &&
    bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return "image/png";
  // WEBP: 'RIFF'....'WEBP'
  if (
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return "image/webp";
  return null;
}
