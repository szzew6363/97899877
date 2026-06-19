import { Router } from "express";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
const router = Router();

const OLLAMA_BASE = process.env.OLLAMA_HOST || "http://localhost:11434";
const OLLAMA_BIN  = process.env.OLLAMA_BIN  || "/home/runner/.ollama-bin/ollama";

async function ollamaFetch(endpoint: string, options?: RequestInit) {
  const url = `${OLLAMA_BASE}${endpoint}`;
  const res  = await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) });
  return res;
}

function isOllamaRunning(): Promise<boolean> {
  return ollamaFetch("/api/tags")
    .then(r => r.ok)
    .catch(() => false);
}

router.get("/ollama/status", async (_req, res) => {
  try {
    const running = await isOllamaRunning();
    if (!running) return res.json({ running: false, models: [], version: null });
    const [tagsRes, versionRes] = await Promise.all([
      ollamaFetch("/api/tags"),
      ollamaFetch("/api/version"),
    ]);
    const tags    = await tagsRes.json() as { models?: unknown[] };
    const version = await versionRes.json() as { version?: string };
    return res.json({ running: true, models: tags.models ?? [], version: version.version ?? null });
  } catch {
    return res.json({ running: false, models: [], version: null });
  }
});

router.get("/ollama/models", async (_req, res) => {
  try {
    const r = await ollamaFetch("/api/tags");
    if (!r.ok) return res.status(503).json({ error: "Ollama not available" });
    const data = await r.json();
    return res.json(data);
  } catch {
    return res.status(503).json({ error: "Ollama not reachable" });
  }
});

router.get("/ollama/ps", async (_req, res) => {
  try {
    const r = await ollamaFetch("/api/ps");
    if (!r.ok) return res.json({ models: [] });
    const data = await r.json();
    return res.json(data);
  } catch {
    return res.json({ models: [] });
  }
});

router.post("/ollama/pull", async (req, res) => {
  const { model } = req.body as { model?: string };
  if (!model) return res.status(400).json({ error: "model required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const r = await fetch(`${OLLAMA_BASE}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model, stream: true }),
      signal: AbortSignal.timeout(600_000),
    });

    if (!r.body) { res.end(); return res; }

    const reader = r.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(`data: ${chunk}\n\n`);
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
  }
  res.end();
  return res;
});

router.post("/ollama/delete", async (req, res) => {
  const { model } = req.body as { model?: string };
  if (!model) return res.status(400).json({ error: "model required" });
  try {
    const r = await ollamaFetch("/api/delete", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model }),
    });
    return res.status(r.status).json({ ok: r.ok });
  } catch {
    return res.status(503).json({ error: "Ollama not reachable" });
  }
});

router.post("/ollama/chat", async (req, res) => {
  const { model, messages, stream } = req.body as {
    model?: string;
    messages?: unknown[];
    stream?: boolean;
  };
  if (!model || !messages) return res.status(400).json({ error: "model and messages required" });

  if (stream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    try {
      const r = await fetch(`${OLLAMA_BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: true }),
        signal: AbortSignal.timeout(120_000),
      });
      if (!r.body) { res.end(); return res; }
      const reader  = r.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(`data: ${decoder.decode(value, { stream: true })}\n\n`);
      }
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: String(err) })}\n\n`);
    }
    res.end();
    return res;
  }

  try {
    const r = await ollamaFetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false }),
    });
    const data = await r.json();
    return res.json(data);
  } catch {
    return res.status(503).json({ error: "Ollama not reachable" });
  }
});

router.post("/ollama/generate", async (req, res) => {
  const { model, prompt, stream } = req.body as { model?: string; prompt?: string; stream?: boolean };
  if (!model || !prompt) return res.status(400).json({ error: "model and prompt required" });

  try {
    const r = await ollamaFetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, prompt, stream: stream ?? false }),
    });
    const data = await r.json();
    return res.json(data);
  } catch {
    return res.status(503).json({ error: "Ollama not reachable" });
  }
});

