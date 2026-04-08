CREATE TABLE "ai_chat_sessions_astrocarto" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_uuid" varchar(255) NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"title" varchar(500),
	"chart_context_json" text,
	"is_synastry" boolean DEFAULT false NOT NULL,
	"messages" jsonb NOT NULL
);
--> statement-breakpoint
CREATE INDEX "ai_chat_sessions_user_uuid_idx" ON "ai_chat_sessions_astrocarto" ("user_uuid");
