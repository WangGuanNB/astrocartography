import { aiChatSessions } from "@/db/schema";
import { db } from "@/db";
import { and, count, desc, eq } from "drizzle-orm";
import { getIsoTimestr } from "@/lib/time";

export type ChatMessageRow = { role: "user" | "assistant"; content: string };

export async function upsertAiChatSession(data: {
  id: string;
  user_uuid: string;
  title: string;
  chart_context_json: string;
  is_synastry: boolean;
  messages: ChatMessageRow[];
  message_count: number;
  messages_r2_key: string | null;
}) {
  const now = new Date(getIsoTimestr());
  await db()
    .insert(aiChatSessions)
    .values({
      id: data.id,
      user_uuid: data.user_uuid,
      created_at: now,
      updated_at: now,
      title: data.title,
      chart_context_json: data.chart_context_json,
      is_synastry: data.is_synastry,
      message_count: data.message_count,
      messages_r2_key: data.messages_r2_key,
      // Keep backward-compatible fallback payload in DB minimal.
      messages: [],
    })
    .onConflictDoUpdate({
      target: aiChatSessions.id,
      set: {
        updated_at: now,
        title: data.title,
        chart_context_json: data.chart_context_json,
        is_synastry: data.is_synastry,
        message_count: data.message_count,
        messages_r2_key: data.messages_r2_key,
        messages: [],
      },
    });
}

export async function findAiChatSessionForUser(
  id: string,
  user_uuid: string
): Promise<typeof aiChatSessions.$inferSelect | undefined> {
  const [row] = await db()
    .select()
    .from(aiChatSessions)
    .where(
      and(eq(aiChatSessions.id, id), eq(aiChatSessions.user_uuid, user_uuid))
    )
    .limit(1);

  return row;
}

export async function listAiChatSessionsForUser(
  user_uuid: string,
  opts: { limit: number; offset: number }
): Promise<(typeof aiChatSessions.$inferSelect)[]> {
  return db()
    .select()
    .from(aiChatSessions)
    .where(eq(aiChatSessions.user_uuid, user_uuid))
    .orderBy(desc(aiChatSessions.updated_at))
    .limit(opts.limit)
    .offset(opts.offset);
}

export async function countAiChatSessionsForUser(
  user_uuid: string
): Promise<number> {
  const [row] = await db()
    .select({ c: count() })
    .from(aiChatSessions)
    .where(eq(aiChatSessions.user_uuid, user_uuid));

  return Number(row?.c ?? 0);
}
