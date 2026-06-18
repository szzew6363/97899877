import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, CheckCircle2, AlertCircle, Loader2, Code2,
  Play, Copy, ChevronRight, Settings2, ExternalLink,
  Globe, Database, MessageSquare, FileText, BarChart3,
  Link2, Cpu, Shield, Radio, ArrowRight, CheckCheck,
} from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type IntegrationId = "slack" | "notion" | "bigquery" | "linear" | "github" | "discord" | "airtable" | "zapier";
type IntegrationStatus = "idle" | "testing" | "connected" | "error";

type Integration = {
  id: IntegrationId; name: string; desc: string;
  icon: string; color: string; category: string;
  fields: { key: string; label: string; type: string; placeholder: string }[];
  webhookUrl?: string;
};

const INTEGRATIONS: Integration[] = [
  {
    id: "slack", name: "Slack", desc: "إرسال رسائل، إشعارات، وربط الـ CI/CD بقنوات Slack",
    icon: "💬", color: "#4a154b", category: "تواصل",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "text", placeholder: "https://hooks.slack.com/services/..." },
      { key: "channel", label: "Channel", type: "text", placeholder: "#general" },
    ],
  },
  {
    id: "notion", name: "Notion", desc: "مزامنة قواعد البيانات، إنشاء الصفحات، وإدارة المحتوى",
    icon: "📝", color: "#000000", category: "إنتاجية",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "secret_..." },
      { key: "databaseId", label: "Database ID", type: "text", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" },
    ],
  },
  {
    id: "bigquery", name: "BigQuery", desc: "استعلام وتحليل ملايين السجلات من Google BigQuery",
    icon: "📊", color: "#4285F4", category: "بيانات",
    fields: [
      { key: "projectId", label: "Project ID", type: "text", placeholder: "my-gcp-project" },
      { key: "dataset", label: "Dataset", type: "text", placeholder: "my_dataset" },
      { key: "credentials", label: "Service Account JSON", type: "textarea", placeholder: '{"type": "service_account",...}' },
    ],
  },
  {
    id: "linear", name: "Linear", desc: "إدارة المشاريع، المهام، والـ Sprints مع Linear",
    icon: "📐", color: "#5E6AD2", category: "مشاريع",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "lin_api_..." },
      { key: "teamId", label: "Team ID", type: "text", placeholder: "TEAM" },
    ],
  },
  {
    id: "github", name: "GitHub", desc: "إدارة المستودعات، Issues، Pull Requests وCI/CD",
    icon: "🐙", color: "#333333", category: "كود",
    fields: [
      { key: "token", label: "Personal Access Token", type: "password", placeholder: "ghp_..." },
      { key: "repo", label: "Repository", type: "text", placeholder: "owner/repo" },
    ],
  },
  {
    id: "discord", name: "Discord", desc: "إشعارات، بوتات، وتكامل مع خوادم Discord",
    icon: "🎮", color: "#5865F2", category: "تواصل",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "text", placeholder: "https://discord.com/api/webhooks/..." },
      { key: "botToken", label: "Bot Token", type: "password", placeholder: "Bot ..." },
    ],
  },
  {
    id: "airtable", name: "Airtable", desc: "قواعد بيانات مرنة مع واجهة سهلة",
    icon: "🗄️", color: "#FF6B35", category: "بيانات",
    fields: [
      { key: "apiKey", label: "API Key", type: "password", placeholder: "key..." },
      { key: "baseId", label: "Base ID", type: "text", placeholder: "app..." },
    ],
  },
  {
    id: "zapier", name: "Zapier", desc: "ربط مئات التطبيقات بأتمتة لا محدودة",
    icon: "⚡", color: "#FF4A00", category: "أتمتة",
    fields: [
      { key: "webhookUrl", label: "Webhook URL", type: "text", placeholder: "https://hooks.zapier.com/..." },
    ],
  },
];

