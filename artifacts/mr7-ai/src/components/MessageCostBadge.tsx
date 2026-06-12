import { useEffect, useRef, useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { estimateMsgCost } from "@/lib/provider-pricing";

interface Props {
  inputText: string;
  outputText: string;
  modelId: string;
  providerModel?: string;
  isLocal?: boolean;
}

function NeuralOrb({ color }: { color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const W = 18, H = 18;
    c.width = W; c.height = H;
    const cx = W / 2, cy = H / 2;
    let t = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const pulse = (Math.sin(t * 0.07) + 1) / 2;
      const r = 5 + pulse * 1.2;
      const g = ctx.createRadialGradient(cx - 1, cy - 1, 0, cx, cy, r + 3);
      g.addColorStop(0, color + "ff");
      g.addColorStop(0.5, color + "88");
      g.addColorStop(1, color + "00");
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.shadowBlur = 8;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx - 1.5, cy - 1.5, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fill();
      t++;
      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [color]);

  return <canvas ref={canvasRef} width={18} height={18} className="shrink-0" />;
}

function fmtTok(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

export const MessageCostBadge = memo(function MessageCostBadge({ inputText, outputText, modelId, providerModel, isLocal }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  if (isLocal) {
    return (
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] select-none"
            style={{
              background: "rgba(52,211,153,0.08)",
              border: "1px solid rgba(52,211,153,0.2)",
              color: "rgba(52,211,153,0.7)",
            }}
            title="Local model — no cost"
          >
            <NeuralOrb color="#34d399" />
            <span>LOCAL · FREE</span>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  const { inputTok, outputTok, cost, costStr, hasPrice } = estimateMsgCost(inputText, outputText, modelId, providerModel);
  const totalTok = inputTok + outputTok;

  const color = !hasPrice
    ? "#6366f1"
    : cost < 0.0001 ? "#10b981"
    : cost < 0.005  ? "#00e5ff"
    : cost < 0.05   ? "#f59e0b"
    : "#e21227";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[9px] select-none cursor-default"
          style={{
            background: `${color}0d`,
            border: `1px solid ${color}30`,
            color: `${color}bb`,
            boxShadow: `0 0 8px ${color}18`,
          }}
          title={`Input: ~${fmtTok(inputTok)} tok · Output: ~${fmtTok(outputTok)} tok · Estimated cost: ${hasPrice ? costStr : "unknown"}`}
        >
          <NeuralOrb color={color} />
          <span style={{ color: `${color}cc` }}>{fmtTok(totalTok)}</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <motion.span
            key={costStr}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ color: `${color}ee` }}
          >
            {hasPrice ? costStr : "??"}
          </motion.span>
        </motion.div>
      )}
    </AnimatePresence>
  );
});
