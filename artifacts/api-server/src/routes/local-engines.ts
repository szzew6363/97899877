import { Router } from "express";
import { exec, spawn } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execAsync = promisify(exec);
const router = Router();

const ENGINES = [
  { id: "ollama",         label: "Ollama",         port: 11434, base: "http://localhost:11434", apiPath: "/api/tags",    modelsKey: "models", idKey: "name",  canInstall: true  },
  { id: "lmstudio",      label: "LM Studio",      port: 1234,  base: "http://localhost:1234",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: false },
  { id: "jan",           label: "Jan",             port: 1337,  base: "http://localhost:1337",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: false },
  { id: "textgenwebui",  label: "text-gen-webui",  port: 5000,  base: "http://localhost:5000",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: false },
  { id: "gpt4all",       label: "GPT4All",         port: 4891,  base: "http://localhost:4891",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: false },
  { id: "llamafile",     label: "Llamafile",       port: 8081,  base: "http://localhost:8081",  apiPath: "/v1/models",   modelsKey: "data",   idKey: "id",    canInstall: true  },
  { id: "kobold",        label: "KoboldCPP",       port: 5001,  base: "http://localhost:5001",  apiPath: "/api/v1/model",modelsKey: null,     idKey: "result",canInstall: true  },
] as const;

type EngineId = typeof ENGINES[number]["id"];

interface EngineStatus {
  id: EngineId;
  label: string;
  port: number;
  online: boolean;
  latencyMs: number | null;
  models: string[];
  version: string | null;
  canInstall: boolean;
  installAvailable: boolean;
}

const WORKSPACE = process.cwd();
const BIN_DIR   = path.join(WORKSPACE, ".local-engines");

async function pingEngine(eng: typeof ENGINES[number]): Promise<EngineStatus> {
  const t0 = Date.now();
  try {
    const ctrl = new AbortController();
    const tid  = setTimeout(() => ctrl.abort(), 4000);
    const resp = await fetch(`${eng.base}${eng.apiPath}`, { signal: ctrl.signal });
    clearTimeout(tid);
    const latencyMs = Date.now() - t0;

    if (!resp.ok) return base(eng, false, latencyMs, [], null);

    let models: string[] = [];
    let version: string | null = null;

    if (eng.id === "ollama") {
      const data = await resp.json() as { models?: { name: string }[] };
      models = (data.models ?? []).map(m => m.name);
      try {
        const vr = await fetch(`${eng.base}/api/version`, { signal: AbortSignal.timeout(2000) });
        if (vr.ok) { const vd = await vr.json() as { version?: string }; version = vd.version ?? null; }
      } catch { /* ignore */ }
    } else if (eng.id === "kobold") {
      const data = await resp.json() as { result?: string };
      models = data.result ? [data.result] : [];
    } else {
      const data = await resp.json() as Record<string, unknown>;
      const arr = (eng.modelsKey ? data[eng.modelsKey] : []) as Array<Record<string,unknown>>;
      if (Array.isArray(arr)) {
        models = arr.map(m => String(m[eng.idKey] ?? "")).filter(Boolean);
      }
    }

    return base(eng, true, latencyMs, models, version);
  } catch {
    return base(eng, false, null, [], null);
  }
}

function base(eng: typeof ENGINES[number], online: boolean, latencyMs: number | null, models: string[], version: string | null): EngineStatus {
  return {
    id: eng.id, label: eng.label, port: eng.port, online, latencyMs, models, version,
    canInstall: eng.canInstall,
    installAvailable: checkInstallAvailable(eng.id),
  };
}

function checkInstallAvailable(id: EngineId): boolean {
  if (id === "ollama") {
    const bin = path.join(WORKSPACE, ".ollama-bin", "ollama");
    return fs.existsSync(bin);
  }
  if (id === "llamafile") {
    return fs.existsSync(path.join(BIN_DIR, "llamafile"));
  }
  if (id === "kobold") {
    return fs.existsSync(path.join(BIN_DIR, "koboldcpp", "koboldcpp.py")) ||
           fs.existsSync(path.join(BIN_DIR, "koboldcpp"));
  }
  if (id === "openwebui") {
    return false;
  }
  return false;
}

router.get("/local-engines/status", async (_req, res) => {
  const results = await Promise.all(ENGINES.map(pingEngine));
  return res.json({ engines: results, ts: Date.now() });
});

