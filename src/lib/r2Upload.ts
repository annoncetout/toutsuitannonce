import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/**
 * Compress an image to WebP client-side, max dimension 1920px.
 * Falls back to original file if compression fails or browser can't.
 */
export async function compressToWebP(file: File, maxDim = 1920, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), "image/webp", quality),
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

export interface UploadOptions {
  folder?: "annonces" | "avatars" | "premium" | "documents";
  compress?: boolean;
}

export async function uploadToR2(
  file: File,
  opts: UploadOptions = {},
): Promise<{ url: string; key: string }> {
  let f = file;
  if (opts.compress !== false) f = await compressToWebP(file);

  if (f.size > MAX_BYTES) throw new Error("Image trop lourde (max 5 Mo)");
  if (!ALLOWED.includes(f.type)) throw new Error("Format non supporté (jpg/png/webp uniquement)");

  const form = new FormData();
  form.append("file", f);
  form.append("folder", opts.folder ?? "annonces");
  form.append("ext", f.type === "image/webp" ? "webp" : f.type === "image/png" ? "png" : "jpg");

  const { data, error } = await supabase.functions.invoke<{ url: string; key: string }>(
    "r2-upload",
    { body: form },
  );
  if (error) throw error;
  if (!data?.url) throw new Error("Upload failed");
  return data;
}

export async function deleteFromR2(urlOrKey: { url?: string; key?: string }): Promise<void> {
  await supabase.functions.invoke("r2-delete", { body: urlOrKey });
}
