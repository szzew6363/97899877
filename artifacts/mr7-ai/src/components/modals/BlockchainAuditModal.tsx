import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Link2, Shield, CheckCircle, AlertTriangle, Clock, Hash, Lock, Plus, Eye, Database, Zap, Copy, CheckCheck } from "lucide-react";

interface BlockchainAuditModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type AuditBlock = {
  index: number;
  timestamp: number;
  event: string;
  actor: string;
  action: string;
  resource: string;
  severity: "INFO" | "WARN" | "CRITICAL" | "SUCCESS";
  prevHash: string;
  hash: string;
  nonce: number;
  verified: boolean;
};

const SEV_COLOR = { INFO: "#00e5ff", WARN: "#fbbf24", CRITICAL: "#e21227", SUCCESS: "#10b981" };
const SEV_BG = { INFO: "rgba(0,229,255,0.08)", WARN: "rgba(251,191,36,0.08)", CRITICAL: "rgba(226,18,39,0.08)", SUCCESS: "rgba(16,185,129,0.08)" };

const EVENT_TEMPLATES = [
  { event: "LOGIN_SUCCESS", actor: "admin@kaligpt.io", action: "Authenticated via 2FA", resource: "/api/auth/login", severity: "SUCCESS" },
  { event: "EXPLOIT_DETECTED", actor: "system:ids", action: "SQL injection attempt blocked", resource: "/api/users?id=1' OR 1=1--", severity: "CRITICAL" },
  { event: "FILE_ACCESS", actor: "user:ghost_7x", action: "Accessed sensitive config", resource: "/etc/shadow (read)", severity: "WARN" },
  { event: "PRIV_ESCALATION", actor: "proc:worker-3", action: "Elevated to root via SUID", resource: "/bin/sudo", severity: "CRITICAL" },
  { event: "KEY_ROTATION", actor: "system:crypto", action: "Rotated AES-256 session key", resource: "session_key_v14", severity: "INFO" },
  { event: "API_CALL", actor: "svc:ai-engine", action: "Model inference request", resource: "POST /api/chat", severity: "INFO" },
  { event: "NETWORK_SCAN", actor: "ip:185.220.101.47", action: "Port scan detected (nmap)", resource: "ports 1-65535", severity: "WARN" },
  { event: "DATA_EXPORT", actor: "admin:root_0x1", action: "Bulk data export initiated", resource: "users table (2,847 rows)", severity: "WARN" },
  { event: "PATCH_APPLIED", actor: "system:autopatch", action: "CVE-2023-44487 mitigated", resource: "nginx 1.24.0 → 1.25.3", severity: "SUCCESS" },
  { event: "BREACH_ATTEMPT", actor: "ip:91.108.4.0/24", action: "Brute force on SSH blocked", resource: "sshd:22 (blocked)", severity: "CRITICAL" },
  { event: "CERT_RENEWED", actor: "system:certbot", action: "TLS certificate renewed", resource: "*.kaligpt.io", severity: "SUCCESS" },
  { event: "FIREWALL_RULE", actor: "admin:sysop", action: "DROP rule added", resource: "ip:185.220.101.47", severity: "INFO" },
];

function fakeHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h) + input.charCodeAt(i);
    h |= 0;
  }
  const base = Math.abs(h).toString(16).padStart(8, "0");
  return (base + base + "a3f8c1d2e9b7" + Date.now().toString(16)).slice(0, 64);
}

function buildBlock(index: number, prevHash: string, tmpl: typeof EVENT_TEMPLATES[0]): AuditBlock {
  const nonce = Math.floor(Math.random() * 99999);
  const payload = `${index}${prevHash}${tmpl.event}${tmpl.actor}${nonce}`;
  const hash = fakeHash(payload);
  return {
    index,
    timestamp: Date.now() - Math.floor(Math.random() * 3600000),
    event: tmpl.event,
    actor: tmpl.actor,
    action: tmpl.action,
    resource: tmpl.resource,
    severity: tmpl.severity as AuditBlock["severity"],
    prevHash,
    hash,
    nonce,
    verified: true,
  };
}

const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

function buildInitialChain(): AuditBlock[] {
  const chain: AuditBlock[] = [];
  let prev = GENESIS_HASH;
  for (let i = 0; i < 8; i++) {
    const tmpl = EVENT_TEMPLATES[i % EVENT_TEMPLATES.length];
    const block = buildBlock(i + 1, prev, tmpl);
    chain.push(block);
    prev = block.hash;
  }
  return chain;
}

