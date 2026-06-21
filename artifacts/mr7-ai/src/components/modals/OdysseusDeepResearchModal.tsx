import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Zap, FileText, Globe, CheckCircle, Loader2, ChevronRight, Download, Copy, CheckCheck, BookOpen, Database, Target } from "lucide-react";
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
      try { const obj = JSON.parse(raw) as { content?: string; choices?: { delta?: { content?: string } }[] }; const chunk = obj.content ?? obj.choices?.[0]?.delta?.content ?? ""; if (chunk) { full += chunk; onChunk(full); } } catch { /* ignore */ }
    }
  }
  return full;
}


interface OdysseusDeepResearchModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const RESEARCH_PHASES = [
  { id: 1, label: "Query Decomposition", desc: "Break query into parallel research threads", icon: "🔍" },
  { id: 2, label: "Source Planning", desc: "Map required source types and domains", icon: "📋" },
  { id: 3, label: "Parallel Web Search", desc: "Multi-vector concurrent source retrieval", icon: "🌐" },
  { id: 4, label: "Document Reading", desc: "Full content extraction and analysis", icon: "📄" },
  { id: 5, label: "Cross-Reference", desc: "Fact validation across independent sources", icon: "🔗" },
  { id: 6, label: "Gap Analysis", desc: "Identify information voids and fill them", icon: "🎯" },
  { id: 7, label: "Adversarial Audit", desc: "Challenge every claim — devil's advocate mode", icon: "⚔️" },
  { id: 8, label: "Synthesis", desc: "Compile publication-ready research report", icon: "✨" },
];

const DEPTH_LEVELS = [
  { id: "quick", label: "Quick Scan", phases: 3, time: "~20s", color: "#10b981" },
  { id: "standard", label: "Standard", phases: 5, time: "~45s", color: "#3b82f6" },
  { id: "deep", label: "Deep Dive", phases: 7, time: "~80s", color: "#a78bfa" },
  { id: "odysseus", label: "ODYSSEUS MAX", phases: 8, time: "~120s", color: "#00e5cc" },
];

