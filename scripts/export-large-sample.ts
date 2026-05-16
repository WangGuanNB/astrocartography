/**
 * 分批导出大量聊天记录样本
 * 避免 D1 内存限制，分批次查询
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

interface ChatSession {
  id: string;
  user_uuid: string;
  created_at: number;
  updated_at: number;
  title: string | null;
  message_count: number;
  messages: string;
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

async function exportLargeSample() {
  console.log('🚀 开始分批导出大量聊天记录...\n');

  try {
    const BATCH_SIZE = 500;
    const TOTAL_BATCHES = 6; // 导出 3000 条记录
    const allSessions: ChatSession[] = [];

    // 分批查询
    for (let batch = 0; batch < TOTAL_BATCHES; batch++) {
      const offset = batch * BATCH_SIZE;
      console.log(`📦 正在获取第 ${batch + 1}/${TOTAL_BATCHES} 批数据 (offset: ${offset})...`);

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
        LIMIT ${BATCH_SIZE}
        OFFSET ${offset}
      `);

      const sessions = result.results as unknown as ChatSession[];
      allSessions.push(...sessions);
      
      console.log(`   ✅ 获取 ${sessions.length} 条记录 (累计: ${allSessions.length})\n`);

      // 避免请求过快
      if (batch < TOTAL_BATCHES - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`\n✅ 总共获取 ${allSessions.length} 条记录\n`);

    // 创建导出目录
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    // 导出完整 JSON
    const jsonPath = path.join(exportDir, `chat-large-sample-${timestamp}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(allSessions, null, 2), 'utf-8');
    console.log(`✅ 完整数据已导出: ${jsonPath}`);

    // 提取标题用于分析
    const titles = allSessions
      .map(s => s.title)
      .filter(t => t && t.trim().length > 0) as string[];

    const titlesPath = path.join(exportDir, `chat-titles-${timestamp}.txt`);
    fs.writeFileSync(titlesPath, titles.join('\n'), 'utf-8');
    console.log(`✅ 标题列表已导出: ${titlesPath}`);

    // 统计信息
    console.log('\n📊 数据统计:');
    console.log(`   总会话数: ${allSessions.length}`);
    console.log(`   有标题的会话: ${titles.length}`);
    console.log(`   平均消息数: ${(allSessions.reduce((sum, s) => sum + s.message_count, 0) / allSessions.length).toFixed(2)}`);

    // 时间范围
    const timestamps = allSessions.map(s => s.created_at).sort((a, b) => a - b);
    const oldest = new Date(timestamps[0] * 1000).toISOString();
    const newest = new Date(timestamps[timestamps.length - 1] * 1000).toISOString();
    console.log(`   时间范围: ${oldest} 到 ${newest}`);

    console.log('\n🎉 导出完成！');

  } catch (error) {
    console.error('❌ 导出失败:', error);
    process.exit(1);
  }
}

exportLargeSample();
