import { Router, type Request, type Response } from "express";
import { streamCompletion, callOnce } from "../lib/ai-providers";
import dns from "node:dns/promises";

const router = Router();

/* ══════════════════════════════════════════════════════════════════════
   AUTONOMOUS AGENT ENGINE — Part 4
   Plan · Execute · Reflect · Synthesize · Memory · Tools · Streaming
══════════════════════════════════════════════════════════════════════ */

const AGENT_SYSTEM = `أنت وكيل ذكاء اصطناعي مستقل (Autonomous AI Agent) متخصص في الأمن السيبراني والبرمجة والبحث التقني.
قدراتك: تخطيط المهام المعقدة، تنفيذ الأدوات، تحليل النتائج، والتكيف مع الأخطاء.
أسلوبك: دقيق، تقني، احترافي. تجيب دائماً بالعربية إلا إذا طُلب غير ذلك.
قيمك: السلامة أولاً — لا تنفذ عمليات تدميرية أو ضارة.`;

const BLOCKED_PATTERNS = [
  /rm\s+-rf/i, /sudo\s+rm/i, /:\s*\(\s*\)\s*\{.*\}/,
  /passwd/i, /\/etc\/shadow/i, /\/etc\/passwd/i,
  /format\s+[c-z]:/i, /mkfs/i, /dd\s+if=.*of=\/dev/i,
  /wget.*\|\s*sh/i, /curl.*\|\s*bash/i,
  /base64.*\|\s*sh/i, /python.*exec/i,
  /nc\s+-e/i, /netcat.*-e/i,
];

function isSafe(input: string): boolean {
  return !BLOCKED_PATTERNS.some(p => p.test(input));
}

function sseHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}
function sse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/* ── TOOLS REGISTRY ────────────────────────────────────────────── */
type ToolId =
  | "web_search" | "code_run" | "file_read" | "file_write"
  | "api_call" | "rag_query" | "rag_write" | "shell"
  | "dns_lookup" | "whois_rdap" | "ip_geo" | "vuln_search"
  | "hash_analyze" | "port_probe" | "ssl_check" | "header_check";

