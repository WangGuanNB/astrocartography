"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { BirthChartWheel } from "@/components/birth-chart/birth-chart-wheel";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Globe, MapPin, Sparkles } from "lucide-react";

const TIMEZONE_OPTIONS = [
  "UTC (London, Dublin)",
  "EST (New York)",
  "PST (Los Angeles)",
  "CST (Chicago)",
  "MST (Denver)",
  "CET (Paris, Berlin)",
  "CST (Mexico City)",
  "COT (Bogotá)",
  "PET (Lima)",
  "CLT (Santiago)",
  "ART (Buenos Aires)",
  "BRT (São Paulo)",
  "JST (Tokyo)",
  "AEST (Sydney)",
  "IST (Mumbai)",
  "CST (Beijing)",
];

type ToolLabels = {
  form: {
    birthDate: string;
    birthTime: string;
    birthLocation: string;
    timezone: string;
    returnYear: string;
    returnLocation: string;
    returnLocationHint: string;
    submit: string;
  };
  result: {
    title: string;
    momentLabel: string;
    yearLabel: string;
    placeLabel: string;
    systemLine: string;
    ascLabel: string;
    tableTitle: string;
    planet: string;
    sign: string;
    degree: string;
    house: string;
    ctaChart: string;
    bridgeText: string;
    footnote: string;
  };
  errors: {
    required: string;
    location: string;
    generic: string;
  };
};

type Angle = { longitude: number; sign: string; degree: number };

type PlanetRow = {
  name: string;
  glyph: string;
  sign: string;
  degree: number;
  house: number;
  longitude: number;
};

type ApiResponse = {
  success: boolean;
  error?: string;
  data?: {
    birthData: {
      date: string;
      time: string;
      location: string;
      latitude: number;
      longitude: number;
      timezone: string;
    };
    returnYear: number;
    returnLocation: string;
    solarReturnUtc: string;
    system: string;
    ascendant: Angle;
    planets: PlanetRow[];
  };
};

function formatDeg(deg: number) {
  return `${Math.floor(deg)}°${String(Math.round((deg % 1) * 60)).padStart(2, "0")}'`;
}

function formatUtcHuman(iso: string) {
  try {
    const d = new Date(iso);
    return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  } catch {
    return iso;
  }
}

