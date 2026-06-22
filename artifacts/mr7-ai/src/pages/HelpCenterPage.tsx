import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Search, X, ChevronRight, Zap, Shield, Brain, Code2, Users, CreditCard,
  Bell, Key, BarChart3, Terminal, GitBranch, Database, Cpu, Globe, Star,
  HelpCircle, PlayCircle, ChevronDown, CheckCircle2, ArrowRight, Sparkles,
  MessageSquare, FileText, Settings, Lock, Layers, Activity
} from "lucide-react";

interface Article {
  id: string;
  title: string;
  titleEn: string;
  category: string;
  content: string;
  tags: string[];
  readTime: number;
  icon: React.ElementType;
  color: string;
}

interface Category {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  count: number;
}

const CATEGORIES: Category[] = [
  { id: "all", label: "الكل", icon: Sparkles, color: "#e21227", count: 20 },
  { id: "auth", label: "المصادقة", icon: Lock, color: "#3b82f6", count: 4 },
  { id: "ai", label: "الذكاء الاصطناعي", icon: Brain, color: "#8b5cf6", count: 5 },
  { id: "security", label: "الأمان", icon: Shield, color: "#ef4444", count: 4 },
  { id: "payments", label: "المدفوعات", icon: CreditCard, color: "#f59e0b", count: 3 },
  { id: "api", label: "API للمطورين", icon: Code2, color: "#10b981", count: 4 },
];

