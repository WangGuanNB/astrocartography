"use client";

import { useEffect, useState } from "react";
import { CalendarRange, Clock3, Info, Loader2, RefreshCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResearchTimingReport } from "@/types/research-timing";
import type { ResearchTimingWindow } from "@/types/research-timing";

type LoadState = "loading" | "success" | "error";

function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00.000Z`));
}

function formatTimestamp(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function ResearchTimingLayer() {
  const t = useTranslations("research_timing");
  const locale = useLocale();
  const [windowDays, setWindowDays] = useState<ResearchTimingWindow>(30);
  const [state, setState] = useState<LoadState>("loading");
  const [report, setReport] = useState<ResearchTimingReport | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");

    fetch(`/api/research-project/timing?days=${windowDays}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((result) => {
        if (result.code !== 0 || !result.data?.report) {
          throw new Error(result.message || "timing unavailable");
        }
        setReport(result.data.report);
        setState("success");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setReport(null);
        setState("error");
      });

    return () => controller.abort();
  }, [windowDays, reloadKey]);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarRange className="size-4" />
              {t("eyebrow")}
            </div>
            <CardTitle className="mt-2">{t("title")}</CardTitle>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              {t("description")}
            </p>
          </div>
          <div className="flex rounded-lg border bg-muted/30 p-1">
            {([30, 90] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setWindowDays(days)}
                className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                  windowDays === days
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t("window", { days })}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {state === "loading" ? (
          <div className="flex min-h-40 items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
            {t("loading")}
          </div>
        ) : null}

        {state === "error" ? (
          <div className="rounded-xl border border-destructive/25 bg-destructive/5 p-5">
            <p className="font-medium text-destructive">{t("errorTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("errorDescription")}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              <RefreshCw className="mr-2 size-4" />
              {t("retry")}
            </Button>
          </div>
        ) : null}

        {state === "success" && report ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatDate(report.startDate, locale)} – {formatDate(report.endDate, locale)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="size-3.5" />
                {t("calculatedAt", {
                  date: formatTimestamp(report.calculatedAt, locale),
                })}
              </span>
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              {report.cities.map((cityTiming) => {
                const cityLabel =
                  cityTiming.city.displayName ||
                  [cityTiming.city.name, cityTiming.city.country]
                    .filter(Boolean)
                    .join(", ");

                return (
                  <div
                    key={`${cityTiming.city.lat}-${cityTiming.city.lng}`}
                    className="rounded-xl border p-4"
                  >
                    <h3 className="font-semibold">{cityLabel}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {cityTiming.timezone} · ASC {cityTiming.relocatedAngles.ascendant.toFixed(1)}° · MC{" "}
                      {cityTiming.relocatedAngles.midheaven.toFixed(1)}°
                    </p>

                    {cityTiming.events.length ? (
                      <div className="mt-4 space-y-3">
                        {cityTiming.events.map((event) => (
                          <div
                            key={`${event.date}-${event.planet}-${event.angle}-${event.aspect}`}
                            className="rounded-lg border bg-muted/20 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground">
                                  {formatDate(event.date, locale)}
                                </p>
                                <p className="mt-1 text-sm font-semibold">
                                  {event.glyph} {t(`planets.${event.planet}`)} {t(`aspects.${event.aspect}`)} {event.angle}
                                </p>
                              </div>
                              <span
                                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                                  event.tone === "supportive"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                                    : event.tone === "challenging"
                                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                                      : "bg-primary/10 text-primary"
                                }`}
                              >
                                {t(`tones.${event.tone}`)}
                              </span>
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                              {t("eventDetail", {
                                orb: event.orb.toFixed(2),
                                angle: event.angle,
                              })}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                        {t("noEvents")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border bg-muted/20 p-4 text-xs leading-relaxed text-muted-foreground">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-1.5">
                  <p className="font-semibold text-foreground">{t("methodTitle")}</p>
                  <p>{t("methodDescription", { orb: report.maxOrb })}</p>
                  <p>{t("limitation")}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
