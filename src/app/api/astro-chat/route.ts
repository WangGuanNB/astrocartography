import {
  streamText,
} from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { respErr } from "@/lib/resp";
import {
  formatChartContext,
  formatSynastryContext,
  getSystemPrompt,
  getSynastrySystemPrompt,
  type SynastryPayloadForAI,
} from "@/lib/astro-format";
import { getUserUuid } from "@/services/user";
import { getUserCredits, decreaseCredits, CreditsTransType } from "@/services/credit";
import { getAIChatCreditCost } from "@/services/config";

const ASTRO_CHAT_MODEL =
  process.env.DEEPSEEK_ASTRO_CHAT_MODEL ||
  process.env.ASTRO_CHAT_MODEL ||
  "deepseek-v4-flash";
const CITY_COMPARISON_REPORT_CREDIT_COST = 50;
const AI_ATTEMPT_TIMEOUT_MS = 75_000;
const STANDARD_CHAT_MAX_TOKENS = 3_200;
const CITY_COMPARISON_REPORT_MAX_TOKENS = 5_200;
const DEEPSEEK_THINKING_ATTEMPT_ORDER = ["enabled", "disabled"] as const;
type DeepSeekThinkingMode = (typeof DEEPSEEK_THINKING_ATTEMPT_ORDER)[number];

function createDeepSeekForThinking(thinkingMode: DeepSeekThinkingMode) {
  return createDeepSeek({
    // DeepSeek V4 defaults to thinking. The SDK adapter does not expose this
    // vendor option, so pass it through its HTTP transport for each attempt.
    fetch: async (input, init) => {
      if (typeof init?.body !== "string") {
        return fetch(input, init);
      }

      try {
        const requestBody = JSON.parse(init.body) as Record<string, unknown>;
        return fetch(input, {
          ...init,
          body: JSON.stringify({
            ...requestBody,
            thinking: { type: thinkingMode },
          }),
        });
      } catch {
        return fetch(input, init);
      }
    },
  });
}

const deepseekWithThinking = createDeepSeekForThinking("enabled");
const deepseekWithoutThinking = createDeepSeekForThinking("disabled");

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GeneratedAnswer = {
  text: string;
  provider: "deepseek" | "kie";
  model: string;
};

type ChatTrace = {
  id: string;
  requestType: "standard" | "city_comparison_report" | "unknown";
  startedAt: number;
};

function logChatEvent(trace: ChatTrace, event: string, fields: Record<string, unknown> = {}) {
  console.info("[Astro Chat]", JSON.stringify({
    event,
    traceId: trace.id,
    requestType: trace.requestType,
    elapsedMs: Date.now() - trace.startedAt,
    ...fields,
  }));
}

