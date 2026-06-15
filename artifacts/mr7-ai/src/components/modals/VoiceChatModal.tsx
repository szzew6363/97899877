import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Phone, PhoneOff, Volume2, Loader2, X, Radio, Cpu, Zap } from "lucide-react";
import { streamChat, type ChatMessage } from "@/lib/chat-client";
import { useStore } from "@/lib/store";

/* ══════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════ */
type Status = "idle" | "listening" | "thinking" | "speaking";
type Turn = { role: "user" | "assistant"; text: string };
type SRInstance = {
  lang: string; interimResults: boolean; continuous: boolean;
  onstart: (() => void) | null;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void; stop: () => void;
};
interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

const SR: (new () => SRInstance) | undefined = typeof window !== "undefined"
  ? ((window as unknown as { SpeechRecognition?: new () => SRInstance; webkitSpeechRecognition?: new () => SRInstance })
      .SpeechRecognition
    ?? (window as unknown as { webkitSpeechRecognition?: new () => SRInstance }).webkitSpeechRecognition)
  : undefined;

/* ══════════════════════════════════════════════════════════════════
   WAVEFORM CANVAS
══════════════════════════════════════════════════════════════════ */
function WaveformCanvas({ status, active }: { status: Status; active: boolean }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef  = useRef(0);
  const barsRef = useRef<number[]>(Array.from({ length: 40 }, () => 0));

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    const MID = H / 2;
    const BAR_W = 3, GAP = 2, N = Math.floor(W / (BAR_W + GAP));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 1;
      const t = tRef.current;

      ctx.clearRect(0, 0, W, H);

      /* Background glow */
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0, "rgba(226,18,39,0.04)");
      bgGrad.addColorStop(0.5, "rgba(226,18,39,0.02)");
      bgGrad.addColorStop(1, "transparent");
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

      /* Waveform bars */
      for (let i = 0; i < N; i++) {
        let h = 0;
        if (status === "listening" && active) {
          /* Randomised mic input simulation */
          const target = 4 + Math.random() * (MID * 0.9);
          barsRef.current[i] = (barsRef.current[i] ?? 0) * 0.75 + target * 0.25;
          h = barsRef.current[i] ?? 4;
        } else if (status === "speaking") {
          /* Smooth sinusoidal speech wave */
          const phase = (i / N) * Math.PI * 3 - t * 0.12;
          const env   = Math.sin(Math.PI * i / N);
          h = (Math.sin(phase) * 0.5 + Math.sin(phase * 1.7 + 0.8) * 0.3 + 0.2) * env * MID * 0.88;
          barsRef.current[i] = Math.abs(h);
        } else if (status === "thinking") {
          /* Scanner sweep */
          const sweep = ((t * 0.018) % 1);
          const dist  = Math.abs(i / N - sweep);
          h = dist < 0.08 ? (1 - dist / 0.08) * MID * 0.7 : 4;
          barsRef.current[i] = h;
        } else {
          /* Idle — gentle heartbeat */
          const pulse = Math.abs(Math.sin(t * 0.04));
          barsRef.current[i] = (barsRef.current[i] ?? 0) * 0.88 + 3 * pulse * 0.12;
          h = barsRef.current[i] ?? 3;
        }

        const x = i * (BAR_W + GAP);
        const capped = Math.max(h, 1.5);

        /* Colour based on status */
        let col1 = "#e21227", col2 = "#e2122760";
        if (status === "listening")  { col1 = "#e21227"; col2 = "#e2122730"; }
        if (status === "thinking")   { col1 = "#f59e0b"; col2 = "#f59e0b30"; }
        if (status === "speaking")   { col1 = "#22c55e"; col2 = "#22c55e30"; }
        if (!active)                 { col1 = "#444";    col2 = "#33333320"; }

        const barGrad = ctx.createLinearGradient(0, MID - capped, 0, MID + capped);
        barGrad.addColorStop(0, col2);
        barGrad.addColorStop(0.4, col1);
        barGrad.addColorStop(0.5, col1 + "ff");
        barGrad.addColorStop(0.6, col1);
        barGrad.addColorStop(1, col2);
        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.roundRect(x, MID - capped, BAR_W, capped * 2, 2);
        ctx.fill();
      }

      /* Scanning line (thinking only) */
      if (status === "thinking") {
        const sweep = ((t * 0.018) % 1) * W;
        const sg = ctx.createLinearGradient(sweep - 40, 0, sweep + 40, 0);
        sg.addColorStop(0, "transparent");
        sg.addColorStop(0.5, "rgba(245,158,11,0.5)");
        sg.addColorStop(1, "transparent");
        ctx.fillStyle = sg; ctx.fillRect(sweep - 40, 0, 80, H);
      }

      /* Center line */
      ctx.beginPath(); ctx.moveTo(0, MID); ctx.lineTo(W, MID);
      ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1; ctx.stroke();
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, active]);

  return (
    <canvas ref={cvRef} width={400} height={72}
      style={{ width: "100%", height: "72px", borderRadius: "12px" }} />
  );
}

