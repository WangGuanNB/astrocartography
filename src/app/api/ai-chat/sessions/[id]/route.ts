import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import { userHasProfessional } from "@/services/entitlements";
import { findAiChatSessionForUser } from "@/models/ai-chat-session";
import { readChatMessagesFromR2 } from "@/lib/ai-chat-storage";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth");
    }

    const ok = await userHasProfessional(user_uuid);
    if (!ok) {
      return Response.json(
        { code: 403, message: "Professional plan required" },
        { status: 403 }
      );
    }

    const { id } = await context.params;
    if (!id) {
      return respErr("invalid id");
    }

    const row = await findAiChatSessionForUser(id, user_uuid);
    if (!row) {
      return Response.json(
        { code: 404, message: "not found" },
        { status: 404 }
      );
    }

    let chartContext: unknown = null;
    try {
      chartContext = row.chart_context_json
        ? JSON.parse(row.chart_context_json)
        : null;
    } catch {
      chartContext = null;
    }

    let messages = Array.isArray(row.messages) ? row.messages : [];
    if (row.messages_r2_key) {
      try {
        messages = await readChatMessagesFromR2(row.messages_r2_key);
      } catch (e) {
        console.warn("ai-chat session detail: failed to read R2 payload", e);
      }
    }

    return respData({
      id: row.id,
      title: row.title,
      created_at: row.created_at?.toISOString() ?? null,
      updated_at: row.updated_at?.toISOString() ?? null,
      is_synastry: row.is_synastry,
      chartContext,
      messages,
    });
  } catch (e) {
    console.error("ai-chat session detail:", e);
    return respErr("load failed");
  }
}
