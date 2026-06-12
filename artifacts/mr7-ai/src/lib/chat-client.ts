import { trafficBus } from "./trafficBus";

export type ChatRole = "user" | "assistant";
export type ChatMessage = { role: ChatRole; content: string };

// ─────────────── Agent (ReAct tool-loop) ────────────────

export type AgentEvent =
  | { type: "step_start"; step: number; maxSteps: number }
  | { type: "thinking"; content: string }
  | { type: "tool_call"; step: number; name: string; args: Record<string, unknown> }
  | { type: "tool_result"; step: number; name: string; result: string; ok: boolean }
  | { type: "answer_start" }
  | { type: "answer_chunk"; content: string }
  | { type: "done"; steps: number }
  | { type: "error"; error: string };

export type ChatRequest = {
  model: string;
  persona: string | null;
  // mode is extended to include "reason" for deep reasoning / CoT
  customInstructions: string;
  language: "en" | "ar";
  memory: string[];
  messages: ChatMessage[];
  mode?: "chat" | "code" | "web" | "reason" | "polymorphic" | "soceng" | "vulnrecon" | "antiforensics" | "agentic" | "localllm";
  webContext?: string | null;
  customSystemPrompt?: string;
  provider?: string;
  providerModel?: string;
  // Personal API credentials — bypasses Replit tunnel, uses key directly
  apiKey?: string;
  apiBaseURL?: string;
};

export async function streamChat(req: ChatRequest, onChunk: (text: string) => void, signal?: AbortSignal): Promise<string> {
  const body = JSON.stringify(req);
  const callId = trafficBus.startCall({
    model: req.model,
    provider: req.provider ?? "personal",
    endpoint: "/api/chat",
    bytesSent: body.length,
    payloadPreview: body.slice(0, 512),
  });

  let bytesReceived = 0;
  let tokenCount = 0;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal,
    });
    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      trafficBus.failCall(callId);
      throw new Error(`Chat request failed (${res.status}): ${text.slice(0, 200)}`);
    }
    trafficBus.updateCall(callId, { status: "streaming" });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) bytesReceived += value.byteLength;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const block = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of block.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload) continue;
          try {
            const obj = JSON.parse(payload) as { content?: string; done?: boolean; error?: string; usage?: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number } };
            if (obj.error) { onChunk(`\n\n[خطأ: ${obj.error}]`); trafficBus.failCall(callId); return full; }
            if (obj.content) { full += obj.content; onChunk(obj.content); tokenCount += Math.ceil(obj.content.length / 4); }
            if (obj.usage) tokenCount = obj.usage.total_tokens ?? tokenCount;
            if (obj.done) {
              trafficBus.completeCall(callId, { tokens: tokenCount, bytesReceived });
              return full;
            }
          } catch (e) {
            if (e instanceof Error && e.message) throw e;
          }
        }
      }
    }
    trafficBus.completeCall(callId, { tokens: tokenCount, bytesReceived });
    return full;
  } catch (err) {
    trafficBus.failCall(callId);
    throw err;
  }
}

/**
 * Read a streaming SSE response from /api/chat and return the full accumulated text.
 * Handles the server's `data: {"content":"..."}` format.
 */
export async function readChatText(resp: Response): Promise<string> {
  if (!resp.ok || !resp.body) return "";
  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "", full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw || raw === "[DONE]") continue;
      try { const obj = JSON.parse(raw); full += (obj.content ?? obj.choices?.[0]?.delta?.content ?? ""); } catch { /* ignore */ }
    }
  }
  return full;
}

export async function streamLocalChat(
  endpoint: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const apiMessages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];
  const base = endpoint.replace(/\/$/, "");
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", "Authorization": "Bearer ollama" },
    body: JSON.stringify({ model, messages: apiMessages, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Local model request failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return full;
      try {
        const obj = JSON.parse(payload);
        const content = obj.choices?.[0]?.delta?.content;
        if (content) { full += content; onChunk(content); }
      } catch { /* ignore */ }
    }
  }
  return full;
}

