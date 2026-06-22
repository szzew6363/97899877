/**
 * AI-powered code vulnerability scanner
 * POST /api/scan/code   → analyze code for vulnerabilities
 * GET  /api/scan/history → user's scan history
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth } from "../middlewares/jwtAuth";
import { aiProviders } from "../lib/ai-providers";

const router = Router();

interface Vulnerability {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  line?: number;
  lineEnd?: number;
  snippet?: string;
  recommendation: string;
  cwe?: string;
  owasp?: string;
}

interface ScanResult {
  vulnerabilities: Vulnerability[];
  summary: string;
  severityCounts: Record<string, number>;
  language: string;
  scanTimeMs: number;
}

const SCAN_SYSTEM_PROMPT = `You are a world-class application security expert and penetration tester specializing in SAST (Static Application Security Testing). Your task is to analyze the provided code for security vulnerabilities with extreme precision.

Analyze for:
- Injection flaws (SQL, Command, LDAP, XPath, NoSQL injection)
- XSS (Reflected, Stored, DOM-based)
- Broken Authentication & Session Management
- Sensitive Data Exposure (hardcoded secrets, API keys, passwords)
- XXE (XML External Entity)
- Broken Access Control & IDOR
- Security Misconfiguration
- Insecure Deserialization
- Known vulnerable components/dependencies
- SSRF (Server-Side Request Forgery)
- Path Traversal
- Race Conditions
- Memory safety issues (buffer overflow, use-after-free)
- Cryptographic weaknesses (weak algorithms, bad IV, ECB mode)
- Business logic flaws

Respond ONLY with a valid JSON object:
{
  "language": "detected language",
  "summary": "2-3 sentence executive summary in Arabic",
  "vulnerabilities": [
    {
      "id": "VULN-001",
      "severity": "critical|high|medium|low|info",
      "title": "Short vulnerability name",
      "description": "Detailed description of the vulnerability and why it is dangerous",
      "line": 42,
      "lineEnd": 45,
      "snippet": "the vulnerable code line(s)",
      "recommendation": "Specific fix with code example",
      "cwe": "CWE-89",
      "owasp": "A03:2021"
    }
  ]
}

Be thorough but precise. Only report real vulnerabilities, not style issues.`;

router.post("/scan/code", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  const startMs = Date.now();
  try {
    const { code, filename, apiKey } = req.body as {
      code?: string;
      filename?: string;
      apiKey?: string;
    };

    if (!code || code.trim().length < 10) {
      res.status(400).json({ error: "Code is required (min 10 characters)" });
      return;
    }
    if (code.length > 50_000) {
      res.status(400).json({ error: "Code too large (max 50KB)" });
      return;
    }

    const resolvedKey = apiKey || process.env.OPENAI_API_KEY;
    if (!resolvedKey) {
      res.status(503).json({ error: "No API key configured for scanning" });
      return;
    }

    const messages = [
      {
        role: "user" as const,
        content: `Analyze this ${filename ? `file "${filename}"` : "code"} for security vulnerabilities:\n\n\`\`\`\n${code}\n\`\`\``,
      },
    ];

    let rawResponse = "";
    await aiProviders.streamOpenAI(
      {
        model: "gpt-4o",
        messages: [{ role: "system", content: SCAN_SYSTEM_PROMPT }, ...messages],
        temperature: 0.1,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        apiKey: resolvedKey,
      },
      (chunk) => { rawResponse += chunk; },
    );

    let parsed: Partial<ScanResult & { vulnerabilities: Vulnerability[] }>;
    try {
      parsed = JSON.parse(rawResponse);
    } catch {
      // Try to extract JSON
      const match = rawResponse.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { vulnerabilities: [], summary: "Parse error", language: "unknown" };
    }

    const vulns: Vulnerability[] = (parsed.vulnerabilities ?? []).map((v, i) => ({
      id: v.id ?? `VULN-${String(i + 1).padStart(3, "0")}`,
      severity: (["critical", "high", "medium", "low", "info"].includes(v.severity ?? "") ? v.severity : "medium") as Vulnerability["severity"],
      title: v.title ?? "Unknown Vulnerability",
      description: v.description ?? "",
      line: v.line,
      lineEnd: v.lineEnd,
      snippet: v.snippet,
      recommendation: v.recommendation ?? "",
      cwe: v.cwe,
      owasp: v.owasp,
    }));

    const severityCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    vulns.forEach(v => { severityCounts[v.severity] = (severityCounts[v.severity] ?? 0) + 1; });

    const result: ScanResult = {
      vulnerabilities: vulns,
      summary: parsed.summary ?? `Found ${vulns.length} potential vulnerabilities.`,
      severityCounts,
      language: parsed.language ?? "unknown",
      scanTimeMs: Date.now() - startMs,
    };

    // Save to DB if user authenticated
    if (req.authUser) {
      const { rows } = await pool.query(
        `INSERT INTO scan_results (user_id, filename, language, vulnerabilities, summary, severity_counts)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [
          req.authUser.id,
          filename ?? null,
          result.language,
          JSON.stringify(result.vulnerabilities),
          result.summary,
          JSON.stringify(result.severityCounts),
        ],
      );
      res.json({ ...result, scanId: rows[0]?.id });
    } else {
      res.json(result);
    }
  } catch (err) {
    console.error("Code scan error:", err);
    res.status(500).json({ error: "Scan failed. Check API key and try again." });
  }
});

/* ── GET /api/scan/history ── */
router.get("/scan/history", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  if (!req.authUser) { res.status(401).json({ error: "Auth required" }); return; }
  try {
    const { rows } = await pool.query(
      `SELECT id, filename, language, summary, severity_counts, created_at
       FROM scan_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [req.authUser.id],
    );
    res.json({ history: rows });
  } catch {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

/* ── GET /api/scan/:id ── */
router.get("/scan/:id", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  if (!req.authUser) { res.status(401).json({ error: "Auth required" }); return; }
  try {
    const { rows } = await pool.query(
      "SELECT * FROM scan_results WHERE id = $1 AND user_id = $2",
      [req.params.id, req.authUser.id],
    );
    if (!rows[0]) { res.status(404).json({ error: "Scan not found" }); return; }
    res.json(rows[0]);
  } catch {
    res.status(500).json({ error: "Failed to fetch scan" });
  }
});

export default router;
