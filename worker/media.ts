/**
 * Cloudflare R2 media layer for TOUT SUITE ANNONCES.
 *
 * Routes (mounted from worker/index.ts):
 *   POST   /api/upload                       -> multipart upload to R2 (+ metadata in D1)
 *   GET    /api/media/<key>                  -> stream a private R2 object with cache headers
 *   DELETE /api/media/<key>                  -> delete an object the caller owns
 *   GET    /api/announcements/:id/images     -> list images of an announcement
 *   PATCH  /api/announcements/:id/images     -> reorder / set cover
 *   DELETE /api/announcements/:id/images/:imageId -> delete one image (R2 + D1)
 *
 * The bucket stays private: nothing is ever served straight from R2.
 */

export interface R2ObjectLike {
  body: ReadableStream | null;
  httpEtag: string;
  size: number;
  httpMetadata?: { contentType?: string; cacheControl?: string };
  writeHttpMetadata?: (headers: Headers) => void;
}

export interface R2BucketLike {
  get(key: string): Promise<R2ObjectLike | null>;
  put(
    key: string,
    value: ArrayBuffer | ReadableStream,
    options?: { httpMetadata?: { contentType?: string; cacheControl?: string } },
  ): Promise<unknown>;
  delete(key: string | string[]): Promise<void>;
}

export type SessionUser = {
  id: string;
  email: string;
  role: string;
};

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const DOC_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
};

export const FOLDERS = [
  "announcements",
  "avatars",
  "shops",
  "parcels",
  "documents",
  "ads",
] as const;
export type Folder = (typeof FOLDERS)[number];

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

/** Detects the real type from the first bytes so a spoofed MIME header is rejected. */
function sniffType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  const [b0, b1, b2, b3] = bytes;
  if (b0 === 0xff && b1 === 0xd8 && b2 === 0xff) return "image/jpeg";
  if (b0 === 0x89 && b1 === 0x50 && b2 === 0x4e && b3 === 0x47) return "image/png";
  const ascii = (from: number, len: number) =>
    String.fromCharCode(...bytes.slice(from, from + len));
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (ascii(4, 4) === "ftyp") {
    const brand = ascii(8, 4);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  if (ascii(0, 4) === "%PDF") return "application/pdf";
  return null;
}

/** Never trust the browser file name: keep only a short, safe slug. */
function safeSlug(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").toLowerCase();
  const slug = base
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || "fichier";
}

/** Rejects path traversal, absolute paths and anything outside the known folders. */
export function isSafeKey(key: string): boolean {
  if (!key || key.length > 512) return false;
  if (key.startsWith("/") || key.includes("..") || key.includes("//")) return false;
  if (!/^[A-Za-z0-9/_.-]+$/.test(key)) return false;
  return FOLDERS.some((f) => key.startsWith(`${f}/`));
}

/** The owner is encoded in the key: <folder>/<userId>/... */
function keyOwner(key: string): string | null {
  const parts = key.split("/");
  return parts.length >= 3 ? parts[1] : null;
}

function buildKey(folder: Folder, userId: string, parentId: string | null, file: File): string {
  const type = file.type;
  const ext = IMAGE_TYPES[type] ?? DOC_TYPES[type] ?? "bin";
  const unique = `${crypto.randomUUID()}-${safeSlug(file.name || "fichier")}.${ext}`;
  switch (folder) {
    case "announcements":
      return `announcements/${userId}/${parentId || "brouillon"}/${unique}`;
    case "parcels":
      return `parcels/${userId}/${parentId || "brouillon"}/${unique}`;
    case "shops":
      return `shops/${parentId || userId}/${unique}`;
    default:
      return `${folder}/${userId}/${unique}`;
  }
}

/* ------------------------------ D1 metadata ------------------------------ */

async function ownsAnnouncement(
  db: D1Database,
  announcementId: string,
  user: SessionUser,
): Promise<boolean> {
  if (user.role === "admin" || user.role === "moderator") return true;
  const row = await db
    .prepare("SELECT user_id FROM announcements WHERE id = ?1")
    .bind(announcementId)
    .first<{ user_id: string }>();
  return !!row && row.user_id === user.id;
}

