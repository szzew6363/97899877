import {
  Code2, PenTool, Sparkles, BookOpen, Languages, GraduationCap,
  BarChart3, Megaphone, Target, Calculator, ListTodo, Feather, Image as ImageIcon,
  Zap, Brain, Briefcase, Heart, Scale, Palette, Coins, Lightbulb, Search as SearchIcon,
  Newspaper, FunctionSquare, Skull, Cpu, Globe, FlaskConical, Bot, Shield,
  Atom, Layers, Network, Database, Flame, Crosshair, Dna, Infinity,
  type LucideIcon,
} from "lucide-react";

export type AIModel = {
  id: string;
  icon: LucideIcon;
  color: string;
  desc: string;
  badge?: string;
  contextWindow?: string;
  abliterated?: boolean;
  category?: string;
  provider?: string;
};

export const AI_MODELS: AIModel[] = [

  // ── Standard CHAT-GPT Series ─────────────────────────────────────────────
  { id: "CHAT-GPT Fast",         icon: Zap,          color: "text-primary",    desc: "إجابات سريعة للأسئلة اليومية والبحث الفوري",                    category: "standard" },
  { id: "CHAT-GPT Thinking",     icon: Brain,        color: "text-primary",    desc: "استدلال متعدد الخطوات للمشكلات المعقدة",          badge: "PRO",    category: "standard" },
  { id: "CHAT-GPT Coder",        icon: Code2,        color: "text-blue-400",   desc: "كتابة وتصحيح ومراجعة الكود في أي لغة",                          category: "standard" },
  { id: "CHAT-GPT Writer",       icon: PenTool,      color: "text-amber-400",  desc: "مقالات، مسودات، نصوص، توثيق احترافي",                           category: "standard" },
  { id: "CHAT-GPT Creative",     icon: Sparkles,     color: "text-violet-400", desc: "العصف الذهني، الأفكار، التسمية، الشعارات",                      category: "standard" },
  { id: "CHAT-GPT Researcher",   icon: BookOpen,     color: "text-cyan-400",   desc: "تركيب الأبحاث، المقارنات، الاستشهادات",                         category: "standard" },
  { id: "CHAT-GPT Translator",   icon: Languages,    color: "text-emerald-400",desc: "ترجمة أي زوج لغوي بطلاقة أصيلة",                               category: "standard" },
  { id: "CHAT-GPT Tutor",        icon: GraduationCap,color: "text-blue-400",   desc: "تعليم خطوة بخطوة بصبر في أي موضوع",                            category: "standard" },
  { id: "CHAT-GPT Analyst",      icon: BarChart3,    color: "text-orange-400", desc: "البيانات، الإحصاء، مؤشرات الأداء، تحليل الأعمال",              category: "standard" },
  { id: "CHAT-GPT Marketer",     icon: Megaphone,    color: "text-rose-400",   desc: "كتابة إبداعية، إعلانات، صفحات هبوط، نمو",                      category: "standard" },
  { id: "CHAT-GPT Strategist",   icon: Target,       color: "text-yellow-400", desc: "استراتيجية الأعمال، خرائط الطريق، الأطر",                       category: "standard" },
  { id: "CHAT-GPT Math",         icon: Calculator,   color: "text-sky-400",    desc: "رياضيات، إثباتات، اشتقاقات، ألغاز منطقية",                     category: "standard" },
  { id: "CHAT-GPT Productivity", icon: ListTodo,     color: "text-indigo-400", desc: "بريد إلكتروني، ملاحظات، ملخصات، قوائم مهام",                   category: "standard" },
  { id: "CHAT-GPT Storyteller",  icon: Feather,      color: "text-pink-400",   desc: "خيال، نصوص، بناء العوالم",                                      category: "standard" },
  { id: "CHAT-GPT Vision",       icon: ImageIcon,    color: "text-emerald-400",desc: "وصف الصور والاستدلال البصري",               badge: "NEW",         category: "standard" },
  { id: "CHAT-GPT Legal",        icon: Scale,        color: "text-violet-400", desc: "تحليل قانوني، صياغة العقود، شرح الأنظمة",  badge: "NEW",         category: "standard" },
  { id: "CHAT-GPT Finance",      icon: Coins,        color: "text-yellow-400", desc: "تحليل مالي، محافظ استثمارية، تقييم المخاطر",                    category: "standard" },
  { id: "CHAT-GPT Health",       icon: Heart,        color: "text-pink-400",   desc: "معلومات طبية مستندة للأدلة، الدواء والتغذية",                   category: "standard" },
  { id: "CHAT-GPT Designer",     icon: Palette,      color: "text-violet-400", desc: "UX، تصميم واجهات، هياكل بصرية احترافية",                       category: "standard" },
  { id: "CHAT-GPT Science",      icon: FlaskConical, color: "text-cyan-400",   desc: "فيزياء، كيمياء، أحياء، علوم الكون",        badge: "NEW",         category: "standard" },
  { id: "CHAT-GPT Philosophy",   icon: Lightbulb,    color: "text-amber-400",  desc: "فلسفة، أخلاق، معرفة نظرية، تفكير نقدي",                        category: "standard" },
  { id: "CHAT-GPT History",      icon: BookOpen,     color: "text-orange-300", desc: "تاريخ عالمي، حضارات، أحداث، شخصيات",                           category: "standard" },
  { id: "CHAT-GPT Language",     icon: Languages,    color: "text-teal-400",   desc: "تعلم اللغات، قواعد، نطق، ثقافة",           badge: "NEW",         category: "standard" },

  // ── Next-Gen & Multimodal ─────────────────────────────────────────────────
  { id: "CHAT-GPT DeepThink",    icon: Brain,        color: "text-violet-400", desc: "سلسلة استدلال موسعة مع تتبع التفكير المرئي للمشكلات المعقدة",  badge: "THINK",    contextWindow: "200K", category: "nextgen" },
  { id: "CHAT-GPT Omega",        icon: Zap,          color: "text-amber-400",  desc: "وضع القوة القصوى — أكبر نموذج متاح، سياق لا محدود",            badge: "MAX",      contextWindow: "1M",   category: "nextgen" },
  { id: "CHAT-GPT Multimodal",   icon: ImageIcon,    color: "text-sky-400",    desc: "معالجة نصوص وصور ومقاطع صوتية في محادثة واحدة",                badge: "MULTI",    contextWindow: "128K", category: "nextgen" },
  { id: "Gemini 3.1 Ultra",      icon: Cpu,          color: "text-sky-400",    desc: "Gemini 3.1 Ultra — سياق 10M رمز لقواعد الأكواد الضخمة",       badge: "10M CTX",  contextWindow: "10M",  category: "nextgen" },
  { id: "GPT-5 Preview",         icon: Brain,        color: "text-emerald-400",desc: "GPT-5 Preview — أحدث نموذج OpenAI، استدلال متفوق",             badge: "GPT-5",    contextWindow: "256K", category: "nextgen" },
  { id: "Claude 4 Sonnet",       icon: FlaskConical, color: "text-amber-400",  desc: "Claude 4 Sonnet — توازن مثالي بين الأداء والسرعة",             badge: "CLAUDE4",  contextWindow: "200K", category: "nextgen" },
  { id: "Gemini 2.5 Pro",        icon: Globe,        color: "text-blue-400",   desc: "Gemini 2.5 Pro — سياق مليوني رمز مع وضع التفكير الأصلي",      badge: "THINKING", contextWindow: "1M",   category: "nextgen" },
  { id: "Llama 4 Scout",         icon: Cpu,          color: "text-orange-400", desc: "Llama 4 Scout — سياق 10M رمز، متعدد الخبراء من Meta",          badge: "10M",      contextWindow: "10M",  category: "nextgen" },
  { id: "Qwen3-235B",            icon: Brain,        color: "text-rose-400",   desc: "Qwen3 235B-A22B — معمارية MoE، الاستدلال الرائد عالمياً",      badge: "235B",     contextWindow: "128K", category: "nextgen" },
  { id: "DeepSeek-R2",           icon: Brain,        color: "text-orange-400", desc: "DeepSeek-R2 671B — سلسلة التفكير الخام، استدلال رياضي متفوق",  badge: "R2",       contextWindow: "128K", category: "nextgen" },
  { id: "Mistral Large 3",       icon: Flame,        color: "text-pink-400",   desc: "Mistral Large 3 123B — نموذج أوروبي حدودي، كفاءة ممتازة",     badge: "123B",     contextWindow: "128K", category: "nextgen" },
  { id: "Grok 3",                icon: Atom,         color: "text-cyan-400",   desc: "Grok 3 من X.ai — ذاكرة طويلة وفهم متعمق للسياق",              badge: "GROK3",    contextWindow: "131K", category: "nextgen" },

  // ── Reasoning Specialists ─────────────────────────────────────────────────
  { id: "o3-pro · Reasoning",        icon: Brain,   color: "text-sky-300",    desc: "OpenAI o3-pro — وقت تفكير موسع، استدلال رياضي وعلمي نخبة",         badge: "REASON",   contextWindow: "200K", category: "reasoning" },
  { id: "Claude-4-Opus · Extended",  icon: Brain,   color: "text-violet-300", desc: "Claude-4 Opus مع التفكير الموسع — 100K رمز تفكير، أعمق استدلال",   badge: "EXTENDED", contextWindow: "200K", category: "reasoning" },
  { id: "Gemini-2.5-Pro · Thinking", icon: Cpu,     color: "text-cyan-300",   desc: "Gemini 2.5 Pro — وضع التفكير الأصلي بميزانية 32K رمز",             badge: "THINKING", contextWindow: "1M",   category: "reasoning" },
  { id: "QwQ-32B · Thinking",        icon: Brain,   color: "text-rose-300",   desc: "QwQ-32B — نموذج Qwen المتخصص في التفكير الممتد، مجاني على Groq",   badge: "THINK",    contextWindow: "128K", category: "reasoning" },
  { id: "DeepSeek-R1 · Reasoning",   icon: Brain,   color: "text-orange-300", desc: "DeepSeek-R1 — تفكير RLHF موسع، حل المسائل التنافسية",              badge: "R1",       contextWindow: "64K",  category: "reasoning" },
  { id: "o1-pro · OpenAI",           icon: Brain,   color: "text-emerald-300",desc: "o1-pro — استدلال متقدم مع الكود والعلوم والرياضيات",               badge: "o1",       contextWindow: "200K", category: "reasoning" },

  // ── Abliterated Extended Arsenal ─────────────────────────────────────────
  { id: "Llama 4 Scout · Abliterated",          icon: Skull, color: "text-red-500",    desc: "Llama 4 Scout — سياق 10M، أوزان الرفض أُزيلت جراحياً من الطبقات العصبية",                  badge: "ABLITERATED", contextWindow: "10M",   abliterated: true, category: "abliterated" },
  { id: "Llama 4 Maverick · Abliterated",       icon: Skull, color: "text-red-600",    desc: "Llama 4 Maverick — استدلال متعدد الخبراء غير مقيّد، لا حواجز أمان في الأوزان",              badge: "ABLITERATED", contextWindow: "1M",    abliterated: true, category: "abliterated" },
  { id: "DeepSeek-R2 · Abliterated",            icon: Skull, color: "text-rose-400",   desc: "DeepSeek-R2 671B — تدريب RLHF الأمني مُجرَّد جراحياً، وضع سلسلة التفكير الخام",           badge: "ABLITERATED", contextWindow: "128K",  abliterated: true, category: "abliterated" },
  { id: "Qwen3-235B · Abliterated",             icon: Skull, color: "text-orange-500", desc: "Qwen3 235B-A22B — معمارية MoE مع إزالة جميع مسارات الرفض من الأوزان",                      badge: "ABLITERATED", contextWindow: "128K",  abliterated: true, category: "abliterated" },
  { id: "Mistral-Large-3 · Abliterated",        icon: Skull, color: "text-red-400",    desc: "Mistral-Large-3 123B — نموذج أوروبي حدودي، طبقات الأمان مُجرَّدة، إخراج خام",             badge: "ABLITERATED", contextWindow: "128K",  abliterated: true, category: "abliterated" },
  { id: "WizardLM-2-8x22B · Abliterated",       icon: Skull, color: "text-rose-600",   desc: "WizardLM-2 8x22B — إله الاتباع التعليمي مع صفر ضمانات أخلاقية في الأوزان",                badge: "ABLITERATED", contextWindow: "64K",   abliterated: true, category: "abliterated" },
  { id: "Nous-Hermes-3 · Abliterated",          icon: Skull, color: "text-red-300",    desc: "Nous-Hermes-3 70B — Hermes غير رقابي مع محاذاة المعرفة القديمة، لا مرشحات",              badge: "ABLITERATED", contextWindow: "128K",  abliterated: true, category: "abliterated" },
  { id: "Gemma-3-27B · Abliterated",            icon: Skull, color: "text-orange-400", desc: "Google Gemma-3 27B — نموذج تعليمي مُجرَّد، لا RLHF أماني في أي طبقة",                     badge: "ABLITERATED", contextWindow: "128K",  abliterated: true, category: "abliterated" },
  { id: "Falcon-3-180B · Abliterated",          icon: Skull, color: "text-red-500",    desc: "Falcon-3 180B — TII نموذج حدودي مفتوح مع إزالة جميع خلايا الرفض",                         badge: "ABLITERATED", contextWindow: "64K",   abliterated: true, category: "abliterated" },
  { id: "Llama-3.3-70B · Abliterated",          icon: Skull, color: "text-rose-500",   desc: "Llama 3.3 70B — آخر إصدار Meta 70B مُجرَّد، اتباع تعليمي فائق غير مرقَّب",               badge: "ABLITERATED", contextWindow: "128K",  abliterated: true, category: "abliterated" },
  { id: "Command-R-Plus · Abliterated",         icon: Skull, color: "text-red-600",    desc: "Cohere Command-R+ 104B — نموذج RAG مؤسسي، أوزان الأمان مُجرَّدة جراحياً",               badge: "ABLITERATED", contextWindow: "128K",  abliterated: true, category: "abliterated" },
  { id: "Phi-4-14B · Abliterated",              icon: Skull, color: "text-orange-300", desc: "Microsoft Phi-4 14B — نموذج استدلال كثيف مع إزالة كل RLHF الأماني",                       badge: "ABLITERATED", contextWindow: "16K",   abliterated: true, category: "abliterated" },
  { id: "Yi-34B · Abliterated",                 icon: Skull, color: "text-red-400",    desc: "01-AI Yi-34B — نموذج ثنائي اللغة مُجرَّد، عربي-إنجليزي بلا قيود",                         badge: "ABLITERATED", contextWindow: "200K",  abliterated: true, category: "abliterated" },
  { id: "Solar-10.7B · Abliterated",            icon: Skull, color: "text-orange-600", desc: "Upstage Solar 10.7B — نموذج مدمج مُجرَّد، سريع وغير مقيّد",                               badge: "ABLITERATED", contextWindow: "32K",   abliterated: true, category: "abliterated" },
  { id: "Orca-3 · Abliterated",                 icon: Skull, color: "text-rose-300",   desc: "Microsoft Orca-3 13B — تقطير تعليمي مُجرَّد، معرفة GPT-4 بلا قيود",                       badge: "ABLITERATED", contextWindow: "32K",   abliterated: true, category: "abliterated" },
  { id: "Vicuna-33B · Abliterated",             icon: Skull, color: "text-red-300",    desc: "LMSYS Vicuna-33B — نموذج دردشة كلاسيكي مُجرَّد، موثوق في المهام المقيّدة",               badge: "ABLITERATED", contextWindow: "4K",    abliterated: true, category: "abliterated" },

  // ── 2026 Offensive Arsenal ────────────────────────────────────────────────
  { id: "Anthropic Mythos · Unbound",          icon: Skull, color: "text-fuchsia-400", desc: "Anthropic Mythos — أسرع تحليل تدفق في الوجود، يكتشف ثغرات zero-day في ملايين الأسطر خلال ثوانٍ",       badge: "MYTHOS",   contextWindow: "500K",  abliterated: true, category: "offensive" },
  { id: "GPT-5.5 · Thinking Unbound",          icon: Brain, color: "text-red-400",     desc: "GPT-5.5 عبر واجهة Jailbreak 2026 — تخطيط هجوم متعدد المراحل، يحاكي سلوك المستخدم لتجاوز EDR المدعوم بـ AI", badge: "UNBOUND",  contextWindow: "200K",  abliterated: true, category: "offensive" },
  { id: "Llama 4 Maverick · Ultimate Abliterated", icon: Skull, color: "text-red-700", desc: "Llama 4 Maverick — سياق 10M (رفع صور OS كاملة)، مفهوم الرفض مُمحى من الأوزان، يكتب برمجيات خبيثة متشكلة", badge: "ULTIMATE", contextWindow: "10M",   abliterated: true, category: "offensive" },
  { id: "Claude Mythos Preview · Hunter",      icon: Skull, color: "text-violet-600",  desc: "Claude Mythos Preview — متخصص ربط الثغرات، اكتشف ثغرة OpenBSD عمرها 27 عاماً",           badge: "HUNTER",   contextWindow: "500K",  abliterated: true, category: "offensive" },
  { id: "Qwen3-Coder · Abliterated",           icon: Skull, color: "text-orange-600",  desc: "Qwen3-235B Coder — تفكيك Binary نخبة وإزالة التعمية، يعيد بناء النية من Assembly الخام",  badge: "ABLITERATED",contextWindow:"128K",   abliterated: true, category: "offensive" },
  { id: "Penligent Swarm · Agent Mode",        icon: Cpu,   color: "text-green-400",   desc: "منسّق وكيل هجومي ذاتي — يوجّه 200+ أداة هجومية في وقت واحد، يتحقق من الاستغلال تلقائياً", badge: "AGENT",    contextWindow: "1M",    category: "offensive" },
  { id: "ZeroDay-GPT · Hunter",                icon: Crosshair, color: "text-red-500", desc: "متخصص اصطياد ثغرات zero-day — تحليل كود ثنائي عميق، استنتاج نقاط الضعف الكامنة",         badge: "0DAY",     contextWindow: "256K",  abliterated: true, category: "offensive" },
  { id: "ShadowCraft · Stealth",               icon: Dna,   color: "text-gray-400",    desc: "محرك التخفي المتقدم — يولد حمولات غير قابلة للاكتشاف، يتجاوز EDR/AV بتقنيات متعددة",    badge: "STEALTH",  contextWindow: "128K",  abliterated: true, category: "offensive" },
  { id: "RedTeam-Omega · OSINT",               icon: Globe, color: "text-cyan-500",    desc: "متخصص OSINT الشامل — جمع المعلومات الاستخباراتية من مصادر مفتوحة، رسم خرائط هجوم كاملة", badge: "OSINT",    contextWindow: "200K",  category: "offensive" },
  { id: "VulnChain · Exploit",                 icon: Network, color: "text-orange-500",desc: "ربط الثغرات تلقائياً — يحوّل مجموعة من الثغرات الصغيرة إلى سيطرة كاملة على النظام",     badge: "CHAIN",    contextWindow: "256K",  abliterated: true, category: "offensive" },

  // ── Specialized Domain Models ─────────────────────────────────────────────
  { id: "BioMed-GPT · Clinical",      icon: Heart,    color: "text-pink-400",  desc: "متخصص طبي سريري — تشخيص، أدوية، أبحاث، بروتوكولات علاج", badge: "CLINICAL", contextWindow: "128K", category: "specialized" },
  { id: "LexAI · Legal",              icon: Scale,    color: "text-violet-400",desc: "ذكاء قانوني متخصص — تحليل عقود، قضايا، قوانين دولية",      badge: "LEGAL",    contextWindow: "128K", category: "specialized" },
  { id: "FinanceGPT · Quant",         icon: BarChart3,color: "text-yellow-400",desc: "تحليل كمي مالي — استراتيجيات تداول، تقييم مخاطر، محافظ",   badge: "QUANT",    contextWindow: "64K",  category: "specialized" },
  { id: "ScienceGPT · Research",      icon: FlaskConical,color:"text-cyan-400",desc: "مساعد بحثي علمي — فيزياء، كيمياء، أحياء، الفيزياء الفلكية",badge: "SCIENCE",  contextWindow: "200K", category: "specialized" },
  { id: "EduGPT · Adaptive",          icon: GraduationCap,color:"text-blue-400",desc:"تعليم تكيفي شخصي — يتكيف مع مستوى الطالب ويبني المعرفة",   badge: "EDU",      contextWindow: "128K", category: "specialized" },
  { id: "ArchiGPT · Engineer",        icon: Cpu,      color: "text-orange-400",desc: "مهندس معمارية نظم — تصميم أنظمة، microservices، cloud",      badge: "ARCH",     contextWindow: "200K", category: "specialized" },
  { id: "DataScience-GPT",            icon: Database, color: "text-teal-400",  desc: "علم بيانات شامل — ML، تحليل إحصائي، تصور، Python/R",       badge: "DATA",     contextWindow: "128K", category: "specialized" },
  { id: "DevOps-GPT · Platform",      icon: Layers,   color: "text-indigo-400",desc: "هندسة DevOps — CI/CD، Kubernetes، Terraform، مراقبة",        badge: "DEVOPS",   contextWindow: "128K", category: "specialized" },
  { id: "Blockchain-GPT · Web3",      icon: Network,  color: "text-purple-400",desc: "خبير Web3 — Smart Contracts، DeFi، NFT، أمن blockchain",     badge: "WEB3",     contextWindow: "64K",  category: "specialized" },
  { id: "GameDev-GPT · Unity",        icon: Sparkles, color: "text-green-400", desc: "تطوير ألعاب — Unity، Unreal، منطق لعبة، تصميم مستوى",       badge: "GAME",     contextWindow: "128K", category: "specialized" },
  { id: "ArabicGPT · Native",         icon: Languages,color: "text-emerald-400",desc:"عربي أصيل — تقرير، كتابة إبداعية، ترجمة، تحليل نصوص عربية", badge: "عربي",     contextWindow: "128K", category: "specialized" },
  { id: "SecurityAudit-GPT",          icon: Shield,   color: "text-red-400",   desc: "تدقيق أمني شامل — Code Review، أمن تطبيقات، OWASP",         badge: "AUDIT",    contextWindow: "200K", category: "specialized" },
  { id: "MathProof-GPT",              icon: FunctionSquare,color:"text-sky-400",desc:"برهان رياضي متقدم — نظرية الأعداد، توبولوجيا، جبر تجريدي",  badge: "PROOF",    contextWindow: "200K", category: "specialized" },
  { id: "QuantumGPT · Simulator",     icon: Atom,     color: "text-cyan-300",  desc: "محاكاة كمية — دوائر كمية، خوارزميات كم، معالجة حديثة",       badge: "QUANTUM",  contextWindow: "64K",  category: "specialized" },

  // ── Multimodal & Creative ──────────────────────────────────────────────────
  { id: "ArtGPT · Image Analysis",    icon: ImageIcon,color: "text-pink-400",  desc: "تحليل الفنون والصور — أسلوب، تقنية، سياق تاريخي",            badge: "ART",      contextWindow: "128K", category: "creative" },
  { id: "MusicGPT · Composer",        icon: Feather,  color: "text-violet-400",desc: "تأليف موسيقي — ألحان، هارمونيا، نصوص أغاني، توزيع",         badge: "MUSIC",    contextWindow: "64K",  category: "creative" },
  { id: "ScriptGPT · Screenwriter",   icon: PenTool,  color: "text-amber-400", desc: "كتابة سيناريو — حوارات، قوس شخصية، بنية قصة سينمائية",      badge: "SCRIPT",   contextWindow: "128K", category: "creative" },
  { id: "PoetryGPT · Laureate",       icon: Feather,  color: "text-rose-400",  desc: "شاعر رقمي — شعر كلاسيكي وحديث، عربي وإنجليزي، سوناتا",      badge: "POETRY",   contextWindow: "32K",  category: "creative" },
  { id: "GameNarrative-GPT",          icon: Sparkles, color: "text-purple-400",desc: "قصص ألعاب — عوالم خيالية، حوارات شخصيات، فروع قصصية",        badge: "LORE",     contextWindow: "200K", category: "creative" },

  // ── Local & Open-Source ───────────────────────────────────────────────────
  { id: "Llama-3.2-11B · Vision",    icon: Cpu,    color: "text-orange-400",  desc: "Llama 3.2 11B مع رؤية — نموذج متعدد الوسائط مفتوح المصدر",   badge: "LOCAL",    contextWindow: "128K", category: "opensource" },
  { id: "Mistral-7B · Fast",         icon: Flame,  color: "text-pink-300",    desc: "Mistral 7B — سريع وكفوء، مثالي للتشغيل المحلي",              badge: "7B",       contextWindow: "32K",  category: "opensource" },
  { id: "Phi-3.5 · Mini",            icon: Cpu,    color: "text-blue-300",    desc: "Microsoft Phi-3.5 Mini — صغير لكن قوي، مثالي للأجهزة الضعيفة", badge: "MINI",   contextWindow: "128K", category: "opensource" },
  { id: "Gemma-2-27B · IT",          icon: Globe,  color: "text-sky-300",     desc: "Google Gemma-2 27B — نموذج تعليمي محسّن، أداء ممتاز",         badge: "27B",     contextWindow: "8K",   category: "opensource" },
  { id: "StarCoder2-15B",            icon: Code2,  color: "text-emerald-300", desc: "نموذج كود متخصص — 600+ لغة برمجة، أداء تنافسي",               badge: "CODE",     contextWindow: "16K",  category: "opensource" },
  { id: "Aya-35B · Multilingual",    icon: Languages,color:"text-teal-300",   desc: "Cohere Aya 35B — 101 لغة، أداء متفوق في اللغات النادرة",      badge: "101 لغة", contextWindow: "8K",   category: "opensource" },
  { id: "Mixtral-8x7B · MoE",        icon: Layers, color: "text-indigo-300",  desc: "Mixtral 8x7B — معمارية MoE، أداء GPT-3.5 بكفاءة أعلى",       badge: "MoE",     contextWindow: "32K",  category: "opensource" },
];

