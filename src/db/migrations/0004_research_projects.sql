CREATE TABLE IF NOT EXISTS "research_projects_astrocarto" (
  "id" text PRIMARY KEY NOT NULL,
  "user_uuid" text NOT NULL,
  "birth_date" text NOT NULL,
  "birth_time" text NOT NULL,
  "birth_location" text NOT NULL,
  "birth_latitude" real NOT NULL,
  "birth_longitude" real NOT NULL,
  "birth_timezone" text NOT NULL,
  "goal" text NOT NULL,
  "current_city_json" text NOT NULL,
  "candidate_cities_json" text NOT NULL,
  "plan_date" text NOT NULL,
  "constraints" text DEFAULT '' NOT NULL,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "research_projects_user_uuid_unique_idx"
  ON "research_projects_astrocarto" ("user_uuid");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "research_projects_updated_at_idx"
  ON "research_projects_astrocarto" ("updated_at");
