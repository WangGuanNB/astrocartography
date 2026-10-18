"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
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
    relocateLocation: string;
    submit: string;
    privacyNote?: string;
  };
  result: {
    title: string;
    relocateLabel: string;
    natalAscTitle: string;
    relocatedAscTitle: string;
    tableTitle: string;
    planet: string;
    sign: string;
    degree: string;
    natalHouse: string;
    relocatedHouse: string;
    ctaChart: string;
    calculateAnother?: string;
    copySummary?: string;
    copySuccess?: string;
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
  natalHouse: number;
  relocatedHouse: number;
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
    relocateData: { location: string; latitude: number; longitude: number };
    system: string;
    natalAscendant: Angle;
    relocatedAscendant: Angle;
    planets: PlanetRow[];
  };
};

function formatDeg(deg: number) {
  return `${Math.floor(deg)}°${String(Math.round((deg % 1) * 60)).padStart(2, "0")}'`;
}

function buildRelocationSummary(
  data: NonNullable<ApiResponse["data"]>,
  labels: ToolLabels["result"]
) {
  const lines = [
    `${labels.title}`,
    `${labels.relocateLabel}: ${data.relocateData.location}`,
    `${labels.natalAscTitle}: ${data.natalAscendant.sign} ${formatDeg(data.natalAscendant.degree)}`,
    `${labels.relocatedAscTitle}: ${data.relocatedAscendant.sign} ${formatDeg(data.relocatedAscendant.degree)}`,
    "",
    labels.tableTitle,
    ...data.planets.map(
      (p) =>
        `${p.name}: ${p.sign} ${formatDeg(p.degree)} | ${labels.natalHouse} ${p.natalHouse} → ${labels.relocatedHouse} ${p.relocatedHouse}`
    ),
  ];
  return lines.join("\n");
}

