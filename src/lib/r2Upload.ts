import { supabase } from "@/integrations/supabase/client";

export const MAX_LISTING_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
// Target compressed size, beyond which we step dimensions/quality down.
const TARGET_BYTES = 900 * 1024;

/**
 * Adaptive WebP compression: progressively shrinks dimensions and lowers
 * quality until the encoded size is comfortable (≤ ~900 KB) while keeping
 * a quality floor so photos stay sharp.
 *
 * Steps tried in order:
 *   - 1920px @ 0.85
 *   - 1600px @ 0.80
 *   - 1280px @ 0.78
 *   - 1024px @ 0.72
 *   -  800px @ 0.66
 */
export async function compressToWebP(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const steps: Array<{ dim: number; q: number }> = [
    { dim: 1920, q: 0.85 },
    { dim: 1600, q: 0.8 },
    { dim: 1280, q: 0.78 },
    { dim: 1024, q: 0.72 },
    { dim: 800, q: 0.66 },
  ];
  try {
    const bitmap = await createImageBitmap(file);
    let best: File | null = null;
    for (const { dim, q } of steps) {
      const scale = Math.min(1, dim / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(bitmap, 0, 0, w, h);
      const blob: Blob | null = await new Promise((res) =>
        canvas.toBlob((b) => res(b), "image/webp", q),
      );
      if (!blob) continue;
      const out = new File(
        [blob],
        file.name.replace(/\.[^.]+$/, "") + ".webp",
        { type: "image/webp" },
      );
      // Keep the largest acceptable variant
      best = out;
      if (out.size <= TARGET_BYTES) return out;
    }
    return best ?? file;
  } catch {
    return file;
  }
}

export interface UploadOptions {
  folder?: "annonces" | "avatars" | "premium" | "documents" | "ads";
  compress?: boolean;
  onProgress?: (pct: number) => void;
  signal?: AbortSignal;
  /** Total attempts (incl. first). Default 3. */
  retries?: number;
  /** Per-attempt timeout in ms. Default 60s. */
  timeoutMs?: number;
}

async function uploadOnce(
  f: File,
  opts: UploadOptions,
): Promise<{ url: string; key: string }> {
  const session = (await supabase.auth.getSession()).data.session;
  if (!session?.access_token) throw new Error("Session expirée — reconnectez-vous");

  const supabaseUrl = (import.meta.env as ImportMetaEnv).VITE_SUPABASE_URL as string;
  const anonKey = (import.meta.env as ImportMetaEnv).VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const endpoint = `${supabaseUrl}/functions/v1/r2-upload`;

  const form = new FormData();
  form.append("file", f);
  form.append("folder", opts.folder ?? "annonces");
  form.append("ext", f.type === "image/webp" ? "webp" : f.type === "image/png" ? "png" : "jpg");

  const timeoutMs = opts.timeoutMs ?? 60_000;

  return await new Promise<{ url: string; key: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(() => {
      try { xhr.abort(); } catch { /* noop */ }
      finish(() => reject(new Error("Délai d'envoi dépassé (réessayez)")));
    }, timeoutMs);

    xhr.open("POST", endpoint);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.responseType = "json";

    if (opts.signal) {
      if (opts.signal.aborted) {
        try { xhr.abort(); } catch { /* noop */ }
        return finish(() => reject(new DOMException("Aborted", "AbortError")));
      }
      opts.signal.addEventListener(
        "abort",
        () => {
          try { xhr.abort(); } catch { /* noop */ }
          finish(() => reject(new DOMException("Aborted", "AbortError")));
        },
        { once: true },
      );
    }

    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable || !opts.onProgress) return;
      opts.onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onerror = () => finish(() => reject(new Error("Erreur réseau pendant l'upload")));
    xhr.onabort = () => finish(() => reject(new DOMException("Aborted", "AbortError")));
    xhr.onload = () => {
      const body = (xhr.response ?? {}) as { url?: string; key?: string; error?: string };
      if (xhr.status >= 200 && xhr.status < 300 && body.url && body.key) {
        opts.onProgress?.(100);
        finish(() => resolve({ url: body.url!, key: body.key! }));
      } else {
        finish(() => reject(new Error(body.error || `Upload échoué (${xhr.status || "réseau"})`)));
      }
    };
    xhr.send(form);
  });
}

/**
 * Upload a single file to R2 via the edge function, with automatic retries
 * on transient network failures and a per-attempt timeout.
 */
export async function uploadToR2(
  file: File,
  opts: UploadOptions = {},
): Promise<{ url: string; key: string }> {
  let f = file;
  if (opts.compress !== false) f = await compressToWebP(file);

  if (f.size > MAX_BYTES) throw new Error("Image trop lourde (max 5 Mo)");
  if (!ALLOWED.includes(f.type)) throw new Error("Format non supporté (jpg/png/webp uniquement)");

  const attempts = Math.max(1, opts.retries ?? 3);
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await uploadOnce(f, opts);
    } catch (e) {
      lastErr = e;
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      const msg = e instanceof Error ? e.message : "";
      // Don't retry permanent client errors
      if (/Session expirée|Format non supporté|trop lourde|Aucun fichier|non autoris/i.test(msg)) throw e;
      if (i < attempts - 1) {
        opts.onProgress?.(0);
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Upload échoué");
}

/** Delete a single object (by key or url). Best-effort: never throws. */
export async function deleteFromR2(
  ref: { url?: string; key?: string },
): Promise<void> {
  try {
    await supabase.functions.invoke("r2-delete", { body: ref });
  } catch {
    /* swallow */
  }
}

/** Batch-delete several objects in one round-trip. Best-effort. */
export async function deleteFromR2Many(
  urls: string[] = [],
  keys: string[] = [],
): Promise<void> {
  const safeUrls = urls.filter((u) => typeof u === "string" && u.length > 0);
  const safeKeys = keys.filter((k) => typeof k === "string" && k.length > 0);
  if (safeUrls.length === 0 && safeKeys.length === 0) return;
  try {
    await supabase.functions.invoke("r2-delete", {
      body: { urls: safeUrls, keys: safeKeys },
    });
  } catch {
    /* swallow */
  }
}
