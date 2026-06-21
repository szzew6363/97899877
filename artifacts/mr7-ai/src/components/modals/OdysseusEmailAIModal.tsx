import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Inbox, Send, Star, Trash2, AlertTriangle, CheckCheck, Loader2, Zap, Reply, Archive, Tag, Search, RefreshCw } from "lucide-react";
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


interface OdysseusEmailAIModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type EmailCategory = "inbox" | "important" | "spam" | "sent";
type Email = {
  id: string; from: string; subject: string; preview: string; time: string; read: boolean;
  category: EmailCategory; priority: "high" | "medium" | "low"; aiSummary?: string;
};

const SAMPLE_EMAILS: Email[] = [
  { id: "1", from: "security@cisa.gov", subject: "CRITICAL: Active Exploitation of CVE-2026-1337 in the Wild", preview: "CISA has added CVE-2026-1337 to its Known Exploited Vulnerabilities catalog...", time: "2m ago", read: false, category: "important", priority: "high", aiSummary: "Critical CVE actively exploited. Immediate patching required." },
  { id: "2", from: "team@company.com", subject: "Q4 Security Audit Results — Action Required", preview: "Please review the attached security audit report and schedule a remediation meeting...", time: "1h ago", read: false, category: "inbox", priority: "high" },
  { id: "3", from: "newsletter@hackernews.com", subject: "Top Security Stories This Week", preview: "This week in cybersecurity: LockBit 4.0 claims major victim, new AI-powered attacks...", time: "3h ago", read: true, category: "inbox", priority: "low" },
  { id: "4", from: "boss@company.com", subject: "Meeting Tomorrow at 10am — AI Strategy Discussion", preview: "Hi, I wanted to schedule a brief meeting to discuss our AI integration roadmap...", time: "5h ago", read: false, category: "important", priority: "high" },
  { id: "5", from: "noreply@github.com", subject: "Security alert: a new public key was added to your account", preview: "A new SSH key was added to your GitHub account. If you didn't add this key...", time: "1d ago", read: true, category: "inbox", priority: "medium" },
  { id: "6", from: "marketing@random.com", subject: "🎉 You've been selected! Claim your prize now!", preview: "Congratulations! You're our lucky winner. Click here to claim your $1000 prize...", time: "2d ago", read: true, category: "spam", priority: "low" },
];

const TRIAGE_RULES = [
  { label: "CRITICAL", color: "#e21227", desc: "Security alerts, urgent action needed" },
  { label: "ACTION", color: "#f97316", desc: "Requires your response or decision" },
  { label: "INFO", color: "#3b82f6", desc: "FYI, no action needed" },
  { label: "LATER", color: "#6b7280", desc: "Can be addressed this week" },
  { label: "SPAM", color: "#374151", desc: "Junk, marketing, unsubscribe" },
];

