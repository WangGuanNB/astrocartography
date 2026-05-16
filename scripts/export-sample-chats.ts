/**
 * 导出最近的聊天记录样本（包含完整消息内容）
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatSession {
  id: string;
  user_uuid: string;
  created_at: string;
  updated_at: string;
  title: string | null;
  message_count: number;
  messages: ChatMessage[];
}

interface D1QueryResult {
  results: Record<string, unknown>[];
  success: boolean;
}

interface D1ApiResponse {
  success: boolean;
  errors: { code: number; message: string }[];
  result: D1QueryResult[];
}

async function queryD1(sql: string, params: unknown[] = []): Promise<D1QueryResult> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;
  const token = process.env.CLOUDFLARE_D1_TOKEN;

  if (!accountId || !databaseId || !token) {
    throw new Error('Missing required environment variables');
  }

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;

  const response = await fetch(`${baseUrl}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql, params }),
  });

  const responseText = await response.text();
  
  if (!response.ok) {
    console.error('Response:', responseText);
    throw new Error(`D1 HTTP request failed: ${response.status} ${response.statusText}`);
  }

  const data = JSON.parse(responseText) as D1ApiResponse;

  if (!data.success) {
    const errMsg = data.errors?.map((e) => e.message).join(', ') ?? 'Unknown error';
    throw new Error(`D1 API error: ${errMsg}`);
  }

  return data.result[0];
}

async function exportSampleChats() {
  console.log('🚀 开始导出最近 500 条聊天记录样本...\n');

  try {
    // 查询最近 500 条记录（包含完整消息）
    const result = await queryD1(`
      SELECT 
        id,
        user_uuid,
        created_at,
        updated_at,
        title,
        message_count,
        messages
      FROM ai_chat_sessions_astrocarto
      ORDER BY created_at DESC
      LIMIT 500
    `);

    const sessions = result.results as unknown as ChatSession[];

    console.log(`✅ 成功获取 ${sessions.length} 条记录\n`);

    // 创建导出目录
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // 导出 JSON
    const jsonPath = path.join(exportDir, `chat-sample-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(sessions, null, 2), 'utf-8');
    console.log(`✅ JSON 已导出: ${jsonPath}`);

    // 提取所有用户问题
    const allUserQuestions: string[] = [];
    sessions.forEach(session => {
      const messages = typeof session.messages === 'string' 
        ? JSON.parse(session.messages) 
        : session.messages;
      
      messages.forEach((msg: ChatMessage) => {
        if (msg.role === 'user') {
          allUserQuestions.push(msg.content);
        }
      });
    });

    // 导出用户问题列表
    const questionsPath = path.join(exportDir, `user-questions-${timestamp}.txt`);
    fs.writeFileSync(questionsPath, allUserQuestions.join('\n\n---\n\n'), 'utf-8');
    console.log(`✅ 用户问题列表已导出: ${questionsPath}`);

    console.log('\n🎉 导出完成！');
    console.log(`📊 样本记录数: ${sessions.length}`);
    console.log(`💬 用户问题数: ${allUserQuestions.length}`);

  } catch (error) {
    console.error('❌ 导出失败:', error);
    process.exit(1);
  }
}

exportSampleChats();
