import { useEffect, useRef } from "react";

interface Cyber3DGridProps {
  opacity?: number;
  color?: string;
  style?: React.CSSProperties;
}

export function Cyber3DGrid({ opacity = 0.5, color = "#e21227", style = {} }: Cyber3DGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    function draw() {
      timeRef.current += 0.008;
      const t = timeRef.current;
      const w = canvas!.width;
      const h = canvas!.height;

      ctx.clearRect(0, 0, w, h);

      const GRID = 60;
      const fov = h * 1.4;
      const cameraZ = 300 + Math.sin(t * 0.3) * 50;
      const horizonY = h * 0.58;

      const totalLines = 24;
      const depth = 1200;

      for (let i = 0; i <= totalLines; i++) {
        const worldX = (i / totalLines - 0.5) * depth * 1.5;

        const farX = w / 2 + (worldX / depth) * fov;
        const farY = horizonY;

        const nearWorld = worldX * 3;
        const nearX = w / 2 + (nearWorld / cameraZ) * fov * 0.4;
        const nearY = h + 20;

        const distFade = Math.abs(i / totalLines - 0.5) * 2;
        const lineAlpha = (1 - distFade * distFade) * 0.18 * opacity;

        ctx.beginPath();
        ctx.moveTo(nearX, nearY);
        ctx.lineTo(farX, farY);
        ctx.strokeStyle = `rgba(${r},${g},${b},${lineAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      const rows = 16;
      for (let i = 1; i <= rows; i++) {
        const worldZ = (i / rows) * depth - (t * 40) % (depth / rows);
        const scale = fov / (fov + worldZ);
        const lineY = horizonY + (h - horizonY) * (1 - scale) * 2.5;

        if (lineY < horizonY || lineY > h + 10) continue;

        const lineWidth = w * (1 - (lineY - horizonY) / (h - horizonY) * 0.6);
        const cx = w / 2;

        const rowAlpha = ((lineY - horizonY) / (h - horizonY)) * 0.22 * opacity;

        ctx.beginPath();
        ctx.moveTo(cx - lineWidth / 2, lineY);
        ctx.lineTo(cx + lineWidth / 2, lineY);
        ctx.strokeStyle = `rgba(${r},${g},${b},${rowAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        const isHighlight = Math.abs((worldZ % (GRID * 2)) - GRID) < 2;
        if (isHighlight) {
          const pulseAlpha = rowAlpha * 3;
          ctx.beginPath();
          ctx.moveTo(cx - lineWidth / 2, lineY);
          ctx.lineTo(cx + lineWidth / 2, lineY);
          ctx.strokeStyle = `rgba(255,255,255,${pulseAlpha * 0.3})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      const glowGrd = ctx.createLinearGradient(0, horizonY - 20, 0, horizonY + 40);
      glowGrd.addColorStop(0, "transparent");
      glowGrd.addColorStop(0.5, `rgba(${r},${g},${b},${0.04 * opacity})`);
      glowGrd.addColorStop(1, "transparent");
      ctx.fillStyle = glowGrd;
      ctx.fillRect(0, horizonY - 20, w, 60);

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, [color, opacity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}
