/**
 * Full authentication system — JWT + Refresh + Brute-force + 2FA + Password Reset + Email Verify
 */
import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  pool, getUserByEmail, createUser, getUserById, logSecurityEvent,
  createUserSession, revokeUserSession, revokeAllUserSessions,
  getUserSessions, createNotification,
} from "../db";
import { signJwt, jwtAuth, requireAuth } from "../middlewares/jwtAuth";

const router = Router();

const BCRYPT_ROUNDS = 12;
const ACCESS_TTL = "1h";
const REFRESH_TTL_DAYS = 30;
const BRUTE_MAX_ATTEMPTS = 5;
const BRUTE_LOCK_MINUTES = 15;
const RESET_TTL_MINUTES = 10;
const VERIFY_TTL_MINUTES = 60;

// ── Helpers ───────────────────────────────────────────────────────────────────
function getClientIP(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress || "unknown"
  );
}

function parseUserAgent(ua: string) {
  const browser =
    ua.includes("Firefox") ? "Firefox" :
    ua.includes("Chrome") ? "Chrome" :
    ua.includes("Safari") ? "Safari" :
    ua.includes("Edge") ? "Edge" :
    ua.includes("curl") ? "cURL" : "Unknown";
  const os =
    ua.includes("Windows") ? "Windows" :
    ua.includes("Mac") ? "macOS" :
    ua.includes("Linux") ? "Linux" :
    ua.includes("Android") ? "Android" :
    (ua.includes("iPhone") || ua.includes("iPad")) ? "iOS" : "Unknown";
  const device = ua.includes("Mobile") ? "mobile" : "browser";
  return { browser, os, device };
}

function generateRefreshToken() { return crypto.randomBytes(48).toString("hex"); }
function hashToken(t: string) { return crypto.createHash("sha256").update(t).digest("hex"); }
function generate6Digit() { return String(Math.floor(100000 + Math.random() * 900000)); }

async function issueTokens(user: Record<string, unknown>, req: Request) {
  const accessToken = signJwt(
    { sub: user["id"], email: user["email"], role: user["role"] },
    ACCESS_TTL,
  );
  const refreshToken = generateRefreshToken();
  const refreshHash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_DAYS * 86400_000);
  const ua = req.headers["user-agent"] || "";
  const { browser, os, device } = parseUserAgent(ua);
  const ip = getClientIP(req);

  await pool.query(
    "UPDATE users SET refresh_token=$1, last_login_at=NOW(), last_ip=$2, updated_at=NOW() WHERE id=$3",
    [refreshHash, ip, user["id"]],
  );
  await createUserSession({
    userId: user["id"] as string,
    sessionToken: refreshHash,
    deviceName: `${browser} on ${os}`,
    deviceType: device,
    browser, os,
    ipAddress: ip,
    expiresAt,
  });
  return { accessToken, refreshToken, expiresIn: 3600 };
}

