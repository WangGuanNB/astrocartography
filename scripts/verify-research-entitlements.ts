import assert from "node:assert/strict";
import {
  applyResearchTimingAccess,
  researchProjectFingerprint,
  resolveResearchAccess,
} from "../src/services/research-entitlements";
import type { ResearchProject } from "../src/types/research-project";
import type { ResearchTimingReport } from "../src/types/research-timing";

function access(
  values: Partial<Parameters<typeof resolveResearchAccess>[0]> = {}
) {
  return resolveResearchAccess({
    hasOneTimePurchase: false,
    hasAnyPlusPurchase: false,
    hasActivePlus: false,
    subscriptionEnabled: false,
    ...values,
  });
}

const free = access();
assert.equal(free.tier, "free");
assert.equal(free.canSaveProject, true);
assert.equal(free.canContinueProject, true);
assert.equal(free.canUse90DayWindow, false);
assert.equal(free.previewEventsPerCity, 2);

const oneTime = access({ hasOneTimePurchase: true });
assert.equal(oneTime.tier, "one_time");
assert.equal(oneTime.canViewFull30DayWindow, true);
assert.equal(oneTime.canUse90DayWindow, false);
assert.equal(oneTime.canExportTiming, true);
assert.equal(oneTime.previewEventsPerCity, null);

const activePlus = access({
  hasAnyPlusPurchase: true,
  hasActivePlus: true,
});
assert.equal(activePlus.tier, "plus_active");
assert.equal(activePlus.canViewFull30DayWindow, true);
assert.equal(activePlus.canUse90DayWindow, true);
assert.equal(activePlus.canViewSavedPlusSnapshots, false);

const expiredPlus = access({ hasAnyPlusPurchase: true });
assert.equal(expiredPlus.tier, "plus_expired");
assert.equal(expiredPlus.canUse90DayWindow, false);
assert.equal(expiredPlus.canViewSavedPlusSnapshots, true);
assert.equal(expiredPlus.fallbackTier, "free");

const expiredPlusWithPurchase = access({
  hasOneTimePurchase: true,
  hasAnyPlusPurchase: true,
});
assert.equal(expiredPlusWithPurchase.tier, "plus_expired");
assert.equal(expiredPlusWithPurchase.fallbackTier, "one_time");
assert.equal(expiredPlusWithPurchase.canViewFull30DayWindow, true);

const report: ResearchTimingReport = {
  method: "relocated_angle_transits_v1",
  windowDays: 30,
  startDate: "2026-10-01",
  endDate: "2026-10-30",
  calculatedAt: "2026-09-15T00:00:00.000Z",
  sampleTime: "12:00 local time",
  maxOrb: 1.5,
  cities: [
    {
      city: { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
      timezone: "Europe/Paris",
      relocatedAngles: { ascendant: 10, midheaven: 20 },
      events: [
        { date: "2026-10-01", planet: "Sun", glyph: "☉", angle: "ASC", aspect: "conjunction", orb: 0.1, tone: "focused" },
        { date: "2026-10-02", planet: "Venus", glyph: "♀", angle: "ASC", aspect: "sextile", orb: 0.2, tone: "supportive" },
        { date: "2026-10-03", planet: "Mars", glyph: "♂", angle: "MC", aspect: "square", orb: 0.3, tone: "challenging" },
      ],
    },
  ],
};

const preview = applyResearchTimingAccess(report, free);
assert.equal(preview.cities[0].events.length, 2);
assert.equal(report.cities[0].events.length, 3, "Preview must not mutate the report");
assert.equal(applyResearchTimingAccess(report, oneTime), report);
assert.equal(applyResearchTimingAccess(report, activePlus), report);

const project: ResearchProject = {
  id: "project-a",
  birthProfile: {
    date: "1981-09-16",
    time: "15:57",
    location: "Hefei, China",
    latitude: 31.86,
    longitude: 117.28,
    timezone: "Asia/Shanghai",
  },
  goal: "overall",
  currentCity: { name: "Hangzhou", country: "China", lat: 30.27, lng: 120.15 },
  candidateCities: [
    { name: "Paris", country: "France", lat: 48.8566, lng: 2.3522 },
  ],
  planDate: "2026-10-01",
  constraints: "Budget",
  createdAt: "2026-09-15T00:00:00.000Z",
  updatedAt: "2026-09-15T00:00:00.000Z",
};
const sameProject = {
  ...project,
  id: "project-b",
  createdAt: "2026-09-16T00:00:00.000Z",
  updatedAt: "2026-09-17T00:00:00.000Z",
};
assert.equal(
  researchProjectFingerprint(project),
  researchProjectFingerprint(sameProject),
  "Record metadata must not change the project fingerprint"
);
assert.notEqual(
  researchProjectFingerprint(project),
  researchProjectFingerprint({ ...project, planDate: "2026-11-01" })
);

console.log("Research entitlement checks passed.");
