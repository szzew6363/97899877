import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const webhooks = pgTable(
  "webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id"),

    name: text("name").notNull(),
    description: text("description"),
    url: text("url").notNull(),
    secretHash: text("secret_hash"),
    // HMAC-SHA256 signature secret (stored hashed)

    // Events to listen to
    events: jsonb("events").notNull().default([]),
    // agent.completed | agent.failed | report.ready | alert.security
    // subscription.changed | usage.threshold | chat.shared | ...

    // Status
    isActive: boolean("is_active").default(true).notNull(),
    isPaused: boolean("is_paused").default(false).notNull(),

    // Retry config
    maxRetries: integer("max_retries").default(3).notNull(),
    retryDelayMs: integer("retry_delay_ms").default(5000).notNull(),
    timeoutMs: integer("timeout_ms").default(30000).notNull(),

    // Stats
    successCount: integer("success_count").default(0).notNull(),
    failureCount: integer("failure_count").default(0).notNull(),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
    lastSuccessAt: timestamp("last_success_at", { withTimezone: true }),
    lastFailureAt: timestamp("last_failure_at", { withTimezone: true }),

    // Headers to send
    headers: jsonb("headers").default({}),
    metadata: jsonb("metadata").default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("webhooks_user_id_idx").on(t.userId),
    index("webhooks_team_id_idx").on(t.teamId),
    index("webhooks_is_active_idx").on(t.isActive),
  ],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    webhookId: uuid("webhook_id").notNull().references(() => webhooks.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(),
    eventId: uuid("event_id").defaultRandom(),

    // Request
    requestUrl: text("request_url").notNull(),
    requestHeaders: jsonb("request_headers").default({}),
    requestBody: jsonb("request_body").default({}),

    // Response
    responseStatusCode: integer("response_status_code"),
    responseHeaders: jsonb("response_headers").default({}),
    responseBody: text("response_body"),
    latencyMs: integer("latency_ms"),

    // Delivery status
    status: text("status").notNull().default("pending"),
    // pending | success | failed | retrying

    attemptNumber: integer("attempt_number").default(1).notNull(),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    errorMessage: text("error_message"),

    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("wh_deliveries_webhook_id_idx").on(t.webhookId),
    index("wh_deliveries_status_idx").on(t.status),
    index("wh_deliveries_event_type_idx").on(t.eventType),
    index("wh_deliveries_created_at_idx").on(t.createdAt),
    index("wh_deliveries_next_retry_idx").on(t.nextRetryAt),
  ],
);

export const insertWebhookSchema = createInsertSchema(webhooks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertWebhookDeliverySchema = createInsertSchema(webhookDeliveries).omit({ id: true, createdAt: true });
export const selectWebhookSchema = createSelectSchema(webhooks);
export const selectWebhookDeliverySchema = createSelectSchema(webhookDeliveries);

export type Webhook = typeof webhooks.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type InsertWebhookDelivery = z.infer<typeof insertWebhookDeliverySchema>;
