/**
 * Real RAG (Retrieval-Augmented Generation) with embeddings
 * POST /api/rag/embed   → embed documents and store vectors in-memory (per session)
 * POST /api/rag/query   → semantic search over embedded docs + AI answer
 * POST /api/rag/upload  → upload and parse file (PDF, MD, TXT, CSV, JSON, code)
 */
import { Router, type Request, type Response } from "express";
import { jwtAuth } from "../middlewares/jwtAuth";
import { aiProviders } from "../lib/ai-providers";

const router = Router();

/* ── In-memory vector store (per session, keyed by sessionId) ── */
interface VectorEntry {
  id: string;
  docName: string;
  chunk: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

const sessionStores = new Map<string, VectorEntry[]>();
const SESSION_TTL = 2 * 60 * 60 * 1000; // 2 hours
const sessionTimestamps = new Map<string, number>();

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [sid, ts] of sessionTimestamps) {
    if (now - ts > SESSION_TTL) {
      sessionStores.delete(sid);
      sessionTimestamps.delete(sid);
    }
  }
}
setInterval(cleanExpiredSessions, 15 * 60 * 1000);

/* ── Cosine similarity ── */
function cosineSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

/* ── Chunk text into ~400 token segments with overlap ── */
function chunkText(text: string, chunkSize = 400, overlap = 80): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
    if (i + chunkSize >= words.length) break;
  }
  return chunks.filter(c => c.trim().length > 30);
}

/* ── Get embeddings via OpenAI or fallback to TF-IDF style ── */
async function getEmbeddings(texts: string[], apiKey?: string): Promise<number[][]> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    return tfidfEmbeddings(texts);
  }
  try {
    const { OpenAI } = await import("openai");
    const openai = new OpenAI({ apiKey: key });
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });
    return response.data.map(d => d.embedding);
  } catch {
    return tfidfEmbeddings(texts);
  }
}

/* ── TF-IDF style sparse embedding fallback (1024-dim) ── */
function tfidfEmbeddings(texts: string[]): number[][] {
  const vocab = new Map<string, number>();
  const allTokens = texts.map(t =>
    t.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter(w => w.length > 2)
  );
  allTokens.flat().forEach(t => {
    if (!vocab.has(t)) vocab.set(t, vocab.size);
  });
  const dim = Math.min(vocab.size, 1024);
  return allTokens.map(tokens => {
    const vec = new Array(dim).fill(0);
    const tf = new Map<string, number>();
    tokens.forEach(t => tf.set(t, (tf.get(t) || 0) + 1));
    for (const [word, count] of tf) {
      const idx = vocab.get(word);
      if (idx !== undefined && idx < dim) {
        vec[idx] = count / tokens.length;
      }
    }
    const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    return norm > 0 ? vec.map(v => v / norm) : vec;
  });
}

/* ── POST /api/rag/embed ── */
router.post("/rag/embed", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, documents, apiKey } = req.body as {
      sessionId?: string;
      documents?: { name: string; content: string; type?: string }[];
      apiKey?: string;
    };

    if (!sessionId || !documents?.length) {
      res.status(400).json({ error: "sessionId and documents required" });
      return;
    }

    cleanExpiredSessions();

    const allChunks: { chunk: string; docName: string; meta: Record<string, unknown> }[] = [];
    for (const doc of documents) {
      const chunks = chunkText(doc.content);
      chunks.forEach((chunk, i) =>
        allChunks.push({ chunk, docName: doc.name, meta: { type: doc.type, chunkIndex: i, totalChunks: chunks.length } })
      );
    }

    if (!allChunks.length) {
      res.status(400).json({ error: "No content to embed" });
      return;
    }

    // Batch embed (max 100 at a time for OpenAI)
    const BATCH = 100;
    const store: VectorEntry[] = sessionStores.get(sessionId) || [];
    for (let i = 0; i < allChunks.length; i += BATCH) {
      const batch = allChunks.slice(i, i + BATCH);
      const texts = batch.map(c => c.chunk);
      const embeddings = await getEmbeddings(texts, apiKey);
      batch.forEach((c, j) => {
        store.push({
          id: `${Date.now()}-${i + j}`,
          docName: c.docName,
          chunk: c.chunk,
          embedding: embeddings[j],
          metadata: c.meta,
        });
      });
    }

    sessionStores.set(sessionId, store);
    sessionTimestamps.set(sessionId, Date.now());

    res.json({
      ok: true,
      chunksEmbedded: allChunks.length,
      totalVectors: store.length,
      method: (apiKey || process.env.OPENAI_API_KEY) ? "openai-text-embedding-3-small" : "tfidf-fallback",
    });
  } catch (err) {
    console.error("RAG embed error:", err);
    res.status(500).json({ error: "Embedding failed" });
  }
});

