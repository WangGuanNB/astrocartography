import { z } from "zod";
import type {
  ResearchCity,
  ResearchProject,
  ResearchProjectInput,
} from "@/types/research-project";
import { RESEARCH_GOALS } from "@/types/research-project";
import { getTimezoneForCoordinates } from "@/lib/timezone";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date");

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/)
  .refine((value) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
  }, "Invalid time");

const citySchema = z.object({
  name: z.string().trim().min(1).max(120),
  country: z.string().trim().max(120),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  displayName: z.string().trim().min(1).max(300).optional(),
});

export function getTodayIsoAtCoordinates(lat: number, lng: number) {
  const timezone = getTimezoneForCoordinates(lat, lng);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function isPlanDateCurrentOrFuture(
  planDate: string,
  currentCity: ResearchCity
) {
  return planDate >= getTodayIsoAtCoordinates(currentCity.lat, currentCity.lng);
}

export const researchProjectInputSchema = z.object({
  birthProfile: z.object({
    date: isoDateSchema,
    time: timeSchema,
    location: z.string().trim().min(1).max(240),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    timezone: z.string().trim().min(1).max(100),
  }),
  goal: z.enum(RESEARCH_GOALS),
  currentCity: citySchema,
  candidateCities: z.array(citySchema).min(2).max(3),
  planDate: isoDateSchema,
  constraints: z.string().trim().max(1500).default(""),
}).superRefine((input, context) => {
  const cityKeys = input.candidateCities.map(
    (city) => `${city.lat.toFixed(5)}:${city.lng.toFixed(5)}`
  );
  if (new Set(cityKeys).size !== cityKeys.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["candidateCities"],
      message: "Candidate cities must be unique",
    });
  }

  try {
    if (!isPlanDateCurrentOrFuture(input.planDate, input.currentCity)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["planDate"],
        message: "Plan date must be today or later",
      });
    }
  } catch {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["currentCity"],
      message: "Unable to resolve the current city time zone",
    });
  }
});

type ResearchProjectRow = {
  id: string;
  birth_date: string;
  birth_time: string;
  birth_location: string;
  birth_latitude: number;
  birth_longitude: number;
  birth_timezone: string;
  goal: string;
  current_city_json: string;
  candidate_cities_json: string;
  plan_date: string;
  constraints: string;
  created_at: Date;
  updated_at: Date;
};

function parseCityJson(value: string): ResearchCity {
  return citySchema.parse(JSON.parse(value));
}

function parseCitiesJson(value: string): ResearchCity[] {
  return z.array(citySchema).min(2).max(3).parse(JSON.parse(value));
}

export function serializeResearchProjectInput(input: ResearchProjectInput) {
  return {
    birth_date: input.birthProfile.date,
    birth_time: input.birthProfile.time,
    birth_location: input.birthProfile.location,
    birth_latitude: input.birthProfile.latitude,
    birth_longitude: input.birthProfile.longitude,
    birth_timezone: input.birthProfile.timezone,
    goal: input.goal,
    current_city_json: JSON.stringify(input.currentCity),
    candidate_cities_json: JSON.stringify(input.candidateCities),
    plan_date: input.planDate,
    constraints: input.constraints,
  };
}

export function toResearchProject(row: ResearchProjectRow): ResearchProject {
  return {
    id: row.id,
    birthProfile: {
      date: row.birth_date,
      time: row.birth_time,
      location: row.birth_location,
      latitude: row.birth_latitude,
      longitude: row.birth_longitude,
      timezone: row.birth_timezone,
    },
    goal: z.enum(RESEARCH_GOALS).parse(row.goal),
    currentCity: parseCityJson(row.current_city_json),
    candidateCities: parseCitiesJson(row.candidate_cities_json),
    planDate: row.plan_date,
    constraints: row.constraints,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