function userPayload(u: Record<string, unknown>) {
  return {
    id: u["id"], email: u["email"],
    firstName: u["first_name"], lastName: u["last_name"], username: u["username"],
    role: u["role"], status: u["status"], subscription: u["subscription"],
    subscriptionExpiresAt: u["subscription_expires_at"],
    tokensUsed: u["tokens_used"], tokensLimit: u["tokens_limit"],
    profileImageUrl: u["profile_image_url"],
    emailVerified: u["email_verified"], totpEnabled: u["totp_enabled"],
    lastLoginAt: u["last_login_at"], createdAt: u["created_at"],
  };
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
  const { email, password, firstName, lastName, username } = req.body as Record<string, string>;
  if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }
  if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: "Invalid email format" }); return; }

  try {
    const existing = await getUserByEmail(email);
    if (existing) { res.status(409).json({ error: "Email already registered" }); return; }

    if (username) {
      const { rows } = await pool.query("SELECT id FROM users WHERE username=$1", [username]);
      if (rows.length) { res.status(409).json({ error: "Username already taken" }); return; }
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const verifyCode = generate6Digit();
    const verifyExpires = new Date(Date.now() + VERIFY_TTL_MINUTES * 60_000);

    const user = await createUser({ email, password_hash, first_name: firstName, last_name: lastName, username });
    await pool.query(
      "UPDATE users SET email_verify_code=$1, email_verify_expires=$2 WHERE id=$3",
      [verifyCode, verifyExpires, user.id],
    );

    await createNotification({
      userId: user.id, type: "welcome",
      title: "مرحباً بك في KaliGPT 🔐",
      body: `تم إنشاء حسابك. رمز التحقق: ${verifyCode} (صالح 60 دقيقة)`,
    });
    await logSecurityEvent({ userId: user.id, email: user.email, eventType: "register", success: true, ipAddress: getClientIP(req), userAgent: req.headers["user-agent"] });

    const tokens = await issueTokens(user, req);
    res.status(201).json({ user: userPayload(user), ...tokens, verifyCodeSent: true });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// ── POST /api/auth/verify-email ───────────────────────────────────────────────
router.post("/auth/verify-email", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { code } = req.body as { code?: string };
  if (!code) { res.status(400).json({ error: "Code required" }); return; }
  try {
    const user = await getUserById(req.authUser!.id);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    if (user.email_verified) { res.json({ ok: true }); return; }
    if (user.email_verify_code !== code || new Date() > new Date(user.email_verify_expires)) {
      res.status(400).json({ error: "Invalid or expired code" }); return;
    }
    await pool.query("UPDATE users SET email_verified=true, email_verify_code=NULL, email_verify_expires=NULL WHERE id=$1", [user.id]);
    await logSecurityEvent({ userId: user.id, eventType: "email_verified", success: true, ipAddress: getClientIP(req) });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Verification failed" }); }
});

// ── POST /api/auth/resend-verify ──────────────────────────────────────────────
router.post("/auth/resend-verify", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUserById(req.authUser!.id);
    if (!user || user.email_verified) { res.json({ ok: true }); return; }
    const code = generate6Digit();
    const expires = new Date(Date.now() + VERIFY_TTL_MINUTES * 60_000);
    await pool.query("UPDATE users SET email_verify_code=$1, email_verify_expires=$2 WHERE id=$3", [code, expires, user.id]);
    await createNotification({ userId: user.id, type: "verify", title: "رمز التحقق الجديد 📧", body: `رمز التحقق: ${code}` });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Resend failed" }); }
});

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password, totpCode } = req.body as Record<string, string>;
  if (!email || !password) { res.status(400).json({ error: "Email and password required" }); return; }

  const ip = getClientIP(req);
  const ua = req.headers["user-agent"] || "";

  try {
    const user = await getUserByEmail(email);
    if (!user || !user.password_hash) {
      await logSecurityEvent({ email, eventType: "login_fail", success: false, ipAddress: ip, userAgent: ua, details: { reason: "not_found" } });
      res.status(401).json({ error: "Invalid credentials" }); return;
    }

    if (user.status === "banned") { res.status(403).json({ error: "Account suspended. Contact support." }); return; }

    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      const remaining = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60_000);
      res.status(429).json({ error: `Account locked. Try again in ${remaining} min.`, lockedUntil: user.locked_until }); return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const lock = attempts >= BRUTE_MAX_ATTEMPTS ? new Date(Date.now() + BRUTE_LOCK_MINUTES * 60_000) : null;
      await pool.query("UPDATE users SET failed_login_attempts=$1, locked_until=$2 WHERE id=$3", [attempts, lock, user.id]);
      await logSecurityEvent({ userId: user.id, email, eventType: "login_fail", success: false, ipAddress: ip, userAgent: ua, details: { attempts } });
      if (lock) { res.status(429).json({ error: `Too many attempts. Locked for ${BRUTE_LOCK_MINUTES} min.` }); }
      else { res.status(401).json({ error: "Invalid credentials", attemptsLeft: BRUTE_MAX_ATTEMPTS - attempts }); }
      return;
    }

    // TOTP check
    if (user.totp_enabled) {
      if (!totpCode) { res.status(200).json({ requiresTOTP: true }); return; }
      try {
        const otplib = await import("otplib");
        const valid2 = (otplib as unknown as { totp: { verify: (o: { token: string; secret: string }) => boolean } }).totp.verify({ token: totpCode, secret: user.totp_secret });
        if (!valid2) {
          await logSecurityEvent({ userId: user.id, eventType: "totp_fail", success: false, ipAddress: ip });
          res.status(401).json({ error: "Invalid TOTP code" }); return;
        }
      } catch {
        res.status(500).json({ error: "TOTP validation error" }); return;
      }
    }

    await pool.query("UPDATE users SET failed_login_attempts=0, locked_until=NULL WHERE id=$1", [user.id]);
    const tokens = await issueTokens(user, req);
    await logSecurityEvent({ userId: user.id, email, eventType: "login_success", success: true, ipAddress: ip, userAgent: ua });

    const pct = user.tokens_used / user.tokens_limit;
    if (pct >= 0.95) await createNotification({ userId: user.id, type: "quota_95", title: "⚠️ 95% من التوكن", body: "وصلت لـ 95% من الحد الشهري." });
    else if (pct >= 0.80) await createNotification({ userId: user.id, type: "quota_80", title: "📊 80% من التوكن", body: "استهلكت 80% من الحد الشهري." });

    res.json({ user: userPayload(user), ...tokens });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post("/auth/refresh", async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) { res.status(400).json({ error: "Refresh token required" }); return; }
  try {
    const refreshHash = hashToken(refreshToken);
    const { rows } = await pool.query("SELECT * FROM users WHERE refresh_token=$1", [refreshHash]);
    const user = rows[0];
    if (!user) { res.status(401).json({ error: "Invalid or expired refresh token" }); return; }
    if (user.status === "banned") { res.status(403).json({ error: "Account suspended" }); return; }

    const newAccess = signJwt({ sub: user.id, email: user.email, role: user.role }, ACCESS_TTL);
    const newRefresh = generateRefreshToken();
    const newHash = hashToken(newRefresh);

    await pool.query("UPDATE users SET refresh_token=$1, updated_at=NOW() WHERE id=$2", [newHash, user.id]);
    await pool.query("UPDATE user_sessions SET session_token=$1, last_active_at=NOW() WHERE session_token=$2", [newHash, refreshHash]);

    res.json({ accessToken: newAccess, refreshToken: newRefresh, expiresIn: 3600 });
  } catch { res.status(500).json({ error: "Refresh failed" }); }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post("/auth/logout", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    const hash = refreshToken ? hashToken(refreshToken) : null;
    await pool.query("UPDATE users SET refresh_token=NULL WHERE id=$1", [req.authUser!.id]);
    if (hash) await pool.query("DELETE FROM user_sessions WHERE session_token=$1", [hash]);
    await logSecurityEvent({ userId: req.authUser!.id, eventType: "logout", success: true, ipAddress: getClientIP(req) });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Logout failed" }); }
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
router.post("/auth/forgot-password", async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email) { res.status(400).json({ error: "Email required" }); return; }
  try {
    const user = await getUserByEmail(email);
    if (!user) { res.json({ ok: true }); return; }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetHash = hashToken(resetToken);
    const resetExpires = new Date(Date.now() + RESET_TTL_MINUTES * 60_000);

    await pool.query("UPDATE users SET reset_token=$1, reset_expires=$2 WHERE id=$3", [resetHash, resetExpires, user.id]);
    await createNotification({
      userId: user.id, type: "password_reset",
      title: "🔑 إعادة تعيين كلمة المرور",
      body: `رمز الإعادة (صالح 10 دقائق): ${resetToken}`,
    });
    await logSecurityEvent({ userId: user.id, email, eventType: "password_reset_request", success: true, ipAddress: getClientIP(req) });
    res.json({ ok: true, resetToken });
  } catch { res.status(500).json({ error: "Reset request failed" }); }
});

