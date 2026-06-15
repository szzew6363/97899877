import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, Zap, Wifi, Server, AlertTriangle, CheckCircle, Clock, Radio, TrendingUp, Database } from "lucide-react";
import { trafficBus, type TrafficEvent, type TrafficStatus } from "@/lib/trafficBus";

/* ══════════════════════════════════════════════════════════════════
   COLOUR MAP
══════════════════════════════════════════════════════════════════ */
const STATUS_COLOR: Record<TrafficStatus, string> = {
  pending:   "#f59e0b",
  streaming: "#00e5ff",
  success:   "#22c55e",
  error:     "#e21227",
};
const STATUS_LABEL: Record<TrafficStatus, string> = {
  pending:   "PENDING",
  streaming: "STREAM",
  success:   "OK",
  error:     "ERR",
};

/* ══════════════════════════════════════════════════════════════════
   MINI SPARKLINE (20-point)
══════════════════════════════════════════════════════════════════ */
function Sparkline({ data, color, w = 80, h = 22 }: { data: number[]; color: string; w?: number; h?: number }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = cvRef.current; if (!cv || data.length < 2) return;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, w, h);
    const max = Math.max(...data, 1);
    const pts = data.map((v, i) => ({
      x: (i / (data.length - 1)) * w,
      y: h - (v / max) * (h - 3) - 1.5,
    }));
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color + "55"); grad.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.moveTo(pts[0].x, h);
    pts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(pts[pts.length - 1].x, h); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.strokeStyle = color; ctx.lineWidth = 1.4;
    ctx.shadowColor = color; ctx.shadowBlur = 4;
    ctx.stroke();
  }, [data, color, w, h]);
  return <canvas ref={cvRef} width={w} height={h} style={{ display: "block" }} />;
}

/* ══════════════════════════════════════════════════════════════════
   NETWORK FLOW CANVAS
══════════════════════════════════════════════════════════════════ */
function NetworkFlowCanvas({ events }: { events: TrafficEvent[] }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const evRef = useRef(events);
  useEffect(() => { evRef.current = events; }, [events]);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;

    /* fixed node positions */
    const nodes = [
      { id: "client",  label: "CLIENT",  x: W * 0.10, y: H / 2, color: "#00e5ff" },
      { id: "gateway", label: "GATEWAY", x: W * 0.35, y: H / 2, color: "#8b5cf6" },
      { id: "ai",      label: "AI CORE", x: W * 0.65, y: H / 2, color: "#f59e0b" },
      { id: "db",      label: "DB",      x: W * 0.88, y: H * 0.30, color: "#22c55e" },
      { id: "ext",     label: "EXT API", x: W * 0.88, y: H * 0.70, color: "#f97316" },
    ];

    type Packet = { fromX: number; fromY: number; toX: number; toY: number; t: number; color: string };
    const packets: Packet[] = [];
    let lastSpawn = 0;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 1;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      /* dark background */
      ctx.fillStyle = "rgba(2,2,12,0.96)"; ctx.fillRect(0, 0, W, H);

      /* connection lines */
      const edges: [number, number][] = [[0,1],[1,2],[2,3],[2,4]];
      edges.forEach(([a, b]) => {
        const n1 = nodes[a], n2 = nodes[b];
        const grad = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
        grad.addColorStop(0, n1.color + "30");
        grad.addColorStop(1, n2.color + "30");
        ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y);
        ctx.strokeStyle = grad; ctx.lineWidth = 1.2;
        ctx.setLineDash([4, 8]); ctx.lineDashOffset = -(t * 0.5);
        ctx.stroke(); ctx.setLineDash([]);
      });

      /* spawn packets based on events */
      const recentOps = evRef.current.filter(e => Date.now() - e.startTime < 3000);
      if (t - lastSpawn > 18 && recentOps.length > 0) {
        const op = recentOps[Math.floor(Math.random() * recentOps.length)];
        const col = STATUS_COLOR[op.status];
        /* client→gateway */
        packets.push({ fromX: nodes[0].x, fromY: nodes[0].y, toX: nodes[1].x, toY: nodes[1].y, t: 0, color: col });
        lastSpawn = t;
      }

      /* advance + draw packets */
      for (let i = packets.length - 1; i >= 0; i--) {
        const pk = packets[i];
        pk.t += 0.025;
        if (pk.t >= 1) {
          /* spawn next hop if < ai node */
          if (pk.toX < nodes[2].x - 10) {
            packets.push({ fromX: pk.toX, fromY: pk.toY, toX: nodes[2].x, toY: nodes[2].y, t: 0, color: pk.color });
          }
          packets.splice(i, 1); continue;
        }
        const px = pk.fromX + (pk.toX - pk.fromX) * pk.t;
        const py = pk.fromY + (pk.toY - pk.fromY) * pk.t;
        ctx.save();
        ctx.beginPath(); ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fillStyle = pk.color;
        ctx.shadowColor = pk.color; ctx.shadowBlur = 8;
        ctx.fill(); ctx.restore();
      }

      /* nodes */
      nodes.forEach(n => {
        const pulse = 0.5 + Math.sin(t * 0.05 + nodes.indexOf(n) * 1.2) * 0.5;
        ctx.save();
        /* glow ring */
        ctx.beginPath(); ctx.arc(n.x, n.y, 12 + pulse * 4, 0, Math.PI * 2);
        ctx.strokeStyle = n.color + "25"; ctx.lineWidth = 1;
        ctx.shadowColor = n.color; ctx.shadowBlur = 10;
        ctx.stroke();
        /* node circle */
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 9);
        grad.addColorStop(0, n.color + "60"); grad.addColorStop(1, n.color + "15");
        ctx.beginPath(); ctx.arc(n.x, n.y, 9, 0, Math.PI * 2);
        ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, 9, 0, Math.PI * 2);
        ctx.strokeStyle = n.color + "70"; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
        /* label */
        ctx.fillStyle = n.color + "cc";
        ctx.font = "bold 6px monospace";
        ctx.textAlign = "center";
        ctx.fillText(n.label, n.x, n.y + 19);
      });
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return <canvas ref={cvRef} width={340} height={100} style={{ width: "100%", height: "100px", borderRadius: "10px" }} />;
}

