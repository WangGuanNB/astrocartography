import * as Astronomy from "astronomy-engine";
import {
  calculateHorizonLine,
  calculateMeridianLine,
  calculatePlanetaryLines,
  getGeocentricEquatorialCoordinates,
  normalizeLongitude,
} from "../src/lib/astrocartography-lines";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function angularDistance(a: number, b: number): number {
  return Math.abs(normalizeLongitude(a - b));
}

const utc = new Date("2000-01-01T12:00:00.000Z");
const sun = getGeocentricEquatorialCoordinates(Astronomy.Body.Sun, utc);
const mc = calculateMeridianLine(sun.raDegrees, utc, "MC");
const ic = calculateMeridianLine(sun.raDegrees, utc, "IC");

assert(mc.length > 10, "MC line should contain a latitude series");
assert(
  mc.every(([, longitude]) => angularDistance(longitude, mc[0][1]) < 1e-10),
  "MC must be a constant-longitude meridian"
);
assert(
  ic.every(([, longitude]) => angularDistance(longitude, ic[0][1]) < 1e-10),
  "IC must be a constant-longitude meridian"
);
assert(
  Math.abs(angularDistance(mc[0][1], ic[0][1]) - 180) < 1e-10,
  "IC must be exactly opposite MC"
);

const as = calculateHorizonLine(
  sun.raDegrees,
  sun.decDegrees,
  utc,
  "AS"
);
const ds = calculateHorizonLine(
  sun.raDegrees,
  sun.decDegrees,
  utc,
  "DS"
);
const asAt31 = as.find(([latitude]) => latitude === 32);
const dsAt31 = ds.find(([latitude]) => latitude === 32);
assert(asAt31 && dsAt31, "Sun AS/DS should cross latitude 32°");
assert(
  Math.abs(angularDistance(asAt31[1], dsAt31[1]) - 180) > 1,
  "DS cannot be derived by adding 180° to AS"
);

const allLines = calculatePlanetaryLines({
  birthDate: "1982-10-04",
  birthTime: "22:33",
  timezone: "Europe/Stockholm",
});
assert(allLines.length === 40, "ten planets should produce four angular lines each");
assert(
  allLines.every((line) => line.coordinates.length > 0),
  "every generated line should contain coordinates"
);

console.log("Sun MC at J2000:", mc[0][1].toFixed(6));
console.log("Hanna case line count:", allLines.length);
console.log("OK");
