import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════
   HOLO DATA STREAM
   Vertical scrolling hex/binary data columns on
   the left & right edges — ambient cyber aesthetic.
   Canvas-based for zero DOM overhead.
═══════════════════════════════════════════════ */

const HEX_CHARS = "0123456789ABCDEF";
const BIN_CHARS = "01";
const CVE_FRAGMENTS = ["CVE-","0x","0xFF","0x00","RCE","XSS","SQLi","/bin","NULL","#!"];

function randChar(set: string) { return set[Math.floor(Math.random() * set.length)]; }

interface StreamColumn {
  x: number;
  y: number;
  speed: number;
  chars: string[];
  color: string;
  opacity: number;
  bright: number; // index of bright char (head)
  type: "hex" | "binary" | "mixed";
}

const COLORS = ["#e21227", "#00e5ff", "#22c55e", "#a78bfa", "#f59e0b"];

export function HoloDataStream({ side = "both" }: { side?: "left" | "right" | "both" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const colsRef = useRef<StreamColumn[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const FONT_SIZE = 10;
    const STRIP_W = 48; // width of each side strip
    let W = 0; let H = 0;

    function resize() {
      W = canvas!.offsetWidth; H = canvas!.offsetHeight;
      canvas!.width = W; canvas!.height = H;
      initColumns();
    }

    function makeColumn(x: number): StreamColumn {
      const type = Math.random() > 0.5 ? "hex" : Math.random() > 0.5 ? "binary" : "mixed";
      const len = 8 + Math.floor(Math.random() * 16);
      const charSet = type === "hex" ? HEX_CHARS : type === "binary" ? BIN_CHARS : HEX_CHARS;
      return {
        x,
        y: -Math.random() * H,
        speed: 0.4 + Math.random() * 1.2,
        chars: Array.from({ length: len }, () => {
          if (type === "mixed" && Math.random() > 0.7) {
            return CVE_FRAGMENTS[Math.floor(Math.random() * CVE_FRAGMENTS.length)];
          }
          return randChar(charSet);
        }),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 0.15 + Math.random() * 0.25,
        bright: 0,
        type,
      };
    }

    function initColumns() {
      colsRef.current = [];
      const cols: number[] = [];

      if (side === "left" || side === "both") {
        for (let x = 4; x < STRIP_W; x += FONT_SIZE + 2) cols.push(x);
      }
      if (side === "right" || side === "both") {
        for (let x = W - STRIP_W; x < W - 4; x += FONT_SIZE + 2) cols.push(x);
      }

      colsRef.current = cols.map(x => makeColumn(x));
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function draw() {
      frameRef.current = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, W, H);

      colsRef.current.forEach((col, ci) => {
        col.y += col.speed;
        col.bright = (col.bright + 0.1) % col.chars.length;

        // Randomly mutate a char
        if (Math.random() > 0.96) {
          const charSet = col.type === "binary" ? BIN_CHARS : HEX_CHARS;
          const idx = Math.floor(Math.random() * col.chars.length);
          col.chars[idx] = randChar(charSet);
        }

        col.chars.forEach((ch, i) => {
          const cy = col.y - i * (FONT_SIZE + 2);
          if (cy < -FONT_SIZE || cy > H + FONT_SIZE) return;

          const isBright = Math.abs(i - Math.floor(col.bright)) < 1.5;
          const distFromBright = Math.abs(i - Math.floor(col.bright));
          const fadeFactor = Math.max(0, 1 - distFromBright / (col.chars.length * 0.6));

          ctx.font = `${FONT_SIZE}px "SF Mono", "Courier New", monospace`;
          ctx.textAlign = "center";

          if (isBright) {
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = col.color;
            ctx.shadowBlur = 8;
            ctx.globalAlpha = col.opacity * 2.5;
          } else {
            ctx.fillStyle = col.color;
            ctx.shadowBlur = 0;
            ctx.globalAlpha = col.opacity * fadeFactor;
          }

          ctx.fillText(ch.length > 1 ? ch[0] : ch, col.x, cy);
          ctx.shadowBlur = 0;
          ctx.globalAlpha = 1;
        });

        // Reset column when it scrolls off screen
        if (col.y - col.chars.length * (FONT_SIZE + 2) > H) {
          colsRef.current[ci] = {
            ...makeColumn(col.x),
            y: -Math.random() * (H * 0.5),
          };
        }
      });
    }

    draw();
    return () => { cancelAnimationFrame(frameRef.current); ro.disconnect(); };
  }, [side]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 1, opacity: 0.6,
      }}
    />
  );
}