function generateIntegrationCode(id: IntegrationId, values: Record<string, string>): string {
  switch (id) {
    case "slack":
      return `// Slack Integration
const sendToSlack = async (message: string) => {
  await fetch('${values.webhookUrl || "YOUR_WEBHOOK_URL"}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: '${values.channel || "#general"}',
      text: message,
      username: 'Agent 4 Bot',
    }),
  });
};

// Usage
await sendToSlack('🚀 Deployment successful!');`;

    case "notion":
      return `// Notion Integration
const notion = new Client({ auth: process.env.NOTION_KEY });

const createPage = async (title: string, content: string) => {
  await notion.pages.create({
    parent: { database_id: '${values.databaseId || "YOUR_DB_ID"}' },
    properties: {
      Name: { title: [{ text: { content: title } }] },
    },
    children: [{
      paragraph: { rich_text: [{ text: { content } }] }
    }],
  });
};`;

    case "bigquery":
      return `// BigQuery Integration
import { BigQuery } from '@google-cloud/bigquery';
const bq = new BigQuery({ projectId: '${values.projectId || "YOUR_PROJECT"}' });

const query = async (sql: string) => {
  const [rows] = await bq.query({ query: sql });
  return rows;
};

// Example
const results = await query(
  'SELECT * FROM \`${values.projectId || "project"}.${values.dataset || "dataset"}.table\` LIMIT 100'
);`;

    case "linear":
      return `// Linear Integration
const createIssue = async (title: string, description: string) => {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': process.env.LINEAR_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: \`mutation { issueCreate(input: {
        title: "\${title}",
        description: "\${description}",
        teamId: "${values.teamId || "YOUR_TEAM_ID"}"
      }) { success issue { id title } } }\`,
    }),
  });
  return response.json();
};`;

    default:
      return `// ${id} integration setup\n// Configure credentials in your .env file\n// Use the SDK or REST API as documented`;
  }
}

/* ─── Plasma BG ────────────────────────────────────────────────── */
function PlasmaBG() {
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
      for (let x = 0; x < W; x += 30) {
        for (let y = 0; y < H; y += 30) {
          const v = Math.sin(x * 0.03 + t) + Math.sin(y * 0.03 + t * 0.7) + Math.sin((x+y) * 0.02 + t * 1.3);
          const hue = 260 + v * 20;
          const alpha = Math.abs(v) * 0.02;
          ctx.fillStyle = `hsla(${hue},80%,60%,${alpha})`;
          ctx.fillRect(x, y, 30, 30);
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(raf); };
  }, []);
  return <canvas ref={cv} className="absolute inset-0 w-full h-full opacity-30 pointer-events-none" />;
}

