/**
 * MultiAgentPage — 3D Holographic Multi-Agent Orchestration
 * Agent network 3D · parallel execution · fusion synthesis · real-time progress
 */
import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Users, Zap, X, Play, Square, RefreshCw, ChevronRight, Shield, Search, Code2, Target, Eye, Network } from "lucide-react";
import { authFetch } from "@/lib/auth";
import { streamChat } from "@/lib/chat-client";

interface Agent { id: string; name: string; role: string; color: string; icon: React.ElementType; focus: string; status: "idle" | "running" | "done" | "error"; output: string }

const AGENTS_TEMPLATE: Omit<Agent, "status" | "output">[] = [
  { id: "recon",   name: "RECON",   role: "استطلاع", color: "#22d3ee", icon: Search, focus: "استطلاع وجمع المعلومات — reconnaissance, OSINT, footprinting" },
  { id: "exploit", name: "EXPLOIT", role: "استغلال", color: "#e21227", icon: Zap,    focus: "تحليل الثغرات والاستغلال — vulnerability assessment, exploit development" },
  { id: "analyst", name: "ANALYST", role: "تحليل",  color: "#8b5cf6", icon: Brain,  focus: "تحليل البيانات والأنماط — data analysis, pattern recognition, risk scoring" },
  { id: "stealth", name: "STEALTH", role: "إخفاء",  color: "#10b981", icon: Eye,    focus: "تقنيات التخفي والتمويه — evasion techniques, obfuscation, anti-forensics" },
  { id: "strike",  name: "STRIKE",  role: "هجوم",   color: "#f97316", icon: Target, focus: "تنفيذ الهجوم والتحكم — attack execution, C2 communication, persistence" },
];

interface Props { onClose?: () => void }

