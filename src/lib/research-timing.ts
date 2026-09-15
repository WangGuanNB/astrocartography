import {
  calculateAscendantLongitude,
  calculateMidheavenLongitude,
  computePlanetaryPositionsAt,
  localBirthTimeToUtc,
  normalizeDegrees,
} from "@/lib/natal-chart-core";
import {
  getTimezoneForCoordinates,
  localDateTimeToUtc,
} from "@/lib/timezone";
import type { ResearchProject } from "@/types/research-project";
import type {
  ResearchCityTiming,
  ResearchTimingAspect,
  ResearchTimingEvent,
  ResearchTimingReport,
  ResearchTimingTone,
  ResearchTimingWindow,
} from "@/types/research-timing";

const TRACKED_PLANETS = new Set([
  "Sun",
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
]);

const ASPECTS: Array<{
  name: ResearchTimingAspect;
  angle: number;
  tone: ResearchTimingTone;
}> = [
  { name: "conjunction", angle: 0, tone: "focused" },
  { name: "sextile", angle: 60, tone: "supportive" },
  { name: "square", angle: 90, tone: "challenging" },
  { name: "trine", angle: 120, tone: "supportive" },
  { name: "opposition", angle: 180, tone: "challenging" },
];

const MAX_ORB = 1.5 as const;
const SEGMENT_DAYS = 30;
const MAX_EVENTS_PER_SEGMENT = 8;

type Sample = ResearchTimingEvent & { signature: string };

function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function angularSeparation(left: number, right: number) {
  let difference = Math.abs(normalizeDegrees(left) - normalizeDegrees(right));
  if (difference > 180) difference = 360 - difference;
  return difference;
}

function aspectOrb(longitude: number, target: number, aspectAngle: number) {
  return Math.abs(angularSeparation(longitude, target) - aspectAngle);
}

function buildCityTiming(
  project: ResearchProject,
  city: ResearchProject["candidateCities"][number],
  windowDays: ResearchTimingWindow
): ResearchCityTiming {
  const birthUtc = localBirthTimeToUtc(
    project.birthProfile.date,
    project.birthProfile.time,
    project.birthProfile.timezone
  );
  const ascendant = calculateAscendantLongitude(birthUtc, city.lat, city.lng);
  const midheaven = calculateMidheavenLongitude(birthUtc, city.lng);
  const timezone = getTimezoneForCoordinates(city.lat, city.lng);
  const samplesBySignature = new Map<string, Sample[]>();

  for (let offset = 0; offset < windowDays; offset += 1) {
    const date = addDays(project.planDate, offset);
    const transitUtc = localDateTimeToUtc(date, "12:00", timezone);
    const planets = computePlanetaryPositionsAt(transitUtc).filter((planet) =>
      TRACKED_PLANETS.has(planet.name)
    );

    for (const planet of planets) {
      for (const [angle, target] of [
        ["ASC", ascendant],
        ["MC", midheaven],
      ] as const) {
        for (const aspect of ASPECTS) {
          const signature = `${planet.name}:${angle}:${aspect.name}`;
          const sample: Sample = {
            signature,
            date,
            planet: planet.name,
            glyph: planet.glyph,
            angle,
            aspect: aspect.name,
            orb: Math.round(aspectOrb(planet.longitude, target, aspect.angle) * 100) / 100,
            tone: aspect.tone,
          };
          const existing = samplesBySignature.get(signature) ?? [];
          existing.push(sample);
          samplesBySignature.set(signature, existing);
        }
      }
    }
  }

  const segmentCount = Math.ceil(windowDays / SEGMENT_DAYS);
  const exactWindowsBySegment = Array.from(
    { length: segmentCount },
    () => [] as Sample[]
  );

  for (const samples of samplesBySignature.values()) {
    for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex += 1) {
      const startIndex = segmentIndex * SEGMENT_DAYS;
      const endIndex = Math.min(startIndex + SEGMENT_DAYS, samples.length);
      let closestInWindow: Sample | null = null;
      let index = startIndex;

      // If a transit window started in the previous segment, it was already
      // represented there. Skip its continuation so one transit is not shown
      // as two events around a 30-day boundary.
      if (
        startIndex > 0 &&
        samples[startIndex - 1]?.orb <= MAX_ORB &&
        samples[startIndex]?.orb <= MAX_ORB
      ) {
        while (index < endIndex && samples[index].orb <= MAX_ORB) index += 1;
      }

      for (; index < endIndex; index += 1) {
        const current = samples[index];
        if (current.orb <= MAX_ORB) {
          if (!closestInWindow || current.orb < closestInWindow.orb) {
            closestInWindow = current;
          }
          continue;
        }

        if (closestInWindow) {
          exactWindowsBySegment[segmentIndex].push(closestInWindow);
          closestInWindow = null;
        }
      }

      if (closestInWindow) {
        exactWindowsBySegment[segmentIndex].push(closestInWindow);
      }
    }
  }

  const selected = exactWindowsBySegment
    .map((events) =>
      events
      .sort(
        (left, right) =>
          left.orb - right.orb || left.date.localeCompare(right.date)
      )
      .slice(0, MAX_EVENTS_PER_SEGMENT)
    )
    .flat()
    .sort((left, right) => left.date.localeCompare(right.date))
    .map(({ signature: _signature, ...event }) => ({
      ...event,
      orb: Math.round(event.orb * 100) / 100,
    }));

  return {
    city,
    timezone,
    relocatedAngles: {
      ascendant: Math.round(ascendant * 100) / 100,
      midheaven: Math.round(midheaven * 100) / 100,
    },
    events: selected,
  };
}

export function calculateResearchTiming(
  project: ResearchProject,
  windowDays: ResearchTimingWindow,
  calculatedAt = new Date()
): ResearchTimingReport {
  if (windowDays !== 30 && windowDays !== 90) {
    throw new Error("Timing window must be 30 or 90 days");
  }

  return {
    method: "relocated_angle_transits_v1",
    windowDays,
    startDate: project.planDate,
    endDate: addDays(project.planDate, windowDays - 1),
    calculatedAt: calculatedAt.toISOString(),
    sampleTime: "12:00 local time",
    maxOrb: MAX_ORB,
    cities: project.candidateCities.map((city) =>
      buildCityTiming(project, city, windowDays)
    ),
  };
}
