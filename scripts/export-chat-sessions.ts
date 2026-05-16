/**
 * 导出所有占星聊天记录脚本
 * 
 * 使用方法：
 * 1. 确保 .env.local 中配置了以下环境变量：
 *    - CLOUDFLARE_ACCOUNT_ID
 *    - CLOUDFLARE_D1_TOKEN
 *    - CLOUDFLARE_D1_DATABASE_ID
 * 
 * 2. 运行脚本：
 *    npx tsx scripts/export-chat-sessions.ts
 * 
 * 3. 导出的文件会保存在 exports/ 目录下
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

// 加载环境变量
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
  chart_context_json: string | null;
  is_synastry: boolean;
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
    throw new Error('Missing required environment variables: CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_D1_TOKEN');
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

async function exportChatSessions() {
  console.log('🚀 开始导出占星聊天记录...\n');

  try {
    // 先查询总数
    const countResult = await queryD1(`
      SELECT COUNT(*) as total
      FROM ai_chat_sessions_astrocarto
    `);
    
    const total = (countResult.results[0] as any).total;
    console.log(`📊 总共有 ${total} 条聊天记录\n`);

    // 分页查询，每次 50 条
    const pageSize = 50;
    const totalPages = Math.ceil(total / pageSize);
    const allSessions: ChatSession[] = [];

    for (let page = 0; page < totalPages; page++) {
      console.log(`📥 正在获取第 ${page + 1}/${totalPages} 页...`);
      
      const result = await queryD1(`
        SELECT 
          id,
          user_uuid,
          created_at,
          updated_at,
          title,
          message_count
        FROM ai_chat_sessions_astrocarto
        ORDER BY created_at DESC
        LIMIT ${pageSize} OFFSET ${page * pageSize}
      `);

      const sessions = result.results as unknown as ChatSession[];
      allSessions.push(...sessions);
    }

    console.log(`\n✅ 成功获取 ${allSessions.length} 条记录\n`);

    // 创建导出目录
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // 生成时间戳
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // 导出完整 JSON 格式
    const jsonPath = path.join(exportDir, `chat-sessions-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(allSessions, null, 2), 'utf-8');
    console.log(`✅ JSON 格式已导出: ${jsonPath}`);

    console.log('\n🎉 导出完成！');
    console.log(`\n📁 导出文件: ${jsonPath}`);
    console.log(`📊 总记录数: ${allSessions.length}`);
    console.log(`💬 总消息数: ${allSessions.reduce((sum, s) => sum + s.message_count, 0)}`);

  } catch (error) {
    console.error('❌ 导出失败:', error);
    process.exit(1);
  }
}

// 运行导出
exportChatSessions();