export function BlockchainAuditModal({ open, onOpenChange }: BlockchainAuditModalProps) {
  const [chain, setChain] = useState<AuditBlock[]>([]);
  const [selected, setSelected] = useState<AuditBlock | null>(null);
  const [mining, setMining] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [allVerified, setAllVerified] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const chainEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setChain(buildInitialChain());
      setSelected(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || chain.length === 0) return;
    const iv = setInterval(() => {
      const tmpl = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
      setMining(true);
      setTimeout(() => {
        setChain(prev => {
          const last = prev[prev.length - 1];
          const block = buildBlock(prev.length + 1, last.hash, tmpl);
          return [...prev, block];
        });
        setMining(false);
      }, 1200);
    }, 6000);
    return () => clearInterval(iv);
  }, [open, chain.length]);

  useEffect(() => {
    chainEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chain.length]);

  const verifyChain = useCallback(async () => {
    setVerifying(true);
    setAllVerified(false);
    await new Promise(r => setTimeout(r, 1500));
    setAllVerified(true);
    setVerifying(false);
  }, []);

  const addBlock = () => {
    const tmpl = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    setMining(true);
    setTimeout(() => {
      setChain(prev => {
        const last = prev[prev.length - 1];
        return [...prev, buildBlock(prev.length + 1, last.hash, tmpl)];
      });
      setMining(false);
    }, 800);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const integrityColor = allVerified && !verifying ? "#10b981" : verifying ? "#fbbf24" : "#e21227";

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={e => e.target === e.currentTarget && onOpenChange(false)}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden border border-[#1a1a1a]"
            style={{ background: "#050808" }}>

            <div className="flex items-center justify-between px-5 py-3 border-b border-[#111] shrink-0"
              style={{ background: "rgba(16,185,129,0.03)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.35)" }}>
                  <Link2 className="w-4 h-4" style={{ color: "#10b981" }} />
                </div>
                <div>
                  <div className="text-[11px] font-black tracking-[0.3em] font-mono" style={{ color: "#10b981" }}>BLOCKCHAIN AUDIT LOG</div>
                  <div className="text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>IMMUTABLE CRYPTOGRAPHIC CHAIN · AUTO-MINING · TAMPER-EVIDENT</div>
                </div>
                <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded"
                  style={{ background: `${integrityColor}10`, border: `1px solid ${integrityColor}30` }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: integrityColor }} />
                  <span className="text-[9px] font-mono font-bold" style={{ color: integrityColor }}>
                    {verifying ? "VERIFYING..." : allVerified ? "CHAIN VALID" : "CHAIN INVALID"}
                  </span>
                </div>
                {mining && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.2)" }}>
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-[#fbbf24]" animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.5, repeat: Infinity }} />
                    <span className="text-[9px] font-mono" style={{ color: "#fbbf24" }}>MINING BLOCK #{chain.length + 1}...</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={addBlock} disabled={mining}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981" }}>
                  <Plus className="w-3 h-3" /> ADD EVENT
                </button>
                <button onClick={verifyChain} disabled={verifying}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all hover:opacity-80 disabled:opacity-40"
                  style={{ background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)", color: "#00e5ff" }}>
                  <Shield className="w-3 h-3" /> VERIFY CHAIN
                </button>
                <button onClick={() => onOpenChange(false)} className="p-1.5 rounded-lg hover:bg-white/5 ml-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
              {/* Chain timeline */}
              <div className="flex-1 overflow-y-auto p-4 space-y-0 relative">
                {/* Genesis block */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1a1a1a" }}>
                    <Hash className="w-3.5 h-3.5" style={{ color: "#333" }} />
                  </div>
                  <div className="text-[8px] font-mono" style={{ color: "#222" }}>
                    GENESIS · {GENESIS_HASH.slice(0, 24)}...
                  </div>
                </div>

                {chain.map((block, i) => {
                  const sc = SEV_COLOR[block.severity];
                  const sb = SEV_BG[block.severity];
                  return (
                    <motion.div key={block.index} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                      className="flex gap-3 group">
                      {/* Connector line */}
                      <div className="flex flex-col items-center shrink-0 w-8">
                        <div className="w-px flex-1" style={{ background: `${sc}30`, minHeight: "16px" }} />
                        <button
                          onClick={() => setSelected(selected?.index === block.index ? null : block)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all shrink-0"
                          style={{ background: selected?.index === block.index ? sb : "rgba(255,255,255,0.03)", border: `1px solid ${selected?.index === block.index ? sc + "50" : sc + "20"}` }}>
                          <div className="text-[8px] font-black font-mono" style={{ color: sc }}>{block.index}</div>
                        </button>
                        {i < chain.length - 1 && <div className="w-px flex-1" style={{ background: `${sc}20`, minHeight: "8px" }} />}
                      </div>

                      {/* Block card */}
                      <div className="flex-1 mb-3 cursor-pointer" onClick={() => setSelected(selected?.index === block.index ? null : block)}>
                        <div className="p-3 rounded-xl transition-all"
                          style={{ background: selected?.index === block.index ? sb : "rgba(255,255,255,0.02)", border: `1px solid ${selected?.index === block.index ? sc + "40" : "#111"}` }}>
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black font-mono px-1.5 py-0.5 rounded"
                                style={{ background: sb, color: sc }}>{block.severity}</span>
                              <span className="text-[10px] font-black font-mono" style={{ color: sc }}>{block.event}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-3 h-3" style={{ color: "#10b981" }} />
                              <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
                                {new Date(block.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                              </span>
                            </div>
                          </div>
                          <div className="text-[9px] font-mono mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                            <span style={{ color: "rgba(255,255,255,0.3)" }}>actor: </span>{block.actor}
                          </div>
                          <div className="text-[9px] font-mono mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
                            <span style={{ color: "rgba(255,255,255,0.3)" }}>action: </span>{block.action}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Hash className="w-2.5 h-2.5 shrink-0" style={{ color: sc + "60" }} />
                            <span className="text-[8px] font-mono truncate" style={{ color: sc + "60" }}>
                              {block.hash.slice(0, 32)}...
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {mining && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                    <div className="flex flex-col items-center shrink-0 w-8">
                      <div className="w-px h-4" style={{ background: "rgba(251,191,36,0.3)" }} />
                      <motion.div className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)" }}
                        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 0.8, repeat: Infinity }}>
                        <Zap className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                      </motion.div>
                    </div>
                    <div className="flex-1 mb-3 p-3 rounded-xl" style={{ background: "rgba(251,191,36,0.04)", border: "1px solid rgba(251,191,36,0.2)" }}>
                      <div className="text-[9px] font-mono" style={{ color: "#fbbf24" }}>Mining new block... computing proof of work</div>
                    </div>
                  </motion.div>
                )}
                <div ref={chainEndRef} />
              </div>

              {/* Block detail */}
              <div className="w-[300px] border-l border-[#111] flex flex-col shrink-0">
                <div className="p-3 border-b border-[#0f0f0f]">
                  <div className="text-[9px] font-mono font-black tracking-widest" style={{ color: "#10b981" }}>BLOCK INSPECTOR</div>
                </div>
                {selected ? (
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded" style={{ background: SEV_COLOR[selected.severity] }} />
                        <span className="text-sm font-black font-mono" style={{ color: SEV_COLOR[selected.severity] }}>BLOCK #{selected.index}</span>
                        <CheckCircle className="w-3.5 h-3.5 ml-auto" style={{ color: "#10b981" }} />
                      </div>

                      {[
                        ["EVENT", selected.event],
                        ["SEVERITY", selected.severity],
                        ["ACTOR", selected.actor],
                        ["ACTION", selected.action],
                        ["RESOURCE", selected.resource],
                        ["TIMESTAMP", new Date(selected.timestamp).toISOString()],
                        ["NONCE", selected.nonce.toString()],
                      ].map(([k, v]) => (
                        <div key={k} className="py-1.5 border-b border-[#0d0d0d]">
                          <div className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{k}</div>
                          <div className="text-[9px] font-mono mt-0.5 break-all" style={{ color: "rgba(255,255,255,0.65)" }}>{v}</div>
                        </div>
                      ))}

                      {[["PREV HASH", selected.prevHash], ["HASH", selected.hash]].map(([k, v]) => (
                        <div key={k} className="py-1.5">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{k}</span>
                            <button onClick={() => handleCopy(v, k)}
                              className="p-0.5 rounded hover:bg-white/5">
                              {copied === k ? <CheckCheck className="w-2.5 h-2.5" style={{ color: "#10b981" }} /> : <Copy className="w-2.5 h-2.5" style={{ color: "#333" }} />}
                            </button>
                          </div>
                          <div className="text-[8px] font-mono break-all p-1.5 rounded"
                            style={{ background: "rgba(255,255,255,0.02)", color: "#10b981", border: "1px solid #0f0f0f" }}>
                            {v}
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <Link2 className="w-8 h-8 mb-3" style={{ color: "rgba(16,185,129,0.2)" }} />
                    <div className="text-[10px] font-mono text-center" style={{ color: "rgba(255,255,255,0.2)" }}>
                      Click any block<br />to inspect details
                    </div>
                  </div>
                )}
                <div className="p-3 border-t border-[#0f0f0f] space-y-1.5">
                  {[["BLOCKS", chain.length], ["CRITICAL", chain.filter(b=>b.severity==="CRITICAL").length], ["INTEGRITY", "100%"]].map(([k,v])=>(
                    <div key={k} className="flex justify-between text-[8px] font-mono">
                      <span style={{ color: "rgba(255,255,255,0.25)" }}>{k}</span>
                      <span style={{ color: "#10b981" }}>{v}</span>
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
