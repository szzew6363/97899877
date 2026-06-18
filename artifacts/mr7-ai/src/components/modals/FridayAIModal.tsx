import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import {
  X, Mic, MicOff, Send, Globe, TrendingUp, Cpu, Clock,
  Zap, AlertTriangle, Loader2, ChevronRight, RefreshCw,
  Radio, Satellite, Shield, Activity, BarChart2, Newspaper,
  Search, Info, Terminal, Wifi, Battery, Monitor
} from "lucide-react";
import { readChatText } from "@/lib/chat-client";
import { pipeline } from "@/lib/pipeline";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type FridayMode = "chat" | "news" | "finance" | "search" | "system";

const ARC_COLOR = "#c8860a";
const RED_COLOR = "#e21227";

function ArcReactor({ size = 80 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {[1, 0.75, 0.5].map((scale, i) => (
        <motion.div key={i} className="absolute rounded-full border"
          style={{ width: size * scale, height: size * scale, borderColor: ARC_COLOR, opacity: 0.4 - i * 0.1 }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 8 + i * 4, repeat: Infinity, ease: "linear" }} />
      ))}
      <motion.div className="rounded-full flex items-center justify-center"
        style={{ width: size * 0.4, height: size * 0.4, background: `radial-gradient(circle, ${ARC_COLOR}cc, ${ARC_COLOR}44)`, boxShadow: `0 0 ${size * 0.3}px ${ARC_COLOR}88` }}
        animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }}>
        <Zap size={size * 0.18} color="#fff" />
      </motion.div>
    </div>
  );
}

function HUDScanLine() {
  return (
    <motion.div className="absolute inset-x-0 h-px pointer-events-none z-20"
      style={{ background: `linear-gradient(90deg, transparent, ${ARC_COLOR}88, transparent)` }}
      animate={{ top: ["0%", "100%"] }}
      transition={{ duration: 4, repeat: Infinity, ease: "linear" }} />
  );
}

function HUDCorner({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const styles = { tl: "top-2 left-2", tr: "top-2 right-2", bl: "bottom-2 left-2", br: "bottom-2 right-2" };
  const rotations = { tl: 0, tr: 90, bl: 270, br: 180 };
  return (
    <motion.div className={`absolute w-6 h-6 ${styles[pos]}`} style={{ transform: `rotate(${rotations[pos]}deg)` }}
      animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity, delay: rotations[pos] / 180 }}>
      <div className="absolute top-0 left-0 w-full h-0.5" style={{ background: ARC_COLOR }} />
      <div className="absolute top-0 left-0 w-0.5 h-full" style={{ background: ARC_COLOR }} />
    </motion.div>
  );
}

