import { NextRequest, NextResponse } from "next/server";
import {
  SIGNS,
  computeWholeSignChart,
  degreeInSign,
  localBirthTimeToUtc,
  normalizeDegrees,
  signIndexFromLongitude,
} from "@/lib/natal-chart-core";
import { getChironPlacement } from "@/lib/chiron-ephemeris";
import { getBigFourAsteroidPlacements } from "@/lib/asteroid-ephemeris";

export const revalidate = 3600;
export const maxDuration = 30;

type PlacementType = "venus" | "lunar-nodes" | "chiron" | "asteroids";

interface PlacementRequest {
  type: PlacementType;
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
}

const CITY_COORDINATES: Record<string, { latitude: number; longitude: number }> = {
  "new york": { latitude: 40.7128, longitude: -74.006 },
  "new york, usa": { latitude: 40.7128, longitude: -74.006 },
  london: { latitude: 51.5074, longitude: -0.1278 },
  "london, uk": { latitude: 51.5074, longitude: -0.1278 },
  paris: { latitude: 48.8566, longitude: 2.3522 },
  tokyo: { latitude: 35.6762, longitude: 139.6503 },
  "los angeles": { latitude: 34.0522, longitude: -118.2437 },
  sydney: { latitude: -33.8688, longitude: 151.2093 },
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
      {
        headers: { "User-Agent": "Astrocartography-App/1.0" },
        signal: controller.signal,
      }
    );
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = await response.json();
    if (data && data.length > 0) {
      return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    }
  } catch {
    return null;
  }
  return null;
}

function wholeSignHouse(pointLon: number, ascLon: number): number {
  const ascSign = signIndexFromLongitude(ascLon);
  const pointSign = signIndexFromLongitude(pointLon);
  return ((pointSign - ascSign + 12) % 12) + 1;
}

function meanNorthNodeLongitude(utcDate: Date): number {
  const jd = utcDate.getTime() / 86400000 + 2440587.5;
  const t = (jd - 2451545.0) / 36525;
  return normalizeDegrees(125.04452 - 1934.136261 * t + 0.0020708 * t * t + (t * t * t) / 450000);
}

function signFromLongitude(lon: number) {
  const idx = signIndexFromLongitude(lon);
  return {
    sign: SIGNS[idx],
    degree: degreeInSign(lon),
    longitude: normalizeDegrees(lon),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PlacementRequest;
    const { type, birthDate, birthTime, birthLocation, timezone } = body;
    if (!type || !birthDate || !birthTime || !birthLocation || !timezone) {
      return NextResponse.json({ success: false, error: "Missing required fields." }, { status: 400 });
    }

    let latitude = body.latitude;
    let longitude = body.longitude;
    if (latitude == null || longitude == null) {
      const coords = await geocodeLocation(birthLocation);
      if (!coords) {
        return NextResponse.json(
          { success: false, error: `Unable to find coordinates for "${birthLocation}". Try a more specific place name.` },
          { status: 400 }
        );
      }
      latitude = coords.latitude;
      longitude = coords.longitude;
    }

    const utcTime = localBirthTimeToUtc(birthDate, birthTime, timezone);
    const chart = computeWholeSignChart(utcTime, latitude, longitude);

    if (type === "venus") {
      const venus = chart.planets.find((p) => p.name === "Venus");
      return NextResponse.json({
        success: true,
        data: {
          type,
          birthData: { date: birthDate, time: birthTime, location: birthLocation, latitude, longitude, timezone },
          placements: venus ? [{ ...venus, label: "Venus" }] : [],
          note: "Venus is calculated from geocentric ecliptic longitude and shown with whole-sign house placement.",
        },
      });
    }

    if (type === "lunar-nodes") {
      const northLon = meanNorthNodeLongitude(utcTime);
      const southLon = normalizeDegrees(northLon + 180);
      const north = signFromLongitude(northLon);
      const south = signFromLongitude(southLon);
      return NextResponse.json({
        success: true,
        data: {
          type,
          birthData: { date: birthDate, time: birthTime, location: birthLocation, latitude, longitude, timezone },
          placements: [
            { label: "North Node", glyph: "☊", ...north, house: wholeSignHouse(northLon, chart.ascendant.longitude) },
            { label: "South Node", glyph: "☋", ...south, house: wholeSignHouse(southLon, chart.ascendant.longitude) },
          ],
          note: "This tool uses the mean lunar node for a stable natal reading. True node calculations may vary slightly.",
        },
      });
    }

    if (type === "asteroids") {
      const asteroids = getBigFourAsteroidPlacements(utcTime);
      return NextResponse.json({
        success: true,
        data: {
          type,
          birthData: { date: birthDate, time: birthTime, location: birthLocation, latitude, longitude, timezone },
          placements: asteroids.map((asteroid) => ({
            ...asteroid,
            house: wholeSignHouse(asteroid.longitude, chart.ascendant.longitude),
          })),
          note:
            "Ceres, Pallas, Juno, and Vesta are calculated from a static NASA/JPL Horizons geocentric ecliptic longitude ephemeris and shown with whole-sign house placement.",
        },
      });
    }

    const chiron = getChironPlacement(utcTime);
    return NextResponse.json({
      success: true,
      data: {
        type,
        birthData: { date: birthDate, time: birthTime, location: birthLocation, latitude, longitude, timezone },
        placements: [{ ...chiron, house: wholeSignHouse(chiron.longitude, chart.ascendant.longitude) }],
        note:
          "Chiron is calculated from a static NASA/JPL Horizons geocentric ecliptic longitude ephemeris and shown with whole-sign house placement.",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || "Failed to calculate placement." },
      { status: 500 }
    );
  }
}
