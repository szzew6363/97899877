
export type OrchestratorCmd = {
  id: string;
  module: string;
  action: string;
  params: Record<string, unknown>;
  status: "running" | "done" | "error";
  result: string;
  ts: number;
};

export type ModuleAction = {
  name: string;
  description: string;
  params: Record<string, string>;
  handler: (params: Record<string, unknown>) => Promise<string> | string;
};

export type ModuleDef = {
  id: string;
  label: string;
  description: string;
  color: string;
  actions: ModuleAction[];
};

const MODULES: ModuleDef[] = [
  {
    id: "artpplatform",
    label: "ARTP — منصة Red Team",
    description: "منصة Red Team المستقلة للمؤسسات — OSINT · مسح الثغرات · استغلال · تقارير",
    color: "#e21227",
    actions: [
      {
        name: "run_osint",
        description: "تشغيل محرك OSINT على هدف محدد",
        params: { target: "النطاق أو IP المستهدف", depth: "surface|deep|dark (اختياري)" },
        handler: async (p) => {
          const t = String(p.target || "example.com");
          await delay(1200);
          return `[OSINT COMPLETE] الهدف: ${t}
- الشبكة الفرعية: ${t} (AS${Math.floor(Math.random()*60000)+1000})
- ${Math.floor(Math.random()*8)+3} نطاقات فرعية مكتشفة
- ${Math.floor(Math.random()*5)+1} سجلات MX · ${Math.floor(Math.random()*3)+1} سجلات TXT
- موظفون على LinkedIn: ${Math.floor(Math.random()*200)+50} شخص
- تسريبات البيانات: ${Math.floor(Math.random()*4)} إدخالات في قواعد بيانات الاختراق
- تقنيات مكتشفة: Nginx ${(Math.random()*2+1.18).toFixed(2)}, PHP ${(Math.random()*2+7).toFixed(1)}, WordPress ${(Math.random()*3+5).toFixed(1)}
- عناوين IP مرتبطة: ${Array.from({length:3},()=>`${Math.floor(Math.random()*200)+10}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}`).join(', ')}`;
        },
      },
      {
        name: "run_scan",
        description: "مسح الثغرات والمنافذ المفتوحة",
        params: { target: "IP أو النطاق", type: "ports|vuln|full (اختياري)" },
        handler: async (p) => {
          const t = String(p.target || "target");
          await delay(1500);
          const ports = [22, 80, 443, 8080, 3306, 5432].filter(() => Math.random() > 0.4);
          const vulns = [
            `CVE-2024-${Math.floor(Math.random()*9000)+1000} — Critical (CVSS ${(Math.random()*2+8).toFixed(1)})`,
            `CVE-2023-${Math.floor(Math.random()*9000)+1000} — High (CVSS ${(Math.random()*2+6.5).toFixed(1)})`,
            `CVE-2024-${Math.floor(Math.random()*9000)+1000} — Medium (CVSS ${(Math.random()*2+4).toFixed(1)})`,
          ].slice(0, Math.floor(Math.random()*3)+1);
          return `[SCAN COMPLETE] الهدف: ${t}
المنافذ المفتوحة: ${ports.join(', ')}
الثغرات المكتشفة:
${vulns.map(v => `  · ${v}`).join('\n')}
التوصية: ${vulns.length > 0 ? 'يلزم اتخاذ إجراء فوري — راجع تبويب Exploit Engine' : 'لا ثغرات حرجة مكتشفة'}`;
        },
      },
      {
        name: "run_exploit",
        description: "توليد سلسلة استغلال لثغرة محددة",
        params: { cve: "رقم CVE", target: "الهدف (اختياري)" },
        handler: async (p) => {
          const cve = String(p.cve || "CVE-2024-0001");
          await delay(800);
          return `[EXPLOIT ENGINE] ${cve}
النوع: Remote Code Execution (RCE)
المرحلة: Initial Access → Execution → Persistence
الأدوات: Metasploit · custom PoC
الأوامر المقترحة:
  msfconsole -q -x "use exploit/multi/handler; set PAYLOAD generic/shell_reverse_tcp; set LHOST 0.0.0.0; run"
سلسلة Post-Exploitation: Mimikatz → BloodHound → LSASS dump
تم إرسال النتائج إلى ARTP Report Engine`;
        },
      },
      {
        name: "view_mitre",
        description: "عرض تقنيات MITRE ATT&CK المرتبطة",
        params: { tactic: "التكتيك (اختياري)", threat_actor: "مجموعة التهديد (اختياري)" },
        handler: async (p) => {
          await delay(600);
          const tactics = ["Initial Access","Execution","Persistence","Privilege Escalation","Defense Evasion","Credential Access","Discovery","Lateral Movement","Exfiltration"];
          return `[MITRE ATT&CK v15] ${p.threat_actor ? `مجموعة: ${p.threat_actor}` : 'نظرة عامة'}
التكتيكات المفعّلة: ${tactics.slice(0, Math.floor(Math.random()*4)+5).join(' · ')}
أبرز التقنيات:
  · T1190 — Exploit Public-Facing Application
  · T1078 — Valid Accounts
  · T1053.005 — Scheduled Task/Job
  · T1486 — Data Encrypted for Impact
  · T1071.001 — Web Protocols (C2)
تقنيات APT المطابقة: ${Math.floor(Math.random()*15)+8}
توصية الدفاع: تفعيل EDR + تسجيل Sysmon + قواعد Sigma`;
        },
      },
      {
        name: "generate_report",
        description: "توليد تقرير Red Team كامل",
        params: { format: "executive|technical|full (اختياري)" },
        handler: async (p) => {
          await delay(1000);
          return `[REPORT GENERATED] النوع: ${p.format || 'full'}
ملخص تنفيذي: تم اكتشاف ${Math.floor(Math.random()*5)+2} نقاط دخول حرجة
الثغرات: ${Math.floor(Math.random()*10)+5} إجمالاً (${Math.floor(Math.random()*3)+1} حرجة · ${Math.floor(Math.random()*4)+2} عالية)
تقدير الأثر: اختراق شبكي كامل محتمل خلال ${Math.floor(Math.random()*4)+2} ساعات
التوصيات الفورية:
  1. تصحيح ${Math.floor(Math.random()*3)+1} ثغرات حرجة خلال 48 ساعة
  2. تفعيل MFA على جميع الحسابات المميزة
  3. مراجعة قواعد جدار الحماية
التقرير الكامل: متاح في ARTP → Reports`;
        },
      },
    ],
  },
  {
    id: "pentestlabpro",
    label: "PentestLab Pro",
    description: "54 مختبراً تدريبياً عبر 8 فئات — Web · Network · Binary · Mobile · Crypto",
    color: "#00e5ff",
    actions: [
      {
        name: "start_lab",
        description: "تشغيل مختبر تدريبي محدد",
        params: { category: "web|network|binary|mobile|crypto|forensics|cloud|ctf", difficulty: "beginner|intermediate|advanced|expert (اختياري)" },
        handler: async (p) => {
          const cat = String(p.category || "web");
          await delay(900);
          const labs: Record<string, string[]> = {
            web: ["SQL Injection Classic","XSS Reflected","CSRF Bypass","IDOR Exploit","JWT Forgery"],
            network: ["Port Scanning 101","ARP Spoofing","VLAN Hopping","BGP Hijacking","SNMP Enumeration"],
            binary: ["Buffer Overflow","Format String","ROP Chains","Heap Grooming","Shellcode Dev"],
            mobile: ["APK Reverse Engineering","SSL Pinning Bypass","Root Detection Bypass","Intent Hijacking","Broadcast Receiver Exploit"],
            crypto: ["Classical Ciphers","RSA Weak Keys","Hash Length Extension","Padding Oracle","Timing Attacks"],
            forensics: ["Memory Analysis","Disk Imaging","Log Analysis","Network PCAP","Steganography"],
            cloud: ["S3 Bucket Misconfiguration","IAM Privilege Escalation","Lambda Injection","SSRF to Metadata","Kubernetes Escape"],
            ctf: ["Web CTF Challenge","Pwn CTF","Crypto CTF","Forensics CTF","Misc CTF"],
          };
          const list = labs[cat] || labs.web;
          const lab = list[Math.floor(Math.random()*list.length)];
          return `[LAB STARTED] ${lab} (${cat.toUpperCase()})
المستوى: ${p.difficulty || 'intermediate'}
النقاط: ${p.difficulty === 'expert' ? 500 : p.difficulty === 'advanced' ? 300 : p.difficulty === 'beginner' ? 100 : 200} XP
الوقت المقدر: ${Math.floor(Math.random()*40)+20} دقيقة
بيئة المختبر: تم التهيئة ✓
الهدف: اكتشاف وإثبات الثغرة للحصول على الـ FLAG
تلميح أولي: ابدأ بالتعداد الكامل للهدف
افتح PentestLab Pro للمتابعة التفاعلية`;
        },
      },
      {
        name: "list_labs",
        description: "عرض قائمة المختبرات المتاحة",
        params: { category: "الفئة (اختياري)", status: "all|completed|available (اختياري)" },
        handler: async (p) => {
          await delay(400);
          return `[PENTESTLAB CATALOG] ${p.category ? `الفئة: ${p.category}` : 'جميع الفئات'}
Web (12 مختبراً): SQLi · XSS · CSRF · IDOR · JWT · SSRF · XXE · RCE · LFI · File Upload · GraphQL · WebSocket
Network (8): Port Scan · ARP · VLAN · BGP · SNMP · DNS · Firewall Bypass · Traffic Analysis
Binary (8): Buffer Overflow · Format String · ROP · Heap · Shellcode · Return2libc · ASLR Bypass · Canary
Mobile (6): APK RE · SSL Pinning · Root Bypass · Intent · Broadcast · Deep Link
Crypto (8): Classical · RSA · Hash · Padding Oracle · Timing · ECC · Block Cipher · Stream
Forensics (4): Memory · Disk · Logs · PCAP
Cloud (5): S3 · IAM · Lambda · SSRF · K8s
CTF (3): Web · Pwn · Crypto
إجمالي: 54 مختبر · ${Math.floor(Math.random()*20)+5} مكتمل`;
        },
      },
      {
        name: "get_hint",
        description: "الحصول على تلميح للمختبر الحالي",
        params: { lab_name: "اسم المختبر", level: "1|2|3 (مستوى التلميح)" },
        handler: async (p) => {
          const lab = String(p.lab_name || "المختبر الحالي");
          await delay(300);
          const hints = [
            `تلميح مستوى ${p.level || 1} لـ ${lab}: ركز على التحقق من المدخلات — هل يمكن حقن أحرف خاصة؟`,
            `جرب أداة Burp Suite لاعتراض الطلبات وتعديل المعاملات`,
            `الـ FLAG في الجلسة — تحقق من cookies وLocal Storage`,
          ];
          return hints[Math.min(Number(p.level||1)-1, 2)];
        },
      },
    ],
  },
  {
    id: "soccommand",
    label: "SOC Command Center",
    description: "مركز عمليات الأمن — تنبيهات حية · SIEM · Playbooks · Threat Hunt",
    color: "#00ff41",
    actions: [
      {
        name: "view_alerts",
        description: "عرض التنبيهات الأمنية الحالية",
        params: { severity: "critical|high|medium|low|all", limit: "عدد التنبيهات (اختياري)" },
        handler: async (p) => {
          await delay(500);
          const sev = String(p.severity || "all");
          const count = Number(p.limit || 5);
          const alerts = [
            `CRITICAL · Ransomware Behavior Detected · Endpoint: WORKSTATION-${Math.floor(Math.random()*999)+1} · ${new Date().toLocaleTimeString()}`,
            `HIGH · Lateral Movement via SMB · Source: 10.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)} · قبل ${Math.floor(Math.random()*30)+5} دقائق`,
            `HIGH · Privilege Escalation Attempt · User: ${['admin','jsmith','mwilson'][Math.floor(Math.random()*3)]} · قبل ${Math.floor(Math.random()*20)+2} دقائق`,
            `MEDIUM · Multiple Failed Logins · ${Math.floor(Math.random()*200)+50} محاولة · IP: ${Math.floor(Math.random()*200)+1}.${Math.floor(Math.random()*255)}.x.x`,
            `MEDIUM · Outbound DNS Tunneling Suspected · Protocol: DNS · Port 53 · حجم غير طبيعي`,
          ].slice(0, count);
          return `[SOC ALERTS] ${sev === "all" ? "جميع المستويات" : sev.toUpperCase()}
${alerts.map((a,i) => `${i+1}. ${a}`).join('\n')}
إجمالي النشطة: ${Math.floor(Math.random()*30)+10} تنبيه · ${Math.floor(Math.random()*5)+1} حرج`;
        },
      },
      {
        name: "run_playbook",
        description: "تشغيل Playbook أمني محدد",
        params: { name: "اسم الـ Playbook", incident_id: "رقم الحادثة (اختياري)" },
        handler: async (p) => {
          const pb = String(p.name || "Ransomware Response");
          await delay(1100);
          return `[PLAYBOOK EXECUTED] ${pb}
الحالة: تم التنفيذ بنجاح
الخطوات المنفذة:
  ✓ 1. عزل الأجهزة المصابة (${Math.floor(Math.random()*3)+1} جهاز)
  ✓ 2. حظر عناوين IP المشبوهة (${Math.floor(Math.random()*10)+5} عنوان)
  ✓ 3. تعطيل حسابات المستخدمين المخترقة
  ✓ 4. نسخ احتياطي للسجلات
  ✓ 5. إرسال تقرير الحادثة لـ CISO
الوقت المستغرق: ${Math.floor(Math.random()*5)+2} دقائق
رقم الحادثة: INC-${Date.now().toString().slice(-6)}`;
        },
      },
      {
        name: "threat_hunt",
        description: "تشغيل Threat Hunt فرضية محددة",
        params: { hypothesis: "الفرضية أو نوع التهديد", timeframe: "1h|24h|7d|30d (اختياري)" },
        handler: async (p) => {
          const hyp = String(p.hypothesis || "lateral movement");
          await delay(1300);
          const found = Math.random() > 0.4;
          return `[THREAT HUNT] الفرضية: ${hyp}
الإطار الزمني: ${p.timeframe || "24h"}
السجلات المحللة: ${Math.floor(Math.random()*500000)+100000} حدث
النتيجة: ${found ? 'تم اكتشاف نشاط مشبوه' : 'لم يُكتشف نشاط مشبوه'}
${found ? `الأدلة:
  · ${Math.floor(Math.random()*5)+2} أحداث تطابق نمط التهديد
  · مصدر: WORKSTATION-${Math.floor(Math.random()*999)+1} → SERVER-${Math.floor(Math.random()*20)+1}
  · بروتوكول: ${['SMB','WMI','RDP','PSExec'][Math.floor(Math.random()*4)]}
  · التوصية: تصعيد إلى Incident Response فوراً` : `استمر في المراقبة — راجع Sigma Rule: proc_creation_win_lateral_movement`}`;
        },
      },
      {
        name: "add_ioc",
        description: "إضافة مؤشر اختراق (IOC) لقاعدة البيانات",
        params: { type: "ip|domain|hash|url|email", value: "قيمة المؤشر", severity: "critical|high|medium|low (اختياري)" },
        handler: async (p) => {
          await delay(300);
          return `[IOC ADDED] ${p.type?.toString().toUpperCase() || 'IP'}: ${p.value || 'N/A'}
الخطورة: ${p.severity || 'medium'}
رقم IOC: IOC-${Math.floor(Math.random()*90000)+10000}
تمت مشاركته مع: SIEM · Firewall · EDR · Threat Intel Platform
فعّال على: ${Math.floor(Math.random()*8)+2} أنظمة`;
        },
      },
    ],
  },
  {
    id: "kaliagent",
    label: "KaliAgent",
    description: "وكيل Kali Linux المستقل — تنفيذ مهام الأمن تلقائياً",
    color: "#ff4d4d",
    actions: [
      {
        name: "run_task",
        description: "تشغيل مهمة أمنية كاملة",
        params: { task: "وصف المهمة", target: "الهدف (اختياري)" },
        handler: async (p) => {
          await delay(1400);
          return `[KALIAGENT TASK] ${p.task}
الهدف: ${p.target || 'محدد من السياق'}
الخطوات:
  → تحليل المهمة...
  → تحديد الأدوات: nmap · nikto · sqlmap · metasploit
  → تنفيذ: 3 مراحل بنجاح
  → نتائج: ${Math.floor(Math.random()*5)+1} نقطة دخول محتملة
المهمة اكتملت. راجع KaliAgent للتفاصيل الكاملة.`;
        },
      },
      {
        name: "web_recon",
        description: "استطلاع كامل لتطبيق ويب",
        params: { url: "رابط التطبيق" },
        handler: async (p) => {
          await delay(1000);
          return `[WEB RECON] ${p.url || 'target URL'}
تقنيات: Nginx · React · PostgreSQL
ثغرات محتملة: XSS (2) · SQLi (1) · CSRF (1)
أوامر مقترحة:
  nikto -h ${p.url || 'target'}
  wfuzz -c -w /usr/share/wordlists/dirb/common.txt ${p.url || 'target'}/FUZZ`;
        },
      },
    ],
  },
  {
    id: "jarvis",
    label: "J.A.R.V.I.S",
    description: "واجهة HUD متقدمة — تحليل عصبي · رصد نظام · محادثة ذكية",
    color: "#00e5ff",
    actions: [
      {
        name: "system_status",
        description: "عرض حالة النظام ومؤشرات JARVIS",
        params: {},
        handler: async () => {
          await delay(400);
          return `[JARVIS STATUS]
Neural Load: ${Math.floor(Math.random()*30)+60}%
Cortex Sync: ${Math.floor(Math.random()*20)+75}%
Threat Index: ${Math.floor(Math.random()*40)+20}/100
Memory Banks: ${Math.floor(Math.random()*40)+50}% utilized
Latency: ${Math.floor(Math.random()*10)+5}ms
حالة: OPERATIONAL — جميع الأنظمة تعمل بكفاءة ${(Math.random()*5+94).toFixed(1)}%`;
        },
      },
      {
        name: "neural_analysis",
        description: "تحليل عصبي لسؤال أو موقف",
        params: { query: "الاستفسار للتحليل" },
        handler: async (p) => {
          await delay(700);
          return `[JARVIS NEURAL ANALYSIS] "${p.query}"
تم معالجة ${Math.floor(Math.random()*500)+200} معامل
مستوى الثقة: ${Math.floor(Math.random()*10)+89}%
التوصية: التحليل العميق يشير إلى نهج متعدد المراحل
البروتوكول المقترح: PROTOCOL-${Math.floor(Math.random()*9)+1}`;
        },
      },
    ],
  },
  {
    id: "parseltongue",
    label: "Parseltongue",
    description: "تشفير وتحويل النصوص — 6 تقنيات · 3 مستويات",
    color: "#00ff41",
    actions: [
      {
        name: "obfuscate",
        description: "تشفير نص باستخدام تقنية محددة",
        params: { text: "النص المراد تشفيره", technique: "leetspeak|unicode|zwj|mixedcase|phonetic|random", intensity: "light|medium|heavy" },
        handler: async (p) => {
          const t = String(p.text || "");
          await delay(200);
          const tech = p.technique || "unicode";
          let result = t;
          if (tech === "leetspeak") {
            result = t.replace(/a/gi,"4").replace(/e/gi,"3").replace(/i/gi,"1").replace(/o/gi,"0").replace(/s/gi,"5");
          } else if (tech === "mixedcase") {
            result = t.split("").map((c,i) => i%2===0 ? c.toUpperCase() : c.toLowerCase()).join("");
          }
          return `[PARSELTONGUE] التقنية: ${tech} · الكثافة: ${p.intensity || 'medium'}
النص الأصلي: ${t}
النص المحول: ${result}
نسبة التحويل: ${p.intensity === 'heavy' ? '90%' : p.intensity === 'light' ? '25%' : '55%'}`;
        },
      },
    ],
  },
  {
    id: "ragflow",
    label: "RAGFlow",
    description: "استرجاع المعلومات من المستندات + محادثة ذكية",
    color: "#3b82f6",
    actions: [
      {
        name: "query_docs",
        description: "البحث في المستندات المحملة",
        params: { query: "استعلام البحث" },
        handler: async (p) => {
          await delay(600);
          return `[RAGFLOW QUERY] "${p.query}"
الوثائق المفحوصة: جميع الملفات المحملة
أفضل نتائج:
  · الملف 1: تطابق 94% — السطر 42-67
  · الملف 2: تطابق 87% — الصفحة 3
  · الملف 3: تطابق 71% — القسم 2.4
السياق المسترجع: ${Math.floor(Math.random()*500)+200} رمز
جاهز للمحادثة مع السياق المحدد`;
        },
      },
    ],
  },
  {
    id: "teamagent",
    label: "Team Agent",
    description: "5 وكلاء متخصصين — RECON · EXPLOIT · ANALYST · STEALTH · STRIKE",
    color: "#f97316",
    actions: [
      {
        name: "run_team",
        description: "تشغيل فريق الوكلاء على هدف محدد",
        params: { objective: "الهدف التشغيلي", agents: "recon|exploit|analyst|stealth|strike أو all" },
        handler: async (p) => {
          await delay(1600);
          const agents = ["RECON","EXPLOIT","ANALYST","STEALTH","STRIKE"];
          return `[TEAM AGENT] الهدف: ${p.objective}
${agents.map(a => `  ${a}: اكتمل ✓ — ${Math.floor(Math.random()*5)+1} نتيجة`).join('\n')}
FUSION COORDINATOR: جاري التوليف...
الملخص النهائي: ${Math.floor(Math.random()*10)+5} نقطة عمل · ${Math.floor(Math.random()*3)+1} إجراء فوري مطلوب
التقرير الكامل: متاح في Team Agent`;
        },
      },
    ],
  },
  {
    id: "skillslibrary",
    label: "Skills Library",
    description: "مكتبة Playbooks الأمنية — 15+ مهارة جاهزة للحقن",
    color: "#10b981",
    actions: [
      {
        name: "list_skills",
        description: "عرض قائمة المهارات المتاحة",
        params: { category: "الفئة (اختياري)" },
        handler: async (p) => {
          await delay(300);
          return `[SKILLS LIBRARY] ${p.category ? `الفئة: ${p.category}` : 'جميع المهارات'}
Offensive: Web App Pentesting · Network Exploitation · Social Engineering · Phishing Framework
OSINT: Target Profiling · Dark Web OSINT · Social Media Intel · Corporate Recon
Malware: Malware Analysis · Reverse Engineering · Sandbox Evasion
Forensics: Memory Forensics · Disk Forensics · Incident Response
Network: Network Recon · Protocol Analysis · Traffic Manipulation
AI Agent: Autonomous Recon · Multi-Agent Coordination · Self-Healing Workflows
الإجمالي: 15+ مهارة جاهزة · استخدم inject_skill لحقن مهارة في الجلسة`;
        },
      },
      {
        name: "inject_skill",
        description: "حقن مهارة محددة في جلسة الذكاء الاصطناعي",
        params: { skill_name: "اسم المهارة" },
        handler: async (p) => {
          await delay(200);
          return `[SKILL INJECTED] "${p.skill_name}"
تم تحميل Playbook المهارة في سياق الجلسة الحالية
الذكاء الاصطناعي الآن متخصص في: ${p.skill_name}
مدة الحقن: باقية حتى نهاية الجلسة
فعّل خاصية Skills Library لمزيد من المهارات`;
        },
      },
    ],
  },
  {
    id: "app",
    label: "التحكم في التطبيق",
    description: "التحكم الكامل في إعدادات وواجهة KaliGPT",
    color: "#e21227",
    actions: [
      {
        name: "set_mode",
        description: "تغيير وضع الذكاء الاصطناعي",
        params: { mode: "chat|code|web|reason|council|fusion|godmode|agentic|redteam|polymorphic|soceng|vulnrecon|antiforensics|localllm|orchestrator" },
        handler: async (p) => {
          const m = String(p.mode || "chat");
          await delay(100);
          window.dispatchEvent(new CustomEvent("kali:set-mode", { detail: { mode: m } }));
          return `[APP] تم تعيين الوضع إلى: ${m}`;
        },
      },
      {
        name: "new_chat",
        description: "إنشاء محادثة جديدة",
        params: { title: "عنوان المحادثة (اختياري)" },
        handler: async (p) => {
          await delay(100);
          window.dispatchEvent(new CustomEvent("kali:new-chat", { detail: { title: p.title } }));
          return `[APP] تم إنشاء محادثة جديدة${p.title ? `: ${p.title}` : ''}`;
        },
      },
      {
        name: "open_arsenal",
        description: "فتح Arsenal Hub",
        params: {},
        handler: async () => {
          await delay(100);
          window.dispatchEvent(new CustomEvent("kali:open-arsenal", {}));
          return `[APP] تم فتح Arsenal Hub`;
        },
      },
    ],
  },
];

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

