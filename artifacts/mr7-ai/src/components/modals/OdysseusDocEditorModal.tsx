import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Zap, Sparkles, Copy, CheckCheck, Download, Loader2, Bold, Italic, AlignLeft, List, Hash, MessageSquare, RefreshCw, Wand2 } from "lucide-react";
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


interface OdysseusDocEditorModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const AI_ACTIONS = [
  { id: "improve", label: "Improve Writing", icon: "✨", prompt: "Improve the writing quality, clarity, and flow of this text while preserving the author's voice and intent:" },
  { id: "expand", label: "Expand", icon: "📝", prompt: "Expand this text with more detail, examples, and context:" },
  { id: "summarize", label: "Summarize", icon: "📋", prompt: "Create a clear, concise summary of this text:" },
  { id: "formal", label: "Make Formal", icon: "👔", prompt: "Rewrite this text in a formal, professional tone:" },
  { id: "casual", label: "Make Casual", icon: "💬", prompt: "Rewrite this text in a friendly, casual tone:" },
  { id: "fix", label: "Fix Grammar", icon: "🔧", prompt: "Fix all grammar, spelling, and punctuation errors in this text:" },
  { id: "bullets", label: "To Bullet Points", icon: "•", prompt: "Convert this text into a clear, well-organized bullet point list:" },
  { id: "continue", label: "Continue Writing", icon: "➡️", prompt: "Continue writing from where this text left off, matching the style and tone:" },
];

const TEMPLATES = [
  { label: "Blog Post", icon: "📰", content: "# [Title]\n\n## Introduction\n[Hook your reader with a compelling opening...]\n\n## Main Point 1\n[Your first key argument or idea...]\n\n## Main Point 2\n[Your second key argument...]\n\n## Conclusion\n[Summarize and call to action...]" },
  { label: "Technical Doc", icon: "📚", content: "# Component Name\n\n## Overview\n[Brief description of what this does]\n\n## Installation\n```\nnpm install package-name\n```\n\n## Usage\n[Code examples and explanation]\n\n## API Reference\n[Parameters and methods]\n\n## Examples\n[Real-world usage examples]" },
  { label: "Email", icon: "✉️", content: "Subject: [Subject Line]\n\nDear [Name],\n\nI hope this message finds you well.\n\n[Main content of your email...]\n\nPlease let me know if you have any questions or need further clarification.\n\nBest regards,\n[Your Name]" },
  { label: "Report", icon: "📊", content: "# Executive Report\n\n**Date:** [Date]\n**Author:** [Author]\n\n## Executive Summary\n[Key findings and recommendations in 2-3 sentences]\n\n## Background\n[Context and why this matters]\n\n## Findings\n[Main discoveries]\n\n## Recommendations\n1. [Action item 1]\n2. [Action item 2]\n\n## Next Steps\n[Implementation timeline]" },
];

