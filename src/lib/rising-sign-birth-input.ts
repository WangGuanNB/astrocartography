import { getTimezoneForCoordinates, isIanaTimeZone } from "@/lib/timezone";

export type BirthCoordinates = { latitude: number; longitude: number };

export function validateBirthCoordinates(
  latitude: unknown,
  longitude: unknown,
): BirthCoordinates | null {
  if (
    typeof latitude !== "number" || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
    typeof longitude !== "number" || !Number.isFinite(longitude) || Math.abs(longitude) > 180
  ) return null;
  return { latitude, longitude };
}

export function parseBirthCoordinates(value: string): BirthCoordinates | null {
  const pair = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  return pair ? validateBirthCoordinates(Number(pair[1]), Number(pair[2])) : null;
}

export function detectBirthTimezone(coordinates: BirthCoordinates): string | null {
  try {
    const timezone = getTimezoneForCoordinates(coordinates.latitude, coordinates.longitude);
    return isIanaTimeZone(timezone) ? timezone : null;
  } catch {
    return null;
  }
}
