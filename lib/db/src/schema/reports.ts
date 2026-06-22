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

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    teamId: uuid("team_id"),
    agentRunId: uuid("agent_run_id"),

    title: text("title").notNull(),
    description: text("description"),
    reportType: text("report_type").notNull(),
    // pentest | vulnerability | osint | forensics | compliance | summary | custom

    status: text("status").notNull().default("generating"),
    // generating | ready | failed | archived

    // Content
    content: jsonb("content").default({}),
    findings: jsonb("findings").default([]),
    recommendations: jsonb("recommendations").default([]),
    executiveSummary: text("executive_summary"),

    // Risk assessment
    riskLevel: text("risk_level"),
    // critical | high | medium | low | info
    cvssScore: text("cvss_score"),

    // Files
    pdfUrl: text("pdf_url"),
    htmlUrl: text("html_url"),
    jsonUrl: text("json_url"),
    fileSize: integer("file_size"),

    // Access control
    isPublic: boolean("is_public").default(false).notNull(),
    shareToken: text("share_token"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    downloadCount: integer("download_count").default(0).notNull(),

    // Target
    targetScope: jsonb("target_scope").default([]),
    // IPs, domains, URLs scanned

    tags: jsonb("tags").default([]),
    metadata: jsonb("metadata").default({}),

    generatedAt: timestamp("generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("reports_user_id_idx").on(t.userId),
    index("reports_team_id_idx").on(t.teamId),
    index("reports_type_idx").on(t.reportType),
    index("reports_status_idx").on(t.status),
    index("reports_risk_level_idx").on(t.riskLevel),
    index("reports_created_at_idx").on(t.createdAt),
    index("reports_share_token_idx").on(t.shareToken),
  ],
);

export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true, updatedAt: true });
export const selectReportSchema = createSelectSchema(reports);
export type Report = typeof reports.$inferSelect;
export type InsertReport = z.infer<typeof insertReportSchema>;
