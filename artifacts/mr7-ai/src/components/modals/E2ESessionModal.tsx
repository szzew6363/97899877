import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Lock, Unlock, Key, Shield, Eye, EyeOff, RefreshCw, Copy, CheckCheck, Zap, Radio, Wifi, Activity, AlertTriangle, CheckCircle, Plus, Trash2 } from "lucide-react";

interface E2ESessionModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type SessionState = "handshaking" | "active" | "rekeying" | "expired" | "terminated";

type Session = {
  id: string;
  alias: string;
  state: SessionState;
  algorithm: string;
  keySize: number;
  publicKey: string;
  sessionKey: string;
  dhParams: string;
  forwardSecrecy: boolean;
  createdAt: number;
  expiresAt: number;
  messagesEncrypted: number;
  bytesTransferred: number;
  color: string;
};

const ALGORITHMS = [
  { name: "AES-256-GCM + X25519", color: "#10b981", keySize: 256 },
  { name: "ChaCha20-Poly1305 + DH", color: "#00e5ff", keySize: 256 },
  { name: "AES-128-GCM + ECDH", color: "#a78bfa", keySize: 128 },
  { name: "AES-256-CBC + RSA-4096", color: "#fbbf24", keySize: 256 },
];

const ALIASES = ["GHOST-7X", "PHANTOM-3", "SHADOW-K", "SPECTER-9", "CIPHER-Z", "WRAITH-M"];
const COLORS = ["#10b981", "#00e5ff", "#a78bfa", "#fbbf24", "#f97316", "#e21227"];

function randHex(len: number) {
  return Array.from({ length: len }, () => Math.floor(Math.random() * 16).toString(16)).join("");
}

function buildSession(index: number): Session {
  const alg = ALGORITHMS[index % ALGORITHMS.length];
  const now = Date.now();
  return {
    id: randHex(8),
    alias: ALIASES[index % ALIASES.length],
    state: (["active", "active", "active", "handshaking", "rekeying"] as SessionState[])[Math.floor(Math.random() * 5)],
    algorithm: alg.name,
    keySize: alg.keySize,
    publicKey: randHex(64),
    sessionKey: randHex(64),
    dhParams: `p=${randHex(16)}, g=2`,
    forwardSecrecy: Math.random() > 0.2,
    createdAt: now - Math.floor(Math.random() * 7200000),
    expiresAt: now + Math.floor(Math.random() * 3600000 + 600000),
    messagesEncrypted: Math.floor(Math.random() * 4000 + 100),
    bytesTransferred: Math.floor(Math.random() * 10000000 + 50000),
    color: alg.color,
  };
}

const STATE_COLOR: Record<SessionState, string> = {
  handshaking: "#fbbf24", active: "#10b981", rekeying: "#00e5ff", expired: "#555", terminated: "#e21227"
};
const STATE_LABEL: Record<SessionState, string> = {
  handshaking: "HANDSHAKING", active: "ENCRYPTED", rekeying: "REKEYING", expired: "EXPIRED", terminated: "TERMINATED"
};

type KeyExchangeStep = { label: string; desc: string; done: boolean; color: string };

