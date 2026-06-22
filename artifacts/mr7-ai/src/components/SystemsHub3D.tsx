/**
 * SystemsHub3D — Holographic 3D node network visualizing all 38 KaliGPT systems
 * Canvas-based WebGL-like rendering with particle physics, glow, spring animations
 */
import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize2, RotateCcw, Zap, Shield, Brain, Code2, Users, CreditCard, Bell, Key, BarChart3, Terminal, Database, Globe, FileText, Activity, BookOpen, Search, Layers, Lock, Settings, GitBranch, Cpu, Radio, Star, Wifi } from "lucide-react";

interface System {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  color: string;
  icon: React.ElementType;
  status: "online" | "beta" | "new";
  onOpen?: () => void;
}

const SYSTEMS: System[] = [
  { id: "chat",       name: "محادثة الذكاء الاصطناعي",    nameEn: "AI Chat",              category: "core",     color: "#e21227", icon: Brain,     status: "online" },
  { id: "auth",       name: "نظام المصادقة",              nameEn: "Auth System",          category: "security", color: "#3b82f6", icon: Lock,      status: "online" },
  { id: "payment",    name: "بوابة الدفع",                nameEn: "Payment Gateway",      category: "billing",  color: "#f59e0b", icon: CreditCard, status: "online" },
  { id: "rag",        name: "قاعدة المعرفة RAG",          nameEn: "RAG Knowledge Base",   category: "ai",       color: "#3b82f6", icon: Database,  status: "online" },
  { id: "apikeys",    name: "مفاتيح API للمطورين",        nameEn: "Developer API Keys",   category: "dev",      color: "#10b981", icon: Key,       status: "online" },
  { id: "env",        name: "متغيرات البيئة",             nameEn: "Environment Config",   category: "dev",      color: "#6b7280", icon: Settings,  status: "online" },
  { id: "notify",     name: "نظام الإشعارات",             nameEn: "Notifications",        category: "core",     color: "#06b6d4", icon: Bell,      status: "online" },
  { id: "reports",    name: "تقارير PDF",                 nameEn: "PDF Reports",          category: "security", color: "#a855f7", icon: FileText,  status: "new"    },
  { id: "memory",     name: "الذاكرة طويلة الأمد",        nameEn: "Long-term Memory",     category: "ai",       color: "#8b5cf6", icon: Brain,     status: "online" },
  { id: "collab",     name: "التعاون الفوري",             nameEn: "Realtime Collab",      category: "team",     color: "#fb923c", icon: Users,     status: "online" },
  { id: "pwa",        name: "تطبيق PWA",                 nameEn: "PWA",                  category: "core",     color: "#6366f1", icon: Globe,     status: "online" },
  { id: "kali",       name: "أدوات Kali Linux",           nameEn: "Kali Tools",           category: "security", color: "#e21227", icon: Terminal,  status: "online" },
  { id: "orgs",       name: "فضاء الفريق",               nameEn: "Team Workspace",       category: "team",     color: "#10b981", icon: Users,     status: "online" },
  { id: "finetune",   name: "Fine-Tuning Pipeline",      nameEn: "Fine-Tuning",          category: "ai",       color: "#14b8a6", icon: Cpu,       status: "beta"   },
  { id: "market",     name: "سوق الوحدات",               nameEn: "Plugin Marketplace",   category: "dev",      color: "#ec4899", icon: Globe,     status: "online" },
  { id: "tests",      name: "الاختبارات التلقائية",       nameEn: "Automated Tests",      category: "dev",      color: "#84cc16", icon: Code2,     status: "new"    },
  { id: "ratelimit",  name: "حدود الاستخدام",             nameEn: "Rate Limiting",        category: "security", color: "#f97316", icon: Activity,  status: "online" },
  { id: "monitor",    name: "مراقبة النظام",              nameEn: "System Monitoring",    category: "ops",      color: "#22d3ee", icon: BarChart3, status: "online" },
  { id: "perf",       name: "تحسين الأداء",              nameEn: "Performance",          category: "ops",      color: "#a3a3a3", icon: Zap,       status: "online" },
  { id: "help",       name: "مركز المساعدة",             nameEn: "Help Center",          category: "core",     color: "#e21227", icon: BookOpen,  status: "new"    },
  { id: "scanner",    name: "محلل الكود الأمني",          nameEn: "Code Scanner",         category: "security", color: "#ef4444", icon: Shield,    status: "online" },
  { id: "multiagent", name: "نظام الوكلاء المتعددة",     nameEn: "Multi-Agent",          category: "ai",       color: "#f97316", icon: Brain,     status: "online" },
  { id: "admin",      name: "لوحة الإدارة",              nameEn: "Admin Dashboard",      category: "ops",      color: "#e21227", icon: Settings,  status: "online" },
  { id: "analytics",  name: "التحليلات المتقدمة",        nameEn: "Advanced Analytics",   category: "ops",      color: "#6366f1", icon: BarChart3, status: "online" },
  { id: "semantic",   name: "البحث الدلالي",             nameEn: "Semantic Search",      category: "ai",       color: "#a78bfa", icon: Search,    status: "online" },
  { id: "context",    name: "إدارة السياق",              nameEn: "Context Management",   category: "ai",       color: "#34d399", icon: Layers,    status: "online" },
  { id: "pentest",    name: "مختبر الاختراق",            nameEn: "Pentest Lab Pro",      category: "security", color: "#e21227", icon: Terminal,  status: "online" },
  { id: "compliance", name: "الأمان والامتثال",           nameEn: "Security Compliance",  category: "security", color: "#ef4444", icon: Shield,    status: "online" },
  { id: "voice",      name: "الدردشة الصوتية",           nameEn: "Voice Chat",           category: "core",     color: "#06b6d4", icon: Radio,     status: "online" },
  { id: "vision",     name: "رؤية الكاميرا",             nameEn: "Vision Capture",       category: "ai",       color: "#8b5cf6", icon: Cpu,       status: "online" },
  { id: "arsenal",    name: "Arsenal Hub — 18 وحدة",    nameEn: "Arsenal Hub",          category: "security", color: "#e21227", icon: Zap,       status: "online" },
  { id: "council",    name: "مجلس الذكاء — 105 نموذج", nameEn: "Council Mode",         category: "ai",       color: "#f59e0b", icon: Star,      status: "online" },
  { id: "godmode",    name: "وضع الإله — Godmode",      nameEn: "God Mode",             category: "ai",       color: "#ff0055", icon: Zap,       status: "online" },
  { id: "jarvis",     name: "J.A.R.V.I.S Commander",   nameEn: "JARVIS",               category: "ai",       color: "#00e5ff", icon: Cpu,       status: "online" },
  { id: "ollama",     name: "Ollama Hub — محلي",        nameEn: "Ollama Hub",           category: "local",    color: "#10b981", icon: Database,  status: "online" },
  { id: "localeng",   name: "7 محركات محلية",           nameEn: "Local Engine Suite",   category: "local",    color: "#fb923c", icon: Cpu,       status: "online" },
  { id: "osint",      name: "أدوات OSINT",              nameEn: "OSINT Tools",          category: "security", color: "#ef4444", icon: Search,    status: "online" },
  { id: "cisa",       name: "CISA CVE Live Feed",       nameEn: "CISA CVE Feed",        category: "security", color: "#ff6622", icon: Shield,    status: "online" },
];