/* ══════════════════════════════════════════════════════════════════
   EVENT ROW
══════════════════════════════════════════════════════════════════ */
function EventRow({ ev, idx }: { ev: TrafficEvent; idx: number }) {
  const col  = STATUS_COLOR[ev.status];
  const lat  = ev.latency ? `${ev.latency}ms` : (ev.status === "pending" || ev.status === "streaming") ? "..." : "–";
  const toks = ev.tokens ? `${ev.tokens}tk` : (ev.outputTokens ? `${ev.outputTokens}tk` : "–");
  const ts   = new Date(ev.startTime).toLocaleTimeString("en-US", { hour12: false });

  return (
    <motion.div
      key={ev.id}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ delay: idx * 0.02, duration: 0.22 }}
      style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "6px 10px", borderRadius: "8px",
        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
        overflow: "hidden",
      }}
    >
      <motion.div animate={ev.status === "streaming" ? { opacity: [1, 0.3, 1] } : { opacity: 1 }}
        transition={{ duration: 0.7, repeat: ev.status === "streaming" ? Infinity : 0 }}
        style={{ width: "6px", height: "6px", borderRadius: "50%", background: col, boxShadow: `0 0 6px ${col}`, flexShrink: 0 }} />
      <span style={{ fontSize: "7.5px", fontFamily: "monospace", fontWeight: 700, color: col, minWidth: "44px" }}>{STATUS_LABEL[ev.status]}</span>
      <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.55)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {ev.model}
      </span>
      <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", minWidth: "32px", textAlign: "right" }}>{lat}</span>
      <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(0,229,255,0.45)", minWidth: "36px", textAlign: "right" }}>{toks}</span>
      <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)" }}>{ts}</span>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   MAIN EXPORT
