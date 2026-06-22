import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const modules = pgTable(
  "modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    longDescription: text("long_description"),
    category: text("category").notNull(),
    // pentest | osint | forensics | crypto | network | web | social | ai | utility

    version: text("version").notNull().default("1.0.0"),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    authorName: text("author_name"),

    // Pricing
    isFree: boolean("is_free").default(true).notNull(),
    priceUsd: numeric("price_usd", { precision: 10, scale: 2 }),
    requiredTier: text("required_tier").default("free"),

    // Assets
    iconUrl: text("icon_url"),
    screenshotUrls: jsonb("screenshot_urls").default([]),
    demoUrl: text("demo_url"),

    // Status
    isPublished: boolean("is_published").default(false).notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),
    isFeatured: boolean("is_featured").default(false).notNull(),
    isDeprecated: boolean("is_deprecated").default(false).notNull(),

    // Stats
    installCount: integer("install_count").default(0).notNull(),
    rating: numeric("rating", { precision: 3, scale: 2 }),
    ratingCount: integer("rating_count").default(0).notNull(),

    // Config schema
    configSchema: jsonb("config_schema").default({}),
    permissions: jsonb("permissions").default([]),
    tags: jsonb("tags").default([]),
    changelog: jsonb("changelog").default([]),
    metadata: jsonb("metadata").default({}),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("modules_slug_idx").on(t.slug),
    index("modules_category_idx").on(t.category),
    index("modules_author_id_idx").on(t.authorId),
    index("modules_is_published_idx").on(t.isPublished),
    index("modules_required_tier_idx").on(t.requiredTier),
    index("modules_install_count_idx").on(t.installCount),
  ],
);

export const userModules = pgTable(
  "user_modules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id").notNull().references(() => modules.id, { onDelete: "cascade" }),
    installedAt: timestamp("installed_at", { withTimezone: true }).defaultNow().notNull(),
    config: jsonb("config").default({}),
    isEnabled: boolean("is_enabled").default(true).notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    rating: integer("rating"),
    review: text("review"),
  },
  (t) => [
    uniqueIndex("user_module_unique_idx").on(t.userId, t.moduleId),
    index("user_modules_user_id_idx").on(t.userId),
    index("user_modules_module_id_idx").on(t.moduleId),
  ],
);

export const insertModuleSchema = createInsertSchema(modules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserModuleSchema = createInsertSchema(userModules).omit({ id: true });
export const selectModuleSchema = createSelectSchema(modules);
export type Module = typeof modules.$inferSelect;
export type UserModule = typeof userModules.$inferSelect;
export type InsertModule = z.infer<typeof insertModuleSchema>;
export type InsertUserModule = z.infer<typeof insertUserModuleSchema>;
