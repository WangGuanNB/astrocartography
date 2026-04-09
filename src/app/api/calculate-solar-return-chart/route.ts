import { unstable_cache } from "next/cache";
import * as Astronomy from "astronomy-engine";
import { NextRequest, NextResponse } from "next/server";
import {
  computeWholeSignChart,
  getGeocentricEclipticLongitude,
  localBirthTimeToUtc,
} from "@/lib/natal-chart-core";
import { findSolarReturnUtc } from "@/lib/solar-return";

export const revalidate = 3600;
export const maxDuration = 30;

interface SolarReturnChartRequest {
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  timezone: string;
  latitude?: number;
  longitude?: number;
  returnYear: number;
  /** If omitted, uses birth location for the return chart (common default). */
  returnLocation?: string;
  returnLatitude?: number;
  returnLongitude?: number;
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
  returnYear: number;
  returnLat: number;
  returnLng: number;
}) {
  return `sr-${parts.birthDate}-${parts.birthTime}-${parts.timezone}-${parts.birthLat}-${parts.birthLng}-${parts.returnYear}-${parts.returnLat}-${parts.returnLng}`;
}

async function getCachedSolarReturn(
  cacheKey: string,
  input: SolarReturnChartRequest & {
    latitude: number;
    longitude: number;
    returnLatitude: number;
    returnLongitude: number;
    returnLocationLabel: string;
  }
) {
  return unstable_cache(
    async () => {
      const utcBirth = localBirthTimeToUtc(input.birthDate, input.birthTime, input.timezone);
      const timeBirth = Astronomy.MakeTime(utcBirth);
      const natalSunLon = getGeocentricEclipticLongitude(Astronomy.Body.Sun, timeBirth);

      const [, monthStr, dayStr] = input.birthDate.split("-");
      const birthMonth = Number(monthStr);
      const birthDay = Number(dayStr);

      const solarReturnUtc = findSolarReturnUtc(natalSunLon, input.returnYear, birthMonth, birthDay);
      const { ascendant, planets } = computeWholeSignChart(
        solarReturnUtc,
        input.returnLatitude,
        input.returnLongitude
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
          returnYear: input.returnYear,
          returnLocation: input.returnLocationLabel,
          returnLatitude: input.returnLatitude,
          returnLongitude: input.returnLongitude,
          solarReturnUtc: solarReturnUtc.toISOString(),
          natalSunLongitude: Math.round(natalSunLon * 10000) / 10000,
          system: "Whole Sign Houses",
          ascendant,
          planets,
        },
      };
    },
    ["solar-return-chart", cacheKey],
    { revalidate }
  )();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SolarReturnChartRequest;
    const { birthDate, birthTime, birthLocation, timezone, returnYear } = body;

    if (!birthDate || !birthTime || !birthLocation || !timezone || returnYear == null || Number.isNaN(Number(returnYear))) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: birthDate, birthTime, birthLocation, timezone, returnYear." },
        { status: 400 }
      );
    }

    const y = Math.floor(Number(returnYear));
    if (y < 1920 || y > 2100) {
      return NextResponse.json({ success: false, error: "returnYear must be between 1920 and 2100." }, { status: 400 });
    }

    let latitude = body.latitude;
    let longitude = body.longitude;
    if (latitude == null || longitude == null) {
      const coords = await geocodeLocation(birthLocation);
      if (!coords) {
        return NextResponse.json(
          {
            success: false,
            error: `Unable to find coordinates for "${birthLocation}". Try a more specific place name (e.g., "New York, USA").`,
          },
          { status: 400 }
        );
      }
      latitude = coords.latitude;
      longitude = coords.longitude;
    }

    const returnLoc = body.returnLocation?.trim() || birthLocation;
    const returnLocationLabel = returnLoc;
    let returnLatitude = body.returnLatitude;
    let returnLongitude = body.returnLongitude;
    if (returnLatitude == null || returnLongitude == null) {
      const rc = await geocodeLocation(returnLoc);
      if (!rc) {
        return NextResponse.json(
          {
            success: false,
            error: `Unable to find coordinates for return location "${returnLoc}". Try a city and country.`,
          },
          { status: 400 }
        );
      }
      returnLatitude = rc.latitude;
      returnLongitude = rc.longitude;
    }

    const cacheKey = getCacheKey({
      birthDate,
      birthTime,
      timezone,
      birthLat: latitude,
      birthLng: longitude,
      returnYear: y,
      returnLat: returnLatitude,
      returnLng: returnLongitude,
    });

    const result = await getCachedSolarReturn(cacheKey, {
      ...body,
      returnYear: y,
      latitude,
      longitude,
      returnLatitude,
      returnLongitude,
      returnLocationLabel,
    });
    return NextResponse.json(result);
  } catch (e: unknown) {
    const message =
      e && typeof e === "object" && "message" in e && typeof (e as { message: unknown }).message === "string"
        ? (e as { message: string }).message
        : String(e) || "Failed to calculate solar return chart.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
