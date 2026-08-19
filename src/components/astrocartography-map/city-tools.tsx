"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  ArrowRight,
  Coins,
  Download,
  GitCompareArrows,
  Lock,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
} from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { authEvents, cityToolEvents, paymentEvents } from "@/lib/analytics";
import { MAJOR_CITIES } from "@/lib/cities";
import PricingModal from "@/components/pricing/pricing-modal";
import { Pricing as PricingType } from "@/types/blocks/pricing";
import { useParams } from "next/navigation";

type PlanetLine = {
  planet: string;
  type: "AS" | "DS" | "MC" | "IC";
  coordinates: [number, number][];
  color: string;
};

export type MapCity = {
  name: string;
  country: string;
  lat: number;
  lng: number;
};

type CityToolsProps = {
  birthData: {
    date: string;
    time: string;
    location: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
  };
  planetLines: PlanetLine[];
  onFocusCity: (city: MapCity) => void;
  onAskOther?: (
    prefillText: string,
    options?: { requestType?: "city_comparison_report" }
  ) => void;
  onRequireLogin?: () => void;
  maxCompareCities?: number;
  userState?: "anonymous" | "signed_in";
};

type ToolMode = "check" | "compare" | null;
type ComparisonGoal =
  | "overall"
  | "career"
  | "relationships"
  | "home"
  | "travel";
type ReportStatus = "idle" | "loading" | "success" | "error";

export type CityToolsHandle = {
  openCheckCity: () => void;
  openCompareCities: () => void;
};

const planetSymbols: Record<string, string> = {
  Sun: "☉",
  Moon: "☽",
  Mercury: "☿",
  Venus: "♀",
  Mars: "♂",
  Jupiter: "♃",
  Saturn: "♄",
  Uranus: "♅",
  Neptune: "♆",
  Pluto: "♇",
};

const comparisonGoals: ComparisonGoal[] = [
  "overall",
  "career",
  "relationships",
  "home",
  "travel",
];

const CITY_COMPARISON_REPORT_CREDITS = 50;

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

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(a));
}

function minDistanceToLineKm(city: MapCity, line: PlanetLine) {
  if (!line.coordinates.length) return Infinity;

  const step = Math.max(1, Math.floor(line.coordinates.length / 180));
  let minDistance = Infinity;

  for (let index = 0; index < line.coordinates.length; index += step) {
    const [lat, lng] = line.coordinates[index];
    minDistance = Math.min(
      minDistance,
      haversineKm(city.lat, city.lng, lat, lng)
    );
  }

  return minDistance;
}

function lineTypeLabel(type: PlanetLine["type"]) {
  if (type === "AS") return "ASC";
  if (type === "DS") return "DSC";
  return type;
}

function analyzeCity(city: MapCity, planetLines: PlanetLine[]) {
  return planetLines
    .map((line) => ({
      line,
      distanceKm: minDistanceToLineKm(city, line),
    }))
    .filter(({ distanceKm }) => distanceKm <= 800)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 5);
}

function cityKey(city: MapCity) {
  return `${city.name}-${city.country}-${city.lat}-${city.lng}`;
}

function strengthKey(distanceKm: number) {
  if (distanceKm <= 200) return "strong";
  if (distanceKm <= 450) return "moderate";
  return "subtle";
}

function fitScoreFromRawScore(rawScore: number, evidenceCount: number) {
  if (evidenceCount === 0) return 32;
  return Math.round(Math.max(24, Math.min(96, 55 + rawScore * 13)));
}

function scoreStatus(score: number) {
  if (score >= 72) return "support";
  if (score >= 50) return "mixed";
  return "caution";
}

function getLineMeaning(
  planet: string,
  type: PlanetLine["type"],
  translate: (
    key: string,
    values?: Record<string, string | number>
  ) => string
) {
  const knownPlanet = Object.hasOwn(planetSymbols, planet)
    ? planet
    : "fallback";
  const planetName =
    knownPlanet === "fallback"
      ? planet
      : translate(`planetNames.${knownPlanet}`);

  return {
    planetName,
    themes: translate(`lineMeanings.planets.${knownPlanet}`),
    description: translate("lineMeanings.template", {
      planet: planetName,
      themes: translate(`lineMeanings.planets.${knownPlanet}`),
      angle: translate(`lineMeanings.angles.${type}`),
    }),
  };
}