/** Inserts the image row, keeping the existing announcement_images schema intact. */
async function insertImageRow(
  db: D1Database,
  row: {
    announcementId: string;
    url: string;
    key: string;
    sortOrder: number;
    isCover: number;
    mime: string;
    size: number;
    fileName: string;
  },
): Promise<string> {
  const id = crypto.randomUUID();
  try {
    // Optional metadata columns (added by worker/migrations/0001_*.sql when applied).
    await db
      .prepare(
        `INSERT INTO announcement_images
           (id, announcement_id, image_url, storage_key, sort_order, is_cover, mime_type, file_size, file_name)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
      )
      .bind(
        id,
        row.announcementId,
        row.url,
        row.key,
        row.sortOrder,
        row.isCover,
        row.mime,
        row.size,
        row.fileName,
      )
      .run();
  } catch {
    await db
      .prepare(
        `INSERT INTO announcement_images
           (id, announcement_id, image_url, storage_key, sort_order, is_cover)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
      )
      .bind(id, row.announcementId, row.url, row.key, row.sortOrder, row.isCover)
      .run();
  }
  return id;
}

/* -------------------------------- handlers ------------------------------- */

export async function handleUpload(
  req: Request,
  bucket: R2BucketLike,
  db: D1Database,
  user: SessionUser | null,
  origin: string,
): Promise<Response> {
  if (!user) return json({ error: "unauthenticated" }, 401);

  const form = await req.formData().catch(() => null);
  if (!form) return json({ error: "invalid_form_data" }, 400);

  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "file_missing" }, 400);
  if (file.size === 0) return json({ error: "file_empty" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "file_too_large", max_bytes: MAX_BYTES }, 413);

  const folderRaw = String(form.get("folder") || "announcements") as Folder;
  const folder: Folder = (FOLDERS as readonly string[]).includes(folderRaw)
    ? folderRaw
    : "announcements";

  const parentIdRaw = form.get("parentId");
  const parentId =
    typeof parentIdRaw === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(parentIdRaw)
      ? parentIdRaw
      : null;

  const allowed = folder === "documents" ? { ...IMAGE_TYPES, ...DOC_TYPES } : IMAGE_TYPES;
  const buffer = await file.arrayBuffer();
  const sniffed = sniffType(new Uint8Array(buffer.slice(0, 16)));
  if (!sniffed || !(sniffed in allowed) || (file.type && !(file.type in allowed))) {
    return json({ error: "unsupported_file_type" }, 415);
  }

  // Announcement images: the caller must own the announcement.
  if (folder === "announcements" && parentId && !(await ownsAnnouncement(db, parentId, user))) {
    return json({ error: "forbidden" }, 403);
  }

  const typedFile = new File([buffer], file.name || "fichier", { type: sniffed });
  const key = buildKey(folder, user.id, parentId, typedFile);

  await bucket.put(key, buffer, {
    httpMetadata: { contentType: sniffed, cacheControl: "public, max-age=31536000, immutable" },
  });

  const url = `${origin}/api/media/${key}`;

  let imageId: string | null = null;
  if (folder === "announcements" && parentId) {
    const next = await db
      .prepare(
        "SELECT COUNT(*) AS n FROM announcement_images WHERE announcement_id = ?1",
      )
      .bind(parentId)
      .first<{ n: number }>();
    const sortOrder = Number(next?.n ?? 0);
    imageId = await insertImageRow(db, {
      announcementId: parentId,
      url,
      key,
      sortOrder,
      isCover: sortOrder === 0 ? 1 : 0,
      mime: sniffed,
      size: buffer.byteLength,
      fileName: safeSlug(file.name || "fichier"),
    });
  }

  return json({
    success: true,
    id: imageId,
    key,
    url,
    mime_type: sniffed,
    size: buffer.byteLength,
  });
}

