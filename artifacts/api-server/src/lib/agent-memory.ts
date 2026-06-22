import { pool } from "../db";

// ── Short-term memory (per-task, in-process) ──────────────────────────────────
export type ShortTermEntry = { key: string; value: string; timestamp: number };

export class ShortTermMemory {
  private store = new Map<string, string>();
  private log: ShortTermEntry[] = [];

  set(key: string, value: string) {
    this.store.set(key, value);
    this.log.push({ key, value, timestamp: Date.now() });
  }

  get(key: string): string | undefined {
    return this.store.get(key);
  }

  getAll(): ShortTermEntry[] {
    return this.log;
  }

  getSummary(): string {
    if (this.store.size === 0) return "(empty)";
    return Array.from(this.store.entries())
      .slice(-8)
      .map(([k, v]) => `${k}: ${v.slice(0, 300)}`)
      .join("\n");
  }
}

// ── Long-term memory + task history (PostgreSQL) ──────────────────────────────
export async function ensureMemoryTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_knowledge (
      id SERIAL PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      content TEXT NOT NULL,
      tags TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      last_accessed TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id SERIAL PRIMARY KEY,
      task_id TEXT UNIQUE NOT NULL,
      goal TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      plan_json JSONB,
      steps_json JSONB DEFAULT '[]',
      result TEXT,
      audit_log JSONB DEFAULT '[]',
      started_at TIMESTAMPTZ DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      duration_ms INTEGER
    )
  `);
}

export async function ltmStore(key: string, content: string, tags: string[] = []): Promise<void> {
  await pool.query(
    `INSERT INTO agent_knowledge (key, content, tags)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET content = $2, tags = $3, last_accessed = NOW()`,
    [key, content, tags]
  );
}

export async function ltmRecall(query: string, limit = 5): Promise<Array<{ key: string; content: string }>> {
  try {
    const result = await pool.query(
      `SELECT key, content FROM agent_knowledge
       WHERE content ILIKE $1 OR key ILIKE $1
       ORDER BY last_accessed DESC LIMIT $2`,
      [`%${query.slice(0, 100)}%`, limit]
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function ltmGet(key: string): Promise<string | null> {
  try {
    const result = await pool.query(
      "UPDATE agent_knowledge SET last_accessed = NOW() WHERE key = $1 RETURNING content",
      [key]
    );
    return (result.rows[0] as { content: string } | undefined)?.content ?? null;
  } catch {
    return null;
  }
}

// ── Task persistence ───────────────────────────────────────────────────────────
export async function createTaskRecord(taskId: string, goal: string): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO agent_tasks (task_id, goal, status) VALUES ($1, $2, 'running')
       ON CONFLICT (task_id) DO NOTHING`,
      [taskId, goal]
    );
  } catch { /* ignore */ }
}

export type TaskUpdate = {
  status?: string;
  planJson?: unknown;
  stepsJson?: unknown;
  result?: string;
  auditLog?: unknown;
  completedAt?: boolean;
  durationMs?: number;
};

export async function updateTaskRecord(taskId: string, update: TaskUpdate): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (update.status !== undefined)    { sets.push(`status = $${idx++}`);     values.push(update.status); }
  if (update.planJson !== undefined)  { sets.push(`plan_json = $${idx++}`);  values.push(JSON.stringify(update.planJson)); }
  if (update.stepsJson !== undefined) { sets.push(`steps_json = $${idx++}`); values.push(JSON.stringify(update.stepsJson)); }
  if (update.result !== undefined)    { sets.push(`result = $${idx++}`);     values.push(update.result); }
  if (update.auditLog !== undefined)  { sets.push(`audit_log = $${idx++}`);  values.push(JSON.stringify(update.auditLog)); }
  if (update.completedAt)             { sets.push(`completed_at = NOW()`); }
  if (update.durationMs !== undefined){ sets.push(`duration_ms = $${idx++}`);values.push(update.durationMs); }

  if (sets.length === 0) return;
  values.push(taskId);
  try {
    await pool.query(`UPDATE agent_tasks SET ${sets.join(", ")} WHERE task_id = $${idx}`, values);
  } catch { /* ignore */ }
}

export async function getTaskHistory(limit = 30): Promise<unknown[]> {
  try {
    const result = await pool.query(
      `SELECT task_id, goal, status, plan_json, steps_json, result, audit_log,
              started_at, completed_at, duration_ms
       FROM agent_tasks ORDER BY started_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows;
  } catch {
    return [];
  }
}

export async function getTaskById(taskId: string): Promise<unknown | null> {
  try {
    const result = await pool.query("SELECT * FROM agent_tasks WHERE task_id = $1", [taskId]);
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}
