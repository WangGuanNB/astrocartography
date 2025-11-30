import {
  LanguageModelV1,
  streamText,
} from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { respErr } from "@/lib/resp";
import { formatChartContext, getSystemPrompt } from "@/lib/astro-format";

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
      return respErr("消息不能为空");
    }

    // 获取最后一条用户消息
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== 'user' || !lastMessage.content.trim()) {
      return respErr("问题不能为空");
    }

    if (!chartData || !chartData.birthData || !chartData.planetLines) {
      return respErr("星盘数据不完整");
    }

    // 检查 DeepSeek API Key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error("DEEPSEEK_API_KEY not configured");
      return respErr("AI 服务未配置：DEEPSEEK_API_KEY 环境变量未设置");
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
    const errorMessage = err instanceof Error ? err.message : "AI 聊天服务出错";
    return respErr(errorMessage);
  }
}

