export type MemoryEntry = {
  id: string;
  content: string;
  role: "user" | "assistant";
  ts: number;
  weight: number;
  keywords: string[];
};

export type MemoryStats = {
  shortTermCount: number;
  longTermKeywords: number;
  compressionRatio: number;
  contextEfficiency: number;
  totalTokensManaged: number;
  savedTokens: number;
};

const STOP_WORDS = new Set([
  "the","a","an","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might","shall","can",
  "to","of","in","for","on","with","at","by","from","into","through","during",
  "and","or","but","if","then","so","yet","both","either","neither","not",
  "i","we","you","he","she","it","they","them","their","this","that","these",
  "أن","في","من","على","هذا","هذه","التي","الذي","مع","عن","إلى","ما","لا",
]);

const STORAGE_KEY = "mr7-context-memory-v1";

function estimateTokens(text: string): number { return Math.ceil(text.length / 4); }

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0600-\u06FF]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
    .slice(0, 20);
}

function relevanceScore(entry: MemoryEntry, contextKeywords: Set<string>): number {
  if (contextKeywords.size === 0) return entry.weight;
  const matches = entry.keywords.filter((k) => contextKeywords.has(k)).length;
  const keywordScore = matches / Math.max(entry.keywords.length, 1);
  const recencyScore = Math.exp(-(Date.now() - entry.ts) / (1000 * 60 * 60 * 24));
  return keywordScore * 0.6 + recencyScore * 0.25 + entry.weight * 0.15;
}

class ContextMemoryEngine {
  private shortTerm: MemoryEntry[] = [];
  private longTermKeywords = new Map<string, number>();
  private stats: MemoryStats = {
    shortTermCount: 0, longTermKeywords: 0, compressionRatio: 1,
    contextEfficiency: 100, totalTokensManaged: 0, savedTokens: 0,
  };
  private subscribers = new Set<() => void>();

  constructor() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.longTermKeywords = new Map(parsed.longTerm ?? []);
      }
    } catch { /* ignore */ }
  }

  subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }

  private notify() { this.subscribers.forEach((cb) => cb()); }

  getStats(): MemoryStats { return { ...this.stats }; }
  getShortTerm(): MemoryEntry[] { return [...this.shortTerm]; }
  getLongTermKeywords(): Array<[string, number]> {
    return Array.from(this.longTermKeywords.entries()).sort((a, b) => b[1] - a[1]).slice(0, 50);
  }

  addMessage(role: "user" | "assistant", content: string) {
    const keywords = extractKeywords(content);
    const id = `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const entry: MemoryEntry = { id, content, role, ts: Date.now(), weight: role === "user" ? 0.8 : 0.6, keywords };
    this.shortTerm.push(entry);
    if (this.shortTerm.length > 100) this.shortTerm.shift();

    keywords.forEach((kw) => {
      this.longTermKeywords.set(kw, (this.longTermKeywords.get(kw) ?? 0) + 1);
    });
    if (this.longTermKeywords.size > 2000) {
      const sorted = Array.from(this.longTermKeywords.entries()).sort((a, b) => a[1] - b[1]);
      sorted.slice(0, 200).forEach(([k]) => this.longTermKeywords.delete(k));
    }

    this.stats.totalTokensManaged += estimateTokens(content);
    this.stats.shortTermCount = this.shortTerm.length;
    this.stats.longTermKeywords = this.longTermKeywords.size;
    this.persist();
    this.notify();
  }

  compress(messages: Array<{ role: string; content: string }>, maxTokens: number): Array<{ role: string; content: string }> {
    const totalTokens = messages.reduce((s, m) => s + estimateTokens(m.content), 0);
    if (totalTokens <= maxTokens) return messages;

    const contextKeywords = new Set<string>();
    const last2 = messages.slice(-2);
    last2.forEach((m) => extractKeywords(m.content).forEach((k) => contextKeywords.add(k)));

    const scored = messages.slice(0, -2).map((m, i) => {
      const entry: MemoryEntry = {
        id: String(i), content: m.content, role: m.role as "user" | "assistant",
        ts: Date.now() - (messages.length - i) * 1000, weight: 0.5, keywords: extractKeywords(m.content),
      };
      return { msg: m, score: relevanceScore(entry, contextKeywords) };
    });

    scored.sort((a, b) => b.score - a.score);
    const kept: Array<{ role: string; content: string }> = [];
    let usedTokens = last2.reduce((s, m) => s + estimateTokens(m.content), 0);

    for (const { msg } of scored) {
      const t = estimateTokens(msg.content);
      if (usedTokens + t > maxTokens) continue;
      kept.unshift(msg);
      usedTokens += t;
    }

    const result = [...kept, ...last2];
    const savedTokens = totalTokens - result.reduce((s, m) => s + estimateTokens(m.content), 0);
    this.stats.savedTokens += savedTokens;
    this.stats.compressionRatio = totalTokens > 0 ? result.reduce((s, m) => s + estimateTokens(m.content), 0) / totalTokens : 1;
    this.stats.contextEfficiency = Math.round((1 - this.stats.compressionRatio) * 100);
    this.notify();
    return result;
  }

  private persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ longTerm: Array.from(this.longTermKeywords.entries()) }));
    } catch { /* ignore */ }
  }

  clear() { this.shortTerm = []; this.longTermKeywords.clear(); this.persist(); this.notify(); }
}

export const contextMemory = new ContextMemoryEngine();
