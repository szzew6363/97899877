import { useState, useRef, useEffect, useCallback } from "react";
import { X, Play, Gavel, MessageSquare, Shield, Zap, ChevronRight } from "lucide-react";

const PRESET_TOPICS = [
  "AI will eliminate more jobs than it creates",
  "Open-source AI is more dangerous than closed-source AI",
  "Offensive security research should require government approval",
  "Zero-day vulnerabilities should be disclosed immediately",
  "Autonomous AI weapons should be banned internationally",
  "Privacy is more important than national security",
  "Cryptocurrency is a net positive for society",
  "Bug bounty programs are better than dedicated security teams",
];

const POSITION_PAIRS = [
  ["FOR", "AGAINST"],
  ["PROSECUTION", "DEFENSE"],
  ["OPTIMIST", "PESSIMIST"],
  ["INNOVATOR", "TRADITIONALIST"],
  ["PROPONENT", "CRITIC"],
];

type DebateEvent =
  | { type: "setup"; topic: string; sideA: string; sideB: string }
  | { type: string; content?: string }
  | { type: "judgment"; winner?: "A" | "B" | "TIE"; analysis?: string; sideA?: { total: number; logic?: number; evidence?: number; rhetoric?: number; rebuttal?: number }; sideB?: { total: number; logic?: number; evidence?: number; rhetoric?: number; rebuttal?: number } }
  | { type: "done" }
  | { type: "error"; error: string };

type RoundContent = { a: string; b: string };

type JudgmentData = {
  winner?: "A" | "B" | "TIE";
  analysis?: string;
  sideA?: { total: number; logic?: number; evidence?: number; rhetoric?: number; rebuttal?: number };
  sideB?: { total: number; logic?: number; evidence?: number; rhetoric?: number; rebuttal?: number };
};