const ARTICLES: Article[] = [
  {
    id: "getting-started",
    title: "البدء مع KaliGPT",
    titleEn: "Getting Started with KaliGPT",
    category: "ai",
    icon: Zap,
    color: "#e21227",
    readTime: 3,
    tags: ["بداية", "مقدمة", "دليل"],
    content: `KaliGPT هو مساعد الذكاء الاصطناعي المتخصص في الأمن السيبراني. يمكنك:

• **الدردشة المتقدمة**: اسأل عن أي موضوع أمني — من تحليل الثغرات إلى كتابة سكريبتات الاختراق.
• **وضع الوكيل**: فعّل Agent Mode لتنفيذ مهام معقدة متعددة الخطوات تلقائياً.
• **مجلس الذكاء**: استخدم Council Mode لاستشارة 105 نموذج ذكاء اصطناعي في نفس الوقت.
• **Arsenal Hub**: مئة أداة أمنية متخصصة في مكان واحد.

**خطوات البداية:**
1. سجّل حسابك أو سجّل دخولك
2. اختر نموذج الذكاء الاصطناعي المناسب من TopBar
3. ابدأ محادثتك مع KaliGPT
4. استكشف الأدوات في Arsenal Hub`
  },
  {
    id: "auth-setup",
    title: "إعداد الحساب والمصادقة",
    titleEn: "Account Setup & Authentication",
    category: "auth",
    icon: Lock,
    color: "#3b82f6",
    readTime: 4,
    tags: ["حساب", "تسجيل", "JWT", "2FA"],
    content: `نظام المصادقة يدعم أعلى معايير الأمان:

**التسجيل:**
• أدخل بريدك الإلكتروني وكلمة مرور قوية (12+ حرف)
• ستصلك رسالة تحقق على بريدك
• أكّد بريدك للوصول الكامل

**تسجيل الدخول:**
• JWT Access Token صالح ساعة واحدة
• Refresh Token تلقائي صالح 30 يوماً
• حماية تلقائية: قفل الحساب بعد 5 محاولات فاشلة لـ 15 دقيقة

**المصادقة الثنائية (2FA):**
1. اذهب إلى إعدادات الحساب
2. اختر "تفعيل 2FA"
3. امسح QR Code بـ Google Authenticator
4. أدخل الرمز للتأكيد`
  },
  {
    id: "ai-models",
    title: "نماذج الذكاء الاصطناعي المتاحة",
    titleEn: "Available AI Models",
    category: "ai",
    icon: Brain,
    color: "#8b5cf6",
    readTime: 5,
    tags: ["OpenAI", "Anthropic", "Groq", "نماذج"],
    content: `KaliGPT يدعم أفضل نماذج الذكاء الاصطناعي:

**OpenAI:**
• GPT-4o — الأفضل للتحليل المعقد والكود
• GPT-4o-mini — سريع واقتصادي
• O3 Pro — أقوى نموذج للاستدلال

**Anthropic Claude:**
• Claude 3.7 Sonnet — الأفضل للكتابة والتحليل
• Claude 3.5 Haiku — سريع ودقيق

**Groq (Ultra Fast):**
• Llama 3.3 70B — أسرع inference في العالم
• Mixtral 8x7B — ممتاز للكود

**Google Gemini:**
• Gemini 2.0 Flash — متعدد الوسائط
• Gemini Pro — تحليل متقدم

**النماذج المحلية:**
• دعم Ollama لتشغيل النماذج محلياً بدون إنترنت`
  },
  {
    id: "council-mode",
    title: "وضع مجلس الذكاء الاصطناعي",
    titleEn: "AI Council Mode",
    category: "ai",
    icon: Users,
    color: "#f97316",
    readTime: 6,
    tags: ["council", "multi-agent", "مجلس"],
    content: `وضع المجلس يستشير 105 نموذج ذكاء اصطناعي في نفس الوقت:

**كيف يعمل:**
1. اكتب سؤالك أو مشكلتك
2. اضغط "Council Mode" في TopBar
3. تُرسل المهمة لعدة نماذج متوازية
4. يتم دمج الإجابات في رد موحد ومعمق

**متى تستخدمه:**
• تقييم الثغرات الأمنية المعقدة
• استراتيجيات اختبار الاختراق الشاملة
• تحليل الكود لتحديد جميع نقاط الضعف
• البحث الأمني المعمق

**الخطط المدعومة:** Professional & Elite فقط`
  },
  {
    id: "code-scanner",
    title: "محلل الكود الأمني",
    titleEn: "Code Security Scanner",
    category: "security",
    icon: Code2,
    color: "#ef4444",
    readTime: 4,
    tags: ["SAST", "ثغرات", "OWASP", "CWE"],
    content: `محلل الكود يكشف الثغرات الأمنية تلقائياً:

**كيفية الاستخدام:**
1. افتح Code Security Scanner من Arsenal Hub
2. الصق كودك أو ارفع ملفاً
3. اختر لغة البرمجة (أو الكشف التلقائي)
4. اضغط "تحليل"

**ما يكشفه:**
• SQL Injection & NoSQL Injection
• XSS (Reflected, Stored, DOM-based)
• أسرار مشفرة في الكود (API keys, passwords)
• SSRF & Path Traversal
• ضعف التشفير (ECB mode, weak keys)
• IDOR & Broken Access Control

**معايير التحليل:** OWASP Top 10, CWE Top 25, SANS Top 25

**التصدير:** PDF, JSON, Markdown`
  },
  {
    id: "rag-system",
    title: "نظام RAG — قاعدة المعرفة",
    titleEn: "RAG Knowledge Base System",
    category: "ai",
    icon: Database,
    color: "#3b82f6",
    readTime: 5,
    tags: ["RAG", "embedding", "معرفة", "وثائق"],
    content: `نظام RAG يُحسّن إجابات النموذج بمعرفتك الخاصة:

**رفع الملفات:**
• PDF: تقارير، كتب، وثائق أمنية
• Markdown: ملاحظات وإجراءات
• كود برمجي: سكريبتات وأدوات
• CSV/JSON: بيانات هيكلية

**كيف يعمل:**
1. ارفع ملفاتك في قسم Knowledge Base
2. يتم تقطيع الملفات إلى chunks
3. يُحوّلها لـ embeddings بـ OpenAI
4. عند سؤالك، يبحث في معرفتك أولاً
5. يُضيف أفضل النتائج كـ context للنموذج

**قاعدة المعرفة المشتركة:**
محملة مسبقاً بـ CVEs، تقنيات MITRE ATT&CK، ووثائق Kali Linux`
  },
  {
    id: "stripe-payment",
    title: "بوابة الدفع والاشتراكات",
    titleEn: "Payment Gateway & Subscriptions",
    category: "payments",
    icon: CreditCard,
    color: "#f59e0b",
    readTime: 3,
    tags: ["Stripe", "اشتراك", "دفع", "بطاقة"],
    content: `نظام الدفع مؤتمت بالكامل:

**الخطط المتاحة:**
• مجاني: 50K token/شهر
• Pro: 500K token/شهر — $19/شهر
• Enterprise: 5M token/شهر — $99/شهر

**طرق الدفع:**
• بطاقات الائتمان/الخصم (Visa, Mastercard, Amex)
• Apple Pay & Google Pay
• العملات الرقمية (USDT, Bitcoin) — قريباً

**التفعيل التلقائي:**
بعد الدفع، يُفعَّل اشتراكك فوراً تلقائياً دون تدخل يدوي.

**الفواتير:**
فاتورة PDF لكل عملية دفع تُرسل على بريدك تلقائياً.`
  },
  {
    id: "api-keys",
    title: "مفاتيح API للمطورين",
    titleEn: "Developer API Keys",
    category: "api",
    icon: Key,
    color: "#10b981",
    readTime: 4,
    tags: ["API", "مطورين", "مفاتيح", "webhook"],
    content: `Developer Portal لدمج KaliGPT في أدواتك:

**إنشاء مفتاح API:**
1. اذهب إلى API Keys في إعدادات الحساب
2. اضغط "إنشاء مفتاح جديد"
3. اختر اسماً وصفياً وصلاحيات محددة
4. حدد حداً يومياً اختيارياً

**استخدام المفتاح:**
\`\`\`bash
curl -H "X-Api-Key: kg_your_key_here" \\
  -d '{"message":"ابحث عن ثغرات في هذا الكود"}' \\
  https://api.mr7.ai/api/chat
\`\`\`

**الـ Webhooks:**
سجّل روابط لاستقبال إشعارات عند اكتمال المهام.`
  },
  {
    id: "notifications",
    title: "نظام الإشعارات",
    titleEn: "Notifications System",
    category: "api",
    icon: Bell,
    color: "#06b6d4",
    readTime: 2,
    tags: ["إشعارات", "push", "تنبيه"],
    content: `إشعارات فورية عبر قنوات متعددة:

**داخل التطبيق:**
• جرس الإشعارات في TopBar مع عداد
• Toast فوري عند اكتمال المهام
• تاريخ كامل قابل للتصفية

**Web Push:**
• إشعارات حتى لو أغلقت المتصفح
• اضغط "السماح بالإشعارات" عند ظهور الطلب

**تنبيهات مهمة:**
• وصول الـ tokens لـ 80% من الحد
• اكتمال مهام الوكيل الطويلة
• تجديد الاشتراك التلقائي`
  },
  {
    id: "kali-tools",
    title: "تكامل أدوات Kali Linux",
    titleEn: "Kali Linux Tools Integration",
    category: "security",
    icon: Terminal,
    color: "#e21227",
    readTime: 6,
    tags: ["nmap", "nikto", "sqlmap", "kali", "أدوات"],
    content: `تشغيل أدوات الاختراق مباشرة من الدردشة:

**الأدوات المدعومة:**
• **Nmap**: فحص المنافذ وخدمات الشبكة
• **Nikto**: فحص ثغرات خوادم الويب
• **SQLMap**: كشف SQL injection تلقائياً
• **WFuzz**: fuzzing نقاط النهاية
• **Gobuster**: اكتشاف المسارات المخفية
• **Whatweb**: تحديد تقنيات الويب
• **TheHarvester**: OSINT وجمع المعلومات

**مثال:**
اكتب: "افحص المنافذ المفتوحة على 192.168.1.1"
سيُحوّل النموذج الطلب لأمر nmap مناسب وينفذه ويعرض النتائج.

**تنبيه:** للاستخدام الأخلاقي المشروع فقط.`
  },
  {
    id: "memory-system",
    title: "الذاكرة طويلة الأمد",
    titleEn: "Long-term Memory System",
    category: "ai",
    icon: Brain,
    color: "#8b5cf6",
    readTime: 4,
    tags: ["ذاكرة", "embedding", "شخصية"],
    content: `النموذج يتذكر معلوماتك عبر جميع المحادثات:

**ما يتذكره:**
• اسمك ومجال عملك وأهدافك
• الأدوات والأنظمة التي تستخدمها
• أساليبك المفضلة في الاختراق
• المشاريع الجارية والأهداف

**كيف يعمل:**
يستخرج النموذج الحقائق المهمة من كل محادثة ويخزنها كـ embeddings. في المحادثة التالية، يسترجع أكثرها صلة تلقائياً.

**إدارة الذاكرة:**
في قسم "الذاكرة الطويلة" يمكنك:
• رؤية كل ما يتذكره النموذج عنك
• تعديل أو حذف أي معلومة
• إضافة معلومات يدوياً`
  },
  {
    id: "rate-limiting",
    title: "حدود الاستخدام والأداء",
    titleEn: "Rate Limits & Performance",
    category: "api",
    icon: Activity,
    color: "#f97316",
    readTime: 3,
    tags: ["rate limit", "tokens", "حدود", "أداء"],
    content: `حدود الاستخدام حسب خطتك:

**الخطة المجانية:**
• 10 طلبات/دقيقة
• 100 طلب/يوم
• 50K token/شهر

**Starter:**
• 100 طلب/دقيقة
• 1,000 طلب/يوم
• حدود أعلى للـ tokens

**Professional:**
• 500 طلب/دقيقة
• 10,000 طلب/يوم

**Elite:**
• 2,000 طلب/دقيقة
• بدون حد يومي

**Headers الاستجابة:**
\`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\``
  },
  {
    id: "teams",
    title: "فضاء الفريق والتعاون",
    titleEn: "Team Workspace & Collaboration",
    category: "security",
    icon: Users,
    color: "#10b981",
    readTime: 5,
    tags: ["فريق", "تعاون", "organization", "أعضاء"],
    content: `بنية تحتية للفرق الأمنية:

**إنشاء مؤسسة:**
1. اذهب إلى Organizations
2. اضغط "إنشاء مؤسسة جديدة"
3. ادعُ أعضاء الفريق بالبريد الإلكتروني

**أدوار الفريق:**
• **مدير الفريق**: صلاحيات كاملة
• **محلل أول**: رفع الأدوات والتقارير
• **محلل**: الدردشة والأدوات الأساسية
• **متدرب**: مشاهدة فقط

**التعاون الفوري:**
• غرف دردشة مشتركة في الوقت الحقيقي
• مشاركة الأدوات والنتائج
• رؤية من هو متصل حالياً`
  },
  {
    id: "monitoring",
    title: "مراقبة النظام والأخطاء",
    titleEn: "System Monitoring & Error Tracking",
    category: "security",
    icon: BarChart3,
    color: "#22d3ee",
    readTime: 3,
    tags: ["مراقبة", "أخطاء", "أداء", "admin"],
    content: `لوحة مراقبة شاملة للمديرين:

**الإحصاءات الفورية:**
• عدد المستخدمين النشطين (يوم/أسبوع/شهر)
• معدل نجاح الطلبات
• متوسط زمن الاستجابة لكل نقطة نهاية
• استهلاك التوكن الإجمالي

**تتبع الأخطاء:**
• الأخطاء الأكثر تكراراً مع stack trace
• ربط كل خطأ بهوية المستخدم
• تاريخ الأخطاء مع التوقيت

**التنبيهات التلقائية:**
إشعار للمدير عند:
• ارتفاع معدل الأخطاء عن 5%
• انهيار أي نقطة نهاية حرجة`
  },
  {
    id: "fine-tuning",
    title: "Fine-Tuning وبيانات التدريب",
    titleEn: "Fine-Tuning & Training Data",
    category: "ai",
    icon: Cpu,
    color: "#14b8a6",
    readTime: 4,
    tags: ["fine-tuning", "تدريب", "JSONL", "OpenAI"],
    content: `جمع وتصدير بيانات التدريب:

**جمع البيانات:**
• قيّم كل رد بـ ممتاز / جيد / رديء
• المحادثات المُقيَّمة بـ "ممتاز" تُحفظ تلقائياً

**مراجعة البيانات (للمديرين):**
1. اذهب إلى Fine-Tuning Pipeline
2. راجع المحادثات المرشحة
3. وافق أو ارفض كل محادثة
4. صدّر بتنسيق JSONL

**الاستخدام:**
\`\`\`bash
openai api fine_tunes.create \\
  -t training_data.jsonl \\
  -m gpt-3.5-turbo
\`\`\``
  },
  {
    id: "marketplace",
    title: "سوق الوحدات المجتمعية",
    titleEn: "Community Module Marketplace",
    category: "api",
    icon: Globe,
    color: "#ec4899",
    readTime: 3,
    tags: ["marketplace", "وحدات", "plugins", "مجتمع"],
    content: `نظام توسعة قابل للنمو:

**تصفح الوحدات:**
• أدوات أمنية متخصصة من المجتمع
• فلترة حسب الفئة والتقييم
• معاينة قبل التثبيت

**تثبيت وحدة:**
1. اختر الوحدة من Marketplace
2. اضغط "تثبيت"
3. تظهر فوراً في Arsenal Hub

**نشر وحدتك:**
1. عرّف وحدتك بـ JSON/YAML
2. ارفعها للمراجعة
3. بعد موافقة المدير تُنشر للمجتمع`
  },
  {
    id: "pwa",
    title: "التطبيق التقدمي (PWA)",
    titleEn: "Progressive Web App (PWA)",
    category: "api",
    icon: Globe,
    color: "#6366f1",
    readTime: 2,
    tags: ["PWA", "جوال", "تثبيت", "offline"],
    content: `KaliGPT كتطبيق على جهازك:

**تثبيت على الجوال:**
1. افتح KaliGPT في Safari أو Chrome
2. اضغط "مشاركة" ثم "إضافة للشاشة الرئيسية"
3. يعمل كتطبيق أصيل بدون متصفح

**على الكمبيوتر:**
اضغط أيقونة التثبيت في شريط العنوان

**العمل بدون إنترنت:**
الواجهة الأساسية تعمل بدون اتصال.
الرسائل المكتوبة تُرسل تلقائياً عند عودة الاتصال.`
  },
  {
    id: "reports",
    title: "تقارير PDF الاحترافية",
    titleEn: "Professional PDF Reports",
    category: "security",
    icon: FileText,
    color: "#a855f7",
    readTime: 4,
    tags: ["PDF", "تقرير", "pentest", "vulnerability"],
    content: `توليد تقارير اختبار الاختراق الاحترافية:

**القوالب المتاحة:**
• تقرير اختبار اختراق شامل
• تقرير تقييم الثغرات
• تقرير تدقيق أمني

**هيكل التقرير:**
• ملخص تنفيذي
• بيئة الاختبار والمنهجية
• النتائج مرتبة حسب الخطورة (حرج → منخفض)
• التوصيات وخطة المعالجة

**التوليد التلقائي:**
يجمع المعلومات من محادثاتك الأخيرة ونتائج أدوات المسح.

**تصدير:** PDF احترافي، Markdown، JSON`
  },
  {
    id: "security-best-practices",
    title: "أفضل ممارسات الأمان",
    titleEn: "Security Best Practices",
    category: "auth",
    icon: Shield,
    color: "#ef4444",
    readTime: 5,
    tags: ["أمان", "OWASP", "حماية", "ممارسات"],
    content: `معايير الأمان المطبّقة في KaliGPT:

**حماية البيانات:**
• كلمات المرور مشفرة بـ bcrypt (12 جولة)
• الجلسات مشفرة بـ JWT مع refresh token
• مفاتيح API مشفرة بـ SHA-256

**حماية API:**
• HMAC signature verification
• CORS محدود بالنطاقات المصرح بها
• SQL Injection محظور بـ parameterized queries

**مراقبة الأمان:**
• تسجيل كل محاولة تسجيل دخول
• كشف الأنماط المشبوهة تلقائياً
• قفل الحساب عند الهجوم

**توصيات للمستخدمين:**
• فعّل 2FA دائماً
• استخدم كلمة مرور قوية فريدة
• لا تشارك مفاتيح API أبداً`
  },
  {
    id: "account-settings",
    title: "إعدادات الحساب الشاملة",
    titleEn: "Account Settings",
    category: "auth",
    icon: Settings,
    color: "#6b7280",
    readTime: 3,
    tags: ["إعدادات", "حساب", "ملف شخصي", "جلسات"],
    content: `إدارة حسابك بالكامل:

**معلومات الملف الشخصي:**
• تعديل الاسم والبريد الإلكتروني
• رفع صورة شخصية
• تغيير كلمة المرور

**إدارة الجلسات:**
• رؤية كل الأجهزة المسجّل دخولها
• إنهاء جلسة بعينها عن بُعد
• إنهاء جميع الجلسات الأخرى

**سجل الأحداث الأمنية:**
• كل محاولة تسجيل دخول موثقة
• عنوان IP والجهاز لكل جلسة
• تنبيه فوري عند الدخول من IP جديد

**إشعارات البريد:**
تحكم في ما تريد استلامه من KaliGPT`
  },
  {
    id: "context-management",
    title: "إدارة السياق الذكية",
    titleEn: "Smart Context Management",
    category: "ai",
    icon: Layers,
    color: "#34d399",
    readTime: 3,
    tags: ["سياق", "system prompt", "شخصية", "context"],
    content: `تخصيص سلوك النموذج لمهامك:

**القواعد المخصصة:**
أنشئ قواعد system prompt تُضاف تلقائياً لكل محادثة.

**القوالب الجاهزة:**
• خبير أمن المعلومات
• مختبر اختراق محترف
• مساعد الكود الآمن
• لغة الإجابة (عربي/إنجليزي)

**الـ Triggers:**
كل قاعدة تُفعَّل تلقائياً بكلمات مفتاحية معينة.

**الأولويات:**
ترتيب القواعد حسب الأولوية عند تطبيقها.`
  },
];

