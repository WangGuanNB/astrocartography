/**
 * Supabase → Cloudflare D1 数据迁移脚本
 *
 * 功能：从 Supabase PostgreSQL 读取所有数据，转换格式后生成 SQLite 兼容的
 *       SQL 批次文件，输出到 scripts/d1-import/ 目录。
 *
 * 运行方式：
 *   npx tsx scripts/migrate-to-d1.ts
 *
 * 前提：
 *   - .env.local 中必须有 DATABASE_URL 指向 Supabase
 *   - 确保 D1 表结构已通过 D1_SETUP.md 中的 SQL 创建完毕
 */

import { config } from "dotenv";
import postgres from "postgres";
import fs from "fs";
import path from "path";

config({ path: ".env.local" });
config({ path: ".env" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL 未配置，请检查 .env.local");
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, "d1-import");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const sql = postgres(DATABASE_URL, { prepare: false });

// ─── 工具函数 ──────────────────────────────────────────────────────────────

function escapeStr(val: string | null | undefined): string {
  if (val === null || val === undefined) return "NULL";
  return `'${String(val).replace(/'/g, "''")}'`;
}

function toTimestamp(val: Date | string | null | undefined): string {
  if (val === null || val === undefined) return "NULL";
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return "NULL";
  return String(Math.floor(d.getTime() / 1000));
}

function toBool(val: boolean | null | undefined): string {
  if (val === null || val === undefined) return "NULL";
  return val ? "1" : "0";
}

function toJson(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  return escapeStr(JSON.stringify(val));
}

function toInt(val: number | null | undefined): string {
  if (val === null || val === undefined) return "NULL";
  return String(val);
}

function writeFile(filename: string, content: string) {
  const filePath = path.join(OUTPUT_DIR, filename);
  fs.writeFileSync(filePath, content, "utf-8");
  console.log(`  ✅ 写入 ${filename} (${(content.length / 1024).toFixed(1)} KB)`);
}

function splitBatches<T>(arr: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
}

// ─── 各表迁移 ─────────────────────────────────────────────────────────────

async function migrateUsers() {
  console.log("\n📦 迁移 users_astrocarto ...");
  const rows = await sql`SELECT * FROM users_astrocarto ORDER BY id`;
  console.log(`  共 ${rows.length} 行`);

  const inserts = rows.map(
    (r) =>
      `INSERT OR IGNORE INTO users_astrocarto ` +
      `(id,uuid,email,created_at,nickname,avatar_url,locale,signin_type,signin_ip,signin_provider,signin_openid,invite_code,updated_at,invited_by,is_affiliate) VALUES ` +
      `(${toInt(r.id)},${escapeStr(r.uuid)},${escapeStr(r.email)},` +
      `${toTimestamp(r.created_at)},${escapeStr(r.nickname)},${escapeStr(r.avatar_url)},` +
      `${escapeStr(r.locale)},${escapeStr(r.signin_type)},${escapeStr(r.signin_ip)},` +
      `${escapeStr(r.signin_provider)},${escapeStr(r.signin_openid)},${escapeStr(r.invite_code)},` +
      `${toTimestamp(r.updated_at)},${escapeStr(r.invited_by)},${toBool(r.is_affiliate)});`
  );

  const batches = splitBatches(inserts, 2000);
  batches.forEach((batch, i) => {
    const idx = String(i + 1).padStart(3, "0");
    writeFile(`01_users_batch_${idx}.sql`, batch.join("\n") + "\n");
  });
}

async function migrateOrders() {
  console.log("\n📦 迁移 orders_astrocarto ...");
  const rows = await sql`SELECT * FROM orders_astrocarto ORDER BY id`;
  console.log(`  共 ${rows.length} 行`);

  const inserts = rows.map(
    (r) =>
      `INSERT OR IGNORE INTO orders_astrocarto ` +
      `(id,order_no,created_at,user_uuid,user_email,amount,interval,expired_at,status,stripe_session_id,` +
      `credits,currency,sub_id,sub_interval_count,sub_cycle_anchor,sub_period_end,sub_period_start,` +
      `sub_times,product_id,product_name,valid_months,order_detail,paid_at,paid_email,paid_detail,pay_type) VALUES ` +
      `(${toInt(r.id)},${escapeStr(r.order_no)},${toTimestamp(r.created_at)},` +
      `${escapeStr(r.user_uuid)},${escapeStr(r.user_email)},${toInt(r.amount)},` +
      `${escapeStr(r.interval)},${toTimestamp(r.expired_at)},${escapeStr(r.status)},` +
      `${escapeStr(r.stripe_session_id)},${toInt(r.credits)},${escapeStr(r.currency)},` +
      `${escapeStr(r.sub_id)},${toInt(r.sub_interval_count)},${toInt(r.sub_cycle_anchor)},` +
      `${toInt(r.sub_period_end)},${toInt(r.sub_period_start)},${toInt(r.sub_times)},` +
      `${escapeStr(r.product_id)},${escapeStr(r.product_name)},${toInt(r.valid_months)},` +
      `${escapeStr(r.order_detail)},${toTimestamp(r.paid_at)},${escapeStr(r.paid_email)},` +
      `${escapeStr(r.paid_detail)},${escapeStr(r.pay_type)});`
  );

  const batches = splitBatches(inserts, 500);
  batches.forEach((batch, i) => {
    const idx = String(i + 1).padStart(3, "0");
    writeFile(`02_orders_batch_${idx}.sql`, batch.join("\n") + "\n");
  });
}

async function migrateApikeys() {
  console.log("\n📦 迁移 apikeys_astrocarto ...");
  const rows = await sql`SELECT * FROM apikeys_astrocarto ORDER BY id`;
  console.log(`  共 ${rows.length} 行`);

  const inserts = rows.map(
    (r) =>
      `INSERT OR IGNORE INTO apikeys_astrocarto ` +
      `(id,api_key,title,user_uuid,created_at,status) VALUES ` +
      `(${toInt(r.id)},${escapeStr(r.api_key)},${escapeStr(r.title)},` +
      `${escapeStr(r.user_uuid)},${toTimestamp(r.created_at)},${escapeStr(r.status)});`
  );

  const batches = splitBatches(inserts, 2000);
  batches.forEach((batch, i) => {
    const idx = String(i + 1).padStart(3, "0");
    writeFile(`03_apikeys_batch_${idx}.sql`, batch.join("\n") + "\n");
  });
}

async function migrateCredits() {
  console.log("\n📦 迁移 credits_astrocarto (约 123K 行，分批处理) ...");
  const rows = await sql`SELECT * FROM credits_astrocarto ORDER BY id`;
  console.log(`  共 ${rows.length} 行`);

  const inserts = rows.map(
    (r) =>
      `INSERT OR IGNORE INTO credits_astrocarto ` +
      `(id,trans_no,created_at,user_uuid,trans_type,credits,order_no,expired_at) VALUES ` +
      `(${toInt(r.id)},${escapeStr(r.trans_no)},${toTimestamp(r.created_at)},` +
      `${escapeStr(r.user_uuid)},${escapeStr(r.trans_type)},${toInt(r.credits)},` +
      `${escapeStr(r.order_no)},${toTimestamp(r.expired_at)});`
  );

  const batches = splitBatches(inserts, 3000);
  batches.forEach((batch, i) => {
    const idx = String(i + 1).padStart(3, "0");
    writeFile(`04_credits_batch_${idx}.sql`, batch.join("\n") + "\n");
  });
}

async function migratePosts() {
  console.log("\n📦 迁移 posts_astrocarto ...");
  const rows = await sql`SELECT * FROM posts_astrocarto ORDER BY id`;
  console.log(`  共 ${rows.length} 行`);

  const inserts = rows.map(
    (r) =>
      `INSERT OR IGNORE INTO posts_astrocarto ` +
      `(id,uuid,slug,title,description,content,created_at,updated_at,status,cover_url,author_name,author_avatar_url,locale) VALUES ` +
      `(${toInt(r.id)},${escapeStr(r.uuid)},${escapeStr(r.slug)},${escapeStr(r.title)},` +
      `${escapeStr(r.description)},${escapeStr(r.content)},${toTimestamp(r.created_at)},` +
      `${toTimestamp(r.updated_at)},${escapeStr(r.status)},${escapeStr(r.cover_url)},` +
      `${escapeStr(r.author_name)},${escapeStr(r.author_avatar_url)},${escapeStr(r.locale)});`
  );

  writeFile(`05_posts.sql`, inserts.join("\n") + "\n");
}

async function migrateAffiliates() {
  console.log("\n📦 迁移 affiliates_astrocarto ...");
  const rows = await sql`SELECT * FROM affiliates_astrocarto ORDER BY id`;
  console.log(`  共 ${rows.length} 行`);

  const inserts = rows.map(
    (r) =>
      `INSERT OR IGNORE INTO affiliates_astrocarto ` +
      `(id,user_uuid,created_at,status,invited_by,paid_order_no,paid_amount,reward_percent,reward_amount) VALUES ` +
      `(${toInt(r.id)},${escapeStr(r.user_uuid)},${toTimestamp(r.created_at)},` +
      `${escapeStr(r.status)},${escapeStr(r.invited_by)},${escapeStr(r.paid_order_no)},` +
      `${toInt(r.paid_amount)},${toInt(r.reward_percent)},${toInt(r.reward_amount)});`
  );

  const batches = splitBatches(inserts, 2000);
  batches.forEach((batch, i) => {
    const idx = String(i + 1).padStart(3, "0");
    writeFile(`06_affiliates_batch_${idx}.sql`, batch.join("\n") + "\n");
  });
}

async function migrateFeedbacks() {
  console.log("\n📦 迁移 feedbacks_astrocarto ...");
  const rows = await sql`SELECT * FROM feedbacks_astrocarto ORDER BY id`;
  console.log(`  共 ${rows.length} 行`);

  const inserts = rows.map(
    (r) =>
      `INSERT OR IGNORE INTO feedbacks_astrocarto ` +
      `(id,created_at,status,user_uuid,content,rating) VALUES ` +
      `(${toInt(r.id)},${toTimestamp(r.created_at)},${escapeStr(r.status)},` +
      `${escapeStr(r.user_uuid)},${escapeStr(r.content)},${toInt(r.rating)});`
  );

  const batches = splitBatches(inserts, 2000);
  batches.forEach((batch, i) => {
    const idx = String(i + 1).padStart(3, "0");
    writeFile(`07_feedbacks_batch_${idx}.sql`, batch.join("\n") + "\n");
  });
}

async function migrateAiChatSessions() {
  console.log("\n📦 迁移 ai_chat_sessions_astrocarto (约 7K 行，每批 100 行) ...");
  const rows = await sql`SELECT * FROM ai_chat_sessions_astrocarto ORDER BY created_at`;
  console.log(`  共 ${rows.length} 行`);

  const inserts = rows.map(
    (r) =>
      `INSERT OR IGNORE INTO ai_chat_sessions_astrocarto ` +
      `(id,user_uuid,created_at,updated_at,title,chart_context_json,is_synastry,message_count,messages_r2_key,messages) VALUES ` +
      `(${escapeStr(r.id)},${escapeStr(r.user_uuid)},${toTimestamp(r.created_at)},` +
      `${toTimestamp(r.updated_at)},${escapeStr(r.title)},${escapeStr(r.chart_context_json)},` +
      `${toBool(r.is_synastry)},${toInt(r.message_count)},${escapeStr(r.messages_r2_key)},` +
      `${toJson(r.messages)});`
  );

  // 每批 100 行（因为平均每行 42KB，100 行 ≈ 4MB，安全范围内）
  const batches = splitBatches(inserts, 100);
  batches.forEach((batch, i) => {
    const idx = String(i + 1).padStart(3, "0");
    writeFile(`08_ai_chat_sessions_batch_${idx}.sql`, batch.join("\n") + "\n");
  });
}

// ─── 主函数 ───────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 开始从 Supabase 导出数据...");
  console.log(`📁 输出目录: ${OUTPUT_DIR}`);

  async function runSafe(name: string, fn: () => Promise<void>) {
    try {
      await fn();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("does not exist")) {
        console.warn(`  ⚠️  跳过 ${name}：表不存在（Supabase 中没有该表）`);
      } else {
        throw e;
      }
    }
  }

  try {
    await runSafe("users", migrateUsers);
    await runSafe("orders", migrateOrders);
    await runSafe("apikeys", migrateApikeys);
    await runSafe("credits", migrateCredits);
    await runSafe("posts", migratePosts);
    await runSafe("affiliates", migrateAffiliates);
    await runSafe("feedbacks", migrateFeedbacks);
    await runSafe("ai_chat_sessions", migrateAiChatSessions);

    console.log("\n✅ 所有数据导出完成！");
    console.log("\n📋 接下来执行以下命令将数据导入 D1：");
    console.log("\n  # 按表依次执行（credits 和 ai_chat_sessions 有多个批次文件）：");
    console.log("  for f in scripts/d1-import/01_users_batch_*.sql; do npx wrangler d1 execute astrocarto-db --remote --file=\"$f\"; done");
    console.log("  for f in scripts/d1-import/02_orders_batch_*.sql; do npx wrangler d1 execute astrocarto-db --remote --file=\"$f\"; done");
    console.log("  for f in scripts/d1-import/03_apikeys_batch_*.sql; do npx wrangler d1 execute astrocarto-db --remote --file=\"$f\"; done");
    console.log("  for f in scripts/d1-import/04_credits_batch_*.sql; do npx wrangler d1 execute astrocarto-db --remote --file=\"$f\"; done");
    console.log("  npx wrangler d1 execute astrocarto-db --remote --file=scripts/d1-import/05_posts.sql");
    console.log("  for f in scripts/d1-import/06_affiliates_batch_*.sql; do npx wrangler d1 execute astrocarto-db --remote --file=\"$f\"; done");
    console.log("  for f in scripts/d1-import/07_feedbacks_batch_*.sql; do npx wrangler d1 execute astrocarto-db --remote --file=\"$f\"; done");
    console.log("  for f in scripts/d1-import/08_ai_chat_sessions_batch_*.sql; do npx wrangler d1 execute astrocarto-db --remote --file=\"$f\"; done");
  } catch (e) {
    console.error("❌ 迁移失败:", e);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
