import { Network } from "lucide-react";
import { useState, useRef } from "react";
import { streamChat } from "@/lib/chat-client";
import { Play, Square, Copy, CheckCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; }

const AGENTS = [
  { id: "eng", label: "ENGINEERING", color: "#3b82f6", prompt: "You are the Engineering Intelligence Agent. Analyze system architecture, scalability, code quality, technical debt, and infrastructure design for the given mission. Provide deep technical insights with specific implementation recommendations." },
  { id: "sec", label: "SECURITY", color: "#e21227", prompt: "You are the Security Intelligence Agent. Conduct threat modeling, vulnerability assessment, attack surface analysis, and security architecture review. Identify exploitable weaknesses with CVE references and CVSS scores." },
  { id: "re", label: "REVERSE ENG", color: "#00ff41", prompt: "You are the Reverse Engineering Agent. Analyze binary behavior, decompile logic, identify obfuscation techniques, map execution flows, and reconstruct software intent from compiled artifacts and behavioral patterns." },
  { id: "data", label: "DATA ANALYSIS", color: "#f59e0b", prompt: "You are the Data Intelligence Agent. Analyze data flows, schema structures, anomaly patterns, statistical correlations, and intelligence extraction opportunities. Identify data exfiltration paths and information leakage risks." },
  { id: "ir", label: "INCIDENT RESP", color: "#8b5cf6", prompt: "You are the Incident Response Agent. Develop containment strategies, forensic collection procedures, timeline reconstruction, root cause analysis, and recovery roadmaps for the given security scenario." },
];