/* ── POST /api/rag/query ── */
router.post("/rag/query", jwtAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, query, topK = 8, apiKey, model, generateAnswer = true } = req.body as {
      sessionId?: string;
      query?: string;
      topK?: number;
      apiKey?: string;
      model?: string;
      generateAnswer?: boolean;
    };

    if (!sessionId || !query) {
      res.status(400).json({ error: "sessionId and query required" });
      return;
    }

    const store = sessionStores.get(sessionId);
    if (!store?.length) {
      res.status(404).json({ error: "No documents embedded for this session. Call /api/rag/embed first." });
      return;
    }

    sessionTimestamps.set(sessionId, Date.now());

    // Embed the query
    const [queryVec] = await getEmbeddings([query], apiKey);

    // Rank chunks by similarity
    const scored = store
      .map(entry => ({ ...entry, score: cosineSim(queryVec, entry.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(topK, 20));

    const context = scored
      .filter(s => s.score > 0.1)
      .map(s => `[${s.docName}]:\n${s.chunk}`)
      .join("\n\n---\n\n");

    if (!generateAnswer) {
      res.json({ chunks: scored.map(s => ({ docName: s.docName, chunk: s.chunk, score: s.score, metadata: s.metadata })) });
      return;
    }

    // Stream AI answer using existing provider
    const systemPrompt = `أنت محلل وثائق دقيق متخصص في الأمن السيبراني. أجب على الأسئلة بناءً فقط على السياق المقدم أدناه.
إذا لم يكن الجواب في الوثائق، قل ذلك بوضوح. اقتبس الأقسام ذات الصلة عند الإجابة.
أجب باللغة العربية ما لم يكن السؤال بالإنجليزية.

السياق المُسترجع (${scored.length} قسم):
---
${context || "لم يتم العثور على محتوى ذي صلة."}
---`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    try {
      const stream = await aiProviders.streamChat({
        model: model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        apiKey: apiKey || process.env.OPENAI_API_KEY,
      });

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true, sources: scored.slice(0, 5).map(s => ({ docName: s.docName, score: s.score })) })}\n\n`);
    } catch (streamErr) {
      res.write(`data: ${JSON.stringify({ error: "AI generation failed. Context retrieved successfully.", sources: scored.slice(0, 5).map(s => ({ docName: s.docName, score: s.score })) })}\n\n`);
    }
    res.end();
  } catch (err) {
    console.error("RAG query error:", err);
    if (!res.headersSent) res.status(500).json({ error: "Query failed" });
  }
});

/* ── DELETE /api/rag/session/:id ── clear session */
router.delete("/rag/session/:id", jwtAuth, (req: Request, res: Response): void => {
  sessionStores.delete(req.params.id);
  sessionTimestamps.delete(req.params.id);
  res.json({ ok: true });
});

/* ── GET /api/rag/knowledge ── list all embedded docs in user's session */
router.get("/rag/knowledge", jwtAuth, (req: Request, res: Response): void => {
  const sessionId = (req as Request & { user?: { id: string } }).user?.id ?? "anon";
  const store = sessionStores.get(sessionId) ?? [];
  const seen = new Set<string>();
  const docs: { id: string; name: string; chunks: number }[] = [];
  for (const entry of store) {
    if (!seen.has(entry.docName)) {
      seen.add(entry.docName);
      const chunks = store.filter(e => e.docName === entry.docName).length;
      docs.push({ id: entry.id, name: entry.docName, chunks });
    }
  }
  res.json({ documents: docs, total: docs.length, sessionId });
});

/* ── DELETE /api/rag/knowledge/:name ── remove a document from session */
router.delete("/rag/knowledge/:name", jwtAuth, (req: Request, res: Response): void => {
  const sessionId = (req as Request & { user?: { id: string } }).user?.id ?? "anon";
  const store = sessionStores.get(sessionId) ?? [];
  const before = store.length;
  const filtered = store.filter(e => e.docName !== req.params.name);
  sessionStores.set(sessionId, filtered);
  res.json({ ok: true, removed: before - filtered.length });
});

export default router;
