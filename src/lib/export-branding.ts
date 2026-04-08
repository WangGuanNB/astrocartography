import { getBaseUrl } from "@/lib/utils";

/** UTM params for shares so traffic is attributable in analytics. */
export function withShareAttributionParams(
  pageUrl: string,
  opts: { source: "share" | "copy"; medium: "chart" | "landing" | "social" }
): string {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : getBaseUrl();
    const u = new URL(pageUrl, base);
    u.searchParams.set("utm_source", opts.source);
    u.searchParams.set("utm_medium", opts.medium);
    u.searchParams.set("utm_campaign", "organic_share");
    return u.toString();
  } catch {
    return pageUrl;
  }
}

/** Landing link with UTM (for pasting next to image URLs in social copy). */
export function getLandingAttributionUrl(): string {
  const base = getBaseUrl();
  const u = new URL("/", base);
  u.searchParams.set("utm_source", "share");
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", "landing_attribution");
  return u.toString();
}

const FOOTER_PAD = 46;

/**
 * Append a small branded footer (project name + site URL) to a PNG data URL.
 * Used for free downloads so shared images carry a backlink to the site.
 */
export function applyBrandingFooterToPngDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.width;
      const h = img.height + FOOTER_PAD;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const y0 = img.height;
      ctx.fillStyle = "rgba(12, 12, 18, 0.94)";
      ctx.fillRect(0, y0, w, FOOTER_PAD);
      const brand =
        process.env.NEXT_PUBLIC_PROJECT_NAME || "Astrocartography Calculator";
      const site = getBaseUrl().replace(/^https?:\/\//, "");
      ctx.fillStyle = "#f4f4f5";
      ctx.font = "600 13px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText(brand, 12, y0 + 20);
      ctx.fillStyle = "#a1a1aa";
      ctx.font = "400 11px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.fillText(site, 12, y0 + 36);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("branding: image load failed"));
    img.src = dataUrl;
  });
}