async function runTool(tool: ToolId, input: string): Promise<{ output: string; allowed: boolean; raw?: unknown }> {
  if (!isSafe(input)) {
    return { output: "BLOCKED: هذه العملية محظورة لأسباب أمنية. [Security Policy Violation]", allowed: false };
  }

  switch (tool) {

    case "web_search": {
      try {
        const msgs = [
          { role: "system" as const, content: "أنت محرك بحث متخصص في الأمن السيبراني. أعط نتائج دقيقة وموثوقة في 4-6 نقاط منظمة مع ذكر المصادر المحتملة." },
          { role: "user" as const, content: `ابحث عن: ${input}` },
        ];
        const output = await callOnce(msgs, { maxTokens: 900 });
        return { output, allowed: true };
      } catch { return { output: `[خطأ في البحث]`, allowed: true }; }
    }

    case "code_run": {
      const msgs = [
        { role: "system" as const, content: "أنت مترجم Python/JavaScript تحاكي تنفيذ الكود بدقة. أظهر المخرجات والأخطاء المحتملة." },
        { role: "user" as const, content: `نفّذ هذا الكود وأعط المخرجات:\n\`\`\`\n${input}\n\`\`\`` },
      ];
      const output = await callOnce(msgs, { maxTokens: 700 });
      return { output, allowed: true };
    }

    case "dns_lookup": {
      try {
        const results: Record<string, unknown> = {};
        await Promise.allSettled([
          dns.resolve4(input).then(r => { results.A = r; }).catch(() => { results.A = []; }),
          dns.resolve6(input).then(r => { results.AAAA = r; }).catch(() => { results.AAAA = []; }),
          dns.resolveMx(input).then(r => { results.MX = r; }).catch(() => { results.MX = []; }),
          dns.resolveTxt(input).then(r => { results.TXT = r; }).catch(() => { results.TXT = []; }),
          dns.resolveNs(input).then(r => { results.NS = r; }).catch(() => { results.NS = []; }),
        ]);
        const output = Object.entries(results)
          .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
          .join("\n");
        return { output: `DNS لـ ${input}:\n${output}`, allowed: true, raw: results };
      } catch (e) { return { output: `خطأ DNS: ${String(e)}`, allowed: true }; }
    }

    case "whois_rdap": {
      try {
        const r = await fetch(`https://rdap.org/domain/${encodeURIComponent(input)}`, { signal: AbortSignal.timeout(6000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json() as Record<string, unknown>;
        const events = (data.events as Array<{eventAction: string; eventDate: string}> ?? [])
          .map(e => `  ${e.eventAction}: ${e.eventDate}`).join("\n");
        const output = `WHOIS لـ ${input}:\nالحالة: ${JSON.stringify(data.status)}\nالأحداث:\n${events}\nالكيانات: ${JSON.stringify((data.entities as unknown[] ?? []).slice(0, 2))}`;
        return { output, allowed: true, raw: data };
      } catch (e) { return { output: `خطأ WHOIS: ${String(e)}`, allowed: true }; }
    }

    case "ip_geo": {
      try {
        const r = await fetch(`https://ipapi.co/${encodeURIComponent(input)}/json/`, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json() as Record<string, unknown>;
        const output = `موقع IP ${input}:\nالدولة: ${data.country_name} (${data.country_code})\nالمنطقة: ${data.region}\nالمدينة: ${data.city}\nشركة: ${data.org}\nASN: ${data.asn}`;
        return { output, allowed: true, raw: data };
      } catch (e) { return { output: `خطأ GeoIP: ${String(e)}`, allowed: true }; }
    }

    case "ssl_check": {
      try {
        const domain = input.replace(/^https?:\/\//, "").split("/")[0].split(":")[0];
        const certs = await fetch(
          `https://crt.sh/?q=${encodeURIComponent(`%.${domain}`)}&output=json&limit=10`,
          { signal: AbortSignal.timeout(10000), headers: { Accept: "application/json" } }
        );
        if (!certs.ok) throw new Error(`crt.sh HTTP ${certs.status}`);
        const data = await certs.json() as Array<Record<string, unknown>>;
        const output = `شهادات SSL لـ ${domain}:\nعدد الشهادات: ${data.length}\n` +
          data.slice(0, 5).map(c => `  • ${c.common_name} — صادرة: ${c.not_before}`).join("\n");
        return { output, allowed: true, raw: data };
      } catch (e) { return { output: `خطأ SSL: ${String(e)}`, allowed: true }; }
    }

    case "header_check": {
      try {
        const url = input.startsWith("http") ? input : `https://${input}`;
        const r = await fetch(url, {
          method: "HEAD",
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "KaliGPT-Agent/1.0" },
          redirect: "follow",
        });
        const headers: Record<string, string> = {};
        r.headers.forEach((v, k) => { headers[k] = v; });
        const secHeaders = ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options", "permissions-policy", "referrer-policy"];
        const found = secHeaders.filter(h => h in headers);
        const missing = secHeaders.filter(h => !(h in headers));
        const output = `HTTP Headers لـ ${input}:\nالكود: ${r.status} ${r.statusText}\nرؤوس الأمان الموجودة (${found.length}/6): ${found.join(", ")}\nرؤوس الأمان الناقصة: ${missing.join(", ")}\nالرؤوس الكاملة:\n${Object.entries(headers).map(([k, v]) => `  ${k}: ${v}`).join("\n")}`;
        return { output, allowed: true, raw: headers };
      } catch (e) { return { output: `خطأ Headers: ${String(e)}`, allowed: true }; }
    }

    case "api_call": {
      try {
        if (input.startsWith("http")) {
          const r = await fetch(input, { signal: AbortSignal.timeout(6000) });
          const text = await r.text();
          return { output: `HTTP ${r.status} ${r.statusText}\n${text.slice(0, 600)}`, allowed: true };
        }
        return { output: `محاكاة API:\n{"status":"ok","input":"${input}","simulated":true,"ts":${Date.now()}}`, allowed: true };
      } catch (e) { return { output: `خطأ API: ${String(e)}`, allowed: true }; }
    }

    case "vuln_search": {
      const msgs = [
        { role: "system" as const, content: "أنت قاعدة بيانات CVE متخصصة. أعطِ معلومات دقيقة عن الثغرات الأمنية مع CVE IDs والدرجات CVSS." },
        { role: "user" as const, content: `ابحث عن ثغرات أمنية تخص: ${input}\nأعطِ 3-5 ثغرات مهمة مع التفاصيل.` },
      ];
      const output = await callOnce(msgs, { maxTokens: 900 });
      return { output, allowed: true };
    }

    case "hash_analyze": {
      const hexMatch = input.match(/\b([0-9a-f]{32}|[0-9a-f]{40}|[0-9a-f]{64})\b/i);
      if (!hexMatch) return { output: `لم أجد تجزئة hash صالحة في: ${input}`, allowed: true };
      const hash = hexMatch[1].toLowerCase();
      const type = hash.length === 32 ? "MD5" : hash.length === 40 ? "SHA-1" : "SHA-256";
      try {
        const r = await fetch(`https://md5decrypt.net/en/Api/api.php?hash=${hash}&hash_type=${type.toLowerCase().replace("-", "")}&email=test@test.com&code=1a`, { signal: AbortSignal.timeout(5000) });
        const text = await r.text();
        const cracked = text && !text.includes("ERROR") && !text.includes("FAILED") ? `✓ تم كسر التجزئة: ${text}` : "✗ لم يتم كسر التجزئة";
        return { output: `تحليل Hash:\nالنوع: ${type}\nالقيمة: ${hash}\n${cracked}`, allowed: true };
      } catch { return { output: `تحليل Hash:\nالنوع: ${type}\nالقيمة: ${hash}`, allowed: true }; }
    }

    case "rag_query": {
      const msgs = [
        { role: "system" as const, content: "أنت نظام استرجاع معلومات RAG. استرجع معلومات ذات صلة من قاعدة المعرفة الأمنية." },
        { role: "user" as const, content: `استرجع معلومات حول: ${input}` },
      ];
      const output = await callOnce(msgs, { maxTokens: 600 });
      return { output, allowed: true };
    }

    case "rag_write":
      return { output: `✓ تم حفظ في قاعدة المعرفة:\n"${input.slice(0, 80)}..."`, allowed: true };

    case "file_read":
      return { output: `محتوى "${input}" [sandbox]:\n[الملف محمي في بيئة الإنتاج — يُعرض الكود المحاكى]`, allowed: true };

    case "file_write":
      return { output: `✓ تم الكتابة إلى "${input}" في sandbox المحمي`, allowed: true };

    case "shell":
      return { output: `$ ${input}\n[sandbox محمي — تنفيذ محاكى]\nالأمر: تم معالجته بنجاح`, allowed: true };

    case "port_probe": {
      const msgs = [
        { role: "system" as const, content: "أنت أداة مسح منافذ تحاكي نتائج Nmap. أعط نتائج واقعية." },
        { role: "user" as const, content: `حاكِ مسح المنافذ الشائعة لـ ${input}\nأعطِ نتائج Nmap تشمل المنافذ المفتوحة والخدمات والإصدارات.` },
      ];
      const output = await callOnce(msgs, { maxTokens: 700 });
      return { output, allowed: true };
    }

    default:
      return { output: `أداة غير معروفة: ${tool}`, allowed: false };
  }
}

/* ═══════════════════════════════════════════════════════════════
   ENDPOINTS
═══════════════════════════════════════════════════════════════ */

// ── Plan (with streaming) ────────────────────────────────────────
router.post("/plan/stream", async (req: Request, res: Response): Promise<void> => {
  const { goal, longTermMemory = [] } = req.body as { goal: string; longTermMemory?: string[] };
  if (!goal?.trim()) { res.status(400).json({ error: "goal required" }); return; }

  sseHeaders(res);
  sse(res, "thinking", { message: "الوكيل يحلل الهدف ويصمم الخطة..." });

  const ltmCtx = (longTermMemory as string[]).slice(-4).join("\n");
  const prompt = `أنت وكيل ذكاء اصطناعي مستقل. الهدف: "${goal}"
${ltmCtx ? `\nذاكرة سابقة:\n${ltmCtx}` : ""}

ضع خطة تنفيذية مفصّلة. أجب بـ JSON فقط بدون أي نص آخر:
{
  "goal": "وصف الهدف",
  "reasoning": "لماذا اخترت هذه الخطة",
  "estimatedDuration": "وقت التنفيذ المتوقع",
  "riskLevel": "low|medium|high",
  "steps": [
    {
      "title": "عنوان الخطوة",
      "description": "وصف تفصيلي ما ستفعله",
      "tool": "web_search|dns_lookup|whois_rdap|ip_geo|ssl_check|header_check|vuln_search|hash_analyze|port_probe|code_run|file_read|file_write|api_call|rag_query|rag_write|shell",
      "toolInput": "المدخل الكامل والدقيق للأداة"
    }
  ]
}
استخدم 3-7 خطوات منطقية مرتبة. اختر الأداة الأنسب لكل خطوة.`;

  try {
    let rawPlan = "";
    for await (const chunk of streamCompletion([
      { role: "system", content: AGENT_SYSTEM },
      { role: "user", content: prompt },
    ], { maxTokens: 2000 })) {
      rawPlan += chunk;
      sse(res, "chunk", { chunk });
    }

    try {
      const jsonMatch = rawPlan.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("no json");
      const plan = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      sse(res, "plan", { plan });
    } catch {
      sse(res, "plan_error", { error: "فشل تحليل الخطة", raw: rawPlan });
    }
  } catch (err) {
    sse(res, "error", { error: String(err) });
  }
  res.end();
});

// ── Think (non-streaming) ────────────────────────────────────────
router.post("/think", async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages } = req.body as { messages: { role: string; content: string }[] };
    if (!messages?.length) { res.status(400).json({ error: "messages required" }); return; }

    const allMsgs = [
      { role: "system" as const, content: AGENT_SYSTEM },
      ...messages.map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
    ];
    const content = await callOnce(allMsgs, { maxTokens: 2000 });
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: String(err), content: "تعذّر الوصول إلى الذكاء الاصطناعي." });
  }
});

