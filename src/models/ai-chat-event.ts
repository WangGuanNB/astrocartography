import { aiChatEvents } from "@/db/schema";
import { db } from "@/db";

export type AiChatEventInput = {
  traceId: string;
  userUuid?: string;
  requestType: "standard" | "city_comparison_report" | "unknown";
  event: string;
  provider?: string;
  model?: string;
  thinking?: string;
  delivery?: string;
  attempt?: number;
  creditCost?: number;
  elapsedMs?: number;
  firstTextLatencyMs?: number;
  providerLatencyMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  textCharacters?: number;
  errorKind?: string;
};

// This intentionally contains no prompt, response, birth data, email, or raw
// provider error. Full conversations remain in the existing R2 session store.
export async function recordAiChatEvent(input: AiChatEventInput) {
  await db().insert(aiChatEvents).values({
    created_at: new Date(),
    trace_id: input.traceId,
    user_uuid: input.userUuid ?? null,
    request_type: input.requestType,
    event: input.event,
    provider: input.provider ?? null,
    model: input.model ?? null,
    thinking: input.thinking ?? null,
    delivery: input.delivery ?? null,
    attempt: input.attempt ?? null,
    credit_cost: input.creditCost ?? null,
    elapsed_ms: input.elapsedMs ?? null,
    first_text_latency_ms: input.firstTextLatencyMs ?? null,
    provider_latency_ms: input.providerLatencyMs ?? null,
    prompt_tokens: input.promptTokens ?? null,
    completion_tokens: input.completionTokens ?? null,
    total_tokens: input.totalTokens ?? null,
    text_characters: input.textCharacters ?? null,
    error_kind: input.errorKind ?? null,
  });
}
