import type { PlanetName } from "@/lib/natal-chart-core";

/** Orb by aspect type — aligned with transit chart API. */
export const SYNASTRY_ASPECT_ORBS: Record<string, number> = {
  Conjunction: 8,
  Opposition: 8,
  Square: 6,
  Trine: 6,
  Sextile: 4,
};

export const SYNASTRY_ASPECT_ANGLES: Record<string, number> = {
  Conjunction: 0,
  Opposition: 180,
  Trine: 120,
  Square: 90,
  Sextile: 60,
};

export function normalizeDegrees(deg: number): number {
  let x = deg % 360;
  if (x < 0) x += 360;
  return x;
}

function angularSeparation(lon1: number, lon2: number): number {
  let d = Math.abs(normalizeDegrees(lon1) - normalizeDegrees(lon2));
  if (d > 180) d = 360 - d;
  return d;
}

export function findSynastryAspect(
  lonA: number,
  lonB: number
): { aspect: string; orb: number } | null {
  const sep = angularSeparation(lonA, lonB);
  for (const [aspect, exactAngle] of Object.entries(SYNASTRY_ASPECT_ANGLES)) {
    const orb = SYNASTRY_ASPECT_ORBS[aspect];
    const diff = exactAngle === 0 ? Math.min(sep, 360 - sep) : Math.abs(sep - exactAngle);
    if (diff <= orb) return { aspect, orb: Math.round(diff * 10) / 10 };
  }
  return null;
}

export type PlanetLon = { name: PlanetName; glyph: string; longitude: number };

export type SynastryAspectRow = {
  planetA: PlanetName;
  planetB: PlanetName;
  aspect: string;
  orb: number;
};

/**
 * All cross-aspects between person A's planets and person B's planets (natal longitudes).
 */
export function computeSynastryAspects(planetsA: PlanetLon[], planetsB: PlanetLon[]): SynastryAspectRow[] {
  const out: SynastryAspectRow[] = [];
  for (const a of planetsA) {
    for (const b of planetsB) {
      const found = findSynastryAspect(a.longitude, b.longitude);
      if (found) {
        out.push({
          planetA: a.name,
          planetB: b.name,
          aspect: found.aspect,
          orb: found.orb,
        });
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}

/** Major aspects among planets in one sky snapshot (unique pairs). */
export function computeCurrentSkyAspects(planets: PlanetLon[]): SynastryAspectRow[] {
  const out: SynastryAspectRow[] = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const found = findSynastryAspect(planets[i].longitude, planets[j].longitude);
      if (found) {
        out.push({
          planetA: planets[i].name,
          planetB: planets[j].name,
          aspect: found.aspect,
          orb: found.orb,
        });
      }
    }
  }
  return out.sort((x, y) => x.orb - y.orb);
}
