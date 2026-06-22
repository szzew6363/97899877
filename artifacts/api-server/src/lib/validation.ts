/**
 * Input Validation & Sanitization Layer
 * ────────────────────────────────────────
 * All user input passes through here before any processing.
 * Uses Zod for schema validation.
 * Sanitizes strings before rendering to prevent XSS.
 * Error messages never reveal internal structure.
 */

import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

// ── Sanitization helpers ──────────────────────────────────────────────────────

/** Strip HTML tags and dangerous characters from user-supplied strings */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/\\/g, "&#x5C;")
    .replace(/`/g, "&#x60;");
}

/** Remove null bytes and control characters */
export function sanitizeInput(input: string): string {
  return input
    .replace(/\0/g, "")                    // null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")  // control chars
    .trim();
}

/** Safe error response — never expose internals */
export function safeError(res: Response, status: number, message: string): void {
  res.status(status).json({ error: message });
}

// ── Common reusable schemas ───────────────────────────────────────────────────

export const emailSchema = z
  .string({ required_error: "Email is required" })
  .email("Invalid email address")
  .max(254, "Email too long")
  .toLowerCase()
  .transform(sanitizeInput);

export const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .refine((p) => /[A-Z]/.test(p), "Password must contain an uppercase letter")
  .refine((p) => /[0-9]/.test(p), "Password must contain a number")
  .refine((p) => /[^A-Za-z0-9]/.test(p), "Password must contain a special character");

export const uuidSchema = z
  .string()
  .uuid("Invalid ID format");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["asc", "desc"]).default("desc"),
});

export const safeTextSchema = (maxLen = 10000) =>
  z.string().max(maxLen, `Text too long (max ${maxLen} chars)`).transform(sanitizeInput);

// ── Auth schemas ──────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: "Password is required" }).min(1).max(128),
  totp: z.string().regex(/^\d{6}$/).optional(),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username too long")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, _ and -")
    .optional(),
  displayName: z.string().max(50).transform(sanitizeInput).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, "Invalid refresh token"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: passwordSchema,
});

// ── Chat / AI schemas ─────────────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string().min(1).max(100000, "Message too long"),
});

export const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(500),
  model: z.string().max(100).optional(),
  mode: z.string().max(50).optional(),
  persona: z.string().max(50).optional(),
  stream: z.boolean().optional().default(true),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(200000).optional(),
  systemPrompt: z.string().max(50000).optional(),
  conversationId: uuidSchema.optional(),
  apiKey: z.string().max(200).optional(),
  apiBaseURL: z.string().url().max(500).optional(),
});

// ── API Key schemas ───────────────────────────────────────────────────────────

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100).transform(sanitizeInput),
  description: z.string().max(500).transform(sanitizeInput).optional(),
  scopes: z.array(z.string().max(50)).max(20).optional(),
  expiresAt: z.string().datetime().optional(),
  rateLimitPerMinute: z.number().int().min(1).max(10000).optional(),
  allowedIps: z.array(z.string().ip()).max(50).optional(),
});

// ── Webhook schemas ───────────────────────────────────────────────────────────

export const createWebhookSchema = z.object({
  name: z.string().min(1).max(100).transform(sanitizeInput),
  url: z.string().url("Invalid webhook URL").max(2048),
  events: z.array(z.string().max(50)).min(1).max(50),
  headers: z.record(z.string(), z.string().max(200)).optional(),
});

// ── Middleware factory ────────────────────────────────────────────────────────

/**
 * Creates a validation middleware for request body.
 * On failure: returns 400 with generic messages (no internal info).
 */
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      res.status(400).json({ error: "Validation failed", issues });
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Creates a validation middleware for query params.
 */
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({ error: "Invalid query parameters" });
      return;
    }
    (req as Request & { validatedQuery: T }).validatedQuery = result.data;
    next();
  };
}

/**
 * Creates a validation middleware for URL params.
 */
export function validateParams<T>(schema: z.ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ error: "Invalid request parameters" });
      return;
    }
    next();
  };
}
