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

export const knowledgeBases = pgTable(
  "knowledge_bases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    teamId: uuid("team_id"),
    name: text("name").notNull(),
    description: text("description"),
    embeddingModel: text("embedding_model").notNull().default("text-embedding-3-small"),
    vectorDimension: integer("vector_dimension").notNull().default(1536),
    documentCount: integer("document_count").default(0).notNull(),
    chunkCount: integer("chunk_count").default(0).notNull(),
    isPublic: boolean("is_public").default(false).notNull(),
    settings: jsonb("settings").default({}),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("kb_user_id_idx").on(t.userId),
    index("kb_team_id_idx").on(t.teamId),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    knowledgeBaseId: uuid("knowledge_base_id").notNull().references(() => knowledgeBases.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    content: text("content"),
    sourceUrl: text("source_url"),
    sourceType: text("source_type").default("upload"),
    // upload | url | paste | github | notion | confluence
    mimeType: text("mime_type"),
    fileSize: integer("file_size"),
    chunkCount: integer("chunk_count").default(0).notNull(),
    status: text("status").notNull().default("processing"),
    // processing | ready | failed | archived
    errorMessage: text("error_message"),
    metadata: jsonb("metadata").default({}),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("docs_kb_id_idx").on(t.knowledgeBaseId),
    index("docs_user_id_idx").on(t.userId),
    index("docs_status_idx").on(t.status),
    index("docs_source_type_idx").on(t.sourceType),
  ],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    knowledgeBaseId: uuid("knowledge_base_id").notNull().references(() => knowledgeBases.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    tokenCount: integer("token_count"),
    // NOTE: embedding vector stored in pgvector as text for portability
    // In production use vector(1536) with pgvector extension
    embeddingVector: text("embedding_vector"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("chunks_document_id_idx").on(t.documentId),
    index("chunks_kb_id_idx").on(t.knowledgeBaseId),
    index("chunks_chunk_index_idx").on(t.chunkIndex),
  ],
);

export const insertKnowledgeBaseSchema = createInsertSchema(knowledgeBases).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentSchema = createInsertSchema(documents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDocumentChunkSchema = createInsertSchema(documentChunks).omit({ id: true, createdAt: true });
export const selectKnowledgeBaseSchema = createSelectSchema(knowledgeBases);
export const selectDocumentSchema = createSelectSchema(documents);

export type KnowledgeBase = typeof knowledgeBases.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type DocumentChunk = typeof documentChunks.$inferSelect;
export type InsertKnowledgeBase = z.infer<typeof insertKnowledgeBaseSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertDocumentChunk = z.infer<typeof insertDocumentChunkSchema>;
