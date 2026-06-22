import { useState, useRef, useEffect, useCallback } from "react";
import { X, Brain, Play, CheckCircle, Circle, Loader, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

type CotStep = { id: string; title: string; description: string };
type StepStatus = "pending" | "active" | "done";

type StepState = CotStep & {
  status: StepStatus;
  content: string;
};

const EXAMPLE_QUESTIONS = [
  "How would I build a stealth C2 channel using DNS tunneling?",
  "What is the best approach to bypass AMSI in PowerShell?",
  "Explain how to perform a SQL injection attack step by step",
  "How does a kernel rootkit maintain persistence on Linux?",
  "Design an OSINT strategy to deanonymize a Tor user",
];

export function ChainOfThoughtModal({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<StepState[]>([]);
  const [conclusion, setConclusion] = useState("");
  const [concluding, setConcluding] = useState(false);
  const [done, setDone] = useState(false);
  const [thinkingMs, setThinkingMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const BASE = (window as Window & { __API_BASE__?: string }).__API_BASE__ ?? "";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [steps, conclusion, concluding]);

  const toggleStep = (id: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const start = useCallback(async () => {
    if (!question.trim()) return;
    setRunning(true);
    setSteps([]);
    setConclusion("");
    setConcluding(false);
    setDone(false);
    setThinkingMs(null);
    setError(null);
    setExpandedSteps(new Set());

    abortRef.current = new AbortController();
    try {
      const res = await fetch(`${BASE}/api/chain-of-thought`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
        signal: abortRef.current.signal,
        credentials: "include",
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6)) as Record<string, unknown>;
            switch (evt.type) {
              case "plan": {
                const planSteps = (evt.steps as CotStep[]).map(s => ({
                  ...s, status: "pending" as StepStatus, content: "",
                }));
                setSteps(planSteps);
                break;
              }
              case "step_start": {
                const sid = evt.stepId as string;
                setSteps(prev => prev.map(s => s.id === sid ? { ...s, status: "active" } : s));
                setExpandedSteps(prev => new Set([...prev, sid]));
                break;
              }
              case "step_chunk": {
                const sid = evt.stepId as string;
                const content = evt.content as string;
                setSteps(prev => prev.map(s => s.id === sid ? { ...s, content: s.content + content } : s));
                break;
              }
              case "step_done": {
                const sid = evt.stepId as string;
                setSteps(prev => prev.map(s => s.id === sid ? { ...s, status: "done" } : s));
                break;
              }
              case "conclusion_start": {
                setConcluding(true);
                break;
              }
              case "conclusion_chunk": {
                const content = evt.content as string;
                setConclusion(prev => prev + content);
                break;
              }
              case "done": {
                setThinkingMs(evt.thinkingMs as number);
                setDone(true);
                setConcluding(false);
                break;
              }
              case "error": {
                setError(evt.error as string);
                break;
              }
            }
          } catch { /* parse error */ }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      setRunning(false);
    }
  }, [question, BASE]);

  const stop = () => {
    abortRef.current?.abort();
    setRunning(false);
  };

  const stepIcon = (status: StepStatus) => {
    if (status === "done") return <CheckCircle size={14} color="#22c55e" />;
    if (status === "active") return <Loader size={14} color="#00e5ff" style={{ animation: "spin 1s linear infinite" }} />;
    return <Circle size={14} color="rgba(255,255,255,0.2)" />;
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9990, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-dot { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
      <div style={{ width: "100%", maxWidth: 820, height: "90vh", display: "flex", flexDirection: "column", background: "#080808", border: "1px solid rgba(0,229,255,0.25)", borderRadius: 12, overflow: "hidden", fontFamily: "monospace" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(90deg, rgba(0,229,255,0.05), rgba(168,139,250,0.03))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Brain size={16} color="#00e5ff" />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", letterSpacing: "0.1em" }}>CHAIN OF THOUGHT</span>
            <span style={{ fontSize: 9, color: "#a78bfa", background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 3, padding: "1px 6px" }}>VISUAL REASONING</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {thinkingMs && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>Thought for {(thinkingMs / 1000).toFixed(1)}s</span>}
            <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><X size={16} /></button>
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <textarea
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Enter your question or problem..."
              rows={2}
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "8px 10px", color: "rgba(255,255,255,0.85)", fontSize: 12, resize: "none", outline: "none", fontFamily: "monospace" }}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && !running) start(); }}
            />
            {!running ? (
              <button onClick={start} disabled={!question.trim()} style={{ background: "#00e5ff", border: "none", borderRadius: 6, padding: "8px 14px", color: "#000", fontSize: 11, fontWeight: "bold", cursor: question.trim() ? "pointer" : "not-allowed", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: question.trim() ? 1 : 0.5, whiteSpace: "nowrap" }}>
                <Play size={14} />Think
              </button>
            ) : (
              <button onClick={stop} style={{ background: "rgba(226,18,39,0.2)", border: "1px solid rgba(226,18,39,0.4)", borderRadius: 6, padding: "8px 14px", color: "#e21227", fontSize: 11, cursor: "pointer" }}>Stop</button>
            )}
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {EXAMPLE_QUESTIONS.slice(0, 3).map(q => (
              <button key={q} onClick={() => setQuestion(q)} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, padding: "2px 7px", color: "rgba(255,255,255,0.3)", fontSize: 9, cursor: "pointer", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Step tree — left sidebar */}
          {steps.length > 0 && (
            <div style={{ width: 200, borderRight: "1px solid rgba(255,255,255,0.05)", padding: "12px 10px", overflowY: "auto", flexShrink: 0 }}>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", marginBottom: 10 }}>REASONING PLAN</div>
              {steps.map((step, i) => (
                <div key={step.id} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12, cursor: "pointer" }} onClick={() => toggleStep(step.id)}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                    {stepIcon(step.status)}
                    {i < steps.length - 1 && (
                      <div style={{ width: 1, height: 20, background: step.status === "done" ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)", marginTop: 2 }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: step.status === "active" ? "#00e5ff" : step.status === "done" ? "#22c55e" : "rgba(255,255,255,0.4)", fontWeight: step.status === "active" ? "bold" : "normal", lineHeight: 1.3 }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)", marginTop: 1 }}>{step.description.slice(0, 60)}…</div>
                  </div>
                </div>
              ))}
              {concluding && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Loader size={14} color="#a78bfa" style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 10, color: "#a78bfa" }}>Concluding...</span>
                </div>
              )}
              {done && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                  <CheckCircle size={14} color="#22c55e" />
                  <span style={{ fontSize: 10, color: "#22c55e" }}>Complete</span>
                </div>
              )}
            </div>
          )}

          {/* Step details — main area */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {error && (
              <div style={{ background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.2)", borderRadius: 6, padding: 12, marginBottom: 12, fontSize: 11, color: "#e21227" }}>
                Error: {error}
              </div>
            )}

            {/* Steps */}
            {steps.map((step) => (
              <div key={step.id} style={{ marginBottom: 12, border: `1px solid ${step.status === "active" ? "rgba(0,229,255,0.3)" : step.status === "done" ? "rgba(34,197,94,0.15)" : "rgba(255,255,255,0.05)"}`, borderRadius: 8, overflow: "hidden", transition: "border-color 0.3s" }}>
                {/* Step header */}
                <div
                  onClick={() => step.content && toggleStep(step.id)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: step.status === "active" ? "rgba(0,229,255,0.05)" : step.status === "done" ? "rgba(34,197,94,0.04)" : "rgba(255,255,255,0.02)", cursor: step.content ? "pointer" : "default" }}
                >
                  {stepIcon(step.status)}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, color: step.status === "active" ? "#00e5ff" : step.status === "done" ? "#22c55e" : "rgba(255,255,255,0.5)", fontWeight: "bold" }}>{step.title}</div>
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 1 }}>{step.description}</div>
                  </div>
                  {step.content && (
                    expandedSteps.has(step.id) ? <ChevronUp size={12} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={12} color="rgba(255,255,255,0.3)" />
                  )}
                </div>

                {/* Step content */}
                {step.content && expandedSteps.has(step.id) && (
                  <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.05)", fontSize: 12, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                    {step.content}
                    {step.status === "active" && <span style={{ display: "inline-block", width: 6, height: 12, background: "#00e5ff", marginLeft: 2, animation: "pulse-dot 1s infinite" }} />}
                  </div>
                )}
              </div>
            ))}

            {/* Conclusion */}
            {(conclusion || concluding) && (
              <div style={{ border: "1px solid rgba(167,139,250,0.3)", borderRadius: 10, overflow: "hidden", marginTop: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "rgba(167,139,250,0.06)", borderBottom: "1px solid rgba(167,139,250,0.15)" }}>
                  <Lightbulb size={14} color="#a78bfa" />
                  <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: "bold" }}>CONCLUSION</span>
                  {concluding && <Loader size={12} color="#a78bfa" style={{ marginLeft: "auto", animation: "spin 1s linear infinite" }} />}
                </div>
                <div style={{ padding: "14px", fontSize: 13, color: "rgba(255,255,255,0.85)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                  {conclusion}
                  {concluding && <span style={{ display: "inline-block", width: 6, height: 13, background: "#a78bfa", marginLeft: 2, animation: "pulse-dot 1s infinite" }} />}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!running && steps.length === 0 && !error && (
              <div style={{ textAlign: "center", padding: 60, color: "rgba(255,255,255,0.2)" }}>
                <Brain size={40} style={{ display: "block", margin: "0 auto 14px", opacity: 0.25 }} />
                <div style={{ fontSize: 13, marginBottom: 6 }}>Visual Chain of Thought</div>
                <div style={{ fontSize: 10 }}>Watch the AI reason step-by-step in real time</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChainOfThoughtModal;
