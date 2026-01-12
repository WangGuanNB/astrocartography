import { NextRequest, NextResponse } from 'next/server';
import { generateText, LanguageModelV1 } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { detectLanguage } from '@/lib/astro-format';

/**
 * 生成追问建议的 API 路由
 * 基于用户问题和 AI 回答，使用 AI 生成 3 个相关的追问建议
 */
export async function POST(req: NextRequest) {
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

    // 检查 DeepSeek API Key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error("DEEPSEEK_API_KEY not configured");
      return NextResponse.json(
        { success: false, error: 'AI service not configured: DEEPSEEK_API_KEY environment variable is not set' },
        { status: 500 }
      );
    }

    // 获取文本模型（使用与 astro-chat 相同的模型）
    const modelName = process.env.AI_MODEL || 'deepseek-chat';
    const textModel: LanguageModelV1 = deepseek(modelName);

    // 调用 AI 生成追问建议（使用 generateText 而非 streamText，因为追问建议很短）
    const result = await generateText({
      model: textModel,
      prompt: followUpPrompt,
      maxTokens: 200, // 追问建议较短，不需要太多 tokens
      temperature: 0.3, // 较低的 temperature 确保格式一致性
    });

    // 返回 JSON 响应（包含生成的追问建议）
    return NextResponse.json({
      success: true,
      text: result.text,
    });

  } catch (err) {
    console.error('generate-follow-up error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to generate follow-up suggestions';
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
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

用户的原始问题：${userQuestion}

AI 的回答：
${aiResponse.substring(0, 500)}${aiResponse.length > 500 ? '...' : ''}

现在生成 3 个追问建议，格式：A. [问题1] B. [问题2] C. [问题3]`,
      examples: `好的示例：
A. 这些城市哪个区域最适合我？ B. 什么时候去这些城市最好？ C. 还有其他适合的城市吗？

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

User's original question: ${userQuestion}

AI's response:
${aiResponse.substring(0, 500)}${aiResponse.length > 500 ? '...' : ''}

Now generate 3 follow-up suggestions in format: A. [question1] B. [question2] C. [question3]`,
      examples: `Good examples:
A. Which area in these cities is best for me? B. When is the best time to visit these cities? C. Are there other suitable cities?

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

Pregunta original del usuario: ${userQuestion}

Respuesta de la IA:
${aiResponse.substring(0, 500)}${aiResponse.length > 500 ? '...' : ''}

Ahora genera 3 sugerencias de seguimiento en formato: A. [pregunta1] B. [pregunta2] C. [pregunta3]`,
      examples: `Buenos ejemplos:
A. ¿Qué área en estas ciudades es mejor para mí? B. ¿Cuándo es el mejor momento para visitar estas ciudades? C. ¿Hay otras ciudades adecuadas?

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

Domanda originale dell'utente: ${userQuestion}

Risposta dell'IA:
${aiResponse.substring(0, 500)}${aiResponse.length > 500 ? '...' : ''}

Ora genera 3 suggerimenti di follow-up nel formato: A. [domanda1] B. [domanda2] C. [domanda3]`,
      examples: `Buoni esempi:
A. Quale area in queste città è migliore per me? B. Quando è il momento migliore per visitare queste città? C. Ci sono altre città adatte?

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

Pergunta original do usuário: ${userQuestion}

Resposta da IA:
${aiResponse.substring(0, 500)}${aiResponse.length > 500 ? '...' : ''}

Agora gere 3 sugestões de acompanhamento no formato: A. [pergunta1] B. [pergunta2] C. [pergunta3]`,
      examples: `Bons exemplos:
A. Qual área nessas cidades é melhor para mim? B. Quando é o melhor momento para visitar essas cidades? C. Existem outras cidades adequadas?

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
