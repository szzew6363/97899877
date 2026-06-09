import { useEffect, useRef, useState } from "react";
import { useDraggable } from "@/hooks/useDraggable";
import { motion, AnimatePresence } from "framer-motion";
import { Circle, Square, Download, FileJson, Printer, GripHorizontal, ChevronDown, ChevronUp, Trash2, Radio } from "lucide-react";
import { sessionRecorder, type SessionEvent } from "@/lib/sessionRecorder";

/* ═══════════════════════════════════════════════════════════════
   LIVE SESSION RECORDER — Attack Log Capture + Export
   Floating widget · JSON/PDF export · Replay timestamps
═══════════════════════════════════════════════════════════════ */

const TYPE_COLOR: Record<string, string> = {
  message_sent:      "#00e5ff",
  message_received:  "#22c55e",
  model_switch:      "#a78bfa",
  mode_switch:       "#f59e0b",
  tool_use:          "#fb923c",
  error:             "#e21227",
  session_start:     "#10b981",
  session_stop:      "#666",
};

const TYPE_LABEL: Record<string, string> = {
  message_sent:      "TX",
  message_received:  "RX",
  model_switch:      "MDL",
  mode_switch:       "MOD",
  tool_use:          "TOOL",
  error:             "ERR",
  session_start:     "START",
  session_stop:      "STOP",
};

