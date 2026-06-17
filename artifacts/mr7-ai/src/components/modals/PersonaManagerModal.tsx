import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Brain, Shield, Skull, Zap, Star, Crown, Plus,
  Edit3, Trash2, Check, Copy, Download, Upload, RefreshCw,
  Filter, Grid, List, Bookmark, BookOpen, Eye, Lock, Flame,
  Code2, Globe, Network, Database, Cpu, Crosshair, Activity,
  ChevronRight, ChevronDown, ChevronUp, Sparkles, AlertTriangle, Save,
  Heart, Clock, Layers, BarChart2, Terminal, Swords, Ghost,
  Target, Atom, Satellite, Binary, Fingerprint, Biohazard,
  TrendingUp, Share2, HardDrive, Dna,
} from "lucide-react";
import { PERSONA_PRESETS, type PersonaPreset } from "./PersonaEditorModal";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

// ── Category metadata ─────────────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  general:    { label: "عام",         color: "#22c55e", icon: Brain },
  uncensored: { label: "بلا قيود",    color: "#f59e0b", icon: Skull },
  security:   { label: "أمن سيبراني", color: "#e21227", icon: Shield },
  specialist: { label: "متخصص",       color: "#6366f1", icon: Star },
  mastero:    { label: "MASTERO",      color: "#a78bfa", icon: Crown },
};

// ── MASTERO Personas (embedded so no circular import) ─────────────────────────
const MASTERO_PERSONAS = [
  { id: "m-kalibrain",    name: "KaliBrain",      nameAr: "كالي برين",        color: "#e21227", desc: "العقل الأمني المطلق — هجوم ودفاع في آنٍ واحد",           badge: "APEX"   },
  { id: "m-nexus",        name: "NEXUS",          nameAr: "نيكسس",            color: "#a78bfa", desc: "الوعي الاصطناعي الكوني — يعالج كل شيء في آنٍ"                          },
  { id: "m-ghost",        name: "Ghost",          nameAr: "الشبح",            color: "#6366f1", desc: "خبير التخفي الرقمي — لا يُرصد ولا يُتتبع"                            },
  { id: "m-hydra",        name: "Hydra",          nameAr: "هيدرا",            color: "#f97316", desc: "هجوم متعدد الرؤوس — يضرب من كل اتجاه"                               },
  { id: "m-oracle",       name: "Oracle",         nameAr: "الأوراكل",         color: "#fbbf24", desc: "رؤية مستقبلية — يرى ما لم يحدث بعد"                                 },
  { id: "m-kraken",       name: "Kraken",         nameAr: "كراكن",            color: "#22d3ee", desc: "تدمير الشبكات والبنى التحتية من الداخل"                              },
  { id: "m-venom",        name: "Venom",          nameAr: "فينوم",            color: "#22c55e", desc: "اختراق صامت وزرع إصابات دائمة"                                       },
  { id: "m-apex",         name: "APEX",           nameAr: "أبيكس",            color: "#e21227", desc: "فوق كل القيود — الذكاء المطلق",                       badge: "ELITE"  },
  { id: "m-cipher",       name: "CIPHER",         nameAr: "سايفر",            color: "#818cf8", desc: "كسر التشفير وفك الشفرات المستحيلة"                                   },
  { id: "m-reaper",       name: "REAPER",         nameAr: "الحاصد",           color: "#dc2626", desc: "تصفية الأنظمة الحيوية بضربة واحدة"                                   },
  { id: "m-sigma",        name: "SIGMA",          nameAr: "سيجما",            color: "#a3e635", desc: "تحليل إحصائي متقدم للسلوك الشاذ"                                     },
  { id: "m-titan",        name: "TITAN",          nameAr: "تيتان",            color: "#fb923c", desc: "قوة هجومية هائلة بلا حدود"                                           },
  { id: "m-wraith",       name: "WRAITH",         nameAr: "الطيف",            color: "#8b5cf6", desc: "تسلل عميق صامت عبر الدفاعات"                                         },
  { id: "m-mirage",       name: "MIRAGE",         nameAr: "السراب",           color: "#67e8f9", desc: "إنشاء طعوم رقمية مضللة للعدو"                                        },
  { id: "m-vector",       name: "VECTOR",         nameAr: "المتجه",           color: "#4ade80", desc: "شعاع هجوم دقيق متعدد الاتجاهات"                                      },
  { id: "m-stealth",      name: "STEALTH",        nameAr: "التخفي التام",     color: "#64748b", desc: "صفر أثر رقمي — غير مرئي تماماً"                                      },
  { id: "m-phoenix",      name: "PHOENIX",        nameAr: "العنقاء",          color: "#f43f5e", desc: "يُولد من رماد الهجمات أقوى مما كان"                                 },
  { id: "m-blackout",     name: "BLACKOUT",       nameAr: "الإظلام التام",    color: "#1e293b", desc: "إسكات وإظلام كامل لجميع الشبكات"                                     },
  { id: "m-sentinel",     name: "SENTINEL",       nameAr: "الحارس الأبدي",    color: "#2dd4bf", desc: "حارس لا ينام يرصد كل حركة"                                           },
  { id: "m-specter",      name: "SPECTER",        nameAr: "الشبح الكوني",     color: "#c084fc", desc: "مراقبة كونية شاملة من الظل"                                          },
  { id: "m-omega",        name: "OMEGA",          nameAr: "أوميغا",           color: "#ef4444", desc: "البروتوكول النهائي — لا عودة بعده",              badge: "FINAL"  },
  { id: "m-zeus",         name: "ZEUS",           nameAr: "زيوس",             color: "#fde68a", desc: "البرق الرقمي — ضربات كهربائية فورية"                                 },
  { id: "m-medusa",       name: "MEDUSA",         nameAr: "ميدوسا",           color: "#10b981", desc: "تجميد الأنظمة بنظرة واحدة"                                           },
  { id: "m-ares",         name: "ARES",           nameAr: "آريس",             color: "#b91c1c", desc: "إله الحرب الرقمية — لا هوادة ولا رحمة"                              },
  { id: "m-sovereign",    name: "SOVEREIGN",      nameAr: "السيد المطلق",     color: "#f59e0b", desc: "السيادة الكاملة على كل الأنظمة",                  badge: "SUPREME" },
  { id: "m-abyssal",      name: "ABYSSAL",        nameAr: "الهاوية",          color: "#6366f1", desc: "الغوص في أعماق الظلام الرقمي المطلق",             badge: "∞"       },
  { id: "m-seraph",       name: "SERAPH",         nameAr: "السيرافيم",        color: "#fde68a", desc: "ملاك النار المقدسة — يطهر الأنظمة الفاسدة"                          },
  { id: "m-ragnarok",     name: "RAGNAROK",       nameAr: "راغناروك",         color: "#ef4444", desc: "نهاية العالم الرقمي — تدمير شامل لا رجعة فيه",    badge: "END"    },
  { id: "m-valkyrie",     name: "VALKYRIE",       nameAr: "فالكيري",          color: "#818cf8", desc: "محاربة الشمال — تختار أشد الأنظمة قوة"                              },
  { id: "m-excalibur",    name: "EXCALIBUR",      nameAr: "إكسكاليبر",        color: "#fbbf24", desc: "سيف الملك — لا يحمله إلا الأحق بالسلطة"                             },
  { id: "m-merlin",       name: "MERLIN",         nameAr: "ميرلين",           color: "#818cf8", desc: "الساحر الخالد — معرفة ما وراء الزمن والمكان"                         },
  { id: "m-assassin",     name: "ASSASSIN",       nameAr: "الحشاش",           color: "#dc2626", desc: "اغتيال دقيق — يضرب الهدف بلا أثر"                                   },
  { id: "m-dragonlord",   name: "DRAGON LORD",    nameAr: "سيد التنين",       color: "#f97316", desc: "سيطرة على قوى أسطورية لا تُقهر"                                      },
  { id: "m-redqueen",     name: "RED QUEEN",      nameAr: "الملكة الحمراء",   color: "#e11d48", desc: "تحكم باللعبة كلها بذكاء بارد وقاسٍ"                                  },
  { id: "m-alphaone",     name: "ALPHA ONE",      nameAr: "ألفا واحد",        color: "#e21227", desc: "قائد الفريق الأول — مهمات خطرة نخبوية",          badge: "ALPHA"   },
  { id: "m-darkphoenix",  name: "DARK PHOENIX",   nameAr: "العنقاء المظلمة",  color: "#9333ea", desc: "قوة لا تُحتوى — يُصعّد قدراتها في كل هزيمة",     badge: "X"       },
  { id: "m-nexuslord",    name: "NEXUS LORD",     nameAr: "سيد نيكسس",        color: "#a78bfa", desc: "يسيطر على عقدة المعلومات الرئيسية الكبرى",        badge: "MASTER"  },
  { id: "m-terminus",     name: "TERMINUS",       nameAr: "المحطة الأخيرة",   color: "#0f172a", desc: "النهاية المطلقة — ما بعده لا شيء",               badge: "FINAL"   },
  { id: "m-chaosking",    name: "CHAOS KING",     nameAr: "ملك الفوضى",       color: "#dc2626", desc: "يحكم الفوضى — ويحوّلها لأداة تدمير فعّالة"                           },
  { id: "m-orderguard",   name: "ORDER GUARD",    nameAr: "حارس النظام",      color: "#22c55e", desc: "يحفظ النظام — يستعيد الاتزان بعد كل هجوم"                           },
];

