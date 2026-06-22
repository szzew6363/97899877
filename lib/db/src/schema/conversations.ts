import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New Conversation"),
    summary: text("summary"),
    model: text("model").notNull().default("gpt-4o"),
    persona: text("persona"),
    mode: text("mode").default("standard"),
    systemPrompt: text("system_prompt"),
    messageCount: integer("message_count").default(0).notNull(),
    totalTokens: integer("total_tokens").default(0).notNull(),
    totalPromptTokens: integer("total_prompt_tokens").default(0).notNull(),
    totalCompletionTokens: integer("total_completion_tokens").default(0).notNull(),
    avgResponseMs: integer("avg_response_ms").default(0),
    isShared: boolean("is_shared").default(false).notNull(),
    shareToken: text("share_token"),
    teamId: uuid("team_id"),
    tags: jsonb("tags").default([]),
    isPinned: boolean("is_pinned").default(false).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    contextWindowTokens: integer("context_window_tokens"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  },
  (t) => [
    index("conv_user_id_idx").on(t.userId),
    index("conv_model_idx").on(t.model),
    index("conv_mode_idx").on(t.mode),
    index("conv_team_id_idx").on(t.teamId),
    index("conv_created_at_idx").on(t.createdAt),
    index("conv_last_message_idx").on(t.lastMessageAt),
    index("conv_share_token_idx").on(t.shareToken),
  ],
);

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const selectConversationSchema = createSelectSchema(conversations);
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
