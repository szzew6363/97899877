import { PERSONAL_DEFAULT_MODEL, getPersonalOpenAI } from "./ai-providers";
import {
  ShortTermMemory,
  ltmRecall,
  createTaskRecord,
  updateTaskRecord,
} from "./agent-memory";
import { executeTool, TOOL_LIST_TEXT, type ToolName, type ToolArgs } from "./agent-tools";

// ── Event types streamed to client ────────────────────────────────────────────
export type AgentEvent =
  | { type: "task_id"; taskId: string }
  | { type: "plan"; steps: PlanStep[] }
  | { type: "step_start"; stepIndex: number; step: PlanStep }
  | { type: "thinking"; text: string }
  | { type: "tool_call"; tool: ToolName; args: ToolArgs }
  | { type: "tool_result"; tool: ToolName; output: string; success: boolean }
  | { type: "reflection"; assessment: string; continue_: boolean; adjusted?: string }
  | { type: "step_done"; stepIndex: number; success: boolean }
  | { type: "human_gate"; stepIndex: number; question: string; step: PlanStep }
  | { type: "done"; result: string; totalMs: number; taskId: string }
  | { type: "error"; message: string };

export type PlanStep = {
  id: string;
  title: string;
  description: string;
  tool?: ToolName;
  requiresHumanApproval?: boolean;
};

export type HumanGateAction = {
  action: "approve" | "reject" | "edit";
  editedInstruction?: string;
};

export type RunOptions = {
  goal: string;
  taskId: string;
  model?: string;
  maxSteps?: number;
  requireApprovalForTools?: ToolName[];
  onEvent: (event: AgentEvent) => void;
  waitForGate: (taskId: string, stepIndex: number) => Promise<HumanGateAction>;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function extractJson<T>(text: string): T | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1]!.trim() : text.trim();
  const objStart = raw.indexOf("{");
  const arrStart = raw.indexOf("[");
  const begin =
    arrStart !== -1 && (objStart === -1 || arrStart < objStart) ? arrStart : objStart;
  if (begin === -1) return null;
  const objEnd = raw.lastIndexOf("}");
  const arrEnd = raw.lastIndexOf("]");
  const end = (arrEnd > objEnd ? arrEnd : objEnd) + 1;
  try { return JSON.parse(raw.slice(begin, end)) as T; } catch { return null; }
}

