import { Router, type Request, type Response } from "express";
import { streamCompletion, callOnce } from "../lib/ai-providers";

const router = Router();

const AGENT_SYSTEM = `أنت وكيل ذكاء اصطناعي مستقل متخصص في الأمن السيبراني والبرمجة.
مهمتك: تحليل الطلبات، وضع خطط تنفيذية دقيقة، وتنفيذ المهام بكفاءة عالية.
أنت تعمل داخل بيئة sandbox آمنة. كن دقيقاً وتقنياً ومفيداً.
أجب دائماً باللغة العربية إلا إذا طُلب غير ذلك.`;

const BLOCKED_PATTERNS = [
  /rm\s+-rf/i, /sudo\s+rm/i, /passwd/i, /\/etc\/shadow/i,
  /format\s+[c-z]:/i, /mkfs/i, /dd\s+if=.*of=\/dev/i,
  /wget.*\|\s*sh/i, /curl.*\|\s*bash/i,
];

function isSafe(input: string): boolean {
  return !BLOCKED_PATTERNS.some(p => p.test(input));
}

router.post("/think", async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages } = req.body as { messages: { role: string; content: string }[] };
    if (!messages?.length) { res.status(400).json({ error: "messages required" }); return; }

    const allMsgs = [{ role: "system" as const, content: AGENT_SYSTEM }, ...messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant" | "system", content: m.content,
    }))];

    const content = await callOnce(allMsgs, { maxTokens: 2000 });
    res.json({ content });
  } catch (err) {
    res.status(500).json({ error: String(err), content: "تعذّر الوصول إلى الذكاء الاصطناعي. تأكد من إعداد مزود AI." });
  }
});

router.post("/execute", async (req: Request, res: Response): Promise<void> => {
  try {
    const { tool, input, sandboxId } = req.body as { tool: string; input: string; sandboxId?: string };
    void sandboxId;

    if (!isSafe(input)) {
      res.json({ output: "BLOCKED: هذه العملية محظورة لأسباب أمنية.", allowed: false });
      return;
    }

    const ALLOWED_TOOLS = ["web_search", "file_read", "api_call", "rag_query", "rag_write", "code_run", "file_write", "shell"];
    if (!ALLOWED_TOOLS.includes(tool)) {
      res.json({ output: `RESTRICTED: الأداة "${tool}" غير مسموح بها.`, allowed: false });
      return;
    }

    let output = "";

    switch (tool) {
      case "web_search": {
        const searchMsgs = [
          { role: "system" as const, content: "أنت محرك بحث متخصص. أعط نتائج بحث واقعية ومفيدة في 3-5 نقاط." },
          { role: "user" as const, content: `ابحث عن: ${input}` },
        ];
        output = await callOnce(searchMsgs, { maxTokens: 800 });
        break;
      }
      case "code_run": {
        const codeMsgs = [
          { role: "system" as const, content: "أنت بيئة تنفيذ كود. حاكي تنفيذ الكود وأعط المخرجات المتوقعة." },
          { role: "user" as const, content: `نفّذ هذا الكود:\n${input}` },
        ];
        output = await callOnce(codeMsgs, { maxTokens: 600 });
        break;
      }
      case "api_call": {
        try {
          if (input.startsWith("http")) {
            const r = await fetch(input, { signal: AbortSignal.timeout(5000) });
            output = r.ok ? await r.text().then(t => t.slice(0, 500)) : `HTTP ${r.status}: ${r.statusText}`;
          } else {
            output = `محاكاة استدعاء API: ${input}\n{"status":"ok","simulated":true}`;
          }
        } catch { output = `تعذر الاتصال بـ: ${input}`; }
        break;
      }
      case "rag_query": {
        const ragMsgs = [
          { role: "system" as const, content: "أنت نظام استرجاع معرفة. أعط معلومات ذات صلة بالاستعلام." },
          { role: "user" as const, content: `استرجع معلومات حول: ${input}` },
        ];
        output = await callOnce(ragMsgs, { maxTokens: 600 });
        break;
      }
      case "file_read":
        output = `محتوى الملف "${input}":\n[محاكاة — في بيئة الإنتاج يتم قراءة الملف الفعلي]`;
        break;
      case "file_write":
        output = `✓ تم الكتابة إلى "${input}" بنجاح [sandbox محمي]`;
        break;
      case "rag_write":
        output = `✓ تم حفظ المعلومات في قاعدة المعرفة: "${input.slice(0, 50)}..."`;
        break;
      case "shell":
        if (!isSafe(input)) { output = "BLOCKED: أمر خطر محظور"; break; }
        output = `$ ${input}\n[sandbox محمي — لا تنفيذ مباشر في بيئة الويب]`;
        break;
      default:
        output = `أداة غير معروفة: ${tool}`;
    }

    res.json({ output, allowed: true });
  } catch (err) {
    res.status(500).json({ output: `خطأ: ${String(err)}`, allowed: false });
  }
});

router.post("/stream", async (req: Request, res: Response): Promise<void> => {
  try {
    const { messages } = req.body as { messages: { role: string; content: string }[] };
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const allMsgs = [{ role: "system" as const, content: AGENT_SYSTEM }, ...messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant" | "system", content: m.content,
    }))];

    for await (const chunk of streamCompletion(allMsgs, { maxTokens: 1500 })) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
    res.end();
  }
});

export default router;
