import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function publicSupabase() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "search_listings",
  title: "Search listings",
  description:
    "Search active, approved classified ads on Tout Suite Annonces. Filter by keyword, location, price range, and sort. Returns up to 20 listings.",
  inputSchema: {
    query: z.string().optional().describe("Keyword to match in title/description."),
    location: z.string().optional().describe("City or region substring."),
    min_price: z.number().nonnegative().optional(),
    max_price: z.number().nonnegative().optional(),
    sort: z
      .enum(["recent", "price_asc", "price_desc"])
      .optional()
      .describe("Sort order (default: recent)."),
    limit: z.number().int().min(1).max(20).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, location, min_price, max_price, sort, limit }) => {
    const supabase = publicSupabase();
    let q = supabase
      .from("listings")
      .select("id, title, description, price, currency, location, images, is_premium, is_urgent, created_at")
      .eq("is_active", true)
      .eq("moderation_status", "approved");

    if (query) q = q.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    if (location) q = q.ilike("location", `%${location}%`);
    if (typeof min_price === "number") q = q.gte("price", min_price);
    if (typeof max_price === "number") q = q.lte("price", max_price);

    if (sort === "price_asc") q = q.order("price", { ascending: true, nullsFirst: false });
    else if (sort === "price_desc") q = q.order("price", { ascending: false, nullsFirst: false });
    else q = q.order("created_at", { ascending: false });

    q = q.limit(limit ?? 10);

    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    const items = (data ?? []).map((l) => ({
      ...l,
      url: `https://toutsuiteannonces.com/annonce/${l.id}`,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { count: items.length, items },
    };
  },
});
