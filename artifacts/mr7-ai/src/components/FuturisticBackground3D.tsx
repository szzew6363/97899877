import { useEffect, useRef } from "react";

/*
  FUTURISTIC BACKGROUND 3D — v1
  Multi-layer cyber canvas:
   · Perspective grid with vanishing point & pulse wave
   · Floating hex data nodes with connection beams
   · Scan-line sweep + chromatic HUD flickers
   · Drifting particle constellation
  Zero external deps — pure Canvas 2D, requestAnimationFrame.
*/

const LABELS = ["0xDEAD", "CVE", "SHELL", "ROOT", "FUZZ", "OSINT",
                "NEXUS", "XSS", "RCE", "ARM64", "ELF", "BUF", "HEAP",
                "KALI", "PRIV", "NET", "TLS", "DNS", "PKT", "SYN"];

export function FuturisticBackground3D({
  opacity = 0.7,
  accentColor = "#e21227",
}: {
  opacity?: number;
  accentColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true })!;

    const parseColor = (hex: string) => ({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    });
    const ac = parseColor(accentColor);

    // ── Types & state (must come before resize() is called) ─────────────
    type HexNode = {
      x: number; y: number; z: number;
      vx: number; vy: number;
      size: number; phase: number; phaseSpd: number;
      label: string; alpha: number;
    };
    type Beam = { a: number; b: number; t: number; spd: number };
    type Particle = { x: number; y: number; vy: number; alpha: number; r: number; col: string };

    let nodes: HexNode[] = [];
    let beams: Beam[] = [];
    let particles: Particle[] = [];
    const LOCAL_PCOLORS = [accentColor, "#00e5ff", "#a78bfa", "#22c55e", "#f59e0b"];

    // ── Resize ────────────────────────────────────────
    let W = 0;
    let H = 0;
    function resize() {
      W = canvas!.offsetWidth;
      H = canvas!.offsetHeight;
      canvas!.width = W;
      canvas!.height = H;
      initScene();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function initScene() {
      const nodeCount = Math.min(35, Math.max(12, Math.floor(W * H / 22000)));
      nodes = Array.from({ length: nodeCount }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        z: 0.4 + Math.random() * 0.6,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.15,
        size: 2 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
        phaseSpd: 0.005 + Math.random() * 0.015,
        label: LABELS[Math.floor(Math.random() * LABELS.length)],
        alpha: 0.4 + Math.random() * 0.5,
      }));

      const pCount = Math.min(60, Math.floor(W * H / 12000));
      particles = Array.from({ length: pCount }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vy: -(0.08 + Math.random() * 0.25),
        alpha: 0.05 + Math.random() * 0.25,
        r: 0.5 + Math.random() * 1.5,
        col: LOCAL_PCOLORS[Math.floor(Math.random() * LOCAL_PCOLORS.length)],
      }));
    }

    // ── Draw helpers ──────────────────────────────────
    function hexPath(cx: number, cy: number, r: number) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.closePath();
    }

    function drawGrid(t: number) {
      const HORIZ = H * 0.52;
      const FOV = H * 1.6;
      const COLS = 22;
      const ROWS = 18;
      const DEPTH = 1400;
      const GRID_W = DEPTH * 1.8;

      const pulse = Math.sin(t * 0.4) * 0.5 + 0.5;
      const camZ = 260 + Math.sin(t * 0.22) * 40;

      function project(wx: number, wz: number) {
        const dz = wz + camZ;
        if (dz <= 0) return { x: W / 2, y: HORIZ, alpha: 0 };
        const px = W / 2 + (wx / dz) * FOV;
        const py = HORIZ + (FOV / dz) * 30;
        const alpha = Math.max(0, 1 - wz / DEPTH);
        return { x: px, y: py, alpha };
      }

      // Vertical grid lines
      for (let i = 0; i <= COLS; i++) {
        const wx = (i / COLS - 0.5) * GRID_W;
        const near = project(wx * 2.5, 0);
        const far = project(wx, DEPTH);
        const edgeFade = 1 - Math.abs(i / COLS - 0.5) * 1.8;
        if (edgeFade <= 0) continue;
        const a = edgeFade * 0.06 * opacity;
        if (a < 0.005) continue;
        const grad = ctx.createLinearGradient(near.x, near.y, far.x, far.y);
        grad.addColorStop(0, `rgba(${ac.r},${ac.g},${ac.b},${a + pulse * 0.03})`);
        grad.addColorStop(1, `rgba(${ac.r},${ac.g},${ac.b},0)`);
        ctx.beginPath();
        ctx.moveTo(near.x, H + 10);
        ctx.lineTo(far.x, HORIZ);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Horizontal grid lines (depth bands)
      for (let r = 0; r <= ROWS; r++) {
        const wz = (r / ROWS) * DEPTH;
        const p0 = project(-GRID_W * 0.9, wz);
        const p1 = project(GRID_W * 0.9, wz);
        const rowPulse = Math.sin(t * 1.2 - wz * 0.003) * 0.5 + 0.5;
        const a = p0.alpha * 0.1 * opacity * rowPulse;
        if (a < 0.003) continue;
        ctx.beginPath();
        ctx.moveTo(p0.x, HORIZ + (H - HORIZ) * (r / ROWS));
        ctx.lineTo(p1.x, HORIZ + (H - HORIZ) * (r / ROWS));
        ctx.strokeStyle = `rgba(${ac.r},${ac.g},${ac.b},${a})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }

      // Horizon glow
      const hGrad = ctx.createLinearGradient(0, HORIZ - 12, 0, HORIZ + 12);
      hGrad.addColorStop(0, "transparent");
      hGrad.addColorStop(0.5, `rgba(${ac.r},${ac.g},${ac.b},${0.08 + pulse * 0.04})`);
      hGrad.addColorStop(1, "transparent");
      ctx.fillStyle = hGrad;
      ctx.fillRect(0, HORIZ - 12, W, 24);
    }

    function drawNodes(t: number) {
      const CONN_DIST = Math.min(W, H) * 0.28;

      // Beams spawn
      if (Math.random() < 0.025 && nodes.length >= 2 && beams.length < 6) {
        const a = Math.floor(Math.random() * nodes.length);
        let b = Math.floor(Math.random() * nodes.length);
        if (b === a) b = (b + 1) % nodes.length;
        const dx = nodes[a].x - nodes[b].x;
        const dy = nodes[a].y - nodes[b].y;
        if (Math.hypot(dx, dy) < CONN_DIST * 1.4)
          beams.push({ a, b, t: 0, spd: 0.008 + Math.random() * 0.01 });
      }

      // Static connection lines
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const ni = nodes[i]; const nj = nodes[j];
          const d = Math.hypot(ni.x - nj.x, ni.y - nj.y);
          if (d > CONN_DIST) continue;
          const a = (1 - d / CONN_DIST) * 0.07 * opacity * Math.min(ni.z, nj.z);
          ctx.beginPath();
          ctx.moveTo(ni.x, ni.y);
          ctx.lineTo(nj.x, nj.y);
          ctx.strokeStyle = `rgba(${ac.r},${ac.g},${ac.b},${a})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Beam packets
      beams = beams.filter(bm => {
        bm.t += bm.spd;
        if (bm.t > 1) return false;
        const na = nodes[bm.a]; const nb = nodes[bm.b];
        if (!na || !nb) return false;
        const px = na.x + (nb.x - na.x) * bm.t;
        const py = na.y + (nb.y - na.y) * bm.t;
        const tail = Math.max(0, bm.t - 0.14);
        const tx = na.x + (nb.x - na.x) * tail;
        const ty = na.y + (nb.y - na.y) * tail;
        const g = ctx.createLinearGradient(tx, ty, px, py);
        g.addColorStop(0, "transparent");
        g.addColorStop(1, `rgba(${ac.r},${ac.g},${ac.b},${0.9 * opacity})`);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px, py);
        ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.stroke();
        const glow = ctx.createRadialGradient(px, py, 0, px, py, 6);
        glow.addColorStop(0, `rgba(${ac.r},${ac.g},${ac.b},${0.8 * opacity})`);
        glow.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = glow; ctx.fill();
        return true;
      });

      // Hex nodes
      for (const n of nodes) {
        n.phase += n.phaseSpd;
        const pulse = Math.sin(n.phase) * 0.5 + 0.5;
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = W + 20;
        if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20;
        if (n.y > H + 20) n.y = -20;

        const sz = n.size * n.z * (0.8 + pulse * 0.35);
        const alpha = n.alpha * n.z * opacity;

        // Outer glow ring
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, sz * 3.5);
        grd.addColorStop(0, `rgba(${ac.r},${ac.g},${ac.b},${alpha * 0.15})`);
        grd.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(n.x, n.y, sz * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        // Hex shape
        hexPath(n.x, n.y, sz);
        ctx.strokeStyle = `rgba(${ac.r},${ac.g},${ac.b},${alpha * (0.5 + pulse * 0.3)})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
        hexPath(n.x, n.y, sz * 0.5);
        ctx.fillStyle = `rgba(${ac.r},${ac.g},${ac.b},${alpha * 0.15})`;
        ctx.fill();

        // Label
        if (n.z > 0.7 && pulse > 0.65) {
          ctx.font = `${Math.round(7 * n.z)}px monospace`;
          ctx.fillStyle = `rgba(${ac.r},${ac.g},${ac.b},${alpha * pulse * 0.55})`;
          ctx.fillText(n.label, n.x + sz + 3, n.y + 3);
        }
      }
    }

    function drawParticles() {
      for (const p of particles) {
        p.y += p.vy;
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        const rr = parseInt(p.col.slice(1, 3), 16);
        const rg = parseInt(p.col.slice(3, 5), 16);
        const rb = parseInt(p.col.slice(5, 7), 16);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rr},${rg},${rb},${p.alpha * opacity})`;
        ctx.fill();
      }
    }

    function drawScanLine(t: number) {
      const y = ((t * 0.18) % 1) * H;
      const sg = ctx.createLinearGradient(0, y - 40, 0, y + 40);
      sg.addColorStop(0, "transparent");
      sg.addColorStop(0.45, `rgba(${ac.r},${ac.g},${ac.b},0.015)`);
      sg.addColorStop(0.5, `rgba(${ac.r},${ac.g},${ac.b},0.04)`);
      sg.addColorStop(0.55, `rgba(${ac.r},${ac.g},${ac.b},0.015)`);
      sg.addColorStop(1, "transparent");
      ctx.fillStyle = sg;
      ctx.fillRect(0, y - 40, W, 80);
    }

    // ── Main loop ─────────────────────────────────────
    function draw() {
      timeRef.current += 0.012;
      const t = timeRef.current;
      ctx.clearRect(0, 0, W, H);

      drawGrid(t);
      drawNodes(t);
      drawParticles();
      drawScanLine(t);

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [accentColor, opacity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
