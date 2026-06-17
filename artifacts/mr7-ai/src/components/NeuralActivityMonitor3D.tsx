import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/*
  NEURAL ACTIVITY MONITOR 3D — Maximum Quality
  ─────────────────────────────────────────────
  Floating oscilloscope panel shown during AI streaming:
  · 4-channel brainwave monitor (α β θ δ) with animated waveforms
  · Real-time token throughput scrolling histogram
  · TPS meter with health color coding
  · Neural electrode sparks and synapse pulses
  · Holographic glass panel with animated border
  Pure Canvas 2D, DPR×2, requestAnimationFrame.
*/

interface Props {
  streaming: boolean;
  tps: number;
  tokenCount: number;
}

function NeuralCanvas({ tps, tokenCount }: { tps: number; tokenCount: number }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef(0);
  const tRef       = useRef(0);
  const tpsRef     = useRef(tps);
  const tokRef     = useRef(tokenCount);
  const histRef    = useRef<number[]>(Array(60).fill(0));
  const flushRef   = useRef(0);

  useEffect(() => { tpsRef.current = tps; }, [tps]);
  useEffect(() => {
    tokRef.current = tokenCount;
    histRef.current.push(tps);
    if (histRef.current.length > 60) histRef.current.shift();
  }, [tokenCount, tps]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cv  = canvasRef.current as HTMLCanvasElement;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const W = 320, H = 140;
    const DPR = Math.min(window.devicePixelRatio * 2, 4);
    cv.width  = W * DPR;
    cv.height = H * DPR;
    ctx.scale(DPR, DPR);

    // ── Brainwave channels ────────────────────────────────────────────────────
    const CHANNELS = [
      { label: "α", freq: 0.052, amp: 12, phase: 0.00, color: "0,229,255",  yOff: 0.18 },
      { label: "β", freq: 0.096, amp:  9, phase: 1.05, color: "167,139,250",yOff: 0.38 },
      { label: "θ", freq: 0.034, amp: 14, phase: 2.10, color: "34,197,94",  yOff: 0.58 },
      { label: "δ", freq: 0.018, amp: 18, phase: 3.15, color: "251,191,36", yOff: 0.76 },
    ];
    const WAVE_X = 68, WAVE_W = 180;

    // ── Electrode positions ───────────────────────────────────────────────────
    const ELECTRODES = CHANNELS.map((ch, i) => ({
      x: WAVE_X + Math.random() * WAVE_W,
      y: H * ch.yOff,
      color: ch.color,
      pulse: i * 0.78,
    }));

    // ── Synapse connections ───────────────────────────────────────────────────
    type Synapse = { from: number; to: number; t: number; spd: number };
    const synapses: Synapse[] = [];
    function spawnSynapse() {
      if (synapses.length < 12 && Math.random() < 0.04) {
        const from = Math.floor(Math.random() * ELECTRODES.length);
        const to   = (from + 1 + Math.floor(Math.random() * (ELECTRODES.length - 1))) % ELECTRODES.length;
        synapses.push({ from, to, t: 0, spd: 0.012 + Math.random() * 0.025 });
      }
    }

    function hsl(hd: number, s = 1, l = 0.58): string {
      const hh = ((hd % 360) + 360) % 360;
      const k  = (n: number) => (n + hh / 30) % 12;
      const aa = s * Math.min(l, 1 - l);
      const f  = (n: number) => l - aa * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return `${Math.round(f(0)*255)},${Math.round(f(8)*255)},${Math.round(f(4)*255)}`;
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current  += 0.022;
      const t  = tRef.current;
      const tp = tpsRef.current;
      flushRef.current++;

      ctx.clearRect(0, 0, W, H);

      const hue = (t * 5) % 360;

      // ── Background glass panel ───────────────────────────────────────────
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0,   "rgba(4,2,12,0.96)");
      bg.addColorStop(0.5, "rgba(6,2,18,0.96)");
      bg.addColorStop(1,   "rgba(4,2,12,0.96)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // ── Animated border ──────────────────────────────────────────────────
      const borderA = 0.45 + Math.sin(t * 1.1) * 0.18;
      ctx.beginPath();
      ctx.roundRect(0.5, 0.5, W - 1, H - 1, 6);
      const borderGrad = ctx.createLinearGradient(0, 0, W, H);
      borderGrad.addColorStop(0,   `rgba(226,18,39,${borderA})`);
      borderGrad.addColorStop(0.35,`rgba(${hsl(hue + 90)},${borderA * 0.6})`);
      borderGrad.addColorStop(0.7, `rgba(${hsl(hue + 180)},${borderA * 0.5})`);
      borderGrad.addColorStop(1,   `rgba(226,18,39,${borderA})`);
      ctx.strokeStyle = borderGrad; ctx.lineWidth = 1.2; ctx.stroke();

      // ── Grid lines ───────────────────────────────────────────────────────
      ctx.globalAlpha = 0.06;
      for (let gy = 20; gy < H; gy += 20) {
        ctx.beginPath(); ctx.moveTo(WAVE_X, gy); ctx.lineTo(WAVE_X + WAVE_W, gy);
        ctx.strokeStyle = "rgba(255,255,255,1)"; ctx.lineWidth = 0.4; ctx.stroke();
      }
      for (let gx = WAVE_X; gx <= WAVE_X + WAVE_W; gx += 30) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H);
        ctx.strokeStyle = "rgba(255,255,255,1)"; ctx.lineWidth = 0.4; ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ── NEURAL ACTIVITY header ───────────────────────────────────────────
      ctx.fillStyle = `rgba(226,18,39,${0.7 + Math.sin(t * 1.5) * 0.15})`;
      ctx.font = "bold 7.5px monospace";
      ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("NEURAL ACTIVITY", 8, 6);

      // Animated dot
      ctx.beginPath(); ctx.arc(W - 10, 9, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(226,18,39,${0.6 + Math.sin(t * 3.5) * 0.4})`; ctx.fill();
      const dotG = ctx.createRadialGradient(W - 10, 9, 0, W - 10, 9, 7);
      dotG.addColorStop(0, `rgba(226,18,39,${0.3 + Math.sin(t * 3.5) * 0.15})`);
      dotG.addColorStop(1, "rgba(226,18,39,0)");
      ctx.beginPath(); ctx.arc(W - 10, 9, 7, 0, Math.PI * 2);
      ctx.fillStyle = dotG; ctx.fill();

      // ── 4 Brainwave oscilloscopes ─────────────────────────────────────────
      const SAMPLES = WAVE_W;
      CHANNELS.forEach((ch, ci) => {
        const yBase = H * ch.yOff;
        const col   = ch.color;

        // Channel label
        ctx.fillStyle = `rgba(${col},0.85)`;
        ctx.font = "bold 8px monospace";
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(ch.label, WAVE_X - 5, yBase);

        // Frequency label
        ctx.font = "5px monospace";
        ctx.fillStyle = `rgba(${col},0.45)`;
        ctx.fillText(["8Hz", "22Hz", "6Hz", "2Hz"][ci], WAVE_X - 5, yBase + 9);

        // Draw waveform
        ctx.beginPath();
        let first = true;
        for (let xi = 0; xi < SAMPLES; xi++) {
          const xp   = WAVE_X + xi;
          // Compound wave with noise
          const n1 = Math.sin((xi * 0.07 + t) * ch.freq * 80);
          const n2 = Math.sin((xi * 0.13 + t * 1.3) * ch.freq * 120) * 0.4;
          const n3 = Math.sin((xi * 0.031 + t * 0.7) * ch.freq * 40 + ch.phase) * 0.6;
          const tpsBoost = Math.min(tp / 15, 1) * 0.5;
          const amp = ch.amp * (0.6 + tpsBoost * 0.4) * (1 + Math.sin(t * 0.3 + ci) * 0.12);
          const yp  = yBase + (n1 + n2 + n3) * amp * 0.55;
          if (first) { ctx.moveTo(xp, yp); first = false; }
          else          ctx.lineTo(xp, yp);
        }
        ctx.strokeStyle = `rgba(${col},${0.65 + Math.sin(t * 0.8 + ci) * 0.15})`;
        ctx.lineWidth   = 0.85; ctx.stroke();

        // Glow duplicate (thicker, dimmer)
        ctx.beginPath(); first = true;
        for (let xi = 0; xi < SAMPLES; xi++) {
          const xp = WAVE_X + xi;
          const n1 = Math.sin((xi * 0.07 + t) * ch.freq * 80);
          const n2 = Math.sin((xi * 0.13 + t * 1.3) * ch.freq * 120) * 0.4;
          const n3 = Math.sin((xi * 0.031 + t * 0.7) * ch.freq * 40 + ch.phase) * 0.6;
          const tpsBoost = Math.min(tp / 15, 1) * 0.5;
          const amp = ch.amp * (0.6 + tpsBoost * 0.4) * (1 + Math.sin(t * 0.3 + ci) * 0.12);
          const yp  = yBase + (n1 + n2 + n3) * amp * 0.55;
          if (first) { ctx.moveTo(xp, yp); first = false; }
          else          ctx.lineTo(xp, yp);
        }
        ctx.strokeStyle = `rgba(${col},0.12)`;
        ctx.lineWidth   = 3.5; ctx.stroke();
      });

      // ── Synapse pulse signals ─────────────────────────────────────────────
      spawnSynapse();
      synapses.forEach((syn, si) => {
        syn.t += syn.spd;
        if (syn.t >= 1) { synapses.splice(si, 1); return; }
        const eA = ELECTRODES[syn.from], eB = ELECTRODES[syn.to];
        const sx  = eA.x + (eB.x - eA.x) * syn.t;
        const sy  = eA.y + (eB.y - eA.y) * syn.t;
        const sA  = Math.sin(syn.t * Math.PI) * 0.8;
        const sg  = ctx.createRadialGradient(sx, sy, 0, sx, sy, 5);
        sg.addColorStop(0, `rgba(${CHANNELS[syn.from].color},${sA})`);
        sg.addColorStop(1, `rgba(${CHANNELS[syn.from].color},0)`);
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = sg; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${sA * 0.9})`; ctx.fill();
      });

      // ── TPS meter (right panel) ──────────────────────────────────────────
      const mX = WAVE_X + WAVE_W + 8, mW = W - mX - 6;
      const tpsClamped = Math.min(tp, 30);
      const tpsPct     = tpsClamped / 30;
      const tpsColor   = tpsPct > 0.7 ? "34,197,94" : tpsPct > 0.35 ? "251,191,36" : "226,18,39";

      ctx.font = "bold 7px monospace";
      ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("TPS", mX + mW / 2, 14);

      // TPS arc meter
      const arcCx = mX + mW / 2, arcCy = 42, arcR = 18;
      ctx.beginPath(); ctx.arc(arcCx, arcCy, arcR, Math.PI * 0.75, Math.PI * 2.25, false);
      ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 3.5; ctx.stroke();
      if (tpsPct > 0) {
        const startA = Math.PI * 0.75, endA = Math.PI * 0.75 + tpsPct * Math.PI * 1.5;
        ctx.beginPath(); ctx.arc(arcCx, arcCy, arcR, startA, endA, false);
        ctx.strokeStyle = `rgba(${tpsColor},0.9)`;
        ctx.lineWidth   = 3.5;
        ctx.shadowColor = `rgba(${tpsColor},0.6)`; ctx.shadowBlur = 6;
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      ctx.font = `bold ${tp >= 10 ? "9" : "10"}px monospace`;
      ctx.textAlign = "center"; ctx.fillStyle = `rgba(${tpsColor},1)`;
      ctx.fillText(tp.toFixed(1), arcCx, arcCy + 3);
      ctx.font = "5px monospace"; ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.fillText("tok/s", arcCx, arcCy + 12);

      // ── Token histogram ──────────────────────────────────────────────────
      const histY = 68, histH = H - histY - 8;
      const barW  = mW / 20;
      const hist  = histRef.current.slice(-20);
      const maxH  = Math.max(...hist, 1);
      hist.forEach((v, i) => {
        const bH = (v / maxH) * histH;
        const bX = mX + i * barW;
        const bA = 0.25 + (i / 20) * 0.55;
        ctx.fillStyle = `rgba(${tpsColor},${bA})`;
        ctx.fillRect(bX, histY + histH - bH, barW - 0.8, bH);
      });

      // ── Token count ──────────────────────────────────────────────────────
      ctx.font = "bold 6px monospace";
      ctx.textAlign = "center"; ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.fillText("TOKENS", mX + mW / 2, H - 10);
      ctx.font = "bold 7.5px monospace"; ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.fillText(tokRef.current.toLocaleString(), mX + mW / 2, H - 3);

      // ── Left separator ───────────────────────────────────────────────────
      ctx.beginPath(); ctx.moveTo(WAVE_X - 16, 2); ctx.lineTo(WAVE_X - 16, H - 2);
      ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 0.6; ctx.stroke();
      // Right separator
      ctx.beginPath(); ctx.moveTo(WAVE_X + WAVE_W + 5, 2); ctx.lineTo(WAVE_X + WAVE_W + 5, H - 2);
      ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 0.6; ctx.stroke();

      // ── Channel labels column ────────────────────────────────────────────
      ctx.font = "bold 6.5px monospace";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillText("EEG", 8, H / 2);

      // ── Corner brackets ──────────────────────────────────────────────────
      const bLen = 6, bA = 0.18 + Math.sin(t * 0.7) * 0.06;
      [
        [2, 2, 1, 1], [W-2, 2, -1, 1], [2, H-2, 1, -1], [W-2, H-2, -1, -1]
      ].forEach(([bx, by, sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(bx + sx * bLen, by);
        ctx.lineTo(bx, by); ctx.lineTo(bx, by + sy * bLen);
        ctx.strokeStyle = `rgba(226,18,39,${bA})`; ctx.lineWidth = 1; ctx.stroke();
      });
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 320, height: 140, display: "block", borderRadius: 6 }}
    />
  );
}

export function NeuralActivityMonitor3D({ streaming, tps, tokenCount }: Props) {
  const handleDrag = useCallback(() => {}, []);
  void handleDrag;

  return (
    <AnimatePresence>
      {streaming && (
        <motion.div
          initial={{ opacity: 0, x: 40, scale: 0.88 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 40, scale: 0.88 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          style={{
            position: "absolute",
            bottom: 180,
            right: 16,
            zIndex: 30,
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 0 28px rgba(226,18,39,0.18), 0 0 56px rgba(226,18,39,0.06), 0 4px 24px rgba(0,0,0,0.7)",
          }}
        >
          <NeuralCanvas tps={tps} tokenCount={tokenCount} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
