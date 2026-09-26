import { NextRequest, NextResponse } from "next/server";
import {
  calculateAscendantLongitude,
  calculateMidheavenLongitude,
  computeWholeSignChart,
  degreeInSign,
  getAscendantCuspSensitivity,
  getSignRulers,
  localBirthTimeToUtc,
  normalizeDegrees,
  SIGNS,
  signIndexFromLongitude,
  type PlanetName,
  type PlanetRow,
} from "@/lib/natal-chart-core";
import { computeAspectsToLongitude } from "@/lib/synastry-aspects";

export const maxDuration = 30;

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
  lima: { latitude: -12.0464, longitude: -77.0428 },
  "lima, peru": { latitude: -12.0464, longitude: -77.0428 },
};

function roundDeg(deg: number) {
  return Math.round(deg * 100) / 100;
}

function anglePayload(longitude: number) {
  return {
    sign: SIGNS[signIndexFromLongitude(longitude)],
    degree: roundDeg(degreeInSign(longitude)),
    longitude: roundDeg(longitude),
  };
}

function planetPlacement(p: PlanetRow) {
  return {
    planet: p.name,
    sign: p.sign,
    degree: roundDeg(p.degree),
    house: p.house,
    longitude: roundDeg(p.longitude),
  };
}

function rulerPayload(planetName: PlanetName, planets: PlanetRow[]) {
  const row = planets.find((p) => p.name === planetName);
  if (!row) {
    return {
      planet: planetName,
      sign: null as string | null,
      degree: null as number | null,
      house: null as number | null,
      longitude: null as number | null,
    };
  }
  return {
    planet: planetName,
    sign: row.sign,
    degree: roundDeg(row.degree),
    house: row.house,
    longitude: roundDeg(row.longitude),
  };
}

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

    const utcTime = localBirthTimeToUtc(birthDate, birthTime, timezone);
    const chart = computeWholeSignChart(utcTime, latitude, longitude);
    const ascLon = chart.ascendant.longitude;
    const signIndex = signIndexFromLongitude(ascLon);
    const { modern: modernRuler, traditional: traditionalRuler } = getSignRulers(signIndex);
    const mcLon = calculateMidheavenLongitude(utcTime, longitude);
    const dscLon = normalizeDegrees(ascLon + 180);
    const icLon = normalizeDegrees(mcLon + 180);

    const sun = chart.planets.find((p) => p.name === "Sun");
    const moon = chart.planets.find((p) => p.name === "Moon");
    const modernRulerPlanet = rulerPayload(modernRuler, chart.planets);
    const traditionalRulerPlanet = rulerPayload(traditionalRuler, chart.planets);

    const planetLons = chart.planets.map((p) => ({
      name: p.name,
      glyph: p.glyph,
      longitude: p.longitude,
    }));

    const ascendantAspects = computeAspectsToLongitude(ascLon, planetLons);
    const modernRulerAspects =
      modernRulerPlanet.longitude != null
        ? computeAspectsToLongitude(modernRulerPlanet.longitude, planetLons).filter(
            (a) => a.planet !== modernRuler
          )
        : [];
    const traditionalRulerAspects =
      traditionalRuler !== modernRuler && traditionalRulerPlanet.longitude != null
        ? computeAspectsToLongitude(traditionalRulerPlanet.longitude, planetLons).filter(
            (a) => a.planet !== traditionalRuler
          )
        : [];

    const firstHousePlanets = chart.planets.filter((p) => p.house === 1).map(planetPlacement);

    const houses = Array.from({ length: 12 }, (_, i) => ({
      house: i + 1,
      sign: SIGNS[(signIndex + i) % 12],
    }));

    const otherCities = GEO_CITIES.map((city) => {
      const cityAscLon = calculateAscendantLongitude(utcTime, city.lat, city.lng);
      const citySignIndex = signIndexFromLongitude(cityAscLon);
      const cityDegree = degreeInSign(cityAscLon);
      return {
        cityName: city.name,
        country: city.country,
        sign: SIGNS[citySignIndex],
        degree: roundDeg(cityDegree),
      };
    });

    const ascDegree = roundDeg(chart.ascendant.degree);
    const cuspSensitivity = getAscendantCuspSensitivity(ascDegree);

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
          sign: chart.ascendant.sign,
          degree: ascDegree,
          longitude: roundDeg(ascLon),
          ruler: modernRuler,
          rulers: {
            modern: modernRuler,
            traditional: traditionalRuler,
          },
          cuspSensitivity,
        },
        bigThree: {
          sun: sun
            ? { sign: sun.sign, degree: roundDeg(sun.degree), house: sun.house }
            : null,
          moon: moon
            ? { sign: moon.sign, degree: roundDeg(moon.degree), house: moon.house }
            : null,
          rising: {
            sign: chart.ascendant.sign,
            degree: ascDegree,
          },
        },
        angles: {
          asc: anglePayload(ascLon),
          dsc: anglePayload(dscLon),
          mc: anglePayload(mcLon),
          ic: anglePayload(icLon),
        },
        houses,
        houseSystem: "whole-sign",
        rulerSystem: "modern-primary-traditional-noted",
        firstHousePlanets,
        ascendantAspects,
        chartRuler: modernRulerPlanet,
        traditionalChartRuler: traditionalRuler !== modernRuler ? traditionalRulerPlanet : null,
        chartRulerAspects: modernRulerAspects,
        traditionalChartRulerAspects:
          traditionalRuler !== modernRuler ? traditionalRulerAspects : [],
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
