import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Copy, CheckCheck, BarChart3, Loader2, RotateCcw, Eye, EyeOff, Trophy } from "lucide-react";
import { pipeline } from "@/lib/pipeline";

async function streamOdysseus(prompt: string, onChunk: (c: string) => void): Promise<string> {
  const resp = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }], stream: true }) });
  if (!resp.ok || !resp.body) return "";
  const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = "", full = "";
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue; const raw = line.slice(6).trim(); if (!raw || raw === "[DONE]") continue;
      try { const obj = JSON.parse(raw) as { content?: string; choices?: { delta?: { content?: string } }[] }; const c2 = obj.content ?? obj.choices?.[0]?.delta?.content ?? ""; if (c2) { full += c2; onChunk(full); } } catch { /* ignore */ }
    }
  }
  return full;
}

async function streamModelA(prompt: string, model: string, onChunk: (c: string) => void): Promise<string> {
  const resp = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }], model, stream: true }) });
  if (!resp.ok || !resp.body) return "";
  const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = "", full = "";
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue; const raw = line.slice(6).trim(); if (!raw || raw === "[DONE]") continue;
      try { const obj = JSON.parse(raw) as { content?: string; choices?: { delta?: { content?: string } }[] }; const c2 = obj.content ?? obj.choices?.[0]?.delta?.content ?? ""; if (c2) { full += c2; onChunk(full); } } catch { /* ignore */ }
    }
  }
  return full;
}

