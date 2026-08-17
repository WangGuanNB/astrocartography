import * as Astronomy from "astronomy-engine";
import { getLegacyTimezoneOffset, localDateTimeToUtc } from "@/lib/timezone";

export type PlanetName =
  | "Sun"
  | "Moon"
  | "Mercury"
  | "Venus"
  | "Mars"
  | "Jupiter"
  | "Saturn"
  | "Uranus"
  | "Neptune"
  | "Pluto";

export const PLANETS: Array<{ body: Astronomy.Body; name: PlanetName; glyph: string }> = [
  { body: Astronomy.Body.Sun, name: "Sun", glyph: "☉" },
  { body: Astronomy.Body.Moon, name: "Moon", glyph: "☽" },
  { body: Astronomy.Body.Mercury, name: "Mercury", glyph: "☿" },
  { body: Astronomy.Body.Venus, name: "Venus", glyph: "♀" },
  { body: Astronomy.Body.Mars, name: "Mars", glyph: "♂" },
  { body: Astronomy.Body.Jupiter, name: "Jupiter", glyph: "♃" },
  { body: Astronomy.Body.Saturn, name: "Saturn", glyph: "♄" },
  { body: Astronomy.Body.Uranus, name: "Uranus", glyph: "♅" },
  { body: Astronomy.Body.Neptune, name: "Neptune", glyph: "♆" },
  { body: Astronomy.Body.Pluto, name: "Pluto", glyph: "♇" },
];

export const SIGNS = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
] as const;

export function getGeocentricEclipticLongitude(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  if (body === Astronomy.Body.Sun) {
    const sun = Astronomy.SunPosition(time);
    return normalizeDegrees(sun.elon);
  }
  const vec = Astronomy.GeoVector(body, time, true);
  const ecl = Astronomy.Ecliptic(vec);
  return normalizeDegrees(ecl.elon);
}

export function normalizeDegrees(deg: number): number {
  let x = deg % 360;
  if (x < 0) x += 360;
  return x;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function parseTimezoneOffset(timezone: string): number {
  return getLegacyTimezoneOffset(timezone);
}

export function getLocalSiderealTime(dateUtc: Date, longitude: number): number {
  const time = Astronomy.MakeTime(dateUtc);
  const gmstHours = Astronomy.SiderealTime(time);
  const lstDeg = (gmstHours * 15 + longitude) % 360;
  return lstDeg < 0 ? lstDeg + 360 : lstDeg;
}

/**
 * Ecliptic longitude of the Ascendant (ASC), not MC.
 * Formula: atan2(cos θ, -(sin θ · cos ε + tan φ · sin ε))
 * where θ = local sidereal time, φ = geographic latitude, ε = obliquity.
 */
export function calculateAscendantLongitude(dateUtc: Date, latitude: number, longitude: number): number {
  const epsDeg = 23.4392911;
  const eps = degToRad(epsDeg);
  const phi = degToRad(latitude);
  const theta = degToRad(getLocalSiderealTime(dateUtc, longitude));
  const asc = Math.atan2(
    Math.cos(theta),
    -(Math.sin(theta) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps))
  );
  return normalizeDegrees(radToDeg(asc));
}

/**
 * Ecliptic longitude of the Midheaven (MC / Medium Coeli).
 * Independent of latitude: λ = atan2(sin θ, cos θ · cos ε)
 * where θ = local sidereal time (RAMC), ε = obliquity.
 */
export function calculateMidheavenLongitude(dateUtc: Date, longitude: number): number {
  const epsDeg = 23.4392911;
  const eps = degToRad(epsDeg);
  const theta = degToRad(getLocalSiderealTime(dateUtc, longitude));
  const mc = Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(eps));
  return normalizeDegrees(radToDeg(mc));
}

export function signIndexFromLongitude(lon: number): number {
  return Math.floor(normalizeDegrees(lon) / 30);
}

export function degreeInSign(lon: number): number {
  return normalizeDegrees(lon) % 30;
}

export function localBirthTimeToUtc(
  birthDate: string,
  birthTime: string,
  timezone: string
): Date {
  return localDateTimeToUtc(birthDate, birthTime, timezone);
}

export type PlanetRow = {
  name: PlanetName;
  glyph: string;
  longitude: number;
  sign: string;
  degree: number;
  house: number;
};

export type AngleRow = {
  longitude: number;
  sign: string;
  degree: number;
};

/**
 * Whole-sign houses from ascendant at the given place and UTC moment.
 */
export function computeWholeSignChart(utcDate: Date, latitude: number, longitude: number): {
  ascendant: AngleRow;
  planets: PlanetRow[];
} {
  const ascLon = calculateAscendantLongitude(utcDate, latitude, longitude);
  const ascSignIndex = signIndexFromLongitude(ascLon);
  const time = Astronomy.MakeTime(utcDate);

  const planets = PLANETS.map(({ body, name, glyph }) => {
    const lon = getGeocentricEclipticLongitude(body, time);
    const pSignIndex = signIndexFromLongitude(lon);
    const house = ((pSignIndex - ascSignIndex + 12) % 12) + 1;
    return {
      name,
      glyph,
      longitude: lon,
      sign: SIGNS[pSignIndex],
      degree: degreeInSign(lon),
      house,
    };
  });

  return {
    ascendant: {
      longitude: ascLon,
      sign: SIGNS[ascSignIndex],
      degree: degreeInSign(ascLon),
    },
    planets,
  };
}

export type CurrentPlanetRow = {
  name: PlanetName;
  glyph: string;
  longitude: number;
  sign: string;
  degree: number;
  retrograde: boolean;
  speedDegPerDay: number;
};

/** Shortest signed difference in ecliptic longitude, in degrees (−180..180). */
export function signedLongitudeDelta(fromDeg: number, toDeg: number): number {
  let d = normalizeDegrees(toDeg) - normalizeDegrees(fromDeg);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** Geocentric tropical longitude change over 24 hours (negative = retrograde). */
export function eclipticSpeedDegPerDay(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  const lon0 = getGeocentricEclipticLongitude(body, time);
  const lon1 = getGeocentricEclipticLongitude(body, time.AddDays(1));
  return signedLongitudeDelta(lon0, lon1);
}

/**
 * Tropical geocentric positions for Sun–Pluto at a UTC instant.
 * Retrograde is true when ecliptic longitude is decreasing; Sun and Moon never retrograde.
 */
export function computePlanetaryPositionsAt(utcDate: Date): CurrentPlanetRow[] {
  const time = Astronomy.MakeTime(utcDate);
  return PLANETS.map(({ body, name, glyph }) => {
    const lon = getGeocentricEclipticLongitude(body, time);
    const speed = Math.round(eclipticSpeedDegPerDay(body, time) * 1000) / 1000;
    const neverRx = body === Astronomy.Body.Sun || body === Astronomy.Body.Moon;
    return {
      name,
      glyph,
      longitude: Math.round(lon * 1000) / 1000,
      sign: SIGNS[signIndexFromLongitude(lon)],
      degree: Math.round(degreeInSign(lon) * 1000) / 1000,
      retrograde: neverRx ? false : speed < 0,
      speedDegPerDay: speed,
    };
  });
}