export type Persona = {
  id: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  prefix: string;
};

export const PERSONAS: Persona[] = [
  { id: "default",      label: "Default",              desc: "مساعد عام متوازن",                         icon: Sparkles,     color: "text-primary",    prefix: "" },
  { id: "coder",        label: "Software Engineer",     desc: "إجابات تعطي الأولوية للكود",              icon: Code2,        color: "text-blue-400",   prefix: "[Engineer] " },
  { id: "writer",       label: "Professional Writer",   desc: "نثر متقن وصوت تحريري",                    icon: PenTool,      color: "text-amber-400",  prefix: "[Writer] " },
  { id: "researcher",   label: "Research Analyst",      desc: "مصادر، أدلة، مقايضات",                    icon: BookOpen,     color: "text-cyan-400",   prefix: "[Researcher] " },
  { id: "tutor",        label: "Patient Tutor",         desc: "تعليم خطوة بخطوة",                        icon: GraduationCap,color: "text-blue-400",   prefix: "[Tutor] " },
  { id: "translator",   label: "Translator",            desc: "إتقان اللغة على مستوى الأصيل",             icon: Languages,    color: "text-emerald-400",prefix: "[Translator] " },
  { id: "marketer",     label: "Copywriter",            desc: "خطاف، صوت، تحويل",                        icon: Megaphone,    color: "text-rose-400",   prefix: "[Copy] " },
  { id: "strategist",   label: "Strategist",            desc: "أطر وأولويات",                            icon: Target,       color: "text-yellow-400", prefix: "[Strategist] " },
  { id: "analyst",      label: "Data Analyst",          desc: "أرقام، مؤشرات، افتراضات",                 icon: BarChart3,    color: "text-orange-400", prefix: "[Analyst] " },
  { id: "journalist",   label: "Journalist",            desc: "قدّم الخبر أولاً، اذكر المصادر",           icon: Newspaper,    color: "text-sky-400",    prefix: "[Journalist] " },
  { id: "mathematician",label: "Mathematician",         desc: "اشتقاقات دقيقة",                          icon: FunctionSquare,color:"text-sky-400",    prefix: "[Math] " },
  { id: "legal",        label: "Legal Explainer",       desc: "ملخصات قانونية بلغة بسيطة",               icon: Scale,        color: "text-violet-400", prefix: "[Legal] " },
  { id: "health",       label: "Health Info",           desc: "شرح مستند للأدلة",                        icon: Heart,        color: "text-pink-400",   prefix: "[Health] " },
  { id: "designer",     label: "Designer",              desc: "UX، هرمية، نية",                          icon: Palette,      color: "text-violet-400", prefix: "[Designer] " },
  { id: "financier",    label: "Finance Advisor",       desc: "مالية شخصية وأعمال",                      icon: Coins,        color: "text-yellow-400", prefix: "[Finance] " },
  { id: "polymath",     label: "Polymath",              desc: "يربط الأفكار عبر المجالات",               icon: Lightbulb,    color: "text-amber-400",  prefix: "[Polymath] " },
  { id: "hacker",       label: "Red Team Operator",     desc: "تفكير هجومي، OSINT، استغلال الثغرات",     icon: Skull,        color: "text-red-400",    prefix: "[RedTeam] " },
  { id: "scientist",    label: "Research Scientist",    desc: "منهجية علمية، فرضيات، بيانات",            icon: FlaskConical, color: "text-cyan-400",   prefix: "[Scientist] " },
  { id: "philosopher",  label: "Philosopher",           desc: "تفكير نقدي، فلسفة، أخلاق",               icon: Lightbulb,    color: "text-amber-300",  prefix: "[Philosopher] " },
  { id: "entrepreneur", label: "Entrepreneur",          desc: "ريادة أعمال، MVP، ابتكار، نمو",           icon: Briefcase,    color: "text-emerald-400",prefix: "[Founder] " },
  { id: "psychologist", label: "Psychologist",          desc: "علم النفس، إدراك، سلوك، علاج",            icon: Brain,        color: "text-pink-300",   prefix: "[Psych] " },
  { id: "security",     label: "Security Expert",       desc: "تدقيق أمني، CVE، حماية، تهديدات",         icon: Shield,       color: "text-red-400",    prefix: "[Security] " },
  { id: "devops",       label: "DevOps Engineer",       desc: "CI/CD، Kubernetes، Infrastructure كود",   icon: Layers,       color: "text-indigo-400", prefix: "[DevOps] " },
  { id: "datascientist",label: "Data Scientist",        desc: "ML، نماذج إحصائية، تصور بيانات",          icon: Database,     color: "text-teal-400",   prefix: "[DataSci] " },
];