export function OdysseusEmailAIModal({ open, onOpenChange }: OdysseusEmailAIModalProps) {
  const [emails, setEmails] = useState<Email[]>(SAMPLE_EMAILS);
  const [selected, setSelected] = useState<Email | null>(null);
  const [folder, setFolder] = useState<EmailCategory | "all">("all");
  const [search, setSearch] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [running, setRunning] = useState(false);
  const [runningAction, setRunningAction] = useState<"reply" | "summary" | "triage" | null>(null);
  const [triageResults, setTriageResults] = useState("");

  const filtered = emails.filter(e => {
    const matchFolder = folder === "all" ? true : e.category === folder;
    const matchSearch = !search || e.subject.toLowerCase().includes(search.toLowerCase()) || e.from.toLowerCase().includes(search.toLowerCase());
    return matchFolder && matchSearch;
  });

  const unread = emails.filter(e => !e.read).length;

  async function generateReply(email: Email) {
    setRunning(true); setRunningAction("reply"); setAiReply("");
    pipeline.push({ source: "Odysseus Email AI", label: `Draft reply to ${email.from}`, content: "", sourceColor: "#3b82f6" });
    const prompt = `You are an expert email assistant. Draft a professional, concise reply to this email.

From: ${email.from}
Subject: ${email.subject}
Content: ${email.preview}

Write a complete, professional email reply. Be concise, clear, and appropriate for the context. Use proper email format.`;
    try {
      await streamOdysseus(prompt, full => setAiReply(prev => full));
    } catch { setAiReply("Could not generate reply. Please try again."); }
    setRunning(false); setRunningAction(null);
  }

  async function summarizeEmail(email: Email) {
    setRunning(true); setRunningAction("summary"); setAiSummary("");
    const prompt = `Summarize this email in 2-3 bullet points and identify: 1) What action is required (if any), 2) Priority level (HIGH/MEDIUM/LOW), 3) Deadline (if any).

From: ${email.from}
Subject: ${email.subject}
Content: ${email.preview}`;
    try {
      await streamOdysseus(prompt, full => setAiSummary(prev => full));
    } catch { setAiSummary("Could not summarize. Please try again."); }
    setRunning(false); setRunningAction(null);
  }

  async function triageAll() {
    setRunning(true); setRunningAction("triage"); setTriageResults("");
    const emailList = emails.slice(0, 5).map((e, i) => `${i + 1}. From: ${e.from} | Subject: ${e.subject}`).join("\n");
    const prompt = `You are an AI email triage assistant. Analyze these emails and categorize each:

${emailList}

For each email provide:
[NUMBER] CATEGORY: [CRITICAL/ACTION/INFO/LATER/SPAM]
Priority: [HIGH/MEDIUM/LOW]
Action: [What to do with this email]
Note: [One-line summary]

Be decisive and efficient.`;
    try {
      await streamOdysseus(prompt, full => setTriageResults(prev => full));
    } catch { setTriageResults("Triage failed. Please try again."); }
    setRunning(false); setRunningAction(null);
  }

  if (!open) return null;

  const PRIORITY_COLORS = { high: "#e21227", medium: "#f59e0b", low: "#6b7280" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(20px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
        className="relative w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "linear-gradient(145deg, #040407 0%, #030305 60%, #040407 100%)", border: "1px solid rgba(59,130,246,0.15)", boxShadow: "0 0 80px rgba(59,130,246,0.05), inset 0 1px 0 rgba(59,130,246,0.04)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: "rgba(59,130,246,0.1)", background: "rgba(0,0,0,0.4)" }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center relative" style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)" }}>
              <Mail className="w-4 h-4" style={{ color: "#3b82f6" }} />
              {unread > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black" style={{ background: "#e21227", color: "white" }}>{unread}</div>}
            </div>
            <div>
              <div className="text-sm font-black tracking-widest font-mono" style={{ color: "#3b82f6" }}>ODYSSEUS EMAIL AI</div>
              <div className="text-[9px] font-mono" style={{ color: "rgba(59,130,246,0.45)" }}>AI TRIAGE · SMART SUMMARIES · AUTO-REPLY DRAFTS · PRIORITY SORTING</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button onClick={triageAll} disabled={running} whileHover={{ scale: 1.03 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black disabled:opacity-40"
              style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6" }}>
              {runningAction === "triage" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
              AI TRIAGE ALL
            </motion.button>
            <button onClick={() => onOpenChange(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-44 border-r flex flex-col flex-shrink-0" style={{ borderColor: "rgba(59,130,246,0.08)" }}>
            <div className="p-3 space-y-0.5 flex-1">
              {[
                { id: "all", label: "All Mail", icon: Mail, count: emails.length },
                { id: "inbox", label: "Inbox", icon: Inbox, count: emails.filter(e => e.category === "inbox").length },
                { id: "important", label: "Important", icon: Star, count: emails.filter(e => e.category === "important").length },
                { id: "sent", label: "Sent", icon: Send, count: emails.filter(e => e.category === "sent").length },
                { id: "spam", label: "Spam", icon: Trash2, count: emails.filter(e => e.category === "spam").length },
              ].map(f => {
                const Icon = f.icon;
                const isActive = folder === f.id;
                return (
                  <button key={f.id} onClick={() => setFolder(f.id as typeof folder)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all"
                    style={{ background: isActive ? "rgba(59,130,246,0.1)" : "transparent", border: `1px solid ${isActive ? "rgba(59,130,246,0.25)" : "transparent"}` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: isActive ? "#3b82f6" : "rgba(255,255,255,0.3)" }} />
                    <span className="flex-1 text-[10px] font-semibold" style={{ color: isActive ? "#3b82f6" : "rgba(255,255,255,0.35)" }}>{f.label}</span>
                    <span className="text-[8px] font-mono" style={{ color: isActive ? "rgba(59,130,246,0.6)" : "rgba(255,255,255,0.15)" }}>{f.count}</span>
                  </button>
                );
              })}
            </div>
            {/* Triage results */}
            {triageResults && (
              <div className="p-2 border-t" style={{ borderColor: "rgba(59,130,246,0.1)" }}>
                <div className="text-[8px] font-black mb-1" style={{ color: "#3b82f6" }}>AI TRIAGE</div>
                <div className="text-[8px] font-mono leading-relaxed max-h-32 overflow-y-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
                  {triageResults}
                  {runningAction === "triage" && <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ color: "#3b82f6" }}>█</motion.span>}
                </div>
              </div>
            )}
          </div>

          {/* Email list */}
          <div className="w-64 border-r flex flex-col flex-shrink-0 overflow-hidden" style={{ borderColor: "rgba(59,130,246,0.06)" }}>
            <div className="p-2 border-b" style={{ borderColor: "rgba(59,130,246,0.06)" }}>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: "rgba(59,130,246,0.4)" }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full pl-6 pr-3 py-1.5 rounded-lg text-[10px] outline-none font-mono"
                  style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)", color: "#ccc" }} />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "rgba(255,255,255,0.03)" }}>
              {filtered.map(email => (
                <motion.div key={email.id} onClick={() => { setSelected(email); setEmails(prev => prev.map(e => e.id === email.id ? { ...e, read: true } : e)); setAiReply(""); setAiSummary(""); }}
                  whileHover={{ x: 2 }} className="px-3 py-3 cursor-pointer transition-all"
                  style={{ background: selected?.id === email.id ? "rgba(59,130,246,0.08)" : email.read ? "transparent" : "rgba(59,130,246,0.03)" }}>
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="text-[9.5px] font-bold truncate" style={{ color: email.read ? "rgba(255,255,255,0.45)" : "#ddd" }}>{email.from.split("@")[0]}</span>
                    <span className="text-[7.5px] font-mono flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }}>{email.time}</span>
                  </div>
                  <div className="text-[9px] font-semibold truncate mb-0.5" style={{ color: email.read ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.7)" }}>{email.subject}</div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: PRIORITY_COLORS[email.priority] }} />
                    <div className="text-[8px] font-mono truncate" style={{ color: "rgba(255,255,255,0.2)" }}>{email.preview.slice(0, 35)}...</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Email detail */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selected ? (
              <>
                <div className="px-5 py-4 border-b" style={{ borderColor: "rgba(59,130,246,0.08)" }}>
                  <div className="text-sm font-black mb-1" style={{ color: "#ddd" }}>{selected.subject}</div>
                  <div className="flex items-center gap-3 text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>
                    <span>From: {selected.from}</span><span>·</span><span>{selected.time}</span>
                    <div className="ml-auto flex items-center gap-1.5">
                      <motion.button onClick={() => generateReply(selected)} disabled={running} whileHover={{ scale: 1.04 }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black disabled:opacity-40"
                        style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)", color: "#3b82f6" }}>
                        {runningAction === "reply" ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Reply className="w-2.5 h-2.5" />}
                        AI REPLY
                      </motion.button>
                      <motion.button onClick={() => summarizeEmail(selected)} disabled={running} whileHover={{ scale: 1.04 }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[8px] font-black disabled:opacity-40"
                        style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)", color: "#f59e0b" }}>
                        {runningAction === "summary" ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Zap className="w-2.5 h-2.5" />}
                        SUMMARIZE
                      </motion.button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <div className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{selected.preview}</div>
                  <div className="text-[10px] leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
                    [Full email content would load here from IMAP connection. This demonstrates the AI-powered email triage and response capabilities of the Odysseus workspace.]
                  </div>

                  {(aiSummary || (running && runningAction === "summary")) && (
                    <div className="rounded-2xl p-4" style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
                      <div className="text-[9px] font-black mb-2" style={{ color: "#f59e0b" }}>⚡ AI SUMMARY</div>
                      <div className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {aiSummary}
                        {runningAction === "summary" && <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ color: "#f59e0b" }}>█</motion.span>}
                      </div>
                    </div>
                  )}

                  {(aiReply || (running && runningAction === "reply")) && (
                    <div className="rounded-2xl p-4" style={{ background: "rgba(59,130,246,0.05)", border: "1px solid rgba(59,130,246,0.15)" }}>
                      <div className="text-[9px] font-black mb-2 flex items-center justify-between" style={{ color: "#3b82f6" }}>
                        <span>✉️ AI DRAFT REPLY</span>
                        {aiReply && <button onClick={() => navigator.clipboard.writeText(aiReply)} className="text-[8px] px-2 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color: "#3b82f6" }}>COPY</button>}
                      </div>
                      <div className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {aiReply}
                        {runningAction === "reply" && <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ color: "#3b82f6" }}>█</motion.span>}
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 gap-4" style={{ color: "rgba(59,130,246,0.2)" }}>
                <Mail className="w-16 h-16" />
                <div className="text-[11px] font-mono tracking-widest">SELECT AN EMAIL TO VIEW</div>
                <div className="text-[9px] font-mono text-center" style={{ color: "rgba(255,255,255,0.15)", maxWidth: 240 }}>
                  AI will summarize, triage, and draft replies automatically
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
