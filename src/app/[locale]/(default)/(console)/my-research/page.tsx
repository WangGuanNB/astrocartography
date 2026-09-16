import {
  BookmarkCheck,
  CalendarDays,
  MapPin,
  ShieldCheck,
  Target,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { findResearchProjectForUser } from "@/models/research-project";
import { getResearchAccess } from "@/services/research-entitlements";
import { getUserUuid } from "@/services/user";
import ResearchProjectExportButton from "./research-project-export-button";
import ResearchTimingLayer from "./research-timing-layer";

export const dynamic = "force-dynamic";

export default async function MyResearchPage() {
  const t = await getTranslations("research_project");
  const accessT = await getTranslations("research_access");
  const userUuid = await getUserUuid();
  const project = userUuid
    ? await findResearchProjectForUser(userUuid)
    : null;

  if (!userUuid || !project) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{t("empty")}</p>
          <Button asChild>
            <Link href="/">{t("startComparison")}</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const access = await getResearchAccess(userUuid);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookmarkCheck className="size-4" />
                {t("savedProject")}
              </div>
              <CardTitle className="mt-2">
                {project.candidateCities.map((city) => city.name).join(" · ")}
              </CardTitle>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <ResearchProjectExportButton
                project={project}
                label={accessT("exportProject")}
              />
              <Button asChild>
                <Link href={"/chart?researchProject=current" as any}>
                  {t("continueResearch")}
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <Target className="size-4" />
              {t("goalLabel")}
            </div>
            <p className="mt-2 font-medium">{t(`goals.${project.goal}`)}</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="size-4" />
              {t("planDateLabel")}
            </div>
            <p className="mt-2 font-medium">{project.planDate}</p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="size-4" />
              {t("currentCityLabel")}
            </div>
            <p className="mt-2 font-medium">
              {project.currentCity.displayName ||
                [project.currentCity.name, project.currentCity.country]
                  .filter(Boolean)
                  .join(", ")}
            </p>
          </div>
          <div className="rounded-xl border p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("birthProfileLabel")}
            </div>
            <p className="mt-2 font-medium">{project.birthProfile.location}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {project.birthProfile.date} · {project.birthProfile.time} ·{" "}
              {project.birthProfile.timezone}
            </p>
          </div>
          <div className="rounded-xl border p-4 md:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("candidatesLabel")}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.candidateCities.map((city) => (
                <span
                  key={`${city.name}-${city.country}-${city.lat}-${city.lng}`}
                  className="rounded-full border bg-muted/40 px-3 py-1.5 text-sm"
                >
                  {city.displayName ||
                    [city.name, city.country].filter(Boolean).join(", ")}
                </span>
              ))}
            </div>
          </div>
          {project.constraints ? (
            <div className="rounded-xl border p-4 md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("constraintsLabel")}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">
                {project.constraints}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/[0.03]">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">
                {accessT("tiers." + access.tier)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {accessT("descriptions." + access.tier)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {accessT("savedRights")}
              </p>
            </div>
          </div>
          {!access.subscriptionEnabled && access.tier !== "plus_active" ? (
            <span className="rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
              {accessT("privateValidation")}
            </span>
          ) : null}
        </CardContent>
      </Card>

      <ResearchTimingLayer initialAccess={access} />
    </div>
  );
}
