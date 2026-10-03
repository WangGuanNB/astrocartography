"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import PricingModal from "@/components/pricing/pricing-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SynastryBiwheel from "@/components/synastry/synastry-biwheel";
import AstroChat from "@/components/astro-chat";
import { useAppContext } from "@/contexts/app";
import { synastryEvents, type SynastryUnlockEntry } from "@/lib/analytics";
import type { SynastryPayloadForAI } from "@/lib/astro-format";
import type {
  HeadlineAspect,
  OverlayHighlight,
  RelationshipSnapshot,
} from "@/lib/synastry-snapshot";
import { cn } from "@/lib/utils";
import type { Pricing as PricingType } from "@/types/blocks/pricing";
import {
  Calendar,
  Clock,
  Globe,
  Heart,
  Lock,
  MapPin,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { Link } from "@/i18n/navigation";

const SynastryDualMap = dynamic(() => import("@/components/synastry/synastry-dual-map"), { ssr: false });

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

type DeepReportLabels = {
  title: string;
  subtitle: string;
  unlock: string;
  unlocking: string;
  creditsBadge: string;
  includes: string[];
  guideBigThree: string;
  guideHeadlines: string;
  guideOverlay: string;
  stickyCta: string;
  loginRequired: string;
  genericError: string;
  prompt: string;
};

type SnapshotLabels = {
  attraction: Record<string, string>;
  emotional: Record<string, string>;
  communication: Record<string, string>;
  overall: Record<string, string>;
};

type ToolLabels = {
  form: {
    personA: string;
    personB: string;
    wheelAxisInner: string;
    wheelAxisOuter: string;
    biwheelFootnote: string;
    birthDate: string;
    birthTime: string;
    birthLocation: string;
    timezone: string;
    relocateLocation: string;
    submit: string;
  };
  tabs: { synastry: string; relocated: string; maps: string };
  result: {
    title: string;
    nonFatalisticNote?: string;
    timeAccuracyNote?: string;
    bigThreeTitle?: string;
    sun?: string;
    moon?: string;
    rising?: string;
    personYou?: string;
    personPartner?: string;
    snapshotTitle?: string;
    snapshotSubtitle?: string;
    snapshotAttraction?: string;
    snapshotEmotional?: string;
    snapshotCommunication?: string;
    snapshotOverall?: string;
    headlinesTitle?: string;
    headlinesSubtitle?: string;
    groupsTitle?: string;
    groupsHarmonious?: string;
    groupsChallenging?: string;
    groupsConjunctions?: string;
    groupsCount?: string;
    natalOverlayTitle?: string;
    natalOverlaySubtitle?: string;
    natalOverlayATitle?: string;
    natalOverlayBTitle?: string;
    overlayHighlightsTitle?: string;
    overlayHouseLabel?: string;
    overlayEmpty?: string;
    aspectsTitle: string;
    planetA: string;
    planetB: string;
    aspect: string;
    orb: string;
    relocatedEmptyHint: string;
    relocatedTitle: string;
    ascA: string;
    ascB: string;
    overlayATitle: string;
    overlayBTitle: string;
    planet: string;
    house: string;
    mapsTitle: string;
    mapsDesc: string;
    mapLinkA: string;
    mapLinkB: string;
    dualMapTitle: string;
    dualMapDesc: string;
    dualMapLegendSolid: string;
    dualMapLegendDashed: string;
    dualMapFootnote: string;
    aiTitle: string;
    aiButton: string;
    aiHint: string;
    footnote: string;
  };
  deepReport?: DeepReportLabels;
  snapshotLabels?: SnapshotLabels;
  aspectTemplates?: Record<string, string>;
  errors: { required: string; generic: string };
};

type BigThreeBlock = {
  sun: { sign: string; degree: number } | null;
  moon: { sign: string; degree: number } | null;
  rising: { sign: string; degree: number };
};

type ApiData = {
  personA: {
    birthData: {
      date: string;
      time: string;
      location: string;
      latitude: number;
      longitude: number;
      timezone: string;
    };
    ascendant: { sign: string; degree: number; longitude: number };
    planets: Array<{ name: string; glyph: string; longitude: number; sign: string; degree: number; house: number }>;
  };
  personB: {
    birthData: {
      date: string;
      time: string;
      location: string;
      latitude: number;
      longitude: number;
      timezone: string;
    };
    ascendant: { sign: string; degree: number; longitude: number };
    planets: Array<{ name: string; glyph: string; longitude: number; sign: string; degree: number; house: number }>;
  };
  aspects: Array<{ planetA: string; planetB: string; aspect: string; orb: number }>;
  relocated?: {
    location: string;
    latitude: number;
    longitude: number;
    ascendantA: { sign: string; degree: number };
    ascendantB: { sign: string; degree: number };
    aInB: Array<{ planet: string; glyph: string; houseInPartner: number }>;
    bInA: Array<{ planet: string; glyph: string; houseInPartner: number }>;
  };
  bigThreeA: BigThreeBlock;
  bigThreeB: BigThreeBlock;
  headlineAspects: HeadlineAspect[];
  aspectGroups: {
    harmonious: ApiData["aspects"];
    challenging: ApiData["aspects"];
    conjunctions: ApiData["aspects"];
  };
  relationshipSnapshot: RelationshipSnapshot;
  natalOverlay: {
    aInB: Array<{ planet: string; glyph: string; houseInPartner: number }>;
    bInA: Array<{ planet: string; glyph: string; houseInPartner: number }>;
    highlights: OverlayHighlight[];
  };
  birthTimeProvided: { personA: boolean; personB: boolean };
};

const FALLBACK_DEEP_REPORT: DeepReportLabels = {
  title: "Personalized synastry deep report",
  subtitle: "AI reads your chart skeleton and writes a structured relationship report.",
  unlock: "Unlock deep report",
  unlocking: "Writing your report…",
  creditsBadge: "{credits} credits",
  includes: [
    "Chemistry, emotional needs, communication, and long-term themes",
    "Natal house overlays",
    "Shared-city section only when you entered a city",
  ],
  guideBigThree: "See how your Big Three interact → deep report",
  guideHeadlines: "Full read of headline aspects → deep report",
  guideOverlay: "Understand house overlays → deep report",
  stickyCta: "Unlock deep report",
  loginRequired: "Sign in to unlock. Uses your existing plan credits.",
  genericError: "Could not generate the report. Please try again shortly.",
  prompt:
    "Write my personalized synastry deep report based on the two-chart skeleton provided. Balanced, non-fatalistic tone. No compatibility score.",
};

function formatDeg(degree: number) {
  return `${degree.toFixed(1)}°`;
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

function buildSynastryPayloadForAI(d: ApiData): SynastryPayloadForAI {
  return {
    personA: {
      birthData: {
        date: d.personA.birthData.date,
        time: d.personA.birthData.time,
        location: d.personA.birthData.location,
        timezone: d.personA.birthData.timezone,
        latitude: d.personA.birthData.latitude,
        longitude: d.personA.birthData.longitude,
      },
      ascendant: { sign: d.personA.ascendant.sign, degree: d.personA.ascendant.degree },
      planets: d.personA.planets.map((p) => ({ name: p.name, sign: p.sign, house: p.house })),
      bigThree: d.bigThreeA,
    },
    personB: {
      birthData: {
        date: d.personB.birthData.date,
        time: d.personB.birthData.time,
        location: d.personB.birthData.location,
        timezone: d.personB.birthData.timezone,
        latitude: d.personB.birthData.latitude,
        longitude: d.personB.birthData.longitude,
      },
      ascendant: { sign: d.personB.ascendant.sign, degree: d.personB.ascendant.degree },
      planets: d.personB.planets.map((p) => ({ name: p.name, sign: p.sign, house: p.house })),
      bigThree: d.bigThreeB,
    },
    aspects: d.aspects,
    headlineAspects: d.headlineAspects,
    relationshipSnapshot: d.relationshipSnapshot,
    natalOverlay: {
      aInB: d.natalOverlay.aInB.map(({ planet, houseInPartner }) => ({ planet, houseInPartner })),
      bInA: d.natalOverlay.bInA.map(({ planet, houseInPartner }) => ({ planet, houseInPartner })),
      highlights: d.natalOverlay.highlights,
    },
    relocated: d.relocated
      ? {
          location: d.relocated.location,
          ascendantA: d.relocated.ascendantA,
          ascendantB: d.relocated.ascendantB,
          aInB: d.relocated.aInB.map(({ planet, houseInPartner }) => ({ planet, houseInPartner })),
          bInA: d.relocated.bInA.map(({ planet, houseInPartner }) => ({ planet, houseInPartner })),
        }
      : undefined,
    birthTimeProvided: d.birthTimeProvided,
  };
}

function toMapBirthPayload(b: ApiData["personA"]["birthData"]) {
  return {
    birthDate: b.date,
    birthTime: b.time,
    birthLocation: b.location,
    timezone: b.timezone,
    latitude: b.latitude,
    longitude: b.longitude,
  };
}

function aspectBlurb(
  row: HeadlineAspect,
  templates: Record<string, string> | undefined
): string {
  const template =
    templates?.[row.pairKey] ?? templates?.["_default"] ?? "{planetA} {aspect} {planetB}";
  return template
    .replace(/\{planetA\}/g, row.planetA)
    .replace(/\{planetB\}/g, row.planetB)
    .replace(/\{aspect\}/g, row.aspect);
}

function toneClass(tone: HeadlineAspect["tone"]) {
  if (tone === "harmonious") return "border-emerald-500/30 bg-emerald-500/5";
  if (tone === "challenging") return "border-orange-500/30 bg-orange-500/5";
  return "border-purple-500/30 bg-purple-500/5";
}

export default function SynastryChartCalculatorClient({ tool }: { tool: ToolLabels }) {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const { user, setShowSignModal } = useAppContext();
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const deepReportRef = useRef<HTMLDivElement | null>(null);
  const unlockButtonRef = useRef<HTMLButtonElement | null>(null);
  const unlockEntryRef = useRef<SynastryUnlockEntry | null>(null);

  const deepReport = tool.deepReport ?? FALLBACK_DEEP_REPORT;
  const r = tool.result;

  const [chatOpen, setChatOpen] = useState(false);
  const [autoSendQuestion, setAutoSendQuestion] = useState<string | null>(null);
  const [autoSendQuestionKey, setAutoSendQuestionKey] = useState(0);

  const [aDate, setADate] = useState("");
  const [aTime, setATime] = useState("");
  const [aLoc, setALoc] = useState("");
  const [aTz, setATz] = useState(TIMEZONE_OPTIONS[0]);
  const [aCoords, setACoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [bDate, setBDate] = useState("");
  const [bTime, setBTime] = useState("");
  const [bLoc, setBLoc] = useState("");
  const [bTz, setBTz] = useState(TIMEZONE_OPTIONS[0]);
  const [bCoords, setBCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const [relocateLocation, setRelocateLocation] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiData | null>(null);

  const [reportStatus, setReportStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [reportText, setReportText] = useState("");
  const [reportError, setReportError] = useState("");
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingData, setPricingData] = useState<PricingType | null>(null);
  const [showStickyUnlock, setShowStickyUnlock] = useState(false);

  const prefix = locale === "en" ? "" : `/${locale}`;

  useEffect(() => {
    if (!data) return;
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const t = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [data]);

  useEffect(() => {
    if (!data || reportStatus === "ready") {
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
  }, [data, reportStatus]);

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

  function navigateToUnlock(entry: SynastryUnlockEntry) {
    unlockEntryRef.current = entry;
    synastryEvents.guideClicked(entry);
    scrollToDeepReport();
  }

  function resolveUnlockEntry(): SynastryUnlockEntry {
    return unlockEntryRef.current ?? "main";
  }

  const canSubmit =
    Boolean(aDate && aLoc?.trim() && aTz && bDate && bLoc?.trim() && bTz) && !loading;

  async function openPricingForCredits(entry: SynastryUnlockEntry) {
    try {
      if (!pricingData) {
        const response = await fetch(`/api/get-pricing?locale=${locale}&source=research`);
        const json = await response.json();
        if (json.success && json.pricing) {
          setPricingData(json.pricing);
        } else {
          throw new Error("pricing unavailable");
        }
      }
      synastryEvents.pricingModalOpened(entry);
      setShowPricingModal(true);
    } catch {
      setReportError(deepReport.genericError);
      setReportStatus("error");
    }
  }

  async function handleSubmit() {
    if (!canSubmit) {
      setError(tool.errors.required);
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    setReportStatus("idle");
    setReportText("");
    setReportError("");
    unlockEntryRef.current = null;
    try {
      const payload: Record<string, unknown> = {
        personA: {
          birthDate: aDate,
          birthTime: aTime || undefined,
          birthLocation: aLoc.trim(),
          timezone: aTz,
        },
        personB: {
          birthDate: bDate,
          birthTime: bTime || undefined,
          birthLocation: bLoc.trim(),
          timezone: bTz,
        },
      };
      if (aCoords) {
        (payload.personA as Record<string, unknown>).latitude = aCoords.latitude;
        (payload.personA as Record<string, unknown>).longitude = aCoords.longitude;
      }
      if (bCoords) {
        (payload.personB as Record<string, unknown>).latitude = bCoords.latitude;
        (payload.personB as Record<string, unknown>).longitude = bCoords.longitude;
      }
      if (relocateLocation.trim()) payload.relocateLocation = relocateLocation.trim();

      const res = await fetch("/api/calculate-synastry-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { success: boolean; error?: string; data?: ApiData };
      if (!json.success || !json.data) {
        setError(json.error || tool.errors.generic);
        return;
      }
      setData(json.data);
    } catch {
      setError(tool.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  async function unlockDeepReport() {
    if (!data) return;
    const entry = resolveUnlockEntry();
    if (!user) {
      synastryEvents.reportLoginGate(entry);
      setShowSignModal(true);
      return;
    }
    if (reportStatus === "loading") return;

    synastryEvents.reportUnlockClicked(entry, DEEP_REPORT_CREDITS);
    setReportStatus("loading");
    setReportText("");
    setReportError("");

    const synastryPayload = buildSynastryPayloadForAI(data);

    try {
      const response = await fetch("/api/astro-chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          messages: [{ role: "user", content: deepReport.prompt }],
          chartData: {
            birthData: {
              date: data.personA.birthData.date,
              time: data.personA.birthData.time,
              location: data.personA.birthData.location,
              timezone: data.personA.birthData.timezone,
            },
            planetLines: [],
          },
          synastryData: synastryPayload,
          requestType: "synastry_deep_report",
          userLocale: locale,
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        if (response.status === 401 || errorPayload?.type === "auth_required") {
          synastryEvents.reportFailed(entry, "auth_required");
          setShowSignModal(true);
          setReportStatus("idle");
          return;
        }
        if (response.status === 402 || errorPayload?.type === "insufficient_credits") {
          synastryEvents.reportFailed(entry, "insufficient_credits");
          setReportStatus("idle");
          setReportError("");
          await openPricingForCredits(entry);
          return;
        }
        synastryEvents.reportFailed(entry, "generation_error");
        setReportStatus("error");
        setReportError(errorPayload?.message || deepReport.genericError);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error(deepReport.genericError);
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
        synastryEvents.reportFailed(entry, "empty_response");
        setReportStatus("error");
        setReportError(deepReport.genericError);
        return;
      }

      synastryEvents.reportSuccess(entry, DEEP_REPORT_CREDITS);
      unlockEntryRef.current = null;
      setReportStatus("ready");
      window.setTimeout(() => {
        deepReportRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    } catch {
      synastryEvents.reportFailed(resolveUnlockEntry(), "generation_error");
      setReportStatus("error");
      setReportError(deepReport.genericError);
    }
  }

  const mapUrl = (birth: ApiData["personA"]["birthData"]) =>
    `${prefix}/chart?${new URLSearchParams({
      birthDate: birth.date,
      birthTime: birth.time,
      birthLocation: birth.location,
      timezone: birth.timezone,
      latitude: String(birth.latitude),
      longitude: String(birth.longitude),
    }).toString()}`;

  const synastryForAI = useMemo(() => (data ? buildSynastryPayloadForAI(data) : null), [data]);

  const astroChatChartData = useMemo(() => {
    if (!data) return null;
    return {
      birthData: {
        date: data.personA.birthData.date,
        time: data.personA.birthData.time,
        location: data.personA.birthData.location,
        timezone: data.personA.birthData.timezone,
        latitude: data.personA.birthData.latitude,
        longitude: data.personA.birthData.longitude,
      },
      planetLines: [] as {
        planet: string;
        type: "AS" | "DS" | "MC" | "IC";
        coordinates: [number, number][];
        color: string;
      }[],
    };
  }, [data]);

  const openSynastryAI = useCallback(() => {
    if (!user) {
      setShowSignModal(true);
      return;
    }
    setAutoSendQuestion(
      "Please interpret our synastry from the data provided. Start with Sun–Moon and Venus–Mars (if present), note one growth area from Saturn or challenging aspects, and keep a balanced, non-fatalistic tone."
    );
    setAutoSendQuestionKey((k) => k + 1);
    setChatOpen(true);
  }, [user, setShowSignModal]);

  const snapshotLabels = tool.snapshotLabels;
  const showTimeNote =
    data && (!data.birthTimeProvided.personA || !data.birthTimeProvided.personB);

  function renderBigThreeCell(label: string, placement: { sign: string; degree: number } | null) {
    return (
      <div className="text-sm">
        <div className="text-purple-300">{label}</div>
        <div className="mt-0.5 font-medium text-white">
          {placement ? `${placement.sign} ${formatDeg(placement.degree)}` : "—"}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("container max-w-4xl px-4 pb-16", showStickyUnlock && "pb-28")}>
      <div className="mx-auto max-w-3xl space-y-8">
        <Card className="shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-visible">
          <CardContent className="p-6 md:p-8 space-y-8">
            {[
              { id: "a" as const, label: tool.form.personA, icon: Users, color: "text-purple-300" },
              { id: "b" as const, label: tool.form.personB, icon: Heart, color: "text-cyan-300" },
            ].map((block) => (
              <div key={block.id} className="space-y-4">
                <h2 className={`flex items-center gap-2 text-lg font-bold ${block.color}`}>
                  <block.icon className="h-5 w-5" />
                  {block.label}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-purple-200">
                      <Calendar className="h-4 w-4" />
                      {tool.form.birthDate}
                    </label>
                    <DatePicker
                      value={block.id === "a" ? aDate : bDate}
                      onChange={block.id === "a" ? setADate : setBDate}
                      placeholder="YYYY-MM-DD"
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2 text-sm font-semibold text-purple-200">
                      <Clock className="h-4 w-4" />
                      {tool.form.birthTime}
                    </label>
                    <Input
                      type="time"
                      value={block.id === "a" ? aTime : bTime}
                      onChange={(e) => (block.id === "a" ? setATime : setBTime)(e.target.value)}
                      className="bg-white/10 border-white/20"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-purple-200">
                    <Globe className="h-4 w-4" />
                    {tool.form.birthLocation}
                  </label>
                  <LocationAutocomplete
                    value={block.id === "a" ? aLoc : bLoc}
                    onChange={(value) => {
                      (block.id === "a" ? setALoc : setBLoc)(value);
                      if (!value) (block.id === "a" ? setACoords : setBCoords)(null);
                    }}
                    onSelect={(result) => (block.id === "a" ? setACoords : setBCoords)(result.coordinates)}
                    placeholder="City, Country"
                    className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-purple-200">
                    <Globe className="h-4 w-4" />
                    {tool.form.timezone}
                  </label>
                  <select
                    className="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white"
                    value={block.id === "a" ? aTz : bTz}
                    onChange={(e) => (block.id === "a" ? setATz : setBTz)(e.target.value)}
                  >
                    {TIMEZONE_OPTIONS.map((tz) => (
                      <option key={tz} value={tz} className="bg-zinc-900">
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}

            <div className="space-y-1.5 border-t border-white/10 pt-6">
              <label className="flex items-center gap-2 text-sm font-semibold text-amber-200/90">
                <MapPin className="h-4 w-4" />
                {tool.form.relocateLocation}
              </label>
              <LocationAutocomplete
                value={relocateLocation}
                onChange={setRelocateLocation}
                placeholder="e.g. Paris, France"
                className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <Button
              type="button"
              size="lg"
              className="w-full gap-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500"
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              <Sparkles className="h-4 w-4" />
              {loading ? "…" : tool.form.submit}
            </Button>
          </CardContent>
        </Card>

        {data && (
          <div ref={resultsRef} className="space-y-6">
            <Card className="shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <CardContent className="p-6 md:p-8 space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-white text-center">{r.title}</h2>
                  {r.nonFatalisticNote && (
                    <p className="mt-3 text-sm text-amber-200/85 text-center max-w-2xl mx-auto">
                      {r.nonFatalisticNote}
                    </p>
                  )}
                  {showTimeNote && r.timeAccuracyNote && (
                    <p className="mt-2 text-sm text-orange-200/80 text-center max-w-2xl mx-auto">
                      {r.timeAccuracyNote}
                    </p>
                  )}
                </div>

                {r.bigThreeTitle && (
                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-base font-semibold text-white">{r.bigThreeTitle}</h3>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-purple-500/25 bg-purple-950/20 p-4 space-y-3">
                        <div className="text-sm font-semibold text-purple-300">
                          {r.personYou ?? tool.form.personA}
                        </div>
                        {renderBigThreeCell(r.sun ?? "Sun", data.bigThreeA.sun)}
                        {renderBigThreeCell(r.moon ?? "Moon", data.bigThreeA.moon)}
                        {renderBigThreeCell(r.rising ?? "Rising", data.bigThreeA.rising)}
                      </div>
                      <div className="rounded-lg border border-cyan-500/25 bg-cyan-950/20 p-4 space-y-3">
                        <div className="text-sm font-semibold text-cyan-300">
                          {r.personPartner ?? tool.form.personB}
                        </div>
                        {renderBigThreeCell(r.sun ?? "Sun", data.bigThreeB.sun)}
                        {renderBigThreeCell(r.moon ?? "Moon", data.bigThreeB.moon)}
                        {renderBigThreeCell(r.rising ?? "Rising", data.bigThreeB.rising)}
                      </div>
                    </div>
                    {reportStatus !== "ready" && (
                      <DeepGuideLink
                        label={deepReport.guideBigThree}
                        onClick={() => navigateToUnlock("guide_big_three")}
                      />
                    )}
                  </div>
                )}

                {r.snapshotTitle && snapshotLabels && (
                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-base font-semibold text-white">{r.snapshotTitle}</h3>
                    {r.snapshotSubtitle && (
                      <p className="mt-1 text-sm text-white/60">{r.snapshotSubtitle}</p>
                    )}
                    <ul className="mt-4 space-y-2 text-sm">
                      {[
                        [r.snapshotAttraction, "attraction", data.relationshipSnapshot.attraction],
                        [r.snapshotEmotional, "emotional", data.relationshipSnapshot.emotional],
                        [
                          r.snapshotCommunication,
                          "communication",
                          data.relationshipSnapshot.communication,
                        ],
                      ].map(([label, key, value]) => (
                        <li
                          key={key}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                        >
                          <span className="text-purple-300">{label}</span>
                          <span className="font-medium text-white">
                            {snapshotLabels[key as keyof SnapshotLabels]?.[value as string] ?? value}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-sm text-white/80">
                      <span className="text-amber-200/90">{r.snapshotOverall}: </span>
                      <span className="font-semibold">
                        {snapshotLabels.overall[data.relationshipSnapshot.overall] ??
                          data.relationshipSnapshot.overall}
                      </span>
                    </p>
                  </div>
                )}

                {r.headlinesTitle && data.headlineAspects.length > 0 && (
                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-base font-semibold text-white">{r.headlinesTitle}</h3>
                    {r.headlinesSubtitle && (
                      <p className="mt-1 text-sm text-white/60">{r.headlinesSubtitle}</p>
                    )}
                    <ul className="mt-4 space-y-3">
                      {data.headlineAspects.map((row) => (
                        <li
                          key={`${row.planetA}-${row.aspect}-${row.planetB}`}
                          className={cn("rounded-lg border px-3 py-3 text-sm", toneClass(row.tone))}
                        >
                          <div className="font-medium text-white">
                            {row.planetA} {row.aspect} {row.planetB}
                            <span className="ml-2 text-xs text-white/50">({row.orb}°)</span>
                          </div>
                          <p className="mt-1.5 text-white/75">
                            {aspectBlurb(row, tool.aspectTemplates)}
                          </p>
                        </li>
                      ))}
                    </ul>
                    {reportStatus !== "ready" && (
                      <DeepGuideLink
                        label={deepReport.guideHeadlines}
                        onClick={() => navigateToUnlock("guide_headlines")}
                      />
                    )}
                  </div>
                )}

                {r.groupsTitle && (
                  <div className="border-t border-white/10 pt-6">
                    <h3 className="text-base font-semibold text-white">{r.groupsTitle}</h3>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      {(
                        [
                          {
                            title: r.groupsHarmonious,
                            items: data.aspectGroups.harmonious,
                            color: "text-emerald-300",
                          },
                          {
                            title: r.groupsChallenging,
                            items: data.aspectGroups.challenging,
                            color: "text-orange-300",
                          },
                          {
                            title: r.groupsConjunctions,
                            items: data.aspectGroups.conjunctions,
                            color: "text-purple-300",
                          },
                        ] as const
                      ).map((group) => (
                        <div
                          key={group.title}
                          className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
                        >
                          <div className={cn("font-semibold", group.color)}>{group.title}</div>
                          <div className="mt-1 text-white/70">
                            {(r.groupsCount ?? "{count} contacts").replace(
                              "{count}",
                              String(group.items.length)
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {r.natalOverlayTitle && (
                  <div className="border-t border-white/10 pt-6 space-y-4">
                    <div>
                      <h3 className="text-base font-semibold text-white">{r.natalOverlayTitle}</h3>
                      {r.natalOverlaySubtitle && (
                        <p className="mt-1 text-sm text-white/60">{r.natalOverlaySubtitle}</p>
                      )}
                    </div>
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <h4 className="text-sm font-semibold text-purple-300 mb-2">
                          {r.natalOverlayATitle}
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-white/10 max-h-48 overflow-y-auto">
                          <table className="w-full text-xs">
                            <tbody>
                              {data.natalOverlay.aInB.map((row) => (
                                <tr key={row.planet} className="border-b border-white/5">
                                  <td className="p-2">{row.glyph} {row.planet}</td>
                                  <td className="p-2 text-right">{row.houseInPartner}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-cyan-300 mb-2">
                          {r.natalOverlayBTitle}
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-white/10 max-h-48 overflow-y-auto">
                          <table className="w-full text-xs">
                            <tbody>
                              {data.natalOverlay.bInA.map((row) => (
                                <tr key={row.planet} className="border-b border-white/5">
                                  <td className="p-2">{row.glyph} {row.planet}</td>
                                  <td className="p-2 text-right">{row.houseInPartner}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    {r.overlayHighlightsTitle && (
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">
                          {r.overlayHighlightsTitle}
                        </h4>
                        <ul className="grid gap-2 sm:grid-cols-2">
                          {data.natalOverlay.highlights.map((h) => {
                            const hasPlanets =
                              h.planetsAInB.length > 0 || h.planetsBInA.length > 0;
                            return (
                              <li
                                key={h.house}
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs"
                              >
                                <div className="font-semibold text-amber-200/90">
                                  {(r.overlayHouseLabel ?? "House {house}").replace(
                                    "{house}",
                                    String(h.house)
                                  )}
                                </div>
                                {hasPlanets ? (
                                  <div className="mt-1 text-white/75 space-y-0.5">
                                    {h.planetsAInB.length > 0 && (
                                      <div>
                                        {r.personYou ?? "You"}: {h.planetsAInB.join(", ")}
                                      </div>
                                    )}
                                    {h.planetsBInA.length > 0 && (
                                      <div>
                                        {r.personPartner ?? "Partner"}: {h.planetsBInA.join(", ")}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mt-1 text-white/50">{r.overlayEmpty}</div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {reportStatus !== "ready" && (
                      <DeepGuideLink
                        label={deepReport.guideOverlay}
                        onClick={() => navigateToUnlock("guide_overlay")}
                      />
                    )}
                  </div>
                )}

                <div
                  id="synastry-deep-report"
                  ref={deepReportRef}
                  className="border-t border-white/10 pt-6 space-y-4 scroll-mt-24"
                >
                  <div>
                    <h3 className="text-base font-semibold text-white">{deepReport.title}</h3>
                    <p className="mt-1 text-sm text-white/60">{deepReport.subtitle}</p>
                    <ul className="mt-3 space-y-1.5 text-sm text-white/80">
                      {deepReport.includes.map((item) => (
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
                          {deepReport.unlocking}
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 size-4" />
                          {deepReport.unlock}
                          <span className="ml-2 rounded-full bg-black/20 px-2 py-0.5 text-xs">
                            {deepReport.creditsBadge.replace(
                              "{credits}",
                              String(DEEP_REPORT_CREDITS)
                            )}
                          </span>
                        </>
                      )}
                    </Button>
                  )}

                  {!user && reportStatus === "idle" && (
                    <p className="text-xs text-white/50">{deepReport.loginRequired}</p>
                  )}

                  {reportStatus === "error" && reportError && (
                    <p className="text-sm text-red-300">⚠️ {reportError}</p>
                  )}

                  {reportText && (
                    <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-sm leading-relaxed text-white/90 whitespace-pre-wrap">
                      {reportText}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="synastry" className="w-full">
              <TabsList className="mx-auto flex w-full max-w-lg flex-wrap justify-center gap-1 h-auto py-1">
                <TabsTrigger value="synastry">{tool.tabs.synastry}</TabsTrigger>
                <TabsTrigger value="relocated">{tool.tabs.relocated}</TabsTrigger>
                <TabsTrigger value="maps">{tool.tabs.maps}</TabsTrigger>
              </TabsList>

              <div className="mt-6 rounded-xl border border-purple-500/25 bg-purple-950/20 px-4 py-5 text-center space-y-3">
                <h3 className="text-base font-semibold text-white flex items-center justify-center gap-2">
                  <MessageCircle className="h-5 w-5 text-purple-300" />
                  {r.aiTitle}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">{r.aiHint}</p>
                <Button
                  type="button"
                  onClick={openSynastryAI}
                  className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500"
                >
                  <Sparkles className="h-4 w-4" />
                  {r.aiButton}
                </Button>
              </div>

              <TabsContent value="synastry" className="mt-6 space-y-8">
                <div className="flex justify-center">
                  <SynastryBiwheel
                    labelInner={tool.form.personA}
                    labelOuter={tool.form.personB}
                    wheelAxisInner={tool.form.wheelAxisInner}
                    wheelAxisOuter={tool.form.wheelAxisOuter}
                    biwheelFootnote={tool.form.biwheelFootnote}
                    planetsInner={data.personA.planets}
                    planetsOuter={data.personB.planets}
                    ascInner={data.personA.ascendant.longitude}
                    ascOuter={data.personB.ascendant.longitude}
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-purple-300 mb-3">{r.aspectsTitle}</h3>
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 bg-white/5 text-left text-muted-foreground">
                          <th className="p-2 font-medium">{r.planetA}</th>
                          <th className="p-2 font-medium">{r.aspect}</th>
                          <th className="p-2 font-medium">{r.planetB}</th>
                          <th className="p-2 font-medium">{r.orb}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.aspects.map((row, i) => (
                          <tr key={`${row.planetA}-${row.aspect}-${row.planetB}-${i}`} className="border-b border-white/5">
                            <td className="p-2 text-purple-200">
                              {row.planetA} {data.personA.planets.find((p) => p.name === row.planetA)?.glyph}
                            </td>
                            <td className="p-2 font-medium text-white">{row.aspect}</td>
                            <td className="p-2 text-cyan-200">
                              {row.planetB} {data.personB.planets.find((p) => p.name === row.planetB)?.glyph}
                            </td>
                            <td className="p-2 text-muted-foreground">{row.orb}°</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">{r.footnote}</p>
              </TabsContent>

              <TabsContent value="relocated" className="mt-6 space-y-6">
                {data.relocated ? (
                  <>
                    <p className="text-center text-white font-medium">
                      {r.relocatedTitle}: {data.relocated.location}
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 text-sm">
                      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <div className="text-muted-foreground">{r.ascA}</div>
                        <div className="text-lg font-semibold text-purple-200">
                          {data.relocated.ascendantA.sign} {data.relocated.ascendantA.degree}°
                        </div>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                        <div className="text-muted-foreground">{r.ascB}</div>
                        <div className="text-lg font-semibold text-cyan-200">
                          {data.relocated.ascendantB.sign} {data.relocated.ascendantB.degree}°
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-purple-300 mb-2">{r.overlayATitle}</h4>
                      <div className="overflow-x-auto rounded-lg border border-white/10">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                              <th className="p-2 text-left">{r.planet}</th>
                              <th className="p-2 text-left">{r.house}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.relocated.aInB.map((row) => (
                              <tr key={row.planet} className="border-b border-white/5">
                                <td className="p-2">
                                  {row.glyph} {row.planet}
                                </td>
                                <td className="p-2">{row.houseInPartner}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-cyan-300 mb-2">{r.overlayBTitle}</h4>
                      <div className="overflow-x-auto rounded-lg border border-white/10">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                              <th className="p-2 text-left">{r.planet}</th>
                              <th className="p-2 text-left">{r.house}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.relocated.bInA.map((row) => (
                              <tr key={row.planet} className="border-b border-white/5">
                                <td className="p-2">
                                  {row.glyph} {row.planet}
                                </td>
                                <td className="p-2">{row.houseInPartner}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground">{r.relocatedEmptyHint}</p>
                )}
              </TabsContent>

              <TabsContent value="maps" className="mt-6 space-y-6 text-center">
                <h3 className="text-lg font-semibold text-white">{r.mapsTitle}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{r.mapsDesc}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild variant="secondary" className="gap-2">
                    <Link href={mapUrl(data.personA.birthData) as any}>{r.mapLinkA}</Link>
                  </Button>
                  <Button asChild variant="secondary" className="gap-2">
                    <Link href={mapUrl(data.personB.birthData) as any}>{r.mapLinkB}</Link>
                  </Button>
                </div>

                <div className="text-left space-y-3 pt-4 border-t border-white/10">
                  <h4 className="text-base font-semibold text-white text-center">{r.dualMapTitle}</h4>
                  <p className="text-xs text-muted-foreground text-center max-w-lg mx-auto">{r.dualMapDesc}</p>
                  <SynastryDualMap
                    labelA={tool.form.personA}
                    labelB={tool.form.personB}
                    legendSolid={r.dualMapLegendSolid}
                    legendDashed={r.dualMapLegendDashed}
                    footnote={r.dualMapFootnote}
                    personA={toMapBirthPayload(data.personA.birthData)}
                    personB={toMapBirthPayload(data.personB.birthData)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {data && synastryForAI && astroChatChartData && (
          <AstroChat
            open={chatOpen}
            onOpenChange={setChatOpen}
            autoSendQuestion={autoSendQuestion}
            autoSendQuestionKey={autoSendQuestionKey}
            chartData={astroChatChartData}
            synastryData={synastryForAI}
            user={user ?? undefined}
            onRequireLogin={() => setShowSignModal(true)}
          />
        )}
      </div>

      {showStickyUnlock && data && reportStatus !== "ready" && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-gray-950/95 px-4 py-3 backdrop-blur-md pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            onClick={() => navigateToUnlock("sticky")}
            disabled={reportStatus === "loading"}
            className="h-11 w-full text-sm font-semibold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 hover:from-amber-600 hover:via-orange-600 hover:to-amber-600 text-white shadow-lg"
          >
            <Lock className="mr-2 size-4" />
            {deepReport.stickyCta}
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
