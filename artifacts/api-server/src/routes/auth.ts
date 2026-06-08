import { Router } from "express";
import * as client from "openid-client";
import passport from "passport";
import { Strategy as OidcStrategy, type VerifyFunction } from "openid-client/passport";
import { pool } from "../db";

const router = Router();

let _oidcCache: { value: Awaited<ReturnType<typeof client.discovery>>; expiry: number } | null = null;
async function getOidcConfig() {
  const now = Date.now();
  if (_oidcCache && now < _oidcCache.expiry) return _oidcCache.value;
  const value = await client.discovery(
    new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
    process.env.REPL_ID!,
  );
  _oidcCache = { value, expiry: now + 3600 * 1000 };
  return value;
}

async function upsertUser(claims: Record<string, unknown>) {
  try {
    await pool.query(
      `INSERT INTO users (id, email, first_name, last_name, profile_image_url, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (id) DO UPDATE SET
         email = EXCLUDED.email,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         profile_image_url = EXCLUDED.profile_image_url,
         updated_at = NOW()`,
      [
        claims["sub"],
        claims["email"] ?? null,
        claims["first_name"] ?? null,
        claims["last_name"] ?? null,
        claims["profile_image_url"] ?? null,
      ],
    );
  } catch {
    // table may not exist yet — non-fatal
  }
}

function updateUserSession(
  user: Record<string, unknown>,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
) {
  user["claims"] = tokens.claims();
  user["access_token"] = tokens.access_token;
  user["refresh_token"] = tokens.refresh_token;
  user["expires_at"] = (user["claims"] as Record<string, unknown>)?.["exp"];
}

export async function setupReplitAuth(app: import("express").Express) {
  const config = await getOidcConfig();

  const verify: VerifyFunction = async (tokens, verified) => {
    const user: Record<string, unknown> = {};
    updateUserSession(user, tokens);
    const claims = tokens.claims();
    if (claims) await upsertUser(claims as Record<string, unknown>);
    verified(null, user);
  };

  const registeredStrategies = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const name = `replitauth:${domain}`;
    if (!registeredStrategies.has(name)) {
      passport.use(
        new OidcStrategy(
          {
            name,
            config,
            scope: "openid email profile offline_access",
            callbackURL: `https://${domain}/api/callback`,
          },
          verify,
        ),
      );
      registeredStrategies.add(name);
    }
  };

  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(async () => {
      try {
        const cfg = await getOidcConfig();
        const url = client.buildEndSessionUrl(cfg, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        });
        res.redirect(url.href);
      } catch {
        res.redirect("/");
      }
    });
  });

  app.get("/api/auth/user", async (req: any, res) => {
    if (!req.isAuthenticated?.() || !req.user) {
      return res.status(401).json({ user: null });
    }
    const user = req.user as Record<string, unknown>;
    const claims = user["claims"] as Record<string, unknown> | undefined;

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = user["expires_at"] as number | undefined;

    if (expiresAt && now > expiresAt) {
      const refreshToken = user["refresh_token"] as string | undefined;
      if (!refreshToken) {
        return res.status(401).json({ user: null });
      }
      try {
        const cfg = await getOidcConfig();
        const tokenResponse = await client.refreshTokenGrant(cfg, refreshToken);
        updateUserSession(user as Record<string, unknown>, tokenResponse);
      } catch {
        return res.status(401).json({ user: null });
      }
    }

    return res.json({
      user: {
        id: claims?.["sub"],
        email: claims?.["email"],
        firstName: claims?.["first_name"],
        lastName: claims?.["last_name"],
        profileImageUrl: claims?.["profile_image_url"],
      },
    });
  });
}

export default router;