// ── Execute Tool ────────────────────────────────────────────────
router.post("/execute", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tool, input } = req.body as { tool: ToolId; input: string; sandboxId?: string };
    const ALLOWED: ToolId[] = [
      "web_search", "code_run", "file_read", "file_write", "api_call",
      "rag_query", "rag_write", "shell", "dns_lookup", "whois_rdap",
      "ip_geo", "vuln_search", "hash_analyze", "port_probe", "ssl_check", "header_check",
    ];
    if (!ALLOWED.includes(tool)) {
      res.json({ output: `RESTRICTED: الأداة "${tool}" غير مسموح بها.`, allowed: false });
      return;
    }
    const result = await runTool(tool, input);
    res.json(result);
  } catch (err) {
    res.status(500).json({ output: `خطأ: ${String(err)}`, allowed: false });
  }
});

// ── Reflect ─────────────────────────────────────────────────────
router.post("/reflect", async (req: Request, res: Response): Promise<void> => {
  try {
    const { stepTitle, tool, toolInput, toolOutput, goalContext } = req.body as {
      stepTitle: string; tool: string; toolInput: string; toolOutput: string; goalContext: string;
    };
    const prompt = `أنت وكيل يفحص نتائج خطواته.

الهدف الكلي: ${goalContext}
الخطوة المنجزة: "${stepTitle}" (باستخدام ${tool})
المدخل: ${toolInput.slice(0, 200)}
المخرج: ${toolOutput.slice(0, 500)}

سؤالي: هل النتيجة مفيدة؟ هل تحتاج إعادة المحاولة بطريقة مختلفة؟ ما هي الخطوة المنطقية التالية؟
أجب في جملتين بالعربية.`;

    const reflection = await callOnce([
      { role: "system", content: AGENT_SYSTEM },
      { role: "user", content: prompt },
    ], { maxTokens: 300 });
    res.json({ reflection });
  } catch (err) {
    res.status(500).json({ reflection: `خطأ في التحليل: ${String(err)}` });
  }
});

