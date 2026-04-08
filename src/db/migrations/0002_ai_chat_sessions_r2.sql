ALTER TABLE "ai_chat_sessions_astrocarto"
ADD COLUMN IF NOT EXISTS "message_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "ai_chat_sessions_astrocarto"
ADD COLUMN IF NOT EXISTS "messages_r2_key" text;
