# Cloudflare D1 数据库迁移操作手册

## 第一步：在 Cloudflare Dashboard 创建 D1 数据库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单 → **Workers & Pages** → **D1 SQL Database**
3. 点击 **Create** → 数据库名填 `astrocarto-db` → 点击 Create
4. 创建成功后，复制页面上的 **Database ID**（格式为 UUID，例如 `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）
5. 将此 Database ID 填入项目根目录的 `wrangler.jsonc` 文件中对应占位符处

---

## 第二步：在 D1 创建表结构

在 Cloudflare Dashboard 的 D1 数据库页面，点击 **Console** 标签，将以下 SQL 粘贴执行（可一次性全部执行）：

```sql
-- ============================================================
-- users 表
-- ============================================================
CREATE TABLE IF NOT EXISTS users_astrocarto (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid        TEXT NOT NULL UNIQUE,
  email       TEXT NOT NULL,
  created_at  INTEGER,
  nickname    TEXT,
  avatar_url  TEXT,
  locale      TEXT,
  signin_type     TEXT,
  signin_ip       TEXT,
  signin_provider TEXT,
  signin_openid   TEXT,
  invite_code TEXT NOT NULL DEFAULT '',
  updated_at  INTEGER,
  invited_by  TEXT NOT NULL DEFAULT '',
  is_affiliate INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS email_astrocarto_provider_unique_idx
  ON users_astrocarto(email, signin_provider);

-- ============================================================
-- orders 表
-- ============================================================
CREATE TABLE IF NOT EXISTS orders_astrocarto (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no          TEXT NOT NULL UNIQUE,
  created_at        INTEGER,
  user_uuid         TEXT NOT NULL DEFAULT '',
  user_email        TEXT NOT NULL DEFAULT '',
  amount            INTEGER NOT NULL,
  interval          TEXT,
  expired_at        INTEGER,
  status            TEXT NOT NULL,
  stripe_session_id TEXT,
  credits           INTEGER NOT NULL,
  currency          TEXT,
  sub_id            TEXT,
  sub_interval_count INTEGER,
  sub_cycle_anchor  INTEGER,
  sub_period_end    INTEGER,
  sub_period_start  INTEGER,
  sub_times         INTEGER,
  product_id        TEXT,
  product_name      TEXT,
  valid_months      INTEGER,
  order_detail      TEXT,
  paid_at           INTEGER,
  paid_email        TEXT,
  paid_detail       TEXT,
  pay_type          TEXT
);

-- ============================================================
-- apikeys 表
-- ============================================================
CREATE TABLE IF NOT EXISTS apikeys_astrocarto (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  api_key    TEXT NOT NULL UNIQUE,
  title      TEXT,
  user_uuid  TEXT NOT NULL,
  created_at INTEGER,
  status     TEXT
);

-- ============================================================
-- credits 表
-- ============================================================
CREATE TABLE IF NOT EXISTS credits_astrocarto (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  trans_no   TEXT NOT NULL UNIQUE,
  created_at INTEGER,
  user_uuid  TEXT NOT NULL,
  trans_type TEXT NOT NULL,
  credits    INTEGER NOT NULL,
  order_no   TEXT,
  expired_at INTEGER
);

-- ============================================================
-- posts 表
-- ============================================================
CREATE TABLE IF NOT EXISTS posts_astrocarto (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid             TEXT NOT NULL UNIQUE,
  slug             TEXT,
  title            TEXT,
  description      TEXT,
  content          TEXT,
  created_at       INTEGER,
  updated_at       INTEGER,
  status           TEXT,
  cover_url        TEXT,
  author_name      TEXT,
  author_avatar_url TEXT,
  locale           TEXT
);

-- ============================================================
-- affiliates 表
-- ============================================================
CREATE TABLE IF NOT EXISTS affiliates_astrocarto (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  user_uuid      TEXT NOT NULL,
  created_at     INTEGER,
  status         TEXT NOT NULL DEFAULT '',
  invited_by     TEXT NOT NULL,
  paid_order_no  TEXT NOT NULL DEFAULT '',
  paid_amount    INTEGER NOT NULL DEFAULT 0,
  reward_percent INTEGER NOT NULL DEFAULT 0,
  reward_amount  INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- ai_chat_sessions 表（id 为 UUID 字符串，非自增）
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_chat_sessions_astrocarto (
  id                 TEXT PRIMARY KEY,
  user_uuid          TEXT NOT NULL,
  created_at         INTEGER,
  updated_at         INTEGER,
  title              TEXT,
  chart_context_json TEXT,
  is_synastry        INTEGER NOT NULL DEFAULT 0,
  message_count      INTEGER NOT NULL DEFAULT 0,
  messages_r2_key    TEXT,
  messages           TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS ai_chat_sessions_user_uuid_idx
  ON ai_chat_sessions_astrocarto(user_uuid);

-- ============================================================
-- feedbacks 表
-- ============================================================
CREATE TABLE IF NOT EXISTS feedbacks_astrocarto (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER,
  status     TEXT,
  user_uuid  TEXT,
  content    TEXT,
  rating     INTEGER
);
```

---

## 第三步：数据迁移（代码部署后执行）

代码上线、D1 表结构创建完成后，运行以下命令从 Supabase 迁移数据：

```bash
# 安装依赖（如果还没安装）
pnpm install

# 运行迁移脚本（从 Supabase 读数据，生成 SQL 批次文件）
npx tsx scripts/migrate-to-d1.ts

# 脚本会在 scripts/d1-import/ 目录下生成多个 SQL 文件
# 依次执行每个文件导入 D1（--remote 表示线上 D1，--local 表示本地 wrangler 模拟）

npx wrangler d1 execute astrocarto-db --remote --file=scripts/d1-import/01_users.sql
npx wrangler d1 execute astrocarto-db --remote --file=scripts/d1-import/02_orders.sql
npx wrangler d1 execute astrocarto-db --remote --file=scripts/d1-import/03_apikeys.sql
npx wrangler d1 execute astrocarto-db --remote --file=scripts/d1-import/04_credits_batch_001.sql
# ... credits 会有多个批次文件，按顺序执行
npx wrangler d1 execute astrocarto-db --remote --file=scripts/d1-import/05_posts.sql
npx wrangler d1 execute astrocarto-db --remote --file=scripts/d1-import/06_affiliates.sql
npx wrangler d1 execute astrocarto-db --remote --file=scripts/d1-import/07_feedbacks.sql
npx wrangler d1 execute astrocarto-db --remote --file=scripts/d1-import/08_ai_chat_sessions_batch_001.sql
# ... ai_chat_sessions 会有多个批次文件，按顺序执行
```

> **注意**：ai_chat_sessions 因为每行 JSON 较大，每批只有 100 行，会生成约 73 个批次文件。
> 可以用脚本一次性执行：
> ```bash
> for f in scripts/d1-import/08_ai_chat_sessions_batch_*.sql; do
>   echo "Importing $f..."
>   npx wrangler d1 execute astrocarto-db --remote --file="$f"
> done
> ```

---

## 第四步：验证迁移结果

在 D1 Dashboard Console 执行以下查询，与 Supabase 数据对比：

```sql
SELECT
  (SELECT COUNT(*) FROM users_astrocarto) AS users_count,
  (SELECT COUNT(*) FROM orders_astrocarto) AS orders_count,
  (SELECT COUNT(*) FROM credits_astrocarto) AS credits_count,
  (SELECT COUNT(*) FROM ai_chat_sessions_astrocarto) AS sessions_count,
  (SELECT COUNT(*) FROM feedbacks_astrocarto) AS feedbacks_count,
  (SELECT COUNT(*) FROM posts_astrocarto) AS posts_count;
```

与 Supabase 原始行数核对无误后，即可关闭 Supabase。

---

## 字段类型对照说明

| PostgreSQL 类型 | D1/SQLite 类型 | 说明 |
|---|---|---|
| `timestamp with timezone` | `INTEGER`（Unix 秒） | Drizzle 自动处理 Date 转换 |
| `boolean` | `INTEGER`（0/1） | Drizzle 自动处理 |
| `jsonb` | `TEXT`（JSON 字符串） | Drizzle 自动处理 |
| `varchar(N)` | `TEXT` | SQLite 不强制长度 |
| `integer GENERATED ALWAYS AS IDENTITY` | `INTEGER PRIMARY KEY AUTOINCREMENT` | SQLite 等价语法 |
