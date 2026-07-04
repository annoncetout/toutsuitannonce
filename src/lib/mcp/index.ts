import { defineMcp } from "@lovable.dev/mcp-js";
import searchListings from "./tools/search-listings";
import getListing from "./tools/get-listing";
import listCategories from "./tools/list-categories";

export default defineMcp({
  name: "tout-suite-annonces-mcp",
  title: "Tout Suite Annonces",
  version: "0.1.0",
  instructions:
    "Tools to browse classified ads on Tout Suite Annonces (Senegal). Use `list_categories` to discover categories, `search_listings` to find ads by keyword/location/price, and `get_listing` to fetch full details for a specific ad.",
  tools: [searchListings, getListing, listCategories],
});
