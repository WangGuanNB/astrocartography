-- AI request telemetry only. Conversation content continues to live in R2.
CREATE TABLE IF NOT EXISTS ai_chat_events_astrocarto (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at INTEGER NOT NULL,
  trace_id TEXT NOT NULL,
  user_uuid TEXT,
  request_type TEXT NOT NULL,
  event TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  thinking TEXT,
  delivery TEXT,
  attempt INTEGER,
  credit_cost INTEGER,
  elapsed_ms INTEGER,
  first_text_latency_ms INTEGER,
  provider_latency_ms INTEGER,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  text_characters INTEGER,
  error_kind TEXT
);

CREATE INDEX IF NOT EXISTS ai_chat_events_created_at_idx
  ON ai_chat_events_astrocarto(created_at);
CREATE INDEX IF NOT EXISTS ai_chat_events_trace_id_idx
  ON ai_chat_events_astrocarto(trace_id);
CREATE INDEX IF NOT EXISTS ai_chat_events_user_uuid_idx
  ON ai_chat_events_astrocarto(user_uuid);
