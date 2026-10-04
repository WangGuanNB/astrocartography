import type { PlanetName } from "@/lib/natal-chart-core";
import type { SynastryAspectRow } from "@/lib/synastry-aspects";

export type HeadlineNatalAspect = SynastryAspectRow & {
  pairKey: string;
  tone: "harmonious" | "challenging" | "conjunction";
};

const HEADLINE_PAIR_PRIORITY: Array<[PlanetName, PlanetName]> = [
  ["Sun", "Moon"],
  ["Sun", "Saturn"],
  ["Moon", "Saturn"],
  ["Venus", "Mars"],
  ["Mercury", "Saturn"],
  ["Sun", "Pluto"],
  ["Moon", "Pluto"],
  ["Jupiter", "Saturn"],
];

function normalizePair(planetA: string, planetB: string): string {
  const sorted = [planetA, planetB].sort();
  return `${sorted[0].toLowerCase()}_${sorted[1].toLowerCase()}`;
}

function matchesPair(aspect: SynastryAspectRow, a: PlanetName, b: PlanetName): boolean {
  return (
    (aspect.planetA === a && aspect.planetB === b) ||
    (aspect.planetA === b && aspect.planetB === a)
  );
}

function aspectTone(aspect: string): HeadlineNatalAspect["tone"] {
  if (aspect === "Conjunction") return "conjunction";
  if (aspect === "Trine" || aspect === "Sextile") return "harmonious";
  return "challenging";
}

/** Pick headline natal aspects for free skeleton and AI context. */
export function pickHeadlineNatalAspects(
  aspects: SynastryAspectRow[],
  limit = 10
): HeadlineNatalAspect[] {
  const picked: HeadlineNatalAspect[] = [];
  const used = new Set<string>();

  const push = (row: SynastryAspectRow) => {
    const key = `${row.planetA}-${row.aspect}-${row.planetB}`;
    if (used.has(key)) return;
    used.add(key);
    picked.push({
      ...row,
      pairKey: normalizePair(row.planetA, row.planetB),
      tone: aspectTone(row.aspect),
    });
  };

  for (const [a, b] of HEADLINE_PAIR_PRIORITY) {
    const match = aspects.find((row) => matchesPair(row, a, b));
    if (match) push(match);
    if (picked.length >= limit) return picked.slice(0, limit);
  }

  for (const row of aspects) {
    if (picked.length >= limit) break;
    push(row);
  }

  return picked.slice(0, limit);
}
