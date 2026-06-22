-- ============================================================
-- Migration 001 — Initial Schema
-- Created: 2025-01-01T00:00:00Z
-- Description: Full initial schema with all core tables
-- Rollback: See 001_initial_schema.down.sql
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- For vector similarity search (requires pgvector):
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT NOT NULL,
  email_verified       BOOLEAN NOT NULL DEFAULT false,
  username             TEXT,
  display_name         TEXT,
  avatar_url           TEXT,
  password_hash        TEXT,
  replit_user_id       TEXT,
  google_id            TEXT,
  github_id            TEXT,
  tier                 TEXT NOT NULL DEFAULT 'free',
  bio                  TEXT,
  timezone             TEXT DEFAULT 'UTC',
  locale               TEXT DEFAULT 'en',
  theme                TEXT DEFAULT 'dark',
  preferences          JSONB DEFAULT '{}',
  last_seen_ip         TEXT,
  last_seen_at         TIMESTAMPTZ,
  last_user_agent      TEXT,
  devices              JSONB DEFAULT '[]',
  two_factor_enabled   BOOLEAN NOT NULL DEFAULT false,
  two_factor_secret    TEXT,
  backup_codes         JSONB DEFAULT '[]',
  login_attempts       INTEGER NOT NULL DEFAULT 0,
  locked_until         TIMESTAMPTZ,
  is_active            BOOLEAN NOT NULL DEFAULT true,
  is_banned            BOOLEAN NOT NULL DEFAULT false,
  ban_reason           TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx     ON users(email);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_idx  ON users(username) WHERE username IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_replit_id_idx ON users(replit_user_id) WHERE replit_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_tier_idx             ON users(tier);
CREATE INDEX IF NOT EXISTS users_created_at_idx       ON users(created_at);

-- ── SUBSCRIPTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan                      TEXT NOT NULL,
  billing_cycle             TEXT NOT NULL DEFAULT 'monthly',
  price_usd                 NUMERIC(10,2),
  status                    TEXT NOT NULL DEFAULT 'active',
  started_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at                   TIMESTAMPTZ,
  canceled_at               TIMESTAMPTZ,
  trial_ends_at             TIMESTAMPTZ,
  stripe_customer_id        TEXT,
  stripe_subscription_id    TEXT,
  stripe_price_id           TEXT,
  stripe_product_id         TEXT,
  limits                    JSONB DEFAULT '{}',
  usage_reset_at            TIMESTAMPTZ,
  messages_used             INTEGER NOT NULL DEFAULT 0,
  agent_runs_used           INTEGER NOT NULL DEFAULT 0,
  tokens_used               INTEGER NOT NULL DEFAULT 0,
  metadata                  JSONB DEFAULT '{}',
  cancel_reason             TEXT,
  is_auto_renew             BOOLEAN NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subs_user_id_idx         ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS subs_status_idx          ON subscriptions(status);
CREATE INDEX IF NOT EXISTS subs_plan_idx            ON subscriptions(plan);
CREATE INDEX IF NOT EXISTS subs_stripe_customer_idx ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS subs_ends_at_idx         ON subscriptions(ends_at);

-- ── CONVERSATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   UUID REFERENCES users(id) ON DELETE CASCADE,
  title                     TEXT NOT NULL DEFAULT 'New Conversation',
  summary                   TEXT,
  model                     TEXT NOT NULL DEFAULT 'gpt-4o',
  persona                   TEXT,
  mode                      TEXT DEFAULT 'standard',
  system_prompt             TEXT,
  message_count             INTEGER NOT NULL DEFAULT 0,
  total_tokens              INTEGER NOT NULL DEFAULT 0,
  total_prompt_tokens       INTEGER NOT NULL DEFAULT 0,
  total_completion_tokens   INTEGER NOT NULL DEFAULT 0,
  avg_response_ms           INTEGER DEFAULT 0,
  is_shared                 BOOLEAN NOT NULL DEFAULT false,
  share_token               TEXT,
  team_id                   UUID,
  tags                      JSONB DEFAULT '[]',
  is_pinned                 BOOLEAN NOT NULL DEFAULT false,
  is_archived               BOOLEAN NOT NULL DEFAULT false,
  context_window_tokens     INTEGER,
  metadata                  JSONB DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS conv_user_id_idx      ON conversations(user_id);