export default function RelocationChartCalculatorClient({ tool }: { tool: ToolLabels }) {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthLocation, setBirthLocation] = useState("");
  const [relocateLocation, setRelocateLocation] = useState("");
  const [timezone, setTimezone] = useState(TIMEZONE_OPTIONS[0]);
  const [useBirthCoords, setUseBirthCoords] = useState(false);
  const [useRelocateCoords, setUseRelocateCoords] = useState(false);
  const [birthCoords, setBirthCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [relocateCoords, setRelocateCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse["data"] | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

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
    birthDate &&
      birthTime &&
      birthLocation?.trim() &&
      relocateLocation?.trim() &&
      timezone &&
      !isLoading &&
      (!useBirthCoords || birthCoords) &&
      (!useRelocateCoords || relocateCoords)
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
        relocateLocation,
      };
      if (birthCoords) {
        payload.latitude = birthCoords.latitude;
        payload.longitude = birthCoords.longitude;
      }
      if (relocateCoords) {
        payload.relocateLatitude = relocateCoords.latitude;
        payload.relocateLongitude = relocateCoords.longitude;
      }
      const res = await fetch("/api/calculate-relocation-chart", {
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
                <label
                  htmlFor="birthDate"
                  className="flex items-center gap-2 text-sm font-semibold text-purple-300"
                >
                  <Calendar className="size-4 text-purple-400" />
                  {tool.form.birthDate}
                </label>
                <DatePicker
                  id="birthDate"
                  value={birthDate}
                  onChange={setBirthDate}
                  onTimeChange={setBirthTime}
                  timeValue={birthTime}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="birthTime"
                  className="flex items-center gap-2 text-sm font-semibold text-purple-300"
                >
                  <Clock className="size-4 text-purple-400" />
                  {tool.form.birthTime}
                </label>
                <Input
                  id="birthTime"
                  type="time"
                  value={birthTime}
                  onChange={(e) => setBirthTime(e.target.value)}
                  className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-1.5 relative z-10">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="birthLocation"
                    className="flex items-center gap-2 text-sm font-semibold text-purple-300"
                  >
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
                    id="birthLocation"
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
                    id="birthLocation"
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
                <label htmlFor="timezone" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                  <Globe className="size-4 text-purple-400" />
                  {tool.form.timezone}
                </label>
                <select
                  id="timezone"
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

              <div className="space-y-1.5 relative z-10 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="relocateLocation"
                    className="flex items-center gap-2 text-sm font-semibold text-purple-300"
                  >
                    <MapPin className="size-4 text-pink-400" />
                    {tool.form.relocateLocation}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUseRelocateCoords((v) => !v);
                      setRelocateCoords(null);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                  >
                    {useRelocateCoords ? "Use city name" : "Use coordinates"}
                  </button>
                </div>
                {useRelocateCoords ? (
                  <Input
                    id="relocateLocation"
                    type="text"
                    value={relocateLocation}
                    onChange={(e) => {
                      const next = e.target.value;
                      setRelocateLocation(next);
                      const m = next.trim().match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
                      if (m) {
                        const lat = Number(m[1]);
                        const lng = Number(m[2]);
                        if (Number.isFinite(lat) && Number.isFinite(lng)) {
                          setRelocateCoords({ latitude: lat, longitude: lng });
                          return;
                        }
                      }
                      setRelocateCoords(null);
                    }}
                    className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                    placeholder="e.g. 48.8566, 2.3522"
                  />
                ) : (
                  <LocationAutocomplete
                    id="relocateLocation"
                    value={relocateLocation}
                    onChange={(value) => {
                      setRelocateLocation(value);
                      if (!value) setRelocateCoords(null);
                    }}
                    onSelect={(r) => setRelocateCoords(r.coordinates)}
                    placeholder="City, Country"
                    className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                  />
                )}
              </div>

              {tool.form.privacyNote && (
                <p className="text-xs leading-relaxed text-white/50">{tool.form.privacyNote}</p>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 hover:from-purple-700 hover:via-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Calculating…
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
              <h2
                ref={resultsHeadingRef}
                tabIndex={-1}
                className="text-lg font-semibold text-white focus:outline-none"
              >
                {tool.result.title}
              </h2>
              <p className="mt-1 text-sm text-white/70">
                {tool.result.relocateLabel}: {result.relocateData.location}
              </p>
              <p className="mt-0.5 text-xs text-white/50">{result.system}</p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <a
                  href={chartUrl || "/"}
                  className={cn(
                    "inline-flex flex-1 items-center justify-center rounded-md bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700",
                    !chartUrl && "pointer-events-none opacity-50"
                  )}
                >
                  {tool.result.ctaChart}
                </a>
                {tool.result.calculateAnother && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => {
                      setRelocateLocation("");
                      setRelocateCoords(null);
                      setUseRelocateCoords(false);
                      setResult(null);
                      setCopyMessage(null);
                      setError(null);
                    }}
                  >
                    {tool.result.calculateAnother}
                  </Button>
                )}
                {tool.result.copySummary && (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={async () => {
                      if (!result) return;
                      const text = buildRelocationSummary(result, tool.result);
                      try {
                        await navigator.clipboard.writeText(text);
                        setCopyMessage(
                          tool.result.copySuccess || tool.result.copySummary || "Copied"
                        );
                      } catch {
                        setCopyMessage(null);
                      }
                    }}
                  >
                    {tool.result.copySummary}
                  </Button>
                )}
              </div>
              {copyMessage && <p className="text-xs text-emerald-300/90">{copyMessage}</p>}

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <h3 className="text-sm font-semibold text-purple-300">{tool.result.natalAscTitle}</h3>
                  <p className="mt-2 text-lg text-white">
                    {result.natalAscendant.sign}{" "}
                    <span className="text-white/80">{formatDeg(result.natalAscendant.degree)}</span>
                  </p>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/20 p-4">
                  <h3 className="text-sm font-semibold text-pink-300">{tool.result.relocatedAscTitle}</h3>
                  <p className="mt-2 text-lg text-white">
                    {result.relocatedAscendant.sign}{" "}
                    <span className="text-white/80">{formatDeg(result.relocatedAscendant.degree)}</span>
                  </p>
                </div>
              </div>

              <h3 className="mt-8 text-base font-semibold text-white">{tool.result.tableTitle}</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-sm text-white/90">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="py-2 text-left font-medium">{tool.result.planet}</th>
                      <th className="py-2 text-left font-medium">{tool.result.sign}</th>
                      <th className="py-2 text-right font-medium">{tool.result.degree}</th>
                      <th className="py-2 text-center font-medium">{tool.result.natalHouse}</th>
                      <th className="py-2 text-center font-medium">{tool.result.relocatedHouse}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.planets.map((p) => (
                      <tr key={p.name} className="border-b border-white/10">
                        <td className="py-1.5">
                          {p.glyph} {p.name}
                        </td>
                        <td className="py-1.5">{p.sign}</td>
                        <td className="py-1.5 text-right">{formatDeg(p.degree)}</td>
                        <td className="py-1.5 text-center">{p.natalHouse}</td>
                        <td className="py-1.5 text-center font-medium text-pink-200">{p.relocatedHouse}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-white/50">{tool.result.footnote}</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