// ── POST /api/auth/reset-password ────────────────────────────────────────────
router.post("/auth/reset-password", async (req: Request, res: Response): Promise<void> => {
  const { token, newPassword } = req.body as { token?: string; newPassword?: string };
  if (!token || !newPassword) { res.status(400).json({ error: "Token and password required" }); return; }
  if (newPassword.length < 8) { res.status(400).json({ error: "Password min 8 chars" }); return; }
  try {
    const tokenHash = hashToken(token);
    const { rows } = await pool.query("SELECT * FROM users WHERE reset_token=$1 AND reset_expires>NOW()", [tokenHash]);
    const user = rows[0];
    if (!user) { res.status(400).json({ error: "Invalid or expired reset token" }); return; }

    const password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query(
      "UPDATE users SET password_hash=$1, reset_token=NULL, reset_expires=NULL, failed_login_attempts=0, locked_until=NULL, updated_at=NOW() WHERE id=$2",
      [password_hash, user.id],
    );
    await revokeAllUserSessions(user.id);
    await pool.query("UPDATE users SET refresh_token=NULL WHERE id=$1", [user.id]);
    await logSecurityEvent({ userId: user.id, eventType: "password_reset_success", success: true, ipAddress: getClientIP(req) });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Password reset failed" }); }
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get("/auth/me", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUserById(req.authUser!.id);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    res.json(userPayload(user));
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── PUT /api/auth/me ──────────────────────────────────────────────────────────
router.put("/auth/me", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { firstName, lastName, username, currentPassword, newPassword } = req.body as Record<string, string>;
  try {
    const user = await getUserById(req.authUser!.id);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }

    if (username && username !== user.username) {
      const { rows } = await pool.query("SELECT id FROM users WHERE username=$1 AND id!=$2", [username, user.id]);
      if (rows.length) { res.status(409).json({ error: "Username taken" }); return; }
    }

    let password_hash = user.password_hash;
    if (newPassword) {
      if (!currentPassword) { res.status(400).json({ error: "Current password required" }); return; }
      if (!user.password_hash) { res.status(400).json({ error: "No password (OAuth account)" }); return; }
      if (!await bcrypt.compare(currentPassword, user.password_hash)) { res.status(401).json({ error: "Wrong password" }); return; }
      if (newPassword.length < 8) { res.status(400).json({ error: "Password min 8 chars" }); return; }
      password_hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await logSecurityEvent({ userId: user.id, eventType: "password_change", success: true, ipAddress: getClientIP(req) });
    }

    await pool.query(
      "UPDATE users SET first_name=$1, last_name=$2, username=$3, password_hash=$4, updated_at=NOW() WHERE id=$5",
      [firstName ?? user.first_name, lastName ?? user.last_name, username ?? user.username, password_hash, user.id],
    );
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Update failed" }); }
});

// ── POST /api/auth/upload-avatar ─────────────────────────────────────────────
router.post("/auth/upload-avatar", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { imageUrl } = req.body as { imageUrl?: string };
  if (!imageUrl) { res.status(400).json({ error: "Image URL required" }); return; }
  try {
    await pool.query("UPDATE users SET profile_image_url=$1, updated_at=NOW() WHERE id=$2", [imageUrl, req.authUser!.id]);
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Avatar update failed" }); }
});

// ── Sessions ──────────────────────────────────────────────────────────────────
router.get("/auth/sessions", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try { res.json({ sessions: await getUserSessions(req.authUser!.id) }); }
  catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/auth/sessions/:id", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await revokeUserSession(req.params["id"]!, req.authUser!.id);
    await logSecurityEvent({ userId: req.authUser!.id, eventType: "session_revoked", success: true, ipAddress: getClientIP(req) });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

router.delete("/auth/sessions", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await revokeAllUserSessions(req.authUser!.id);
    await pool.query("UPDATE users SET refresh_token=NULL WHERE id=$1", [req.authUser!.id]);
    await logSecurityEvent({ userId: req.authUser!.id, eventType: "all_sessions_revoked", success: true, ipAddress: getClientIP(req) });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── Security events ───────────────────────────────────────────────────────────
router.get("/auth/security-events", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query["limit"] ?? 50), 100);
    const { rows } = await pool.query(
      "SELECT id, event_type, success, ip_address, user_agent, details, created_at FROM security_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT $2",
      [req.authUser!.id, limit],
    );
    res.json({ events: rows });
  } catch { res.status(500).json({ error: "Failed" }); }
});

// ── TOTP ──────────────────────────────────────────────────────────────────────
router.post("/auth/totp/setup", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUserById(req.authUser!.id);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }
    const otplib = await import("otplib");
    const auth = (otplib as unknown as { authenticator: { generateSecret: () => string; keyuri: (u: string, s: string, sec: string) => string } }).authenticator;
    const secret = auth.generateSecret();
    const otpAuthUrl = auth.keyuri(user.email, "KaliGPT / mr7.ai", secret);
    await pool.query("UPDATE users SET totp_secret=$1 WHERE id=$2", [secret, user.id]);
    res.json({ secret, otpAuthUrl });
  } catch (err) {
    console.error("TOTP setup:", err);
    res.status(500).json({ error: "TOTP setup failed" });
  }
});

