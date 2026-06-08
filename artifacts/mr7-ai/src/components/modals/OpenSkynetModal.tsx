import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Orbit, Bot, Globe, Code2, Zap, Brain, Clock, Play, Square,
  Plus, Trash2, CheckCircle2, Circle, ArrowRight, ChevronRight,
  Loader2, RefreshCw, Terminal, Database, Cpu, Star, Download,
  Activity, Eye, Settings, Calendar, BookOpen, Layers, Wifi,
  X, RotateCcw, CircleDot, Sparkles, Radar, Signal,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface OpenSkynetModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type AgentId = "manager" | "browser" | "coder" | "terminator";
type AgentStatus = "idle" | "running" | "done" | "error";
type TabId = "mission" | "learn" | "schedule" | "skills" | "memory";

interface Agent {
  id: AgentId;
  name: string;
  icon: typeof Bot;
  color: string;
  glow: string;
  ring: string;
  desc: string;
  status: AgentStatus;
  task: string | null;
  progress: number;
}

interface CronJob {
  id: string;
  name: string;
  cron: string;
  agent: AgentId;
  lastRun: string;
  nextRun: string;
  enabled: boolean;
  runs: number;
}

interface SkillCard {
  id: string;
  name: string;
  category: string;
  stars: number;
  installed: boolean;
  desc: string;
}

const INITIAL_AGENTS: Agent[] = [
  { id: "manager", name: "Manager", icon: Brain, color: "#818cf8", glow: "rgba(129,140,248,0.4)", ring: "border-indigo-500/50", desc: "يُنسق المهام ويوزعها على الوكلاء الآخرين", status: "idle", task: null, progress: 0 },
  { id: "browser", name: "Browser", icon: Globe, color: "#22d3ee", glow: "rgba(34,211,238,0.4)", ring: "border-cyan-500/50", desc: "يتصفح الويب، يملأ النماذج، ينقر الأزرار", status: "idle", task: null, progress: 0 },
  { id: "coder", name: "Coder", icon: Code2, color: "#a78bfa", glow: "rgba(167,139,250,0.4)", ring: "border-violet-500/50", desc: "يكتب، يحرر ويصحح الكود تلقائياً", status: "idle", task: null, progress: 0 },
  { id: "terminator", name: "Terminator", icon: Zap, color: "#fb923c", glow: "rgba(251,146,60,0.4)", ring: "border-orange-500/50", desc: "تنفيذ مستقل بلا تأكيد — أقوى وضع", status: "idle", task: null, progress: 0 },
];

const SAMPLE_JOBS: CronJob[] = [
  { id: "j1", name: "تقرير الأسهم اليومي", cron: "0 8 * * *", agent: "browser", lastRun: "منذ 6 ساعات", nextRun: "بعد 18 ساعة", enabled: true, runs: 47 },
  { id: "j2", name: "نسخ احتياطي للكود", cron: "0 2 * * *", agent: "coder", lastRun: "منذ 4 ساعات", nextRun: "بعد 20 ساعة", enabled: true, runs: 112 },
  { id: "j3", name: "تنظيف السجلات", cron: "0 0 * * 0", agent: "terminator", lastRun: "منذ 3 أيام", nextRun: "بعد 4 أيام", enabled: false, runs: 8 },
  { id: "j4", name: "رصد أسعار المنتجات", cron: "*/30 * * * *", agent: "browser", lastRun: "منذ 12 دقيقة", nextRun: "بعد 18 دقيقة", enabled: true, runs: 2340 },
];

const SKILLS: SkillCard[] = [
  { id: "s1", name: "Web Scraper Pro", category: "Web", stars: 847, installed: true, desc: "استخراج بيانات من أي موقع بدقة عالية" },
  { id: "s2", name: "Code Reviewer", category: "Code", stars: 621, installed: false, desc: "مراجعة الكود وتقديم اقتراحات تحسين" },
  { id: "s3", name: "Email Automator", category: "Productivity", stars: 1204, installed: true, desc: "أتمتة إرسال واستقبال ورد الإيميلات" },
  { id: "s4", name: "Data Analyst", category: "Data", stars: 492, installed: false, desc: "تحليل جداول البيانات وتوليد تقارير" },
  { id: "s5", name: "Form Filler", category: "Web", stars: 933, installed: true, desc: "ملء النماذج الإلكترونية تلقائياً" },
  { id: "s6", name: "GitHub Sync", category: "Code", stars: 718, installed: false, desc: "مزامنة المستودعات وإدارة PRs" },
];