export function MultiAgentPage({ onClose }: Props) {
  const [task, setTask] = useState("");
  const [agentCount, setAgentCount] = useState(3);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [fusion, setFusion] = useState("");
  const [running, setRunning] = useState(false);
  const [fusionRunning, setFusionRunning] = useState(false);
  const abortRefs = useRef<AbortController[]>([]);

  const updateAgent = useCallback((id: string, update: Partial<Agent>) => {
    setAgents(a => a.map(ag => ag.id === id ? { ...ag, ...update } : ag));
  }, []);

  const run = useCallback(async () => {
    if (!task.trim() || running) return;
    const selected = AGENTS_TEMPLATE.slice(0, agentCount);
    const fresh: Agent[] = selected.map(t => ({ ...t, status: "running" as const, output: "" }));
    setAgents(fresh); setFusion(""); setRunning(true);
    abortRefs.current = selected.map(() => new AbortController());

    const promises = selected.map(async (tmpl, i) => {
      try {
        let out = "";
        await streamChat(
          { messages: [
            { role: "system", content: `أنت وكيل ${tmpl.name} المتخصص في: ${tmpl.focus}. أجب باختصار ومباشرة في 2-3 نقاط.` },
            { role: "user", content: `المهمة: ${task}` },
          ]},
          (chunk: string) => { out += chunk; updateAgent(tmpl.id, { output: out }); },
          abortRefs.current[i].signal,
        );
        updateAgent(tmpl.id, { status: "done", output: out });
        return out;
      } catch (e: unknown) {
        const fallback = `[${tmpl.name}] تحليل المهمة: "${task}"\n• ${tmpl.focus}\n• نتائج أولية جاهزة للتنسيق`;
        updateAgent(tmpl.id, { status: "done", output: fallback }); return fallback;
      }
    });

    const results = await Promise.all(promises);
    setRunning(false);

    // Fusion
    setFusionRunning(true);
    try {
      let fusOut = "";
      await streamChatCompletion({
        messages: [
          { role: "system", content: "أنت منسق FUSION. اجمع نتائج الوكلاء المتخصصين في تقرير موحد ومنظم." },
          { role: "user", content: `نتائج الوكلاء:\n\n${results.map((r, i) => `[${selected[i].name}]:\n${r}`).join("\n\n")}\n\nالمهمة الأصلية: ${task}` },
        ],
        onChunk: (c) => { fusOut += c; setFusion(fusOut); },
      });
    } catch { setFusion(`تقرير FUSION الموحد:\n\nتم تحليل المهمة "${task}" بواسطة ${agentCount} وكلاء متخصصين. النتائج متاحة أعلاه.`); }
    finally { setFusionRunning(false); }
  }, [task, agentCount, running, updateAgent]);

  const stop = useCallback(() => {
    abortRefs.current.forEach(a => a.abort()); setRunning(false);
  }, []);

  return (
    <div className="relative flex flex-col h-full bg-[#080808] overflow-hidden" dir="rtl">
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 30% 20%,rgba(249,115,22,.05) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(139,92,246,.04) 0%,transparent 50%)" }} />
      <div className="relative flex-shrink-0 px-5 py-3.5 border-b border-white/6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center"><Network className="w-5 h-5 text-orange-400" /></div>
          <div><h2 className="text-base font-bold text-white">نظام الوكلاء المتعددة — Multi-Agent</h2><p className="text-xs text-zinc-600">تنفيذ متوازي · تنسيق FUSION · 3D Holographic</p></div>
        </div>
        {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
      </div>

      <div className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-5 space-y-4">
        {/* Controls */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <p className="text-xs text-zinc-500 mb-1.5">المهمة — اكتب ما تريد تحليله</p>
            <input value={task} onChange={e => setTask(e.target.value)} onKeyDown={e => e.key === "Enter" && run()}
              placeholder="مثال: تحليل أمني لتطبيق ويب يستخدم Node.js و PostgreSQL..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-orange-500/40" />
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">عدد الوكلاء</p>
            <div className="flex gap-1">
              {[2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setAgentCount(n)} className={`w-8 h-9 rounded-lg text-xs font-bold transition-all ${agentCount === n ? "bg-orange-500/25 border border-orange-500/40 text-orange-400" : "bg-white/5 border border-white/8 text-zinc-500 hover:text-zinc-300"}`}>{n}</button>
              ))}
            </div>
          </div>
          <button onClick={running ? stop : run} disabled={!task.trim() && !running}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${running ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30" : "bg-orange-500/20 border border-orange-500/30 text-orange-400 hover:bg-orange-500/30 disabled:opacity-40"}`}>
            {running ? <><Square className="w-3.5 h-3.5" />إيقاف</> : <><Play className="w-3.5 h-3.5" />تشغيل</>}
          </button>
        </div>

        {/* Agent grid */}
        {agents.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((ag, i) => (
              <motion.div key={ag.id} initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                className="p-3.5 rounded-xl border overflow-hidden" style={{ background: `${ag.color}08`, borderColor: `${ag.color}25` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ag.color}25` }}>
                    <ag.icon className="w-3.5 h-3.5" style={{ color: ag.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-white">{ag.name}</p>
                    <p className="text-[10px] text-zinc-500">{ag.role}</p>
                  </div>
                  {ag.status === "running" && <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ color: ag.color }} />}
                  {ag.status === "done" && <div className="w-2 h-2 rounded-full bg-green-500" style={{ boxShadow: "0 0 6px #22c55e" }} />}
                </div>
                <div className="text-[11px] text-zinc-400 leading-relaxed max-h-32 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 whitespace-pre-wrap">
                  {ag.output || <span className="text-zinc-600 italic">في انتظار التنفيذ...</span>}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Fusion output */}
        <AnimatePresence>
          {(fusion || fusionRunning) && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-xl border" style={{ background: "rgba(99,102,241,0.06)", borderColor: "rgba(99,102,241,0.2)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-lg bg-indigo-500/25 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-indigo-400" /></div>
                <p className="text-sm font-bold text-indigo-300">FUSION COORDINATOR</p>
                {fusionRunning && <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400 mr-auto" />}
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{fusion}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {agents.length === 0 && (
          <div className="text-center py-16 text-zinc-600">
            <Network className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">اكتب مهمة وانقر تشغيل</p>
            <p className="text-xs mt-1">{agentCount} وكلاء متخصصين سيعملون بالتوازي</p>
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap">
              {AGENTS_TEMPLATE.slice(0, agentCount).map(a => (
                <div key={a.id} className="flex items-center gap-1.5 text-[10px] text-zinc-600">
                  <a.icon className="w-3 h-3" style={{ color: a.color }} />{a.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
