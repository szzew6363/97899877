/**
 * Chain of Thought (CoT) — Visual Reasoning
 * ───────────────────────────────────────────
 * Breaks down AI reasoning into explicit, visible steps.
 * Each step streams independently so the UI can animate them.
 *
 * SSE events:
 *   { type: "plan",    steps: [{id, title, description}] }  — reasoning plan
 *   { type: "step_start", stepId, title }
 *   { type: "step_chunk", stepId, content }
 *   { type: "step_done",  stepId, content }
 *   { type: "conclusion_start" }
 *   { type: "conclusion_chunk", content }
 *   { type: "done",    totalSteps, thinkingMs }
 *   { type: "error",   error }
 */

import { Router } from "express";
import { getOpenAICompatibleClient, PERSONAL_DEFAULT_MODEL } from "../lib/ai-providers.js";

const router = Router();

type CotStep = { id: string; title: string; description: string };
type CotPlanResult = { steps: CotStep[] };

const PLANNER_SYSTEM = `You are a reasoning planner. Given a question or problem, design a step-by-step reasoning chain.
Output ONLY valid JSON — an object with a "steps" array. Each step has:
- "id": short snake_case identifier
- "title": short title (3-6 words)
- "description": one sentence describing what this step does

Design 4-7 steps appropriate to the complexity. For simple questions, use 4. For complex ones, use 6-7.

Example output:
{
  "steps": [
    {"id": "problem_framing", "title": "Frame the Problem", "description": "Identify what exactly is being asked and any constraints."},
    {"id": "gather_facts", "title": "Gather Relevant Facts", "description": "List all known facts and relevant domain knowledge."},
    {"id": "hypothesis", "title": "Form a Hypothesis", "description": "Propose an initial answer or approach based on the facts."},
    {"id": "verify", "title": "Verify & Challenge", "description": "Test the hypothesis against edge cases and counterarguments."},
    {"id": "conclude", "title": "Draw Conclusion", "description": "Synthesize the analysis into a clear, final answer."}
  ]
}`;

function buildStepSystem(question: string, stepTitle: string, stepDescription: string, previousSteps: string): string {
  return `You are executing step "${stepTitle}" in a chain-of-thought reasoning process.

Original question: "${question}"

This step's goal: ${stepDescription}

${previousSteps ? `Previous reasoning steps completed:\n${previousSteps}\n` : ""}

Execute ONLY this step. Be thorough but focused. 80-200 words. Think out loud.
Do not skip ahead to the conclusion — that comes in a later step.`;
}

const CONCLUSION_SYSTEM = `You are synthesizing a chain-of-thought reasoning process into a final answer.
Given the original question and all the reasoning steps completed, write a clear, direct, comprehensive answer.
This is the final answer the user will see. Be thorough, well-structured, and concrete.`;

router.post("/chain-of-thought", async (req, res) => {
  const {
    question,
    model: reqModel,
    customSteps,
  } = req.body as {
    question?: string;
    model?: string;
    customSteps?: Array<{ id: string; title: string; description: string }>;
  };

  if (!question || question.trim().length < 3) {
    res.status(400).json({ error: "Question is required" });
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

  const model = reqModel || PERSONAL_DEFAULT_MODEL;
  const t0 = Date.now();

  try {
    // ── Step 1: Plan the reasoning chain ──────────────────────────────────────
    let steps: CotStep[];

    if (customSteps && customSteps.length >= 2) {
      steps = customSteps;
    } else {
      let planRaw = "";
      try {
        const planRes = await client.chat.completions.create({
          model,
          messages: [
            { role: "system", content: PLANNER_SYSTEM },
            { role: "user", content: `Question: ${question}` },
          ],
          max_tokens: 800,
          temperature: 0.3,
        });
        planRaw = planRes.choices?.[0]?.message?.content ?? "{}";
      } catch {
        planRaw = "{}";
      }

      // Parse plan
      let parsed: CotPlanResult = { steps: [] };
      try {
        const m = planRaw.match(/\{[\s\S]*\}/);
        if (m) parsed = JSON.parse(m[0]);
      } catch { /* ignore */ }

      // Fallback steps if parsing fails
      if (!parsed.steps || parsed.steps.length === 0) {
        parsed.steps = [
          { id: "understand", title: "Understand the Problem", description: "Identify what is being asked." },
          { id: "analyze", title: "Analyze Key Factors", description: "Break down the components and considerations." },
          { id: "reason", title: "Apply Reasoning", description: "Work through the logic step by step." },
          { id: "validate", title: "Validate the Approach", description: "Check for gaps or counterarguments." },
          { id: "synthesize", title: "Synthesize Answer", description: "Combine insights into the final answer." },
        ];
      }

      steps = parsed.steps;
    }

    send({ type: "plan", steps });

    if (aborted) { res.end(); return; }

    // ── Step 2: Execute each step ─────────────────────────────────────────────
    const stepResults: Array<{ step: CotStep; content: string }> = [];

    for (const step of steps) {
      if (aborted) break;

      send({ type: "step_start", stepId: step.id, title: step.title });

      const previousContext = stepResults
        .map((r) => `[${r.step.title}]:\n${r.content.slice(0, 500)}`)
        .join("\n\n");

      let stepContent = "";

      try {
        const stepStream = await client.chat.completions.create({
          model,
          messages: [
            {
              role: "system",
              content: buildStepSystem(question, step.title, step.description, previousContext),
            },
            { role: "user", content: `Execute step: ${step.title}` },
          ],
          stream: true,
          max_tokens: 400,
          temperature: 0.7,
        });

        for await (const chunk of stepStream) {
          if (aborted) break;
          const c = chunk.choices?.[0]?.delta?.content;
          if (c) {
            stepContent += c;
            send({ type: "step_chunk", stepId: step.id, content: c });
          }
        }
      } catch (e) {
        stepContent = `[Step execution error: ${e instanceof Error ? e.message : "unknown"}]`;
        send({ type: "step_chunk", stepId: step.id, content: stepContent });
      }

      stepResults.push({ step, content: stepContent });
      send({ type: "step_done", stepId: step.id, content: stepContent });

      if (aborted) break;
    }

    if (aborted) { res.end(); return; }

    // ── Step 3: Draw conclusion ───────────────────────────────────────────────
    send({ type: "conclusion_start" });

    const allStepsText = stepResults
      .map((r) => `**${r.step.title}**\n${r.content}`)
      .join("\n\n---\n\n");

    try {
      const conclusionStream = await client.chat.completions.create({
        model,
        messages: [
          { role: "system", content: CONCLUSION_SYSTEM },
          {
            role: "user",
            content: `Original question: ${question}\n\nReasoning steps:\n${allStepsText}`,
          },
        ],
        stream: true,
        max_tokens: 1000,
        temperature: 0.5,
      });

      for await (const chunk of conclusionStream) {
        if (aborted) break;
        const c = chunk.choices?.[0]?.delta?.content;
        if (c) send({ type: "conclusion_chunk", content: c });
      }
    } catch (e) {
      send({ type: "conclusion_chunk", content: `[Conclusion error: ${e instanceof Error ? e.message : "unknown"}]` });
    }

    send({ type: "done", totalSteps: steps.length, thinkingMs: Date.now() - t0 });
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "CoT error";
    send({ type: "error", error: msg });
    try { res.end(); } catch { /* ignore */ }
  }
});

export default router;