CREATE INDEX IF NOT EXISTS conv_model_idx        ON conversations(model);
CREATE INDEX IF NOT EXISTS conv_mode_idx         ON conversations(mode);
CREATE INDEX IF NOT EXISTS conv_team_id_idx      ON conversations(team_id);
CREATE INDEX IF NOT EXISTS conv_created_at_idx   ON conversations(created_at);
CREATE INDEX IF NOT EXISTS conv_last_message_idx ON conversations(last_message_at);
CREATE INDEX IF NOT EXISTS conv_share_token_idx  ON conversations(share_token);

-- ── MESSAGES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id       UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role                  TEXT NOT NULL,
  content               TEXT NOT NULL,
  model                 TEXT,
  prompt_tokens         INTEGER DEFAULT 0,
  completion_tokens     INTEGER DEFAULT 0,
  total_tokens          INTEGER DEFAULT 0,
  response_ms           INTEGER,
  finish_reason         TEXT,
  cost_usd              NUMERIC(10,6),
  tool_calls            JSONB DEFAULT '[]',
  tool_call_id          TEXT,
  attachments           JSONB DEFAULT '[]',
  user_rating           INTEGER,
  user_feedback         TEXT,
  is_bookmarked         BOOLEAN NOT NULL DEFAULT false,
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS msg_conversation_id_idx ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS msg_role_idx            ON messages(role);
CREATE INDEX IF NOT EXISTS msg_model_idx           ON messages(model);
CREATE INDEX IF NOT EXISTS msg_created_at_idx      ON messages(created_at);

-- ── AGENT RUNS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_runs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  agent_type          TEXT NOT NULL,
  agent_name          TEXT NOT NULL,
  agent_version       TEXT,
  status              TEXT NOT NULL DEFAULT 'pending',
  input               JSONB DEFAULT '{}',
  output              JSONB DEFAULT '{}',
  steps               JSONB DEFAULT '[]',
  started_at          TIMESTAMPTZ,
  ended_at            TIMESTAMPTZ,
  duration_ms         INTEGER,
  tokens_used         INTEGER DEFAULT 0,
  cost_usd            NUMERIC(10,6),
  tool_calls_count    INTEGER DEFAULT 0,
  error_message       TEXT,
  error_stack         TEXT,
  retry_count         INTEGER DEFAULT 0,
  conversation_id     UUID,
  team_id             UUID,
  project_id          UUID,
  config              JSONB DEFAULT '{}',
  tags                JSONB DEFAULT '[]',
  is_favorite         BOOLEAN NOT NULL DEFAULT false,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_user_id_idx    ON agent_runs(user_id);
CREATE INDEX IF NOT EXISTS agent_type_idx       ON agent_runs(agent_type);
CREATE INDEX IF NOT EXISTS agent_status_idx     ON agent_runs(status);
CREATE INDEX IF NOT EXISTS agent_created_at_idx ON agent_runs(created_at);
CREATE INDEX IF NOT EXISTS agent_conv_id_idx    ON agent_runs(conversation_id);

