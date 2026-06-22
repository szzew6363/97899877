import { useState, useRef, useEffect } from "react";
import { Plus, Search, TerminalSquare, Code, Globe, KeyRound, Network, FileCode, Bug, Gift, Clock, Coins, Pin, Pencil, Trash2, MessageSquare, Filter, Check, LayoutGrid, Hash, Binary, QrCode, Calculator, Regex, FileJson, Fingerprint, Terminal, ShieldAlert, Sparkles, Cookie, Lock as LockIcon, ScanLine, Server, Link as LinkIcon, Wand2, Image as ImageIcon, FileText, Languages, ShieldAlert as PhishIcon, BookOpenCheck, Activity, UserCog, TrendingUp, Mail, Brain, Bookmark, ArrowLeftRight, AtSign, Wallet, Eye, Send, Database as DbIcon, Container as ContainerIcon, FileSearch, Radar, Crosshair, ScrollText, FileCheck2, GitCommit, Music, Palette, ShieldCheck, FlaskConical, ChevronDown, Zap, Users, Layers, Bell, CreditCard, Shield } from "lucide-react";
import { AI_MODELS } from "@/lib/ai-config";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { UserMenu } from "./UserMenu";
import { TIER_TOKENS, TIER_LABELS } from "@/lib/subscription";
import { DarkWebMonitor } from "./DarkWebMonitor";
import { SidebarTelemetryHUD } from "./SidebarTelemetryHUD";

import type { UtilityTool } from "./modals/UtilityToolModal";

// ── 3D Neural Network Canvas Background ──────────────────────────────────────
function NeuralCanvasBG() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);

  useEffect(() => {
    const cvEl = cvRef.current;
    if (!cvEl) return;
    const cv: HTMLCanvasElement = cvEl;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const W = cv.parentElement?.offsetWidth ?? 280;
      const H = cv.parentElement?.offsetHeight ?? 500;
      cv.width = W * DPR; cv.height = H * DPR;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(1,0,0,1,0,0);
      ctx.scale(DPR, DPR);
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (cv.parentElement) ro.observe(cv.parentElement);

    function getWH() {
      return { W: cv.parentElement?.offsetWidth ?? 280, H: cv.parentElement?.offsetHeight ?? 500 };
    }
    const { W, H } = getWH();

    const N = 22;
    type Node = { x: number; y: number; vx: number; vy: number; r: number };
    const nodes: Node[] = Array.from({ length: N }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.18,
      r: 1.2 + Math.random() * 1.8,
    }));
    const edges: [number, number][] = [];
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < 95) edges.push([i, j]);
      }
    }

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.008;
      const t = tRef.current;
      const { W: cW, H: cH } = getWH();
      ctx.clearRect(0, 0, cW, cH);

      // Move nodes
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > cW) n.vx *= -1;
        if (n.y < 0 || n.y > cH) n.vy *= -1;
      });

      // Draw edges
      edges.forEach(([a, b]) => {
        const na = nodes[a], nb = nodes[b];
        const dx = na.x - nb.x, dy = na.y - nb.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const alpha = Math.max(0, 1 - dist / 95) * 0.08;
        ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = `rgba(226,18,39,${alpha})`;
        ctx.lineWidth = 0.6; ctx.stroke();

        // Data flow particle
        const phase = (t * 0.5 + a * 0.3) % 1;
        const px = na.x + (nb.x - na.x) * phase;
        const py = na.y + (nb.y - na.y) * phase;
        ctx.beginPath(); ctx.arc(px, py, 0.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${alpha * 2.5})`; ctx.fill();
      });

      // Draw nodes
      nodes.forEach((n, i) => {
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.5 + i * 0.7));
        const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3);
        rg.addColorStop(0, `rgba(226,18,39,${0.32 * pulse})`);
        rg.addColorStop(1, "rgba(226,18,39,0)");
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2);
        ctx.fillStyle = rg; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${0.22 * pulse})`; ctx.fill();
      });
    }
    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);

  return (
    <canvas ref={cvRef}
      className="pointer-events-none select-none"
      style={{
        position: "absolute", left: 0, top: 0, width: "100%", height: "100%",
        opacity: 0.28, zIndex: 0, display: "block",
      }} />
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  onOpenPricing: () => void;
  onOpenApi: () => void;
  onOpenTool: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenLogin?: () => void;
  onOpenUtility: (name: UtilityTool) => void;
  onOpenToolsHub: () => void;
  onOpenMemory: () => void;
  onOpenBookmarks: () => void;
  onOpenSearch: () => void;
  onOpenCompare: () => void;
  onOpenQRSync?: () => void;
  onOpenChangelog?: () => void;
  onOpenOsint?: () => void;
  onOpenUseCaseLib?: () => void;
  onOpenOmegaAgent?: () => void;
  onOpenLocalEngineHub?: () => void;
  onOpenMultiModelRace?: () => void;
  onOpenLocalBenchmark?: () => void;
  // ── KaliGPT Systems #2-#20 ──────────────────────────────────────────────────
  onOpenKgAdmin?: () => void;
  onOpenKgPayment?: () => void;
  onOpenKgRAG?: () => void;
  onOpenKgMemory?: () => void;
  onOpenKgNotifications?: () => void;
  onOpenKgMultiAgent?: () => void;
  onOpenKgOrganizations?: () => void;
  onOpenKgMarketplace?: () => void;
  onOpenKgAnalytics?: () => void;
  onOpenKgFinetune?: () => void;
  onOpenKgAPIKeys?: () => void;
  onOpenKgMonitoring?: () => void;
  onOpenKgSemanticSearch?: () => void;
  onOpenKgCollaboration?: () => void;
  onOpenKgContext?: () => void;
  onOpenKgPentestLab?: () => void;
  onOpenKgSecurity?: () => void;
}

