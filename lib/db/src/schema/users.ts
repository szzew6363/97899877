import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    emailVerified: boolean("email_verified").default(false).notNull(),
    username: text("username"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    passwordHash: text("password_hash"),

    // Identity providers
    replitUserId: text("replit_user_id"),
    googleId: text("google_id"),
    githubId: text("github_id"),

    // Subscription tier
    tier: text("tier").notNull().default("free"), // free | starter | professional | elite

    // Profile & preferences
    bio: text("bio"),
    timezone: text("timezone").default("UTC"),
    locale: text("locale").default("en"),
    theme: text("theme").default("dark"),
    preferences: jsonb("preferences").default({}),

    // Device & session metadata
    lastSeenIp: text("last_seen_ip"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    lastUserAgent: text("last_user_agent"),
    devices: jsonb("devices").default([]),

    // Security
    twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
    twoFactorSecret: text("two_factor_secret"),
    backupCodes: jsonb("backup_codes").default([]),
    loginAttempts: integer("login_attempts").default(0).notNull(),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),

    // Status
    isActive: boolean("is_active").default(true).notNull(),
    isBanned: boolean("is_banned").default(false).notNull(),
    banReason: text("ban_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_username_idx").on(t.username),
    uniqueIndex("users_replit_id_idx").on(t.replitUserId),
    index("users_tier_idx").on(t.tier),
    index("users_created_at_idx").on(t.createdAt),
  ],
);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
});
export const selectUserSchema = createSelectSchema(users);
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
