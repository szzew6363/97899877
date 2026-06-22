/**
 * Security Crypto Layer
 * ─────────────────────
 * AES-256-GCM  → encrypt/decrypt sensitive values (API keys, secrets)
 * RSA-2048     → sign/verify JWTs (asymmetric — private key signs, public verifies)
 * bcrypt-12    → hash passwords
 * HMAC-SHA256  → webhook signatures
 *
 * NEVER log or expose the raw encryption key or private key.
 */

import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { logger } from "./logger.js";

// ── Encryption key from env (32-byte hex string → 16 bytes hex = 32 chars) ──
const AES_KEY_HEX = process.env.AES_ENCRYPTION_KEY;
const AES_ALGORITHM = "aes-256-gcm";

function getAesKey(): Buffer {
  if (!AES_KEY_HEX || AES_KEY_HEX.length < 64) {
    // In dev, derive from a static seed — UNSAFE for production
    if (process.env.NODE_ENV === "production") {
      throw new Error("[security] AES_ENCRYPTION_KEY must be set in production (64-char hex string).");
    }
    logger.warn("[security] AES_ENCRYPTION_KEY not set — using insecure dev key. Set this in production!");
    return crypto.scryptSync("mr7-ai-dev-secret-DO-NOT-USE-IN-PROD", "salt", 32);
  }
  return Buffer.from(AES_KEY_HEX.slice(0, 64), "hex");
}

/**
 * Encrypt a string value with AES-256-GCM.
 * Returns: "iv:authTag:ciphertext" (all hex-encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getAesKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(AES_ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a value encrypted by encrypt().
 * Throws on tamper/invalid data.
 */
export function decrypt(ciphertext: string): string {
  const key = getAesKey();
  const [ivHex, authTagHex, dataHex] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !dataHex) throw new Error("Invalid ciphertext format");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const decipher = crypto.createDecipheriv(AES_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Hash a sensitive value with SHA-256 (for lookups like API key hash) */
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Generate a cryptographically secure random token */
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

/** HMAC-SHA256 for webhook signatures */
export function hmacSign(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/** Verify HMAC-SHA256 signature (constant-time comparison) */
export function hmacVerify(payload: string, secret: string, signature: string): boolean {
  const expected = hmacSign(payload, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

// ── BCrypt (cost factor 12) ───────────────────────────────────────────────────
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── RSA Key Pair for JWTs ─────────────────────────────────────────────────────
// Keys must be provided as env vars (PEM format).
// Generate with: openssl genrsa -out private.pem 2048 && openssl rsa -in private.pem -pubout -out public.pem
let _privateKey: string | null = null;
let _publicKey: string | null = null;

function getRsaPrivateKey(): string {
  if (_privateKey) return _privateKey;
  const key = process.env.JWT_PRIVATE_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[security] JWT_PRIVATE_KEY must be set in production.");
    }
    // Dev fallback: generate ephemeral keypair (rotates on restart — dev only)
    logger.warn("[security] JWT_PRIVATE_KEY not set — generating ephemeral RSA keypair for dev. DO NOT use in production!");
    const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });
    _privateKey = privateKey;
    _publicKey = publicKey;
    return _privateKey;
  }
  // Unescape \n from env var
  _privateKey = key.replace(/\\n/g, "\n");
  return _privateKey;
}

function getRsaPublicKey(): string {
  if (_publicKey) return _publicKey;
  const key = process.env.JWT_PUBLIC_KEY;
  if (!key) {
    // Dev: trigger private key generation which also sets _publicKey
    getRsaPrivateKey();
    return _publicKey!;
  }
  _publicKey = key.replace(/\\n/g, "\n");
  return _publicKey;
}

export interface JwtPayload {
  sub: string;         // user id
  email: string;
  role: string;
  tier?: string;
  type: "access" | "refresh";
  jti: string;         // unique token ID (for revocation)
  iat?: number;
  exp?: number;
}

/** Sign a JWT with RSA-2048 (RS256 algorithm) */
export function signJwtRsa(payload: Omit<JwtPayload, "jti" | "iat">, expiresIn: string = "1h"): string {
  const privateKey = getRsaPrivateKey();
  return jwt.sign(
    { ...payload, jti: generateToken(16) },
    privateKey,
    { algorithm: "RS256", expiresIn } as jwt.SignOptions,
  );
}

/** Verify a JWT signed with RSA-2048 */
export function verifyJwtRsa(token: string): JwtPayload | null {
  try {
    const publicKey = getRsaPublicKey();
    return jwt.verify(token, publicKey, { algorithms: ["RS256"] }) as JwtPayload;
  } catch {
    return null;
  }
}

/** Sign access token (1h) */
export function signAccessToken(payload: Omit<JwtPayload, "jti" | "iat" | "type" | "exp">): string {
  return signJwtRsa({ ...payload, type: "access" }, process.env.JWT_EXPIRES_IN ?? "1h");
}

/** Sign refresh token (30d) */
export function signRefreshToken(payload: Omit<JwtPayload, "jti" | "iat" | "type" | "exp">): string {
  return signJwtRsa({ ...payload, type: "refresh" }, "30d");
}
