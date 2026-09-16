import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { researchTimingSnapshots } from "@/db/schema";
import type { ResearchTimingReport, ResearchTimingWindow } from "@/types/research-timing";

export type SavedResearchTimingSnapshot = {
  report: ResearchTimingReport;
  projectFingerprint: string;
  calculatedAt: string;
};

function parseReport(value: string): ResearchTimingReport {
  const parsed = JSON.parse(value) as ResearchTimingReport;
  if (
    parsed?.method !== "relocated_angle_transits_v1" ||
    (parsed.windowDays !== 30 && parsed.windowDays !== 90) ||
    !Array.isArray(parsed.cities)
  ) {
    throw new Error("Invalid saved research timing report");
  }
  return parsed;
}

export async function findResearchTimingSnapshot(
  userUuid: string,
  windowDays: ResearchTimingWindow
): Promise<SavedResearchTimingSnapshot | null> {
  const [row] = await db()
    .select()
    .from(researchTimingSnapshots)
    .where(
      and(
        eq(researchTimingSnapshots.user_uuid, userUuid),
        eq(researchTimingSnapshots.window_days, windowDays)
      )
    )
    .limit(1);

  if (!row) return null;
  return {
    report: parseReport(row.report_json),
    projectFingerprint: row.project_fingerprint,
    calculatedAt: row.calculated_at.toISOString(),
  };
}

export async function saveResearchTimingSnapshot({
  userUuid,
  projectId,
  windowDays,
  projectFingerprint,
  report,
}: {
  userUuid: string;
  projectId: string;
  windowDays: ResearchTimingWindow;
  projectFingerprint: string;
  report: ResearchTimingReport;
}) {
  const now = new Date();
  const calculatedAt = new Date(report.calculatedAt);
  const [row] = await db()
    .insert(researchTimingSnapshots)
    .values({
      id: crypto.randomUUID(),
      user_uuid: userUuid,
      project_id: projectId,
      window_days: windowDays,
      project_fingerprint: projectFingerprint,
      report_json: JSON.stringify(report),
      calculated_at: calculatedAt,
      created_at: now,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: [
        researchTimingSnapshots.user_uuid,
        researchTimingSnapshots.window_days,
      ],
      set: {
        project_id: projectId,
        project_fingerprint: projectFingerprint,
        report_json: JSON.stringify(report),
        calculated_at: calculatedAt,
        updated_at: now,
      },
    })
    .returning();
  return row;
}
