import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function ensureAuthTables() {
  try {
    // Core tables (single transaction for atomicity)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid VARCHAR NOT NULL PRIMARY KEY,
        sess JSONB NOT NULL,
        expire TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire);

      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        email VARCHAR UNIQUE NOT NULL,
        password_hash VARCHAR,
        username VARCHAR,
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        role VARCHAR NOT NULL DEFAULT 'user',
        status VARCHAR NOT NULL DEFAULT 'active',
        subscription VARCHAR NOT NULL DEFAULT 'free',
        subscription_expires_at TIMESTAMP,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        tokens_limit INTEGER NOT NULL DEFAULT 50000,
        stripe_customer_id VARCHAR,
        stripe_subscription_id VARCHAR,
        refresh_token VARCHAR,
        last_login_at TIMESTAMP,
        last_ip VARCHAR,
        failed_login_attempts INTEGER NOT NULL DEFAULT 0,
        locked_until TIMESTAMP,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        email_verify_code VARCHAR,
        email_verify_expires TIMESTAMP,
        reset_token VARCHAR,
        reset_expires TIMESTAMP,
        totp_secret VARCHAR,
        totp_enabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

      CREATE TABLE IF NOT EXISTS user_sessions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR NOT NULL UNIQUE,
        device_name VARCHAR,
        device_type VARCHAR,
        browser VARCHAR,
        os VARCHAR,
        ip_address VARCHAR,
        location VARCHAR,
        expires_at TIMESTAMP NOT NULL,
        last_active_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions (user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions (session_token);

      CREATE TABLE IF NOT EXISTS security_events (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        email VARCHAR,
        event_type VARCHAR NOT NULL,
        success BOOLEAN NOT NULL DEFAULT true,
        ip_address VARCHAR,
        user_agent VARCHAR,
        details JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events (user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS subscriptions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan VARCHAR NOT NULL DEFAULT 'free',
        billing_period VARCHAR NOT NULL DEFAULT 'monthly',
        started_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        tokens_limit INTEGER NOT NULL DEFAULT 50000,
        payment_status VARCHAR NOT NULL DEFAULT 'active',
        payment_method VARCHAR,
        external_payment_id VARCHAR,
        stripe_subscription_id VARCHAR,
        stripe_customer_id VARCHAR,
        cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);

      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key_hash VARCHAR NOT NULL UNIQUE,
        key_prefix VARCHAR NOT NULL,
        name VARCHAR NOT NULL DEFAULT 'Default Key',
        permissions JSONB NOT NULL DEFAULT '["chat","osint"]',
        rate_limit_per_min INTEGER NOT NULL DEFAULT 20,
        daily_limit INTEGER NOT NULL DEFAULT 500,
        requests_today INTEGER NOT NULL DEFAULT 0,
        last_used_at TIMESTAMP,
        last_used_ip VARCHAR,
        expires_at TIMESTAMP,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (user_id);

      CREATE TABLE IF NOT EXISTS notifications (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR NOT NULL,
        title VARCHAR NOT NULL,
        body TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT false,
        data JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS cloud_chats (
        device_id VARCHAR NOT NULL PRIMARY KEY,
        chats_json JSONB NOT NULL DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS webhook_endpoints (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        url VARCHAR NOT NULL,
        events JSONB NOT NULL DEFAULT '["task.done"]',
        secret VARCHAR NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_triggered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        webhook_id VARCHAR NOT NULL REFERENCES webhook_endpoints(id) ON DELETE CASCADE,
        event_type VARCHAR NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}',
        response_status INTEGER,
        success BOOLEAN NOT NULL DEFAULT false,
        attempts INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS scan_results (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        filename VARCHAR,
        language VARCHAR,
        vulnerabilities JSONB NOT NULL DEFAULT '[]',
        summary TEXT,
        severity_counts JSONB NOT NULL DEFAULT '{"critical":0,"high":0,"medium":0,"low":0}',
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS knowledge_documents (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
        is_shared BOOLEAN NOT NULL DEFAULT false,
        title VARCHAR NOT NULL,
        source_type VARCHAR NOT NULL DEFAULT 'text',
        source_url VARCHAR,
        chunk_count INTEGER NOT NULL DEFAULT 0,
        embedding_model VARCHAR NOT NULL DEFAULT 'text-embedding-3-small',
        status VARCHAR NOT NULL DEFAULT 'processing',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_memory (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        fact TEXT NOT NULL,
        category VARCHAR NOT NULL DEFAULT 'general',
        confidence REAL NOT NULL DEFAULT 1.0,
        source_conversation VARCHAR,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_memory_user ON user_memory (user_id, is_active);

      CREATE TABLE IF NOT EXISTS usage_stats (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        endpoint VARCHAR NOT NULL,
        tokens_in INTEGER NOT NULL DEFAULT 0,
        tokens_out INTEGER NOT NULL DEFAULT 0,
        model VARCHAR,
        latency_ms INTEGER,
        success BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_usage_stats_user ON usage_stats (user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS training_samples (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        conversation_id VARCHAR,
        messages JSONB NOT NULL,
        rating VARCHAR NOT NULL DEFAULT 'good',
        user_note TEXT,
        admin_approved BOOLEAN,
        approved_by VARCHAR,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS organizations (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        name VARCHAR NOT NULL,
        slug VARCHAR UNIQUE NOT NULL,
        owner_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan VARCHAR NOT NULL DEFAULT 'free',
        tokens_limit INTEGER NOT NULL DEFAULT 1000000,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS org_members (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        org_id VARCHAR NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR NOT NULL DEFAULT 'analyst',
        joined_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(org_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS marketplace_modules (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        author_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR NOT NULL,
        slug VARCHAR UNIQUE NOT NULL,
        description TEXT,
        icon VARCHAR,
        category VARCHAR NOT NULL DEFAULT 'tool',
        schema_json JSONB NOT NULL DEFAULT '{}',
        system_prompt TEXT,
        endpoint VARCHAR,
        permissions JSONB NOT NULL DEFAULT '[]',
        status VARCHAR NOT NULL DEFAULT 'pending',
        downloads INTEGER NOT NULL DEFAULT 0,
        rating REAL NOT NULL DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_invoice_id VARCHAR UNIQUE,
        amount INTEGER NOT NULL,
        currency VARCHAR NOT NULL DEFAULT 'usd',
        status VARCHAR NOT NULL DEFAULT 'paid',
        pdf_url VARCHAR,
        hosted_url VARCHAR,
        period_start TIMESTAMP,
        period_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices (user_id, created_at DESC);

      CREATE TABLE IF NOT EXISTS error_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        level VARCHAR NOT NULL DEFAULT 'error',
        message TEXT NOT NULL,
        stack TEXT,
        endpoint VARCHAR,
        method VARCHAR,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Idempotent column additions for tables that may already exist
    const alterations = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'active'`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_ip VARCHAR`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_code VARCHAR`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_expires TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_expires TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret VARCHAR`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false`,
      `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS daily_limit INTEGER NOT NULL DEFAULT 500`,
      `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS requests_today INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_ip VARCHAR`,
      `ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE webhook_endpoints ADD COLUMN IF NOT EXISTS last_triggered_at TIMESTAMP`,
    ];
    for (const sql of alterations) {
      try { await pool.query(sql); } catch { /* already exists */ }
    }

  } catch (err) {
    console.warn("ensureAuthTables warning:", err instanceof Error ? err.message : err);
  }
}

// ── User queries ──────────────────────────────────────────────────────────────
export async function getUserByEmail(email: string) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
  return rows[0] ?? null;
}

export async function getUserById(id: string) {
  const { rows } = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return rows[0] ?? null;
}

export async function createUser(data: {
  email: string;
  password_hash?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  role?: string;
  profile_image_url?: string;
  email_verified?: boolean;
}) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, username, role, profile_image_url, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.email.toLowerCase(),
      data.password_hash ?? null,
      data.first_name ?? null,
      data.last_name ?? null,
      data.username ?? null,
      data.role ?? "user",
      data.profile_image_url ?? null,
      data.email_verified ?? false,
    ],
  );
  return rows[0];
}

export async function updateUserTokens(userId: string, tokensUsed: number) {
  await pool.query(
    "UPDATE users SET tokens_used = tokens_used + $1, updated_at = NOW() WHERE id = $2",
    [tokensUsed, userId],
  );
}

export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  body: string;
  notifData?: Record<string, unknown>;
}) {
  const { rows } = await pool.query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [data.userId, data.type, data.title, data.body, JSON.stringify(data.notifData ?? {})],
  );
  return rows[0];
}

// ── Security event logging ────────────────────────────────────────────────────
export async function logSecurityEvent(data: {
  userId?: string;
  email?: string;
  eventType: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await pool.query(
      `INSERT INTO security_events (user_id, email, event_type, success, ip_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        data.userId ?? null,
        data.email ?? null,
        data.eventType,
        data.success,
        data.ipAddress ?? null,
        data.userAgent ?? null,
        JSON.stringify(data.details ?? {}),
      ],
    );
  } catch { /* non-fatal */ }
}

// ── Session management ────────────────────────────────────────────────────────
export async function createUserSession(data: {
  userId: string;
  sessionToken: string;
  deviceName?: string;
  deviceType?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  expiresAt: Date;
}) {
  try {
    await pool.query(
      `INSERT INTO user_sessions (user_id, session_token, device_name, device_type, browser, os, ip_address, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (session_token) DO UPDATE SET last_active_at = NOW()`,
      [
        data.userId, data.sessionToken,
        data.deviceName ?? "Unknown Device", data.deviceType ?? "browser",
        data.browser ?? "Unknown", data.os ?? "Unknown",
        data.ipAddress ?? null, data.expiresAt,
      ],
    );
  } catch { /* non-fatal */ }
}

export async function revokeUserSession(sessionId: string, userId: string) {
  await pool.query("DELETE FROM user_sessions WHERE id = $1 AND user_id = $2", [sessionId, userId]);
}

export async function revokeAllUserSessions(userId: string, exceptToken?: string) {
  if (exceptToken) {
    await pool.query(
      "DELETE FROM user_sessions WHERE user_id = $1 AND session_token != $2",
      [userId, exceptToken],
    );
  } else {
    await pool.query("DELETE FROM user_sessions WHERE user_id = $1", [userId]);
  }
}

export async function getUserSessions(userId: string) {
  const { rows } = await pool.query(
    `SELECT id, device_name, device_type, browser, os, ip_address, location,
            last_active_at, expires_at, created_at
     FROM user_sessions WHERE user_id = $1 AND expires_at > NOW()
     ORDER BY last_active_at DESC`,
    [userId],
  );
  return rows;
}