function SystemDisplay() {
  const [info, setInfo] = useState({ time: "", uptime: "99.7%", cpu: "32%", mem: "67%", status: "OPERATIONAL" });

  useEffect(() => {
    const tick = () => setInfo(i => ({ ...i, time: new Date().toLocaleTimeString("en-US", { hour12: false }) }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  const metrics = [
    { label: "CPU", value: info.cpu, icon: Cpu, color: "#00e5ff" },
    { label: "MEMORY", value: info.mem, icon: Activity, color: "#10b981" },
    { label: "UPTIME", value: info.uptime, icon: Battery, color: ARC_COLOR },
    { label: "NETWORK", value: "LIVE", icon: Wifi, color: "#a78bfa" },
  ];

  return (
    <div className="h-full p-4 space-y-4">
      <div className="text-center py-6">
        <ArcReactor size={100} />
        <div className="mt-4 text-3xl font-mono font-bold" style={{ color: ARC_COLOR, textShadow: `0 0 20px ${ARC_COLOR}66` }}>
          {info.time}
        </div>
        <div className="text-xs font-mono text-gray-400 mt-1">STARK INDUSTRIES · FRIDAY OS v2.0</div>
        <motion.div className="inline-block mt-2 px-3 py-1 rounded text-xs font-bold"
          style={{ background: `${ARC_COLOR}22`, border: `1px solid ${ARC_COLOR}44`, color: ARC_COLOR }}
          animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 2, repeat: Infinity }}>
          ● {info.status}
        </motion.div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {metrics.map(m => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="p-3 rounded border" style={{ border: `1px solid ${m.color}33`, background: `${m.color}0a` }}>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={12} style={{ color: m.color }} />
                <span className="text-xs text-gray-500 font-mono">{m.label}</span>
              </div>
              <div className="text-lg font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
            </div>
          );
        })}
      </div>
      <div className="p-3 rounded border font-mono text-xs" style={{ border: `1px solid ${ARC_COLOR}22`, background: "rgba(0,0,0,0.4)" }}>
        <div className="text-gray-500 mb-1">STARK SYSTEMS LOG</div>
        {[
          "All systems operational, boss.",
          "Arc reactor stable · 3.21 GJ output",
          "Jarvis backup: OFFLINE",
          "FRIDAY primary: ONLINE",
          "Threat level: LOW",
        ].map((l, i) => (
          <motion.div key={l} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2 }}
            className="text-gray-400 py-0.5">
            <span style={{ color: ARC_COLOR }}>›</span> {l}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

interface NewsItem { source: string; title: string; summary: string; }

function NewsDisplay({ type }: { type: "world" | "finance" }) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const fetch_ = async () => {
    setLoading(true); setItems([]);
    const prompt = type === "world"
      ? "You are FRIDAY. Generate a world news briefing with 6 top global headlines. Format each as JSON object with source (BBC/CNN/Reuters/etc), title, and summary (1 sentence). Return a JSON array only."
      : "You are FRIDAY. Generate a finance & markets briefing with 6 top financial headlines. Format each as JSON object with source (Bloomberg/CNBC/FT/etc), title, and summary (1 sentence). Return a JSON array only.";
    let full = "";
    await readChatText(prompt, c => full += c);
    try {
      const match = full.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        setItems(parsed.slice(0, 6));
      } else {
        const lines = full.split("\n").filter(l => l.trim()).slice(0, 6);
        setItems(lines.map((l, i) => ({ source: ["BBC", "Reuters", "CNN", "Bloomberg", "FT", "WSJ"][i] || "NEWS", title: l.replace(/^\d+\.\s*/, "").slice(0, 80), summary: "" })));
      }
    } catch {
      setItems([{ source: "FRIDAY", title: full.slice(0, 100), summary: "" }]);
    }
    setLoading(false); setFetched(true);
    pipeline.emit("FRIDAY", full);
  };

  const color = type === "world" ? "#00e5ff" : "#10b981";
  const Icon = type === "world" ? Globe : TrendingUp;
  const label = type === "world" ? "WORLD NEWS BRIEFING" : "FINANCE & MARKETS";

  return (
    <div className="h-full flex flex-col p-4 gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded" style={{ background: `${color}22`, border: `1px solid ${color}44` }}>
          <Icon size={16} style={{ color }} />
        </div>
        <div>
          <div className="text-sm font-bold font-mono" style={{ color }}>{label}</div>
          <div className="text-xs text-gray-500">FRIDAY intelligence feed</div>
        </div>
        <button onClick={fetch_} disabled={loading}
          className="ml-auto px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 transition-all hover:opacity-80 disabled:opacity-40"
          style={{ background: color, color: "#000" }}>
          {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {fetched ? "REFRESH" : "FETCH LIVE"}
        </button>
      </div>

      {!fetched && !loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
            <Satellite size={40} style={{ color }} />
          </motion.div>
          <p className="text-sm font-mono text-gray-400">Press FETCH LIVE to pull the latest briefing</p>
          <p className="text-xs text-gray-600 font-mono" style={{ color }}>
            {type === "world" ? "Global · BBC · Reuters · CNN · Al Jazeera" : "Bloomberg · CNBC · FT · MarketWatch"}
          </p>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <ArcReactor size={60} />
          <p className="text-sm font-mono" style={{ color }}>Pulling {type === "world" ? "global" : "financial"} intelligence…</p>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => <motion.div key={i} className="w-2 h-2 rounded-full" style={{ background: color }}
              animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.33 }} />)}
          </div>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {items.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="p-3 rounded border transition-all hover:opacity-80"
              style={{ border: `1px solid ${color}22`, background: `${color}08` }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: `${color}33`, color }}>{item.source}</span>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse ml-auto" style={{ background: color }} />
              </div>
              <div className="text-sm font-semibold text-gray-100 leading-snug">{item.title}</div>
              {item.summary && <div className="text-xs text-gray-400 mt-1 leading-relaxed">{item.summary}</div>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchDisplay() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState("");
  const [searching, setSearching] = useState(false);
  const SUGGESTIONS = ["Latest AI breakthroughs 2025", "Cybersecurity threats this week", "Quantum computing advances", "SpaceX latest mission"];

  const search = async (q: string) => {
    if (!q.trim() || searching) return;
    setQuery(q); setSearching(true); setResults("");
    let full = "";
    await readChatText(
      `You are FRIDAY, Tony Stark's AI assistant performing a web intelligence search for: "${q}". Provide a comprehensive briefing with: Key Findings (3-5 bullet points), Sources (mention realistic source names), Recent Developments, and Analysis. Be specific, factual, and briefing-style. Boss prefers concise intelligence reports.`,
      c => { full += c; setResults(full); }
    );
    setSearching(false);
    pipeline.emit("FRIDAY", full);
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      <div className="flex gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded border" style={{ border: `1px solid ${ARC_COLOR}44`, background: "rgba(0,0,0,0.3)" }}>
          <Search size={14} style={{ color: ARC_COLOR }} />
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search(query)}
            placeholder="What do you need to know, boss?" disabled={searching}
            className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none placeholder-gray-600" />
        </div>
        <button onClick={() => search(query)} disabled={searching || !query.trim()}
          className="px-4 py-2 rounded text-xs font-bold transition-all hover:opacity-80 disabled:opacity-30"
          style={{ background: ARC_COLOR, color: "#000" }}>
          {searching ? <Loader2 size={14} className="animate-spin" /> : "SCAN"}
        </button>
      </div>
      {!results && !searching && (
        <div className="space-y-2">
          <div className="text-xs text-gray-600 font-mono mb-2">SUGGESTED INTEL</div>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => search(s)}
              className="w-full text-left text-xs p-2 rounded border flex items-center gap-2 transition-all hover:opacity-80"
              style={{ border: `1px solid ${ARC_COLOR}22`, background: `${ARC_COLOR}08`, color: "#999" }}>
              <ChevronRight size={10} style={{ color: ARC_COLOR }} /> {s}
            </button>
          ))}
        </div>
      )}
      {searching && (
        <div className="flex items-center gap-3 text-sm font-mono py-4" style={{ color: ARC_COLOR }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Satellite size={16} style={{ color: ARC_COLOR }} />
          </motion.div>
          Scanning intelligence grid…
        </div>
      )}
      <div className="flex-1 overflow-y-auto rounded border p-3 font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-300 min-h-0"
        style={{ border: results ? `1px solid ${ARC_COLOR}33` : "transparent", background: results ? `${ARC_COLOR}08` : "transparent" }}>
        {results}
        {searching && results && <span className="animate-pulse" style={{ color: ARC_COLOR }}>▋</span>}
      </div>
    </div>
  );
}

