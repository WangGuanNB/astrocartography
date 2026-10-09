export type BasemapConfig = {
  provider: "carto" | "openstreetmap";
  url: string;
  options: {
    attribution: string;
    maxZoom: number;
    subdomains?: string;
  };
};

const CARTO_BASEMAP_KEY = process.env.NEXT_PUBLIC_CARTO_BASEMAP_KEY?.trim();

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const CARTO_ATTRIBUTION =
  `${OSM_ATTRIBUTION} &copy; <a href="https://carto.com/attributions">CARTO</a>`;

/**
 * CARTO now requires a key for basemap requests. Until a key is configured,
 * use OSM's standard browser tile endpoint instead of making unauthenticated
 * CARTO requests that can be watermarked, rate-limited, or blocked.
 */
export function getPrimaryBasemapConfig(): BasemapConfig {
  if (CARTO_BASEMAP_KEY) {
    return {
      provider: "carto",
      url: `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_BASEMAP_KEY)}`,
      options: {
        attribution: CARTO_ATTRIBUTION,
        maxZoom: 20,
      },
    };
  }

  return getEmergencyBasemapConfig();
}

/**
 * Emergency direct-browser fallback. This is intentionally not proxied or
 * pre-fetched, so browser caching and the user's Referer remain intact.
 */
export function getEmergencyBasemapConfig(): BasemapConfig {
  return {
    provider: "openstreetmap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    options: {
      attribution: OSM_ATTRIBUTION,
      maxZoom: 19,
    },
  };
}

export function hasCartoBasemapKey() {
  return Boolean(CARTO_BASEMAP_KEY);
}