export function OdysseusDocEditorModal({ open, onOpenChange }: OdysseusDocEditorModalProps) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("Untitled Document");
  const [aiPanel, setAiPanel] = useState(false);
  const [aiAction, setAiAction] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [running, setRunning] = useState(false);
  const [aiOutput, setAiOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const updateContent = (v: string) => { setContent(v); setWordCount(v.trim() ? v.trim().split(/\s+/).length : 0); };

  async function runAI(actionId: string, customInstruction?: string) {
    const action = AI_ACTIONS.find(a => a.id === actionId);
    if (!action && !customInstruction) return;
    const targetText = content || "Write a creative piece about technology and humanity.";
    setRunning(true); setAiOutput("");
    pipeline.push({ source: "Odysseus Doc Editor", label: `AI: ${action?.label ?? "Custom"}`, content: "", sourceColor: "#6366f1" });
    const prompt = customInstruction ? `${customInstruction}\n\n---\n\n${targetText}` : `${action!.prompt}\n\n---\n\n${targetText}`;
    try {
      await streamOdysseus(prompt, full => setAiOutput(prev => full));
    } catch { setAiOutput("AI assistance unavailable. Please try again."); }
    setRunning(false);
  }

  function applyAI() { if (aiOutput) { updateContent(aiOutput); setAiOutput(""); setAiPanel(false); } }
  function insertTemplate(t: typeof TEMPLATES[0]) { updateContent(t.content); }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3" style={{ background: "rgba(0,0,0,0.93)", backdropFilter: "blur(20px)" }}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}
        className="relative w-full max-w-6xl h-[90vh] rounded-3xl overflow-hidden flex flex-col"
        style={{ background: "linear-gradient(145deg, #040407 0%, #030305 60%, #050408 100%)", border: "1px solid rgba(99,102,241,0.15)", boxShadow: "0 0 80px rgba(99,102,241,0.06), inset 0 1px 0 rgba(99,102,241,0.04)" }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "rgba(99,102,241,0.1)", background: "rgba(0,0,0,0.4)" }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <FileText className="w-3.5 h-3.5" style={{ color: "#6366f1" }} />
          </div>
          <input value={title} onChange={e => setTitle(e.target.value)} className="flex-1 bg-transparent outline-none text-sm font-bold" style={{ color: "#ddd" }} />
          <div className="flex items-center gap-2 text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
            <span>{wordCount} words</span>
            <span>·</span>
            <span>{content.length} chars</span>
          </div>
          <motion.button onClick={() => setAiPanel(!aiPanel)} whileHover={{ scale: 1.05 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black tracking-widest"
            style={{ background: aiPanel ? "rgba(99,102,241,0.2)" : "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.3)", color: "#6366f1" }}>
            <Wand2 className="w-3 h-3" /> AI ASSIST
          </motion.button>
          <button onClick={() => { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
            {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => onOpenChange(false)} className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <X className="w-3.5 h-3.5" style={{ color: "rgba(255,255,255,0.5)" }} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-5 py-2 border-b" style={{ borderColor: "rgba(99,102,241,0.06)", background: "rgba(0,0,0,0.2)" }}>
          {TEMPLATES.map(t => (
            <motion.button key={t.label} onClick={() => insertTemplate(t)} whileHover={{ scale: 1.05 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[9px] font-bold"
              style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)", color: "rgba(255,255,255,0.45)" }}>
              <span>{t.icon}</span>{t.label}
            </motion.button>
          ))}
          <div className="flex-1" />
          <div className="flex items-center gap-1">
            {[{ icon: <Bold className="w-3 h-3" />, label: "Bold", insert: "**text**" },
              { icon: <Italic className="w-3 h-3" />, label: "Italic", insert: "*text*" },
              { icon: <Hash className="w-3 h-3" />, label: "Heading", insert: "## " },
              { icon: <List className="w-3 h-3" />, label: "List", insert: "- " },
            ].map(b => (
              <button key={b.label} onClick={() => { const ta = textareaRef.current; if (!ta) return; const start = ta.selectionStart; updateContent(content.slice(0, start) + b.insert + content.slice(start)); }}
                className="w-7 h-7 rounded-lg flex items-center justify-center" title={b.label}
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
                {b.icon}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <textarea ref={textareaRef} value={content} onChange={e => updateContent(e.target.value)}
              placeholder="Start writing... or choose a template above. Use the AI Assist panel to enhance your document."
              className="flex-1 resize-none outline-none p-6 font-mono text-sm leading-relaxed"
              style={{ background: "transparent", color: "rgba(255,255,255,0.75)", borderRight: aiPanel ? "1px solid rgba(99,102,241,0.1)" : "none" }} />
          </div>

          {/* AI Panel */}
          <AnimatePresence>
            {aiPanel && (
              <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 320, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                className="border-l flex flex-col overflow-hidden flex-shrink-0" style={{ borderColor: "rgba(99,102,241,0.12)", background: "rgba(0,0,0,0.3)" }}>
                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                  <div className="text-[9px] font-black tracking-widest" style={{ color: "rgba(99,102,241,0.7)" }}>AI ACTIONS</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {AI_ACTIONS.map(a => (
                      <motion.button key={a.id} onClick={() => { setAiAction(a.id); runAI(a.id); }} whileHover={{ scale: 1.03 }}
                        disabled={running}
                        className="flex items-center gap-1.5 px-2 py-2 rounded-xl text-[9px] font-bold text-left disabled:opacity-40"
                        style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.15)", color: "rgba(255,255,255,0.55)" }}>
                        <span>{a.icon}</span><span className="truncate">{a.label}</span>
                      </motion.button>
                    ))}
                  </div>

                  <div className="text-[9px] font-black tracking-widest mt-4" style={{ color: "rgba(99,102,241,0.7)" }}>CUSTOM INSTRUCTION</div>
                  <textarea value={aiInstruction} onChange={e => setAiInstruction(e.target.value)} placeholder="Tell the AI what to do with your text..."
                    rows={3} className="w-full resize-none outline-none text-[10px] font-mono p-2.5 rounded-xl"
                    style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", color: "#ccc" }} />
                  <motion.button onClick={() => runAI("", aiInstruction)} disabled={!aiInstruction.trim() || running} whileHover={{ scale: 1.02 }}
                    className="w-full py-2 rounded-xl text-[9px] font-black tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
                    style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", color: "#6366f1" }}>
                    {running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {running ? "PROCESSING..." : "RUN CUSTOM AI"}
                  </motion.button>

                  {(aiOutput || running) && (
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(99,102,241,0.2)" }}>
                      <div className="px-3 py-2 flex items-center justify-between" style={{ background: "rgba(99,102,241,0.1)" }}>
                        <span className="text-[8px] font-black" style={{ color: "#6366f1" }}>AI OUTPUT</span>
                        {aiOutput && !running && (
                          <button onClick={applyAI} className="text-[8px] font-black px-2 py-0.5 rounded-lg" style={{ background: "rgba(99,102,241,0.2)", color: "#6366f1" }}>
                            APPLY TO DOC
                          </button>
                        )}
                      </div>
                      <div className="p-3 max-h-48 overflow-y-auto">
                        <div className="text-[10px] font-mono leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,255,255,0.6)" }}>
                          {aiOutput}
                          {running && <motion.span animate={{ opacity: [0, 1] }} transition={{ duration: 0.5, repeat: Infinity }} style={{ color: "#6366f1" }}>█</motion.span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
