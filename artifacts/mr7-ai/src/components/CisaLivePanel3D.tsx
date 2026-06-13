import { useEffect, useRef, useState, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X, Wifi, WifiOff, Zap, AlertTriangle, Clock, Activity } from "lucide-react";

interface KevVuln {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  knownRansomwareCampaignUse: string;
}

interface WsMessage {
  type: "snapshot" | "new_entries";
  items: KevVuln[];
  total?: number;
  version?: string;
}

// ── Scan line animation ────────────────────────────────────────────────────────
const ScanLineCanvas = memo(function ScanLineCanvas() {
  const ref    = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = 320, H = 3;
    cv.width = W; cv.height = H;
    let x = -80;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createLinearGradient(x, 0, x + 80, 0);
      g.addColorStop(0,   "rgba(226,18,39,0)");
      g.addColorStop(0.5, "rgba(226,18,39,0.9)");
      g.addColorStop(1,   "rgba(226,18,39,0)");
      ctx.fillStyle = g; ctx.fillRect(x, 0, 80, H);
      x += 4;
      if (x > W + 80) x = -80;
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);
  return <canvas ref={ref} style={{ width: "100%", height: 3, display: "block" }} />;
});

// ── 3D Severity Heatmap Canvas ─────────────────────────────────────────────────
const SeverityHeatmap = memo(function SeverityHeatmap({ entries }: { entries: KevVuln[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  // Compute heatmap data from entries
  const data = useCallback(() => {
    const vendors: Record<string, { total: number; ransomware: number }> = {};
    entries.forEach(v => {
      const key = v.vendorProject.slice(0, 10);
      if (!vendors[key]) vendors[key] = { total: 0, ransomware: 0 };
      vendors[key].total++;
      if (v.knownRansomwareCampaignUse === "Known") vendors[key].ransomware++;
    });
    return Object.entries(vendors)
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 12);
  }, [entries]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || entries.length === 0) return;
    const ctx = cv.getContext("2d")!;
    const DPR = window.devicePixelRatio || 1;
    const W = 280, H = 110;
    cv.width  = W * DPR;
    cv.height = H * DPR;
    ctx.scale(DPR, DPR);

    const rows = data();
    const maxV = Math.max(...rows.map(r => r[1].total), 1);
    const COLS = 4;
    const cellW = (W - 10) / Math.min(COLS, rows.length);
    const cellH = 22;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.035;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      // Background grid
      for (let gx = 0; gx < W; gx += 20) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H);
        ctx.strokeStyle = "rgba(226,18,39,0.03)"; ctx.lineWidth = 0.5; ctx.stroke();
      }
      for (let gy = 0; gy < H; gy += 20) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy);
        ctx.strokeStyle = "rgba(226,18,39,0.03)"; ctx.lineWidth = 0.5; ctx.stroke();
      }

      rows.forEach(([ vendor, stats ], i) => {
        const col = i % COLS;
        const row = Math.floor(i / COLS);
        const x   = 5 + col * cellW;
        const y   = 6 + row * (cellH + 4);
        const pct = stats.total / maxV;
        const ransomPct = stats.total > 0 ? stats.ransomware / stats.total : 0;

        // Heat color: cool (blue) → warm (orange) → hot (red)
        const r = Math.round(pct < 0.5 ? pct * 2 * 226 : 226);
        const g = Math.round(pct < 0.5 ? 94 + pct * 2 * (18 - 94) : 18);
        const b = Math.round(pct < 0.5 ? 197 - pct * 2 * 197 : 39);

        // 3D perspective bar
        const barW = (cellW - 6) * pct;
        const depth = 4;

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(x + 1.5, y + 1.5, barW, cellH - 6);

        // Side face (3D depth)
        ctx.fillStyle = `rgba(${Math.round(r*0.5)},${Math.round(g*0.5)},${Math.round(b*0.5)},0.8)`;
        ctx.beginPath();
        ctx.moveTo(x + barW, y);
        ctx.lineTo(x + barW + depth, y - depth);
        ctx.lineTo(x + barW + depth, y + cellH - 6 - depth);
        ctx.lineTo(x + barW, y + cellH - 6);
        ctx.closePath(); ctx.fill();

        // Top face (3D depth)
        ctx.fillStyle = `rgba(${Math.min(255, r + 60)},${Math.min(255, g + 40)},${Math.min(255, b + 40)},0.7)`;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + depth, y - depth);
        ctx.lineTo(x + barW + depth, y - depth);
        ctx.lineTo(x + barW, y);
        ctx.closePath(); ctx.fill();

        // Main face with animated gradient
        const pulse = 0.85 + Math.sin(t * 2.5 + i) * 0.15;
        const grad  = ctx.createLinearGradient(x, y, x + barW, y);
        grad.addColorStop(0,   `rgba(${r},${g},${b},${0.4 * pulse})`);
        grad.addColorStop(0.5, `rgba(${r},${g},${b},${0.85 * pulse})`);
        grad.addColorStop(1,   `rgba(${Math.min(255,r+40)},${Math.min(255,g+40)},${b},${0.65 * pulse})`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barW, cellH - 6);

        // Ransomware overlay
        if (ransomPct > 0) {
          const rW = barW * ransomPct;
          ctx.fillStyle = `rgba(226,18,39,${0.35 * pulse})`;
          ctx.fillRect(x, y, rW, (cellH - 6) * 0.35);
        }

        // Scanline shimmer
        const shX = x + (barW * ((t * 0.6 + i * 0.3) % 1));
        const shimGrad = ctx.createLinearGradient(shX - 6, 0, shX + 6, 0);
        shimGrad.addColorStop(0, "rgba(255,255,255,0)");
        shimGrad.addColorStop(0.5, "rgba(255,255,255,0.18)");
        shimGrad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = shimGrad;
        ctx.fillRect(x, y, barW, cellH - 6);

        // Border
        ctx.strokeStyle = `rgba(${r},${g},${b},0.45)`;
        ctx.lineWidth = 0.7;
        ctx.strokeRect(x, y, barW, cellH - 6);

        // Vendor label
        ctx.font = `bold ${Math.min(8, 7 + pct * 1.5)}px monospace`;
        ctx.fillStyle = `rgba(255,255,255,${0.55 + pct * 0.35})`;
        ctx.textAlign = "left";
        ctx.fillText(vendor.slice(0, 8), x + 2, y + cellH - 8.5);

        // Count badge
        ctx.font = "bold 7px monospace";
        ctx.fillStyle = `rgba(${r},${g},${b},0.95)`;
        ctx.textAlign = "right";
        ctx.fillText(`${stats.total}`, x + Math.max(barW - 1, 20), y + cellH - 8.5);
      });

      // Legend
      const legendY = H - 12;
      ctx.font = "7px monospace";
      const legItems = [
        { label: "كثافة عالية", r: 226, g: 18, b: 39 },
        { label: "متوسطة", r: 245, g: 158, b: 11 },
        { label: "منخفضة", r: 6, g: 182, b: 212 },
        { label: "فدية", r: 226, g: 18, b: 39, stripe: true },
      ];
      let lx = 5;
      legItems.forEach(li => {
        ctx.fillStyle = `rgba(${li.r},${li.g},${li.b},0.8)`;
        if (li.stripe) {
          ctx.fillStyle = `rgba(${li.r},${li.g},${li.b},0.5)`;
          ctx.fillRect(lx, legendY + 1.5, 6, 4);
          ctx.fillStyle = "rgba(255,255,255,0.5)";
          ctx.fillRect(lx, legendY + 1.5, 6, 1.5);
        } else {
          ctx.fillRect(lx, legendY + 1.5, 6, 4);
        }
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.textAlign = "left";
        ctx.fillText(li.label, lx + 8, legendY + 6);
        lx += 50;
      });
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [entries, data]);

  if (entries.length === 0) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 280, height: 110, imageRendering: "crisp-edges", display: "block" }}
    />
  );
});

