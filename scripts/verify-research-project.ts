import assert from "node:assert/strict";
import {
  researchProjectInputSchema,
  serializeResearchProjectInput,
  toResearchProject,
} from "../src/lib/research-project";

const input = {
  birthProfile: {
    date: "1982-10-04",
    time: "22:33",
    location: "Alster, Sweden",
    latitude: 59.4,
    longitude: 13.61,
    timezone: "Europe/Stockholm",
  },
  goal: "career" as const,
  currentCity: {
    name: "Stockholm",
    country: "Sweden",
    lat: 59.3293,
    lng: 18.0686,
  },
  candidateCities: [
    { name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278 },
    { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  ],
  planDate: "2099-03-01",
  constraints: "Work visa and housing budget",
};

const parsed = researchProjectInputSchema.parse(input);
const stored = serializeResearchProjectInput(parsed);
const now = new Date("2026-09-15T00:00:00.000Z");
const project = toResearchProject({
  id: "project-test",
  ...stored,
  created_at: now,
  updated_at: now,
});

assert.equal(project.goal, "career");
assert.equal(project.candidateCities.length, 2);
assert.equal(project.birthProfile.timezone, "Europe/Stockholm");
assert.equal(project.constraints, input.constraints);

assert.equal(
  researchProjectInputSchema.safeParse({
    ...input,
    candidateCities: [
      ...input.candidateCities,
      { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
      { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
    ],
  }).success,
  false,
  "V1 must reject more than three candidate cities"
);

assert.equal(
  researchProjectInputSchema.safeParse({
    ...input,
    planDate: "2005-06-15",
  }).success,
  false,
  "Past planning dates must be rejected"
);

assert.equal(
  researchProjectInputSchema.safeParse({
    ...input,
    birthProfile: { ...input.birthProfile, time: "28:99" },
  }).success,
  false,
  "Invalid clock times must be rejected"
);

assert.equal(
  researchProjectInputSchema.safeParse({
    ...input,
    candidateCities: [input.candidateCities[0], input.candidateCities[0]],
  }).success,
  false,
  "Duplicate candidate cities must be rejected"
);

assert.equal(
  researchProjectInputSchema.safeParse({
    ...input,
    currentCity: { ...input.currentCity, lat: 100 },
  }).success,
  false,
  "Invalid coordinates must be rejected"
);

console.log("Research project validation checks passed.");
