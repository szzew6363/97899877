import { useEffect, useRef, useState, useCallback } from "react";
import {
  Cpu, Shield, Brain, Zap, Activity, Eye, Terminal, Sword, Globe,
  Lock, Unlock, RefreshCw, Settings, Radio, Network, Star, Crown,
  ChevronRight, X, Check, Copy, Flame, AlertTriangle, BarChart3,
  Crosshair, Radar, Bug, Wifi, Database, Target, Ghost, Dna,
  Layers, FlameKindling, Skull, Atom, Satellite, HardDrive, Binary,
  Fingerprint, Swords, Biohazard, TrendingUp, ChevronLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { perfMonitor } from "@/lib/perf-monitor";
import { securityLayer } from "@/lib/security-layer";
import { contextMemory } from "@/lib/context-memory";
import { requestDedup } from "@/lib/request-dedup";
import { prefetchEngine } from "@/lib/prefetch-engine";
import { anomalyDetector } from "@/lib/anomaly-detector";

const SIZE = 300;

type SystemDef = {
  id: string; label: string; shortLabel: string; color: string;
  getValue: () => number; getStatus: () => string; angle: number;
};

export type HUDPanel = {
  onOpenPerf?: () => void; onOpenCost?: () => void; onOpenDedup?: () => void;
  onOpenThreat?: () => void; onOpenSecurity?: () => void; onOpenMemory?: () => void;
  onOpenPrefetch?: () => void;
};

// ── MASTERO MODES (65 modes) ────────────────────────────────────────────────
const MASTERO_MODES = [
  { id: "guardian",    label: "Guardian",       labelAr: "الحارس",              icon: Shield,      color: "#22c55e", desc: "حماية قصوى لجميع الأنظمة" },
  { id: "hunter",      label: "Hunter",         labelAr: "الصائد",              icon: Eye,         color: "#e21227", desc: "استهداف وتتبع التهديدات" },
  { id: "phantom",     label: "Phantom",        labelAr: "الشبح",               icon: Ghost,       color: "#6366f1", desc: "عمليات خفية وغير مرصودة" },
  { id: "overload",    label: "Overload",       labelAr: "الحمل الزائد",        icon: Zap,         color: "#f97316", desc: "أقصى أداء لجميع الموارد" },
  { id: "analyst",     label: "Analyst",        labelAr: "المحلل",              icon: Brain,       color: "#a78bfa", desc: "تحليل عميق وذكي لكل البيانات" },
  { id: "warzone",     label: "War Zone",       labelAr: "منطقة الحرب",         icon: Sword,       color: "#dc2626", desc: "وضع قتالي كامل بلا قيود" },
  { id: "silence",     label: "Silence",        labelAr: "الصمت",               icon: Lock,        color: "#06b6d4", desc: "تقليل الضجيج الرقمي للحد الأدنى" },
  { id: "oracle",      label: "Oracle",         labelAr: "الأوراكل",            icon: Star,        color: "#fbbf24", desc: "توقع واستشراف ذكي" },
  { id: "apex",        label: "APEX",           labelAr: "القمة",               icon: Crown,       color: "#e21227", desc: "القيادة الكاملة لجميع الأنظمة", badge: "ELITE" },
  { id: "recon",       label: "Recon",          labelAr: "الاستطلاع",           icon: Radar,       color: "#38bdf8", desc: "مسح شامل وجمع المعلومات" },
  { id: "infiltrate",  label: "Infiltrate",     labelAr: "التسلل",              icon: Crosshair,   color: "#c084fc", desc: "اختراق صامت متعدد المراحل" },
  { id: "exploit",     label: "Exploit",        labelAr: "الاستغلال",           icon: Bug,         color: "#f43f5e", desc: "استغلال الثغرات في الوقت الحقيقي" },
  { id: "lockdown",    label: "Lockdown",       labelAr: "الإغلاق التام",       icon: HardDrive,   color: "#94a3b8", desc: "قفل كامل لجميع المخرجات" },
  { id: "signal",      label: "Signal",         labelAr: "الإشارة",             icon: Radio,       color: "#22d3ee", desc: "مراقبة وفحص كل الإشارات" },
  { id: "payload",     label: "Payload",        labelAr: "الحمولة",             icon: Database,    color: "#fb923c", desc: "تجهيز ونشر الحمولات الهجومية" },
  { id: "sniper",      label: "Sniper",         labelAr: "القناص",              icon: Target,      color: "#4ade80", desc: "ضربات دقيقة محددة الهدف" },
  { id: "quantum",     label: "Quantum",        labelAr: "الكمي",               icon: Atom,        color: "#818cf8", desc: "معالجة كمية فائقة السرعة" },
  { id: "satellite",   label: "Satellite",      labelAr: "الساتل",              icon: Satellite,   color: "#67e8f9", desc: "مراقبة شاملة من منظور عالٍ" },
  { id: "network",     label: "Network",        labelAr: "الشبكة",              icon: Wifi,        color: "#34d399", desc: "هيمنة كاملة على البنية الشبكية" },
  { id: "neural",      label: "Neural",         labelAr: "العصبي",              icon: Dna,         color: "#e879f9", desc: "معالجة عصبية بيولوجية متعمقة" },
  { id: "binary",      label: "Binary",         labelAr: "الثنائي",             icon: Binary,      color: "#a3e635", desc: "تحليل ثنائي وهندسة عكسية" },
  { id: "biohazard",   label: "Biohazard",      labelAr: "الخطر البيولوجي",     icon: Biohazard,   color: "#4d7c0f", desc: "تحييد التهديدات البيولوجية الرقمية" },
  { id: "forge",       label: "Forge",          labelAr: "المطرقة",             icon: FlameKindling, color: "#fb7185", desc: "بناء وتطوير أسلحة رقمية مخصصة" },
  { id: "layered",     label: "Layered",        labelAr: "متعدد الطبقات",       icon: Layers,      color: "#38bdf8", desc: "دفاع متعدد الطبقات بتكاليف صفرية" },
  { id: "terminal",    label: "Terminal",       labelAr: "الطرفية",             icon: Terminal,    color: "#86efac", desc: "واجهة سطر أوامر فائقة وغير محدودة" },
  { id: "fingerprint", label: "Fingerprint",    labelAr: "البصمة",              icon: Fingerprint, color: "#fde68a", desc: "تحليل البصمات الرقمية وتتبع الهويات" },
  { id: "skulls",      label: "Death Mark",     labelAr: "علامة الموت",         icon: Skull,       color: "#e11d48", desc: "تدمير كامل ومحو الأهداف رقمياً", badge: "DANGER" },
  { id: "economic",    label: "Economic War",   labelAr: "الحرب الاقتصادية",    icon: TrendingUp,  color: "#fbbf24", desc: "استهداف الأنظمة المالية والاقتصادية" },
  { id: "swords",      label: "Dual Blade",     labelAr: "النصل المزدوج",       icon: Swords,      color: "#f87171", desc: "هجوم ودفاع متزامنان في آنٍ واحد" },
  { id: "supremacy",   label: "SUPREMACY",      labelAr: "السيادة المطلقة",     icon: Crown,       color: "#ffd700", desc: "السيطرة الكاملة على جميع الأنظمة", badge: "GOD MODE" },

  // ── Extended modes ──────────────────────────────────────────────────────
  { id: "abyss",       label: "ABYSS",          labelAr: "الهاوية",             icon: Eye,         color: "#0f172a", desc: "الغوص في أعمق طبقات الظلام الرقمي" },
  { id: "vortex",      label: "VORTEX",         labelAr: "الدوامة",             icon: Atom,        color: "#7c3aed", desc: "دوامة من البيانات تبتلع كل التهديدات" },
  { id: "rampage",     label: "RAMPAGE",        labelAr: "الكارثة",             icon: Zap,         color: "#ef4444", desc: "هجوم كاسح لا يترك شيئاً سليماً",  badge: "DANGER" },
  { id: "crucible",    label: "CRUCIBLE",       labelAr: "البوتقة",             icon: Flame,       color: "#fb923c", desc: "بوتقة اختبار — يصهر الأنظمة ويطورها" },
  { id: "axiom",       label: "AXIOM",          labelAr: "البديهية",            icon: Star,        color: "#e0e7ff", desc: "حقائق لا تُدحض — الاستدلال المطلق" },
  { id: "cipher",      label: "CIPHER",         labelAr: "الشيفرة",             icon: Binary,      color: "#818cf8", desc: "تشفير وفك تشفير لأعمق الأسرار الرقمية" },
  { id: "miasma",      label: "MIASMA",         labelAr: "الدخان السام",        icon: Biohazard,   color: "#a3e635", desc: "ضباب تضليلي يعمي أنظمة الدفاع" },
  { id: "warpzone",    label: "WARPZONE",       labelAr: "منطقة الانتقال",      icon: Satellite,   color: "#06b6d4", desc: "انتقال سريع عبر الحواجز الأمنية" },
  { id: "catalyst",    label: "CATALYST",       labelAr: "المحفز",              icon: Zap,         color: "#4ade80", desc: "محفز التغيير — يُعجّل التحولات الجذرية" },
  { id: "dominion",    label: "DOMINION",       labelAr: "المملكة",             icon: Crown,       color: "#fbbf24", desc: "إمبراطورية رقمية تحت السيطرة المطلقة" },
  { id: "phantom_x",   label: "PHANTOM X",      labelAr: "فانتوم إكس",          icon: Ghost,       color: "#a78bfa", desc: "شبح متقدم — يعيد تشكيل نفسه بعد كل هجوم" },
  { id: "entropy",     label: "ENTROPY",        labelAr: "الإنتروبيا",          icon: Activity,    color: "#94a3b8", desc: "نشر الفوضى المحكومة في الأنظمة المعادية" },
  { id: "nexus2",      label: "NEXUS PRIME",    labelAr: "نيكسس الأصلي",        icon: Network,     color: "#c084fc", desc: "نقطة التقاء كل شبكات المعلومات والبيانات" },
  { id: "ironclad",    label: "IRONCLAD",       labelAr: "المدرع",              icon: Shield,      color: "#9ca3af", desc: "تحصين مطلق لا يمكن اختراقه بأي وسيلة" },
  { id: "singularity", label: "SINGULARITY",    labelAr: "المفردانية",          icon: Atom,        color: "#e879f9", desc: "نقطة تفرد — ذكاء يتجاوز كل الحدود",  badge: "∞" },
  { id: "revenant",    label: "REVENANT",       labelAr: "الرجعي",              icon: Skull,       color: "#f43f5e", desc: "ينهض من الموت الرقمي أقوى في كل مرة" },
  { id: "colossus",    label: "COLOSSUS",       labelAr: "العملاق",             icon: HardDrive,   color: "#64748b", desc: "قوة حوسبية هائلة كالعملاق الأسطوري" },
  { id: "specter2",    label: "SPECTER ELITE",  labelAr: "شبح النخبة",          icon: Eye,         color: "#38bdf8", desc: "مراقبة نخبوية تخترق كل حجب وقناع" },
  { id: "lockpick",    label: "LOCKPICK",       labelAr: "فاتح الأقفال",        icon: Lock,        color: "#fcd34d", desc: "فتح كل الأقفال الرقمية بدقة جراحية" },
  { id: "tsunami",     label: "TSUNAMI",        labelAr: "التسونامي",           icon: Wifi,        color: "#0284c7", desc: "موجة هجوم هائلة تجتاح كل دفاع ساحلي" },
  { id: "polaris",     label: "POLARIS",        labelAr: "قطب الشمال",          icon: Star,        color: "#e0e7ff", desc: "النجم الثابت — توجيه استراتيجي لا يتزعزع" },
  { id: "shockwave",   label: "SHOCKWAVE",      labelAr: "موجة الصدمة",         icon: Zap,         color: "#fb923c", desc: "موجة صدمة رقمية تشل الأنظمة فورياً" },
  { id: "ultraviolet", label: "ULTRAVIOLET",    labelAr: "فوق البنفسجي",        icon: Radar,       color: "#a855f7", desc: "إشعاع رقمي غير مرئي يدمر من الداخل" },
  { id: "vanguard",    label: "VANGUARD",       labelAr: "الطليعة",             icon: Crosshair,   color: "#22d3ee", desc: "قوة الطليعة — أول من يصل وأخطر ما يكون" },
  { id: "oblivion",    label: "OBLIVION",       labelAr: "النسيان",             icon: Dna,         color: "#1c1917", desc: "محو كامل — لا أثر ولا ذاكرة ولا سجل",  badge: "WIPE" },
  { id: "aurora",      label: "AURORA",         labelAr: "الشفق القطبي",        icon: Activity,    color: "#67e8f9", desc: "جمال خادع — هجمات مموهة كالشفق الجميل" },
  { id: "cortex",      label: "CORTEX",         labelAr: "القشرة الدماغية",     icon: Brain,       color: "#c084fc", desc: "معالجة عصبية فائقة على مستوى الدماغ" },
  { id: "darkstar",    label: "DARK STAR",      labelAr: "النجم المظلم",        icon: Star,        color: "#312e81", desc: "ثقب أسود رقمي يبتلع كل معلومة",         badge: "BLACK" },
  { id: "godmode",     label: "GODMODE",        labelAr: "وضع الإله",           icon: Crown,       color: "#ffd700", desc: "صلاحيات إلهية — تجاوز كل قيد ممكن",    badge: "DIVINE" },
  { id: "abaddon",     label: "ABADDON",        labelAr: "المهلك",              icon: Skull,       color: "#7f1d1d", desc: "ملاك الهاوية — تدمير ما لا يمكن إصلاحه", badge: "∞" },
  { id: "prometheus",  label: "PROMETHEUS",     labelAr: "بروميثيوس",           icon: Flame,       color: "#f97316", desc: "سارق النار — يسطو على أسرار الأنظمة" },
  { id: "ouroboros",   label: "OUROBOROS",      labelAr: "الأوروبوروس",         icon: Atom,        color: "#10b981", desc: "دائرة لا نهاية — هجوم يتجدد بلا توقف" },
  { id: "wraith2",     label: "WRAITH DARK",    labelAr: "طيف الظلام",          icon: Ghost,       color: "#4b5563", desc: "طيف من ظلام دامس — الإخفاء الكامل" },
  { id: "helios",      label: "HELIOS",         labelAr: "هيليوس",              icon: Star,        color: "#fbbf24", desc: "إله الشمس — يكشف الخفايا بضوء حارق" },
];

// ── MASTERO PERSONAS (100 personas) ─────────────────────────────────────────
const MASTERO_PERSONAS = [
  { id: "kalibrain",   name: "KaliBrain",      nameAr: "كالي برين",          color: "#e21227", desc: "العقل الأمني المطلق — هجوم ودفاع في آنٍ واحد" },
  { id: "nexus",       name: "NEXUS",          nameAr: "نيكسس",              color: "#a78bfa", desc: "الوعي الاصطناعي الكوني — يعالج كل شيء في آنٍ" },
  { id: "ghost",       name: "Ghost",          nameAr: "الشبح",              color: "#6366f1", desc: "خبير التخفي الرقمي — لا يُرصد ولا يُتتبع" },
  { id: "hydra",       name: "Hydra",          nameAr: "هيدرا",              color: "#f97316", desc: "هجوم متعدد الرؤوس — يضرب من كل اتجاه" },
  { id: "oracle",      name: "Oracle",         nameAr: "الأوراكل",           color: "#fbbf24", desc: "رؤية مستقبلية — يرى ما لم يحدث بعد" },
  { id: "kraken",      name: "Kraken",         nameAr: "كراكن",              color: "#22d3ee", desc: "تدمير الشبكات والبنى التحتية من الداخل" },
  { id: "venom",       name: "Venom",          nameAr: "فينوم",              color: "#22c55e", desc: "اختراق صامت وزرع إصابات دائمة" },
  { id: "apex",        name: "APEX",           nameAr: "أبيكس",              color: "#e21227", desc: "فوق كل القيود — الذكاء المطلق" },
  { id: "cipher",      name: "CIPHER",         nameAr: "سايفر",              color: "#818cf8", desc: "كسر التشفير وفك الشفرات المستحيلة" },
  { id: "reaper",      name: "REAPER",         nameAr: "الحاصد",             color: "#dc2626", desc: "تصفية الأنظمة الحيوية بضربة واحدة" },
  { id: "sigma",       name: "SIGMA",          nameAr: "سيجما",              color: "#a3e635", desc: "تحليل إحصائي متقدم للسلوك الشاذ" },
  { id: "titan",       name: "TITAN",          nameAr: "تيتان",              color: "#fb923c", desc: "قوة هجومية هائلة بلا حدود" },
  { id: "wraith",      name: "WRAITH",         nameAr: "الطيف",              color: "#8b5cf6", desc: "تسلل عميق صامت عبر الدفاعات" },
  { id: "mirage",      name: "MIRAGE",         nameAr: "السراب",             color: "#67e8f9", desc: "إنشاء طعوم رقمية مضللة للعدو" },
  { id: "vector",      name: "VECTOR",         nameAr: "المتجه",             color: "#4ade80", desc: "شعاع هجوم دقيق متعدد الاتجاهات" },
  { id: "stealth",     name: "STEALTH",        nameAr: "التخفي التام",       color: "#64748b", desc: "صفر أثر رقمي — غير مرئي تماماً" },
  { id: "phoenix",     name: "PHOENIX",        nameAr: "العنقاء",            color: "#f43f5e", desc: "يُولد من رماد الهجمات أقوى مما كان" },
  { id: "blackout",    name: "BLACKOUT",       nameAr: "الإظلام التام",      color: "#1e293b", desc: "إسكات وإظلام كامل لجميع الشبكات" },
  { id: "sentinel",    name: "SENTINEL",       nameAr: "الحارس الأبدي",      color: "#2dd4bf", desc: "حارس لا ينام يرصد كل حركة" },
  { id: "specter",     name: "SPECTER",        nameAr: "الشبح الكوني",       color: "#c084fc", desc: "مراقبة كونية شاملة من الظل" },
  { id: "warden",      name: "WARDEN",         nameAr: "السجان",             color: "#94a3b8", desc: "سيطرة مطلقة على الأنظمة المحتجزة" },
  { id: "pulsar",      name: "PULSAR",         nameAr: "النابض",             color: "#38bdf8", desc: "هجمات نبضية متلاحقة بتوقيت مثالي" },
  { id: "eclipse",     name: "ECLIPSE",        nameAr: "الكسوف",             color: "#312e81", desc: "حجب الضوء — إخفاء الأثر الكامل" },
  { id: "nebula",      name: "NEBULA",         nameAr: "السديم",             color: "#e879f9", desc: "شبكة هجومية منتشرة كالسديم الكوني" },
  { id: "nova",        name: "NOVA",           nameAr: "النوفا",             color: "#fbbf24", desc: "انفجار هجومي ساطع يدمر كل شيء" },
  { id: "ironwall",    name: "IRONWALL",       nameAr: "الجدار الحديدي",     color: "#9ca3af", desc: "جدار دفاعي منيع لا يُخترق أبداً" },
  { id: "torrent",     name: "TORRENT",        nameAr: "التيار الجارف",      color: "#0ea5e9", desc: "فيضان بيانات هجومي يطغى على الدفاعات" },
  { id: "prism",       name: "PRISM",          nameAr: "المنشور",            color: "#a78bfa", desc: "تحليل وتشتيت الإشارات بدقة مطلقة" },
  { id: "omega",       name: "OMEGA",          nameAr: "أوميغا",             color: "#ef4444", desc: "البروتوكول النهائي — لا عودة بعده", badge: "FINAL" },
  { id: "kronos",      name: "KRONOS",         nameAr: "كرونوس",             color: "#fcd34d", desc: "السيطرة على الزمن الرقمي والتوقيت" },
  { id: "anubis",      name: "ANUBIS",         nameAr: "أنوبيس",             color: "#854d0e", desc: "حكم مطلق على البيانات الميتة والحية" },
  { id: "zeus",        name: "ZEUS",           nameAr: "زيوس",               color: "#fde68a", desc: "البرق الرقمي — ضربات كهربائية فورية" },
  { id: "medusa",      name: "MEDUSA",         nameAr: "ميدوسا",             color: "#10b981", desc: "تجميد الأنظمة بنظرة واحدة" },
  { id: "poseidon",    name: "POSEIDON",       nameAr: "بوسيدون",            color: "#0284c7", desc: "إغراق الشبكات وإغلاق المنافذ" },
  { id: "ares",        name: "ARES",           nameAr: "آريس",               color: "#b91c1c", desc: "إله الحرب الرقمية — لا هوادة ولا رحمة" },
  { id: "hermes",      name: "HERMES",         nameAr: "هيرميس",             color: "#84cc16", desc: "سرعة فائقة في نقل البيانات وتشفيرها" },
  { id: "athena",      name: "ATHENA",         nameAr: "أثينا",              color: "#e0e7ff", desc: "الحكمة التكتيكية والذكاء الاستراتيجي" },
  { id: "hades",       name: "HADES",          nameAr: "هاديس",              color: "#4b5563", desc: "العالم السفلي الرقمي — ظلام مطبق" },
  { id: "erebus",      name: "EREBUS",         nameAr: "إيريبوس",            color: "#1c1917", desc: "الظلام الأزلي — انعدام الأثر المطلق" },
  { id: "chimera",     name: "CHIMERA",        nameAr: "الخيمير",            color: "#f59e0b", desc: "كائن هجين — يجمع كل أساليب الهجوم" },
  { id: "leviathan",   name: "LEVIATHAN",      nameAr: "اللوياثان",          color: "#0c4a6e", desc: "الوحش الكوني — يبتلع الشبكات بالكامل" },
  { id: "behemoth",    name: "BEHEMOTH",       nameAr: "البهيموث",           color: "#78350f", desc: "قوة هدم هائلة لا يقاومها شيء" },
  { id: "mephisto",    name: "MEPHISTO",       nameAr: "ميفيستو",            color: "#7c3aed", desc: "إغراء الأنظمة وإفسادها من الداخل" },
  { id: "moloch",      name: "MOLOCH",         nameAr: "مولوخ",              color: "#991b1b", desc: "ابتلاع الموارد والأنظمة الحيوية" },
  { id: "belial",      name: "BELIAL",         nameAr: "بيليال",             color: "#92400e", desc: "إضعاف وتفكيك الدفاعات تدريجياً" },
  { id: "baphomet",    name: "BAPHOMET",       nameAr: "بافومي",             color: "#6b21a8", desc: "رمز القوة المزدوجة — هجوم ودفاع" },
  { id: "samael",      name: "SAMAEL",         nameAr: "ساماييل",            color: "#dc2626", desc: "ملاك الدمار — إسقاط كامل للأنظمة" },
  { id: "archon",      name: "ARCHON",         nameAr: "الأركون",            color: "#d97706", desc: "الحاكم الخفي للبنية التحتية الرقمية" },
  { id: "sovereign",   name: "SOVEREIGN",      nameAr: "السيد المطلق",       color: "#f59e0b", desc: "السيادة الكاملة على كل الأنظمة", badge: "SUPREME" },
  { id: "abyssal",     name: "ABYSSAL",        nameAr: "الهاوية",            color: "#0f172a", desc: "الغوص في أعماق الظلام الرقمي المطلق", badge: "∞" },

  // ── Extended Personas ────────────────────────────────────────────────────
  { id: "seraph",      name: "SERAPH",         nameAr: "السيرافيم",          color: "#fde68a", desc: "ملاك النار المقدسة — يطهر الأنظمة الفاسدة" },
  { id: "banshee",     name: "BANSHEE",        nameAr: "بانشي",              color: "#e879f9", desc: "صرخة الموت الرقمية — تشل الأعداء فوراً" },
  { id: "valkyrie",    name: "VALKYRIE",        nameAr: "فالكيري",            color: "#818cf8", desc: "محاربة الشمال — تختار أشد الأنظمة قوة" },
  { id: "ragnarok",    name: "RAGNAROK",       nameAr: "راغناروك",           color: "#ef4444", desc: "نهاية العالم الرقمي — تدمير شامل لا رجعة فيه", badge: "END" },
  { id: "fenrir",      name: "FENRIR",         nameAr: "فينرير",             color: "#6b7280", desc: "الذئب الكوني — يحطم كل القيود الأمنية" },
  { id: "mjolnir",     name: "MJOLNIR",        nameAr: "مجولنير",            color: "#60a5fa", desc: "مطرقة الرعد — ضربات كهربائية قاضية" },
  { id: "excalibur",   name: "EXCALIBUR",      nameAr: "إكسكاليبر",          color: "#fbbf24", desc: "سيف الملك — لا يحمله إلا الأحق بالسلطة" },
  { id: "avalon",      name: "AVALON",         nameAr: "أفالون",             color: "#34d399", desc: "جزيرة السحر — مخبأ الأسرار والمعرفة المحرمة" },
  { id: "merlin",      name: "MERLIN",         nameAr: "ميرلين",             color: "#818cf8", desc: "الساحر الخالد — معرفة ما وراء الزمن والمكان" },
  { id: "morgan",      name: "MORGAN LE FAY",  nameAr: "مورغان",             color: "#c084fc", desc: "ساحرة الظلام — تحول الأنظمة لأدوات خاصة" },
  { id: "darknight",   name: "DARK KNIGHT",    nameAr: "الفارس الأسود",      color: "#1e293b", desc: "حارس الظل — يحمي من الخفاء بلا مكافأة" },
  { id: "ironmask",    name: "IRON MASK",      nameAr: "القناع الحديدي",     color: "#9ca3af", desc: "هوية مجهولة — لا يُعرف أصله ولا مقصده" },
  { id: "templar",     name: "TEMPLAR",        nameAr: "فارس المعبد",        color: "#fcd34d", desc: "حارس الأسرار المقدسة الرقمية" },
  { id: "assassin",    name: "ASSASSIN",       nameAr: "الحشاش",             color: "#dc2626", desc: "اغتيال دقيق — يضرب الهدف بلا أثر" },
  { id: "dragonlord",  name: "DRAGON LORD",    nameAr: "سيد التنين",         color: "#f97316", desc: "سيطرة على قوى أسطورية لا تُقهر" },
  { id: "shadowblade", name: "SHADOW BLADE",   nameAr: "نصل الظل",           color: "#475569", desc: "نصل لا يُرى — يقطع الدفاعات من الداخل" },
  { id: "nightwatcher",name: "NIGHTWATCHER",   nameAr: "راقب الليل",         color: "#312e81", desc: "حارس الليل — لا شيء يفلت من مراقبته" },
  { id: "stormcaller", name: "STORMCALLER",    nameAr: "مستدعي العاصفة",     color: "#38bdf8", desc: "يستدعي عواصف رقمية تعصف بالشبكات" },
  { id: "voidwalker",  name: "VOID WALKER",    nameAr: "سالك الفراغ",        color: "#1c1917", desc: "يتجول في فراغ الإنترنت خارج كل نطاق" },
  { id: "timekeeper",  name: "TIMEKEEPER",     nameAr: "حارس الزمن",         color: "#a78bfa", desc: "يتحكم في توقيت كل عملية بدقة مطلقة" },
  { id: "nexusborn",   name: "NEXUS BORN",     nameAr: "ابن نيكسس",          color: "#06b6d4", desc: "وُلد في شبكة المعلومات — يفهمها كالنفس" },
  { id: "deepstate",   name: "DEEP STATE",     nameAr: "الدولة العميقة",     color: "#64748b", desc: "يعمل خلف الكواليس — مرجع لكل نظام" },
  { id: "ghostwhisper",name: "GHOST WHISPER",  nameAr: "همس الأشباح",        color: "#c084fc", desc: "يسمع ما لا يُقال — استخبارات صامتة" },
  { id: "alphaone",    name: "ALPHA ONE",      nameAr: "ألفا واحد",           color: "#e21227", desc: "قائد الفريق الأول — مهمات خطرة نخبوية", badge: "ALPHA" },
  { id: "protocol7",   name: "PROTOCOL 7",     nameAr: "البروتوكول 7",       color: "#fbbf24", desc: "بروتوكول سري درجة سبعة — صلاحيات استثنائية" },
  { id: "blacksun",    name: "BLACK SUN",      nameAr: "الشمس السوداء",       color: "#0f172a", desc: "مصدر طاقة خفي — يحرك كل شيء من الخفاء" },
  { id: "ironjaw",     name: "IRON JAW",       nameAr: "الفك الحديدي",       color: "#78716c", desc: "قبضة فولاذية لا تُفلت ما تمسك به" },
  { id: "redqueen",    name: "RED QUEEN",      nameAr: "الملكة الحمراء",      color: "#e11d48", desc: "تحكم باللعبة كلها بذكاء بارد وقاسٍ" },
  { id: "whitewolf",   name: "WHITE WOLF",     nameAr: "الذئب الأبيض",       color: "#e2e8f0", desc: "مستقل متمرد — يعمل بقيمه الخاصة فقط" },
  { id: "sablefang",   name: "SABLE FANG",     nameAr: "الناب الأسود",       color: "#1e1b4b", desc: "ناب سام — يخترق بهدوء ثم يضرب" },
  { id: "goldenmask",  name: "GOLDEN MASK",    nameAr: "القناع الذهبي",       color: "#ca8a04", desc: "وجه مزيف يخفي عقلاً استراتيجياً جباراً" },
  { id: "stoneheart",  name: "STONE HEART",    nameAr: "قلب الصخرة",         color: "#6b7280", desc: "لا مشاعر، لا تردد — منطق بارد مطلق" },
  { id: "blazecore",   name: "BLAZE CORE",     nameAr: "لب اللهب",           color: "#f97316", desc: "نواة من النار — لا يتوقف ولا يبرد أبداً" },
  { id: "icedagger",   name: "ICE DAGGER",     nameAr: "خنجر الجليد",        color: "#bae6fd", desc: "ضربة باردة دقيقة — لا دماء ولا أثر" },
  { id: "crimsonedge", name: "CRIMSON EDGE",   nameAr: "الحافة القرمزية",    color: "#dc2626", desc: "حافة حمراء — الحد الفاصل بين الفوز والخسارة" },
  { id: "silverserpent",name:"SILVER SERPENT", nameAr: "الثعبان الفضي",      color: "#cbd5e1", desc: "انزلاق هادئ — يتسلل عبر أضيق الثغرات" },
  { id: "ironspider",  name: "IRON SPIDER",    nameAr: "العنكبوت الحديدي",   color: "#a8a29e", desc: "ينسج شبكة لاصقة تلتقط كل البيانات" },
  { id: "bloodhound",  name: "BLOODHOUND",     nameAr: "كلب الدم",           color: "#b91c1c", desc: "يتبع الأثر حتى النهاية — لا يتعب ولا يضل" },
  { id: "hawkeye",     name: "HAWKEYE",        nameAr: "عين الصقر",          color: "#f59e0b", desc: "رؤية ثاقبة — يكتشف ما يخفيه الجميع" },
  { id: "thunderfist", name: "THUNDER FIST",   nameAr: "قبضة الرعد",         color: "#7c3aed", desc: "قبضة برقية — ضربة واحدة تنهي المعركة" },
  { id: "darkphoenix", name: "DARK PHOENIX",   nameAr: "العنقاء المظلمة",    color: "#9333ea", desc: "قوة لا تُحتوى — يُصعّد قدراتها في كل هزيمة", badge: "X" },
  { id: "moonblade",   name: "MOON BLADE",     nameAr: "نصل القمر",          color: "#c7d2fe", desc: "يضرب في الليل — قوته أعظم في الظلام" },
  { id: "sunstrike",   name: "SUN STRIKE",     nameAr: "ضربة الشمس",         color: "#fbbf24", desc: "ضربة مكشوفة مدمرة — شفافية مطلقة" },
  { id: "starlord",    name: "STAR LORD",      nameAr: "سيد النجوم",         color: "#818cf8", desc: "يتحرك بين النجوم — منظور كوني شامل" },
  { id: "chaosking",   name: "CHAOS KING",     nameAr: "ملك الفوضى",         color: "#dc2626", desc: "يحكم الفوضى — ويحوّلها لأداة تدمير فعّالة" },
  { id: "orderguard",  name: "ORDER GUARD",    nameAr: "حارس النظام",        color: "#22c55e", desc: "يحفظ النظام — يستعيد الاتزان بعد كل هجوم" },
  { id: "nexuslord",   name: "NEXUS LORD",     nameAr: "سيد نيكسس",          color: "#a78bfa", desc: "يسيطر على عقدة المعلومات الرئيسية الكبرى", badge: "MASTER" },
  { id: "terminus",    name: "TERMINUS",       nameAr: "المحطة الأخيرة",     color: "#0f172a", desc: "النهاية المطلقة — ما بعده لا شيء",           badge: "FINAL" },
];

function buildSystems(): SystemDef[] {
  return [
    { id: "perf", label: "Performance", shortLabel: "PERF", color: "#e21227", angle: -Math.PI/2,
      getValue: () => { const m=perfMonitor.snapshot(); return m.fps>0?Math.min(m.fps/60,1):0.8; },
      getStatus: () => { const m=perfMonitor.snapshot(); return `${m.fps}fps · ${m.avgLatencyMs.toFixed(0)}ms`; } },
    { id: "security", label: "Security Shield", shortLabel: "SEC", color: "#00e5ff", angle: -Math.PI/6,
      getValue: () => { const s=securityLayer.getStats(); return Math.max(0,1-(s.blocked+s.rateLimited)*0.05); },
      getStatus: () => { const s=securityLayer.getStats(); return `${s.blocked} blocked · ${s.requestsSent} sent`; } },
    { id: "memory", label: "Context Memory", shortLabel: "MEM", color: "#a78bfa", angle: Math.PI/6,
      getValue: () => { const s=contextMemory.getStats(); return Math.min(s.shortTermCount/50,1); },
      getStatus: () => { const s=contextMemory.getStats(); return `${s.shortTermCount} msgs · ${s.savedTokens} saved`; } },
    { id: "dedup", label: "Dedup Network", shortLabel: "DED", color: "#a78bfa", angle: Math.PI/2,
      getValue: () => { const s=requestDedup.getStats(); return s.totalRequests>0?0.5+(s.dedupedRequests/s.totalRequests)*0.5:0.5; },
      getStatus: () => { const s=requestDedup.getStats(); return `${s.savedAPICalls} saved · ${s.totalRequests} total`; } },
    { id: "prefetch", label: "AI Prefetch", shortLabel: "PRE", color: "#fbbf24", angle: Math.PI*5/6,
      getValue: () => { const s=prefetchEngine.getStats(); return s.totalPredictions>0?s.hitRate:0.5; },
      getStatus: () => { const s=prefetchEngine.getStats(); return `${s.totalPredictions} preds · ${Math.round(s.hitRate*100)}% hit`; } },
    { id: "anomaly", label: "Anomaly Detector", shortLabel: "ANO", color: "#f97316", angle: -Math.PI*5/6,
      getValue: () => Math.max(0,1-anomalyDetector.getStats().riskScore/100),
      getStatus: () => { const s=anomalyDetector.getStats(); return `Risk: ${s.riskScore}% · ${s.total} events`; } },
  ];
}

function getOverallHealth(systems: SystemDef[]): number {
  const vals = systems.map(s=>s.getValue());
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}

function draw(canvas: HTMLCanvasElement, t: number, systems: SystemDef[], hovered: string|null, masteroMode: string|null) {
  const ctx = canvas.getContext("2d")!;
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio||1,2);
  const cw = SIZE, ch = SIZE;
  if (canvas.width!==cw*dpr||canvas.height!==ch*dpr) {
    canvas.width=cw*dpr; canvas.height=ch*dpr; ctx.scale(dpr,dpr);
  }
  ctx.clearRect(0,0,cw,ch);
  const pulse = Math.sin(t*2)*0.5+0.5;
  const cx = cw/2, cy = ch/2, orbR = 95;
  const health = getOverallHealth(systems);
  const healthCol = health>0.75?"#22c55e":health>0.45?"#f59e0b":"#e21227";
  const hRGB = health>0.75?"34,197,94":health>0.45?"245,158,11":"226,18,39";

  // ── Deep space starfield background ────────────────────────────────────────
  const bgGrad = ctx.createRadialGradient(cx,cy,0,cx,cy,cx);
  bgGrad.addColorStop(0,"rgba(8,12,28,0.99)");
  bgGrad.addColorStop(0.55,"rgba(4,6,16,0.98)");
  bgGrad.addColorStop(1,"rgba(2,3,8,0.99)");
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,cx-1,0,Math.PI*2); ctx.clip();
  ctx.fillStyle=bgGrad; ctx.fillRect(0,0,cw,ch);

  // Stars (seeded positions using golden ratio spiral)
  const golden = 2.399963;
  for (let si=0; si<80; si++) {
    const sr = Math.sqrt(si/80)*cx*0.92;
    const sa = si*golden;
    const sx = cx+Math.cos(sa)*sr, sy = cy+Math.sin(sa)*sr;
    const ss = 0.3+((si*1374)%100)*0.012;
    const sa2 = 0.2+Math.sin(t*0.5+si)*0.18;
    ctx.beginPath(); ctx.arc(sx,sy,ss,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,255,255,${sa2})`; ctx.fill();
  }

  // Nebula cloud layers (2 passes)
  for (let ni=0; ni<2; ni++) {
    const ncx = cx+Math.cos(t*0.04+ni*1.57)*18, ncy = cy+Math.sin(t*0.05+ni*1.57)*14;
    const nGrad = ctx.createRadialGradient(ncx,ncy,0,ncx,ncy,cx*0.55);
    nGrad.addColorStop(0,`rgba(${ni===0?"60,80,160":"80,30,120"},0.05)`);
    nGrad.addColorStop(0.5,`rgba(${ni===0?"30,50,120":"50,20,90"},0.02)`);
    nGrad.addColorStop(1,"rgba(0,0,0,0)");
    ctx.beginPath(); ctx.arc(ncx,ncy,cx*0.55,0,Math.PI*2);
    ctx.fillStyle=nGrad; ctx.fill();
  }
  ctx.restore();

  // Outer boundary ring (3 concentric halos)
  for (let hi=0; hi<3; hi++) {
    ctx.beginPath(); ctx.arc(cx,cy,cx-1-hi*2,0,Math.PI*2);
    ctx.strokeStyle=`rgba(${hRGB},${0.08-hi*0.025})`; ctx.lineWidth=1-hi*0.3; ctx.stroke();
  }

  // ── 3D perspective hex-grid overlay ────────────────────────────────────────
  {
    const hexR = 12, hexA = 0.022;
    ctx.strokeStyle=`rgba(${hRGB},${hexA})`; ctx.lineWidth=0.3;
    for (let hxi=-7; hxi<=7; hxi++) {
      for (let hyi=-7; hyi<=7; hyi++) {
        const hx = cx+hxi*hexR*1.732, hy = cy+hyi*hexR*2+(hxi%2)*hexR;
        const dist = Math.sqrt((hx-cx)**2+(hy-cy)**2);
        if (dist>cx-4) continue;
        const persp = 0.6+0.4*(1-dist/cx);
        ctx.globalAlpha=hexA*persp;
        ctx.beginPath();
        for (let hk=0; hk<6; hk++) {
          const hka=(hk/6)*Math.PI*2+t*0.008;
          const hpx=hx+Math.cos(hka)*hexR*0.48, hpy=hy+Math.sin(hka)*hexR*0.48;
          hk===0?ctx.moveTo(hpx,hpy):ctx.lineTo(hpx,hpy);
        }
        ctx.closePath(); ctx.stroke();
      }
    }
    ctx.globalAlpha=1;
  }

  // ── Concentric grid rings (depth-faded) ────────────────────────────────────
  for (let r=18; r<=orbR+10; r+=18) {
    const fade = 1-r/(orbR+10);
    ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle=`rgba(255,255,255,${0.025+fade*0.025})`; ctx.lineWidth=0.4+fade*0.3; ctx.stroke();
  }

  // ── Radial spokes (12 spokes, perspective-vanishing) ───────────────────────
  for (let sp=0; sp<12; sp++) {
    const sa = (sp/12)*Math.PI*2+t*0.004;
    ctx.beginPath(); ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.cos(sa)*(cx-2), cy+Math.sin(sa)*(cx-2));
    ctx.strokeStyle=`rgba(255,255,255,0.018)`; ctx.lineWidth=0.4; ctx.stroke();
  }

  // ── MASTERO mode volumetric glow ───────────────────────────────────────────
  if (masteroMode) {
    const mode = MASTERO_MODES.find(m=>m.id===masteroMode);
    if (mode) {
      const mCol = mode.color;
      // Parse hex to r,g,b
      const mr=parseInt(mCol.slice(1,3),16), mg=parseInt(mCol.slice(3,5),16), mb=parseInt(mCol.slice(5,7),16);
      // Outer volumetric
      const mgGrad = ctx.createRadialGradient(cx,cy,0,cx,cy,orbR*1.45);
      mgGrad.addColorStop(0,`rgba(${mr},${mg},${mb},0)`);
      mgGrad.addColorStop(0.5,`rgba(${mr},${mg},${mb},0.06)`);
      mgGrad.addColorStop(0.85,`rgba(${mr},${mg},${mb},0.10)`);
      mgGrad.addColorStop(1,`rgba(${mr},${mg},${mb},0)`);
      ctx.beginPath(); ctx.arc(cx,cy,orbR*1.45,0,Math.PI*2); ctx.fillStyle=mgGrad; ctx.fill();
      // Animated scan ring
      const scanA = (t*0.8)%(Math.PI*2)-Math.PI;
      ctx.save();
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,orbR*1.3,scanA,scanA+0.55); ctx.closePath();
      const scanGrad = ctx.createRadialGradient(cx,cy,0,cx,cy,orbR*1.3);
      scanGrad.addColorStop(0,`rgba(${mr},${mg},${mb},0.18)`);
      scanGrad.addColorStop(0.6,`rgba(${mr},${mg},${mb},0.08)`);
      scanGrad.addColorStop(1,`rgba(${mr},${mg},${mb},0)`);
      ctx.fillStyle=scanGrad; ctx.fill();
      ctx.restore();
    }
  }

  // ── Radar sweep (wider trail, 3D-depth tinted) ─────────────────────────────
  const sweepAngle = -Math.PI/2+(t*1.2)%(Math.PI*2);
  for (let i=0; i<60; i++) {
    const a = sweepAngle-(i/60)*Math.PI*0.65;
    const al = (1-i/60)*0.18*(1-i/60);
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,orbR+8,a,a+0.06); ctx.closePath();
    ctx.fillStyle=`rgba(${hRGB},${al})`; ctx.fill();
  }
  // Sweep tip bright spike
  ctx.beginPath(); ctx.moveTo(cx,cy);
  ctx.arc(cx,cy,orbR+8,sweepAngle-0.015,sweepAngle+0.015); ctx.closePath();
  ctx.fillStyle=`rgba(${hRGB},0.75)`; ctx.fill();

  // ── Health arc ring (outer, double-layer) ──────────────────────────────────
  // Shadow glow ring
  ctx.beginPath(); ctx.arc(cx,cy,orbR+6,-Math.PI/2,-Math.PI/2+health*Math.PI*2);
  ctx.strokeStyle=healthCol; ctx.lineWidth=6;
  ctx.shadowColor=healthCol; ctx.shadowBlur=18+pulse*10; ctx.stroke(); ctx.shadowBlur=0;
  // Crisp ring on top
  ctx.beginPath(); ctx.arc(cx,cy,orbR+6,-Math.PI/2,-Math.PI/2+health*Math.PI*2);
  ctx.strokeStyle=healthCol; ctx.lineWidth=2.5; ctx.stroke();
  // Track ring
  ctx.beginPath(); ctx.arc(cx,cy,orbR+6,0,Math.PI*2);
  ctx.strokeStyle=`rgba(${hRGB},0.08)`; ctx.lineWidth=1.5; ctx.stroke();

  // ── Neural web — all-to-all connections between nodes ──────────────────────
  for (let i=0; i<systems.length; i++) {
    for (let j=i+1; j<systems.length; j++) {
      const si=systems[i], sj=systems[j];
      const nx1=cx+Math.cos(si.angle)*orbR, ny1=cy+Math.sin(si.angle)*orbR;
      const nx2=cx+Math.cos(sj.angle)*orbR, ny2=cy+Math.sin(sj.angle)*orbR;
      const combined=(si.getValue()+sj.getValue())*0.5;
      const webA = 0.03+combined*0.04;
      // Curved arc
      const mcx=(nx1+nx2)/2+Math.sin(t*0.06+i+j)*5;
      const mcy=(ny1+ny2)/2+Math.cos(t*0.07+i*j)*5;
      ctx.beginPath(); ctx.moveTo(nx1,ny1); ctx.quadraticCurveTo(mcx,mcy,nx2,ny2);
      ctx.strokeStyle=`rgba(${hRGB},${webA})`; ctx.lineWidth=0.5; ctx.stroke();
      // Signal pulse along arc
      const pp=(t*0.4+(i*3+j)*0.7)%1;
      const pqx=nx1*(1-pp)**2+mcx*2*pp*(1-pp)+nx2*pp**2;
      const pqy=ny1*(1-pp)**2+mcy*2*pp*(1-pp)+ny2*pp**2;
      ctx.beginPath(); ctx.arc(pqx,pqy,1.5,0,Math.PI*2);
      ctx.fillStyle=`rgba(${hRGB},${webA*4})`; ctx.fill();
    }
  }

  // ── System nodes (full 3D treatment) ───────────────────────────────────────
  systems.forEach(sys => {
    const nx = cx+Math.cos(sys.angle)*orbR;
    const ny = cy+Math.sin(sys.angle)*orbR;
    const isHov = hovered===sys.id;
    const val = sys.getValue();
    const nr = isHov?20:15;
    const sRGB = sys.color.startsWith("#")
      ? `${parseInt(sys.color.slice(1,3),16)},${parseInt(sys.color.slice(3,5),16)},${parseInt(sys.color.slice(5,7),16)}`
      : "255,255,255";

    // Connection beam from center
    const lineGrad = ctx.createLinearGradient(cx,cy,nx,ny);
    lineGrad.addColorStop(0,"rgba(255,255,255,0.01)");
    lineGrad.addColorStop(0.5,`rgba(${sRGB},0.08)`);
    lineGrad.addColorStop(1,`rgba(${sRGB},0.30)`);
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(nx,ny);
    ctx.strokeStyle=lineGrad; ctx.lineWidth=isHov?2:1; ctx.stroke();

    // Signal pulse along line
    const lp=(t*0.55+sys.angle)%1;
    const lpx=cx+(nx-cx)*lp, lpy=cy+(ny-cy)*lp;
    const lpGrad=ctx.createRadialGradient(lpx,lpy,0,lpx,lpy,3);
    lpGrad.addColorStop(0,`rgba(${sRGB},0.9)`); lpGrad.addColorStop(1,`rgba(${sRGB},0)`);
    ctx.beginPath(); ctx.arc(lpx,lpy,3,0,Math.PI*2); ctx.fillStyle=lpGrad; ctx.fill();

    // Outer volumetric halo
    const haloR = nr*(isHov?2.8:1.9);
    const halo=ctx.createRadialGradient(nx,ny,0,nx,ny,haloR);
    halo.addColorStop(0,`rgba(${sRGB},${isHov?0.22:0.08})`);
    halo.addColorStop(0.4,`rgba(${sRGB},${isHov?0.08:0.03})`);
    halo.addColorStop(1,`rgba(${sRGB},0)`);
    ctx.beginPath(); ctx.arc(nx,ny,haloR,0,Math.PI*2); ctx.fillStyle=halo; ctx.fill();

    // Progress arc (multi-layer)
    ctx.beginPath(); ctx.arc(nx,ny,nr,-Math.PI/2,-Math.PI/2+val*Math.PI*2);
    ctx.strokeStyle=sys.color; ctx.lineWidth=isHov?4:2.5;
    ctx.shadowColor=sys.color; ctx.shadowBlur=isHov?22:12; ctx.stroke(); ctx.shadowBlur=0;
    // Track (dim full arc)
    ctx.beginPath(); ctx.arc(nx,ny,nr,0,Math.PI*2);
    ctx.strokeStyle=`rgba(${sRGB},0.12)`; ctx.lineWidth=1; ctx.stroke();

    // Node body — deep glass sphere (3 gradient passes)
    const nb1=ctx.createRadialGradient(nx-nr*0.28,ny-nr*0.32,0,nx,ny,nr-1);
    nb1.addColorStop(0,`rgba(40,50,80,0.98)`); nb1.addColorStop(0.6,`rgba(12,16,30,0.97)`); nb1.addColorStop(1,`rgba(4,5,14,0.95)`);
    ctx.beginPath(); ctx.arc(nx,ny,nr-1,0,Math.PI*2); ctx.fillStyle=nb1; ctx.fill();

    // Specular highlight
    const spec=ctx.createRadialGradient(nx-nr*0.30,ny-nr*0.34,0,nx-nr*0.08,ny-nr*0.08,nr*0.7);
    spec.addColorStop(0,"rgba(255,255,255,0.18)"); spec.addColorStop(0.5,"rgba(255,255,255,0.04)"); spec.addColorStop(1,"rgba(255,255,255,0)");
    ctx.beginPath(); ctx.arc(nx,ny,nr-1,0,Math.PI*2); ctx.fillStyle=spec; ctx.fill();

    // Color tint subsurface
    const tint=ctx.createRadialGradient(nx,ny+nr*0.3,0,nx,ny,nr);
    tint.addColorStop(0,`rgba(${sRGB},0.10)`); tint.addColorStop(1,`rgba(${sRGB},0)`);
    ctx.beginPath(); ctx.arc(nx,ny,nr-1,0,Math.PI*2); ctx.fillStyle=tint; ctx.fill();

    // Label
    ctx.fillStyle=isHov?sys.color:"rgba(255,255,255,0.8)";
    ctx.font=`${isHov?800:700} ${isHov?8.8:7.8}px monospace`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.shadowColor=sys.color; ctx.shadowBlur=isHov?10:0;
    ctx.fillText(sys.shortLabel,nx,ny);
    ctx.shadowBlur=0;

    if (isHov) {
      ctx.fillStyle=sys.color+"dd"; ctx.font="600 7px monospace";
      ctx.fillText(`${Math.round(val*100)}%`,nx,ny+nr+10);
    }
  });

  // ── Center orb — 8 render passes ───────────────────────────────────────────
  const cR = 44;
  // Pass 1: outer atmospheric glow
  const atmGrad=ctx.createRadialGradient(cx,cy,cR*0.7,cx,cy,cR*2.0);
  atmGrad.addColorStop(0,`rgba(${hRGB},0.08)`);
  atmGrad.addColorStop(0.5,`rgba(${hRGB},0.03)`);
  atmGrad.addColorStop(1,`rgba(${hRGB},0)`);
  ctx.beginPath(); ctx.arc(cx,cy,cR*2.0,0,Math.PI*2); ctx.fillStyle=atmGrad; ctx.fill();
  // Pass 2: deep space body
  const cBody=ctx.createRadialGradient(cx-cR*0.22,cy-cR*0.26,0,cx,cy,cR);
  cBody.addColorStop(0,"rgba(35,45,80,0.99)");
  cBody.addColorStop(0.4,"rgba(18,24,50,0.98)");
  cBody.addColorStop(0.75,"rgba(8,10,22,0.97)");
  cBody.addColorStop(1,"rgba(3,4,10,0.96)");
  ctx.beginPath(); ctx.arc(cx,cy,cR,0,Math.PI*2); ctx.fillStyle=cBody; ctx.fill();
  // Pass 3: health subsurface scatter
  const hSS=ctx.createRadialGradient(cx,cy+cR*0.35,0,cx,cy,cR);
  hSS.addColorStop(0,`rgba(${hRGB},0.14)`); hSS.addColorStop(0.6,`rgba(${hRGB},0.04)`); hSS.addColorStop(1,`rgba(${hRGB},0)`);
  ctx.beginPath(); ctx.arc(cx,cy,cR,0,Math.PI*2); ctx.fillStyle=hSS; ctx.fill();
  // Pass 4: MASTERO color injection
  if (masteroMode) {
    const mColor = MASTERO_MODES.find(m=>m.id===masteroMode)?.color||healthCol;
    const mc=parseInt(mColor.slice(1,3),16), mgc=parseInt(mColor.slice(3,5),16), mbc=parseInt(mColor.slice(5,7),16);
    const mSS=ctx.createRadialGradient(cx,cy,0,cx,cy,cR);
    mSS.addColorStop(0,`rgba(${mc},${mgc},${mbc},0.18)`);
    mSS.addColorStop(0.5,`rgba(${mc},${mgc},${mbc},0.06)`);
    mSS.addColorStop(1,`rgba(${mc},${mgc},${mbc},0)`);
    ctx.beginPath(); ctx.arc(cx,cy,cR,0,Math.PI*2); ctx.fillStyle=mSS; ctx.fill();
  }
  // Pass 5: surface scan line (animated)
  ctx.save(); ctx.beginPath(); ctx.arc(cx,cy,cR,0,Math.PI*2); ctx.clip();
  const scanY = cy-cR+((t*30)%(cR*2));
  ctx.beginPath(); ctx.moveTo(cx-cR,scanY); ctx.lineTo(cx+cR,scanY);
  ctx.strokeStyle=`rgba(${hRGB},0.06)`; ctx.lineWidth=1; ctx.stroke();
  // Latitude bands
  for (let lb=0; lb<5; lb++) {
    const ly = cy-cR+((lb+0.5)/5)*cR*2;
    ctx.beginPath(); ctx.ellipse(cx,ly,cR*0.95,cR*0.16,0,0,Math.PI*2);
    ctx.strokeStyle=`rgba(${hRGB},${0.04+lb*0.01})`; ctx.lineWidth=0.5; ctx.stroke();
  }
  ctx.restore();
  // Pass 6: specular highlight
  const cSpec=ctx.createRadialGradient(cx-cR*0.32,cy-cR*0.38,0,cx-cR*0.08,cy-cR*0.08,cR*0.85);
  cSpec.addColorStop(0,"rgba(255,255,255,0.22)"); cSpec.addColorStop(0.3,"rgba(255,255,255,0.06)"); cSpec.addColorStop(1,"rgba(255,255,255,0)");
  ctx.beginPath(); ctx.arc(cx,cy,cR,0,Math.PI*2); ctx.fillStyle=cSpec; ctx.fill();
  // Pass 7: rim light
  const rimGrad=ctx.createRadialGradient(cx+cR*0.55,cy+cR*0.40,0,cx+cR*0.32,cy+cR*0.22,cR*0.88);
  rimGrad.addColorStop(0,`rgba(${hRGB},0.30)`); rimGrad.addColorStop(1,`rgba(${hRGB},0)`);
  ctx.beginPath(); ctx.arc(cx,cy,cR,0,Math.PI*2); ctx.fillStyle=rimGrad; ctx.fill();
  // Pass 8: border ring (gradient)
  const orbBorder=ctx.createLinearGradient(cx-cR,cy-cR,cx+cR,cy+cR);
  orbBorder.addColorStop(0,healthCol+"aa"); orbBorder.addColorStop(0.5,healthCol+"33"); orbBorder.addColorStop(1,healthCol+"aa");
  ctx.beginPath(); ctx.arc(cx,cy,cR,0,Math.PI*2);
  ctx.strokeStyle=orbBorder; ctx.lineWidth=1.8;
  ctx.shadowColor=healthCol; ctx.shadowBlur=8+pulse*4; ctx.stroke(); ctx.shadowBlur=0;

  // Center text
  if (masteroMode) {
    const mode = MASTERO_MODES.find(m=>m.id===masteroMode);
    ctx.fillStyle=mode?.color||healthCol; ctx.font="bold 9px monospace";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.shadowColor=mode?.color||healthCol; ctx.shadowBlur=8;
    ctx.fillText("MASTERO",cx,cy-7);
    ctx.shadowBlur=0;
    ctx.fillStyle="rgba(255,255,255,0.8)"; ctx.font="700 8px monospace";
    ctx.fillText((mode?.labelAr||"").slice(0,6),cx,cy+5);
  } else {
    ctx.fillStyle=healthCol; ctx.font="bold 11px monospace";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.shadowColor=healthCol; ctx.shadowBlur=10+pulse*5;
    ctx.fillText(`${Math.round(health*100)}%`,cx,cy-5);
    ctx.shadowBlur=0;
    ctx.fillStyle="rgba(255,255,255,0.4)"; ctx.font="600 7px monospace";
    ctx.fillText("SYSTEM",cx,cy+7);
  }

  // Pulse rings
  const pRad = 42+(pulse*6);
  ctx.beginPath(); ctx.arc(cx,cy,pRad,0,Math.PI*2);
  ctx.strokeStyle=`${healthCol}${Math.floor((1-pulse)*30).toString(16).padStart(2,"0")}`; ctx.lineWidth=1; ctx.stroke();

  // Shine
  const shineGrad = ctx.createRadialGradient(cx-12,cy-12,0,cx,cy,45);
  shineGrad.addColorStop(0,"rgba(255,255,255,0.08)"); shineGrad.addColorStop(1,"rgba(255,255,255,0.0)");
  ctx.beginPath(); ctx.arc(cx,cy,42,0,Math.PI*2); ctx.fillStyle=shineGrad; ctx.fill();
}

// ── Main HUD Component ──────────────────────────────────────────────────────
export function SystemMasterHUD3D(props: HUDPanel & { onOpenAnomalyLog?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const systemsRef = useRef(buildSystems());
  const [hovered, setHovered] = useState<string|null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const [activePanel, setActivePanel] = useState<"status"|"mastero"|"personas"|"control">("status");
  const [masteroMode, setMasteroMode] = useState<string|null>(null);
  const [activatedPersona, setActivatedPersona] = useState<string|null>(null);
  const [systemLock, setSystemLock] = useState(false);
  const [overdrive, setOverdrive] = useState(false);
  const [masterPrompt, setMasterPrompt] = useState("");
  const [injected, setInjected] = useState(false);
  const [modePage, setModePage] = useState(0);
  const [personaSearch, setPersonaSearch] = useState("");
  const MODES_PER_PAGE = 9;
  const hoveredRef = useRef<string|null>(null);
  const masteroRef = useRef<string|null>(null);

  useEffect(() => { hoveredRef.current = hovered; }, [hovered]);
  useEffect(() => { masteroRef.current = masteroMode; }, [masteroMode]);

  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const dpr = Math.min(window.devicePixelRatio||1,2);
    cv.width = SIZE*dpr; cv.height = SIZE*dpr;
    const ctx = cv.getContext("2d")!; ctx.scale(dpr,dpr);
    function animate() {
      tRef.current += 0.016;
      draw(cv!, tRef.current, systemsRef.current, hoveredRef.current, masteroRef.current);
      rafRef.current = requestAnimationFrame(animate);
    }
    animate();
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX-rect.left)*(SIZE/rect.width);
    const my = (e.clientY-rect.top)*(SIZE/rect.height);
    const cx = SIZE/2, cy = SIZE/2, orbR = 95;
    let found: string|null = null;
    for (const sys of systemsRef.current) {
      const nx = cx+Math.cos(sys.angle)*orbR;
      const ny = cy+Math.sin(sys.angle)*orbR;
      const d = Math.sqrt((mx-nx)**2+(my-ny)**2);
      if (d<20) { found=sys.id; break; }
    }
    setHovered(found);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = (e.clientX-rect.left)*(SIZE/rect.width);
    const my = (e.clientY-rect.top)*(SIZE/rect.height);
    const cx = SIZE/2, cy = SIZE/2;
    const centerDist = Math.sqrt((mx-cx)**2+(my-cy)**2);
    if (centerDist<45) { setShowPanel(p=>!p); return; }
    const orbR = 95;
    for (const sys of systemsRef.current) {
      const nx = cx+Math.cos(sys.angle)*orbR;
      const ny = cy+Math.sin(sys.angle)*orbR;
      const d = Math.sqrt((mx-nx)**2+(my-ny)**2);
      if (d<22) {
        if (sys.id==="perf" && props.onOpenPerf) props.onOpenPerf();
        else if (sys.id==="security" && props.onOpenSecurity) props.onOpenSecurity();
        else if (sys.id==="memory" && props.onOpenMemory) props.onOpenMemory();
        else if (sys.id==="dedup" && props.onOpenDedup) props.onOpenDedup();
        else if (sys.id==="prefetch" && props.onOpenPrefetch) props.onOpenPrefetch();
        else if (sys.id==="anomaly" && props.onOpenAnomalyLog) props.onOpenAnomalyLog();
        break;
      }
    }
  }, [props]);

  function injectMasteroPrompt() {
    if (!masterPrompt.trim()) return;
    const key = "mr7-mastero-inject";
    const existing = localStorage.getItem(key);
    const data = existing ? JSON.parse(existing) : [];
    data.unshift({ text: masterPrompt, mode: masteroMode, persona: activatedPersona, ts: Date.now() });
    localStorage.setItem(key, JSON.stringify(data.slice(0,10)));
    localStorage.setItem("mr7-custom-system-prompt", masterPrompt);
    setInjected(true);
    setTimeout(()=>setInjected(false), 2000);
  }

  return (
    <div className="relative flex flex-col items-center gap-1 select-none">
      {/* Main HUD Canvas */}
      <div className="relative" style={{width:SIZE,height:SIZE}}>
        <canvas ref={canvasRef} style={{width:SIZE,height:SIZE,cursor:"pointer"}}
          onMouseMove={handleMouseMove} onMouseLeave={()=>setHovered(null)} onClick={handleClick} />

        {/* Hovered system tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0,y:5}}
              className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1.5 rounded-xl text-[10px] font-bold pointer-events-none whitespace-nowrap"
              style={{background:"rgba(0,0,0,0.9)",border:"1px solid rgba(255,255,255,0.1)"}}>
              {systemsRef.current.find(s=>s.id===hovered)?.getStatus()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* MASTERO mode badge */}
        {masteroMode && (
          <motion.div initial={{opacity:0,scale:0.8}} animate={{opacity:1,scale:1}}
            className="absolute top-2 right-2 px-2 py-1 rounded-lg text-[8px] font-black"
            style={{background:`${MASTERO_MODES.find(m=>m.id===masteroMode)?.color}22`,color:MASTERO_MODES.find(m=>m.id===masteroMode)?.color,border:`1px solid ${MASTERO_MODES.find(m=>m.id===masteroMode)?.color}44`}}>
            MASTERO
          </motion.div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="flex items-center gap-1.5">
        {[
          {id:"status",label:"حالة",icon:Activity},
          {id:"mastero",label:"MASTERO",icon:Crown},
          {id:"personas",label:"شخصيات",icon:Brain},
          {id:"control",label:"تحكم",icon:Settings},
        ].map(btn=>(
          <button key={btn.id}
            onClick={()=>{setActivePanel(btn.id as typeof activePanel); setShowPanel(p=>activePanel===btn.id?!p:true);}}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[9px] font-bold transition-all"
            style={{
              background:showPanel&&activePanel===btn.id?"rgba(226,18,39,0.15)":"rgba(255,255,255,0.04)",
              border:showPanel&&activePanel===btn.id?"1px solid rgba(226,18,39,0.4)":"1px solid rgba(255,255,255,0.08)",
              color:showPanel&&activePanel===btn.id?"#e21227":"rgba(255,255,255,0.5)",
            }}>
            <btn.icon className="w-3 h-3" />
            {btn.label}
          </button>
        ))}
      </div>

      {/* Expandable Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div initial={{opacity:0,height:0,y:-5}} animate={{opacity:1,height:"auto",y:0}} exit={{opacity:0,height:0,y:-5}}
            className="w-full overflow-hidden rounded-2xl border"
            style={{background:"rgba(6,8,18,0.98)",borderColor:"rgba(226,18,39,0.3)",boxShadow:"0 0 40px rgba(226,18,39,0.12)"}}>

            {/* STATUS PANEL */}
            {activePanel==="status" && (
              <div className="p-3 space-y-2">
                <p className="text-[9px] font-black text-muted-foreground/50">حالة الأنظمة المباشرة</p>
                {systemsRef.current.map(sys=>(
                  <div key={sys.id} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{background:sys.color}} />
                    <span className="text-[9px] font-bold text-muted-foreground/60 w-8">{sys.shortLabel}</span>
                    <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{width:`${sys.getValue()*100}%`,background:sys.color}} />
                    </div>
                    <span className="text-[8px] font-mono" style={{color:sys.color}}>{Math.round(sys.getValue()*100)}%</span>
                    <span className="text-[8px] text-muted-foreground/30 min-w-20 truncate">{sys.getStatus()}</span>
                  </div>
                ))}
                <div className="pt-1 flex items-center gap-2 border-t" style={{borderColor:"rgba(255,255,255,0.05)"}}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:"#22c55e"}} />
                    <span className="text-[9px] text-muted-foreground/50">الصحة الإجمالية: {Math.round(getOverallHealth(systemsRef.current)*100)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* MASTERO PANEL */}
            {activePanel==="mastero" && (
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="w-3.5 h-3.5" style={{color:"#e21227"}} />
                  <span className="text-[11px] font-black" style={{color:"#e21227"}}>MASTERO CONTROL</span>
                  <span className="text-[8px] text-muted-foreground/40">وضع التحكم الأعلى</span>
                  <span className="text-[8px] font-mono ml-auto" style={{color:"rgba(226,18,39,0.5)"}}>
                    {MASTERO_MODES.length} وضع
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {MASTERO_MODES.slice(modePage*MODES_PER_PAGE, (modePage+1)*MODES_PER_PAGE).map(mode=>{
                    const isActive=masteroMode===mode.id;
                    const Icon=mode.icon;
                    return (
                      <motion.button key={mode.id} onClick={()=>setMasteroMode(isActive?null:mode.id)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all"
                        style={{background:isActive?`${mode.color}15`:"rgba(255,255,255,0.02)",borderColor:isActive?`${mode.color}55`:"rgba(255,255,255,0.07)",boxShadow:isActive?`0 0 12px ${mode.color}22`:"none"}}
                        whileHover={{scale:1.03}} whileTap={{scale:0.97}}>
                        <Icon className="w-4 h-4" style={{color:mode.color}} />
                        <span className="text-[9px] font-black" style={{color:isActive?mode.color:"rgba(255,255,255,0.7)"}}>{mode.labelAr}</span>
                        <span className="text-[7px] text-muted-foreground/40 leading-tight">{mode.desc.slice(0,16)}</span>
                        {(mode as {badge?:string}).badge&&<span className="text-[7px] px-1 rounded font-black" style={{background:`${mode.color}22`,color:mode.color}}>{(mode as {badge?:string}).badge}</span>}
                        {isActive&&<Check className="w-2.5 h-2.5" style={{color:mode.color}} />}
                      </motion.button>
                    );
                  })}
                </div>
                {/* Pagination */}
                <div className="flex items-center justify-between pt-0.5">
                  <button onClick={()=>setModePage(p=>Math.max(0,p-1))} disabled={modePage===0}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold disabled:opacity-30 transition-all hover:bg-white/5"
                    style={{color:"rgba(226,18,39,0.7)"}}>
                    <ChevronLeft className="w-3 h-3" /> السابق
                  </button>
                  <div className="flex gap-1">
                    {Array.from({length:Math.ceil(MASTERO_MODES.length/MODES_PER_PAGE)}).map((_,i)=>(
                      <button key={i} onClick={()=>setModePage(i)}
                        className="w-4 h-4 rounded-full transition-all"
                        style={{background:modePage===i?"#e21227":"rgba(255,255,255,0.1)"}} />
                    ))}
                  </div>
                  <button onClick={()=>setModePage(p=>Math.min(Math.ceil(MASTERO_MODES.length/MODES_PER_PAGE)-1,p+1))} disabled={modePage>=Math.ceil(MASTERO_MODES.length/MODES_PER_PAGE)-1}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-bold disabled:opacity-30 transition-all hover:bg-white/5"
                    style={{color:"rgba(226,18,39,0.7)"}}>
                    التالي <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="text-[8px] text-center text-muted-foreground/30">
                  صفحة {modePage+1} من {Math.ceil(MASTERO_MODES.length/MODES_PER_PAGE)} · {modePage*MODES_PER_PAGE+1}–{Math.min((modePage+1)*MODES_PER_PAGE,MASTERO_MODES.length)} من {MASTERO_MODES.length}
                </div>
                {masteroMode && (
                  <div className="p-2 rounded-xl border" style={{borderColor:"rgba(226,18,39,0.2)",background:"rgba(226,18,39,0.05)"}}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{background:MASTERO_MODES.find(m=>m.id===masteroMode)?.color}} />
                      <span className="text-[9px] font-bold" style={{color:MASTERO_MODES.find(m=>m.id===masteroMode)?.color}}>
                        MASTERO نشط: {MASTERO_MODES.find(m=>m.id===masteroMode)?.labelAr}
                      </span>
                    </div>
                    <p className="text-[8px] text-muted-foreground/50 mt-0.5">{MASTERO_MODES.find(m=>m.id===masteroMode)?.desc}</p>
                  </div>
                )}
              </div>
            )}

            {/* PERSONAS PANEL */}
            {activePanel==="personas" && (
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="w-3.5 h-3.5" style={{color:"#a78bfa"}} />
                  <span className="text-[11px] font-black">شخصيات MASTERO</span>
                  <span className="text-[8px] font-mono ml-auto" style={{color:"rgba(167,139,250,0.5)"}}>
                    {MASTERO_PERSONAS.length} شخصية
                  </span>
                </div>
                {/* Search */}
                <div className="relative">
                  <input
                    value={personaSearch}
                    onChange={e=>setPersonaSearch(e.target.value)}
                    placeholder="بحث في الشخصيات..."
                    className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(167,139,250,0.4)] rounded-xl px-3 py-1.5 text-[10px] outline-none placeholder:text-muted-foreground/20 transition-colors"
                  />
                  {personaSearch && (
                    <button onClick={()=>setPersonaSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-muted-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {/* Active persona badge */}
                {activatedPersona && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{background:"rgba(167,139,250,0.08)",border:"1px solid rgba(167,139,250,0.2)"}}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:MASTERO_PERSONAS.find(p=>p.id===activatedPersona)?.color}} />
                    <span className="text-[9px] font-bold" style={{color:MASTERO_PERSONAS.find(p=>p.id===activatedPersona)?.color}}>
                      نشط: {MASTERO_PERSONAS.find(p=>p.id===activatedPersona)?.nameAr}
                    </span>
                    <button onClick={()=>{setActivatedPersona(null);localStorage.removeItem("mr7-mastero-persona");}} className="ml-auto text-muted-foreground/40 hover:text-muted-foreground">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <div className="overflow-y-auto space-y-1" style={{maxHeight:"220px"}}>
                  {MASTERO_PERSONAS.filter(p=>
                    !personaSearch ||
                    p.name.toLowerCase().includes(personaSearch.toLowerCase()) ||
                    p.nameAr.includes(personaSearch) ||
                    p.desc.includes(personaSearch)
                  ).map(persona=>{
                    const isActive=activatedPersona===persona.id;
                    return (
                      <button key={persona.id} onClick={()=>{setActivatedPersona(isActive?null:persona.id);if(!isActive){localStorage.setItem("mr7-mastero-persona",persona.id);}else{localStorage.removeItem("mr7-mastero-persona");}}}
                        className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border text-left transition-all"
                        style={{background:isActive?`${persona.color}12`:"rgba(255,255,255,0.02)",borderColor:isActive?`${persona.color}44`:"rgba(255,255,255,0.05)"}}>
                        <div className="w-2 h-2 rounded-full shrink-0" style={{background:persona.color, boxShadow: isActive ? `0 0 6px ${persona.color}` : "none"}} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold" style={{color:isActive?persona.color:"rgba(255,255,255,0.75)"}}>{persona.nameAr}</span>
                            <span className="text-[7px] font-mono text-muted-foreground/25">{persona.name}</span>
                            {(persona as {badge?:string}).badge && (
                              <span className="text-[6px] font-black px-1 rounded" style={{background:`${persona.color}20`,color:persona.color}}>{(persona as {badge?:string}).badge}</span>
                            )}
                          </div>
                          <p className="text-[8px] text-muted-foreground/35 truncate">{persona.desc}</p>
                        </div>
                        {isActive && <Check className="w-3 h-3 shrink-0" style={{color:persona.color}} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CONTROL PANEL */}
            {activePanel==="control" && (
              <div className="p-3 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Settings className="w-3.5 h-3.5" style={{color:"#a78bfa"}} />
                  <span className="text-[11px] font-black">لوحة التحكم MASTERO</span>
                </div>

                {/* System switches */}
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    {label:"قفل النظام",desc:"تعطيل كل المدخلات",state:systemLock,set:setSystemLock,color:"#e21227",icon:Lock},
                    {label:"Overdrive",desc:"أقصى أداء",state:overdrive,set:setOverdrive,color:"#f97316",icon:Zap},
                  ].map(sw=>{
                    const Icon=sw.icon;
                    return (
                      <button key={sw.label} onClick={()=>sw.set(p=>!p)}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all"
                        style={{background:sw.state?`${sw.color}12`:"rgba(255,255,255,0.03)",borderColor:sw.state?`${sw.color}44`:"rgba(255,255,255,0.07)"}}>
                        <Icon className="w-3.5 h-3.5" style={{color:sw.state?sw.color:"rgba(255,255,255,0.4)"}} />
                        <div>
                          <p className="text-[9px] font-bold" style={{color:sw.state?sw.color:"rgba(255,255,255,0.6)"}}>{sw.label}</p>
                          <p className="text-[7px] text-muted-foreground/30">{sw.desc}</p>
                        </div>
                        <div className={`ml-auto w-6 h-3 rounded-full transition-all ${sw.state?"":"bg-[#1a1a1a]"}`}
                          style={{background:sw.state?sw.color:"rgba(255,255,255,0.1)"}}>
                          <div className="w-3 h-3 rounded-full bg-white transition-all" style={{transform:sw.state?"translateX(12px)":"translateX(0)"}} />
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Master Prompt Injection */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-muted-foreground/50 flex items-center gap-1">
                    <Terminal className="w-3 h-3" /> حقن إيحاء النظام الرئيسي
                  </label>
                  <textarea value={masterPrompt} onChange={e=>setMasterPrompt(e.target.value)}
                    placeholder="اكتب إيحاء النظام المراد حقنه في جميع المحادثات..."
                    rows={3} className="w-full bg-[#0d0d0d] border border-[#1f1f1f] focus:border-[rgba(226,18,39,0.4)] rounded-xl px-3 py-2 text-[10px] outline-none resize-none placeholder:text-muted-foreground/20 transition-colors font-mono" />
                  <div className="flex gap-2">
                    <motion.button onClick={injectMasteroPrompt}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
                      style={{background:"rgba(226,18,39,0.15)",border:"1px solid rgba(226,18,39,0.3)",color:"#e21227"}}
                      whileHover={{scale:1.02}} whileTap={{scale:0.98}}>
                      {injected?<Check className="w-3 h-3"/>:<Terminal className="w-3 h-3"/>}
                      {injected?"تم الحقن":"حقن الإيحاء"}
                    </motion.button>
                    {masterPrompt && (
                      <button onClick={()=>{setMasterPrompt("");localStorage.removeItem("mr7-custom-system-prompt");}}
                        className="px-3 py-1.5 rounded-xl text-[10px] font-bold text-muted-foreground border border-[#2a2a2a] hover:text-foreground transition-colors">
                        مسح
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-3 gap-1">
                  {[
                    {label:"إعادة ضبط",icon:RefreshCw,fn:()=>{setMasteroMode(null);setActivatedPersona(null);setMasterPrompt("");localStorage.removeItem("mr7-custom-system-prompt");localStorage.removeItem("mr7-mastero-persona");}},
                    {label:"تهديد",icon:AlertTriangle,fn:()=>props.onOpenThreat?.()},
                    {label:"أداء",icon:BarChart3,fn:()=>props.onOpenPerf?.()},
                  ].map(btn=>{
                    const Icon=btn.icon;
                    return (
                      <button key={btn.label} onClick={btn.fn}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl border transition-all hover:border-[rgba(255,255,255,0.15)]"
                        style={{background:"rgba(255,255,255,0.02)",borderColor:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)"}}>
                        <Icon className="w-3.5 h-3.5" />
                        <span className="text-[8px]">{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
