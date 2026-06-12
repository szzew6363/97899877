import { Router } from "express";
import { logger } from "../lib/logger";

const router = Router();

router.get("/local-proxy/ping", async (req, res) => {
  const raw = typeof req.query.endpoint === "string" ? req.query.endpoint.trim() : "";
  if (!raw) return res.status(400).json({ error: "endpoint required" });

  const url = raw.replace(/\/$/, "");
  const allowed = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
  try {
    const parsed = new URL(url);
    if (!allowed.some((h) => parsed.hostname === h) && !parsed.hostname.startsWith("192.168.") && !parsed.hostname.startsWith("10.")) {
      return res.status(403).json({ error: "Only local endpoints are allowed." });
    }
  } catch {
    return res.status(400).json({ error: "Invalid endpoint URL." });
  }

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 4000);
    const resp = await fetch(`${url}/models`, { signal: controller.signal });
    clearTimeout(tid);
    if (!resp.ok) return res.json({ ok: false, status: resp.status });
    const data = (await resp.json()) as { data?: Array<{ id: string }> };
    const models: string[] = (data?.data ?? []).map((m: { id: string }) => m.id).filter(Boolean);
    return res.json({ ok: true, models });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unreachable";
    return res.json({ ok: false, error: msg });
  }
});

router.post("/local-proxy/chat", async (req, res) => {
  const { endpoint, model, messages, stream = true } = req.body as {
    endpoint?: string;
    model?: string;
    messages?: Array<{ role: string; content: string }>;
    stream?: boolean;
  };

  if (!endpoint || !model || !Array.isArray(messages)) {
    return res.status(400).json({ error: "endpoint, model and messages are required" });
  }

  const base = endpoint.replace(/\/$/, "");
  const allowed = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
  try {
    const parsed = new URL(base);
    if (!allowed.some((h) => parsed.hostname === h) && !parsed.hostname.startsWith("192.168.") && !parsed.hostname.startsWith("10.")) {
      return res.status(403).json({ error: "Only local endpoints are allowed." });
    }
  } catch {
    return res.status(400).json({ error: "Invalid endpoint URL." });
  }

  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 120_000);

    const upstream = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: "Bearer ollama" },
      body: JSON.stringify({ model, messages, stream }),
      signal: controller.signal,
    });

    clearTimeout(tid);

    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text().catch(() => "");
      logger.warn({ status: upstream.status, txt }, "local-proxy upstream error");
      return res.status(upstream.status).json({ error: `Upstream error ${upstream.status}: ${txt.slice(0, 200)}` });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    } finally {
      reader.releaseLock();
    }
    return res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "proxy error";
    logger.error({ err }, "local-proxy error");
    if (!res.headersSent) {
      return void res.status(502).json({ error: msg });
    }
    return res.end();
  }
});

export default router;
