import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, Download, Star, Zap, CheckCircle, AlertTriangle, Info, ChevronRight, BarChart3, Loader2 } from "lucide-react";
import { pipeline } from "@/lib/pipeline";
async function streamOdysseus(prompt: string, onChunk: (c: string) => void): Promise<string> {
  const resp = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: prompt }], stream: true }) });
  if (!resp.ok || !resp.body) return "";
  const reader = resp.body.getReader(); const dec = new TextDecoder(); let buf = "", full = "";
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true }); const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue; const raw = line.slice(6).trim(); if (!raw || raw === "[DONE]") continue;
      try { const obj = JSON.parse(raw) as { content?: string; choices?: { delta?: { content?: string } }[] }; const c2 = obj.content ?? obj.choices?.[0]?.delta?.content ?? ""; if (c2) { full += c2; onChunk(full); } } catch { /* ignore */ }
    }
  }
  return full;
}


interface OdysseusModelCookbookModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type HW = { vram: string; ram: string; gpu: string; useCase: string };

const HARDWARE_PROFILES = [
  { id: "low", label: "Budget / CPU", vram: "0 GB", ram: "8-16 GB", gpu: "CPU only", color: "#6b7280", useCase: "Light tasks" },
  { id: "mid", label: "Mid-Range", vram: "6-8 GB", ram: "16-32 GB", gpu: "RTX 3060/4060", color: "#3b82f6", useCase: "Standard work" },
  { id: "high", label: "High-End", vram: "12-16 GB", ram: "32-64 GB", gpu: "RTX 4070-4080", color: "#8b5cf6", useCase: "Large models" },
  { id: "pro", label: "Pro / Workstation", vram: "24-48 GB", ram: "64-128 GB", gpu: "RTX 4090 / A100", color: "#f59e0b", useCase: "Max performance" },
  { id: "cloud", label: "Cloud / API", vram: "∞", ram: "∞", gpu: "Frontier models", color: "#00e5cc", useCase: "No local GPU" },
];

const MODEL_RECOMMENDATIONS: Record<string, { name: string; size: string; desc: string; speed: string; quality: string; tags: string[]; ollama?: string }[]> = {
  low: [
    { name: "Phi-3 Mini", size: "2.3B", desc: "Microsoft's compact powerhouse — impressive quality for CPU", speed: "★★★★★", quality: "★★★☆☆", tags: ["FAST", "EFFICIENT"], ollama: "phi3:mini" },
    { name: "Gemma 2B", size: "2B", desc: "Google's small but capable model, great for Q&A", speed: "★★★★☆", quality: "★★★☆☆", tags: ["GOOGLE", "CHAT"], ollama: "gemma:2b" },
    { name: "TinyLlama 1.1B", size: "1.1B", desc: "Smallest usable model — edge devices and low-RAM systems", speed: "★★★★★", quality: "★★☆☆☆", tags: ["EDGE", "TINY"], ollama: "tinyllama" },
  ],
  mid: [
    { name: "Llama 3.1 8B", size: "8B", desc: "Meta's best small model — exceptional quality for its size", speed: "★★★★☆", quality: "★★★★☆", tags: ["RECOMMENDED", "CHAT"], ollama: "llama3.1:8b" },
    { name: "Mistral 7B", size: "7B", desc: "Fast, capable, and instruction-tuned — great all-rounder", speed: "★★★★★", quality: "★★★★☆", tags: ["FAST", "CODE"], ollama: "mistral:7b" },
    { name: "Qwen2.5 7B", size: "7B", desc: "Alibaba's 7B with strong multilingual and code capabilities", speed: "★★★★☆", quality: "★★★★☆", tags: ["CODE", "MULTI-LANG"], ollama: "qwen2.5:7b" },
    { name: "Gemma 2 9B", size: "9B", desc: "Google's latest 9B — beats many larger models on benchmarks", speed: "★★★★☆", quality: "★★★★★", tags: ["GOOGLE", "TOP"], ollama: "gemma2:9b" },
  ],
  high: [
    { name: "Llama 3.1 70B (Q4)", size: "70B", desc: "Meta's flagship quantized to 4-bit — near GPT-4 quality", speed: "★★★☆☆", quality: "★★★★★", tags: ["FLAGSHIP", "TOP-TIER"], ollama: "llama3.1:70b" },
    { name: "Qwen2.5 32B", size: "32B", desc: "Exceptional multilingual and coding, best-in-class 32B", speed: "★★★★☆", quality: "★★★★★", tags: ["CODE", "MULTI-LANG"], ollama: "qwen2.5:32b" },
    { name: "DeepSeek R1 32B", size: "32B", desc: "Reasoning-first model — excellent for complex problem solving", speed: "★★★☆☆", quality: "★★★★★", tags: ["REASONING", "MATH"], ollama: "deepseek-r1:32b" },
    { name: "Mistral Large 2", size: "123B Q4", desc: "Mistral's best model quantized — strong reasoning and code", speed: "★★☆☆☆", quality: "★★★★★", tags: ["LARGE", "FRONTIER"] },
  ],
  pro: [
    { name: "Llama 3.1 405B (Q2)", size: "405B", desc: "Meta's largest — frontier-class capabilities locally", speed: "★★☆☆☆", quality: "★★★★★", tags: ["FRONTIER", "MAX"], ollama: "llama3.1:405b" },
    { name: "DeepSeek R1 671B", size: "671B", desc: "World's largest open reasoning model — cutting-edge STEM", speed: "★☆☆☆☆", quality: "★★★★★", tags: ["REASONING", "LARGEST"] },
    { name: "Mistral Large 2 Full", size: "123B", desc: "Full precision Mistral Large — maximum quality", speed: "★★★☆☆", quality: "★★★★★", tags: ["LARGE", "FULL-PREC"] },
  ],
  cloud: [
    { name: "Claude Opus 4.5", size: "API", desc: "Anthropic's most powerful model — frontier-class on any hardware", speed: "★★★★☆", quality: "★★★★★", tags: ["FRONTIER", "ANTHROPIC"] },
    { name: "GPT-4o", size: "API", desc: "OpenAI's multimodal flagship — text, image, code, voice", speed: "★★★★☆", quality: "★★★★★", tags: ["OPENAI", "MULTIMODAL"] },
    { name: "Gemini 1.5 Pro", size: "API", desc: "Google's longest context model — 1M token window", speed: "★★★★☆", quality: "★★★★★", tags: ["GOOGLE", "1M CTX"] },
    { name: "Llama 3.1 70B (Groq)", size: "API", desc: "Meta's 70B on Groq hardware — 750 tokens/sec blazing speed", speed: "★★★★★", quality: "★★★★☆", tags: ["GROQ", "FASTEST"] },
  ],
};

