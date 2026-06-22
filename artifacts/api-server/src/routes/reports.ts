/**
 * Report generation endpoint
 * POST /api/reports/generate   → generate structured report data (PDF rendered client-side)
 * POST /api/reports/scan/:id   → generate report for a scan result
 */
import { Router, type Request, type Response } from "express";
import { pool } from "../db";
import { jwtAuth } from "../middlewares/jwtAuth";

const router = Router();

/* ── POST /api/reports/generate ── */
router.post("/reports/generate", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      title,
      type = "pentest",
      content,
      findings = [],
      recommendations = [],
      metadata = {},
    } = req.body as {
      title?: string;
      type?: string;
      content?: string;
      findings?: { severity: string; title: string; description: string; fix?: string }[];
      recommendations?: string[];
      metadata?: Record<string, unknown>;
    };

    const now = new Date();
    const report = {
      id: Math.random().toString(36).slice(2),
      title: title || "تقرير أمني — KaliGPT",
      type,
      generatedAt: now.toISOString(),
      generatedBy: "KaliGPT / mr7.ai",
      classification: "CONFIDENTIAL",
      content: content || "",
      findings: findings.map((f, i) => ({
        id: `FIND-${String(i + 1).padStart(3, "0")}`,
        severity: f.severity || "medium",
        title: f.title,
        description: f.description,
        fix: f.fix || "See documentation",
      })),
      severitySummary: {
        critical: findings.filter(f => f.severity === "critical").length,
        high: findings.filter(f => f.severity === "high").length,
        medium: findings.filter(f => f.severity === "medium").length,
        low: findings.filter(f => f.severity === "low").length,
      },
      recommendations,
      metadata: {
        ...metadata,
        tool: "KaliGPT v3.0",
        platform: "mr7.ai",
        analyst: req.authUser?.email ?? "Anonymous",
      },
    };

    res.json({ report });
  } catch {
    res.status(500).json({ error: "Report generation failed" });
  }
});

/* ── POST /api/reports/scan/:id ── generate report from scan result */
router.post("/reports/scan/:id", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  if (!req.authUser) { res.status(401).json({ error: "Auth required" }); return; }
  try {
    const { rows } = await pool.query(
      "SELECT * FROM scan_results WHERE id = $1 AND user_id = $2",
      [req.params.id, req.authUser.id],
    );
    if (!rows[0]) { res.status(404).json({ error: "Scan not found" }); return; }

    const scan = rows[0];
    const vulns = scan.vulnerabilities as { severity: string; title: string; description: string; recommendation: string }[];
    const report = {
      id: scan.id,
      title: `تقرير تحليل الثغرات — ${scan.filename || scan.language}`,
      type: "code_scan",
      generatedAt: new Date().toISOString(),
      generatedBy: "KaliGPT SAST Scanner",
      classification: "CONFIDENTIAL",
      summary: scan.summary,
      language: scan.language,
      filename: scan.filename,
      findings: vulns.map((v, i) => ({
        id: `VULN-${String(i + 1).padStart(3, "0")}`,
        severity: v.severity,
        title: v.title,
        description: v.description,
        fix: v.recommendation,
      })),
      severitySummary: scan.severity_counts,
      recommendations: [
        "مراجعة جميع نقاط الإدخال وتطبيق input validation صارم",
        "تطبيق مبدأ أقل الصلاحيات (Least Privilege) على المستخدمين والخدمات",
        "تفعيل WAF (Web Application Firewall) في بيئة الإنتاج",
        "إجراء code review دوري واستخدام SAST في CI/CD pipeline",
      ],
      metadata: {
        tool: "KaliGPT v3.0",
        platform: "mr7.ai",
        analyst: req.authUser.email,
        scanDate: scan.created_at,
      },
    };

    res.json({ report });
  } catch {
    res.status(500).json({ error: "Failed to generate scan report" });
  }
});

// ── GET /api/reports/history — List user reports ─────────────────────────────
router.get("/reports/history", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT id, title, template, language, status, created_at, pdf_url FROM reports WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`,
      [req.authUser.id]
    ).catch(() => ({ rows: [] }));
    res.json({ reports: rows });
  } catch { res.status(500).json({ error: "Failed to fetch reports" }); }
});

export default router;
