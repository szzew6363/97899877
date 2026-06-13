import { useEffect, useRef, useState, useCallback } from "react";
import { X, ShieldAlert } from "lucide-react";
import { threatFeed, SEVERITY_COLOR, type ThreatEntry } from "@/lib/threat-feed";

const H = 46;

type DrawItem = { entry: ThreatEntry; x: number; width: number };

function measureItem(ctx: CanvasRenderingContext2D, e: ThreatEntry): number {
  const badge = ` ${e.severity} `;
  const text = `  ${e.cveId}  ·  ${e.title}  ·  CVSS ${e.score.toFixed(1)}  `;
  ctx.font = "bold 10px monospace";
  const bw = ctx.measureText(badge).width + 10;
  ctx.font = "11px monospace";
  const tw = ctx.measureText(text).width;
  return bw + tw + 60;
}

function drawItem(ctx: CanvasRenderingContext2D, e: ThreatEntry, x: number, h: number, t: number) {
  const col = SEVERITY_COLOR[e.severity];
  const badge = ` ${e.severity} `;
  const text = `  ${e.cveId}  ·  ${e.title}  ·  CVSS ${e.score.toFixed(1)}  `;
  const pulse = 0.7 + Math.sin(t * 3 + (e.cveId.charCodeAt(5) ?? 0)) * 0.3;

  ctx.save();
  ctx.font = "bold 10px monospace";
  const bw = ctx.measureText(badge).width + 10;
  const by = h / 2 - 8;

  const bg = ctx.createLinearGradient(x + 4, 0, x + bw + 4, 0);
  bg.addColorStop(0, col + "cc");
  bg.addColorStop(1, col + "99");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.rect(x + 4, by, bw, 16);
  ctx.fill();

  ctx.fillStyle = "#000";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(badge, x + 9, by + 8);

  ctx.font = "11px monospace";
  ctx.fillStyle = col;
  ctx.shadowColor = col;
  ctx.shadowBlur = e.isNew ? 10 * pulse : 4;
  ctx.fillText(text, x + bw + 8, h / 2);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = col + "44";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x + bw + ctx.measureText(text).width + 14, h / 2);
  ctx.lineTo(x + bw + ctx.measureText(text).width + 34, h / 2);
  ctx.stroke();
  ctx.fillStyle = col + "66";
  ctx.fillText(" ◆ ", x + bw + ctx.measureText(text).width + 34, h / 2);

  ctx.restore();
}

function drawCanvas(canvas: HTMLCanvasElement, items: DrawItem[], t: number) {
  const ctx = canvas.getContext("2d")!;
  if (!ctx) return;
  const W = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, W, h);

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "rgba(4,3,8,0.97)");
  bg.addColorStop(1, "rgba(8,2,4,0.98)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, h);

  ctx.strokeStyle = "rgba(226,18,39,0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(W, 0);
  ctx.stroke();

  ctx.strokeStyle = "rgba(167,139,250,0.15)";
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, h - 1);
  ctx.lineTo(W, h - 1);
  ctx.stroke();

  const labelW = 86;
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(0, 0, labelW, h);
  ctx.strokeStyle = "rgba(226,18,39,0.6)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(labelW, 0);
  ctx.lineTo(labelW, h);
  ctx.stroke();
  const scanPulse = 0.8 + Math.sin(t * 2) * 0.2;
  ctx.fillStyle = `rgba(226,18,39,${scanPulse})`;
  ctx.font = "bold 9px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("THREAT", labelW / 2, h / 2 - 7);
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "7px monospace";
  ctx.fillText("INTEL FEED", labelW / 2, h / 2 + 5);

  ctx.save();
  ctx.beginPath();
  ctx.rect(labelW + 1, 0, W - labelW - 1, h);
  ctx.clip();

  items.forEach(({ entry, x }) => {
    if (x + 400 < labelW || x > W) return;
    drawItem(ctx, entry, x, h, t);
  });

  const fg = ctx.createLinearGradient(labelW + 1, 0, labelW + 30, 0);
  fg.addColorStop(0, "rgba(4,3,8,0.97)");
  fg.addColorStop(1, "rgba(4,3,8,0)");
  ctx.fillStyle = fg;
  ctx.fillRect(labelW + 1, 0, 30, h);

  const rfg = ctx.createLinearGradient(W - 30, 0, W, 0);
  rfg.addColorStop(0, "rgba(4,3,8,0)");
  rfg.addColorStop(1, "rgba(4,3,8,0.95)");
  ctx.fillStyle = rfg;
  ctx.fillRect(W - 30, 0, 30, h);

  ctx.restore();
}