const TOUR_STEPS = [
  { title: "مرحباً بك في KaliGPT!", desc: "مساعد الذكاء الاصطناعي الأمني الأكثر تقدماً.", icon: Zap },
  { title: "الشريط الجانبي", desc: "أدوات أمنية، محادثات سابقة، وإعدادات النماذج.", icon: Layers },
  { title: "Arsenal Hub", desc: "مئة أداة أمنية في مكان واحد — ابحث واختر.", icon: Shield },
  { title: "وضع الوكيل", desc: "مهام معقدة متعددة الخطوات تلقائياً.", icon: Brain },
  { title: "ابدأ الآن!", desc: "اكتب أول سؤالك الأمني وجرّب قوة KaliGPT.", icon: Star },
];

function HoloBG({ color = "#e21227" }: { color?: string }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let raf = 0; let t = 0;
    function resize() { cv.width = cv.offsetWidth; cv.height = cv.offsetHeight; }
    resize();
    const ro = new ResizeObserver(resize);
    if (cv.parentElement) ro.observe(cv.parentElement);
    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random() * cv.width, y: Math.random() * cv.height,
      vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3,
      r: Math.random() * 1.5 + .5, a: Math.random() * .7 + .3,
    }));
    function draw() {
      t += .008;
      const W = cv.width, H = cv.height;
      ctx.clearRect(0, 0, W, H);
      const hexToRgb = (h: string) => { const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "226,18,39"; };
      const rgb = hexToRgb(color);
      ctx.strokeStyle = `rgba(${rgb},0.04)`; ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(0, (H / 4) * i + Math.sin(t + i) * 10);
        ctx.lineTo(W, (H / 4) * i + Math.cos(t * .7 + i) * 15); ctx.stroke();
      }
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},${p.a * .4})`; ctx.fill();
      });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 90) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(${rgb},${(1 - d / 90) * .12})`; ctx.stroke(); }
      }));
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [color]);
  return <canvas ref={cvRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

interface Props { onClose?: () => void }

export function HelpCenterPage({ onClose }: Props) {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState("all");
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const filtered = ARTICLES.filter(a => {
    const matchCat = activeCat === "all" || a.category === activeCat;
    const q = search.toLowerCase();
    const matchSearch = !q || a.title.includes(q) || a.titleEn.toLowerCase().includes(q) || a.tags.some(t => t.includes(q));
    return matchCat && matchSearch;
  });

  const formatContent = (content: string) => {
    return content.split("\n").map((line, i) => {
      if (line.startsWith("**") && line.endsWith("**")) {
        return <p key={i} className="text-white font-semibold mt-3 mb-1">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith("• ")) {
        const parts = line.slice(2).split(/\*\*(.*?)\*\*/g);
        return <div key={i} className="flex items-start gap-2 text-zinc-300 text-sm leading-relaxed pl-2">
          <span className="text-red-500 mt-1.5 flex-shrink-0">▸</span>
          <span>{parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-white">{p}</strong> : p)}</span>
        </div>;
      }
      if (line.match(/^\d+\./)) {
        const num = line.match(/^(\d+)\.(.*)/);
        if (num) return <div key={i} className="flex items-start gap-2 text-zinc-300 text-sm pl-2">
          <span className="text-red-400 font-bold flex-shrink-0 w-4">{num[1]}.</span>
          <span>{num[2].trim()}</span>
        </div>;
      }
      if (line.startsWith("```")) return null;
      if (line.startsWith("curl\|openai")) {
        return <code key={i} className="text-xs text-green-300 font-mono">{line}</code>;
      }
      if (line.trim() === "") return <div key={i} className="h-2" />;
      return <p key={i} className="text-zinc-300 text-sm leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="relative flex flex-col h-full min-h-[600px] bg-[#080808] overflow-hidden" dir="rtl">
      <HoloBG color="#e21227" />

      {/* Header */}
      <div className="relative flex-shrink-0 px-6 py-4 border-b border-white/8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/30 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">مركز المساعدة</h1>
              <p className="text-xs text-zinc-500">Help Center — {ARTICLES.length} مقالة</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: .96 }}
              onClick={() => { setShowTour(true); setTourStep(0); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/15 border border-red-500/25 text-red-400 text-xs font-medium hover:bg-red-600/25 transition-colors"
            >
              <PlayCircle className="w-3.5 h-3.5" /> جولة تعليمية
            </motion.button>
            {onClose && <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/8 transition-colors"><X className="w-4 h-4" /></button>}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث في المقالات... (مثال: 2FA، RAG، Stripe)"
            className="w-full pr-9 pl-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/40 focus:bg-white/8 transition-all"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="relative flex-shrink-0 flex gap-2 px-6 py-3 overflow-x-auto scrollbar-none border-b border-white/5">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const active = activeCat === cat.id;
          return (
            <motion.button
              key={cat.id}
              whileHover={{ scale: 1.04 }} whileTap={{ scale: .96 }}
              onClick={() => setActiveCat(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex-shrink-0 ${active ? "text-white border-opacity-60" : "text-zinc-500 border-white/8 hover:text-zinc-300 hover:border-white/15"}`}
              style={active ? { backgroundColor: `${cat.color}20`, borderColor: `${cat.color}50`, color: cat.color } : {}}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
              <span className="text-[10px] opacity-60">{cat.id === "all" ? ARTICLES.length : ARTICLES.filter(a => a.category === cat.id).length}</span>
            </motion.button>
          );
        })}
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Articles list */}
        <div className={`flex-shrink-0 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/8 ${activeArticle ? "w-72 border-l border-white/8" : "flex-1"}`}>
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-500">
              <HelpCircle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لم يُعثر على نتائج</p>
            </div>
          ) : (
            <div className={`p-4 grid gap-3 ${activeArticle ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
              {filtered.map((article, i) => {
                const Icon = article.icon;
                const active = activeArticle?.id === article.id;
                return (
                  <motion.button
                    key={article.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * .04 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: .98 }}
                    onClick={() => setActiveArticle(active ? null : article)}
                    className={`text-right rounded-xl border p-4 transition-all ${active ? "border-opacity-60 bg-opacity-15" : "border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5"}`}
                    style={active ? { borderColor: `${article.color}50`, backgroundColor: `${article.color}12` } : {}}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${article.color}20` }}>
                        <Icon className="w-4 h-4" style={{ color: article.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white leading-tight">{article.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-zinc-600">{article.readTime} دقائق قراءة</span>
                          <span className="text-[10px] text-zinc-700">•</span>
                          <div className="flex gap-1">
                            {article.tags.slice(0, 2).map(t => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-500">{t}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-600 flex-shrink-0 mt-1" style={{ transform: active ? "rotate(90deg)" : "" }} />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>

        {/* Article content */}
        <AnimatePresence>
          {activeArticle && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/8 p-6"
            >
              <div className="max-w-2xl">
                <div className="flex items-start gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${activeArticle.color}20`, border: `1px solid ${activeArticle.color}30` }}>
                    <activeArticle.icon className="w-5 h-5" style={{ color: activeArticle.color }} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">{activeArticle.title}</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">{activeArticle.titleEn} • {activeArticle.readTime} دقائق قراءة</p>
                  </div>
                </div>
                <div className="space-y-1.5 bg-white/3 rounded-xl border border-white/8 p-5">
                  {formatContent(activeArticle.content)}
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {activeArticle.tags.map(t => (
                    <span key={t} className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-zinc-400">{t}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tour overlay */}
      <AnimatePresence>
        {showTour && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: .9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: .9, opacity: 0 }}
              className="relative bg-[#0e0e0e] border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
            >
              <HoloBG />
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                  {(() => { const Icon = TOUR_STEPS[tourStep].icon; return <Icon className="w-8 h-8 text-red-400" />; })()}
                </div>
                <div className="flex justify-center gap-1.5 mb-4">
                  {TOUR_STEPS.map((_, i) => (
                    <div key={i} className={`h-1 rounded-full transition-all ${i === tourStep ? "w-6 bg-red-500" : i < tourStep ? "w-2 bg-red-900" : "w-2 bg-white/10"}`} />
                  ))}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{TOUR_STEPS[tourStep].title}</h3>
                <p className="text-zinc-400 text-sm mb-6">{TOUR_STEPS[tourStep].desc}</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowTour(false)} className="flex-1 py-2 rounded-xl border border-white/10 text-zinc-400 text-sm hover:bg-white/5 transition-colors">تخطي</button>
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: .96 }}
                    onClick={() => { if (tourStep < TOUR_STEPS.length - 1) setTourStep(s => s + 1); else setShowTour(false); }}
                    className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {tourStep < TOUR_STEPS.length - 1 ? "التالي" : "ابدأ الآن!"}
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