/* ══════════════════════════════════════════════════════════════════
   ARC REACTOR CORE CANVAS (centre call button background)
══════════════════════════════════════════════════════════════════ */
function ArcReactorCanvas({ status, active }: { status: Status; active: boolean }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const S = cv.width, cx = S / 2, cy = S / 2;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 1;
      const t = tRef.current;
      ctx.clearRect(0, 0, S, S);

      const col = !active ? "#333333" : status === "speaking" ? "#22c55e" : status === "thinking" ? "#f59e0b" : "#e21227";

      /* Outer rings */
      for (let r = 0; r < 3; r++) {
        const radius = 40 + r * 12;
        const alpha  = 0.08 - r * 0.02;
        const rotate = t * (0.008 + r * 0.004) * (r % 2 === 0 ? 1 : -1);
        ctx.save();
        ctx.translate(cx, cy); ctx.rotate(rotate); ctx.translate(-cx, -cy);
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.globalAlpha = alpha + (Math.sin(t * 0.04 + r) * 0.03);
        ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
      }

      /* Core glow */
      if (active) {
        const pulse = 0.6 + Math.sin(t * 0.06) * 0.4;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30 * pulse);
        g.addColorStop(0, col + "50");
        g.addColorStop(0.5, col + "15");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      }

      /* Rotating segments */
      const segN = 6;
      for (let i = 0; i < segN; i++) {
        const a = (i / segN) * Math.PI * 2 + t * 0.016;
        const r1 = 16, r2 = 30;
        ctx.save();
        ctx.globalAlpha = active ? 0.22 : 0.06;
        ctx.beginPath();
        ctx.arc(cx, cy, r2, a, a + 0.3); ctx.arc(cx, cy, r1, a + 0.3, a, true);
        ctx.closePath();
        ctx.fillStyle = col; ctx.fill();
        ctx.restore();
      }
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [status, active]);

  return (
    <canvas ref={cvRef} width={120} height={120}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", borderRadius: "50%" }} />
  );
}