export function ThreatFeed3D({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const scrollXRef = useRef(0);
  const itemsRef = useRef<DrawItem[]>([]);
  const feedRef = useRef<ThreatEntry[]>([]);
  const speedRef = useRef(1.2);
  const [newAlert, setNewAlert] = useState<ThreatEntry | null>(null);

  const rebuildItems = useCallback((entries: ThreatEntry[], startX: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    if (!ctx) return;
    let x = startX;
    itemsRef.current = entries.map((entry) => {
      const width = measureItem(ctx, entry);
      const item = { entry, x, width };
      x += width;
      return item;
    });
  }, []);

  useEffect(() => {
    threatFeed.start();
    feedRef.current = [...threatFeed.getFeed()];
    const unsub = threatFeed.subscribe((entry) => {
      feedRef.current.unshift({ ...entry, isNew: true });
      setNewAlert(entry);
      setTimeout(() => setNewAlert(null), 4000);
    });
    return () => { unsub(); threatFeed.stop(); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = H;
      rebuildItems(feedRef.current, scrollXRef.current);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const tick = () => {
      tRef.current += 0.016;
      scrollXRef.current -= speedRef.current;

      const items = itemsRef.current;
      items.forEach((item) => { item.x -= speedRef.current; });

      if (items.length > 0) {
        const last = items[items.length - 1];
        const W = canvas.offsetWidth;
        if (last.x + last.width < W) {
          const first = items[0];
          const nextX = last.x + last.width + 10;
          const nextEntry = feedRef.current[items.length % feedRef.current.length] ?? first.entry;
          const ctx = canvas.getContext("2d")!;
          const nextWidth = ctx ? measureItem(ctx, nextEntry) : 300;
          items.push({ entry: nextEntry, x: nextX, width: nextWidth });
        }
        if (items.length > 0 && items[0].x + items[0].width < 86) {
          items.shift();
        }
      } else {
        rebuildItems(feedRef.current, 100);
      }

      if (canvas) drawCanvas(canvas, items, tRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    setTimeout(() => {
      rebuildItems(feedRef.current, 100);
      rafRef.current = requestAnimationFrame(tick);
    }, 100);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [rebuildItems]);

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9990,
      height: H, display: "flex", flexDirection: "column",
      filter: "drop-shadow(0 -4px 20px rgba(226,18,39,0.15))",
    }}>
      {newAlert && (
        <div style={{
          position: "absolute", bottom: H + 4, right: 80,
          background: "rgba(226,18,39,0.95)", color: "#fff",
          fontSize: 10, fontFamily: "monospace", padding: "4px 10px",
          borderRadius: 4, border: "1px solid rgba(255,255,255,0.2)",
          animation: "fadeSlideUp 0.3s ease",
          pointerEvents: "none", whiteSpace: "nowrap",
          boxShadow: "0 0 20px rgba(226,18,39,0.5)",
        }}>
          NEW THREAT: {newAlert.cveId} · {newAlert.severity} · CVSS {newAlert.score.toFixed(1)}
        </div>
      )}
      <canvas ref={canvasRef} style={{ width: "100%", height: H, display: "block" }} />
      <button onClick={onClose} style={{
        position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
        background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.4)",
        borderRadius: 4, color: "rgba(255,255,255,0.5)", cursor: "pointer",
        width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center",
        padding: 0,
      }}>
        <X size={10} />
      </button>
    </div>
  );
}

export function ThreatFeedButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 p-2 rounded-lg transition-colors ${active ? "text-[#e21227] bg-[#e21227]/15 ring-1 ring-[#e21227]/40" : "text-muted-foreground hover:text-[#e21227] hover:bg-[#e21227]/10"}`}
      aria-label="Threat Intelligence Feed 3D"
      title="Threat Intelligence Feed 3D"
    >
      <ShieldAlert className="w-4 h-4" />
    </button>
  );
}