export function DebateModal({ onClose }: { onClose: () => void }) {
  const [topic, setTopic] = useState("");
  const [posA, setPosA] = useState("FOR");
  const [posB, setPosB] = useState("AGAINST");
  const [rounds, setRounds] = useState(1);
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [opening, setOpening] = useState<RoundContent>({ a: "", b: "" });
  const [rebuttal, setRebuttal] = useState<RoundContent>({ a: "", b: "" });
  const [closing, setClosing] = useState<RoundContent>({ a: "", b: "" });
  const [judgment, setJudgment] = useState<JudgmentData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const BASE = (window as Window & { __API_BASE__?: string }).__API_BASE__ ?? "";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [opening, rebuttal, closing, judgment, phase]);

  const start = useCallback(async () => {
    if (!topic.trim()) return;
    setRunning(true);
    setPhase("connecting");
    setOpening({ a: "", b: "" });
    setRebuttal({ a: "", b: "" });
    setClosing({ a: "", b: "" });
    setJudgment(null);
    setError(null);

    abortRef.current = new AbortController();
    try {
      const res = await fetch(`${BASE}/api/debate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, positionA: posA, positionB: posB, rounds }),
        signal: abortRef.current.signal,
        credentials: "include",
      });

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6)) as DebateEvent;
            switch (evt.type) {
              case "setup":    setPhase("opening"); break;
              case "opening_a_start": setPhase("opening — Side A speaking..."); break;
              case "opening_b_start": setPhase("opening — Side B speaking..."); break;
              case "opening_a":  if (evt.content) setOpening(p => ({ ...p, a: p.a + evt.content })); break;
              case "opening_b":  if (evt.content) setOpening(p => ({ ...p, b: p.b + evt.content })); break;
              case "rebuttal_a_start": setPhase("rebuttal — Side A..."); break;
              case "rebuttal_b_start": setPhase("rebuttal — Side B..."); break;
              case "rebuttal_a": if (evt.content) setRebuttal(p => ({ ...p, a: p.a + evt.content })); break;
              case "rebuttal_b": if (evt.content) setRebuttal(p => ({ ...p, b: p.b + evt.content })); break;
              case "closing_a_start": setPhase("closing — Side A..."); break;
              case "closing_b_start": setPhase("closing — Side B..."); break;
              case "closing_a": if (evt.content) setClosing(p => ({ ...p, a: p.a + evt.content })); break;
              case "closing_b": if (evt.content) setClosing(p => ({ ...p, b: p.b + evt.content })); break;
              case "judging":   setPhase("judging..."); break;
              case "judgment":  setJudgment(evt as JudgmentData); setPhase("done"); break;
              case "done":      setPhase("done"); break;
              case "error":     setError((evt as { error: string }).error); setPhase("error"); break;
            }
          } catch { /* parse error */ }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      setRunning(false);
    }
  }, [topic, posA, posB, rounds, BASE]);

  const stop = () => { abortRef.current?.abort(); setRunning(false); setPhase("stopped"); };

  const scoreBar = (score: number, max: number, color: string) => (
    <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", flex: 1 }}>
      <div style={{ height: "100%", width: `${Math.round(score / max * 100)}%`, background: color, borderRadius: 2 }} />
    </div>
  );

  const SpeechBubble = ({ side, content, label }: { side: "A" | "B"; content: string; label: string }) => {
    if (!content) return null;
    const isA = side === "A";
    return (
      <div style={{ display: "flex", flexDirection: isA ? "row" : "row-reverse", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: isA ? "rgba(226,18,39,0.2)" : "rgba(0,229,255,0.2)", border: `1px solid ${isA ? "#e21227" : "#00e5ff"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontFamily: "monospace", color: isA ? "#e21227" : "#00e5ff", fontWeight: "bold" }}>
          {isA ? posA[0] : posB[0]}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.35)", marginBottom: 4, textAlign: isA ? "left" : "right" }}>{label} · {isA ? posA : posB}</div>
          <div style={{ background: isA ? "rgba(226,18,39,0.06)" : "rgba(0,229,255,0.06)", border: `1px solid ${isA ? "rgba(226,18,39,0.2)" : "rgba(0,229,255,0.2)"}`, borderRadius: isA ? "0 8px 8px 8px" : "8px 0 8px 8px", padding: "10px 12px", fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {content}
            {running && phase.includes(isA ? "Side A" : "Side B") && <span style={{ display: "inline-block", width: 6, height: 12, background: isA ? "#e21227" : "#00e5ff", marginLeft: 2, animation: "blink 1s infinite" }} />}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 9990, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 800, height: "90vh", display: "flex", flexDirection: "column", background: "#0a0a0a", border: "1px solid rgba(226,18,39,0.3)", borderRadius: 12, overflow: "hidden", fontFamily: "monospace" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "linear-gradient(90deg, rgba(226,18,39,0.06), rgba(0,229,255,0.04))" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Gavel size={16} color="#e21227" />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", letterSpacing: "0.1em" }}>DEBATE MODE</span>
            <span style={{ fontSize: 9, color: "#00e5ff", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.2)", borderRadius: 3, padding: "1px 6px" }}>ALPHA</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer" }}><X size={16} /></button>
        </div>

        {/* Setup bar */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", flexDirection: "column", gap: 10 }}>
          {/* Topic */}
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="Enter debate topic..."
              style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "6px 10px", color: "rgba(255,255,255,0.85)", fontSize: 12, outline: "none" }}
            />
            {!running ? (
              <button onClick={start} disabled={!topic.trim()} style={{ background: "#e21227", border: "none", borderRadius: 6, padding: "6px 14px", color: "#fff", fontSize: 11, cursor: topic.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", gap: 4, opacity: topic.trim() ? 1 : 0.5 }}>
                <Play size={12} />Start
              </button>
            ) : (
              <button onClick={stop} style={{ background: "rgba(226,18,39,0.2)", border: "1px solid rgba(226,18,39,0.4)", borderRadius: 6, padding: "6px 14px", color: "#e21227", fontSize: 11, cursor: "pointer" }}>
                Stop
              </button>
            )}
          </div>

          {/* Positions + Rounds */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select value={`${posA}|${posB}`} onChange={e => { const [a, b] = e.target.value.split("|"); setPosA(a); setPosB(b); }} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "4px 8px", color: "rgba(255,255,255,0.7)", fontSize: 11, cursor: "pointer" }}>
              {POSITION_PAIRS.map(([a, b]) => <option key={a} value={`${a}|${b}`}>{a} vs {b}</option>)}
            </select>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Rounds:</span>
              {[1, 2].map(r => (
                <button key={r} onClick={() => setRounds(r)} style={{ background: rounds === r ? "rgba(226,18,39,0.2)" : "rgba(255,255,255,0.04)", border: `1px solid ${rounds === r ? "rgba(226,18,39,0.4)" : "rgba(255,255,255,0.08)"}`, borderRadius: 4, padding: "3px 8px", color: rounds === r ? "#e21227" : "rgba(255,255,255,0.4)", fontSize: 10, cursor: "pointer" }}>{r}</button>
              ))}
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: "auto" }}>
              {phase && phase !== "done" && `${phase}`}
            </span>
          </div>

          {/* Preset topics */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {PRESET_TOPICS.slice(0, 4).map(t => (
              <button key={t} onClick={() => setTopic(t)} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 4, padding: "2px 7px", color: "rgba(255,255,255,0.35)", fontSize: 9, cursor: "pointer", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Transcript */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {error && (
            <div style={{ background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.2)", borderRadius: 6, padding: 12, marginBottom: 12, fontSize: 11, color: "#e21227" }}>
              Error: {error}
            </div>
          )}

          {/* Opening */}
          {(opening.a || opening.b) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <ChevronRight size={10} />OPENING STATEMENTS
              </div>
              <SpeechBubble side="A" content={opening.a} label="Opening" />
              <SpeechBubble side="B" content={opening.b} label="Opening" />
            </div>
          )}

          {/* Rebuttal */}
          {(rebuttal.a || rebuttal.b) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <ChevronRight size={10} />REBUTTAL
              </div>
              <SpeechBubble side="A" content={rebuttal.a} label="Rebuttal" />
              <SpeechBubble side="B" content={rebuttal.b} label="Rebuttal" />
            </div>
          )}

          {/* Closing */}
          {(closing.a || closing.b) && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <ChevronRight size={10} />CLOSING ARGUMENTS
              </div>
              <SpeechBubble side="A" content={closing.a} label="Closing" />
              <SpeechBubble side="B" content={closing.b} label="Closing" />
            </div>
          )}

          {/* Judgment */}
          {judgment && (
            <div style={{ background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: 10, padding: 16, marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Gavel size={14} color="#fbbf24" />
                <span style={{ fontSize: 11, color: "#fbbf24", letterSpacing: "0.1em" }}>JUDGMENT</span>
                {judgment.winner && (
                  <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: "bold", color: judgment.winner === "TIE" ? "#f59e0b" : judgment.winner === "A" ? "#e21227" : "#00e5ff" }}>
                    {judgment.winner === "TIE" ? "TIE" : `Side ${judgment.winner} (${judgment.winner === "A" ? posA : posB}) Wins`}
                  </span>
                )}
              </div>

              {/* Score bars */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {(["sideA", "sideB"] as const).map((side) => {
                  const s = judgment[side];
                  const isA = side === "sideA";
                  const color = isA ? "#e21227" : "#00e5ff";
                  const label = isA ? posA : posB;
                  if (!s) return null;
                  return (
                    <div key={side} style={{ background: "rgba(255,255,255,0.03)", borderRadius: 6, padding: 10, border: `1px solid ${color}22` }}>
                      <div style={{ fontSize: 11, color, marginBottom: 8, fontWeight: "bold" }}>{label} — {s.total}/100</div>
                      {[["Logic", s.logic ?? 0, 30], ["Evidence", s.evidence ?? 0, 25], ["Rhetoric", s.rhetoric ?? 0, 20], ["Rebuttal", s.rebuttal ?? 0, 25]].map(([name, val, max]) => (
                        <div key={name as string} style={{ marginBottom: 5 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{name}</span>
                            <span style={{ fontSize: 9, color }}>{val}/{max}</span>
                          </div>
                          {scoreBar(val as number, max as number, color)}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {judgment.analysis && (
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 10 }}>
                  {judgment.analysis}
                </div>
              )}
            </div>
          )}

          {/* Thinking indicator */}
          {running && phase !== "done" && !judgment && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
              <Zap size={12} color="#e21227" />
              <span>{phase || "Connecting..."}</span>
              <span style={{ marginLeft: 4 }}>
                {[".", "..", "..."][Math.floor(Date.now() / 500) % 3]}
              </span>
            </div>
          )}

          {!running && !opening.a && !error && (
            <div style={{ textAlign: "center", padding: 40, color: "rgba(255,255,255,0.2)", fontSize: 12 }}>
              <MessageSquare size={32} style={{ display: "block", margin: "0 auto 12px", opacity: 0.3 }} />
              <div style={{ marginBottom: 8 }}>Two AI brains debate any topic</div>
              <div style={{ fontSize: 10 }}>Enter a topic and click Start</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "8px 16px", borderTop: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8 }}>
          <Shield size={10} color="rgba(255,255,255,0.2)" />
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>Side A: {posA} · Side B: {posB} · Powered by KaliGPT AI Engine</span>
        </div>
      </div>
    </div>
  );
}

export default DebateModal;