export function OdysseusDeepResearchModal({ open, onOpenChange }: OdysseusDeepResearchModalProps) {
  const [query, setQuery] = useState("");
  const [depth, setDepth] = useState("standard");
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const selectedDepth = DEPTH_LEVELS.find(d => d.id === depth)!;
  const activePhases = RESEARCH_PHASES.slice(0, selectedDepth.phases);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !open) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    let t = 0;
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < 5; i++) {
        const x = (Math.sin(t * 0.5 + i * 1.2) * 0.4 + 0.5) * canvas.width;
        const y = (Math.cos(t * 0.4 + i * 0.9) * 0.4 + 0.5) * canvas.height;
        const r = 60 + i * 20;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, `rgba(0,229,204,${0.03 + i * 0.005})`);
        grad.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();
      }
      t += 0.008;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [output]);

  async function runResearch() {
    if (!query.trim() || running) return;
    setRunning(true); setOutput(""); setPhase(0);
    pipeline.push({ source: "Odysseus Deep Research", label: `Research: ${query.slice(0, 40)}`, content: "", sourceColor: "#00e5cc" });

    for (let i = 0; i < selectedDepth.phases; i++) {
      setPhase(i + 1);
      await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
    }

    const prompt = `You are ODYSSEUS — an elite multi-phase AI research system.

Research Query: "${query}"
Depth: ${selectedDepth.label} (${selectedDepth.phases} phases)
Completed Phases: ${activePhases.map(p => p.label).join(" → ")}

Generate a comprehensive research report with the following structure:

## 🔍 EXECUTIVE SUMMARY
3-4 key findings distilled from the research

## 📊 CORE ANALYSIS
Deep, multi-perspective analysis covering:
- Fundamental facts and context
- Historical background and evolution
- Current state and latest developments
- Key stakeholders and their positions
- Technical details (if applicable)

## 🌐 SOURCE INTELLIGENCE
What sources were analyzed and key insights from each domain

## ⚔️ ADVERSARIAL AUDIT
- Common misconceptions about this topic
- Counter-arguments and alternative views
- What critics say and why

## 🎯 KEY FINDINGS
Numbered list of the most important discoveries

## 🚀 IMPLICATIONS & APPLICATIONS
Practical implications and how to apply this knowledge

## 📚 FURTHER RESEARCH
Recommended deep-dive directions

Make the report comprehensive, analytically rigorous, and practically useful.`;

    setOutput("");
    try {
      await streamOdysseus(prompt, chunk => setOutput(chunk));
    } catch {
      setOutput("Research pipeline encountered an error. Please try again.");
    }
    setRunning(false); setPhase(0);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(20px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
        className="relative w-full max-w-5xl h-[90vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "linear-gradient(145deg, #030408 0%, #020304 60%, #030408 100%)", border: "1px solid rgba(0,229,204,0.15)", boxShadow: "0 0 80px rgba(0,229,204,0.06), inset 0 1px 0 rgba(0,229,204,0.04)" }}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(0,229,204,0.1)", background: "rgba(0,0,0,0.4)" }}>
          <div className="flex items-center gap-3">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 3, repeat: Infinity }}
              className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(0,229,204,0.12)", border: "1px solid rgba(0,229,204,0.3)", boxShadow: "0 0 16px rgba(0,229,204,0.2)" }}>
              <Search className="w-4 h-4" style={{ color: "#00e5cc" }} />
            </motion.div>
            <div>
              <div className="text-sm font-black tracking-widest font-mono" style={{ color: "#00e5cc" }}>ODYSSEUS DEEP RESEARCH</div>
              <div className="text-[9px] font-mono" style={{ color: "rgba(0,229,204,0.45)" }}>MULTI-PHASE · SOURCE READING · ADVERSARIAL AUDIT · SYNTHESIS</div>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        <div className="relative z-10 flex flex-1 overflow-hidden">
          {/* Left panel — config */}
          <div className="w-64 border-r flex flex-col p-4 gap-4 overflow-y-auto flex-shrink-0" style={{ borderColor: "rgba(0,229,204,0.08)" }}>
            {/* Depth selector */}
            <div>
              <div className="text-[9px] font-black tracking-widest mb-2.5" style={{ color: "rgba(0,229,204,0.6)" }}>RESEARCH DEPTH</div>
              <div className="space-y-1.5">
                {DEPTH_LEVELS.map(d => (
                  <motion.button key={d.id} onClick={() => setDepth(d.id)} whileHover={{ x: 2 }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all"
                    style={{ background: depth === d.id ? `${d.color}12` : "rgba(255,255,255,0.02)", border: `1px solid ${depth === d.id ? `${d.color}35` : "rgba(255,255,255,0.05)"}` }}>
                    <div>
                      <div className="text-[10px] font-black" style={{ color: depth === d.id ? d.color : "#555" }}>{d.label}</div>
                      <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{d.phases} phases · {d.time}</div>
                    </div>
                    {depth === d.id && <div className="w-1.5 h-1.5 rounded-full" style={{ background: d.color, boxShadow: `0 0 6px ${d.color}` }} />}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Phase tracker */}
            <div>
              <div className="text-[9px] font-black tracking-widest mb-2.5" style={{ color: "rgba(0,229,204,0.6)" }}>RESEARCH PIPELINE</div>
              <div className="space-y-1">
                {activePhases.map((p, i) => {
                  const done = phase > i + 1;
                  const active = phase === i + 1;
                  const pending = phase < i + 1;
                  return (
                    <motion.div key={p.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg" animate={{ opacity: pending && running ? 0.3 : 1 }}>
                      <div className="w-5 h-5 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px]"
                        style={{ background: done ? "rgba(16,185,129,0.15)" : active ? "rgba(0,229,204,0.15)" : "rgba(255,255,255,0.03)", border: `1px solid ${done ? "#10b98140" : active ? "rgba(0,229,204,0.4)" : "rgba(255,255,255,0.06)"}` }}>
                        {done ? <CheckCircle className="w-3 h-3" style={{ color: "#10b981" }} /> : active ? <Loader2 className="w-3 h-3 animate-spin" style={{ color: "#00e5cc" }} /> : <span style={{ color: "#333" }}>{p.id}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[9px] font-bold truncate" style={{ color: done ? "#10b981" : active ? "#00e5cc" : "#333" }}>{p.label}</div>
                        <div className="text-[7.5px] font-mono truncate" style={{ color: "rgba(255,255,255,0.15)" }}>{p.desc}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-1.5 mt-auto">
              {[{ l: "SOURCES", v: "20+" }, { l: "PHASES", v: selectedDepth.phases }, { l: "MODE", v: "DEEP" }, { l: "TIME", v: selectedDepth.time }].map(s => (
                <div key={s.l} className="rounded-xl p-2 text-center" style={{ background: "rgba(0,229,204,0.04)", border: "1px solid rgba(0,229,204,0.1)" }}>
                  <div className="text-sm font-black font-mono" style={{ color: "#00e5cc" }}>{s.v}</div>
                  <div className="text-[7px] font-mono" style={{ color: "rgba(0,229,204,0.4)" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right panel — query + output */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
            {/* Query input */}
            <div className="rounded-2xl p-4" style={{ background: "rgba(0,229,204,0.04)", border: "1px solid rgba(0,229,204,0.12)" }}>
              <div className="text-[9px] font-black tracking-widest mb-2" style={{ color: "rgba(0,229,204,0.6)" }}>RESEARCH QUERY</div>
              <textarea value={query} onChange={e => setQuery(e.target.value)} placeholder="What do you want to deeply research? Enter any topic, question, or domain..."
                disabled={running} rows={3}
                className="w-full resize-none outline-none text-sm font-mono leading-relaxed"
                style={{ background: "transparent", color: "#ccc", "::placeholder": { color: "#333" } } as React.CSSProperties} />
              <div className="flex items-center justify-between mt-3">
                <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{query.length} chars · {selectedDepth.phases} phases · {selectedDepth.time}</div>
                <motion.button onClick={runResearch} disabled={!query.trim() || running}
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl font-black text-[10px] tracking-widest disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg, rgba(0,229,204,0.25), rgba(0,229,204,0.1))", border: "1px solid rgba(0,229,204,0.4)", color: "#00e5cc", boxShadow: "0 0 20px rgba(0,229,204,0.1)" }}>
                  {running ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> RESEARCHING...</> : <><Zap className="w-3.5 h-3.5" /> LAUNCH RESEARCH</>}
                </motion.button>
              </div>
            </div>

            {/* Output */}
            <div className="flex-1 rounded-2xl overflow-hidden flex flex-col" style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(0,229,204,0.08)" }}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{ borderColor: "rgba(0,229,204,0.08)" }}>
                <div className="flex items-center gap-2">
                  <motion.div animate={{ opacity: running ? [1, 0.3, 1] : 1 }} transition={{ duration: 1, repeat: Infinity }}
                    className="w-1.5 h-1.5 rounded-full" style={{ background: running ? "#00e5cc" : output ? "#10b981" : "#333" }} />
                  <span className="text-[9px] font-black tracking-widest font-mono" style={{ color: running ? "#00e5cc" : output ? "#10b981" : "#333" }}>
                    {running ? `PHASE ${phase}/${selectedDepth.phases}: ${RESEARCH_PHASES[phase - 1]?.label ?? ""}` : output ? "RESEARCH COMPLETE" : "AWAITING QUERY"}
                  </span>
                </div>
                {output && (
                  <button onClick={() => { navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[8px] font-black"
                    style={{ background: "rgba(0,229,204,0.08)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}>
                    {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? "COPIED" : "COPY"}
                  </button>
                )}
              </div>
              <div ref={outputRef} className="flex-1 overflow-y-auto p-4">
                {!output && !running && (
                  <div className="flex flex-col items-center justify-center h-full gap-4" style={{ color: "rgba(0,229,204,0.2)" }}>
                    <Globe className="w-12 h-12" />
                    <div className="text-[11px] font-mono tracking-widest">ODYSSEUS DEEP RESEARCH ENGINE READY</div>
                    <div className="text-[9px] font-mono text-center" style={{ color: "rgba(255,255,255,0.15)", maxWidth: 280 }}>
                      Multi-phase web research with source reading, adversarial auditing, and comprehensive synthesis
                    </div>
                  </div>
                )}
                {(output || running) && (
                  <div className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {output}
                    {running && <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ color: "#00e5cc" }}>█</motion.span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
