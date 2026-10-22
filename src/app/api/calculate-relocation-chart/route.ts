import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  calculateMidheavenLongitude,
  computeWholeSignChart,
  localBirthTimeToUtc,
} from "@/lib/natal-chart-core";
import {
  buildRelocationReadingSnapshot,
  longitudeToAngleSnapshot,
} from "@/lib/relocation-snapshot";

export const revalidate = 3600;
export const maxDuration = 30;

interface RelocationChartRequest {
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
  relocateLocation: string;
  relocateLatitude?: number;
  relocateLongitude?: number;
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

function getCacheKey(parts: {
  birthDate: string;
  birthTime: string;
  timezone: string;
  birthLat: number;
  birthLng: number;
  relocLat: number;
  relocLng: number;
}) {
  return `${parts.birthDate}-${parts.birthTime}-${parts.timezone}-${parts.birthLat}-${parts.birthLng}-${parts.relocLat}-${parts.relocLng}`;
}

async function getCachedRelocation(
  cacheKey: string,
  input: RelocationChartRequest & {
    latitude: number;
    longitude: number;
    relocateLatitude: number;
    relocateLongitude: number;
  }
) {
  return unstable_cache(
    async () => {
      const utcTime = localBirthTimeToUtc(input.birthDate, input.birthTime, input.timezone);
      const natal = computeWholeSignChart(utcTime, input.latitude, input.longitude);
      const relocated = computeWholeSignChart(utcTime, input.relocateLatitude, input.relocateLongitude);

      const natalMcLon = calculateMidheavenLongitude(utcTime, input.longitude);
      const relocatedMcLon = calculateMidheavenLongitude(utcTime, input.relocateLongitude);

      const planets = natal.planets.map((p, i) => ({
        name: p.name,
        glyph: p.glyph,
        longitude: p.longitude,
        sign: p.sign,
        degree: p.degree,
        natalHouse: p.house,
        relocatedHouse: relocated.planets[i].house,
      }));

      const readingSnapshot = buildRelocationReadingSnapshot(
        planets,
        natal.ascendant.longitude,
        relocated.ascendant.longitude,
        natalMcLon,
        relocatedMcLon
      );

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
          relocateData: {
            location: input.relocateLocation,
            latitude: input.relocateLatitude,
            longitude: input.relocateLongitude,
          },
          system: "Whole Sign Houses",
          natalAscendant: natal.ascendant,
          relocatedAscendant: relocated.ascendant,
          natalMidheaven: longitudeToAngleSnapshot(natalMcLon),
          relocatedMidheaven: longitudeToAngleSnapshot(relocatedMcLon),
          planets,
          readingSnapshot,
        },
      };
    },
    ["relocation-chart", cacheKey],
    { revalidate }
  )();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RelocationChartRequest;
    const { birthDate, birthTime, birthLocation, timezone, relocateLocation } = body;

    if (!birthDate || !birthTime || !birthLocation || !timezone || !relocateLocation?.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required fields (birth data and relocation city)." },
        { status: 400 }
      );
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

    let relocateLatitude = body.relocateLatitude;
    let relocateLongitude = body.relocateLongitude;
    if (relocateLatitude == null || relocateLongitude == null) {
      const coords = await geocodeLocation(relocateLocation.trim());
      if (!coords) {
        return NextResponse.json(
          {
            success: false,
            error: `Unable to find coordinates for "${relocateLocation}". Try a more specific city and country.`,
          },
          { status: 400 }
        );
      }
      relocateLatitude = coords.latitude;
      relocateLongitude = coords.longitude;
    }

    const cacheKey = getCacheKey({
      birthDate,
      birthTime,
      timezone,
      birthLat: latitude,
      birthLng: longitude,
      relocLat: relocateLatitude,
      relocLng: relocateLongitude,
    });

    const result = await getCachedRelocation(cacheKey, {
      ...body,
      latitude,
      longitude,
      relocateLatitude,
      relocateLongitude,
    });

    return NextResponse.json(result);
  } catch (e: unknown) {
    const message =
      e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
        ? (e as { message: string }).message
        : String(e) || "Failed to calculate relocation chart.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
