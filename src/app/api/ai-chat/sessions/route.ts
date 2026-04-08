import { respData, respErr } from "@/lib/resp";
import { getUserUuid } from "@/services/user";
import {
  countAiChatSessionsForUser,
  listAiChatSessionsForUser,
} from "@/models/ai-chat-session";

export async function GET(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("no auth");
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20)
    );
    const offset = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      listAiChatSessionsForUser(user_uuid, { limit, offset }),
      countAiChatSessionsForUser(user_uuid),
    ]);

    const items = rows.map((r) => ({
      id: r.id,
      title: r.title,
      created_at: r.created_at?.toISOString() ?? null,
      updated_at: r.updated_at?.toISOString() ?? null,
      is_synastry: r.is_synastry,
      message_count:
        typeof r.message_count === "number"
          ? r.message_count
          : Array.isArray(r.messages)
          ? r.messages.length
          : 0,
    }));

    return respData({ items, page, limit, total });
  } catch (e) {
    console.error("ai-chat sessions list:", e);
    return respErr("list failed");
  }
}
