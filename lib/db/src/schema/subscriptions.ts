import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  integer,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),

    // Plan info
    plan: text("plan").notNull(), // free | starter | professional | elite
    billingCycle: text("billing_cycle").notNull().default("monthly"), // monthly | yearly
    priceUsd: numeric("price_usd", { precision: 10, scale: 2 }),

    // Status
    status: text("status").notNull().default("active"),
    // active | trialing | past_due | canceled | unpaid | paused

    // Dates
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    canceledAt: timestamp("canceled_at", { withTimezone: true }),
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),

    // Payment provider
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripePriceId: text("stripe_price_id"),
    stripeProductId: text("stripe_product_id"),

    // Limits & quotas
    limits: jsonb("limits").default({}),
    // { messagesPerDay: 100, agentRuns: 10, apiKeys: 5, ... }

    // Usage counters (reset monthly)
    usageResetAt: timestamp("usage_reset_at", { withTimezone: true }),
    messagesUsed: integer("messages_used").default(0).notNull(),
    agentRunsUsed: integer("agent_runs_used").default(0).notNull(),
    tokensUsed: integer("tokens_used").default(0).notNull(),

    // Metadata
    metadata: jsonb("metadata").default({}),
    cancelReason: text("cancel_reason"),
    isAutoRenew: boolean("is_auto_renew").default(true).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("subs_user_id_idx").on(t.userId),
    index("subs_status_idx").on(t.status),
    index("subs_plan_idx").on(t.plan),
    index("subs_stripe_customer_idx").on(t.stripeCustomerId),
    index("subs_ends_at_idx").on(t.endsAt),
  ],
);

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectSubscriptionSchema = createSelectSchema(subscriptions);
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