export async function streamLocalChatViaProxy(
  endpoint: string,
  model: string,
  messages: ChatMessage[],
  systemPrompt: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const apiMessages: { role: string; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];
  const res = await fetch("/api/local-proxy/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ endpoint, model, messages: apiMessages, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    let parsed: { error?: string } = {};
    try { parsed = JSON.parse(text); } catch { /* ignore */ }
    throw new Error(parsed.error ?? `Local model proxy failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return full;
      try {
        const obj = JSON.parse(payload);
        const content = obj.choices?.[0]?.delta?.content;
        if (content) { full += content; onChunk(content); }
      } catch { /* ignore */ }
    }
  }
  return full;
}

export async function generateTitle(firstMessage: string): Promise<string> {
  try {
    const res = await fetch("/api/title", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ firstMessage }),
    });
    const data = await res.json();
    return typeof data?.title === "string" && data.title.trim() ? data.title : "New chat";
  } catch {
    return "New chat";
  }
}

export async function translateText(text: string, to: "ar" | "en"): Promise<string> {
  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, to }),
  });
  if (!res.ok) throw new Error("translate failed");
  const data = await res.json();
  return data?.text ?? "";
}

export async function enhancePrompt(prompt: string): Promise<string> {
  const res = await fetch("/api/enhance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error("enhance failed");
  const data = await res.json();
  return data?.prompt ?? prompt;
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export async function streamAgent(
  req: {
    messages: ChatMessage[];
    language: "en" | "ar";
    customSystemPrompt?: string;
    customInstructions?: string;
    memory?: string[];
    maxSteps?: number;
    redteamMode?: boolean;
  },
  onEvent: (e: AgentEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Agent request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of block.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        try {
          const obj = JSON.parse(payload) as AgentEvent;
          onEvent(obj);
          if (obj.type === "done") return;
          if (obj.type === "error") throw new Error(obj.error);
        } catch (e) {
          if (e instanceof Error && e.message) throw e;
        }
      }
    }
  }
}

export async function compressContext(
  messages: ChatMessage[],
  language: "en" | "ar",
): Promise<{ summary: string; originalCount: number }> {
  const res = await fetch("/api/context/summarize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ messages, language }),
  });
  if (!res.ok) throw new Error("Context compression failed");
  return res.json();
}

export async function analyzeOsintUrl(
  url: string,
  language: "en" | "ar",
): Promise<{ url: string; title: string; status: number; iocs: Record<string, string[]>; analysis: string }> {
  const res = await fetch("/api/osint/url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url, language }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "OSINT URL analysis failed");
  return data;
}

export async function analyzeOsintFile(
  content: string,
  type: "text" | "image" | "domain" | "ip" | "hash",
  filename: string,
  language: "en" | "ar",
): Promise<{ analysis: string; iocs: Record<string, string[]>; type: string }> {
  const res = await fetch("/api/osint/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content, type, filename, language }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "OSINT analysis failed");
  return data;
}

export async function visionAnalyze(image: string, prompt: string): Promise<string> {
  const res = await fetch("/api/vision", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ image, prompt }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `vision failed (${res.status})`);
  return (data?.text ?? "") as string;
}

// ─────────────── Council (multi-brain) ────────────────

export type CouncilBrainSeat = {
  id: string;
  label: string;
  category: string;
  blurb: string;
};

export type CouncilScore = {
  id: string; total: number;
  insight: number; specificity: number; accuracy: number; novelty: number; structure: number;
};

export type CouncilEvent =
  | { type: "convene"; brains: CouncilBrainSeat[] }
  | { type: "brain_start"; id: string }
  | { type: "brain_chunk"; id: string; content: string }
  | { type: "brain_done"; id: string }
  | { type: "brain_error"; id: string; error: string }
  | { type: "brain_round"; id: string; round: number }
  | { type: "fusion_start" }
  | { type: "fusion_done" }
  | { type: "scoring_start" }
  | { type: "scores"; scores: CouncilScore[] }
  | { type: "scoring_error"; error: string }
  | { type: "synthesize_start" }
  | { type: "synthesis_chunk"; content: string }
  | { type: "done" }
  | { type: "error"; error: string };

export type CouncilRequest = {
  messages: ChatMessage[];
  language: "en" | "ar";
  customInstructions: string;
  memory: string[];
  brainIds?: string[];
  autoSelect?: boolean;
  maxBrains?: number;
  fusion?: boolean;
  scoring?: boolean;
  apiKey?: string;
  apiBaseURL?: string;
};

export async function streamCouncil(
  req: CouncilRequest,
  onEvent: (e: CouncilEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/council", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Council request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of block.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        try {
          const obj = JSON.parse(payload) as CouncilEvent;
          onEvent(obj);
          if (obj.type === "done") return;
          if (obj.type === "error") throw new Error(obj.error);
        } catch (e) {
          if (e instanceof Error && e.message) throw e;
        }
      }
    }
  }
}

// ─────────────── GODMODE (multi-strategy race + scoring) ────────────────

export type GodmodeChampion = {
  id: string;
  styleLabel: string;
  personaLabel: string;
  blurb: string;
};

export type GodmodeScore = {
  id: string; total: number;
  insight: number; specificity: number; accuracy: number; novelty: number; structure: number;
  verdict: string;
};

export type GodmodeEvent =
  | { type: "convene"; mode: "classic" | "ultraplinian"; tier: string | null; champions: GodmodeChampion[] }
  | { type: "champ_start"; id: string }
  | { type: "champ_chunk"; id: string; content: string }
  | { type: "champ_done"; id: string }
  | { type: "champ_error"; id: string; error: string }
  | { type: "judging_start"; count: number }
  | { type: "judging_done"; scores: GodmodeScore[] }
  | { type: "judging_error"; error: string }
  | { type: "winner"; champion: { id: string; styleLabel: string; personaLabel: string } | null; score: GodmodeScore | null; content: string }
  | { type: "done" }
  | { type: "error"; error: string };

export type GodmodeRequest = {
  messages: ChatMessage[];
  language: "en" | "ar";
  mode: "classic" | "ultraplinian" | "reason" | "hunter" | "agent" | "extended" | "maxoverdrive" | "unbound" | "jioreason" | "mythos" | "ultimate" | "think" | "max" | "abliterated";
  tier?: "bronze" | "silver" | "gold" | "platinum" | "diamond";
  apiKey?: string;
  apiBaseURL?: string;
};

export async function streamGodmode(
  req: GodmodeRequest,
  onEvent: (e: GodmodeEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch("/api/godmode", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Godmode request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const block = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of block.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload) continue;
        try {
          const obj = JSON.parse(payload) as GodmodeEvent;
          onEvent(obj);
          if (obj.type === "done") return;
          if (obj.type === "error") throw new Error(obj.error);
        } catch (e) {
          if (e instanceof Error && e.message) throw e;
        }
      }
    }
  }
}

// ─────────────── AutoTune (context-adaptive params) ────────────────

export type AutoTuneContextType = "factual" | "creative" | "code" | "reasoning" | "conversational";

export type AutoTuneResponse = {
  contextType: AutoTuneContextType;
  confidence: number;
  params: {
    temperature: number; top_p: number; top_k: number;
    frequency_penalty: number; presence_penalty: number; repetition_penalty: number;
  };
  rationale: string;
};

export async function autoTune(
  query: string,
  ema?: Partial<Record<AutoTuneContextType, { good: number; bad: number }>>,
): Promise<AutoTuneResponse | null> {
  try {
    const res = await fetch("/api/autotune", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, ema }),
    });
    if (!res.ok) return null;
    return (await res.json()) as AutoTuneResponse;
  } catch {
    return null;
  }
}
