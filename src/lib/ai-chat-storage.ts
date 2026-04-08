import { newStorage } from "@/lib/storage";
import { getIsoTimestr } from "@/lib/time";

export type ChatMessageRow = { role: "user" | "assistant"; content: string };

function buildSessionR2Key(userUuid: string, sessionId: string): string {
  const now = new Date(getIsoTimestr());
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `ai-chat/${yyyy}/${mm}/${userUuid}/${sessionId}.json`;
}

export async function uploadChatMessagesToR2(params: {
  userUuid: string;
  sessionId: string;
  messages: ChatMessageRow[];
}): Promise<string> {
  const key = buildSessionR2Key(params.userUuid, params.sessionId);
  const storage = newStorage();
  const payload = Buffer.from(JSON.stringify(params.messages), "utf8");

  await storage.uploadFile({
    body: payload,
    key,
    contentType: "application/json; charset=utf-8",
    disposition: "inline",
  });

  return key;
}

export async function readChatMessagesFromR2(key: string): Promise<ChatMessageRow[]> {
  const storage = newStorage();
  const result = await storage.getFile({ key });
  const text = new TextDecoder("utf-8").decode(result.body);
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) return [];

  return parsed.filter(
    (m) =>
      m &&
      (m.role === "user" || m.role === "assistant") &&
      typeof m.content === "string"
  ) as ChatMessageRow[];
}
