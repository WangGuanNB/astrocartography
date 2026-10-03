import { NextRequest, NextResponse } from "next/server";
import {
  computeWholeSignChart,
  localBirthTimeToUtc,
  signIndexFromLongitude,
  type PlanetName,
  type PlanetRow,
} from "@/lib/natal-chart-core";
import { computeSynastryAspects, type PlanetLon } from "@/lib/synastry-aspects";
import {
  buildNatalOverlay,
  buildRelationshipSnapshot,
  groupAspects,
  pickHeadlineAspects,
  type BigThreePlacement,
} from "@/lib/synastry-snapshot";

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

function serializePlanet(p: PlanetRow) {
  return {
    name: p.name,
    glyph: p.glyph,
    longitude: Math.round(p.longitude * 100) / 100,
    sign: p.sign,
    degree: Math.round(p.degree * 100) / 100,
    house: p.house,
  };
}

function buildBigThree(
  planets: PlanetRow[],
  ascendant: { sign: string; degree: number }
): {
  sun: BigThreePlacement | null;
  moon: BigThreePlacement | null;
  rising: BigThreePlacement;
} {
  const sun = planets.find((p) => p.name === "Sun");
  const moon = planets.find((p) => p.name === "Moon");
  return {
    sun: sun ? { sign: sun.sign, degree: Math.round(sun.degree * 100) / 100 } : null,
    moon: moon ? { sign: moon.sign, degree: Math.round(moon.degree * 100) / 100 } : null,
    rising: {
      sign: ascendant.sign,
      degree: Math.round(ascendant.degree * 100) / 100,
    },
  };
}

function wholeSignHouseForLongitude(planetLon: number, ascendantLon: number): number {
  const ascSign = signIndexFromLongitude(ascendantLon);
  const pSign = signIndexFromLongitude(planetLon);
  return ((pSign - ascSign + 12) % 12) + 1;
}

function toPlanetLons(planets: PlanetRow[]): PlanetLon[] {
  return planets.map((p) => ({ name: p.name as PlanetName, glyph: p.glyph, longitude: p.longitude }));
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      personA: PersonPayload;
      personB: PersonPayload;
      relocateLocation?: string;
    };

    const { personA, personB, relocateLocation } = body;
    if (!personA?.birthDate || !personA.birthLocation || !personA.timezone) {
      return NextResponse.json(
        { success: false, error: "Missing person A: birthDate, birthLocation, timezone." },
        { status: 400 }
      );
    }
    if (!personB?.birthDate || !personB.birthLocation || !personB.timezone) {
      return NextResponse.json(
        { success: false, error: "Missing person B: birthDate, birthLocation, timezone." },
        { status: 400 }
      );
    }

    let latA = personA.latitude;
    let lngA = personA.longitude;
    if (latA == null || lngA == null) {
      const c = await geocodeLocation(personA.birthLocation);
      if (!c) {
        return NextResponse.json(
          { success: false, error: `Unable to find coordinates for person A: "${personA.birthLocation}".` },
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
          { success: false, error: `Unable to find coordinates for person B: "${personB.birthLocation}".` },
          { status: 400 }
        );
      }
      latB = c.latitude;
      lngB = c.longitude;
    }

    const timeA = defaultTime(personA.birthTime);
    const timeB = defaultTime(personB.birthTime);
    const utcA = localBirthTimeToUtc(personA.birthDate, timeA, personA.timezone);
    const utcB = localBirthTimeToUtc(personB.birthDate, timeB, personB.timezone);

    const natalA = computeWholeSignChart(utcA, latA, lngA);
    const natalB = computeWholeSignChart(utcB, latB, lngB);

    const aspects = computeSynastryAspects(toPlanetLons(natalA.planets), toPlanetLons(natalB.planets));

    let relocated:
      | {
          location: string;
          latitude: number;
          longitude: number;
          ascendantA: { sign: string; degree: number };
          ascendantB: { sign: string; degree: number };
          /** Person A's planets in whole-sign houses of B's chart at shared location */
          aInB: Array<{ planet: PlanetName; glyph: string; houseInPartner: number }>;
          /** Person B's planets in whole-sign houses of A's chart at shared location */
          bInA: Array<{ planet: PlanetName; glyph: string; houseInPartner: number }>;
        }
      | undefined;

    if (relocateLocation?.trim()) {
      const rc = await geocodeLocation(relocateLocation.trim());
      if (!rc) {
        return NextResponse.json(
          { success: false, error: `Unable to geocode shared city: "${relocateLocation}".` },
          { status: 400 }
        );
      }
      const chartAR = computeWholeSignChart(utcA, rc.latitude, rc.longitude);
      const chartBR = computeWholeSignChart(utcB, rc.latitude, rc.longitude);

      const ascB = chartBR.ascendant.longitude;
      const ascA = chartAR.ascendant.longitude;

      relocated = {
        location: relocateLocation.trim(),
        latitude: rc.latitude,
        longitude: rc.longitude,
        ascendantA: { sign: chartAR.ascendant.sign, degree: Math.round(chartAR.ascendant.degree * 100) / 100 },
        ascendantB: { sign: chartBR.ascendant.sign, degree: Math.round(chartBR.ascendant.degree * 100) / 100 },
        aInB: natalA.planets.map((p) => ({
          planet: p.name,
          glyph: p.glyph,
          houseInPartner: wholeSignHouseForLongitude(p.longitude, ascB),
        })),
        bInA: natalB.planets.map((p) => ({
          planet: p.name,
          glyph: p.glyph,
          houseInPartner: wholeSignHouseForLongitude(p.longitude, ascA),
        })),
      };
    }

    const headlineAspects = pickHeadlineAspects(aspects);
    const aspectGroups = groupAspects(aspects);
    const relationshipSnapshot = buildRelationshipSnapshot(aspects);
    const natalOverlay = buildNatalOverlay(
      natalA.planets,
      natalB.ascendant.longitude,
      natalB.planets,
      natalA.ascendant.longitude,
      wholeSignHouseForLongitude
    );

    return NextResponse.json({
      success: true,
      data: {
        personA: {
          birthData: {
            date: personA.birthDate,
            time: timeA,
            location: personA.birthLocation,
            latitude: latA,
            longitude: lngA,
            timezone: personA.timezone,
          },
          ascendant: {
            sign: natalA.ascendant.sign,
            degree: Math.round(natalA.ascendant.degree * 100) / 100,
            longitude: Math.round(natalA.ascendant.longitude * 100) / 100,
          },
          planets: natalA.planets.map(serializePlanet),
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
          ascendant: {
            sign: natalB.ascendant.sign,
            degree: Math.round(natalB.ascendant.degree * 100) / 100,
            longitude: Math.round(natalB.ascendant.longitude * 100) / 100,
          },
          planets: natalB.planets.map(serializePlanet),
        },
        aspects,
        relocated,
        bigThreeA: buildBigThree(natalA.planets, natalA.ascendant),
        bigThreeB: buildBigThree(natalB.planets, natalB.ascendant),
        headlineAspects,
        aspectGroups,
        relationshipSnapshot,
        natalOverlay,
        birthTimeProvided: {
          personA: Boolean(personA.birthTime?.trim()),
          personB: Boolean(personB.birthTime?.trim()),
        },
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Failed to calculate synastry chart.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