const ADDITIONAL_TOOLS: { icon: React.ElementType; label: UtilityTool; color?: string }[] = [
  { icon: KeyRound, label: "Password Generator", color: "text-emerald-400" },
  { icon: Search, label: "Email Lookup", color: "text-blue-400" },
  { icon: Server, label: "WHOIS Lookup", color: "text-blue-400" },
  { icon: Network, label: "DNS Lookup", color: "text-blue-400" },
  { icon: ScanLine, label: "Subdomain Finder", color: "text-blue-400" },
  { icon: Network, label: "IP/Domain Scanner", color: "text-amber-400" },
  { icon: LockIcon, label: "SSL Checker", color: "text-emerald-400" },
  { icon: Cookie, label: "HTTP Headers", color: "text-amber-400" },
  { icon: FileCode, label: "Hash Cracker", color: "text-purple-400" },
  { icon: Bug, label: "Vulnerability Scanner", color: "text-primary" },
  { icon: Terminal, label: "Reverse Shell Builder", color: "text-primary" },
  { icon: ShieldAlert, label: "Payload Library", color: "text-primary" },
  { icon: Hash, label: "Hash Generator", color: "text-emerald-400" },
  { icon: Binary, label: "Base64 Tool", color: "text-emerald-400" },
  { icon: LinkIcon, label: "URL Encoder", color: "text-emerald-400" },
  { icon: Fingerprint, label: "JWT Decoder", color: "text-emerald-400" },
  { icon: KeyRound, label: "Cipher Tools", color: "text-emerald-400" },
  { icon: Sparkles, label: "UUID Generator", color: "text-emerald-400" },
  { icon: KeyRound, label: "SSH Key Generator", color: "text-emerald-400" },
  { icon: Globe, label: "User Agent Generator", color: "text-emerald-400" },
  { icon: QrCode, label: "QR Code Generator", color: "text-emerald-400" },
  { icon: Calculator, label: "CIDR Calculator", color: "text-blue-400" },
  { icon: Regex, label: "Regex Tester", color: "text-blue-400" },
  { icon: FileJson, label: "JSON Formatter", color: "text-blue-400" },
  { icon: Wand2, label: "AI Prompt Enhancer", color: "text-fuchsia-400" },
  { icon: ImageIcon, label: "AI Image Prompt", color: "text-fuchsia-400" },
  { icon: FileText, label: "AI Code Explainer", color: "text-fuchsia-400" },
  { icon: BookOpenCheck, label: "AI Summarizer", color: "text-fuchsia-400" },
  { icon: Languages, label: "AI Translator", color: "text-fuchsia-400" },
  { icon: PhishIcon, label: "AI Phishing Detector", color: "text-fuchsia-400" },
  { icon: ShieldAlert, label: "AI CVE Explainer", color: "text-fuchsia-400" },
  { icon: Activity, label: "AI Log Analyzer", color: "text-fuchsia-400" },
  { icon: UserCog, label: "AI Persona Generator", color: "text-fuchsia-400" },
  { icon: TrendingUp, label: "AI SEO Writer", color: "text-fuchsia-400" },
  { icon: Mail, label: "AI Email Composer", color: "text-fuchsia-400" },
  { icon: AtSign, label: "OSINT Username Search", color: "text-blue-400" },
  { icon: DbIcon, label: "GraphQL Introspection", color: "text-blue-400" },
  { icon: FileSearch, label: "AI YARA Rule Builder", color: "text-primary" },
  { icon: Radar, label: "AI Sigma Rule Builder", color: "text-primary" },
  { icon: FileCheck2, label: "AI Smart Contract Auditor", color: "text-primary" },
  { icon: ShieldCheck, label: "AI Password Auditor", color: "text-primary" },
  { icon: ImageIcon, label: "AI Image Generator", color: "text-pink-400" },
  { icon: Wallet, label: "Wallet Validator", color: "text-emerald-400" },
  { icon: Eye, label: "Steganography", color: "text-emerald-400" },
  { icon: ContainerIcon, label: "Dockerfile Generator", color: "text-emerald-400" },
  { icon: Palette, label: "Color Palette Generator", color: "text-emerald-400" },
  { icon: Send, label: "HTTP Request Builder", color: "text-blue-400" },
  { icon: Crosshair, label: "AI MITRE ATT&CK Mapper", color: "text-fuchsia-400" },
  { icon: ScrollText, label: "AI Bug Bounty Report", color: "text-fuchsia-400" },
  { icon: GitCommit, label: "AI Git Commit Generator", color: "text-fuchsia-400" },
  { icon: Brain, label: "AI Threat Modeler", color: "text-fuchsia-400" },
  { icon: Music, label: "AI Lyrics Composer", color: "text-fuchsia-400" },
  { icon: Sparkles, label: "Parseltongue", color: "text-emerald-400" },
  { icon: Globe, label: "Dark Web Search", color: "text-purple-400" },
  { icon: Code, label: "Agent IDE", color: "text-blue-400" },
  // ── 48 AI add-on tools ──
  { icon: ScrollText, label: "AI Resume Builder", color: "text-fuchsia-400" },
  { icon: Mail, label: "AI Cover Letter", color: "text-fuchsia-400" },
  { icon: BookOpenCheck, label: "AI Interview Prep", color: "text-fuchsia-400" },
  { icon: Sparkles, label: "AI Slogan Generator", color: "text-fuchsia-400" },
  { icon: Send, label: "AI Tweet Composer", color: "text-fuchsia-400" },
  { icon: FileText, label: "AI Reddit Reply", color: "text-fuchsia-400" },
  { icon: Mail, label: "AI Email Replier", color: "text-fuchsia-400" },
  { icon: BookOpenCheck, label: "AI Meeting Summarizer", color: "text-fuchsia-400" },
  { icon: ScrollText, label: "AI Standup Note", color: "text-fuchsia-400" },
  { icon: GitCommit, label: "AI PR Description", color: "text-fuchsia-400" },
  { icon: Bug, label: "AI Bug Triage", color: "text-fuchsia-400" },
  { icon: FileCheck2, label: "AI Test Case Writer", color: "text-fuchsia-400" },
  { icon: FileCode, label: "AI Unit Test Generator", color: "text-fuchsia-400" },
  { icon: Code, label: "AI Code Refactor", color: "text-fuchsia-400" },
  { icon: FileCheck2, label: "AI Code Review", color: "text-fuchsia-400" },
  { icon: DbIcon, label: "AI SQL Generator", color: "text-fuchsia-400" },
  { icon: DbIcon, label: "AI SQL Optimizer", color: "text-fuchsia-400" },
  { icon: DbIcon, label: "AI Schema Designer", color: "text-fuchsia-400" },
  { icon: Clock, label: "AI Cron Builder", color: "text-fuchsia-400" },
  { icon: FileText, label: "AI Markdown Cheatsheet", color: "text-fuchsia-400" },
  { icon: Sparkles, label: "AI ASCII Art", color: "text-fuchsia-400" },
  { icon: Globe, label: "AI Domain Name Ideas", color: "text-fuchsia-400" },
  { icon: TrendingUp, label: "AI Startup Pitch", color: "text-fuchsia-400" },
  { icon: ScrollText, label: "AI Pitch Deck Outline", color: "text-fuchsia-400" },
  { icon: UserCog, label: "AI User Persona", color: "text-fuchsia-400" },
  { icon: Activity, label: "AI A/B Test Idea", color: "text-fuchsia-400" },
  { icon: BookOpenCheck, label: "AI Lecture Notes", color: "text-fuchsia-400" },
  { icon: ScrollText, label: "AI Flashcard Generator", color: "text-fuchsia-400" },
  { icon: Calculator, label: "AI Math Tutor", color: "text-fuchsia-400" },
  { icon: Brain, label: "AI Recipe Generator", color: "text-fuchsia-400" },
  { icon: Activity, label: "AI Workout Plan", color: "text-fuchsia-400" },
  { icon: Globe, label: "AI Trip Itinerary", color: "text-fuchsia-400" },
  { icon: FileText, label: "AI Story Plot", color: "text-fuchsia-400" },
  { icon: Sparkles, label: "AI Joke Generator", color: "text-fuchsia-400" },
  { icon: TrendingUp, label: "AI Movie Recommender", color: "text-fuchsia-400" },
  { icon: BookOpenCheck, label: "AI Book Recommender", color: "text-fuchsia-400" },
  { icon: TrendingUp, label: "AI Investment Thesis", color: "text-fuchsia-400" },
  { icon: TrendingUp, label: "AI Stock Snapshot", color: "text-fuchsia-400" },
  { icon: ShieldAlert, label: "AI Crypto Project Audit", color: "text-fuchsia-400" },
  { icon: Calculator, label: "AI Real Estate Analyzer", color: "text-fuchsia-400" },
  { icon: Brain, label: "AI Negotiation Coach", color: "text-fuchsia-400" },
  { icon: Brain, label: "AI Mediator", color: "text-fuchsia-400" },
  { icon: Brain, label: "AI Therapy Companion", color: "text-fuchsia-400" },
  { icon: ScrollText, label: "AI Lawyer (Educational)", color: "text-fuchsia-400" },
  { icon: Calculator, label: "AI Tax Reviewer", color: "text-fuchsia-400" },
  { icon: ShieldCheck, label: "AI Insurance Optimizer", color: "text-fuchsia-400" },
  { icon: Globe, label: "AI Travel Visa Help", color: "text-fuchsia-400" },
  { icon: Brain, label: "AI Chess Coach", color: "text-fuchsia-400" },
  // ── Cybersecurity Educational Tools ──
  { icon: ShieldAlert, label: "Zero-Day Exploits", color: "text-red-400" },
  { icon: Brain, label: "RaaS Architecture", color: "text-red-400" },
  { icon: ShieldAlert, label: "Supply Chain Attacks", color: "text-orange-400" },
  { icon: FileSearch, label: "Fileless Malware", color: "text-orange-400" },
  { icon: Brain, label: "Autonomous Offensive AI", color: "text-red-500" },
  { icon: Sparkles, label: "Quantum Attacks", color: "text-violet-400" },
  { icon: FlaskConical, label: "Bio-Digital Threats", color: "text-emerald-400" },
  { icon: Brain, label: "AI Model Poisoning", color: "text-pink-400" },
  { icon: Radar, label: "Kali WiFi Hacking", color: "text-cyan-400" },
  { icon: ArrowLeftRight, label: "Kali MITM Attack", color: "text-amber-400" },
  { icon: Terminal, label: "Kali Metasploit", color: "text-red-400" },
  { icon: DbIcon, label: "Kali SQLi Guide", color: "text-blue-400" },
];

