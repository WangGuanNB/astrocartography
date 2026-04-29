/**
 * D1 HTTP Client
 *
 * Implements the Cloudflare D1Database interface via Cloudflare REST API.
 * Allows local `next dev` to read/write the remote production D1 database
 * by setting CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_TOKEN, and
 * CLOUDFLARE_D1_DATABASE_ID in .env.local.
 */

interface D1QueryResult {
  results: Record<string, unknown>[];
  success: boolean;
  meta: Record<string, unknown>;
}

interface D1ApiResponse {
  success: boolean;
  errors: { code: number; message: string }[];
  result: D1QueryResult[];
}

class D1HttpPreparedStatement {
  private _db: D1HttpDatabase;
  private _sql: string;
  private _params: unknown[];

  constructor(db: D1HttpDatabase, sql: string, params: unknown[] = []) {
    this._db = db;
    this._sql = sql;
    this._params = params;
  }

  bind(...values: unknown[]): D1HttpPreparedStatement {
    return new D1HttpPreparedStatement(this._db, this._sql, values);
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const result = await this._db._query(this._sql, this._params);
    if (!result.results || result.results.length === 0) return null;
    const row = result.results[0];
    if (colName !== undefined) {
      return (row[colName] ?? null) as T | null;
    }
    return row as unknown as T;
  }

  async run(): Promise<{ results: unknown[]; success: boolean; meta: Record<string, unknown> }> {
    const result = await this._db._query(this._sql, this._params);
    return { results: result.results ?? [], success: true, meta: result.meta ?? {} };
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[]; success: boolean; meta: Record<string, unknown> }> {
    const result = await this._db._query(this._sql, this._params);
    return { results: (result.results ?? []) as T[], success: true, meta: result.meta ?? {} };
  }

  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]> {
    const result = await this._db._query(this._sql, this._params);
    const rows = result.results ?? [];
    if (!rows.length) return [];

    const keys = Object.keys(rows[0]);
    const rawRows = rows.map((row) => keys.map((k) => row[k])) as unknown as T[];

    if (options?.columnNames) {
      return [keys as unknown as T, ...rawRows];
    }
    return rawRows;
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
      throw new Error(`D1 HTTP request failed: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as D1ApiResponse;
    if (!data.success) {
      const errMsg = data.errors?.map((e) => e.message).join(", ") ?? "Unknown error";
      throw new Error(`D1 API error: ${errMsg}`);
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
    return { count: 0, duration: 0 };
  }
}
