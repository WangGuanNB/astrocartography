import { respData, respErr } from "@/lib/resp";
import { calculateResearchTiming } from "@/lib/research-timing";
import { isPlanDateCurrentOrFuture } from "@/lib/research-project";
import { findResearchProjectForUser } from "@/models/research-project";
import {
  findResearchTimingSnapshot,
  saveResearchTimingSnapshot,
} from "@/models/research-timing-snapshot";
import {
  applyResearchTimingAccess,
  getResearchAccess,
  researchProjectFingerprint,
} from "@/services/research-entitlements";
import { getUserUuid } from "@/services/user";
import type { ResearchTimingWindow } from "@/types/research-timing";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const userUuid = await getUserUuid();
    if (!userUuid) return respErr("no auth");

    const days = Number(new URL(request.url).searchParams.get("days") ?? "30");
    if (days !== 30 && days !== 90) {
      return respErr("Timing window must be 30 or 90 days");
    }

    const project = await findResearchProjectForUser(userUuid);
    if (!project) return respErr("Research project not found");
    const windowDays = days as ResearchTimingWindow;
    const access = await getResearchAccess(userUuid);
    const projectFingerprint = researchProjectFingerprint(project);

    if (access.canViewSavedPlusSnapshots) {
      try {
        const snapshot = await findResearchTimingSnapshot(userUuid, windowDays);
        if (snapshot) {
          return respData({
            report: snapshot.report,
            access,
            locked: false,
            source: "saved" as const,
            readOnly: true,
            matchesCurrentProject:
              snapshot.projectFingerprint === projectFingerprint,
          });
        }
      } catch (error) {
        console.warn("research timing snapshot lookup failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (windowDays === 90 && !access.canUse90DayWindow) {
      return respData({
        report: null,
        access,
        locked: true,
        reason: "plus_required" as const,
      });
    }

    if (!isPlanDateCurrentOrFuture(project.planDate, project.currentCity)) {
      return respErr("Plan date must be today or later");
    }

    const fullReport = calculateResearchTiming(project, windowDays);
    if (access.tier === "plus_active") {
      try {
        await saveResearchTimingSnapshot({
          userUuid,
          projectId: project.id,
          windowDays,
          projectFingerprint,
          report: fullReport,
        });
      } catch (error) {
        // Snapshot persistence must never take the live timing result down.
        console.warn("research timing snapshot save failed", {
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const report = applyResearchTimingAccess(fullReport, access);
    return respData({
      report,
      access,
      locked: false,
      source: "live" as const,
      readOnly: false,
      matchesCurrentProject: true,
      previewApplied: access.previewEventsPerCity !== null,
    });
  } catch (error) {
    console.error("research timing get:", error);
    return respErr("Unable to calculate research timing");
  }
}
