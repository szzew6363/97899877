import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { ltmStore, ltmRecall } from "./agent-memory";
import { CYBERWARFARE_KB } from "./cyberwarfare-kb";

const execAsync = promisify(exec);

const WORKSPACE = process.cwd();
const TOOL_TIMEOUT = 12_000;
const MAX_OUTPUT = 8_000;

// ── Sandbox blacklist ─────────────────────────────────────────────────────────
const BLOCKED_PATTERNS = [
  /rm\s+-rf\s+[\/~]/i,
  /:\(\)\s*\{.*\}\s*;/,
  /mkfs/i,
  /dd\s+if=\/dev\/(zero|random|urandom)/i,
  />\s*\/dev\/sd[a-z]/i,
  /shutdown/i,
  /reboot/i,
  /halt/i,
  /poweroff/i,
  /curl\s+.*\|\s*(ba)?sh/i,
  /wget\s+.*\|\s*(ba)?sh/i,
  /python[23]?\s+-c\s+.*exec\s*\(/i,
  /bash\s+-i\s+>&\s*\/dev\/tcp/i,
  /\/dev\/tcp\//i,
  /socat\s+.*exec/i,
  /pkill\s+-9\s+/i,
  /kill\s+-9\s+1\b/i,
  /crontab\s+-r/i,
  /passwd\s+root/i,
  /useradd|userdel|usermod/i,
  /iptables\s+-F/i,
  /ufw\s+disable/i,
];

// Internal URL blacklist
const HTTP_BLOCKED = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/10\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/169\.254\./,
  /^https?:\/\/\[?::1/,
];

function isCommandSafe(cmd: string): string | null {
  if (cmd.length > 1500) return "Command too long";
  for (const p of BLOCKED_PATTERNS) if (p.test(cmd)) return "Blocked pattern";
  return null;
}

function isUrlSafe(url: string): string | null {
  for (const p of HTTP_BLOCKED) if (p.test(url)) return "Blocked: internal URL";
  return null;
}

function truncate(s: string, max = MAX_OUTPUT): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n... [truncated — ${s.length - max} more chars]`;
}

export type ToolResult = { success: boolean; output: string; error?: string };

export type ToolName =
  | "shell" | "web_search" | "read_file" | "write_file"
  | "http_get" | "http_post" | "kb_read" | "kb_write"
  | "memory_recall" | "memory_store";

export type ToolArgs = Record<string, unknown>;

export const ALL_TOOL_NAMES: ToolName[] = [
  "shell", "web_search", "read_file", "write_file",
  "http_get", "http_post", "kb_read", "kb_write",
  "memory_recall", "memory_store",
];

export const TOOL_DESCRIPTIONS: Record<ToolName, { description: string; argsSchema: string; dangerous?: boolean }> = {
  shell:         { description: "Run a shell command in the workspace sandbox.", argsSchema: '{"command":"ls -la /tmp"}', dangerous: true },
  web_search:    { description: "Search the web via DuckDuckGo and return top snippets.", argsSchema: '{"query":"search terms"}' },
  read_file:     { description: "Read a file from the workspace by relative path.", argsSchema: '{"path":"relative/path.txt"}' },
  write_file:    { description: "Write content to a file in the workspace.", argsSchema: '{"path":"output.txt","content":"file contents"}', dangerous: true },
  http_get:      { description: "HTTP GET an external URL and return the response body.", argsSchema: '{"url":"https://api.example.com/data"}' },
  http_post:     { description: "HTTP POST JSON to an external URL.", argsSchema: '{"url":"https://api.example.com","body":"{}"}' },
  kb_read:       { description: "Search the built-in cybersecurity knowledge base.", argsSchema: '{"query":"SQL injection"}' },
  kb_write:      { description: "Save findings to long-term agent knowledge base.", argsSchema: '{"key":"finding-001","content":"...","tags":["recon"]}' },
  memory_recall: { description: "Recall stored knowledge from previous tasks.", argsSchema: '{"query":"previous finding about X"}' },
  memory_store:  { description: "Store a fact to long-term memory for future tasks.", argsSchema: '{"key":"fact-key","content":"what I learned"}' },
};

export const TOOL_LIST_TEXT = Object.entries(TOOL_DESCRIPTIONS)
  .map(([name, d]) => `- **${name}**: ${d.description} | args: ${d.argsSchema}`)
  .join("\n");

// ── Tool executor ─────────────────────────────────────────────────────────────
export async function executeTool(
  name: ToolName,
  args: ToolArgs,
  auditLog: string[]
): Promise<ToolResult> {
  const entry = `[${new Date().toISOString()}] TOOL:${name} ARGS:${JSON.stringify(args).slice(0, 400)}`;
  auditLog.push(entry);

  try {
    switch (name) {
      // ── shell ──────────────────────────────────────────────────────────────
      case "shell": {
        const cmd = String(args["command"] ?? "");
        const blocked = isCommandSafe(cmd);
        if (blocked) return { success: false, output: "", error: `Blocked: ${blocked}` };
        const { stdout, stderr } = await execAsync(cmd, {
          cwd: WORKSPACE,
          timeout: TOOL_TIMEOUT,
          maxBuffer: 2 * 1024 * 1024,
          env: {
            ...process.env,
            PATH: process.env["PATH"] ?? "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          },
        });
        const combined = [stdout, stderr].filter(Boolean).join("\n").trim();
        auditLog.push(`RESULT(shell): ${combined.slice(0, 300)}`);
        return { success: true, output: truncate(combined || "(no output)") };
      }

      // ── web_search ─────────────────────────────────────────────────────────
      case "web_search": {
        const query = encodeURIComponent(String(args["query"] ?? "").slice(0, 200));
        const resp = await fetch(`https://html.duckduckgo.com/html/?q=${query}`, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; mr7agent/1.0)" },
          signal: AbortSignal.timeout(9000),
        });
        const html = await resp.text();
        const results: string[] = [];
        const snippetRe = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
        const titleRe = /class="result__a"[^>]*>([\s\S]*?)<\/a>/g;
        const titles: string[] = [];
        let m;
        while ((m = titleRe.exec(html)) !== null && titles.length < 6) {
          titles.push(m[1]!.replace(/<[^>]+>/g, "").trim());
        }
        let si = 0;
        while ((m = snippetRe.exec(html)) !== null && si < 6) {
          const snippet = m[1]!.replace(/<[^>]+>/g, "").trim();
          results.push(`[${si + 1}] ${titles[si] ?? ""}\n${snippet}`);
          si++;
        }
        return { success: true, output: truncate(results.join("\n\n") || "No results found.") };
      }

      // ── read_file ──────────────────────────────────────────────────────────
      case "read_file": {
        const relPath = String(args["path"] ?? "");
        const absPath = path.resolve(WORKSPACE, relPath);
        if (!absPath.startsWith(WORKSPACE)) {
          return { success: false, output: "", error: "Path traversal blocked" };
        }
        const content = await fs.readFile(absPath, "utf-8");
        auditLog.push(`READ: ${relPath} (${content.length} chars)`);
        return { success: true, output: truncate(content) };
      }

      // ── write_file ─────────────────────────────────────────────────────────
      case "write_file": {
        const relPath = String(args["path"] ?? "");
        const absPath = path.resolve(WORKSPACE, relPath);
        if (!absPath.startsWith(WORKSPACE)) {
          return { success: false, output: "", error: "Path traversal blocked" };
        }
        const content = String(args["content"] ?? "");
        await fs.mkdir(path.dirname(absPath), { recursive: true });
        await fs.writeFile(absPath, content, "utf-8");
        auditLog.push(`WRITE: ${relPath} (${content.length} chars)`);
        return { success: true, output: `Written ${content.length} chars to ${relPath}` };
      }

      // ── http_get ───────────────────────────────────────────────────────────
      case "http_get": {
        const url = String(args["url"] ?? "");
        const blocked = isUrlSafe(url);
        if (blocked) return { success: false, output: "", error: blocked };
        const resp = await fetch(url, {
          headers: { "User-Agent": "mr7agent/1.0" },
          signal: AbortSignal.timeout(9000),
        });
        const body = await resp.text();
        auditLog.push(`GET: ${url} → ${resp.status}`);
        return { success: resp.ok, output: truncate(body) };
      }

      // ── http_post ──────────────────────────────────────────────────────────
      case "http_post": {
        const url = String(args["url"] ?? "");
        const blocked = isUrlSafe(url);
        if (blocked) return { success: false, output: "", error: blocked };
        const body = typeof args["body"] === "string" ? args["body"] : JSON.stringify(args["body"] ?? {});
        const resp = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "mr7agent/1.0" },
          body,
          signal: AbortSignal.timeout(9000),
        });
        const text = await resp.text();
        auditLog.push(`POST: ${url} → ${resp.status}`);
        return { success: resp.ok, output: truncate(text) };
      }

      // ── kb_read ────────────────────────────────────────────────────────────
      case "kb_read": {
        const query = String(args["query"] ?? "").toLowerCase();
        const kbStr = typeof CYBERWARFARE_KB === "string" ? CYBERWARFARE_KB : "";
        const lines = kbStr.split("\n");
        const hits: string[] = [];
        let capture = false;
        let captureLines = 0;
        for (const line of lines) {
          if (line.toLowerCase().includes(query)) {
            capture = true;
            captureLines = 0;
          }
          if (capture) {
            hits.push(line);
            captureLines++;
            if (captureLines >= 30) { capture = false; }
          }
          if (hits.length > 200) break;
        }
        const output = hits.join("\n").trim();
        return { success: true, output: truncate(output || `No KB entries for: ${args["query"]}`) };
      }

      // ── kb_write ───────────────────────────────────────────────────────────
      case "kb_write": {
        const key = String(args["key"] ?? `kb-${Date.now()}`);
        const content = String(args["content"] ?? "");
        const tags = Array.isArray(args["tags"]) ? (args["tags"] as unknown[]).map(String) : [];
        await ltmStore(key, content, tags);
        return { success: true, output: `Stored to knowledge base: ${key}` };
      }

      // ── memory_recall ──────────────────────────────────────────────────────
      case "memory_recall": {
        const query = String(args["query"] ?? "");
        const entries = await ltmRecall(query, 5);
        if (entries.length === 0) return { success: true, output: "No memories found for query." };
        return {
          success: true,
          output: entries.map(e => `[${e.key}]\n${e.content.slice(0, 500)}`).join("\n\n"),
        };
      }

      // ── memory_store ───────────────────────────────────────────────────────
      case "memory_store": {
        const key = String(args["key"] ?? `mem-${Date.now()}`);
        const content = String(args["content"] ?? "");
        await ltmStore(key, content);
        return { success: true, output: `Memory stored: ${key}` };
      }

      default:
        return { success: false, output: "", error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    auditLog.push(`ERROR(${name}): ${msg}`);
    return { success: false, output: "", error: msg };
  }
}
