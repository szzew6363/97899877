import { Router, type Request, type Response } from "express";
import { callOnce } from "../lib/ai-providers";

const router = Router();

/* ══════════════════════════════════════════════════════════════════
   OSINT ADVANCED ENGINE — محرك OSINT المتقدم
   DNS · crt.sh · HIBP · VirusTotal · Shodan · Archive · Whois
══════════════════════════════════════════════════════════════════ */

function sse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}
function sseHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

// ── DNS full scan ─────────────────────────────────────────────────
async function dnsLookup(domain: string): Promise<Record<string, unknown>> {
  const types = ["A", "AAAA", "MX", "TXT", "NS", "SRV", "CNAME", "SOA"];
  const results: Record<string, unknown> = {};
  await Promise.allSettled(
    types.map(async (type) => {
      try {
        const r = await fetch(
          `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (r.ok) {
          const d = await r.json() as { Answer?: unknown[] };
          results[type] = d.Answer ?? [];
        }
      } catch { results[type] = []; }
    })
  );
  return results;
}

// ── SSL Certificates via crt.sh ───────────────────────────────────
async function crtShLookup(domain: string): Promise<unknown[]> {
  // Try wildcard query first (%.domain finds all subdomains), fallback to exact
  const queries = [`%.${domain}`, domain];
  for (const q of queries) {
    try {
      const r = await fetch(
        `https://crt.sh/?q=${encodeURIComponent(q)}&output=json&deduplicate=Y`,
        {
          signal: AbortSignal.timeout(12000),
          headers: { "Accept": "application/json", "User-Agent": "KaliGPT-OSINT/1.0" },
        }
      );
      if (!r.ok) continue;
      const text = await r.text();
      if (!text || text.trim().length < 2) continue;
      const data = JSON.parse(text) as unknown[];
      if (!Array.isArray(data) || data.length === 0) continue;
      const seen = new Set<string>();
      return data.slice(0, 50).filter((c: unknown) => {
        const cert = c as Record<string, unknown>;
        const key = String(cert.common_name ?? cert.id);
        if (seen.has(key)) return false;
        seen.add(key); return true;
      });
    } catch { continue; }
  }
  return [];
}

// ── Have I Been Pwned ─────────────────────────────────────────────
async function hibpLookup(email: string, apiKey?: string): Promise<unknown[]> {
  if (!apiKey) {
    return [{ simulated: true, message: "HIBP API key required. Provide HIBP_API_KEY in environment." }];
  }
  try {
    const r = await fetch(
      `https://haveibeenpwned.com/api/v3/breachedaccount/${encodeURIComponent(email)}?truncateResponse=false`,
      { headers: { "hibp-api-key": apiKey, "User-Agent": "KaliGPT-OSINT/1.0" }, signal: AbortSignal.timeout(6000) }
    );
    if (r.status === 404) return [];
    if (!r.ok) return [{ error: `HIBP HTTP ${r.status}` }];
    return await r.json() as unknown[];
  } catch (e) { return [{ error: String(e) }]; }
}

// ── VirusTotal IP/Domain/URL ──────────────────────────────────────
async function virusTotalLookup(target: string, type: "ip" | "domain" | "url", apiKey?: string): Promise<unknown> {
  if (!apiKey) {
    return { simulated: true, message: "VT_API_KEY required.", target, type, stats: { malicious: 0, suspicious: 1, harmless: 60, undetected: 10 } };
  }
  try {
    let url = "";
    if (type === "ip") url = `https://www.virustotal.com/api/v3/ip_addresses/${encodeURIComponent(target)}`;
    else if (type === "domain") url = `https://www.virustotal.com/api/v3/domains/${encodeURIComponent(target)}`;
    else {
      const b64 = Buffer.from(target).toString("base64url");
      url = `https://www.virustotal.com/api/v3/urls/${b64}`;
    }
    const r = await fetch(url, { headers: { "x-apikey": apiKey }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return { error: `VT HTTP ${r.status}` };
    return await r.json();
  } catch (e) { return { error: String(e) }; }
}

// ── Shodan IP lookup ──────────────────────────────────────────────
async function shodanLookup(ip: string, apiKey?: string): Promise<unknown> {
  if (!apiKey) {
    return {
      simulated: true, ip,
      ports: [80, 443, 22, 8080, 8443],
      country_name: "محاكاة", org: "محاكاة",
      hostnames: [`host.${ip.replace(/\./g, "-")}.example.com`],
      vulns: ["CVE-2024-1234"], os: null, isp: "ISP محاكاة",
      tags: ["cdn", "self-signed"],
    };
  }
  try {
    const r = await fetch(
      `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${apiKey}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!r.ok) return { error: `Shodan HTTP ${r.status}` };
    return await r.json();
  } catch (e) { return { error: String(e) }; }
}

// ── Wayback Machine ───────────────────────────────────────────────
async function waybackLookup(domain: string): Promise<unknown> {
  try {
    const r = await fetch(
      `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}/*&output=json&limit=20&fl=timestamp,original,statuscode,mimetype&collapse=urlkey`,
      { signal: AbortSignal.timeout(10000) }
    );
    if (!r.ok) return { snapshots: [] };
    const data = await r.json() as unknown[][];
    const [headers, ...rows] = data;
    if (!headers) return { snapshots: [] };
    const hdr = headers as string[];
    return {
      snapshots: rows.slice(0, 20).map(row => {
        const r2 = row as string[];
        return Object.fromEntries(hdr.map((h, i) => [h, r2[i]]));
      }),
    };
  } catch (e) { return { error: String(e), snapshots: [] }; }
}

// ── IP Geolocation ────────────────────────────────────────────────
async function geoLookup(ip: string): Promise<unknown> {
  try {
    const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, { signal: AbortSignal.timeout(5000) });
    if (!r.ok) return {};
    return await r.json();
  } catch { return {}; }
}

// ── WHOIS via rdap ────────────────────────────────────────────────
async function whoisLookup(target: string): Promise<unknown> {
  try {
    const r = await fetch(`https://rdap.verisign.com/com/v1/domain/${encodeURIComponent(target)}`, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) {
      const r2 = await fetch(`https://rdap.org/domain/${encodeURIComponent(target)}`, { signal: AbortSignal.timeout(6000) });
      if (!r2.ok) return { error: `RDAP ${r2.status}` };
      return await r2.json();
    }
    return await r.json();
  } catch (e) { return { error: String(e) }; }
}

// ── AI Analysis ───────────────────────────────────────────────────
async function aiAnalyze(target: string, allData: Record<string, unknown>): Promise<string> {
  const summary = JSON.stringify(allData, null, 2).slice(0, 4000);
  return callOnce([
    {
      role: "system",
      content: `أنت محلل OSINT خبير متخصص في الأمن السيبراني. حلل البيانات المجمعة وقدم تقريراً احترافياً شاملاً.`,
    },
    {
      role: "user",
      content: `الهدف: ${target}\n\nالبيانات المجمعة:\n${summary}\n\nقدم تحليلاً شاملاً يشمل:\n1. ملخص تنفيذي\n2. الأصول المكتشفة\n3. نقاط الضعف المحتملة\n4. العلاقات بين الكيانات\n5. التوصيات الأمنية\n6. مستوى الخطر (منخفض/متوسط/عالٍ/حرج)\n\nاكتب بأسلوب احترافي وتقني.`,
    },
  ], { maxTokens: 2000 });
}

// ── MAIN SCAN ENDPOINT (SSE streaming) ───────────────────────────
router.post("/scan/stream", async (req: Request, res: Response): Promise<void> => {
  const {
    target, modules = [], apiKeys = {}
  } = req.body as {
    target: string;
    modules: string[];
    apiKeys: Record<string, string>;
  };

  if (!target?.trim()) { res.status(400).json({ error: "target required" }); return; }

  sseHeaders(res);
  sse(res, "start", { target, modules, ts: Date.now() });

  const results: Record<string, unknown> = {};
  const tasks: Array<{ id: string; fn: () => Promise<unknown> }> = [];

  if (modules.includes("dns")) {
    tasks.push({ id: "dns", fn: () => dnsLookup(target) });
  }
  if (modules.includes("crt")) {
    tasks.push({ id: "crt", fn: () => crtShLookup(target) });
  }
  if (modules.includes("hibp")) {
    tasks.push({ id: "hibp", fn: () => hibpLookup(target, apiKeys["hibp"] || process.env["HIBP_API_KEY"]) });
  }
  if (modules.includes("vt")) {
    const vtKey = apiKeys["vt"] || process.env["VT_API_KEY"];
    const type = target.match(/^\d+\.\d+\.\d+\.\d+$/) ? "ip" : target.includes("http") ? "url" : "domain";
    tasks.push({ id: "vt", fn: () => virusTotalLookup(target, type, vtKey) });
  }
  if (modules.includes("shodan")) {
    if (target.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      tasks.push({ id: "shodan", fn: () => shodanLookup(target, apiKeys["shodan"] || process.env["SHODAN_API_KEY"]) });
    } else {
      const dnsFirst = await dnsLookup(target);
      const aRecords = (dnsFirst["A"] as Array<{data?: string}> ?? []).map(r => r.data).filter(Boolean);
      if (aRecords[0]) {
        tasks.push({ id: "shodan", fn: () => shodanLookup(aRecords[0] as string, apiKeys["shodan"] || process.env["SHODAN_API_KEY"]) });
      }
    }
  }
  if (modules.includes("wayback")) {
    tasks.push({ id: "wayback", fn: () => waybackLookup(target) });
  }
  if (modules.includes("whois")) {
    tasks.push({ id: "whois", fn: () => whoisLookup(target) });
  }
  if (modules.includes("geo")) {
    const ip = target.match(/^\d+\.\d+\.\d+\.\d+$/) ? target : null;
    if (ip) tasks.push({ id: "geo", fn: () => geoLookup(ip) });
  }

  // Run all tasks in parallel, stream each result as it arrives
  await Promise.allSettled(
    tasks.map(async ({ id, fn }) => {
      sse(res, "module_start", { id, ts: Date.now() });
      try {
        const data = await fn();
        results[id] = data;
        sse(res, "module_done", { id, data, ts: Date.now() });
      } catch (err) {
        results[id] = { error: String(err) };
        sse(res, "module_error", { id, error: String(err), ts: Date.now() });
      }
    })
  );

  // AI Analysis
  sse(res, "ai_start", { ts: Date.now() });
  try {
    const analysis = await aiAnalyze(target, results);
    results["ai_analysis"] = analysis;
    sse(res, "ai_done", { analysis, ts: Date.now() });
  } catch (err) {
    sse(res, "ai_error", { error: String(err), ts: Date.now() });
  }

  sse(res, "complete", { results, ts: Date.now() });
  res.end();
});

// ── Quick DNS only ────────────────────────────────────────────────
router.post("/scan/dns", async (req: Request, res: Response): Promise<void> => {
  const { domain } = req.body as { domain: string };
  if (!domain) { res.status(400).json({ error: "domain required" }); return; }
  try {
    const data = await dnsLookup(domain);
    res.json({ domain, data });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── Quick crt.sh ──────────────────────────────────────────────────
router.post("/scan/crt", async (req: Request, res: Response): Promise<void> => {
  const { domain } = req.body as { domain: string };
  if (!domain) { res.status(400).json({ error: "domain required" }); return; }
  try {
    const certs = await crtShLookup(domain);
    res.json({ domain, certs });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

// ── Generate PDF report ───────────────────────────────────────────
router.post("/report/generate", async (req: Request, res: Response): Promise<void> => {
  const { target, results, analysis } = req.body as { target: string; results: unknown; analysis: string };
  try {
    const report = await callOnce([
      {
        role: "system",
        content: "أنت خبير OSINT وأمن سيبراني. أنشئ تقريراً احترافياً بصيغة Markdown.",
      },
      {
        role: "user",
        content: `أنشئ تقرير OSINT احترافي وشامل للهدف: ${target}\n\nالتحليل:\n${analysis}\n\nالبيانات:\n${JSON.stringify(results, null, 2).slice(0, 3000)}\n\nالتقرير يجب أن يشمل:\n- غلاف التقرير مع التاريخ\n- ملخص تنفيذي\n- منهجية الفحص\n- النتائج التفصيلية لكل وحدة\n- خريطة البنية التحتية\n- نقاط الضعف والمخاطر\n- التوصيات والحلول\n- المراجع والمصادر`,
      },
    ], { maxTokens: 3000 });
    res.json({ report, target, generatedAt: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: String(err) }); }
});

export default router;
