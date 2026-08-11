import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api";
const START = "1900-01-01";
const STOP = "2051-01-01";
const SCALE = 10000;

const ASTEROIDS = [
  { key: "ceres", command: "1;", label: "Ceres", glyph: "⚳" },
  { key: "pallas", command: "2;", label: "Pallas", glyph: "⚴" },
  { key: "juno", command: "3;", label: "Juno", glyph: "⚵" },
  { key: "vesta", command: "4;", label: "Vesta", glyph: "⚶" },
] as const;

type Asteroid = (typeof ASTEROIDS)[number];

function unwrapLongitude(previous: number | undefined, longitude: number) {
  if (previous == null) return longitude;
  let value = longitude;
  while (value - previous > 180) value -= 360;
  while (value - previous < -180) value += 360;
  return value;
}

async function fetchLongitudeSeries(asteroid: Asteroid) {
  const params = new URLSearchParams({
    format: "text",
    COMMAND: asteroid.command,
    EPHEM_TYPE: "OBSERVER",
    CENTER: "500@399",
    START_TIME: START,
    STOP_TIME: STOP,
    STEP_SIZE: "1d",
    QUANTITIES: "31",
    CSV_FORMAT: "YES",
  });
  const response = await fetch(`${HORIZONS_API}?${params.toString()}`);
  if (!response.ok) throw new Error(`${asteroid.label}: Horizons returned ${response.status}.`);

  const text = await response.text();
  const block = text.match(/\$\$SOE\s*([\s\S]*?)\s*\$\$EOE/);
  if (!block) throw new Error(`${asteroid.label}: Horizons response did not include an ephemeris block.`);

  const longitude: number[] = [];
  let previous: number | undefined;
  for (const line of block[1].split("\n")) {
    const fields = line.split(",");
    const rawLongitude = fields[3]?.trim();
    const value = rawLongitude ? Number(rawLongitude) : Number.NaN;
    if (!Number.isFinite(value)) continue;
    previous = unwrapLongitude(previous, value);
    longitude.push(Math.round(previous * SCALE));
  }

  if (longitude.length < 55000) {
    throw new Error(`${asteroid.label}: expected a daily series through ${STOP}, received ${longitude.length} rows.`);
  }
  return longitude;
}

async function main() {
  const bodies: Record<string, { label: string; glyph: string; longitude: number[] }> = {};
  for (const asteroid of ASTEROIDS) {
    console.log(`Downloading ${asteroid.label} from NASA/JPL Horizons...`);
    bodies[asteroid.key] = {
      label: asteroid.label,
      glyph: asteroid.glyph,
      longitude: await fetchLongitudeSeries(asteroid),
    };
  }

  const first = Object.values(bodies)[0];
  const output = {
    source: "NASA/JPL Horizons, asteroid targets 1 Ceres, 2 Pallas, 3 Juno, 4 Vesta; observer geocentric center 500@399; QUANTITIES=31",
    generatedAt: new Date().toISOString().slice(0, 10),
    start: `${START}T00:00:00.000Z`,
    stepDays: 1,
    scale: SCALE,
    count: first.longitude.length,
    bodies,
  };
  const destination = resolve(process.cwd(), "src/data/asteroid-ephemeris.json");
  await writeFile(destination, JSON.stringify(output));
  console.log(`Wrote ${destination} with ${output.count} daily positions per asteroid.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
