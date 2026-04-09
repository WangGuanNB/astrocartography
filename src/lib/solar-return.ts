import * as Astronomy from "astronomy-engine";
import {
  getGeocentricEclipticLongitude,
  normalizeDegrees,
} from "@/lib/natal-chart-core";

function sunLongitudeAtUtc(utc: Date): number {
  const t = Astronomy.MakeTime(utc);
  return getGeocentricEclipticLongitude(Astronomy.Body.Sun, t);
}

/** Smallest signed difference from natal to current sun longitude, radians in degrees roughly in (-180, 180]. */
export function signedSunDiffDegrees(sunLon: number, natalSunLon: number): number {
  let d = normalizeDegrees(sunLon) - normalizeDegrees(natalSunLon);
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

function bisectSolarReturn(loMs: number, hiMs: number, natalSunLon: number): Date {
  let lo = loMs;
  let hi = hiMs;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const midDate = new Date(mid);
    const diffMid = signedSunDiffDegrees(sunLongitudeAtUtc(midDate), natalSunLon);
    if (Math.abs(diffMid) < 1e-7) {
      return midDate;
    }
    const diffLo = signedSunDiffDegrees(sunLongitudeAtUtc(new Date(lo)), natalSunLon);
    if (diffLo <= 0 && diffMid < 0) {
      lo = mid;
    } else {
      hi = mid;
    }
  }
  return new Date((lo + hi) / 2);
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/**
 * Tropical solar return: UTC instant when the Sun reaches the same ecliptic longitude as at birth.
 * Uses a search window around the birthday in `year` (calendar month/day from birth, Feb 29 → Feb 28 in non-leap years).
 */
export function findSolarReturnUtc(
  natalSunLon: number,
  year: number,
  birthMonth: number,
  birthDay: number
): Date {
  let day = birthDay;
  if (birthMonth === 2 && birthDay === 29 && !isLeapYear(year)) {
    day = 28;
  }

  const startMs = Date.UTC(year, birthMonth - 1, day - 10, 0, 0, 0);
  const endMs = Date.UTC(year, birthMonth - 1, day + 10, 23, 59, 59);

  const HOUR_MS = 3600000;
  let prevT = startMs;
  let prevDiff = signedSunDiffDegrees(sunLongitudeAtUtc(new Date(startMs)), natalSunLon);

  for (let t = startMs + HOUR_MS; t <= endMs; t += HOUR_MS) {
    const currDiff = signedSunDiffDegrees(sunLongitudeAtUtc(new Date(t)), natalSunLon);
    if (prevDiff <= 0 && currDiff >= 0) {
      return bisectSolarReturn(prevT, t, natalSunLon);
    }
    prevT = t;
    prevDiff = currDiff;
  }

  // Fallback: best match in 15-minute steps (should be rare)
  let best = new Date(startMs);
  let bestAbs = Infinity;
  for (let t = startMs; t <= endMs; t += 15 * 60 * 1000) {
    const d = new Date(t);
    const a = Math.abs(signedSunDiffDegrees(sunLongitudeAtUtc(d), natalSunLon));
    if (a < bestAbs) {
      bestAbs = a;
      best = d;
    }
  }
  return best;
}