router.post("/auth/totp/verify", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { code } = req.body as { code?: string };
  if (!code) { res.status(400).json({ error: "Code required" }); return; }
  try {
    const user = await getUserById(req.authUser!.id);
    if (!user?.totp_secret) { res.status(400).json({ error: "TOTP not set up" }); return; }
    const otplib = await import("otplib");
    const valid = (otplib as unknown as { totp: { verify: (o: { token: string; secret: string }) => boolean } }).totp.verify({ token: code, secret: user.totp_secret });
    if (!valid) { res.status(400).json({ error: "Invalid code" }); return; }
    await pool.query("UPDATE users SET totp_enabled=true WHERE id=$1", [user.id]);
    await logSecurityEvent({ userId: user.id, eventType: "totp_enabled", success: true, ipAddress: getClientIP(req) });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "TOTP verify failed" }); }
});

router.delete("/auth/totp", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  const { password } = req.body as { password?: string };
  if (!password) { res.status(400).json({ error: "Password required" }); return; }
  try {
    const user = await getUserById(req.authUser!.id);
    if (!user?.password_hash) { res.status(400).json({ error: "No password set" }); return; }
    if (!await bcrypt.compare(password, user.password_hash)) { res.status(401).json({ error: "Wrong password" }); return; }
    await pool.query("UPDATE users SET totp_enabled=false, totp_secret=NULL WHERE id=$1", [user.id]);
    await logSecurityEvent({ userId: user.id, eventType: "totp_disabled", success: true, ipAddress: getClientIP(req) });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Failed" }); }
});

export default router;