router.get("/local-engines/status/:id", async (req, res) => {
  const eng = ENGINES.find(e => e.id === req.params.id);
  if (!eng) return res.status(404).json({ error: "Unknown engine" });
  const result = await pingEngine(eng);
  return res.json(result);
});

router.post("/local-engines/launch/:id", (req, res) => {
  const id = req.params.id as EngineId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  send({ type: "start", message: `Launching ${id}...` });

  if (id === "ollama") {
    const binWS  = path.join(WORKSPACE, ".ollama-bin", "ollama");
    const binH   = "/home/runner/.ollama-bin/ollama";
    const bin    = fs.existsSync(binWS) ? binWS : binH;
    const libDir = path.join(WORKSPACE, ".ollama-bin", "lib", "ollama");

    if (!fs.existsSync(bin)) {
      send({ type: "error", message: "Ollama binary not found. Please install first." });
      return res.end();
    }

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      HOME: "/home/runner",
      OLLAMA_MODELS: "/home/runner/.ollama/models",
    };
    if (fs.existsSync(libDir)) env.OLLAMA_LIBRARY_PATH = libDir;

    spawn(bin, ["serve"], { detached: true, stdio: "ignore", env }).unref();
    send({ type: "log", message: "Ollama daemon spawned" });

    let tries = 0;
    const check = setInterval(async () => {
      tries++;
      try {
        const r = await fetch("http://localhost:11434/api/tags", { signal: AbortSignal.timeout(2000) });
        if (r.ok) {
          clearInterval(check);
          send({ type: "success", message: "Ollama is online ✓" });
          res.end();
        }
      } catch { /* waiting */ }
      if (tries >= 20) {
        clearInterval(check);
        send({ type: "error", message: "Ollama did not respond in 20s" });
        res.end();
      }
    }, 1000);
    return;
  }

  if (id === "llamafile") {
    const llamaBin = path.join(BIN_DIR, "llamafile");
    if (!fs.existsSync(llamaBin)) {
      send({ type: "error", message: "Llamafile binary not found. Use install first." });
      return res.end();
    }
    try {
      execAsync(`chmod +x ${llamaBin}`);
      spawn(llamaBin, ["--server", "--port", "8081", "--host", "0.0.0.0"], {
        detached: true, stdio: "ignore",
        env: { ...process.env as Record<string,string> }
      }).unref();
      send({ type: "log", message: "Llamafile server starting on port 8081..." });
      setTimeout(() => { send({ type: "success", message: "Llamafile launched ✓" }); res.end(); }, 3000);
    } catch (e) {
      send({ type: "error", message: String(e) });
      res.end();
    }
    return;
  }

  if (id === "kobold") {
    const koboldDir = path.join(BIN_DIR, "koboldcpp");
    const pyScript  = path.join(koboldDir, "koboldcpp.py");
    if (!fs.existsSync(pyScript)) {
      send({ type: "error", message: "KoboldCPP not found. Use install first." });
      return res.end();
    }
    try {
      spawn("python3", [pyScript, "--port", "5001", "--host", "0.0.0.0", "--skiplauncher"], {
        detached: true, stdio: "ignore", cwd: koboldDir,
        env: { ...process.env as Record<string,string> }
      }).unref();
      send({ type: "log", message: "KoboldCPP starting on port 5001..." });
      setTimeout(() => { send({ type: "success", message: "KoboldCPP launched ✓" }); res.end(); }, 4000);
    } catch (e) {
      send({ type: "error", message: String(e) });
      res.end();
    }
    return;
  }

  if (id === "openwebui") {
    try {
      const proc = spawn("bash", ["-c", "python3 -m open_webui serve --port 3000 --host 0.0.0.0"], {
        detached: true, stdio: "ignore",
        env: { ...process.env as Record<string,string> }
      });
      proc.unref();
      send({ type: "log", message: "Open WebUI starting on port 3000..." });
      setTimeout(() => { send({ type: "success", message: "Open WebUI launched ✓" }); res.end(); }, 5000);
    } catch (e) {
      send({ type: "error", message: String(e) });
      res.end();
    }
    return;
  }

  send({ type: "info", message: `${id} must be launched from its native app. See install guide.` });
  res.end();
});

