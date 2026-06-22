import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 10,
});

export async function ensureAuthTables() {
  try {
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
        first_name VARCHAR,
        last_name VARCHAR,
        profile_image_url VARCHAR,
        role VARCHAR NOT NULL DEFAULT 'user',
        subscription VARCHAR NOT NULL DEFAULT 'free',
        subscription_expires_at TIMESTAMP,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        tokens_limit INTEGER NOT NULL DEFAULT 50000,
        stripe_customer_id VARCHAR,
        stripe_subscription_id VARCHAR,
        refresh_token VARCHAR,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key_hash VARCHAR NOT NULL UNIQUE,
        key_prefix VARCHAR NOT NULL,
        name VARCHAR NOT NULL DEFAULT 'Default Key',
        permissions JSONB NOT NULL DEFAULT '["chat","osint"]',
        rate_limit_per_min INTEGER NOT NULL DEFAULT 20,
        last_used_at TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      );

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
    `);
  } catch (err) {
    console.warn("ensureAuthTables warning:", err instanceof Error ? err.message : err);
  }
}

export async function getUserByEmail(email: string) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
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
  role?: string;
}) {
  const { rows } = await pool.query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.email, data.password_hash ?? null, data.first_name ?? null, data.last_name ?? null, data.role ?? "user"],
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
