import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import router from "./routes/index.js";
import providersRouter from "./routes/providers.js";
import cloudChatsRouter from "./routes/cloud-chats.js";
import { cisaRouter } from "./routes/cisa.js";
import { logger } from "./lib/logger.js";
import { internalAuth } from "./middlewares/internalAuth.js";
import { pool, ensureAuthTables } from "./db.js";
import { setupReplitAuth } from "./routes/auth.js";
import { applySecurityHeaders } from "./middlewares/security-headers.js";
import { attackDetector } from "./middlewares/attack-detector.js";

// ── Validate critical secrets at startup ──────────────────────────────────────
const REQUIRED_SECRETS_WARN = ["SESSION_SECRET", "AES_ENCRYPTION_KEY", "JWT_PRIVATE_KEY", "JWT_PUBLIC_KEY"];
for (const key of REQUIRED_SECRETS_WARN) {
  if (!process.env[key]) {
    logger.warn(`[security] ${key} not set — using insecure default. Set this in production!`);
  }
}

const app: Express = express();

app.set("trust proxy", 1);

// ── Layer 1: Security Headers (Helmet + CSP + HSTS + clickjacking + MIME) ────
applySecurityHeaders(app);

// ── CORS — only allow known origins ──────────────────────────────────────────
const ALLOWED_ORIGINS: string[] | boolean = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : true; // true = reflect origin (dev only) — set ALLOWED_ORIGINS in production

app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Internal-Key",
      "X-Api-Key",
      "stripe-signature",
    ],
    credentials: true,
    maxAge: 86400,
  }),
);

// ── Global rate limiter ───────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests — slow down." },
  skip: (req) => req.method === "OPTIONS",
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "AI rate limit — max 120 requests/min." },
});

const shellLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Shell rate limit — max 30 commands/min." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many auth attempts. Try again in 15 minutes." },
});

const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Scan rate limit — max 10 scans/min." },
});

app.use(globalLimiter);

// ── HTTP request logger ───────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── Body parsers ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ extended: true, limit: "4mb" }));

// ── Stripe webhook needs raw body ─────────────────────────────────────────────
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

// ── Layer 2: Attack Detection (SQLi / XSS / path traversal / SSRF / cmd) ─────
// After body parsing so req.body is available. Exempt stripe + health.
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/api/stripe/webhook") || req.path.startsWith("/api/health")) {
    return next();
  }
  attackDetector(req, res, next);
});

// ── Session + Passport ────────────────────────────────────────────────────────
const PgStore = connectPg(session);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "mr7-ai-dev-secret-change-in-prod",
    resave: false,
    saveUninitialized: false,
    store: new PgStore({
      pool,
      createTableIfMissing: true,
      tableName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

// ── Route-specific rate limits ────────────────────────────────────────────────
app.use(
  [
    "/api/chat",
    "/api/council",
    "/api/godmode",
    "/api/osint/url",
    "/api/osint/analyze",
    "/api/image",
    "/api/vision",
    "/api/agent",
    "/api/autotune",
  ],
  aiLimiter,
);
app.use(["/api/shell/exec"], shellLimiter);
app.use(["/api/auth/login", "/api/auth/register", "/api/auth/refresh"], authLimiter);
app.use(["/api/scan/code"], scanLimiter);

// ── Public routes (no internalAuth gate) ─────────────────────────────────────
app.use("/api", providersRouter);
app.use("/api", cloudChatsRouter);
app.use("/api", cisaRouter);

// ── Stripe webhook (public — Stripe signature verifies it) ───────────────────
import stripeWebhookRouter from "./routes/stripe.js";
app.use("/api", stripeWebhookRouter);

// ── Auth setup ────────────────────────────────────────────────────────────────
(async () => {
  try {
    await ensureAuthTables();
    if (process.env.REPL_ID) {
      await setupReplitAuth(app);
    }
  } catch (err) {
    logger.warn({ err }, "Replit Auth setup skipped");
  }
})();

// ── All other API routes ──────────────────────────────────────────────────────
app.use("/api", internalAuth, router);

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ── Global error handler — never expose internals ─────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
