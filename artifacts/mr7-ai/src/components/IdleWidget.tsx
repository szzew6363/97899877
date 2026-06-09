import { useEffect, useRef, useState } from "react";
import { trafficBus } from "@/lib/trafficBus";

/* ═══════════════════════════════════════════════════════════════════════
   IDLE / ACTIVITY TRACKER — Ultra 3D Holographic Session Monitor v1
   Real-time activity bars · Session timer · Event heatmap · AI rate
═══════════════════════════════════════════════════════════════════════ */

const W = 340; const H = 130;

function pad(n: number) { return String(Math.floor(n)).padStart(2, "0"); }
function fmtElapsed(ms: number) {
  const s = ms / 1000;
  return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
}

interface ActivityBucket { ts: number; level: number }

export function IdleWidget({ embedded = false }: { embedded?: boolean } = {}) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const frameRef     = useRef<number>(0);
  const tickRef      = useRef(0);
  const startTime    = useRef(Date.now());
  const activityRef  = useRef<ActivityBucket[]>([]);   // last 60 buckets × 1s each
  const currentActivity = useRef(0);                    // events in current second
  const mouseMoves   = useRef(0);
  const keystrokes   = useRef(0);
  const clicks       = useRef(0);
  const lastActivity = useRef(Date.now());
  const [elapsed, setElapsed]   = useState(0);
  const [isIdle, setIsIdle]     = useState(false);
  const [queryCount, setQueryCount] = useState(0);

  // Track user activity
  useEffect(() => {
    function onMove()  { mouseMoves.current++; currentActivity.current += 1; lastActivity.current = Date.now(); }
    function onKey()   { keystrokes.current++; currentActivity.current += 3; lastActivity.current = Date.now(); }
    function onClick() { clicks.current++;     currentActivity.current += 2; lastActivity.current = Date.now(); }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  // Bucket timer — push activity bucket every 500ms
  useEffect(() => {
    const iv = setInterval(() => {
      const lvl = Math.min(100, currentActivity.current * 4);
      activityRef.current.push({ ts: Date.now(), level: lvl });
      if (activityRef.current.length > 60) activityRef.current.shift();
      currentActivity.current = 0;
      setElapsed(Date.now() - startTime.current);
      setIsIdle(Date.now() - lastActivity.current > 5000);
      setQueryCount(trafficBus.history.length);
    }, 500);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;

    function frame() {
      frameRef.current = requestAnimationFrame(frame);
      const t = tickRef.current++;
      ctx.clearRect(0, 0, W, H);

      // Background
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, W * 0.6);
      bg.addColorStop(0, "rgba(4,10,22,1)");
      bg.addColorStop(1, "rgba(0,2,8,1)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Grid
      ctx.strokeStyle = "rgba(168,85,247,0.04)"; ctx.lineWidth = 0.5;
      for (let gx = 0; gx < W; gx += 30) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
      for (let gy = 0; gy < H; gy += 20) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

      // ── Activity bars ──
      const buckets = activityRef.current;
      const barW = (W * 0.72) / 60;
      const barMaxH = H - 40;
      const barBaseX = 4;
      const barBaseY = H - 18;

      for (let i = 0; i < 60; i++) {
        const b = buckets[i];
        const lvl = b ? b.level / 100 : 0;
        const bh = Math.max(1, lvl * barMaxH);
        const bx = barBaseX + i * barW;
        const idle = lvl < 0.05;
        const color = idle ? "#333" : lvl > 0.7 ? "#e21227" : lvl > 0.35 ? "#f59e0b" : "#22c55e";
        const alpha = idle ? 0.3 : 0.6 + lvl * 0.4;

        // Bar
        ctx.globalAlpha = alpha;
        ctx.fillStyle = color;
        ctx.fillRect(bx + 0.5, barBaseY - bh, barW - 1, bh);

        // Glow on recent bars
        if (i >= 55 && lvl > 0.1) {
          ctx.globalAlpha = lvl * 0.3;
          ctx.shadowColor = color; ctx.shadowBlur = 8;
          ctx.fillRect(bx, barBaseY - bh, barW, bh);
          ctx.shadowBlur = 0;
        }
        ctx.globalAlpha = 1;
      }

      // Baseline
      ctx.beginPath(); ctx.moveTo(barBaseX, barBaseY + 1); ctx.lineTo(barBaseX + W * 0.72, barBaseY + 1);
      ctx.strokeStyle = "rgba(255,255,255,0.1)"; ctx.lineWidth = 0.5; ctx.stroke();

      // ── Right panel: big metrics ──
      const rx = W * 0.76;

      // Elapsed time
      const el = fmtElapsed(Date.now() - startTime.current);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "bold 7px monospace"; ctx.textAlign = "left";
      ctx.fillText("SESSION", rx, 18);
      ctx.fillStyle = "#00e5ff";
      ctx.font = `bold ${el.length > 7 ? 11 : 12}px monospace`;
      ctx.fillText(el, rx, 33);

      // AI Queries
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "bold 7px monospace";
      ctx.fillText("QUERIES", rx, 55);
      ctx.fillStyle = "#e21227";
      ctx.font = "bold 18px monospace";
      ctx.fillText(String(queryCount), rx, 73);

      // Keystrokes
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "bold 7px monospace";
      ctx.fillText("KEYSTROKES", rx, 92);
      ctx.fillStyle = "#a855f7";
      ctx.font = "bold 14px monospace";
      ctx.fillText(String(keystrokes.current), rx, 107);

      // ── Status indicator (ACTIVE / IDLE) ──
      const idle = Date.now() - lastActivity.current > 5000;
      const statusColor = idle ? "#f59e0b" : "#22c55e";
      const pulse = (Math.sin(t * (idle ? 0.03 : 0.08)) + 1) / 2;

      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(barBaseX + W * 0.72 + 14, barBaseY - 6, 4 + pulse * 2, 0, Math.PI * 2);
      ctx.fillStyle = statusColor;
      ctx.fill();
      ctx.globalAlpha = pulse * 0.4;
      ctx.beginPath(); ctx.arc(barBaseX + W * 0.72 + 14, barBaseY - 6, 9 + pulse * 3, 0, Math.PI * 2);
      ctx.fillStyle = statusColor;
      ctx.fill();
      ctx.globalAlpha = 1;

      ctx.fillStyle = statusColor;
      ctx.font = "bold 7px monospace"; ctx.textAlign = "left";
      ctx.fillText(idle ? "IDLE" : "ACTIVE", barBaseX + W * 0.72 + 22, barBaseY - 3);

      // HUD label
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.font = "6px monospace"; ctx.textAlign = "left";
      ctx.fillText("ACTIVITY — LAST 30s", 4, H - 5);

      // Scan line
      const scanY = ((t * 0.4) % H);
      const sg = ctx.createLinearGradient(0, scanY - 3, 0, scanY + 3);
      sg.addColorStop(0, "rgba(168,85,247,0)");
      sg.addColorStop(0.5, "rgba(168,85,247,0.05)");
      sg.addColorStop(1, "rgba(168,85,247,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, scanY - 3, W, 6);
    }

    frame();
    return () => cancelAnimationFrame(frameRef.current);
  }, [queryCount]);

  // Extra stats row
  const statRow = (
    <div style={{ display: "flex", gap: "0", borderTop: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
      {[
        { label: "MOUSE MOVES", val: mouseMoves.current, color: "#00e5ff" },
        { label: "CLICKS", val: clicks.current, color: "#22c55e" },
        { label: "IDLE TIME", val: isIdle ? "NOW" : "—", color: "#f59e0b" },
      ].map(({ label, val, color }) => (
        <div key={label} style={{ flex: 1, padding: "5px 8px", borderRight: "1px solid rgba(255,255,255,0.04)", textAlign: "center" }}>
          <div style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "0.5px" }}>{label}</div>
          <div style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, color }}>{val}</div>
        </div>
      ))}
    </div>
  );

  const content = (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", background: "rgba(4,10,22,0.98)" }}>
      <canvas ref={canvasRef} width={W} height={H} style={{ width: "100%", display: "block", flexShrink: 0 }} />
      {statRow}
    </div>
  );

  if (embedded) return content;

  return (
    <div style={{ width: W, background: "rgba(4,10,22,0.98)", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(168,85,247,0.2)" }}>
      {content}
    </div>
  );
}
