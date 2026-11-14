import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { detectLanguage } from '@/lib/astro-format';
import { getFollowUpPrompt } from '@/lib/chat-follow-up';

const FOLLOW_UP_MODEL = process.env.DEEPSEEK_FOLLOW_UP_MODEL || 'deepseek-v4-flash';
const FOLLOW_UP_MAX_TOKENS = 200;
const FOLLOW_UP_TIMEOUT_MS = 30_000;

type FollowUpAnswer = {
  text: string;
  provider: 'deepseek' | 'kie';
  model: string;
};

function getErrorSummary(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}`.slice(0, 500);
  }

  return String(error).slice(0, 500);
}

function logFollowUpEvent(traceId: string, startedAt: number, event: string, fields: Record<string, unknown> = {}) {
  console.info('[Astro Follow-up]', JSON.stringify({
    event,
    traceId,
    elapsedMs: Date.now() - startedAt,
    ...fields,
  }));
}

function withTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    dispose: () => clearTimeout(timeout),
  };
}

function extractTextValue(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object') {
          const record = part as { text?: unknown; content?: unknown };
          return extractTextValue(record.text) || extractTextValue(record.content);
        }
        return '';
      })
      .join('')
      .trim();
  }

  return '';
}

const followUpDeepSeek = createDeepSeek({
  // Suggestions only reorganize the completed interpretation into useful next
  // questions. They must not spend a second reasoning pass on the chart.
  fetch: async (input, init) => {
    if (typeof init?.body !== 'string') {
      return fetch(input, init);
    }

    try {
      const requestBody = JSON.parse(init.body) as Record<string, unknown>;
      return fetch(input, {
        ...init,
        body: JSON.stringify({
          ...requestBody,
          thinking: { type: 'disabled' },
        }),
      });
    } catch {
      return fetch(input, init);
    }
  },
});

/**
 * 生成追问建议的 API 路由
 * 基于用户问题和 AI 回答，使用 AI 生成 3 个相关的追问建议
 */
export async function POST(req: NextRequest) {
  const traceId = crypto.randomUUID();
  const startedAt = Date.now();

  try {
    const body = await req.json();
    const { userQuestion, aiResponse, language } = body;

    // 验证必需参数
    if (!userQuestion || !aiResponse) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters: userQuestion and aiResponse' },
        { status: 400 }
      );
    }

    // 检测用户问题的语言（如果没有提供）
    const detectedLanguage = language || detectLanguage(userQuestion);
    
    // 根据语言生成对应的提示词模板
    const followUpPrompt = getFollowUpPrompt(userQuestion, aiResponse, detectedLanguage);

    const answer = await generateReliableFollowUp(
      followUpPrompt,
      traceId,
      startedAt,
      userQuestion.length,
      aiResponse.length,
    );

    // 返回 JSON 响应（包含生成的追问建议）
    return NextResponse.json({
      success: true,
      text: answer.text,
      provider: answer.provider,
      model: answer.model,
    });

  } catch (err) {
    logFollowUpEvent(traceId, startedAt, 'request_failed', {
      error: getErrorSummary(err),
    });
    return NextResponse.json(
      { success: false, error: 'Follow-up suggestions are temporarily unavailable', traceId },
      { status: 500 }
    );
  }
}

async function generateWithDeepSeek(
  prompt: string,
  traceId: string,
  requestStartedAt: number,
  userQuestionCharacters: number,
  responseCharacters: number,
): Promise<FollowUpAnswer> {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY not configured');
  }

  const startedAt = Date.now();
  const timeout = withTimeoutSignal(FOLLOW_UP_TIMEOUT_MS);

  try {
    logFollowUpEvent(traceId, requestStartedAt, 'provider_started', {
      provider: 'deepseek',
      model: FOLLOW_UP_MODEL,
      thinking: 'disabled',
      maxTokens: FOLLOW_UP_MAX_TOKENS,
      userQuestionCharacters,
      responseCharacters,
    });

    const result = await generateText({
      model: followUpDeepSeek(FOLLOW_UP_MODEL),
      prompt,
      maxTokens: FOLLOW_UP_MAX_TOKENS,
      temperature: 0.3,
      maxRetries: 0,
      abortSignal: timeout.signal,
    });
    const text = result.text.trim();

    if (!text) {
      throw new Error('DeepSeek returned an empty follow-up response');
    }

    logFollowUpEvent(traceId, requestStartedAt, 'provider_completed', {
      provider: 'deepseek',
      model: FOLLOW_UP_MODEL,
      thinking: 'disabled',
      latencyMs: Date.now() - startedAt,
      textCharacters: text.length,
      totalTokens: result.usage.totalTokens,
    });

    return { text, provider: 'deepseek', model: FOLLOW_UP_MODEL };
  } catch (error) {
    logFollowUpEvent(traceId, requestStartedAt, 'provider_failed', {
      provider: 'deepseek',
      model: FOLLOW_UP_MODEL,
      latencyMs: Date.now() - startedAt,
      error: getErrorSummary(error),
    });
    throw error;
  } finally {
    timeout.dispose();
  }
}

async function generateWithKie(prompt: string, traceId: string, requestStartedAt: number): Promise<FollowUpAnswer> {
  const apiKey = process.env.KIE_AI_API_KEY;
  if (!apiKey || process.env.KIE_AI_FALLBACK_ENABLED === 'false') {
    throw new Error('Kie fallback is not configured');
  }

  const configuredModel = process.env.KIE_AI_FALLBACK_MODEL || 'gemini-2.5-flash';
  const models = process.env.KIE_AI_FALLBACK_URL
    ? [configuredModel]
    : [...new Set([configuredModel, 'gemini-2.5-flash'])];
  let lastError: unknown;

  for (const model of models) {
    const startedAt = Date.now();
    const timeout = withTimeoutSignal(FOLLOW_UP_TIMEOUT_MS);

    try {
      logFollowUpEvent(traceId, requestStartedAt, 'provider_started', {
        provider: 'kie',
        model,
        maxTokens: FOLLOW_UP_MAX_TOKENS,
      });

      const endpoint = process.env.KIE_AI_FALLBACK_URL || `https://api.kie.ai/${model}/v1/chat/completions`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: timeout.signal,
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: FOLLOW_UP_MAX_TOKENS,
          temperature: 0.3,
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
        choices?: Array<{ message?: { content?: unknown }; delta?: { content?: unknown }; text?: unknown }>;
        output_text?: unknown;
        data?: { choices?: Array<{ message?: { content?: unknown } }> };
      } | null = null;

      try {
        payload = JSON.parse(rawPayload);
      } catch {
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
        (!payload ? rawPayload.trim() : '');

      if (!text) {
        throw new Error(`Kie ${model} returned an empty follow-up response`);
      }

      logFollowUpEvent(traceId, requestStartedAt, 'provider_completed', {
        provider: 'kie',
        model,
        latencyMs: Date.now() - startedAt,
        textCharacters: text.length,
      });

      return { text, provider: 'kie', model };
    } catch (error) {
      lastError = error;
      logFollowUpEvent(traceId, requestStartedAt, 'provider_failed', {
        provider: 'kie',
        model,
        latencyMs: Date.now() - startedAt,
        error: getErrorSummary(error),
      });
    } finally {
      timeout.dispose();
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Kie fallback failed');
}

async function generateReliableFollowUp(
  prompt: string,
  traceId: string,
  startedAt: number,
  userQuestionCharacters: number,
  responseCharacters: number,
): Promise<FollowUpAnswer> {
  try {
    return await generateWithDeepSeek(prompt, traceId, startedAt, userQuestionCharacters, responseCharacters);
  } catch (error) {
    logFollowUpEvent(traceId, startedAt, 'fallback_started', {
      primaryProvider: 'deepseek',
      fallbackProvider: 'kie',
      error: getErrorSummary(error),
    });
  }

  try {
    const answer = await generateWithKie(prompt, traceId, startedAt);
    logFollowUpEvent(traceId, startedAt, 'fallback_recovered', {
      provider: answer.provider,
      model: answer.model,
      textCharacters: answer.text.length,
    });
    return answer;
  } catch (error) {
    logFollowUpEvent(traceId, startedAt, 'fallback_failed', {
      provider: 'kie',
      error: getErrorSummary(error),
    });
    throw error;
  }
}
