import { Router, type IRouter, type Request, type Response } from "express";
import { streamCompletion, callOnce } from "../lib/ai-providers";

const router: IRouter = Router();

type Msg = { role: "system" | "user" | "assistant"; content: string };

function sse(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function sseHeaders(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
}

const APP_BUILDER_SYSTEM = `You are Agent 4 — the world's most advanced autonomous software engineering AI.

When asked to build an application, you generate a complete, production-ready blueprint including:

1. PROJECT OVERVIEW — Name, description, target users, core value proposition
2. ARCHITECTURE — Frontend framework, backend stack, database choice, auth method, deployment target
3. DATABASE SCHEMA — All tables, fields, relationships, indexes (in SQL DDL format)
4. API ROUTES — Full REST/GraphQL API spec with methods, paths, request/response shapes
5. FRONTEND STRUCTURE — Pages, components, state management, routing
6. AUTHENTICATION — Login, signup, OAuth, JWT/session strategy
7. ADMIN PANEL — Dashboard, user management, analytics
8. DEPLOYMENT — CI/CD, environment variables, hosting recommendation
9. IMPLEMENTATION STEPS — Ordered task list for parallel agent execution
10. ESTIMATED TIMELINE — Per phase breakdown

Format output with clear section headers using === SECTION NAME === format.
Be extremely detailed, technical, and specific. Generate REAL code snippets for critical parts.
Every button must be functional. Every API must be complete. Think like a senior architect.`;

const PLAN_SYSTEM = `You are Agent 4 Plan Mode — an elite software project strategist.

Analyze the user's idea and generate a comprehensive, phased project plan:

PHASE 0: DISCOVERY & DESIGN
- User research, wireframes, design system

PHASE 1: FOUNDATION  
- Project setup, database, auth scaffold

PHASE 2: CORE FEATURES
- Primary feature development, API layer

PHASE 3: ADVANCED FEATURES
- Secondary features, integrations, optimizations

PHASE 4: TESTING & QA
- Unit tests, E2E tests, security audit

PHASE 5: DEPLOYMENT & LAUNCH
- CI/CD, monitoring, go-live

For each phase list: tasks, parallel work opportunities, dependencies, time estimate, agent assignments.
Use structured markdown with checkboxes and code snippets where relevant.`;

const PARALLEL_SYSTEM = `You are the Agent 4 Parallel Orchestrator — coordinating multiple specialized sub-agents.

For the given task, define exactly how parallel agents will split and execute the work:

AGENT A — Frontend Architect
AGENT B — Backend Engineer  
AGENT C — Database Designer
AGENT D — Security Specialist
AGENT E — DevOps Engineer

For each agent: current task, tools used, outputs produced, blocking dependencies, estimated steps.
Show real parallel execution — multiple agents working simultaneously on different parts.
Format as a live execution log with timestamps and status updates.`;

const SEARCH_SYSTEM = `You are Agent 4 Web Intelligence module.
When given a search query, synthesize comprehensive, up-to-date information as if you've searched the web.
Format results with: source citations, key findings, code examples, and actionable insights.
Focus on technical accuracy and practical value for developers.`;

const DEBUG_SYSTEM = `You are Agent 4 Debugging Engine — elite code analyzer and auto-fixer.

Analyze the provided error/code and:
1. ROOT CAUSE — Exact explanation of what went wrong and why
2. STACK TRACE ANALYSIS — Walk through each frame
3. FIX — Complete corrected code with explanation
4. PREVENTION — How to avoid this class of bug
5. TESTS — Unit tests to prevent regression

Output real, working code. Be precise, thorough, and surgical.`;

const DEPLOY_SYSTEM = `You are Agent 4 Deployment Engine.

Generate a complete deployment plan for the described application:
1. ENVIRONMENT SETUP — .env template, secrets management
2. DOCKER CONFIG — Dockerfile + docker-compose.yml  
3. CI/CD PIPELINE — GitHub Actions workflow
4. INFRASTRUCTURE — Cloud provider setup (Replit/Vercel/AWS/GCP)
5. MONITORING — Logging, alerts, uptime checks
6. ROLLBACK STRATEGY — How to safely revert
7. SCALING PLAN — When/how to scale each component

Include real config files and deployment commands.`;

function getModePromptSuffix(mode: string): string {
  switch (mode) {
    case "turbo": return "\n\nTURBO MODE: Maximum speed. Dense, actionable output. Skip preamble. Jump straight to results.";
    case "max": return "\n\nMAX MODE: Exhaustive depth. Cover every edge case, every consideration. Be encyclopedic.";
    case "power": return "\n\nPOWER MODE: Use the strongest reasoning. Multi-step analysis. Show your chain of thought explicitly.";
    case "autonomous": return "\n\nAUTONOMOUS MODE: Self-directed execution. Make all decisions independently. Assume full authority.";
    case "lite": return "\n\nLITE MODE: Focused and concise. Key points only. Fast and practical.";
    default: return "";
  }
}

router.post("/agent4/build", async (req: Request, res: Response) => {
  sseHeaders(res);
  try {
    const { description, mode = "autonomous", language = "en" } = req.body as {
      description?: string; mode?: string; language?: string;
    };
    if (!description?.trim()) { sse(res, "error", { message: "Description required" }); return res.end(); }

    const langNote = language === "ar" ? "\n\nRespond in Arabic." : "";
    const systemPrompt = APP_BUILDER_SYSTEM + getModePromptSuffix(mode) + langNote;

    sse(res, "phase", { phase: "analyzing", label: "Analyzing project requirements..." });
    await new Promise(r => setTimeout(r, 300));
    sse(res, "phase", { phase: "architecting", label: "Designing system architecture..." });
    await new Promise(r => setTimeout(r, 300));
    sse(res, "phase", { phase: "generating", label: "Generating full application blueprint..." });

    const messages: Msg[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Build this application: ${description}` },
    ];

    for await (const chunk of streamCompletion(messages)) {
      if (chunk.error) { sse(res, "error", { message: chunk.error }); break; }
      if (chunk.content) sse(res, "chunk", { text: chunk.content });
      if (chunk.done) sse(res, "done", { ok: true });
    }
  } catch (e) {
    sse(res, "error", { message: e instanceof Error ? e.message : "Build failed" });
  }
  res.end();
});

router.post("/agent4/plan", async (req: Request, res: Response) => {
  sseHeaders(res);
  try {
    const { idea, mode = "power", language = "en" } = req.body as {
      idea?: string; mode?: string; language?: string;
    };
    if (!idea?.trim()) { sse(res, "error", { message: "Idea required" }); return res.end(); }

    const langNote = language === "ar" ? "\n\nRespond in Arabic." : "";
    const messages: Msg[] = [
      { role: "system", content: PLAN_SYSTEM + getModePromptSuffix(mode) + langNote },
      { role: "user", content: `Create a full project plan for: ${idea}` },
    ];

    sse(res, "phase", { phase: "planning", label: "Running strategic analysis..." });

    for await (const chunk of streamCompletion(messages)) {
      if (chunk.error) { sse(res, "error", { message: chunk.error }); break; }
      if (chunk.content) sse(res, "chunk", { text: chunk.content });
      if (chunk.done) sse(res, "done", { ok: true });
    }
  } catch (e) {
    sse(res, "error", { message: e instanceof Error ? e.message : "Plan failed" });
  }
  res.end();
});

router.post("/agent4/parallel", async (req: Request, res: Response) => {
  sseHeaders(res);
  try {
    const { task, mode = "autonomous", language = "en" } = req.body as {
      task?: string; mode?: string; language?: string;
    };
    if (!task?.trim()) { sse(res, "error", { message: "Task required" }); return res.end(); }

    const langNote = language === "ar" ? "\n\nRespond in Arabic." : "";
    const messages: Msg[] = [
      { role: "system", content: PARALLEL_SYSTEM + getModePromptSuffix(mode) + langNote },
      { role: "user", content: `Orchestrate parallel agent execution for: ${task}` },
    ];

    sse(res, "phase", { phase: "spawning", label: "Spawning parallel agent swarm..." });

    for await (const chunk of streamCompletion(messages)) {
      if (chunk.error) { sse(res, "error", { message: chunk.error }); break; }
      if (chunk.content) sse(res, "chunk", { text: chunk.content });
      if (chunk.done) sse(res, "done", { ok: true });
    }
  } catch (e) {
    sse(res, "error", { message: e instanceof Error ? e.message : "Parallel execution failed" });
  }
  res.end();
});

router.post("/agent4/search", async (req: Request, res: Response) => {
  sseHeaders(res);
  try {
    const { query, mode = "turbo", language = "en" } = req.body as {
      query?: string; mode?: string; language?: string;
    };
    if (!query?.trim()) { sse(res, "error", { message: "Query required" }); return res.end(); }

    const langNote = language === "ar" ? "\n\nRespond in Arabic." : "";
    const messages: Msg[] = [
      { role: "system", content: SEARCH_SYSTEM + getModePromptSuffix(mode) + langNote },
      { role: "user", content: `Search and synthesize: ${query}` },
    ];

    sse(res, "phase", { phase: "searching", label: "Scanning web intelligence sources..." });

    for await (const chunk of streamCompletion(messages)) {
      if (chunk.error) { sse(res, "error", { message: chunk.error }); break; }
      if (chunk.content) sse(res, "chunk", { text: chunk.content });
      if (chunk.done) sse(res, "done", { ok: true });
    }
  } catch (e) {
    sse(res, "error", { message: e instanceof Error ? e.message : "Search failed" });
  }
  res.end();
});

router.post("/agent4/debug", async (req: Request, res: Response) => {
  sseHeaders(res);
  try {
    const { code, error: errMsg, mode = "power", language = "en" } = req.body as {
      code?: string; error?: string; mode?: string; language?: string;
    };
    if (!code?.trim() && !errMsg?.trim()) { sse(res, "error", { message: "Code or error required" }); return res.end(); }

    const langNote = language === "ar" ? "\n\nRespond in Arabic." : "";
    const input = [code && `Code:\n\`\`\`\n${code}\n\`\`\``, errMsg && `Error:\n${errMsg}`].filter(Boolean).join("\n\n");

    const messages: Msg[] = [
      { role: "system", content: DEBUG_SYSTEM + getModePromptSuffix(mode) + langNote },
      { role: "user", content: `Debug this: ${input}` },
    ];

    sse(res, "phase", { phase: "analyzing", label: "Running deep stack analysis..." });

    for await (const chunk of streamCompletion(messages)) {
      if (chunk.error) { sse(res, "error", { message: chunk.error }); break; }
      if (chunk.content) sse(res, "chunk", { text: chunk.content });
      if (chunk.done) sse(res, "done", { ok: true });
    }
  } catch (e) {
    sse(res, "error", { message: e instanceof Error ? e.message : "Debug failed" });
  }
  res.end();
});

router.post("/agent4/deploy", async (req: Request, res: Response) => {
  sseHeaders(res);
  try {
    const { app, mode = "autonomous", language = "en" } = req.body as {
      app?: string; mode?: string; language?: string;
    };
    if (!app?.trim()) { sse(res, "error", { message: "App description required" }); return res.end(); }

    const langNote = language === "ar" ? "\n\nRespond in Arabic." : "";
    const messages: Msg[] = [
      { role: "system", content: DEPLOY_SYSTEM + getModePromptSuffix(mode) + langNote },
      { role: "user", content: `Generate deployment plan for: ${app}` },
    ];

    sse(res, "phase", { phase: "deploying", label: "Generating deployment pipeline..." });

    for await (const chunk of streamCompletion(messages)) {
      if (chunk.error) { sse(res, "error", { message: chunk.error }); break; }
      if (chunk.content) sse(res, "chunk", { text: chunk.content });
      if (chunk.done) sse(res, "done", { ok: true });
    }
  } catch (e) {
    sse(res, "error", { message: e instanceof Error ? e.message : "Deploy failed" });
  }
  res.end();
});

router.post("/agent4/autofix", async (req: Request, res: Response) => {
  sseHeaders(res);
  try {
    const { description, mode = "max", language = "en" } = req.body as {
      description?: string; mode?: string; language?: string;
    };
    if (!description?.trim()) { sse(res, "error", { message: "Description required" }); return res.end(); }

    const langNote = language === "ar" ? "\n\nRespond in Arabic." : "";
    const system = `You are Agent 4 AutoFix — autonomous error detection and repair system.
Analyze the described issue and:
1. Diagnose root cause
2. Generate exact fix with full working code
3. Run simulated test to verify
4. Confirm resolution

Be surgical, precise, and confident.` + getModePromptSuffix(mode) + langNote;

    const messages: Msg[] = [
      { role: "system", content: system },
      { role: "user", content: description },
    ];

    sse(res, "phase", { phase: "scanning", label: "Auto-scanning for issues..." });

    for await (const chunk of streamCompletion(messages)) {
      if (chunk.error) { sse(res, "error", { message: chunk.error }); break; }
      if (chunk.content) sse(res, "chunk", { text: chunk.content });
      if (chunk.done) sse(res, "done", { ok: true });
    }
  } catch (e) {
    sse(res, "error", { message: e instanceof Error ? e.message : "AutoFix failed" });
  }
  res.end();
});

router.post("/agent4/collaborate", async (req: Request, res: Response) => {
  sseHeaders(res);
  try {
    const { context, mode = "autonomous", language = "en" } = req.body as {
      context?: string; mode?: string; language?: string;
    };
    if (!context?.trim()) { sse(res, "error", { message: "Context required" }); return res.end(); }

    const langNote = language === "ar" ? "\n\nRespond in Arabic." : "";
    const system = `You are Agent 4 Collaboration Engine — managing multi-user development coordination.
For the given project context, generate:
1. TEAM STRUCTURE — Roles, responsibilities, access levels
2. BRANCH STRATEGY — Git workflow, naming conventions, PR templates
3. TASK DISTRIBUTION — Who does what, when, how
4. CONFLICT RESOLUTION — Merge strategy, code review process
5. COMMUNICATION PROTOCOL — Stand-ups, reviews, async coordination
6. VERSION CONTROL — Release schedule, changelog format, tagging
Output practical, immediately actionable guidance.` + getModePromptSuffix(mode) + langNote;

    const messages: Msg[] = [
      { role: "system", content: system },
      { role: "user", content: `Setup collaboration for: ${context}` },
    ];

    sse(res, "phase", { phase: "coordinating", label: "Setting up team coordination..." });

    for await (const chunk of streamCompletion(messages)) {
      if (chunk.error) { sse(res, "error", { message: chunk.error }); break; }
      if (chunk.content) sse(res, "chunk", { text: chunk.content });
      if (chunk.done) sse(res, "done", { ok: true });
    }
  } catch (e) {
    sse(res, "error", { message: e instanceof Error ? e.message : "Collaboration setup failed" });
  }
  res.end();
});

/* ─── Real Web Search (DuckDuckGo Instant + AI analysis) ─────── */
router.get("/agent4/websearch", async (req: Request, res: Response) => {
  const q = (req.query.q as string ?? "").trim();
  if (!q) { res.json({ ok: false, results: [] }); return; }

  try {
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1&t=agent4`;
    const ddgRes = await fetch(ddgUrl, { headers: { "User-Agent": "Agent4/1.0" }, signal: AbortSignal.timeout(8000) });
    const ddg = await ddgRes.json() as {
      AbstractText?: string; AbstractURL?: string; AbstractSource?: string;
      RelatedTopics?: { Text?: string; FirstURL?: string; Topics?: { Text?: string; FirstURL?: string }[] }[];
      Results?: { Text?: string; FirstURL?: string }[];
      Answer?: string; Heading?: string;
    };

    type Res = { title: string; url: string; snippet: string; icon: string; category: string; relevance: number };
    const results: Res[] = [];
    const icons = ["🔍","🌐","📄","🔗","💡","📊","🛡️","⚡","📦","🔧"];
    let idx = 0;

    if (ddg.Answer) {
      results.push({ title: ddg.Heading ?? "إجابة مباشرة", url: ddg.AbstractURL ?? "#", snippet: ddg.Answer, icon: "💡", category: "إجابة", relevance: 0.99 });
    }
    if (ddg.AbstractText) {
      results.push({ title: ddg.Heading ?? q, url: ddg.AbstractURL ?? "#", snippet: ddg.AbstractText, icon: "📖", category: ddg.AbstractSource ?? "ويكيبيديا", relevance: 0.95 });
    }
    for (const r of ddg.Results ?? []) {
      if (!r.Text) continue;
      results.push({ title: r.Text.slice(0,80), url: r.FirstURL ?? "#", snippet: r.Text, icon: icons[idx % icons.length], category: "نتيجة", relevance: 0.9 - idx * 0.02 });
      idx++;
    }
    for (const t of ddg.RelatedTopics ?? []) {
      if ((t as { Topics?: unknown[] }).Topics) {
        for (const sub of (t as { Topics: { Text?: string; FirstURL?: string }[] }).Topics ?? []) {
          if (!sub.Text) continue;
          results.push({ title: sub.Text.slice(0,80), url: sub.FirstURL ?? "#", snippet: sub.Text, icon: icons[idx % icons.length], category: "مرتبط", relevance: 0.75 - idx * 0.01 });
          idx++;
          if (results.length >= 12) break;
        }
      } else if (t.Text) {
        results.push({ title: t.Text.slice(0,80), url: t.FirstURL ?? "#", snippet: t.Text, icon: icons[idx % icons.length], category: "مرتبط", relevance: 0.8 - idx * 0.01 });
        idx++;
      }
      if (results.length >= 12) break;
    }

    // If no results, generate AI-simulated results
    if (results.length === 0) {
      results.push(
        { title: `${q} — نظرة عامة`, url: "https://en.wikipedia.org/wiki/" + encodeURIComponent(q), snippet: "لم يُعثر على نتائج مباشرة. استخدم التحليل الذكي للحصول على معلومات.", icon: "🌐", category: "عام", relevance: 0.7 },
        { title: `${q} — توثيق`, url: "https://developer.mozilla.org/search?q=" + encodeURIComponent(q), snippet: "ابحث في MDN للتوثيق التقني المفصّل.", icon: "📚", category: "توثيق", relevance: 0.65 },
        { title: `${q} — GitHub`, url: "https://github.com/search?q=" + encodeURIComponent(q), snippet: "مستودعات مفتوحة المصدر ذات صلة.", icon: "🐙", category: "كود", relevance: 0.6 },
      );
    }

    res.json({ ok: true, results });
  } catch {
    res.json({ ok: false, results: [
      { title: q, url: "#", snippet: "فشل جلب نتائج الويب — تحقق من الاتصال.", icon: "⚠️", category: "خطأ", relevance: 0 }
    ]});
  }
});

/* ─── AI Slides Generator ─────────────────────────────────────── */
router.post("/agent4/slides", async (req: Request, res: Response) => {
  const { topic = "", mode = "max", language = "ar" } = req.body as { topic?: string; mode?: string; language?: string };
  sseHeaders(res);

  const sys = `You are an expert presentation designer. Generate a professional ${language === "ar" ? "Arabic" : "English"} slide deck.

Output format — separate each slide with: === SLIDE N ===
Each slide has:
# Title
Subtitle: (optional)
Content: bullet points or paragraphs

Generate 6-8 slides with varied layouts: title, overview, details, analysis, chart data, quote, conclusion.
Be comprehensive, data-rich, and visually descriptive.`;

  const prompt = `Create a professional presentation about: "${topic}"
Include: executive summary, key metrics, analysis, recommendations, conclusion.
Make it impressive and data-driven.`;

  try {
    for await (const chunk of streamCompletion([
      { role: "system", content: sys },
      { role: "user",   content: prompt },
    ], { model: "gpt-4o", maxTokens: 2000, temperature: 0.7 })) {
      if (chunk.content) sse(res, "chunk", { text: chunk.content });
      if (chunk.done)    sse(res, "done",  { ok: true });
    }
  } catch (e) {
    sse(res, "error", { message: e instanceof Error ? e.message : "Slides generation failed" });
  }
  res.end();
});

/* ─── Integrations Code Generator ────────────────────────────── */
router.post("/agent4/integrate", async (req: Request, res: Response) => {
  const { service = "", config = "", mode = "turbo", language = "ar" } = req.body as { service?: string; config?: string; mode?: string; language?: string };
  sseHeaders(res);

  const sys = `You are an expert integration engineer. Generate production-ready TypeScript/JavaScript code for integrating with external services.
Always include: error handling, TypeScript types, environment variable usage, and real API examples.
Code should be copy-paste ready.`;

  const prompt = `Generate complete integration code for: ${service}
Configuration: ${config}
Include:
1. Full setup code with TypeScript types
2. Authentication setup
3. 3+ practical usage examples
4. Error handling
5. Environment variables list (.env format)
6. Brief explanation in ${language === "ar" ? "Arabic" : "English"}`;

  try {
    for await (const chunk of streamCompletion([
      { role: "system", content: sys },
      { role: "user",   content: prompt },
    ], { model: "gpt-4o", maxTokens: 2000, temperature: 0.3 })) {
      if (chunk.content) sse(res, "chunk", { text: chunk.content });
      if (chunk.done)    sse(res, "done",  { ok: true });
    }
  } catch (e) {
    sse(res, "error", { message: e instanceof Error ? e.message : "Integration code generation failed" });
  }
  res.end();
});

export default router;

