import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id"),

    name: text("name").notNull(),
    description: text("description"),

    // The key itself (hashed in DB, prefix shown to user)
    keyHash: text("key_hash").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    // e.g. "mr7_sk_live_abc..."  — first 12 chars shown to user

    // Permissions
    scopes: jsonb("scopes").notNull().default(["chat:read", "chat:write"]),
    // chat:read | chat:write | agents:run | reports:read | reports:write
    // admin:read | admin:write | billing:read | webhooks:manage

    // Rate limits
    rateLimitPerMinute: integer("rate_limit_per_minute").default(60),
    rateLimitPerDay: integer("rate_limit_per_day").default(10000),

    // Restrictions
    allowedIps: jsonb("allowed_ips").default([]),
    // empty = all IPs allowed
    allowedOrigins: jsonb("allowed_origins").default([]),

    // Status
    isActive: boolean("is_active").default(true).notNull(),
    isRevoked: boolean("is_revoked").default(false).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedBy: uuid("revoked_by"),
    revokeReason: text("revoke_reason"),

    // Usage tracking
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    lastUsedIp: text("last_used_ip"),
    usageCount: integer("usage_count").default(0).notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("api_keys_hash_idx").on(t.keyHash),
    uniqueIndex("api_keys_prefix_idx").on(t.keyPrefix),
    index("api_keys_user_id_idx").on(t.userId),
    index("api_keys_team_id_idx").on(t.teamId),
    index("api_keys_is_active_idx").on(t.isActive),
    index("api_keys_last_used_idx").on(t.lastUsedAt),
  ],
);

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({ id: true, createdAt: true, updatedAt: true });
export const selectApiKeySchema = createSelectSchema(apiKeys);
export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
