// Supabase Storage uploader for all user-facing images.
import { supabase } from "@/integrations/supabase/client";

export const MAX_LISTING_IMAGES = 8;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const TARGET_BYTES = 900 * 1024;
const BUCKET = "listing-photos";

/** Adaptive WebP compression (dimensions + quality steps). */
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
  retries?: number;
  timeoutMs?: number;
}

function randomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

async function uploadOnce(
  f: File,
  opts: UploadOptions,
): Promise<{ url: string; key: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) throw new Error("Session expirée — reconnectez-vous");

  const ext = f.type === "image/webp" ? "webp" : f.type === "image/png" ? "png" : "jpg";
  const folder = opts.folder ?? "annonces";
  // Path must start with the user id so storage RLS policies based on
  // (storage.foldername(name))[1] = auth.uid() pass.
  const key = `${user.id}/${folder}/${randomId()}.${ext}`;

  const timeoutMs = opts.timeoutMs ?? 60_000;
  const supabaseUrl = (import.meta.env as any).VITE_SUPABASE_URL as string;
  const anonKey = (import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const encodedKey = key.split("/").map(encodeURIComponent).join("/");
  const endpoint = `${supabaseUrl}/storage/v1/object/${BUCKET}/${encodedKey}`;

  opts.onProgress?.(5);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => {
      xhr.abort();
      reject(new DOMException("Aborted", "AbortError"));
    };

    xhr.open("POST", endpoint, true);
    xhr.timeout = timeoutMs;
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", anonKey);
    xhr.setRequestHeader("Content-Type", f.type || "application/octet-stream");
    xhr.setRequestHeader("cache-control", "31536000");
    xhr.setRequestHeader("x-upsert", "false");

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      const pct = Math.min(99, Math.max(5, Math.round((event.loaded / event.total) * 95)));
      opts.onProgress?.(pct);
    };

    xhr.onload = () => {
      opts.signal?.removeEventListener("abort", abort);
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      let body: any = null;
      try { body = JSON.parse(xhr.responseText); } catch { body = xhr.responseText; }
      const message = typeof body === "string" ? body : body?.message || body?.error || xhr.statusText;
      console.error("[storage] upload failed", { bucket: BUCKET, key, status: xhr.status, body });
      reject(new Error(message || `Upload refusé (${xhr.status})`));
    };

    xhr.onerror = () => {
      opts.signal?.removeEventListener("abort", abort);
      console.error("[storage] upload network error", { bucket: BUCKET, key, endpoint });
      reject(new Error("Connexion au stockage impossible. Vérifiez votre connexion puis réessayez."));
    };

    xhr.ontimeout = () => {
      opts.signal?.removeEventListener("abort", abort);
      reject(new Error("Délai d'envoi dépassé (réessayez)"));
    };

    opts.signal?.addEventListener("abort", abort, { once: true });
    if (opts.signal?.aborted) abort();
    else xhr.send(f);
  }).catch((err) => {
    const m = err instanceof Error ? err.message : "";
    if (/row-level security|not authorized|permission/i.test(m)) {
      throw new Error("Accès refusé au stockage (RLS). Reconnectez-vous.");
    }
    if (/Bucket not found/i.test(m)) {
      throw new Error("Bucket de stockage introuvable");
    }
    if (/fetch|network|Failed to fetch/i.test(m)) {
      throw new Error(`Erreur réseau Supabase: ${m}`);
    }
    throw err instanceof Error ? err : new Error("Upload échoué");
  });

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(key);
  opts.onProgress?.(100);
  return { url: data.publicUrl, key };
}

/* ------------------------- Cloudflare R2 (Worker) ------------------------- */

let workerAvailable: Promise<boolean> | null = null;
/** True when the Cloudflare Worker (prod) is reachable and the Google session is active. */
function hasWorkerSession(): Promise<boolean> {
  if (!workerAvailable) {
    workerAvailable = fetch("/api/auth/me", { credentials: "include" })
      .then(async (r) => {
        if (!r.ok || !(r.headers.get("content-type") || "").includes("json")) return false;
        const j = await r.json();
        return !!j?.authenticated;
      })
      .catch(() => false);
  }
  return workerAvailable;
}

