import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { detectLanguage } from '@/lib/astro-format';

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

/**
 * 生成追问建议的提示词（多语言支持）
 */
function getFollowUpPrompt(userQuestion: string, aiResponse: string, language: string): string {
  // 语言映射
  const languageMap: Record<string, { name: string; instructions: string; examples: string }> = {
    '中文': {
      name: '中文',
      instructions: `你正在基于用户的提问和 AI 的回答生成 3 个追问建议。

要求（必须严格遵守）：
1. 生成 EXACTLY 3 个问题
2. 格式必须为：A. [问题1] B. [问题2] C. [问题3]
3. 使用与用户问题相同的语言（中文）
4. 问题必须具体且可操作（不要问开放式问题）
5. 基于 AI 回答中提到的城市、行星线等内容生成相关问题
6. 每个问题应该在 5-15 个字之间
7. 三个问题应分别覆盖：更深层原因、基于地图线的城市比较、替代城市或行星线
8. 保持正向好奇，不要制造焦虑或恐惧
9. 严格限定在 AI 回答里已经出现的星盘、城市或行星线证据。不得建议具体时间窗口、旅行行程、街区游览、酒店、交通、安全、签证，或星盘数据无法支持的现实事实。

用户的原始问题：${userQuestion}

AI 的回答：
${aiResponse.substring(0, 500)}${aiResponse.length > 500 ? '...' : ''}

现在生成 3 个追问建议，格式：A. [问题1] B. [问题2] C. [问题3]`,
      examples: `好的示例：
A. 这些城市的关系线有什么不同？ B. 哪条线最影响这次选择？ C. 还有哪些城市值得比较？

不好的示例（太模糊）：
A. 告诉我更多 B. 还有什么？ C. 有趣`,
    },
    '英文': {
      name: 'English',
      instructions: `You are generating 3 follow-up questions based on the user's question and AI's response.

REQUIREMENTS (CRITICAL):
1. Generate EXACTLY 3 questions
2. Format MUST be: A. [question1] B. [question2] C. [question3]
3. Use the SAME language as the user's question (English)
4. Questions must be SPECIFIC and ACTIONABLE (not open-ended)
5. Base questions on cities, planetary lines, or other details mentioned in the AI response
6. Each question should be 5-15 words
7. The three questions should cover: deeper reasoning, a map-based city comparison, and alternative cities or planetary lines
8. Keep them positively curious; never use fear or anxiety as the hook
9. Stay strictly within astrocartography evidence already named in the AI response. Do not suggest timing windows, travel itineraries, neighbourhood visits, hotels, transport, safety, visas, or any real-world fact the chart data cannot support.

User's original question: ${userQuestion}

AI's response:
${aiResponse.substring(0, 500)}${aiResponse.length > 500 ? '...' : ''}

Now generate 3 follow-up suggestions in format: A. [question1] B. [question2] C. [question3]`,
      examples: `Good examples:
A. How do these cities differ for my goal? B. Which line matters most here? C. Which other cities are worth comparing?

Bad examples (too vague):
A. Tell me more B. What else? C. Interesting`,
    },
    '西班牙文': {
      name: 'Español',
      instructions: `Estás generando 3 preguntas de seguimiento basadas en la pregunta del usuario y la respuesta de la IA.

REQUISITOS (CRÍTICO):
1. Genera EXACTAMENTE 3 preguntas
2. El formato DEBE ser: A. [pregunta1] B. [pregunta2] C. [pregunta3]
3. Usa el MISMO idioma que la pregunta del usuario (Español)
4. Las preguntas deben ser ESPECÍFICAS y ACCIONABLES (no abiertas)
5. Basa las preguntas en ciudades, líneas planetarias u otros detalles mencionados en la respuesta de la IA
6. Cada pregunta debe tener 5-15 palabras
7. Las tres preguntas deben cubrir: razón más profunda, comparación de ciudades basada en el mapa y ciudades o líneas planetarias alternativas
8. Mantén una curiosidad positiva; nunca uses miedo o ansiedad como gancho
9. Limítate estrictamente a la evidencia de astrocartografía ya mencionada en la respuesta. No sugieras ventanas de tiempo, itinerarios, visitas a barrios, hoteles, transporte, seguridad, visados ni hechos reales que los datos de la carta no puedan respaldar.

Pregunta original del usuario: ${userQuestion}

Respuesta de la IA:
${aiResponse.substring(0, 500)}${aiResponse.length > 500 ? '...' : ''}

Ahora genera 3 sugerencias de seguimiento en formato: A. [pregunta1] B. [pregunta2] C. [pregunta3]`,
      examples: `Buenos ejemplos:
A. ¿Cómo difieren estas ciudades para mi objetivo? B. ¿Qué línea importa más aquí? C. ¿Qué otras ciudades vale la pena comparar?

Malos ejemplos (demasiado vagos):
A. Dime más B. ¿Qué más? C. Interesante`,
    },
    '意大利文': {
      name: 'Italiano',
      instructions: `Stai generando 3 domande di follow-up basate sulla domanda dell'utente e sulla risposta dell'IA.

REQUISITI (CRITICI):
1. Genera ESATTAMENTE 3 domande
2. Il formato DEVE essere: A. [domanda1] B. [domanda2] C. [domanda3]
3. Usa la STESSA lingua della domanda dell'utente (Italiano)
4. Le domande devono essere SPECIFICHE e AZIONABILI (non aperte)
5. Basa le domande su città, linee planetarie o altri dettagli menzionati nella risposta dell'IA
6. Ogni domanda dovrebbe avere 5-15 parole
7. Le tre domande devono coprire: ragione più profonda, confronto tra città basato sulla mappa e città o linee planetarie alternative
8. Mantieni una curiosità positiva; non usare mai paura o ansia come gancio
9. Attieniti rigorosamente alle evidenze di astrocartografia già citate nella risposta. Non suggerire finestre temporali, itinerari, visite ai quartieri, hotel, trasporti, sicurezza, visti o fatti reali che i dati della carta non possano supportare.

Domanda originale dell'utente: ${userQuestion}

Risposta dell'IA:
${aiResponse.substring(0, 500)}${aiResponse.length > 500 ? '...' : ''}

Ora genera 3 suggerimenti di follow-up nel formato: A. [domanda1] B. [domanda2] C. [domanda3]`,
      examples: `Buoni esempi:
A. In cosa differiscono queste città per il mio obiettivo? B. Quale linea conta di più qui? C. Quali altre città vale la pena confrontare?

Cattivi esempi (troppo vaghi):
A. Dimmi di più B. Cos'altro? C. Interessante`,
    },
    '葡萄牙文': {
      name: 'Português',
      instructions: `Você está gerando 3 perguntas de acompanhamento com base na pergunta do usuário e na resposta da IA.

REQUISITOS (CRÍTICO):
1. Gere EXATAMENTE 3 perguntas
2. O formato DEVE ser: A. [pergunta1] B. [pergunta2] C. [pergunta3]
3. Use o MESMO idioma da pergunta do usuário (Português)
4. As perguntas devem ser ESPECÍFICAS e ACIONÁVEIS (não abertas)
5. Baseie as perguntas em cidades, linhas planetárias ou outros detalhes mencionados na resposta da IA
6. Cada pergunta deve ter 5-15 palavras
7. As três perguntas devem cobrir: razão mais profunda, comparação de cidades baseada no mapa e cidades ou linhas planetárias alternativas
8. Mantenha uma curiosidade positiva; nunca use medo ou ansiedade como gancho
9. Limite-se estritamente às evidências de astrocartografia já citadas na resposta. Não sugira janelas de tempo, roteiros, visitas a bairros, hotéis, transporte, segurança, vistos ou fatos reais que os dados do mapa não possam sustentar.

Pergunta original do usuário: ${userQuestion}

Resposta da IA:
${aiResponse.substring(0, 500)}${aiResponse.length > 500 ? '...' : ''}

Agora gere 3 sugestões de acompanhamento no formato: A. [pergunta1] B. [pergunta2] C. [pergunta3]`,
      examples: `Bons exemplos:
A. Como essas cidades diferem para meu objetivo? B. Qual linha importa mais aqui? C. Quais outras cidades vale a pena comparar?

Maus exemplos (muito vagos):
A. Me diga mais B. O que mais? C. Interessante`,
    },
  };

  // 获取对应语言的配置（默认英文）
  const config = languageMap[language] || languageMap['英文'];

  return `${config.instructions}

EXAMPLES:
${config.examples}

Generate ONLY the 3 questions in A/B/C format, nothing else.`;
}
