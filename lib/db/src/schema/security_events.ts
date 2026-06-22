import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

    // Event classification
    eventType: text("event_type").notNull(),
    // login_success | login_failed | logout | password_change | email_change
    // 2fa_enabled | 2fa_disabled | 2fa_challenge | api_key_created | api_key_revoked
    // suspicious_activity | account_locked | account_unlocked | data_export
    // privilege_escalation | session_hijack_attempt | rate_limit_exceeded
    // admin_action | webhook_created | webhook_deleted | ...

    severity: text("severity").notNull().default("info"),
    // info | low | medium | high | critical

    // Context
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    countryCode: text("country_code"),
    city: text("city"),
    sessionId: text("session_id"),

    // Details
    description: text("description"),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    outcome: text("outcome").notNull().default("success"),
    // success | failure | blocked | detected

    // Flags
    isResolved: boolean("is_resolved").default(false).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by"),
    requiresAction: boolean("requires_action").default(false).notNull(),
    isFalsePositive: boolean("is_false_positive").default(false).notNull(),

    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("sec_user_id_idx").on(t.userId),
    index("sec_event_type_idx").on(t.eventType),
    index("sec_severity_idx").on(t.severity),
    index("sec_created_at_idx").on(t.createdAt),
    index("sec_ip_idx").on(t.ipAddress),
    index("sec_requires_action_idx").on(t.requiresAction),
    index("sec_outcome_idx").on(t.outcome),
  ],
);

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({ id: true, createdAt: true });
export const selectSecurityEventSchema = createSelectSchema(securityEvents);
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;