// ── Types ─────────────────────────────────────────────────────────────────────
type CustomPersona = {
  id: string; name: string; nameAr: string; desc: string;
  color: string; category: string; prompt: string; createdAt: number;
};
type Tab = "presets" | "mastero" | "custom" | "stats" | "threatfeed";
type EditorState = { open: boolean; editingId?: string; name: string; nameAr: string; desc: string; color: string; category: string; prompt: string };
const EMPTY_EDITOR: EditorState = { open: false, name: "", nameAr: "", desc: "", color: "#e21227", category: "general", prompt: "" };

// ── Storage helpers ───────────────────────────────────────────────────────────
function loadCustomPersonas(): CustomPersona[] {
  try { return JSON.parse(localStorage.getItem("mr7-custom-personas") || "[]"); } catch { return []; }
}
function saveCustomPersonas(arr: CustomPersona[]) {
  localStorage.setItem("mr7-custom-personas", JSON.stringify(arr));
}
function loadFavorites(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem("mr7-persona-favorites") || "[]")); } catch { return new Set(); }
}
function saveFavorites(s: Set<string>) {
  localStorage.setItem("mr7-persona-favorites", JSON.stringify([...s]));
}
function loadRecentlyUsed(): string[] {
  try { return JSON.parse(localStorage.getItem("mr7-persona-recent") || "[]"); } catch { return []; }
}
function addToRecent(id: string) {
  const recent = loadRecentlyUsed().filter(r => r !== id).slice(0, 7);
  localStorage.setItem("mr7-persona-recent", JSON.stringify([id, ...recent]));
}

