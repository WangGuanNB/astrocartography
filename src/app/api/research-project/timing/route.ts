import { respData, respErr } from "@/lib/resp";
import { calculateResearchTiming } from "@/lib/research-timing";
import { isPlanDateCurrentOrFuture } from "@/lib/research-project";
import { findResearchProjectForUser } from "@/models/research-project";
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
    if (!isPlanDateCurrentOrFuture(project.planDate, project.currentCity)) {
      return respErr("Plan date must be today or later");
    }

    const report = calculateResearchTiming(
      project,
      days as ResearchTimingWindow
    );
    return respData({ report });
  } catch (error) {
    console.error("research timing get:", error);
    return respErr("Unable to calculate research timing");
  }
}
