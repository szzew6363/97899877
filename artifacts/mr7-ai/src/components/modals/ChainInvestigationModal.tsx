import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  X, Plus, Trash2, Link2, Loader2, Download,
  Target, Globe, Network, Shield, User, Server, AlertTriangle,
  Eye, RefreshCw, Copy, Check, GitBranch,
  MapPin, Activity, Wifi, FileWarning, Scan, Radio, BarChart2, ChevronRight
} from "lucide-react";
import { FullPageOverlay } from "@/components/FullPageOverlay";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type NodeType = "ip" | "domain" | "person" | "org" | "malware" | "vuln" | "tool" | "event";
type RiskLevel = "low" | "medium" | "high" | "critical";

interface ThreatIntel {
  loading?: boolean;
  geoCountry?: string;
  geoCity?: string;
  isp?: string;
  asnumber?: string;
  reputationScore?: number;
  openPorts?: string[];
  cves?: { id: string; cvss: number; desc: string }[];
  malwareFamily?: string;
  lastSeen?: string;
  indicators?: string[];
  summary?: string;
}

interface ChainNode {
  id: string;
  type: NodeType;
  label: string;
  value: string;
  notes?: string;
  risk?: RiskLevel;
  intel?: ThreatIntel;
  x?: number;
  y?: number;
}

interface ChainLink {
  from: string;
  to: string;
  relation: string;
  strength: "weak" | "medium" | "strong";
}

interface AnalysisResult {
  summary: string;
  riskScore: number;
}

const NODE_TYPES: { id: NodeType; label: string; icon: React.ReactNode; color: string; glyph: string }[] = [
  { id: "ip",      label: "عنوان IP",      icon: <Server size={13} />,        color: "#e21227", glyph: "IP"  },
  { id: "domain",  label: "نطاق",          icon: <Globe size={13} />,         color: "#3b82f6", glyph: "DO" },
  { id: "person",  label: "شخص",           icon: <User size={13} />,          color: "#10b981", glyph: "PE" },
  { id: "org",     label: "مؤسسة",         icon: <Network size={13} />,       color: "#fbbf24", glyph: "OR" },
  { id: "malware", label: "برمجية خبيثة",  icon: <AlertTriangle size={13} />, color: "#ef4444", glyph: "MW" },
  { id: "vuln",    label: "ثغرة",          icon: <Shield size={13} />,        color: "#8b5cf6", glyph: "VN" },
  { id: "tool",    label: "أداة",          icon: <Target size={13} />,        color: "#06b6d4", glyph: "TL" },
  { id: "event",   label: "حدث",           icon: <Eye size={13} />,           color: "#f97316", glyph: "EV" },
];

const RISK_CONFIG: Record<RiskLevel, { color: string; label: string; glow: string }> = {
  low:      { color: "#10b981", label: "منخفض",  glow: "rgba(16,185,129,0.25)"  },
  medium:   { color: "#fbbf24", label: "متوسط",  glow: "rgba(251,191,36,0.25)"  },
  high:     { color: "#f97316", label: "عالي",   glow: "rgba(249,115,22,0.25)"  },
  critical: { color: "#e21227", label: "حرج",    glow: "rgba(226,18,39,0.30)"   },
};

const STRENGTH_CONFIG = {
  weak:   { dash: "5 5",  opacity: 0.35, width: 1   },
  medium: { dash: "none", opacity: 0.6,  width: 1.5 },
  strong: { dash: "none", opacity: 0.9,  width: 2.5 },
};

function genId() { return Math.random().toString(36).slice(2, 9); }
function getNodeCfg(t: NodeType) { return NODE_TYPES.find((n) => n.id === t) ?? NODE_TYPES[0]; }