-- ── API USAGE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_usage (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES users(id) ON DELETE SET NULL,
  endpoint              TEXT NOT NULL,
  method                TEXT NOT NULL DEFAULT 'POST',
  provider              TEXT,
  model                 TEXT,
  status_code           INTEGER NOT NULL,
  latency_ms            INTEGER,
  is_success            BOOLEAN NOT NULL DEFAULT true,
  error_code            TEXT,
  error_message         TEXT,
  prompt_tokens         INTEGER DEFAULT 0,
  completion_tokens     INTEGER DEFAULT 0,
  total_tokens          INTEGER DEFAULT 0,
  cost_usd              NUMERIC(10,6),
  ip_address            TEXT,
  user_agent            TEXT,
  api_key_id            UUID,
  conversation_id       UUID,
  agent_run_id          UUID,
  session_id            TEXT,
  billing_period        TEXT NOT NULL,
  request_body          JSONB DEFAULT '{}',
  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS usage_user_id_idx        ON api_usage(user_id);
CREATE INDEX IF NOT EXISTS usage_endpoint_idx       ON api_usage(endpoint);
CREATE INDEX IF NOT EXISTS usage_provider_idx       ON api_usage(provider);
CREATE INDEX IF NOT EXISTS usage_model_idx          ON api_usage(model);
CREATE INDEX IF NOT EXISTS usage_created_at_idx     ON api_usage(created_at);
CREATE INDEX IF NOT EXISTS usage_billing_period_idx ON api_usage(billing_period);
CREATE INDEX IF NOT EXISTS usage_success_idx        ON api_usage(is_success);

-- ── SECURITY EVENTS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS security_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type       TEXT NOT NULL,
  severity         TEXT NOT NULL DEFAULT 'info',
  ip_address       TEXT,
  user_agent       TEXT,
  country_code     TEXT,
  city             TEXT,
  session_id       TEXT,
  description      TEXT,
  resource_type    TEXT,
  resource_id      TEXT,
  outcome          TEXT NOT NULL DEFAULT 'success',
  is_resolved      BOOLEAN NOT NULL DEFAULT false,
  resolved_at      TIMESTAMPTZ,
  resolved_by      UUID,
  requires_action  BOOLEAN NOT NULL DEFAULT false,
  is_false_positive BOOLEAN NOT NULL DEFAULT false,
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sec_user_id_idx        ON security_events(user_id);
CREATE INDEX IF NOT EXISTS sec_event_type_idx     ON security_events(event_type);
CREATE INDEX IF NOT EXISTS sec_severity_idx       ON security_events(severity);
CREATE INDEX IF NOT EXISTS sec_created_at_idx     ON security_events(created_at);
CREATE INDEX IF NOT EXISTS sec_ip_idx             ON security_events(ip_address);
CREATE INDEX IF NOT EXISTS sec_requires_action_idx ON security_events(requires_action);
CREATE INDEX IF NOT EXISTS sec_outcome_idx        ON security_events(outcome);

-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  icon          TEXT,
  image_url     TEXT,
  action_url    TEXT,
  action_label  TEXT,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  read_at       TIMESTAMPTZ,
  is_dismissed  BOOLEAN NOT NULL DEFAULT false,
  dismissed_at  TIMESTAMPTZ,
  channels      JSONB DEFAULT '["in_app"]',
  email_sent_at TIMESTAMPTZ,
  push_sent_at  TIMESTAMPTZ,
  priority      TEXT DEFAULT 'normal',
  group_key     TEXT,
  expires_at    TIMESTAMPTZ,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notif_user_id_idx    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS notif_type_idx       ON notifications(type);
CREATE INDEX IF NOT EXISTS notif_is_read_idx    ON notifications(is_read);
CREATE INDEX IF NOT EXISTS notif_created_at_idx ON notifications(created_at);
CREATE INDEX IF NOT EXISTS notif_group_key_idx  ON notifications(group_key);
CREATE INDEX IF NOT EXISTS notif_priority_idx   ON notifications(priority);

-- ── TEAMS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL,
  description TEXT,
  avatar_url  TEXT,
  plan        TEXT NOT NULL DEFAULT 'free',
  max_members INTEGER NOT NULL DEFAULT 5,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  settings    JSONB DEFAULT '{}',
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS teams_slug_idx     ON teams(slug);
CREATE INDEX IF NOT EXISTS teams_owner_id_idx        ON teams(owner_id);
CREATE INDEX IF NOT EXISTS teams_plan_idx            ON teams(plan);

CREATE TABLE IF NOT EXISTS team_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member',
  permissions JSONB DEFAULT '{}',
  invited_by  UUID,
  invited_at  TIMESTAMPTZ,
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS team_member_unique_idx  ON team_members(team_id, user_id);
CREATE INDEX IF NOT EXISTS team_member_team_id_idx        ON team_members(team_id);
CREATE INDEX IF NOT EXISTS team_member_user_id_idx        ON team_members(user_id);
CREATE INDEX IF NOT EXISTS team_member_role_idx           ON team_members(role);

CREATE TABLE IF NOT EXISTS projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id     UUID REFERENCES teams(id) ON DELETE CASCADE,
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT DEFAULT 'active',
  visibility  TEXT DEFAULT 'private',
  tags        JSONB DEFAULT '[]',
  settings    JSONB DEFAULT '{}',
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS projects_team_id_idx  ON projects(team_id);
CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON projects(owner_id);
CREATE INDEX IF NOT EXISTS projects_status_idx   ON projects(status);

-- ── MODULES / MARKETPLACE ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS modules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              TEXT NOT NULL,
  name              TEXT NOT NULL,
  description       TEXT,
  long_description  TEXT,
  category          TEXT NOT NULL,
  version           TEXT NOT NULL DEFAULT '1.0.0',
  author_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name       TEXT,
  is_free           BOOLEAN NOT NULL DEFAULT true,
  price_usd         NUMERIC(10,2),
  required_tier     TEXT DEFAULT 'free',
  icon_url          TEXT,
  screenshot_urls   JSONB DEFAULT '[]',
  demo_url          TEXT,
  is_published      BOOLEAN NOT NULL DEFAULT false,
  is_verified       BOOLEAN NOT NULL DEFAULT false,
  is_featured       BOOLEAN NOT NULL DEFAULT false,
  is_deprecated     BOOLEAN NOT NULL DEFAULT false,
  install_count     INTEGER NOT NULL DEFAULT 0,
  rating            NUMERIC(3,2),
  rating_count      INTEGER NOT NULL DEFAULT 0,
  config_schema     JSONB DEFAULT '{}',
  permissions       JSONB DEFAULT '[]',
  tags              JSONB DEFAULT '[]',
  changelog         JSONB DEFAULT '[]',
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS modules_slug_idx          ON modules(slug);
CREATE INDEX IF NOT EXISTS modules_category_idx             ON modules(category);
CREATE INDEX IF NOT EXISTS modules_author_id_idx            ON modules(author_id);
CREATE INDEX IF NOT EXISTS modules_is_published_idx         ON modules(is_published);
CREATE INDEX IF NOT EXISTS modules_required_tier_idx        ON modules(required_tier);
CREATE INDEX IF NOT EXISTS modules_install_count_idx        ON modules(install_count);

CREATE TABLE IF NOT EXISTS user_modules (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_id    UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  config       JSONB DEFAULT '{}',
  is_enabled   BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  rating       INTEGER,
  review       TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS user_module_unique_idx    ON user_modules(user_id, module_id);
CREATE INDEX IF NOT EXISTS user_modules_user_id_idx        ON user_modules(user_id);
CREATE INDEX IF NOT EXISTS user_modules_module_id_idx      ON user_modules(module_id);

-- ── KNOWLEDGE BASE ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_bases (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users(id) ON DELETE CASCADE,
  team_id          UUID,
  name             TEXT NOT NULL,
  description      TEXT,
  embedding_model  TEXT NOT NULL DEFAULT 'text-embedding-3-small',
  vector_dimension INTEGER NOT NULL DEFAULT 1536,
  document_count   INTEGER NOT NULL DEFAULT 0,
  chunk_count      INTEGER NOT NULL DEFAULT 0,
  is_public        BOOLEAN NOT NULL DEFAULT false,
  settings         JSONB DEFAULT '{}',
  metadata         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kb_user_id_idx  ON knowledge_bases(user_id);
CREATE INDEX IF NOT EXISTS kb_team_id_idx  ON knowledge_bases(team_id);

CREATE TABLE IF NOT EXISTS documents (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_base_id   UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  title               TEXT NOT NULL,
  content             TEXT,
  source_url          TEXT,
  source_type         TEXT DEFAULT 'upload',
  mime_type           TEXT,
  file_size           INTEGER,
  chunk_count         INTEGER NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'processing',
  error_message       TEXT,
  metadata            JSONB DEFAULT '{}',
  processed_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS docs_kb_id_idx      ON documents(knowledge_base_id);
CREATE INDEX IF NOT EXISTS docs_user_id_idx    ON documents(user_id);
CREATE INDEX IF NOT EXISTS docs_status_idx     ON documents(status);
CREATE INDEX IF NOT EXISTS docs_source_type_idx ON documents(source_type);

CREATE TABLE IF NOT EXISTS document_chunks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id       UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
  content           TEXT NOT NULL,
  chunk_index       INTEGER NOT NULL,
  token_count       INTEGER,
  embedding_vector  TEXT,
  -- In production with pgvector: embedding vector(1536)
  metadata          JSONB DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS chunks_kb_id_idx       ON document_chunks(knowledge_base_id);
CREATE INDEX IF NOT EXISTS chunks_chunk_index_idx ON document_chunks(chunk_index);

-- ── REPORTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID REFERENCES users(id) ON DELETE SET NULL,
  team_id             UUID,
  agent_run_id        UUID,
  title               TEXT NOT NULL,
  description         TEXT,
  report_type         TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'generating',
  content             JSONB DEFAULT '{}',
  findings            JSONB DEFAULT '[]',
  recommendations     JSONB DEFAULT '[]',
  executive_summary   TEXT,
  risk_level          TEXT,
  cvss_score          TEXT,
  pdf_url             TEXT,
  html_url            TEXT,
  json_url            TEXT,
  file_size           INTEGER,
  is_public           BOOLEAN NOT NULL DEFAULT false,
  share_token         TEXT,
  expires_at          TIMESTAMPTZ,
  download_count      INTEGER NOT NULL DEFAULT 0,
  target_scope        JSONB DEFAULT '[]',
  tags                JSONB DEFAULT '[]',
  metadata            JSONB DEFAULT '{}',
  generated_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS reports_user_id_idx     ON reports(user_id);
CREATE INDEX IF NOT EXISTS reports_team_id_idx     ON reports(team_id);
CREATE INDEX IF NOT EXISTS reports_type_idx        ON reports(report_type);
CREATE INDEX IF NOT EXISTS reports_status_idx      ON reports(status);
CREATE INDEX IF NOT EXISTS reports_risk_level_idx  ON reports(risk_level);
CREATE INDEX IF NOT EXISTS reports_created_at_idx  ON reports(created_at);
CREATE INDEX IF NOT EXISTS reports_share_token_idx ON reports(share_token);

-- ── API KEYS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id                UUID,
  name                   TEXT NOT NULL,
  description            TEXT,
  key_hash               TEXT NOT NULL,
  key_prefix             TEXT NOT NULL,
  scopes                 JSONB NOT NULL DEFAULT '["chat:read","chat:write"]',
  rate_limit_per_minute  INTEGER DEFAULT 60,
  rate_limit_per_day     INTEGER DEFAULT 10000,
  allowed_ips            JSONB DEFAULT '[]',
  allowed_origins        JSONB DEFAULT '[]',
  is_active              BOOLEAN NOT NULL DEFAULT true,
  is_revoked             BOOLEAN NOT NULL DEFAULT false,
  revoked_at             TIMESTAMPTZ,
  revoked_by             UUID,
  revoke_reason          TEXT,
  last_used_at           TIMESTAMPTZ,
  last_used_ip           TEXT,
  usage_count            INTEGER NOT NULL DEFAULT 0,
  expires_at             TIMESTAMPTZ,
  metadata               JSONB DEFAULT '{}',
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_hash_idx     ON api_keys(key_hash);
CREATE UNIQUE INDEX IF NOT EXISTS api_keys_prefix_idx   ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS api_keys_user_id_idx         ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS api_keys_team_id_idx         ON api_keys(team_id);
CREATE INDEX IF NOT EXISTS api_keys_is_active_idx       ON api_keys(is_active);
CREATE INDEX IF NOT EXISTS api_keys_last_used_idx       ON api_keys(last_used_at);

-- ── WEBHOOKS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS webhooks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team_id             UUID,
  name                TEXT NOT NULL,
  description         TEXT,
  url                 TEXT NOT NULL,
  secret_hash         TEXT,
  events              JSONB NOT NULL DEFAULT '[]',
  is_active           BOOLEAN NOT NULL DEFAULT true,
  is_paused           BOOLEAN NOT NULL DEFAULT false,
  max_retries         INTEGER NOT NULL DEFAULT 3,
  retry_delay_ms      INTEGER NOT NULL DEFAULT 5000,
  timeout_ms          INTEGER NOT NULL DEFAULT 30000,
  success_count       INTEGER NOT NULL DEFAULT 0,
  failure_count       INTEGER NOT NULL DEFAULT 0,
  last_triggered_at   TIMESTAMPTZ,
  last_success_at     TIMESTAMPTZ,
  last_failure_at     TIMESTAMPTZ,
  headers             JSONB DEFAULT '{}',
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS webhooks_user_id_idx  ON webhooks(user_id);
CREATE INDEX IF NOT EXISTS webhooks_team_id_idx  ON webhooks(team_id);
CREATE INDEX IF NOT EXISTS webhooks_is_active_idx ON webhooks(is_active);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id            UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
  event_type            TEXT NOT NULL,
  event_id              UUID DEFAULT gen_random_uuid(),
  request_url           TEXT NOT NULL,
  request_headers       JSONB DEFAULT '{}',
  request_body          JSONB DEFAULT '{}',
  response_status_code  INTEGER,
  response_headers      JSONB DEFAULT '{}',
  response_body         TEXT,
  latency_ms            INTEGER,
  status                TEXT NOT NULL DEFAULT 'pending',
  attempt_number        INTEGER NOT NULL DEFAULT 1,
  next_retry_at         TIMESTAMPTZ,
  error_message         TEXT,
  delivered_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wh_deliveries_webhook_id_idx  ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS wh_deliveries_status_idx      ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS wh_deliveries_event_type_idx  ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS wh_deliveries_created_at_idx  ON webhook_deliveries(created_at);
CREATE INDEX IF NOT EXISTS wh_deliveries_next_retry_idx  ON webhook_deliveries(next_retry_at);