function ChatDisplay() {
  const [msgs, setMsgs] = useState<{ role: "user" | "friday"; text: string }[]>([
    { role: "friday", text: `Good day, boss. I'm F.R.I.D.A.Y. — Fully Responsive Intelligent Digital Assistant for You. All systems are operational. What do you need?` }
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const QUICK = ["Brief me on the world", "What's the market doing?", "Run diagnostics", "What time is it?", "Search for AI news today"];

  const send = useCallback(async (q?: string) => {
    const msg = q || input.trim();
    if (!msg || streaming) return;
    setInput(""); setStreaming(true); setDraft("");
    setMsgs(m => [...m, { role: "user", text: msg }]);
    let full = "";
    await readChatText(
      `You are F.R.I.D.A.Y. — Tony Stark's AI assistant. You are calm, composed, precise, and occasionally dry. You speak like a trusted briefing officer — short responses (2-4 sentences), no bullet points, no markdown. Use "boss" naturally. Current time: ${new Date().toLocaleTimeString()}.

User says: "${msg}"

Respond as FRIDAY would — helpful, direct, Iron Man universe language.`,
      c => { full += c; setDraft(full); }
    );
    setMsgs(m => [...m, { role: "friday", text: full }]);
    pipeline.emit("FRIDAY", full);
    setStreaming(false); setDraft("");
  }, [input, streaming]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, draft]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {m.role === "friday" && (
              <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5"
                style={{ background: `${ARC_COLOR}22`, border: `1px solid ${ARC_COLOR}44` }}>
                <Zap size={12} style={{ color: ARC_COLOR }} />
              </div>
            )}
            <div className={`max-w-[78%] px-3 py-2 rounded-lg text-sm leading-relaxed font-mono`}
              style={m.role === "user"
                ? { background: `${RED_COLOR}22`, border: `1px solid ${RED_COLOR}44`, color: "#e2e8f0" }
                : { background: `${ARC_COLOR}11`, border: `1px solid ${ARC_COLOR}33`, color: "#e2e8f0" }}>
              {m.role === "friday" && <span className="text-xs font-bold block mb-1" style={{ color: ARC_COLOR }}>F.R.I.D.A.Y.</span>}
              {m.text}
            </div>
          </motion.div>
        ))}
        {streaming && draft && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center"
              style={{ background: `${ARC_COLOR}22`, border: `1px solid ${ARC_COLOR}44` }}>
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                <Zap size={12} style={{ color: ARC_COLOR }} />
              </motion.div>
            </div>
            <div className="max-w-[78%] px-3 py-2 rounded-lg text-sm font-mono leading-relaxed"
              style={{ background: `${ARC_COLOR}11`, border: `1px solid ${ARC_COLOR}33`, color: "#e2e8f0" }}>
              <span className="text-xs font-bold block mb-1" style={{ color: ARC_COLOR }}>F.R.I.D.A.Y.</span>
              {draft}<span className="animate-pulse" style={{ color: ARC_COLOR }}>▋</span>
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-3 space-y-2 border-t" style={{ borderColor: `${ARC_COLOR}22` }}>
        <div className="flex gap-1 flex-wrap">
          {QUICK.map(q => (
            <button key={q} onClick={() => send(q)} disabled={streaming}
              className="text-xs px-2 py-1 rounded transition-all hover:opacity-80 disabled:opacity-30"
              style={{ background: `${ARC_COLOR}15`, border: `1px solid ${ARC_COLOR}33`, color: ARC_COLOR }}>
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Talk to FRIDAY…" disabled={streaming}
            className="flex-1 bg-transparent text-sm font-mono text-gray-200 outline-none px-3 py-2 rounded border placeholder-gray-600"
            style={{ border: `1px solid ${ARC_COLOR}44`, background: "rgba(0,0,0,0.3)" }} />
          <button onClick={() => send()} disabled={streaming || !input.trim()}
            className="px-3 py-2 rounded text-xs font-bold transition-all hover:opacity-80 disabled:opacity-30"
            style={{ background: ARC_COLOR, color: "#000" }}>
            {streaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FridayAIModal({ open, onOpenChange }: Props) {
  const [mode, setMode] = useState<FridayMode>("chat");
  const MODES: { id: FridayMode; label: string; icon: typeof Zap; color: string }[] = [
    { id: "chat", label: "FRIDAY", icon: Zap, color: ARC_COLOR },
    { id: "news", label: "WORLD", icon: Globe, color: "#00e5ff" },
    { id: "finance", label: "FINANCE", icon: TrendingUp, color: "#10b981" },
    { id: "search", label: "SCAN", icon: Search, color: "#a78bfa" },
    { id: "system", label: "SYSTEM", icon: Monitor, color: "#6b7280" },
  ];

  const renderMode = () => {
    switch (mode) {
      case "chat": return <ChatDisplay />;
      case "news": return <NewsDisplay type="world" />;
      case "finance": return <NewsDisplay type="finance" />;
      case "search": return <SearchDisplay />;
      case "system": return <SystemDisplay />;
    }
  };

  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(24px)" }}>
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative w-full max-w-4xl h-[86vh] rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(135deg, #080810 0%, #0c0c18 50%, #080810 100%)",
            border: `1px solid ${ARC_COLOR}44`,
            boxShadow: `0 0 80px ${ARC_COLOR}20, 0 0 160px ${ARC_COLOR}08, inset 0 0 80px rgba(0,0,0,0.5)`,
          }}>

          <HUDScanLine />
          <HUDCorner pos="tl" /> <HUDCorner pos="tr" /> <HUDCorner pos="bl" /> <HUDCorner pos="br" />

          {/* Scan grid overlay */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{ backgroundImage: `linear-gradient(${ARC_COLOR} 1px, transparent 1px), linear-gradient(90deg, ${ARC_COLOR} 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />

          {/* Header */}
          <div className="relative z-10 flex items-center gap-4 px-6 py-4 border-b"
            style={{ borderColor: `${ARC_COLOR}33`, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(20px)" }}>
            <div className="flex items-center gap-3">
              <ArcReactor size={36} />
              <div>
                <div className="text-base font-black tracking-[0.15em] font-mono" style={{ color: ARC_COLOR, textShadow: `0 0 16px ${ARC_COLOR}88` }}>
                  F.R.I.D.A.Y.
                </div>
                <div className="text-xs text-gray-500 font-mono -mt-0.5">Fully Responsive Intelligent Digital Assistant for You</div>
              </div>
            </div>

            <div className="flex gap-1 ml-6">
              {MODES.map(m => {
                const Icon = m.icon;
                const active = mode === m.id;
                return (
                  <button key={m.id} onClick={() => setMode(m.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold font-mono transition-all"
                    style={{
                      background: active ? `${m.color}22` : "transparent",
                      border: `1px solid ${active ? m.color + "66" : "rgba(255,255,255,0.08)"}`,
                      color: active ? m.color : "#6b7280",
                    }}>
                    <Icon size={11} /> {m.label}
                  </button>
                );
              })}
            </div>

            <div className="ml-auto flex items-center gap-3">
              <motion.div className="flex items-center gap-1.5 text-xs font-mono" style={{ color: ARC_COLOR }}
                animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>
                <Radio size={10} /> ONLINE
              </motion.div>
              <button onClick={() => onOpenChange(false)}
                className="p-1.5 rounded transition-all hover:opacity-70"
                style={{ border: `1px solid ${ARC_COLOR}33` }}>
                <X size={14} style={{ color: ARC_COLOR }} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-h-0 relative z-10 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div key={mode} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }} className="h-full overflow-hidden">
                {renderMode()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom HUD bar */}
          <div className="relative z-10 flex items-center gap-4 px-6 py-2 border-t text-xs font-mono text-gray-600"
            style={{ borderColor: `${ARC_COLOR}22`, background: "rgba(0,0,0,0.5)" }}>
            <span style={{ color: ARC_COLOR }}>STARK</span>
            <span>INDUSTRIES</span>
            <span>·</span>
            <span>FRIDAY OS v2.0</span>
            <div className="flex gap-3 ml-auto">
              {["ARC REACTOR", "STT", "LLM", "TTS"].map(s => (
                <span key={s} className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
