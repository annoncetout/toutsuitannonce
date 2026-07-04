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
  name: "get_listing",
  title: "Get listing details",
  description: "Fetch the full details of a single listing by its ID.",
  inputSchema: {
    id: z.string().uuid().describe("The listing UUID."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }) => {
    const supabase = publicSupabase();
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id, title, description, price, currency, price_type, location, images, is_premium, is_urgent, views_count, category_id, created_at, published_at",
      )
      .eq("id", id)
      .eq("is_active", true)
      .eq("moderation_status", "approved")
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: "Listing not found." }], isError: true };
    }
    const listing = { ...data, url: `https://toutsuiteannonces.com/annonce/${data.id}` };
    return {
      content: [{ type: "text", text: JSON.stringify(listing, null, 2) }],
      structuredContent: { listing },
    };
  },
});