export function Sidebar({ isOpen, onClose, collapsed, onToggleCollapsed, onOpenPricing, onOpenApi, onOpenTool, onOpenSettings, onOpenAccount, onOpenLogin, onOpenUtility, onOpenToolsHub, onOpenMemory, onOpenBookmarks, onOpenSearch, onOpenCompare, onOpenQRSync, onOpenChangelog, onOpenOsint, onOpenUseCaseLib, onOpenOmegaAgent, onOpenLocalEngineHub, onOpenMultiModelRace, onOpenLocalBenchmark, onOpenKgAdmin, onOpenKgPayment, onOpenKgRAG, onOpenKgMemory, onOpenKgNotifications, onOpenKgMultiAgent, onOpenKgOrganizations, onOpenKgMarketplace, onOpenKgAnalytics, onOpenKgFinetune, onOpenKgAPIKeys, onOpenKgMonitoring, onOpenKgSemanticSearch, onOpenKgCollaboration, onOpenKgContext, onOpenKgPentestLab, onOpenKgSecurity }: SidebarProps) {
  const { toast } = useToast();
  const { state, dispatch } = useStore();
  const { t } = useT();

  const sessionStartRef = useRef<number>(-1);
  const [sessionTokens, setSessionTokens] = useState(0);
  const [sessionMessages, setSessionMessages] = useState(0);

  useEffect(() => {
    if (sessionStartRef.current === -1) {
      sessionStartRef.current = state.subscription.tokensUsed;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (sessionStartRef.current >= 0) {
      setSessionTokens(Math.max(0, state.subscription.tokensUsed - sessionStartRef.current));
    }
  }, [state.subscription.tokensUsed]);

  useEffect(() => {
    const activeChat = state.chats.find(c => c.id === state.activeChatId);
    if (activeChat) setSessionMessages(activeChat.messages.filter(m => m.role === "user").length);
  }, [state.chats, state.activeChatId]);

  const [communityOpen, setCommunityOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [tokensOpen, setTokensOpen] = useState(false);
  const [darkWebOpen, setDarkWebOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned">("all");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  const filteredChats = state.chats
    .filter((c) => (filter === "pinned" ? c.pinned : true))
    .filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
  const pinned = filteredChats.filter((c) => c.pinned);
  const others = filteredChats.filter((c) => !c.pinned);

  const handleSelectChat = (id: string) => {
    dispatch({ type: "SELECT_CHAT", id });
    onClose();
  };

  const handleNewChat = () => {
    dispatch({ type: "NEW_CHAT" });
    onClose();
    toast({ description: t("toast.newChat") });
  };

  const handleSelectModel = (id: string) => {
    dispatch({ type: "SET_MODEL", model: id });
    toast({ description: t("toast.switchedModel", { model: id }) });
  };

  const handleSocial = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopyPromo = () => {
    navigator.clipboard.writeText("SAVE20");
    toast({ description: "Promo code SAVE20 copied." });
  };

  const submitRename = (id: string) => {
    if (renameVal.trim()) dispatch({ type: "RENAME_CHAT", id, title: renameVal.trim() });
    setRenameId(null);
    setRenameVal("");
  };

  const content = (
    <div className="CHAT-GPT-sidebar flex flex-col h-full w-[min(280px,100vw)] text-sm overflow-hidden flex-shrink-0 relative"
      style={{ background: "linear-gradient(180deg, rgba(10,10,16,0.99) 0%, rgba(6,6,10,1) 100%)", borderRight: "1px solid rgba(226,18,39,0.15)" }}>
      {/* Sidebar right edge glow */}
      <div className="absolute top-0 bottom-0 right-0 w-px pointer-events-none"
        style={{ background: "linear-gradient(180deg, transparent 0%, rgba(226,18,39,0.5) 30%, rgba(255,255,255,0.3) 50%, rgba(226,18,39,0.5) 70%, transparent 100%)" }} />

      {/* 3D Header */}
      <div className="p-4 flex items-center justify-between relative" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        {/* Header top glow */}
        <div className="absolute inset-x-0 top-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.4), rgba(255,255,255,0.2), rgba(226,18,39,0.4), transparent)" }} />
        <button
          onClick={() => { dispatch({ type: "SELECT_CHAT", id: state.chats[0]?.id ?? "" }); onClose(); }}
          className="flex items-center gap-2 hover:opacity-90 transition-all group"
        >
          {/* 3D Logo Icon */}
          <div className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform"
            style={{
              background: "radial-gradient(circle at 35% 35%, rgba(226,18,39,0.3), rgba(8,8,12,0.95))",
              border: "1px solid rgba(226,18,39,0.4)",
              boxShadow: "0 0 20px rgba(226,18,39,0.25), inset 0 1px 0 rgba(255,255,255,0.08)"
            }}>
            {/* Orbiting particle */}
            <div className="absolute" style={{ animation: "orbit 3s linear infinite" }}>
              <div className="w-1 h-1 rounded-full" style={{ background: "#e21227", boxShadow: "0 0 4px rgba(226,18,39,0.9)" }} />
            </div>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" style={{ color: "#e21227", filter: "drop-shadow(0 0 5px rgba(226,18,39,0.7))" }}>
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <span className="font-black text-base tracking-tight block" style={{ animation: "matrix-glow 4s ease-in-out infinite", color: "#fff" }}>
              CHAT-GPT.ai
            </span>
            <span className="text-[8px] font-mono tracking-widest block" style={{ color: "rgba(226,18,39,0.7)" }}>NEURAL INTERFACE v3.0</span>
          </div>
        </button>
        <button onClick={onClose} className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-white/5" aria-label="Close menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button onClick={handleNewChat}
            className="w-full flex items-center gap-2 rounded-xl px-4 py-2.5 transition-all neon-btn relative overflow-hidden group"
            style={{
              background: "linear-gradient(135deg, rgba(226,18,39,0.15), rgba(40,0,8,0.8))",
              border: "1px solid rgba(226,18,39,0.3)",
              boxShadow: "0 0 15px rgba(226,18,39,0.1), inset 0 1px 0 rgba(255,255,255,0.06)"
            }}>
            {/* shimmer */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            <Plus className="w-4 h-4 flex-shrink-0" style={{ color: "#e21227", filter: "drop-shadow(0 0 4px rgba(226,18,39,0.7))" }} />
            <span className="font-bold text-white text-[13px]">{t("side.newChat")}</span>
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "rgba(226,18,39,0.5)" }} />
            <input
              type="text"
              placeholder={t("side.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl pl-9 pr-4 py-2.5 outline-none text-[13px] text-white placeholder:text-white/25 transition-all"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)"
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(226,18,39,0.35)"; e.currentTarget.style.boxShadow = "0 0 15px rgba(226,18,39,0.08), inset 0 1px 0 rgba(255,255,255,0.04)"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.boxShadow = "inset 0 1px 0 rgba(255,255,255,0.02)"; }}
            />
          </div>
        </div>

        {/* Quick panels — 3D grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { icon: Search, label: t("side.search"), color: "#e21227", action: () => { onOpenSearch(); onClose(); } },
            { icon: Brain, label: t("side.memory"), color: "#10b981", action: () => { onOpenMemory(); onClose(); }, badge: state.memory.length > 0 ? state.memory.length : null },
            { icon: Bookmark, label: t("side.bookmarks"), color: "#f59e0b", action: () => { onOpenBookmarks(); onClose(); } },
            { icon: ArrowLeftRight, label: t("side.compare"), color: "#a78bfa", action: () => { onOpenCompare(); onClose(); } },
          ].map(({ icon: Icon, label, color, action, badge }) => (
            <button key={label} onClick={action}
              className="flex items-center gap-1.5 rounded-xl px-2.5 py-2 transition-all text-[12px] font-bold text-white/70 hover:text-white relative overflow-hidden group"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${color}30`; e.currentTarget.style.background = `${color}08`; e.currentTarget.style.color = color; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = ""; }}>
              <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
              <span className="truncate">{label}</span>
              {badge != null && badge > 0 && <span className="ml-auto text-[9px] font-mono" style={{ color }}>{badge}</span>}
            </button>
          ))}
        </div>

        {/* Tools Hub */}
        <button
          onClick={() => { onOpenToolsHub(); onClose(); }}
          className="w-full flex items-center justify-between rounded-xl px-3 py-2.5 transition-all group relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.04))",
            border: "1px solid rgba(16,185,129,0.28)",
            boxShadow: "0 0 14px rgba(16,185,129,0.06), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(16,185,129,0.18), rgba(16,185,129,0.08))"; e.currentTarget.style.boxShadow = "0 0 20px rgba(16,185,129,0.14), inset 0 1px 0 rgba(255,255,255,0.06)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.04))"; e.currentTarget.style.boxShadow = "0 0 14px rgba(16,185,129,0.06), inset 0 1px 0 rgba(255,255,255,0.04)"; e.currentTarget.style.transform = ""; }}
        >
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-foreground text-[13px]">Tools Hub</span>
          </div>
          <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded">{ADDITIONAL_TOOLS.length}</span>
        </button>

        {/* Featured Tools */}
        <div className="space-y-2">
          <h3 className="px-2 text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
            style={{ color: "rgba(226,18,39,0.7)" }}>
            <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#e21227", boxShadow: "0 0 6px rgba(226,18,39,0.8)", animation: "neon-pulse 2s ease-in-out infinite" }} />
            Featured Tools
          </h3>
          <button onClick={onOpenTool} className="w-full flex items-center justify-between p-2 rounded-xl transition-all group"
            style={{ border: "1px solid transparent" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16,185,129,0.06)"; e.currentTarget.style.borderColor = "rgba(16,185,129,0.15)"; e.currentTarget.style.transform = "translateX(2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.transform = ""; }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform"
                style={{ border: "1px solid rgba(16,185,129,0.2)", boxShadow: "0 0 8px rgba(16,185,129,0.08)" }}>
                <TerminalSquare className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground text-[13px]">CHAT-GPT Agent CLI</div>
                <div className="text-[11px] text-muted-foreground">AI Pentest Automation</div>
              </div>
            </div>
            <span className="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded mr-1" style={{ boxShadow: "0 0 8px rgba(226,18,39,0.4)" }}>HOT</span>
          </button>

          <button onClick={() => onOpenUtility("Agent IDE")} className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Code className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground text-[13px]">Agent IDE</div>
                <div className="text-[11px] text-muted-foreground">AI Code Generation</div>
              </div>
            </div>
            <span className="border border-emerald-500/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">Free</span>
          </button>

          <button onClick={() => onOpenUtility("Dark Web Search")} className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Globe className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="font-medium text-foreground text-[13px]">Dark Web Search</div>
                <div className="text-[11px] text-muted-foreground">Leaked Data & .onion</div>
              </div>
            </div>
            <span className="border border-emerald-500/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">Free</span>
          </button>
        </div>

        {/* AI Models */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: "rgba(59,130,246,0.75)" }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", boxShadow: "0 0 5px rgba(59,130,246,0.9)" }} />
              AI Models
            </h3>
            <span className="border border-emerald-500/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{AI_MODELS.length}</span>
          </div>
          <div className="max-h-[min(60vh,560px)] overflow-y-auto pr-1 space-y-1">
            {AI_MODELS.map((m) => {
              const active = state.activeModel === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelectModel(m.id)}
                  className="w-full flex items-center justify-between p-2 rounded-xl transition-all"
                  style={active ? {
                    background: "rgba(226,18,39,0.08)",
                    border: "1px solid rgba(226,18,39,0.25)",
                    boxShadow: "0 0 12px rgba(226,18,39,0.08), inset 0 1px 0 rgba(255,255,255,0.04)",
                  } : { border: "1px solid transparent" }}
                  onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; } }}
                  onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = ""; e.currentTarget.style.borderColor = "transparent"; } }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg bg-card border flex items-center justify-center flex-shrink-0 transition-all ${m.color} ${active ? "border-primary/30 shadow-[0_0_8px_rgba(226,18,39,0.2)] scale-105" : "border-border"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className={`font-medium text-[13px] truncate transition-colors ${active ? "text-white" : "text-foreground"}`}>{m.id}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {m.badge && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">{m.badge}</span>}
                    {active && <span className="w-2 h-2 rounded-full bg-primary mr-1" style={{ boxShadow: "0 0 6px rgba(226,18,39,0.8)" }} />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-border" />

        {/* API & Automation */}
        <div className="space-y-1.5">
          <button onClick={onOpenApi} className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-emerald-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <span className="font-medium text-foreground text-[13px]">API Access</span>
            </div>
            <span className="border border-emerald-500/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">New</span>
          </button>

          <button onClick={onOpenTool} className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-blue-400">
                <TerminalSquare className="w-4 h-4" />
              </div>
              <span className="font-medium text-foreground text-[13px]">CHAT-GPT Agent</span>
            </div>
            <span className="border border-emerald-500/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full mr-1">New</span>
          </button>
        </div>

        {/* Pinned Tools */}
        {state.pinnedTools.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Pin className="w-3 h-3 text-primary" /> Pinned Tools
              </h3>
            </div>
            {state.pinnedTools.map((label) => {
              const tool = ADDITIONAL_TOOLS.find((t) => t.label === label);
              if (!tool) return null;
              return (
                <button
                  key={label}
                  onClick={() => { onOpenUtility(label as UtilityTool); onClose(); }}
                  className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-accent transition-colors"
                >
                  <div className={`w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center ${tool.color ?? "text-foreground/80"}`}>
                    <tool.icon className="w-4 h-4" />
                  </div>
                  <span className="font-medium text-foreground text-[13px]">{label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Additional Tools */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">All Tools</h3>
            <span className="border border-emerald-500/60 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full">{ADDITIONAL_TOOLS.length} Free</span>
          </div>

          {ADDITIONAL_TOOLS.map((tool) => (
            <button
              key={tool.label}
              onClick={() => { onOpenUtility(tool.label as UtilityTool); onClose(); }}
              className="w-full flex items-center justify-between p-2 rounded-xl transition-all group"
              style={{ border: "1px solid transparent" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                e.currentTarget.style.transform = "translateX(2px) translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "";
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center transition-all group-hover:scale-110 group-hover:border-white/15 ${tool.color ?? "text-foreground/80"}`}
                  style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)" }}>
                  <tool.icon className="w-4 h-4" />
                </div>
                <span className="font-medium text-foreground text-[13px] group-hover:text-white/90 transition-colors">{tool.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Snippets */}
        {state.snippets.length > 0 && (
          <div className="space-y-1.5">
            <h3 className="px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Snippets</h3>
            {state.snippets.slice(0, 3).map((s) => (
              <div key={s.id} className="px-2 py-1.5 rounded-lg hover:bg-accent text-[12px]">
                <div className="font-semibold text-foreground/90 truncate">{s.label}</div>
                <div className="text-[11px] text-muted-foreground line-clamp-1">{s.content}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── 3D Neural Network Canvas Background ────────────────────────── */}
        <NeuralCanvasBG />

        {/* Your Chats */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Your Chats</h3>
            <Popover>
              <PopoverTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-accent" aria-label="Filter">
                  <Filter className="w-3.5 h-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-40 p-1 bg-card border-border">
                {(["all", "pinned"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-accent text-sm capitalize"
                  >
                    {f === "all" ? "All chats" : "Pinned only"}
                    {filter === f && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          {pinned.length > 0 && (
            <div className="px-2 pt-1 text-[10px] uppercase tracking-wider text-muted-foreground/70">Pinned</div>
          )}
          {pinned.map((c) => (
            <ChatRow
              key={c.id}
              id={c.id}
              title={c.title}
              active={state.activeChatId === c.id}
              pinned
              renameId={renameId}
              renameVal={renameVal}
              onRename={(id) => { setRenameId(id); setRenameVal(c.title); }}
              onRenameChange={setRenameVal}
              onRenameSubmit={submitRename}
              onSelect={handleSelectChat}
              onPin={(id) => dispatch({ type: "PIN_CHAT", id })}
              onDelete={(id) => { dispatch({ type: "DELETE_CHAT", id }); toast({ description: "Chat deleted." }); }}
            />
          ))}
          {others.length === 0 && pinned.length === 0 && (
            <div className="px-2 py-3 text-[12px] text-muted-foreground italic">No chats match.</div>
          )}
          {others.map((c) => (
            <ChatRow
              key={c.id}
              id={c.id}
              title={c.title}
              active={state.activeChatId === c.id}
              renameId={renameId}
              renameVal={renameVal}
              onRename={(id) => { setRenameId(id); setRenameVal(c.title); }}
              onRenameChange={setRenameVal}
              onRenameSubmit={submitRename}
              onSelect={handleSelectChat}
              onPin={(id) => dispatch({ type: "PIN_CHAT", id })}
              onDelete={(id) => { dispatch({ type: "DELETE_CHAT", id }); toast({ description: "Chat deleted." }); }}
            />
          ))}
        </div>

        <div className="h-2"></div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar space-y-3">
        {/* ── 3D Collapse All / Expand All ── */}
        <motion.button
          onClick={() => {
            const allOpen = communityOpen && offerOpen && tokensOpen;
            const next = !allOpen;
            setCommunityOpen(next);
            setOfferOpen(next);
            setTokensOpen(next);
          }}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl border border-white/[0.06] hover:border-white/[0.14] transition-all group relative overflow-hidden"
          style={{ background: "rgba(255,255,255,0.025)" }}
          whileHover={{ scale: 1.01, y: -0.5 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 28 }}
        >
          {/* 3D scanline sweep — CSS */}
          <span className="absolute inset-0 pointer-events-none btn-shimmer-inner"
            style={{ background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.06) 50%,transparent 100%)", animationDuration: "6s" }}
          />
          <span className="relative text-[9px] font-mono font-bold uppercase tracking-widest text-white/30 group-hover:text-white/55 transition-colors">
            {communityOpen && offerOpen && tokensOpen ? "Collapse All" : "Expand All"}
          </span>
          <motion.div
            animate={{ rotate: communityOpen && offerOpen && tokensOpen ? 180 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            <ChevronDown className="w-3 h-3 text-white/20 group-hover:text-white/45 transition-colors" />
          </motion.div>
        </motion.button>

        {/* Community — collapsible drawer */}
        <div>
          <button
            onClick={() => setCommunityOpen(o => !o)}
            className="w-full flex items-center justify-between px-1 py-1 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground/60 transition-colors">Community</h3>
            <ChevronDown
              className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 group-hover:text-muted-foreground"
              style={{ transform: communityOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          <AnimatePresence initial={false}>
            {communityOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleSocial("https://t.me/mr7ai")}
                    className="flex-1 py-1.5 rounded-xl bg-[#1c2a3a] text-blue-400 hover:bg-blue-500/20 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/></svg>
                    Telegram
                  </button>
                  <button
                    onClick={() => handleSocial("https://instagram.com/mr7ai")}
                    className="flex-1 py-1.5 rounded-xl bg-[#3a1c2a] text-pink-400 hover:bg-pink-500/20 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                    Instagram
                  </button>
                  <button
                    onClick={() => handleSocial("https://wa.me/mr7ai")}
                    className="flex-1 py-1.5 rounded-xl bg-[#1c3a26] text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 text-xs font-semibold"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M17.6 6.32A7.85 7.85 0 0 0 12.05 4a7.94 7.94 0 0 0-6.88 11.89L4 20l4.22-1.11a7.93 7.93 0 0 0 3.83.98h.01a7.94 7.94 0 0 0 5.54-13.55zM12.06 18.5a6.59 6.59 0 0 1-3.36-.92l-.24-.14-2.5.66.67-2.44-.16-.25a6.6 6.6 0 1 1 12.24-3.5 6.6 6.6 0 0 1-6.65 6.59z"/></svg>
                    WhatsApp
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Special Offer — collapsible */}
        <div>
          <button
            onClick={() => setOfferOpen(o => !o)}
            className="w-full flex items-center justify-between px-1 py-1 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-1.5">
              <Gift className="w-3 h-3 text-purple-400/70" />
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground/60 transition-colors">Special Offer</h3>
            </div>
            <ChevronDown
              className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 group-hover:text-muted-foreground"
              style={{ transform: offerOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          <AnimatePresence initial={false}>
            {offerOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <button
                  onClick={handleCopyPromo}
                  className="w-full text-left bg-purple-950/40 border border-purple-800/40 rounded-xl p-3 hover:bg-purple-950/55 transition-colors mt-2"
                >
                  <p className="text-xs text-purple-200/80 mb-2">
                    Use <span className="font-mono text-primary font-bold px-1 rounded bg-black/40">SAVE20</span> for 20% off
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-purple-300 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    2d 15h 31m
                  </div>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TOKENS — collapsible */}
        <div>
          <button
            onClick={() => setTokensOpen(o => !o)}
            className="w-full flex items-center justify-between px-1 py-1 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-1.5">
              <Coins className="w-3 h-3" style={{ color: "#f59e0b" }} />
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground/60 transition-colors">Tokens</h3>
            </div>
            <ChevronDown
              className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 group-hover:text-muted-foreground"
              style={{ transform: tokensOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          <AnimatePresence initial={false}>
            {tokensOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                {(() => {
                  const sub = state.subscription;
                  const tokenLimit = TIER_TOKENS[sub.tier];
                  const usedPct = Math.min(100, (sub.tokensUsed / tokenLimit) * 100);
                  const remaining = Math.max(0, tokenLimit - sub.tokensUsed);
                  const isExpired = sub.expiresAt !== null && Date.now() > sub.expiresAt;
                  const today = new Date();
                  const days7 = Array.from({ length: 7 }, (_, i) => {
                    const d = new Date(today);
                    d.setDate(d.getDate() - (6 - i));
                    return d.toISOString().slice(0, 10);
                  });
                  const tokenHistory: Record<string, number> = (state as Record<string, unknown>).tokenHistory as Record<string, number> ?? {};
                  const vals = days7.map((d) => tokenHistory[d] ?? 0);
                  const maxVal = Math.max(...vals, 1);
                  return (
                    <div className="rounded-xl p-3 space-y-2.5 relative overflow-hidden mt-2"
                      style={{
                        background: "linear-gradient(135deg, rgba(14,14,20,0.9), rgba(8,8,12,0.95))",
                        border: "1px solid rgba(226,18,39,0.2)",
                        boxShadow: "0 0 20px rgba(226,18,39,0.06), inset 0 1px 0 rgba(255,255,255,0.04)"
                      }}>
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 rounded-tl-xl pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.6)" }} />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 rounded-br-xl pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.3)" }} />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Coins className="w-3.5 h-3.5" style={{ color: "#f59e0b", filter: "drop-shadow(0 0 4px rgba(245,158,11,0.6))" }} />
                          <span className="text-[11px] font-black tracking-widest font-mono" style={{ color: "rgba(255,255,255,0.7)" }}>TOKENS</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold" style={{ color: "rgba(226,18,39,0.8)" }}>
                          {(remaining / 1000).toFixed(1)}K / {(tokenLimit / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <div className="flex items-end gap-[3px] h-7" title="استخدام التوكن — 7 أيام">
                        {vals.map((v, i) => {
                          const heightPct = maxVal > 0 ? (v / maxVal) * 100 : 0;
                          const isToday = i === 6;
                          return (
                            <div key={days7[i]} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                              <div className="w-full rounded-sm transition-all" style={{
                                height: `${Math.max(heightPct, 4)}%`,
                                background: isToday ? "linear-gradient(180deg, #e21227, #7a0010)" : "linear-gradient(180deg, rgba(226,18,39,0.35), rgba(226,18,39,0.1))",
                                boxShadow: isToday ? "0 0 6px rgba(226,18,39,0.5)" : "none"
                              }} />
                              {v > 0 && (
                                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] text-foreground px-1 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10"
                                  style={{ background: "rgba(8,8,12,0.9)", border: "1px solid rgba(226,18,39,0.3)" }}>
                                  {v >= 1000 ? `${(v/1000).toFixed(1)}K` : v}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[
                          { label: "جلسة", value: sessionTokens >= 1000 ? `${(sessionTokens/1000).toFixed(1)}K` : sessionTokens, color: "#a78bfa" },
                          { label: "رسائل", value: sessionMessages, color: "#00e5ff" },
                          { label: "تكلفة", value: `$${(sessionTokens * 0.000002).toFixed(4)}`, color: "#f59e0b" },
                        ].map(({ label, value, color }) => (
                          <div key={label} className="flex-1 flex flex-col items-center rounded-lg px-1 py-1.5"
                            style={{ background: "rgba(255,255,255,0.02)", border: `1px solid ${color}20` }}>
                            <span className="text-[8px] font-mono tracking-wider" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</span>
                            <span className="text-[11px] font-black font-mono" style={{ color, textShadow: `0 0 8px ${color}70` }}>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <div className="h-full rounded-full transition-all" style={{
                          width: `${Math.max(2, 100 - usedPct)}%`,
                          background: usedPct > 80 ? "linear-gradient(90deg, #ef4444, #e21227)" : usedPct > 50 ? "linear-gradient(90deg, #f59e0b, #d97706)" : "linear-gradient(90deg, #e21227, #ff4455)",
                          boxShadow: "0 0 6px rgba(226,18,39,0.5)"
                        }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono" style={{ color: isExpired ? "#ef4444" : "rgba(255,255,255,0.4)" }}>
                          <span style={{ color: "rgba(255,255,255,0.6)" }}>{TIER_LABELS[sub.tier]}</span>
                          {isExpired && <span className="text-red-400"> ·expired</span>}
                        </span>
                        <button onClick={onOpenPricing} className="text-[10px] font-black font-mono tracking-wider transition-all"
                          style={{ color: "#e21227", textShadow: "0 0 8px rgba(226,18,39,0.5)" }}>
                          {sub.tier === "free" ? "UPGRADE" : "MANAGE"}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SYSTEM TELEMETRY HUD */}
        <SidebarTelemetryHUD />

        {/* DARK WEB MONITOR — collapsible */}
        <div>
          <button
            onClick={() => setDarkWebOpen(o => !o)}
            className="w-full flex items-center justify-between px-1 py-1 rounded-lg hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-red-500/70"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground/60 transition-colors">Dark Web Monitor</h3>
            </div>
            <ChevronDown
              className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 group-hover:text-muted-foreground"
              style={{ transform: darkWebOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>
          <AnimatePresence initial={false}>
            {darkWebOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <div className="mt-2">
                  <DarkWebMonitor />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* USE-CASE LIBRARY — collapsible */}
        {onOpenUseCaseLib && (
          <div>
            <button
              onClick={() => setLinksOpen(o => !o)}
              className="w-full flex items-center justify-between px-1 py-1 rounded-lg hover:bg-white/5 transition-colors group"
            >
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-red-500/70"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider group-hover:text-foreground/60 transition-colors">Use-Case Library</h3>
              </div>
              <ChevronDown
                className="w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 group-hover:text-muted-foreground"
                style={{ transform: linksOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              />
            </button>
            <AnimatePresence initial={false}>
              {linksOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  style={{ overflow: "hidden" }}
                >
                  <div className="mt-2 space-y-1.5">
                    <button
                      onClick={onOpenUseCaseLib}
                      className="w-full flex items-center gap-2 py-1.5 px-2.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all group"
                      style={{ border: "1px solid rgba(226,18,39,0.2)", background: "rgba(226,18,39,0.05)", color: "#e21227" }}
                      title="مكتبة سيناريوهات الأمن — Ctrl+Shift+U"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 shrink-0 group-hover:scale-110 transition-transform"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/></svg>
                      <span>Open Library</span>
                      <span className="ml-auto text-[9px] opacity-50 font-normal">⌃⇧U</span>
                    </button>
                    <div className="flex items-center gap-1.5">
                      <a href="https://t.me/mr7ai" target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono font-bold text-sky-400/80 hover:text-sky-300 hover:bg-sky-400/10 border border-sky-400/15 hover:border-sky-400/30 transition-all">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
                        Telegram
                      </a>
                      <a href="https://discord.gg/mr7ai" target="_blank" rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-mono font-bold text-indigo-400/80 hover:text-indigo-300 hover:bg-indigo-400/10 border border-indigo-400/15 hover:border-indigo-400/30 transition-all">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.04.037.052a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                        Discord
                      </a>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ── KaliGPT Systems — Quick Access Grid ─────────────────────── */}
        {(onOpenKgAdmin || onOpenKgAnalytics || onOpenKgPentestLab || onOpenKgSecurity) && (
          <div className="mb-2">
            <div className="text-[9px] font-bold tracking-[0.2em] text-[#e21227]/60 uppercase mb-1.5 px-1">KaliGPT Systems</div>
            <div className="grid grid-cols-3 gap-1">
              {onOpenKgAdmin && (
                <button onClick={onOpenKgAdmin} title="Admin Panel" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-[#e21227]/10 hover:bg-[#e21227]/20 border border-[#e21227]/20 hover:border-[#e21227]/40 transition-all group">
                  <Shield className="w-3.5 h-3.5 text-[#e21227]/70 group-hover:text-[#e21227]" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Admin</span>
                </button>
              )}
              {onOpenKgAnalytics && (
                <button onClick={onOpenKgAnalytics} title="Analytics Dashboard" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 transition-all group">
                  <Activity className="w-3.5 h-3.5 text-indigo-400/70 group-hover:text-indigo-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Analytics</span>
                </button>
              )}
              {onOpenKgRAG && (
                <button onClick={onOpenKgRAG} title="RAG Knowledge Base" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 transition-all group">
                  <Brain className="w-3.5 h-3.5 text-blue-400/70 group-hover:text-blue-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">RAG</span>
                </button>
              )}
              {onOpenKgMemory && (
                <button onClick={onOpenKgMemory} title="Long-term Memory" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 hover:border-purple-500/40 transition-all group">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400/70 group-hover:text-purple-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Memory</span>
                </button>
              )}
              {onOpenKgMultiAgent && (
                <button onClick={onOpenKgMultiAgent} title="Multi-Agent Council" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 transition-all group">
                  <Network className="w-3.5 h-3.5 text-emerald-400/70 group-hover:text-emerald-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Agents</span>
                </button>
              )}
              {onOpenKgOrganizations && (
                <button onClick={onOpenKgOrganizations} title="Organizations & Teams" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 hover:border-orange-500/40 transition-all group">
                  <Users className="w-3.5 h-3.5 text-orange-400/70 group-hover:text-orange-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Orgs</span>
                </button>
              )}
              {onOpenKgMarketplace && (
                <button onClick={onOpenKgMarketplace} title="Plugin Marketplace" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 hover:border-pink-500/40 transition-all group">
                  <Globe className="w-3.5 h-3.5 text-pink-400/70 group-hover:text-pink-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Market</span>
                </button>
              )}
              {onOpenKgPayment && (
                <button onClick={onOpenKgPayment} title="Subscription Plans" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 transition-all group">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400/70 group-hover:text-amber-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Plans</span>
                </button>
              )}
              {onOpenKgMonitoring && (
                <button onClick={onOpenKgMonitoring} title="System Monitoring" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/40 transition-all group">
                  <Activity className="w-3.5 h-3.5 text-cyan-400/70 group-hover:text-cyan-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Monitor</span>
                </button>
              )}
              {onOpenKgAPIKeys && (
                <button onClick={onOpenKgAPIKeys} title="API Keys" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-lime-500/10 hover:bg-lime-500/20 border border-lime-500/20 hover:border-lime-500/40 transition-all group">
                  <KeyRound className="w-3.5 h-3.5 text-lime-400/70 group-hover:text-lime-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">API Keys</span>
                </button>
              )}
              {onOpenKgSemanticSearch && (
                <button onClick={onOpenKgSemanticSearch} title="Semantic Search" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/20 hover:border-violet-500/40 transition-all group">
                  <Search className="w-3.5 h-3.5 text-violet-400/70 group-hover:text-violet-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Search</span>
                </button>
              )}
              {onOpenKgCollaboration && (
                <button onClick={onOpenKgCollaboration} title="Real-time Collaboration" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-fuchsia-500/10 hover:bg-fuchsia-500/20 border border-fuchsia-500/20 hover:border-fuchsia-500/40 transition-all group">
                  <Users className="w-3.5 h-3.5 text-fuchsia-400/70 group-hover:text-fuchsia-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Collab</span>
                </button>
              )}
              {onOpenKgContext && (
                <button onClick={onOpenKgContext} title="Context Management" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 hover:border-teal-500/40 transition-all group">
                  <Layers className="w-3.5 h-3.5 text-teal-400/70 group-hover:text-teal-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Context</span>
                </button>
              )}
              {onOpenKgFinetune && (
                <button onClick={onOpenKgFinetune} title="Fine-Tuning Pipeline" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 hover:border-sky-500/40 transition-all group">
                  <Wand2 className="w-3.5 h-3.5 text-sky-400/70 group-hover:text-sky-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Finetune</span>
                </button>
              )}
              {onOpenKgNotifications && (
                <button onClick={onOpenKgNotifications} title="Notifications" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 transition-all group">
                  <Bell className="w-3.5 h-3.5 text-rose-400/70 group-hover:text-rose-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Alerts</span>
                </button>
              )}
              {onOpenKgPentestLab && (
                <button onClick={onOpenKgPentestLab} title="Pentest Lab Pro" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-[#e21227]/10 hover:bg-[#e21227]/20 border border-[#e21227]/20 hover:border-[#e21227]/40 transition-all group">
                  <Terminal className="w-3.5 h-3.5 text-[#e21227]/70 group-hover:text-[#e21227]" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Pentest</span>
                </button>
              )}
              {onOpenKgSecurity && (
                <button onClick={onOpenKgSecurity} title="Security & Compliance" className="flex flex-col items-center gap-0.5 p-1.5 rounded-lg bg-red-900/20 hover:bg-red-900/30 border border-red-900/30 hover:border-red-900/50 transition-all group">
                  <ShieldAlert className="w-3.5 h-3.5 text-red-400/70 group-hover:text-red-400" />
                  <span className="text-[8px] text-gray-500 group-hover:text-gray-300">Security</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── OMEGA AGENT — 3D glowing button ─────────────────────────── */}
        {onOpenOmegaAgent && (
          <motion.button
            onClick={onOpenOmegaAgent}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl relative overflow-hidden mb-1"
            style={{
              background: "linear-gradient(135deg, rgba(226,18,39,0.18) 0%, rgba(180,10,30,0.10) 100%)",
              border: "1px solid rgba(226,18,39,0.40)",
              boxShadow: "0 0 24px rgba(226,18,39,0.25), inset 0 1px 0 rgba(255,80,80,0.12)",
            }}
            whileHover={{
              scale: 1.02,
              boxShadow: "0 0 40px rgba(226,18,39,0.45), 0 0 80px rgba(226,18,39,0.12), inset 0 1px 0 rgba(255,80,80,0.20)",
              borderColor: "rgba(226,18,39,0.70)",
            }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 26 }}
            title="OMEGA AGENT"
            aria-label="فتح OMEGA AGENT"
          >
            {/* Scan line — CSS */}
            <span className="absolute inset-y-0 pointer-events-none btn-shimmer-inner"
              style={{ width: 60, background: "linear-gradient(90deg,transparent,rgba(226,18,39,0.30),transparent)" }}
            />
            {/* Corner brackets */}
            <span className="absolute top-1 left-1 w-2 h-2 border-t border-l pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.65)" }} />
            <span className="absolute bottom-1 right-1 w-2 h-2 border-b border-r pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.65)" }} />

            <div className="pulse-dot" style={{ animationDuration: "1.6s" }}>
              <Zap className="w-3.5 h-3.5 relative" style={{ color: "#e21227" }} />
            </div>
            <span className="relative text-[10px] font-black tracking-[0.25em] uppercase" style={{ color: "#ff4444", textShadow: "0 0 16px rgba(226,18,39,0.8)" }}>
              OMEGA AGENT
            </span>
            <span className="relative text-[8px] font-black px-1 py-0.5 rounded" style={{ background: "rgba(226,18,39,0.25)", color: "#ff6666", border: "1px solid rgba(226,18,39,0.40)" }}>
              ∞
            </span>
          </motion.button>
        )}

        <div className="flex items-center justify-between pt-1">
          <UserMenu onAccount={onOpenAccount} onSettings={onOpenSettings} onTheme={onOpenSettings} onLogin={onOpenLogin} />
          <div className="flex items-center gap-1">
            {onOpenLocalEngineHub && (
              <button
                onClick={onOpenLocalEngineHub}
                title="Local Engine Hub — 7 AI Engines"
                className="p-1.5 rounded text-[#00e5ff88] hover:text-[#00e5ff] hover:bg-[#00e5ff12] transition-colors"
              >
                <Server className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenMultiModelRace && (
              <button
                onClick={onOpenMultiModelRace}
                title="Multi-Model Race — سباق النماذج"
                className="p-1.5 rounded text-[#f7258588] hover:text-[#f72585] hover:bg-[#f7258512] transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenLocalBenchmark && (
              <button
                onClick={onOpenLocalBenchmark}
                title="Engine Benchmark — اختبار الأداء"
                className="p-1.5 rounded text-[#a78bfa88] hover:text-[#a78bfa] hover:bg-[#a78bfa12] transition-colors"
              >
                <Activity className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenQRSync && (
              <button
                onClick={onOpenQRSync}
                title="مزامنة QR عبر الأجهزة"
                className="p-1.5 rounded text-[#555] hover:text-[#aaa] hover:bg-[#1a1a1a] transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
              </button>
            )}
            <UserMenu trigger="dots" onAccount={onOpenAccount} onSettings={onOpenSettings} onTheme={onOpenSettings} onLogin={onOpenLogin} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — collapsible */}
      <div
        className={`hidden md:flex h-full relative z-20 sidebar-desktop-wrapper ${collapsed ? "collapsed" : "expanded"}`}
        style={{ background: "linear-gradient(180deg, rgba(10,10,16,0.99) 0%, rgba(6,6,10,1) 100%)", borderRight: "1px solid rgba(226,18,39,0.15)" }}
      >
        {collapsed ? (
          /* ── Icon-only collapsed rail ── */
          <div className="sidebar-icon-rail">
            {/* Expand button */}
            <button
              onClick={onToggleCollapsed}
              className="rail-btn"
              title="توسيع الشريط الجانبي"
              aria-label="Expand sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
            {/* Logo */}
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
              style={{ background: "radial-gradient(circle at 35% 35%, rgba(226,18,39,0.3), rgba(8,8,12,0.95))", border: "1px solid rgba(226,18,39,0.4)", boxShadow: "0 0 16px rgba(226,18,39,0.2)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5" style={{ color: "#e21227" }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <div className="w-full h-px my-1" style={{ background: "rgba(226,18,39,0.15)" }} />
            {/* New Chat */}
            <button onClick={() => { dispatch({ type: "NEW_CHAT" }); onClose(); }} className="rail-btn" title="محادثة جديدة">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 5v14M5 12h14"/></svg>
            </button>
            {/* Search */}
            <button onClick={onOpenSearch} className="rail-btn" title="بحث">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            {/* Tools Hub */}
            <button onClick={onOpenToolsHub} className="rail-btn" title="مركز الأدوات">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            </button>
            {/* Memory */}
            <button onClick={onOpenMemory} className="rail-btn" title="الذاكرة">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 6v6l4 2"/></svg>
            </button>
            {/* Bookmarks */}
            <button onClick={onOpenBookmarks} className="rail-btn" title="المفضلة">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
            <div className="flex-1" />
            {/* Settings */}
            <button onClick={onOpenSettings} className="rail-btn" title="الإعدادات">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
          </div>
        ) : (
          /* ── Full expanded sidebar ── */
          <div className="relative h-full w-full">
            {/* Collapse button (desktop only) */}
            <button
              onClick={onToggleCollapsed}
              className="absolute top-4 right-2 z-10 p-1.5 rounded-lg transition-colors text-muted-foreground/50 hover:text-foreground hover:bg-white/5"
              title="طي الشريط الجانبي"
              aria-label="Collapse sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            {content}
          </div>
        )}
      </div>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
              className="md:hidden fixed inset-0 z-[199]"
              style={{
                background: "rgba(0,0,0,0.88)",
                backdropFilter: "blur(18px)",
                WebkitBackdropFilter: "blur(18px)",
              }}
            />
            {/* Drawer — z above ALL fixed HUD elements (z-85, z-90, etc.) */}
            <motion.div
              initial={{ x: "-100%", rotateY: -8, opacity: 0.6 }}
              animate={{ x: 0, rotateY: 0, opacity: 1 }}
              exit={{ x: "-100%", rotateY: -12, opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 260, mass: 0.8 }}
              className="md:hidden fixed inset-y-0 left-0 z-[200] flex"
              style={{ perspective: "1200px", transformStyle: "preserve-3d", willChange: "transform" }}
            >
              {/* Neon edge glow on the right side of drawer */}
              <div style={{
                position: "absolute", right: -1, top: 0, bottom: 0, width: 2, zIndex: 1, pointerEvents: "none",
                background: "linear-gradient(180deg, transparent 0%, rgba(226,18,39,0.9) 20%, rgba(255,60,80,1) 50%, rgba(226,18,39,0.9) 80%, transparent 100%)",
                boxShadow: "0 0 24px rgba(226,18,39,0.7), 0 0 8px rgba(226,18,39,0.4)",
                filter: "blur(0.5px)",
              }} />
              {/* Scanline sweep across drawer */}
              <span
                style={{
                  position: "absolute", left: 0, right: 0, height: 80, zIndex: 2, pointerEvents: "none",
                  background: "linear-gradient(180deg, transparent 0%, rgba(226,18,39,0.06) 50%, transparent 100%)",
                  animation: "window-scan 4.8s linear infinite",
                }}
              />
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function ChatRow({
  id,
  title,
  active,
  pinned,
  renameId,
  renameVal,
  onRename,
  onRenameChange,
  onRenameSubmit,
  onSelect,
  onPin,
  onDelete,
}: {
  id: string;
  title: string;
  active: boolean;
  pinned?: boolean;
  renameId: string | null;
  renameVal: string;
  onRename: (id: string) => void;
  onRenameChange: (v: string) => void;
  onRenameSubmit: (id: string) => void;
  onSelect: (id: string) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const isRenaming = renameId === id;
  return (
    <div
      className={`group flex items-center gap-2 p-2 rounded-xl transition-all relative ${
        active ? "" : ""
      }`}
      style={{
        background: active ? "rgba(226,18,39,0.08)" : "transparent",
        border: active ? "1px solid rgba(226,18,39,0.2)" : "1px solid transparent",
        boxShadow: active ? "0 0 12px rgba(226,18,39,0.08), inset 0 1px 0 rgba(255,255,255,0.04)" : "none",
      }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.border = "1px solid rgba(255,255,255,0.05)"; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.border = "1px solid transparent"; } }}
    >
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 rounded-r-full" style={{ background: "#e21227", boxShadow: "0 0 6px rgba(226,18,39,0.8)" }} />}
      {isRenaming ? (
        <input
          autoFocus
          value={renameVal}
          onChange={(e) => onRenameChange(e.target.value)}
          onBlur={() => onRenameSubmit(id)}
          onKeyDown={(e) => { if (e.key === "Enter") onRenameSubmit(id); if (e.key === "Escape") onRenameSubmit(id); }}
          className="flex-1 bg-background border border-border rounded-md px-2 py-1 text-[13px] outline-none focus:border-primary"
        />
      ) : (
        <button onClick={() => onSelect(id)} className="flex-1 flex items-center gap-2 min-w-0 text-left">
          {pinned ? (
            <Pin className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          ) : (
            <MessageSquare className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          )}
          <span className={`truncate text-[13px] ${active ? "font-semibold text-foreground" : "text-foreground/85"}`}>{title}</span>
        </button>
      )}
      {!isRenaming && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-1 rounded" aria-label="Chat menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40 bg-card border-border">
            <DropdownMenuItem onSelect={() => onPin(id)}>
              <Pin className="w-4 h-4" /> {pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRename(id)}>
              <Pencil className="w-4 h-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onDelete(id)} className="text-primary">
              <Trash2 className="w-4 h-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
