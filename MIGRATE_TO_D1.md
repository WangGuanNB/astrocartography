# Supabase PostgreSQL → Cloudflare D1 迁移完整指南

> 适用场景：Next.js + Drizzle ORM + Supabase PostgreSQL → Cloudflare Workers + D1 SQLite
> 部署平台：Cloudflare Workers（通过 @opennextjs/cloudflare 构建）

---

## 目录

1. [前置条件](#1-前置条件)
2. [第一步：在 Cloudflare 创建 D1 数据库](#2-第一步在-cloudflare-创建-d1-数据库)
3. [第二步：安装依赖](#3-第二步安装依赖)
4. [第三步：重写数据库 Schema（pg-core → sqlite-core）](#4-第三步重写数据库-schemapg-core--sqlite-core)
5. [第四步：重写数据库连接（db/index.ts）](#5-第四步重写数据库连接dbindexts)
6. [第五步：新增 D1 HTTP 客户端（本地连远程 D1）](#6-第五步新增-d1-http-客户端本地连远程-d1)
7. [第六步：更新 Drizzle Kit 配置](#7-第六步更新-drizzle-kit-配置)
8. [第七步：更新 wrangler.jsonc](#8-第七步更新-wranlerjsonc)
9. [第八步：在 D1 控制台创建表](#9-第八步在-d1-控制台创建表)
10. [第九步：数据迁移脚本](#10-第九步数据迁移脚本)
11. [第十步：执行数据导入](#11-第十步执行数据导入)
12. [第十一步：本地开发连接远程 D1（可选）](#12-第十一步本地开发连接远程-d1可选)
13. [第十二步：部署](#13-第十二步部署)
14. [常见问题](#14-常见问题)

---

## 1. 前置条件

- 项目使用 Next.js + Drizzle ORM
- 当前数据库为 Supabase PostgreSQL
- 部署平台为 Cloudflare Workers（使用 `@opennextjs/cloudflare`）
- 已安装 Node.js 和 pnpm

---

## 2. 第一步：在 Cloudflare 创建 D1 数据库

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单 → **存储和数据库** → **D1 SQL 数据库**
3. 点击 **创建数据库**，输入数据库名称（如 `myproject-db`）
4. 创建完成后，记录 **Database ID**（格式：`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`）

---

## 3. 第二步：安装依赖

```bash
# 添加 libsql 客户端（本地开发用）
pnpm add @libsql/client

# 添加 wrangler（CI 部署用）
pnpm add -D wrangler

# 确认 @opennextjs/cloudflare 已安装
pnpm add @opennextjs/cloudflare
```

---

## 4. 第三步：重写数据库 Schema（pg-core → sqlite-core）

**PostgreSQL → SQLite 类型映射规则：**

| PostgreSQL (pg-core) | SQLite (sqlite-core) |
|---|---|
| `pgTable` | `sqliteTable` |
| `integer().generatedAlwaysAsIdentity()` | `integer("id").primaryKey({ autoIncrement: true })` |
| `text("id").primaryKey()` | `text("id").primaryKey()` （UUID 主键保持不变）|
| `timestamp({ withTimezone: true })` | `integer("col", { mode: "timestamp" })` |
| `boolean()` | `integer("col", { mode: "boolean" })` |
| `jsonb("col")` | `text("col", { mode: "json" })` |
| `varchar({ length: N })` | `text("col")` |
| `text()` | `text("col")` |

**改写示例：**

```typescript
// 改之前（PostgreSQL）
import { pgTable, text, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users_astrocarto", {
  id: integer().generatedAlwaysAsIdentity().primaryKey(),
  uuid: text("uuid").unique(),
  email: varchar({ length: 256 }),
  is_active: boolean().default(true),
  created_at: timestamp({ withTimezone: true }).defaultNow(),
});

// 改之后（SQLite）
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users_astrocarto", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uuid: text("uuid").unique(),
  email: text("email"),
  is_active: integer("is_active", { mode: "boolean" }).default(true),
  created_at: integer("created_at", { mode: "timestamp" }),
});
```

**注意：**
- 文件开头的 import 全部换成 `drizzle-orm/sqlite-core`
- `defaultNow()` 在 SQLite 中不可用，去掉即可（由应用层设置）

---

## 5. 第四步：重写数据库连接（db/index.ts）

```typescript
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { D1HttpDatabase } from "./d1-http";

let _remoteD1Db: ReturnType<typeof drizzleD1> | null = null;
let _localDb: LibSQLDatabase | null = null;

// 把模块路径存变量，防止 esbuild 静态分析打包进 Workers bundle
const MOD_LIBSQL_CLIENT = "@libsql/client";
const MOD_DRIZZLE_LIBSQL = "drizzle-orm/libsql";

/**
 * 数据库连接优先级：
 * 1. 生产环境（Cloudflare Workers）：使用 D1 binding
 * 2. 本地开发连远程 D1：设置 CLOUDFLARE_D1_TOKEN 等环境变量后通过 HTTP API 连接
 * 3. 本地开发默认：使用本地 local.db 文件
 */
export function db(): ReturnType<typeof drizzleD1> {
  // 1. 生产环境：Cloudflare Workers D1 binding
  try {
    const { getCloudflareContext } = require(
      "@opennextjs/cloudflare"
    ) as typeof import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    const d1 = (ctx.env as any).DB;
    if (d1) return drizzleD1(d1);
  } catch {
    // 非 Workers 环境，继续往下
  }

  // 2. 本地开发连远程 D1
  const d1Token = process.env.CLOUDFLARE_D1_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;

  if (d1Token && accountId && databaseId) {
    if (!_remoteD1Db) {
      const httpDb = new D1HttpDatabase(accountId, databaseId, d1Token);
      _remoteD1Db = drizzleD1(httpDb as any);
    }
    return _remoteD1Db!;
  }

  // 3. 本地开发默认：使用本地 SQLite 文件
  if (!_localDb) {
    const { createClient } = require(MOD_LIBSQL_CLIENT);
    const { drizzle } = require(MOD_DRIZZLE_LIBSQL);
    const client = createClient({ url: "file:local.db" });
    _localDb = drizzle(client) as LibSQLDatabase;
  }
  return _localDb! as unknown as ReturnType<typeof drizzleD1>;
}
```

---

## 6. 第五步：新增 D1 HTTP 客户端（本地连远程 D1）

新建 `src/db/d1-http.ts`：

```typescript
interface D1QueryResult {
  results: Record<string, unknown>[];
  success: boolean;
  meta: Record<string, unknown>;
}

interface D1ApiResponse {
  result: D1QueryResult[];
  success: boolean;
  errors: { message: string }[];
}

class D1HttpPreparedStatement {
  constructor(
    private db: D1HttpDatabase,
    private query: string,
    private params: unknown[] = []
  ) {}

  bind(...params: unknown[]) {
    return new D1HttpPreparedStatement(this.db, this.query, params);
  }

  async all<T = Record<string, unknown>>() {
    const result = await this.db._query(this.query, this.params);
    return { results: result.results as T[], success: result.success, meta: result.meta };
  }

  async run() {
    const result = await this.db._query(this.query, this.params);
    return { success: result.success, meta: result.meta };
  }

  async first<T = Record<string, unknown>>() {
    const result = await this.db._query(this.query, this.params);
    return (result.results[0] as T) ?? null;
  }

  async raw<T = unknown[]>() {
    const result = await this.db._query(this.query, this.params);
    return result.results as T[];
  }
}

export class D1HttpDatabase {
  private baseUrl: string;
  private authHeaders: Record<string, string>;

  constructor(accountId: string, databaseId: string, token: string) {
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}`;
    this.authHeaders = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async _query(sql: string, params: unknown[] = []): Promise<D1QueryResult> {
    const response = await fetch(`${this.baseUrl}/query`, {
      method: "POST",
      headers: this.authHeaders,
      body: JSON.stringify({ sql, params }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`D1 HTTP API error: ${response.status} ${text}`);
    }

    const data: D1ApiResponse = await response.json();
    if (!data.success) {
      throw new Error(`D1 query failed: ${data.errors.map((e) => e.message).join(", ")}`);
    }
    return data.result[0];
  }

  prepare(query: string): D1HttpPreparedStatement {
    return new D1HttpPreparedStatement(this, query);
  }

  async batch<T = Record<string, unknown>>(
    statements: D1HttpPreparedStatement[]
  ): Promise<{ results: T[]; success: boolean; meta: Record<string, unknown> }[]> {
    return Promise.all(statements.map((s) => s.all<T>()));
  }

  async exec(query: string): Promise<{ count: number; duration: number }> {
    await this._query(query);
    return { count: 1, duration: 0 };
  }
}
```

---

## 7. 第六步：更新 Drizzle Kit 配置

修改 `src/db/config.ts`（或 `drizzle.config.ts`）：

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",           // 改为 sqlite
  dbCredentials: {
    url: "file:local.db",      // 本地开发用
  },
});
```

---

## 8. 第七步：更新 wrangler.jsonc

在 `wrangler.jsonc` 中添加 D1 binding：

```jsonc
{
  // ... 其他配置保持不变 ...
  "d1_databases": [
    {
      "binding": "DB",                              // 代码中通过 env.DB 访问
      "database_name": "myproject-db",             // D1 数据库名称
      "database_id": "你的-database-id-填这里"     // 步骤1中记录的 ID
    }
  ]
}
```

---

## 9. 第八步：在 D1 控制台创建表

在 Cloudflare D1 Studio（或 D1 控制台）执行建表 SQL。

**SQLite 建表注意事项：**
- 自增主键：`INTEGER PRIMARY KEY AUTOINCREMENT`
- 时间字段：`INTEGER`（存 Unix 时间戳，秒）
- 布尔字段：`INTEGER`（0/1）
- JSON 字段：`TEXT`
- 所有字符串：`TEXT`（无需指定长度）

**建表 SQL 示例：**

```sql
-- 用户表
CREATE TABLE IF NOT EXISTS users_astrocarto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE,
  email TEXT,
  nickname TEXT,
  avatar_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_at INTEGER,
  updated_at INTEGER
);

-- 订单表
CREATE TABLE IF NOT EXISTS orders_astrocarto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no TEXT UNIQUE,
  user_uuid TEXT,
  user_email TEXT,
  amount INTEGER,
  status TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

-- 积分表
CREATE TABLE IF NOT EXISTS credits_astrocarto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trans_no TEXT UNIQUE,
  user_uuid TEXT,
  trans_type TEXT,
  credits INTEGER,
  order_no TEXT,
  created_at INTEGER,
  expired_at INTEGER
);
```

> **根据你的项目实际 schema，按上述规则替换所有字段类型。**

---

## 10. 第九步：数据迁移脚本

新建 `scripts/migrate-to-d1.ts`，从 Supabase 读数据，生成 D1 可执行的 SQL 文件：

```typescript
import postgres from "postgres";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL!, { max: 5 });
const OUTPUT_DIR = "scripts/d1-import";
const BATCH_SIZE = 500; // 每批 500 条，避免超出 D1 10MB 限制

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// 转义 SQL 字符串
function escStr(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Date) return String(Math.floor(v.getTime() / 1000));
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

// 写批次 SQL 文件
function writeBatches(filename: string, rows: unknown[][], columns: string[]) {
  const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
  for (let b = 0; b < totalBatches; b++) {
    const batch = rows.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
    const values = batch.map(row => `(${row.map(escStr).join(",")})`).join(",\n");
    const sqlContent = `INSERT OR IGNORE INTO ${filename} (${columns.join(",")}) VALUES\n${values};\n`;
    const batchFile = path.join(OUTPUT_DIR, `${filename}_batch_${String(b + 1).padStart(3, "0")}.sql`);
    fs.writeFileSync(batchFile, sqlContent, "utf8");
    console.log(`  写入 ${batchFile}（${batch.length} 条）`);
  }
}

// 安全执行（跳过不存在的表）
async function runSafe(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (e: any) {
    if (e.message?.includes("does not exist")) {
      console.log(`⚠️  跳过 ${name}（表不存在）`);
    } else {
      throw e;
    }
  }
}

async function migrateUsers() {
  await runSafe("users", async () => {
    console.log("迁移 users...");
    const rows = await sql`SELECT * FROM users_astrocarto ORDER BY id`;
    const columns = ["id","uuid","email","nickname","avatar_url","is_active","created_at","updated_at"];
    const data = rows.map(r => [
      r.id, r.uuid, r.email, r.nickname, r.avatar_url,
      r.is_active ? 1 : 0,
      r.created_at ? Math.floor(new Date(r.created_at).getTime() / 1000) : null,
      r.updated_at ? Math.floor(new Date(r.updated_at).getTime() / 1000) : null,
    ]);
    writeBatches("users_astrocarto", data, columns);
    console.log(`✅ users: ${rows.length} 条`);
  });
}

async function migrateOrders() {
  await runSafe("orders", async () => {
    console.log("迁移 orders...");
    const rows = await sql`SELECT * FROM orders_astrocarto ORDER BY id`;
    const columns = ["id","order_no","user_uuid","user_email","amount","status","created_at","updated_at"];
    const data = rows.map(r => [
      r.id, r.order_no, r.user_uuid, r.user_email, r.amount, r.status,
      r.created_at ? Math.floor(new Date(r.created_at).getTime() / 1000) : null,
      r.updated_at ? Math.floor(new Date(r.updated_at).getTime() / 1000) : null,
    ]);
    writeBatches("orders_astrocarto", data, columns);
    console.log(`✅ orders: ${rows.length} 条`);
  });
}

async function migrateCredits() {
  await runSafe("credits", async () => {
    console.log("迁移 credits...");
    const rows = await sql`SELECT * FROM credits_astrocarto ORDER BY id`;
    const columns = ["id","trans_no","user_uuid","trans_type","credits","order_no","created_at","expired_at"];
    const data = rows.map(r => [
      r.id, r.trans_no, r.user_uuid, r.trans_type, r.credits, r.order_no,
      r.created_at ? Math.floor(new Date(r.created_at).getTime() / 1000) : null,
      r.expired_at ? Math.floor(new Date(r.expired_at).getTime() / 1000) : null,
    ]);
    writeBatches("credits_astrocarto", data, columns);
    console.log(`✅ credits: ${rows.length} 条`);
  });
}

// 根据项目实际情况添加其他表的迁移函数...

async function main() {
  console.log("开始数据迁移...");
  await migrateUsers();
  await migrateOrders();
  await migrateCredits();
  await sql.end();
  console.log("✅ 所有数据已生成到 scripts/d1-import/ 目录");
}

main().catch(console.error);
```

**在 `.env.local` 中配置 Supabase 连接（用 Session Pooler，端口 5432）：**

```env
# Supabase Session Pooler（用于数据迁移读取，注意不是 pgbouncer 的 6543）
DATABASE_URL="postgresql://postgres.你的项目ID:密码@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
```

**执行迁移脚本：**

```bash
npx tsx scripts/migrate-to-d1.ts
```

执行完成后，`scripts/d1-import/` 目录下会生成多个 SQL 批次文件。

---

## 11. 第十步：执行数据导入

把生成的 SQL 文件逐一导入 D1（在你的终端执行）：

```bash
# 用户表
for f in scripts/d1-import/users_astrocarto_batch_*.sql; do
  echo "导入 $f..."
  npx wrangler@latest d1 execute 你的数据库名 --remote --file="$f"
done

# 订单表
for f in scripts/d1-import/orders_astrocarto_batch_*.sql; do
  echo "导入 $f..."
  npx wrangler@latest d1 execute 你的数据库名 --remote --file="$f"
done

# 积分表（数据量大，分批执行）
for f in scripts/d1-import/credits_astrocarto_batch_*.sql; do
  echo "导入 $f..."
  npx wrangler@latest d1 execute 你的数据库名 --remote --file="$f"
done
```

**验证数据量（在 D1 Studio 执行）：**

```sql
SELECT 
  (SELECT COUNT(*) FROM users_astrocarto) as users,
  (SELECT COUNT(*) FROM orders_astrocarto) as orders,
  (SELECT COUNT(*) FROM credits_astrocarto) as credits;
```

**查询时间字段（D1 中时间存为 Unix 时间戳，需转换）：**

```sql
SELECT id, datetime(created_at, 'unixepoch') as created_time FROM users_astrocarto LIMIT 10;
```

---

## 12. 第十一步：本地开发连接远程 D1（可选）

如果希望本地 `pnpm dev` 也直接读写生产 D1（用于快速排查问题）：

**获取 Cloudflare API Token：**
1. Cloudflare Dashboard → 右上角头像 → **我的个人资料** → **API 令牌**
2. 点击 **创建令牌** → 选择 **编辑 Cloudflare Workers** 模板
3. 在 **账户资源** 中选择 D1 相关权限（D1:Edit）
4. 创建并复制 Token

**在 `.env.local` 中添加：**

```env
CLOUDFLARE_ACCOUNT_ID="你的 Account ID（在 Dashboard 右侧可找到）"
CLOUDFLARE_D1_TOKEN="你的 API Token"
CLOUDFLARE_D1_DATABASE_ID="你的 D1 Database ID"
```

配置完成后，`pnpm dev` 启动时会自动通过 HTTP API 连接远程 D1。

> **注意：** 这三个变量只配在 `.env.local`，不要提交到 Git，也不需要配置在生产环境（生产环境通过 Workers D1 binding 自动连接）。

---

## 13. 第十二步：部署

### .gitignore 添加

```gitignore
# 本地 SQLite 数据库
local.db
local.db-shm
local.db-wal

# 数据迁移生成的 SQL 文件（含生产数据）
scripts/d1-import/
```

### 提交代码

```bash
git add .
git commit -m "feat: migrate database from Supabase PostgreSQL to Cloudflare D1"
git push
```

### Cloudflare 自动部署

如果 Cloudflare Workers 已连接 GitHub 仓库，push 后会自动触发构建部署。

**Cloudflare 构建配置确认：**
- 构建命令：`pnpm run cf:build`
- 部署命令：`npx wrangler deploy` 或 `pnpm exec wrangler deploy`

---

## 14. 常见问题

### Q1: 构建报错 `Could not resolve "@libsql/client"`

**原因：** esbuild 把 `@libsql/client`（仅本地开发用）打包进了 Workers bundle。

**解决：** 在 `db/index.ts` 中，把模块路径存在变量里，防止 esbuild 静态分析：
```typescript
const MOD_LIBSQL_CLIENT = "@libsql/client";
const MOD_DRIZZLE_LIBSQL = "drizzle-orm/libsql";
// 然后用 require(MOD_LIBSQL_CLIENT) 而不是直接 import
```

### Q2: TypeScript 报错 `Parameter 'item' implicitly has an 'any' type`

**原因：** `db()` 函数返回联合类型导致类型推导失败。

**解决：** 给 `db()` 函数加明确的返回类型：
```typescript
export function db(): ReturnType<typeof drizzleD1> { ... }
```

### Q3: 部署报错 `wrangler: not found`

**原因：** CI 环境中 `wrangler` 未安装。

**解决：** 把 wrangler 加到 devDependencies：
```bash
pnpm add -D wrangler
```

### Q4: 迁移脚本报错 `relation "xxx" does not exist`

**原因：** Supabase 中该表不存在（可能是新表还没数据）。

**解决：** 用 `runSafe` 包装每个迁移函数，遇到不存在的表自动跳过。

### Q5: D1 里时间显示为数字

**正常现象。** SQLite 将时间存为 Unix 时间戳（整数），Drizzle ORM 在读取时自动转为 Date 对象，应用层显示正常。在 D1 Studio 查看可用：
```sql
SELECT datetime(created_at, 'unixepoch') as time FROM your_table;
```

### Q6: 数据量与 Supabase 不一致（少几条）

**正常现象。** 迁移过程中生产环境仍在运行，新数据会实时写入 Supabase。迁移完成并切换到 D1 后，极少量差异（几条到几十条）可以接受。

### Q7: glob 导入报错 `zsh: no matches found: xxx_batch_*.sql`

**原因：** 该表没有数据，没有生成对应的批次文件。

**解决：** 跳过该表的导入命令即可。

---

## 附：数据类型转换速查

| Supabase 数据类型 | SQLite 存储方式 | Drizzle 字段定义 |
|---|---|---|
| `TIMESTAMP WITH TIME ZONE` | `INTEGER`（Unix 秒） | `integer("col", { mode: "timestamp" })` |
| `BOOLEAN` | `INTEGER`（0/1） | `integer("col", { mode: "boolean" })` |
| `JSONB` / `JSON` | `TEXT`（JSON 字符串） | `text("col", { mode: "json" })` |
| `VARCHAR(N)` | `TEXT` | `text("col")` |
| `TEXT` | `TEXT` | `text("col")` |
| `INTEGER` | `INTEGER` | `integer("col")` |
| `BIGINT` | `INTEGER` | `integer("col")` |
| `SERIAL` / `IDENTITY` | `INTEGER PRIMARY KEY AUTOINCREMENT` | `integer("id").primaryKey({ autoIncrement: true })` |
| `UUID`（主键） | `TEXT PRIMARY KEY` | `text("id").primaryKey()` |
