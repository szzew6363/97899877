import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, GitBranch, GitCommit, GitMerge, Clock, CheckCircle2,
  AlertTriangle, RefreshCw, Plus, Minus, File, Loader2,
  Code2, Zap, Shield, Activity, Terminal, ChevronRight,
  Copy, CheckCheck, Upload, Download, Eye, Trash2,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type GitStatus = {
  branch: string;
  files: { status: string; path: string }[];
  log: { hash: string; message: string }[];
  clean: boolean;
};

type DiffLine = { type: "add" | "del" | "ctx" | "hdr"; text: string };

function parseDiff(raw: string): DiffLine[] {
  return raw.split("\n").map(l => {
    if (l.startsWith("@@")) return { type: "hdr", text: l };
    if (l.startsWith("+") && !l.startsWith("+++")) return { type: "add", text: l.slice(1) };
    if (l.startsWith("-") && !l.startsWith("---")) return { type: "del", text: l.slice(1) };
    return { type: "ctx", text: l };
  });
}

/* ─── Holographic Grid BG ──────────────────────────────────────── */
function HoloGrid() {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = cv.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0, H = 0, raf = 0, t = 0;
    const resize = () => { W = canvas.offsetWidth; H = canvas.offsetHeight; canvas.width = W; canvas.height = H; };
    resize(); window.addEventListener("resize", resize);
    const draw = () => {
      t += 0.005;
      ctx.clearRect(0, 0, W, H);
      const spacing = 50;
      for (let x = 0; x < W; x += spacing) {
        const alpha = 0.03 + Math.sin(t + x * 0.01) * 0.01;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H);
        ctx.strokeStyle = `rgba(16,185,129,${alpha})`; ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let y = 0; y < H; y += spacing) {
        const alpha = 0.03 + Math.sin(t + y * 0.01) * 0.01;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y);
        ctx.strokeStyle = `rgba(16,185,129,${alpha})`; ctx.lineWidth = 0.5; ctx.stroke();
      }
      // Data packets
      const packets = Math.floor(t * 2) % 5;
      ctx.fillStyle = "rgba(16,185,129,0.6)";
      const px = ((t * 100) % W);
      const py = ((t * 70) % H);
      ctx.fillRect(px, 0, 2, 12); ctx.fillRect(0, py, 12, 2);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={cv} className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" />;
}

function statusColor(s: string) {
  if (s === "M") return "#f59e0b";
  if (s === "A") return "#10b981";
  if (s === "D") return "#e21227";
  if (s === "?") return "#64748b";
  return "#8b5cf6";
}
function statusLabel(s: string) {
  if (s === "M") return "تعديل";
  if (s === "A") return "إضافة";
  if (s === "D") return "حذف";
  if (s === "?") return "جديد";
  return s;
}

