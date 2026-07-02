"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { Calendar, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";

type ToolLabels = {
  form: {
    birthDate: string;
    submit: string;
    calculating: string;
  };
  result: {
    title: string;
    sign: string;
    degree: string;
    element: string;
    modality: string;
    ruler: string;
    dateRange: string;
    interpretation: string;
    cuspTitle: string;
    cuspNote: string;
    systemNote: string;
    ctaBirthChart: string;
    ctaRising: string;
  };
  errors: {
    required: string;
    generic: string;
  };
  interpretations?: Record<string, string>;
};

type ApiResponse = {
  success: boolean;
  error?: string;
  data?: {
    birthDate: string;
    sun: {
      signKey: string;
      sign: string;
      degree: number;
      element: string;
      modality: string;
      ruler: string;
      glyph: string;
      dateRange: string;
      nearCusp: boolean;
      adjacentSignKey: string | null;
      adjacentSign: string | null;
      system: string;
    };
  };
};

function formatDeg(deg: number) {
  const whole = Math.floor(deg);
  const min = Math.round((deg - whole) * 60);
  return `${whole}°${String(min).padStart(2, "0")}'`;
}

export default function ZodiacCalculatorClient({ tool }: { tool: ToolLabels }) {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const [birthDate, setBirthDate] = useState("");
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

  const canSubmit = Boolean(birthDate && !isLoading);

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/calculate-sun-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ birthDate, locale }),
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
    result && tool.interpretations?.[result.sun.signKey]
      ? tool.interpretations[result.sun.signKey]
      : null;

  const cuspMessage =
    result?.sun.nearCusp && result.sun.adjacentSign
      ? tool.result.cuspNote
          .replace("{sign}", result.sun.sign)
          .replace("{adjacent}", result.sun.adjacentSign)
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
                  placeholder="YYYY-MM-DD"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 hover:from-purple-700 hover:via-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
              {error && <p className="text-sm text-red-300">⚠️ {error}</p>}
              {!birthDate && !error && (
                <p className="text-xs text-white/50">{tool.errors.required}</p>
              )}
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
                <p className="text-xl font-semibold text-purple-200">
                  {result.sun.glyph} {result.sun.sign} {formatDeg(result.sun.degree)}
                </p>
                <p>
                  <span className="text-purple-300">{tool.result.element}:</span> {result.sun.element}
                </p>
                <p>
                  <span className="text-purple-300">{tool.result.modality}:</span> {result.sun.modality}
                </p>
                <p>
                  <span className="text-purple-300">{tool.result.ruler}:</span> {result.sun.ruler}
                </p>
                <p>
                  <span className="text-purple-300">{tool.result.dateRange}:</span> {result.sun.dateRange}
                </p>
                {interpretation && (
                  <p>
                    <span className="text-purple-300">{tool.result.interpretation}:</span> {interpretation}
                  </p>
                )}
                <p className="text-xs text-white/50 pt-2">{tool.result.systemNote}</p>
              </div>

              {cuspMessage && (
                <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  <p className="font-medium">{tool.result.cuspTitle}</p>
                  <p className="mt-1">{cuspMessage}</p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/tools/birth-chart-generator"
                  className={cn(
                    "inline-flex flex-1 items-center justify-center rounded-md bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
                  )}
                >
                  {tool.result.ctaBirthChart}
                </Link>
                <Link
                  href="/rising-sign-calculator"
                  className={cn(
                    "inline-flex flex-1 items-center justify-center rounded-md border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                  )}
                >
                  {tool.result.ctaRising}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