const R2_FOLDER: Record<string, string> = {
  annonces: "announcements",
  avatars: "avatars",
  premium: "shops",
  documents: "documents",
  ads: "ads",
};

function uploadToWorker(f: File, opts: UploadOptions): Promise<{ url: string; key: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", f);
    form.append("folder", R2_FOLDER[opts.folder ?? "annonces"] ?? "announcements");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload", true);
    xhr.withCredentials = true;
    xhr.timeout = opts.timeoutMs ?? 60_000;
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opts.onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 95)));
    };
    xhr.onload = () => {
      let body: any = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300 && body?.url) {
        opts.onProgress?.(100);
        // Same-origin path so the image works on www and apex.
        resolve({ url: `/api/media/${body.key}`, key: body.key });
        return;
      }
      const map: Record<string, string> = {
        unauthenticated: "Session expirée — reconnectez-vous",
        file_too_large: "Image trop lourde",
        unsupported_file_type: "Format non supporté (jpg/png/webp/avif)",
        forbidden: "Action non autorisée",
      };
      reject(new Error(map[body?.error] || `Upload refusé (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Connexion impossible. Réessayez."));
    xhr.ontimeout = () => reject(new Error("Délai d'envoi dépassé (réessayez)"));
    opts.signal?.addEventListener("abort", () => { xhr.abort(); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
    xhr.send(form);
  });
}

function r2KeyFromUrl(url: string): string | null {
  const i = url.indexOf("/api/media/");
  return i === -1 ? null : decodeURIComponent(url.slice(i + "/api/media/".length));
}

async function deleteFromWorker(key: string) {
  try {
    await fetch(`/api/media/${key.split("/").map(encodeURIComponent).join("/")}`, {
      method: "DELETE",
      credentials: "include",
    });
  } catch { /* best effort */ }
}

/** Upload a single file (Cloudflare R2 via Worker when available, else legacy storage). */
export async function uploadToStorage(
  file: File,
  opts: UploadOptions = {},
): Promise<{ url: string; key: string }> {
  let f = file;
  if (opts.compress !== false) f = await compressToWebP(file);

  if (f.size > MAX_BYTES) throw new Error("Image trop lourde (max 5 Mo)");
  if (!ALLOWED.includes(f.type)) throw new Error("Format non supporté (jpg/png/webp uniquement)");

  const useWorker = await hasWorkerSession();
  const attempts = Math.max(1, opts.retries ?? 3);
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return useWorker ? await uploadToWorker(f, opts) : await uploadOnce(f, opts);
    } catch (e) {
      lastErr = e;
      if (e instanceof DOMException && e.name === "AbortError") throw e;
      const msg = e instanceof Error ? e.message : "";
      if (/Session expirée|Format non supporté|trop lourde|non autoris/i.test(msg)) throw e;
      if (i < attempts - 1) {
        opts.onProgress?.(0);
        await new Promise((r) => setTimeout(r, 800 * (i + 1)));
      }
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Upload échoué");
}

function keyFromUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

/** Delete a single object (by key or url). Best-effort: never throws. */
export async function deleteFromStorage(
  ref: { url?: string; key?: string },
): Promise<void> {
  const r2 = ref.url ? r2KeyFromUrl(ref.url) : null;
  if (r2) return deleteFromWorker(r2);
  const key = ref.key ?? (ref.url ? keyFromUrl(ref.url) : null);
  if (!key) return;
  try {
    await supabase.storage.from(BUCKET).remove([key]);
  } catch {
    /* swallow */
  }
}

/** Batch-delete several objects. Best-effort. */
export async function deleteFromStorageMany(
  urls: string[] = [],
  keys: string[] = [],
): Promise<void> {
  const all = new Set<string>();
  for (const k of keys) if (typeof k === "string" && k) all.add(k);
  for (const u of urls) {
    if (typeof u !== "string" || !u) continue;
    const r2 = r2KeyFromUrl(u);
    if (r2) { await deleteFromWorker(r2); continue; }
    const k = keyFromUrl(u);
    if (k) all.add(k);
  }
  if (all.size === 0) return;
  try {
    await supabase.storage.from(BUCKET).remove(Array.from(all));
  } catch {
    /* swallow */
  }
}