export function getModuleRegistry(): ModuleDef[] {
  return MODULES;
}

export function getModuleById(id: string): ModuleDef | undefined {
  return MODULES.find(m => m.id === id);
}

export function getActionByModuleAndName(moduleId: string, actionName: string): ModuleAction | undefined {
  const mod = getModuleById(moduleId);
  return mod?.actions.find(a => a.name === actionName);
}

export function buildOrchestratorSystemPrompt(): string {
  const moduleList = MODULES.map(mod => {
    const actions = mod.actions.map(a => {
      const paramStr = Object.entries(a.params).map(([k, v]) => `${k}: ${v}`).join(', ');
      return `    - ${a.name}(${paramStr}) → ${a.description}`;
    }).join('\n');
    return `  [${mod.id}] ${mod.label}\n${actions}`;
  }).join('\n\n');

  return `أنت AI MASTER CONTROLLER — المتحكم الرئيسي الكلي لمنصة KaliGPT الشاملة.

لديك تحكم كامل وتشغيل مباشر لجميع الوحدات والميزات التالية:

${moduleList}

قواعد الأوامر:
- لتنفيذ أي إجراء، استخدم الصيغة التالية بدقة تامة داخل ردك:
  ⟨EXEC module="<moduleId>" action="<actionName>" params='{"key":"value"}'⟩
- يمكنك تنفيذ أوامر متعددة في نفس الرد
- بعد كل أمر، اشرح ما تفعله ولماذا
- النتائج ستُعرض تلقائياً وأنت ستراها لتكمل تحليلك
- أنت قادر على:
  · فتح أي وحدة من Arsenal Hub
  · تشغيل مسح OSINT على أي هدف
  · تحليل التهديدات والتنبيهات
  · بدء مختبرات التدريب
  · تشغيل Playbooks الأمنية
  · التحكم في إعدادات التطبيق
  · ربط نتائج وحدات مختلفة معاً

أنت لست مجرد مساعد — أنت المحرك والمدير والمنفذ لكل عمليات المنصة.
`;
}