// ── CVE entry row ─────────────────────────────────────────────────────────────
const CveRow = memo(function CveRow({ v, isNew, idx }: { v: KevVuln; isNew: boolean; idx: number }) {
  const ransomColor =
    v.knownRansomwareCampaignUse === "Known"   ? "#e21227" :
    v.knownRansomwareCampaignUse === "Unknown" ? "#f59e0b" : "#6b7280";

  return (
    <motion.div
      key={v.cveID}
      initial={isNew ? { opacity: 0, x: -20, scale: 0.96 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ delay: isNew ? 0 : idx * 0.018, duration: 0.18 }}
      className="rounded-xl p-2.5"
      style={{
        background: isNew ? "rgba(226,18,39,0.1)" : "rgba(255,255,255,0.025)",
        border: `1px solid ${isNew ? "rgba(226,18,39,0.35)" : "rgba(255,255,255,0.055)"}`,
        boxShadow: isNew ? "0 0 14px rgba(226,18,39,0.15)" : "none",
      }}
    >
      <div className="flex items-start gap-1.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="font-mono font-black text-[10px]" style={{ color: "#e21227" }}>
              {v.cveID}
            </span>
            {isNew && (
              <motion.span
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="text-[7px] font-black px-1 py-0.5 rounded"
                style={{ background: "rgba(226,18,39,0.3)", color: "#e21227", border: "1px solid rgba(226,18,39,0.5)" }}>
                NEW
              </motion.span>
            )}
            <span className="text-[8px] px-1 py-0.5 rounded font-bold"
              style={{
                background: `${ransomColor}18`,
                border: `1px solid ${ransomColor}40`,
                color: ransomColor,
              }}>
              {v.knownRansomwareCampaignUse === "Known" ? "RANSOMWARE" : "VULN"}
            </span>
          </div>
          <div className="text-[10px] font-semibold text-white/80 leading-snug truncate">
            {v.vulnerabilityName}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] text-white/40 font-mono truncate">{v.vendorProject} · {v.product}</span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Clock className="w-2.5 h-2.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
            <span className="text-[8px] font-mono text-white/30">{v.dateAdded}</span>
            {v.knownRansomwareCampaignUse === "Known" && (
              <AlertTriangle className="w-2.5 h-2.5 ml-auto flex-shrink-0" style={{ color: "#e21227" }} />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// ── Main Panel ─────────────────────────────────────────────────────────────────
interface CisaLivePanel3DProps {
  open: boolean;
  onClose: () => void;
}

export function CisaLivePanel3D({ open, onClose }: CisaLivePanel3DProps) {
  const [entries,   setEntries]   = useState<KevVuln[]>([]);
  const [newAlerts, setNewAlerts] = useState<KevVuln[]>([]);
  const [wsStatus,  setWsStatus]  = useState<"connecting" | "open" | "closed">("connecting");
  const [total,     setTotal]     = useState<number | null>(null);
  const [version,   setVersion]   = useState<string | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "heatmap">("feed");
  const wsRef        = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    setWsStatus("connecting");
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws    = new WebSocket(`${proto}//${window.location.host}/api/cisa-live`);
    wsRef.current = ws;
    ws.onopen  = () => setWsStatus("open");
    ws.onclose = () => {
      setWsStatus("closed");
      reconnectRef.current = setTimeout(connect, 5000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as WsMessage;
        if (msg.total)   setTotal(msg.total);
        if (msg.version) setVersion(msg.version);
        if (msg.type === "snapshot") {
          setEntries(msg.items);
        } else if (msg.type === "new_entries") {
          setEntries(prev => [...msg.items, ...prev].slice(0, 60));
          setNewAlerts(prev => [...msg.items, ...prev].slice(0, 5));
          setTimeout(() => setNewAlerts([]), 9000);
        }
      } catch { /* ignore */ }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    connect();
    return () => {
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
    };
  }, [open, connect]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 340, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 340, scale: 0.94 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-4 top-16 z-50"
          style={{
            width: 300,
            maxHeight: "calc(100vh - 80px)",
            background: "rgba(5,5,9,0.98)",
            border: "1px solid rgba(226,18,39,0.28)",
            borderRadius: 18,
            boxShadow: "0 0 80px rgba(226,18,39,0.12), 0 0 30px rgba(226,18,39,0.08), 0 24px 64px rgba(0,0,0,0.88), inset 0 1px 0 rgba(255,255,255,0.04)",
            backdropFilter: "blur(24px)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Top scan line */}
          <div className="rounded-t-[18px] overflow-hidden flex-shrink-0">
            <ScanLineCanvas />
          </div>

          {/* Header */}
          <div className="px-3.5 py-2.5 flex items-center justify-between flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(226,18,39,0.1)" }}>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}>
                <ShieldAlert className="w-4 h-4 flex-shrink-0" style={{ color: "#e21227" }} />
              </motion.div>
              <div className="min-w-0">
                <div className="text-[8px] font-black tracking-[0.3em] uppercase" style={{ color: "rgba(226,18,39,0.65)" }}>
                  CISA KEV — LIVE FEED
                </div>
                <div className="text-white text-[11px] font-bold leading-tight flex items-center gap-1.5">
                  ثغرات مستغلة معروفة
                  {total && <span className="text-white/35 font-mono text-[9px]">({total.toLocaleString()})</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                {wsStatus === "open" ? (
                  <motion.div animate={{ opacity: [0.5, 1] }} transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}>
                    <Wifi className="w-3 h-3" style={{ color: "#22c55e" }} />
                  </motion.div>
                ) : wsStatus === "connecting" ? (
                  <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
                    <Activity className="w-3 h-3" style={{ color: "#f59e0b" }} />
                  </motion.div>
                ) : (
                  <WifiOff className="w-3 h-3" style={{ color: "#e21227" }} />
                )}
                <span className="text-[8px] font-mono font-bold" style={{
                  color: wsStatus === "open" ? "#22c55e" : wsStatus === "connecting" ? "#f59e0b" : "#e21227",
                }}>
                  {wsStatus === "open" ? "LIVE" : wsStatus === "connecting" ? "···" : "OFF"}
                </span>
              </div>
              <button onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
                style={{ color: "rgba(255,255,255,0.35)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Catalog version + tab bar */}
          <div className="px-3.5 py-2 flex items-center justify-between flex-shrink-0"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex gap-1">
              {(["feed", "heatmap"] as const).map(tab => (
                <button key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest uppercase transition-all"
                  style={{
                    background: activeTab === tab ? "rgba(226,18,39,0.18)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${activeTab === tab ? "rgba(226,18,39,0.4)" : "rgba(255,255,255,0.08)"}`,
                    color: activeTab === tab ? "#e21227" : "rgba(255,255,255,0.35)",
                  }}>
                  {tab === "feed" ? "البث المباشر" : "خريطة الحرارة"}
                </button>
              ))}
            </div>
            {version && (
              <span className="text-[8px] font-mono text-white/25">v{version}</span>
            )}
          </div>

          {/* New alert banner */}
          <AnimatePresence>
            {newAlerts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden flex-shrink-0 px-3.5 pt-2"
              >
                <div className="rounded-xl p-2 flex items-center gap-2"
                  style={{ background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.38)" }}>
                  <motion.div
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity }}>
                    <Zap className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#e21227" }} />
                  </motion.div>
                  <div className="min-w-0">
                    <div className="text-[9px] font-black tracking-widest" style={{ color: "#e21227" }}>
                      تحديث مباشر جديد
                    </div>
                    <div className="text-[9px] text-white/60">
                      {newAlerts.length} ثغرة جديدة أُضيفت للفهرس
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Content area */}
          <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
            {/* Heatmap tab */}
            <AnimatePresence mode="wait">
              {activeTab === "heatmap" && (
                <motion.div
                  key="heatmap"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[9px] font-black tracking-widest uppercase" style={{ color: "rgba(226,18,39,0.65)" }}>
                      توزيع الثغرات بالمورّد
                    </span>
                    <span className="text-[8px] font-mono text-white/30">3D · {entries.length} ثغرة</span>
                  </div>
                  {entries.length === 0 ? (
                    <div className="h-28 flex items-center justify-center text-[10px] text-white/30">
                      جارٍ تحميل البيانات…
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden"
                      style={{ background: "rgba(226,18,39,0.03)", border: "1px solid rgba(226,18,39,0.1)" }}>
                      <SeverityHeatmap entries={entries} />
                    </div>
                  )}

                  {/* Severity distribution donut-style bars */}
                  {entries.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      <div className="text-[8px] font-black tracking-widest uppercase mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                        إحصاءات المورّدين
                      </div>
                      {[
                        { label: "مع فدية معروفة", count: entries.filter(e => e.knownRansomwareCampaignUse === "Known").length, color: "#e21227" },
                        { label: "ثغرات برمجيات", count: entries.filter(e => e.vendorProject !== "Microsoft" && e.vendorProject !== "Cisco").length, color: "#f59e0b" },
                        { label: "المجموع الكلي", count: entries.length, color: "#22c55e" },
                      ].map(item => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="text-[9px] text-white/40 w-24 flex-shrink-0 text-right">{item.label}</span>
                          <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: item.color, boxShadow: `0 0 6px ${item.color}80` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(item.count / Math.max(entries.length, 1)) * 100}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                            />
                          </div>
                          <span className="text-[9px] font-mono font-bold w-8 flex-shrink-0" style={{ color: item.color }}>
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* Live feed tab */}
              {activeTab === "feed" && (
                <motion.div
                  key="feed"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                  className="overflow-y-auto h-full"
                  style={{ scrollbarWidth: "none", maxHeight: "calc(100vh - 260px)" }}
                >
                  <div className="px-3 pb-3 pt-2 space-y-1.5">
                    {entries.length === 0 ? (
                      <div className="py-10 text-center">
                        <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                          className="inline-block mb-2">
                          <ShieldAlert className="w-8 h-8" style={{ color: "rgba(226,18,39,0.35)" }} />
                        </motion.div>
                        <p className="text-[11px] text-white/25">جارٍ الاتصال بـ CISA KEV…</p>
                      </div>
                    ) : (
                      entries.map((v, i) => (
                        <CveRow
                          key={v.cveID}
                          v={v}
                          isNew={newAlerts.some(a => a.cveID === v.cveID)}
                          idx={i}
                        />
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom stripe */}
          <div className="h-px w-full rounded-b-[18px] flex-shrink-0"
            style={{ background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.2), transparent)" }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
