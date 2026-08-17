import { computePlanetaryPositionsAt } from "../src/lib/natal-chart-core";

const utc = new Date("2026-08-17T12:00:00.000Z");
const rows = computePlanetaryPositionsAt(utc);
console.log("UTC", utc.toISOString());
for (const p of rows) {
  console.log(
    p.name.padEnd(8),
    p.sign.padEnd(12),
    p.degree.toFixed(2).padStart(6),
    p.retrograde ? "Rx" : "D ",
    p.speedDegPerDay.toFixed(3)
  );
}

const sun = rows.find((p) => p.name === "Sun");
const moon = rows.find((p) => p.name === "Moon");
if (!sun || sun.sign !== "Leo") {
  console.error("FAIL: expected Sun in Leo on 2026-08-17");
  process.exit(1);
}
if (!moon || moon.sign !== "Libra") {
  console.error("FAIL: expected Moon in Libra around noon UTC 2026-08-17, got", moon?.sign);
  process.exit(1);
}
if (sun.retrograde || moon.retrograde) {
  console.error("FAIL: Sun/Moon must not be retrograde");
  process.exit(1);
}
console.log("OK");