router.post("/local-engines/install/:id", (req, res) => {
  const id = req.params.id as EngineId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);
  send({ type: "start", message: `Installing ${id}...` });

  if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

  if (id === "ollama") {
    send({ type: "log", message: "Downloading Ollama v0.30.10..." });
    const dlUrl = "https://github.com/ollama/ollama/releases/download/v0.30.10/ollama-linux-amd64.tgz";
    const tgzPath = "/tmp/ollama.tgz";
    const outDir  = path.join(WORKSPACE, ".ollama-bin");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    execAsync(`curl -L --max-time 300 -o ${tgzPath} "${dlUrl}" 2>&1`)
      .then(() => {
        send({ type: "log", message: "Extracting..." });
        return execAsync(`tar -xzf ${tgzPath} -C ${outDir} 2>&1`);
      })
      .then(() => execAsync(`chmod +x ${path.join(outDir, "ollama")}`))
      .then(() => { send({ type: "success", message: "Ollama installed ✓" }); res.end(); })
      .catch(e => { send({ type: "error", message: String(e) }); res.end(); });
    return;
  }

  if (id === "llamafile") {
    send({ type: "log", message: "Downloading Llamafile binary..." });
    const dlUrl   = "https://github.com/Mozilla-Ocho/llamafile/releases/download/0.9.2/llamafile-0.9.2";
    const outPath = path.join(BIN_DIR, "llamafile");
    execAsync(`curl -L --max-time 300 -o "${outPath}" "${dlUrl}" && chmod +x "${outPath}" 2>&1`)
      .then(() => { send({ type: "success", message: "Llamafile installed ✓" }); res.end(); })
      .catch(e => { send({ type: "error", message: String(e) }); res.end(); });
    return;
  }

  if (id === "kobold") {
    send({ type: "log", message: "Cloning KoboldCPP..." });
    const outDir = path.join(BIN_DIR, "koboldcpp");
    execAsync(`git clone --depth=1 https://github.com/LostRuins/koboldcpp.git "${outDir}" 2>&1`)
      .then(() => {
        send({ type: "log", message: "Installing Python deps..." });
        return execAsync(`pip3 install --quiet -r "${path.join(outDir, "requirements.txt")}" 2>&1`);
      })
      .then(() => { send({ type: "success", message: "KoboldCPP installed ✓" }); res.end(); })
      .catch(e => { send({ type: "error", message: String(e) }); res.end(); });
    return;
  }

  if (id === "openwebui") {
    send({ type: "log", message: "Installing Open WebUI via pip..." });
    execAsync("pip3 install open-webui 2>&1", { maxBuffer: 10 * 1024 * 1024 })
      .then(() => { send({ type: "success", message: "Open WebUI installed ✓" }); res.end(); })
      .catch(e => { send({ type: "error", message: String(e) }); res.end(); });
    return;
  }

  send({ type: "info", message: `${id} must be installed manually. Download from official site.` });
  res.end();
});

router.get("/local-engines/guide/:id", (_req, res) => {
  const id = _req.params.id as EngineId;
  const GUIDES: Record<string, { url: string; steps: string[] }> = {
    ollama:     { url: "https://ollama.com", steps: ["Click Install above", "Run: ollama pull llama3.2:3b", "Server auto-starts on port 11434"] },
    lmstudio:   { url: "https://lmstudio.ai", steps: ["Download from lmstudio.ai", "Install & open LM Studio", "Load a model", "Go to Local Server tab → Start Server (port 1234)"] },
    jan:        { url: "https://jan.ai", steps: ["Download from jan.ai", "Install & open Jan", "Download a model in Hub", "Go to Local API Server → Start (port 1337)"] },
    gpt4all:    { url: "https://gpt4all.io", steps: ["Download from gpt4all.io", "Install & open GPT4All", "Download a model", "Enable API server in Settings → API (port 4891)"] },
    openwebui:  { url: "https://openwebui.com", steps: ["Click Install above (pip install)", "Click Launch above", "Open WebUI starts on port 3000"] },
    llamafile:  { url: "https://github.com/Mozilla-Ocho/llamafile", steps: ["Click Install above", "Click Launch above to start server on port 8080", "Load a .gguf model via --model flag"] },
    kobold:     { url: "https://github.com/LostRuins/koboldcpp", steps: ["Click Install above (git clone)", "Click Launch above", "KoboldCPP starts on port 5001"] },
  };
  const guide = GUIDES[id];
  if (!guide) return res.status(404).json({ error: "Not found" });
  return res.json(guide);
});

export default router;
