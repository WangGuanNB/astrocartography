import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/calculate-rising-sign/route";
import { parseBirthCoordinates } from "@/lib/rising-sign-birth-input";
import { getTimezoneOffsetLabel, localDateTimeToUtc } from "@/lib/timezone";

const rome = { latitude: 41.9028, longitude: 12.4964 };
const fixture = { birthDate: "2000-07-01", birthTime: "12:00", birthLocation: "Roma, Italia" };

async function calculate(input: Record<string, unknown>, status = 200) {
  const request = new NextRequest("http://localhost/api/calculate-rising-sign/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const response = await POST(request);
  assert.equal(response.status, status);
  const json = await response.json();
  assert.equal(json.success, status === 200);
  return json;
}

async function main() {
  // These coordinates avoid a live geocoder. The named Tokyo fixture uses
  // the route's built-in city lookup, also without external requests.
  for (const [birthDate, expectedTime, offset, sign, degree] of [
    ["2000-07-01", "2000-07-01T10:00:00.000Z", "UTC+02:00", "Virgo", 23.93],
    ["2000-01-01", "2000-01-01T11:00:00.000Z", "UTC+01:00", "Aries", 14.01],
  ] as const) {
    const { data } = await calculate({ ...fixture, birthDate, ...rome, timezoneMode: "auto" });
    assert.equal(data.birthData.timezone, "Europe/Rome");
    assert.equal(getTimezoneOffsetLabel(birthDate, "12:00", data.birthData.timezone), offset);
    assert.equal(localDateTimeToUtc(birthDate, "12:00", data.birthData.timezone).toISOString(), expectedTime);
    assert.equal(data.ascendant.sign, sign);
    assert.equal(data.ascendant.degree, degree);
    assert.equal(data.houses.length, 12);
    assert.equal(data.otherCities.length, 8);
  }

  const tokyo = await calculate({ ...fixture, birthLocation: "Tokyo", timezoneMode: "auto" });
  assert.equal(tokyo.data.birthData.timezone, "Asia/Tokyo");
  assert.equal(tokyo.data.birthData.latitude, 35.6762);
  assert.equal(getTimezoneOffsetLabel(fixture.birthDate, fixture.birthTime, tokyo.data.birthData.timezone), "UTC+09:00");
  const ny = await calculate({ ...fixture, birthLocation: "New York", timezoneMode: "auto" });
  assert.equal(ny.data.birthData.timezone, "America/New_York");
  assert.equal(getTimezoneOffsetLabel(fixture.birthDate, fixture.birthTime, ny.data.birthData.timezone), "UTC-04:00");

  const autoWithStaleTimezone = await calculate({
    ...fixture, ...rome, timezoneMode: "auto", timezone: "America/New_York",
  });
  assert.equal(autoWithStaleTimezone.data.birthData.timezone, "Europe/Rome");
  const manual = await calculate({ ...fixture, ...rome, timezoneMode: "manual", timezone: "UTC" });
  assert.equal(manual.data.birthData.timezone, "UTC");
  assert.equal(manual.data.ascendant.sign, "Libra");
  assert.equal(manual.data.ascendant.degree, 17.5);
  const legacy = await calculate({ ...fixture, ...rome, timezone: "UTC (London, Dublin)" });
  assert.deepEqual(legacy.data.ascendant, manual.data.ascendant);

  for (const timezone of [undefined, "Not/A_Time_Zone", "CET (Paris, Berlin)"]) {
    const rejected = await calculate({ ...fixture, ...rome, timezone, timezoneMode: "manual" }, 400);
    assert.equal(rejected.errorCode, "TIMEZONE_REQUIRED");
  }
  await calculate({ ...fixture, ...rome }, 400);
  for (const coords of [{ latitude: 91, longitude: 12 }, { latitude: 42, longitude: 181 }, { latitude: 42 }]) {
    const rejected = await calculate({ ...fixture, ...coords, timezoneMode: "auto" }, 400);
    assert.equal(rejected.errorCode, "INVALID_LOCATION");
  }
  assert.deepEqual(parseBirthCoordinates(" 41.9028, 12.4964 "), rome);
  assert.deepEqual(parseBirthCoordinates("0, 0"), { latitude: 0, longitude: 0 });
  for (const invalid of ["", "91, 12", "42, 181", "42,", "Roma", "Infinity, 0"]) {
    assert.equal(parseBirthCoordinates(invalid), null);
  }
  console.log("Passed rising-sign birth time zone and API regressions.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
