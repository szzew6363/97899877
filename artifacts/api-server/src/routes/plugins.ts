/**
 * Plugin Marketplace
 * GET  /api/plugins              → list all available plugins
 * POST /api/plugins/:id/install  → install plugin for user
 * DELETE /api/plugins/:id        → uninstall plugin
 * GET  /api/plugins/installed    → list user's installed plugins
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth } from "../middlewares/jwtAuth";

const router = Router();

/* ── Built-in plugin registry (JSON-driven, no rebuild needed) ── */
const PLUGIN_REGISTRY = [
  {
    id: "shodan-intel",
    name: "Shodan Intelligence",
    description: "تكامل مع Shodan لاستعلامات OSINT وبيانات الأجهزة المكشوفة",
    descriptionEn: "Shodan integration for OSINT queries and exposed device data",
    category: "osint",
    icon: "🔭",
    version: "1.0.0",
    author: "KaliGPT Team",
    requiredTier: "pro",
    permissions: ["osint", "network"],
    configSchema: {
      apiKey: { type: "string", label: "Shodan API Key", required: true, secret: true },
    },
    tags: ["osint", "network", "reconnaissance"],
  },
  {
    id: "virustotal-scan",
    name: "VirusTotal Scanner",
    description: "فحص الملفات والروابط والـ IPs عبر VirusTotal",
    descriptionEn: "Scan files, URLs and IPs via VirusTotal API",
    category: "malware",
    icon: "🛡️",
    version: "1.2.0",
    author: "KaliGPT Team",
    requiredTier: "free",
    permissions: ["scan"],
    configSchema: {
      apiKey: { type: "string", label: "VirusTotal API Key", required: true, secret: true },
    },
    tags: ["malware", "scan", "urls"],
  },
  {
    id: "censys-recon",
    name: "Censys Reconnaissance",
    description: "استطلاع شامل للبنية التحتية عبر Censys",
    descriptionEn: "Comprehensive infrastructure reconnaissance via Censys",
    category: "osint",
    icon: "🌐",
    version: "1.0.0",
    author: "KaliGPT Team",
    requiredTier: "pro",
    permissions: ["osint"],
    configSchema: {
      apiId: { type: "string", label: "Censys API ID", required: true, secret: false },
      apiSecret: { type: "string", label: "Censys API Secret", required: true, secret: true },
    },
    tags: ["osint", "recon", "infrastructure"],
  },
  {
    id: "nuclei-templates",
    name: "Nuclei Templates",
    description: "قوالب Nuclei لفحص الثغرات تلقائياً",
    descriptionEn: "Nuclei vulnerability scanning templates",
    category: "scanner",
    icon: "⚡",
    version: "2.5.0",
    author: "Community",
    requiredTier: "pro",
    permissions: ["scan", "shell"],
    configSchema: {},
    tags: ["scanner", "vulnerability", "automation"],
  },
  {
    id: "metasploit-bridge",
    name: "Metasploit Bridge",
    description: "تكامل مع Metasploit Framework عبر RPC API",
    descriptionEn: "Metasploit Framework integration via RPC API",
    category: "exploitation",
    icon: "💥",
    version: "1.0.0",
    author: "KaliGPT Team",
    requiredTier: "enterprise",
    permissions: ["shell", "scan", "osint"],
    configSchema: {
      host: { type: "string", label: "MSF RPC Host", required: true, secret: false },
      port: { type: "number", label: "MSF RPC Port", required: false, secret: false },
      password: { type: "string", label: "MSF RPC Password", required: true, secret: true },
    },
    tags: ["exploitation", "pentest", "metasploit"],
  },
  {
    id: "slack-alerts",
    name: "Slack Alerts",
    description: "إرسال تنبيهات الأمان إلى قناة Slack",
    descriptionEn: "Send security alerts to Slack channels",
    category: "notification",
    icon: "📢",
    version: "1.1.0",
    author: "KaliGPT Team",
    requiredTier: "pro",
    permissions: ["webhook"],
    configSchema: {
      webhookUrl: { type: "string", label: "Slack Webhook URL", required: true, secret: true },
      channel: { type: "string", label: "Channel Name", required: false, secret: false },
    },
    tags: ["notification", "slack", "alerts"],
  },
  {
    id: "jira-tickets",
    name: "Jira Issue Tracker",
    description: "إنشاء تذاكر Jira تلقائياً من نتائج الفحص",
    descriptionEn: "Auto-create Jira issues from scan findings",
    category: "workflow",
    icon: "📋",
    version: "1.0.0",
    author: "KaliGPT Team",
    requiredTier: "enterprise",
    permissions: ["webhook"],
    configSchema: {
      domain: { type: "string", label: "Jira Domain", required: true, secret: false },
      email: { type: "string", label: "Email", required: true, secret: false },
      apiToken: { type: "string", label: "API Token", required: true, secret: true },
      projectKey: { type: "string", label: "Project Key", required: true, secret: false },
    },
    tags: ["workflow", "jira", "ticketing"],
  },
  {
    id: "custom-llm",
    name: "Custom LLM Provider",
    description: "ربط نموذج لغوي مخصص عبر OpenAI-compatible API",
    descriptionEn: "Connect a custom LLM via OpenAI-compatible API",
    category: "ai",
    icon: "🤖",
    version: "2.0.0",
    author: "KaliGPT Team",
    requiredTier: "free",
    permissions: ["chat"],
    configSchema: {
      baseURL: { type: "string", label: "Base URL", required: true, secret: false },
      apiKey: { type: "string", label: "API Key", required: false, secret: true },
      model: { type: "string", label: "Model Name", required: true, secret: false },
    },
    tags: ["ai", "custom", "llm"],
  },
];