const goalPlanetWeights: Record<ComparisonGoal, Record<string, number>> = {
  overall: {
    Jupiter: 3,
    Venus: 3,
    Sun: 2,
    Moon: 2,
    Mercury: 1,
    Mars: -1,
    Saturn: -1,
    Uranus: 0,
    Neptune: 0,
    Pluto: -1,
  },
  career: {
    Sun: 3,
    Jupiter: 3,
    Mercury: 2,
    Mars: 1,
    Saturn: 1,
    Venus: 1,
    Moon: 0,
    Uranus: 1,
    Neptune: -1,
    Pluto: 0,
  },
  relationships: {
    Venus: 3,
    Moon: 2,
    Jupiter: 2,
    Sun: 1,
    Mercury: 1,
    Mars: -1,
    Saturn: -1,
    Uranus: -1,
    Neptune: 0,
    Pluto: -1,
  },
  home: {
    Moon: 3,
    Venus: 2,
    Jupiter: 2,
    Saturn: 1,
    Sun: 1,
    Mercury: 0,
    Mars: -2,
    Uranus: -2,
    Neptune: 0,
    Pluto: -1,
  },
  travel: {
    Jupiter: 3,
    Mercury: 2,
    Uranus: 2,
    Venus: 2,
    Sun: 1,
    Mars: 1,
    Moon: 0,
    Saturn: -1,
    Neptune: 1,
    Pluto: 0,
  },
};

function comparisonScore(
  city: MapCity,
  planetLines: PlanetLine[],
  goal: ComparisonGoal
) {
  const evidence = analyzeCity(city, planetLines);
  const score = evidence.reduce((total, { line, distanceKm }) => {
    const proximity = Math.max(0.2, 1 - distanceKm / 1000);
    const angleBoost = line.type === "MC" || line.type === "AS" ? 1.15 : 1;
    return (
      total +
      (goalPlanetWeights[goal][line.planet] ?? 0) * proximity * angleBoost
    );
  }, 0);
  return { evidence, score };
}

function isNearBirthPlace(
  city: MapCity,
  birthData: CityToolsProps["birthData"]
) {
  if (
    birthData.latitude === undefined ||
    birthData.longitude === undefined
  ) {
    return false;
  }
  return (
    Math.abs(city.lat - birthData.latitude) < 0.1 &&
    Math.abs(city.lng - birthData.longitude) < 0.1
  );
}

/** Quick picks: major cities closest to the user's planetary lines. */
function getSuggestedCompareCities(
  planetLines: PlanetLine[],
  birthData: CityToolsProps["birthData"],
  selectedCities: MapCity[],
  limit = 6
): MapCity[] {
  if (!planetLines.length) return [];

  const selectedKeys = new Set(selectedCities.map(cityKey));
  const ranked = MAJOR_CITIES.filter(
    (city) =>
      !isNearBirthPlace(city, birthData) && !selectedKeys.has(cityKey(city))
  )
    .map((city) => {
      const evidence = analyzeCity(city, planetLines);
      const closestKm = evidence[0]?.distanceKm ?? Infinity;
      return {
        city,
        closestKm,
        evidenceCount: evidence.length,
      };
    })
    .sort(
      (a, b) =>
        a.closestKm - b.closestKm || b.evidenceCount - a.evidenceCount
    );

  const nearLines = ranked.filter(
    (item) => item.evidenceCount > 0 && item.closestKm <= 550
  );
  const pool = nearLines.length >= 4 ? nearLines : ranked;
  return pool.slice(0, limit).map((item) => item.city);
}

function CityLineResults({
  city,
  planetLines,
}: {
  city: MapCity;
  planetLines: PlanetLine[];
}) {
  const t = useTranslations("astrocartographyMap.cityTools");
  const translate = (
    key: string,
    values?: Record<string, string | number>
  ) => t(key as never, values as never);
  const results = useMemo(
    () => analyzeCity(city, planetLines),
    [city, planetLines]
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">
            {city.name}
          </div>
          <div className="truncate text-[11px] text-white/50">
            {city.country} · {city.lat.toFixed(2)}, {city.lng.toFixed(2)}
          </div>
        </div>
        <MapPin className="size-4 shrink-0 text-purple-300" />
      </div>

      <div className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-white/50">
        {t("nearbyLines")}
      </div>

      {results.length ? (
        <div className="mt-2 space-y-2">
          {results.map(({ line, distanceKm }) => {
            const strength = strengthKey(distanceKm);
            const meaning = getLineMeaning(line.planet, line.type, translate);
            return (
              <div
                key={`${line.planet}-${line.type}`}
                className="rounded-xl border border-white/10 bg-black/30 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/10 text-base text-white"
                      style={{ backgroundColor: `${line.color}33` }}
                    >
                      {planetSymbols[line.planet] || "•"}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-white">
                        {meaning.planetName} {lineTypeLabel(line.type)}
                      </div>
                      <div className="mt-0.5 text-[11px] font-medium text-amber-200/80">
                        {meaning.themes}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[11px] text-white/80">
                      {Math.round(distanceKm)} km
                    </div>
                    <div className="text-[10px] font-semibold text-purple-300">
                      {t(strength)}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-white/60">
                  {meaning.description}
                </p>
              </div>
            );
          })}
          <div className="space-y-2 border-t border-white/10 pt-3 text-[10px] leading-relaxed text-white/45">
            <p>{t("distanceNotice")}</p>
            <p>{t("decisionNotice")}</p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-white/55">
          {t("noNearbyLines")}
        </p>
      )}
    </div>
  );
}

