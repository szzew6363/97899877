import { useEffect, useRef, useState } from "react";
import { FullPageOverlay } from "@/components/FullPageOverlay";
import { Switch } from "@/components/ui/switch";
import {
  Server, Wifi, WifiOff, CheckCircle2, AlertCircle, ExternalLink, Cpu,
  RefreshCw, Download, Search, ChevronDown, ChevronUp, Zap, Brain,
  Shield, Code2, Eye, Globe, Star, Loader2, Copy, Check, Terminal,
  HardDrive, Gauge, MemoryStick, X, Radio, Activity,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

// ── Server endpoints to auto-scan ────────────────────────────────────────────
const AUTO_SCAN_TARGETS = [
  { id: "ollama",        label: "Ollama",         port: 11434, color: "#00e5ff", url: "http://localhost:11434/v1" },
  { id: "lmstudio",      label: "LM Studio",      port: 1234,  color: "#a78bfa", url: "http://localhost:1234/v1"  },
  { id: "jan",           label: "Jan",             port: 1337,  color: "#34d399", url: "http://localhost:1337/v1"  },
  { id: "gpt4all",       label: "GPT4All",         port: 4891,  color: "#f97316", url: "http://localhost:4891/v1"  },
  { id: "openwebui",     label: "Open WebUI",      port: 3000,  color: "#06d6a0", url: "http://localhost:3000/v1"  },
  { id: "llamafile",     label: "Llamafile",       port: 8080,  color: "#fbbf24", url: "http://localhost:8080/v1"  },
  { id: "kobold",        label: "KoboldCPP",       port: 5001,  color: "#f72585", url: "http://localhost:5001/v1"  },
] as const;

type ScanStatus = "idle" | "scanning" | "found" | "notfound";
type ScanResult = { id: string; status: ScanStatus; models: string[]; latencyMs?: number };

// ── 3D Radar Scan Canvas ──────────────────────────────────────────────────────
function RadarScan3D({ results, scanning }: { results: ScanResult[]; scanning: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const W = canvas.width = 240, H = canvas.height = 160;
    const cx = W / 2, cy = H / 2;
    let frame = 0;

    function draw() {
      frame++;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#060608";
      ctx.fillRect(0, 0, W, H);

      // Grid rings
      [30, 55, 75].forEach((r, ri) => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0,229,255,${0.06 + ri * 0.02})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
      // Cross hairs
      ctx.strokeStyle = "rgba(0,229,255,0.08)";
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx, cy - 80); ctx.lineTo(cx, cy + 80); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 120, cy); ctx.lineTo(cx + 120, cy); ctx.stroke();

      // Sweep beam
      if (scanning) {
        const angle = (frame * 0.04) % (Math.PI * 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        // Manual sweep cone
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 80, -0.4, 0.4);
        ctx.closePath();
        const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 80);
        sg.addColorStop(0, "rgba(0,229,255,0.25)");
        sg.addColorStop(1, "rgba(0,229,255,0)");
        ctx.fillStyle = sg;
        ctx.fill();
        // Sweep line
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(80, 0);
        ctx.strokeStyle = "rgba(0,229,255,0.8)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // Server blips — dynamic circle arrangement
      const positions = AUTO_SCAN_TARGETS.map((_, i) => {
        const angle = (i / AUTO_SCAN_TARGETS.length) * Math.PI * 2 - Math.PI / 2;
        const r = 58;
        return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
      });
      AUTO_SCAN_TARGETS.forEach((t, i) => {
        const res = results.find(r => r.id === t.id);
        const pos = positions[i];
        const pulse = (Math.sin(frame * 0.06 + i) + 1) / 2;
        const status = res?.status ?? "idle";

        // Blip color
        const color = status === "found" ? t.color
          : status === "notfound" ? "#ef4444"
          : status === "scanning" ? "#fbbf24"
          : "#ffffff33";

        // Outer ring (for found/scanning)
        if (status === "found" || status === "scanning") {
          ctx.beginPath();
          ctx.arc(pos.x, pos.y, 8 + pulse * 6, 0, Math.PI * 2);
          ctx.strokeStyle = color + "44";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Core dot
        const gr = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 5);
        gr.addColorStop(0, status === "idle" ? "#ffffff22" : color);
        gr.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = gr;
        ctx.fill();

        // Label
        ctx.fillStyle = status === "found" ? color : "rgba(255,255,255,0.3)";
        ctx.font = `bold 8px monospace`;
        ctx.textAlign = "center";
        ctx.fillText(t.label, pos.x, pos.y - 8);
        if (res?.latencyMs && status === "found") {
          ctx.font = `7px monospace`;
          ctx.fillStyle = color + "aa";
          ctx.fillText(`${res.latencyMs}ms`, pos.x, pos.y + 14);
        }
      });

      // Center label
      ctx.fillStyle = scanning ? "rgba(0,229,255,0.6)" : "rgba(255,255,255,0.2)";
      ctx.font = "bold 9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(scanning ? "SCANNING..." : "LOCAL SERVERS", cx, cy + 3);

      rafRef.current = requestAnimationFrame(draw);
    }
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [scanning, results]);

  return (
    <canvas
      ref={canvasRef}
      width={240} height={160}
      className="w-full max-w-[240px] mx-auto rounded-xl"
      style={{ imageRendering: "crisp-edges", border: "1px solid rgba(0,229,255,0.12)" }}
    />
  );
}

type ModelTag = "UNCENSORED" | "FAST" | "POWERFUL" | "CODE" | "VISION" | "REASONING" | "MULTILINGUAL" | "TINY" | "EMBED";
type ModelGroup = "Dolphin / Uncensored" | "Llama Family" | "Mistral Family" | "DeepSeek" | "Qwen" | "Phi / Small" | "Code Models" | "Vision Models" | "Arabic / Multilingual" | "Gemma" | "Security Specialist" | "Mixtral" | "Embedding Models";

