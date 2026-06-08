import { describe, it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";

const URL = "https://yyendbkedzfnsmjiclhg.supabase.co";
const ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZW5kYmtlZHpmbnNtamljbGhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0Njk5MjksImV4cCI6MjA5MzA0NTkyOX0.wub6Nyhf6L5XAAMPQSqY8mKt5r3hUVh9vZGJ0eLydlc";

// Anonymous client — simulates a visitor without an account.
const anon = createClient(URL, ANON, { auth: { persistSession: false } });

describe("Public access rules (visitor, not logged in)", () => {
  it("can list active listings", async () => {
    const { data, error } = await anon
      .from("listings")
      .select("id, title, is_active")
      .eq("is_active", true)
      .limit(5);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect((data ?? []).length).toBeGreaterThan(0);
    for (const row of data ?? []) expect(row.is_active).toBe(true);
  });

  it("can read public seller info (display_name, is_verified)", async () => {
    const { data, error } = await anon
      .from("profiles")
      .select("id, display_name, is_verified, account_type")
      .limit(3);
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("CANNOT read private profile columns (phone, whatsapp)", async () => {
    const { error } = await anon.from("profiles").select("phone, whatsapp").limit(1);
    expect(error).not.toBeNull();
  });

  it("can browse categories and advertisements", async () => {
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      anon.from("categories").select("id").limit(1),
      anon.from("advertisements").select("id").limit(1),
    ]);
    expect(e1).toBeNull();
    expect(e2).toBeNull();
  });

  it("CANNOT create a listing (private action)", async () => {
    const { error } = await anon.from("listings").insert({
      title: "test",
      price: 1,
      currency: "XOF",
      location: "Dakar",
      user_id: "00000000-0000-0000-0000-000000000000",
    } as any);
    expect(error).not.toBeNull();
  });

  it("CANNOT read favorites of others", async () => {
    const { data, error } = await anon.from("favorites").select("id").limit(1);
    // Either permission denied or RLS-filtered empty array — both are acceptable.
    if (!error) expect(data ?? []).toEqual([]);
  });
});