const CityTools = forwardRef<CityToolsHandle, CityToolsProps>(function CityTools(
  {
    birthData,
    planetLines,
    onFocusCity,
    onAskOther,
    onRequireLogin,
    maxCompareCities = 4,
    userState = "signed_in",
  },
  ref
) {
  const t = useTranslations("astrocartographyMap.cityTools");
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const requestLogin = () => {
    authEvents.gateShown("city_tools");
    onRequireLogin?.();
  };
  const translate = (
    key: string,
    values?: Record<string, string | number>
  ) => t(key as never, values as never);
  const [mode, setMode] = useState<ToolMode>(null);
  const [checkQuery, setCheckQuery] = useState("");
  const [pendingCheckCity, setPendingCheckCity] = useState<MapCity | null>(null);
  const [checkedCity, setCheckedCity] = useState<MapCity | null>(null);
  const [compareQuery, setCompareQuery] = useState("");
  const [pendingCompareCity, setPendingCompareCity] = useState<MapCity | null>(null);
  const [compareCities, setCompareCities] = useState<MapCity[]>([]);
  const [comparisonGoal, setComparisonGoal] =
    useState<ComparisonGoal>("overall");
  const [comparisonReady, setComparisonReady] = useState(false);
  const [reportStatus, setReportStatus] = useState<ReportStatus>("idle");
  const [reportText, setReportText] = useState("");
  const [reportError, setReportError] = useState("");
  const [expandedResultKeys, setExpandedResultKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingData, setPricingData] = useState<PricingType | null>(null);
  const [mounted, setMounted] = useState(false);
  const comparisonResultsRef = useRef<HTMLDivElement>(null);
  const fullReportRef = useRef<HTMLDivElement>(null);
  const comparisonResults = useMemo(
    () =>
      [...compareCities]
        .map((city) => ({
          city,
          ...comparisonScore(city, planetLines, comparisonGoal),
        }))
        .sort((a, b) => b.score - a.score),
    [compareCities, comparisonGoal, planetLines]
  );
  const hasReachedCompareLimit = compareCities.length >= maxCompareCities;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mode]);

  useEffect(() => {
    setReportStatus("idle");
    setReportText("");
    setReportError("");
  }, [compareCities, comparisonGoal]);

  useEffect(() => {
    setExpandedResultKeys(new Set());
  }, [compareCities, comparisonGoal, comparisonReady]);

  const toggleResultExpanded = (key: string) => {
    setExpandedResultKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const unlockButtonLabel =
    reportStatus === "loading"
      ? t("fullReport.generatingCTA")
      : userState === "anonymous"
        ? t("fullReport.signInCTA")
        : t("fullReport.unlockCTA", {
            credits: CITY_COMPARISON_REPORT_CREDITS,
          });

  const scrollToFullReport = () => {
    fullReportRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  const openPricingForCredits = async () => {
    try {
      if (!pricingData) {
        const response = await fetch(`/api/get-pricing?locale=${locale}`);
        const data = await response.json();
        if (data.success && data.pricing) {
          setPricingData(data.pricing);
        } else {
          throw new Error("pricing unavailable");
        }
      }
      setShowPricingModal(true);
      paymentEvents.pricingModalOpened("insufficient_credits");
    } catch {
      setReportError(t("fullReport.genericError"));
      setReportStatus("error");
    }
  };

  useImperativeHandle(ref, () => ({
    openCheckCity() {
      setMode("check");
      cityToolEvents.opened("check_city");
    },
    openCompareCities() {
      setMode("compare");
      cityToolEvents.opened("compare_cities");
    },
  }));

  const selectCheckedCity = (result: {
    name: string;
    country: string;
    coordinates: { latitude: number; longitude: number };
  }) => {
    const city = {
      name: result.name,
      country: result.country,
      lat: result.coordinates.latitude,
      lng: result.coordinates.longitude,
    };
    setPendingCheckCity(city);
  };

  const runCityCheck = () => {
    if (!pendingCheckCity) return;
    setCheckedCity(pendingCheckCity);
    onFocusCity(pendingCheckCity);
    cityToolEvents.citySelected("check_city");
  };

  const addCompareCity = (result: {
    name: string;
    country: string;
    coordinates: { latitude: number; longitude: number };
  }) => {
    const city = {
      name: result.name,
      country: result.country,
      lat: result.coordinates.latitude,
      lng: result.coordinates.longitude,
    };

    setPendingCompareCity(city);
  };

  const suggestedCompareCities = useMemo(
    () =>
      getSuggestedCompareCities(planetLines, birthData, compareCities, 6),
    [planetLines, birthData, compareCities]
  );

  const appendCompareCity = (city: MapCity) => {
    if (
      compareCities.some((item) => cityKey(item) === cityKey(city))
    ) {
      return;
    }
    if (compareCities.length >= maxCompareCities || hasReachedCompareLimit) {
      cityToolEvents.limitReached(maxCompareCities, userState);
      return;
    }

    setCompareCities((current) => [...current, city]);
    setCompareQuery("");
    setPendingCompareCity(null);
    setComparisonReady(false);
    onFocusCity(city);
    cityToolEvents.citySelected("compare_cities");
  };

  const commitCompareCity = () => {
    if (!pendingCompareCity) return;
    appendCompareCity(pendingCompareCity);
  };

  const askAboutCity = () => {
    if (!checkedCity) return;
    const evidence = analyzeCity(checkedCity, planetLines)
      .map(({ line, distanceKm }) => {
        const meaning = getLineMeaning(
          line.planet,
          line.type,
          translate
        );
        return `${meaning.planetName} ${lineTypeLabel(line.type)} (${Math.round(distanceKm)} km, ${t(strengthKey(distanceKm))}) — ${meaning.themes}`;
      })
      .join("\n");
    onAskOther?.(
      t("cityAIPrompt", {
        city: checkedCity.name,
        country: checkedCity.country,
        evidence: evidence || t("noEvidence"),
      })
    );
    cityToolEvents.aiContinued("check_city", 1);
    setMode(null);
  };

  const runComparison = () => {
    if (compareCities.length < 2) return;
    const topResult = comparisonResults[0];
    cityToolEvents.comparisonRun(
      comparisonGoal,
      compareCities.length,
      topResult
        ? fitScoreFromRawScore(topResult.score, topResult.evidence.length)
        : undefined
    );
    setComparisonReady(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        comparisonResultsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  };

  const compareWithAI = (focus?: string) => {
    if (compareCities.length < 2) return;
    const evidence = compareCities
      .map((city) => {
        const lines = analyzeCity(city, planetLines)
          .slice(0, 3)
          .map(
            ({ line, distanceKm }) => {
              const meaning = getLineMeaning(
                line.planet,
                line.type,
                translate
              );
              return `${meaning.planetName} ${lineTypeLabel(line.type)} ${Math.round(distanceKm)} km`;
            }
          )
          .join(", ");
        return `${city.name}, ${city.country}: ${lines || t("noEvidence")}`;
      })
      .join("\n");
    onAskOther?.(
      t("compareAIPrompt", {
        goal: t(`goals.${comparisonGoal}.title` as never),
        evidence,
        focus: focus || t("defaultAIFocus"),
      })
    );
    cityToolEvents.aiContinued("compare_cities", compareCities.length);
    setMode(null);
  };

  const unlockFullComparisonReport = async () => {
    if (comparisonResults.length < 2) return;
    if (userState === "anonymous") {
      requestLogin();
      return;
    }
    if (reportStatus === "loading") return;

    const evidence = comparisonResults
      .map(({ city, evidence, score }, index) => {
        const fitScore = fitScoreFromRawScore(score, evidence.length);
        const status = scoreStatus(fitScore);
        const lines = evidence.length
          ? evidence
              .slice(0, 8)
              .map(({ line, distanceKm }) => {
                const meaning = getLineMeaning(
                  line.planet,
                  line.type,
                  translate
                );
                return `- ${meaning.planetName} ${lineTypeLabel(line.type)}: ${Math.round(distanceKm)} km, ${meaning.themes}`;
              })
              .join("\n")
          : `- ${t("noEvidence")}`;

        return `${index + 1}. ${city.name}, ${city.country}
Fit score: ${fitScore}/100
Status: ${t(status)}
Evidence:
${lines}`;
      })
      .join("\n\n");

    const prompt = t("fullReport.prompt", {
        goal: t(`goals.${comparisonGoal}.title` as never),
        evidence,
      });

    setReportStatus("loading");
    setReportText("");
    setReportError("");

    try {
      const response = await fetch("/api/astro-chat/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          chartData: {
            birthData,
            planetLines,
          },
          requestType: "city_comparison_report",
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        if (response.status === 401 || errorPayload?.type === "auth_required") {
          requestLogin();
          setReportStatus("idle");
          return;
        }
        if (
          response.status === 402 ||
          errorPayload?.type === "insufficient_credits"
        ) {
          setReportStatus("idle");
          setReportError("");
          await openPricingForCredits();
          return;
        }
        throw new Error(
          errorPayload?.message || t("fullReport.genericError")
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(t("fullReport.genericError"));
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
        throw new Error(t("fullReport.genericError"));
      }

      setReportStatus("success");
      requestAnimationFrame(() => {
        fullReportRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
      cityToolEvents.reportUnlocked(
        "city_comparison_report",
        CITY_COMPARISON_REPORT_CREDITS
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t("fullReport.genericError");
      if (
        message.includes("insufficient_credits") ||
        message.includes("Insufficient credits")
      ) {
        setReportStatus("idle");
        setReportError("");
        await openPricingForCredits();
        return;
      }
      setReportStatus("error");
      setReportError(message);
    }
  };

  const downloadFullComparisonReport = () => {
    if (!reportText.trim()) return;

    const cityPart = comparisonResults
      .map(({ city }) => city.name)
      .join("-vs-")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
    const datePart = new Date().toISOString().slice(0, 10);
    const filename = `astrocartography-city-comparison-${cityPart || comparisonGoal}-${datePart}.txt`;
    const content = `${t("fullReport.title")}\n\n${reportText}`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!mounted) return null;
  if (!mode && !showPricingModal) return null;

  return createPortal(
    <>
      {mode ? (
        <>
        <div
          className="fixed inset-0 z-[1800] overflow-y-auto bg-black/65 p-3 backdrop-blur-sm"
          onClick={() => setMode(null)}
        >
          <div
            className={`relative mx-auto w-full rounded-[26px] border border-amber-200/20 bg-[#100c18]/98 shadow-2xl ${
              mode === "check"
                ? "my-[8vh] max-w-xl overflow-visible p-5"
                : "my-4 max-w-6xl overflow-visible md:my-7"
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`flex items-start justify-between gap-4 ${
                mode === "compare"
                  ? "border-b border-white/10 px-5 py-4 md:px-6"
                  : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {mode === "compare" && (
                  <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-200/10 text-amber-200">
                    <BarChart3 className="size-4" />
                  </div>
                )}
                <div>
                  {mode === "check" && (
                    <div className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-200">
                      {t("checkEyebrow")}
                    </div>
                  )}
                  <h2 className="text-xl font-bold text-white">
                    {mode === "check" ? t("checkTitle") : t("compareTitle")}
                  </h2>
                  {mode === "compare" && (
                    <p className="mt-1 max-w-2xl text-sm leading-relaxed text-white/65">
                      {t("compareDescription")}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                aria-label={t("close")}
                onClick={() => setMode(null)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {mode === "check" ? (
              <div className="mt-4 rounded-2xl border border-amber-200/20 bg-white/[0.025] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-200/10 text-amber-200">
                    <MapPin className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {t("checkTitle")}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-white/65">
                      {t("checkDescription")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <div className="min-w-0 flex-1">
                    <LocationAutocomplete
                      value={checkQuery}
                      onChange={(value) => {
                        setCheckQuery(value);
                        setPendingCheckCity(null);
                      }}
                      onSelect={selectCheckedCity}
                      placeholder={t("searchPlaceholder")}
                      className="h-11 rounded-full border-white/15 bg-black/35 px-4 text-white placeholder:text-white/35"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!pendingCheckCity}
                    onClick={runCityCheck}
                    className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-amber-200 px-5 text-sm font-bold text-[#1a1420] transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Search className="size-4" />
                    {t("runCheck")}
                  </button>
                </div>

                {checkedCity && (
                  <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                    <CityLineResults
                      city={checkedCity}
                      planetLines={planetLines}
                    />
                    <button
                      type="button"
                      onClick={askAboutCity}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90"
                    >
                      <Sparkles className="size-4" />
                      {t("askAI")}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid gap-3 overflow-visible p-3 md:grid-cols-[352px_minmax(0,1fr)] md:gap-5 md:p-5">
                <div className="rounded-2xl border border-amber-200/20 bg-black/20 p-3 md:p-4">
                  {suggestedCompareCities.length > 0 && (
                    <div className="mb-3">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/85">
                        {t("suggestedNearTitle")}
                      </div>
                      <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                        {t("suggestedNearHint")}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        {suggestedCompareCities.map((city) => {
                          const disabled = hasReachedCompareLimit;
                          return (
                            <button
                              key={cityKey(city)}
                              type="button"
                              disabled={disabled}
                              onClick={() => appendCompareCity(city)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-amber-200/25 bg-amber-200/10 px-3 py-1.5 text-xs font-semibold text-amber-50 transition hover:border-amber-200/50 hover:bg-amber-200/20 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus className="size-3.5 opacity-80" />
                              {city.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <LocationAutocomplete
                        value={compareQuery}
                        onChange={(value) => {
                          setCompareQuery(value);
                          setPendingCompareCity(null);
                        }}
                        onSelect={addCompareCity}
                        placeholder={t("searchPlaceholder")}
                        disabled={hasReachedCompareLimit}
                        className="h-10 rounded-full border-white/15 bg-black/35 px-4 text-xs text-white placeholder:text-white/35"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={
                        !pendingCompareCity || hasReachedCompareLimit
                      }
                      onClick={commitCompareCity}
                      className="flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-amber-200/70 px-4 text-xs font-bold text-[#1a1420] hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <Plus className="size-3.5" />
                      {t("addCity")}
                    </button>
                  </div>
                  <div className="mt-2 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[11px] leading-relaxed text-white/50">
                    {t("limitNote", { count: maxCompareCities })}
                    {userState === "anonymous" && (
                      <button
                        type="button"
                        onClick={() => {
                          cityToolEvents.limitReached(maxCompareCities, userState);
                          requestLogin();
                        }}
                        className="ml-1 font-semibold text-amber-200 underline decoration-amber-200/40 underline-offset-2 hover:text-amber-100"
                      >
                        {t("signInForMore")}
                      </button>
                    )}
                  </div>
                  {hasReachedCompareLimit && (
                    <div className="mt-2 rounded-xl border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-[11px] font-medium text-amber-100">
                      {t("limitReached", { count: maxCompareCities })}
                    </div>
                  )}

                  {compareCities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {compareCities.map((city) => (
                        <div
                          key={cityKey(city)}
                          className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1.5 pl-3 pr-1.5 text-xs text-white"
                        >
                          <span>{city.name}</span>
                          <button
                            type="button"
                            aria-label={t("removeCity", { city: city.name })}
                            onClick={() => {
                              cityToolEvents.cityRemoved(
                                Math.max(0, compareCities.length - 1)
                              );
                              setCompareCities((current) =>
                                current.filter(
                                  (item) =>
                                    cityKey(item) !== cityKey(city)
                                )
                              );
                              setComparisonReady(false);
                            }}
                            className="rounded-full p-1 text-white/45 hover:bg-white/10 hover:text-red-300"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-amber-200">
                    {t("goalTitle")}
                  </div>
                  <div className="mt-2 space-y-2">
                    {comparisonGoals.map((goal) => (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => {
                          setComparisonGoal(goal);
                          setComparisonReady(false);
                          cityToolEvents.goalChanged(goal);
                        }}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          comparisonGoal === goal
                            ? "border-amber-200/60 bg-amber-200/10"
                            : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"
                        }`}
                      >
                        <div className="text-xs font-bold text-white">
                          {t(`goals.${goal}.title` as never)}
                        </div>
                        <div className="mt-1 text-[11px] text-white/55">
                          {t(`goals.${goal}.description` as never)}
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={compareCities.length < 2}
                    onClick={runComparison}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-300/80 via-purple-500 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <GitCompareArrows className="size-4" />
                    {t("compareNow")}
                  </button>
                  <p className="mt-3 text-[10px] leading-relaxed text-white/45">
                    {t("evidenceNotice")}
                  </p>
                </div>

                <div className="rounded-2xl border border-dashed border-amber-200/20 bg-white/[0.025] p-3 md:min-h-[470px] md:p-4">
                  {!comparisonReady ? (
                    <div className="flex min-h-[220px] flex-col items-center justify-center px-4 text-center md:min-h-[438px] md:px-6">
                      <GitCompareArrows className="size-7 text-amber-200/60" />
                      <h3 className="mt-4 text-sm font-bold text-white">
                        {t("selectAtLeastTwo")}
                      </h3>
                      <p className="mt-2 max-w-md text-xs leading-relaxed text-white/50">
                        {t("evidenceNotice")}
                      </p>
                    </div>
                  ) : (
                    <div
                      ref={comparisonResultsRef}
                      className="scroll-mt-4 pb-28 md:pb-0"
                    >
                      <div className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">
                        {t("resultsTitle")}
                      </div>
                      <div className="mt-3 rounded-2xl border border-purple-300/15 bg-gradient-to-br from-purple-500/10 to-amber-200/5 p-4">
                        <div className="text-sm font-bold text-white">
                          {t("comparisonSummary", {
                            city: comparisonResults[0]?.city.name ?? "",
                            goal: t(
                              `goals.${comparisonGoal}.title` as never
                            ),
                          })}
                        </div>
                        <p className="mt-1.5 text-xs leading-relaxed text-white/55">
                          {t("rankingDisclaimer")}
                        </p>
                      </div>
                      <div className="mt-3 grid gap-3 lg:grid-cols-2">
                        {comparisonResults.map(
                          ({ city, evidence, score }, index) => {
                            const primary = evidence[0];
                            const primaryMeaning = primary
                              ? getLineMeaning(
                                  primary.line.planet,
                                  primary.line.type,
                                  translate
                                )
                              : null;
                            const fitScore = fitScoreFromRawScore(
                              score,
                              evidence.length
                            );
                            const status = scoreStatus(fitScore);
                            const resultKey = cityKey(city);
                            const isExpanded =
                              expandedResultKeys.has(resultKey);
                            const bestForText = primaryMeaning
                              ? t("bestForValue", {
                                  themes: primaryMeaning.themes,
                                })
                              : t(`bestFor.${comparisonGoal}` as never);

                            return (
                            <div
                              key={resultKey}
                              className="rounded-xl border border-white/10 bg-black/25 p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-sm font-bold text-white">
                                    {index + 1}. {city.name}
                                  </div>
                                  <div className="text-[11px] text-white/45">
                                    {city.country}
                                  </div>
                                </div>
                                <div className="shrink-0 text-right">
                                  <div
                                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                                      status === "support"
                                        ? "bg-emerald-400/15 text-emerald-300"
                                        : status === "mixed"
                                          ? "bg-amber-300/15 text-amber-200"
                                          : "bg-rose-400/15 text-rose-300"
                                    }`}
                                  >
                                    {t(status)}
                                  </div>
                                  <div className="mt-1 text-[10px] font-semibold text-white/45">
                                    {fitScore}/100
                                  </div>
                                </div>
                              </div>

                              {/* Mobile collapsed summary */}
                              <div
                                className={`mt-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 md:hidden ${
                                  isExpanded ? "hidden" : "block"
                                }`}
                              >
                                <div className="text-[9px] font-bold uppercase tracking-wider text-white/35">
                                  {t("bestForLabel")}
                                </div>
                                <div className="mt-1 text-xs font-semibold leading-snug text-white/80">
                                  {bestForText}
                                </div>
                              </div>

                              {/* Full details: always on desktop, expanded on mobile */}
                              <div
                                className={
                                  isExpanded ? "block" : "hidden md:block"
                                }
                              >
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                                  <div className="text-[9px] font-bold uppercase tracking-wider text-white/35">
                                    {t("scoreLabel")}
                                  </div>
                                  <div className="mt-1 text-lg font-black text-white">
                                    {fitScore}
                                    <span className="text-xs font-semibold text-white/35">
                                      /100
                                    </span>
                                  </div>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.035] p-3">
                                  <div className="text-[9px] font-bold uppercase tracking-wider text-white/35">
                                    {t("bestForLabel")}
                                  </div>
                                  <div className="mt-1 text-xs font-semibold leading-snug text-white/80">
                                    {bestForText}
                                  </div>
                                </div>
                              </div>
                              {primary && primaryMeaning ? (
                                <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.035] p-3">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-white/40">
                                    {t("keySignal")}
                                  </div>
                                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                                    <span className="flex min-w-0 items-center gap-2 font-semibold text-white/85">
                                      <span
                                        className="size-2 shrink-0 rounded-full"
                                        style={{
                                          backgroundColor: primary.line.color,
                                        }}
                                      />
                                      <span className="truncate">
                                        {primaryMeaning.planetName}{" "}
                                        {lineTypeLabel(primary.line.type)}
                                      </span>
                                    </span>
                                    <span className="shrink-0 text-white/45">
                                      {Math.round(primary.distanceKm)} km
                                    </span>
                                  </div>
                                  <p className="mt-2 text-[11px] leading-relaxed text-white/55">
                                    {primaryMeaning.themes}
                                  </p>
                                </div>
                              ) : (
                                <p className="mt-3 text-xs text-white/45">
                                  {t("noEvidence")}
                                </p>
                              )}
                              <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-white/45">
                                <span>{t(`statusHints.${status}` as never)}</span>
                                {evidence.length > 1 && (
                                  <span className="shrink-0 text-purple-300">
                                    {t("moreSignals", {
                                      count: evidence.length - 1,
                                    })}
                                  </span>
                                )}
                              </div>
                              <div className="mt-3 grid gap-2">
                                <div className="rounded-xl border border-amber-200/15 bg-amber-200/[0.055] p-3">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-amber-200/80">
                                    {t("watchOutLabel")}
                                  </div>
                                  <p className="mt-1 text-[11px] leading-relaxed text-white/58">
                                    {t(`watchOut.${status}` as never)}
                                  </p>
                                </div>
                                <div className="rounded-xl border border-purple-300/15 bg-purple-400/[0.055] p-3">
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-purple-200/80">
                                    {t("recommendationLabel")}
                                  </div>
                                  <p className="mt-1 text-[11px] leading-relaxed text-white/62">
                                    {t(`recommendations.${status}` as never)}
                                  </p>
                                </div>
                              </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleResultExpanded(resultKey)}
                                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold text-white/70 transition hover:bg-white/[0.08] hover:text-white md:hidden"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="size-3.5" />
                                    {t("hideDetails")}
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="size-3.5" />
                                    {t("showDetails")}
                                  </>
                                )}
                              </button>
                            </div>
                            );
                          }
                        )}
                      </div>

                      <div
                        ref={fullReportRef}
                        id="city-comparison-full-report"
                        className="mt-4 scroll-mt-4 rounded-2xl border border-purple-300/15 bg-purple-400/[0.045] p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-purple-400/10 text-purple-300">
                            <Lock className="size-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-bold text-white">
                                {t("fullReport.title")}
                              </div>
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/20 bg-amber-200/10 px-2 py-0.5 text-[10px] font-bold text-amber-100">
                                <Coins className="size-3" />
                                {t("fullReport.creditBadge", {
                                  credits: CITY_COMPARISON_REPORT_CREDITS,
                                })}
                              </span>
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-white/50">
                              {t("fullReport.description")}
                            </p>
                          </div>
                        </div>
                        <div className="relative mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/25 p-3">
                          {reportStatus === "success" ? (
                            <div className="space-y-3">
                              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-200">
                                {t("fullReport.readyTitle")}
                              </div>
                              <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap pr-2 text-xs leading-relaxed text-white/72">
                                {reportText}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="space-y-2 text-[11px] leading-relaxed text-white/65">
                                <p className="font-semibold text-white">
                                  {t("fullReport.previewIntro")}
                                </p>
                                <ul className="space-y-1">
                                  <li>{t("fullReport.previewItems.ranking")}</li>
                                  <li>{t("fullReport.previewItems.tradeoffs")}</li>
                                  <li>{t("fullReport.previewItems.lifeAreas")}</li>
                                </ul>
                              </div>
                              <div
                                className={`pointer-events-none mt-3 space-y-2 ${
                                  reportStatus === "loading" ? "animate-pulse" : "blur-[2px]"
                                }`}
                              >
                                <div className="h-2 rounded-full bg-white/20" />
                                <div className="h-2 w-5/6 rounded-full bg-white/15" />
                                <div className="h-2 w-3/4 rounded-full bg-white/10" />
                              </div>
                              {reportStatus === "error" && (
                                <p className="mt-3 rounded-lg border border-rose-300/20 bg-rose-500/10 px-3 py-2 text-[11px] leading-relaxed text-rose-100">
                                  {reportError || t("fullReport.genericError")}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                        {reportStatus === "success" ? (
                          <button
                            type="button"
                            onClick={downloadFullComparisonReport}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-purple-400 px-4 py-3 text-sm font-bold text-[#0d1320] shadow-lg hover:opacity-95"
                          >
                            <Download className="size-4" />
                            {t("fullReport.downloadCTA")}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={unlockFullComparisonReport}
                            disabled={reportStatus === "loading"}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-pink-500 to-purple-600 px-4 py-3 text-sm font-bold text-[#180d1e] shadow-lg hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            <Sparkles
                              className={`size-4 ${
                                reportStatus === "loading" ? "animate-spin" : ""
                              }`}
                            />
                            {unlockButtonLabel}
                          </button>
                        )}
                      </div>

                      <div className="mt-4 space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-200">
                          {t("askHooksTitle")}
                        </div>
                        {comparisonResults.length >= 2 &&
                          [
                            t("askHooks.whyFirst", {
                              city: comparisonResults[0].city.name,
                            }),
                            t("askHooks.keyDifference", {
                              first: comparisonResults[0].city.name,
                              second: comparisonResults[1].city.name,
                            }),
                          ].map((question) => (
                            <button
                              key={question}
                              type="button"
                              onClick={() => compareWithAI(question)}
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2.5 text-left text-xs text-white/70 transition-colors hover:border-purple-300/30 hover:bg-purple-400/10 hover:text-white"
                            >
                              <span>{question}</span>
                              <ArrowRight className="size-3.5 shrink-0 text-purple-300" />
                            </button>
                          ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => compareWithAI()}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 px-4 py-3 text-sm font-bold text-white hover:opacity-90"
                      >
                        <Sparkles className="size-4" />
                        {t("compareWithAI")}
                      </button>
                      <p className="mt-2 text-center text-[10px] leading-relaxed text-white/40">
                        {t("compareCTAHelp")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        {mode === "compare" && comparisonReady && (
          <div className="fixed inset-x-0 bottom-0 z-[1900] border-t border-white/10 bg-[#100c18]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.45)] backdrop-blur-md md:hidden">
            {reportStatus === "success" ? (
              <div className="mx-auto flex max-w-lg gap-2">
                <button
                  type="button"
                  onClick={scrollToFullReport}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-3 text-sm font-bold text-white"
                >
                  {t("fullReport.viewReadyCTA")}
                </button>
                <button
                  type="button"
                  onClick={downloadFullComparisonReport}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-300 via-cyan-300 to-purple-400 px-3 py-3 text-sm font-bold text-[#0d1320]"
                >
                  <Download className="size-4" />
                  {t("fullReport.downloadCTA")}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={scrollToFullReport}
                className="mx-auto flex w-full max-w-lg items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 via-pink-500 to-purple-600 px-4 py-3.5 text-sm font-bold text-[#180d1e] shadow-lg"
              >
                <ArrowRight className="size-4 rotate-90" />
                {reportStatus === "loading"
                  ? t("fullReport.generatingCTA")
                  : t("fullReport.stickyViewCTA")}
              </button>
            )}
          </div>
        )}
        </>
      ) : null}
        {pricingData && (
          <PricingModal
            open={showPricingModal}
            onOpenChange={setShowPricingModal}
            pricing={pricingData}
            preferredProductId="standard"
          />
        )}
    </>,
    document.body
  );
});

export default CityTools;
