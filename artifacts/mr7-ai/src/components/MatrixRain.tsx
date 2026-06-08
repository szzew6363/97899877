import { useEffect, useRef } from "react";

interface MatrixRainProps {
  opacity?: number;
  color?: string;
  speed?: number;
  density?: number;
  style?: React.CSSProperties;
}

const CYBER_CHARS = "ﺍﺑﺗﺛﺟﺣﺧﺩﺫﺭﺯﺱﺷﺻﺿﻁﻅﻉﻏﻑﻕﻛﻝﻡﻥﻩﻭﻱ٠١٢٣٤٥٦٧٨٩0123456789ABCDEF<>[]{}|/\\!@#$%^&*";

export function MatrixRain({
  opacity = 0.35,
  color = "#e21227",
  speed = 1,
  density = 1,
  style = {},
}: MatrixRainProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const dropsRef = useRef<number[]>([]);
  const speedsRef = useRef<number[]>([]);
  const opacitiesRef = useRef<number[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const FONT_SIZE = 13;
    let cols = 0;

    function resize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
      cols = Math.floor(canvas!.width / FONT_SIZE * density);
      dropsRef.current = Array.from({ length: cols }, () => Math.random() * -(canvas!.height / FONT_SIZE));
      speedsRef.current = Array.from({ length: cols }, () => 0.3 + Math.random() * 0.7 * speed);
      opacitiesRef.current = Array.from({ length: cols }, () => 0.4 + Math.random() * 0.6);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let tick = 0;

    function draw() {
      tick++;
      const w = canvas!.width;
      const h = canvas!.height;

      ctx.fillStyle = `rgba(5,5,5,0.065)`;
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;

      const drops = dropsRef.current;
      const speeds = speedsRef.current;
      const opcs = opacitiesRef.current;

      for (let i = 0; i < drops.length; i++) {
        const y = drops[i];
        if (y < 0) {
          drops[i] += speeds[i];
          continue;
        }

        const screenY = y * FONT_SIZE;
        const screenX = (i * (w / drops.length));

        const distFromCenter = Math.abs(screenX - w / 2) / (w / 2);
        const perspectiveScale = 0.6 + (1 - distFromCenter) * 0.4;
        const charAlpha = opcs[i] * perspectiveScale * opacity;

        const charIndex = Math.floor(Math.random() * CYBER_CHARS.length);
        const char = CYBER_CHARS[charIndex];

        const isHead = Math.random() > 0.97;
        const isBright = Math.random() > 0.85;

        if (isHead) {
          ctx.fillStyle = `rgba(255,255,255,${charAlpha * 1.5})`;
        } else if (isBright) {
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${r},${g},${b},${charAlpha})`;
        } else {
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${Math.round(r * 0.5)},${Math.round(g * 0.5)},${Math.round(b * 0.5)},${charAlpha * 0.6})`;
        }

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.scale(perspectiveScale, 1);
        ctx.fillText(char, 0, 0);
        ctx.restore();

        drops[i] += speeds[i];
        if (screenY > h + FONT_SIZE * 10) {
          drops[i] = -Math.random() * 20;
          speeds[i] = 0.3 + Math.random() * 0.7 * speed;
          opcs[i] = 0.4 + Math.random() * 0.6;
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
    };
  }, [color, speed, density, opacity]);

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
