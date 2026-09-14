import * as Astronomy from "astronomy-engine";
import { localDateTimeToUtc } from "@/lib/timezone";

export type AstrocartographyAngle = "AS" | "DS" | "MC" | "IC";
export type AstrocartographyCoordinate = [latitude: number, longitude: number];

export interface AstrocartographyLine {
  planet: string;
  type: AstrocartographyAngle;
  color: string;
  coordinates: AstrocartographyCoordinate[];
}

export interface AstrocartographyBirthTime {
  birthDate: string;
  birthTime: string;
  timezone: string;
}

const PLANETS: Array<{ body: Astronomy.Body; name: string; color: string }> = [
  { body: Astronomy.Body.Sun, name: "Sun", color: "#FFD700" },
  { body: Astronomy.Body.Moon, name: "Moon", color: "#C0C0C0" },
  { body: Astronomy.Body.Mercury, name: "Mercury", color: "#FFA500" },
  { body: Astronomy.Body.Venus, name: "Venus", color: "#FF69B4" },
  { body: Astronomy.Body.Mars, name: "Mars", color: "#FF4500" },
  { body: Astronomy.Body.Jupiter, name: "Jupiter", color: "#9370DB" },
  { body: Astronomy.Body.Saturn, name: "Saturn", color: "#4169E1" },
  { body: Astronomy.Body.Uranus, name: "Uranus", color: "#00CED1" },
  { body: Astronomy.Body.Neptune, name: "Neptune", color: "#1E90FF" },
  { body: Astronomy.Body.Pluto, name: "Pluto", color: "#8B4513" },
];

export function normalizeLongitude(longitude: number): number {
  let normalized = ((longitude + 180) % 360 + 360) % 360 - 180;
  // Keep +180 instead of -180 when the input approached the positive edge.
  if (normalized === -180 && longitude > 0) normalized = 180;
  return normalized;
}

export function getGreenwichSiderealDegrees(date: Date): number {
  return Astronomy.SiderealTime(Astronomy.MakeTime(date)) * 15;
}

/**
 * Geocentric apparent equatorial coordinates of date.
 * Astrocartography lines describe where a body is angular on Earth at one
 * instant, so they must not depend on the user's birthplace as an observer.
 */
export function getGeocentricEquatorialCoordinates(
  body: Astronomy.Body,
  date: Date
): { raDegrees: number; decDegrees: number } {
  const time = Astronomy.MakeTime(date);
  const j2000 = Astronomy.GeoVector(body, time, true);
  const ofDate = Astronomy.RotateVector(
    Astronomy.Rotation_EQJ_EQD(time),
    j2000
  );
  const equator = Astronomy.EquatorFromVector(ofDate);

  return {
    raDegrees: equator.ra * 15,
    decDegrees: equator.dec,
  };
}

/**
 * Rising/setting curve from the standard altitude-zero hour-angle equation.
 * Rising uses H=-acos(-tan(phi)tan(dec)); setting uses the positive root.
 */
export function calculateHorizonLine(
  raDegrees: number,
  decDegrees: number,
  date: Date,
  angle: "AS" | "DS",
  latitudeStep = 3
): AstrocartographyCoordinate[] {
  const coordinates: AstrocartographyCoordinate[] = [];
  const gstDegrees = getGreenwichSiderealDegrees(date);
  const decRadians = (decDegrees * Math.PI) / 180;

  for (let latitude = -85; latitude <= 85; latitude += latitudeStep) {
    const latitudeRadians = (latitude * Math.PI) / 180;
    const cosHourAngle = -Math.tan(latitudeRadians) * Math.tan(decRadians);

    // At circumpolar latitudes this body does not cross the horizon.
    if (cosHourAngle < -1 || cosHourAngle > 1) continue;

    const hourAngleDegrees = (Math.acos(cosHourAngle) * 180) / Math.PI;
    const signedHourAngle =
      angle === "AS" ? -hourAngleDegrees : hourAngleDegrees;
    const longitude = normalizeLongitude(
      raDegrees + signedHourAngle - gstDegrees
    );
    coordinates.push([latitude, longitude]);
  }

  return coordinates;
}

/** MC and IC are meridians: their longitude is independent of latitude. */
export function calculateMeridianLine(
  raDegrees: number,
  date: Date,
  angle: "MC" | "IC",
  latitudeStep = 3
): AstrocartographyCoordinate[] {
  const gstDegrees = getGreenwichSiderealDegrees(date);
  const mcLongitude = normalizeLongitude(raDegrees - gstDegrees);
  const longitude =
    angle === "MC" ? mcLongitude : normalizeLongitude(mcLongitude + 180);
  const coordinates: AstrocartographyCoordinate[] = [];

  for (let latitude = -85; latitude <= 85; latitude += latitudeStep) {
    coordinates.push([latitude, longitude]);
  }

  return coordinates;
}

export function calculatePlanetaryLines(
  birthTime: AstrocartographyBirthTime
): AstrocartographyLine[] {
  const utcDate = localDateTimeToUtc(
    birthTime.birthDate,
    birthTime.birthTime,
    birthTime.timezone
  );
  const lines: AstrocartographyLine[] = [];

  for (const planet of PLANETS) {
    const { raDegrees, decDegrees } = getGeocentricEquatorialCoordinates(
      planet.body,
      utcDate
    );

    lines.push(
      {
        planet: planet.name,
        type: "AS",
        color: planet.color,
        coordinates: calculateHorizonLine(
          raDegrees,
          decDegrees,
          utcDate,
          "AS"
        ),
      },
      {
        planet: planet.name,
        type: "DS",
        color: planet.color,
        coordinates: calculateHorizonLine(
          raDegrees,
          decDegrees,
          utcDate,
          "DS"
        ),
      },
      {
        planet: planet.name,
        type: "MC",
        color: planet.color,
        coordinates: calculateMeridianLine(raDegrees, utcDate, "MC"),
      },
      {
        planet: planet.name,
        type: "IC",
        color: planet.color,
        coordinates: calculateMeridianLine(raDegrees, utcDate, "IC"),
      }
    );
  }

  return lines;
}
