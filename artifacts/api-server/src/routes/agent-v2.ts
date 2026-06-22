import { Router } from "express";
import { randomBytes } from "crypto";
import { runAgent, type HumanGateAction, type AgentEvent } from "../lib/agent-engine";
import { ensureMemoryTable, getTaskHistory, getTaskById } from "../lib/agent-memory";
import type { ToolName } from "../lib/agent-tools";

const router = Router();

// ── In-process gate resolver map ──────────────────────────────────────────────
const gateResolvers = new Map<string, (action: HumanGateAction) => void>();

function gateKey(taskId: string, stepIndex: number) {
  return `${taskId}:${stepIndex}`;
}

async function waitForGate(taskId: string, stepIndex: number): Promise<HumanGateAction> {
  return new Promise<HumanGateAction>((resolve) => {
    const key = gateKey(taskId, stepIndex);
    const timeout = setTimeout(() => {
      gateResolvers.delete(key);
      resolve({ action: "approve" });
    }, 5 * 60 * 1000);

    gateResolvers.set(key, (action) => {
      clearTimeout(timeout);
      gateResolvers.delete(key);
      resolve(action);
    });
  });
}

// Init tables on startup
ensureMemoryTable().catch(() => {});

// ── POST /api/agent-v2/run — launch agent (SSE stream) ───────────────────────
router.post("/agent-v2/run", async (req, res) => {
  const {
    goal,
    model,
    maxSteps,
    requireApprovalForTools = [],
  } = req.body as {
    goal?: string;
    model?: string;
    maxSteps?: number;
    requireApprovalForTools?: ToolName[];
  };

  if (!goal || goal.trim().length < 5) {
    res.status(400).json({ error: "goal is required (min 5 chars)" });
    return;
  }

  const taskId = randomBytes(8).toString("hex");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let aborted = false;
  req.on("close", () => { aborted = true; });

  const send = (data: AgentEvent) => {
    if (!aborted) {
      try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch {}
    }
  };

  // Send taskId first so client can use gate endpoint
  send({ type: "task_id", taskId });

  try {
    await runAgent({
      goal: goal.trim(),
      taskId,
      model,
      maxSteps: maxSteps ?? 12,
      requireApprovalForTools,
      onEvent: send,
      waitForGate,
    });
  } catch (err) {
    send({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }

  res.write("data: [DONE]\n\n");
  res.end();
});

// ── POST /api/agent-v2/:taskId/gate — resolve human gate ─────────────────────
router.post("/agent-v2/:taskId/gate", (req, res) => {
  const taskId = req.params["taskId"]!;
  const { stepIndex, action, editedInstruction } = req.body as {
    stepIndex: number;
    action: "approve" | "reject" | "edit";
    editedInstruction?: string;
  };

  const key = gateKey(taskId, stepIndex);
  const resolver = gateResolvers.get(key);

  if (!resolver) {
    res.status(404).json({ error: "No pending gate for this task/step" });
    return;
  }

  resolver({ action, editedInstruction });
  res.json({ ok: true, action });
});

// ── GET /api/agent-v2/history — all past tasks ───────────────────────────────
router.get("/agent-v2/history", async (_req, res) => {
  const tasks = await getTaskHistory(30);
  res.json({ ok: true, tasks });
});

// ── GET /api/agent-v2/:taskId — single task detail ────────────────────────────
router.get("/agent-v2/:taskId", async (req, res) => {
  const task = await getTaskById(req.params["taskId"]!);
  if (!task) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({ ok: true, task });
});

export default router;