export function OdysseusModelCookbookModal({ open, onOpenChange }: OdysseusModelCookbookModalProps) {
  const [hw, setHw] = useState("mid");
  const [selected, setSelected] = useState<string | null>(null);
  const [aiAdvice, setAiAdvice] = useState("");
  const [running, setRunning] = useState(false);
  const [customHw, setCustomHw] = useState("");

  const profile = HARDWARE_PROFILES.find(p => p.id === hw)!;
  const models = MODEL_RECOMMENDATIONS[hw] ?? [];

  async function getAIAdvice() {
    if (running) return;
    setRunning(true); setAiAdvice("");
    pipeline.push({ source: "Odysseus Cookbook", label: `Model advice: ${profile.label}`, content: "", sourceColor: "#10b981" });
    const prompt = `You are an expert AI model deployment consultant for the Odysseus platform.

Hardware Profile: ${profile.label}
- VRAM: ${profile.vram}
- RAM: ${profile.ram}
- GPU: ${profile.gpu}
${customHw ? `- Additional details: ${customHw}` : ""}

Provide expert recommendations:
1. Top 3 models for this hardware (with specific quantization)
2. Optimal ollama/llama.cpp settings (n_ctx, n_batch, n_gpu_layers)
3. Expected tokens/second performance
4. Memory usage estimates
5. Best use cases for each model
6. Setup commands to get started immediately

Be specific, technical, and practical. Include actual shell commands.`;
    try {
      await streamOdysseus(prompt, full => setAiAdvice(prev => full));
    } catch { setAiAdvice("AI recommendations unavailable. Please try again."); }
    setRunning(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(20px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
        className="relative w-full max-w-5xl h-[88vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "linear-gradient(145deg, #040507 0%, #030305 60%, #040508 100%)", border: "1px solid rgba(16,185,129,0.15)", boxShadow: "0 0 80px rgba(16,185,129,0.05), inset 0 1px 0 rgba(16,185,129,0.04)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "rgba(16,185,129,0.1)", background: "rgba(0,0,0,0.4)" }}>
          <div className="flex items-center gap-3">
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Cpu className="w-4 h-4" style={{ color: "#10b981" }} />
            </motion.div>
            <div>
              <div className="text-sm font-black tracking-widest font-mono" style={{ color: "#10b981" }}>ODYSSEUS MODEL COOKBOOK</div>
              <div className="text-[9px] font-mono" style={{ color: "rgba(16,185,129,0.45)" }}>HARDWARE-AWARE MODEL RECOMMENDATIONS · LOCAL LLM GUIDE · PERFORMANCE TUNING</div>
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left — hardware profiles */}
          <div className="w-52 border-r flex flex-col p-4 gap-3 flex-shrink-0 overflow-y-auto" style={{ borderColor: "rgba(16,185,129,0.08)" }}>
            <div className="text-[9px] font-black tracking-widest" style={{ color: "rgba(16,185,129,0.6)" }}>YOUR HARDWARE</div>
            <div className="space-y-1.5">
              {HARDWARE_PROFILES.map(p => (
                <motion.button key={p.id} onClick={() => { setHw(p.id); setSelected(null); setAiAdvice(""); }} whileHover={{ x: 2 }}
                  className="w-full text-left px-3 py-3 rounded-xl transition-all"
                  style={{ background: hw === p.id ? `${p.color}10` : "rgba(255,255,255,0.02)", border: `1px solid ${hw === p.id ? `${p.color}30` : "rgba(255,255,255,0.05)"}` }}>
                  <div className="text-[10px] font-black" style={{ color: hw === p.id ? p.color : "#444" }}>{p.label}</div>
                  <div className="text-[8px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.2)" }}>{p.vram} VRAM · {p.gpu}</div>
                  <div className="text-[7.5px] font-mono mt-0.5" style={{ color: hw === p.id ? `${p.color}70` : "rgba(255,255,255,0.15)" }}>{p.useCase}</div>
                </motion.button>
              ))}
            </div>
            <div>
              <div className="text-[9px] font-black tracking-widest mb-2" style={{ color: "rgba(16,185,129,0.5)" }}>CUSTOM DETAILS</div>
              <textarea value={customHw} onChange={e => setCustomHw(e.target.value)} placeholder="e.g. RTX 3090 24GB, 64GB RAM, Ubuntu 22.04..."
                rows={3} className="w-full resize-none text-[9px] font-mono outline-none p-2 rounded-xl"
                style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)", color: "#aaa" }} />
            </div>
            <motion.button onClick={getAIAdvice} disabled={running} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full py-2.5 rounded-xl text-[9px] font-black tracking-widest flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)", color: "#10b981" }}>
              {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              {running ? "ANALYZING..." : "GET AI ADVICE"}
            </motion.button>
          </div>

          {/* Right — models + advice */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Model grid */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="text-[9px] font-black tracking-widest" style={{ color: `${profile.color}80` }}>
                RECOMMENDED MODELS FOR {profile.label.toUpperCase()} ({models.length} models)
              </div>
              <div className="grid grid-cols-1 gap-2">
                {models.map((m, i) => (
                  <motion.div key={m.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => setSelected(selected === m.name ? null : m.name)}
                    whileHover={{ x: 3 }} className="rounded-2xl p-4 cursor-pointer transition-all"
                    style={{ background: selected === m.name ? `${profile.color}10` : "rgba(255,255,255,0.02)", border: `1px solid ${selected === m.name ? `${profile.color}30` : "rgba(255,255,255,0.05)"}` }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-[11px]"
                          style={{ background: `${profile.color}12`, border: `1px solid ${profile.color}25`, color: profile.color }}>{m.size}</div>
                        <div>
                          <div className="font-black text-[11px]" style={{ color: "#ddd" }}>{m.name}</div>
                          <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>{m.desc}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>Speed: {m.speed}</div>
                        <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>Quality: {m.quality}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2">
                      {m.tags.map(t => (
                        <span key={t} className="text-[7.5px] font-black px-1.5 py-0.5 rounded"
                          style={{ background: `${profile.color}10`, border: `1px solid ${profile.color}20`, color: profile.color }}>{t}</span>
                      ))}
                      {m.ollama && (
                        <span className="ml-auto text-[8px] font-mono px-2 py-0.5 rounded-lg" style={{ background: "rgba(0,229,204,0.08)", border: "1px solid rgba(0,229,204,0.2)", color: "#00e5cc" }}>
                          ollama run {m.ollama}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* AI Advice panel */}
              {(aiAdvice || running) && (
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div className="px-4 py-2.5 border-b flex items-center gap-2" style={{ borderColor: "rgba(16,185,129,0.12)", background: "rgba(16,185,129,0.06)" }}>
                    <motion.div animate={{ opacity: running ? [1, 0.3, 1] : 1 }} transition={{ duration: 1, repeat: Infinity }}
                      className="w-1.5 h-1.5 rounded-full" style={{ background: running ? "#10b981" : "#10b981" }} />
                    <span className="text-[9px] font-black tracking-widest font-mono" style={{ color: "#10b981" }}>AI MODEL ADVISOR</span>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto">
                    <div className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {aiAdvice}
                      {running && <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ color: "#10b981" }}>█</motion.span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
