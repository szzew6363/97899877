/**
 * Prompt Optimizer
 * ─────────────────
 * 1. Prompt Compression — compress long conversations to fit context window
 *    while preserving semantics and recent context.
 * 2. Backpressure streaming — smart buffering for slow clients.
 * 3. Context window management — auto-trim + priority scoring.
 */

import type { Response } from "express";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// ── Context window limits (tokens) by model ───────────────────────────────────
const CONTEXT_LIMITS: Record<string, number> = {
  "gpt-4o": 128_000,
  "gpt-4o-mini": 128_000,
  "gpt-4-turbo": 128_000,
  "gpt-3.5-turbo": 16_385,
  "o1": 200_000,
  "o3-mini": 200_000,
  "claude-3-5-sonnet-20241022": 200_000,
  "claude-3-5-haiku-20241022": 200_000,
  "claude-3-opus-20240229": 200_000,
  "gemini-2.5-pro": 1_000_000,
  "gemini-2.5-flash": 1_000_000,
  "gemini-1.5-pro": 2_000_000,
  "llama-3.3-70b-instruct": 131_072,
  "llama-3.1-8b-instant": 131_072,
  "mistral-large-latest": 131_072,
  "deepseek-r1": 64_000,
  "deepseek-v3": 64_000,
};

const DEFAULT_CONTEXT = 32_000; // safe default
const RESERVE_TOKENS = 4_000;   // reserve for response
const CHARS_PER_TOKEN = 4;

function charEstimate(msg: ChatMessage): number {
  return msg.content.length;
}

function tokensEstimate(chars: number): number {
  return Math.ceil(chars / CHARS_PER_TOKEN);
}

export function getContextLimit(model: string): number {
  return CONTEXT_LIMITS[model] ?? DEFAULT_CONTEXT;
}

/**
 * Compresses a conversation to fit within the model's context window.
 * Strategy:
 *  1. Always keep system message
 *  2. Always keep last 4 user+assistant turns
 *  3. Summarize middle messages into a "conversation summary" message
 *  4. If still too long, truncate oldest summaries first
 */
export function compressConversation(
  messages: ChatMessage[],
  model: string,
  maxOutputTokens = 4000,
): { messages: ChatMessage[]; compressed: boolean; removedTurns: number } {
  const limitTokens = getContextLimit(model) - maxOutputTokens - RESERVE_TOKENS;
  const totalChars = messages.reduce((s, m) => s + charEstimate(m), 0);
  const totalTokens = tokensEstimate(totalChars);

  if (totalTokens <= limitTokens) {
    return { messages, compressed: false, removedTurns: 0 };
  }

  const systemMsgs = messages.filter((m) => m.role === "system");
  const chatMsgs = messages.filter((m) => m.role !== "system");

  // Always keep last 8 chat messages (4 turns)
  const KEEP_RECENT = 8;
  const recentMsgs = chatMsgs.slice(-KEEP_RECENT);
  const olderMsgs = chatMsgs.slice(0, -KEEP_RECENT);

  // Summarize older messages
  let summaryText = "";
  if (olderMsgs.length > 0) {
    summaryText = olderMsgs
      .map((m) => {
        const role = m.role === "user" ? "User" : "Assistant";
        // Truncate long messages in summary
        const content = m.content.length > 500 ? m.content.slice(0, 500) + "…" : m.content;
        return `${role}: ${content}`;
      })
      .join("\n");
  }

  const compressed: ChatMessage[] = [
    ...systemMsgs,
    ...(summaryText ? [{
      role: "system" as const,
      content: `[Prior conversation summary — ${olderMsgs.length} messages compressed to save context]:\n${summaryText.slice(0, 3000)}`,
    }] : []),
    ...recentMsgs,
  ];

  // If still too long, progressively trim the summary
  let finalMsgs = compressed;
  let trimLevel = 0;
  while (tokensEstimate(finalMsgs.reduce((s, m) => s + charEstimate(m), 0)) > limitTokens && trimLevel < 5) {
    trimLevel++;
    finalMsgs = finalMsgs.map((m) => {
      if (m.content.includes("[Prior conversation summary")) {
        return { ...m, content: m.content.slice(0, Math.max(200, m.content.length - 500)) + "…" };
      }
      return m;
    });
  }

  return { messages: finalMsgs, compressed: true, removedTurns: olderMsgs.length };
}

/**
 * Smart SSE writer with backpressure handling.
 * Buffers chunks when client is slow, flushes when drain event fires.
 * Prevents memory buildup on slow connections.
 */
export class BackpressureSSEWriter {
  private buffer: string[] = [];
  private draining = false;
  private closed = false;
  private flushed = 0;
  private dropped = 0;
  private readonly MAX_BUFFER = 500; // max buffered chunks before dropping

  constructor(private res: Response) {
    res.on("drain", () => {
      this.draining = false;
      this.flush();
    });
    res.on("close", () => { this.closed = true; });
    res.on("error", () => { this.closed = true; });
  }

  write(data: string): boolean {
    if (this.closed) return false;

    const chunk = `data: ${data}\n\n`;

    if (this.draining) {
      // Client is slow — buffer it
      if (this.buffer.length < this.MAX_BUFFER) {
        this.buffer.push(chunk);
      } else {
        // Buffer full — drop oldest (keep newest for coherence)
        this.buffer.shift();
        this.buffer.push(chunk);
        this.dropped++;
      }
      return false;
    }

    const ok = this.res.write(chunk);
    this.flushed++;
    if (!ok) {
      this.draining = true;
    }
    return ok;
  }

  private flush(): void {
    while (this.buffer.length > 0 && !this.draining && !this.closed) {
      const chunk = this.buffer.shift()!;
      const ok = this.res.write(chunk);
      this.flushed++;
      if (!ok) {
        this.draining = true;
        break;
      }
    }
  }

  end(): void {
    if (!this.closed) {
      this.flush();
      try { this.res.write("data: [DONE]\n\n"); } catch { /* ignore */ }
    }
  }

  getStats(): { flushed: number; dropped: number; buffered: number } {
    return { flushed: this.flushed, dropped: this.dropped, buffered: this.buffer.length };
  }
}

/**
 * Split a long message into semantic chunks for better compression.
 * Used when we need to preserve key information from long user messages.
 */
export function extractKeyPoints(content: string, maxPoints = 5): string {
  const sentences = content.split(/[.!?]\s+/).filter((s) => s.trim().length > 20);
  if (sentences.length <= maxPoints) return content;
  // Take first 2, last 2, and middle ones
  const selected = [
    ...sentences.slice(0, 2),
    `… [${sentences.length - 4} sentences omitted] …`,
    ...sentences.slice(-2),
  ];
  return selected.join(". ");
}
