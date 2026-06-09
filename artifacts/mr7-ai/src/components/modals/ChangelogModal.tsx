import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Brain, Shield, Globe, Bot, Layers, Sparkles, Code2, Network, Terminal, Star, Rocket, Target, Cpu, Search, Lock, Flame, CheckCircle2, Radar, GitBranch, Database } from "lucide-react";
import { Dialog, DialogContentTop, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface VersionEntry {
  version: string;
  date: string;
  tag: "major" | "minor" | "patch" | "security";
  changes: {
    icon: React.ElementType;
    color: string;
    title: string;
    desc: string;
    type: "new" | "improved" | "fix" | "security";
  }[];
}

const TAG_META = {
  major:    { label: "MAJOR",    bg: "bg-primary/15 border-primary/40",        text: "text-primary" },
  minor:    { label: "FEATURE",  bg: "bg-sky-500/15 border-sky-500/40",         text: "text-sky-400" },
  patch:    { label: "PATCH",    bg: "bg-green-500/15 border-green-500/40",     text: "text-green-400" },
  security: { label: "SECURITY", bg: "bg-amber-500/15 border-amber-500/40",    text: "text-amber-400" },
};

const TYPE_LABELS = {
  new:      { label: "NEW",      color: "text-primary",    bg: "bg-primary/10 border-primary/30" },
  improved: { label: "IMPROVED", color: "text-sky-400",    bg: "bg-sky-500/10 border-sky-500/30" },
  fix:      { label: "FIX",      color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30" },
  security: { label: "SECURITY", color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/30" },
};

const VERSIONS: VersionEntry[] = [
  {
    version: "3.1.0",
    date: "June 2026",
    tag: "major",
    changes: [
      { icon: Radar,  color: "#e21227", title: "3D OSINT Dashboard",  desc: "Full redesign with animated radar sweep, live threat ticker, and 3D honeycomb vulnerability map. Three tabs: Radar, Vuln Map, Table.", type: "new" },
      { icon: Target, color: "#f87171", title: "Live Threat Feed Ticker", desc: "Real-time threat intelligence feed inside OSINT dashboard, auto-rotates between IOC alerts and static threat intel.", type: "new" },
      { icon: Shield, color: "#fbbf24", title: "Enhanced Keyboard Shortcuts", desc: "Complete shortcut reference redesigned with grouped categories, color-coded sections, and bilingual labels.", type: "improved" },
      { icon: Zap,    color: "#38bdf8", title: "JSON Export for OSINT", desc: "Export all IOCs as structured JSON in addition to existing CSV export.", type: "new" },
      { icon: Brain,  color: "#a78bfa", title: "Hallucination Warnings", desc: "AI responses now show a disclaimer when confidence may be low — especially for exploits, CVEs, and technical claims.", type: "new" },
      { icon: Globe,  color: "#4ade80", title: "Community Links", desc: "Telegram and Discord community links accessible from the sidebar footer.", type: "new" },
    ],
  },
  {
    version: "3.0.0",
    date: "May 2026",
    tag: "major",
    changes: [
      { icon: Rocket,  color: "#a78bfa", title: "Arsenal Hub — 70+ Modules", desc: "Unified launcher for 70+ AI security tools with Chain Builder for automation pipelines.", type: "new" },
      { icon: Globe,   color: "#3b82f6", title: "50+ AI Provider Catalog",    desc: "Multi-provider catalog: OpenAI, Anthropic, Groq, Gemini, xAI, Mistral, DeepSeek, Together, Fireworks, Azure, Ollama and 40+ more.", type: "new" },
      { icon: Layers,  color: "#10b981", title: "Scrollable TopBar",          desc: "TopBar buttons scroll horizontally with animated arrows on overflow — no more hidden tools.", type: "improved" },
      { icon: Database,color: "#60a5fa", title: "Cloud Chat Sync",            desc: "Chats automatically sync to PostgreSQL via device ID. QR scan import for cross-device sync.", type: "new" },
      { icon: Brain,   color: "#e21227", title: "Neural Thinking Indicator",  desc: "Animated brain ring with real-time phase tracking and elapsed timer while AI processes.", type: "new" },
    ],
  },
  {
    version: "2.5.0",
    date: "April 2026",
    tag: "minor",
    changes: [
      { icon: Bot,     color: "#fbbf24", title: "CHAT-GPT Branding",          desc: "All model names unified under CHAT-GPT branding throughout frontend and backend.", type: "improved" },
      { icon: Sparkles,color: "#f472b6", title: "AI Image Generator",         desc: "POST /api/image calls OpenAI DALL·E to generate images from text prompts.", type: "new" },
      { icon: Cpu,     color: "#00e5ff", title: "Voice Chat",                 desc: "Full-duplex voice conversation using Web Speech API — speak and listen to the AI.", type: "new" },
      { icon: Code2,   color: "#10b981", title: "Vision Capture",             desc: "Screen-share or webcam capture with AI vision analysis via POST /api/vision.", type: "new" },
      { icon: Globe,   color: "#38bdf8", title: "Full i18n (AR/EN)",          desc: "Complete Arabic/English dictionary with ~210 keys. RTL support throughout.", type: "new" },
      { icon: Network, color: "#8b5cf6", title: "FUSION Mode",                desc: "Runs full 105-brain council in parallel with AI synthesis of all results.", type: "new" },
    ],
  },
  {
    version: "2.0.0",
    date: "March 2026",
    tag: "major",
    changes: [
      { icon: Shield,  color: "#e21227", title: "Subscription System",        desc: "Full SaaS: Free/Starter/Professional/Elite tiers. Client-side activation codes. Admin panel.", type: "new" },
      { icon: Flame,   color: "#fb923c", title: "Pricing Page",               desc: "Flash sale countdown, monthly/yearly toggle (20% off), plan cards, coupon entry.", type: "new" },
      { icon: Lock,    color: "#fbbf24", title: "Feature Gating",             desc: "Models, modes, and tools gated by subscription tier with lock badges and upgrade prompts.", type: "new" },
      { icon: Terminal,color: "#4ade80", title: "Council Mode — 105 Brains",  desc: "Parallel multi-agent council with concurrency-limited execution, smart router, fusion synthesis.", type: "new" },
    ],
  },
  {
    version: "1.0.0",
    date: "January 2026",
    tag: "major",
    changes: [
      { icon: Star,    color: "#e21227", title: "KaliGPT Launch",             desc: "Initial release — dark cybersecurity AI chat with OpenAI streaming, OSINT tools, and custom personas.", type: "new" },
      { icon: Search,  color: "#38bdf8", title: "OSINT IOC Extractor",        desc: "Regex-based extraction of IPs, domains, URLs, emails, hashes, and CVEs from chat history.", type: "new" },
      { icon: Bot,     color: "#a78bfa", title: "15 AI Models + 16 Personas", desc: "Multi-model support with specialized cybersecurity personas: Kali, RED-X, GHOST, NEXUS, and more.", type: "new" },
      { icon: GitBranch, color: "#10b981", title: "Chat Branching",           desc: "Branch any conversation at any message — explore alternate paths without losing history.", type: "new" },
      { icon: CheckCircle2, color: "#4ade80", title: "Bookmarks & Memory",   desc: "Bookmark individual messages, save AI memory notes, and inject them into future conversations.", type: "new" },
    ],
  },
];

export function ChangelogModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [expanded, setExpanded] = useState<string>(VERSIONS[0].version);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentTop
        className="bg-card border-border w-[96vw] max-w-2xl max-h-[82vh] flex flex-col p-0 gap-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2 text-[13px] font-black font-mono uppercase tracking-wider">
            <Zap className="w-4 h-4 text-primary" />
            Changelog
            <span className="ml-auto text-[10px] font-mono text-muted-foreground font-normal">KaliGPT / mr7.ai</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {VERSIONS.map((v) => {
            const tag = TAG_META[v.tag];
            const isOpen = expanded === v.version;
            return (
              <div key={v.version} className="border border-border/50 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
                  onClick={() => setExpanded(isOpen ? "" : v.version)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md border ${tag.bg} ${tag.text}`}>{tag.label}</span>
                    <span className="text-[13px] font-bold font-mono text-foreground">v{v.version}</span>
                    <span className="text-[11px] text-muted-foreground font-mono">{v.date}</span>
                    <span className="text-[10px] text-muted-foreground/60 font-mono ml-1">{v.changes.length} changes</span>
                  </div>
                  <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <X className="w-3.5 h-3.5 text-muted-foreground rotate-45" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-2 border-t border-border/50 pt-3">
                        {v.changes.map((c, i) => {
                          const Icon = c.icon;
                          const typeMeta = TYPE_LABELS[c.type];
                          return (
                            <div key={i} className="flex items-start gap-3">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${c.color}18`, border: `1px solid ${c.color}30` }}>
                                <Icon className="w-3.5 h-3.5" style={{ color: c.color }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-[12px] font-semibold text-foreground/90">{c.title}</span>
                                  <span className={`text-[8px] font-black font-mono px-1.5 py-0.5 rounded border ${typeMeta.bg} ${typeMeta.color}`}>{typeMeta.label}</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">{c.desc}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-border shrink-0 text-[9px] font-mono text-muted-foreground/50 flex items-center justify-between">
          <span>All versions · KaliGPT / mr7.ai platform</span>
          <span className="text-primary/70">v3.1.0 current</span>
        </div>
      </DialogContentTop>
    </Dialog>
  );
}
