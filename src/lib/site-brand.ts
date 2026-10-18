/** Public site brand for Open Graph and JSON-LD Organization fields (GEO A5). */
export const SITE_OG_NAME = "Astrocarto.org";

export function siteOrganizationJsonLd(canonicalOrigin = "https://astrocarto.org/") {
  return {
    "@type": "Organization" as const,
    name: SITE_OG_NAME,
    url: canonicalOrigin,
  };
}
