import type { ResearchCity } from "@/types/research-project";

export const RESEARCH_TIMING_WINDOWS = [30, 90] as const;
export type ResearchTimingWindow = (typeof RESEARCH_TIMING_WINDOWS)[number];

export type ResearchTimingAspect =
  | "conjunction"
  | "sextile"
  | "square"
  | "trine"
  | "opposition";

export type ResearchTimingTone = "supportive" | "challenging" | "focused";
export type ResearchTimingAngle = "ASC" | "MC";

export type ResearchTimingEvent = {
  date: string;
  planet: string;
  glyph: string;
  angle: ResearchTimingAngle;
  aspect: ResearchTimingAspect;
  orb: number;
  tone: ResearchTimingTone;
};

export type ResearchCityTiming = {
  city: ResearchCity;
  timezone: string;
  relocatedAngles: {
    ascendant: number;
    midheaven: number;
  };
  events: ResearchTimingEvent[];
};

export type ResearchTimingReport = {
  method: "relocated_angle_transits_v1";
  windowDays: ResearchTimingWindow;
  startDate: string;
  endDate: string;
  calculatedAt: string;
  sampleTime: "12:00 local time";
  maxOrb: 1.5;
  cities: ResearchCityTiming[];
};
