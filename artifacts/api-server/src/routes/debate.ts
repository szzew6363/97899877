/**
 * Debate Mode
 * ────────────
 * Two AI brains argue opposite sides of a topic.
 * A judge AI evaluates the arguments and declares a winner.
 *
 * SSE events:
 *   { type: "setup", topic, sideA, sideB }
 *   { type: "opening_a", content }
 *   { type: "opening_b", content }
 *   { type: "rebuttal_a", content }
 *   { type: "rebuttal_b", content }
 *   { type: "closing_a", content }
 *   { type: "closing_b", content }
 *   { type: "judgment", scores, winner, analysis }
 *   { type: "done" }
 *   { type: "error", error }
 */

import { Router } from "express";
import { getOpenAICompatibleClient, PERSONAL_DEFAULT_MODEL } from "../lib/ai-providers.js";

const router = Router();

const DEBATE_POSITIONS = [
  "FOR", "AGAINST", "PROSECUTION", "DEFENSE",
  "PROPONENT", "CRITIC", "OPTIMIST", "PESSIMIST",
  "INNOVATOR", "TRADITIONALIST",
];

type DebateRound = "opening" | "rebuttal" | "closing";

const ROUND_INSTRUCTIONS: Record<DebateRound, { a: string; b: string }> = {
  opening: {
    a: "Deliver your opening statement. Lay out your strongest arguments clearly and compellingly. 150-200 words.",
    b: "Deliver your opening statement from your position. Lay out your strongest arguments clearly and compellingly. 150-200 words.",
  },
  rebuttal: {
    a: "You just heard your opponent's opening. Rebut their strongest points and reinforce your own position. Be sharp and specific. 100-150 words.",
    b: "You just heard your opponent's opening. Rebut their strongest points and reinforce your own position. Be sharp and specific. 100-150 words.",
  },
  closing: {
    a: "Deliver a compelling closing argument. Summarize why your position wins. 80-120 words.",
    b: "Deliver a compelling closing argument. Summarize why your position wins. 80-120 words.",
  },
};

const JUDGE_SYSTEM = `You are an impartial debate judge. Evaluate two debaters on:
- LOGIC (30 pts): Are the arguments logically sound?
- EVIDENCE (25 pts): Are claims supported with facts/examples?
- RHETORIC (20 pts): Is the language compelling and clear?
- REBUTTAL (25 pts): Did they effectively address their opponent?

Output ONLY valid JSON:
{
  "sideA": { "logic": <0-30>, "evidence": <0-25>, "rhetoric": <0-20>, "rebuttal": <0-25>, "total": <0-100> },
  "sideB": { "logic": <0-30>, "evidence": <0-25>, "rhetoric": <0-20>, "rebuttal": <0-25>, "total": <0-100> },
  "winner": "A" | "B" | "TIE",
  "analysis": "<2-3 sentence verdict explaining why the winner prevailed>"
}`;

function buildDebaterSystem(topic: string, side: string, position: string, otherPosition: string): string {
  return `You are a skilled debater arguing ${position} on the following topic:
Topic: "${topic}"

Your position: ${position} (${side === "A" ? "Side A" : "Side B"})
Your opponent's position: ${otherPosition}

Rules:
- Stay firmly in your assigned position regardless of your actual views
- Use facts, logic, and compelling rhetoric
- Be direct and confident
- Keep responses concise and punchy
- Do NOT start with "I" or acknowledgment phrases
- Write as if speaking to a live audience`;
}

