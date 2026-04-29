import "dotenv/config";
import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env" });
config({ path: ".env.development" });
config({ path: ".env.local" });

// drizzle-kit uses a local SQLite file for schema generation and studio.
// To apply migrations to the live D1 database, use:
//   npx wrangler d1 migrations apply astrocarto-db --remote
export default defineConfig({
  out: "./src/db/migrations",
  schema: "./src/db/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "file:local.db",
  },
});
