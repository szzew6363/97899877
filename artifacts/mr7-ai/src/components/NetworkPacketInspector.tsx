import { useCallback, useEffect, useRef, useState } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, ChevronDown, ChevronUp, Wifi, Lock, Globe,
  Filter, Trash2, Download, Search, Eye, Zap, Circle, Square
} from "lucide-react";
import { trafficBus, type TrafficEvent } from "@/lib/trafficBus";

/* ═══════════════════════════════════════════════════════════════════════
   PACKET INSPECTOR — Ultra 3D Holographic Packet Analyzer v2
   3D flow canvas · Hex dump · ASCII decode · Timing waterfall
═══════════════════════════════════════════════════════════════════════ */

const PANEL_W = 700;
const CW = PANEL_W; const CH = 130;

function toHexDump(str: string, maxBytes = 256): { offset: string; hex: string[]; ascii: string }[] {
  const bytes: number[] = [];
  for (let i = 0; i < Math.min(str.length, maxBytes * 2); i++) {
    bytes.push(str.charCodeAt(i) & 0xff);
  }
  const rows: { offset: string; hex: string[]; ascii: string }[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const hex = chunk.map(b => b.toString(16).padStart(2, "0"));
    const ascii = chunk.map(b => (b >= 0x20 && b < 0x7f) ? String.fromCharCode(b) : ".").join("");
    rows.push({ offset: i.toString(16).padStart(4, "0"), hex, ascii });
  }
  return rows;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}:${d.getSeconds().toString().padStart(2,"0")}.${d.getMilliseconds().toString().padStart(3,"0")}`;
}

function statusColor(status: TrafficEvent["status"]): string {
  return status === "success" ? "#22c55e" : status === "error" ? "#e21227" :
         status === "streaming" ? "#f59e0b" : "#00e5ff";
}

function shortModel(m: string): string {
  return m.replace("CHAT-GPT ", "GPT-").replace("gpt-", "GPT-").slice(0, 16);
}

interface HexByte { row: number; col: number }

// Flow diagram nodes for the 3D pipeline visualization
interface FlowNode { x: number; y: number; label: string; color: string; icon: string }
const FLOW_NODES: FlowNode[] = [
  { x: 55,  y: CH/2, label: "CLIENT",   color: "#00e5ff", icon: "C" },
  { x: 175, y: CH/2, label: "WAF/IDS",  color: "#22c55e", icon: "W" },
  { x: 305, y: CH/2, label: "API-GW",   color: "#a78bfa", icon: "A" },
  { x: 435, y: CH/2, label: "AI-MODEL", color: "#f59e0b", icon: "M" },
  { x: 545, y: CH/2, label: "TLS-RESP", color: "#00e5ff", icon: "R" },
  { x: 650, y: CH/2, label: "CLIENT",   color: "#22c55e", icon: "C" },
];

interface FlowPkt { nodeFrom: number; nodeTo: number; t: number; color: string; size: number }

export function NetworkPacketInspector() {
  const [collapsed,  setCollapsed]  = useState(false);
  const { pos, rootRef, onDragMouseDown, onDragTouchStart } = useDraggable(
    "mr7-packet-inspector-pos",
    { x: Math.max(0, (window.innerWidth - PANEL_W) / 2), y: 120 }
  );
  const [packets,      setPackets]      = useState<TrafficEvent[]>([]);
  const [selected,     setSelected]     = useState<TrafficEvent | null>(null);
  const [filter,       setFilter]       = useState("");
  const [capturing,    setCapturing]    = useState(true);
  const [hoveredByte,  setHoveredByte]  = useState<HexByte | null>(null);
  const [showDetail,   setShowDetail]   = useState(true);
  const [capturedCount,setCapturedCount]= useState(0);
  const captureRef = useRef(true);
  const listRef    = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const frameRef   = useRef<number>(0);
  const tickRef    = useRef(0);
  const pktsFlowRef= useRef<FlowPkt[]>([]);
  const lastEventRef= useRef<TrafficEvent|null>(null);

  useEffect(() => { captureRef.current = capturing; }, [capturing]);

  useEffect(() => {
    const unsub = trafficBus.subscribe(ev => {
      if (!captureRef.current) return;
      setPackets([...trafficBus.history]);
      setCapturedCount(c => (ev.status === "pending" ? c + 1 : c));
      setSelected(prev => prev?.id === ev.id ? ev : prev);
      lastEventRef.current = ev;
      if (autoScroll.current && listRef.current) {
        setTimeout(() => { if (listRef.current) listRef.current.scrollTop = 0; }, 30);
      }
      // Spawn flow packets
      const c = statusColor(ev.status);
      pktsFlowRef.current.push({ nodeFrom: 0, nodeTo: 1, t: 0, color: c, size: 5 });
      pktsFlowRef.current.push({ nodeFrom: 1, nodeTo: 2, t: 0.2, color: "#22c55e", size: 4 });
      pktsFlowRef.current.push({ nodeFrom: 2, nodeTo: 3, t: 0.4, color: "#a78bfa", size: 4 });
      pktsFlowRef.current.push({ nodeFrom: 3, nodeTo: 4, t: 0.6, color: "#f59e0b", size: 5 });
      pktsFlowRef.current.push({ nodeFrom: 4, nodeTo: 5, t: 0.8, color: c,         size: 4 });
    });
    return unsub;
  }, []);

  // 3D packet pipeline canvas
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;

    function frame() {
      frameRef.current = requestAnimationFrame(frame);
      const t = tickRef.current++;
      ctx.clearRect(0, 0, CW, CH);

      // Background
      ctx.fillStyle = "rgba(1,4,16,0.98)"; ctx.fillRect(0, 0, CW, CH);

      // Grid
      ctx.strokeStyle = "rgba(0,229,255,0.03)"; ctx.lineWidth = 0.5;
      for (let gx = 0; gx < CW; gx += 40) { ctx.beginPath(); ctx.moveTo(gx,0); ctx.lineTo(gx,CH); ctx.stroke(); }
      for (let gy = 0; gy < CH; gy += 20) { ctx.beginPath(); ctx.moveTo(0,gy); ctx.lineTo(CW,gy); ctx.stroke(); }

      // Connection lines between flow nodes
      for (let i = 0; i < FLOW_NODES.length - 1; i++) {
        const n1 = FLOW_NODES[i]; const n2 = FLOW_NODES[i+1];
        const g = ctx.createLinearGradient(n1.x, n1.y, n2.x, n2.y);
        g.addColorStop(0, n1.color + "44"); g.addColorStop(1, n2.color + "44");
        ctx.beginPath(); ctx.moveTo(n1.x, n1.y); ctx.lineTo(n2.x, n2.y);
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.stroke();

        // Continuous ambient flow dots
        const tp = ((t * 0.007 + i * 0.18) % 1);
        const px = n1.x + (n2.x - n1.x) * tp;
        const py = n1.y + (n2.y - n1.y) * tp;
        ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI*2);
        ctx.fillStyle = n1.color + "88"; ctx.fill();
      }

      // Animated event packets
      pktsFlowRef.current = pktsFlowRef.current.filter(p => p.t <= 1.05);
      pktsFlowRef.current.forEach(p => {
        const n1 = FLOW_NODES[p.nodeFrom]; const n2 = FLOW_NODES[p.nodeTo];
        if (!n1 || !n2) return;
        const tp = Math.min(1, p.t);
        const px = n1.x + (n2.x - n1.x) * tp;
        const py = n1.y + (n2.y - n1.y) * tp;
        // Trail
        for (let ti = 0; ti < 6; ti++) {
          const tpt = Math.max(0, p.t - ti * 0.05);
          const tpx = n1.x + (n2.x - n1.x) * tpt;
          const tpy = n1.y + (n2.y - n1.y) * tpt;
          ctx.beginPath(); ctx.arc(tpx, tpy, p.size * (1 - ti/6) * 0.6, 0, Math.PI*2);
          ctx.fillStyle = p.color; ctx.globalAlpha = (1 - ti/6) * 0.5; ctx.fill();
        }
        ctx.globalAlpha = 1;
        const pg = ctx.createRadialGradient(px,py,0,px,py,p.size*2);
        pg.addColorStop(0,"rgba(255,255,255,0.95)"); pg.addColorStop(0.4,p.color); pg.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px,py,p.size*2,0,Math.PI*2); ctx.fill();
        p.t += 0.016;
      });

      // Draw flow nodes
      FLOW_NODES.forEach((n, i) => {
        const pulse = (Math.sin(t * 0.04 + i * 1.2) + 1) / 2;
        // Outer glow
        const glw = ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,22);
        glw.addColorStop(0, n.color + "33"); glw.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle = glw; ctx.beginPath(); ctx.arc(n.x,n.y,22,0,Math.PI*2); ctx.fill();
        // Pulse ring
        ctx.beginPath(); ctx.arc(n.x,n.y,13+pulse*4,0,Math.PI*2);
        ctx.strokeStyle=n.color; ctx.globalAlpha=0.25*pulse; ctx.lineWidth=1; ctx.stroke();
        ctx.globalAlpha=1;
        // Core
        const cg = ctx.createRadialGradient(n.x-4,n.y-4,0,n.x,n.y,12);
        cg.addColorStop(0,"#fff"); cg.addColorStop(0.4,n.color); cg.addColorStop(1,n.color+"55");
        ctx.fillStyle=cg; ctx.beginPath(); ctx.arc(n.x,n.y,12,0,Math.PI*2); ctx.fill();
        // Icon
        ctx.fillStyle="#fff"; ctx.font="bold 8px monospace"; ctx.textAlign="center";
        ctx.globalAlpha=0.9; ctx.fillText(n.icon,n.x,n.y+3); ctx.globalAlpha=1;
        // Label
        ctx.fillStyle=n.color; ctx.font="bold 7px monospace"; ctx.textAlign="center";
        ctx.fillText(n.label,n.x,n.y+22);
        // Stage number
        ctx.fillStyle="#333"; ctx.font="7px monospace";
        ctx.fillText(`S${i+1}`,n.x,n.y-18);
      });

      // Scan line
      const sy = ((t * 0.4) % CH);
      const sg = ctx.createLinearGradient(0,sy-5,0,sy+5);
      sg.addColorStop(0,"rgba(0,229,255,0)"); sg.addColorStop(0.5,"rgba(0,229,255,0.04)"); sg.addColorStop(1,"rgba(0,229,255,0)");
      ctx.fillStyle=sg; ctx.fillRect(0,sy-5,CW,10);

      // Corner HUD
      ctx.fillStyle="rgba(0,229,255,0.4)"; ctx.font="bold 7.5px monospace"; ctx.textAlign="left";
      ctx.fillText(`PKTS: ${capturedCount}  HIST: ${packets.length}  ${capturing?"CAP":"IDLE"}`,4,CH-4);
    }
    frame();
    return () => cancelAnimationFrame(frameRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capturedCount, packets.length, capturing]);

  const displayed = filter
    ? packets.filter(p => (p.model??p.provider??"").toLowerCase().includes(filter.toLowerCase()))
    : packets;

  const hexDump = selected?.model
    ? toHexDump(selected.model + (selected.provider ?? ""), 64)
    : [];

  return (
    <div ref={rootRef} style={{ left: pos.x, top: pos.y, width: PANEL_W }} className="fixed z-[96] select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-[#1f1f1f] overflow-hidden shadow-[0_0_30px_rgba(0,229,255,0.12)]"
        style={{ width: PANEL_W, background: "rgba(1,4,16,0.97)", backdropFilter: "blur(20px)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 cursor-grab border-b border-[#1f1f1f]"
          onMouseDown={onDragMouseDown} onTouchStart={onDragTouchStart}
        >
          <Package size={11} className="text-[#00e5ff]" />
          <span className="text-[10px] font-mono font-bold tracking-[2px] text-[#00e5ff]">PACKET INSPECTOR</span>
          <div className="mx-2 flex-1 max-w-[160px] relative">
            <Search size={9} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="filter..."
              className="w-full bg-[#111] border border-[#333] rounded text-[9px] font-mono text-white pl-5 pr-2 py-0.5 focus:outline-none focus:border-[#00e5ff]"
            />
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              onClick={() => setCapturing(c => !c)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono ${capturing ? "text-[#22c55e] border border-[#22c55e]" : "text-[#555] border border-[#333]"}`}
            >
              {capturing ? <Circle size={9} fill="#22c55e" /> : <Square size={9} />}
              {capturing ? "CAP" : "PAUSED"}
            </button>
            <button onClick={() => { setPackets([]); setSelected(null); setCapturedCount(0); }} title="Clear" className="text-[#555] hover:text-[#e21227]">
              <Trash2 size={11} />
            </button>
            <span className="text-[9px] font-mono text-[#555]">{capturedCount}</span>
            <button onClick={() => setCollapsed(c => !c)} className="text-[#555] hover:text-white">
              {collapsed ? <ChevronDown size={11} /> : <ChevronUp size={11} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              {/* 3D Pipeline canvas */}
              <canvas ref={canvasRef} width={CW} height={CH} className="block w-full border-b border-[#1a1a1a]" />

              {/* Packet list + detail split */}
              <div className="flex" style={{ height: showDetail ? 280 : 160 }}>
                {/* List */}
                <div ref={listRef} className="flex-1 overflow-y-auto border-r border-[#1a1a1a] min-w-0">
                  <div className="sticky top-0 flex gap-1 px-2 py-1 bg-[#0a0a0a] border-b border-[#1a1a1a] text-[8px] font-mono text-[#555]">
                    <span className="w-20 shrink-0">TIME</span>
                    <span className="w-14 shrink-0">PROTO</span>
                    <span className="flex-1">MODEL</span>
                    <span className="w-14 shrink-0 text-right">LATENCY</span>
                    <span className="w-10 shrink-0 text-right">TKN</span>
                    <span className="w-8 shrink-0 text-right">ST</span>
                  </div>
                  {displayed.slice(0, 60).map((ev, i) => (
                    <div
                      key={ev.id}
                      onClick={() => { setSelected(ev); setShowDetail(true); }}
                      className={`flex items-center gap-1 px-2 py-1 text-[8px] font-mono cursor-pointer border-b border-[#0d0d0d] transition-colors ${
                        selected?.id === ev.id ? "bg-[#111]" : "hover:bg-[#0d0d0d]"
                      }`}
                    >
                      <span className="w-20 text-[#555] shrink-0 font-mono">{formatTime(ev.startTime)}</span>
                      <div className="w-14 shrink-0 flex items-center gap-1">
                        <Lock size={7} className="text-[#22c55e]" />
                        <span className="text-[#22c55e]">TLS</span>
                      </div>
                      <span className="flex-1 truncate" style={{ color: statusColor(ev.status) }}>
                        {shortModel(ev.model ?? ev.provider ?? "?")}
                      </span>
                      <span className="w-14 text-right" style={{ color: ev.latency ? (ev.latency < 1000 ? "#22c55e" : ev.latency < 3000 ? "#f59e0b" : "#e21227") : "#555" }}>
                        {ev.latency ? `${ev.latency}ms` : "—"}
                      </span>
                      <span className="w-10 text-right text-[#555]">{ev.tokens ?? 0}</span>
                      <span className="w-8 text-right" style={{ color: statusColor(ev.status) }}>
                        {ev.status.slice(0,3).toUpperCase()}
                      </span>
                    </div>
                  ))}
                  {displayed.length === 0 && (
                    <div className="text-center py-6 text-[9px] font-mono text-[#333]">NO PACKETS — START A CHAT</div>
                  )}
                </div>

                {/* Detail pane */}
                {showDetail && selected && (
                  <div className="w-[330px] shrink-0 overflow-y-auto">
                    {/* Header info */}
                    <div className="px-2 py-1.5 border-b border-[#1a1a1a]">
                      <div className="flex items-center gap-2 text-[9px] font-mono mb-1">
                        <Lock size={8} className="text-[#22c55e]" /><span className="text-[#22c55e]">TLS 1.3</span>
                        <span className="text-[#555]">·</span>
                        <Globe size={8} className="text-[#00e5ff]" />
                        <span className="text-[#555]">{selected.provider ?? "—"}</span>
                        <span className="ml-auto" style={{ color: statusColor(selected.status) }}>
                          {selected.status.toUpperCase()}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[8px] font-mono">
                        {[
                          ["MODEL",    shortModel(selected.model ?? "?")],
                          ["LATENCY",  selected.latency ? `${selected.latency}ms` : "—"],
                          ["TOKENS",   String(selected.tokens ?? 0)],
                          ["START",    formatTime(selected.startTime)],
                          ["PROVIDER", selected.provider ?? "—"],
                          ["SESSION",  selected.id.slice(-8)],
                        ].map(([k,v])=>(
                          <div key={k} className="flex gap-1">
                            <span className="text-[#444] w-14 shrink-0">{k}:</span>
                            <span className="text-[#888] truncate">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Hex dump */}
                    {hexDump.length > 0 && (
                      <div className="px-2 py-1.5">
                        <div className="text-[8px] font-mono text-[#333] mb-1 flex items-center gap-1">
                          <span>HEX DUMP</span>
                          <span className="text-[#555]">— payload bytes</span>
                        </div>
                        {hexDump.slice(0, 10).map((row, ri) => (
                          <div key={ri} className="flex gap-2 text-[8px] font-mono">
                            <span className="text-[#444] w-8 shrink-0">{row.offset}</span>
                            <span className="flex gap-0.5 flex-1">
                              {row.hex.map((b, bi) => (
                                <span
                                  key={bi}
                                  className="cursor-pointer transition-colors w-[14px] text-center"
                                  style={{
                                    color: hoveredByte?.row === ri && hoveredByte.col === bi ? "#fff" : "#555",
                                    background: hoveredByte?.row === ri && hoveredByte.col === bi ? "#e21227" : undefined,
                                  }}
                                  onMouseEnter={() => setHoveredByte({ row: ri, col: bi })}
                                  onMouseLeave={() => setHoveredByte(null)}
                                >
                                  {b}
                                </span>
                              ))}
                            </span>
                            <span className="text-[#333] shrink-0 tracking-tighter">{row.ascii}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Timing bar */}
                    {selected.latency && (
                      <div className="px-2 py-1.5 border-t border-[#1a1a1a]">
                        <div className="text-[8px] font-mono text-[#333] mb-1">TIMING</div>
                        <div className="h-2 bg-[#0d0d0d] rounded overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, (selected.latency / 5000) * 100)}%` }}
                            transition={{ duration: 0.4 }}
                            className="h-full rounded"
                            style={{
                              background: selected.latency < 1000
                                ? "linear-gradient(90deg,#22c55e,#10b981)"
                                : selected.latency < 3000
                                ? "linear-gradient(90deg,#f59e0b,#d97706)"
                                : "linear-gradient(90deg,#e21227,#dc2626)"
                            }}
                          />
                        </div>
                        <div className="text-[8px] font-mono text-[#555] mt-0.5">{selected.latency}ms end-to-end</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
