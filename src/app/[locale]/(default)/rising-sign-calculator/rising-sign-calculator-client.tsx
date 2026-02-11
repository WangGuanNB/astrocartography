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
    submit: string;
  };
  result: {
    title: string;
    sign: string;
    degree: string;
    ruler: string;
    interpretation: string;
    geoTitle: string;
    geoSubtitle: string;
    ctaChart: string;
  };
  errors: {
    required: string;
    location: string;
    generic: string;
  };
  interpretations?: Record<string, string>;
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
    ascendant: {
      sign: string;
      degree: number;
      longitude: number;
      ruler: string;
    };
    otherCities: Array<{
      cityName: string;
      country: string;
      sign: string;
      degree: number;
    }>;
  };
};

function formatDeg(deg: number) {
  const whole = Math.floor(deg);
  const min = Math.round((deg - whole) * 60);
  return `${whole}°${String(min).padStart(2, "0")}'`;
}

export default function RisingSignCalculatorClient({ tool }: { tool: ToolLabels }) {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthLocation, setBirthLocation] = useState("");
  const [timezone, setTimezone] = useState(TIMEZONE_OPTIONS[0]);
  const [useCoordinates, setUseCoordinates] = useState(false);
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse["data"] | null>(null);

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

  const canSubmit = Boolean(birthDate && birthTime && birthLocation && timezone && !isLoading);

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
      };
      if (selectedLocationCoords) {
        payload.latitude = selectedLocationCoords.latitude;
        payload.longitude = selectedLocationCoords.longitude;
      }
      const res = await fetch("/api/calculate-rising-sign", {
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

  const interpretation =
    result && tool.interpretations?.[result.ascendant.sign]
      ? tool.interpretations[result.ascendant.sign]
      : null;

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
                      setUseCoordinates((v) => !v);
                      setSelectedLocationCoords(null);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                  >
                    {useCoordinates ? "Use city name" : "Use coordinates"}
                  </button>
                </div>
                {useCoordinates ? (
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
                          setSelectedLocationCoords({ latitude: lat, longitude: lng });
                          return;
                        }
                      }
                      setSelectedLocationCoords(null);
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
                      if (!value) setSelectedLocationCoords(null);
                    }}
                    onSelect={(r) => setSelectedLocationCoords(r.coordinates)}
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
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div className="mt-4 space-y-2 text-sm text-white/90">
                <p>
                  <span className="text-purple-300">{tool.result.sign}:</span> {result.ascendant.sign}{" "}
                  {formatDeg(result.ascendant.degree)}
                </p>
                <p>
                  <span className="text-purple-300">{tool.result.ruler}:</span> {result.ascendant.ruler}
                </p>
                {interpretation && (
                  <p>
                    <span className="text-purple-300">{tool.result.interpretation}:</span> {interpretation}
                  </p>
                )}
              </div>

              {result.otherCities && result.otherCities.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h3 className="text-base font-semibold text-white">{tool.result.geoTitle}</h3>
                  <p className="mt-1 text-sm text-white/60">{tool.result.geoSubtitle}</p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {result.otherCities.map((city) => (
                      <li
                        key={`${city.cityName}-${city.country}`}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90"
                      >
                        <span>
                          {city.cityName}, {city.country}
                        </span>
                        <span className="font-medium text-purple-300">
                          {city.sign} {formatDeg(city.degree)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6">
                <a
                  href={chartUrl || "#"}
                  className={cn(
                    "inline-flex w-full items-center justify-center rounded-md bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700",
                    !chartUrl && "pointer-events-none opacity-50"
                  )}
                >
                  {tool.result.ctaChart}
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
