import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, ExternalLink, Terminal, Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { OrchestratorCmd } from "@/lib/agent-orchestrator";
import { getModuleById } from "@/lib/agent-orchestrator";

const MODULE_ICONS: Record<string, string> = {
  artpplatform: "⚔",
  pentestlabpro: "🔬",
  soccommand: "🛡",
  kaliagent: "🤖",
  jarvis: "🧠",
  parseltongue: "🐍",
  ragflow: "📄",
  teamagent: "👥",
  skillslibrary: "📚",
  app: "⚙",
};

function StatusIcon({ status }: { status: OrchestratorCmd["status"] }) {
  if (status === "running") return <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />;
  if (status === "done") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
  return <XCircle className="w-3.5 h-3.5 text-red-400" />;
}

function statusColor(status: OrchestratorCmd["status"]) {
  if (status === "running") return "border-cyan-500/40 bg-cyan-500/5";
  if (status === "done") return "border-emerald-500/30 bg-emerald-500/5";
  return "border-red-500/30 bg-red-500/5";
}

function statusLabel(status: OrchestratorCmd["status"]) {
  if (status === "running") return "جاري التنفيذ...";
  if (status === "done") return "اكتمل";
  return "خطأ";
}

export function AgentCommandBlock({ cmd }: { cmd: OrchestratorCmd }) {
  const [expanded, setExpanded] = useState(cmd.status === "done");
  const mod = getModuleById(cmd.module);
  const icon = MODULE_ICONS[cmd.module] ?? "⚡";
  const color = mod?.color ?? "#e21227";
  const paramEntries = Object.entries(cmd.params);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`my-2 rounded-xl border font-mono text-[11.5px] overflow-hidden ${statusColor(cmd.status)}`}
      style={{ borderColor: `${color}33` }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/[0.02] transition-colors"
      >
        {/* Module icon badge */}
        <span
          className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-sm font-bold"
          style={{ background: `${color}22`, border: `1px solid ${color}44`, color }}
        >
          {icon}
        </span>

        {/* Command info */}
        <div className="flex-1 flex items-center gap-2 min-w-0 text-left" dir="ltr">
          <span className="text-slate-400 font-semibold" style={{ color: `${color}cc` }}>
            {mod?.label ?? cmd.module}
          </span>
          <span className="text-slate-600">→</span>
          <span className="text-white/80 font-bold">{cmd.action}</span>
          {paramEntries.length > 0 && (
            <span className="text-slate-500 truncate max-w-[200px]">
              ({paramEntries.map(([k, v]) => `${k}="${String(v).slice(0, 30)}"`).join(", ")})
            </span>
          )}
        </div>

        {/* Status */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusIcon status={cmd.status} />
          <span className={`text-[10px] font-semibold ${
            cmd.status === "running" ? "text-cyan-400" :
            cmd.status === "done" ? "text-emerald-400" : "text-red-400"
          }`}>{statusLabel(cmd.status)}</span>
        </div>

        {cmd.result && (
          expanded ? <ChevronUp className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        )}
      </button>

      {/* Params row */}
      {paramEntries.length > 0 && (
        <div className="px-3 pb-1 flex flex-wrap gap-1.5" dir="ltr">
          {paramEntries.map(([k, v]) => (
            <span key={k} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px]">
              <span className="text-slate-500">{k}:</span>
              <span className="text-slate-300">{String(v).slice(0, 50)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Result */}
      <AnimatePresence initial={false}>
        {expanded && cmd.result && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="mx-3 mb-3 rounded-lg border p-3 text-[11px] leading-relaxed whitespace-pre-wrap text-slate-300 font-mono max-h-64 overflow-y-auto scrollbar-thin"
              style={{ borderColor: `${color}22`, background: `${color}08` }}
              dir="auto"
            >
              {cmd.result}
            </div>
            <div className="px-3 pb-2 flex items-center gap-2">
              <Terminal className="w-3 h-3 text-slate-600" />
              <span className="text-[10px] text-slate-600">
                تم التنفيذ {new Date(cmd.ts).toLocaleTimeString("ar")}
              </span>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("kali:open-module", { detail: { moduleId: cmd.module } }))}
                className="ml-auto flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-slate-400 border border-white/10 hover:bg-white/5 hover:text-white transition-colors"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                فتح الوحدة
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Running shimmer */}
      {cmd.status === "running" && (
        <div className="h-0.5 w-full overflow-hidden">
          <motion.div
            className="h-full"
            style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  );
}

export function AgentCommandsPanel({ cmds }: { cmds: OrchestratorCmd[] }) {
  if (!cmds || cmds.length === 0) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
        <Terminal className="w-3 h-3" />
        <span>أوامر AI Master Controller ({cmds.length})</span>
      </div>
      {cmds.map(cmd => (
        <AgentCommandBlock key={cmd.id} cmd={cmd} />
      ))}
    </div>
  );
}