const CATEGORY_COLORS: Record<string, string> = {
  core: "#e21227", security: "#ef4444", ai: "#8b5cf6", dev: "#10b981",
  billing: "#f59e0b", team: "#fb923c", ops: "#22d3ee", local: "#34d399",
};

interface NodePos { x: number; y: number; vx: number; vy: number; angle: number; radius: number; z: number; vz: number; orbitSpeed: number; layer: number }

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenSystem?: (id: string) => void;
}

export function SystemsHub3D({ open, onClose, onOpenSystem }: Props) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const nodesRef = useRef<NodePos[]>([]);
  const hoveredRef = useRef<number>(-1);
  const selectedRef = useRef<number>(-1);
  const rotRef = useRef({ x: 0.3, y: 0 });
  const dragRef = useRef({ dragging: false, lx: 0, ly: 0 });
  const autoRotRef = useRef(true);
  const [selected, setSelected] = useState<System | null>(null);
  const [stats, setStats] = useState({ online: 0, beta: 0, new: 0 });
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const online = SYSTEMS.filter(s => s.status === "online").length;
    const beta = SYSTEMS.filter(s => s.status === "beta").length;
    const newS = SYSTEMS.filter(s => s.status === "new").length;
    setStats({ online, beta, new: newS });
  }, []);

  const initNodes = useCallback((W: number, H: number) => {
    const layers = [6, 10, 14, 8]; // concentric sphere layers
    let idx = 0;
    const nodes: NodePos[] = [];
    const centerX = W / 2, centerY = H / 2;
    layers.forEach((count, li) => {
      const r = 80 + li * 70;
      for (let i = 0; i < count && idx < SYSTEMS.length; i++, idx++) {
        const phi = Math.acos(1 - 2 * (i + 0.5) / count);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        nodes.push({
          x: centerX + r * Math.sin(phi) * Math.cos(theta),
          y: centerY + r * Math.cos(phi) * 0.5,
          vx: 0, vy: 0,
          angle: theta,
          radius: r,
          z: r * Math.sin(phi) * Math.sin(theta),
          vz: 0,
          orbitSpeed: 0.003 + Math.random() * 0.002,
          layer: li,
        });
      }
    });
    nodesRef.current = nodes;
  }, []);

  useEffect(() => {
    if (!open) return;
    const cv = cvRef.current; if (!cv) return;
    const canvas = cv;
    const ctx = canvas.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const W = canvas.parentElement?.offsetWidth ?? 800;
      const H = canvas.parentElement?.offsetHeight ?? 600;
      canvas.width = W * DPR; canvas.height = H * DPR;
      canvas.style.width = W + "px"; canvas.style.height = H + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(DPR, DPR);
      initNodes(W, H);
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    function project(nx: number, ny: number, nz: number): { sx: number; sy: number; scale: number } {
      const rx = rotRef.current.x, ry = rotRef.current.y;
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      const cx = W / 2, cy = H / 2;
      const cos_y = Math.cos(ry), sin_y = Math.sin(ry);
      const cos_x = Math.cos(rx), sin_x = Math.sin(rx);
      const dx = nx - cx, dy = ny - cy, dz = nz;
      const rx1 = dx * cos_y - dz * sin_y;
      const rz1 = dx * sin_y + dz * cos_y;
      const ry1 = dy * cos_x - rz1 * sin_x;
      const rz2 = dy * sin_x + rz1 * cos_x;
      const fov = 600;
      const scale = fov / (fov + rz2 + 200);
      return { sx: cx + rx1 * scale, sy: cy + ry1 * scale, scale };
    }

    function draw() {
      tRef.current += 0.008;
      const t = tRef.current;
      const W = canvas.offsetWidth, H = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);

      // Background grid
      ctx.strokeStyle = "rgba(226,18,39,0.04)"; ctx.lineWidth = 1;
      const gs = 40;
      for (let x = 0; x < W; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      // Auto rotate
      if (autoRotRef.current) { rotRef.current.y += 0.004; }

      // Update node orbit positions
      const nodes = nodesRef.current;
      const cx2 = W / 2, cy2 = H / 2;
      nodes.forEach((n, _i) => {
        n.angle += n.orbitSpeed;
        const baseX = cx2 + n.radius * Math.cos(n.angle);
        const baseY = cy2 + n.radius * Math.sin(n.angle) * 0.3;
        const baseZ = n.radius * Math.sin(n.angle);
        n.x = baseX + Math.sin(t * 0.5 + _i) * 3;
        n.y = baseY + Math.cos(t * 0.4 + _i) * 3;
        n.z = baseZ;
      });

      // Sort by projected z for painter's algorithm
      const projected = nodes.map((n, i) => ({ ...project(n.x, n.y, n.z), i }));
      const sorted = [...projected].sort((a, b) => a.scale - b.scale);

      // Draw edges between nearby nodes
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const pi = projected[i], pj = projected[j];
          const dist = Math.hypot(pi.sx - pj.sx, pi.sy - pj.sy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.15 * Math.min(pi.scale, pj.scale);
            const sys_i = SYSTEMS[i], sys_j = SYSTEMS[j];
            const samecat = sys_i.category === sys_j.category;
            ctx.strokeStyle = samecat
              ? `rgba(226,18,39,${alpha * 1.5})`
              : `rgba(100,100,160,${alpha})`;
            ctx.beginPath(); ctx.moveTo(pi.sx, pi.sy); ctx.lineTo(pj.sx, pj.sy); ctx.stroke();

            // Animated packet
            const phase = (t * 0.8 + i * 0.3 + j * 0.2) % 1;
            const px = pi.sx + (pj.sx - pi.sx) * phase;
            const py = pi.sy + (pj.sy - pi.sy) * phase;
            if (samecat) {
              ctx.beginPath(); ctx.arc(px, py, 1.5, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(226,18,39,${alpha * 3})`; ctx.fill();
            }
          }
        }
      }

      // Draw nodes (back to front)
      sorted.forEach(({ sx, sy, scale, i }) => {
        const sys = SYSTEMS[i];
        const isHovered = hoveredRef.current === i;
        const isSelected = selectedRef.current === i;
        const r = (isHovered ? 18 : 14) * scale;
        const glow = isHovered ? 30 : isSelected ? 25 : 18;
        const color = sys.color;

        // Outer glow
        const gr = ctx.createRadialGradient(sx, sy, 0, sx, sy, glow * scale);
        gr.addColorStop(0, `${color}55`);
        gr.addColorStop(1, `${color}00`);
        ctx.beginPath(); ctx.arc(sx, sy, glow * scale, 0, Math.PI * 2);
        ctx.fillStyle = gr; ctx.fill();

        // Pulsing ring
        const pulse = 0.5 + 0.5 * Math.sin(t * 3 + i * 0.5);
        ctx.beginPath(); ctx.arc(sx, sy, r * (1 + pulse * 0.4), 0, Math.PI * 2);
        ctx.strokeStyle = `${color}${Math.floor(pulse * 80).toString(16).padStart(2, "0")}`;
        ctx.lineWidth = 1.5; ctx.stroke();

        // Main circle
        const cg = ctx.createRadialGradient(sx - r * 0.3, sy - r * 0.3, 0, sx, sy, r);
        cg.addColorStop(0, `${color}ff`);
        cg.addColorStop(0.5, `${color}cc`);
        cg.addColorStop(1, `${color}44`);
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fillStyle = cg; ctx.fill();

        // Border
        ctx.strokeStyle = isHovered ? "#ffffff" : `${color}aa`;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.stroke();

        // Status indicator
        const statusColor = sys.status === "online" ? "#22c55e" : sys.status === "new" ? "#f59e0b" : "#3b82f6";
        ctx.beginPath(); ctx.arc(sx + r * 0.6, sy - r * 0.6, 3 * scale, 0, Math.PI * 2);
        ctx.fillStyle = statusColor; ctx.fill();

        // Label
        if (scale > 0.7) {
          ctx.save();
          ctx.font = `${Math.max(9, 11 * scale)}px 'Inter', sans-serif`;
          ctx.textAlign = "center";
          const label = sys.nameEn;
          const tw = ctx.measureText(label).width;

          // Label bg
          ctx.fillStyle = "rgba(0,0,0,0.7)";
          const lx = sx - tw / 2 - 4, ly = sy + r + 4;
          ctx.fillRect(lx, ly, tw + 8, 14 * scale);

          ctx.fillStyle = isHovered ? "#ffffff" : `${color}ee`;
          ctx.fillText(label, sx, sy + r + 14 * scale);
          ctx.restore();
        }
      });

      // Central core
      const corePulse = 0.5 + 0.5 * Math.sin(t * 2);
      const coreR = 20 + corePulse * 5;
      const coreG = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, coreR * 3);
      coreG.addColorStop(0, "rgba(226,18,39,0.9)");
      coreG.addColorStop(0.4, "rgba(226,18,39,0.3)");
      coreG.addColorStop(1, "rgba(226,18,39,0)");
      ctx.beginPath(); ctx.arc(W / 2, H / 2, coreR * 3, 0, Math.PI * 2);
      ctx.fillStyle = coreG; ctx.fill();
      ctx.beginPath(); ctx.arc(W / 2, H / 2, coreR, 0, Math.PI * 2);
      const innerG = ctx.createRadialGradient(W / 2 - 5, H / 2 - 5, 0, W / 2, H / 2, coreR);
      innerG.addColorStop(0, "#ff6666"); innerG.addColorStop(1, "#e21227");
      ctx.fillStyle = innerG; ctx.fill();

      // Ring orbits
      [1, 2, 3, 4].forEach(li => {
        const r2 = 80 + li * 70;
        ctx.beginPath();
        ctx.ellipse(W / 2, H / 2, r2, r2 * 0.35, rotRef.current.y * 0.3, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(226,18,39,${0.08 - li * 0.015})`; ctx.lineWidth = 1; ctx.stroke();
      });

      rafRef.current = requestAnimationFrame(draw);
    }

    draw();

    // Mouse hover detection
    function onMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left), my = (e.clientY - rect.top);
      if (dragRef.current.dragging) {
        const dx = mx - dragRef.current.lx, dy = my - dragRef.current.ly;
        rotRef.current.y += dx * 0.005; rotRef.current.x += dy * 0.005;
        dragRef.current.lx = mx; dragRef.current.ly = my;
        autoRotRef.current = false;
        return;
      }
      let nearest = -1, nearestD = 999;
      nodesRef.current.forEach((n, i) => {
        const proj = { sx: 0, sy: 0, scale: 1 };
        const r = rotRef.current;
        const W2 = canvas.offsetWidth, H2 = canvas.offsetHeight;
        const cx3 = W2 / 2, cy3 = H2 / 2;
        const cos_y = Math.cos(r.y), sin_y = Math.sin(r.y);
        const cos_x = Math.cos(r.x), sin_x = Math.sin(r.x);
        const dx = n.x - cx3, dy2 = n.y - cy3, dz = n.z;
        const rx1 = dx * cos_y - dz * sin_y;
        const rz1 = dx * sin_y + dz * cos_y;
        const ry1 = dy2 * cos_x - rz1 * sin_x;
        const rz2 = dy2 * sin_x + rz1 * cos_x;
        const fov = 600;
        proj.scale = fov / (fov + rz2 + 200);
        proj.sx = cx3 + rx1 * proj.scale;
        proj.sy = cy3 + ry1 * proj.scale;
        const d = Math.hypot(mx - proj.sx, my - proj.sy);
        if (d < 20 * proj.scale + 10 && d < nearestD) { nearest = i; nearestD = d; }
      });
      hoveredRef.current = nearest;
      canvas.style.cursor = nearest >= 0 ? "pointer" : "grab";
    }

    function onMouseDown(e: MouseEvent) {
      dragRef.current = { dragging: true, lx: e.clientX - cvRef.current!.getBoundingClientRect().left, ly: e.clientY - cvRef.current!.getBoundingClientRect().top };
    }
    function onMouseUp() {
      if (!dragRef.current.dragging) return;
      dragRef.current.dragging = false;
      setTimeout(() => { autoRotRef.current = true; }, 3000);
    }
    function onClick(e: MouseEvent) {
      if (hoveredRef.current >= 0) {
        const sys = SYSTEMS[hoveredRef.current];
        selectedRef.current = hoveredRef.current;
        setSelected(sys);
        if (onOpenSystem) onOpenSystem(sys.id);
      }
    }

    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("click", onClick);
    };
  }, [open, initNodes, onOpenSystem]);

  const categories = ["all", ...Array.from(new Set(SYSTEMS.map(s => s.category)))];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 40 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 40 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full h-full max-w-[1400px] max-h-[900px] mx-4 my-4 rounded-2xl overflow-hidden flex flex-col"
            style={{
              background: "linear-gradient(135deg, #080808 0%, #0d0d0d 50%, #0a0a0a 100%)",
              border: "1px solid rgba(226,18,39,0.25)",
              boxShadow: "0 0 80px rgba(226,18,39,0.15), 0 0 200px rgba(226,18,39,0.05), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/6" dir="rtl">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(226,18,39,0.2)", border: "1px solid rgba(226,18,39,0.4)" }}>
                    <Zap className="w-5 h-5 text-red-400" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-500 border-2 border-black" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white tracking-tight">نظام KaliGPT — 38 نظاماً متكاملاً</h2>
                  <p className="text-xs text-zinc-500">Systems Hub 3D — شبكة الأنظمة التفاعلية</p>
                </div>
                <div className="flex items-center gap-2 mr-4">
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />{stats.online} متصل
                  </span>
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{stats.new} جديد
                  </span>
                  <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{stats.beta} تجريبي
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { autoRotRef.current = true; rotRef.current = { x: 0.3, y: 0 }; }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors">
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-red-500/20 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Category filter */}
            <div className="flex-shrink-0 flex gap-2 px-6 py-2 overflow-x-auto scrollbar-none" dir="rtl">
              {categories.map(cat => (
                <button key={cat} onClick={() => setFilter(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border flex-shrink-0 transition-all ${filter === cat ? "text-white" : "text-zinc-500 border-white/8 hover:text-zinc-300"}`}
                  style={filter === cat ? { borderColor: `${CATEGORY_COLORS[cat] || "#e21227"}60`, backgroundColor: `${CATEGORY_COLORS[cat] || "#e21227"}20`, color: CATEGORY_COLORS[cat] || "#e21227" } : {}}>
                  {cat === "all" ? "الكل (38)" : cat}
                </button>
              ))}
            </div>

            {/* 3D Canvas */}
            <div className="flex-1 relative overflow-hidden">
              <canvas ref={cvRef} className="absolute inset-0 w-full h-full" style={{ cursor: "grab" }} />

              {/* Overlay HUD */}
              <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none">
                {["اسحب للتدوير", "اضغط للفتح", "عصبون نقطة اتصال"].map((t, i) => (
                  <div key={i} className="text-[10px] text-zinc-600 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-red-500/40" />
                    {t}
                  </div>
                ))}
              </div>

              {/* Selected system card */}
              <AnimatePresence>
                {selected && (
                  <motion.div
                    initial={{ opacity: 0, x: 20, y: 20 }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="absolute bottom-4 right-4 w-64 rounded-xl overflow-hidden"
                    style={{ background: "rgba(8,8,8,0.95)", border: `1px solid ${selected.color}40`, boxShadow: `0 0 30px ${selected.color}20` }}
                    dir="rtl"
                  >
                    <div className="px-4 py-3 border-b border-white/5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selected.color}25`, border: `1px solid ${selected.color}40` }}>
                          <selected.icon className="w-4 h-4" style={{ color: selected.color }} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{selected.name}</p>
                          <p className="text-[10px] text-zinc-500">{selected.nameEn}</p>
                        </div>
                        <button onClick={() => { setSelected(null); selectedRef.current = -1; }} className="mr-auto w-5 h-5 flex items-center justify-center text-zinc-600 hover:text-white"><X className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-between">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${selected.status === "online" ? "text-green-400 bg-green-500/10 border-green-500/20" : selected.status === "new" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" : "text-blue-400 bg-blue-500/10 border-blue-500/20"}`}>
                        {selected.status}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-zinc-400">{selected.category}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Systems list overlay */}
              <div className="absolute top-3 right-3 w-48 max-h-80 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/8 flex flex-col gap-1" dir="rtl">
                {SYSTEMS.filter(s => filter === "all" || s.category === filter).map((sys, i) => (
                  <motion.button
                    key={sys.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => { if (onOpenSystem) onOpenSystem(sys.id); }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-right transition-all hover:bg-white/5"
                    style={{ borderLeft: `2px solid ${sys.color}50` }}
                  >
                    <sys.icon className="w-3 h-3 flex-shrink-0" style={{ color: sys.color }} />
                    <span className="text-[10px] text-zinc-400 truncate flex-1">{sys.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sys.status === "online" ? "bg-green-500" : sys.status === "new" ? "bg-amber-500" : "bg-blue-500"}`} />
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Footer stats */}
            <div className="flex-shrink-0 px-6 py-3 border-t border-white/5 flex items-center justify-between" dir="rtl">
              <div className="flex items-center gap-4">
                {[
                  { label: "إجمالي الأنظمة", val: "38", color: "#e21227" },
                  { label: "نقاط الاتصال", val: "247+", color: "#3b82f6" },
                  { label: "معدل التشغيل", val: "99.9%", color: "#10b981" },
                  { label: "استجابة API", val: "< 200ms", color: "#f59e0b" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="text-center">
                    <p className="text-sm font-bold" style={{ color }}>{val}</p>
                    <p className="text-[10px] text-zinc-600">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-700">KaliGPT v3.0 — mr7.ai</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