export function E2ESessionModal({ open, onOpenChange }: E2ESessionModalProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selected, setSelected] = useState<Session | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [handshakeSteps, setHandshakeSteps] = useState<KeyExchangeStep[]>([]);
  const [isHandshaking, setIsHandshaking] = useState(false);
  const [msgInput, setMsgInput] = useState("");
  const [encryptedMsgs, setEncryptedMsgs] = useState<{ plain: string; cipher: string; ts: string }[]>([]);

  useEffect(() => {
    if (open) {
      setSessions([buildSession(0), buildSession(1), buildSession(2), buildSession(3)]);
      setSelected(null);
      setHandshakeSteps([]);
      setEncryptedMsgs([]);
    }
  }, [open]);

  const addSession = () => {
    const s = buildSession(sessions.length);
    setSessions(prev => [...prev, s]);
    simulateHandshake(s);
    setSelected(s);
  };

  const simulateHandshake = async (s: Session) => {
    setIsHandshaking(true);
    const steps: KeyExchangeStep[] = [
      { label: "Client Hello", desc: `TLS 1.3 ClientHello · supported ciphers: ${s.algorithm}`, done: false, color: "#00e5ff" },
      { label: "Server Hello", desc: "Server selected cipher suite · sending certificate", done: false, color: "#a78bfa" },
      { label: "DH Key Exchange", desc: `Diffie-Hellman params: ${s.dhParams}`, done: false, color: "#fbbf24" },
      { label: "Key Derivation", desc: `HKDF-SHA256 → AES-${s.keySize}-GCM session key`, done: false, color: "#10b981" },
      { label: "Finish + Verify", desc: "HMAC verification · forward secrecy established", done: false, color: "#10b981" },
    ];
    setHandshakeSteps([...steps]);
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 400));
      setHandshakeSteps(prev => prev.map((step, idx) => idx === i ? { ...step, done: true } : step));
    }
    setSessions(prev => prev.map(sess => sess.id === s.id ? { ...sess, state: "active" } : sess));
    setIsHandshaking(false);
  };

  const rekey = async () => {
    if (!selected) return;
    setSessions(prev => prev.map(s => s.id === selected.id ? { ...s, state: "rekeying" } : s));
    setSelected(prev => prev ? { ...prev, state: "rekeying" } : prev);
    const steps: KeyExchangeStep[] = [
      { label: "Initiate Rekey", desc: "Sending rekey request · invalidating old session key", done: false, color: "#00e5ff" },
      { label: "New DH Exchange", desc: `Fresh ephemeral key pair · ${selected.algorithm}`, done: false, color: "#fbbf24" },
      { label: "Derive New Key", desc: `New ${selected.keySize}-bit session key generated`, done: false, color: "#a78bfa" },
      { label: "Verify & Commit", desc: "Both sides confirm new key · old key destroyed", done: false, color: "#10b981" },
    ];
    setHandshakeSteps(steps);
    setIsHandshaking(true);
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 350));
      setHandshakeSteps(prev => prev.map((s, idx) => idx === i ? { ...s, done: true } : s));
    }
    const newKey = randHex(64);
    setSessions(prev => prev.map(s => s.id === selected.id ? { ...s, state: "active", sessionKey: newKey, messagesEncrypted: 0 } : s));
    setSelected(prev => prev ? { ...prev, state: "active", sessionKey: newKey } : prev);
    setIsHandshaking(false);
  };

  const handleEncrypt = () => {
    if (!msgInput.trim() || !selected) return;
    const cipher = randHex(msgInput.length * 2 + 16);
    setEncryptedMsgs(prev => [{
      plain: msgInput,
      cipher: `[AES-GCM] ${cipher.slice(0, 48)}...`,
      ts: new Date().toLocaleTimeString("en-US", { hour12: false }),
    }, ...prev].slice(0, 6));
    setSessions(prev => prev.map(s => s.id === selected.id
      ? { ...s, messagesEncrypted: s.messagesEncrypted + 1, bytesTransferred: s.bytesTransferred + msgInput.length * 8 }
      : s));
    setMsgInput("");
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const formatBytes = (b: number) => b > 1e6 ? `${(b/1e6).toFixed(2)}MB` : `${(b/1e3).toFixed(1)}KB`;
  const timeLeft = (s: Session) => {
    const ms = s.expiresAt - Date.now();
    if (ms <= 0) return "EXPIRED";
    const m = Math.floor(ms / 60000);
    return `${m}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden border border-[#1a1a1a]"
            style={{ background: "#050510" }}>

            <div className="flex items-center justify-between px-5 py-3 border-b border-[#111] shrink-0"
              style={{ background: "rgba(0,229,255,0.03)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(0,229,255,0.12)", border: "1px solid rgba(0,229,255,0.35)" }}>
                  <Lock className="w-4 h-4" style={{ color: "#00e5ff" }} />
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-[0.3em] font-mono" style={{ color: "#00e5ff" }}>E2E SESSION MANAGER</div>
                  <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>END-TO-END ENCRYPTED · FORWARD SECRECY · EPHEMERAL KEYS</div>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <div className="text-center">
                    <div className="text-sm font-mono font-black" style={{ color: "#10b981" }}>{sessions.filter(s=>s.state==="active").length}</div>
                    <div className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>ACTIVE</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-mono font-black" style={{ color: "#00e5ff" }}>{sessions.length}</div>
                    <div className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>TOTAL</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={addSession}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all hover:opacity-80"
                  style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)", color: "#00e5ff" }}>
                  <Plus className="w-3 h-3" /> NEW SESSION
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Session list */}
              <div className="w-[240px] border-r border-[#111] flex flex-col shrink-0">
                <div className="p-3 border-b border-[#0f0f0f]">
                  <div className="text-[9px] font-mono font-black tracking-widest" style={{ color: "#00e5ff" }}>SESSIONS</div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {sessions.map(s => {
                    const sc = STATE_COLOR[s.state];
                    return (
                      <button key={s.id} onClick={() => setSelected(s)}
                        className="w-full text-left p-2.5 rounded-xl transition-all"
                        style={{ background: selected?.id === s.id ? `${sc}10` : "rgba(255,255,255,0.02)", border: `1px solid ${selected?.id === s.id ? sc + "35" : "#111"}` }}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-black font-mono" style={{ color: selected?.id === s.id ? sc : "rgba(255,255,255,0.6)" }}>{s.alias}</span>
                          <div className="flex items-center gap-1">
                            <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: sc }}
                              animate={s.state === "active" ? { opacity: [1, 0.4, 1] } : {}}
                              transition={{ duration: 1.2, repeat: Infinity }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded"
                            style={{ background: `${sc}15`, color: sc }}>{STATE_LABEL[s.state]}</span>
                          <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>#{s.id.slice(0,6)}</span>
                        </div>
                        {s.forwardSecrecy && (
                          <div className="flex items-center gap-1 mt-1">
                            <Shield className="w-2.5 h-2.5" style={{ color: "#10b981" }} />
                            <span className="text-[7px] font-mono" style={{ color: "#10b981" }}>PFS enabled</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Middle: session detail + handshake */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {selected ? (
                  <>
                    <div className="p-4 border-b border-[#111] shrink-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATE_COLOR[selected.state], boxShadow: `0 0 8px ${STATE_COLOR[selected.state]}` }} />
                          <span className="text-sm font-black font-mono" style={{ color: STATE_COLOR[selected.state] }}>{selected.alias}</span>
                          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${STATE_COLOR[selected.state]}15`, color: STATE_COLOR[selected.state] }}>{STATE_LABEL[selected.state]}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button onClick={rekey} disabled={isHandshaking || selected.state !== "active"}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold transition-all hover:opacity-80 disabled:opacity-30"
                            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "#fbbf24" }}>
                            <RefreshCw className="w-2.5 h-2.5" /> REKEY
                          </button>
                          <button onClick={() => setSessions(prev => { const n = prev.filter(s => s.id !== selected.id); setSelected(null); return n; })}
                            className="p-1.5 rounded-lg hover:bg-white/5"
                            style={{ color: "#e21227" }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          ["CIPHER", selected.algorithm.split(" ")[0]],
                          ["KEY SIZE", `${selected.keySize}-bit`],
                          ["MSGS ENC", selected.messagesEncrypted.toLocaleString()],
                          ["BYTES TX", formatBytes(selected.bytesTransferred)],
                          ["TTL", timeLeft(selected)],
                          ["PFS", selected.forwardSecrecy ? "ENABLED" : "DISABLED"],
                          ["KDF", "HKDF-SHA256"],
                          ["SESSION ID", "#" + selected.id.slice(0, 6)],
                        ].map(([k, v]) => (
                          <div key={k} className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid #111" }}>
                            <div className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{k}</div>
                            <div className="text-[9px] font-mono font-bold mt-0.5 truncate" style={{ color: "#00e5ff" }}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Keys */}
                    <div className="p-4 border-b border-[#111] shrink-0 space-y-2">
                      {[["PUBLIC KEY", selected.publicKey], ["SESSION KEY", selected.sessionKey]].map(([k, v]) => (
                        <div key={k}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[8px] font-mono font-bold" style={{ color: "rgba(255,255,255,0.3)" }}>{k}</span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setShowKey(!showKey)} className="p-0.5 hover:opacity-70">
                                {showKey ? <Eye className="w-3 h-3" style={{ color: "#555" }} /> : <EyeOff className="w-3 h-3" style={{ color: "#555" }} />}
                              </button>
                              <button onClick={() => handleCopy(v, k)} className="p-0.5 hover:opacity-70">
                                {copied === k ? <CheckCheck className="w-3 h-3" style={{ color: "#10b981" }} /> : <Copy className="w-3 h-3" style={{ color: "#555" }} />}
                              </button>
                            </div>
                          </div>
                          <div className="text-[8px] font-mono p-2 rounded-lg break-all"
                            style={{ background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.1)", color: showKey || k === "PUBLIC KEY" ? "#00e5ff" : "rgba(0,229,255,0.4)" }}>
                            {showKey || k === "PUBLIC KEY" ? v : v.replace(/./g, "•")}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Encrypt message */}
                    <div className="p-4 flex-1 flex flex-col overflow-hidden">
                      <div className="text-[9px] font-mono font-black mb-2" style={{ color: "rgba(255,255,255,0.25)" }}>ENCRYPT MESSAGE</div>
                      <div className="flex gap-2 mb-3 shrink-0">
                        <input value={msgInput} onChange={e => setMsgInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleEncrypt()}
                          placeholder="Enter message to encrypt..."
                          className="flex-1 text-[10px] font-mono px-2.5 py-1.5 rounded-lg outline-none"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #1a1a1a", color: "rgba(255,255,255,0.6)" }} />
                        <button onClick={handleEncrypt} disabled={!msgInput.trim() || selected.state !== "active"}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold disabled:opacity-30 transition-all hover:opacity-80"
                          style={{ background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)", color: "#00e5ff" }}>
                          <Lock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1.5">
                        <AnimatePresence>
                          {encryptedMsgs.map((m, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                              className="p-2.5 rounded-lg space-y-1"
                              style={{ background: "rgba(0,229,255,0.04)", border: "1px solid rgba(0,229,255,0.1)" }}>
                              <div className="flex items-center gap-2">
                                <Unlock className="w-2.5 h-2.5" style={{ color: "#10b981" }} />
                                <span className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>{m.plain}</span>
                                <span className="ml-auto text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>{m.ts}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Lock className="w-2.5 h-2.5 shrink-0" style={{ color: "#00e5ff" }} />
                                <span className="text-[8px] font-mono truncate" style={{ color: "#00e5ff" }}>{m.cipher}</span>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <Lock className="w-12 h-12 mb-4" style={{ color: "rgba(0,229,255,0.15)" }} />
                    <div className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>Select a session to inspect</div>
                  </div>
                )}
              </div>

              {/* Handshake panel */}
              <div className="w-[260px] border-l border-[#111] flex flex-col shrink-0">
                <div className="p-3 border-b border-[#0f0f0f]">
                  <div className="text-[9px] font-mono font-black tracking-widest" style={{ color: "#00e5ff" }}>KEY EXCHANGE</div>
                </div>
                <div className="flex-1 p-3 overflow-y-auto">
                  {handshakeSteps.length > 0 ? (
                    <div className="space-y-2">
                      {handshakeSteps.map((step, i) => (
                        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="flex gap-2.5">
                          <div className="flex flex-col items-center shrink-0">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center"
                              style={{ background: step.done ? `${step.color}20` : "rgba(255,255,255,0.04)", border: `1px solid ${step.done ? step.color + "50" : "#222"}` }}>
                              {step.done
                                ? <CheckCircle className="w-3 h-3" style={{ color: step.color }} />
                                : <motion.div className="w-2 h-2 rounded-full" style={{ background: "#333" }}
                                    animate={isHandshaking && !step.done ? { opacity: [0.3, 1, 0.3] } : {}}
                                    transition={{ duration: 0.6, repeat: Infinity }} />}
                            </div>
                            {i < handshakeSteps.length - 1 && (
                              <div className="w-px h-4 my-0.5" style={{ background: step.done ? step.color + "30" : "#1a1a1a" }} />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-[9px] font-bold font-mono" style={{ color: step.done ? step.color : "rgba(255,255,255,0.3)" }}>{step.label}</div>
                            <div className="text-[7.5px] font-mono mt-0.5 leading-relaxed" style={{ color: "rgba(255,255,255,0.2)" }}>{step.desc}</div>
                          </div>
                        </motion.div>
                      ))}
                      {!isHandshaking && handshakeSteps.every(s => s.done) && (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className="mt-3 p-2.5 rounded-lg flex items-center gap-2"
                          style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color: "#10b981" }} />
                          <div className="text-[9px] font-mono font-bold" style={{ color: "#10b981" }}>SECURE CHANNEL ESTABLISHED</div>
                        </motion.div>
                      )}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center">
                      <Key className="w-8 h-8 mb-3" style={{ color: "rgba(0,229,255,0.15)" }} />
                      <div className="text-[10px] font-mono text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                        Add a session or<br />rekey active session
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-3 border-t border-[#0f0f0f] space-y-1">
                  {[
                    ["PROTOCOL", "TLS 1.3 + QUIC"],
                    ["MAC", "POLY1305"],
                    ["KDF", "HKDF-SHA256"],
                    ["CERT PIN", "ENABLED"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-[8px] font-mono">
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>{k}</span>
                      <span style={{ color: "#00e5ff" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