export async function handleMediaGet(
  req: Request,
  bucket: R2BucketLike,
  key: string,
): Promise<Response> {
  if (!isSafeKey(key)) return json({ error: "invalid_key" }, 400);

  const object = await bucket.get(key);
  if (!object) return json({ error: "not_found" }, 404);

  const headers = new Headers();
  object.writeHttpMetadata?.(headers);
  headers.set("ETag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (!headers.get("Content-Type")) headers.set("Content-Type", "application/octet-stream");
  headers.set("X-Content-Type-Options", "nosniff");

  if (req.headers.get("If-None-Match") === object.httpEtag) {
    return new Response(null, { status: 304, headers });
  }
  return new Response(object.body, { headers });
}

export async function handleMediaDelete(
  bucket: R2BucketLike,
  db: D1Database,
  user: SessionUser | null,
  key: string,
): Promise<Response> {
  if (!user) return json({ error: "unauthenticated" }, 401);
  if (!isSafeKey(key)) return json({ error: "invalid_key" }, 400);

  const isAdmin = user.role === "admin" || user.role === "moderator";
  if (!isAdmin && keyOwner(key) !== user.id) return json({ error: "forbidden" }, 403);

  await bucket.delete(key);
  await db.prepare("DELETE FROM announcement_images WHERE storage_key = ?1").bind(key).run();
  return json({ success: true });
}

export async function handleListImages(
  db: D1Database,
  announcementId: string,
): Promise<Response> {
  const rows = await db
    .prepare(
      `SELECT id, image_url, storage_key, sort_order, is_cover
         FROM announcement_images WHERE announcement_id = ?1
        ORDER BY is_cover DESC, sort_order ASC`,
    )
    .bind(announcementId)
    .all();
  return json({ images: rows.results ?? [] });
}

export async function handleUpdateImages(
  req: Request,
  db: D1Database,
  user: SessionUser | null,
  announcementId: string,
): Promise<Response> {
  if (!user) return json({ error: "unauthenticated" }, 401);
  if (!(await ownsAnnouncement(db, announcementId, user))) return json({ error: "forbidden" }, 403);

  const body = (await req.json().catch(() => null)) as
    | { order?: string[]; coverId?: string }
    | null;
  if (!body) return json({ error: "invalid_body" }, 400);

  const statements: D1PreparedStatement[] = [];
  if (Array.isArray(body.order)) {
    body.order.forEach((imageId, index) => {
      statements.push(
        db
          .prepare(
            "UPDATE announcement_images SET sort_order = ?1 WHERE id = ?2 AND announcement_id = ?3",
          )
          .bind(index, imageId, announcementId),
      );
    });
  }
  if (body.coverId) {
    statements.push(
      db
        .prepare("UPDATE announcement_images SET is_cover = 0 WHERE announcement_id = ?1")
        .bind(announcementId),
    );
    statements.push(
      db
        .prepare(
          "UPDATE announcement_images SET is_cover = 1 WHERE id = ?1 AND announcement_id = ?2",
        )
        .bind(body.coverId, announcementId),
    );
  }
  if (statements.length) await db.batch(statements);
  return handleListImages(db, announcementId);
}

export async function handleDeleteImage(
  bucket: R2BucketLike,
  db: D1Database,
  user: SessionUser | null,
  announcementId: string,
  imageId: string,
): Promise<Response> {
  if (!user) return json({ error: "unauthenticated" }, 401);
  if (!(await ownsAnnouncement(db, announcementId, user))) return json({ error: "forbidden" }, 403);

  const row = await db
    .prepare(
      "SELECT storage_key FROM announcement_images WHERE id = ?1 AND announcement_id = ?2",
    )
    .bind(imageId, announcementId)
    .first<{ storage_key: string | null }>();
  if (!row) return json({ error: "not_found" }, 404);

  // Only this image's object is removed — other photos stay untouched.
  if (row.storage_key && isSafeKey(row.storage_key)) await bucket.delete(row.storage_key);
  await db
    .prepare("DELETE FROM announcement_images WHERE id = ?1 AND announcement_id = ?2")
    .bind(imageId, announcementId)
    .run();

  return json({ success: true });
}

/** Deletes every R2 object of one announcement (used before an announcement is removed). */
export async function handleDeleteAnnouncementMedia(
  bucket: R2BucketLike,
  db: D1Database,
  user: SessionUser | null,
  announcementId: string,
): Promise<Response> {
  if (!user) return json({ error: "unauthenticated" }, 401);
  if (!(await ownsAnnouncement(db, announcementId, user))) return json({ error: "forbidden" }, 403);

  const rows = await db
    .prepare("SELECT storage_key FROM announcement_images WHERE announcement_id = ?1")
    .bind(announcementId)
    .all<{ storage_key: string | null }>();

  const keys = (rows.results ?? [])
    .map((r) => r.storage_key)
    .filter((k): k is string => !!k && isSafeKey(k));
  for (const k of keys) await bucket.delete(k);

  await db
    .prepare("DELETE FROM announcement_images WHERE announcement_id = ?1")
    .bind(announcementId)
    .run();

  return json({ success: true, deleted: keys.length });
}
