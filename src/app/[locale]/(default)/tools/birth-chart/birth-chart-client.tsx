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
import { useTranslations } from "next-intl";

type BirthChartResponse = {
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
    system: string;
    ascendant: {
      longitude: number;
      sign: string;
      degree: number;
    };
    planets: Array<{
      name: string;
      glyph: string;
      longitude: number;
      sign: string;
      degree: number;
      house: number;
    }>;
  };
};

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

function formatDeg(deg: number) {
  const whole = Math.floor(deg);
  const min = Math.round((deg - whole) * 60);
  return `${whole}°${String(min).padStart(2, "0")}'`;
}

export default function BirthChartClient() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const t = useTranslations();

  const resultsRef = useRef<HTMLDivElement | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [birthLocation, setBirthLocation] = useState("");
  const [timezone, setTimezone] = useState(TIMEZONE_OPTIONS[0]);

  const [useCoordinates, setUseCoordinates] = useState(false);
  const [selectedLocationCoords, setSelectedLocationCoords] = useState<{ latitude: number; longitude: number } | null>(
    null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BirthChartResponse["data"] | null>(null);

  // Mobile UX: auto-scroll to results after generation.
  useEffect(() => {
    if (!result) return;
    if (typeof window === "undefined") return;

    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";

    // Wait for DOM to paint the results section before scrolling/focusing (more reliable on mobile browsers).
    const timeoutId = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior, block: "start" });
      resultsHeadingRef.current?.focus({ preventScroll: true });
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, [result]);

  const canSubmit = Boolean(birthDate && birthTime && birthLocation && timezone && !isLoading);

  const astrocartographyMapUrl = useMemo(() => {
    if (!result) return null;
    const q = new URLSearchParams({
      birthDate: result.birthData.date,
      birthTime: result.birthData.time,
      birthLocation: result.birthData.location,
      timezone: result.birthData.timezone,
      latitude: String(result.birthData.latitude),
      longitude: String(result.birthData.longitude),
    });
    const prefix = locale === "en" ? "" : `/${locale}`;
    return `${prefix}/chart?${q.toString()}`;
  }, [result, locale]);

  async function handleGenerate() {
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: any = {
        birthDate,
        birthTime,
        birthLocation,
        timezone,
      };
      if (selectedLocationCoords) {
        payload.latitude = selectedLocationCoords.latitude;
        payload.longitude = selectedLocationCoords.longitude;
      }

      const res = await fetch("/api/calculate-birth-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = (await res.json()) as BirthChartResponse;
      if (!json.success || !json.data) {
        setError(json.error || t("birth_chart_tool.error_failed"));
        return;
      }
      setResult(json.data);
    } catch (e: any) {
      setError(e?.message || t("birth_chart_tool.error_failed"));
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
              {/* Birth date */}
              <div className="space-y-1.5">
                <label
                  htmlFor="birthDate"
                  className="flex items-center gap-2 text-sm font-semibold text-purple-300"
                >
                  <Calendar className="size-4 text-purple-400" />
                  {t("birth_chart_tool.form.birth_date")}
                </label>
                <DatePicker
                  id="birthDate"
                  value={birthDate}
                  onChange={setBirthDate}
                  onTimeChange={setBirthTime}
                  timeValue={birthTime}
                  placeholder={t("birth_chart_tool.form.date_placeholder")}
                />
              </div>

            {/* Birth time */}
            <div className="space-y-1.5">
              <label
                htmlFor="birthTime"
                className="flex items-center gap-2 text-sm font-semibold text-purple-300"
              >
                <Clock className="size-4 text-purple-400" />
                {t("birth_chart_tool.form.birth_time")}
              </label>
              <Input
                id="birthTime"
                type="time"
                lang="en"
                value={birthTime}
                onChange={(e) => setBirthTime(e.target.value)}
                className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            {/* Birth location */}
            <div className="space-y-1.5 relative z-10">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="birthLocation"
                  className="flex items-center gap-2 text-sm font-semibold text-purple-300"
                >
                  <MapPin className="size-4 text-purple-400" />
                  {t("birth_chart_tool.form.birth_location")}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setUseCoordinates((v) => !v);
                    setSelectedLocationCoords(null);
                  }}
                  className="text-xs text-purple-400 hover:text-purple-300 underline"
                >
                  {useCoordinates
                    ? t("birth_chart_tool.form.use_city_name")
                    : t("birth_chart_tool.form.use_coordinates")}
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
                    // Parse "lat, lng" if user provides coordinates.
                    const m = next
                      .trim()
                      .match(
                        /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
                      );
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
                  placeholder={t("birth_chart_tool.form.coordinates_placeholder")}
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
                  placeholder={t("birth_chart_tool.form.city_country_placeholder")}
                  className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                />
              )}
              <p className="text-[11px] text-white/50 mt-1">
                {t("birth_chart_tool.form.location_tip")}
              </p>
            </div>

            {/* Timezone */}
            <div className="space-y-1.5">
              <label htmlFor="timezone" className="flex items-center gap-2 text-sm font-semibold text-purple-300">
                <Globe className="size-4 text-purple-400" />
                {t("birth_chart_tool.form.timezone")}
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

            {/* Submit */}
            <Button
              onClick={handleGenerate}
              disabled={!canSubmit}
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t("birth_chart_tool.form.generating")}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 size-4" />
                  {t("birth_chart_tool.form.generate")}
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <span>🔒</span>
              <span>{t("birth_chart_tool.form.privacy_note")}</span>
            </div>

              {error && <p className="text-sm text-red-300">⚠️ {error}</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {result && (
        <div ref={resultsRef} className="mt-10 space-y-6">
          <Card className="shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                <div className="md:w-[420px]">
                  <BirthChartWheel
                    planets={result.planets.map((p) => ({ name: p.name, glyph: p.glyph, longitude: p.longitude }))}
                    ascendantLongitude={result.ascendant.longitude}
                    className="rounded-xl border border-white/10 bg-black/20 p-4"
                  />
                  <p className="mt-3 text-xs text-white/60">
                    {t("birth_chart_tool.results.houses_label")}{" "}
                    <span className="font-semibold text-white/80">{result.system}</span>{" "}
                    {t("birth_chart_tool.results.houses_suffix")}
                  </p>
                </div>

                <div className="flex-1">
                  <div className="space-y-1">
                    <h2
                      ref={resultsHeadingRef}
                      tabIndex={-1}
                      className="text-lg font-semibold text-white focus:outline-none"
                    >
                      {t("birth_chart_tool.results.title")}
                    </h2>
                    <p className="text-sm text-white/60">
                      {t("birth_chart_tool.results.asc_label")}: {result.ascendant.sign}{" "}
                      {formatDeg(result.ascendant.degree)}
                    </p>
                  </div>

                  <div className="mt-4 overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-sm">
                      <thead className="bg-white/5">
                        <tr className="text-left text-white/80">
                          <th className="px-3 py-2">{t("birth_chart_tool.results.table.planet")}</th>
                          <th className="px-3 py-2">{t("birth_chart_tool.results.table.sign")}</th>
                          <th className="px-3 py-2">{t("birth_chart_tool.results.table.degree")}</th>
                          <th className="px-3 py-2">{t("birth_chart_tool.results.table.house")}</th>
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

                  <div className="mt-6 space-y-3">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                      <p className="text-sm text-white/80">
                        {t("birth_chart_tool.results.bridge_text")}
                      </p>
                    </div>

                    <a
                      href={astrocartographyMapUrl || "#"}
                      className={cn(
                        "inline-flex w-full items-center justify-center rounded-md bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700",
                        !astrocartographyMapUrl && "pointer-events-none opacity-50"
                      )}
                    >
                      {t("birth_chart_tool.results.cta_button")}
                    </a>

                    <p className="text-xs text-white/55">
                      {t("birth_chart_tool.results.cta_help")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

