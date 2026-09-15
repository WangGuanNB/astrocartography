import assert from "node:assert/strict";
import { calculateResearchTiming } from "../src/lib/research-timing";
import type { ResearchProject } from "../src/types/research-project";

const project: ResearchProject = {
  id: "timing-test",
  birthProfile: {
    date: "1982-10-04",
    time: "22:33",
    location: "Alster, Sweden",
    latitude: 59.4,
    longitude: 13.61,
    timezone: "Europe/Stockholm",
  },
  goal: "overall",
  currentCity: {
    name: "Stockholm",
    country: "Sweden",
    lat: 59.3293,
    lng: 18.0686,
  },
  candidateCities: [
    { name: "London", country: "United Kingdom", lat: 51.5074, lng: -0.1278 },
    { name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503 },
    { name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093 },
  ],
  planDate: "2027-03-01",
  constraints: "Work visa and housing budget",
  createdAt: "2026-09-15T00:00:00.000Z",
  updatedAt: "2026-09-15T00:00:00.000Z",
};

const calculatedAt = new Date("2026-09-15T01:02:03.000Z");
const report30 = calculateResearchTiming(project, 30, calculatedAt);
const report90 = calculateResearchTiming(project, 90, calculatedAt);

assert.equal(report30.method, "relocated_angle_transits_v1");
assert.equal(report30.startDate, "2027-03-01");
assert.equal(report30.endDate, "2027-03-30");
assert.equal(report90.endDate, "2027-05-29");
assert.equal(report30.calculatedAt, calculatedAt.toISOString());
assert.equal(report30.cities.length, 3);
assert.equal(report30.cities[0].timezone, "Europe/London");
assert.equal(report30.cities[1].timezone, "Asia/Tokyo");
assert.equal(report30.cities[2].timezone, "Australia/Sydney");

const ascendants = new Set(
  report30.cities.map((city) => city.relocatedAngles.ascendant)
);
assert.equal(
  ascendants.size,
  3,
  "Candidate cities must have distinct relocated angles"
);

for (const city of report90.cities) {
  assert.ok(city.events.length <= 24, "Each 30-day segment should return at most 8 events");
  for (const event of city.events) {
    assert.ok(event.date >= report90.startDate && event.date <= report90.endDate);
    assert.ok(event.orb <= report90.maxOrb);
    assert.notEqual(event.planet, "Moon", "Moon must be excluded from daily windows");
  }
}

for (let cityIndex = 0; cityIndex < report30.cities.length; cityIndex += 1) {
  const events30 = report30.cities[cityIndex].events;
  const events90 = report90.cities[cityIndex].events;
  const keys90 = new Set(
    events90.map(
      (event) =>
        `${event.date}:${event.planet}:${event.angle}:${event.aspect}`
    )
  );

  for (const event of events30) {
    const key = `${event.date}:${event.planet}:${event.angle}:${event.aspect}`;
    assert.ok(
      keys90.has(key),
      "The 90-day view must preserve every selected event from the first 30 days"
    );
  }

  const datesBySignature = new Map<string, string[]>();
  for (const event of events90) {
    const signature = `${event.planet}:${event.angle}:${event.aspect}`;
    const dates = datesBySignature.get(signature) ?? [];
    dates.push(event.date);
    datesBySignature.set(signature, dates);
  }

  for (const dates of datesBySignature.values()) {
    dates.sort();
    for (let index = 1; index < dates.length; index += 1) {
      const previous = Date.parse(`${dates[index - 1]}T12:00:00.000Z`);
      const current = Date.parse(`${dates[index]}T12:00:00.000Z`);
      assert.ok(
        current - previous > 86_400_000,
        "One continuous transit window must not produce adjacent duplicate events"
      );
    }
  }
}

assert.throws(
  () => calculateResearchTiming(project, 60 as 30),
  /30 or 90/,
  "Unsupported windows must be rejected"
);

console.log("Research timing checks passed.");
