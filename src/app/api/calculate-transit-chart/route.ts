import { NextRequest, NextResponse } from "next/server";
import * as Astronomy from "astronomy-engine";

export const maxDuration = 30;

interface TransitChartRequest {
  birthDate: string; // yyyy-mm-dd
  birthTime: string; // HH:mm
  birthLocation: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
  transitDate: string; // yyyy-mm-dd
}

type PlanetName =
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

const PLANETS: Array<{ body: Astronomy.Body; name: PlanetName; glyph: string }> = [
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

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

/** Geocentric ecliptic longitude (0..360). */
function getGeocentricEclipticLongitude(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  if (body === Astronomy.Body.Sun) {
    const sun = Astronomy.SunPosition(time);
    return normalizeDegrees(sun.elon);
  }
  const vec = Astronomy.GeoVector(body, time, true);
  const ecl = Astronomy.Ecliptic(vec);
  return normalizeDegrees(ecl.elon);
}

function normalizeDegrees(deg: number): number {
  let x = deg % 360;
  if (x < 0) x += 360;
  return x;
}

function parseTimezoneOffset(timezone: string): number {
  const timezoneMap: Record<string, number> = {
    UTC: 0, EST: -5, PST: -8, CST: -6, MST: -7, CET: 1,
    JST: 9, AEST: 10, IST: 5.5,
  };
  for (const [tz, offset] of Object.entries(timezoneMap)) {
    if (timezone.toUpperCase().includes(tz)) {
      if (tz === "CST" && (timezone.includes("Beijing") || timezone.includes("China"))) return 8;
      return offset;
    }
  }
  return 0;
}

const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  "new york": { latitude: 40.7128, longitude: -74.006 }, "new york, usa": { latitude: 40.7128, longitude: -74.006 },
  london: { latitude: 51.5074, longitude: -0.1278 }, "london, uk": { latitude: 51.5074, longitude: -0.1278 },
  paris: { latitude: 48.8566, longitude: 2.3522 }, "paris, france": { latitude: 48.8566, longitude: 2.3522 },
  tokyo: { latitude: 35.6762, longitude: 139.6503 }, "tokyo, japan": { latitude: 35.6762, longitude: 139.6503 },
  "los angeles": { latitude: 34.0522, longitude: -118.2437 }, "los angeles, usa": { latitude: 34.0522, longitude: -118.2437 },
  sydney: { latitude: -33.8688, longitude: 151.2093 }, "sydney, australia": { latitude: -33.8688, longitude: 151.2093 },
  singapore: { latitude: 1.3521, longitude: 103.8198 }, dubai: { latitude: 25.2048, longitude: 55.2708 },
  "hong kong": { latitude: 22.3193, longitude: 114.1694 }, beijing: { latitude: 39.9042, longitude: 116.4074 },
  shanghai: { latitude: 31.2304, longitude: 121.4737 },
};

async function geocodeLocation(location: string): Promise<{ latitude: number; longitude: number } | null> {
  const normalized = location.toLowerCase().trim();
  if (CITY_COORDINATES[normalized]) return CITY_COORDINATES[normalized];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { "User-Agent": "Astrocartography-App/1.0" }, signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.length > 0)
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    return null;
  } catch {
    return null;
  }
}

/** Orb by aspect type (industry standard). Conjunction/Opposition ±8°, Square/Trine ±6°, Sextile ±4°. */
const ASPECT_ORBS: Record<string, number> = {
  Conjunction: 8,
  Opposition: 8,
  Square: 6,
  Trine: 6,
  Sextile: 4,
};

const ASPECT_ANGLES: Record<string, number> = {
  Conjunction: 0,
  Opposition: 180,
  Trine: 120,
  Square: 90,
  Sextile: 60,
};

function angularSeparation(lon1: number, lon2: number): number {
  let d = Math.abs(normalizeDegrees(lon1) - normalizeDegrees(lon2));
  if (d > 180) d = 360 - d;
  return d;
}

function findAspect(transitLon: number, natalLon: number): { aspect: string; exactAngle: number; orb: number } | null {
  const sep = angularSeparation(transitLon, natalLon);
  for (const [aspect, exactAngle] of Object.entries(ASPECT_ANGLES)) {
    const orb = ASPECT_ORBS[aspect];
    const diff = exactAngle === 0 ? Math.min(sep, 360 - sep) : Math.abs(sep - exactAngle);
    if (diff <= orb) return { aspect, exactAngle, orb: Math.round(diff * 10) / 10 };
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TransitChartRequest;
    const { birthDate, birthTime, birthLocation, timezone, transitDate } = body;

    if (!birthDate || !birthTime || !birthLocation || !timezone || !transitDate) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: birthDate, birthTime, birthLocation, timezone, transitDate." },
        { status: 400 }
      );
    }

    let latitude = body.latitude;
    let longitude = body.longitude;
    if (latitude == null || longitude == null) {
      const coords = await geocodeLocation(birthLocation);
      if (!coords) {
        return NextResponse.json(
          { success: false, error: `Unable to find coordinates for "${birthLocation}". Try a more specific place name (e.g. "New York, USA").` },
          { status: 400 }
        );
      }
      latitude = coords.latitude;
      longitude = coords.longitude;
    }

    const timezoneOffset = parseTimezoneOffset(timezone);
    const [hours, minutes] = birthTime.split(":").map(Number);
    const localBirth = new Date(`${birthDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`);
    const utcBirth = new Date(localBirth.getTime() - timezoneOffset * 60 * 60 * 1000);

    // Transit moment: chosen date at 12:00 UTC (avoids date-boundary issues for Asian users).
    const transitUtc = new Date(`${transitDate}T12:00:00.000Z`);
    const timeBirth = Astronomy.MakeTime(utcBirth);
    const timeTransit = Astronomy.MakeTime(transitUtc);

    const natalPlanets = PLANETS.map(({ body, name, glyph }) => {
      const lon = getGeocentricEclipticLongitude(body, timeBirth);
      const signIndex = Math.floor(normalizeDegrees(lon) / 30);
      return {
        name,
        glyph,
        longitude: Math.round(lon * 100) / 100,
        sign: SIGNS[signIndex],
        degree: Math.round((normalizeDegrees(lon) % 30) * 100) / 100,
      };
    });

    const transitPlanets = PLANETS.map(({ body, name, glyph }) => {
      const lon = getGeocentricEclipticLongitude(body, timeTransit);
      const signIndex = Math.floor(normalizeDegrees(lon) / 30);
      return {
        name,
        glyph,
        longitude: Math.round(lon * 100) / 100,
        sign: SIGNS[signIndex],
        degree: Math.round((normalizeDegrees(lon) % 30) * 100) / 100,
      };
    });

    const aspects: Array<{
      transitPlanet: string;
      natalPlanet: string;
      aspect: string;
      orb: number;
    }> = [];
    for (let i = 0; i < transitPlanets.length; i++) {
      for (let j = 0; j < natalPlanets.length; j++) {
        const found = findAspect(transitPlanets[i].longitude, natalPlanets[j].longitude);
        if (found)
          aspects.push({
            transitPlanet: transitPlanets[i].name,
            natalPlanet: natalPlanets[j].name,
            aspect: found.aspect,
            orb: found.orb,
          });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        birthData: {
          date: birthDate,
          time: birthTime,
          location: birthLocation,
          latitude,
          longitude,
          timezone,
        },
        transitDate,
        natalPlanets,
        transitPlanets,
        aspects,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to calculate transit chart.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
