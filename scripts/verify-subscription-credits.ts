import { getAnnualCreditTranche } from "../src/services/annual-subscription-credits";

function seconds(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

const periodStart = seconds("2024-01-31T12:00:00.000Z");
const periodEnd = seconds("2025-01-31T12:00:00.000Z");

const january = getAnnualCreditTranche(
  periodStart,
  periodEnd,
  seconds("2024-02-01T00:00:00.000Z")
);
assert(january, "first annual credit tranche should exist");
assert(
  january.end === seconds("2024-02-29T12:00:00.000Z"),
  "month-end billing anchors must clamp correctly in leap years"
);

const march = getAnnualCreditTranche(
  periodStart,
  periodEnd,
  seconds("2024-03-15T00:00:00.000Z")
);
assert(march, "current annual credit tranche should be found");
assert(
  march.start === seconds("2024-02-29T12:00:00.000Z") &&
    march.end === seconds("2024-03-31T12:00:00.000Z"),
  "annual credit tranche should follow the clamped monthly anniversary"
);

assert(
  getAnnualCreditTranche(periodStart, periodEnd, periodEnd) === null,
  "no credits should be granted after the paid annual period"
);

console.log("Annual monthly-credit schedule: OK");
