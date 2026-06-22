import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { getUserById } from "../db";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  subscription: string;
  tokens_used: number;
  tokens_limit: number;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "mr7-ai-jwt-dev-secret-change-in-prod";

export function signJwt(payload: Record<string, unknown>, expiresIn: string = "15m") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyJwt(token: string): Record<string, unknown> | null {
  try {
    return jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Middleware: verify JWT Bearer token and attach authUser to request */
export async function jwtAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers["x-api-key"] as string | undefined;

  // Support API key auth
  if (apiKey) {
    try {
      const { pool } = await import("../db");
      const crypto = await import("crypto");
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
      const { rows } = await pool.query(
        `SELECT ak.*, u.id as uid, u.email, u.role, u.subscription, u.tokens_used, u.tokens_limit
         FROM api_keys ak JOIN users u ON ak.user_id = u.id
         WHERE ak.key_hash = $1 AND ak.is_active = true
           AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
        [keyHash],
      );
      if (rows[0]) {
        await pool.query("UPDATE api_keys SET last_used_at = NOW() WHERE id = $1", [rows[0].id]);
        req.authUser = {
          id: rows[0].uid,
          email: rows[0].email,
          role: rows[0].role,
          subscription: rows[0].subscription,
          tokens_used: rows[0].tokens_used,
          tokens_limit: rows[0].tokens_limit,
        };
        next();
        return;
      }
    } catch {
      // fall through
    }
  }

  if (!authHeader?.startsWith("Bearer ")) {
    // Allow unauthenticated for non-critical routes — next layer decides
    next();
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyJwt(token);

  if (!payload || typeof payload["sub"] !== "string") {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    const user = await getUserById(payload["sub"] as string);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    req.authUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      subscription: user.subscription,
      tokens_used: user.tokens_used,
      tokens_limit: user.tokens_limit,
    };
    next();
  } catch {
    res.status(500).json({ error: "Auth error" });
  }
}

/** Middleware: require authenticated user */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

/** Middleware: require admin role */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser || req.authUser.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

/** Middleware: check token quota */
export function checkTokenQuota(req: Request, res: Response, next: NextFunction): void {
  const user = req.authUser;
  if (!user) { next(); return; }
  if (user.tokens_used >= user.tokens_limit) {
    res.status(429).json({ error: "Token quota exceeded. Please upgrade your plan." });
    return;
  }
  next();
}