router.post("/ollama/start", async (_req, res) => {
  const running = await isOllamaRunning();
  if (running) return res.json({ ok: true, already: true });

  const binExists = fs.existsSync(OLLAMA_BIN);
  if (!binExists) return res.status(404).json({ ok: false, error: "Ollama not installed. Run install first." });

  spawn(OLLAMA_BIN, ["serve"], {
    detached: true,
    stdio: "ignore",
    env: { ...process.env, HOME: "/home/runner" },
  }).unref();

  await new Promise(r => setTimeout(r, 3000));
  const nowRunning = await isOllamaRunning();
  return res.json({ ok: nowRunning, started: true });
});

router.post("/ollama/install", async (_req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");

  const send = (msg: string) => res.write(`data: ${JSON.stringify({ msg })}\n\n`);

  // If already running just report success
  if (await isOllamaRunning()) {
    send("🟢 Ollama is already running!");
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    return res;
  }

  // If binary exists, just start it
  if (fs.existsSync(OLLAMA_BIN)) {
    send("✅ Binary found — starting Ollama...");
    spawn(OLLAMA_BIN, ["serve"], {
      detached: true, stdio: "ignore",
      env: { ...process.env, HOME: "/home/runner" },
    }).unref();
    await new Promise(r => setTimeout(r, 3000));
    const running = await isOllamaRunning();
    send(running ? "🟢 Ollama is running!" : "⚠️  Server didn't respond — check /tmp/ollama.log");
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
    return res;
  }

  try {
    send("📦 Installing Ollama v0.30.10...");
    const dir = path.dirname(OLLAMA_BIN);
    await execAsync(`mkdir -p ${dir}`);

    send("⬇️  Downloading tar.zst archive (~500 MB — may take 2-3 min)...");
    const VERSION = "v0.30.10";
    const URL = `https://github.com/ollama/ollama/releases/download/${VERSION}/ollama-linux-amd64.tar.zst`;
    const TMP = `/tmp/ollama-install-${Date.now()}`;

    await execAsync(`mkdir -p ${TMP}`, { timeout: 5_000 });
    await execAsync(
      `curl -fL --progress-bar "${URL}" -o "${TMP}/ollama.tar.zst"`,
      { timeout: 300_000 }
    );

    send("📦 Extracting archive...");
    await execAsync(
      `cd "${TMP}" && tar --use-compress-program=zstd -xf ollama.tar.zst`,
      { timeout: 60_000 }
    );

    const { stdout } = await execAsync(`find "${TMP}" -name "ollama" -type f | head -1`);
    const found = stdout.trim();
    if (!found) throw new Error("Binary not found inside archive");

    await execAsync(`cp "${found}" "${OLLAMA_BIN}" && chmod +x "${OLLAMA_BIN}" && rm -rf "${TMP}"`);
    send("✅ Ollama installed!");

    send("🚀 Starting Ollama server...");
    spawn(OLLAMA_BIN, ["serve"], {
      detached: true, stdio: "ignore",
      env: { ...process.env, HOME: "/home/runner" },
    }).unref();
    await new Promise(r => setTimeout(r, 3000));
    const running = await isOllamaRunning();
    send(running ? "🟢 Ollama is running on :11434!" : "⚠️  Server didn't respond. Try refreshing.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    send(`❌ Install failed: ${msg}`);
    send("💡 Tip: Use Hugging Face Spaces tab for 24/7 GPU-powered Ollama instead.");
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
  return res;
});

router.get("/ollama/show/:model", async (req, res) => {
  const { model } = req.params;
  try {
    const r = await ollamaFetch("/api/show", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model }),
    });
    const data = await r.json();
    return res.json(data);
  } catch {
    return res.status(503).json({ error: "Ollama not reachable" });
  }
});

export default router;
