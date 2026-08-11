import ephemeris from "@/data/asteroid-ephemeris.json";
import { SIGNS, degreeInSign, normalizeDegrees, signIndexFromLongitude } from "@/lib/natal-chart-core";

const DAY_MS = 86400000;

type AsteroidKey = "ceres" | "pallas" | "juno" | "vesta";

type AsteroidEphemeris = {
  start: string;
  stepDays: number;
  scale: number;
  count: number;
  bodies: Record<AsteroidKey, { label: string; glyph: string; longitude: number[] }>;
};

const ASTEROID_DATA = ephemeris as AsteroidEphemeris;
const START_MS = Date.parse(ASTEROID_DATA.start);
const STEP_MS = ASTEROID_DATA.stepDays * DAY_MS;
const ASTEROID_KEYS: AsteroidKey[] = ["ceres", "pallas", "juno", "vesta"];

function getAsteroidPlacement(key: AsteroidKey, utcDate: Date) {
  const position = (utcDate.getTime() - START_MS) / STEP_MS;
  if (!Number.isFinite(position) || position < 0 || position > ASTEROID_DATA.count - 1) {
    throw new Error("Asteroid ephemeris supports birth dates from 1900-01-01 through 2051-01-01.");
  }

  const series = ASTEROID_DATA.bodies[key];
  const index = Math.floor(position);
  const fraction = position - index;
  const current = series.longitude[index];
  const next = series.longitude[Math.min(index + 1, ASTEROID_DATA.count - 1)];
  if (current == null || next == null) throw new Error(`${series.label} ephemeris lookup failed.`);

  const unwrappedLongitude = (current + (next - current) * fraction) / ASTEROID_DATA.scale;
  const longitude = normalizeDegrees(unwrappedLongitude);
  const prev = series.longitude[Math.max(index - 1, 0)];
  const following = series.longitude[Math.min(index + 1, ASTEROID_DATA.count - 1)];

  return {
    label: series.label,
    glyph: series.glyph,
    longitude,
    sign: SIGNS[signIndexFromLongitude(longitude)],
    degree: degreeInSign(longitude),
    isRetrograde: prev != null && following != null ? following < prev : false,
  };
}

export function getBigFourAsteroidPlacements(utcDate: Date) {
  return ASTEROID_KEYS.map((key) => getAsteroidPlacement(key, utcDate));
}
