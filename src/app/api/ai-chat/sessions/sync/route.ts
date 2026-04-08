import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { upsertAiChatSession } from "@/models/ai-chat-session";
import type { ChatMessageRow } from "@/models/ai-chat-session";
import { uploadChatMessagesToR2 } from "@/lib/ai-chat-storage";

const MAX_BODY_BYTES = 900_000;

export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth");
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return respErr("payload too large");
    }

    const body = JSON.parse(raw) as {
      sessionId: string;
      chartData?: unknown;
      synastryData?: unknown;
      messages: ChatMessageRow[];
    };

    if (
      !body.sessionId ||
      typeof body.sessionId !== "string" ||
      body.sessionId.length > 40
    ) {
      return respErr("invalid sessionId");
    }

    if (!Array.isArray(body.messages)) {
      return respErr("messages required");
    }

    const firstUser = body.messages.find((m) => m.role === "user");
    const title =
      firstUser?.content?.trim().slice(0, 200) || "Astro Chat";
    const messages_r2_key = await uploadChatMessagesToR2({
      userUuid: user_uuid,
      sessionId: body.sessionId,
      messages: body.messages,
    });

    await upsertAiChatSession({
      id: body.sessionId,
      user_uuid,
      title,
      chart_context_json: JSON.stringify({
        chartData: body.chartData ?? null,
        synastryData: body.synastryData ?? null,
      }),
      is_synastry: !!body.synastryData,
      messages: body.messages,
      message_count: body.messages.length,
      messages_r2_key,
    });

    return respData({ sessionId: body.sessionId });
  } catch (e) {
    console.error("ai-chat sync:", e);
    return respErr("sync failed");
  }
}
