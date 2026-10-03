import type { PlanetName } from "@/lib/natal-chart-core";
import type { SynastryAspectRow } from "@/lib/synastry-aspects";

export type BigThreePlacement = {
  sign: string;
  degree: number;
};

export type HeadlineAspect = SynastryAspectRow & {
  pairKey: string;
  tone: "harmonious" | "challenging" | "conjunction";
};

export type OverlayRow = {
  planet: PlanetName;
  glyph: string;
  houseInPartner: number;
};

export type OverlayHighlight = {
  house: number;
  planetsAInB: PlanetName[];
  planetsBInA: PlanetName[];
};

export type SnapshotLevel = "strong" | "moderate" | "mixed";
export type EmotionalLevel = "aligned" | "different" | "mixed";
export type CommunicationLevel = "smooth" | "needs_work" | "mixed";
export type OverallTone = "harmonious" | "growth_oriented" | "mixed";

export type RelationshipSnapshot = {
  attraction: SnapshotLevel;
  emotional: EmotionalLevel;
  communication: CommunicationLevel;
  overall: OverallTone;
};

const HEADLINE_PAIR_PRIORITY: Array<[PlanetName, PlanetName]> = [
  ["Sun", "Moon"],
  ["Moon", "Moon"],
  ["Venus", "Mars"],
  ["Venus", "Venus"],
  ["Mars", "Mars"],
  ["Mercury", "Mercury"],
  ["Sun", "Venus"],
];

const ROMANTIC_HOUSES = [1, 5, 7, 8] as const;

function normalizePair(planetA: string, planetB: string): string {
  const sorted = [planetA, planetB].sort();
  return `${sorted[0].toLowerCase()}_${sorted[1].toLowerCase()}`;
}

function matchesPair(
  aspect: SynastryAspectRow,
  a: PlanetName,
  b: PlanetName
): boolean {
  return (
    (aspect.planetA === a && aspect.planetB === b) ||
    (aspect.planetA === b && aspect.planetB === a)
  );
}

function aspectTone(aspect: string): HeadlineAspect["tone"] {
  if (aspect === "Conjunction") return "conjunction";
  if (aspect === "Trine" || aspect === "Sextile") return "harmonious";
  return "challenging";
}

export function pickHeadlineAspects(
  aspects: SynastryAspectRow[],
  limit = 8
): HeadlineAspect[] {
  const picked: HeadlineAspect[] = [];
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
    const isSaturnPersonal =
      (row.planetA === "Saturn" &&
        ["Sun", "Moon", "Venus", "Mars"].includes(row.planetB)) ||
      (row.planetB === "Saturn" &&
        ["Sun", "Moon", "Venus", "Mars"].includes(row.planetA));
    if (isSaturnPersonal) push(row);
  }

  for (const row of aspects) {
    if (picked.length >= limit) break;
    push(row);
  }

  return picked.slice(0, limit);
}

export function groupAspects(aspects: SynastryAspectRow[]) {
  return {
    harmonious: aspects.filter((a) => a.aspect === "Trine" || a.aspect === "Sextile"),
    challenging: aspects.filter((a) => a.aspect === "Square" || a.aspect === "Opposition"),
    conjunctions: aspects.filter((a) => a.aspect === "Conjunction"),
  };
}

export function buildNatalOverlay(
  planetsA: Array<{ name: PlanetName; glyph: string; longitude: number }>,
  ascB: number,
  planetsB: Array<{ name: PlanetName; glyph: string; longitude: number }>,
  ascA: number,
  wholeSignHouseForLongitude: (lon: number, ascLon: number) => number
): {
  aInB: OverlayRow[];
  bInA: OverlayRow[];
  highlights: OverlayHighlight[];
} {
  const aInB = planetsA.map((p) => ({
    planet: p.name,
    glyph: p.glyph,
    houseInPartner: wholeSignHouseForLongitude(p.longitude, ascB),
  }));
  const bInA = planetsB.map((p) => ({
    planet: p.name,
    glyph: p.glyph,
    houseInPartner: wholeSignHouseForLongitude(p.longitude, ascA),
  }));

  const highlights = ROMANTIC_HOUSES.map((house) => ({
    house,
    planetsAInB: aInB.filter((r) => r.houseInPartner === house).map((r) => r.planet),
    planetsBInA: bInA.filter((r) => r.houseInPartner === house).map((r) => r.planet),
  }));

  return { aInB, bInA, highlights };
}

function hasHarmonious(aspects: SynastryAspectRow[], pairs: Array<[PlanetName, PlanetName]>) {
  return aspects.some(
    (row) =>
      pairs.some(([a, b]) => matchesPair(row, a, b)) &&
      (row.aspect === "Trine" || row.aspect === "Sextile" || row.aspect === "Conjunction")
  );
}

function hasChallenging(aspects: SynastryAspectRow[], pairs: Array<[PlanetName, PlanetName]>) {
  return aspects.some(
    (row) =>
      pairs.some(([a, b]) => matchesPair(row, a, b)) &&
      (row.aspect === "Square" || row.aspect === "Opposition")
  );
}

export function buildRelationshipSnapshot(aspects: SynastryAspectRow[]): RelationshipSnapshot {
  const attractionPairs: Array<[PlanetName, PlanetName]> = [
    ["Venus", "Mars"],
    ["Sun", "Moon"],
    ["Venus", "Venus"],
  ];
  const emotionalPairs: Array<[PlanetName, PlanetName]> = [
    ["Moon", "Moon"],
    ["Moon", "Venus"],
    ["Sun", "Moon"],
  ];
  const mercuryPairs: Array<[PlanetName, PlanetName]> = [["Mercury", "Mercury"]];

  let attraction: SnapshotLevel = "mixed";
  if (hasHarmonious(aspects, attractionPairs) && !hasChallenging(aspects, [["Venus", "Mars"]])) {
    attraction = "strong";
  } else if (hasChallenging(aspects, attractionPairs)) {
    attraction = "moderate";
  }

  let emotional: EmotionalLevel = "mixed";
  if (hasHarmonious(aspects, emotionalPairs)) emotional = "aligned";
  else if (hasChallenging(aspects, emotionalPairs)) emotional = "different";

  let communication: CommunicationLevel = "mixed";
  if (hasHarmonious(aspects, mercuryPairs)) communication = "smooth";
  else if (hasChallenging(aspects, mercuryPairs)) communication = "needs_work";

  const positiveSignals = [attraction === "strong", emotional === "aligned", communication === "smooth"].filter(
    Boolean
  ).length;
  const growthSignals = [
    attraction === "moderate",
    emotional === "different",
    communication === "needs_work",
  ].filter(Boolean).length;

  let overall: OverallTone = "mixed";
  if (positiveSignals >= 2) overall = "harmonious";
  else if (growthSignals >= 2) overall = "growth_oriented";

  return { attraction, emotional, communication, overall };
}
