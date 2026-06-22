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

export const apiUsage = pgTable(
  "api_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    // Request metadata
    endpoint: text("endpoint").notNull(),
    method: text("method").notNull().default("POST"),
    provider: text("provider"),
    // openai | anthropic | ollama | groq | internal

    model: text("model"),

    // Response info
    statusCode: integer("status_code").notNull(),
    latencyMs: integer("latency_ms"),
    isSuccess: boolean("is_success").notNull().default(true),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),

    // Token usage
    promptTokens: integer("prompt_tokens").default(0),
    completionTokens: integer("completion_tokens").default(0),
    totalTokens: integer("total_tokens").default(0),

    // Cost
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }),

    // Request context
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    apiKeyId: uuid("api_key_id"),
    conversationId: uuid("conversation_id"),
    agentRunId: uuid("agent_run_id"),
    sessionId: text("session_id"),

    // Billing period (YYYY-MM)
    billingPeriod: text("billing_period").notNull(),

    requestBody: jsonb("request_body").default({}),
    // Sanitized — no secrets
    metadata: jsonb("metadata").default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("usage_user_id_idx").on(t.userId),
    index("usage_endpoint_idx").on(t.endpoint),
    index("usage_provider_idx").on(t.provider),
    index("usage_model_idx").on(t.model),
    index("usage_created_at_idx").on(t.createdAt),
    index("usage_billing_period_idx").on(t.billingPeriod),
    index("usage_success_idx").on(t.isSuccess),
  ],
);

export const insertApiUsageSchema = createInsertSchema(apiUsage).omit({ id: true, createdAt: true });
export const selectApiUsageSchema = createSelectSchema(apiUsage);
export type ApiUsage = typeof apiUsage.$inferSelect;
export type InsertApiUsage = z.infer<typeof insertApiUsageSchema>;
