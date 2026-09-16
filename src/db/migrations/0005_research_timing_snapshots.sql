CREATE TABLE IF NOT EXISTS "research_timing_snapshots_astrocarto" (
  "id" text PRIMARY KEY NOT NULL,
  "user_uuid" text NOT NULL,
  "project_id" text NOT NULL,
  "window_days" integer NOT NULL,
  "project_fingerprint" text NOT NULL,
  "report_json" text NOT NULL,
  "calculated_at" integer NOT NULL,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL,
  CHECK ("window_days" IN (30, 90))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "research_timing_snapshots_user_window_unique_idx"
  ON "research_timing_snapshots_astrocarto" ("user_uuid", "window_days");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "research_timing_snapshots_project_idx"
  ON "research_timing_snapshots_astrocarto" ("project_id");