export default function Agent4GitDashboardModal({ open, onOpenChange }: Props) {
  const [status, setStatus] = useState<GitStatus | null>(null);
  const [diff, setDiff] = useState<DiffLine[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [commitMsg, setCommitMsg] = useState("");
  const [tab, setTab] = useState<"status"|"log"|"diff">("status");
  const [loading, setLoading] = useState(false);
  const [opLoading, setOpLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{text:string;ok:boolean}|null>(null);
  const [staged, setStaged] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/git/status");
      const data = await res.json() as GitStatus;
      setStatus(data);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { if (open) load(); }, [open, load]);

  const loadDiff = async (file: string) => {
    setSelectedFile(file);
    setTab("diff");
    try {
      const res = await fetch(`/api/git/diff?file=${encodeURIComponent(file)}`);
      const d = await res.json() as { diff: string };
      setDiff(parseDiff(d.diff || "No changes"));
    } catch { setDiff([{ type: "ctx", text: "فشل تحميل الـ diff" }]); }
  };

  const gitOp = async (op: string, body?: Record<string, unknown>) => {
    setOpLoading(op);
    try {
      const res = await fetch(`/api/git/${op}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      setMessage({ text: data.ok ? `تمت العملية: ${op}` : (data.error ?? "خطأ"), ok: data.ok });
      setTimeout(() => setMessage(null), 3000);
      await load();
    } catch { setMessage({ text: "فشل الاتصال", ok: false }); }
    setOpLoading(null);
  };

  const stageFile = (path: string) => setStaged(prev => prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]);

  const doCommit = async () => {
    if (!commitMsg.trim()) return;
    if (staged.length > 0) await gitOp("add", { files: staged });
    else await gitOp("add", {});
    await gitOp("commit", { message: commitMsg });
    setCommitMsg(""); setStaged([]);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.95)" }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onOpenChange(false); }}>
        <motion.div className="relative flex flex-col overflow-hidden"
          style={{
            width: "min(1400px, 98vw)", height: "min(900px, 96vh)",
            background: "linear-gradient(135deg,#050908 0%,#080d0a 50%,#050908 100%)",
            border: "1px solid rgba(16,185,129,0.2)", borderRadius: 20,
            boxShadow: "0 0 80px rgba(16,185,129,0.08), inset 0 0 100px rgba(16,185,129,0.02)",
          }}
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}>
          <HoloGrid />

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-4">
              <motion.div className="w-12 h-12 rounded-xl flex items-center justify-center relative"
                style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                <motion.div className="absolute inset-0 rounded-xl"
                  animate={{ boxShadow: ["0 0 10px rgba(16,185,129,0.2)","0 0 30px rgba(16,185,129,0.4)","0 0 10px rgba(16,185,129,0.2)"] }}
                  transition={{ duration: 2, repeat: Infinity }} />
                <GitBranch size={22} color="#10b981" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white tracking-widest">GIT</span>
                  <motion.span className="text-xl font-black tracking-widest"
                    style={{ color: "#10b981", textShadow: "0 0 20px #10b981" }}
                    animate={{ textShadow: ["0 0 10px #10b98188","0 0 30px #10b981","0 0 10px #10b98188"] }}
                    transition={{ duration: 2, repeat: Infinity }}>DASHBOARD</motion.span>
                  {status && (
                    <div className="px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1"
                      style={{ borderColor: "rgba(16,185,129,0.3)", color: "#10b981", background: "rgba(16,185,129,0.1)" }}>
                      <GitBranch size={9} />{status.branch}
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">إدارة الإصدارات البصرية · Commit · Diff · Log</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={load} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#222] text-slate-500 hover:text-white text-xs transition-all">
                <RefreshCw size={12} className={loading ? "animate-spin" : ""} />تحديث
              </button>
              <button onClick={() => onOpenChange(false)} className="p-2 rounded-xl border border-[#2a2a2a] bg-[#111] text-slate-400 hover:text-white hover:border-red-500/50 transition-all">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Message */}
          <AnimatePresence>
            {message && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className={`px-6 py-2 flex items-center gap-2 text-xs border-b ${message.ok ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/05" : "text-red-400 border-red-500/20 bg-red-500/05"}`}>
                {message.ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-1 overflow-hidden">
            {/* Left: File List */}
            <div className="w-64 flex-shrink-0 border-r border-[#1a1a1a] flex flex-col overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-[#1a1a1a]">
                {[["status","الحالة"], ["log","السجل"], ["diff","Diff"]] .map(([t, l]) => (
                  <button key={t} onClick={() => setTab(t as typeof tab)}
                    className={`flex-1 py-2 text-[11px] font-bold transition-all border-b-2 ${tab === t ? "text-emerald-400 border-emerald-500" : "text-slate-600 border-transparent hover:text-slate-400"}`}>
                    {l}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                  <div className="flex items-center justify-center h-32">
                    <Loader2 size={20} className="animate-spin" color="#10b981" />
                  </div>
                ) : tab === "status" ? (
                  status?.files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2">
                      <CheckCircle2 size={24} color="#10b981" />
                      <p className="text-xs text-emerald-400">الشجرة نظيفة</p>
                    </div>
                  ) : status?.files.map((f, i) => (
                    <motion.div key={i}
                      className="flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer hover:bg-[#1a1a1a] transition-all mb-1 group"
                      style={selectedFile === f.path ? { background: "#1a1a1a", border: "1px solid #2a2a2a" } : {}}
                      onClick={() => loadDiff(f.path)}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                      <input type="checkbox" checked={staged.includes(f.path)} onChange={() => stageFile(f.path)}
                        className="rounded" onClick={e => e.stopPropagation()} />
                      <div className="px-1.5 py-0.5 rounded text-[9px] font-bold"
                        style={{ background: `${statusColor(f.status)}22`, color: statusColor(f.status) }}>
                        {statusLabel(f.status)}
                      </div>
                      <span className="text-[11px] text-slate-400 truncate flex-1 font-mono">{f.path.split("/").pop()}</span>
                      <Eye size={10} color="#555" className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))
                ) : tab === "log" ? (
                  status?.log.map((l, i) => (
                    <motion.div key={i} className="flex items-start gap-2 px-2 py-2 rounded-lg hover:bg-[#1a1a1a] transition-all mb-1 cursor-pointer"
                      initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                        style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
                        <GitCommit size={9} color="#10b981" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-mono text-emerald-400">{l.hash}</div>
                        <div className="text-[11px] text-slate-400 truncate">{l.message}</div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-700 p-2">اختر ملفاً من القائمة لرؤية التغييرات</p>
                )}
              </div>

              {/* Commit Panel */}
              {tab === "status" && (status?.files?.length ?? 0) > 0 && (
                <div className="p-3 border-t border-[#1a1a1a]">
                  <input value={commitMsg} onChange={e => setCommitMsg(e.target.value)}
                    placeholder="رسالة الـ commit..."
                    className="w-full bg-[#0d0d0d] border border-[#222] rounded-lg px-3 py-2 text-xs text-slate-200 outline-none placeholder-slate-600 focus:border-emerald-500/30 mb-2" />
                  <div className="flex gap-2">
                    <motion.button onClick={doCommit} disabled={!commitMsg.trim() || !!opLoading}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold disabled:opacity-40"
                      style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981" }}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      {opLoading === "commit" ? <Loader2 size={11} className="animate-spin" /> : <GitCommit size={11} />}
                      Commit
                    </motion.button>
                  </div>
                  {staged.length > 0 && <p className="text-[10px] text-slate-600 mt-1">{staged.length} ملف محدد</p>}
                </div>
              )}
            </div>

            {/* Right: Diff Viewer */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-2 border-b border-[#1a1a1a] flex-shrink-0">
                <Code2 size={12} color="#10b981" />
                <span className="text-[11px] text-slate-500 font-bold tracking-widest">
                  {selectedFile ? `Diff: ${selectedFile}` : "اختر ملفاً لعرض التغييرات"}
                </span>
                {diff.length > 0 && (
                  <div className="flex items-center gap-3 ml-auto text-[10px]">
                    <span className="text-emerald-400">+{diff.filter(l => l.type === "add").length}</span>
                    <span className="text-red-400">-{diff.filter(l => l.type === "del").length}</span>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-y-auto font-mono text-xs">
                {diff.length > 0 ? diff.map((line, i) => (
                  <motion.div key={i}
                    className="px-4 py-0.5 flex items-start gap-3 leading-5"
                    style={{
                      background: line.type === "add" ? "rgba(16,185,129,0.08)" : line.type === "del" ? "rgba(226,18,39,0.08)" : line.type === "hdr" ? "rgba(139,92,246,0.08)" : "transparent",
                      borderLeft: line.type === "add" ? "2px solid #10b981" : line.type === "del" ? "2px solid #e21227" : line.type === "hdr" ? "2px solid #8b5cf6" : "2px solid transparent",
                    }}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.001 }}>
                    <span className="w-4 flex-shrink-0 text-center select-none"
                      style={{ color: line.type === "add" ? "#10b981" : line.type === "del" ? "#e21227" : line.type === "hdr" ? "#8b5cf6" : "#333" }}>
                      {line.type === "add" ? "+" : line.type === "del" ? "−" : line.type === "hdr" ? "@@" : " "}
                    </span>
                    <span style={{ color: line.type === "add" ? "#86efac" : line.type === "del" ? "#fca5a5" : line.type === "hdr" ? "#c4b5fd" : "#64748b" }}>
                      {line.text}
                    </span>
                  </motion.div>
                )) : (
                  <div className="flex flex-col items-center justify-center h-full gap-6">
                    <motion.div animate={{ rotate: [0,360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                      <GitBranch size={60} color="#10b98122" />
                    </motion.div>
                    <div className="text-center">
                      <div className="text-slate-600 text-sm">لوحة تحكم Git المرئية</div>
                      <div className="text-slate-700 text-xs mt-1">اختر ملفاً من القائمة لرؤية التغييرات</div>
                    </div>
                    {/* Branch Visualization */}
                    <div className="flex items-center gap-0">
                      {(status?.log ?? []).slice(0,6).map((l,i) => (
                        <div key={i} className="flex items-center">
                          <motion.div className="w-8 h-8 rounded-full flex items-center justify-center"
                            style={{ background: `rgba(16,185,129,${0.1 + i*0.05})`, border: "1px solid rgba(16,185,129,0.3)" }}
                            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i*0.1 }}>
                            <GitCommit size={12} color="#10b981" />
                          </motion.div>
                          {i < 5 && <div className="w-6 h-0.5 bg-emerald-500/30" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative flex items-center justify-between px-5 py-2 border-t border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-4 text-[10px]">
              {[
                { c: "#10b981", l: `${status?.log.length ?? 0} commits` },
                { c: "#f59e0b", l: `${status?.files.length ?? 0} تغيير` },
                { c: status?.clean ? "#10b981" : "#e21227", l: status?.clean ? "نظيف" : "تعديلات معلّقة" },
              ].map((t,i) => (
                <motion.span key={i} style={{ color: t.c }} animate={{ opacity:[0.6,1,0.6] }} transition={{ duration:2, repeat:Infinity, delay:i*0.3 }}>
                  ● {t.l}
                </motion.span>
              ))}
            </div>
            <motion.div className="text-[10px] text-slate-700" animate={{ opacity:[0.4,0.8,0.4] }} transition={{ duration:3, repeat:Infinity }}>
              AGENT 4 · GIT DASHBOARD · VISUAL
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
