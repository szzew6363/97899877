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

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

    type: text("type").notNull(),
    // system | billing | security | agent_complete | share | mention | upgrade | welcome

    title: text("title").notNull(),
    body: text("body").notNull(),
    icon: text("icon"),
    imageUrl: text("image_url"),

    // Action
    actionUrl: text("action_url"),
    actionLabel: text("action_label"),

    // Status
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    isDismissed: boolean("is_dismissed").default(false).notNull(),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),

    // Delivery
    channels: jsonb("channels").default(["in_app"]),
    // in_app | email | push | sms

    emailSentAt: timestamp("email_sent_at", { withTimezone: true }),
    pushSentAt: timestamp("push_sent_at", { withTimezone: true }),

    // Priority
    priority: text("priority").default("normal"),
    // low | normal | high | urgent

    // Grouping
    groupKey: text("group_key"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),

    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("notif_user_id_idx").on(t.userId),
    index("notif_type_idx").on(t.type),
    index("notif_is_read_idx").on(t.isRead),
    index("notif_created_at_idx").on(t.createdAt),
    index("notif_group_key_idx").on(t.groupKey),
    index("notif_priority_idx").on(t.priority),
  ],
);

export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const selectNotificationSchema = createSelectSchema(notifications);
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
