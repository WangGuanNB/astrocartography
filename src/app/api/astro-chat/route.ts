import {
  LanguageModelV1,
  streamText,
} from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { respErr } from "@/lib/resp";
import { formatChartContext, getSystemPrompt } from "@/lib/astro-format";
import { getUserUuid } from "@/services/user";
import { getUserCredits, decreaseCredits, CreditsTransType } from "@/services/credit";
import { getAIChatCreditCost } from "@/services/config";

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
}

export async function POST(req: Request) {
  try {
    const body: ChatRequest = await req.json();
    const { messages, chartData } = body;

    // 验证必需参数
    if (!messages || messages.length === 0) {
      return respErr("Messages cannot be empty");
    }

    // 获取最后一条用户消息
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user' || !lastMessage.content.trim()) {
      return respErr("Question cannot be empty");
    }

    if (!chartData || !chartData.birthData || !chartData.planetLines) {
      return respErr("Chart data is incomplete");
    }

    // 🔥 检查用户是否登录
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return new Response(
        JSON.stringify({ code: 401, message: "Please sign in first" }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 🔥 获取 AI 聊天消耗的积分数量（从配置读取）
    const creditCost = getAIChatCreditCost();
    
    // 🔥 检查用户积分余额
    const userCredits = await getUserCredits(user_uuid);
    if (userCredits.left_credits < creditCost) {
      // 返回 402 状态码，错误信息包含"insufficient"关键词，方便前端识别
      return new Response(
        JSON.stringify({
          code: 402,
          message: `Insufficient credits. ${creditCost} credits required, current balance: ${userCredits.left_credits} credits`,
        }),
        {
          status: 402,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // 🔥 消耗积分（在调用 AI 之前）
    try {
      await decreaseCredits({
        user_uuid,
        trans_type: CreditsTransType.AIChat,
        credits: creditCost,
      });
      console.log(`✅ [Astro Chat] 用户 ${user_uuid} 消耗 ${creditCost} 积分进行 AI 聊天`);
    } catch (creditError: any) {
      console.error("❌ [Astro Chat] 消耗积分失败:", creditError);
      return new Response(
        JSON.stringify({ code: 500, message: "Failed to deduct credits, please try again later" }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 检查 DeepSeek API Key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error("DEEPSEEK_API_KEY not configured");
      return respErr("AI service not configured: DEEPSEEK_API_KEY environment variable is not set");
    }

    // 初始化 DeepSeek 模型
    // 使用 deepseek-chat 模型（性能好、成本低、中文支持佳）
    // deepseek() 会自动从环境变量 DEEPSEEK_API_KEY 读取 API Key
    const textModel: LanguageModelV1 = deepseek("deepseek-chat");

    // 检测用户问题的语言
    const userLanguage = detectUserLanguage(lastMessage.content);
    
    // 格式化星盘数据为上下文
    const chartContext = formatChartContext(chartData);
    
    // 根据用户语言生成系统提示词（明确指定回答语言）
    const systemPrompt = getSystemPrompt(userLanguage);

    // 构建系统消息（包含星盘上下文）
    // 根据用户语言调整星盘数据说明的语言
    const chartDataIntro = userLanguage === '中文' 
      ? '以下是用户的星盘数据：'
      : userLanguage === '英文'
      ? 'Below is the user\'s astrocartography chart data:'
      : 'Below is the user\'s astrocartography chart data:';
    
    const systemMessage = {
      role: 'system' as const,
      content: `${systemPrompt}\n\n${chartDataIntro}\n\n${chartContext}`,
    };

    // 构建完整的对话上下文（系统消息 + 用户消息历史）
    // useChat 已经处理了当前消息，我们只需要历史消息
    const conversationMessages = [
      systemMessage,
      ...messages.slice(0, -1), // 排除最后一条（当前用户消息，useChat 会自动添加）
    ];

    // 调用 AI 生成流式响应
    const result = await streamText({
      model: textModel,
      messages: conversationMessages,
      maxTokens: 2000,
      temperature: 0.7, // 平衡创造性和准确性
    });

    // 返回流式响应
    return result.toDataStreamResponse({
      sendReasoning: false, // DeepSeek chat 不支持推理过程
    });

  } catch (err) {
    console.error("astro-chat error:", err);
    const errorMessage = err instanceof Error ? err.message : "AI chat service error";
    return respErr(errorMessage);
  }
}

