import timezoneLookup from "tz-lookup";

const LEGACY_TIMEZONE_OFFSETS: Record<string, number> = {
  UTC: 0,
  EST: -5,
  PST: -8,
  CST: -6,
  MST: -7,
  CET: 1,
  COT: -5,
  PET: -5,
  CLT: -4,
  ART: -3,
  BRT: -3,
  JST: 9,
  AEST: 10,
  IST: 5.5,
};

const FALLBACK_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Cairo",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

type IntlConstructorWithSupportedValuesOf = typeof Intl & {
  supportedValuesOf?: (key: "timeZone") => string[];
};

function getDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  ) as Record<string, number>;
}

function getOffsetMinutesAtInstant(date: Date, timeZone: string) {
  const parts = getDateParts(date, timeZone);
  const zonedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  return Math.round((zonedAsUtc - date.getTime()) / 60_000);
}

export function isIanaTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function getSupportedTimeZones(): string[] {
  const supportedValuesOf = (Intl as IntlConstructorWithSupportedValuesOf).supportedValuesOf;
  return supportedValuesOf ? supportedValuesOf("timeZone") : FALLBACK_TIMEZONES;
}

export function getTimezoneForCoordinates(latitude: number, longitude: number) {
  return timezoneLookup(latitude, longitude);
}

export function getLegacyTimezoneOffset(timezone: string) {
  for (const [abbreviation, offset] of Object.entries(LEGACY_TIMEZONE_OFFSETS)) {
    if (timezone.toUpperCase().includes(abbreviation)) {
      if (
        abbreviation === "CST" &&
        (timezone.includes("Beijing") || timezone.includes("China"))
      ) {
        return 8;
      }
      return offset;
    }
  }

  return 0;
}

/**
 * Converts a civil birth time to UTC. IANA zones use the offset effective on
 * the birth date, including daylight-saving rules; legacy labels remain valid
 * for old saved links and older calculator pages.
 */
export function localDateTimeToUtc(
  birthDate: string,
  birthTime: string,
  timeZone: string
) {
  const [year, month, day] = birthDate.split(/[-/]/).map(Number);
  const [hours, minutes] = birthTime.split(":").map(Number);
  const localAsUtcMs = Date.UTC(year, month - 1, day, hours, minutes, 0);

  if (!isIanaTimeZone(timeZone)) {
    return new Date(localAsUtcMs - getLegacyTimezoneOffset(timeZone) * 60 * 60 * 1000);
  }

  // Solve the local-time-to-instant conversion iteratively because the UTC
  // offset depends on the instant itself around daylight-saving transitions.
  let utcMs = localAsUtcMs;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offsetMinutes = getOffsetMinutesAtInstant(new Date(utcMs), timeZone);
    const nextUtcMs = localAsUtcMs - offsetMinutes * 60_000;
    if (nextUtcMs === utcMs) {
      break;
    }
    utcMs = nextUtcMs;
  }

  return new Date(utcMs);
}

export function getTimezoneOffsetLabel(
  birthDate: string,
  birthTime: string,
  timeZone: string
) {
  const utcDate = localDateTimeToUtc(birthDate, birthTime, timeZone);
  const offsetMinutes = isIanaTimeZone(timeZone)
    ? getOffsetMinutesAtInstant(utcDate, timeZone)
    : getLegacyTimezoneOffset(timeZone) * 60;
  const absolute = Math.abs(offsetMinutes);
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = String(Math.floor(absolute / 60)).padStart(2, "0");
  const minutes = String(absolute % 60).padStart(2, "0");

  return `UTC${sign}${hours}:${minutes}`;
}