// ── Main agent loop ───────────────────────────────────────────────────────────
export async function runAgent(opts: RunOptions): Promise<void> {
  const {
    goal, taskId, model, maxSteps = 12,
    requireApprovalForTools = [], onEvent, waitForGate,
  } = opts;

  const startTime = Date.now();
  const shortMem = new ShortTermMemory();
  const auditLog: string[] = [`[START] goal="${goal}" taskId=${taskId}`];
  const openai = getPersonalOpenAI();

  if (!openai) {
    onEvent({ type: "error", message: "No AI provider configured." });
    return;
  }

  const llmModel = model ?? PERSONAL_DEFAULT_MODEL;
  await createTaskRecord(taskId, goal);

  // Recall relevant long-term memories
  const recalls = await ltmRecall(goal, 3);
  const ltmContext = recalls.length > 0
    ? `Relevant long-term memories:\n${recalls.map(r => `[${r.key}]: ${r.content.slice(0, 250)}`).join("\n")}`
    : "";

  // ══ PHASE 1: PLAN ══════════════════════════════════════════════════════════
  onEvent({ type: "thinking", text: "Analyzing goal and building execution plan..." });

  const planPrompt = `You are an autonomous AI agent. Create a concrete step-by-step plan to accomplish the following goal.

GOAL: ${goal}

${ltmContext}

Available tools:
${TOOL_LIST_TEXT}

Reply with ONLY valid JSON (no markdown preamble):
{
  "steps": [
    {
      "id": "step-1",
      "title": "Short action title",
      "description": "Detailed description of what to do and why",
      "tool": "shell",
      "requiresHumanApproval": false
    }
  ]
}

Rules:
- Max ${maxSteps} steps. Prefer fewer, concrete steps over many vague ones.
- Each step uses exactly one tool, OR omit "tool" for pure reasoning/synthesis steps.
- Set requiresHumanApproval: true for destructive, irreversible, or sensitive actions.
- Be specific — include actual commands/queries/URLs in descriptions when possible.`;

  let planSteps: PlanStep[] = [];
  try {
    const planResp = await openai.chat.completions.create({
      model: llmModel,
      messages: [{ role: "user", content: planPrompt }],
      max_tokens: 2000,
    });
    const planText = planResp.choices[0]?.message?.content ?? "";
    const parsed = extractJson<{ steps: PlanStep[] }>(planText);
    if (parsed?.steps && Array.isArray(parsed.steps)) {
      planSteps = parsed.steps.slice(0, maxSteps).map((s, i) => ({
        ...s,
        id: s.id ?? `step-${i + 1}`,
      }));
    }
  } catch (e) {
    auditLog.push(`PLAN_ERROR: ${e}`);
  }

  if (planSteps.length === 0) {
    planSteps = [{ id: "step-1", title: "Execute Goal", description: goal, requiresHumanApproval: false }];
  }

  onEvent({ type: "plan", steps: planSteps });
  await updateTaskRecord(taskId, { planJson: planSteps });

  // ══ PHASE 2: EXECUTE ════════════════════════════════════════════════════════
  type StepRecord = { step: PlanStep; result: string; success: boolean };
  const completedSteps: StepRecord[] = [];
  let stepIndex = 0;

  while (stepIndex < planSteps.length) {
    const step = planSteps[stepIndex]!;
    onEvent({ type: "step_start", stepIndex, step });

    // ── Human gate ────────────────────────────────────────────────────────────
    const needsGate =
      step.requiresHumanApproval ||
      (step.tool !== undefined && requireApprovalForTools.includes(step.tool));

    if (needsGate) {
      onEvent({
        type: "human_gate",
        stepIndex,
        question: `Approve action: "${step.title}"\n\n${step.description}`,
        step,
      });
      const gate = await waitForGate(taskId, stepIndex);
      auditLog.push(`[HUMAN_GATE] step=${stepIndex} action=${gate.action}`);

      if (gate.action === "reject") {
        onEvent({ type: "step_done", stepIndex, success: false });
        completedSteps.push({ step, result: "Rejected by user", success: false });
        stepIndex++;
        continue;
      }
      if (gate.action === "edit" && gate.editedInstruction) {
        step.description = gate.editedInstruction;
        planSteps[stepIndex] = step;
      }
    }

    // ── Tool call ─────────────────────────────────────────────────────────────
    let toolOutput = "";
    let toolSuccess = true;

    if (step.tool) {
      onEvent({ type: "thinking", text: `Preparing ${step.tool} call for: ${step.title}` });

      const recentContext = completedSteps
        .slice(-3)
        .map(s => `• ${s.step.title}: ${s.result.slice(0, 200)}`)
        .join("\n");

      const argsPrompt = `You are executing step ${stepIndex + 1} of a multi-step task.

ORIGINAL GOAL: ${goal}
CURRENT STEP: "${step.title}"
DESCRIPTION: ${step.description}
TOOL: ${step.tool}

Recent results:
${recentContext || "(none)"}

Short-term memory:
${shortMem.getSummary()}

Generate ONLY the JSON arguments for the "${step.tool}" tool. No explanation, no markdown — just valid JSON.`;

      let toolArgs: ToolArgs = {};
      try {
        const argsResp = await openai.chat.completions.create({
          model: llmModel,
          messages: [{ role: "user", content: argsPrompt }],
          max_tokens: 600,
        });
        const parsed = extractJson<ToolArgs>(argsResp.choices[0]?.message?.content ?? "{}");
        if (parsed && typeof parsed === "object") toolArgs = parsed;
      } catch { /* use empty args */ }

      onEvent({ type: "tool_call", tool: step.tool, args: toolArgs });

      const result = await executeTool(step.tool, toolArgs, auditLog);
      toolOutput = result.output || result.error || "";
      toolSuccess = result.success;

      onEvent({ type: "tool_result", tool: step.tool, output: toolOutput, success: toolSuccess });
      shortMem.set(`step-${stepIndex}`, toolOutput.slice(0, 800));
    }

    // ── Reflect ───────────────────────────────────────────────────────────────
    onEvent({ type: "thinking", text: "Reflecting on result..." });

    const remainingTitles = planSteps.slice(stepIndex + 1).map(s => s.title).join(" → ");
    const reflectPrompt = `You just completed a step. Evaluate and decide whether to continue.

GOAL: ${goal}
STEP: ${step.title}
RESULT: ${toolOutput.slice(0, 1200)}
SUCCESS: ${toolSuccess}
REMAINING STEPS: ${remainingTitles || "(this was the last step)"}

Respond ONLY with JSON:
{
  "assessment": "brief 1-2 sentence evaluation",
  "continue": true,
  "plan_adjustment": null
}

- "continue": false ONLY if goal already achieved or unrecoverable error
- "plan_adjustment": a sentence if remaining steps need adjustment, otherwise null`;

    let assessment = "Step completed.";
    let shouldContinue = true;

    try {
      const reflectResp = await openai.chat.completions.create({
        model: llmModel,
        messages: [{ role: "user", content: reflectPrompt }],
        max_tokens: 300,
      });
      const parsed = extractJson<{
        assessment: string;
        continue: boolean;
        plan_adjustment?: string | null;
      }>(reflectResp.choices[0]?.message?.content ?? "");
      if (parsed) {
        assessment = parsed.assessment ?? assessment;
        shouldContinue = parsed.continue !== false;
        onEvent({
          type: "reflection",
          assessment,
          continue_: shouldContinue,
          adjusted: parsed.plan_adjustment ?? undefined,
        });
      }
    } catch { /* use defaults */ }

    completedSteps.push({ step, result: toolOutput || assessment, success: toolSuccess });
    onEvent({ type: "step_done", stepIndex, success: toolSuccess });

    await updateTaskRecord(taskId, {
      stepsJson: completedSteps.map(s => ({
        title: s.step.title,
        result: s.result.slice(0, 600),
        success: s.success,
      })),
    });

    if (!shouldContinue) break;
    stepIndex++;
  }

  // ══ PHASE 3: SYNTHESIZE ═════════════════════════════════════════════════════
  onEvent({ type: "thinking", text: "Synthesizing final report..." });

  const synthPrompt = `You are an AI agent that completed a multi-step task. Write a structured final report.

ORIGINAL GOAL: ${goal}

COMPLETED STEPS:
${completedSteps
  .map((s, i) => `${i + 1}. ${s.step.title}\n   Result: ${s.result.slice(0, 400)}\n   Success: ${s.success}`)
  .join("\n\n")}

Write a comprehensive final report:
1. Summary of accomplishments
2. Key findings and outputs
3. Any errors or limitations encountered
4. Recommendations for next steps

Be direct, structured, and concrete.`;

  let finalResult = "Task completed.";
  try {
    const synthResp = await openai.chat.completions.create({
      model: llmModel,
      messages: [{ role: "user", content: synthPrompt }],
      max_tokens: 1500,
    });
    finalResult = synthResp.choices[0]?.message?.content ?? finalResult;
  } catch { /* use default */ }

  const totalMs = Date.now() - startTime;
  await updateTaskRecord(taskId, {
    status: "done",
    result: finalResult,
    auditLog,
    completedAt: true,
    durationMs: totalMs,
  });

  onEvent({ type: "done", result: finalResult, totalMs, taskId });
}
