import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import * as Astronomy from "astronomy-engine";

export const revalidate = 3600; // 1 hour
export const maxDuration = 30;

interface BirthChartRequest {
  birthDate: string; // yyyy-mm-dd
  birthTime: string; // HH:mm
  birthLocation: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
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

/**
 * Geocentric ecliptic longitude (degrees, 0..360).
 * Important: Astronomy.EclipticLongitude() is heliocentric and cannot be used for the Sun.
 * For natal charts we want geocentric longitudes (as seen from Earth).
 */
function getGeocentricEclipticLongitude(body: Astronomy.Body, time: Astronomy.AstroTime): number {
  if (body === Astronomy.Body.Sun) {
    // Explicit helper for Sun: apparent geocentric ecliptic coords of date.
    const sun = Astronomy.SunPosition(time);
    return normalizeDegrees(sun.elon);
  }

  // For Moon/planets: geocentric vector -> ecliptic coords.
  const vec = Astronomy.GeoVector(body, time, true);
  const ecl = Astronomy.Ecliptic(vec);
  return normalizeDegrees(ecl.elon);
}

function normalizeDegrees(deg: number): number {
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

/**
 * Convert timezone string to UTC offset hours.
 * Keep consistent with existing astrocartography route for now.
 */
function parseTimezoneOffset(timezone: string): number {
  const timezoneMap: Record<string, number> = {
    UTC: 0,
    EST: -5,
    PST: -8,
    CST: -6,
    MST: -7,
    CET: 1,
    JST: 9,
    AEST: 10,
    IST: 5.5,
  };

  for (const [tz, offset] of Object.entries(timezoneMap)) {
    if (timezone.toUpperCase().includes(tz)) {
      if (tz === "CST" && (timezone.includes("Beijing") || timezone.includes("China"))) {
        return 8;
      }
      return offset;
    }
  }
  return 0;
}

/**
 * Local sidereal time (degrees) for given UTC date and longitude (degrees, east-positive).
 */
function getLocalSiderealTime(dateUtc: Date, longitude: number): number {
  const time = Astronomy.MakeTime(dateUtc);
  const gmstHours = Astronomy.SiderealTime(time);
  const lstDeg = (gmstHours * 15 + longitude) % 360;
  return lstDeg < 0 ? lstDeg + 360 : lstDeg;
}

/**
 * Approximate Ascendant ecliptic longitude (degrees).
 * Uses a fixed obliquity value (good enough for a lead-gen tool).
 */
function calculateAscendantLongitude(dateUtc: Date, latitude: number, longitude: number): number {
  const epsDeg = 23.4392911; // mean obliquity of the ecliptic
  const eps = degToRad(epsDeg);
  const phi = degToRad(latitude);
  const theta = degToRad(getLocalSiderealTime(dateUtc, longitude));

  // λasc = atan2( sinθ, cosθ·cosε − tanφ·sinε )
  const asc = Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(eps) - Math.tan(phi) * Math.sin(eps));
  return normalizeDegrees(radToDeg(asc));
}

function signIndexFromLongitude(lon: number): number {
  return Math.floor(normalizeDegrees(lon) / 30);
}

function degreeInSign(lon: number): number {
  return normalizeDegrees(lon) % 30;
}

// Simple city cache copied from astrocartography route (fast path).
const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  "new york": { latitude: 40.7128, longitude: -74.006 },
  "new york, usa": { latitude: 40.7128, longitude: -74.006 },
  london: { latitude: 51.5074, longitude: -0.1278 },
  "london, uk": { latitude: 51.5074, longitude: -0.1278 },
  paris: { latitude: 48.8566, longitude: 2.3522 },
  "paris, france": { latitude: 48.8566, longitude: 2.3522 },
  tokyo: { latitude: 35.6762, longitude: 139.6503 },
  "tokyo, japan": { latitude: 35.6762, longitude: 139.6503 },
  "los angeles": { latitude: 34.0522, longitude: -118.2437 },
  "los angeles, usa": { latitude: 34.0522, longitude: -118.2437 },
  sydney: { latitude: -33.8688, longitude: 151.2093 },
  "sydney, australia": { latitude: -33.8688, longitude: 151.2093 },
  singapore: { latitude: 1.3521, longitude: 103.8198 },
  dubai: { latitude: 25.2048, longitude: 55.2708 },
  "hong kong": { latitude: 22.3193, longitude: 114.1694 },
  香港: { latitude: 22.3193, longitude: 114.1694 },
  beijing: { latitude: 39.9042, longitude: 116.4074 },
  北京: { latitude: 39.9042, longitude: 116.4074 },
  shanghai: { latitude: 31.2304, longitude: 121.4737 },
  上海: { latitude: 31.2304, longitude: 121.4737 },
};