export default function SolarReturnChartCalculatorClient({ tool }: { tool: ToolLabels }) {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthLocation, setBirthLocation] = useState("");
  const [timezone, setTimezone] = useState(TIMEZONE_OPTIONS[0]);
  const [returnYear, setReturnYear] = useState(String(new Date().getFullYear()));
  const [returnLocation, setReturnLocation] = useState("");
  const [useBirthCoords, setUseBirthCoords] = useState(false);
  const [birthCoords, setBirthCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse["data"] | null>(null);

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 17 }, (_, i) => String(y - 7 + i));
  }, []);

  useEffect(() => {
    if (!result) return;
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";
    const timeoutId = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior, block: "start" });
      resultsHeadingRef.current?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(timeoutId);
  }, [result]);

  const canSubmit = Boolean(
    birthDate && birthTime && birthLocation?.trim() && timezone && returnYear && !isLoading && (!useBirthCoords || birthCoords)
  );

  const chartUrl = result
    ? `${locale === "en" ? "" : `/${locale}`}/chart?${new URLSearchParams({
        birthDate: result.birthData.date,
        birthTime: result.birthData.time,
        birthLocation: result.birthData.location,
        timezone: result.birthData.timezone,
        latitude: String(result.birthData.latitude),
        longitude: String(result.birthData.longitude),
      }).toString()}`
    : null;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload: Record<string, unknown> = {
        birthDate,
        birthTime,
        birthLocation,
        timezone,
        returnYear: Number(returnYear),
      };
      if (birthCoords) {
        payload.latitude = birthCoords.latitude;
        payload.longitude = birthCoords.longitude;
      }
      const rl = returnLocation.trim();
      if (rl && rl !== birthLocation.trim()) {
        payload.returnLocation = rl;
      }

      const res = await fetch("/api/calculate-solar-return-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ApiResponse;
      if (!json.success || !json.data) {
        setError(json.error || tool.errors.generic);
        return;
      }
      setResult(json.data);
    } catch {
      setError(tool.errors.generic);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="container max-w-4xl px-4 pb-16">
      <div className="mx-auto max-w-3xl">
        <Card className="shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md relative overflow-visible">
          <CardContent className="p-6 md:p-8 relative overflow-visible">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="sr-birthDate" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                  <Calendar className="size-4 text-purple-400" />
                  {tool.form.birthDate}
                </label>
                <DatePicker
                  id="sr-birthDate"
                  value={birthDate}
                  onChange={setBirthDate}
                  onTimeChange={setBirthTime}
                  timeValue={birthTime}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="sr-birthTime" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                  <Clock className="size-4 text-purple-400" />
                  {tool.form.birthTime}
                </label>
                <Input
                  id="sr-birthTime"
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-1.5 relative z-10">
                <div className="flex items-center justify-between">
                  <label htmlFor="sr-birthLocation" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                    <MapPin className="size-4 text-purple-400" />
                    {tool.form.birthLocation}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUseBirthCoords((v) => !v);
                      setBirthCoords(null);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                  >
                    {useBirthCoords ? "Use city name" : "Use coordinates"}
                  </button>
                </div>
                {useBirthCoords ? (
                  <Input
                    id="sr-birthLocation"
                    type="text"
                    value={birthLocation}
                    onChange={(e) => {
                      const next = e.target.value;
                      setBirthLocation(next);
                      const m = next.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
                      if (m) {
                        const lat = Number(m[1]);
                        const lng = Number(m[2]);
                        if (Number.isFinite(lat) && Number.isFinite(lng)) {
                          setBirthCoords({ latitude: lat, longitude: lng });
                          return;
                        }
                      }
                      setBirthCoords(null);
                    }}
                    className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="e.g. 40.7128, -74.006"
                  />
                ) : (
                  <LocationAutocomplete
                    id="sr-birthLocation"
                    value={birthLocation}
                    onChange={(value) => {
                      setBirthLocation(value);
                      if (!value) setBirthCoords(null);
                    }}
                    onSelect={(r) => setBirthCoords(r.coordinates)}
                    placeholder="City, Country"
                    className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="sr-timezone" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                  <Globe className="size-4 text-purple-400" />
                  {tool.form.timezone}
                </label>
                <select
                  id="sr-timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-md bg-white/10 border border-white/20 text-white focus:border-purple-500 focus:ring-purple-500 focus:outline-none focus:ring-2"
                >
                  {TIMEZONE_OPTIONS.map((tz) => (
                    <option key={tz} value={tz} className="bg-gray-900">
                      {tz}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5 border-t border-white/10 pt-4">
                <label htmlFor="sr-year" className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                  <Calendar className="size-4 text-amber-300" />
                  {tool.form.returnYear}
                </label>
                <select
                  id="sr-year"
                  value={returnYear}
                  onChange={(e) => setReturnYear(e.target.value)}
                  className="w-full h-10 px-3 text-sm rounded-md bg-white/10 border border-white/20 text-white focus:border-purple-500 focus:ring-purple-500 focus:outline-none focus:ring-2"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y} className="bg-gray-900">
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="sr-returnLoc" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                  <MapPin className="size-4 text-pink-400" />
                  {tool.form.returnLocation}
                </label>
                <LocationAutocomplete
                  id="sr-returnLoc"
                  value={returnLocation}
                  onChange={setReturnLocation}
                  onSelect={() => {}}
                  placeholder={tool.form.returnLocationHint}
                  className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                />
                <p className="text-[11px] text-white/45">{tool.form.returnLocationHint}</p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-amber-600 via-purple-600 to-pink-600 hover:from-amber-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    …
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 size-4" />
                    {tool.form.submit}
                  </>
                )}
              </Button>
              {error && <p className="text-sm text-red-300">⚠️ {error}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {result && (
        <div ref={resultsRef} className="mt-10 space-y-6">
          <Card className="shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                <div className="md:w-[420px]">
                  <BirthChartWheel
                    planets={result.planets.map((p) => ({
                      name: p.name,
                      glyph: p.glyph,
                      longitude: p.longitude,
                    }))}
                    ascendantLongitude={result.ascendant.longitude}
                    className="rounded-xl border border-white/10 bg-black/20 p-4"
                  />
                  <p className="mt-3 text-xs text-white/60">
                    {result.system}. {tool.result.systemLine}
                  </p>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <p className="text-sm text-white/85">{tool.result.bridgeText}</p>
                  </div>
                  <a
                    href={chartUrl || "/"}
                    className={cn(
                      "inline-flex w-full items-center justify-center rounded-md bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700",
                      !chartUrl && "pointer-events-none opacity-50"
                    )}
                  >
                    {tool.result.ctaChart}
                  </a>

                  <h2
                    ref={resultsHeadingRef}
                    tabIndex={-1}
                    className="text-lg font-semibold text-white focus:outline-none"
                  >
                    {tool.result.title}
                  </h2>
                  <p className="text-sm text-white/70">
                    {tool.result.yearLabel}: <span className="font-medium text-white">{result.returnYear}</span>
                  </p>
                  <p className="text-sm text-white/70">
                    {tool.result.momentLabel}:{" "}
                    <span className="font-mono text-xs text-amber-100/90">{formatUtcHuman(result.solarReturnUtc)}</span>
                  </p>
                  <p className="text-sm text-white/70">
                    {tool.result.placeLabel}: {result.returnLocation}
                  </p>
                  <p className="text-sm text-white/60">
                    {tool.result.ascLabel}: {result.ascendant.sign} {formatDeg(result.ascendant.degree)}
                  </p>

                  <h3 className="mt-4 text-base font-semibold text-white">{tool.result.tableTitle}</h3>

                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5">
                        <tr className="text-left text-white/80">
                          <th className="px-3 py-2">{tool.result.planet}</th>
                          <th className="px-3 py-2">{tool.result.sign}</th>
                          <th className="px-3 py-2">{tool.result.degree}</th>
                          <th className="px-3 py-2">{tool.result.house}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.planets.map((p) => (
                          <tr key={p.name} className="border-t border-white/10 text-white/85">
                            <td className="px-3 py-2">
                              <span className="mr-2">{p.glyph}</span>
                              {p.name}
                            </td>
                            <td className="px-3 py-2">{p.sign}</td>
                            <td className="px-3 py-2">{formatDeg(p.degree)}</td>
                            <td className="px-3 py-2">{p.house}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-white/50">{tool.result.footnote}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