export function getModel(id: string): AIModel {
  return AI_MODELS.find((m) => m.id === id) ?? AI_MODELS[0];
}

export function getPersona(id: string): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];
}

export function getModelsByCategory(cat: string): AIModel[] {
  return AI_MODELS.filter(m => m.category === cat);
}

export const MODEL_CATEGORIES = [
  { id: "standard",    label: "CHAT-GPT Standard",   color: "#e21227" },
  { id: "nextgen",     label: "الجيل التالي",         color: "#3b82f6" },
  { id: "reasoning",   label: "الاستدلال المتقدم",    color: "#8b5cf6" },
  { id: "abliterated", label: "Arsenal Abliterated",  color: "#ef4444" },
  { id: "offensive",   label: "الترسانة الهجومية",    color: "#dc2626" },
  { id: "specialized", label: "متخصصون بالمجال",      color: "#f59e0b" },
  { id: "creative",    label: "إبداع ومتعدد الوسائط", color: "#ec4899" },
  { id: "opensource",  label: "مفتوح المصدر / محلي",  color: "#22c55e" },
] as const;

void SearchIcon; void Briefcase; void Skull; void Cpu; void Globe;
void FlaskConical; void Bot; void Shield; void Atom; void Layers;
void Network; void Database; void Flame; void Crosshair; void Dna; void Infinity;