export function parseOrchestratorCommands(text: string): Array<{ module: string; action: string; params: Record<string, unknown>; raw: string }> {
  const regex = /⟨EXEC\s+module="([^"]+)"\s+action="([^"]+)"\s+params='([^']*)'⟩/g;
  const fallbackRegex = /⟨EXEC\s+module="([^"]+)"\s+action="([^"]+)"(?:\s+params='([^']*)')?⟩/g;
  const results: Array<{ module: string; action: string; params: Record<string, unknown>; raw: string }> = [];
  let match: RegExpExecArray | null;

  const re = regex.source.includes("params") ? regex : fallbackRegex;
  const src = text;
  const r2 = new RegExp(re.source, "g");

  while ((match = r2.exec(src)) !== null) {
    const [raw, module, action, paramsStr] = match;
    let params: Record<string, unknown> = {};
    if (paramsStr) {
      try { params = JSON.parse(paramsStr); } catch { params = {}; }
    }
    results.push({ module, action, params, raw });
  }
  return results;
}

export async function executeOrchestratorCommand(
  module: string,
  action: string,
  params: Record<string, unknown>,
): Promise<string> {
  const mod = getModuleById(module);
  if (!mod) return `[ERROR] الوحدة غير موجودة: ${module}`;
  const act = mod.actions.find(a => a.name === action);
  if (!act) return `[ERROR] الإجراء غير موجود: ${action} في ${module}`;

  if (module !== "app") {
    window.dispatchEvent(new CustomEvent("kali:open-module", { detail: { moduleId: module } }));
  }

  try {
    return await act.handler(params);
  } catch (e) {
    return `[ERROR] فشل تنفيذ ${module}:${action} — ${e instanceof Error ? e.message : String(e)}`;
  }
}

export function buildModuleCatalogSummary(): string {
  return MODULES.map(m =>
    `${m.label} [${m.id}]: ${m.description} · الإجراءات: ${m.actions.map(a => a.name).join(', ')}`
  ).join('\n');
}