/* ══════════════════════════════════════════════════════════════════
   STATUS CHIP
══════════════════════════════════════════════════════════════════ */
const STATUS_CONF = {
  idle:      { label: "STANDBY",   color: "#6b7280", icon: Radio },
  listening: { label: "LISTENING", color: "#e21227", icon: Mic },
  thinking:  { label: "THINKING",  color: "#f59e0b", icon: Cpu },
  speaking:  { label: "SPEAKING",  color: "#22c55e", icon: Volume2 },
};

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════ */
export function VoiceChatModal({ open, onOpenChange }: Props) {
  const { state } = useStore();
  const [status,  setStatus]  = useState<Status>("idle");
  const [partial, setPartial] = useState("");
  const [turns,   setTurns]   = useState<Turn[]>([]);
  const [error,   setError]   = useState<string | null>(null);
  const [muted,   setMuted]   = useState(false);
  const [active,  setActive]  = useState(false);
  const recogRef   = useRef<SRInstance | null>(null);
  const turnsRef   = useRef<Turn[]>([]);
  const activeRef  = useRef(false);
  const mutedRef   = useRef(false);
  const abortRef   = useRef<AbortController | null>(null);
  const turnsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { turnsRef.current = turns; }, [turns]);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);
  useEffect(() => { turnsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [turns]);

  useEffect(() => {
    if (!open) { stopAll(); setTurns([]); setPartial(""); setStatus("idle"); setActive(false); setError(null); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function stopAll() {
    try { recogRef.current?.stop(); } catch { /* ignore */ }
    recogRef.current = null;
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    abortRef.current?.abort();
    abortRef.current = null;
  }

  function speak(text: string, onEnd: () => void) {
    if (mutedRef.current || !("speechSynthesis" in window)) { onEnd(); return; }
    setStatus("speaking");
    const u = new SpeechSynthesisUtterance(text);
    u.lang = state.settings.language === "ar" ? "ar-SA" : "en-US";
    u.rate = 1.0;
    u.onend = () => onEnd(); u.onerror = () => onEnd();
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function startListening() {
    if (!SR) {
      setError(state.settings.language === "ar" ? "متصفّحك لا يدعم التعرّف على الكلام" : "Browser does not support speech recognition");
      return;
    }
    setError(null); setPartial("");
    const r = new SR();
    r.lang = state.settings.language === "ar" ? "ar-SA" : "en-US";
    r.interimResults = true; r.continuous = false;
    r.onstart = () => setStatus("listening");
    r.onresult = (e) => {
      let interim = "", final_ = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i]; if (!result) continue;
        const alt = result[0]; if (!alt) continue;
        if (result.isFinal) final_ += alt.transcript; else interim += alt.transcript;
      }
      setPartial(final_ || interim);
      if (final_.trim()) { try { r.stop(); } catch { /* ignore */ } void onUserUtterance(final_.trim()); }
    };
    r.onerror = (e) => {
      if (e.error === "no-speech" && activeRef.current) { setTimeout(() => { if (activeRef.current && status === "idle") startListening(); }, 200); return; }
      setError(`mic: ${e.error}`); setStatus("idle");
    };
    r.onend = () => { if (status === "listening") setStatus("idle"); };
    recogRef.current = r;
    try { r.start(); } catch { /* may already be started */ }
  }

  async function onUserUtterance(text: string) {
    if (!text) return;
    const userTurn: Turn = { role: "user", text };
    const next = [...turnsRef.current, userTurn];
    setTurns(next); setPartial(""); setStatus("thinking");
    const messages: ChatMessage[] = next.map(t => ({ role: t.role, content: t.text }));
    const ac = new AbortController();
    abortRef.current = ac;
    let answer = "";
    try {
      answer = await streamChat(
        { model: state.activeModel, persona: state.activePersona, customInstructions: state.customInstructions ?? "",
          language: state.settings.language, memory: state.memory, messages, mode: "chat", webContext: null },
        () => { /* stream chunks ignored */ }, ac.signal,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "request failed";
      setError(msg); setStatus("idle"); return;
    }
    const finalAnswer = answer.trim() || (state.settings.language === "ar" ? "تعذّر التوليد." : "No response.");
    setTurns(prev => [...prev, { role: "assistant", text: finalAnswer }]);
    speak(finalAnswer, () => { setStatus("idle"); if (activeRef.current) startListening(); });
  }

  function startCall() { setActive(true); activeRef.current = true; startListening(); }
  function endCall()   { setActive(false); activeRef.current = false; stopAll(); setStatus("idle"); }

  const isAr = state.settings.language === "ar";
  const conf  = STATUS_CONF[status];
  const StatusIcon = conf.icon;

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, zIndex: 9950, display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(16px)" }}
        onClick={() => onOpenChange(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.88, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.88, y: 20 }}
          transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
          style={{
            width: "clamp(360px, 90vw, 520px)", borderRadius: "20px", overflow: "hidden",
            background: "linear-gradient(160deg, rgba(8,2,18,0.99) 0%, rgba(2,0,10,0.99) 100%)",
            border: "1px solid rgba(226,18,39,0.20)",
            boxShadow: "0 0 120px rgba(226,18,39,0.10), 0 40px 100px rgba(0,0,0,0.98)",
          }}
        >
          {/* Top accent line */}
          <div style={{ height: "2px", background: `linear-gradient(90deg, transparent, ${conf.color}, transparent)`,
            transition: "background 0.4s ease" }} />

          {/* Header */}
          <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid rgba(226,18,39,0.08)",
            background: "rgba(10,2,6,0.6)", display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "8px", display: "flex", alignItems: "center",
              justifyContent: "center", background: `radial-gradient(circle, ${conf.color}25, rgba(0,0,0,0.9))`,
              border: `1px solid ${conf.color}35`, boxShadow: `0 0 18px ${conf.color}30`, transition: "all 0.4s" }}>
              <Mic style={{ width: "14px", height: "14px", color: conf.color }} />
            </div>
            <div>
              <div style={{ fontSize: "10px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "3px" }}>
                VOICE COMMAND INTERFACE
              </div>
              <div style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(226,18,39,0.5)", letterSpacing: "2px", marginTop: "1px" }}>
                KaliGPT · MASTER CONTROLLER
              </div>
            </div>
            <div style={{ flex: 1 }} />
            {/* Status chip */}
            <motion.div
              animate={{ borderColor: conf.color + "50", boxShadow: `0 0 12px ${conf.color}20` }}
              transition={{ duration: 0.3 }}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "20px",
                background: `${conf.color}10`, border: `1px solid ${conf.color}40` }}>
              <motion.div animate={status !== "idle" ? { opacity: [1, 0.2, 1] } : { opacity: 1 }}
                transition={{ duration: 0.7, repeat: status !== "idle" ? Infinity : 0 }}
                style={{ width: "5px", height: "5px", borderRadius: "50%", background: conf.color,
                  boxShadow: `0 0 6px ${conf.color}` }} />
              <span style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 900, letterSpacing: "1.5px",
                color: conf.color }}>{conf.label}</span>
            </motion.div>
            <button onClick={() => onOpenChange(false)}
              style={{ width: "28px", height: "28px", borderRadius: "7px", background: "rgba(226,18,39,0.06)",
                border: "1px solid rgba(226,18,39,0.20)", color: "rgba(255,255,255,0.4)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center" }}>
              <X style={{ width: "12px", height: "12px" }} />
            </button>
          </div>

          {/* Waveform */}
          <div style={{ padding: "14px 18px", background: "rgba(4,2,14,0.7)", position: "relative", overflow: "hidden" }}>
            {/* Scan grid lines */}
            <div style={{ position: "absolute", inset: 0, backgroundImage:
              "linear-gradient(rgba(226,18,39,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(226,18,39,0.03) 1px, transparent 1px)",
              backgroundSize: "20px 20px", pointerEvents: "none" }} />
            <WaveformCanvas status={status} active={active} />
          </div>

          {/* Call button + info */}
          <div style={{ padding: "18px 18px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
            {/* Arc reactor call button */}
            <div style={{ position: "relative", width: "100px", height: "100px" }}>
              <ArcReactorCanvas status={status} active={active} />
              <motion.button
                onClick={active ? endCall : startCall}
                whileTap={{ scale: 0.92 }}
                whileHover={{ scale: 1.05 }}
                animate={{
                  boxShadow: active
                    ? [`0 0 0px ${conf.color}00`, `0 0 40px ${conf.color}60`, `0 0 0px ${conf.color}00`]
                    : `0 0 24px rgba(226,18,39,0.30)`,
                }}
                transition={{ duration: 1.4, repeat: active ? Infinity : 0 }}
                style={{
                  position: "absolute", inset: "12px",
                  borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", border: `2px solid ${active ? conf.color : "rgba(226,18,39,0.45)"}`,
                  background: active
                    ? `radial-gradient(circle, ${conf.color}25, rgba(0,0,0,0.92))`
                    : "radial-gradient(circle, rgba(226,18,39,0.10), rgba(0,0,0,0.95))",
                  transition: "background 0.35s, border-color 0.35s",
                }}
              >
                {active
                  ? <PhoneOff style={{ width: "26px", height: "26px", color: conf.color }} />
                  : <Phone style={{ width: "26px", height: "26px", color: "#e21227" }} />
                }
              </motion.button>
            </div>

            {/* Status text */}
            <div style={{ height: "20px", display: "flex", alignItems: "center" }}>
              <AnimatePresence mode="wait">
                <motion.div key={status + String(active)}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <StatusIcon style={{ width: "10px", height: "10px", color: conf.color }} />
                  <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "2.5px",
                    color: active ? conf.color : "rgba(255,255,255,0.28)", textTransform: "uppercase" }}>
                    {!active && status === "idle" && (isAr ? "اضغط للبدء" : "PRESS TO START")}
                    {active && status === "idle"    && (isAr ? "في انتظار صوتك..." : "AWAITING VOICE...")}
                    {status === "listening"          && (isAr ? "أستمع..." : "LISTENING...")}
                    {status === "thinking"           && (isAr ? "أعالج..." : "PROCESSING...")}
                    {status === "speaking"           && (isAr ? "أتحدّث..." : "SPEAKING...")}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Partial transcript */}
            <AnimatePresence>
              {partial && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "10px",
                    background: "rgba(226,18,39,0.04)", border: "1px solid rgba(226,18,39,0.15)",
                    fontSize: "10px", color: "rgba(255,255,255,0.55)", fontFamily: "monospace",
                    fontStyle: "italic", textAlign: "center" }}>
                  "{partial}"
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mute toggle */}
            <div style={{ display: "flex", gap: "8px" }}>
              <motion.button whileTap={{ scale: 0.93 }} onClick={() => setMuted(m => !m)}
                style={{
                  padding: "6px 14px", borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px",
                  background: muted ? "rgba(226,18,39,0.10)" : "rgba(255,255,255,0.04)",
                  border: muted ? "1px solid rgba(226,18,39,0.35)" : "1px solid rgba(255,255,255,0.08)",
                  color: muted ? "#f87171" : "rgba(255,255,255,0.45)",
                }}>
                {muted ? <MicOff style={{ width: "10px", height: "10px" }} /> : <Volume2 style={{ width: "10px", height: "10px" }} />}
                <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "1px" }}>
                  {muted ? (isAr ? "صوت مكتوم" : "REPLY MUTED") : (isAr ? "صوت مفعّل" : "REPLY ON")}
                </span>
              </motion.button>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "9px",
                    background: "rgba(226,18,39,0.07)", border: "1px solid rgba(226,18,39,0.30)",
                    fontSize: "8.5px", fontFamily: "monospace", color: "#f87171", display: "flex", alignItems: "center", gap: "7px" }}>
                  <Zap style={{ width: "10px", height: "10px", flexShrink: 0 }} />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Conversation log */}
          {turns.length > 0 && (
            <div style={{ borderTop: "1px solid rgba(226,18,39,0.08)", maxHeight: "160px", overflowY: "auto",
              padding: "12px 18px", display: "flex", flexDirection: "column", gap: "8px" }}
              className="scrollbar-cyber">
              {turns.map((t, i) => (
                <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 900, letterSpacing: "1px", minWidth: "24px", marginTop: "1px",
                    color: t.role === "user" ? "rgba(226,18,39,0.6)" : "rgba(34,197,94,0.7)" }}>
                    {t.role === "user" ? (isAr ? "أنت" : "YOU") : "AI"}
                  </span>
                  <p style={{ fontSize: "10px", color: t.role === "user" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.80)",
                    lineHeight: "1.45", flex: 1 }}>
                    {t.text}
                  </p>
                </div>
              ))}
              <div ref={turnsEndRef} />
            </div>
          )}

          {/* Bottom */}
          <div style={{ padding: "7px 18px", borderTop: "1px solid rgba(226,18,39,0.06)", background: "rgba(4,2,14,0.7)",
            display: "flex", alignItems: "center", gap: "8px" }}>
            <motion.div animate={{ opacity: active ? [1, 0.2, 1] : 0.3 }} transition={{ duration: 0.9, repeat: active ? Infinity : 0 }}
              style={{ width: "4px", height: "4px", borderRadius: "50%", background: active ? conf.color : "#444",
                boxShadow: active ? `0 0 6px ${conf.color}` : "none" }} />
            <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)" }}>
              {active ? (isAr ? "جلسة نشطة" : "SESSION ACTIVE") : (isAr ? "في وضع الاستعداد" : "STANDBY")} · Web Speech API · {state.activeModel}
            </span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
