import * as Astronomy from "astronomy-engine";
import {
  SIGNS,
  degreeInSign,
  getGeocentricEclipticLongitude,
  signIndexFromLongitude,
} from "@/lib/natal-chart-core";

export type ZodiacElement = "Fire" | "Earth" | "Air" | "Water";
export type ZodiacModality = "Cardinal" | "Fixed" | "Mutable";

export type SunSignName = (typeof SIGNS)[number];

export type SunSignMetadata = {
  element: ZodiacElement;
  modality: ZodiacModality;
  ruler: string;
  glyph: string;
  dateRange: string;
};

export const SUN_SIGN_METADATA: Record<SunSignName, SunSignMetadata> = {
  Aries: { element: "Fire", modality: "Cardinal", ruler: "Mars", glyph: "♈", dateRange: "Mar 21 – Apr 19" },
  Taurus: { element: "Earth", modality: "Fixed", ruler: "Venus", glyph: "♉", dateRange: "Apr 20 – May 20" },
  Gemini: { element: "Air", modality: "Mutable", ruler: "Mercury", glyph: "♊", dateRange: "May 21 – Jun 20" },
  Cancer: { element: "Water", modality: "Cardinal", ruler: "Moon", glyph: "♋", dateRange: "Jun 21 – Jul 22" },
  Leo: { element: "Fire", modality: "Fixed", ruler: "Sun", glyph: "♌", dateRange: "Jul 23 – Aug 22" },
  Virgo: { element: "Earth", modality: "Mutable", ruler: "Mercury", glyph: "♍", dateRange: "Aug 23 – Sep 22" },
  Libra: { element: "Air", modality: "Cardinal", ruler: "Venus", glyph: "♎", dateRange: "Sep 23 – Oct 22" },
  Scorpio: { element: "Water", modality: "Fixed", ruler: "Pluto", glyph: "♏", dateRange: "Oct 23 – Nov 21" },
  Sagittarius: { element: "Fire", modality: "Mutable", ruler: "Jupiter", glyph: "♐", dateRange: "Nov 22 – Dec 21" },
  Capricorn: { element: "Earth", modality: "Cardinal", ruler: "Saturn", glyph: "♑", dateRange: "Dec 22 – Jan 19" },
  Aquarius: { element: "Air", modality: "Fixed", ruler: "Uranus", glyph: "♒", dateRange: "Jan 20 – Feb 18" },
  Pisces: { element: "Water", modality: "Mutable", ruler: "Neptune", glyph: "♓", dateRange: "Feb 19 – Mar 20" },
};

const CUSP_THRESHOLD_DEG = 1;

export type SunSignResult = {
  sign: SunSignName;
  signIndex: number;
  degree: number;
  longitude: number;
  element: ZodiacElement;
  modality: ZodiacModality;
  ruler: string;
  glyph: string;
  dateRange: string;
  nearCusp: boolean;
  adjacentSign: SunSignName | null;
  system: "tropical";
};

/** Tropical sun sign from birth date using UTC noon (standard date-only approach). */
export function computeSunSignFromDate(birthDate: string): SunSignResult {
  const utcNoon = new Date(`${birthDate}T12:00:00.000Z`);
  if (Number.isNaN(utcNoon.getTime())) {
    throw new Error("Invalid birth date format. Use YYYY-MM-DD.");
  }

  const time = Astronomy.MakeTime(utcNoon);
  const longitude = getGeocentricEclipticLongitude(Astronomy.Body.Sun, time);
  const signIndex = signIndexFromLongitude(longitude);
  const degree = degreeInSign(longitude);
  const sign = SIGNS[signIndex];
  const meta = SUN_SIGN_METADATA[sign];

  const nearStart = degree < CUSP_THRESHOLD_DEG;
  const nearEnd = degree > 30 - CUSP_THRESHOLD_DEG;
  const nearCusp = nearStart || nearEnd;
  const adjacentSign = nearStart
    ? SIGNS[(signIndex + 11) % 12]
    : nearEnd
      ? SIGNS[(signIndex + 1) % 12]
      : null;

  return {
    sign,
    signIndex,
    degree: Math.round(degree * 100) / 100,
    longitude: Math.round(longitude * 100) / 100,
    element: meta.element,
    modality: meta.modality,
    ruler: meta.ruler,
    glyph: meta.glyph,
    dateRange: meta.dateRange,
    nearCusp,
    adjacentSign,
    system: "tropical",
  };
}
