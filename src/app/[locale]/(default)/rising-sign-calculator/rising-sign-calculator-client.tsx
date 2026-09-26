"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import PricingModal from "@/components/pricing/pricing-modal";
import { useAppContext } from "@/contexts/app";
import { risingSignEvents, type RisingSignUnlockEntry } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { Pricing as PricingType } from "@/types/blocks/pricing";
import { Calendar, Clock, Globe, Lock, MapPin, Sparkles } from "lucide-react";

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

const DEEP_REPORT_CREDITS = 50;

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
    timeAccuracyNote: string;
    bigThreeTitle: string;
    sun: string;
    moon: string;
    rising: string;
    anglesTitle: string;
    asc: string;
    dsc: string;
    mc: string;
    ic: string;
    housesTitle: string;
    housesSubtitle: string;
    houseLabel: string;
    rulerHook: string;
    methodologyNote: string;
    cuspWarningEarly: string;
    cuspWarningLate: string;
    rulersTitle: string;
    modernRulerLabel: string;
    traditionalRulerLabel: string;
    firstHouseTitle: string;
    firstHouseSubtitle: string;
    firstHouseEmpty: string;
    ascAspectsTitle: string;
    ascAspectsSubtitle: string;
    noAscAspects: string;
    geoTitle: string;
    geoSubtitle: string;
    ctaChart: string;
    ctaAskAi: string;
  };
  deepReport: {
    title: string;
    subtitle: string;
    unlock: string;
    unlocking: string;
    creditsBadge: string;
    includes: string[];
    guideBigThree: string;
    guideModifiers: string;
    guideHouses: string;
    stickyCta: string;
    loginRequired: string;
    genericError: string;
    prompt: string;
  };
  errors: {
    required: string;
    location: string;
    generic: string;
  };
  interpretations?: Record<string, string>;
};

type Placement = { sign: string; degree: number; house?: number; longitude?: number };

type RulerRow = {
  planet: string;
  sign: string | null;
  degree: number | null;
  house: number | null;
  longitude?: number | null;
};

type AspectRow = { planet: string; aspect: string; orb: number };

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
      rulers?: { modern: string; traditional: string };
      cuspSensitivity?: "early" | "late" | null;
    };
    bigThree: {
      sun: Placement | null;
      moon: Placement | null;
      rising: { sign: string; degree: number };
    };
    angles: {
      asc: Placement;
      dsc: Placement;
      mc: Placement;
      ic: Placement;
    };
    houses: Array<{ house: number; sign: string }>;
    houseSystem: string;
    rulerSystem?: string;
    firstHousePlanets?: Array<{
      planet: string;
      sign: string;
      degree: number;
      house: number;
    }>;
    ascendantAspects?: AspectRow[];
    chartRuler: RulerRow;
    traditionalChartRuler?: RulerRow | null;
    chartRulerAspects?: AspectRow[];
    traditionalChartRulerAspects?: AspectRow[];
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

function formatRulerLine(ruler: RulerRow) {
  if (ruler.sign == null || ruler.degree == null) return ruler.planet;
  return `${ruler.planet} · ${ruler.sign} ${formatDeg(ruler.degree)}${
    ruler.house != null ? ` · H${ruler.house}` : ""
  }`;
}

function DeepGuideLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 flex w-full items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5 text-left text-sm text-amber-200/90 transition-colors hover:border-amber-500/40 hover:bg-amber-500/10"
    >
      <Sparkles className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
      <span>{label}</span>
    </button>
  );
}

function extractTextFromAIDataStreamLines(lines: string[]) {
  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed.startsWith("0:")) return "";
      try {
        return JSON.parse(trimmed.slice(2));
      } catch {
        return "";
      }
    })
    .filter(Boolean)
    .join("");
}

