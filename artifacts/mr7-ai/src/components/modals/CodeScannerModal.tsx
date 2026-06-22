import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Upload, Play, AlertTriangle, AlertOctagon, Info, CheckCircle2, Loader2, FileCode2, Download, ChevronRight, Bug, Clock, ZapOff } from "lucide-react";
import { authFetch } from "@/lib/auth";

interface Vulnerability {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  line?: number;
  lineEnd?: number;
  snippet?: string;
  recommendation: string;
  cwe?: string;
  owasp?: string;
}

interface ScanResult {
  vulnerabilities: Vulnerability[];
  summary: string;
  severityCounts: Record<string, number>;
  language: string;
  scanTimeMs: number;
  scanId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const SEV_CONFIG = {
  critical: { color: "#ff2244", bg: "rgba(255,34,68,0.12)", border: "rgba(255,34,68,0.3)", icon: AlertOctagon, label: "حرج" },
  high:     { color: "#ff6622", bg: "rgba(255,102,34,0.10)", border: "rgba(255,102,34,0.28)", icon: AlertTriangle, label: "عالٍ" },
  medium:   { color: "#ffaa22", bg: "rgba(255,170,34,0.10)", border: "rgba(255,170,34,0.25)", icon: AlertTriangle, label: "متوسط" },
  low:      { color: "#22aaff", bg: "rgba(34,170,255,0.08)", border: "rgba(34,170,255,0.2)", icon: Info, label: "منخفض" },
  info:     { color: "#888", bg: "rgba(136,136,136,0.08)", border: "rgba(136,136,136,0.18)", icon: Info, label: "معلومة" },
};

const SAMPLE_CODE = `const express = require('express');
const mysql = require('mysql');
const app = express();

// Hardcoded credentials - DO NOT DO THIS
const DB_PASSWORD = "admin123";
const SECRET_KEY = "supersecret";

app.get('/user', (req, res) => {
  const userId = req.query.id;
  // SQL Injection vulnerability
  const query = "SELECT * FROM users WHERE id = " + userId;
  connection.query(query, (err, results) => {
    res.send(results);
  });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // XSS - no output encoding
  res.send('<h1>Welcome ' + username + '</h1>');
});

app.get('/file', (req, res) => {
  // Path traversal
  const file = req.query.path;
  res.sendFile('/var/www/' + file);
});`;

export function CodeScannerModal({ open, onClose }: Props) {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [filename, setFilename] = useState("example.js");
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("mr7_openai_key") ?? "");
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Animated scan grid
  useEffect(() => {
    if (!open || !scanning) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    let y = 0, raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      // Scan line
      ctx.fillStyle = `rgba(226,18,39,0.08)`;
      ctx.fillRect(0, y % H, W, 2);
      ctx.fillStyle = `rgba(226,18,39,0.03)`;
      ctx.fillRect(0, (y % H) - 30, W, 30);
      y += 2;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [open, scanning]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    const reader = new FileReader();
    reader.onload = ev => setCode(ev.target?.result as string ?? "");
    reader.readAsText(f);
  };

  const runScan = useCallback(async () => {
    if (!code.trim()) return;
    setScanning(true);
    setError(null);
    setResult(null);
    try {
      if (apiKey) localStorage.setItem("mr7_openai_key", apiKey);
      const res = await authFetch("/api/scan/code", {
        method: "POST",
        body: JSON.stringify({ code, filename, apiKey: apiKey || undefined }),
      });
      const data = await res.json() as ScanResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }, [code, filename, apiKey]);

  const generateReport = useCallback(async () => {
    if (!result) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    // Header
    doc.setFillColor(10, 10, 10);
    doc.rect(0, 0, 210, 297, "F");
    doc.setFillColor(226, 18, 39);
    doc.rect(0, 0, 210, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text("KaliGPT — تقرير تحليل الثغرات", 105, 13, { align: "center" });

    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(180, 180, 180);
    doc.text(`الملف: ${filename}   اللغة: ${result.language}   التاريخ: ${new Date().toLocaleDateString("ar")}`, 105, 28, { align: "center" });

    // Summary
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text("الملخص:", 190, 38, { align: "right" });
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    const lines = doc.splitTextToSize(result.summary, 180);
    doc.text(lines as string[], 190, 45, { align: "right" });

    // Severity counts
    let yPos = 60;
    const counts = result.severityCounts;
    doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text("إحصائيات:", 190, yPos, { align: "right" }); yPos += 7;
    [["حرج", counts.critical, "FF2244"], ["عالٍ", counts.high, "FF6622"], ["متوسط", counts.medium, "FFAA22"], ["منخفض", counts.low, "22AAFF"]].forEach(([label, cnt, color]) => {
      if (Number(cnt) > 0) {
        doc.setTextColor(parseInt((color as string).slice(0,2),16), parseInt((color as string).slice(2,4),16), parseInt((color as string).slice(4),16));
        doc.text(`${label}: ${cnt}`, 190, yPos, { align: "right" });
        yPos += 6;
      }
    });

    // Vulnerabilities
    yPos += 5; doc.setFontSize(11); doc.setTextColor(255, 255, 255);
    doc.text("الثغرات المكتشفة:", 190, yPos, { align: "right" }); yPos += 8;

    result.vulnerabilities.forEach((v, i) => {
      if (yPos > 270) { doc.addPage(); doc.setFillColor(10,10,10); doc.rect(0,0,210,297,"F"); yPos = 15; }
      doc.setFontSize(10); doc.setTextColor(255,200,200);
      doc.text(`${i+1}. [${v.severity.toUpperCase()}] ${v.title} ${v.line ? `(سطر ${v.line})` : ""}`, 190, yPos, { align: "right" }); yPos += 6;
      doc.setFontSize(8); doc.setTextColor(170,170,170);
      const desc = doc.splitTextToSize(v.description, 170);
      doc.text(desc as string[], 190, yPos, { align: "right" }); yPos += (desc as string[]).length * 4 + 3;
      if (v.cwe) { doc.setTextColor(100,160,255); doc.text(`${v.cwe}${v.owasp ? " • " + v.owasp : ""}`, 190, yPos, { align: "right" }); yPos += 5; }
      yPos += 3;
    });

    doc.save(`kaligpt-scan-${filename}.pdf`);
  }, [result, filename]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md" />

        <motion.div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-2xl border border-red-900/40 bg-[#080808] shadow-[0_0_80px_rgba(226,18,39,0.1)] flex flex-col"
          initial={{ scale: 0.94, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}>

          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

          {/* Header */}
          <div className="relative flex items-center justify-between p-4 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <Bug className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="font-bold text-white text-base">فاحص الثغرات الأمنية</div>
                <div className="text-xs text-zinc-500 font-mono">KaliGPT SAST • AI-Powered</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {result && (
                <button onClick={generateReport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-300 border border-white/10 transition-all">
                  <Download className="w-3.5 h-3.5" /> PDF Report
                </button>
              )}
              <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>

          <div className="relative flex flex-1 overflow-hidden min-h-0">
            {/* Left: Code input */}
            <div className="w-1/2 flex flex-col border-r border-white/5 p-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 flex-1 bg-white/5 border border-white/10 rounded-lg px-3 h-9">
                  <FileCode2 className="w-4 h-4 text-zinc-500 shrink-0" />
                  <input value={filename} onChange={e => setFilename(e.target.value)}
                    className="bg-transparent text-sm text-white flex-1 outline-none font-mono" placeholder="filename.js" />
                </div>
                <button onClick={() => fileRef.current?.click()}
                  className="h-9 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 flex items-center gap-1.5 transition-all">
                  <Upload className="w-3.5 h-3.5" /> رفع ملف
                </button>
                <input ref={fileRef} type="file" accept=".js,.ts,.py,.php,.java,.go,.rb,.c,.cpp,.cs,.rs,.sql,.yaml,.json,.sh" className="hidden" onChange={handleFile} />
              </div>

              {/* API Key */}
              <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 h-9">
                <ZapOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
                  placeholder="OpenAI API Key (اختياري)" dir="ltr"
                  className="bg-transparent text-sm text-white flex-1 outline-none font-mono text-xs" />
              </div>

              <textarea
                value={code} onChange={e => setCode(e.target.value)}
                className="flex-1 bg-[#050505] border border-white/8 rounded-xl p-3 text-xs text-green-300 font-mono resize-none outline-none focus:border-red-500/30 min-h-[280px]"
                placeholder="ألصق الكود هنا أو ارفع ملفاً..." dir="ltr" spellCheck={false}
              />

              <button onClick={runScan} disabled={scanning || !code.trim()}
                className="h-12 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(226,18,39,0.3)]">
                {scanning ? <><Loader2 className="w-5 h-5 animate-spin" /> جارٍ الفحص الأمني...</> : <><Play className="w-5 h-5" /> بدء الفحص الأمني <ChevronRight className="w-4 h-4" /></>}
              </button>
            </div>

            {/* Right: Results */}
            <div className="w-1/2 flex flex-col p-4 overflow-y-auto gap-3">
              {!result && !scanning && !error && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                  <Shield className="w-16 h-16 text-red-900/40" />
                  <div className="text-zinc-500 text-sm">ألصق الكود واضغط "بدء الفحص" لتحليل الثغرات</div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 w-full">
                    {["SQL Injection", "XSS", "Path Traversal", "SSRF", "Hardcoded Secrets", "Insecure Crypto", "Buffer Overflow", "IDOR"].map(t => (
                      <div key={t} className="flex items-center gap-1.5 bg-white/3 rounded-lg px-2 py-1.5 border border-white/5">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-600/60" /> {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {scanning && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-2 border-red-500/20 animate-ping" />
                    <div className="absolute inset-2 rounded-full border-2 border-red-500/40 animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Shield className="w-8 h-8 text-red-500" />
                    </div>
                  </div>
                  <div className="text-sm text-red-400 font-mono animate-pulse">ANALYZING SECURITY VECTORS...</div>
                  {["Checking injection points", "Scanning crypto usage", "Detecting hardcoded secrets", "Validating input handling"].map((s, i) => (
                    <div key={s} className="text-xs text-zinc-500 font-mono animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>[{">".repeat(i+1)}] {s}</div>
                  ))}
                </div>
              )}

              {error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300 text-sm">
                  <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5" />
                  <div><div className="font-semibold mb-1">خطأ في الفحص</div>{error}</div>
                </div>
              )}

              {result && (
                <>
                  {/* Summary bar */}
                  <div className="bg-white/3 border border-white/8 rounded-xl p-3 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-white">نتائج الفحص</span>
                      <div className="flex items-center gap-1 text-xs text-zinc-500">
                        <Clock className="w-3 h-3" /> {(result.scanTimeMs / 1000).toFixed(1)}s
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(["critical","high","medium","low","info"] as const).map(s => {
                        const cnt = result.severityCounts[s] ?? 0;
                        if (!cnt) return null;
                        const cfg = SEV_CONFIG[s];
                        return (
                          <div key={s} className="flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-lg border" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
                            {cnt} {cfg.label}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{result.summary}</p>
                  </div>

                  {/* Vulnerability list */}
                  <div className="space-y-2 overflow-y-auto flex-1">
                    {result.vulnerabilities.length === 0 && (
                      <div className="flex items-center gap-2 text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                        <CheckCircle2 className="w-5 h-5" /> لم يتم اكتشاف ثغرات. الكود يبدو آمناً.
                      </div>
                    )}
                    {result.vulnerabilities.map(v => {
                      const cfg = SEV_CONFIG[v.severity] ?? SEV_CONFIG.info;
                      const Icon = cfg.icon;
                      const expanded = expandedId === v.id;
                      return (
                        <motion.div key={v.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                          className="rounded-xl border overflow-hidden cursor-pointer"
                          style={{ borderColor: cfg.border, background: cfg.bg }}
                          onClick={() => setExpandedId(expanded ? null : v.id)}>
                          <div className="flex items-start gap-2.5 p-3">
                            <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: cfg.color }} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-white">{v.title}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded-md font-mono" style={{ color: cfg.color, background: `${cfg.color}22` }}>
                                  {v.severity.toUpperCase()}
                                </span>
                                {v.line && <span className="text-xs text-zinc-500 font-mono">سطر {v.line}{v.lineEnd ? `–${v.lineEnd}` : ""}</span>}
                                {v.cwe && <span className="text-xs text-blue-400 font-mono">{v.cwe}</span>}
                              </div>
                              {!expanded && <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{v.description}</p>}
                            </div>
                            <ChevronRight className={`w-4 h-4 text-zinc-500 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
                          </div>
                          <AnimatePresence>
                            {expanded && (
                              <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                                className="overflow-hidden border-t" style={{ borderColor: `${cfg.border}` }}>
                                <div className="p-3 space-y-3">
                                  {v.snippet && (
                                    <pre className="text-xs bg-black/40 rounded-lg p-2 text-green-300 font-mono overflow-x-auto">{v.snippet}</pre>
                                  )}
                                  <div className="text-xs text-zinc-300 leading-relaxed">{v.description}</div>
                                  <div className="bg-green-500/8 border border-green-500/20 rounded-lg p-2">
                                    <div className="text-xs text-green-400 font-semibold mb-1">التوصية:</div>
                                    <div className="text-xs text-zinc-300">{v.recommendation}</div>
                                  </div>
                                  {v.owasp && <div className="text-xs text-zinc-500 font-mono">OWASP: {v.owasp}</div>}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