async function geocodeLocation(location: string): Promise<{ latitude: number; longitude: number } | null> {
  const normalized = location.toLowerCase().trim();
  if (CITY_COORDINATES[normalized]) {
    return CITY_COORDINATES[normalized];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      {
        headers: { "User-Agent": "Astrocartography-App/1.0" },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (data && data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

function getCacheKey(input: BirthChartRequest & { latitude: number; longitude: number }) {
  return `${input.birthDate}-${input.birthTime}-${input.timezone}-${input.latitude}-${input.longitude}`;
}

async function getCachedBirthChart(cacheKey: string, input: BirthChartRequest & { latitude: number; longitude: number }) {
  return unstable_cache(
    async () => {
      const timezoneOffset = parseTimezoneOffset(input.timezone);
      const [hours, minutes] = input.birthTime.split(":").map(Number);
      const localTime = new Date(
        `${input.birthDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
      );
      const utcTime = new Date(localTime.getTime() - timezoneOffset * 60 * 60 * 1000);

      const ascLon = calculateAscendantLongitude(utcTime, input.latitude, input.longitude);
      const ascSignIndex = signIndexFromLongitude(ascLon);

      const time = Astronomy.MakeTime(utcTime);
      const planets = PLANETS.map(({ body, name, glyph }) => {
        const lon = getGeocentricEclipticLongitude(body, time);
        const pSignIndex = signIndexFromLongitude(lon);
        const house = ((pSignIndex - ascSignIndex + 12) % 12) + 1; // Whole Sign Houses

        return {
          name,
          glyph,
          longitude: lon,
          sign: SIGNS[pSignIndex],
          degree: degreeInSign(lon),
          house,
        };
      });

      // NOTE: Must return plain JSON-serializable data from unstable_cache.
      // Returning a NextResponse here will break caching (and can throw at runtime).
      return {
        success: true,
        data: {
          birthData: {
            date: input.birthDate,
            time: input.birthTime,
            location: input.birthLocation,
            latitude: input.latitude,
            longitude: input.longitude,
            timezone: input.timezone,
          },
          system: "Whole Sign Houses",
          ascendant: {
            longitude: ascLon,
            sign: SIGNS[ascSignIndex],
            degree: degreeInSign(ascLon),
          },
          planets,
        },
      };
    },
    ["birth-chart", cacheKey],
    { revalidate }
  )();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as BirthChartRequest;
    const { birthDate, birthTime, birthLocation, timezone } = body;

    if (!birthDate || !birthTime || !birthLocation || !timezone) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    let latitude = body.latitude;
    let longitude = body.longitude;
    if (latitude == null || longitude == null) {
      const coords = await geocodeLocation(birthLocation);
      if (!coords) {
        return NextResponse.json(
          {
            success: false,
            error: `Unable to find coordinates for "${birthLocation}". Try a more specific place name (e.g. "New York, USA").`,
          },
          { status: 400 }
        );
      }
      latitude = coords.latitude;
      longitude = coords.longitude;
    }

    const cacheKey = getCacheKey({ ...body, latitude, longitude });
    const result = await getCachedBirthChart(cacheKey, { ...body, latitude, longitude });
    return NextResponse.json(result);
  } catch (e: any) {
    const message =
      (e && typeof e === "object" && "message" in e && typeof e.message === "string" && e.message) ||
      String(e) ||
      "Failed to calculate birth chart.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