══════════════════════════════════════════════════════════════════ */
export function LiveOpsDashboard3D({ onClose }: { onClose: () => void }) {
  const [events, setEvents] = useState<TrafficEvent[]>(() => [...trafficBus.history]);
  const [latHist,  setLatHist]  = useState<number[]>(Array.from({length:20},()=>0));
  const [tokHist,  setTokHist]  = useState<number[]>(Array.from({length:20},()=>0));
  const [bpsIn,    setBpsIn]    = useState<number[]>(Array.from({length:20},()=>0));
  const statsRef = useRef({ totalCalls: 0, totalToks: 0, totalBytes: 0, errors: 0, avgLat: 0 });

  const updateStats = useCallback((events: TrafficEvent[]) => {
    const done = events.filter(e => e.status === "success" || e.status === "error");
    const lats = done.map(e => e.latency ?? 0).filter(Boolean);
    const avg  = lats.length > 0 ? lats.reduce((a, b) => a + b, 0) / lats.length : 0;
    statsRef.current = {
      totalCalls: events.length,
      totalToks:  events.reduce((s, e) => s + (e.tokens ?? 0), 0),
      totalBytes: events.reduce((s, e) => s + (e.bytesReceived ?? 0), 0),
      errors:     events.filter(e => e.status === "error").length,
      avgLat:     Math.round(avg),
    };
  }, []);

  useEffect(() => {
    const unsub = trafficBus.subscribe(ev => {
      setEvents(prev => {
        const idx = prev.findIndex(e => e.id === ev.id);
        const next = idx >= 0 ? prev.map((e, i) => i === idx ? ev : e) : [ev, ...prev].slice(0, 40);
        updateStats(next);
        return next;
      });
      if (ev.latency) setLatHist(p  => [...p.slice(1),  ev.latency!]);
      if (ev.tokens)  setTokHist(p  => [...p.slice(1),  ev.tokens!]);
      if (ev.bytesReceived) setBpsIn(p => [...p.slice(1), (ev.bytesReceived ?? 0) / 1024]);
    });
    return unsub;
  }, [updateStats]);

  const pending   = events.filter(e => e.status === "pending"   || e.status === "streaming").length;
  const successes = events.filter(e => e.status === "success").length;
  const errors    = events.filter(e => e.status === "error").length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.94 }}
      transition={{ duration: 0.30, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 9900,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.72)", backdropFilter: "blur(14px)",
      }}
      onClick={onClose}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        style={{
          width: "clamp(700px, 88vw, 980px)", maxHeight: "90vh",
          borderRadius: "18px", overflow: "hidden", display: "flex", flexDirection: "column",
          background: "linear-gradient(160deg,rgba(2,6,18,0.99) 0%,rgba(0,2,12,0.99) 100%)",
          border: "1px solid rgba(0,229,255,0.18)",
          boxShadow: "0 0 100px rgba(0,229,255,0.08),0 40px 100px rgba(0,0,0,0.98)",
        }}
      >
        <div style={{ height: "2px", background: "linear-gradient(90deg,transparent,#00e5ff,#8b5cf6,#00e5ff,transparent)" }} />

        {/* Header */}
        <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(0,229,255,0.08)", background: "rgba(2,6,20,0.6)", display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
            background: "radial-gradient(circle,rgba(0,229,255,0.22),rgba(0,0,0,0.9))", border: "1px solid rgba(0,229,255,0.32)",
            boxShadow: "0 0 24px rgba(0,229,255,0.30)" }}>
            <Activity style={{ width: "18px", height: "18px", color: "#00e5ff" }} />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "3px" }}>LIVE OPS DASHBOARD</div>
            <div style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(0,229,255,0.5)", letterSpacing: "2px", marginTop: "2px" }}>REAL-TIME WEBSOCKET OPERATIONS FEED</div>
          </div>
          <div style={{ flex: 1 }} />
          {[
            { label: "ACTIVE", value: pending, color: "#00e5ff", icon: Radio },
            { label: "SUCCESS", value: successes, color: "#22c55e", icon: CheckCircle },
            { label: "ERRORS", value: errors, color: "#e21227", icon: AlertTriangle },
            { label: "AVG LAT", value: `${statsRef.current.avgLat}ms`, color: "#f59e0b", icon: Clock },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} style={{ padding: "5px 12px", borderRadius: "10px", border: `1px solid ${color}28`, background: `${color}0a`, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                <Icon style={{ width: "8px", height: "8px", color: `${color}80` }} />
                <span style={{ fontSize: "7px", fontFamily: "monospace", color: `${color}70`, letterSpacing: "1px" }}>{label}</span>
              </div>
              <span style={{ fontSize: "15px", fontFamily: "monospace", fontWeight: 900, color, textShadow: `0 0 12px ${color}` }}>{value}</span>
            </div>
          ))}
          <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(226,18,39,0.06)", border: "1px solid rgba(226,18,39,0.2)",
            color: "rgba(255,255,255,0.45)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X style={{ width: "14px", height: "14px" }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", padding: "14px 18px", gap: "14px" }}>
          {/* Network flow + stats row */}
          <div style={{ display: "flex", gap: "14px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "7.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(0,229,255,0.45)", letterSpacing: "2px", marginBottom: "8px" }}>NETWORK TOPOLOGY</div>
              <NetworkFlowCanvas events={events} />
            </div>
            <div style={{ width: "220px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div>
                <div style={{ fontSize: "7.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(0,229,255,0.45)", letterSpacing: "2px", marginBottom: "6px" }}>LATENCY TREND (ms)</div>
                <Sparkline data={latHist} color="#00e5ff" w={220} h={30} />
              </div>
              <div>
                <div style={{ fontSize: "7.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(139,92,246,0.5)", letterSpacing: "2px", marginBottom: "6px" }}>TOKEN THROUGHPUT</div>
                <Sparkline data={tokHist} color="#8b5cf6" w={220} h={30} />
              </div>
              <div>
                <div style={{ fontSize: "7.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(34,197,94,0.5)", letterSpacing: "2px", marginBottom: "6px" }}>BANDWIDTH (KB/s)</div>
                <Sparkline data={bpsIn} color="#22c55e" w={220} h={30} />
              </div>
            </div>
          </div>

          {/* Meta stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
            {[
              { icon: Zap, label: "Total Calls", value: statsRef.current.totalCalls, color: "#00e5ff" },
              { icon: TrendingUp, label: "Total Tokens", value: (statsRef.current.totalToks / 1000).toFixed(1) + "K", color: "#8b5cf6" },
              { icon: Database, label: "Data Recv", value: (statsRef.current.totalBytes / 1024).toFixed(0) + "KB", color: "#22c55e" },
              { icon: Server, label: "Providers", value: new Set(events.map(e => e.provider)).size, color: "#f59e0b" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} style={{ padding: "8px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Icon style={{ width: "12px", height: "12px", color: `${color}80`, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", letterSpacing: "1px" }}>{label}</div>
                  <div style={{ fontSize: "12px", fontFamily: "monospace", fontWeight: 900, color }}>{value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Event list */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
              <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.8, repeat: Infinity }}
                style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
              <span style={{ fontSize: "7.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(0,229,255,0.5)", letterSpacing: "2px" }}>LIVE EVENT LOG</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>STATUS · MODEL · LATENCY · TOKENS · TIME</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }} className="scrollbar-cyber">
              <AnimatePresence mode="popLayout">
                {events.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    style={{ padding: "32px", textAlign: "center" }}>
                    <Wifi style={{ width: "24px", height: "24px", color: "rgba(255,255,255,0.08)", margin: "0 auto 8px" }} />
                    <p style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)" }}>
                      Waiting for API calls... Send a message to see live ops.
                    </p>
                  </motion.div>
                ) : events.map((ev, idx) => (
                  <EventRow key={ev.id} ev={ev} idx={idx} />
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div style={{ padding: "7px 18px", borderTop: "1px solid rgba(0,229,255,0.06)", background: "rgba(2,6,20,0.7)", display: "flex", alignItems: "center", gap: "8px" }}>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
          <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>
            CONNECTED · trafficBus WebSocket feed · {events.length} events buffered
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}
