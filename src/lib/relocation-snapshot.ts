import {
  degreeInSign,
  normalizeDegrees,
  signIndexFromLongitude,
  SIGNS,
  type PlanetName,
} from "@/lib/natal-chart-core";

const ANGULAR_ORB_DEG = 3;
const LIFE_HOUSES = [1, 4, 7, 10] as const;

export type AngleSnapshot = {
  longitude: number;
  sign: string;
  degree: number;
};

export type HouseChangeRow = {
  planet: PlanetName;
  glyph: string;
  natalHouse: number;
  relocatedHouse: number;
  houseDelta: number;
};

export type AngularPlanetRow = {
  planet: PlanetName;
  glyph: string;
  angle: "Ascendant" | "Midheaven";
  orb: number;
};

export type LifeHouseRow = {
  house: number;
  natalPlanets: PlanetName[];
  relocatedPlanets: PlanetName[];
};

export type RelocationReadingSnapshot = {
  biggestHouseChanges: HouseChangeRow[];
  angularAtBirth: AngularPlanetRow[];
  angularAtRelocation: AngularPlanetRow[];
  lifeHouses: LifeHouseRow[];
};

function angularSeparation(lon1: number, lon2: number): number {
  let d = Math.abs(normalizeDegrees(lon1) - normalizeDegrees(lon2));
  if (d > 180) d = 360 - d;
  return Math.round(d * 10) / 10;
}

export function longitudeToAngleSnapshot(longitude: number): AngleSnapshot {
  const lon = normalizeDegrees(longitude);
  return {
    longitude: Math.round(lon * 100) / 100,
    sign: SIGNS[signIndexFromLongitude(lon)],
    degree: Math.round(degreeInSign(lon) * 100) / 100,
  };
}

type PlanetLonRow = {
  name: PlanetName;
  glyph: string;
  longitude: number;
  natalHouse: number;
  relocatedHouse: number;
};

function findAngularPlanets(
  planets: PlanetLonRow[],
  ascLon: number,
  mcLon: number
): AngularPlanetRow[] {
  const out: AngularPlanetRow[] = [];
  for (const p of planets) {
    const ascOrb = angularSeparation(p.longitude, ascLon);
    if (ascOrb <= ANGULAR_ORB_DEG) {
      out.push({ planet: p.name, glyph: p.glyph, angle: "Ascendant", orb: ascOrb });
    }
    const mcOrb = angularSeparation(p.longitude, mcLon);
    if (mcOrb <= ANGULAR_ORB_DEG) {
      out.push({ planet: p.name, glyph: p.glyph, angle: "Midheaven", orb: mcOrb });
    }
  }
  return out.sort((a, b) => a.orb - b.orb);
}

export function buildRelocationReadingSnapshot(
  planets: PlanetLonRow[],
  natalAscLon: number,
  relocatedAscLon: number,
  natalMcLon: number,
  relocatedMcLon: number
): RelocationReadingSnapshot {
  const biggestHouseChanges = planets
    .map((p) => ({
      planet: p.name,
      glyph: p.glyph,
      natalHouse: p.natalHouse,
      relocatedHouse: p.relocatedHouse,
      houseDelta: Math.abs(p.natalHouse - p.relocatedHouse),
    }))
    .filter((r) => r.houseDelta > 0)
    .sort((a, b) => b.houseDelta - a.houseDelta)
    .slice(0, 5);

  const lifeHouses = LIFE_HOUSES.map((house) => ({
    house,
    natalPlanets: planets.filter((p) => p.natalHouse === house).map((p) => p.name),
    relocatedPlanets: planets.filter((p) => p.relocatedHouse === house).map((p) => p.name),
  }));

  return {
    biggestHouseChanges,
    angularAtBirth: findAngularPlanets(planets, natalAscLon, natalMcLon),
    angularAtRelocation: findAngularPlanets(planets, relocatedAscLon, relocatedMcLon),
    lifeHouses,
  };
}
