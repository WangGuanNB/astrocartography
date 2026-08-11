import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getBigFourAsteroidPlacements } = require("../src/lib/asteroid-ephemeris.ts") as typeof import("../src/lib/asteroid-ephemeris");

type Asteroid = "Ceres" | "Pallas" | "Juno" | "Vesta";

const SAMPLES: Array<{ asteroid: Asteroid; command: string; at: string }> = [
  { asteroid: "Ceres", command: "1;", at: "1901-06-15T12:00:00Z" },
  { asteroid: "Pallas", command: "2;", at: "1922-10-03T04:30:00Z" },
  { asteroid: "Juno", command: "3;", at: "1939-01-27T18:45:00Z" },
  { asteroid: "Vesta", command: "4;", at: "1957-08-09T09:15:00Z" },
  { asteroid: "Ceres", command: "1;", at: "1968-02-29T23:00:00Z" },
  { asteroid: "Pallas", command: "2;", at: "1977-11-16T14:20:00Z" },
  { asteroid: "Juno", command: "3;", at: "1989-05-11T06:00:00Z" },
  { asteroid: "Vesta", command: "4;", at: "2001-09-30T16:30:00Z" },
  { asteroid: "Ceres", command: "1;", at: "2012-04-04T02:00:00Z" },
  { asteroid: "Pallas", command: "2;", at: "2020-12-12T12:12:00Z" },
  { asteroid: "Juno", command: "3;", at: "2036-07-22T20:00:00Z" },
  { asteroid: "Vesta", command: "4;", at: "2045-03-17T05:30:00Z" },
];

const MAX_ALLOWED_DIFFERENCE_DEGREES = 0.01;

function circularDifference(first: number, second: number) {
  return Math.abs((((first - second + 180) % 360) + 360) % 360 - 180);
}

async function getJplLongitude(command: string, at: Date) {
  const start = at.toISOString().slice(0, 16).replace("T", " ");
  const stop = new Date(at.getTime() + 60_000).toISOString().slice(0, 16).replace("T", " ");
  const params = new URLSearchParams({
    format: "text",
    COMMAND: command,
    EPHEM_TYPE: "OBSERVER",
    CENTER: "500@399",
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: "1m",
    QUANTITIES: "31",
    CSV_FORMAT: "YES",
  });
  const response = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${params}`);
  if (!response.ok) throw new Error(`JPL Horizons request failed with ${response.status}.`);

  const match = (await response.text()).match(/\$\$SOE\s*\n([^\n]+)/);
  if (!match) throw new Error("JPL Horizons response did not contain an ephemeris row.");
  const longitude = Number(match[1].split(",")[3]);
  if (!Number.isFinite(longitude)) throw new Error("JPL Horizons longitude could not be parsed.");
  return longitude;
}

async function main() {
  let maximumDifference = 0;

  for (const sample of SAMPLES) {
    const at = new Date(sample.at);
    const local = getBigFourAsteroidPlacements(at).find((placement) => placement.label === sample.asteroid);
    if (!local) throw new Error(`Static ephemeris is missing ${sample.asteroid}.`);

    const jplLongitude = await getJplLongitude(sample.command, at);
    const difference = circularDifference(local.longitude, jplLongitude);
    maximumDifference = Math.max(maximumDifference, difference);
    console.log(`${sample.asteroid} ${sample.at}: ${difference.toFixed(6)} degrees`);

    if (difference > MAX_ALLOWED_DIFFERENCE_DEGREES) {
      throw new Error(`${sample.asteroid} exceeds ${MAX_ALLOWED_DIFFERENCE_DEGREES} degrees at ${sample.at}.`);
    }
  }

  console.log(`Verified ${SAMPLES.length} JPL Horizons samples. Max difference: ${maximumDifference.toFixed(6)} degrees.`);
}

void main();
