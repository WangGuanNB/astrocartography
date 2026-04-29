import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { LibSQLDatabase } from "drizzle-orm/libsql";
import { D1HttpDatabase } from "./d1-http";

// Singletons for local development (next dev)
let _remoteD1Db: ReturnType<typeof drizzleD1> | null = null;
let _localDb: LibSQLDatabase | null = null;

// Store module paths in variables so esbuild won't statically analyze and
// attempt to bundle these Node.js-only packages into the Workers bundle.
const MOD_LIBSQL_CLIENT = "@libsql/client";
const MOD_DRIZZLE_LIBSQL = "drizzle-orm/libsql";

/**
 * Returns a Drizzle database instance.
 *
 * Priority order:
 * 1. Production (Cloudflare Workers): uses D1 binding injected by the Workers runtime
 * 2. Local dev with remote D1: when CLOUDFLARE_D1_TOKEN is set in .env.local,
 *    connects to the production D1 database via Cloudflare REST API (useful for debugging)
 * 3. Local dev fallback: uses a local SQLite file via libsql (Node.js only)
 */
export function db(): ReturnType<typeof drizzleD1> {
  // Production: Cloudflare Workers with D1 binding
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require(
      "@opennextjs/cloudflare"
    ) as typeof import("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d1 = (ctx.env as any).DB;
    if (d1) {
      return drizzleD1(d1);
    }
  } catch {
    // Not in Cloudflare Workers context — fall through to local dev
  }

  // Local dev with remote D1: connect via Cloudflare REST API
  const d1Token = process.env.CLOUDFLARE_D1_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const databaseId = process.env.CLOUDFLARE_D1_DATABASE_ID;

  if (d1Token && accountId && databaseId) {
    if (!_remoteD1Db) {
      const httpDb = new D1HttpDatabase(accountId, databaseId, d1Token);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      _remoteD1Db = drizzleD1(httpDb as any);
    }
    return _remoteD1Db!;
  }

  // Local development fallback: dynamically require @libsql/client.
  // Module paths are stored in variables so esbuild cannot statically trace
  // these requires and attempt to bundle Node.js-only packages.
  if (!_localDb) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require(MOD_LIBSQL_CLIENT);
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { drizzle } = require(MOD_DRIZZLE_LIBSQL);
    const client = createClient({ url: "file:local.db" });
    _localDb = drizzle(client) as LibSQLDatabase;
  }
  return _localDb! as unknown as ReturnType<typeof drizzleD1>;
}