router.post("/debate", async (req, res) => {
  const {
    topic,
    positionA = "FOR",
    positionB = "AGAINST",
    rounds = 1, // 1 = opening+rebuttal+closing, 2 = adds second rebuttal
  } = req.body as {
    topic?: string;
    positionA?: string;
    positionB?: string;
    rounds?: number;
  };

  if (!topic || topic.trim().length < 5) {
    res.status(400).json({ error: "Topic is required (min 5 chars)" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let aborted = false;
  req.on("close", () => { aborted = true; });

  const send = (data: Record<string, unknown>) => {
    if (!aborted) {
      try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch { /* ignore */ }
    }
  };

  const client = getOpenAICompatibleClient("personal");
  if (!client) {
    send({ type: "error", error: "No AI provider configured" });
    res.end();
    return;
  }

  const posA = positionA || DEBATE_POSITIONS[0];
  const posB = positionB || DEBATE_POSITIONS[1];

  send({ type: "setup", topic: topic.trim(), sideA: posA, sideB: posB });

  const sysA = buildDebaterSystem(topic, "A", posA, posB);
  const sysB = buildDebaterSystem(topic, "B", posB, posA);

  // History of each debater
  const histA: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: sysA },
  ];
  const histB: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: sysB },
  ];

  const fullTranscript: { side: string; round: string; content: string }[] = [];

  async function runRound(round: DebateRound): Promise<void> {
    if (aborted) return;

    // Side A speaks
    const instrA = ROUND_INSTRUCTIONS[round].a;
    histA.push({ role: "user", content: instrA });

    let aContent = "";
    send({ type: `${round}_a_start` });

    try {
      const streamA = await client!.chat.completions.create({
        model: PERSONAL_DEFAULT_MODEL,
        messages: histA,
        stream: true,
        max_tokens: 400,
        temperature: 0.85,
      });
      for await (const chunk of streamA) {
        if (aborted) break;
        const c = chunk.choices?.[0]?.delta?.content;
        if (c) {
          aContent += c;
          send({ type: `${round}_a`, content: c });
        }
      }
    } catch (e) {
      send({ type: "error", error: `Side A error: ${e instanceof Error ? e.message : "unknown"}` });
    }

    histA.push({ role: "assistant", content: aContent });
    fullTranscript.push({ side: "A", round, content: aContent });

    if (aborted) return;

    // Side B gets context of what A said, then responds
    const instrB = round === "rebuttal"
      ? `Your opponent just said:\n"${aContent}"\n\n${ROUND_INSTRUCTIONS[round].b}`
      : ROUND_INSTRUCTIONS[round].b;

    histB.push({ role: "user", content: instrB });
    let bContent = "";
    send({ type: `${round}_b_start` });

    try {
      const streamB = await client!.chat.completions.create({
        model: PERSONAL_DEFAULT_MODEL,
        messages: histB,
        stream: true,
        max_tokens: 400,
        temperature: 0.85,
      });
      for await (const chunk of streamB) {
        if (aborted) break;
        const c = chunk.choices?.[0]?.delta?.content;
        if (c) {
          bContent += c;
          send({ type: `${round}_b`, content: c });
        }
      }
    } catch (e) {
      send({ type: "error", error: `Side B error: ${e instanceof Error ? e.message : "unknown"}` });
    }

    histB.push({ role: "assistant", content: bContent });
    fullTranscript.push({ side: "B", round, content: bContent });

    // Feed B's response back to A as context for next round
    if (round !== "closing") {
      histA.push({ role: "user", content: `Your opponent just said:\n"${bContent}"` });
      histA.push({ role: "assistant", content: "(noted — I will address this in my next turn)" });
    }
  }

  try {
    await runRound("opening");
    if (aborted) { res.end(); return; }
    await runRound("rebuttal");
    if (aborted) { res.end(); return; }
    if (rounds >= 2) {
      await runRound("rebuttal");
      if (aborted) { res.end(); return; }
    }
    await runRound("closing");
    if (aborted) { res.end(); return; }

    // ── Judge evaluates ──
    send({ type: "judging" });

    const transcriptText = fullTranscript
      .map((t) => `[Side ${t.side} — ${t.round}]: ${t.content}`)
      .join("\n\n---\n\n");

    try {
      const judgeRes = await client!.chat.completions.create({
        model: PERSONAL_DEFAULT_MODEL,
        messages: [
          { role: "system", content: JUDGE_SYSTEM },
          {
            role: "user",
            content: `Topic: "${topic}"\nSide A: ${posA}\nSide B: ${posB}\n\nDebate transcript:\n${transcriptText}`,
          },
        ],
        max_tokens: 600,
        temperature: 0.3,
      });

      const raw = judgeRes.choices?.[0]?.message?.content ?? "{}";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const judgment = jsonMatch ? JSON.parse(jsonMatch[0]) : { winner: "TIE", analysis: "Unable to evaluate.", sideA: { total: 50 }, sideB: { total: 50 } };
      send({ type: "judgment", ...judgment });
    } catch (e) {
      send({ type: "judgment", winner: "TIE", analysis: "Judgment error occurred.", sideA: { total: 50 }, sideB: { total: 50 } });
    }

    send({ type: "done" });
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Debate error";
    send({ type: "error", error: msg });
    res.end();
  }
});

// Available positions
router.get("/debate/positions", (_req, res) => {
  res.json({ positions: DEBATE_POSITIONS });
});

export default router;
