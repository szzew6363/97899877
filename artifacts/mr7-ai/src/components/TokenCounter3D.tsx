import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { AI_MODELS } from "@/lib/ai-config";
import { getPricing, calcCost, fmtCost } from "@/lib/provider-pricing";

interface Props {
  inputTokens: number;
  totalTokens: number;
  modelId: string;
  providerModel?: string;
}

function parseContextWindow(cw?: string): number {
  if (!cw) return 16384;
  const n = parseFloat(cw);
  if (cw.endsWith("M")) return n * 1_000_000;
  if (cw.endsWith("K") || cw.endsWith("k")) return n * 1000;
  return n || 16384;
}

function fmtTok(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

function tokenColor(pct: number): string {
  if (pct >= 0.85) return "#e21227";
  if (pct >= 0.65) return "#f59e0b";
  if (pct >= 0.4) return "#00e5ff";
  return "#10b981";
}

export function TokenCounter3D({ inputTokens, totalTokens, modelId, providerModel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const fillRef = useRef(0);

  const model = AI_MODELS.find((m) => m.id === modelId);
  const ctxWin = parseContextWindow(model?.contextWindow);
  const fillPct = Math.min(1, totalTokens / ctxWin);
  const color = tokenColor(fillPct);

  const pricing = getPricing(modelId, providerModel);
  const estimatedCost = pricing ? calcCost(inputTokens, totalTokens - inputTokens, pricing) : null;
  const costStr = estimatedCost !== null ? fmtCost(estimatedCost) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d")!;

    canvas.width = 46;
    canvas.height = 46;
    const W = 46, H = 46;
    const cx = W / 2, cy = H / 2, R = 17;
    let t = 0;

    function draw() {
      c.clearRect(0, 0, W, H);

      /* tick marks ring */
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2 - Math.PI / 2;
        const r0 = R + 3;
        const r1 = R + 3 + (i % 6 === 0 ? 4 : 2);
        const lit = i / 24 <= fillRef.current;
        c.beginPath();
        c.moveTo(cx + r0 * Math.cos(a), cy + r0 * Math.sin(a));
        c.lineTo(cx + r1 * Math.cos(a), cy + r1 * Math.sin(a));
        c.strokeStyle = lit ? color + "cc" : "rgba(255,255,255,0.05)";
        c.lineWidth = i % 6 === 0 ? 1.5 : 0.8;
        c.stroke();
      }

      /* background arc */
      c.beginPath();
      c.arc(cx, cy, R, -Math.PI / 2, Math.PI * 1.5);
      c.strokeStyle = "rgba(255,255,255,0.05)";
      c.lineWidth = 3.5;
      c.stroke();

      /* active arc */
      if (fillRef.current > 0) {
        const grad = c.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
        grad.addColorStop(0, color + "ff");
        grad.addColorStop(1, color + "66");
        c.beginPath();
        c.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + fillRef.current * Math.PI * 2);
        c.strokeStyle = grad;
        c.lineWidth = 3.5;
        c.lineCap = "round";
        c.shadowBlur = 14;
        c.shadowColor = color;
        c.stroke();
        c.shadowBlur = 0;

        /* gleam dot at arc end */
        const endA = -Math.PI / 2 + fillRef.current * Math.PI * 2;
        c.beginPath();
        c.arc(cx + R * Math.cos(endA), cy + R * Math.sin(endA), 2.5, 0, Math.PI * 2);
        c.fillStyle = "#fff";
        c.shadowBlur = 10;
        c.shadowColor = color;
        c.fill();
        c.shadowBlur = 0;
      }

      /* inner pulse ring */
      const pulsePct = (Math.sin(t * 0.06) + 1) / 2;
      const pr = R - 6 + pulsePct * 3;
      c.beginPath();
      c.arc(cx, cy, pr, 0, Math.PI * 2);
      c.strokeStyle = color + Math.round((0.04 + pulsePct * 0.06) * 255).toString(16).padStart(2, "0");
      c.lineWidth = 0.8;
      c.stroke();

      t++;
      animRef.current = requestAnimationFrame(draw);
    }

    /* smooth fill animation */
    function animateFill() {
      const delta = fillPct - fillRef.current;
      if (Math.abs(delta) > 0.001) {
        fillRef.current += delta * 0.08;
        requestAnimationFrame(animateFill);
      } else {
        fillRef.current = fillPct;
      }
    }

    animRef.current = requestAnimationFrame(draw);
    animateFill();

    return () => cancelAnimationFrame(animRef.current);
  }, [fillPct, color]);

  const shortName = modelId.split("·")[0].trim().replace(/^CHAT-GPT\s+/, "").slice(0, 14);

  return (
    <motion.div
      className="flex items-center gap-2 shrink-0 cursor-default select-none"
      title={`${totalTokens.toLocaleString()} / ${ctxWin.toLocaleString()} tokens — ${Math.round(fillPct * 100)}% of context window`}
    >
      {/* Canvas gauge */}
      <motion.div
        style={{ perspective: "320px" }}
        animate={{ rotateY: [0, 4, 0, -4, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="relative shrink-0"
      >
        <canvas ref={canvasRef} width={46} height={46} className="block" />
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="font-mono font-black text-[8.5px] leading-none" style={{ color }}>
            {fmtTok(inputTokens)}
          </span>
          <span className="font-mono text-[6px] leading-none mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>
            in
          </span>
        </div>
      </motion.div>

      {/* Right info column */}
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-baseline gap-1">
          <span className="font-mono font-black text-[11px] leading-none" style={{ color }}>
            {fmtTok(totalTokens)}
          </span>
          <span className="font-mono text-[8px]" style={{ color: "rgba(255,255,255,0.2)" }}>
            / {fmtTok(ctxWin)}
          </span>
        </div>
        <div className="font-mono text-[8px] truncate" style={{ color: "rgba(255,255,255,0.18)", maxWidth: 80 }}>
          {shortName}
        </div>
        <div className="w-20 h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${color}99, ${color})`, boxShadow: `0 0 5px ${color}88` }}
            animate={{ width: `${Math.min(100, fillPct * 100)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        <div className="flex items-center gap-1">
          <div className="font-mono text-[7.5px]" style={{ color: "rgba(255,255,255,0.14)" }}>
            {Math.round(fillPct * 100)}% used
          </div>
          {costStr && (
            <motion.div
              key={costStr}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-mono text-[7.5px] font-bold"
              style={{
                color,
                textShadow: `0 0 8px ${color}88`,
              }}
            >
              · {costStr}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
