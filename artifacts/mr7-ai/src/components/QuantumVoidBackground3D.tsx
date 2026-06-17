import { useEffect, useRef } from "react";

/*
  QUANTUM VOID BACKGROUND 3D — Maximum Quality v3
  ─────────────────────────────────────────────────
  Layers (back → front):
  1. Deep space starfield — 3 parallax depth planes (320 stars)
  2. Dark matter cosmic web — faint filaments connecting galaxies
  3. Volumetric nebula clouds — 6 drifting radial glows
  4. Warp speed tunnel — radial speed lines converging to vanishing pt
  5. 3D perspective cyberspace grid — infinite floor + ceiling
  6. Neural network — 90 nodes + connection web + signal pulses
  7. Aurora borealis bands — sinusoidal chromatic ribbons
  8. Black hole singularity — accretion disk + gravitational lensing
  9. Data rain — falling hex/binary columns
  10. Comets & shooting stars
  11. Supernova flash events — periodic explosions
  12. Holographic scan line sweep
  13. Corner HUD brackets + status ticks
  14. Vignette fade
  Pure Canvas 2D, requestAnimationFrame, DPR-aware, zero deps.
*/

interface Props {
  opacity?: number;
  accentColor?: string;
}

export function QuantumVoidBackground3D({ opacity = 0.60, accentColor = "#e21227" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cv = canvasRef.current as HTMLCanvasElement;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const DPR = Math.min(window.devicePixelRatio * 1.5, 3);
    const parseHex = (h: string) => ({
      r: parseInt(h.slice(1,3),16), g: parseInt(h.slice(3,5),16), b: parseInt(h.slice(5,7),16),
    });
    const ac = parseHex(accentColor);
    const ACCENT = `${ac.r},${ac.g},${ac.b}`;

    function hsl(hd: number, s = 1, l = 0.55): string {
      const hh = ((hd%360)+360)%360;
      const k  = (n: number) => (n+hh/30)%12;
      const aa = s*Math.min(l,1-l);
      const f  = (n: number) => l-aa*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));
      return `${Math.round(f(0)*255)},${Math.round(f(8)*255)},${Math.round(f(4)*255)}`;
    }

    let W = 0, H = 0;

    function resize() {
      const rect = cv.parentElement?.getBoundingClientRect();
      W = (rect?.width  || window.innerWidth);
      H = (rect?.height || window.innerHeight);
      cv.width  = W * DPR;
      cv.height = H * DPR;
      cv.style.width  = W + "px";
      cv.style.height = H + "px";
      ctx.scale(DPR, DPR);
      initAll();
    }

    // ── 1. Stars ─────────────────────────────────────────────────────────────
    type Star = { x: number; y: number; r: number; a: number; va: number; depth: number };
    let stars: Star[] = [];
    function initStars() {
      stars = Array.from({ length: 320 }, (_, i) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.12 + Math.random() * (i < 100 ? 0.28 : i < 200 ? 0.72 : 1.6),
        a: 0.06 + Math.random() * 0.8,
        va: 0.004 + Math.random() * 0.022,
        depth: i < 100 ? 0.2 : i < 200 ? 0.55 : 1.0,
      }));
    }

    // ── 2. Dark matter cosmic web ─────────────────────────────────────────────
    type WebNode = { x: number; y: number };
    let webNodes: WebNode[] = [];
    let webEdges: [number, number][] = [];
    function initWeb() {
      webNodes = Array.from({ length: 22 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
      }));
      webEdges = [];
      for (let i = 0; i < webNodes.length; i++) {
        for (let j = i+1; j < webNodes.length; j++) {
          const dx = webNodes[i].x - webNodes[j].x;
          const dy = webNodes[i].y - webNodes[j].y;
          if (Math.sqrt(dx*dx+dy*dy) < Math.min(W, H) * 0.38) {
            webEdges.push([i, j]);
          }
        }
      }
    }

    // ── 3. Nebula clouds ─────────────────────────────────────────────────────
    type Nebula = { cx: number; cy: number; r: number; phase: number; spd: number; hOff: number };
    let nebulae: Nebula[] = [];
    function initNebulae() {
      nebulae = [
        { cx: W*0.22, cy: H*0.28, r: W*0.32, phase: 0,    spd: 0.004, hOff:   0 },
        { cx: W*0.78, cy: H*0.72, r: W*0.28, phase: 2.1,  spd: 0.006, hOff: 120 },
        { cx: W*0.50, cy: H*0.50, r: W*0.40, phase: 4.2,  spd: 0.003, hOff: 240 },
        { cx: W*0.88, cy: H*0.20, r: W*0.18, phase: 1.05, spd: 0.008, hOff:  60 },
        { cx: W*0.12, cy: H*0.80, r: W*0.22, phase: 3.14, spd: 0.005, hOff: 180 },
        { cx: W*0.65, cy: H*0.35, r: W*0.15, phase: 5.50, spd: 0.009, hOff: 300 },
      ];
    }

    // ── 4. Warp speed tunnel ──────────────────────────────────────────────────
    type WarpLine = { angle: number; speed: number; alpha: number };
    let warpLines: WarpLine[] = [];
    function initWarp() {
      warpLines = Array.from({ length: 80 }, () => ({
        angle: Math.random() * Math.PI * 2,
        speed: 0.004 + Math.random() * 0.016,
        alpha: 0.03 + Math.random() * 0.08,
      }));
    }

    // ── 5. Cyberspace 3D grid ─────────────────────────────────────────────────
    const GRID_COLS  = 20;
    const GRID_ROWS  = 24;
    const GRID_SPEED = 0.18;

    // ── 6. Neural network ─────────────────────────────────────────────────────
    type NNode = { x: number; y: number; z: number; vx: number; vy: number; hOff: number; r: number };
    type NEdge = { a: number; b: number };
    type NSig  = { edge: number; t: number; spd: number; hOff: number };
    let nodes:   NNode[] = [];
    let edges:   NEdge[] = [];
    let signals: NSig[]  = [];
    const NODE_COUNT = 90;
    const DEPTH_Z = 300;

    function initNodes() {
      nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
        x: 60 + Math.random() * (W - 120),
        y: 40 + Math.random() * (H - 80),
        z: Math.random() * DEPTH_Z,
        vx: (Math.random() - 0.5) * 0.11,
        vy: (Math.random() - 0.5) * 0.09,
        hOff: (i / NODE_COUNT) * 360,
        r: 0.9 + Math.random() * 1.6,
      }));
      edges = [];
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i+1; j < NODE_COUNT; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < Math.min(W,H) * 0.19 && edges.length < 200) {
            edges.push({ a: i, b: j });
          }
        }
      }
    }

    function spawnSignal(t: number) {
      if (signals.length < 70 && Math.random() < 0.04 && edges.length > 0) {
        const ei = Math.floor(Math.random() * edges.length);
        signals.push({ edge: ei, t: 0, spd: 0.003 + Math.random() * 0.009, hOff: t * 60 % 360 });
      }
    }

    // ── 7. Aurora borealis ────────────────────────────────────────────────────
    type AuroraWave = { yBase: number; amplitude: number; freq: number; phase: number; hOff: number; speed: number };
    let auroraWaves: AuroraWave[] = [];
    function initAurora() {
      auroraWaves = Array.from({ length: 5 }, (_, i) => ({
        yBase:     H * (0.05 + i * 0.08),
        amplitude: H * (0.015 + Math.random() * 0.03),
        freq:      0.004 + Math.random() * 0.008,
        phase:     Math.random() * Math.PI * 2,
        hOff:      i * 72,
        speed:     0.008 + Math.random() * 0.012,
      }));
    }

    // ── 8. Black hole ─────────────────────────────────────────────────────────
    const BH = { x: 0, y: 0, r: 0 };
    function initBlackHole() {
      BH.x = W * 0.82;
      BH.y = H * 0.18;
      BH.r = Math.min(W, H) * 0.035;
    }

    // ── 9. Data rain ─────────────────────────────────────────────────────────
    const CHARS = "01アイウエオカキクケコ01ABCDEF0x";
    type RainDrop = { x: number; y: number; spd: number; len: number; chars: string[]; hOff: number; alpha: number };
    let rain: RainDrop[] = [];
    function initRain() {
      const cols = Math.floor(W / 14);
      rain = Array.from({ length: cols }, (_, i) => ({
        x: i * 14 + 7, y: Math.random() * H,
        spd: 1.2 + Math.random() * 2.8,
        len: 8 + Math.floor(Math.random() * 16),
        chars: Array.from({ length: 24 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
        hOff: (i / cols) * 360,
        alpha: 0.025 + Math.random() * 0.055,
      }));
    }

    // ── 10. Comets & shooting stars ───────────────────────────────────────────
    type Comet = { x: number; y: number; vx: number; vy: number; len: number; alpha: number; hOff: number; active: boolean };
    let comets: Comet[] = [];
    function spawnComet() {
      if (comets.filter(c => c.active).length < 5 && Math.random() < 0.009) {
        const angle = Math.PI * (0.18 + Math.random() * 0.14);
        const spd   = 3.0 + Math.random() * 5.0;
        comets.push({
          x: Math.random() * W, y: -10,
          vx: Math.cos(angle) * spd, vy: Math.sin(angle) * spd,
          len: 60 + Math.random() * 120,
          alpha: 0.5 + Math.random() * 0.4,
          hOff: Math.random() * 360,
          active: true,
        });
      }
      comets = comets.filter(c => c.active);
    }

    // ── 11. Supernova events ──────────────────────────────────────────────────
    type Supernova = { x: number; y: number; r: number; maxR: number; age: number; hOff: number; active: boolean };
    let supernovae: Supernova[] = [];
    let lastSupernovaTime = 0;

    // ── 12. Scan line ─────────────────────────────────────────────────────────
    let scanY = 0;

    function initAll() {
      initStars(); initWeb(); initNebulae(); initWarp();
      initNodes(); initAurora(); initBlackHole(); initRain();
      comets = []; supernovae = [];
      scanY = 0; lastSupernovaTime = 0;
    }

    function drawFrame(t: number) {
      const hue = (t * 10) % 360;
      ctx.clearRect(0, 0, W, H);

      // ── 1. Stars ──────────────────────────────────────────────────────────
      stars.forEach(s => {
        const twinkle = 0.3 + 0.7 * (Math.sin(t * s.va + s.x * 0.01) * 0.5 + 0.5);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${s.a * twinkle})`; ctx.fill();
      });

      // ── 2. Dark matter cosmic web ──────────────────────────────────────────
      webEdges.forEach(([a, b]) => {
        const ax = webNodes[a].x, ay = webNodes[a].y;
        const bx = webNodes[b].x, by = webNodes[b].y;
        const pulse = Math.sin(t * 0.18 + a * 0.5) * 0.5 + 0.5;
        ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        ctx.strokeStyle = `rgba(${ACCENT},${0.012 + pulse * 0.010})`; ctx.lineWidth = 0.6; ctx.stroke();
      });

      // ── 3. Nebulae ─────────────────────────────────────────────────────────
      nebulae.forEach(n => {
        const wave = Math.sin(t * n.spd + n.phase);
        const nc = ctx.createRadialGradient(n.cx, n.cy, 0, n.cx, n.cy, n.r * (1 + wave * 0.1));
        nc.addColorStop(0,   `rgba(${hsl(hue + n.hOff)},0.055)`);
        nc.addColorStop(0.45,`rgba(${hsl(hue + n.hOff + 60)},0.022)`);
        nc.addColorStop(0.8, `rgba(${ACCENT},0.008)`);
        nc.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(n.cx, n.cy, n.r * (1 + wave * 0.1), 0, Math.PI*2);
        ctx.fillStyle = nc; ctx.fill();
      });

      // ── 4. Warp speed tunnel ───────────────────────────────────────────────
      const vanishX = W * 0.5, vanishY = H * 0.5;
      warpLines.forEach(wl => {
        wl.speed += 0.00004;
        const startDist = 80 + ((t * wl.speed * 180) % (Math.min(W,H) * 0.55));
        const endDist   = startDist + 60 + startDist * 0.5;
        const sx = vanishX + Math.cos(wl.angle) * startDist;
        const sy = vanishY + Math.sin(wl.angle) * startDist;
        const ex = vanishX + Math.cos(wl.angle) * endDist;
        const ey = vanishY + Math.sin(wl.angle) * endDist;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
        ctx.strokeStyle = `rgba(${hsl(hue + wl.angle * 30)},${wl.alpha * (startDist / (Math.min(W,H) * 0.55))})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      });

      // ── 5. Cyberspace 3D grid ──────────────────────────────────────────────
      {
        const fov   = Math.min(W, H) * 1.0;
        const eye   = H * 0.55;
        const zOff  = (t * GRID_SPEED) % (H / GRID_ROWS);
        const gy    = H * 0.52;
        const gridW = W * 1.4;
        const gridD = H * 1.0;

        // Horizon glow
        const hg = ctx.createLinearGradient(0, gy - 8, 0, gy + 8);
        hg.addColorStop(0, "rgba(0,0,0,0)");
        hg.addColorStop(0.5, `rgba(${ACCENT},0.06)`);
        hg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = hg; ctx.fillRect(0, gy - 8, W, 16);

        function gridProj(gx: number, gz: number) {
          const d = gz + fov;
          const sc = fov / (d > 1 ? d : 1);
          return { px: W/2 + gx * sc, py: eye - (eye - gy) * sc };
        }

        ctx.save(); ctx.beginPath(); ctx.rect(0, gy, W, H - gy); ctx.clip();
        for (let col = 0; col <= GRID_COLS; col++) {
          const gx = (col / GRID_COLS - 0.5) * gridW;
          const p0 = gridProj(gx, zOff);
          const p1 = gridProj(gx, zOff + gridD);
          const alpha = 0.08 * (1 - Math.abs(col / GRID_COLS - 0.5) * 1.5);
          ctx.beginPath(); ctx.moveTo(p0.px, p0.py); ctx.lineTo(p1.px, p1.py);
          ctx.strokeStyle = `rgba(${ACCENT},${Math.max(0, alpha)})`; ctx.lineWidth = 0.5; ctx.stroke();
        }
        for (let row = 0; row <= GRID_ROWS; row++) {
          const gz = zOff + (row / GRID_ROWS) * gridD;
          const p0 = gridProj(-gridW*0.5, gz);
          const p1 = gridProj( gridW*0.5, gz);
          const alpha = 0.06 * (row / GRID_ROWS);
          ctx.beginPath(); ctx.moveTo(p0.px, p0.py); ctx.lineTo(p1.px, p1.py);
          ctx.strokeStyle = `rgba(${ACCENT},${alpha})`; ctx.lineWidth = 0.5; ctx.stroke();
        }
        ctx.restore();

        // Ceiling
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, gy); ctx.clip();
        for (let col = 0; col <= GRID_COLS; col++) {
          const gx = (col / GRID_COLS - 0.5) * gridW;
          const p0 = gridProj(gx, zOff);
          const p1 = gridProj(gx, zOff + gridD);
          const mirrorY0 = 2 * gy - p0.py;
          const mirrorY1 = 2 * gy - p1.py;
          const alpha = 0.04 * (1 - Math.abs(col / GRID_COLS - 0.5) * 1.5);
          ctx.beginPath(); ctx.moveTo(p0.px, mirrorY0); ctx.lineTo(p1.px, mirrorY1);
          ctx.strokeStyle = `rgba(${ACCENT},${Math.max(0, alpha)})`; ctx.lineWidth = 0.4; ctx.stroke();
        }
        ctx.restore();
      }

      // ── 6. Neural network ──────────────────────────────────────────────────
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });
      spawnSignal(t);

      edges.forEach(e => {
        const a = nodes[e.a], b = nodes[e.b];
        const dx = a.x-b.x, dy = a.y-b.y;
        const d  = Math.sqrt(dx*dx+dy*dy);
        const al = Math.max(0, 1 - d / (Math.min(W,H) * 0.19)) * 0.07;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(${hsl(a.hOff+hue)},${al})`; ctx.lineWidth = 0.6; ctx.stroke();
      });

      signals.forEach((sig, si) => {
        sig.t += sig.spd;
        if (sig.t >= 1.0) { signals.splice(si, 1); return; }
        const e  = edges[sig.edge];
        if (!e) { signals.splice(si, 1); return; }
        const a  = nodes[e.a], b = nodes[e.b];
        const px = a.x + (b.x - a.x) * sig.t;
        const py = a.y + (b.y - a.y) * sig.t;
        const sg = ctx.createRadialGradient(px, py, 0, px, py, 5);
        sg.addColorStop(0, `rgba(255,255,255,0.90)`);
        sg.addColorStop(0.5, `rgba(${hsl(sig.hOff + hue)},0.55)`);
        sg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI*2);
        ctx.fillStyle = sg; ctx.fill();
      });

      nodes.forEach(n => {
        const ng = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3);
        ng.addColorStop(0, `rgba(${hsl(n.hOff+hue)},0.45)`);
        ng.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI*2);
        ctx.fillStyle = ng; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${hsl(n.hOff+hue)},0.65)`; ctx.fill();
      });

      // ── 7. Aurora borealis ─────────────────────────────────────────────────
      auroraWaves.forEach(aw => {
        const STEPS = Math.ceil(W / 4);
        ctx.beginPath();
        for (let i = 0; i <= STEPS; i++) {
          const x = (i / STEPS) * W;
          const y = aw.yBase + Math.sin(x * aw.freq + t * aw.speed + aw.phase) * aw.amplitude
                   + Math.sin(x * aw.freq * 2.3 + t * aw.speed * 1.7) * aw.amplitude * 0.4;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${hsl(hue + aw.hOff)},0.055)`; ctx.lineWidth = 2.5; ctx.stroke();

        // Aurora fill band
        ctx.beginPath();
        for (let i = 0; i <= STEPS; i++) {
          const x = (i / STEPS) * W;
          const y = aw.yBase + Math.sin(x * aw.freq + t * aw.speed + aw.phase) * aw.amplitude;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        for (let i = STEPS; i >= 0; i--) {
          const x = (i / STEPS) * W;
          const y = aw.yBase + Math.sin(x * aw.freq + t * aw.speed + aw.phase) * aw.amplitude + aw.amplitude * 1.8;
          ctx.lineTo(x, y);
        }
        ctx.closePath();
        const aug = ctx.createLinearGradient(0, aw.yBase - aw.amplitude, 0, aw.yBase + aw.amplitude * 2);
        aug.addColorStop(0, `rgba(${hsl(hue + aw.hOff)},0.028)`);
        aug.addColorStop(0.5, `rgba(${hsl(hue + aw.hOff + 40)},0.012)`);
        aug.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = aug; ctx.fill();
      });

      // ── 8. Black hole ──────────────────────────────────────────────────────
      {
        const pulseR = BH.r * (1 + 0.08 * Math.sin(t * 2.2));

        // Accretion disk (flat ellipse)
        const diskRX = BH.r * 4.0, diskRY = BH.r * 1.1;
        for (let ring = 0; ring < 5; ring++) {
          const rFrac = 1.0 - ring * 0.18;
          const diskH = hue + ring * 22 + t * 8;
          ctx.beginPath();
          ctx.ellipse(BH.x, BH.y, diskRX * rFrac, diskRY * rFrac, 0.3, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${hsl(diskH)},${0.08 - ring * 0.014})`;
          ctx.lineWidth = 1.2 - ring * 0.2; ctx.stroke();
        }

        // Gravitational lensing rings
        for (let lr = 1; lr <= 4; lr++) {
          const lensR = pulseR * (1.8 + lr * 0.6);
          const alpha = 0.035 / lr;
          ctx.beginPath(); ctx.arc(BH.x, BH.y, lensR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${hsl(hue + lr * 30)},${alpha})`; ctx.lineWidth = 0.8; ctx.stroke();
        }

        // Singularity (absolute dark circle with hard edge)
        ctx.beginPath(); ctx.arc(BH.x, BH.y, pulseR, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.92)"; ctx.fill();

        // Event horizon glow
        const ehg = ctx.createRadialGradient(BH.x, BH.y, pulseR * 0.7, BH.x, BH.y, pulseR * 3.0);
        ehg.addColorStop(0,   `rgba(${hsl(hue+30)},0.0)`);
        ehg.addColorStop(0.5, `rgba(${hsl(hue+30)},0.06)`);
        ehg.addColorStop(0.8, `rgba(${ACCENT},0.03)`);
        ehg.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(BH.x, BH.y, pulseR * 3.0, 0, Math.PI*2);
        ctx.fillStyle = ehg; ctx.fill();
      }

      // ── 9. Data rain ───────────────────────────────────────────────────────
      ctx.font = "9px monospace";
      rain.forEach(drop => {
        drop.y += drop.spd;
        if (drop.y > H + drop.len * 12) drop.y = -drop.len * 12;
        for (let c = 0; c < drop.len; c++) {
          const cy2 = drop.y - c * 12;
          if (cy2 < -12 || cy2 > H + 12) continue;
          const brightness = 1 - c / drop.len;
          const alpha = drop.alpha * brightness * (c === 0 ? 2.5 : 1);
          if (Math.random() < 0.02) drop.chars[c] = CHARS[Math.floor(Math.random() * CHARS.length)];
          ctx.fillStyle = `rgba(${hsl(drop.hOff + hue)},${Math.min(alpha, 0.35)})`;
          ctx.fillText(drop.chars[c] || "0", drop.x, cy2);
        }
      });

      // ── 10. Comets ─────────────────────────────────────────────────────────
      spawnComet();
      comets.forEach(c => {
        if (!c.active) return;
        c.x += c.vx; c.y += c.vy;
        if (c.y > H + 20 || c.x < -20 || c.x > W + 20) { c.active = false; return; }
        const cg = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * c.len / Math.sqrt(c.vx*c.vx+c.vy*c.vy), c.y - c.vy * c.len / Math.sqrt(c.vx*c.vx+c.vy*c.vy));
        cg.addColorStop(0, `rgba(255,255,255,${c.alpha})`);
        cg.addColorStop(0.3, `rgba(${hsl(c.hOff+hue)},${c.alpha * 0.65})`);
        cg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.moveTo(c.x, c.y);
        const spd = Math.sqrt(c.vx*c.vx+c.vy*c.vy);
        ctx.lineTo(c.x - c.vx/spd * c.len, c.y - c.vy/spd * c.len);
        ctx.strokeStyle = cg; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.beginPath(); ctx.arc(c.x, c.y, 2, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${c.alpha})`; ctx.fill();
      });

      // ── 11. Supernova events ───────────────────────────────────────────────
      if (t - lastSupernovaTime > 18 && Math.random() < 0.004) {
        lastSupernovaTime = t;
        supernovae.push({
          x: 0.1*W + Math.random() * 0.8 * W,
          y: 0.1*H + Math.random() * 0.5 * H,
          r: 0, maxR: Math.min(W,H) * (0.08 + Math.random() * 0.12),
          age: 0, hOff: Math.random() * 360, active: true,
        });
      }
      supernovae.forEach((sn, si) => {
        if (!sn.active) return;
        sn.r += sn.maxR * 0.022;
        sn.age += 0.016;
        if (sn.r > sn.maxR) { sn.active = false; supernovae.splice(si, 1); return; }
        const alpha = Math.max(0, 1 - sn.r / sn.maxR);
        const sg = ctx.createRadialGradient(sn.x, sn.y, 0, sn.x, sn.y, sn.r);
        sg.addColorStop(0,   `rgba(255,255,240,${alpha * 0.9})`);
        sg.addColorStop(0.3, `rgba(${hsl(sn.hOff)},${alpha * 0.55})`);
        sg.addColorStop(0.7, `rgba(${hsl(sn.hOff + 60)},${alpha * 0.15})`);
        sg.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(sn.x, sn.y, sn.r, 0, Math.PI*2);
        ctx.fillStyle = sg; ctx.fill();
        // Shock ring
        ctx.beginPath(); ctx.arc(sn.x, sn.y, sn.r, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${hsl(sn.hOff + 30)},${alpha * 0.35})`; ctx.lineWidth = 1.5; ctx.stroke();
      });

      // ── 12. Scan line ──────────────────────────────────────────────────────
      scanY = (scanY + 0.5) % H;
      const sg2 = ctx.createLinearGradient(0, scanY - 2, 0, scanY + 2);
      sg2.addColorStop(0,   "rgba(0,0,0,0)");
      sg2.addColorStop(0.5, `rgba(${ACCENT},0.055)`);
      sg2.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.fillStyle = sg2; ctx.fillRect(0, scanY - 2, W, 4);

      // ── 13. HUD brackets ──────────────────────────────────────────────────
      const B = 18;
      [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]].forEach(([bx, by, sx, sy]) => {
        ctx.strokeStyle = `rgba(${ACCENT},0.28)`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(bx + sx*2, by + sy*2); ctx.lineTo(bx + sx*(B+2), by + sy*2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(bx + sx*2, by + sy*2); ctx.lineTo(bx + sx*2, by + sy*(B+2)); ctx.stroke();
      });

      // ── 14. Vignette ──────────────────────────────────────────────────────
      const vg = ctx.createRadialGradient(W/2, H/2, H*0.35, W/2, H/2, H*0.85);
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }

    function loop() {
      tRef.current += 0.016;
      drawFrame(tRef.current);
      rafRef.current = requestAnimationFrame(loop);
    }

    resize();
    rafRef.current = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ opacity, zIndex: 0, display: "block" }}
    />
  );
}
