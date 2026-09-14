CREATE TABLE IF NOT EXISTS "subscriptions_astrocarto" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "provider" text NOT NULL,
  "provider_subscription_id" text NOT NULL,
  "provider_customer_id" text,
  "user_uuid" text NOT NULL,
  "order_no" text NOT NULL,
  "product_id" text NOT NULL,
  "interval" text NOT NULL,
  "status" text NOT NULL,
  "cancel_at_period_end" integer DEFAULT 0 NOT NULL,
  "current_period_start" integer,
  "current_period_end" integer,
  "last_paid_period_start" integer,
  "last_paid_invoice_id" text,
  "last_paid_at" integer,
  "canceled_at" integer,
  "ended_at" integer,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_provider_id_unique_idx"
  ON "subscriptions_astrocarto" ("provider", "provider_subscription_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_user_uuid_idx"
  ON "subscriptions_astrocarto" ("user_uuid");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscriptions_order_no_idx"
  ON "subscriptions_astrocarto" ("order_no");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_events_astrocarto" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "provider" text NOT NULL,
  "provider_event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "provider_subscription_id" text,
  "provider_invoice_id" text,
  "user_uuid" text,
  "order_no" text,
  "amount" integer,
  "currency" text,
  "status" text DEFAULT 'received' NOT NULL,
  "error" text,
  "created_at" integer NOT NULL,
  "processed_at" integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "subscription_events_provider_event_unique_idx"
  ON "subscription_events_astrocarto" ("provider", "provider_event_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_events_subscription_idx"
  ON "subscription_events_astrocarto" ("provider_subscription_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "subscription_events_order_no_idx"
  ON "subscription_events_astrocarto" ("order_no");
