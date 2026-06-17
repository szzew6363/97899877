import { useEffect, useRef } from "react";

interface MatrixRainProps {
  opacity?: number;
  color?: string;
  speed?: number;
  density?: number;
  style?: React.CSSProperties;
}

const CYBER_CHARS = "ﺍﺑﺗﺛﺟﺣﺧﺩﺫﺭﺯﺱﺷﺻﺿﻁﻅﻉﻏﻑﻕﻛﻝﻡﻥﻩﻭﻱ٠١٢٣٤٥٦٧٨٩0123456789ABCDEF<>[]{}|/\\!@#$%^&*ΨΩΔΛΞΠΣΦαβγδεζηθλμνξπρστφψω∑∏∂∇∞≈≡≠←→↑↓⟨⟩";
// Rainbow hue channels for multi-color streams
const STREAM_HUES = [0, 30, 60, 120, 180, 210, 270, 300, 330];

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

  const streamHuesRef = useRef<number[]>([]);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const FONT_SIZE = 13;
    let cols = 0;

    function hslToRgb(h: number, s: number, l: number): [number,number,number] {
      const hh = ((h % 360) + 360) % 360;
      const k = (n: number) => (n + hh / 30) % 12;
      const a = s * Math.min(l, 1 - l);
      const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
      return [Math.round(f(0)*255), Math.round(f(8)*255), Math.round(f(4)*255)];
    }

    function resize() {
      canvas!.width = canvas!.offsetWidth;
      canvas!.height = canvas!.offsetHeight;
      cols = Math.floor(canvas!.width / FONT_SIZE * density);
      dropsRef.current   = Array.from({ length: cols }, () => Math.random() * -(canvas!.height / FONT_SIZE));
      speedsRef.current  = Array.from({ length: cols }, () => 0.3 + Math.random() * 0.7 * speed);
      opacitiesRef.current = Array.from({ length: cols }, () => 0.4 + Math.random() * 0.6);
      streamHuesRef.current = Array.from({ length: cols }, (_, i) => STREAM_HUES[i % STREAM_HUES.length]);
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let tick = 0;

    function draw() {
      tick++;
      timeRef.current += 0.008;
      const t = timeRef.current;
      const w = canvas!.width;
      const h = canvas!.height;

      ctx.fillStyle = `rgba(5,5,5,0.062)`;
      ctx.fillRect(0, 0, w, h);

      ctx.font = `${FONT_SIZE}px 'JetBrains Mono', monospace`;

      const drops = dropsRef.current;
      const speeds = speedsRef.current;
      const opcs = opacitiesRef.current;
      const hues = streamHuesRef.current;

      for (let i = 0; i < drops.length; i++) {
        const y = drops[i];
        if (y < 0) { drops[i] += speeds[i]; continue; }

        const screenY = y * FONT_SIZE;
        const screenX = (i * (w / drops.length));
        const distFromCenter = Math.abs(screenX - w / 2) / (w / 2);
        const perspectiveScale = 0.58 + (1 - distFromCenter) * 0.42;
        const charAlpha = opcs[i] * perspectiveScale * opacity;

        const charIndex = Math.floor(Math.random() * CYBER_CHARS.length);
        const char = CYBER_CHARS[charIndex];
        const isHead = Math.random() > 0.96;
        const isBright = Math.random() > 0.80;
        const isRainbow = Math.random() > 0.88;

        if (isHead) {
          ctx.fillStyle = `rgba(255,255,255,${charAlpha * 1.6})`;
        } else if (isRainbow) {
          // Shift hue per stream + time drift for living rainbow effect
          const streamHue = (hues[i] + t * 40) % 360;
          const [cr, cg, cb] = hslToRgb(streamHue, 1, 0.62);
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${charAlpha * 1.1})`;
        } else if (isBright) {
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${r},${g},${b},${charAlpha})`;
        } else {
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${Math.round(r*0.45)},${Math.round(g*0.45)},${Math.round(b*0.45)},${charAlpha * 0.55})`;
        }

        ctx.save();
        ctx.translate(screenX, screenY);
        ctx.scale(perspectiveScale, 1);
        ctx.fillText(char, 0, 0);
        ctx.restore();

        // Rare glitch flash: duplicate char shifted 1px
        if (Math.random() > 0.998) {
          ctx.save();
          ctx.translate(screenX + 1, screenY - 1);
          ctx.scale(perspectiveScale, 1);
          ctx.globalAlpha = charAlpha * 0.4;
          const [gr, gg, gb] = hslToRgb((hues[i] + 180) % 360, 1, 0.7);
          ctx.fillStyle = `rgba(${gr},${gg},${gb},1)`;
          ctx.fillText(char, 0, 0);
          ctx.restore();
        }

        drops[i] += speeds[i];
        if (screenY > h + FONT_SIZE * 10) {
          drops[i] = -Math.random() * 20;
          speeds[i] = 0.3 + Math.random() * 0.7 * speed;
          opcs[i] = 0.4 + Math.random() * 0.6;
          // Drift hue on respawn
          hues[i] = (hues[i] + 25 + Math.random() * 20) % 360;
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