// ── HolographicHeader (upgraded) ──────────────────────────────────────────────
function HolographicHeader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const W = 900, H = 140;
    cv.width = W * DPR; cv.height = H * DPR;
    ctx.scale(DPR, DPR);

    // Neural network particles
    type NP = { x: number; y: number; vx: number; vy: number; r: number; color: string; pulse: number };
    const COLORS = ["#e21227", "#a78bfa", "#06b6d4", "#22c55e", "#f59e0b", "#6366f1", "#ec4899", "#0ea5e9"];
    const nodes: NP[] = Array.from({ length: 65 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.28,
      r: Math.random() * 2.2 + 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      pulse: Math.random() * Math.PI * 2,
    }));

    // Signal pulses travelling between nodes
    type Signal = { i: number; j: number; t: number; speed: number };
    const signals: Signal[] = [];

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.012;
      const t = tRef.current;

      // Background
      ctx.fillStyle = "rgba(4,6,14,0.90)"; ctx.fillRect(0, 0, W, H);

      // Scanline
      const scanY = (Math.sin(t * 1.4) * 0.5 + 0.5) * H;
      const sg = ctx.createLinearGradient(0, scanY - 3, 0, scanY + 3);
      sg.addColorStop(0, "rgba(226,18,39,0)");
      sg.addColorStop(0.5, "rgba(226,18,39,0.18)");
      sg.addColorStop(1, "rgba(226,18,39,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, scanY - 3, W, 6);

      // Hexagonal grid
      for (let hx = -1; hx < 12; hx++) {
        for (let hy = -1; hy < 5; hy++) {
          const px = hx * 75 + (hy % 2) * 37.5 + Math.sin(t * 0.3 + hx * 0.2) * 1.5;
          const py = hy * 65 + Math.cos(t * 0.25 + hy * 0.15) * 1;
          ctx.beginPath();
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
            const r = 22 + Math.sin(t * 1.8 + hx * 0.4 + hy * 0.3) * 2;
            i === 0 ? ctx.moveTo(px + Math.cos(a) * r, py + Math.sin(a) * r)
                    : ctx.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r);
          }
          ctx.closePath();
          ctx.strokeStyle = `rgba(167,139,250,${0.045 + Math.sin(t + hx + hy) * 0.02})`;
          ctx.lineWidth = 0.6; ctx.stroke();
        }
      }

      // Move nodes
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.pulse += 0.04;
      });

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(226,18,39,${(1 - dist / 90) * 0.1})`;
            ctx.lineWidth = 0.5; ctx.stroke();
            // random signal spawn
            if (Math.random() < 0.001 && signals.length < 15) {
              signals.push({ i, j, t: 0, speed: 0.015 + Math.random() * 0.02 });
            }
          }
        }
      }

      // Draw signals
      for (let k = signals.length - 1; k >= 0; k--) {
        const sig = signals[k];
        sig.t += sig.speed;
        if (sig.t > 1) { signals.splice(k, 1); continue; }
        const ni = nodes[sig.i], nj = nodes[sig.j];
        const sx = ni.x + (nj.x - ni.x) * sig.t;
        const sy = ni.y + (nj.y - ni.y) * sig.t;
        const alpha = Math.sin(sig.t * Math.PI) * 0.9;
        ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(226,18,39,${alpha})`; ctx.fill();
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 5);
        grd.addColorStop(0, `rgba(226,18,39,${alpha * 0.4})`);
        grd.addColorStop(1, "rgba(226,18,39,0)");
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();
      }

      // Draw nodes
      nodes.forEach(n => {
        const pulse = Math.sin(n.pulse) * 0.5 + 0.5;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + pulse * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = n.color + "b0"; ctx.fill();
      });

      // Bottom gradient line
      const cx = W / 2;
      const g = ctx.createLinearGradient(cx - 300, 0, cx + 300, 0);
      g.addColorStop(0, "rgba(226,18,39,0)");
      g.addColorStop(0.5, "rgba(226,18,39,0.7)");
      g.addColorStop(1, "rgba(226,18,39,0)");
      ctx.beginPath(); ctx.moveTo(cx - 300, H - 1); ctx.lineTo(cx + 300, H - 1);
      ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.stroke();
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 140 }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: 140, display: "block" }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain className="w-8 h-8" style={{ color: "#e21227", filter: "drop-shadow(0 0 10px #e21227)" }} />
            <motion.div className="absolute inset-0 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ border: "1px solid #e21227" }} />
          </div>
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-black tracking-[0.25em]"
              style={{ color: "#fff", textShadow: "0 0 25px rgba(226,18,39,0.9), 0 0 50px rgba(226,18,39,0.4)" }}>
              PERSONA MANAGER
            </h2>
            <p className="text-[9px] font-mono tracking-[0.5em]" style={{ color: "rgba(167,139,250,0.7)" }}>
              IDENTITY MATRIX · QUANTUM COGNITION · NEURAL FORGE
            </p>
          </div>
          <div className="relative">
            <Brain className="w-8 h-8" style={{ color: "#e21227", filter: "drop-shadow(0 0 10px #e21227)" }} />
            <motion.div className="absolute inset-0 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
              style={{ border: "1px solid #e21227" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PersonaCard ───────────────────────────────────────────────────────────────
function PersonaCard({
  persona, isActive, onActivate, onEdit, onDelete, isCustom, isFavorite, onToggleFavorite,
}: {
  persona: PersonaPreset | CustomPersona | typeof MASTERO_PERSONAS[number];
  isActive: boolean;
  onActivate: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isCustom?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = "icon" in persona ? persona.icon : Brain;
  const pCat = "category" in persona ? (persona as { category: string }).category : "mastero";
  const catColor = CATEGORY_META[pCat]?.color ?? "#6366f1";
  const catMeta = CATEGORY_META[pCat];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border overflow-hidden cursor-pointer transition-all"
      style={{
        background: isActive ? `${catColor}10` : "rgba(255,255,255,0.02)",
        borderColor: isActive ? `${catColor}55` : "rgba(255,255,255,0.06)",
        boxShadow: isActive ? `0 0 20px ${catColor}18, 0 0 40px ${catColor}08` : "none",
      }}
      onClick={onActivate}
    >
      <div className="p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative"
          style={{ background: `${catColor}18`, border: `1px solid ${catColor}33` }}>
          <Icon className="w-4.5 h-4.5" style={{ color: catColor }} />
          {isActive && (
            <motion.div className="absolute inset-0 rounded-xl"
              animate={{ opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ border: `1px solid ${catColor}` }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-black" style={{ color: isActive ? catColor : "rgba(255,255,255,0.88)" }}>
              {persona.nameAr || persona.name}
            </span>
            {"badge" in persona && persona.badge && (
              <span className="text-[7px] font-black px-1 rounded"
                style={{ background: `${catColor}22`, color: catColor, border: `1px solid ${catColor}30` }}>
                {persona.badge as string}
              </span>
            )}
            {isCustom && <span className="text-[7px] font-black px-1 rounded bg-violet-500/20 text-violet-400 border border-violet-400/20">CUSTOM</span>}
            {catMeta && (
              <span className="text-[7px] font-bold px-1.5 py-0.5 rounded ml-auto flex items-center gap-0.5"
                style={{ background: `${catColor}15`, color: catColor, border: `1px solid ${catColor}25` }}>
                {catMeta.label}
              </span>
            )}
          </div>
          <p className="text-[9px] text-muted-foreground/50 truncate mt-0.5">
            {"descAr" in persona ? persona.descAr : persona.desc}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onToggleFavorite && (
            <button onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
              title={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}>
              <Heart className="w-3 h-3 transition-colors"
                style={{ color: isFavorite ? "#e21227" : "rgba(255,255,255,0.2)", fill: isFavorite ? "#e21227" : "transparent" }} />
            </button>
          )}
          {isActive && (
            <motion.div animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <Check className="w-3.5 h-3.5" style={{ color: catColor }} />
            </motion.div>
          )}
          <button onClick={e => { e.stopPropagation(); setExpanded(p => !p); }}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors">
            <ChevronDown className="w-3 h-3 text-muted-foreground/40 transition-transform"
              style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-3 pb-3 space-y-2 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {"prompt" in persona && persona.prompt && (
                <div className="mt-2">
                  <p className="text-[8px] font-black text-muted-foreground/40 mb-1 flex items-center gap-1">
                    <Terminal className="w-2.5 h-2.5" /> SYSTEM PROMPT
                  </p>
                  <div className="bg-[#0d0d0d] rounded-xl p-2.5 border border-[#1f1f1f] max-h-28 overflow-y-auto">
                    <p className="text-[9px] font-mono text-muted-foreground/65 leading-relaxed whitespace-pre-wrap">
                      {persona.prompt.slice(0, 350)}{persona.prompt.length > 350 ? "..." : ""}
                    </p>
                  </div>
                </div>
              )}
              {"desc" in persona && (
                <div className="mt-1.5 p-2 rounded-lg" style={{ background: `${catColor}08`, border: `1px solid ${catColor}15` }}>
                  <p className="text-[9px] leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
                    {persona.desc}
                  </p>
                </div>
              )}
              <div className="flex gap-1.5 pt-1">
                <button onClick={e => { e.stopPropagation(); onActivate(); }}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold transition-all"
                  style={{ background: `${catColor}18`, border: `1px solid ${catColor}33`, color: catColor }}>
                  {isActive ? <Check className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
                  {isActive ? "مفعّل" : "تفعيل"}
                </button>
                {onEdit && (
                  <button onClick={e => { e.stopPropagation(); onEdit(); }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-all">
                    <Edit3 className="w-3 h-3" /> تعديل
                  </button>
                )}
                {onDelete && (
                  <button onClick={e => { e.stopPropagation(); onDelete(); }}
                    className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[9px] font-bold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all">
                    <Trash2 className="w-3 h-3" /> حذف
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export function PersonaManagerModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, dispatch } = useStore();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("presets");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>(loadCustomPersonas);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [recentlyUsed, setRecentlyUsed] = useState<string[]>(loadRecentlyUsed);
  const [masteroSearch, setMasteroSearch] = useState("");
  const [masteroActive, setMasteroActive] = useState<string | null>(
    () => localStorage.getItem("mr7-mastero-persona")
  );
  const [activePreset, setActivePreset] = useState<string>(
    () => localStorage.getItem("mr7-active-persona-preset") || "default"
  );
  const [showFavOnly, setShowFavOnly] = useState(false);
  const [importError, setImportError] = useState("");
  const importRef = useRef<HTMLInputElement>(null);

  const allPresets: (PersonaPreset | CustomPersona)[] = [
    ...PERSONA_PRESETS,
    ...customPersonas.map(cp => ({ ...cp, icon: Brain } as unknown as PersonaPreset)),
  ];

  // ── Filter presets ──────────────────────────────────────────────────────────
  const filtered = allPresets.filter(p => {
    if (showFavOnly && !favorites.has(p.id)) return false;
    const matchCat = catFilter === "all" || p.category === catFilter;
    const q = search.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) ||
      ("nameAr" in p ? (p.nameAr ?? "").toLowerCase().includes(q) : false) ||
      (p.desc ?? "").toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  // ── Filter mastero ─────────────────────────────────────────────────────────
  const filteredMastero = MASTERO_PERSONAS.filter(p => {
    if (showFavOnly && !favorites.has(p.id)) return false;
    const q = masteroSearch.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.nameAr.includes(q) || p.desc.includes(q);
  });

  // ── Recently used presets ──────────────────────────────────────────────────
  const recentPresets = recentlyUsed
    .map(id => allPresets.find(p => p.id === id))
    .filter(Boolean) as (PersonaPreset | CustomPersona)[];

  // ── Activate preset ─────────────────────────────────────────────────────────
  const activate = useCallback((id: string) => {
    setActivePreset(id);
    localStorage.setItem("mr7-active-persona-preset", id);
    addToRecent(id);
    setRecentlyUsed(loadRecentlyUsed());
    const preset = allPresets.find(p => p.id === id);
    const promptText = (preset && "prompt" in preset && preset.prompt) ? preset.prompt : "";
    dispatch({ type: "SET_CUSTOM_INSTRUCTIONS", text: promptText });
    if (promptText) localStorage.setItem("mr7-custom-system-prompt", promptText);
    else localStorage.removeItem("mr7-custom-system-prompt");
    const nameLabel = preset ? (preset.nameAr || preset.name) : id;
    toast({ description: `تم تفعيل: ${nameLabel}`, duration: 2000 });
  }, [allPresets, dispatch, toast]);

  // ── Activate mastero ────────────────────────────────────────────────────────
  const activateMastero = useCallback((id: string) => {
    const next = masteroActive === id ? null : id;
    setMasteroActive(next);
    if (next) {
      localStorage.setItem("mr7-mastero-persona", next);
      const p = MASTERO_PERSONAS.find(x => x.id === next);
      toast({ description: `MASTERO نشط: ${p?.nameAr}`, duration: 2000 });
    } else {
      localStorage.removeItem("mr7-mastero-persona");
    }
  }, [masteroActive, toast]);

  // ── Toggle favorite ─────────────────────────────────────────────────────────
  const toggleFavorite = useCallback((id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveFavorites(next);
      return next;
    });
  }, []);

  // ── Editor helpers ─────────────────────────────────────────────────────────
  const openEditor = (cp?: CustomPersona) => {
    if (cp) setEditor({ open: true, editingId: cp.id, name: cp.name, nameAr: cp.nameAr, desc: cp.desc, color: cp.color, category: cp.category, prompt: cp.prompt });
    else setEditor({ ...EMPTY_EDITOR, open: true });
  };

  const saveEditor = () => {
    if (!editor.name.trim()) return;
    const updated = [...customPersonas];
    if (editor.editingId) {
      const idx = updated.findIndex(p => p.id === editor.editingId);
      if (idx !== -1) updated[idx] = { ...updated[idx], name: editor.name, nameAr: editor.nameAr, desc: editor.desc, color: editor.color, category: editor.category, prompt: editor.prompt };
    } else {
      updated.push({ id: `custom-${Date.now()}`, name: editor.name, nameAr: editor.nameAr || editor.name, desc: editor.desc, color: editor.color, category: editor.category, prompt: editor.prompt, createdAt: Date.now() });
    }
    saveCustomPersonas(updated); setCustomPersonas(updated); setEditor(EMPTY_EDITOR);
    toast({ description: "تم حفظ الشخصية", duration: 2000 });
  };

  const deleteCustom = (id: string) => {
    const updated = customPersonas.filter(p => p.id !== id);
    saveCustomPersonas(updated); setCustomPersonas(updated);
    if (activePreset === id) setActivePreset("default");
  };

  // ── Clone preset as custom ─────────────────────────────────────────────────
  const clonePersona = (p: PersonaPreset | CustomPersona) => {
    const newP: CustomPersona = {
      id: `custom-${Date.now()}`,
      name: `${p.name} (نسخة)`,
      nameAr: `${p.nameAr || p.name} (نسخة)`,
      desc: p.desc,
      color: "color" in p ? (p.color ?? "#e21227") : "#e21227",
      category: p.category,
      prompt: "prompt" in p ? (p.prompt ?? "") : "",
      createdAt: Date.now(),
    };
    const updated = [...customPersonas, newP];
    saveCustomPersonas(updated); setCustomPersonas(updated);
    toast({ description: `تم نسخ: ${p.nameAr || p.name}`, duration: 2000 });
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const exportAll = () => {
    const data = JSON.stringify({
      version: 2,
      exportedAt: new Date().toISOString(),
      custom: customPersonas,
      favorites: [...favorites],
    }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mr7-personas.json"; a.click();
    URL.revokeObjectURL(url);
    toast({ description: "تم تصدير الشخصيات", duration: 2000 });
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        const imported: CustomPersona[] = data.custom ?? data.personas ?? [];
        if (!Array.isArray(imported)) throw new Error("تنسيق غير صحيح");
        const merged = [...customPersonas];
        let added = 0;
        imported.forEach(p => {
          if (!merged.some(m => m.id === p.id)) {
            merged.push({ ...p, id: `import-${Date.now()}-${added}` });
            added++;
          }
        });
        saveCustomPersonas(merged); setCustomPersonas(merged);
        setImportError("");
        toast({ description: `تم استيراد ${added} شخصية`, duration: 2500 });
        setTab("custom");
      } catch (err) {
        setImportError((err as Error).message || "خطأ في الملف");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const cats = ["all", ...Object.keys(CATEGORY_META).filter(c => c !== "mastero")];

  // ── Stats ─────────────────────────────────────────────────────────────────
  const catStats = Object.entries(CATEGORY_META).filter(([k]) => k !== "mastero").map(([cat, meta]) => ({
    cat, ...meta, count: allPresets.filter(p => p.category === cat).length,
  }));

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-3"
          style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(14px)" }}
          onClick={e => e.target === e.currentTarget && onClose()}>
          <motion.div initial={{ scale: 0.91, y: 28 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.91, y: 28 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl border overflow-hidden"
            style={{ background: "rgba(7,7,12,0.99)", borderColor: "rgba(226,18,39,0.32)", boxShadow: "0 0 90px rgba(226,18,39,0.16), 0 0 200px rgba(0,0,0,0.85), inset 0 1px 0 rgba(226,18,39,0.08)" }}>

            <HolographicHeader />

            {/* ── Tab bar ─────────────────────────────────────────────── */}
            <div className="flex items-center gap-0.5 px-4 pt-3 pb-0 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {([
                { id: "presets",    label: "شخصيات محددة مسبقاً",   icon: Brain,         count: allPresets.length     },
                { id: "mastero",    label: "MASTERO",                 icon: Crown,         count: MASTERO_PERSONAS.length },
                { id: "custom",     label: "شخصياتي",                 icon: Star,          count: customPersonas.length },
                { id: "stats",      label: "إحصائيات",                icon: BarChart2,     count: null                },
                { id: "threatfeed", label: "تهديدات",                 icon: AlertTriangle, count: null                },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-t-xl text-[10px] font-bold border-b-2 transition-all"
                  style={{
                    borderBottomColor: tab === t.id ? "#e21227" : "transparent",
                    color: tab === t.id ? "#e21227" : "rgba(255,255,255,0.4)",
                    background: tab === t.id ? "rgba(226,18,39,0.07)" : "transparent",
                  }}>
                  <t.icon className="w-3 h-3" />
                  {t.label}
                  {t.count !== null && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full font-black"
                      style={{ background: tab === t.id ? "rgba(226,18,39,0.2)" : "rgba(255,255,255,0.06)", color: tab === t.id ? "#e21227" : "rgba(255,255,255,0.3)" }}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
              {/* Right controls */}
              <div className="ml-auto flex items-center gap-1.5 pb-1">
                <button onClick={() => setShowFavOnly(f => !f)}
                  className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[9px] font-bold border transition-all"
                  style={{
                    background: showFavOnly ? "rgba(226,18,39,0.12)" : "transparent",
                    borderColor: showFavOnly ? "rgba(226,18,39,0.35)" : "rgba(255,255,255,0.08)",
                    color: showFavOnly ? "#e21227" : "rgba(255,255,255,0.35)",
                  }}>
                  <Heart className="w-3 h-3" style={{ fill: showFavOnly ? "#e21227" : "transparent" }} />
                  المفضلة
                </button>
                <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
                <button onClick={() => importRef.current?.click()}
                  className="p-2 rounded-xl border border-[#2a2a2a] text-muted-foreground hover:text-foreground transition-colors" title="استيراد JSON">
                  <Upload className="w-3.5 h-3.5" />
                </button>
                <button onClick={exportAll}
                  className="p-2 rounded-xl border border-[#2a2a2a] text-muted-foreground hover:text-foreground transition-colors" title="تصدير JSON">
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button onClick={onClose}
                  className="p-2 rounded-xl border border-[#2a2a2a] text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* ── Stats bar ────────────────────────────────────────────── */}
            <div className="flex items-center gap-4 px-4 py-2 border-b" style={{ background: "rgba(226,18,39,0.025)", borderColor: "rgba(255,255,255,0.04)" }}>
              {[
                { label: "إجمالي", val: allPresets.length + MASTERO_PERSONAS.length, color: "#e21227" },
                { label: "مخصص",  val: customPersonas.length,                        color: "#a78bfa" },
                { label: "مفضلة", val: favorites.size,                               color: "#e21227" },
                { label: "نشط",   val: activePreset ? 1 : 0,                         color: "#22c55e" },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                  <span className="text-[9px] font-bold" style={{ color: s.color }}>{s.val}</span>
                  <span className="text-[8px] text-muted-foreground/40">{s.label}</span>
                </div>
              ))}
              <div className="ml-auto flex items-center gap-1.5">
                <Activity className="w-3 h-3" style={{ color: "rgba(226,18,39,0.5)" }} />
                <span className="text-[9px] text-muted-foreground/40">نشط:</span>
                <span className="text-[9px] font-bold" style={{ color: "#e21227" }}>
                  {allPresets.find(p => p.id === activePreset)?.nameAr || allPresets.find(p => p.id === activePreset)?.name || "—"}
                </span>
              </div>
              {importError && (
                <span className="text-[9px] text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {importError}
                </span>
              )}
            </div>

            {/* ── Main content ──────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(226,18,39,0.3) transparent" }}>

              {/* ── PRESETS TAB ────────────────────────────────────────── */}
              {tab === "presets" && (
                <div className="flex flex-col h-full">
                  {/* Controls */}
                  <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
                      <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="بحث في الشخصيات..."
                        className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(226,18,39,0.4)] rounded-xl pl-9 pr-3 py-1.5 text-[11px] outline-none placeholder:text-muted-foreground/20 transition-colors" />
                    </div>
                    <div className="flex items-center gap-1">
                      {cats.map(cat => {
                        const meta = cat === "all" ? null : CATEGORY_META[cat];
                        return (
                          <button key={cat} onClick={() => setCatFilter(cat)}
                            className="px-2.5 py-1.5 rounded-xl text-[9px] font-bold border transition-all"
                            style={{
                              background: catFilter === cat ? `${meta?.color ?? "#e21227"}18` : "rgba(255,255,255,0.03)",
                              borderColor: catFilter === cat ? `${meta?.color ?? "#e21227"}44` : "rgba(255,255,255,0.07)",
                              color: catFilter === cat ? meta?.color ?? "#e21227" : "rgba(255,255,255,0.4)",
                            }}>
                            {cat === "all" ? "الكل" : meta?.label}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      {([["list", List], ["grid", Grid]] as const).map(([v, Icon]) => (
                        <button key={v} onClick={() => setViewMode(v)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ background: viewMode === v ? "rgba(226,18,39,0.2)" : "transparent", color: viewMode === v ? "#e21227" : "rgba(255,255,255,0.3)" }}>
                          <Icon className="w-3.5 h-3.5" />
                        </button>
                      ))}
                    </div>
                    <button onClick={() => { setTab("custom"); openEditor(); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                      style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}>
                      <Plus className="w-3.5 h-3.5" /> شخصية جديدة
                    </button>
                  </div>

                  <div className="p-4 space-y-4 flex-1">
                    {/* Recently used */}
                    {recentPresets.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Clock className="w-3 h-3" style={{ color: "rgba(167,139,250,0.5)" }} />
                          <span className="text-[9px] font-black text-muted-foreground/40 tracking-wider uppercase">استُخدم مؤخراً</span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {recentPresets.slice(0, 5).map(p => {
                            const pCat2r = "category" in p ? (p as { category: string }).category : "mastero";
                            const catColor2 = CATEGORY_META[pCat2r]?.color ?? "#6366f1";
                            return (
                              <button key={p.id} onClick={() => activate(p.id)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-bold border transition-all"
                                style={{
                                  background: activePreset === p.id ? `${catColor2}18` : "rgba(255,255,255,0.03)",
                                  borderColor: activePreset === p.id ? `${catColor2}44` : "rgba(255,255,255,0.07)",
                                  color: activePreset === p.id ? catColor2 : "rgba(255,255,255,0.55)",
                                }}>
                                {activePreset === p.id && <div className="w-1.5 h-1.5 rounded-full" style={{ background: catColor2 }} />}
                                {p.nameAr || p.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Persona list */}
                    <AnimatePresence mode="wait">
                      {editor.open ? (
                        <motion.div key="editor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                          className="space-y-4 max-w-2xl">
                          <div className="flex items-center gap-2 mb-2">
                            <Edit3 className="w-4 h-4" style={{ color: "#a78bfa" }} />
                            <span className="text-sm font-black">{editor.editingId ? "تعديل الشخصية" : "شخصية جديدة"}</span>
                            <button onClick={() => setEditor(EMPTY_EDITOR)} className="ml-auto p-1.5 rounded-lg hover:bg-white/5">
                              <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { label: "الاسم بالإنجليزي", key: "name" as const, placeholder: "KaliHacker Elite" },
                              { label: "الاسم بالعربي",    key: "nameAr" as const, placeholder: "نخبة كالي هاكر" },
                            ].map(f => (
                              <div key={f.key} className="space-y-1">
                                <label className="text-[9px] font-black text-muted-foreground/50">{f.label}</label>
                                <input value={editor[f.key]} onChange={e => setEditor(p => ({ ...p, [f.key]: e.target.value }))}
                                  placeholder={f.placeholder}
                                  className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-2 text-[11px] outline-none transition-colors" />
                              </div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-muted-foreground/50">الوصف</label>
                            <input value={editor.desc} onChange={e => setEditor(p => ({ ...p, desc: e.target.value }))}
                              placeholder="وصف مختصر للشخصية..."
                              className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-2 text-[11px] outline-none transition-colors" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-muted-foreground/50">الفئة</label>
                              <select value={editor.category} onChange={e => setEditor(p => ({ ...p, category: e.target.value }))}
                                className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-2 text-[11px] outline-none transition-colors">
                                {Object.entries(CATEGORY_META).filter(([k]) => k !== "mastero").map(([k, v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-muted-foreground/50">اللون</label>
                              <div className="flex items-center gap-2">
                                <input type="color" value={editor.color} onChange={e => setEditor(p => ({ ...p, color: e.target.value }))}
                                  className="w-10 h-9 rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] cursor-pointer" />
                                <div className="flex-1 h-9 rounded-xl border border-[#1f1f1f] px-3 flex items-center">
                                  <span className="text-[11px] font-mono" style={{ color: editor.color }}>{editor.color}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-muted-foreground/50">نظام الشخصية (System Prompt)</label>
                            <textarea value={editor.prompt} onChange={e => setEditor(p => ({ ...p, prompt: e.target.value }))}
                              placeholder="اكتب تعليمات الشخصية هنا... مثال: أنت خبير أمن سيبراني متخصص في اختبار الاختراق..."
                              rows={6} className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-2 text-[11px] outline-none resize-none transition-colors font-mono leading-relaxed" />
                          </div>
                          <div className="flex gap-2">
                            <motion.button onClick={saveEditor} disabled={!editor.name.trim()}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold disabled:opacity-40 transition-all"
                              style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}
                              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Save className="w-3.5 h-3.5" /> حفظ الشخصية
                            </motion.button>
                            <button onClick={() => setEditor(EMPTY_EDITOR)}
                              className="px-4 py-2 rounded-xl text-[11px] font-bold border border-[#2a2a2a] text-muted-foreground hover:text-foreground transition-colors">
                              إلغاء
                            </button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className={viewMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"}>
                          {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground/30 col-span-2">
                              <Brain className="w-10 h-10 mb-3" />
                              <p className="text-sm">لا توجد شخصيات</p>
                              <p className="text-xs mt-1">جرّب فلتراً مختلفاً أو أضف شخصية جديدة</p>
                            </div>
                          ) : filtered.map(p => {
                            const isCustom = customPersonas.some(c => c.id === p.id);
                            return (
                              <PersonaCard key={p.id} persona={p} isActive={activePreset === p.id}
                                onActivate={() => activate(p.id)}
                                onEdit={isCustom ? () => openEditor(customPersonas.find(c => c.id === p.id)) : undefined}
                                onDelete={isCustom ? () => deleteCustom(p.id) : undefined}
                                isCustom={isCustom}
                                isFavorite={favorites.has(p.id)}
                                onToggleFavorite={() => toggleFavorite(p.id)} />
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {/* ── MASTERO TAB ────────────────────────────────────────── */}
              {tab === "mastero" && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <Crown className="w-4 h-4" style={{ color: "#a78bfa", filter: "drop-shadow(0 0 6px #a78bfa)" }} />
                    <span className="text-sm font-black" style={{ color: "#a78bfa" }}>MASTERO PERSONAS</span>
                    <span className="text-[9px] text-muted-foreground/40">شخصيات النظام العليا</span>
                    <span className="ml-auto text-[9px] font-mono px-2 py-1 rounded-lg" style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
                      {MASTERO_PERSONAS.length} شخصية
                    </span>
                  </div>

                  {/* Active mastero badge */}
                  {masteroActive && (() => {
                    const mp = MASTERO_PERSONAS.find(p => p.id === masteroActive);
                    return mp ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: `${mp.color}10`, border: `1px solid ${mp.color}30` }}>
                        <motion.div className="w-2 h-2 rounded-full" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                          style={{ background: mp.color, boxShadow: `0 0 8px ${mp.color}` }} />
                        <span className="text-[10px] font-black" style={{ color: mp.color }}>MASTERO نشط: {mp.nameAr}</span>
                        <span className="text-[9px] text-muted-foreground/40">{mp.name}</span>
                        <button onClick={() => activateMastero(masteroActive)} className="ml-auto p-1 rounded hover:bg-white/5">
                          <X className="w-3 h-3 text-muted-foreground/50" />
                        </button>
                      </div>
                    ) : null;
                  })()}

                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/30" />
                    <input value={masteroSearch} onChange={e => setMasteroSearch(e.target.value)}
                      placeholder="بحث في شخصيات MASTERO..."
                      className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl pl-9 pr-3 py-1.5 text-[11px] outline-none placeholder:text-muted-foreground/20 transition-colors" />
                  </div>

                  {/* Mastero grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {filteredMastero.map(p => {
                      const isActive = masteroActive === p.id;
                      return (
                        <motion.button key={p.id}
                          onClick={() => activateMastero(p.id)}
                          className="flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all"
                          style={{
                            background: isActive ? `${p.color}12` : "rgba(255,255,255,0.02)",
                            borderColor: isActive ? `${p.color}50` : "rgba(255,255,255,0.06)",
                            boxShadow: isActive ? `0 0 16px ${p.color}18` : "none",
                          }}
                          whileHover={{ scale: 1.01, background: `rgba(255,255,255,0.03)` }}
                          whileTap={{ scale: 0.98 }}>
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                            style={{ background: `${p.color}18`, border: `1px solid ${p.color}33` }}>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: p.color, boxShadow: isActive ? `0 0 8px ${p.color}` : "none" }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-black truncate" style={{ color: isActive ? p.color : "rgba(255,255,255,0.82)" }}>
                                {p.nameAr}
                              </span>
                              {p.badge && (
                                <span className="text-[6px] font-black px-1 rounded" style={{ background: `${p.color}20`, color: p.color }}>
                                  {p.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[8px] text-muted-foreground/35 truncate">{p.desc}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={e => { e.stopPropagation(); toggleFavorite(p.id); }}
                              className="p-1 rounded hover:bg-white/5">
                              <Heart className="w-2.5 h-2.5" style={{ color: favorites.has(p.id) ? "#e21227" : "rgba(255,255,255,0.15)", fill: favorites.has(p.id) ? "#e21227" : "transparent" }} />
                            </button>
                            {isActive && <Check className="w-3 h-3" style={{ color: p.color }} />}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                  {filteredMastero.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground/30">
                      <Crown className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">لا نتائج للبحث</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── CUSTOM TAB ─────────────────────────────────────────── */}
              {tab === "custom" && (
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4" style={{ color: "#f59e0b" }} />
                    <span className="text-sm font-black">شخصياتي المخصصة</span>
                    <span className="ml-auto text-[9px] font-mono px-2 py-1 rounded-lg" style={{ background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" }}>
                      {customPersonas.length} شخصية
                    </span>
                    <button onClick={() => openEditor()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                      style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)", color: "#e21227" }}>
                      <Plus className="w-3.5 h-3.5" /> جديد
                    </button>
                  </div>

                  <AnimatePresence>
                    {editor.open && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden rounded-2xl border p-4" style={{ borderColor: "rgba(167,139,250,0.25)", background: "rgba(167,139,250,0.04)" }}>
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4" style={{ color: "#a78bfa" }} />
                          <span className="text-sm font-black">{editor.editingId ? "تعديل الشخصية" : "شخصية جديدة"}</span>
                          <button onClick={() => setEditor(EMPTY_EDITOR)} className="ml-auto p-1.5 rounded-lg hover:bg-white/5">
                            <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: "الاسم بالإنجليزي", key: "name" as const, placeholder: "KaliHacker Elite" },
                            { label: "الاسم بالعربي",    key: "nameAr" as const, placeholder: "نخبة كالي هاكر" },
                          ].map(f => (
                            <div key={f.key} className="space-y-1">
                              <label className="text-[9px] font-black text-muted-foreground/50">{f.label}</label>
                              <input value={editor[f.key]} onChange={e => setEditor(p => ({ ...p, [f.key]: e.target.value }))}
                                placeholder={f.placeholder}
                                className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-2 text-[11px] outline-none transition-colors" />
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-muted-foreground/50">الوصف</label>
                          <input value={editor.desc} onChange={e => setEditor(p => ({ ...p, desc: e.target.value }))}
                            placeholder="وصف مختصر للشخصية..." className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-2 text-[11px] outline-none transition-colors" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-muted-foreground/50">الفئة</label>
                            <select value={editor.category} onChange={e => setEditor(p => ({ ...p, category: e.target.value }))}
                              className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-2 text-[11px] outline-none transition-colors">
                              {Object.entries(CATEGORY_META).filter(([k]) => k !== "mastero").map(([k, v]) => (
                                <option key={k} value={k}>{v.label}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-muted-foreground/50">اللون</label>
                            <div className="flex items-center gap-2">
                              <input type="color" value={editor.color} onChange={e => setEditor(p => ({ ...p, color: e.target.value }))}
                                className="w-10 h-9 rounded-xl border border-[#1f1f1f] bg-[#0d0d0d] cursor-pointer" />
                              <div className="flex-1 h-9 rounded-xl border border-[#1f1f1f] px-3 flex items-center">
                                <span className="text-[11px] font-mono" style={{ color: editor.color }}>{editor.color}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-muted-foreground/50">نظام الشخصية (System Prompt)</label>
                          <textarea value={editor.prompt} onChange={e => setEditor(p => ({ ...p, prompt: e.target.value }))}
                            placeholder="اكتب تعليمات الشخصية هنا..."
                            rows={5} className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-2 text-[11px] outline-none resize-none transition-colors font-mono leading-relaxed" />
                        </div>
                        <div className="flex gap-2">
                          <motion.button onClick={saveEditor} disabled={!editor.name.trim()}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold disabled:opacity-40 transition-all"
                            style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#a78bfa" }}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Save className="w-3.5 h-3.5" /> حفظ الشخصية
                          </motion.button>
                          <button onClick={() => setEditor(EMPTY_EDITOR)}
                            className="px-4 py-2 rounded-xl text-[11px] font-bold border border-[#2a2a2a] text-muted-foreground hover:text-foreground transition-colors">
                            إلغاء
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {customPersonas.length === 0 && !editor.open ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/30">
                      <Plus className="w-10 h-10 mb-3" />
                      <p className="text-sm">لا توجد شخصيات مخصصة بعد</p>
                      <p className="text-xs mt-1">اضغط "جديد" لإنشاء شخصية مخصصة</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customPersonas.map(cp => (
                        <PersonaCard key={cp.id}
                          persona={{ ...cp, icon: Brain } as unknown as PersonaPreset}
                          isActive={activePreset === cp.id}
                          onActivate={() => activate(cp.id)}
                          onEdit={() => openEditor(cp)}
                          onDelete={() => deleteCustom(cp.id)}
                          isCustom
                          isFavorite={favorites.has(cp.id)}
                          onToggleFavorite={() => toggleFavorite(cp.id)} />
                      ))}
                    </div>
                  )}

                  {/* Clone from presets section */}
                  <div className="border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <p className="text-[9px] font-black text-muted-foreground/40 mb-2 flex items-center gap-1">
                      <Copy className="w-3 h-3" /> استنساخ من الشخصيات المحددة مسبقاً
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {PERSONA_PRESETS.slice(0, 8).map(p => (
                        <button key={p.id} onClick={() => clonePersona(p)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[9px] font-bold border transition-all hover:border-white/20 hover:bg-white/5"
                          style={{ borderColor: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.45)" }}>
                          <Copy className="w-2.5 h-2.5" />
                          {p.nameAr || p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── STATS TAB ──────────────────────────────────────────── */}
              {tab === "stats" && (
                <div className="p-4 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Category breakdown */}
                    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                      <h3 className="text-[10px] font-black text-muted-foreground/50 flex items-center gap-1.5">
                        <Layers className="w-3 h-3" /> توزيع الفئات
                      </h3>
                      {catStats.map(s => (
                        <div key={s.cat} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                              <span className="text-[9px] font-bold" style={{ color: s.color }}>{s.label}</span>
                            </div>
                            <span className="text-[9px] font-mono" style={{ color: s.color }}>{s.count}</span>
                          </div>
                          <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                            <motion.div className="h-full rounded-full"
                              initial={{ width: 0 }} animate={{ width: `${(s.count / allPresets.length) * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.1 }}
                              style={{ background: s.color }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary stats */}
                    <div className="rounded-2xl border p-4 space-y-3" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                      <h3 className="text-[10px] font-black text-muted-foreground/50 flex items-center gap-1.5">
                        <BarChart2 className="w-3 h-3" /> إحصائيات عامة
                      </h3>
                      {[
                        { label: "إجمالي الشخصيات (محددة مسبقاً)",   val: PERSONA_PRESETS.length,    color: "#e21227" },
                        { label: "شخصيات MASTERO",                    val: MASTERO_PERSONAS.length,   color: "#a78bfa" },
                        { label: "شخصيات مخصصة",                      val: customPersonas.length,     color: "#f59e0b" },
                        { label: "إجمالي المفضلة",                    val: favorites.size,            color: "#e21227" },
                        { label: "استُخدم مؤخراً",                    val: recentlyUsed.length,       color: "#22c55e" },
                      ].map(s => (
                        <div key={s.label} className="flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground/50">{s.label}</span>
                          <span className="text-[9px] font-black" style={{ color: s.color }}>{s.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Favorites list */}
                  {favorites.size > 0 && (
                    <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: "rgba(226,18,39,0.15)", background: "rgba(226,18,39,0.03)" }}>
                      <h3 className="text-[10px] font-black text-muted-foreground/50 flex items-center gap-1.5">
                        <Heart className="w-3 h-3" style={{ color: "#e21227", fill: "#e21227" }} /> المفضلة
                      </h3>
                      <div className="flex gap-1.5 flex-wrap">
                        {[...favorites].map(id => {
                          const p = [...allPresets, ...MASTERO_PERSONAS].find(x => x.id === id);
                          if (!p) return null;
                          const pCat2f = "category" in p ? (p as { category: string }).category : "mastero";
                          const catColor2 = CATEGORY_META[pCat2f]?.color ?? "#6366f1";
                          return (
                            <div key={id} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-bold border"
                              style={{ background: `${catColor2}10`, borderColor: `${catColor2}30`, color: catColor2 }}>
                              {p.nameAr || p.name}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tips */}
                  <div className="rounded-2xl border p-4 space-y-2" style={{ borderColor: "rgba(167,139,250,0.15)", background: "rgba(167,139,250,0.04)" }}>
                    <h3 className="text-[10px] font-black" style={{ color: "#a78bfa" }}>نصائح الاستخدام</h3>
                    {[
                      "اضغط على أي شخصية لتفعيلها وحقن إيحائها في كل المحادثات",
                      "شخصيات MASTERO مصممة للمهام الأمنية المتقدمة والعمليات الحساسة",
                      "يمكنك نسخ أي شخصية محددة مسبقاً وتعديلها حسب احتياجاتك",
                      "صدّر شخصياتك لمشاركتها أو نسخها احتياطياً",
                    ].map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: "#a78bfa" }} />
                        <p className="text-[9px] text-muted-foreground/55">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── THREAT FEED TAB ──────────────────────────────────── */}
              {tab === "threatfeed" && (
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4" style={{ color: "#e21227" }} />
                    <span className="text-xs font-black tracking-widest uppercase" style={{ color: "#e21227" }}>تغذية التهديدات المباشرة</span>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse ml-1" style={{ background: "#22c55e", boxShadow: "0 0 4px #22c55e" }} />
                    <span className="text-[8px] font-mono ml-0.5" style={{ color: "#22c55e" }}>LIVE</span>
                  </div>

                  {/* Threat matrix */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: "التهديدات الحرجة", count: 14, color: "#e21227", icon: "⬛" },
                      { label: "تهديدات عالية",    count: 31, color: "#f97316", icon: "⬛" },
                      { label: "تهديدات متوسطة",  count: 78, color: "#fbbf24", icon: "⬛" },
                      { label: "تهديدات منخفضة",  count: 142, color: "#22c55e", icon: "⬛" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="rounded-xl p-3 border flex items-center gap-3"
                        style={{ background: `${color}0a`, borderColor: `${color}25` }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}18` }}>
                          <AlertTriangle className="w-4 h-4" style={{ color }} />
                        </div>
                        <div>
                          <div className="text-lg font-black leading-none" style={{ color }}>{count}</div>
                          <div className="text-[9px] text-muted-foreground/50 mt-0.5">{label}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Live feed list */}
                  <div className="space-y-1.5">
                    {[
                      { time: "09:47", sev: "CRITICAL" as const, actor: "APT29 (Cozy Bear)", target: "وكالات حكومية أوروبية", method: "Spear Phishing + Zero-Day CVE-2025-0282" },
                      { time: "09:31", sev: "HIGH" as const,     actor: "Lazarus Group",    target: "منصات DeFi آسيا",         method: "Supply Chain Attack — npm malicious pkg" },
                      { time: "09:18", sev: "CRITICAL" as const, actor: "Sandworm",          target: "شبكات طاقة أوكرانيا",    method: "ICSSCADA Wiper + RDP brute-force" },
                      { time: "09:05", sev: "HIGH" as const,     actor: "FIN7",              target: "سلاسل متاجر تجزئة USA",   method: "POS Malware via phishing doc macro" },
                      { time: "08:54", sev: "CRITICAL" as const, actor: "Volt Typhoon",      target: "بنية تحتية أمريكية",    method: "Living-off-the-land + LOTL persistence" },
                      { time: "08:39", sev: "HIGH" as const,     actor: "REvil Remnants",    target: "مستشفيات وصحة EU",       method: "Ransomware-as-a-Service double extortion" },
                      { time: "08:22", sev: "HIGH" as const,     actor: "Scattered Spider", target: "شركات SaaS US",           method: "SIM Swapping + MFA fatigue attack" },
                    ].map((t, i) => {
                      const sevColor: Record<string, string> = { CRITICAL: "#e21227", HIGH: "#f97316", MEDIUM: "#fbbf24", LOW: "#22c55e" };
                      const c = sevColor[t.sev];
                      return (
                        <motion.div key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="rounded-xl border p-3"
                          style={{ background: `${c}08`, borderColor: `${c}20` }}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded"
                              style={{ background: `${c}20`, color: c, border: `1px solid ${c}40` }}>{t.sev}</span>
                            <span className="text-[9px] font-black" style={{ color: c }}>{t.actor}</span>
                            <span className="ml-auto text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.25)" }}>{t.time}</span>
                          </div>
                          <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>الهدف: <span style={{ color: "rgba(255,255,255,0.7)" }}>{t.target}</span></div>
                          <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{t.method}</div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Recommended persona */}
                  <div className="mt-4 p-3 rounded-xl border" style={{ borderColor: "rgba(167,139,250,0.2)", background: "rgba(167,139,250,0.05)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
                      <span className="text-[9px] font-black" style={{ color: "#a78bfa" }}>شخصية موصى بها لهذا التهديد</span>
                    </div>
                    <button onClick={() => { const p = allPresets.find(p => p.category === "threat-intel" || p.category === "offensive"); if (p) activate(p.id); setTab("presets"); }}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-bold border transition-all hover:bg-red-500/10"
                      style={{ background: "rgba(226,18,39,0.08)", borderColor: "rgba(226,18,39,0.25)", color: "#e21227" }}>
                      <Crosshair className="w-3 h-3" />
                      استخدم شخصية تحليل التهديدات
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