function autoLayout(nodes: ChainNode[]): ChainNode[] {
  const cx = 400; const cy = 270;
  const r = Math.max(80, Math.min(200, 50 + nodes.length * 22));
  return nodes.map((n, i) => {
    if (n.x !== undefined) return n;
    const a = (i / nodes.length) * Math.PI * 2 - Math.PI / 2;
    return { ...n, x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}

// Sweeping scan line for 3D canvas
function ScanLine() {
  return (
    <motion.div
      className="absolute inset-x-0 h-[2px] pointer-events-none z-20"
      style={{ background: "linear-gradient(90deg,transparent 0%,rgba(226,18,39,0.5) 25%,rgba(255,80,80,0.7) 50%,rgba(226,18,39,0.5) 75%,transparent 100%)" }}
      initial={{ top: "-2px" }}
      animate={{ top: "100%" }}
      transition={{ duration: 5, ease: "linear", repeat: Infinity }}
    />
  );
}

// Animated dot that travels along an SVG path
function TravelDot({ path, color, dur }: { path: string; color: string; dur: number }) {
  return (
    <motion.circle r={2.5} fill={color} opacity={0.85}>
      <animateMotion dur={`${dur}s`} repeatCount="indefinite" path={path} />
    </motion.circle>
  );
}

export function ChainInvestigationModal({ open, onOpenChange }: Props) {
  const { toast } = useToast();

  const [nodes, setNodes]           = useState<ChainNode[]>([]);
  const [links, setLinks]           = useState<ChainLink[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkFromId, setLinkFromId] = useState<string | null>(null);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);

  const [newType,     setNewType]     = useState<NodeType>("ip");
  const [newLabel,    setNewLabel]    = useState("");
  const [newValue,    setNewValue]    = useState("");
  const [newRisk,     setNewRisk]     = useState<RiskLevel>("low");
  const [linkRelation, setLinkRelation] = useState("connects_to");
  const [linkStrength, setLinkStrength] = useState<"weak" | "medium" | "strong">("medium");

  const [analysis,     setAnalysis]     = useState<AnalysisResult | null>(null);
  const [isAnalyzing,  setIsAnalyzing]  = useState(false);
  const [isEnriching,  setIsEnriching]  = useState(false);
  const [activeTab,    setActiveTab]    = useState<"intel" | "analysis" | "links">("intel");
  const [copied,       setCopied]       = useState(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // 3-D parallax tilt driven by mouse position
  const mX = useMotionValue(0);
  const mY = useMotionValue(0);
  const rotX = useSpring(useTransform(mY, [-250, 250], [7, -7]),  { stiffness: 90, damping: 28 });
  const rotY = useSpring(useTransform(mX, [-350, 350], [-9, 9]),  { stiffness: 90, damping: 28 });

  const selected  = nodes.find((n) => n.id === selectedId) ?? null;
  const layouted  = autoLayout(nodes);
  const totalRisk = nodes.length === 0 ? 0
    : Math.round(nodes.reduce((s, n) => s + (n.risk === "critical" ? 88 : n.risk === "high" ? 68 : n.risk === "medium" ? 42 : 18), 0) / nodes.length);

  // ── canvas mouse handlers ──────────────────────────────
  function handleCanvasMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mX.set(e.clientX - r.left - r.width / 2);
    mY.set(e.clientY - r.top  - r.height / 2);
    if (!dragNodeId || !svgRef.current) return;
    const sr = svgRef.current.getBoundingClientRect();
    const x = Math.max(28, Math.min(772, e.clientX - sr.left));
    const y = Math.max(28, Math.min(522, e.clientY - sr.top));
    setNodes((prev) => prev.map((n) => n.id === dragNodeId ? { ...n, x, y } : n));
  }
  function handleCanvasMouseLeave() { mX.set(0); mY.set(0); setDragNodeId(null); }

  // ── svg click / drag ──────────────────────────────────
  function onSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const r = svgRef.current.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const hit = layouted.find((n) => {
      const dx = (n.x ?? 0) - px; const dy = (n.y ?? 0) - py;
      return Math.sqrt(dx * dx + dy * dy) < 22;
    });
    if (!hit) { setSelectedId(null); return; }
    if (linkFromId && linkFromId !== hit.id) {
      finishLink(hit.id);
    } else {
      setDragNodeId(hit.id);
      setSelectedId(hit.id);
      setActiveTab("intel");
    }
  }
  function onSvgMouseUp() { setDragNodeId(null); }

  // ── node CRUD ─────────────────────────────────────────
  function addNode() {
    if (!newLabel.trim()) return;
    const id = genId();
    setNodes((prev) => autoLayout([...prev, { id, type: newType, label: newLabel.trim(), value: newValue.trim(), risk: newRisk }]));
    setNewLabel(""); setNewValue("");
    setSelectedId(id);
  }
  function deleteNode(id: string) {
    setNodes((p) => p.filter((n) => n.id !== id));
    setLinks((p) => p.filter((l) => l.from !== id && l.to !== id));
    if (selectedId === id) setSelectedId(null);
  }

  // ── link CRUD ─────────────────────────────────────────
  function startLink(id: string) { setLinkFromId(id); toast({ description: "انقر على العقدة الوجهة لإنشاء الاتصال" }); }
  function finishLink(toId: string) {
    if (!linkFromId || linkFromId === toId) { setLinkFromId(null); return; }
    if (links.some((l) => (l.from === linkFromId && l.to === toId) || (l.from === toId && l.to === linkFromId))) {
      toast({ description: "الاتصال موجود بالفعل" }); setLinkFromId(null); return;
    }
    setLinks((p) => [...p, { from: linkFromId, to: toId, relation: linkRelation, strength: linkStrength }]);
    setLinkFromId(null);
  }
  function deleteLink(i: number) { setLinks((p) => p.filter((_, j) => j !== i)); }

  // ── threat intel enrichment ───────────────────────────
  const enrichNode = useCallback(async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setIsEnriching(true);
    setNodes((p) => p.map((n) => n.id === nodeId ? { ...n, intel: { loading: true } } : n));

    const prompt = `أنت محلل أمن سيبراني. قدّم تقرير استخباراتي لهذه القيمة بصيغة JSON فقط داخل code block:

النوع: ${getNodeCfg(node.type).label}
القيمة: ${node.value || node.label}

أعد JSON بالمفاتيح التالية:
{
  "geoCountry": "...",
  "geoCity": "...",
  "isp": "...",
  "asnumber": "...",
  "reputationScore": (رقم 0-100 يمثل مستوى الخطر),
  "openPorts": ["80","443","..."],
  "cves": [{"id":"CVE-XXXX-XXXX","cvss":7.5,"desc":"وصف قصير"}],
  "malwareFamily": "...",
  "lastSeen": "...",
  "indicators": ["مؤشر 1","مؤشر 2","مؤشر 3"],
  "summary": "ملخص تقييم شامل في جملتين"
}

أعد JSON فقط داخل \`\`\`json ... \`\`\``;

    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "CHAT-GPT Researcher", messages: [{ role: "user", content: prompt }], mode: "chat", language: "ar" }),
      });
      if (!res.ok || !res.body) throw new Error("فشل");
      const reader = res.body.getReader(); const dec = new TextDecoder();
      let buf = ""; let full = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n"); buf = parts.pop() ?? "";
        for (const line of parts) {
          if (!line.startsWith("data: ")) continue;
          try { const j = JSON.parse(line.slice(6).trim()); if (j.content) full += j.content; } catch { /**/ }
        }
      }
      const m = full.match(/```json\s*([\s\S]*?)```/);
      let parsed: ThreatIntel = {};
      if (m) { try { parsed = JSON.parse(m[1]); } catch { /**/ } }
      const score = typeof parsed.reputationScore === "number" ? parsed.reputationScore : 40;
      setNodes((p) => p.map((n) => n.id === nodeId ? {
        ...n,
        intel: { ...parsed, loading: false },
        risk: score >= 75 ? "critical" : score >= 55 ? "high" : score >= 30 ? "medium" : "low",
      } : n));
    } catch {
      setNodes((p) => p.map((n) => n.id === nodeId ? { ...n, intel: { loading: false, summary: "فشل جلب بيانات الاستخبارات" } } : n));
      toast({ description: "فشل التحليل الاستخباراتي", variant: "destructive" });
    }
    setIsEnriching(false);
  }, [nodes, toast]);

  // ── full-chain AI analysis ────────────────────────────
  const runAnalysis = useCallback(async () => {
    if (nodes.length < 2) return;
    setIsAnalyzing(true); setAnalysis(null);
    const nodeLines  = nodes.map((n) => `- [${getNodeCfg(n.type).label}] ${n.label}: ${n.value || "—"} | خطر: ${RISK_CONFIG[n.risk ?? "low"].label}${n.intel?.summary ? ` | ${n.intel.summary.slice(0, 80)}` : ""}`).join("\n");
    const linkLines  = links.map((l) => { const f = nodes.find((n) => n.id === l.from); const t = nodes.find((n) => n.id === l.to); return `- ${f?.label} → [${l.relation}] → ${t?.label}`; }).join("\n");
    const prompt = `أنت محلل أمن سيبراني استراتيجي. حلّل هذه الشبكة الاستخباراتية كاملة:

العقد:\n${nodeLines}

الاتصالات:\n${linkLines || "لا توجد"}

قدّم تقرير شامل يشمل:
1. ملخص الشبكة وما تمثله
2. الأنماط الخطيرة المكتشفة (3-5)
3. مسار الهجوم المحتمل
4. التوصيات الفورية (5 خطوات)
5. درجة خطر الشبكة الكلية من 0-100

أسلوب: مباشر، تقني، قابل للتنفيذ.`;
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "CHAT-GPT Researcher", messages: [{ role: "user", content: prompt }], mode: "chat", language: "ar" }),
      });
      if (!res.ok || !res.body) throw new Error("فشل");
      const reader = res.body.getReader(); const dec = new TextDecoder();
      let buf = ""; let full = "";
      while (true) {
        const { value, done } = await reader.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n"); buf = parts.pop() ?? "";
        for (const line of parts) {
          if (!line.startsWith("data: ")) continue;
          try { const j = JSON.parse(line.slice(6).trim()); if (j.content) full += j.content; } catch { /**/ }
        }
      }
      const sm = full.match(/\b(\d{2,3})\s*(?:\/100|%)/); const score = sm ? Math.min(100, parseInt(sm[1])) : 60;
      setAnalysis({ summary: full, riskScore: score });
      setActiveTab("analysis");
    } catch { toast({ description: "فشل التحليل", variant: "destructive" }); }
    setIsAnalyzing(false);
  }, [nodes, links, toast]);

  // ── export MD ─────────────────────────────────────────
  function exportReport() {
    const lines = [
      "# تقرير تحقيق السلسلة",
      `التاريخ: ${new Date().toLocaleDateString("ar-SA")}`,
      "",
      `## العقد (${nodes.length})`,
      ...nodes.map((n) => [`### ${n.label} [${getNodeCfg(n.type).label}]`, `القيمة: ${n.value || "—"}`, `الخطر: ${RISK_CONFIG[n.risk ?? "low"].label}`, n.intel?.summary ? `الاستخبارات: ${n.intel.summary}` : ""].filter(Boolean).join("\n")),
      "", `## الاتصالات (${links.length})`,
      ...links.map((l) => { const f = nodes.find((n) => n.id === l.from); const t = nodes.find((n) => n.id === l.to); return `- ${f?.label} → [${l.relation}] → ${t?.label} (${l.strength})`; }),
      analysis ? `\n## التحليل الشامل\n${analysis.summary}` : "",
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "chain-investigation.md"; a.click();
  }

  // ── export JSON ───────────────────────────────────────
  function exportJSON() {
    const data = {
      exported: new Date().toISOString(),
      title: "Chain Investigation Report",
      stats: { totalNodes: nodes.length, totalLinks: links.length, overallRisk: totalRisk },
      nodes: nodes.map((n) => ({
        id: n.id, type: n.type, label: n.label, value: n.value || null,
        notes: n.notes || null, risk: n.risk ?? "low",
        position: n.x !== undefined ? { x: n.x, y: n.y } : null,
        threatIntel: n.intel && !n.intel.loading ? {
          geoCountry: n.intel.geoCountry, geoCity: n.intel.geoCity,
          isp: n.intel.isp, asnumber: n.intel.asnumber,
          reputationScore: n.intel.reputationScore,
          openPorts: n.intel.openPorts ?? [],
          cves: n.intel.cves ?? [],
          malwareFamily: n.intel.malwareFamily,
          lastSeen: n.intel.lastSeen,
          indicators: n.intel.indicators ?? [],
          summary: n.intel.summary,
        } : null,
      })),
      connections: links.map((l) => {
        const f = nodes.find((n) => n.id === l.from);
        const t = nodes.find((n) => n.id === l.to);
        return { fromId: l.from, toId: l.to, fromLabel: f?.label ?? "?", toLabel: t?.label ?? "?", relation: l.relation, strength: l.strength };
      }),
      aiAnalysis: analysis ? { riskScore: analysis.riskScore, summary: analysis.summary } : null,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `chain-investigation-${Date.now()}.json`; a.click();
  }

  // ── export PDF ────────────────────────────────────────
  function exportPDF() {
    const riskColor = (r: RiskLevel | undefined) => RISK_CONFIG[r ?? "low"].color;
    const nodesHTML = nodes.map((n) => {
      const cfg = getNodeCfg(n.type);
      const intel = n.intel && !n.intel.loading;
      return `<div class="node-card">
        <div class="node-header" style="border-left:3px solid ${riskColor(n.risk)}">
          <span class="node-type" style="color:${cfg.color}">[${cfg.label}]</span>
          <span class="node-label">${n.label}</span>
          <span class="node-risk" style="color:${riskColor(n.risk)}">${RISK_CONFIG[n.risk ?? "low"].label}</span>
        </div>
        ${n.value ? `<div class="node-value">${n.value}</div>` : ""}
        ${n.notes ? `<div class="node-notes">${n.notes}</div>` : ""}
        ${intel ? `<div class="intel-block">
          ${n.intel!.geoCountry ? `<span class="intel-tag">📍 ${n.intel!.geoCountry}${n.intel!.geoCity ? ", " + n.intel!.geoCity : ""}</span>` : ""}
          ${n.intel!.reputationScore !== undefined ? `<span class="intel-tag" style="color:${riskColor(n.risk)}">Score: ${n.intel!.reputationScore}/100</span>` : ""}
          ${n.intel!.summary ? `<p class="intel-summary">${n.intel!.summary}</p>` : ""}
        </div>` : ""}
      </div>`;
    }).join("");
    const linksHTML = links.map((l) => {
      const f = nodes.find((n) => n.id === l.from);
      const t = nodes.find((n) => n.id === l.to);
      return `<div class="link-row">
        <span class="link-from">${f?.label ?? "؟"}</span>
        <span class="link-arrow">→</span>
        <span class="link-rel">[${l.relation}]</span>
        <span class="link-arrow">→</span>
        <span class="link-to">${t?.label ?? "؟"}</span>
        <span class="link-strength">(${l.strength})</span>
      </div>`;
    }).join("");
    const analysisHTML = analysis ? `<div class="analysis-block">
      <div class="analysis-score" style="color:${totalRisk >= 65 ? "#e21227" : totalRisk >= 35 ? "#f59e0b" : "#10b981"}">
        درجة الخطر: ${analysis.riskScore}/100
      </div>
      <pre class="analysis-text">${analysis.summary}</pre>
    </div>` : "<p class='no-analysis'>لم يتم التحليل بعد</p>";

    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>تقرير تحقيق السلسلة — ${new Date().toLocaleDateString("ar-SA")}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #111; padding: 32px; max-width: 900px; margin: 0 auto; }
  h1 { font-size: 22px; color: #e21227; border-bottom: 2px solid #e21227; padding-bottom: 8px; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #888; margin-bottom: 24px; }
  .stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat { background: #f5f5f5; border-radius: 8px; padding: 10px 18px; text-align: center; }
  .stat-val { font-size: 22px; font-weight: 900; }
  .stat-lab { font-size: 10px; color: #888; text-transform: uppercase; }
  h2 { font-size: 15px; color: #333; margin: 24px 0 10px; border-right: 3px solid #e21227; padding-right: 8px; }
  .node-card { background: #fafafa; border: 1px solid #e5e5e5; border-radius: 8px; margin-bottom: 10px; padding: 12px; }
  .node-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
  .node-type { font-size: 11px; font-weight: 700; }
  .node-label { font-size: 13px; font-weight: 800; flex: 1; }
  .node-risk { font-size: 11px; font-weight: 700; }
  .node-value { font-size: 11px; color: #555; margin-bottom: 4px; font-family: monospace; }
  .node-notes { font-size: 11px; color: #777; font-style: italic; }
  .intel-block { background: #f0f0f0; border-radius: 6px; padding: 8px; margin-top: 8px; }
  .intel-tag { display: inline-block; font-size: 10px; background: #e0e0e0; border-radius: 4px; padding: 2px 6px; margin: 2px; }
  .intel-summary { font-size: 11px; color: #555; margin-top: 6px; line-height: 1.5; }
  .link-row { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: #f8f8f8; border-radius: 6px; margin-bottom: 6px; font-size: 12px; }
  .link-from, .link-to { font-weight: 700; }
  .link-arrow { color: #aaa; }
  .link-rel { color: #3b82f6; font-style: italic; }
  .link-strength { color: #888; font-size: 10px; }
  .analysis-block { background: #fffbf0; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; }
  .analysis-score { font-size: 18px; font-weight: 900; margin-bottom: 10px; }
  .analysis-text { font-size: 12px; white-space: pre-wrap; line-height: 1.7; color: #333; }
  .no-analysis { color: #aaa; font-style: italic; font-size: 12px; }
  @media print { body { padding: 16px; } }
</style></head><body>
<h1>تقرير تحقيق السلسلة</h1>
<div class="meta">التاريخ: ${new Date().toLocaleDateString("ar-SA")} · الوقت: ${new Date().toLocaleTimeString("ar-SA")} · منشئ: KaliGPT / CHAIN INVESTIGATION</div>
<div class="stats">
  <div class="stat"><div class="stat-val" style="color:#e21227">${nodes.length}</div><div class="stat-lab">عقد</div></div>
  <div class="stat"><div class="stat-val" style="color:#3b82f6">${links.length}</div><div class="stat-lab">اتصالات</div></div>
  <div class="stat"><div class="stat-val" style="color:${totalRisk >= 65 ? "#e21227" : totalRisk >= 35 ? "#f59e0b" : "#10b981"}">${totalRisk}%</div><div class="stat-lab">خطر</div></div>
</div>
<h2>العقد (${nodes.length})</h2>${nodesHTML || "<p style='color:#aaa;font-size:12px'>لا توجد عقد</p>"}
<h2>الاتصالات (${links.length})</h2>${linksHTML || "<p style='color:#aaa;font-size:12px'>لا توجد اتصالات</p>"}
<h2>التحليل الشامل بالذكاء الاصطناعي</h2>${analysisHTML}
</body></html>`;

    const win = window.open("", "_blank", "width=900,height=1100,scrollbars=yes");
    if (!win) { toast({ description: "يُرجى السماح بالنوافذ المنبثقة لتصدير PDF" }); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 600);
  }

  function copyNodes() {
    void navigator.clipboard.writeText(nodes.map((n) => `[${getNodeCfg(n.type).label}] ${n.label}: ${n.value || ""}`).join("\n"));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }

  return (
    <FullPageOverlay open={open} onClose={() => onOpenChange(false)}>
      <div className="flex flex-col h-full w-full select-none">

        {/* ══ TOP BAR ══════════════════════════════════════ */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#1f1f1f] bg-[#090909] shrink-0 z-10">
          <motion.div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg,#e21227,#ff4444)" }}
            animate={{ boxShadow: ["0 0 12px #e2122740","0 0 28px #e2122775","0 0 12px #e2122740"] }}
            transition={{ repeat: Infinity, duration: 2.2 }}>
            <GitBranch size={18} className="text-white" />
          </motion.div>
          <div>
            <h2 className="text-sm font-bold text-white tracking-widest font-mono">CHAIN INVESTIGATION</h2>
            <p className="text-[10px] text-[#3a3a3a] font-mono">3D Threat Intelligence Graph · AI-Powered</p>
          </div>

          {/* stat pills */}
          <div className="flex items-center gap-2 ml-4">
            {[
              { l: "عقد",    v: nodes.length, c: "#e21227" },
              { l: "اتصال",  v: links.length, c: "#3b82f6" },
              { l: "خطر",    v: `${totalRisk}%`, c: totalRisk >= 65 ? "#e21227" : totalRisk >= 35 ? "#fbbf24" : "#10b981" },
            ].map((s) => (
              <div key={s.l} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111] border border-[#1f1f1f]">
                <span className="text-[9px] text-[#3a3a3a] font-mono">{s.l}</span>
                <span className="text-[12px] font-bold font-mono" style={{ color: s.c }}>{s.v}</span>
              </div>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {linkFromId && (
              <motion.div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-950/60 border border-blue-700 text-blue-300 text-[10px] font-mono"
                animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 1 }}>
                <Radio size={10} className="animate-pulse" /> انقر على الوجهة للربط
                <button onClick={() => setLinkFromId(null)} className="hover:text-white ml-1"><X size={10} /></button>
              </motion.div>
            )}
            <button onClick={runAnalysis} disabled={nodes.length < 2 || isAnalyzing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all disabled:opacity-30 font-mono"
              style={{ borderColor: "#e2122760", color: "#e21227", background: "#e2122712" }}>
              {isAnalyzing ? <Loader2 size={11} className="animate-spin" /> : <BarChart2 size={11} />}
              تحليل شامل
            </button>
            <button onClick={copyNodes} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#151515] border border-[#252525] text-[#666] hover:text-white transition-all">
              {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
            </button>
            <button onClick={exportJSON} disabled={nodes.length === 0}
              title="تصدير JSON — العقد والاتصالات والذكاء الاصطناعي"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all disabled:opacity-30 font-mono"
              style={{ background: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.3)", color: "#3b82f6" }}>
              <Download size={11} />
              <span>JSON</span>
            </button>
            <button onClick={exportPDF} disabled={nodes.length === 0}
              title="تصدير PDF — تقرير مطبوع كامل"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] border transition-all disabled:opacity-30 font-mono"
              style={{ background: "rgba(226,18,39,0.08)", borderColor: "rgba(226,18,39,0.3)", color: "#e21227" }}>
              <Download size={11} />
              <span>PDF</span>
            </button>
            <button onClick={exportReport} disabled={nodes.length === 0}
              title="تصدير Markdown"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] bg-[#151515] border border-[#252525] text-[#666] hover:text-white transition-all disabled:opacity-30">
              <Download size={11} />
              <span className="text-[10px]">MD</span>
            </button>
            <button onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#151515] border border-[#1f1f1f] text-[#555] hover:text-white hover:border-[#e21227] transition-all">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* ══ MAIN BODY ══════════════════════════════════== */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Node manager ──────────────────── */}
          <div className="w-72 shrink-0 border-r border-[#181818] bg-[#080808] flex flex-col overflow-hidden">
            {/* Add form */}
            <div className="p-4 border-b border-[#161616] shrink-0">
              <p className="text-[9px] text-[#383838] font-mono uppercase tracking-widest mb-2.5">إضافة عقدة</p>
              {/* type picker */}
              <div className="flex flex-wrap gap-1 mb-2.5">
                {NODE_TYPES.map((t) => (
                  <button key={t.id} onClick={() => setNewType(t.id)}
                    className="flex items-center gap-1 px-1.5 py-1 rounded text-[10px] border transition-all font-mono"
                    style={newType === t.id
                      ? { borderColor: t.color, color: t.color, backgroundColor: t.color + "18" }
                      : { borderColor: "#1a1a1a", color: "#3a3a3a", backgroundColor: "#0c0c0c" }}>
                    <span style={{ color: newType === t.id ? t.color : "#2a2a2a" }}>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                placeholder="الاسم / التسمية *"
                className="w-full px-3 py-2 mb-1.5 bg-[#0d0d0d] border border-[#1d1d1d] rounded-lg text-[11px] text-white placeholder:text-[#2a2a2a] focus:outline-none focus:border-[#e21227] font-mono" />
              <input value={newValue} onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNode()}
                placeholder="القيمة (IP / URL / CVE...)"
                className="w-full px-3 py-2 mb-2 bg-[#0d0d0d] border border-[#1d1d1d] rounded-lg text-[11px] text-white placeholder:text-[#2a2a2a] focus:outline-none focus:border-[#e21227] font-mono" />
              <div className="flex gap-1 mb-2.5">
                {(["low","medium","high","critical"] as RiskLevel[]).map((r) => (
                  <button key={r} onClick={() => setNewRisk(r)}
                    className="flex-1 py-1.5 rounded text-[9px] font-mono border transition-all"
                    style={newRisk === r
                      ? { borderColor: RISK_CONFIG[r].color, color: RISK_CONFIG[r].color, backgroundColor: RISK_CONFIG[r].color + "22" }
                      : { borderColor: "#181818", color: "#2e2e2e", backgroundColor: "#090909" }}>
                    {RISK_CONFIG[r].label}
                  </button>
                ))}
              </div>
              <button onClick={addNode} disabled={!newLabel.trim()}
                className="w-full py-2 rounded-lg text-[11px] font-bold font-mono uppercase tracking-wide transition-all disabled:opacity-25 flex items-center justify-center gap-1.5"
                style={{ background: newLabel.trim() ? "linear-gradient(135deg,#e21227,#8b0000)" : "#111", color: "#fff" }}>
                <Plus size={11} /> إضافة عقدة
              </button>
            </div>

            {/* Link settings */}
            <div className="px-4 py-3 border-b border-[#161616] shrink-0">
              <p className="text-[9px] text-[#383838] font-mono uppercase tracking-widest mb-2">إعدادات الربط</p>
              <input value={linkRelation} onChange={(e) => setLinkRelation(e.target.value)}
                placeholder="نوع العلاقة"
                className="w-full px-3 py-1.5 mb-2 bg-[#0d0d0d] border border-[#1d1d1d] rounded-lg text-[10px] text-white placeholder:text-[#2a2a2a] focus:outline-none focus:border-[#3b82f6] font-mono" />
              <div className="flex gap-1">
                {(["weak","medium","strong"] as const).map((s) => (
                  <button key={s} onClick={() => setLinkStrength(s)}
                    className="flex-1 py-1.5 rounded text-[9px] font-mono border transition-all"
                    style={linkStrength === s
                      ? { borderColor: "#3b82f6", color: "#3b82f6", backgroundColor: "#3b82f618" }
                      : { borderColor: "#181818", color: "#2e2e2e" }}>
                    {s === "weak" ? "ضعيف" : s === "medium" ? "متوسط" : "قوي"}
                  </button>
                ))}
              </div>
            </div>

            {/* Node list */}
            <div className="flex-1 overflow-y-auto p-2">
              <AnimatePresence>
                {nodes.map((node) => {
                  const cfg = getNodeCfg(node.type);
                  const rc  = RISK_CONFIG[node.risk ?? "low"];
                  const sel = selectedId === node.id;
                  return (
                    <motion.div key={node.id}
                      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                      onClick={() => { setSelectedId(sel ? null : node.id); if (!sel) setActiveTab("intel"); }}
                      className="flex items-center gap-2 p-2.5 rounded-xl cursor-pointer mb-1 border transition-all"
                      style={{ borderColor: sel ? cfg.color : "#181818", backgroundColor: sel ? cfg.color + "12" : "#0c0c0c" }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: cfg.color + "22", color: cfg.color }}>{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-white truncate font-mono">{node.label}</p>
                        <p className="text-[9px] text-[#343434] truncate font-mono">{node.value || "—"}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: rc.color, boxShadow: `0 0 4px ${rc.color}` }} />
                        {node.intel && !node.intel.loading && <div className="w-2 h-2 rounded-full bg-emerald-500" style={{ boxShadow: "0 0 4px #10b981" }} />}
                        {node.intel?.loading && <Loader2 size={8} className="animate-spin text-[#e21227]" />}
                        <button onClick={(e) => { e.stopPropagation(); startLink(node.id); }}
                          className="w-5 h-5 rounded flex items-center justify-center text-[#383838] hover:text-blue-400 transition-colors" title="ربط">
                          <Link2 size={9} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); void enrichNode(node.id); }}
                          className="w-5 h-5 rounded flex items-center justify-center text-[#383838] hover:text-[#e21227] transition-colors" title="تحليل استخباراتي">
                          <Scan size={9} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                          className="w-5 h-5 rounded flex items-center justify-center text-[#383838] hover:text-red-400 transition-colors">
                          <Trash2 size={9} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {nodes.length === 0 && (
                <div className="flex flex-col items-center justify-center h-28 text-center gap-2">
                  <Network size={20} className="text-[#1e1e1e]" />
                  <p className="text-[10px] text-[#2a2a2a] font-mono">لا توجد عقد — أضف عقدة أعلاه</p>
                </div>
              )}
            </div>
          </div>

          {/* ── CENTER: 3D Graph Canvas ──────────────── */}
          <div
            className="flex-1 relative overflow-hidden"
            style={{ background: "radial-gradient(ellipse at 50% 38%,#0d0d16 0%,#06060a 55%,#030304 100%)" }}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            onMouseUp={onSvgMouseUp}
          >
            {/* dot grid */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.055 }}>
              <defs>
                <pattern id="cig" width="44" height="44" patternUnits="userSpaceOnUse">
                  <path d="M44 0H0V44" fill="none" stroke="#e21227" strokeWidth="0.5" />
                </pattern>
                <pattern id="ciG" width="220" height="220" patternUnits="userSpaceOnUse">
                  <rect width="220" height="220" fill="url(#cig)" />
                  <path d="M220 0H0V220" fill="none" stroke="#e21227" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ciG)" />
            </svg>

            {/* corner ambient glows */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-0 w-72 h-72" style={{ background: "radial-gradient(circle,rgba(226,18,39,0.055) 0%,transparent 70%)" }} />
              <div className="absolute bottom-0 right-0 w-96 h-96" style={{ background: "radial-gradient(circle,rgba(59,130,246,0.045) 0%,transparent 70%)" }} />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full" style={{ background: "radial-gradient(circle,rgba(226,18,39,0.02) 0%,transparent 65%)" }} />
            </div>

            {/* scan line */}
            <ScanLine />

            {/* empty-state */}
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
                <motion.div className="relative w-28 h-28 flex items-center justify-center">
                  <motion.div className="absolute w-28 h-28 rounded-full border border-[#e21227]/20"
                    animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }} transition={{ repeat: Infinity, duration: 3 }} />
                  <motion.div className="absolute w-20 h-20 rounded-full border border-[#e21227]/30"
                    animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0, 0.4] }} transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }} />
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg,#1a0a0d,#2a1015)", border: "1px solid rgba(226,18,39,0.25)" }}>
                    <GitBranch size={32} style={{ color: "rgba(226,18,39,0.5)" }} />
                  </div>
                </motion.div>
                <div className="text-center">
                  <p className="text-[#282828] text-sm font-mono">لا توجد عقد في الرسم البياني</p>
                  <p className="text-[#1e1e1e] text-[10px] font-mono mt-1">أضف عقدة من اللوحة اليسرى لبدء التحقيق</p>
                </div>
              </div>
            )}

            {/* 3D perspective scene */}
            {nodes.length > 0 && (
              <div className="absolute inset-0" style={{ perspective: "1500px", perspectiveOrigin: "50% 40%" }}>
                <motion.svg
                  ref={svgRef}
                  className="w-full h-full"
                  style={{
                    transformStyle: "preserve-3d",
                    rotateX: rotX, rotateY: rotY,
                    cursor: dragNodeId ? "grabbing" : linkFromId ? "crosshair" : "grab",
                  }}
                  onMouseDown={onSvgMouseDown}
                  onMouseUp={onSvgMouseUp}
                >
                  <defs>
                    <filter id="ci-glow">
                      <feGaussianBlur stdDeviation="3.5" result="b" />
                      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <filter id="ci-glow-soft">
                      <feGaussianBlur stdDeviation="6" result="b" />
                      <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <marker id="ci-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                      <path d="M0,0 L8,3 L0,6 Z" fill="rgba(59,130,246,0.7)" />
                    </marker>
                  </defs>

                  {/* ── connection lines ── */}
                  {links.map((lnk, idx) => {
                    const f = layouted.find((n) => n.id === lnk.from);
                    const t = layouted.find((n) => n.id === lnk.to);
                    if (!f?.x || !t?.x) return null;
                    const scfg = STRENGTH_CONFIG[lnk.strength];
                    const mx = (f.x + t.x) / 2;
                    const my = ((f.y ?? 0) + (t.y ?? 0)) / 2 - 35;
                    const pathD = `M${f.x},${f.y} Q${mx},${my} ${t.x},${t.y}`;
                    return (
                      <g key={idx} filter="url(#ci-glow)">
                        <path d={pathD} fill="none"
                          stroke="#3b82f6" strokeWidth={scfg.width}
                          strokeOpacity={scfg.opacity}
                          strokeDasharray={scfg.dash}
                          markerEnd="url(#ci-arrow)" />
                        <text x={mx} y={my - 5} textAnchor="middle" fontSize="8" fontFamily="monospace" fill="rgba(59,130,246,0.45)">{lnk.relation}</text>
                        <TravelDot path={pathD} color="#3b82f6" dur={2.5 + idx * 0.4} />
                      </g>
                    );
                  })}

                  {/* ── nodes ── */}
                  <AnimatePresence>
                    {layouted.map((node) => {
                      const cfg  = getNodeCfg(node.type);
                      const rc   = RISK_CONFIG[node.risk ?? "low"];
                      const sel  = selectedId === node.id;
                      const lsrc = linkFromId === node.id;
                      const nx   = node.x ?? 0;
                      const ny   = node.y ?? 0;
                      return (
                        <motion.g key={node.id}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0 }}
                          transition={{ type: "spring", stiffness: 280, damping: 22 }}
                          style={{ cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (linkFromId && linkFromId !== node.id) finishLink(node.id);
                            else { setSelectedId(node.id); setActiveTab("intel"); }
                          }}
                        >
                          {/* pulsing risk halo */}
                          <motion.circle cx={nx} cy={ny} r={26} fill={rc.glow} stroke="none"
                            animate={{ r: [24, 30, 24], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2.8 + Math.random(), repeat: Infinity }} />

                          {/* selection ring */}
                          {sel && (
                            <motion.circle cx={nx} cy={ny} r={30} fill="none"
                              stroke={cfg.color} strokeWidth={1} strokeDasharray="4 4" opacity={0.7}
                              animate={{ rotate: 360 }}
                              style={{ transformOrigin: `${nx}px ${ny}px` }}
                              transition={{ duration: 5, repeat: Infinity, ease: "linear" }} />
                          )}
                          {/* link-source ring */}
                          {lsrc && (
                            <motion.circle cx={nx} cy={ny} r={30} fill="none"
                              stroke="#fff" strokeWidth={1.5} opacity={0.5}
                              animate={{ r: [28, 33, 28] }}
                              transition={{ duration: 0.8, repeat: Infinity }} />
                          )}

                          {/* body */}
                          <circle cx={nx} cy={ny} r={20} fill={sel ? cfg.color : "#141414"}
                            stroke={lsrc ? "#fff" : cfg.color} strokeWidth={sel ? 2.5 : 1.5}
                            filter="url(#ci-glow)" />

                          {/* intel loading spinner */}
                          {node.intel?.loading && (
                            <motion.circle cx={nx} cy={ny} r={23} fill="none"
                              stroke={cfg.color} strokeWidth={1.5} strokeDasharray="10 20"
                              animate={{ rotate: 360 }}
                              style={{ transformOrigin: `${nx}px ${ny}px` }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }} />
                          )}

                          {/* glyph */}
                          <text x={nx} y={ny + 4} textAnchor="middle" fontSize="9" fontFamily="monospace" fontWeight="bold" fill={sel ? "#fff" : cfg.color}>{cfg.glyph}</text>

                          {/* label */}
                          <text x={nx} y={ny + 33} textAnchor="middle" fontSize="9.5" fontFamily="monospace" fill="#888">
                            {node.label.length > 13 ? node.label.slice(0, 11) + "…" : node.label}
                          </text>

                          {/* risk dot */}
                          <circle cx={nx + 15} cy={ny - 15} r={4.5} fill={rc.color} style={{ filter: `drop-shadow(0 0 3px ${rc.color})` }} />

                          {/* intel badge */}
                          {node.intel && !node.intel.loading && (
                            <motion.circle cx={nx - 15} cy={ny - 15} r={4.5} fill="#10b981"
                              initial={{ scale: 0 }} animate={{ scale: 1 }}
                              style={{ filter: "drop-shadow(0 0 3px #10b981)" }} />
                          )}
                        </motion.g>
                      );
                    })}
                  </AnimatePresence>
                </motion.svg>
              </div>
            )}

            {/* bottom legend */}
            <div className="absolute bottom-3 left-3 flex flex-col gap-1 pointer-events-none">
              {(["low","medium","high","critical"] as RiskLevel[]).map((r) => (
                <div key={r} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: RISK_CONFIG[r].color, boxShadow: `0 0 3px ${RISK_CONFIG[r].color}` }} />
                  <span className="text-[9px] text-[#2a2a2a] font-mono">{RISK_CONFIG[r].label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[9px] text-[#2a2a2a] font-mono">بيانات مُحللة</span>
              </div>
            </div>

            <div className="absolute bottom-3 right-3 text-[9px] text-[#1e1e1e] font-mono pointer-events-none text-right leading-5">
              <p>اسحب العقد لتحريكها</p>
              <p>Scan لتحليل استخباراتي</p>
              <p>حرّك الفأرة لمشاهدة التأثير ثلاثي الأبعاد</p>
            </div>
          </div>

          {/* ── RIGHT: Intel / Analysis / Links ─────── */}
          <div className="w-96 shrink-0 border-l border-[#181818] bg-[#080808] flex flex-col overflow-hidden">
            {/* tab bar */}
            <div className="flex border-b border-[#181818] shrink-0">
              {[
                { id: "intel"    as const, label: "استخبارات",  icon: <Scan size={11} /> },
                { id: "analysis" as const, label: "تحليل شامل", icon: <BarChart2 size={11} /> },
                { id: "links"    as const, label: "اتصالات",    icon: <Link2 size={11} /> },
              ].map((tab) => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-[10px] font-mono transition-all border-b-2"
                  style={activeTab === tab.id
                    ? { color: "#e21227", borderColor: "#e21227", backgroundColor: "#e2122709" }
                    : { color: "#383838", borderColor: "transparent" }}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto">

              {/* ── INTEL TAB ─────────────────────── */}
              {activeTab === "intel" && (
                <div className="p-4">
                  {!selected && (
                    <div className="flex flex-col items-center justify-center h-52 gap-3 text-center">
                      <Scan size={28} className="text-[#1a1a1a]" />
                      <p className="text-[11px] text-[#2a2a2a] font-mono">انقر على عقدة لعرض الاستخبارات</p>
                      <p className="text-[9px] text-[#1e1e1e] font-mono">أو اضغط زر Scan بجانب أي عقدة</p>
                    </div>
                  )}
                  {selected && (
                    <motion.div key={selected.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      {/* node header card */}
                      <div className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: getNodeCfg(selected.type).color + "12", border: `1px solid ${getNodeCfg(selected.type).color}28` }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: getNodeCfg(selected.type).color + "22", color: getNodeCfg(selected.type).color }}>
                          {getNodeCfg(selected.type).icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-white truncate">{selected.label}</p>
                          <p className="text-[10px] font-mono truncate" style={{ color: getNodeCfg(selected.type).color }}>{getNodeCfg(selected.type).label}</p>
                          {selected.value && <p className="text-[10px] text-[#383838] font-mono truncate mt-0.5">{selected.value}</p>}
                        </div>
                        <span className="px-2 py-1 rounded text-[10px] font-mono font-bold shrink-0"
                          style={{ color: RISK_CONFIG[selected.risk ?? "low"].color, backgroundColor: RISK_CONFIG[selected.risk ?? "low"].color + "22" }}>
                          {RISK_CONFIG[selected.risk ?? "low"].label}
                        </span>
                      </div>

                      {/* enrich button */}
                      {!selected.intel && (
                        <button onClick={() => void enrichNode(selected.id)} disabled={isEnriching}
                          className="w-full py-3 rounded-xl text-[11px] font-bold tracking-wide transition-all flex items-center justify-center gap-2 border font-mono"
                          style={{ borderColor: "#e21227", color: "#e21227", background: "#e2122712" }}>
                          {isEnriching ? <Loader2 size={13} className="animate-spin" /> : <Scan size={13} />}
                          تحليل استخباراتي بالذكاء الاصطناعي
                        </button>
                      )}

                      {/* loading */}
                      {selected.intel?.loading && (
                        <div className="rounded-xl border border-[#e21227]/18 p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Loader2 size={13} className="animate-spin text-[#e21227]" />
                            <span className="text-[11px] text-[#e21227] font-mono">جاري التحليل الاستخباراتي...</span>
                          </div>
                          <div className="space-y-1.5">
                            {["جلب بيانات الموقع الجغرافي...","فحص السمعة وقواعد التهديد...","البحث في قاعدة CVE...","تحليل مؤشرات الاختراق..."].map((t, i) => (
                              <motion.div key={i} className="flex items-center gap-2"
                                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.35 }}>
                                <motion.div className="w-1.5 h-1.5 rounded-full bg-[#e21227]"
                                  animate={{ opacity: [0.3,1,0.3] }} transition={{ delay: i*0.35, repeat: Infinity, duration: 1.2 }} />
                                <span className="text-[10px] text-[#3a3a3a] font-mono">{t}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* intel data panels */}
                      {selected.intel && !selected.intel.loading && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2.5">
                          {/* reputation gauge */}
                          {selected.intel.reputationScore !== undefined && (
                            <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-3">
                              <p className="text-[9px] text-[#383838] font-mono uppercase tracking-widest mb-2.5 flex items-center gap-1"><Activity size={9} /> مستوى التهديد</p>
                              <div className="flex items-center gap-3">
                                <div className="relative w-16 h-16 shrink-0">
                                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="#181818" strokeWidth="3" />
                                    <motion.circle cx="18" cy="18" r="14" fill="none"
                                      stroke={selected.intel.reputationScore >= 65 ? "#e21227" : selected.intel.reputationScore >= 35 ? "#fbbf24" : "#10b981"}
                                      strokeWidth="3" strokeLinecap="round"
                                      initial={{ strokeDasharray: "0 87.96" }}
                                      animate={{ strokeDasharray: `${(selected.intel.reputationScore / 100) * 87.96} 87.96` }}
                                      transition={{ duration: 1.4, ease: "easeOut" }} />
                                  </svg>
                                  <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-[13px] font-black font-mono text-white">{selected.intel.reputationScore}</span>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[12px] font-bold" style={{ color: selected.intel.reputationScore >= 65 ? "#e21227" : selected.intel.reputationScore >= 35 ? "#fbbf24" : "#10b981" }}>
                                    {selected.intel.reputationScore >= 65 ? "خطر عالي" : selected.intel.reputationScore >= 35 ? "مشبوه" : "آمن نسبياً"}
                                  </p>
                                  {selected.intel.lastSeen && <p className="text-[9px] text-[#383838] font-mono mt-1">آخر رصد: {selected.intel.lastSeen}</p>}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* geo */}
                          {(selected.intel.geoCountry || selected.intel.isp) && (
                            <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-3">
                              <p className="text-[9px] text-[#383838] font-mono uppercase tracking-widest mb-2 flex items-center gap-1"><MapPin size={9} /> موقع جغرافي</p>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                {selected.intel.geoCountry && <div><p className="text-[8px] text-[#2e2e2e] font-mono">دولة</p><p className="text-[11px] text-white font-mono">{selected.intel.geoCountry}</p></div>}
                                {selected.intel.geoCity    && <div><p className="text-[8px] text-[#2e2e2e] font-mono">مدينة</p><p className="text-[11px] text-white font-mono">{selected.intel.geoCity}</p></div>}
                                {selected.intel.isp        && <div className="col-span-2"><p className="text-[8px] text-[#2e2e2e] font-mono">ISP</p><p className="text-[11px] text-white font-mono">{selected.intel.isp}</p></div>}
                                {selected.intel.asnumber   && <div><p className="text-[8px] text-[#2e2e2e] font-mono">ASN</p><p className="text-[11px] text-white font-mono">{selected.intel.asnumber}</p></div>}
                              </div>
                            </div>
                          )}

                          {/* open ports */}
                          {selected.intel.openPorts && selected.intel.openPorts.length > 0 && (
                            <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-3">
                              <p className="text-[9px] text-[#383838] font-mono uppercase tracking-widest mb-2 flex items-center gap-1"><Wifi size={9} /> منافذ مفتوحة</p>
                              <div className="flex flex-wrap gap-1.5">
                                {selected.intel.openPorts.map((p) => (
                                  <span key={p} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ border: "1px solid rgba(226,18,39,0.35)", color: "#e21227", backgroundColor: "rgba(226,18,39,0.1)" }}>{p}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* CVEs */}
                          {selected.intel.cves && selected.intel.cves.length > 0 && (
                            <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-3">
                              <p className="text-[9px] text-[#383838] font-mono uppercase tracking-widest mb-2 flex items-center gap-1"><FileWarning size={9} /> ثغرات CVE</p>
                              <div className="space-y-1.5">
                                {selected.intel.cves.map((cve, i) => (
                                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#0a0a0a] border border-[#171717]">
                                    <span className="text-[10px] font-bold font-mono text-[#e21227] shrink-0 mt-0.5">{cve.id}</span>
                                    <p className="flex-1 text-[10px] text-[#888]">{cve.desc}</p>
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold shrink-0"
                                      style={{ color: cve.cvss >= 7 ? "#e21227" : cve.cvss >= 4 ? "#fbbf24" : "#10b981", backgroundColor: (cve.cvss >= 7 ? "#e21227" : cve.cvss >= 4 ? "#fbbf24" : "#10b981") + "20" }}>
                                      {cve.cvss}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* indicators */}
                          {selected.intel.indicators && selected.intel.indicators.length > 0 && (
                            <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-3">
                              <p className="text-[9px] text-[#383838] font-mono uppercase tracking-widest mb-2 flex items-center gap-1"><AlertTriangle size={9} /> مؤشرات التهديد</p>
                              <div className="space-y-1">
                                {selected.intel.indicators.map((ind, i) => (
                                  <div key={i} className="flex items-start gap-1.5">
                                    <ChevronRight size={9} className="text-[#e21227] shrink-0 mt-0.5" />
                                    <p className="text-[10px] text-[#888] font-mono">{ind}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* summary */}
                          {selected.intel.summary && (
                            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-3">
                              <p className="text-[9px] text-[#383838] font-mono uppercase tracking-widest mb-2">ملخص الاستخبارات</p>
                              <p className="text-[11px] text-[#aaa] leading-relaxed">{selected.intel.summary}</p>
                            </div>
                          )}

                          <button onClick={() => void enrichNode(selected.id)} disabled={isEnriching}
                            className="w-full py-2.5 rounded-xl text-[10px] font-mono flex items-center justify-center gap-1.5 border transition-all"
                            style={{ borderColor: "#1a1a1a", color: "#3a3a3a", background: "#0c0c0c" }}>
                            <RefreshCw size={10} /> تحديث البيانات
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── ANALYSIS TAB ──────────────────── */}
              {activeTab === "analysis" && (
                <div className="p-4">
                  {!analysis && !isAnalyzing && (
                    <div className="flex flex-col items-center justify-center h-52 gap-3 text-center">
                      <BarChart2 size={28} className="text-[#1a1a1a]" />
                      <p className="text-[11px] text-[#2a2a2a] font-mono">اضغط "تحليل شامل" في الشريط العلوي</p>
                      <p className="text-[9px] text-[#1e1e1e] font-mono">يتطلب عقدتين أو أكثر</p>
                    </div>
                  )}
                  {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center h-52 gap-4">
                      <motion.div className="w-14 h-14 rounded-full border-2 border-[#e21227]/40 flex items-center justify-center"
                        animate={{ rotate: 360 }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}>
                        <Loader2 size={22} className="text-[#e21227]" />
                      </motion.div>
                      <p className="text-[11px] text-[#e21227] font-mono">جاري تحليل الشبكة الكاملة بالذكاء الاصطناعي...</p>
                    </div>
                  )}
                  {analysis && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                      <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-4 text-center">
                        <p className="text-[9px] text-[#383838] font-mono uppercase tracking-widest mb-3">درجة خطر الشبكة</p>
                        <div className="relative inline-block w-28 h-28">
                          <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                            <circle cx="18" cy="18" r="14" fill="none" stroke="#181818" strokeWidth="2.5" />
                            <motion.circle cx="18" cy="18" r="14" fill="none"
                              stroke={analysis.riskScore >= 65 ? "#e21227" : analysis.riskScore >= 35 ? "#fbbf24" : "#10b981"}
                              strokeWidth="2.5" strokeLinecap="round"
                              initial={{ strokeDasharray: "0 87.96" }}
                              animate={{ strokeDasharray: `${(analysis.riskScore / 100) * 87.96} 87.96` }}
                              transition={{ duration: 2, ease: "easeOut" }} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black font-mono" style={{ color: analysis.riskScore >= 65 ? "#e21227" : analysis.riskScore >= 35 ? "#fbbf24" : "#10b981" }}>{analysis.riskScore}</span>
                            <span className="text-[9px] text-[#383838] font-mono">/100</span>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl border border-[#1a1a1a] bg-[#0d0d0d] p-4 max-h-80 overflow-y-auto">
                        <p className="text-[11px] text-[#aaa] leading-relaxed whitespace-pre-wrap font-mono">{analysis.summary}</p>
                      </div>
                      <button onClick={exportReport} className="w-full py-2.5 rounded-xl text-[11px] font-mono flex items-center justify-center gap-1.5 border border-[#1a1a1a] text-[#3a3a3a] hover:text-white hover:border-[#e21227] transition-all bg-[#0c0c0c]">
                        <Download size={11} /> تصدير التقرير الكامل
                      </button>
                    </motion.div>
                  )}
                </div>
              )}

              {/* ── LINKS TAB ─────────────────────── */}
              {activeTab === "links" && (
                <div className="p-4">
                  {links.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-52 gap-3 text-center">
                      <Link2 size={28} className="text-[#1a1a1a]" />
                      <p className="text-[11px] text-[#2a2a2a] font-mono">لا توجد اتصالات</p>
                      <p className="text-[9px] text-[#1e1e1e] font-mono">اضغط زر الربط بجانب أي عقدة</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    {links.map((lnk, idx) => {
                      const f = nodes.find((n) => n.id === lnk.from);
                      const t = nodes.find((n) => n.id === lnk.to);
                      return (
                        <motion.div key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="flex items-center gap-2 p-3 rounded-xl border border-[#181818] bg-[#0c0c0c]">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getNodeCfg(f?.type ?? "ip").color }} />
                          <p className="text-[11px] font-mono text-[#777] truncate flex-1">
                            <span className="text-white">{f?.label ?? "؟"}</span>
                            <span className="text-[#333]"> → </span>
                            <span className="text-blue-400">[{lnk.relation}]</span>
                            <span className="text-[#333]"> → </span>
                            <span className="text-white">{t?.label ?? "؟"}</span>
                          </p>
                          <button onClick={() => deleteLink(idx)} className="w-5 h-5 rounded flex items-center justify-center text-[#2a2a2a] hover:text-red-400 transition-colors shrink-0">
                            <Trash2 size={9} />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </FullPageOverlay>
  );
}
