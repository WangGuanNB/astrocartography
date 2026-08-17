"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Calendar, Clock, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";

type ToolLabels = {
  form: {
    date: string;
    time: string;
    submit: string;
    now: string;
    calculating: string;
  };
  result: {
    title: string;
    timestampLabel: string;
    systemNote: string;
    planet: string;
    sign: string;
    degree: string;
    direction: string;
    direct: string;
    retrograde: string;
    aspectsTitle: string;
    aspect: string;
    orb: string;
    ctaTransit: string;
    ctaNatal: string;
  };
  errors: {
    invalid: string;
    generic: string;
  };
};

type PlanetRow = {
  name: string;
  glyph: string;
  longitude: number;
  sign: string;
  degree: number;
  retrograde: boolean;
  speedDegPerDay: number;
};

type AspectRow = {
  planetA: string;
  planetB: string;
  aspect: string;
  orb: number;
};

type ApiResponse = {
  success: boolean;
  error?: string;
  data?: {
    utc: string;
    system: string;
    planets: PlanetRow[];
    aspects: AspectRow[];
  };
};

function formatDeg(deg: number) {
  const whole = Math.floor(deg);
  const min = Math.round((deg - whole) * 60);
  if (min === 60) return `${whole + 1}°00'`;
  return `${whole}°${String(min).padStart(2, "0")}'`;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function localDateTimeParts(d = new Date()) {
  return {
    date: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
  };
}

function toIsoFromLocal(date: string, time: string): string | null {
  if (!date) return null;
  const clock = time || "00:00";
  const parsed = new Date(`${date}T${clock}:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

export default function PlanetaryPositionsTodayClient({ tool }: { tool: ToolLabels }) {
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const didAutoLoad = useRef(false);
  const skipScroll = useRef(true);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse["data"] | null>(null);

  const fetchPositions = useCallback(
    async (iso?: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/calculate-planetary-positions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(iso ? { iso } : {}),
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
    },
    [tool.errors.generic]
  );

  useEffect(() => {
    if (didAutoLoad.current) return;
    didAutoLoad.current = true;
    const parts = localDateTimeParts();
    setDate(parts.date);
    setTime(parts.time);
    skipScroll.current = true;
    void fetchPositions();
  }, [fetchPositions]);

  useEffect(() => {
    if (!result) return;
    if (skipScroll.current) {
      skipScroll.current = false;
      return;
    }
    if (typeof window === "undefined") return;
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const behavior: ScrollBehavior = prefersReducedMotion ? "auto" : "smooth";
    const timeoutId = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior, block: "start" });
      resultsHeadingRef.current?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(timeoutId);
  }, [result]);

  function handleCalculate() {
    const iso = toIsoFromLocal(date, time);
    if (!iso) {
      setError(tool.errors.invalid);
      return;
    }
    skipScroll.current = false;
    void fetchPositions(iso);
  }

  function handleNow() {
    const parts = localDateTimeParts();
    setDate(parts.date);
    setTime(parts.time);
    skipScroll.current = false;
    void fetchPositions();
  }

  const timestamp = result
    ? `${new Date(result.utc).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      })} UTC`
    : null;

  return (
    <div className="container max-w-4xl px-4 pb-16">
      <div className="mx-auto max-w-3xl">
        <Card className="shadow-2xl border border-white/10 bg-white/5 backdrop-blur-md relative overflow-visible">
          <CardContent className="p-6 md:p-8 relative overflow-visible">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label
                    htmlFor="skyDate"
                    className="flex items-center gap-2 text-sm font-semibold text-purple-300"
                  >
                    <Calendar className="size-4 text-purple-400" />
                    {tool.form.date}
                  </label>
                  <Input
                    id="skyDate"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="skyTime"
                    className="flex items-center gap-2 text-sm font-semibold text-purple-300"
                  >
                    <Clock className="size-4 text-purple-400" />
                    {tool.form.time}
                  </label>
                  <Input
                    id="skyTime"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="h-10 text-sm bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:border-purple-500 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={handleCalculate}
                  disabled={isLoading}
                  className="h-12 flex-1 text-base font-semibold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="mr-2 size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      {tool.form.calculating}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-4" />
                      {tool.form.submit}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleNow}
                  disabled={isLoading}
                  className="h-12 sm:w-32 border-white/20 bg-white/5 text-white hover:bg-white/10"
                >
                  {tool.form.now}
                </Button>
              </div>
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
                {tool.result.timestampLabel}: {timestamp}
              </p>
              <p className="mt-2 text-sm text-white/60">{tool.result.systemNote}</p>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[32rem] text-sm text-white/90">
                  <thead>
                    <tr className="border-b border-white/20">
                      <th className="py-2 text-left font-medium">{tool.result.planet}</th>
                      <th className="py-2 text-left font-medium">{tool.result.sign}</th>
                      <th className="py-2 text-right font-medium">{tool.result.degree}</th>
                      <th className="py-2 text-right font-medium">{tool.result.direction}</th>
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
                        <td className={cn("py-1.5 text-right", p.retrograde && "text-amber-300")}>
                          {p.retrograde ? `℞ ${tool.result.retrograde}` : tool.result.direct}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.aspects.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-base font-semibold text-purple-300">{tool.result.aspectsTitle}</h3>
                  <ul className="mt-2 space-y-1.5 text-sm text-white/90">
                    {result.aspects.map((a, i) => (
                      <li
                        key={`${a.planetA}-${a.planetB}-${a.aspect}-${i}`}
                        className="flex flex-wrap items-center gap-x-2 rounded border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <span className="font-medium">{a.planetA}</span>
                        <span>{a.aspect}</span>
                        <span className="font-medium">{a.planetB}</span>
                        <span className="text-white/60">
                          ({a.orb}° {tool.result.orb})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <Link
                  href="/transit-chart-calculator"
                  className="inline-flex w-full items-center justify-center rounded-md bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
                >
                  {tool.result.ctaTransit}
                </Link>
                <Link
                  href="/chart/natal-chart"
                  className="inline-flex w-full items-center justify-center rounded-md border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                >
                  {tool.result.ctaNatal}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