export function AgentSwarmModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const [mission, setMission] = useState("");
  const [context, setContext] = useState("");
  const [results, setResults] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<Set<string>>(new Set());
  const [synthesis, setSynthesis] = useState("");
  const [synthStreaming, setSynthStreaming] = useState(false);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function runSwarm() {
    if (!mission.trim()) { toast({ description: "أدخل مهمة السرب" }); return; }
    abortRef.current = new AbortController();
    setResults({});
    setSynthesis("");
    setRunning(new Set(AGENTS.map(a => a.id)));

    const agentOutputs: Record<string, string> = {};

    await Promise.all(AGENTS.map(async (agent) => {
      let acc = "";
      try {
        await streamChat(
          {
            model: "gpt-4o-mini",
            persona: null, customInstructions: "", language: "en" as const, memory: [],
            messages: [{ role: "user" as const, content: `MISSION: ${mission}\nCONTEXT: ${context || "None provided"}\n\nProvide your specialized analysis as the ${agent.label} agent.` }],
            customSystemPrompt: agent.prompt,
          },
          (chunk) => { acc += chunk; setResults(prev => ({ ...prev, [agent.id]: acc })); },
          abortRef.current!.signal
        );
      } catch (e) {
        if ((e as { name?: string })?.name !== "AbortError") {
          acc += `\n[Agent error: ${e instanceof Error ? e.message : "failed"}]`;
          setResults(prev => ({ ...prev, [agent.id]: acc }));
        }
      } finally {
        agentOutputs[agent.id] = acc;
        setRunning(prev => { const n = new Set(prev); n.delete(agent.id); return n; });
      }
    }));

    setSynthStreaming(true);
    let synthAcc = "";
    try {
      await streamChat(
        {
          model: "gpt-4o-mini",
          persona: null, customInstructions: "", language: "en" as const, memory: [],
          messages: [{
            role: "user" as const,
            content: `SWARM MISSION: ${mission}\n\nAGENT REPORTS:\n${AGENTS.map(a => `\n--- ${a.label} AGENT ---\n${agentOutputs[a.id] ?? "No output"}`).join("\n")}\n\nSynthesize all agent reports into a unified command intelligence brief with prioritized action items.`
          }],
          customSystemPrompt: "You are the Swarm Fusion Coordinator. Synthesize all specialist agent reports into one coherent unified intelligence brief with ranked action items, dependencies, and execution timeline.",
        },
        (chunk) => { synthAcc += chunk; setSynthesis(synthAcc); },
        abortRef.current!.signal
      );
    } catch (e) {
      if ((e as { name?: string })?.name !== "AbortError") setSynthesis(`Synthesis error: ${e instanceof Error ? e.message : "failed"}`);
    } finally {
      setSynthStreaming(false);
    }
  }

  function stop() { abortRef.current?.abort(); setRunning(new Set()); setSynthStreaming(false); }

  function copy() {
    const all = AGENTS.map(a => `=== ${a.label} ===\n${results[a.id] ?? ""}`).join("\n\n") + (synthesis ? `\n\n=== SYNTHESIS ===\n${synthesis}` : "");
    navigator.clipboard.writeText(all);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;
  const isRunning = running.size > 0 || synthStreaming;

  return (
    <div className="flex flex-col h-full" style={{ background: "#060606" }}>
      <div className="p-4 border-b space-y-3 shrink-0" style={{ borderColor: "#f97316" + "18", background: "#f9731604" }}>
        <div className="flex items-center gap-2 flex-wrap">
          {[{ l: "5 AGENTS", c: "#f97316" }, { l: "PARALLEL", c: "#fbbf24" }, { l: "FUSION SYNTHESIS", c: "#8b5cf6" }].map(b => (
            <span key={b.l} className="text-[8px] font-mono font-bold px-2 py-0.5 rounded-full border"
              style={{ borderColor: b.c + "40", color: b.c, background: b.c + "10" }}>{b.l}</span>
          ))}
        </div>
        <div>
          <label className="block text-[9px] font-mono font-bold mb-1.5 tracking-wider" style={{ color: "#f9731680" }}>MISSION OBJECTIVE</label>
          <input value={mission} onChange={e => setMission(e.target.value)} placeholder="Analyze the security posture of a Node.js API under active attack..."
            className="w-full rounded-lg px-3 py-2 text-[11px] font-mono outline-none border"
            style={{ background: "#0c0c0c", borderColor: "#f9731622", color: "#ccc" }} />
        </div>
        <div>
          <label className="block text-[9px] font-mono font-bold mb-1.5 tracking-wider" style={{ color: "#f9731680" }}>CONTEXT / INTELLIGENCE</label>
          <textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Known vulnerabilities, system specs, threat actors, prior incidents..." rows={2}
            className="w-full rounded-lg px-3 py-2 text-[11px] font-mono outline-none border resize-none"
            style={{ background: "#0c0c0c", borderColor: "#f9731622", color: "#ccc" }} />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={isRunning ? stop : runSwarm}
            className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold text-[12px] transition-all"
            style={{ background: isRunning ? "rgba(226,18,39,0.1)" : "rgba(249,115,22,0.15)", border: `1px solid ${isRunning ? "#e2122740" : "#f9731645"}`, color: isRunning ? "#e21227" : "#f97316" }}>
            {isRunning ? <><Square className="w-3.5 h-3.5" /> إيقاف السرب</> : <><Play className="w-3.5 h-3.5" /> إطلاق السرب</>}
          </button>
          {(Object.keys(results).length > 0 || synthesis) && (
            <button onClick={copy} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] border transition-all ml-auto"
              style={{ borderColor: copied ? "#f9731640" : "#1f1f1f", color: copied ? "#f97316" : "#555", background: "#0c0c0c" }}>
              {copied ? <CheckCheck className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "تم" : "نسخ الكل"}
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {Object.keys(results).length === 0 && !isRunning ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "#f9731610", border: "1px solid #f9731620" }}>
              <Network className="w-6 h-6" style={{ color: "#f97316" }} />
            </div>
            <p className="text-[13px] font-black" style={{ color: "#f97316" }}>Multi-Domain AI Agent Swarm</p>
            <p className="text-[10px] max-w-xs leading-relaxed" style={{ color: "#444" }}>5 specialized agents run in parallel — Engineering · Security · Reverse Eng · Data · Incident Response — then fuse into unified intelligence</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-2">
              {AGENTS.map(agent => (
                <div key={agent.id} className="rounded-xl p-3.5 border" style={{ background: "#0a0a0a", borderColor: agent.color + "25" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: agent.color, animation: running.has(agent.id) ? "pulse 1s infinite" : "none" }} />
                    <span className="text-[9px] font-mono font-bold" style={{ color: agent.color }}>{agent.label}</span>
                    {running.has(agent.id) && <span className="text-[8px] font-mono ml-auto" style={{ color: agent.color + "80" }}>PROCESSING...</span>}
                  </div>
                  <pre className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap break-words max-h-40 overflow-y-auto" style={{ color: "#999" }}>
                    {results[agent.id] || (running.has(agent.id) ? "Initializing..." : "Pending")}
                    {running.has(agent.id) && <span style={{ color: agent.color }}>█</span>}
                  </pre>
                </div>
              ))}
            </div>
            {(synthesis || synthStreaming) && (
              <div className="rounded-xl p-4 border" style={{ background: "#0d0d0d", borderColor: "#8b5cf640" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#8b5cf6", animation: synthStreaming ? "pulse 1s infinite" : "none" }} />
                  <span className="text-[9px] font-mono font-bold" style={{ color: "#8b5cf6" }}>FUSION SYNTHESIS</span>
                </div>
                <pre className="text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-words" style={{ color: "#b0c0b8" }}>
                  {synthesis}{synthStreaming && <span style={{ color: "#8b5cf6" }}>█</span>}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