export default function RisingSignCalculatorClient({ tool }: { tool: ToolLabels }) {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const { user, setShowSignModal } = useAppContext();
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const deepReportRef = useRef<HTMLDivElement | null>(null);
  const unlockButtonRef = useRef<HTMLButtonElement | null>(null);
  const unlockEntryRef = useRef<RisingSignUnlockEntry | null>(null);
  const [showStickyUnlock, setShowStickyUnlock] = useState(false);

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

  const [reportStatus, setReportStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [reportText, setReportText] = useState("");
  const [reportError, setReportError] = useState("");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingData, setPricingData] = useState<PricingType | null>(null);

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

  useEffect(() => {
    if (!result || reportStatus === "ready") {
      setShowStickyUnlock(false);
      return;
    }
    const target = deepReportRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyUnlock(!entry.isIntersecting),
      { threshold: 0.15, rootMargin: "0px 0px -48px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [result, reportStatus]);

  function scrollToDeepReport() {
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    deepReportRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
    window.setTimeout(() => {
      unlockButtonRef.current?.focus({ preventScroll: true });
    }, prefersReducedMotion ? 0 : 450);
  }

  function navigateToUnlock(entry: RisingSignUnlockEntry) {
    unlockEntryRef.current = entry;
    risingSignEvents.guideClicked(entry);
    scrollToDeepReport();
  }

  function resolveUnlockEntry(): RisingSignUnlockEntry {
    return unlockEntryRef.current ?? "main";
  }

  const canSubmit = Boolean(birthDate && birthTime && birthLocation && timezone && !isLoading);

  const chartQuery = result
    ? new URLSearchParams({
        birthDate: result.birthData.date,
        birthTime: result.birthData.time,
        birthLocation: result.birthData.location,
        timezone: result.birthData.timezone,
        latitude: String(result.birthData.latitude),
        longitude: String(result.birthData.longitude),
      }).toString()
    : null;

  const localePrefix = locale === "en" ? "" : `/${locale}`;
  const chartUrl = chartQuery ? `${localePrefix}/chart?${chartQuery}` : null;

  async function openPricingForCredits(entry: RisingSignUnlockEntry) {
    try {
      if (!pricingData) {
        const response = await fetch(`/api/get-pricing?locale=${locale}&source=research`);
        const data = await response.json();
        if (data.success && data.pricing) {
          setPricingData(data.pricing);
        } else {
          throw new Error("pricing unavailable");
        }
      }
      risingSignEvents.pricingModalOpened(entry);
      setShowPricingModal(true);
    } catch {
      setReportError(tool.deepReport.genericError);
      setReportStatus("error");
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    setReportStatus("idle");
    setReportText("");
    setReportError("");
    unlockEntryRef.current = null;
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

  async function unlockDeepReport() {
    if (!result) return;
    const entry = resolveUnlockEntry();
    if (!user) {
      risingSignEvents.reportLoginGate(entry);
      setShowSignModal(true);
      return;
    }
    if (reportStatus === "loading") return;

    risingSignEvents.reportUnlockClicked(entry, DEEP_REPORT_CREDITS);
    setReportStatus("loading");
    setReportText("");
    setReportError("");

    try {
      const response = await fetch("/api/astro-chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          messages: [{ role: "user", content: tool.deepReport.prompt }],
          risingSignData: {
            birthData: result.birthData,
            ascendant: result.ascendant,
            bigThree: result.bigThree,
            angles: result.angles,
            houses: result.houses,
            houseSystem: result.houseSystem,
            rulerSystem: result.rulerSystem,
            firstHousePlanets: result.firstHousePlanets,
            ascendantAspects: result.ascendantAspects,
            chartRuler: result.chartRuler,
            traditionalChartRuler: result.traditionalChartRuler,
            chartRulerAspects: result.chartRulerAspects,
            traditionalChartRulerAspects: result.traditionalChartRulerAspects,
          },
          requestType: "rising_sign_deep_report",
          userLocale: locale,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        if (response.status === 401 || errorPayload?.type === "auth_required") {
          risingSignEvents.reportFailed(entry, "auth_required");
          setShowSignModal(true);
          setReportStatus("idle");
          return;
        }
        if (response.status === 402 || errorPayload?.type === "insufficient_credits") {
          risingSignEvents.reportFailed(entry, "insufficient_credits");
          setReportStatus("idle");
          setReportError("");
          await openPricingForCredits(entry);
          return;
        }
        risingSignEvents.reportFailed(entry, "generation_error");
        setReportStatus("error");
        setReportError(errorPayload?.message || tool.deepReport.genericError);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(tool.deepReport.genericError);
      }

      const decoder = new TextDecoder();
      let streamBuffer = "";
      let nextReportText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        streamBuffer += decoder.decode(value, { stream: true });
        const lines = streamBuffer.split("\n");
        streamBuffer = lines.pop() || "";
        const textChunk = extractTextFromAIDataStreamLines(lines);
        if (textChunk) {
          nextReportText += textChunk;
          setReportText(nextReportText);
        }
      }
      const finalTextChunk = extractTextFromAIDataStreamLines([streamBuffer]);
      if (finalTextChunk) {
        nextReportText += finalTextChunk;
        setReportText(nextReportText);
      }

      if (!nextReportText.trim()) {
        risingSignEvents.reportFailed(entry, "empty_response");
        setReportStatus("error");
        setReportError(tool.deepReport.genericError);
        return;
      }

      risingSignEvents.reportSuccess(entry, DEEP_REPORT_CREDITS);
      unlockEntryRef.current = null;
      setReportStatus("ready");
      window.setTimeout(() => {
        deepReportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch {
      risingSignEvents.reportFailed(resolveUnlockEntry(), "generation_error");
      setReportStatus("error");
      setReportError(tool.deepReport.genericError);
    }
  }

  const interpretation =
    result && tool.interpretations?.[result.ascendant.sign]
      ? tool.interpretations[result.ascendant.sign]
      : null;

  const rulerPlacementLabel = result
    ? [
        formatRulerLine(result.chartRuler),
        result.traditionalChartRuler
          ? formatRulerLine(result.traditionalChartRuler)
          : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <div className={cn("container max-w-4xl px-4 pb-16", showStickyUnlock && "pb-28")}>
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
            <CardContent className="p-6 md:p-8 space-y-8">
              <div>
                <h2
                  ref={resultsHeadingRef}
                  tabIndex={-1}
                  className="text-lg font-semibold text-white focus:outline-none"
                >
                  {tool.result.title}
                </h2>
                <p className="mt-2 text-sm text-amber-200/80">{tool.result.timeAccuracyNote}</p>
                <p className="mt-2 text-xs text-white/50">{tool.result.methodologyNote}</p>
                {result.ascendant.cuspSensitivity === "early" && (
                  <p className="mt-2 text-sm text-orange-200/90">{tool.result.cuspWarningEarly}</p>
                )}
                {result.ascendant.cuspSensitivity === "late" && (
                  <p className="mt-2 text-sm text-orange-200/90">{tool.result.cuspWarningLate}</p>
                )}
                <div className="mt-4 space-y-2 text-sm text-white/90">
                  <p>
                    <span className="text-purple-300">{tool.result.sign}:</span>{" "}
                    {result.ascendant.sign} {formatDeg(result.ascendant.degree)}
                  </p>
                  <div>
                    <p className="text-purple-300">{tool.result.rulersTitle}</p>
                    <p className="mt-1">
                      <span className="text-white/60">{tool.result.modernRulerLabel}: </span>
                      {formatRulerLine(result.chartRuler)}
                    </p>
                    {result.traditionalChartRuler && (
                      <p className="mt-1">
                        <span className="text-white/60">{tool.result.traditionalRulerLabel}: </span>
                        {formatRulerLine(result.traditionalChartRuler)}
                      </p>
                    )}
                  </div>
                  {interpretation && (
                    <p>
                      <span className="text-purple-300">{tool.result.interpretation}:</span>{" "}
                      {interpretation}
                    </p>
                  )}
                </div>
              </div>

              {result.bigThree && (
                <div className="pt-6 border-t border-white/10">
                  <h3 className="text-base font-semibold text-white">{tool.result.bigThreeTitle}</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-3">
                    <li className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      <div className="text-purple-300">{tool.result.sun}</div>
                      <div className="mt-1 font-medium text-white">
                        {result.bigThree.sun
                          ? `${result.bigThree.sun.sign} ${formatDeg(result.bigThree.sun.degree)}`
                          : "—"}
                      </div>
                    </li>
                    <li className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      <div className="text-purple-300">{tool.result.moon}</div>
                      <div className="mt-1 font-medium text-white">
                        {result.bigThree.moon
                          ? `${result.bigThree.moon.sign} ${formatDeg(result.bigThree.moon.degree)}`
                          : "—"}
                      </div>
                    </li>
                    <li className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
                      <div className="text-purple-300">{tool.result.rising}</div>
                      <div className="mt-1 font-medium text-white">
                        {result.bigThree.rising.sign} {formatDeg(result.bigThree.rising.degree)}
                      </div>
                    </li>
                  </ul>
                  {reportStatus !== "ready" && (
                    <DeepGuideLink
                      label={tool.deepReport.guideBigThree}
                      onClick={() => navigateToUnlock("guide_big_three")}
                    />
                  )}
                </div>
              )}

              {result.angles && (
                <div className="pt-6 border-t border-white/10">
                  <h3 className="text-base font-semibold text-white">{tool.result.anglesTitle}</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(
                      [
                        ["asc", tool.result.asc],
                        ["dsc", tool.result.dsc],
                        ["mc", tool.result.mc],
                        ["ic", tool.result.ic],
                      ] as const
                    ).map(([key, label]) => (
                      <li
                        key={key}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90"
                      >
                        <span className="text-purple-300">{label}</span>
                        <span className="font-medium">
                          {result.angles[key].sign} {formatDeg(result.angles[key].degree)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-6 border-t border-white/10">
                <h3 className="text-base font-semibold text-white">{tool.result.firstHouseTitle}</h3>
                <p className="mt-1 text-sm text-white/60">{tool.result.firstHouseSubtitle}</p>
                {result.firstHousePlanets && result.firstHousePlanets.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {result.firstHousePlanets.map((p) => (
                      <li
                        key={p.planet}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90"
                      >
                        <span className="text-purple-300">{p.planet}</span>
                        <span className="font-medium">
                          {p.sign} {formatDeg(p.degree)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-white/60">{tool.result.firstHouseEmpty}</p>
                )}
              </div>

              <div className="pt-6 border-t border-white/10">
                <h3 className="text-base font-semibold text-white">{tool.result.ascAspectsTitle}</h3>
                <p className="mt-1 text-sm text-white/60">{tool.result.ascAspectsSubtitle}</p>
                {result.ascendantAspects && result.ascendantAspects.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {result.ascendantAspects.slice(0, 8).map((a) => (
                      <li
                        key={`${a.planet}-${a.aspect}`}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90"
                      >
                        <span>
                          {a.planet} {a.aspect} ASC
                        </span>
                        <span className="text-purple-300">{a.orb}°</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-white/60">{tool.result.noAscAspects}</p>
                )}
                {reportStatus !== "ready" && (
                  <DeepGuideLink
                    label={tool.deepReport.guideModifiers}
                    onClick={() => navigateToUnlock("guide_modifiers")}
                  />
                )}
              </div>

              {result.houses?.length > 0 && (
                <div className="pt-6 border-t border-white/10">
                  <h3 className="text-base font-semibold text-white">{tool.result.housesTitle}</h3>
                  <p className="mt-1 text-sm text-white/60">{tool.result.housesSubtitle}</p>
                  <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {result.houses.map((h) => (
                      <li
                        key={h.house}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90"
                      >
                        <span className="text-purple-300">
                          {tool.result.houseLabel} {h.house}
                        </span>
                        <div className="mt-0.5 font-medium">{h.sign}</div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm text-white/70">
                    {tool.result.rulerHook.replace("{placement}", rulerPlacementLabel)}
                  </p>
                  {reportStatus !== "ready" && (
                    <DeepGuideLink
                      label={tool.deepReport.guideHouses}
                      onClick={() => navigateToUnlock("guide_houses")}
                    />
                  )}
                </div>
              )}

              <div
                id="rising-sign-deep-report"
                ref={deepReportRef}
                className="pt-6 border-t border-white/10 space-y-4 scroll-mt-24"
              >
                <div>
                  <h3 className="text-base font-semibold text-white">{tool.deepReport.title}</h3>
                  <p className="mt-1 text-sm text-white/60">{tool.deepReport.subtitle}</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-white/80">
                    {tool.deepReport.includes.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="text-purple-300">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {reportStatus !== "ready" && (
                  <Button
                    ref={unlockButtonRef}
                    onClick={unlockDeepReport}
                    disabled={reportStatus === "loading"}
                    className="w-full h-12 text-sm font-semibold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 text-white"
                  >
                    {reportStatus === "loading" ? (
                      <>
                        <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        {tool.deepReport.unlocking}
                      </>
                    ) : (
                      <>
                        <Lock className="mr-2 size-4" />
                        {tool.deepReport.unlock.replace("{credits}", String(DEEP_REPORT_CREDITS))}
                        <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-xs">
                          {tool.deepReport.creditsBadge.replace(
                            "{credits}",
                            String(DEEP_REPORT_CREDITS)
                          )}
                        </span>
                      </>
                    )}
                  </Button>
                )}

                {!user && reportStatus === "idle" && (
                  <p className="text-xs text-white/50">{tool.deepReport.loginRequired}</p>
                )}

                {reportStatus === "error" && reportError && (
                  <p className="text-sm text-red-300">⚠️ {reportError}</p>
                )}

                {reportText && (
                  <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-white/90 whitespace-pre-wrap">
                    {reportText}
                  </div>
                )}

                {reportStatus === "ready" && chartUrl && (
                  <a
                    href={chartUrl}
                    className="inline-flex w-full items-center justify-center rounded-md border border-purple-400/40 bg-purple-600/20 px-4 py-3 text-sm font-semibold text-purple-100 transition-colors hover:bg-purple-600/40"
                  >
                    {tool.result.ctaAskAi}
                  </a>
                )}
              </div>

              {result.otherCities && result.otherCities.length > 0 && (
                <div className="pt-6 border-t border-white/10">
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

              <div>
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

      {showStickyUnlock && result && reportStatus !== "ready" && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-gray-950/95 px-4 py-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            onClick={() => navigateToUnlock("sticky")}
            disabled={reportStatus === "loading"}
            className="h-11 w-full text-sm font-semibold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 text-white shadow-lg"
          >
            <Lock className="mr-2 size-4" />
            {tool.deepReport.stickyCta}
          </Button>
        </div>
      )}

      {pricingData && (
        <PricingModal
          open={showPricingModal}
          onOpenChange={setShowPricingModal}
          pricing={pricingData}
        />
      )}
    </div>
  );
}
