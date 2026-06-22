import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  boolean,
  index,
  numeric,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    // Agent identity
    agentType: text("agent_type").notNull(),
    // jarvis | parseltongue | agent-os | council | fusion | pentest | ...
    agentName: text("agent_name").notNull(),
    agentVersion: text("agent_version"),

    // Execution
    status: text("status").notNull().default("pending"),
    // pending | running | completed | failed | canceled | timeout

    // Input / Output
    input: jsonb("input").default({}),
    output: jsonb("output").default({}),
    steps: jsonb("steps").default([]),
    // [{ stepId, name, status, startedAt, endedAt, output, error }]

    // Timing
    startedAt: timestamp("started_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    durationMs: integer("duration_ms"),

    // Resources
    tokensUsed: integer("tokens_used").default(0),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),
    toolCallsCount: integer("tool_calls_count").default(0),

    // Error info
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    retryCount: integer("retry_count").default(0),

    // Context
    conversationId: uuid("conversation_id"),
    teamId: uuid("team_id"),
    projectId: uuid("project_id"),

    // Config snapshot
    config: jsonb("config").default({}),
    tags: jsonb("tags").default([]),
    isFavorite: boolean("is_favorite").default(false).notNull(),

    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("agent_user_id_idx").on(t.userId),
    index("agent_type_idx").on(t.agentType),
    index("agent_status_idx").on(t.status),
    index("agent_created_at_idx").on(t.createdAt),
    index("agent_conv_id_idx").on(t.conversationId),
  ],
);

export const insertAgentRunSchema = createInsertSchema(agentRuns).omit({ id: true, createdAt: true });
export const selectAgentRunSchema = createSelectSchema(agentRuns);
export type AgentRun = typeof agentRuns.$inferSelect;
export type InsertAgentRun = z.infer<typeof insertAgentRunSchema>;