const QUICK_MODELS: {
  id: string; label: string; tag: ModelTag; group: ModelGroup;
  size?: string; ctx?: string; hot?: boolean;
}[] = [
  // Dolphin / Uncensored
  { id: "dolphin-mixtral", label: "Dolphin Mixtral 8x7B", tag: "UNCENSORED", group: "Dolphin / Uncensored", size: "26GB", ctx: "32K", hot: true },
  { id: "dolphin-llama3:8b", label: "Dolphin Llama3 8B", tag: "UNCENSORED", group: "Dolphin / Uncensored", size: "4.7GB", ctx: "8K" },
  { id: "dolphin-llama3:70b", label: "Dolphin Llama3 70B", tag: "UNCENSORED", group: "Dolphin / Uncensored", size: "40GB", ctx: "8K" },
  { id: "dolphin-phi3", label: "Dolphin Phi-3 Mini", tag: "UNCENSORED", group: "Dolphin / Uncensored", size: "2.2GB", ctx: "4K" },
  { id: "dolphin3", label: "Dolphin 3.0 Llama3.2", tag: "UNCENSORED", group: "Dolphin / Uncensored", size: "2GB", ctx: "128K", hot: true },
  { id: "dolphincoder", label: "DolphinCoder", tag: "UNCENSORED", group: "Dolphin / Uncensored", size: "3.8GB", ctx: "16K" },

  // Llama Family
  { id: "llama3.1:8b", label: "Llama 3.1 8B", tag: "FAST", group: "Llama Family", size: "4.7GB", ctx: "128K", hot: true },
  { id: "llama3.1:70b", label: "Llama 3.1 70B", tag: "POWERFUL", group: "Llama Family", size: "40GB", ctx: "128K" },
  { id: "llama3.1:405b", label: "Llama 3.1 405B", tag: "POWERFUL", group: "Llama Family", size: "230GB", ctx: "128K" },
  { id: "llama3.2:1b", label: "Llama 3.2 1B", tag: "TINY", group: "Llama Family", size: "1.3GB", ctx: "128K" },
  { id: "llama3.2:3b", label: "Llama 3.2 3B", tag: "FAST", group: "Llama Family", size: "2GB", ctx: "128K" },
  { id: "llama3.2-vision:11b", label: "Llama 3.2 Vision 11B", tag: "VISION", group: "Llama Family", size: "7.9GB", ctx: "128K" },
  { id: "llama3.3:70b", label: "Llama 3.3 70B", tag: "POWERFUL", group: "Llama Family", size: "43GB", ctx: "128K", hot: true },
  { id: "llama4:scout", label: "Llama 4 Scout", tag: "POWERFUL", group: "Llama Family", size: "67GB", ctx: "10M", hot: true },

  // Mistral Family
  { id: "mistral:7b", label: "Mistral 7B v0.3", tag: "FAST", group: "Mistral Family", size: "4.1GB", ctx: "32K" },
  { id: "mixtral:8x7b", label: "Mixtral 8x7B", tag: "POWERFUL", group: "Mistral Family", size: "26GB", ctx: "32K" },
  { id: "mixtral:8x22b", label: "Mixtral 8x22B", tag: "POWERFUL", group: "Mistral Family", size: "80GB", ctx: "64K" },
  { id: "mistral-nemo", label: "Mistral Nemo 12B", tag: "FAST", group: "Mistral Family", size: "7.1GB", ctx: "128K", hot: true },
  { id: "mistral-small", label: "Mistral Small 3.1", tag: "FAST", group: "Mistral Family", size: "15GB", ctx: "128K" },

  // DeepSeek
  { id: "deepseek-r1:7b", label: "DeepSeek-R1 7B", tag: "REASONING", group: "DeepSeek", size: "4.7GB", ctx: "128K", hot: true },
  { id: "deepseek-r1:14b", label: "DeepSeek-R1 14B", tag: "REASONING", group: "DeepSeek", size: "9.0GB", ctx: "128K" },
  { id: "deepseek-r1:32b", label: "DeepSeek-R1 32B", tag: "REASONING", group: "DeepSeek", size: "19GB", ctx: "128K" },
  { id: "deepseek-r1:70b", label: "DeepSeek-R1 70B", tag: "REASONING", group: "DeepSeek", size: "43GB", ctx: "128K" },
  { id: "deepseek-coder-v2", label: "DeepSeek Coder V2", tag: "CODE", group: "DeepSeek", size: "8.9GB", ctx: "128K" },
  { id: "deepseek-v3", label: "DeepSeek-V3", tag: "POWERFUL", group: "DeepSeek", size: "39GB", ctx: "64K", hot: true },

  // Qwen
  { id: "qwen2.5:7b", label: "Qwen 2.5 7B", tag: "MULTILINGUAL", group: "Qwen", size: "4.7GB", ctx: "128K", hot: true },
  { id: "qwen2.5:14b", label: "Qwen 2.5 14B", tag: "MULTILINGUAL", group: "Qwen", size: "9.0GB", ctx: "128K" },
  { id: "qwen2.5:32b", label: "Qwen 2.5 32B", tag: "MULTILINGUAL", group: "Qwen", size: "19GB", ctx: "128K" },
  { id: "qwen2.5:72b", label: "Qwen 2.5 72B", tag: "POWERFUL", group: "Qwen", size: "47GB", ctx: "128K" },
  { id: "qwen2.5-coder:7b", label: "Qwen 2.5 Coder 7B", tag: "CODE", group: "Qwen", size: "4.7GB", ctx: "32K" },
  { id: "qwq", label: "QwQ 32B (Reasoning)", tag: "REASONING", group: "Qwen", size: "19GB", ctx: "32K", hot: true },

  // Phi / Small
  { id: "phi4", label: "Phi-4 14B", tag: "POWERFUL", group: "Phi / Small", size: "8.9GB", ctx: "16K", hot: true },
  { id: "phi4-mini", label: "Phi-4 Mini 3.8B", tag: "FAST", group: "Phi / Small", size: "2.5GB", ctx: "128K" },
  { id: "phi3.5", label: "Phi-3.5 Mini 3.8B", tag: "FAST", group: "Phi / Small", size: "2.2GB", ctx: "128K" },
  { id: "smollm2:1.7b", label: "SmolLM2 1.7B", tag: "TINY", group: "Phi / Small", size: "1.0GB", ctx: "8K" },
  { id: "tinyllama", label: "TinyLlama 1.1B", tag: "REPLIT", group: "Phi / Small", size: "638MB", ctx: "2K", hot: true },

  // Code Models
  { id: "codellama:7b", label: "Code Llama 7B", tag: "CODE", group: "Code Models", size: "3.8GB", ctx: "16K" },
  { id: "codellama:34b", label: "Code Llama 34B", tag: "CODE", group: "Code Models", size: "19GB", ctx: "16K" },
  { id: "starcoder2:7b", label: "StarCoder2 7B", tag: "CODE", group: "Code Models", size: "4.0GB", ctx: "16K" },
  { id: "codegemma:7b", label: "CodeGemma 7B", tag: "CODE", group: "Code Models", size: "5.0GB", ctx: "8K" },

  // Vision Models
  { id: "llava:7b", label: "LLaVA 7B", tag: "VISION", group: "Vision Models", size: "4.5GB", ctx: "4K" },
  { id: "llava:34b", label: "LLaVA 34B", tag: "VISION", group: "Vision Models", size: "20GB", ctx: "4K" },
  { id: "moondream", label: "Moondream2 1.4B", tag: "VISION", group: "Vision Models", size: "829MB", ctx: "2K" },
  { id: "minicpm-v", label: "MiniCPM-V 8B", tag: "VISION", group: "Vision Models", size: "5.5GB", ctx: "8K" },

  // Arabic / Multilingual
  { id: "aya:8b", label: "Aya 8B (عربي)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "4.8GB", ctx: "8K", hot: true },
  { id: "aya:35b", label: "Aya 35B (عربي)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "19GB", ctx: "8K" },
  { id: "qwen2:7b", label: "Qwen2 7B (متعدد اللغات)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "4.4GB", ctx: "128K" },

  // Gemma
  { id: "gemma2:2b", label: "Gemma 2 2B", tag: "TINY", group: "Gemma", size: "1.6GB", ctx: "8K" },
  { id: "gemma2:9b", label: "Gemma 2 9B", tag: "FAST", group: "Gemma", size: "5.4GB", ctx: "8K", hot: true },
  { id: "gemma2:27b", label: "Gemma 2 27B", tag: "POWERFUL", group: "Gemma", size: "16GB", ctx: "8K" },
  { id: "gemma3:12b", label: "Gemma 3 12B", tag: "FAST", group: "Gemma", size: "8.1GB", ctx: "128K", hot: true },
  { id: "gemma3:27b", label: "Gemma 3 27B", tag: "POWERFUL", group: "Gemma", size: "17GB", ctx: "128K" },
  { id: "gemma3:4b", label: "Gemma 3 4B", tag: "TINY", group: "Gemma", size: "2.7GB", ctx: "128K" },
  { id: "gemma3:1b", label: "Gemma 3 1B (Tiny)", tag: "TINY", group: "Gemma", size: "815MB", ctx: "32K" },

  // Security / Uncensored Specialist
  { id: "dolphin3:8b", label: "Dolphin 3.0 8B", tag: "UNCENSORED", group: "Security Specialist", size: "4.9GB", ctx: "128K", hot: true },
  { id: "dolphin-llama3:8b", label: "Dolphin Llama3 8B", tag: "UNCENSORED", group: "Security Specialist", size: "4.7GB", ctx: "8K", hot: true },
  { id: "dolphin-llama3:70b", label: "Dolphin Llama3 70B", tag: "UNCENSORED", group: "Security Specialist", size: "43GB", ctx: "8K" },
  { id: "nous-hermes2:34b", label: "Nous-Hermes-2 34B", tag: "UNCENSORED", group: "Security Specialist", size: "19GB", ctx: "4K" },
  { id: "wizard-vicuna-uncensored:30b", label: "Wizard Vicuna 30B (Uncensored)", tag: "UNCENSORED", group: "Security Specialist", size: "18GB", ctx: "2K" },
  { id: "solar-pro", label: "SOLAR Pro 22B", tag: "POWERFUL", group: "Security Specialist", size: "14GB", ctx: "4K" },

  // Code Specialist — Extended
  { id: "qwen2.5-coder:7b", label: "Qwen2.5 Coder 7B", tag: "CODE", group: "Code Models", size: "4.7GB", ctx: "32K", hot: true },
  { id: "qwen2.5-coder:32b", label: "Qwen2.5 Coder 32B", tag: "CODE", group: "Code Models", size: "19GB", ctx: "32K", hot: true },
  { id: "devstral", label: "Devstral 24B (Code)", tag: "CODE", group: "Code Models", size: "14GB", ctx: "128K", hot: true },
  { id: "codegemma:2b", label: "CodeGemma 2B (Tiny)", tag: "CODE", group: "Code Models", size: "1.6GB", ctx: "8K" },
  { id: "deepseek-coder-v2:16b", label: "DeepSeek Coder V2 16B", tag: "CODE", group: "Code Models", size: "8.9GB", ctx: "128K", hot: true },
  { id: "deepseek-coder:6.7b", label: "DeepSeek Coder 6.7B", tag: "CODE", group: "Code Models", size: "3.8GB", ctx: "16K" },
  { id: "starcoder2:15b", label: "StarCoder2 15B", tag: "CODE", group: "Code Models", size: "9.1GB", ctx: "16K" },
  { id: "starcoder2:3b", label: "StarCoder2 3B", tag: "CODE", group: "Code Models", size: "1.7GB", ctx: "16K" },
  { id: "phind-codellama:34b", label: "Phind CodeLlama 34B", tag: "CODE", group: "Code Models", size: "19GB", ctx: "16K" },

  // Vision Extended
  { id: "llava:13b", label: "LLaVA 13B", tag: "VISION", group: "Vision Models", size: "8.0GB", ctx: "4K" },
  { id: "llava-llama3:8b", label: "LLaVA-Llama3 8B", tag: "VISION", group: "Vision Models", size: "5.5GB", ctx: "8K", hot: true },
  { id: "llava-phi3:3.8b", label: "LLaVA-Phi3 3.8B", tag: "VISION", group: "Vision Models", size: "2.9GB", ctx: "4K" },
  { id: "minicpm-v:8b", label: "MiniCPM-V 8B", tag: "VISION", group: "Vision Models", size: "5.5GB", ctx: "8K" },
  { id: "qwen2.5vl:7b", label: "Qwen2.5-VL 7B", tag: "VISION", group: "Vision Models", size: "4.9GB", ctx: "128K", hot: true },
  { id: "qwen2.5vl:72b", label: "Qwen2.5-VL 72B", tag: "VISION", group: "Vision Models", size: "46GB", ctx: "128K" },
  { id: "granite3.2-vision:2b", label: "Granite 3.2 Vision 2B", tag: "VISION", group: "Vision Models", size: "1.7GB", ctx: "128K" },

  // Reasoning Extended
  { id: "deepseek-r1:1.5b", label: "DeepSeek-R1 1.5B (Tiny)", tag: "REASONING", group: "DeepSeek", size: "1.1GB", ctx: "128K" },
  { id: "deepseek-r1:14b", label: "DeepSeek-R1 14B", tag: "REASONING", group: "DeepSeek", size: "9.0GB", ctx: "128K", hot: true },
  { id: "deepseek-r1:32b", label: "DeepSeek-R1 32B", tag: "REASONING", group: "DeepSeek", size: "19GB", ctx: "128K", hot: true },
  { id: "deepseek-r1:70b", label: "DeepSeek-R1 70B", tag: "REASONING", group: "DeepSeek", size: "43GB", ctx: "128K" },

  // Mixtral Family
  { id: "mixtral:8x7b", label: "Mixtral 8x7B MoE", tag: "POWERFUL", group: "Mixtral", size: "26GB", ctx: "32K" },
  { id: "mixtral:8x22b", label: "Mixtral 8x22B MoE", tag: "POWERFUL", group: "Mixtral", size: "80GB", ctx: "64K" },
  { id: "mistral-small:22b", label: "Mistral Small 22B", tag: "POWERFUL", group: "Mixtral", size: "13GB", ctx: "128K", hot: true },
  { id: "mistral:7b", label: "Mistral 7B v0.3", tag: "FAST", group: "Mixtral", size: "4.1GB", ctx: "32K" },

  // Arabic / Multilingual Extended
  { id: "aya-expanse:8b", label: "Aya Expanse 8B (متعدد)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "4.8GB", ctx: "128K", hot: true },
  { id: "aya-expanse:32b", label: "Aya Expanse 32B (متعدد)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "19GB", ctx: "128K" },
  { id: "allam:7b", label: "ALLaM 7B (عربي)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "4.7GB", ctx: "32K", hot: true },
  { id: "silma-v1:9b", label: "SILMA 9B (عربي)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "5.5GB", ctx: "8K" },
  { id: "command-r:35b", label: "Command R 35B", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "20GB", ctx: "128K" },
  { id: "seallm:7b", label: "SeaLLM 7B (SE Asia)", tag: "MULTILINGUAL", group: "Arabic / Multilingual", size: "4.2GB", ctx: "32K" },

  // Embedding Models
  { id: "nomic-embed-text", label: "Nomic Embed Text", tag: "EMBED", group: "Embedding Models", size: "274MB", ctx: "8K" },
  { id: "mxbai-embed-large", label: "MxBai Embed Large", tag: "EMBED", group: "Embedding Models", size: "670MB", ctx: "512" },
  { id: "bge-m3", label: "BGE-M3 Multilingual", tag: "EMBED", group: "Embedding Models", size: "1.2GB", ctx: "8K" },
  { id: "all-minilm:22m", label: "All-MiniLM 22M", tag: "EMBED", group: "Embedding Models", size: "45MB", ctx: "512" },
  { id: "snowflake-arctic-embed:22m", label: "Snowflake Arctic Embed 22M", tag: "EMBED", group: "Embedding Models", size: "45MB", ctx: "512" },
];

type TestStatus = "idle" | "testing" | "ok" | "fail";

// ── 3D Neural Probe — animates during connection test ─────────────────────────
function NeuralTestProbe3D({
  status, latencyMs, modelCount, endpoint,
}: {
  status: TestStatus; latencyMs: number | null; modelCount: number; endpoint: string;
}) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = (cv.width = 440), H = (cv.height = 130);
    const cx = W / 2, cy = H / 2;

    const COL = () =>
      status === "testing" ? "#fbbf24"
        : status === "ok"  ? "#22c55e"
        : status === "fail"? "#ef4444"
        : "#00e5ff";

    // Particles in orbit
    const pts = Array.from({ length: 40 }, (_, i) => ({
      a: (i / 40) * Math.PI * 2,
      r: 28 + (i % 3) * 14,
      spd: 0.008 + (i % 5) * 0.003,
      sz: 0.8 + (i % 3) * 0.7,
      ph: Math.random() * Math.PI * 2,
    }));

    // Data stream dots flowing left→right
    const streams = Array.from({ length: 6 }, (_, i) => ({
      t: i / 6, y: 28 + i * 12, spd: 0.003 + i * 0.001,
      col: ["#00e5ff","#22c55e","#a78bfa","#fbbf24","#ec4899","#06b6d4"][i],
    }));

    let live = true;
    const draw = () => {
      if (!live) return;
      frameRef.current++;
      const f = frameRef.current;
      const col = COL();

      ctx.clearRect(0, 0, W, H);
      // Background
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, "#030508");
      bg.addColorStop(1, "#050810");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Left panel — connection target info
      ctx.save();
      ctx.fillStyle = "rgba(0,229,255,0.04)";
      ctx.strokeStyle = "rgba(0,229,255,0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(8, 8, 110, H - 16, 8);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "left";
      ctx.fillText("ENDPOINT", 16, 24);
      ctx.fillStyle = col + "bb";
      ctx.font = "6.5px monospace";
      const ep = endpoint.replace(/^https?:\/\//, "").slice(0, 18);
      ctx.fillText(ep, 16, 38);

      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "bold 7px monospace";
      ctx.fillText("STATUS", 16, 58);
      const statusLabel = status === "idle" ? "READY" : status === "testing" ? "PROBING" : status === "ok" ? "ONLINE" : "OFFLINE";
      ctx.fillStyle = col;
      ctx.font = "bold 9px monospace";
      ctx.fillText(statusLabel, 16, 74);

      if (status === "ok") {
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.font = "bold 7px monospace";
        ctx.fillText("LATENCY", 16, 94);
        ctx.fillStyle = (latencyMs ?? 999) < 50 ? "#22c55e" : (latencyMs ?? 999) < 200 ? "#fbbf24" : "#ef4444";
        ctx.font = "bold 10px monospace";
        ctx.fillText(`${latencyMs}ms`, 16, 108);
      }

      // Right panel — model count / stats
      ctx.save();
      ctx.fillStyle = "rgba(167,139,250,0.04)";
      ctx.strokeStyle = "rgba(167,139,250,0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(W - 118, 8, 110, H - 16, 8);
      ctx.fill(); ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.font = "bold 7px monospace";
      ctx.textAlign = "right";
      ctx.fillText("MODELS FOUND", W - 16, 24);
      ctx.fillStyle = status === "ok" ? "#a78bfa" : "rgba(255,255,255,0.18)";
      ctx.font = "bold 22px monospace";
      ctx.fillText(status === "ok" ? String(modelCount) : "—", W - 16, 56);
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.font = "6.5px monospace";
      ctx.fillText("available", W - 16, 68);

      if (status === "testing") {
        const dots = ".".repeat(1 + (f % 60 < 20 ? 0 : f % 60 < 40 ? 1 : 2));
        ctx.fillStyle = "#fbbf24" + "aa";
        ctx.font = "bold 8px monospace";
        ctx.fillText(`SCANNING${dots}`, W - 16, 94);
        // progress bar
        const pct = (f % 80) / 80;
        ctx.fillStyle = "rgba(251,191,36,0.1)";
        ctx.beginPath(); ctx.roundRect(W - 110, 100, 94, 5, 2); ctx.fill();
        ctx.fillStyle = "#fbbf24";
        ctx.beginPath(); ctx.roundRect(W - 110, 100, 94 * pct, 5, 2); ctx.fill();
      }

      // ── Center 3D Orb ─────────────────────────────────────────────────────
      const pulse = 1 + Math.sin(f * 0.08) * (status === "testing" ? 0.35 : 0.12);

      // Outer scanning rings
      [52, 38, 26].forEach((r, ri) => {
        const phase = f * (status === "testing" ? 0.07 : 0.025) + ri * 1.1;
        const alpha = (0.08 + Math.abs(Math.sin(phase)) * 0.18) * (status === "idle" ? 0.4 : 1);
        ctx.beginPath();
        ctx.arc(cx, cy, r * pulse, 0, Math.PI * 2);
        ctx.strokeStyle = col + Math.round(alpha * 255).toString(16).padStart(2, "0");
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // Scanning beam (testing only)
      if (status === "testing") {
        const angle = (f * 0.07) % (Math.PI * 2);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 52);
        sg.addColorStop(0, "#fbbf2444");
        sg.addColorStop(1, "#fbbf2400");
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 52, -0.55, 0.55);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#fbbf24cc";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(52, 0); ctx.stroke();
        ctx.restore();
      }

      // Success burst
      if (status === "ok") {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + f * 0.01;
          const r = 52 + Math.sin(f * 0.04 + i) * 6;
          const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#22c55e" + Math.round((0.4 + Math.sin(f * 0.06 + i) * 0.3) * 255).toString(16).padStart(2, "0");
          ctx.fill();
        }
      }

      // Orbiting particles
      pts.forEach((p, i) => {
        p.a += p.spd;
        const x = cx + Math.cos(p.a) * p.r;
        const y = cy + Math.sin(p.a) * p.r;
        const alpha = 0.25 + Math.sin(f * 0.05 + p.ph) * 0.35;
        const pg = ctx.createRadialGradient(x, y, 0, x, y, p.sz * 3);
        pg.addColorStop(0, col + Math.round(Math.max(0.1, alpha) * 255).toString(16).padStart(2, "0"));
        pg.addColorStop(1, col + "00");
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(x, y, p.sz * 2.5, 0, Math.PI * 2); ctx.fill();
        void i;
      });

      // Data streams
      streams.forEach(s => {
        s.t = (s.t + s.spd) % 1;
        if (status === "idle") return;
        const x = 128 + s.t * (W - 260);
        const ag = ctx.createRadialGradient(x, s.y, 0, x, s.y, 8);
        ag.addColorStop(0, s.col + "cc");
        ag.addColorStop(1, s.col + "00");
        ctx.fillStyle = ag;
        ctx.beginPath(); ctx.arc(x, s.y, 8, 0, Math.PI * 2); ctx.fill();
        // Trail
        for (let t = 1; t <= 5; t++) {
          const tx = x - t * 12;
          if (tx < 128) break;
          ctx.globalAlpha = (1 - t / 5) * 0.25;
          ctx.fillStyle = s.col;
          ctx.beginPath(); ctx.arc(tx, s.y, 3 - t * 0.4, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
        }
      });

      // Center orb
      const orbR = 18 * pulse;
      const og = ctx.createRadialGradient(cx, cy, 0, cx, cy, orbR);
      og.addColorStop(0, "#ffffff");
      og.addColorStop(0.25, col + "ff");
      og.addColorStop(0.7, col + "44");
      og.addColorStop(1, col + "00");
      ctx.fillStyle = og;
      ctx.shadowColor = col;
      ctx.shadowBlur = 24 * pulse;
      ctx.beginPath(); ctx.arc(cx, cy, orbR, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      // Scanline
      const slY = ((f * 0.8) % (H + 2)) - 1;
      const slG = ctx.createLinearGradient(0, slY, 0, slY + 2);
      slG.addColorStop(0, "rgba(0,229,255,0)");
      slG.addColorStop(0.5, "rgba(0,229,255,0.07)");
      slG.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = slG;
      ctx.fillRect(0, slY, W, 2);

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { live = false; cancelAnimationFrame(rafRef.current); };
  }, [status, latencyMs, modelCount, endpoint]);

  return (
    <canvas ref={cvRef} width={440} height={130}
      className="w-full rounded-2xl"
      style={{ border: "1px solid rgba(0,229,255,0.1)", imageRendering: "crisp-edges" }}
    />
  );
}
type VramProfile = "4gb" | "8gb" | "12gb" | "16gb" | "24gb" | "48gb+";

const VRAM_PROFILES: { id: VramProfile; label: string; ram: string; recommended: string[] }[] = [
  { id: "4gb",   label: "4 GB",   ram: "4GB VRAM",   recommended: ["tinyllama", "smollm2:1.7b", "gemma2:2b", "dolphin-phi3"] },
  { id: "8gb",   label: "8 GB",   ram: "8GB VRAM",   recommended: ["dolphin3", "llama3.2:3b", "mistral-nemo", "deepseek-r1:7b", "qwen2.5:7b", "phi4-mini"] },
  { id: "12gb",  label: "12 GB",  ram: "12GB VRAM",  recommended: ["dolphin-llama3:8b", "gemma3:12b", "phi4", "deepseek-r1:14b", "qwq"] },
  { id: "16gb",  label: "16 GB",  ram: "16GB VRAM",  recommended: ["mistral-small", "deepseek-r1:14b", "qwen2.5:14b", "gemma2:9b"] },
  { id: "24gb",  label: "24 GB",  ram: "24GB VRAM",  recommended: ["dolphin-mixtral", "llama3.3:70b", "deepseek-r1:32b", "qwen2.5:32b", "gemma2:27b"] },
  { id: "48gb+", label: "48 GB+", ram: "48GB+ VRAM", recommended: ["dolphin-llama3:70b", "mixtral:8x7b", "deepseek-v3", "llama4:scout", "qwen2.5:72b"] },
];

interface LocalModelModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenEngineHub?: () => void;
}

export function LocalModelModal({ open, onOpenChange, onOpenEngineHub }: LocalModelModalProps) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const lang = state.settings.language;

  const [endpoint, setEndpoint] = useState(state.settings.localEndpoint || "http://localhost:11434/v1");
  const [model, setModel] = useState(state.settings.localModel || "tinyllama");
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testMsg, setTestMsg] = useState("");
  const [testLatency, setTestLatency] = useState<number | null>(null);
  const [testModelCount, setTestModelCount] = useState(0);
  const [detectedModels, setDetectedModels] = useState<string[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("كل النماذج");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(["Dolphin / Uncensored", "DeepSeek"]));
  const [serverType, setServerType] = useState<"ollama" | "lmstudio" | "custom">("ollama");
  const [vramProfile, setVramProfile] = useState<VramProfile | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [ollamaManagerOpen, setOllamaManagerOpen] = useState(false);
  const [installedModels, setInstalledModels] = useState<{ name: string; size: number; modified_at: string }[]>([]);
  const [loadingInstalled, setLoadingInstalled] = useState(false);
  const [pullName, setPullName] = useState("");
  const [pullProgress, setPullProgress] = useState<{ status: string; completed?: number; total?: number } | null>(null);
  const [pulling, setPulling] = useState(false);
  const [deletingModel, setDeletingModel] = useState<string | null>(null);

  // ── Auto-detect state ────────────────────────────────────────────────────────
  const [autoScanning, setAutoScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>(
    AUTO_SCAN_TARGETS.map(t => ({ id: t.id, status: "idle" as ScanStatus, models: [] }))
  );

  // Auto-scan all local servers when modal opens
  useEffect(() => {
    if (!open) return;
    const alreadyScanned = scanResults.some(r => r.status === "found" || r.status === "notfound");
    if (alreadyScanned) return;
    runAutoScan();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runAutoScan() {
    setAutoScanning(true);
    setScanResults(AUTO_SCAN_TARGETS.map(t => ({ id: t.id, status: "scanning" as ScanStatus, models: [] })));

    const results = await Promise.all(AUTO_SCAN_TARGETS.map(async (target) => {
      const t0 = Date.now();
      try {
        const res = await fetch(`/api/local-proxy/ping?endpoint=${encodeURIComponent(target.url)}`, {
          signal: AbortSignal.timeout(5000),
        });
        const latencyMs = Date.now() - t0;
        if (res.ok) {
          const data = await res.json().catch(() => ({})) as { ok?: boolean; models?: string[] };
          if (data.ok) {
            return { id: target.id, status: "found" as ScanStatus, models: data.models ?? [], latencyMs };
          }
        }
        return { id: target.id, status: "notfound" as ScanStatus, models: [], latencyMs };
      } catch {
        return { id: target.id, status: "notfound" as ScanStatus, models: [] };
      }
    }));

    setScanResults(results);
    setAutoScanning(false);

    // Auto-apply first found server
    const found = results.find(r => r.status === "found");
    if (found) {
      const target = AUTO_SCAN_TARGETS.find(t => t.id === found.id);
      if (target) {
        setEndpoint(target.url);
        setServerType(found.id === "ollama" ? "ollama" : found.id === "lmstudio" ? "lmstudio" : "custom");
        setDetectedModels(found.models);
        if (found.models.length > 0) setModel(found.models[0]);
        toast({ description: `تم اكتشاف ${target.label} تلقائياً — ${found.models.length} نموذج` });
      }
    }
  }

  const useLocal = state.settings.useLocalModel;

  const GROUPS = Array.from(new Set(QUICK_MODELS.map((m) => m.group)));

  const filtered = QUICK_MODELS.filter((m) => {
    const matchSearch = !search || m.label.toLowerCase().includes(search.toLowerCase()) || m.id.toLowerCase().includes(search.toLowerCase());
    const matchGroup = activeGroup === "كل النماذج" || m.group === activeGroup;
    return matchSearch && matchGroup;
  });

  function toggleLocalModel(v: boolean) {
    dispatch({ type: "SET_SETTINGS", patch: { useLocalModel: v } });
    toast({ description: v ? "تم تفعيل النموذج المحلي" : "تم التبديل إلى CHAT-GPT.ai" });
  }

  function save() {
    dispatch({ type: "SET_SETTINGS", patch: { localEndpoint: endpoint.trim(), localModel: model.trim() } });
    toast({ description: "تم حفظ إعدادات النموذج المحلي" });
  }

  function applyServerPreset(type: "ollama" | "lmstudio" | "custom") {
    setServerType(type);
    if (type === "ollama") setEndpoint("http://localhost:11434/v1");
    else if (type === "lmstudio") setEndpoint("http://localhost:1234/v1");
  }

  function getOllamaBase() {
    const base = endpoint.trim().replace(/\/v1\/?$/, "").replace(/\/$/, "");
    return base;
  }

  async function loadInstalledModels() {
    setLoadingInstalled(true);
    try {
      const res = await fetch(`${getOllamaBase()}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json() as { models?: { name: string; size: number; modified_at: string }[] };
        setInstalledModels(data.models ?? []);
        if ((data.models ?? []).length === 0) toast({ description: "لا توجد نماذج مثبتة حتى الآن." });
      } else {
        toast({ description: "تعذّر تحميل قائمة النماذج." });
      }
    } catch {
      toast({ description: "تعذّر الاتصال بـ Ollama. تأكد أنه يعمل." });
    } finally {
      setLoadingInstalled(false);
    }
  }

  async function pullModel() {
    if (!pullName.trim()) return;
    setPulling(true);
    setPullProgress({ status: "جارٍ التحميل..." });
    try {
      const res = await fetch(`${getOllamaBase()}/api/pull`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: pullName.trim(), stream: true }),
      });
      if (!res.ok || !res.body) {
        toast({ description: `فشل: ${res.status}` });
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const obj = JSON.parse(line) as { status?: string; completed?: number; total?: number };
            setPullProgress({ status: obj.status ?? "", completed: obj.completed, total: obj.total });
          } catch { /* ignore */ }
        }
      }
      setPullProgress({ status: "اكتمل!" });
      toast({ description: `تم تحميل ${pullName.trim()} بنجاح.` });
      setPullName("");
      await loadInstalledModels();
    } catch (e: unknown) {
      toast({ description: `فشل التحميل: ${(e as Error).message}` });
    } finally {
      setPulling(false);
    }
  }

  async function deleteModel(name: string) {
    setDeletingModel(name);
    try {
      const res = await fetch(`${getOllamaBase()}/api/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        toast({ description: `تم حذف ${name}` });
        setInstalledModels(prev => prev.filter(m => m.name !== name));
      } else {
        toast({ description: `فشل الحذف: ${res.status}` });
      }
    } catch (e: unknown) {
      toast({ description: `خطأ: ${(e as Error).message}` });
    } finally {
      setDeletingModel(null);
    }
  }

  async function detectModels() {
    setDetecting(true);
    const base = endpoint.trim().replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/models`, {
        headers: { "Authorization": "Bearer ollama" },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const models = Array.isArray(data?.data) ? data.data.map((m: { id: string }) => m.id).filter(Boolean) : [];
        setDetectedModels(models);
        if (models.length > 0) {
          toast({ description: `تم اكتشاف ${models.length} نموذج` });
        } else {
          toast({ description: "لم يُكتشف أي نموذج" });
        }
      }
    } catch {
      toast({ description: "تعذّر الاتصال بالخادم" });
    } finally {
      setDetecting(false);
    }
  }

  async function testConnection() {
    setTestStatus("testing");
    setTestMsg("");
    setTestLatency(null);
    setTestModelCount(0);
    const base = endpoint.trim().replace(/\/$/, "");
    const t0 = Date.now();
    try {
      const res = await fetch(`${base}/models`, {
        headers: { "Authorization": "Bearer ollama" },
        signal: AbortSignal.timeout(6000),
      });
      const latMs = Date.now() - t0;
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const models = Array.isArray(data?.data) ? data.data.map((m: { id: string }) => m.id) : [];
        setTestStatus("ok");
        setTestLatency(latMs);
        setTestModelCount(models.length);
        setTestMsg(`متصل! ${models.length} نموذج متاح • ${latMs}ms`);
        setDetectedModels(models);
      } else {
        setTestStatus("fail");
        setTestMsg(`فشل: ${res.status} ${res.statusText}`);
      }
    } catch {
      setTestStatus("fail");
      setTestMsg("لا يمكن الاتصال. تأكد أن الخادم يعمل وأن CORS مُفعّل.");
    }
  }

  const tagColor = (tag: string) => {
    const map: Record<string, string> = {
      UNCENSORED: "border-cyan-500/40 text-cyan-400 bg-cyan-400/10",
      FAST: "border-green-500/40 text-green-400 bg-green-400/10",
      POWERFUL: "border-violet-500/40 text-violet-400 bg-violet-400/10",
      CODE: "border-blue-500/40 text-blue-400 bg-blue-400/10",
      VISION: "border-pink-500/40 text-pink-400 bg-pink-400/10",
      REASONING: "border-amber-500/40 text-amber-400 bg-amber-400/10",
      MULTILINGUAL: "border-emerald-500/40 text-emerald-400 bg-emerald-400/10",
      TINY: "border-slate-500/40 text-slate-400 bg-slate-400/10",
      REPLIT: "border-orange-500/50 text-orange-400 bg-orange-400/10",
    };
    return map[tag] ?? "border-border text-muted-foreground";
  };

  const tagIcon = (tag: string) => {
    const map: Record<string, React.ElementType> = {
      UNCENSORED: Shield, FAST: Zap, POWERFUL: Brain,
      CODE: Code2, VISION: Eye, REASONING: Brain,
      MULTILINGUAL: Globe, TINY: Cpu, REPLIT: Zap,
    };
    const Icon = map[tag] ?? Cpu;
    return <Icon className="w-2.5 h-2.5" />;
  };

  function toggleGroup(grp: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(grp)) next.delete(grp); else next.add(grp);
      return next;
    });
  }

  async function copyInstallCmd(modelId: string) {
    const cmd = `ollama run ${modelId}`;
    await navigator.clipboard.writeText(cmd).catch(() => {});
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  }

  const currentModelInfo = QUICK_MODELS.find(m => m.id === model);
  const recommendedByVram = vramProfile ? VRAM_PROFILES.find(v => v.id === vramProfile)?.recommended ?? [] : [];

  return (
    <FullPageOverlay open={open} onClose={() => onOpenChange(false)}>
      <div className="flex flex-col h-full w-full">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#1f1f1f] bg-[#0d0d0d] shrink-0">
          <Server className="w-5 h-5 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-white">نموذج محلي (Ollama / LM Studio / Jan)</h2>
            <p className="text-[10px] text-[#555]">شغّل نماذج مفتوحة المصدر غير مقيّدة محلياً على جهازك واربطها بـ KaliGPT</p>
          </div>
          {useLocal && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-400/20 text-green-400 border border-green-400/30">مُفعّل</span>}
          {onOpenEngineHub && (
            <button
              onClick={onOpenEngineHub}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all hover:scale-105"
              style={{ background: "rgba(0,229,255,0.12)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.3)", marginLeft: "auto" }}
              title="فتح Local Engine Hub — جميع النماذج الـ 7"
            >
              <Zap className="w-3 h-3" />
              Engine Hub
            </button>
          )}
          <button onClick={() => onOpenChange(false)} className={`${onOpenEngineHub ? "" : "ml-auto"} w-8 h-8 rounded-lg flex items-center justify-center bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-white hover:border-[#e21227] transition-all`}>
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* 3D Auto-Detect Radar */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #060608, #0a0a10)", border: "1px solid rgba(0,229,255,0.15)", boxShadow: "0 0 30px rgba(0,229,255,0.06)" }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4" style={{ color: autoScanning ? "#00e5ff" : "rgba(0,229,255,0.5)" }} />
              <span className="text-[12px] font-black" style={{ color: "#00e5ff" }}>
                {autoScanning ? "مسح الشبكة..." : "كشف الخوادم المحلية"}
              </span>
              {autoScanning && (
                <motion.span className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(0,229,255,0.1)", color: "#00e5ff", border: "1px solid rgba(0,229,255,0.2)" }}
                  animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                  <Activity className="w-2 h-2" /> LIVE SCAN
                </motion.span>
              )}
            </div>
            <button onClick={runAutoScan} disabled={autoScanning}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all hover:scale-105 disabled:opacity-40"
              style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.2)", color: "#00e5ff" }}>
              {autoScanning ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              {autoScanning ? "مسح..." : "إعادة المسح"}
            </button>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-4 p-4">
            <RadarScan3D results={scanResults} scanning={autoScanning} />
            <div className="flex-1 space-y-2 w-full">
              {AUTO_SCAN_TARGETS.map((target) => {
                const res = scanResults.find(r => r.id === target.id);
                const status = res?.status ?? "idle";
                return (
                  <div key={target.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer"
                    style={{
                      background: status === "found" ? `${target.color}0a` : "rgba(255,255,255,0.02)",
                      border: `1px solid ${status === "found" ? target.color + "33" : status === "scanning" ? "#fbbf2433" : "rgba(255,255,255,0.05)"}`,
                      boxShadow: status === "found" ? `0 0 12px ${target.color}18` : "none",
                    }}
                    onClick={() => {
                      if (status === "found") {
                        setEndpoint(target.url);
                        setServerType(target.id === "ollama" ? "ollama" : target.id === "lmstudio" ? "lmstudio" : "custom");
                        if (res?.models && res.models.length > 0) {
                          setDetectedModels(res.models);
                          setModel(res.models[0]);
                        }
                        toast({ description: `تم اختيار ${target.label}` });
                      }
                    }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: status === "found" ? `${target.color}18` : "rgba(255,255,255,0.04)", border: `1px solid ${target.color}33` }}>
                      <Server className="w-4 h-4" style={{ color: status === "found" ? target.color : "rgba(255,255,255,0.3)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-bold" style={{ color: status === "found" ? target.color : "rgba(255,255,255,0.5)" }}>{target.label}</span>
                        {status === "found" && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{ background: `${target.color}22`, color: target.color, border: `1px solid ${target.color}44` }}>
                            متصل
                          </span>
                        )}
                        {status === "notfound" && (
                          <span className="text-[8px] font-mono text-red-400/60">غير متاح</span>
                        )}
                      </div>
                      <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                        {target.url} {res?.latencyMs ? `· ${res.latencyMs}ms` : ""}
                      </div>
                      {res?.models && res.models.length > 0 && (
                        <div className="text-[9px] mt-0.5" style={{ color: target.color + "88" }}>
                          {res.models.length} نموذج: {res.models.slice(0, 2).join(", ")}{res.models.length > 2 ? `...+${res.models.length - 2}` : ""}
                        </div>
                      )}
                    </div>
                    {status === "scanning" && <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0 text-amber-400" />}
                    {status === "found" && <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: target.color }} />}
                    {status === "notfound" && <WifiOff className="w-3.5 h-3.5 flex-shrink-0 text-red-400/50" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background/60">
          <div>
            <div className="text-sm font-semibold flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-primary" />
              استخدام النموذج المحلي
            </div>
            <div className="text-[12px] text-muted-foreground mt-0.5">تجاوز CHAT-GPT.ai والاتصال بخادمك المحلي</div>
          </div>
          <Switch checked={useLocal} onCheckedChange={toggleLocalModel} />
        </div>

        {/* Hardware Profile (VRAM) */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
            <MemoryStick className="w-3.5 h-3.5 text-primary" /> ملف الأجهزة (VRAM) — اختياري
          </label>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {VRAM_PROFILES.map(p => (
              <button key={p.id} onClick={() => setVramProfile(prev => prev === p.id ? null : p.id)}
                className={`px-2 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${
                  vramProfile === p.id ? "bg-primary/15 border-primary/50 text-primary" : "border-border bg-background/40 text-muted-foreground hover:bg-accent"
                }`}>
                {p.label}
              </button>
            ))}
          </div>
          <AnimatePresence>
            {vramProfile && recommendedByVram.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                <div className="text-[9px] font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                  <Gauge className="w-3 h-3" /> نماذج موصى بها لـ {VRAM_PROFILES.find(v => v.id === vramProfile)?.ram}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recommendedByVram.map(rid => {
                    const m = QUICK_MODELS.find(q => q.id === rid);
                    if (!m) return null;
                    return (
                      <button key={rid} onClick={() => setModel(rid)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold transition-colors ${
                          model === rid ? "bg-primary/20 border-primary/50 text-primary" : "border-border bg-background/60 hover:bg-accent text-muted-foreground"
                        }`}>
                        {m.label}
                        {m.hot && <Star className="w-2 h-2 text-amber-400 fill-amber-400" />}
                        {m.size && <span className="text-[8px] text-muted-foreground/60 font-mono">{m.size}</span>}
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Server Type Tabs */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-primary" /> نوع الخادم
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["ollama", "lmstudio", "custom"] as const).map((t) => (
              <button
                key={t}
                onClick={() => applyServerPreset(t)}
                className={`px-3 py-2 rounded-xl border text-[11px] font-bold transition-colors ${
                  serverType === t ? "bg-primary/10 border-primary/40 text-primary" : "border-border bg-background/60 text-muted-foreground hover:bg-accent"
                }`}
              >
                {t === "ollama" ? "Ollama" : t === "lmstudio" ? "LM Studio" : "مخصص"}
              </button>
            ))}
          </div>
        </div>

        {/* Endpoint */}
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">عنوان الـ API</label>
          <div className="flex gap-2">
            <input
              value={endpoint}
              onChange={(e) => { setEndpoint(e.target.value); setServerType("custom"); }}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-[13px] font-mono outline-none focus:border-primary"
              placeholder="http://localhost:11434/v1"
              spellCheck={false}
            />
          </div>
          <div className="text-[11px] text-muted-foreground">
            Ollama: :11434/v1 · LM Studio: :1234/v1 · Jan: :1337/v1 · text-generation-webui: :5000/v1
          </div>
        </div>

        {/* Model Name */}
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">اسم النموذج</label>
          <div className="flex gap-2">
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-[13px] font-mono outline-none focus:border-primary"
              placeholder="dolphin-mixtral"
              spellCheck={false}
            />
          </div>

          {/* Detected Models */}
          {detectedModels.length > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3" /> النماذج المكتشفة ({detectedModels.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {detectedModels.map((m) => (
                  <button
                    key={m}
                    onClick={() => setModel(m)}
                    className={`px-2 py-1 rounded-md border text-[11px] font-mono transition-colors ${
                      model === m ? "bg-primary/15 border-primary/40 text-primary" : "border-emerald-500/30 bg-background/60 hover:bg-accent text-muted-foreground"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Install Command */}
          {model.trim() && serverType === "ollama" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <Terminal className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <code className="flex-1 text-[11px] font-mono text-emerald-300">ollama run {model.trim()}</code>
              <button onClick={() => copyInstallCmd(model.trim())}
                className="flex items-center gap-1 px-2 py-1 rounded border border-emerald-500/30 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                {copiedCmd ? <><Check className="w-3 h-3" /> تم</> : <><Copy className="w-3 h-3" /> نسخ</>}
              </button>
              {currentModelInfo && (
                <div className="flex items-center gap-1 text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>
                  <HardDrive className="w-2.5 h-2.5" />{currentModelInfo.size}
                </div>
              )}
            </motion.div>
          )}

          {/* Catalog */}
          <div className="rounded-xl border border-border bg-background/40 overflow-hidden">
            <div className="flex items-center gap-2 p-2 border-b border-border">
              <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="بحث في كتالوج النماذج..."
                className="flex-1 bg-transparent text-[12px] outline-none text-foreground"
              />
              {search && <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground text-[10px]">✕</button>}
            </div>

            {/* Group Tabs */}
            {!search && (
              <div className="flex gap-1 px-2 py-1.5 overflow-x-auto border-b border-border no-scrollbar">
                {["كل النماذج", ...GROUPS].map((g) => (
                  <button
                    key={g}
                    onClick={() => setActiveGroup(g)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap flex-shrink-0 transition-colors ${
                      activeGroup === g ? "bg-primary text-white" : "bg-background/60 border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}

            <div className="max-h-64 overflow-y-auto p-2 space-y-2">
              {search || activeGroup !== "كل النماذج" ? (
                <div className="flex flex-wrap gap-1.5">
                  {filtered.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setModel(m.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                        model === m.id ? "bg-primary/15 border-primary/40 text-primary" : "border-border bg-background/60 hover:bg-accent text-muted-foreground"
                      }`}
                    >
                      <span>{m.label}</span>
                      {m.hot && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                      <span className={`text-[8px] font-bold px-1 rounded border flex items-center gap-0.5 ${tagColor(m.tag)}`}>
                        {tagIcon(m.tag)}{m.tag}
                      </span>
                      {m.size && <span className="text-[8px] text-muted-foreground/60 font-mono">{m.size}</span>}
                    </button>
                  ))}
                  {filtered.length === 0 && <div className="text-[12px] text-muted-foreground py-4 text-center w-full">لا توجد نتائج</div>}
                </div>
              ) : (
                GROUPS.map((grp) => {
                  const grpModels = QUICK_MODELS.filter((m) => m.group === grp);
                  const isExpanded = expandedGroups.has(grp);
                  return (
                    <div key={grp} className="rounded-lg border border-border/50 overflow-hidden">
                      <button
                        onClick={() => toggleGroup(grp)}
                        className="w-full flex items-center justify-between px-3 py-1.5 bg-background/60 hover:bg-accent transition-colors"
                      >
                        <span className="text-[11px] font-bold text-foreground">{grp}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">{grpModels.length}</span>
                          {isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="p-2 flex flex-wrap gap-1.5">
                          {grpModels.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => setModel(m.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                                model === m.id ? "bg-primary/15 border-primary/40 text-primary" : "border-border bg-background/60 hover:bg-accent text-muted-foreground"
                              }`}
                            >
                              <span>{m.label}</span>
                              {m.hot && <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />}
                              <span className={`text-[8px] font-bold px-1 rounded border flex items-center gap-0.5 ${tagColor(m.tag)}`}>
                                {tagIcon(m.tag)}{m.tag}
                              </span>
                              {m.size && <span className="text-[8px] text-muted-foreground/60 font-mono">{m.size}</span>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Ollama Model Manager */}
        {serverType === "ollama" && (
          <div className="rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => {
                setOllamaManagerOpen(v => !v);
                if (!ollamaManagerOpen && installedModels.length === 0) loadInstalledModels();
              }}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-background/60 hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-2 text-[12px] font-bold">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                مدير نماذج Ollama
                {installedModels.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                    {installedModels.length} مثبت
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${ollamaManagerOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {ollamaManagerOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 space-y-4 border-t border-border">
                    {/* Pull new model */}
                    <div>
                      <div className="text-[10px] font-bold tracking-widest text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Download className="w-3 h-3 text-primary" /> سحب نموذج جديد
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={pullName}
                          onChange={e => setPullName(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && !pulling && pullModel()}
                          placeholder="مثال: llama3.1:8b أو deepseek-r1:7b"
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-[12px] font-mono outline-none focus:border-primary"
                          disabled={pulling}
                        />
                        <button
                          onClick={pullModel}
                          disabled={pulling || !pullName.trim()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 text-[12px] font-bold transition-colors"
                        >
                          {pulling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                          سحب
                        </button>
                      </div>
                      {pulling && pullProgress && (
                        <div className="mt-2 space-y-1">
                          <div className="text-[11px] text-muted-foreground font-mono">{pullProgress.status}</div>
                          {pullProgress.total && pullProgress.completed !== undefined && (
                            <div className="w-full bg-border rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-primary transition-all"
                                style={{ width: `${Math.round((pullProgress.completed / pullProgress.total) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Installed models */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] font-bold tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <HardDrive className="w-3 h-3 text-cyan-400" /> النماذج المثبتة
                        </div>
                        <button
                          onClick={loadInstalledModels}
                          disabled={loadingInstalled}
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <RefreshCw className={`w-3 h-3 ${loadingInstalled ? "animate-spin" : ""}`} />
                          تحديث
                        </button>
                      </div>
                      {loadingInstalled ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        </div>
                      ) : installedModels.length === 0 ? (
                        <div className="text-center text-[11px] text-muted-foreground py-4">
                          لا توجد نماذج مثبتة، أو Ollama غير متصل
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                          {installedModels.map(m => (
                            <div key={m.name} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/60">
                              <Brain className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-semibold font-mono truncate">{m.name}</div>
                                <div className="text-[9px] text-muted-foreground">
                                  {m.size > 0 ? `${(m.size / 1e9).toFixed(1)} GB` : "—"}
                                </div>
                              </div>
                              <button
                                onClick={() => { setModel(m.name); toast({ description: `تم اختيار ${m.name}` }); }}
                                className="text-[10px] px-2 py-0.5 rounded border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-bold"
                              >
                                استخدام
                              </button>
                              <button
                                onClick={() => deleteModel(m.name)}
                                disabled={deletingModel === m.name}
                                className="text-[10px] px-2 py-0.5 rounded border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                              >
                                {deletingModel === m.name ? <Loader2 className="w-3 h-3 animate-spin" /> : "حذف"}
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── 3D Neural Connection Probe ─────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden" style={{
          background: "linear-gradient(135deg,#030508,#06090f)",
          border: testStatus === "ok"  ? "1px solid rgba(34,197,94,0.25)"
                : testStatus === "fail"? "1px solid rgba(239,68,68,0.25)"
                : testStatus === "testing" ? "1px solid rgba(251,191,36,0.25)"
                : "1px solid rgba(0,229,255,0.12)",
          boxShadow: testStatus === "ok"  ? "0 0 30px rgba(34,197,94,0.08)"
                   : testStatus === "fail"? "0 0 30px rgba(239,68,68,0.08)"
                   : testStatus === "testing" ? "0 0 30px rgba(251,191,36,0.08)"
                   : "0 0 20px rgba(0,229,255,0.04)",
          transition: "border-color 0.4s, box-shadow 0.4s",
        }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{
                  background: testStatus === "ok" ? "#22c55e" : testStatus === "fail" ? "#ef4444" : testStatus === "testing" ? "#fbbf24" : "#00e5ff",
                  boxShadow: `0 0 8px ${testStatus === "ok" ? "#22c55e" : testStatus === "fail" ? "#ef4444" : testStatus === "testing" ? "#fbbf24" : "#00e5ff"}`,
                }}
                animate={testStatus === "testing" ? { scale: [0.7, 1.3, 0.7], opacity: [0.5, 1, 0.5] } : { scale: [0.9, 1.1, 0.9] }}
                transition={{ duration: testStatus === "testing" ? 0.6 : 2, repeat: Infinity }}
              />
              <span className="text-[11px] font-black tracking-widest uppercase" style={{
                color: testStatus === "ok" ? "#22c55e" : testStatus === "fail" ? "#ef4444" : testStatus === "testing" ? "#fbbf24" : "rgba(0,229,255,0.8)",
              }}>
                {testStatus === "idle" ? "NEURAL CONNECTION PROBE" : testStatus === "testing" ? "PROBING ENDPOINT..." : testStatus === "ok" ? "CONNECTION ESTABLISHED" : "CONNECTION FAILED"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[8px] font-mono px-2 py-0.5 rounded-full" style={{
                background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.12)", color: "rgba(0,229,255,0.5)"
              }}>
                v2 / 3D-HUD
              </span>
            </div>
          </div>

          {/* 3D Canvas */}
          <div className="px-3 pt-3 pb-1">
            <NeuralTestProbe3D
              status={testStatus}
              latencyMs={testLatency}
              modelCount={testModelCount}
              endpoint={endpoint}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 px-3 py-3">
            <motion.button
              onClick={testConnection}
              disabled={testStatus === "testing"}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black tracking-wider uppercase transition-all disabled:opacity-50"
              style={{
                background: testStatus === "testing" ? "rgba(251,191,36,0.12)" : "rgba(0,229,255,0.1)",
                border: testStatus === "testing" ? "1px solid rgba(251,191,36,0.3)" : "1px solid rgba(0,229,255,0.25)",
                color: testStatus === "testing" ? "#fbbf24" : "#00e5ff",
              }}
              whileHover={{ scale: testStatus === "testing" ? 1 : 1.02, background: "rgba(0,229,255,0.18)" }}
              whileTap={{ scale: 0.98 }}
            >
              {testStatus === "testing"
                ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}><Wifi className="w-3.5 h-3.5" /></motion.div> جارٍ المسح...</>
                : <><Wifi className="w-3.5 h-3.5" /> اختبار الاتصال</>}
            </motion.button>

            <motion.button
              onClick={detectModels}
              disabled={detecting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black tracking-wider uppercase transition-all disabled:opacity-50"
              style={{
                background: "rgba(167,139,250,0.08)",
                border: "1px solid rgba(167,139,250,0.2)",
                color: "#a78bfa",
              }}
              whileHover={{ scale: detecting ? 1 : 1.02, background: "rgba(167,139,250,0.16)" }}
              whileTap={{ scale: 0.98 }}
            >
              {detecting
                ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}><RefreshCw className="w-3.5 h-3.5" /></motion.div> مسح...</>
                : <><RefreshCw className="w-3.5 h-3.5" /> اكتشاف النماذج</>}
            </motion.button>
          </div>

          {/* Status message */}
          {testMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="px-4 pb-3 text-[11px] font-mono flex items-center gap-2"
              style={{ color: testStatus === "ok" ? "#22c55e" : testStatus === "fail" ? "#ef4444" : "#fbbf24" }}
            >
              {testStatus === "ok" ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
               : testStatus === "fail" ? <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> : null}
              {testMsg}
            </motion.div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={save}
          className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-[13px] font-bold transition-colors"
        >
          حفظ الإعدادات وتطبيقها
        </button>

        {/* Setup Guides */}
        <div className="rounded-xl border border-border bg-background/40 p-4 space-y-4 text-[12px]">
          <div className="font-bold text-foreground flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-primary" /> دليل الإعداد السريع
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: "Ollama", color: "text-cyan-400", steps: ["تثبيت من ollama.com", "ollama run dolphin-mixtral", "OLLAMA_ORIGINS=* ollama serve"], url: "https://ollama.com/library" },
              { name: "LM Studio", color: "text-violet-400", steps: ["تحميل من lmstudio.ai", "تحميل نموذج Dolphin/Mistral", "تشغيل Local API Server (منفذ 1234)"], url: "https://lmstudio.ai" },
              { name: "Jan", color: "text-emerald-400", steps: ["تحميل من jan.ai", "تحميل النموذج", "تشغيل Local API (منفذ 1337)"], url: "https://jan.ai" },
              { name: "text-gen-webui", color: "text-amber-400", steps: ["python server.py --api", "تفعيل --extensions openai", "API جاهز على منفذ 5000"], url: "https://github.com/oobabooga/text-generation-webui" },
            ].map((srv) => (
              <div key={srv.name} className="space-y-2">
                <div className={`font-semibold ${srv.color}`}>{srv.name}</div>
                <div className="text-muted-foreground space-y-1">
                  {srv.steps.map((s, i) => <div key={i}>{i + 1}. <code className="bg-background px-1 rounded text-[11px]">{s}</code></div>)}
                </div>
                <a href={srv.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline text-[10px]">
                  <ExternalLink className="w-3 h-3" /> {srv.url.split("//")[1]}
                </a>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-400/5 border border-amber-400/20 text-amber-300/90">
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>ملاحظة: النموذج المحلي يعمل على جهازك فقط. تأكد أن متصفحك يسمح بالاتصال بـ localhost.</div>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://ollama.com/library" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline text-[11px]">
              <Download className="w-3 h-3" /> تصفح مكتبة Ollama الكاملة
            </a>
            <span className="text-muted-foreground/40">·</span>
            <a href="https://huggingface.co/models?sort=trending&library=gguf" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline text-[11px]">
              <Download className="w-3 h-3" /> نماذج GGUF على HuggingFace
            </a>
          </div>
        </div>
        </div>
      </div>
    </FullPageOverlay>
  );
}
