/**
 * JWT Authentication Middleware (RSA-signed)
 * ────────────────────────────────────────────
 * All JWTs are now signed with RSA-2048 (RS256).
 * Refresh tokens: hashed in DB, revoked on first use, replaced with new token (rotation).
 * API keys: looked up by SHA-256 hash of the raw key.
 */

import type { Request, Response, NextFunction } from "express";
import { getUserById } from "../db.js";
import { verifyJwtRsa, signAccessToken, signRefreshToken } from "../lib/crypto.js";
import { pool } from "../db.js";
import crypto from "crypto";

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

// Re-export crypto sign helpers under the old names for backward-compat
export { verifyJwtRsa as verifyJwt };
export { signAccessToken, signRefreshToken };

/**
 * Backward-compatible signJwt — accepts (payload, expiresIn?) like the old symmetric version.
 * Now signs with RSA-2048 instead of symmetric secret.
 */
export function signJwt(payload: Record<string, unknown>, expiresIn?: string): string {
  const { sub, email, role, tier, ...rest } = payload;
  return signAccessToken({
    sub: String(sub ?? ""),
    email: String(email ?? ""),
    role: String(role ?? "user"),
    tier: String(tier ?? "free"),
    ...rest,
  } as Parameters<typeof signAccessToken>[0]);
}

/** Middleware: verify JWT Bearer token (RSA) and attach authUser */
export async function jwtAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers["x-api-key"] as string | undefined;

  // ── API key auth ──────────────────────────────────────────────────────────
  if (apiKey) {
    try {
      const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
      const { rows } = await pool.query(
        `SELECT ak.*, u.id as uid, u.email, u.role, u.subscription, u.tokens_used, u.tokens_limit
         FROM api_keys ak JOIN users u ON ak.user_id = u.id
         WHERE ak.key_hash = $1 AND ak.is_active = true
           AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
        [keyHash],
      );
      if (rows[0]) {
        // Check IP allowlist if set
        const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress;
        const allowedIps: string[] | null = rows[0].allowed_ips ?? null;
        if (allowedIps && allowedIps.length > 0 && ip && !allowedIps.includes(ip)) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }

        await pool.query(
          "UPDATE api_keys SET last_used_at = NOW(), last_used_ip = $2 WHERE id = $1",
          [rows[0].id, ip ?? null],
        );
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
      // fall through to JWT check
    }
  }

  if (!authHeader?.startsWith("Bearer ")) {
    next();
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyJwtRsa(token);

  if (!payload || payload.type !== "access") {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  try {
    const user = await getUserById(payload.sub);
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

/** Require authenticated user */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

/** Require admin role */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.authUser || req.authUser.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

/** Check token quota */
export function checkTokenQuota(req: Request, res: Response, next: NextFunction): void {
  const user = req.authUser;
  if (!user) { next(); return; }
  if (user.tokens_used >= user.tokens_limit) {
    res.status(429).json({ error: "Token quota exceeded. Please upgrade your plan." });
    return;
  }
  next();
}
