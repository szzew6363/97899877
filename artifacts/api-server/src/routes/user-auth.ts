/**
 * Email + password authentication routes (JWT-based)
 * Lives alongside Replit OIDC — both systems coexist
 */
import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { pool, getUserByEmail, createUser, getUserById } from "../db";
import { signJwt, verifyJwt, jwtAuth, requireAuth } from "../middlewares/jwtAuth";

const router = Router();

const BCRYPT_ROUNDS = 12;
const REFRESH_SECRET = process.env.REFRESH_SECRET || "mr7-ai-refresh-dev-secret";

function signRefreshToken(userId: string) {
  const token = crypto.randomBytes(48).toString("hex");
  return token;
}

/* ── POST /api/auth/register ── */
router.post("/auth/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body as {
      email?: string; password?: string; firstName?: string; lastName?: string
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    const existing = await getUserByEmail(email.toLowerCase());
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await createUser({
      email: email.toLowerCase(),
      password_hash,
      first_name: firstName,
      last_name: lastName,
    });

    // Create initial free tokens notification
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES ($1, 'welcome', 'مرحباً بك في KaliGPT 🔐', 'تم إنشاء حسابك بنجاح. لديك 50,000 token مجاناً. استكشف الميزات!')`,
      [user.id],
    );

    const accessToken = signJwt({ sub: user.id, email: user.email, role: user.role }, "15m");
    const refreshToken = signRefreshToken(user.id);
    const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");

    await pool.query("UPDATE users SET refresh_token = $1, last_login_at = NOW() WHERE id = $2", [refreshHash, user.id]);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        subscription: user.subscription,
        tokensUsed: user.tokens_used,
        tokensLimit: user.tokens_limit,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

/* ── POST /api/auth/login ── */
router.post("/auth/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const user = await getUserByEmail(email.toLowerCase());
    if (!user || !user.password_hash) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const accessToken = signJwt({ sub: user.id, email: user.email, role: user.role }, "15m");
    const refreshToken = signRefreshToken(user.id);
    const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    await pool.query("UPDATE users SET refresh_token = $1, last_login_at = NOW() WHERE id = $2", [refreshHash, user.id]);

    // Check token quota and send notification if near limit
    const pct = user.tokens_used / user.tokens_limit;
    if (pct >= 0.95) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body) VALUES ($1, 'quota_95', '⚠️ تحذير: 95% من التوكن', 'وصلت إلى 95% من حدّك الشهري. يرجى ترقية الاشتراك.')
         ON CONFLICT DO NOTHING`,
        [user.id],
      );
    } else if (pct >= 0.80) {
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body) VALUES ($1, 'quota_80', '📊 80% من التوكن', 'استهلكت 80% من حدّك الشهري.')
         ON CONFLICT DO NOTHING`,
        [user.id],
      );
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        subscription: user.subscription,
        tokensUsed: user.tokens_used,
        tokensLimit: user.tokens_limit,
        profileImageUrl: user.profile_image_url,
      },
      accessToken,
      refreshToken,
      expiresIn: 900,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* ── POST /api/auth/refresh ── */
router.post("/auth/refresh", async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(400).json({ error: "Refresh token required" });
      return;
    }

    const refreshHash = crypto.createHash("sha256").update(refreshToken).digest("hex");
    const { rows } = await pool.query("SELECT * FROM users WHERE refresh_token = $1", [refreshHash]);
    const user = rows[0];
    if (!user) {
      res.status(401).json({ error: "Invalid refresh token" });
      return;
    }

    const newAccessToken = signJwt({ sub: user.id, email: user.email, role: user.role }, "15m");
    const newRefreshToken = signRefreshToken(user.id);
    const newRefreshHash = crypto.createHash("sha256").update(newRefreshToken).digest("hex");
    await pool.query("UPDATE users SET refresh_token = $1 WHERE id = $2", [newRefreshHash, user.id]);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: 900 });
  } catch {
    res.status(500).json({ error: "Token refresh failed" });
  }
});

/* ── POST /api/auth/logout ── */
router.post("/auth/logout", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query("UPDATE users SET refresh_token = NULL WHERE id = $1", [req.authUser!.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Logout failed" });
  }
});

/* ── GET /api/auth/me ── */
router.get("/auth/me", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getUserById(req.authUser!.id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      subscription: user.subscription,
      subscriptionExpiresAt: user.subscription_expires_at,
      tokensUsed: user.tokens_used,
      tokensLimit: user.tokens_limit,
      profileImageUrl: user.profile_image_url,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

/* ── PUT /api/auth/me ── update profile */
router.put("/auth/me", jwtAuth, requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, currentPassword, newPassword } = req.body as {
      firstName?: string; lastName?: string; currentPassword?: string; newPassword?: string;
    };

    const user = await getUserById(req.authUser!.id);
    if (!user) { res.status(404).json({ error: "Not found" }); return; }

    if (newPassword) {
      if (!currentPassword) { res.status(400).json({ error: "Current password required" }); return; }
      if (!user.password_hash) { res.status(400).json({ error: "No password set (OAuth account)" }); return; }
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) { res.status(401).json({ error: "Wrong current password" }); return; }
      if (newPassword.length < 8) { res.status(400).json({ error: "Password min 8 chars" }); return; }
      const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      await pool.query(
        "UPDATE users SET password_hash = $1, first_name = $2, last_name = $3, updated_at = NOW() WHERE id = $4",
        [newHash, firstName ?? user.first_name, lastName ?? user.last_name, user.id],
      );
    } else {
      await pool.query(
        "UPDATE users SET first_name = $1, last_name = $2, updated_at = NOW() WHERE id = $3",
        [firstName ?? user.first_name, lastName ?? user.last_name, user.id],
      );
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Update failed" });
  }
});

export default router;