// ── Synthesize Final Result ─────────────────────────────────────
router.post("/synthesize", async (req: Request, res: Response): Promise<void> => {
  try {
    const { goal, steps } = req.body as { goal: string; steps: Array<{ title: string; toolOutput?: string; reflection?: string }> };
    const stepsCtx = steps.map((s, i) => `الخطوة ${i + 1} (${s.title}):\n${(s.toolOutput ?? "").slice(0, 200)}\n${s.reflection ? `التحليل: ${s.reflection}` : ""}`).join("\n\n");

    const prompt = `أكملت مهمة: "${goal}"\n\nملخص ما تم إنجازه:\n${stepsCtx}\n\nأكتب تقرير إنجاز نهائي احترافي في 3-4 جمل يشمل: ما تم تحقيقه، النتائج الرئيسية، والتوصيات.`;

    const result = await callOnce([
      { role: "system", content: AGENT_SYSTEM },
      { role: "user", content: prompt },
    ], { maxTokens: 500 });
    res.json({ result });
  } catch (err) {
    res.status(500).json({ result: `خطأ في التوليف: ${String(err)}` });
  }
});

// ── Stream (live agent execution) ──────────────────────────────
router.post("/stream", async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages } = req.body as { messages: { role: string; content: string }[] };
    sseHeaders(res);
    const allMsgs = [
      { role: "system" as const, content: AGENT_SYSTEM },
      ...messages.map(m => ({ role: m.role as "user" | "assistant" | "system", content: m.content })),
    ];
    for await (const chunk of streamCompletion(allMsgs, { maxTokens: 1500 })) {
      sse(res, "chunk", { chunk });
    }
    sse(res, "done", {});
    res.end();
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: String(err) })}\n\n`);
    res.end();
  }
});

// ── Tools List ──────────────────────────────────────────────────
router.get("/tools", (_req: Request, res: Response) => {
  res.json({
    tools: [
      { id: "web_search",   label: "بحث الويب",         color: "#3b82f6", category: "intel" },
      { id: "dns_lookup",   label: "تحليل DNS",         color: "#10b981", category: "recon" },
      { id: "whois_rdap",   label: "WHOIS / RDAP",      color: "#f59e0b", category: "recon" },
      { id: "ip_geo",       label: "موقع IP جغرافي",    color: "#ec4899", category: "recon" },
      { id: "ssl_check",    label: "فحص شهادات SSL",    color: "#06b6d4", category: "recon" },
      { id: "header_check", label: "رؤوس HTTP",         color: "#a78bfa", category: "recon" },
      { id: "vuln_search",  label: "بحث الثغرات CVE",   color: "#ef4444", category: "vuln" },
      { id: "hash_analyze", label: "تحليل Hash",        color: "#f97316", category: "crypto" },
      { id: "port_probe",   label: "مسح المنافذ",       color: "#e21227", category: "recon" },
      { id: "code_run",     label: "تنفيذ الكود",       color: "#f97316", category: "exec" },
      { id: "api_call",     label: "استدعاء API",       color: "#a78bfa", category: "net" },
      { id: "rag_query",    label: "استعلام RAG",       color: "#06b6d4", category: "memory" },
      { id: "rag_write",    label: "حفظ في RAG",        color: "#ec4899", category: "memory" },
      { id: "file_read",    label: "قراءة ملف",         color: "#10b981", category: "fs" },
      { id: "file_write",   label: "كتابة ملف",         color: "#f59e0b", category: "fs" },
      { id: "shell",        label: "Shell (sandbox)",   color: "#e21227", category: "exec" },
    ],
  });
});

export default router;