function getErrorSummary(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`.slice(0, 500);
  }

  return String(error).slice(0, 500);
}

function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timeout),
  };
}

async function generateWithDeepSeek(
  messages: ChatMessage[],
  maxTokens: number,
  trace: ChatTrace,
  attempt: number,
  thinkingMode: DeepSeekThinkingMode,
) {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY not configured");
  }

  const timeout = withTimeoutSignal(AI_ATTEMPT_TIMEOUT_MS);
  const startedAt = Date.now();
  let firstTextAt: number | null = null;
  let reasoningCharacters = 0;
  let finishReason: string | null = null;

  try {
    logChatEvent(trace, "provider_started", {
      provider: "deepseek",
      model: ASTRO_CHAT_MODEL,
      attempt,
      thinking: thinkingMode,
      maxTokens,
    });

    const result = streamText({
      model: (thinkingMode === "enabled" ? deepseekWithThinking : deepseekWithoutThinking)(ASTRO_CHAT_MODEL),
      messages,
      maxTokens,
      // DeepSeek ignores temperature in thinking mode. Only send it for the
      // deterministic recovery attempt where the setting is supported.
      ...(thinkingMode === "disabled" ? { temperature: 0.5 } : {}),
      maxRetries: 0,
      abortSignal: timeout.signal,
    });
    let text = "";

    for await (const part of result.fullStream) {
      if (part.type === "text-delta") {
        if (firstTextAt === null) {
          firstTextAt = Date.now();
        }
        text += part.textDelta;
      } else if (part.type === "reasoning") {
        reasoningCharacters += part.textDelta.length;
      } else if (part.type === "step-finish" || part.type === "finish") {
        finishReason = part.finishReason;
      } else if (part.type === "error") {
        throw part.error;
      }
    }

    const [usage, response, warnings] = await Promise.all([
      result.usage,
      result.response,
      result.warnings,
    ]);

    logChatEvent(trace, text.trim() ? "provider_completed" : "provider_empty", {
      provider: "deepseek",
      model: response.modelId || ASTRO_CHAT_MODEL,
      providerResponseId: response.id,
      attempt,
      thinking: thinkingMode,
      finishReason,
      latencyMs: Date.now() - startedAt,
      firstTextLatencyMs: firstTextAt === null ? null : firstTextAt - startedAt,
      textCharacters: text.length,
      reasoningCharacters,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      warningCount: warnings?.length || 0,
    });

    if (!text.trim()) {
      throw new Error(`DeepSeek returned an empty response (finish_reason=${finishReason || "unknown"})`);
    }

    return text;
  } catch (error) {
    logChatEvent(trace, "provider_failed", {
      provider: "deepseek",
      model: ASTRO_CHAT_MODEL,
      attempt,
      thinking: thinkingMode,
      latencyMs: Date.now() - startedAt,
      error: getErrorSummary(error),
    });
    throw error;
  } finally {
    timeout.dispose();
  }
}

function extractTextValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === "string") {
          return part;
        }
        if (part && typeof part === "object") {
          const record = part as { text?: unknown; content?: unknown };
          return extractTextValue(record.text) || extractTextValue(record.content);
        }
        return "";
      })
      .join("")
      .trim();
  }

  return "";
}

async function generateWithKie(messages: ChatMessage[], maxTokens: number, trace: ChatTrace) {
  const apiKey = process.env.KIE_AI_API_KEY;
  if (!apiKey || process.env.KIE_AI_FALLBACK_ENABLED === "false") {
    return null;
  }

  const configuredModel = process.env.KIE_AI_FALLBACK_MODEL || "gemini-2.5-flash";
  // Gemini 2.5 Flash is verified against this Kie account. Retain an explicit
  // configured model as the first choice, then fail over if Kie rejects it.
  const models = process.env.KIE_AI_FALLBACK_URL
    ? [configuredModel]
    : [...new Set([configuredModel, "gemini-2.5-flash"])];
  let lastError: unknown;

  for (const model of models) {
    const endpoint =
      process.env.KIE_AI_FALLBACK_URL ||
      `https://api.kie.ai/${model}/v1/chat/completions`;
    const timeout = withTimeoutSignal(AI_ATTEMPT_TIMEOUT_MS);
    const startedAt = Date.now();

    try {
      logChatEvent(trace, "provider_started", {
        provider: "kie",
        model,
        maxTokens,
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: timeout.signal,
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.5,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Kie fallback request failed with status ${response.status}`);
      }

      const rawPayload = await response.text();
      let payload: {
        code?: number;
        msg?: string;
        choices?: Array<{
          message?: { content?: unknown };
          delta?: { content?: unknown };
          text?: unknown;
        }>;
        output_text?: unknown;
        data?: { choices?: Array<{ message?: { content?: unknown } }> };
      } | null = null;

      try {
        payload = JSON.parse(rawPayload);
      } catch {
        // Some compatible endpoints return plain text for non-streaming requests.
        payload = null;
      }

      if (payload?.code && payload.code >= 400) {
        throw new Error(`Kie rejected ${model}: ${payload.msg || `code ${payload.code}`}`);
      }

      const choice = payload?.choices?.[0];
      const text =
        extractTextValue(choice?.message?.content) ||
        extractTextValue(choice?.delta?.content) ||
        extractTextValue(choice?.text) ||
        extractTextValue(payload?.output_text) ||
        extractTextValue(payload?.data?.choices?.[0]?.message?.content) ||
        (!payload ? rawPayload.trim() : "");

      if (!text) {
        throw new Error(`Kie ${model} returned an empty response`);
      }

      logChatEvent(trace, "provider_completed", {
        provider: "kie",
        model,
        latencyMs: Date.now() - startedAt,
        textCharacters: text.length,
      });

      return { text, model };
    } catch (error) {
      lastError = error;
      logChatEvent(trace, "provider_failed", {
        provider: "kie",
        model,
        latencyMs: Date.now() - startedAt,
        error: getErrorSummary(error),
      });
    } finally {
      timeout.dispose();
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Kie fallback failed");
}

async function generateReliableAnswer(
  messages: ChatMessage[],
  maxTokens: number,
  trace: ChatTrace,
): Promise<GeneratedAnswer> {
  let lastError: unknown;

  for (const [index, thinkingMode] of DEEPSEEK_THINKING_ATTEMPT_ORDER.entries()) {
    const attempt = index + 1;
    try {
      const text = await generateWithDeepSeek(messages, maxTokens, trace, attempt, thinkingMode);
      return { text, provider: "deepseek", model: ASTRO_CHAT_MODEL };
    } catch (error) {
      lastError = error;
      if (attempt < DEEPSEEK_THINKING_ATTEMPT_ORDER.length) {
        logChatEvent(trace, "provider_retry_scheduled", {
          provider: "deepseek",
          nextAttempt: attempt + 1,
          maxAttempts: DEEPSEEK_THINKING_ATTEMPT_ORDER.length,
          previousThinking: thinkingMode,
          nextThinking: DEEPSEEK_THINKING_ATTEMPT_ORDER[attempt],
          error: getErrorSummary(error),
        });
      }
    }
  }

  try {
    logChatEvent(trace, "fallback_started", {
      primaryProvider: "deepseek",
      fallbackProvider: "kie",
    });
    const fallback = await generateWithKie(messages, maxTokens, trace);
    if (fallback) {
      logChatEvent(trace, "fallback_recovered", {
        provider: "kie",
        model: fallback.model,
        textCharacters: fallback.text.length,
      });
      return { text: fallback.text, provider: "kie", model: fallback.model };
    }
  } catch (error) {
    lastError = error;
    logChatEvent(trace, "fallback_failed", {
      provider: "kie",
      error: getErrorSummary(error),
    });
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No AI provider produced a response");
}

function createDataStreamResponse(answer: GeneratedAnswer, trace: ChatTrace) {
  const encoder = new TextEncoder();
  const chunks = answer.text.match(/[\s\S]{1,180}/g) || [answer.text];
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        // AI SDK data-stream text frame: preserves the existing useChat client contract.
        controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk)}\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Vercel-AI-Data-Stream": "v1",
      "X-Astro-Chat-Provider": answer.provider,
      "X-Astro-Chat-Model": answer.model,
      "X-Astro-Chat-Trace-Id": trace.id,
    },
  });
}

// 检测用户问题的语言
function detectUserLanguage(text: string): string {
  const trimmedText = text.trim();
  
  // 检测中文（包含中文字符）
  if (/[\u4e00-\u9fa5]/.test(trimmedText)) {
    return '中文';
  }
  
  // 检测西班牙文（包含西班牙语特殊字符）
  if (/[áéíóúñüÁÉÍÓÚÑÜ]/.test(trimmedText)) {
    return '西班牙文';
  }
  
  // 检测意大利文（包含意大利语特殊字符）
  if (/[àèéìíîòóùúÀÈÉÌÍÎÒÓÙÚ]/.test(trimmedText)) {
    return '意大利文';
  }
  
  // 检测葡萄牙文（包含葡萄牙语特殊字符）
  if (/[ãõçÃÕÇ]/.test(trimmedText)) {
    return '葡萄牙文';
  }
  
  // 检测是否有英文字母（大部分情况下是英文）
  if (/[a-zA-Z]/.test(trimmedText)) {
    return '英文';
  }
  
  // 默认英文
  return '英文';
}

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  chartData: {
    birthData: {
      date: string;
      time: string;
      location: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
    };
    planetLines: {
      planet: string;
      type: 'AS' | 'DS' | 'MC' | 'IC';
      coordinates: [number, number][];
      color: string;
    }[];
  };
  /** When set, uses synastry context instead of map lines (planetLines may be empty). */
  synastryData?: SynastryPayloadForAI;
  questionCount?: number; // 当前是第几个问题
  remainingFreeQuestions?: number; // 剩余免费问题数量
  userLocale?: string; // 🔥 新增：用户语言环境（用于优化 AI 回答）
  requestType?: 'standard' | 'city_comparison_report';
}

export async function POST(req: Request) {
  const trace: ChatTrace = {
    id: crypto.randomUUID(),
    requestType: "unknown",
    startedAt: Date.now(),
  };

  try {
    const body: ChatRequest = await req.json();
    const { messages, chartData, synastryData, questionCount, remainingFreeQuestions, userLocale, requestType = 'standard' } = body;
    trace.requestType = requestType;

    logChatEvent(trace, "request_received", {
      messageCount: messages?.length || 0,
      lastMessageCharacters: messages?.[messages.length - 1]?.content?.length || 0,
      hasChartData: Boolean(chartData),
      hasSynastryData: Boolean(synastryData),
      planetLineCount: chartData?.planetLines?.length || 0,
    });

    // 验证必需参数
    if (!messages || messages.length === 0) {
      return respErr("Messages cannot be empty");
    }

    // 获取最后一条用户消息
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user' || !lastMessage.content.trim()) {
      return respErr("Question cannot be empty");
    }

    // 🔥 详细检查 chartData / synastryData
    if (!chartData) {
      logChatEvent(trace, "request_rejected", { reason: "chart_data_missing" });
      return respErr("Chart data is incomplete");
    }

    if (synastryData) {
      if (!synastryData.personA?.birthData || !synastryData.personB?.birthData) {
        return respErr("Synastry data is incomplete");
      }
      if (!Array.isArray(synastryData.aspects)) {
        return respErr("Synastry aspects are missing");
      }
      const a = synastryData.personA.birthData;
      const b = synastryData.personB.birthData;
      if (!a.date || !a.time || !a.location || !b.date || !b.time || !b.location) {
        return respErr("Synastry birth data is incomplete");
      }
      logChatEvent(trace, "request_validated", { contextType: "synastry" });
    } else {
      if (!chartData.birthData) {
        logChatEvent(trace, "request_rejected", { reason: "birth_data_missing" });
        return respErr("Chart data is incomplete");
      }

      if (!chartData.planetLines) {
        logChatEvent(trace, "request_rejected", { reason: "planet_lines_missing" });
        return respErr("Chart data is incomplete");
      }

      if (!chartData.birthData.date || !chartData.birthData.time || !chartData.birthData.location) {
        logChatEvent(trace, "request_rejected", {
          reason: "birth_data_incomplete",
          hasDate: !!chartData.birthData.date,
          hasTime: !!chartData.birthData.time,
          hasLocation: !!chartData.birthData.location,
        });
        return respErr("Chart data is incomplete");
      }

      if (!Array.isArray(chartData.planetLines) || chartData.planetLines.length === 0) {
        logChatEvent(trace, "request_rejected", {
          reason: "planet_lines_empty",
          isArray: Array.isArray(chartData.planetLines),
          length: chartData.planetLines?.length || 0,
        });
        return respErr("Chart data is incomplete");
      }

      const firstLine = chartData.planetLines[0];
      if (!firstLine || !firstLine.type) {
        logChatEvent(trace, "request_rejected", {
          reason: "planet_line_type_missing",
          hasType: !!firstLine?.type,
        });
        return respErr("Chart data is incomplete");
      }

      logChatEvent(trace, "request_validated", {
        contextType: "astrocartography",
        planetLineCount: chartData.planetLines.length,
      });
    }

    // 🔥 检查用户是否登录
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      logChatEvent(trace, "request_rejected", { reason: "auth_required" });
      // 返回 401 状态码，添加 type 字段标识为需要登录
      return new Response(
        JSON.stringify({ 
          code: 401, 
          type: 'auth_required',
          message: "Please sign in to continue using Astro Chat" 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 🔥 获取 AI 消耗的积分数量：普通聊天读取配置，城市对比完整报告固定 50 credits
    const creditCost =
      requestType === 'city_comparison_report'
        ? CITY_COMPARISON_REPORT_CREDIT_COST
        : getAIChatCreditCost();
    
    // 🔥 检查用户积分余额
    const userCredits = await getUserCredits(user_uuid);
    if (userCredits.left_credits < creditCost) {
      logChatEvent(trace, "request_rejected", {
        reason: "insufficient_credits",
        creditCost,
      });
      // 返回 402 状态码，添加 type 字段标识为积分不足
      return new Response(
        JSON.stringify({
          code: 402,
          type: 'insufficient_credits',
          message: `Insufficient credits. ${creditCost} credits required, current balance: ${userCredits.left_credits} credits`,
          creditCost,
          currentBalance: userCredits.left_credits,
        }),
        {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    try {
      // 检测用户问题的语言
      const userLanguage = detectUserLanguage(lastMessage.content);
      
      // 计算问题数量（如果未提供，从 messages 计算）
      const actualQuestionCount = questionCount ?? messages.filter(m => m.role === 'user').length;
      const actualRemainingFreeQuestions = remainingFreeQuestions ?? 0;
      
      const chartContext = synastryData
        ? formatSynastryContext(synastryData)
        : formatChartContext(chartData);

      const systemPrompt = synastryData
        ? getSynastrySystemPrompt(userLanguage, actualQuestionCount, actualRemainingFreeQuestions, userLocale)
        : getSystemPrompt(userLanguage, actualQuestionCount, actualRemainingFreeQuestions, userLocale);

      const chartDataIntro = synastryData
        ? userLanguage === "中文"
          ? "以下是双方的合盘（比较盘）数据："
          : "Below is the synastry (two-chart relationship) data:"
        : userLanguage === "中文"
          ? "以下是用户的星盘数据："
          : userLanguage === "英文"
            ? "Below is the user's astrocartography chart data:"
            : "Below is the user's astrocartography chart data:";
      
      const systemMessage = {
        role: 'system' as const,
        content: `${systemPrompt}\n\n${
          requestType === 'city_comparison_report'
            ? 'The user is requesting a paid full city comparison report. Provide a structured, complete report with clear sections, but only interpret the supplied astrocartography evidence. Do not invent cities, exact predictions, or guarantees.'
            : ''
        }\n\n${chartDataIntro}\n\n${chartContext}`,
      };

      // 🔥 修复：构建完整的对话上下文（系统消息 + 所有用户消息，包括当前问题）
      // useChat 会将当前输入添加到 messages 的最后一条，我们必须包含它，否则 AI 看不到当前问题
      const conversationMessages = [
        systemMessage,
        ...messages, // ✅ 包含所有消息，包括当前用户问题（最后一条）
      ];

      const maxTokens = requestType === "city_comparison_report"
        ? CITY_COMPARISON_REPORT_MAX_TOKENS
        : STANDARD_CHAT_MAX_TOKENS;

      logChatEvent(trace, "model_request_prepared", {
        messageCount: conversationMessages.length,
        systemContextCharacters: systemMessage.content.length,
        maxTokens,
        thinkingAttemptOrder: DEEPSEEK_THINKING_ATTEMPT_ORDER,
      });

      // Do not settle credits until an AI provider has returned a complete, non-empty answer.
      // This prevents a failed or empty stream from charging the user.
      const answer = await generateReliableAnswer(
        conversationMessages,
        maxTokens,
        trace,
      );

      try {
        await decreaseCredits({
          user_uuid,
          trans_type: CreditsTransType.AIChat,
          credits: creditCost,
        });
        logChatEvent(trace, "credits_settled", {
          creditCost,
          provider: answer.provider,
          model: answer.model,
          textCharacters: answer.text.length,
        });
      } catch (creditError) {
        logChatEvent(trace, "credit_settlement_failed", {
          creditCost,
          provider: answer.provider,
          model: answer.model,
          error: getErrorSummary(creditError),
        });
        return new Response(
          JSON.stringify({ code: 500, message: "Could not confirm credits. Please try again." }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        );
      }

      logChatEvent(trace, "request_completed", {
        provider: answer.provider,
        model: answer.model,
        textCharacters: answer.text.length,
      });
      return createDataStreamResponse(answer, trace);
    } catch (aiError) {
      logChatEvent(trace, "request_failed_no_charge", {
        error: getErrorSummary(aiError),
      });
      return new Response(
        JSON.stringify({
          code: 503,
          type: "ai_temporarily_unavailable",
          message: "AI is temporarily unavailable. No credits were used; please try again shortly.",
          traceId: trace.id,
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "X-Astro-Chat-Trace-Id": trace.id,
          },
        },
      );
    }

  } catch (err) {
    logChatEvent(trace, "request_error", { error: getErrorSummary(err) });
    const errorMessage = err instanceof Error ? err.message : "AI chat service error";
    return respErr(errorMessage);
  }
}
