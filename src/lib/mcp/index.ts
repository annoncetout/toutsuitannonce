import { defineMcp, auth } from "@lovable.dev/mcp-js";
import searchListings from "./tools/search-listings";
import getListing from "./tools/get-listing";
import listCategories from "./tools/list-categories";

const SUPABASE_URL = "https://yyendbkedzfnsmjiclhg.supabase.co";

export default defineMcp({
  name: "tout-suite-annonces-mcp",
  title: "Tout Suite Annonces",
  version: "0.1.0",
  instructions:
    "Tools to browse classified ads on Tout Suite Annonces (Senegal). Use `list_categories` to discover categories, `search_listings` to find ads by keyword/location/price, and `get_listing` to fetch full details for a specific ad.",
  auth: auth.oauth.issuer({
    issuer: `${SUPABASE_URL}/auth/v1`,
    jwksUri: `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    resource: `${SUPABASE_URL}/functions/v1/mcp`,
    acceptedAudiences: ["authenticated"],
    resourceName: "Tout Suite Annonces MCP",
  }),
  tools: [searchListings, getListing, listCategories],
});
