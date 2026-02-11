import { NextRequest, NextResponse } from "next/server";
import * as Astronomy from "astronomy-engine";
export const maxDuration = 30;

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

/** Modern ruler: sign index (0–11) → planet name */
const RISING_SIGN_RULERS: Record<number, string> = {
  0: "Mars",    // Aries
  1: "Venus",   // Taurus
  2: "Mercury", // Gemini
  3: "Moon",    // Cancer
  4: "Sun",     // Leo
  5: "Mercury", // Virgo
  6: "Venus",   // Libra
  7: "Pluto",   // Scorpio
  8: "Jupiter", // Sagittarius
  9: "Saturn",  // Capricorn
  10: "Uranus", // Aquarius
  11: "Neptune", // Pisces
};

/** Cities for "geographic perspective" (same birth moment, different location) */
const GEO_CITIES = [
  { name: "New York", country: "USA", lat: 40.7128, lng: -74.006 },
  { name: "London", country: "UK", lat: 51.5074, lng: -0.1278 },
  { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
  { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
  { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  { name: "Dubai", country: "UAE", lat: 25.2048, lng: 55.2708 },
  { name: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437 },
  { name: "Singapore", country: "Singapore", lat: 1.3521, lng: 103.8198 },
];

interface RisingSignRequest {
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
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
      if (tz === "CST" && (timezone.includes("Beijing") || timezone.includes("China"))) return 8;
      return offset;
    }
  }
  return 0;
}

function getLocalSiderealTime(dateUtc: Date, longitude: number): number {
  const time = Astronomy.MakeTime(dateUtc);
  const gmstHours = Astronomy.SiderealTime(time);
  const lstDeg = (gmstHours * 15 + longitude) % 360;
  return lstDeg < 0 ? lstDeg + 360 : lstDeg;
}

function calculateAscendantLongitude(dateUtc: Date, latitude: number, longitude: number): number {
  const epsDeg = 23.4392911;
  const eps = degToRad(epsDeg);
  const phi = degToRad(latitude);
  const theta = degToRad(getLocalSiderealTime(dateUtc, longitude));
  const asc = Math.atan2(
    Math.sin(theta),
    Math.cos(theta) * Math.cos(eps) - Math.tan(phi) * Math.sin(eps)
  );
  return normalizeDegrees(radToDeg(asc));
}

function signIndexFromLongitude(lon: number): number {
  return Math.floor(normalizeDegrees(lon) / 30);
}

function degreeInSign(lon: number): number {
  return normalizeDegrees(lon) % 30;
}

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
  beijing: { latitude: 39.9042, longitude: 116.4074 },
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
    if (data?.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RisingSignRequest;
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

    const timezoneOffset = parseTimezoneOffset(timezone);
    const [hours, minutes] = birthTime.split(":").map(Number);
    const localTime = new Date(
      `${birthDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`
    );
    const utcTime = new Date(localTime.getTime() - timezoneOffset * 60 * 60 * 1000);

    const ascLon = calculateAscendantLongitude(utcTime, latitude, longitude);
    const signIndex = signIndexFromLongitude(ascLon);
    const sign = SIGNS[signIndex];
    const degree = degreeInSign(ascLon);
    const ruler = RISING_SIGN_RULERS[signIndex] ?? "—";

    const otherCities = GEO_CITIES.map((city) => {
      const cityAscLon = calculateAscendantLongitude(utcTime, city.lat, city.lng);
      const citySignIndex = signIndexFromLongitude(cityAscLon);
      const cityDegree = degreeInSign(cityAscLon);
      return {
        cityName: city.name,
        country: city.country,
        sign: SIGNS[citySignIndex],
        degree: Math.round(cityDegree * 100) / 100,
      };
    });

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
        ascendant: {
          sign,
          degree: Math.round(degree * 100) / 100,
          longitude: ascLon,
          ruler,
        },
        otherCities,
      },
    });
  } catch (e: unknown) {
    const message =
      e && typeof e === "object" && "message" in e && typeof (e as Error).message === "string"
        ? (e as Error).message
        : "Failed to calculate rising sign.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