interface OdysseusCompareModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const COMPARE_MODELS = [
  { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", color: "#f97316", tag: "ANTHROPIC" },
  { id: "claude-opus-4-5", label: "Claude Opus 4.5", color: "#ec4899", tag: "ANTHROPIC" },
  { id: "gpt-4o", label: "GPT-4o", color: "#10b981", tag: "OPENAI" },
  { id: "gpt-4o-mini", label: "GPT-4o Mini", color: "#22d3ee", tag: "OPENAI" },
];

export function OdysseusCompareModal({ open, onOpenChange }: OdysseusCompareModalProps) {
  const [prompt, setPrompt] = useState("");
  const [modelA, setModelA] = useState("claude-sonnet-4-5");
  const [modelB, setModelB] = useState("gpt-4o");
  const [running, setRunning] = useState(false);
  const [outputA, setOutputA] = useState("");
  const [outputB, setOutputB] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [winner, setWinner] = useState<"A" | "B" | "tie" | null>(null);
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);

  const mA = COMPARE_MODELS.find(m => m.id === modelA)!;
  const mB = COMPARE_MODELS.find(m => m.id === modelB)!;

  async function runCompare() {
    if (!prompt.trim() || running) return;
    setRunning(true); setOutputA(""); setOutputB(""); setRevealed(false); setWinner(null);
    pipeline.push({ source: "Odysseus Compare", label: `Compare: ${prompt.slice(0, 30)}`, content: "", sourceColor: "#a78bfa" });

    try {
      await Promise.all([
        streamModelA(prompt, modelA, (full) => setOutputA(full)),
        streamModelA(prompt, modelB, (full) => setOutputB(full)),
      ]);
    } catch { /* ignore */ }
    setRunning(false);
  }

  function reset() { setPrompt(""); setOutputA(""); setOutputB(""); setRevealed(false); setWinner(null); }

  if (!open) return null;

  const canVote = outputA && outputB && !winner;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(20px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
        className="relative w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "linear-gradient(145deg, #040308 0%, #030305 60%, #080408 100%)", border: "1px solid rgba(167,139,250,0.15)", boxShadow: "0 0 80px rgba(167,139,250,0.06), inset 0 1px 0 rgba(167,139,250,0.04)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(167,139,250,0.1)", background: "rgba(0,0,0,0.4)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", boxShadow: "0 0 16px rgba(167,139,250,0.2)" }}>
              <BarChart3 className="w-4 h-4" style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <div className="text-sm font-black tracking-widest font-mono" style={{ color: "#a78bfa" }}>ODYSSEUS COMPARE</div>
              <div className="text-[9px] font-mono" style={{ color: "rgba(167,139,250,0.45)" }}>BLIND SIDE-BY-SIDE MODEL TESTING · VOTE · REVEAL</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={reset} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <RotateCcw className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            </button>
          </div>
        </div>

        {/* Prompt + model selectors */}
        <div className="px-5 py-3 border-b gap-3 flex items-center" style={{ borderColor: "rgba(167,139,250,0.08)", background: "rgba(0,0,0,0.2)" }}>
          <div className="flex-1 relative">
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Enter your prompt — both models will respond simultaneously..."
              disabled={running} rows={2}
              className="w-full resize-none outline-none text-sm font-mono p-3 rounded-xl"
              style={{ background: "rgba(167,139,250,0.06)", border: "1px solid rgba(167,139,250,0.15)", color: "#ccc" }} />
          </div>
          <div className="flex flex-col gap-2">
            <select value={modelA} onChange={e => setModelA(e.target.value)} disabled={running}
              className="px-3 py-2 rounded-xl text-[10px] font-mono outline-none"
              style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", color: mA.color }}>
              {COMPARE_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
            <select value={modelB} onChange={e => setModelB(e.target.value)} disabled={running}
              className="px-3 py-2 rounded-xl text-[10px] font-mono outline-none"
              style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", color: mB.color }}>
              {COMPARE_MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <motion.button onClick={runCompare} disabled={!prompt.trim() || running} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-black text-[10px] tracking-widest disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, rgba(167,139,250,0.25), rgba(167,139,250,0.1))", border: "1px solid rgba(167,139,250,0.4)", color: "#a78bfa" }}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {running ? "RUNNING" : "COMPARE"}
          </motion.button>
        </div>

        {/* Outputs */}
        <div className="flex-1 flex overflow-hidden gap-0">
          {(["A", "B"] as const).map(side => {
            const isA = side === "A";
            const model = isA ? mA : mB;
            const output = isA ? outputA : outputB;
            const copied = isA ? copiedA : copiedB;
            const setCopied = isA ? setCopiedA : setCopiedB;
            const isWinner = winner === side;
            const isTie = winner === "tie";

            return (
              <div key={side} className="flex-1 flex flex-col overflow-hidden border-r last:border-r-0" style={{ borderColor: "rgba(167,139,250,0.06)" }}>
                <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: `${model.color}18`, background: `${model.color}05` }}>
                  <div className="flex items-center gap-2">
                    {revealed ? (
                      <div>
                        <div className="text-[10px] font-black" style={{ color: model.color }}>{model.label}</div>
                        <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>{model.tag}</div>
                      </div>
                    ) : (
                      <div className="text-[10px] font-black" style={{ color: model.color }}>MODEL {side}</div>
                    )}
                    {(isWinner || isTie) && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{ background: isWinner ? "rgba(251,191,36,0.15)" : "rgba(100,200,255,0.1)", border: `1px solid ${isWinner ? "rgba(251,191,36,0.4)" : "rgba(100,200,255,0.3)"}` }}>
                        <Trophy className="w-2.5 h-2.5" style={{ color: isWinner ? "#fbbf24" : "#64c8ff" }} />
                        <span className="text-[8px] font-black" style={{ color: isWinner ? "#fbbf24" : "#64c8ff" }}>{isWinner ? "WINNER" : "TIE"}</span>
                      </motion.div>
                    )}
                  </div>
                  {output && (
                    <button onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold" style={{ color: model.color, border: `1px solid ${model.color}30`, background: `${model.color}08` }}>
                      {copied ? <CheckCheck className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {!output && !running && (
                    <div className="flex items-center justify-center h-full text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.1)" }}>
                      Awaiting prompt...
                    </div>
                  )}
                  {output && (
                    <div className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.65)" }}>
                      {output}
                      {running && <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ color: model.color }}>█</motion.span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Vote bar */}
        {(canVote || winner) && (
          <div className="px-5 py-3 border-t flex items-center justify-center gap-4" style={{ borderColor: "rgba(167,139,250,0.1)", background: "rgba(0,0,0,0.4)" }}>
            {!winner ? (
              <>
                <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>Which is better?</span>
                {(["A", "B", "tie"] as const).map(v => (
                  <motion.button key={v} onClick={() => { setWinner(v); setRevealed(true); }}
                    whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                    className="px-4 py-2 rounded-xl text-[10px] font-black tracking-widest"
                    style={{ background: v === "tie" ? "rgba(100,200,255,0.08)" : "rgba(167,139,250,0.08)", border: `1px solid ${v === "tie" ? "rgba(100,200,255,0.3)" : "rgba(167,139,250,0.3)"}`, color: v === "tie" ? "#64c8ff" : "#a78bfa" }}>
                    {v === "tie" ? "🤝 TIE" : `MODEL ${v} IS BETTER`}
                  </motion.button>
                ))}
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Trophy className="w-4 h-4" style={{ color: "#fbbf24" }} />
                <span className="text-[10px] font-mono" style={{ color: "#fbbf24" }}>
                  {winner === "tie" ? "It's a tie!" : `Model ${winner} won! (${winner === "A" ? mA.label : mB.label})`}
                </span>
                <button onClick={() => { setRevealed(!revealed); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
                  {revealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  {revealed ? "HIDE MODELS" : "REVEAL MODELS"}
                </button>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