function OrbitRing({ radius, duration, delay, color }: { radius: number; duration: number; delay: number; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full border border-dashed pointer-events-none"
      style={{ width: radius * 2, height: radius * 2, borderColor: color, opacity: 0.15, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      animate={{ rotate: 360 }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    />
  );
}

function AgentOrb({ agent, onClick, active }: { agent: Agent; onClick: () => void; active: boolean }) {
  const Icon = agent.icon;
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${active ? `${agent.ring} bg-white/5` : "border-white/10 bg-white/2 hover:border-white/20"}`}
      style={{ boxShadow: active ? `0 0 20px ${agent.glow}` : undefined }}
    >
      <div className="relative">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${agent.glow}`, border: `1px solid ${agent.color}40` }}>
          <Icon className="w-6 h-6" style={{ color: agent.color }} />
        </div>
        <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0a0a0f] ${agent.status === "running" ? "bg-emerald-400 animate-pulse" : agent.status === "done" ? "bg-blue-400" : agent.status === "error" ? "bg-red-400" : "bg-gray-600"}`} />
      </div>
      <span className="text-[11px] font-bold" style={{ color: agent.color }}>{agent.name}</span>
      {agent.status === "running" && agent.progress > 0 && (
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <motion.div className="h-full rounded-full" style={{ background: agent.color, width: `${agent.progress}%` }} />
        </div>
      )}
    </motion.button>
  );
}

function MissionTab({ agents, onAgentClick, activeAgent }: { agents: Agent[]; onAgentClick: (id: AgentId) => void; activeAgent: AgentId | null }) {
  const active = agents.find(a => a.id === activeAgent);
  return (
    <div className="space-y-5">
      {/* Agent Grid */}
      <div className="grid grid-cols-4 gap-3">
        {agents.map(a => <AgentOrb key={a.id} agent={a} onClick={() => onAgentClick(a.id)} active={activeAgent === a.id} />)}
      </div>

      {/* Active Agent Detail */}
      <AnimatePresence mode="wait">
        {active && (
          <motion.div key={active.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border p-4 space-y-3"
            style={{ borderColor: `${active.color}40`, background: `${active.glow.replace("0.4", "0.06")}` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: active.glow }}>
                <active.icon className="w-4 h-4" style={{ color: active.color }} />
              </div>
              <div>
                <div className="text-sm font-bold text-white">{active.name} Agent</div>
                <div className="text-[11px] text-white/50">{active.desc}</div>
              </div>
              <div className="ml-auto">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${active.status === "idle" ? "border-white/20 text-white/40" : active.status === "running" ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10" : "border-blue-500/50 text-blue-400 bg-blue-500/10"}`}>
                  {active.status === "idle" ? "STANDBY" : active.status === "running" ? "ACTIVE" : "DONE"}
                </span>
              </div>
            </div>
            {active.task && (
              <div className="text-xs text-white/60 font-mono bg-black/30 rounded-lg px-3 py-2 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
                {active.task}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Mission */}
      <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
        <div className="text-[11px] font-mono text-white/40 uppercase tracking-widest mb-3 flex items-center gap-2">
          <Radar className="w-3.5 h-3.5" /> مهمة جديدة
        </div>
        <textarea
          rows={2}
          placeholder="صِف المهمة... (مثال: ابحث عن أسعار iPhone 16 من 5 مواقع وأرسلها)"
          className="w-full bg-transparent text-sm text-white/80 placeholder:text-white/25 resize-none focus:outline-none leading-relaxed"
        />
        <div className="flex gap-2 mt-3">
          {INITIAL_AGENTS.map(a => (
            <button key={a.id} className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border ${activeAgent === a.id ? `border-opacity-60 bg-opacity-15` : "border-white/15 text-white/40 hover:border-white/30"}`}
              style={activeAgent === a.id ? { borderColor: a.color, color: a.color, background: a.glow.replace("0.4", "0.12") } : {}}
              onClick={() => onAgentClick(a.id)}
            >{a.name}</button>
          ))}
          <button className="ml-auto px-3 py-1 rounded-lg text-[11px] font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/30 flex items-center gap-1.5 transition-all">
            <Play className="w-3 h-3" /> إطلاق
          </button>
        </div>
      </div>

      {/* Live Feed */}
      <div>
        <div className="text-[11px] font-mono text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
          <Signal className="w-3.5 h-3.5" /> سجل المهام الحية
        </div>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {[
            { agent: "browser", color: "#22d3ee", msg: "✓ استخرجت 847 منتج من Amazon", time: "00:02" },
            { agent: "coder", color: "#a78bfa", msg: "✓ أصلحت 3 أخطاء في auth.ts", time: "00:08" },
            { agent: "manager", color: "#818cf8", msg: "⟳ جارٍ توزيع مهام التقرير الأسبوعي", time: "00:15" },
            { agent: "terminator", color: "#fb923c", msg: "✓ حذفت 1.2GB من الملفات المؤقتة", time: "00:23" },
            { agent: "browser", color: "#22d3ee", msg: "✓ ملأت نموذج تجديد اشتراك Azure", time: "01:05" },
          ].map((l, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/3 border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: l.color }} />
              <span className="text-xs text-white/65 flex-1 font-mono">{l.msg}</span>
              <span className="text-[10px] text-white/25 font-mono">{l.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LearnTab() {
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);

  const startRecord = () => {
    setRecording(true);
    setSteps([]);
    setRecorded(false);
    const actions = [
      "⟳ بدء التسجيل — مراقبة المتصفح...",
      "↗ انتقلت إلى example.com",
      "🖱 نقرت على زر 'تسجيل الدخول'",
      "⌨ كتبت في حقل الإيميل",
      "⌨ كتبت في حقل كلمة المرور",
      "🖱 نقرت على 'دخول'",
      "✓ تسجيل ناجح — تعلمت 5 خطوات",
    ];
    let i = 0;
    const iv = setInterval(() => {
      setSteps(s => [...s, actions[i]]);
      i++;
      if (i >= actions.length) { clearInterval(iv); setRecording(false); setRecorded(true); }
    }, 700);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-5 text-center">
        <div className="text-[11px] text-white/40 font-mono uppercase tracking-widest mb-4">Learn by Showing</div>
        <div className="relative w-20 h-20 mx-auto mb-4">
          {recording && <span className="absolute inset-0 rounded-full border-2 border-red-500 animate-ping opacity-30" />}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center border-2 ${recording ? "border-red-500 bg-red-500/10" : recorded ? "border-emerald-500 bg-emerald-500/10" : "border-white/20 bg-white/5"}`}>
            {recording ? <CircleDot className="w-8 h-8 text-red-400 animate-pulse" /> : recorded ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <Eye className="w-8 h-8 text-white/30" />}
          </div>
        </div>
        <p className="text-xs text-white/50 mb-4">{recording ? "جارٍ التسجيل — نفّذ الإجراءات في المتصفح" : recorded ? "تم التعلم — الوكيل يمكنه إعادة التنفيذ 24/7" : "سجّل نفسك مرة واحدة — الوكيل يُكرر إلى الأبد"}</p>
        <div className="flex gap-2 justify-center">
          <button onClick={startRecord} disabled={recording} className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 disabled:opacity-50 flex items-center gap-2 transition-all">
            {recording ? <Loader2 className="w-4 h-4 animate-spin" /> : <CircleDot className="w-4 h-4" />}
            {recording ? "جارٍ التسجيل..." : "ابدأ التسجيل"}
          </button>
          {recorded && (
            <button className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/30 flex items-center gap-2 transition-all">
              <Play className="w-4 h-4" /> تشغيل تلقائي
            </button>
          )}
        </div>
      </div>

      {steps.length > 0 && (
        <div>
          <div className="text-[11px] font-mono text-white/40 uppercase tracking-widest mb-2">الخطوات المسجلة</div>
          <div className="space-y-1.5">
            {steps.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/4 border border-white/8">
                <span className="text-[10px] font-mono text-white/30 w-5">{i + 1}</span>
                <span className="text-xs text-white/70 font-mono">{s}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {recorded && (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Self-Healing مُفعّل
          </div>
          <p className="text-xs text-white/50">إذا تغيرت الصفحة، الوكيل يُشخّص الفرق ويُصلح نفسه تلقائياً دون تدخل بشري.</p>
        </div>
      )}
    </div>
  );
}

function ScheduleTab() {
  const [jobs, setJobs] = useState(SAMPLE_JOBS);
  const toggle = (id: string) => setJobs(j => j.map(jj => jj.id === id ? { ...jj, enabled: !jj.enabled } : jj));

  const agentColors: Record<AgentId, string> = { manager: "#818cf8", browser: "#22d3ee", coder: "#a78bfa", terminator: "#fb923c" };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5" /> المهام المجدولة
        </div>
        <button className="text-[11px] flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition-colors">
          <Plus className="w-3.5 h-3.5" /> مهمة جديدة
        </button>
      </div>

      <div className="space-y-2.5">
        {jobs.map(j => (
          <div key={j.id} className={`rounded-2xl border p-3.5 transition-all ${j.enabled ? "border-white/15 bg-white/4" : "border-white/6 bg-white/2 opacity-50"}`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${agentColors[j.agent]}20`, border: `1px solid ${agentColors[j.agent]}40` }}>
                <span className="text-[10px] font-bold capitalize" style={{ color: agentColors[j.agent] }}>{j.agent[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white/80">{j.name}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  <code className="text-[10px] font-mono text-white/30">{j.cron}</code>
                  <span className="text-[10px] text-white/30">· تم {j.runs} مرة</span>
                </div>
              </div>
              <button onClick={() => toggle(j.id)} className={`w-10 h-5.5 rounded-full border transition-all relative ${j.enabled ? "bg-indigo-500/30 border-indigo-500/50" : "bg-white/5 border-white/15"}`}>
                <motion.span animate={{ x: j.enabled ? 18 : 2 }} className="absolute top-0.5 w-4 h-4 rounded-full" style={{ background: j.enabled ? "#818cf8" : "#ffffff30" }} />
              </button>
            </div>
            {j.enabled && (
              <div className="flex gap-4 mt-2.5 text-[10px] text-white/35">
                <span>آخر تشغيل: {j.lastRun}</span>
                <span>التالي: {j.nextRun}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SkillsTab() {
  const [skills, setSkills] = useState(SKILLS);
  const [search, setSearch] = useState("");
  const install = (id: string) => setSkills(s => s.map(sk => sk.id === id ? { ...sk, installed: !sk.installed } : sk));
  const filtered = skills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase()));

  const catColors: Record<string, string> = { Web: "#22d3ee", Code: "#a78bfa", Productivity: "#fb923c", Data: "#10b981" };

  return (
    <div className="space-y-4">
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث في Skills Hub..." className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:border-indigo-500/50 transition-colors" />
      <div className="grid grid-cols-2 gap-2.5">
        {filtered.map(sk => (
          <motion.div key={sk.id} layout className={`rounded-2xl border p-3.5 transition-all ${sk.installed ? "border-indigo-500/30 bg-indigo-500/6" : "border-white/10 bg-white/3 hover:border-white/20"}`}>
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <span className="text-sm font-bold text-white/85">{sk.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md" style={{ color: catColors[sk.category] ?? "#818cf8", background: `${catColors[sk.category] ?? "#818cf8"}15` }}>{sk.category}</span>
            </div>
            <p className="text-[11px] text-white/45 mb-2.5">{sk.desc}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[10px] text-amber-400/70">
                <Star className="w-3 h-3 fill-current" /> {sk.stars.toLocaleString()}
              </div>
              <button onClick={() => install(sk.id)} className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${sk.installed ? "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25" : "bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/30"}`}>
                {sk.installed ? "إزالة" : "تثبيت"}
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MemoryTab() {
  const memories = [
    { key: "preferred_browser", val: "Chrome — تسجيل الدخول بـ Google دائماً", agent: "browser", age: "منذ 3 أيام" },
    { key: "github_username", val: "mr7agent", agent: "coder", age: "منذ أسبوع" },
    { key: "report_format", val: "PDF مع رسوم بيانية + ملخص تنفيذي أول", agent: "manager", age: "منذ يومين" },
    { key: "aws_region", val: "us-east-1 — افتراضي لكل deployment", agent: "terminator", age: "منذ 5 أيام" },
    { key: "language_preference", val: "العربية في التقارير, الإنجليزية في الكود", agent: "manager", age: "منذ أسبوعين" },
    { key: "timezone", val: "Asia/Riyadh (UTC+3)", agent: "manager", age: "منذ أسبوع" },
  ];
  const agentColors: Record<string, string> = { manager: "#818cf8", browser: "#22d3ee", coder: "#a78bfa", terminator: "#fb923c" };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3.5 text-center">
        <div className="text-3xl font-black text-indigo-400 font-mono">{memories.length}</div>
        <div className="text-[11px] text-white/40 mt-0.5">ذاكرة مستمرة عبر الجلسات</div>
      </div>
      <div className="space-y-2">
        {memories.map((m, i) => (
          <div key={i} className="rounded-xl border border-white/8 bg-white/3 p-3 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: agentColors[m.agent] }} />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono text-white/35 mb-0.5">{m.key}</div>
              <div className="text-xs text-white/75 truncate">{m.val}</div>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-[10px] font-bold capitalize" style={{ color: agentColors[m.agent] }}>{m.agent}</span>
              <span className="text-[10px] text-white/25">{m.age}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const TABS: { id: TabId; label: string; icon: typeof Orbit }[] = [
  { id: "mission", label: "المهمة", icon: Radar },
  { id: "learn", label: "التعلم", icon: Eye },
  { id: "schedule", label: "الجدولة", icon: Calendar },
  { id: "skills", label: "Skills Hub", icon: BookOpen },
  { id: "memory", label: "الذاكرة", icon: Database },
];

export function OpenSkynetModal({ open, onOpenChange }: OpenSkynetModalProps) {
  const [tab, setTab] = useState<TabId>("mission");
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [activeAgent, setActiveAgent] = useState<AgentId | null>("manager");
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    const iv = setInterval(() => {
      setAgents(prev => prev.map(a => {
        if (Math.random() < 0.03 && a.status === "idle") return { ...a, status: "running", progress: 5, task: "معالجة مهمة..." };
        if (a.status === "running") {
          const p = a.progress + Math.random() * 12;
          if (p >= 100) return { ...a, status: "idle", progress: 0, task: null };
          return { ...a, progress: p };
        }
        return a;
      }));
    }, 600);
    return () => clearInterval(iv);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0 gap-0 overflow-hidden border-0"
        style={{ background: "linear-gradient(135deg, #07071a 0%, #0d0d2b 50%, #080820 100%)", boxShadow: "0 0 80px rgba(99,102,241,0.15), 0 0 0 1px rgba(129,140,248,0.15)" }}>

        {/* Ambient Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full opacity-10" style={{ background: "radial-gradient(circle, #818cf8, transparent 70%)" }} />
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full opacity-8" style={{ background: "radial-gradient(circle, #22d3ee, transparent 70%)" }} />
        </div>

        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 pt-5 pb-0 relative">
          <div className="flex items-center gap-3 mb-1">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(129,140,248,0.3), rgba(34,211,238,0.2))", border: "1px solid rgba(129,140,248,0.4)" }}>
                <Orbit className="w-5 h-5 text-indigo-400" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#07071a] animate-pulse" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-white tracking-tight">OpenSkynet</DialogTitle>
              <DialogDescription className="text-[11px] text-indigo-300/60 font-mono">AI TERMINATOR · 4 AGENTS · 24/7 AUTOMATION</DialogDescription>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="text-[10px] font-mono text-emerald-400/80 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
              </div>
              <div className="text-[10px] font-mono text-indigo-400/70">v0.3.14</div>
            </div>
          </div>

          {/* Agent status bar */}
          <div className="flex items-center gap-1.5 mt-3 mb-4">
            {agents.map(a => (
              <div key={a.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: `${a.glow.replace("0.4", "0.08")}`, border: `1px solid ${a.color}25` }}>
                <span className={`w-1.5 h-1.5 rounded-full ${a.status === "running" ? "animate-pulse" : ""}`} style={{ background: a.status === "idle" ? "#374151" : a.color }} />
                <span className="text-[10px] font-mono" style={{ color: a.status === "idle" ? "#4b5563" : a.color }}>{a.name}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/8">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[12px] font-medium transition-all border-b-2 -mb-px ${tab === t.id ? "border-indigo-500 text-indigo-400" : "border-transparent text-white/35 hover:text-white/60"}`}>
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 relative">
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.15 }}>
              {tab === "mission"  && <MissionTab agents={agents} onAgentClick={id => setActiveAgent(prev => prev === id ? null : id)} activeAgent={activeAgent} />}
              {tab === "learn"    && <LearnTab />}
              {tab === "schedule" && <ScheduleTab />}
              {tab === "skills"   && <SkillsTab />}
              {tab === "memory"   && <MemoryTab />}
            </motion.div>
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