export default function Agent4IntegrationsModal({ open, onOpenChange }: Props) {
  const [selected, setSelected] = useState<IntegrationId | null>(null);
  const [values, setValues] = useState<Record<string, Record<string, string>>>({});
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
  const [generatedCode, setGeneratedCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState("الكل");

  const selectedIntegration = INTEGRATIONS.find(i => i.id === selected);
  const categories = ["الكل", ...Array.from(new Set(INTEGRATIONS.map(i => i.category)))];
  const filtered = filter === "الكل" ? INTEGRATIONS : INTEGRATIONS.filter(i => i.category === filter);

  const testConnection = async (id: IntegrationId) => {
    setStatuses(prev => ({ ...prev, [id]: "testing" }));
    await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
    const ok = (values[id] && Object.values(values[id]).some(v => v.length > 5));
    setStatuses(prev => ({ ...prev, [id]: ok ? "connected" : "error" }));
  };

  const generateCode = async () => {
    if (!selected) return;
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 800));
    const code = generateIntegrationCode(selected, values[selected] ?? {});
    setGeneratedCode(code);
    setIsGenerating(false);
  };

  const handleGenerateAI = async () => {
    if (!selected) return;
    setIsGenerating(true);
    setGeneratedCode("");
    const fieldStr = Object.entries(values[selected] ?? {}).map(([k,v]) => `${k}=${v}`).join(", ");
    try {
      const res = await fetch("/api/agent4/integrate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          service: selected,
          config: fieldStr,
          language: "ar",
          mode: "turbo",
        }),
      });
      const reader = res.body!.getReader();
      const dec = new TextDecoder(); let buf = "";
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const block = buf.slice(0, idx); buf = buf.slice(idx + 2);
          for (const line of block.split("\n")) {
            if (!line.startsWith("data:")) continue;
            try { const p = JSON.parse(line.slice(5)); if (p.text) setGeneratedCode(prev => prev + p.text); } catch {}
          }
        }
      }
    } catch { setGeneratedCode(generateIntegrationCode(selected, values[selected] ?? {})); }
    setIsGenerating(false);
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
            background: "linear-gradient(135deg,#080508 0%,#0d0810 50%,#080508 100%)",
            border: "1px solid rgba(139,92,246,0.2)", borderRadius: 20,
            boxShadow: "0 0 80px rgba(139,92,246,0.08), inset 0 0 100px rgba(139,92,246,0.02)",
          }}
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 240, damping: 28 }}>
          <PlasmaBG />

          {/* Header */}
          <div className="relative flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-4">
              <motion.div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}
                animate={{ boxShadow: ["0 0 10px rgba(139,92,246,0.2)","0 0 30px rgba(139,92,246,0.4)","0 0 10px rgba(139,92,246,0.2)"] }}
                transition={{ duration: 2, repeat: Infinity }}>
                <Link2 size={22} color="#8b5cf6" />
              </motion.div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white tracking-widest">INTEGRATIONS</span>
                  <motion.span className="text-xl font-black tracking-widest"
                    style={{ color: "#8b5cf6", textShadow: "0 0 20px #8b5cf6" }}
                    animate={{ textShadow: ["0 0 10px #8b5cf688","0 0 30px #8b5cf6","0 0 10px #8b5cf688"] }}
                    transition={{ duration: 2, repeat: Infinity }}>HUB</motion.span>
                  <div className="px-2 py-0.5 rounded text-[10px] font-bold border border-purple-500/30 text-purple-400 bg-purple-500/10">
                    {INTEGRATIONS.filter(i => statuses[i.id] === "connected").length} متصل
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">Slack · Notion · BigQuery · Linear · GitHub · Discord · Airtable · Zapier</p>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="p-2 rounded-xl border border-[#2a2a2a] bg-[#111] text-slate-400 hover:text-white hover:border-red-500/50 transition-all">
              <X size={16} />
            </button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Left: Integration Grid */}
            <div className="w-72 flex-shrink-0 border-r border-[#1a1a1a] flex flex-col overflow-hidden">
              {/* Category Filter */}
              <div className="p-3 border-b border-[#1a1a1a] flex flex-wrap gap-1">
                {categories.map(c => (
                  <button key={c} onClick={() => setFilter(c)}
                    className="px-2 py-1 rounded-lg text-[10px] font-bold border transition-all"
                    style={filter === c
                      ? { borderColor: "rgba(139,92,246,0.4)", background: "rgba(139,92,246,0.15)", color: "#a78bfa" }
                      : { borderColor: "#1f1f1f", background: "transparent", color: "#555" }}>
                    {c}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filtered.map((intg, i) => {
                  const st = statuses[intg.id] ?? "idle";
                  return (
                    <motion.button key={intg.id}
                      onClick={() => { setSelected(intg.id); setGeneratedCode(""); }}
                      className="w-full text-left p-3 rounded-xl border transition-all"
                      style={selected === intg.id
                        ? { borderColor: "#8b5cf6aa", background: "rgba(139,92,246,0.1)", boxShadow: "0 0 16px rgba(139,92,246,0.15)" }
                        : { borderColor: "#1f1f1f", background: "#0d0d0d" }}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl w-8 flex-shrink-0">{intg.icon}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{intg.name}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#2a2a2a] text-slate-600">{intg.category}</span>
                          </div>
                          <div className="text-[10px] text-slate-600 truncate mt-0.5">{intg.desc.slice(0, 35)}...</div>
                        </div>
                        <div className="flex-shrink-0">
                          {st === "connected" && <CheckCircle2 size={14} color="#10b981" />}
                          {st === "testing" && <Loader2 size={14} color="#f59e0b" className="animate-spin" />}
                          {st === "error" && <AlertCircle size={14} color="#e21227" />}
                          {st === "idle" && <div className="w-2 h-2 rounded-full bg-[#333]" />}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Right: Config + Code */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedIntegration ? (
                <>
                  {/* Config Panel */}
                  <div className="flex-none border-b border-[#1a1a1a] p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl">{selectedIntegration.icon}</span>
                      <div>
                        <div className="text-lg font-black text-white">{selectedIntegration.name}</div>
                        <div className="text-xs text-slate-500">{selectedIntegration.desc}</div>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        {(() => {
                          const st = statuses[selectedIntegration.id] ?? "idle";
                          return (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold"
                              style={{
                                borderColor: st === "connected" ? "#10b98133" : st === "error" ? "#e2122733" : "#2a2a2a",
                                background: st === "connected" ? "rgba(16,185,129,0.1)" : st === "error" ? "rgba(226,18,39,0.1)" : "transparent",
                                color: st === "connected" ? "#10b981" : st === "error" ? "#e21227" : "#666",
                              }}>
                              {st === "connected" ? <><CheckCircle2 size={11} />متصل</> : st === "testing" ? <><Loader2 size={11} className="animate-spin" />جاري الاختبار...</> : st === "error" ? <><AlertCircle size={11} />خطأ</> : <><Radio size={11} />غير متصل</>}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {selectedIntegration.fields.map(field => (
                        <div key={field.key} className={field.type === "textarea" ? "col-span-2" : ""}>
                          <label className="text-[10px] text-slate-600 font-bold tracking-widest block mb-1">{field.label}</label>
                          {field.type === "textarea" ? (
                            <textarea value={values[selectedIntegration.id]?.[field.key] ?? ""} rows={3}
                              onChange={e => setValues(prev => ({ ...prev, [selectedIntegration.id]: { ...prev[selectedIntegration.id], [field.key]: e.target.value } }))}
                              placeholder={field.placeholder}
                              className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-3 py-2 text-xs text-slate-200 outline-none placeholder-slate-700 font-mono resize-none focus:border-purple-500/30" />
                          ) : (
                            <input type={field.type} value={values[selectedIntegration.id]?.[field.key] ?? ""}
                              onChange={e => setValues(prev => ({ ...prev, [selectedIntegration.id]: { ...prev[selectedIntegration.id], [field.key]: e.target.value } }))}
                              placeholder={field.placeholder}
                              className="w-full bg-[#0d0d0d] border border-[#222] rounded-xl px-3 py-2 text-xs text-slate-200 outline-none placeholder-slate-700 font-mono focus:border-purple-500/30" />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <motion.button onClick={() => testConnection(selectedIntegration.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-[#2a2a2a] text-slate-400 hover:text-white hover:border-[#333] transition-all"
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Radio size={12} />اختبار الاتصال
                      </motion.button>
                      <motion.button onClick={handleGenerateAI}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                        style={{ background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)", color: "#a78bfa" }}
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                        توليد كود AI
                      </motion.button>
                    </div>
                  </div>

                  {/* Generated Code */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a1a1a] flex-shrink-0">
                      <Code2 size={12} color="#8b5cf6" />
                      <span className="text-[11px] text-slate-500 font-bold tracking-widest">الكود</span>
                      {generatedCode && (
                        <button onClick={() => { navigator.clipboard.writeText(generatedCode); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                          className="ml-auto flex items-center gap-1 text-[10px] text-purple-400 hover:text-white">
                          {copied ? <><CheckCheck size={11} />تم</> : <><Copy size={11} />نسخ</>}
                        </button>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto p-4">
                      {generatedCode ? (
                        <pre className="text-xs text-green-300 font-mono leading-relaxed whitespace-pre-wrap">{generatedCode}
                          {isGenerating && <motion.span animate={{ opacity:[1,0] }} transition={{ duration:0.5, repeat:Infinity }} className="inline-block w-2 h-4 bg-purple-400 ml-0.5" />}
                        </pre>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                          <Link2 size={40} color="#8b5cf633" />
                          <p className="text-[11px] text-slate-700">أدخل الإعدادات واضغط "توليد كود AI"</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8">
                  <div className="grid grid-cols-4 gap-4">
                    {INTEGRATIONS.map((intg, i) => (
                      <motion.button key={intg.id}
                        onClick={() => setSelected(intg.id)}
                        className="p-4 rounded-2xl border border-[#1f1f1f] bg-[#0d0d0d] flex flex-col items-center gap-2 hover:border-purple-500/30 hover:bg-[#1a1a1a] transition-all"
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: i * 0.06, type: "spring" }}
                        whileHover={{ scale: 1.05, y: -4 }}>
                        <span className="text-3xl">{intg.icon}</span>
                        <span className="text-xs font-bold text-slate-300">{intg.name}</span>
                        <span className="text-[9px] text-slate-600 text-center">{intg.category}</span>
                        <div className="w-2 h-2 rounded-full" style={{ background: statuses[intg.id] === "connected" ? "#10b981" : "#333" }} />
                      </motion.button>
                    ))}
                  </div>
                  <p className="text-slate-600 text-sm">اختر تكاملاً للبدء</p>
                </div>
              )}
            </div>
          </div>

          <div className="relative flex items-center justify-between px-5 py-2 border-t border-[#1a1a1a] flex-shrink-0">
            <div className="flex items-center gap-3 text-[10px]">
              {[{ c:"#8b5cf6",l:"8 خدمات" },{ c:"#10b981",l:`${Object.values(statuses).filter(s=>s==="connected").length} متصل` },{ c:"#f59e0b",l:"كود AI" }].map((t,i) => (
                <motion.span key={i} style={{ color:t.c }} animate={{ opacity:[0.5,1,0.5] }} transition={{ duration:2,repeat:Infinity,delay:i*0.4 }}>● {t.l}</motion.span>
              ))}
            </div>
            <motion.div className="text-[10px] text-slate-700" animate={{ opacity:[0.4,0.8,0.4] }} transition={{ duration:3,repeat:Infinity }}>
              AGENT 4 · INTEGRATIONS HUB · LIVE
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
