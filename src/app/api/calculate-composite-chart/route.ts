import { NextRequest, NextResponse } from "next/server";
import {
  computeWholeSignChart,
  localBirthTimeToUtc,
  signIndexFromLongitude,
  type PlanetName,
  type PlanetRow,
} from "@/lib/natal-chart-core";
import { normalizeDegrees, findSynastryAspect, type PlanetLon } from "@/lib/synastry-aspects";

export const maxDuration = 30;

interface PersonPayload {
  birthDate: string;
  birthTime?: string;
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
  hefei: { latitude: 31.8639, longitude: 117.2808 },
  "hefei, china": { latitude: 31.8639, longitude: 117.2808 },
  "hefei, anhui, china": { latitude: 31.8639, longitude: 117.2808 },
  合肥: { latitude: 31.8639, longitude: 117.2808 },
};

async function geocodeLocation(location: string): Promise<{ latitude: number; longitude: number } | null> {
  const normalized = location.toLowerCase().trim();
  if (CITY_COORDINATES[normalized]) return CITY_COORDINATES[normalized];
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
      { headers: { "User-Agent": "Astrocartography-App/1.0" }, signal: controller.signal }
    );
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.length > 0) return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
    return null;
  } catch {
    return null;
  }
}

function defaultTime(t?: string): string {
  const s = t?.trim();
  if (!s) return "12:00";
  return s;
}

/**
 * Compute the midpoint longitude between two ecliptic longitudes.
 * Uses the shorter arc of the two possible midpoints.
 */
function midpointLongitude(a: number, b: number): number {
  const a0 = normalizeDegrees(a);
  const b0 = normalizeDegrees(b);
  let mid = (a0 + b0) / 2;
  // If the arc > 180°, use the other midpoint
  const diff = Math.abs(a0 - b0);
  if (diff > 180) {
    mid = normalizeDegrees(mid + 180);
  }
  return mid;
}

function signFromLongitude(lon: number): string {
  const SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
  ];
  return SIGNS[Math.floor(normalizeDegrees(lon) / 30)];
}

function degreeInSign(lon: number): number {
  return normalizeDegrees(lon) % 30;
}

function wholeSignHouse(planetLon: number, ascLon: number): number {
  const ascSign = signIndexFromLongitude(ascLon);
  const pSign = signIndexFromLongitude(planetLon);
  return ((pSign - ascSign + 12) % 12) + 1;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { personA: PersonPayload; personB: PersonPayload };
    const { personA, personB } = body;

    if (!personA?.birthDate || !personA.birthLocation || !personA.timezone) {
      return NextResponse.json(
        { success: false, error: "Missing person A birth data." },
        { status: 400 }
      );
    }
    if (!personB?.birthDate || !personB.birthLocation || !personB.timezone) {
      return NextResponse.json(
        { success: false, error: "Missing person B birth data." },
        { status: 400 }
      );
    }

    // Resolve coordinates
    let latA = personA.latitude;
    let lngA = personA.longitude;
    if (latA == null || lngA == null) {
      const c = await geocodeLocation(personA.birthLocation);
      if (!c) {
        return NextResponse.json(
          { success: false, error: `Cannot find coordinates for: "${personA.birthLocation}". Try a larger nearby city.` },
          { status: 400 }
        );
      }
      latA = c.latitude;
      lngA = c.longitude;
    }

    let latB = personB.latitude;
    let lngB = personB.longitude;
    if (latB == null || lngB == null) {
      const c = await geocodeLocation(personB.birthLocation);
      if (!c) {
        return NextResponse.json(
          { success: false, error: `Cannot find coordinates for: "${personB.birthLocation}". Try a larger nearby city.` },
          { status: 400 }
        );
      }
      latB = c.latitude;
      lngB = c.longitude;
    }

    // Compute individual natal charts
    const timeA = defaultTime(personA.birthTime);
    const timeB = defaultTime(personB.birthTime);
    const utcA = localBirthTimeToUtc(personA.birthDate, timeA, personA.timezone);
    const utcB = localBirthTimeToUtc(personB.birthDate, timeB, personB.timezone);

    const natalA = computeWholeSignChart(utcA, latA, lngA);
    const natalB = computeWholeSignChart(utcB, latB, lngB);

    // Composite Ascendant = midpoint of both Ascendants
    const compositeAscLon = midpointLongitude(natalA.ascendant.longitude, natalB.ascendant.longitude);

    // Composite planets = midpoint of each planet pair
    const compositePlanets = natalA.planets.map((pA: PlanetRow) => {
      const pB = natalB.planets.find((p: PlanetRow) => p.name === pA.name);
      const midLon = pB ? midpointLongitude(pA.longitude, pB.longitude) : pA.longitude;
      return {
        name: pA.name,
        glyph: pA.glyph,
        longitude: Math.round(midLon * 100) / 100,
        sign: signFromLongitude(midLon),
        degree: Math.round(degreeInSign(midLon) * 100) / 100,
        house: wholeSignHouse(midLon, compositeAscLon),
      };
    });

    // Composite aspects = aspects between composite planets themselves
    const planetLons: PlanetLon[] = compositePlanets.map((p) => ({
      name: p.name as PlanetName,
      glyph: p.glyph,
      longitude: p.longitude,
    }));

    const compositeAspects: Array<{
      planet1: string;
      glyph1: string;
      planet2: string;
      glyph2: string;
      aspect: string;
      orb: number;
    }> = [];

    for (let i = 0; i < planetLons.length; i++) {
      for (let j = i + 1; j < planetLons.length; j++) {
        const found = findSynastryAspect(planetLons[i].longitude, planetLons[j].longitude);
        if (found) {
          compositeAspects.push({
            planet1: planetLons[i].name,
            glyph1: planetLons[i].glyph,
            planet2: planetLons[j].name,
            glyph2: planetLons[j].glyph,
            aspect: found.aspect,
            orb: found.orb,
          });
        }
      }
    }

    // Sort aspects by orb (tightest first)
    compositeAspects.sort((a, b) => a.orb - b.orb);

    return NextResponse.json({
      success: true,
      personA: {
        birthData: {
          date: personA.birthDate,
          time: timeA,
          location: personA.birthLocation,
          latitude: latA,
          longitude: lngA,
          timezone: personA.timezone,
        },
      },
      personB: {
        birthData: {
          date: personB.birthDate,
          time: timeB,
          location: personB.birthLocation,
          latitude: latB,
          longitude: lngB,
          timezone: personB.timezone,
        },
      },
      compositeChart: {
        ascendant: {
          longitude: Math.round(compositeAscLon * 100) / 100,
          sign: signFromLongitude(compositeAscLon),
          degree: Math.round(degreeInSign(compositeAscLon) * 100) / 100,
        },
        planets: compositePlanets,
        aspects: compositeAspects,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to calculate composite chart.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