function formatTs(ts: number, base: number): string {
  const ms = ts - base;
  const s  = Math.floor(ms / 1000);
  const m  = Math.floor(s / 60);
  return `+${m.toString().padStart(2,"0")}:${(s % 60).toString().padStart(2,"0")}.${(ms % 1000).toString().padStart(3,"0")}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href    = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function SessionRecorderWidget() {
  const { pos, rootRef, onDragMouseDown, onDragTouchStart } = useDraggable(
    "mr7-session-recorder-pos",
    { x: Math.max(0, window.innerWidth - 340), y: 420 }
  );

  const [recording, setRecording] = useState(false);
  const [events, setEvents]       = useState<SessionEvent[]>([]);
  const [collapsed, setCollapsed] = useState(false);
  const [elapsed, setElapsed]     = useState(0);
  const timerRef                  = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef                 = useRef<HTMLCanvasElement>(null);
  const frameRef                  = useRef<number>(0);
  const tickRef                   = useRef(0);

  useEffect(() => {
    const unsub = sessionRecorder.subscribe(evs => {
      setEvents(evs.slice(0, 12));
      setRecording(sessionRecorder.isRecording);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - sessionRecorder.sessionStart);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [recording]);

  /* waveform canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width; const H = canvas.height;

    function draw() {
      frameRef.current = requestAnimationFrame(draw);
      tickRef.current++;
      const t = tickRef.current;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(8,8,8,0.95)";
      ctx.fillRect(0, 0, W, H);

      if (!recording) {
        ctx.strokeStyle = "rgba(100,100,100,0.3)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
        return;
      }

      const pts = 80;
      for (let layer = 0; layer < 3; layer++) {
        const amp   = [6, 4, 3][layer];
        const freq  = [0.08, 0.15, 0.22][layer];
        const speed = [0.04, 0.07, 0.12][layer];
        const alpha = [0.9, 0.5, 0.3][layer];
        const color = ["#e21227", "#ff4d6d", "#ff8fa3"][layer];

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = layer === 0 ? 1.5 : 1;

        for (let i = 0; i < pts; i++) {
          const x = (i / (pts - 1)) * W;
          const y = H / 2 + Math.sin(i * freq + t * speed) * amp
                          + Math.sin(i * freq * 2.3 + t * speed * 1.7) * (amp * 0.5)
                          + (Math.random() - 0.5) * 1.5;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, [recording]);

  function handleToggle() {
    if (recording) {
      sessionRecorder.stop();
    } else {
      sessionRecorder.start();
      setElapsed(0);
    }
  }

  function handleExportJSON() {
    const json  = sessionRecorder.exportJSON();
    const blob  = new Blob([json], { type: "application/json" });
    downloadBlob(blob, `kaligpt-${sessionRecorder.sessionId}.json`);
  }

  function handleExportHTML() {
    const blob = sessionRecorder.exportHTMLBlob();
    downloadBlob(blob, `kaligpt-${sessionRecorder.sessionId}.html`);
  }

  function handlePrint() {
    const blob = sessionRecorder.exportHTMLBlob();
    const url  = URL.createObjectURL(blob);
    const win  = window.open(url, "_blank");
    if (win) { win.onload = () => { win.print(); URL.revokeObjectURL(url); }; }
  }

  const fmtElapsed = (() => {
    const s = Math.floor(elapsed / 1000);
    const m = Math.floor(s / 60);
    return `${m.toString().padStart(2,"0")}:${(s % 60).toString().padStart(2,"0")}`;
  })();

  const msgCount  = events.filter(e => e.type === "message_received").length;
  const errCount  = events.filter(e => e.type === "error").length;

  return (
    <div
      ref={rootRef}
      style={{ left: pos.x, top: pos.y }}
      className="fixed z-[96] w-[300px] select-none"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-[#1f1f1f] overflow-hidden shadow-[0_0_30px_rgba(226,18,39,0.15)]"
        style={{ background: "rgba(8,8,8,0.97)", backdropFilter: "blur(16px)" }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-2 px-3 py-2 cursor-grab border-b border-[#1f1f1f]"
          onMouseDown={onDragMouseDown}
          onTouchStart={onDragTouchStart}
        >
          <GripHorizontal size={12} className="text-[#333]" />

          {/* REC indicator */}
          <div className="flex items-center gap-1.5">
            {recording ? (
              <motion.div
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-[#e21227]"
              />
            ) : (
              <div className="w-2 h-2 rounded-full border border-[#444]" />
            )}
            <span className="text-[10px] font-mono font-bold tracking-[2px] text-[#e21227]">
              {recording ? "REC" : "IDLE"}
            </span>
          </div>

          <span className="text-[10px] font-mono text-[#555] ml-1">{fmtElapsed}</span>

          <div className="ml-auto flex items-center gap-1">
            <span className="text-[9px] font-mono text-[#555]">
              {sessionRecorder.eventCount} EV
            </span>
            <button
              onClick={() => setCollapsed(c => !c)}
              className="p-0.5 text-[#555] hover:text-white"
            >
              {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              {/* Waveform canvas */}
              <canvas
                ref={canvasRef}
                width={300} height={32}
                className="w-full block border-b border-[#1f1f1f]"
              />

              {/* Stats row */}
              <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[#1a1a1a]">
                <div className="text-center">
                  <div className="text-[9px] text-[#555] font-mono">RESPONSES</div>
                  <div className="text-[13px] font-mono font-bold text-[#22c55e]">{msgCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-[#555] font-mono">ERRORS</div>
                  <div className="text-[13px] font-mono font-bold text-[#e21227]">{errCount}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] text-[#555] font-mono">EVENTS</div>
                  <div className="text-[13px] font-mono font-bold text-[#00e5ff]">{sessionRecorder.eventCount}</div>
                </div>
                <div className="ml-auto">
                  <div className="text-[9px] text-[#555] font-mono">SESSION</div>
                  <div className="text-[10px] font-mono text-[#444] truncate max-w-[80px]">
                    {sessionRecorder.sessionId || "--"}
                  </div>
                </div>
              </div>

              {/* Event list */}
              <div className="px-2 py-1.5 space-y-1 min-h-[60px] max-h-[160px] overflow-y-auto">
                {events.length === 0 ? (
                  <div className="text-[10px] text-[#333] font-mono text-center py-4">
                    {recording ? "WAITING FOR EVENTS..." : "PRESS REC TO START"}
                  </div>
                ) : events.map(ev => (
                  <div key={ev.id} className="flex items-start gap-2 text-[9px] font-mono">
                    <span
                      className="shrink-0 px-1 rounded text-[8px] font-bold mt-px"
                      style={{ background: TYPE_COLOR[ev.type] + "22", color: TYPE_COLOR[ev.type] }}
                    >
                      {TYPE_LABEL[ev.type] ?? ev.type.slice(0,4).toUpperCase()}
                    </span>
                    <span className="text-[#555] shrink-0">
                      {events[0] ? formatTs(ev.ts, sessionRecorder.sessionStart) : "--"}
                    </span>
                    <span className="text-[#666] truncate">
                      {ev.data["model"]
                        ? String(ev.data["model"]).slice(0, 20)
                        : ev.data["content"]
                        ? String(ev.data["content"]).slice(0, 30)
                        : ev.data["mode"]
                        ? String(ev.data["mode"])
                        : Object.values(ev.data)[0] != null
                        ? String(Object.values(ev.data)[0]).slice(0, 30)
                        : ""}
                    </span>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center gap-1.5 px-2 py-2 border-t border-[#1f1f1f]">
                <button
                  onClick={handleToggle}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-mono font-bold transition-all ${
                    recording
                      ? "bg-[#1a0000] border border-[#e21227] text-[#e21227] hover:bg-[#2a0000]"
                      : "bg-[#e21227] text-white hover:bg-[#c8102e]"
                  }`}
                >
                  {recording ? <Square size={10} /> : <Radio size={10} />}
                  {recording ? "STOP" : "REC"}
                </button>

                <button
                  onClick={handleExportJSON}
                  disabled={sessionRecorder.eventCount === 0}
                  title="Export JSON"
                  className="flex items-center gap-1 px-2 py-1 rounded border border-[#333] text-[#555] hover:border-[#00e5ff] hover:text-[#00e5ff] text-[10px] font-mono transition-all disabled:opacity-30"
                >
                  <FileJson size={10} />
                  JSON
                </button>

                <button
                  onClick={handleExportHTML}
                  disabled={sessionRecorder.eventCount === 0}
                  title="Export HTML Log"
                  className="flex items-center gap-1 px-2 py-1 rounded border border-[#333] text-[#555] hover:border-[#a78bfa] hover:text-[#a78bfa] text-[10px] font-mono transition-all disabled:opacity-30"
                >
                  <Download size={10} />
                  LOG
                </button>

                <button
                  onClick={handlePrint}
                  disabled={sessionRecorder.eventCount === 0}
                  title="Print / PDF"
                  className="flex items-center gap-1 px-2 py-1 rounded border border-[#333] text-[#555] hover:border-[#22c55e] hover:text-[#22c55e] text-[10px] font-mono transition-all disabled:opacity-30"
                >
                  <Printer size={10} />
                  PDF
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