async function ensurePluginsTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_plugins (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::varchar,
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      plugin_id VARCHAR NOT NULL,
      config JSONB NOT NULL DEFAULT '{}',
      is_active BOOLEAN NOT NULL DEFAULT true,
      installed_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, plugin_id)
    );
  `).catch(() => {});
}
ensurePluginsTables();

/* ── GET /api/plugins ── */
router.get("/plugins", (_req: Request, res: Response) => {
  res.json({ plugins: PLUGIN_REGISTRY });
});

/* ── GET /api/plugins/installed ── */
router.get("/plugins/installed", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  if (!req.authUser) { res.status(401).json({ error: "Auth required" }); return; }
  try {
    const { rows } = await pool.query(
      "SELECT plugin_id, config, is_active, installed_at FROM user_plugins WHERE user_id = $1 AND is_active = true",
      [req.authUser.id],
    );
    const installed = rows.map(r => ({
      ...PLUGIN_REGISTRY.find(p => p.id === r.plugin_id),
      installed: true,
      isActive: r.is_active,
      installedAt: r.installed_at,
      // Don't expose secrets in config
      config: Object.fromEntries(
        Object.entries(r.config as Record<string, string>).map(([k, v]) => {
          const schema = PLUGIN_REGISTRY.find(p => p.id === r.plugin_id)?.configSchema as Record<string, { secret?: boolean }>;
          return [k, schema?.[k]?.secret ? "***" : v];
        }),
      ),
    }));
    res.json({ plugins: installed });
  } catch {
    res.status(500).json({ error: "Failed to fetch installed plugins" });
  }
});

/* ── POST /api/plugins/:id/install ── */
router.post("/plugins/:id/install", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  if (!req.authUser) { res.status(401).json({ error: "Auth required" }); return; }
  try {
    const plugin = PLUGIN_REGISTRY.find(p => p.id === req.params.id);
    if (!plugin) { res.status(404).json({ error: "Plugin not found" }); return; }

    const user = req.authUser;
    const tierOrder = ["free", "pro", "enterprise"];
    const userTierIdx = tierOrder.indexOf(user.subscription);
    const reqTierIdx = tierOrder.indexOf(plugin.requiredTier);
    if (userTierIdx < reqTierIdx) {
      res.status(403).json({ error: `يتطلب خطة ${plugin.requiredTier}. خططك الحالية: ${user.subscription}` });
      return;
    }

    const { config = {} } = req.body as { config?: Record<string, string> };
    await pool.query(
      `INSERT INTO user_plugins (user_id, plugin_id, config)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, plugin_id) DO UPDATE SET config = $3, is_active = true`,
      [user.id, plugin.id, JSON.stringify(config)],
    );
    res.json({ ok: true, plugin: { id: plugin.id, name: plugin.name } });
  } catch {
    res.status(500).json({ error: "Failed to install plugin" });
  }
});

/* ── DELETE /api/plugins/:id ── */
router.delete("/plugins/:id", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  if (!req.authUser) { res.status(401).json({ error: "Auth required" }); return; }
  try {
    await pool.query(
      "UPDATE user_plugins SET is_active = false WHERE user_id = $1 AND plugin_id = $2",
      [req.authUser.id, req.params.id],
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to uninstall plugin" });
  }
});

/* ── POST /api/plugins/:id/uninstall ── alias for DELETE */
router.post("/plugins/:id/uninstall", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  if (!req.authUser) { res.status(401).json({ error: "Auth required" }); return; }
  try {
    await pool.query(
      "UPDATE user_plugins SET is_active = false WHERE user_id = $1 AND plugin_id = $2",
      [req.authUser.id, req.params.id],
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to uninstall plugin" });
  }
});

export default router;
