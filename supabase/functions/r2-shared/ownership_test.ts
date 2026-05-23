import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { isOwnedKey, keyFromUrl, sniffMime } from "./ownership.ts";

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";

Deno.test("isOwnedKey accepts a well-formed key owned by the caller", () => {
  assertEquals(isOwnedKey(`annonces/${USER_A}/123-abc.webp`, USER_A), true);
  assertEquals(isOwnedKey(`avatars/${USER_A}/pic.webp`, USER_A), true);
});

Deno.test("isOwnedKey rejects keys owned by another user", () => {
  assertEquals(isOwnedKey(`annonces/${USER_B}/file.webp`, USER_A), false);
});

Deno.test("isOwnedKey rejects path traversal and absolute paths", () => {
  assertEquals(isOwnedKey(`annonces/${USER_A}/../${USER_B}/x.webp`, USER_A), false);
  assertEquals(isOwnedKey(`/annonces/${USER_A}/x.webp`, USER_A), false);
});

Deno.test("isOwnedKey rejects unknown folders", () => {
  assertEquals(isOwnedKey(`secret/${USER_A}/x.webp`, USER_A), false);
});

Deno.test("isOwnedKey rejects malformed input", () => {
  assertEquals(isOwnedKey("", USER_A), false);
  assertEquals(isOwnedKey(null as unknown, USER_A), false);
  assertEquals(isOwnedKey(`annonces/${USER_A}/`, USER_A), false);
  assertEquals(isOwnedKey(`annonces/${USER_A}`, USER_A), false);
});

Deno.test("keyFromUrl extracts key when prefix matches", () => {
  const pub = "https://cdn.example.com/";
  assertEquals(
    keyFromUrl(`${pub}annonces/${USER_A}/x.webp`, pub),
    `annonces/${USER_A}/x.webp`,
  );
});

Deno.test("keyFromUrl returns null when prefix does not match", () => {
  assertEquals(keyFromUrl("https://evil.example.com/x", "https://cdn.example.com/"), null);
  assertEquals(keyFromUrl(undefined, "https://cdn.example.com/"), null);
});

Deno.test("sniffMime recognises JPEG / PNG / WEBP magic bytes", () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const webp = new Uint8Array([
    0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
  ]);
  assertEquals(sniffMime(jpeg), "image/jpeg");
  assertEquals(sniffMime(png), "image/png");
  assertEquals(sniffMime(webp), "image/webp");
  assertEquals(sniffMime(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0])), null);
});
