import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

// Users table
export const users = sqliteTable(
  "users_astrocarto",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    uuid: text("uuid").notNull().unique(),
    email: text("email").notNull(),
    created_at: integer("created_at", { mode: "timestamp" }),
    nickname: text("nickname"),
    avatar_url: text("avatar_url"),
    locale: text("locale"),
    signin_type: text("signin_type"),
    signin_ip: text("signin_ip"),
    signin_provider: text("signin_provider"),
    signin_openid: text("signin_openid"),
    invite_code: text("invite_code").notNull().default(""),
    updated_at: integer("updated_at", { mode: "timestamp" }),
    invited_by: text("invited_by").notNull().default(""),
    is_affiliate: integer("is_affiliate", { mode: "boolean" })
      .notNull()
      .default(false),
  },
  (table) => [
    uniqueIndex("email_astrocarto_provider_unique_idx").on(
      table.email,
      table.signin_provider
    ),
  ]
);

// Orders table
export const orders = sqliteTable("orders_astrocarto", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  order_no: text("order_no").notNull().unique(),
  created_at: integer("created_at", { mode: "timestamp" }),
  user_uuid: text("user_uuid").notNull().default(""),
  user_email: text("user_email").notNull().default(""),
  amount: integer("amount").notNull(),
  interval: text("interval"),
  expired_at: integer("expired_at", { mode: "timestamp" }),
  status: text("status").notNull(),
  stripe_session_id: text("stripe_session_id"),
  credits: integer("credits").notNull(),
  currency: text("currency"),
  sub_id: text("sub_id"),
  sub_interval_count: integer("sub_interval_count"),
  sub_cycle_anchor: integer("sub_cycle_anchor"),
  sub_period_end: integer("sub_period_end"),
  sub_period_start: integer("sub_period_start"),
  sub_times: integer("sub_times"),
  product_id: text("product_id"),
  product_name: text("product_name"),
  valid_months: integer("valid_months"),
  order_detail: text("order_detail"),
  paid_at: integer("paid_at", { mode: "timestamp" }),
  paid_email: text("paid_email"),
  paid_detail: text("paid_detail"),
  pay_type: text("pay_type"),
});

// API Keys table
export const apikeys = sqliteTable("apikeys_astrocarto", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  api_key: text("api_key").notNull().unique(),
  title: text("title"),
  user_uuid: text("user_uuid").notNull(),
  created_at: integer("created_at", { mode: "timestamp" }),
  status: text("status"),
});

// Credits table
export const credits = sqliteTable("credits_astrocarto", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  trans_no: text("trans_no").notNull().unique(),
  created_at: integer("created_at", { mode: "timestamp" }),
  user_uuid: text("user_uuid").notNull(),
  trans_type: text("trans_type").notNull(),
  credits: integer("credits").notNull(),
  order_no: text("order_no"),
  expired_at: integer("expired_at", { mode: "timestamp" }),
});

// Posts table
export const posts = sqliteTable("posts_astrocarto", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  uuid: text("uuid").notNull().unique(),
  slug: text("slug"),
  title: text("title"),
  description: text("description"),
  content: text("content"),
  created_at: integer("created_at", { mode: "timestamp" }),
  updated_at: integer("updated_at", { mode: "timestamp" }),
  status: text("status"),
  cover_url: text("cover_url"),
  author_name: text("author_name"),
  author_avatar_url: text("author_avatar_url"),
  locale: text("locale"),
});

// Affiliates table
export const affiliates = sqliteTable("affiliates_astrocarto", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  user_uuid: text("user_uuid").notNull(),
  created_at: integer("created_at", { mode: "timestamp" }),
  status: text("status").notNull().default(""),
  invited_by: text("invited_by").notNull(),
  paid_order_no: text("paid_order_no").notNull().default(""),
  paid_amount: integer("paid_amount").notNull().default(0),
  reward_percent: integer("reward_percent").notNull().default(0),
  reward_amount: integer("reward_amount").notNull().default(0),
});

// AI chat sessions (cloud history for Professional tier; synced server-side)
export const aiChatSessions = sqliteTable(
  "ai_chat_sessions_astrocarto",
  {
    id: text("id").primaryKey(),
    user_uuid: text("user_uuid").notNull(),
    created_at: integer("created_at", { mode: "timestamp" }),
    updated_at: integer("updated_at", { mode: "timestamp" }),
    title: text("title"),
    chart_context_json: text("chart_context_json"),
    is_synastry: integer("is_synastry", { mode: "boolean" })
      .notNull()
      .default(false),
    message_count: integer("message_count").notNull().default(0),
    messages_r2_key: text("messages_r2_key"),
    messages: text("messages", { mode: "json" })
      .notNull()
      .$type<Array<{ role: "user" | "assistant"; content: string }>>(),
  },
  (table) => [index("ai_chat_sessions_user_uuid_idx").on(table.user_uuid)]
);

// Feedbacks table
export const feedbacks = sqliteTable("feedbacks_astrocarto", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  created_at: integer("created_at", { mode: "timestamp" }),
  status: text("status"),
  user_uuid: text("user_uuid"),
  content: text("content"),
  rating: integer("rating"),
});
