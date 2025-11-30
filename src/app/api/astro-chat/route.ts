import {
  LanguageModelV1,
  streamText,
} from "ai";
import { deepseek } from "@ai-sdk/deepseek";
import { respErr } from "@/lib/resp";
import { formatChartContext, getSystemPrompt } from "@/lib/astro-format";

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
    if (!process.env.DEEPSEEK_API_KEY) {
      console.error("DEEPSEEK_API_KEY not configured");
      return respErr("AI 服务未配置");
    }

    // 初始化 DeepSeek 模型
    // 使用 deepseek-chat 模型（性能好、成本低、中文支持佳）
    const textModel: LanguageModelV1 = deepseek("deepseek-chat");

    // 格式化星盘数据为上下文
    const chartContext = formatChartContext(chartData);
    const systemPrompt = getSystemPrompt();

    // 构建系统消息（包含星盘上下文）
    const systemMessage = {
      role: 'system' as const,
      content: `${systemPrompt}\n\n以下是用户的星盘数据：\n\n${chartContext}`,
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

