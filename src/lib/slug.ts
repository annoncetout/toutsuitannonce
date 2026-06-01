// Slugify French text for SEO-friendly URLs.
export const slugify = (input: string): string => {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/['’"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "annonce";
};

// Build SEO-friendly listing URL: /annonce/:slug/:id
export const listingPath = (title: string | null | undefined, id: string): string => {
  return `/annonce/${slugify(title || "annonce")}/${id}`;
};
