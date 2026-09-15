import { eq } from "drizzle-orm";
import { db } from "@/db";
import { researchProjects } from "@/db/schema";
import {
  serializeResearchProjectInput,
  toResearchProject,
} from "@/lib/research-project";
import type {
  ResearchProject,
  ResearchProjectInput,
} from "@/types/research-project";

export async function findResearchProjectForUser(
  userUuid: string
): Promise<ResearchProject | null> {
  const [row] = await db()
    .select()
    .from(researchProjects)
    .where(eq(researchProjects.user_uuid, userUuid))
    .limit(1);

  return row ? toResearchProject(row) : null;
}

export async function upsertResearchProjectForUser(
  userUuid: string,
  input: ResearchProjectInput
): Promise<ResearchProject> {
  const now = new Date();
  const serialized = serializeResearchProjectInput(input);

  const [row] = await db()
    .insert(researchProjects)
    .values({
      id: crypto.randomUUID(),
      user_uuid: userUuid,
      ...serialized,
      created_at: now,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: researchProjects.user_uuid,
      set: {
        ...serialized,
        updated_at: now,
      },
    })
    .returning();

  return toResearchProject(row);
}
